# Quickstart: Daily Work Log Agent Tool

## Prerequisites

```bash
cd /Users/kual/Desktop/log-note
nvm use
```

The repository requires Node.js 22. Standalone Tool execution does not require a Provider key. Running the
Agent through Studio uses the existing optional `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, and
`DEEPSEEK_MODEL` development configuration.

## Run focused tests

```bash
node --test tests/mastra-daily-log-tool.test.mjs tests/mastra-studio.test.mjs tests/agent-review-runtime.test.mjs
```

Expected result: the proposal core and Tool boundaries pass; the dedicated Agent lists exactly one Tool;
existing production structured-proposal Agents remain tool-free.

## Inspect in Mastra Studio

```bash
npm run studio
```

Open `http://localhost:4111`. The development registry should include:

- Agent: `daily-log-agent`
- Tool: `prepare-daily-log`

Use only synthetic work facts in Studio. Do not paste private notes, credentials, account identifiers, or
production snapshots.

## Execute the standalone Tool through Mastra CLI

With Studio running:

```bash
npx mastra api tool execute prepare-daily-log '{"schemaVersion":1,"targetDate":"2026-09-04","locale":"zh-CN","items":[{"id":"work-1","status":"completed","summary":"完成 Daily Log Tool 的本地验证"}]}'
```

Expected result: a strict object with `kind: "daily-work-log"`, an empty candidate time, a deterministic
fingerprint, and `writePolicy: "preview-required"`. It does not create a Log Note record.

## Run the repository gate

```bash
npm run check
```

If unrelated dirty-tree browser work fails, keep the focused LN-082 results separate and report the exact
pre-existing failing scenario. Do not modify unrelated UI files to make this Tool task appear green.

## Code map

- Shared schema/core: `src/modules/agent-bridge/daily-log/`
- Mastra Tool: `src/mastra/tools/daily-log/`
- Mastra Agent: `src/mastra/agents/daily-log/`
- Studio model instance: `src/mastra/studio-daily-log.mjs`
- Studio registration: `src/mastra/index.ts`
- Focused tests: `tests/mastra-daily-log-tool.test.mjs`, `tests/mastra-studio.test.mjs`

## What this does not prove

Studio/CLI success proves only local Tool and Agent registration. It does not prove that a record was saved,
that Codex can discover the Tool, that an MCP server exists, or that a deployed account/write flow is safe.
