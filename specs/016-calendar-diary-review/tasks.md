# Tasks: Calendar and Diary Review

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

## Phase 1: Contracts and failing regressions

- [x] T001 [US1] Add Google timed/all-day versus diary model cases in `tests/daily-calendar-review-model.test.mjs`.
- [x] T002 [US2] Add exact privacy, auth, limits, strict response, and stale echo cases in `tests/ai-daily-calendar-review-route.test.mjs`.
- [x] T003 [US3] Add suspend/approve/reject/call-count cases in `tests/mastra-calendar-diary-workflow.test.mjs`.

## Phase 2: Shared model and transport boundary

- [x] T004 [US1] Adopt the draft as `src/lib/daily-calendar-review-model.mjs`, including today selection, opaque projection, fingerprint, local facts, and output normalizer.
- [x] T005 [US2] Adopt the draft Route Handler boundary as `src/lib/daily-calendar-review-route.mjs` and `src/app/api/organize/day-review/route.js` with shared strict schemas/instructions.
- [x] T006 [US2] Adopt the browser provider as `src/lib/daily-calendar-review-provider.mjs`, preserving one approved request, abort, strict revalidation, and no-write failure behavior.

## Phase 3: User Story 1 — local comparison

- [x] T007 [US1] Mount `src/app/insights/daily-calendar-review.js` from `src/app/insights/insights-page.js` using `useGoogleCalendar()` and current account data.
- [x] T008 [US1] Render no-network counts, bounded local issues, all-day handling, and Calendar-empty state using scoped `src/app/insights/insights.css` and `src/lib/i18n.mjs`.

## Phase 4: User Story 2 — human-approved Agent suggestions

- [x] T009 [US2] Implement disclosure, approve, cancel, stop, retry, result, source/fingerprint invalidation, and focus behavior in `src/app/insights/daily-calendar-review.js`.
- [x] T010 [US2] Update `src/lib/public-policies.mjs`, `tests/public-policies.test.mjs`, and `ARCHITECTURE.md` with the exact transfer and no-write boundary.
- [x] T011 [US2] Add the filtered five-width, zero-request/zero-write, approve, stale, and accessibility journey to `e2e/run-mobile.mjs`.

## Phase 5: User Story 3 — Studio Human-in-the-loop

- [x] T012 [US3] Add `src/mastra/workflows/human-reviewed-proposal-workflow.mjs` with a pre-generation suspend and strict approve/reject resume contract.
- [x] T013 [US3] Add `src/mastra/studio-calendar-diary-review.mjs` and register its synthetic-only Agent/workflow in `src/mastra/index.ts`.
- [x] T014 [US3] Extend `tests/project-structure.test.mjs` and verify localhost Studio registration plus visible suspend/resume behavior.

## Phase 6: Documentation, validation, and delivery

- [x] T015 Write `docs/2026-09-04-Google日历与今日记录复盘工作流介绍.md` and run Sigo content review.
- [x] T016 Run focused Node/browser/Studio checks, `npm run design:check`, `npm run check`, and `git diff --check` under Node 22; record the unrelated full-browser gate failure rather than hiding it.
- [x] T017 Re-run Spec Kit analysis, reconcile every LN-081 acceptance criterion, and record exact evidence/open checks in `PROJECT_BOARD.md`.
- [x] T018 Audit mixed dirty files, stage only LN-081, commit with the repository message contract, push the new branch, and verify the remote hash (`45b91ad81e882a9fe2fcc94740bd65d972424cd8`).

## Dependencies and execution order

- T001–T003 precede T004–T006; T004–T006 precede the corresponding UI/Studio integration.
- T007–T011 can be verified independently from T012–T014, but one writer performs them sequentially.
- T015 follows stable behavior. T016–T018 are final gates and cannot be skipped.
- Real Google OAuth, Provider quality/latency, 390px owner judgment, 14-day use, deployment, PR, and merge remain external/open and do not authorize extra writes.
