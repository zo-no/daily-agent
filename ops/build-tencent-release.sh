#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <output.tar.gz> <40-character-source-revision>" >&2
  exit 64
fi

output_path=$1
release_id=$2

if [[ ! $release_id =~ ^[0-9a-f]{40}$ ]]; then
  echo "source revision must be a lowercase 40-character Git commit" >&2
  exit 64
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repository_root=$(cd -- "$script_dir/.." && pwd)

if [[ $output_path != /* ]]; then
  output_path="$PWD/$output_path"
fi

output_parent=$(dirname -- "$output_path")
mkdir -p -- "$output_parent"

build_dir_name=".next-tencent-${release_id:0:12}-$$"
build_dir="$repository_root/$build_dir_name"
stage_dir=$(mktemp -d "${TMPDIR:-/tmp}/log-note-release.XXXXXX")

cleanup() {
  rm -rf -- "$build_dir" "$stage_dir"
}
trap cleanup EXIT

cd -- "$repository_root"
NEXT_DIST_DIR="$build_dir_name" NEXT_TELEMETRY_DISABLED=1 npm run build

standalone_dir="$build_dir/standalone"
static_dir="$build_dir/static"
runtime_dist_dir=$build_dir_name

if [[ ! -f "$standalone_dir/server.js" || ! -d "$static_dir" || ! -d "$repository_root/public" ]]; then
  echo "standalone build is missing server.js, static assets, or public assets" >&2
  exit 1
fi

cp -a "$standalone_dir/." "$stage_dir/"
mkdir -p -- "$stage_dir/$runtime_dist_dir/static" "$stage_dir/.next/static" "$stage_dir/public"
cp -a "$static_dir/." "$stage_dir/$runtime_dist_dir/static/"
# Keep the legacy path until every existing CVM deploy control understands runtimeDistDir.
cp -a "$static_dir/." "$stage_dir/.next/static/"
cp -a "$repository_root/public/." "$stage_dir/public/"

find "$stage_dir" -name '.env*' -exec rm -f -- {} +
if find "$stage_dir" -name '.env*' -print -quit | grep -q .; then
  echo "standalone release unexpectedly contains an environment file" >&2
  exit 1
fi

if find "$stage_dir" -path '*/node_modules/@mtfe/*' -print -quit | grep -q .; then
  echo "standalone release unexpectedly contains a CatPaw-only dependency" >&2
  exit 1
fi

printf '{\n  "sourceRevision": "%s",\n  "runtimeDistDir": "%s"\n}\n' \
  "$release_id" "$runtime_dist_dir" > "$stage_dir/release.json"
tar --create --gzip --file "$output_path" --directory "$stage_dir" .

echo "built $output_path"
