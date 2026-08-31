#!/usr/bin/env bash
set -euo pipefail

# Cargo's Node 20 tool is installed at this fixed path. Execute Node directly so
# Plus/daemontools tracks the long-lived Next.js process instead of a shell or
# npm wrapper process.
/usr/local/node20/bin/node ./ops/register-cargo-service.cjs
exec /usr/local/node20/bin/node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3100
