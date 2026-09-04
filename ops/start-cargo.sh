#!/usr/bin/env bash
set -eo pipefail

# The manifest-provisioned Node tool must satisfy Mastra's supported runtime.
# Plus provisions it through the sankuai user's shell environment, which is not
# loaded automatically by the non-interactive daemontools process.
source ~/.bashrc
set -u

# Resolve it once and execute it directly so Plus/daemontools tracks the
# long-lived Next.js process instead of a shell or npm wrapper process.
node_bin="$(command -v node || true)"
if [[ -z "$node_bin" ]]; then
  echo "[log-note] Node.js runtime is unavailable after loading ~/.bashrc" >&2
  exit 1
fi

"$node_bin" -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 22 || (major === 22 && minor < 13)) process.exit(1)'
"$node_bin" ./ops/register-cargo-service.cjs
exec "$node_bin" ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3100
