# Quickstart: Verify Unified Runtime AI Execution

## Prerequisites

- Node.js 22.22.0 or another supported version `>=22.13.0`
- Dependencies installed from the checked-in lockfile
- No real DeepSeek key is required; focused tests use synthetic model transports

## 1. Verify the active Spec Kit feature

```bash
.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

Expected: `FEATURE_DIR` resolves to `specs/012-mastra-ai-consolidation`.

## 2. Run focused runtime and route contracts

```bash
/Users/kual/.nvm/versions/node/v22.22.0/bin/node --test \
  tests/agent-review-runtime.test.mjs \
  tests/deepseek-model.test.mjs \
  tests/ai-agent-review-route.test.mjs \
  tests/ai-daily-review-route.test.mjs \
  tests/ai-classifier-route.test.mjs \
  tests/ai-domain-review-route.test.mjs \
  tests/project-structure.test.mjs
```

Expected: all five capabilities pass success, one-call, failure mapping, and public compatibility
checks; the source inventory finds no legacy direct model execution.

## 3. Verify dependency and source removal

```bash
rg -n 'from "ai"|generateText\(|Output\.object|chat/completions' src package.json
npm ls ai @ai-sdk/openai-compatible @mastra/core --depth=1
```

Expected: no project source direct-generation matches; `@mastra/core` and the OpenAI-compatible
provider remain direct dependencies, while top-level `ai` is not a direct project dependency.

## 4. Run supported-runtime and repository gates

```bash
/Users/kual/.nvm/versions/node/v22.22.0/bin/npm test
/Users/kual/.nvm/versions/node/v22.22.0/bin/npm run build
/Users/kual/.nvm/versions/node/v22.22.0/bin/npm run check
git diff --check
```

Expected: focused and complete gates pass. If an unrelated dirty-worktree browser assertion fails,
record the exact failure and keep the item open instead of changing files outside the write set.

## 5. Review release evidence

```bash
npm audit --omit=dev --registry=https://registry.npmjs.org
```

Expected: record the actual result. Do not force-upgrade Mastra internal provider aliases. Internal
Node 20 deployment remains blocked until separately upgraded and independently validated or isolated.
