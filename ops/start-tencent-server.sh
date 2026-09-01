#!/usr/bin/env bash
set -euo pipefail

readonly deploy_root=/opt/log-note
readonly current_release="$deploy_root/current"
readonly node_binary="$deploy_root/runtime/node/bin/node"
readonly legacy_next="$current_release/node_modules/next/dist/bin/next"

cd "$current_release"

if [[ -f server.js ]]; then
  exec "$node_binary" server.js
fi

# The pre-CI/CD release used `next start`. Keep this fallback so the first
# standalone deployment can still roll back to that exact prior target.
if [[ -f $legacy_next ]]; then
  exec "$node_binary" "$legacy_next" start -H "${HOSTNAME:-127.0.0.1}" -p "${PORT:-3100}"
fi

echo "current Log Note release has no supported server entrypoint" >&2
exit 66
