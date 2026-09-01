#!/usr/bin/env bash
set -euo pipefail

readonly deploy_root=/opt/log-note
readonly runtime_user=lognote
readonly node_binary="$deploy_root/runtime/node/bin/node"
readonly health_url=http://127.0.0.1:3100/api/healthz
readonly expected_health='{"status":"ok","service":"log-note"}'

if [[ $# -ne 3 ]]; then
  echo "usage: $0 <incoming-artifact> <sha256> <40-character-source-revision>" >&2
  exit 64
fi

incoming_artifact=$1
expected_sha256=$2
release_id=$3
expected_artifact="$deploy_root/incoming/log-note-$release_id.tar.gz"

if [[ ! $release_id =~ ^[0-9a-f]{40}$ ]]; then
  echo "invalid source revision" >&2
  exit 64
fi

if [[ $incoming_artifact != "$expected_artifact" ]]; then
  echo "unexpected incoming artifact path" >&2
  exit 64
fi

if [[ ! $expected_sha256 =~ ^[0-9a-f]{64}$ ]]; then
  echo "invalid SHA-256 digest" >&2
  exit 64
fi

if (( EUID != 0 )); then
  echo "deploy control must run as root" >&2
  exit 77
fi

if [[ ! -f $incoming_artifact || -L $incoming_artifact ]]; then
  echo "incoming artifact must be a regular file" >&2
  exit 66
fi

actual_sha256=$(sha256sum "$incoming_artifact" | awk '{print $1}')
if [[ $actual_sha256 != "$expected_sha256" ]]; then
  echo "artifact checksum mismatch" >&2
  exit 65
fi

while IFS= read -r archive_path; do
  normalized_path=${archive_path#./}
  if [[ $normalized_path == /* || $normalized_path == .. || $normalized_path == ../* || $normalized_path == */../* || $normalized_path == */.. ]]; then
    echo "artifact contains an unsafe path" >&2
    exit 65
  fi
done < <(tar --list --gzip --file "$incoming_artifact")

exec 9>"$deploy_root/deploy.lock"
if ! flock --exclusive --nonblock 9; then
  echo "another Log Note deployment is active" >&2
  exit 75
fi

release_dir="$deploy_root/releases/$release_id"
temporary_release="$deploy_root/releases/.${release_id}.tmp.$$"
current_link="$deploy_root/current"
next_link="$deploy_root/current.next"
previous_target=""

cleanup() {
  rm -rf -- "$temporary_release"
  if [[ -L $next_link ]]; then
    rm -f -- "$next_link"
  fi
}
trap cleanup EXIT

validate_release() {
  local candidate=$1
  local metadata_revision

  if [[ ! -f "$candidate/server.js" || ! -d "$candidate/.next/static" || ! -d "$candidate/public" || ! -f "$candidate/release.json" ]]; then
    echo "release is missing required standalone files" >&2
    return 1
  fi

  metadata_revision=$("$node_binary" -e 'const fs = require("node:fs"); const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(String(value.sourceRevision || ""));' "$candidate/release.json")
  if [[ $metadata_revision != "$release_id" ]]; then
    echo "release metadata revision mismatch" >&2
    return 1
  fi
}

validate_existing_digest() {
  local candidate=$1
  local recorded_digest

  if [[ ! -f "$candidate/.artifact-sha256" ]]; then
    echo "existing release has no immutable artifact digest" >&2
    return 1
  fi
  recorded_digest=$(<"$candidate/.artifact-sha256")
  if [[ $recorded_digest != "$expected_sha256" ]]; then
    echo "existing release digest does not match the uploaded artifact" >&2
    return 1
  fi
}

activate_release() {
  local target=$1
  ln --symbolic --force --no-dereference --no-target-directory -- "$target" "$next_link"
  mv --force --no-target-directory -- "$next_link" "$current_link"
}

wait_for_health() {
  local attempt
  local response
  for attempt in {1..30}; do
    response=$(curl --fail --silent --show-error --max-time 2 "$health_url" 2>/dev/null || true)
    if [[ $response == "$expected_health" ]]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

if [[ -L $current_link ]]; then
  previous_target=$(readlink --canonicalize "$current_link" || true)
fi

if [[ -e $release_dir ]]; then
  if [[ ! -d $release_dir || -L $release_dir ]]; then
    echo "existing release path is not an immutable directory" >&2
    exit 65
  fi
  validate_release "$release_dir"
  validate_existing_digest "$release_dir"
else
  mkdir -- "$temporary_release"
  tar --extract --gzip --file "$incoming_artifact" --directory "$temporary_release" --no-same-owner --no-same-permissions
  if find "$temporary_release" -type l -print -quit | grep -q .; then
    echo "release archive must not contain symbolic links" >&2
    exit 65
  fi
  validate_release "$temporary_release"
  printf '%s\n' "$expected_sha256" > "$temporary_release/.artifact-sha256"
  chown -R root:"$runtime_user" "$temporary_release"
  chmod -R u=rwX,g=rX,o= "$temporary_release"
  mv --no-target-directory -- "$temporary_release" "$release_dir"
fi

activate_release "$release_dir"
if systemctl restart log-note && wait_for_health; then
  echo "Log Note release $release_id is healthy"
  exit 0
fi

echo "new release failed readiness; restoring previous target" >&2
if [[ -n $previous_target && $previous_target == "$deploy_root/releases/"* && -d $previous_target ]]; then
  activate_release "$previous_target"
  if systemctl restart log-note && wait_for_health; then
    echo "previous Log Note release restored" >&2
  else
    echo "previous Log Note release did not recover" >&2
  fi
else
  if [[ -L $current_link && $(readlink --canonicalize "$current_link" || true) == "$release_dir" ]]; then
    rm -f -- "$current_link"
  fi
  systemctl stop log-note || true
  echo "no previous release was available" >&2
fi

exit 1
