# Quickstart: Verify Current-Domain Daily Summary

## Prerequisites

- Node.js 22.22.0 or another supported version `>=22.13.0`
- Dependencies installed from the checked-in lockfile
- No real DeepSeek key for automated checks; route/model tests use synthetic transports and content
- Business implementation must have separate owner approval before running these implementation gates

## 1. Verify the Active Feature

```bash
.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

Expected: `FEATURE_DIR` resolves to `specs/014-domain-daily-summary` after `$speckit-tasks` creates
`tasks.md`.

## 2. Run Focused Model and Route Contracts

```bash
/Users/kual/.nvm/versions/node/v22.22.0/bin/node --test \
  tests/daily-domain-summary-model.test.mjs \
  tests/ai-daily-domain-summary-route.test.mjs \
  tests/project-structure.test.mjs \
  tests/public-policies.test.mjs
```

Expected: local-today/current-domain selection, exact counts/whitelist, 80×4,000 limits, source
grounding, investment safety, auth/origin/rate/body/timeout/Abort/no-store behavior, one Mastra call,
and bilingual policy boundaries pass.

## 3. Run the Filtered Browser Journey

```bash
E2E_TEST_FILTER='domain insights: current-domain daily summary' \
  /Users/kual/.nvm/versions/node/v22.22.0/bin/node e2e/run-mobile.mjs
```

Expected: daily placement, zero-request disclosure/cancel/empty, one confirmed request, safe result,
Stop/late-response rejection, retry confirmation, scope invalidation, no writes, weekly independence,
focus, 44px targets, and responsive layout pass using synthetic fixtures.

## 4. Run Design and Complete Gates

```bash
/Users/kual/.nvm/versions/node/v22.22.0/bin/npm run design:check
/Users/kual/.nvm/versions/node/v22.22.0/bin/npm run check
git diff --check
```

Expected: formal design rules, focused/complete regressions, production build/PWA checks, and patch
format pass. If an unrelated dirty-worktree assertion fails, record the exact boundary and do not
rewrite files outside the declared write set.

## 5. Record External Evidence

- Use only non-sensitive synthetic or intentionally safe notes for provider timing.
- Record three successful confirmed start-to-visible durations and their median; it must be ≤8 seconds.
- Capture synthetic 390px and desktop views for quiet hierarchy review.
- Keep LN-079 unaccepted until the owner has used it twice across 14 days and confirms source
  reconciliation and acceptable page density.
- Do not commit, push, publish, deploy, delete, reset, rewrite history, or modify OKRs without separate
  authorization.
