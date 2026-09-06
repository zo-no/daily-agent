# Tasks: REQ-20260906-02

- [x] T001 Reconcile LN-083, existing Agent boundaries, dirty tree, and current Hero behavior.
- [x] T002 [US1] Create strict bounded model, authenticated route, and browser provider under `src/modules/diary/today-plan-clarification/`.
- [x] T003 [US1] Add disclosure/session orchestration and portaled clarification overlay under `src/app/_components/home/`.
- [x] T004 [US2] Add absolute record/plan markers without row or plan-canvas layout participation.
- [x] T005 [US3] Reuse `commitData` for explicit record replacement or plan-end ordinary-record creation.
- [x] T006 Add strict model/route/provider regression in `tests/today-plan-clarification.test.mjs`.
- [x] T007 Run Node 22 full gate and responsive browser evidence; record remaining shared failures separately.
- [x] T008 Update final evidence only after focused and full verification; do not commit, push, deploy, or mark Accepted.

## Verification evidence

- Focused Node 22 regression: 4/4 passed.
- `npm run design:check`: 11/11 passed.
- LN-083 responsive browser scenario: 1/1 passed, including detached marker geometry and focus return.
- Full Node 22 gate: 295/295 passed; the browser stage completed 42/42 scenarios.
- The three previously observed browser failures were shared/out-of-scope regressions: category hierarchy ledger inset, LN-076 grouped fixed-row inset, and the legacy Record-heading “Edit structure” link timeout. They were corrected and independently re-run; none is evidence against the LN-083 capability.
- PWA production build, installability, authenticated offline cache/persistence, and controlled-update checks passed in the same verification run.
- Real non-sensitive DeepSeek validation passed with synthetic English input: analyze 3/3 (747ms, 1038ms, 817ms) and reply 2/2 (632ms, 533ms); every result passed the strict schema, provider binding, and fingerprint echo checks. This does not establish real-user Chinese quality or long-term usefulness.
- Still open before `Accepted`: product-owner 390px visual confirmation, 14-day use/cancel/rewrite observation, target-environment deployment evidence, and real-user content-quality review.
- No commit, push, deploy, merge, or history rewrite was performed.

## Resumed implementation tasks

- [x] R001 Add Goal model, v5 state migration, optional Plan goal/priority metadata, and focused model tests.
- [x] R002 Add `/goals` CRUD and unlink-on-delete behavior.
- [x] R003 Extend the existing PlanEditor/Home call chain without changing Google read-only behavior.
- [x] R004 Add local plan/record evidence, bounded relation provider, strict route, and focused regression.
- [x] R005 Make batch classification the default organize task and add session-only plan/record metrics.
- [ ] R006 Run independent responsive acceptance, full quality gate, and record remaining evidence before Accepted.

## Resumed verification evidence

- Node 22 `npm test`: 345/345 passed, including Goal/Plan normalization and local plan-record evidence.
- `npm run design:check`: 11/11 passed; `npm run build` passed and includes `/goals` plus
  `/api/organize/plan-record-review`.
- `git diff --check` passed.
- Browser/PWA gate remains open: the latest completed run reached 32/44 scenarios before the
  stale smart-organize default assertion was updated to match batch classification. Existing shared
  dirty-tree geometry/search failures remain and the browser run needs a fresh pass. No Accepted
  status is inferred from the passing static gates.
