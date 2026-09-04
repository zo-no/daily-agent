#!/usr/bin/env bash
set -euo pipefail

# The manifest-provisioned Node tool must satisfy Mastra's supported runtime.
# Resolve it once and execute it directly so Plus/daemontools tracks the
# long-lived Next.js process instead of a shell or npm wrapper process.
node_bin="$(command -v node)"
"$node_bin" -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 22 || (major === 22 && minor < 13)) process.exit(1)'
"$node_bin" ./ops/register-cargo-service.cjs
exec "$node_bin" ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3100
