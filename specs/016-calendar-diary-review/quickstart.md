# Quickstart: Verify Calendar and Diary Review

Use Node 22 (`nvm use`). Do not use private records in Studio or Provider checks.

```bash
.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
node --test tests/daily-calendar-review-model.test.mjs tests/ai-daily-calendar-review-route.test.mjs tests/mastra-calendar-diary-workflow.test.mjs tests/project-structure.test.mjs tests/public-policies.test.mjs
E2E_TEST_FILTER='calendar and diary review' node e2e/run-mobile.mjs
npm run design:check
npm run check
git diff --check
```

For Studio:

```bash
npm run studio
```

Open `http://localhost:4111/workflows`, run the Calendar/diary workflow with synthetic input, verify it suspends
before generation, then resume approve and reject runs. Keep the server localhost-only.

Record real OAuth/Provider reconciliation, three latencies, owner 390px review, 14-day usage, and deployment as open
evidence; automated or Studio success does not prove them.
