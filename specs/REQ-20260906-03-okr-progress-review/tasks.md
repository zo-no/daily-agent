# Tasks: Current-cycle OKR detail and progress review

**Requirement**: `REQ-20260906-03`  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)

## Dependencies and order

`US1` depends on foundational Goal normalization and evidence derivation. `US2` extends the same model and editor. `US3` depends on the local facts from US1 and the established AI boundary. Polish follows all stories. Board admission remains a governance gate before implementation acceptance.

## Phase 1 - Setup

- [ ] T001 Confirm the feature write set and existing dirty-tree exclusions in `specs/REQ-20260906-03-okr-progress-review/plan.md`
- [ ] T002 [P] Record implementation decisions and validation commands in `specs/REQ-20260906-03-okr-progress-review/research.md` and `specs/REQ-20260906-03-okr-progress-review/quickstart.md`

## Phase 2 - Foundational

- [ ] T003 Extend backward-compatible Goal normalization with optional key results in `src/lib/goal-model.mjs`
- [ ] T004 [P] Add deterministic Goal evidence, period, continuity, and numeric/qualitative progress derivation in `src/modules/goals/okr-progress/model.mjs`
- [ ] T005 Add model regression coverage for old goals, invalid periods, ordering, gaps, numeric bounds, and raw content preservation in `tests/okr-progress-model.test.mjs`

## Phase 3 - User Story 1: Review objective by time and content

- [ ] T006 [US1] Add the Goals detail route entry in `src/app/goals/[goalId]/page.js`
- [ ] T007 [US1] Implement the local-first detail page with O/K hierarchy, period summary, grouped chronology, empty state, and missing-day indicators in `src/app/goals/goal-detail-page.js`
- [ ] T008 [US1] Add responsive detail styling reusing existing Goals reading/content/value/action axes in `src/app/goals/goal-detail.css`
- [ ] T009 [US1] Add a detail navigation action to each goal card while preserving edit/delete actions in `src/app/goals/goals-page.js`
- [ ] T010 [US1] Add localized labels for detail, evidence, period, gaps, and empty states in `src/lib/i18n.mjs` and `src/app/i18n.js`
- [ ] T011 [US1] Add browser regression for Goals-to-detail navigation, chronological evidence, empty/invalid period, keyboard focus, and required widths in `e2e/run.mjs`

## Phase 4 - User Story 2: Numeric and qualitative key results

- [ ] T012 [US2] Extend the existing Goal editor with add/edit/remove KR controls and optional target/current/unit fields in `src/app/goals/goals-page.js`
- [ ] T013 [US2] Render numeric bounded progress and qualitative evidence/status fallback in `src/app/goals/goal-detail-page.js`
- [ ] T014 [US2] Add editor and KR responsive styles without adding a required quick-record step in `src/app/goals/goals.css` and `src/app/goals/goal-detail.css`
- [ ] T015 [US2] Expand normalization and persistence regression coverage for KR compatibility and account-scoped commitData behavior in `tests/goal-model.test.mjs`

## Phase 5 - User Story 3: Explicit AI completion review

- [ ] T016 [US3] Implement the strict current-cycle analysis input/output model, allowlist, fingerprint, and stale validation in `src/modules/goals/okr-progress/model.mjs`
- [ ] T017 [US3] Implement authenticated same-origin AI analysis route using shared HTTP and DeepSeek adapters in `src/modules/goals/okr-progress/server.mjs` and `src/app/api/goals/analysis/route.js`
- [ ] T018 [US3] Implement disclosure, explicit confirm/cancel, ephemeral result, and distinct offline/configuration/auth/timeout/stale states in `src/modules/goals/okr-progress/client.mjs` and `src/app/goals/goal-detail-page.js`
- [ ] T019 [US3] Add route/model tests for allowlisted payloads, strict output, provider failures, stale responses, and zero writes in `tests/okr-progress-route.test.mjs`
- [ ] T020 [US3] Add browser regression for disclosure, cancel, one request, read-only result, and no-provider state in `e2e/run.mjs`

## Phase 6 - Polish and verification

- [ ] T021 [P] Run focused model/route tests and fix only in-scope failures in `tests/okr-progress-model.test.mjs tests/okr-progress-route.test.mjs tests/goal-model.test.mjs`
- [ ] T022 [P] Run `npm run design:check` and responsive browser checks for 320/390/426/768/1280px and fix in-scope geometry in `src/app/goals/goal-detail.css src/app/goals/goals.css`
- [ ] T023 Run `npm run check` and record full-gate evidence in `specs/REQ-20260906-03-okr-progress-review/quickstart.md`
- [ ] T024 Run `git diff --check`, inspect staged paths, and prepare the acceptance handoff without staging unrelated files

## Parallel execution examples

- After T003: T004 and T002 can run in parallel.
- After T011: T012–T015 can proceed while T016–T017 are developed in separate files; integrate with one writer before shared UI edits.
- T021 and T022 can run in parallel after implementation; T023 is sequential after fixes.

## MVP scope

MVP is US1 plus the foundational model (T003–T011): Goals-to-detail navigation, chronological time/content evidence, period gaps, and backward compatibility. US2 and US3 are required for the requested complete slice before delivery.
