# Quickstart: Goal Loop candidate

**Requirement**: `REQ-20260906-03`
**Status**: Design-only until owner discussion and board admission.

This guide is for implementation and acceptance after the Core-Chain Change Gate is confirmed. It does
not authorize code changes or external provider calls.

## Local review scenarios

1. Start with a clean test account and create one work outcome and one personal outcome.
2. Add one numeric signal and one qualitative signal to each; record the meaning, horizon, evidence
   rule, and lifecycle state.
3. Create a local plan linked to one signal, then make an ordinary quick record without choosing a
   goal. Confirm that capture uses the existing action count and works offline.
4. Open the Goal detail surface. Confirm outcome progress, evidence coverage, plan activity, chronology,
   gaps, and insufficient-evidence states are separate.
5. Accept and remove a record association. Confirm the raw date, time, and content remain unchanged.
6. Choose a bounded source window for AI review. Confirm disclosure appears before sending, sources
   are cited in the result, and cancel/stale/offline/account-change paths write nothing.
7. Export/restore the old and new payloads and confirm records and plans remain readable.

## Commands after implementation permission

Use Node 22 and the repository's normal commands:

```bash
npm test
npm run design:check
npm run check
git diff --check
```

Focused tests should cover Goal/Signal normalization, plan/evidence relationships, and the AI
request/response contract before the full gate.

## Manual pilot

Run two outcomes for 14 days: one work and one personal. Record setup duration, review duration,
evidence links, accepted/rejected AI candidates, false-positive explanations, and any quick-record
friction. A passing pilot is continuation evidence, not proof that either outcome was achieved.

## Evidence handoff

Return focused test output, responsive screenshots, offline/account/backup results, synthetic provider
contract captures, and the pilot log to the controller. Real provider quality, cross-device CAS,
deployment, and owner visual approval remain separate acceptance evidence.
