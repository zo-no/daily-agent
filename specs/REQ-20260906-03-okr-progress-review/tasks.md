---
description: "Log Note dependency-ordered Goal Loop task list"
---

# Tasks: Goal Loop — outcome alignment and evidence review

**Requirement**: `REQ-20260906-03`
**Input**: Feature artifacts from `/specs/REQ-20260906-03-okr-progress-review/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, owner discussion, clear board readiness,
and explicit implementation permission

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.
>
> This task list is a design candidate. The Core-Chain Change Gate is still pending, so no
> implementation task is ready to start.

## Task format

Each line uses an ID, an optional parallel marker, an optional story marker, and a description with
an exact path.

- `[P]` means dependency-independent work in different files. It does not authorize concurrent
  writers in the main checkout.
- Every task names its exact path, verification, and relevant exclusion.

## Phase 1: Reconcile and guard the work

- [ ] T001 Reconcile the Goals/OKR scope with the related board item, current dirty tree, existing
  `REQ-20260906-02` work, permissions, and validation evidence in `PROJECT_BOARD.md`,
  `specs/REQ-20260906-03-okr-progress-review/spec.md`, and `git status`; do not edit governance
  files or unrelated work.
- [ ] T002 Confirm owner decisions for active-outcome cap, horizon presets, many-to-many associations,
  lifecycle labels, AI provider/retention, and pilot measures in
  `specs/REQ-20260906-03-okr-progress-review/spec.md`; until confirmed, keep all implementation
  tasks blocked.
- [ ] T003 Confirm the one-writer Change Contract and exact source write set in
  `specs/REQ-20260906-03-okr-progress-review/plan.md`; no commit, push, deployment, migration,
  or board-status change belongs to this feature-package run.

## Phase 2: Contract-first regressions

- [ ] T004 [P] Add Goal/Success Signal normalization and compatibility regressions in
  `tests/goal-model.test.mjs`; cover optional fields, numeric direction/bounds, qualitative fallback,
  lifecycle states, old payloads, and raw-note preservation. Verify failures before implementation;
  do not change unrelated tests.
- [ ] T005 [P] Add Plan/Evidence relationship regressions in
  `tests/okr-progress-model.test.mjs` and `tests/plan-record-review.test.mjs`; cover optional
  Goal/KR references, candidate versus accepted evidence, out-of-period exclusion, invalid date/time,
  multiple accepted outcomes, and plan-completion separation.
- [ ] T006 [P] Add AI alignment contract regressions in
  `tests/okr-progress-route.test.mjs`; cover selected-source disclosure, bounded allowlist, strict
  versioned output, direction/confidence enums, source references, stale/account binding, cancellation,
  and zero writes. Use synthetic sources only.
- [ ] T007 [P] Add browser/PWA/account/backup regression scenarios in
  `e2e/run-mobile.mjs`, `e2e/run-pwa.mjs`, and the existing backup/account test paths; cover
  unchanged quick capture, Goal detail, offline browsing, account replacement, old backup restore,
  and no cross-account source leakage.

## Phase 3: User Story 1 — Define a meaningful outcome (P1)

**Goal**: User-owned outcomes and zero to three success signals are understandable without becoming
a task list; one signal is recommended when the outcome must be tracked.

**Independent Test**: Create numeric and qualitative outcomes, reopen them, and round-trip old data.

- [ ] T008 [US1] Extend the canonical Goal model with optional meaning, guardrails, cadence, and
  lifecycle-compatible fields in `src/lib/goal-model.mjs`; reuse existing normalization and preserve
  old payloads. Verify with `tests/goal-model.test.mjs`; do not add a new store.
- [ ] T009 [US1] Extend the existing Goals editor/index in
  `src/app/_components/goals-workspace.js`, `src/app/goals/goals-page.js`, and
  `src/app/goals/goals.css` to capture zero to three signals (one recommended for a trackable
  outcome) and optional meaning/horizon without
  changing quick record. Verify keyboard/focus, 44px targets, and five widths; do not add a required
  goal picker to the composer.
- [ ] T010 [US1] Update localized outcome/signal/lifecycle copy in `src/lib/i18n.mjs`; verify
  English/Chinese labels and empty/error states; do not add unsupported product claims.

## Phase 4: User Story 2 — Relate plans and records without slowing capture (P1)

**Goal**: Plans and records can be optionally related while raw notes and plan semantics stay intact.

**Independent Test**: Create a linked plan, make an unlinked quick record, accept/remove evidence, and
verify all source text is unchanged.

- [ ] T011 [US2] Extend plan normalization and editor surfaces in
  `src/lib/plan-model.mjs` and `src/app/_components/plan-editor.js` with an optional signal
  reference; verify existing Goal/priority behavior, Google read-only behavior, and old backups.
- [ ] T012 [US2] Extend evidence relationship derivation and explicit association commands in
  `src/modules/goals/okr-progress/model.mjs` and `src/lib/goal-model.mjs`; classify unassociated
  records as candidates only and route accepted changes through `commitData`; verify raw-note and
  account invariants in `tests/okr-progress-model.test.mjs` and `tests/goal-model.test.mjs`.
- [ ] T013 [US2] Add visible association/removal controls to
  `src/app/goals/goal-detail-page.js` and `src/app/goals/goal-detail.css`; verify no extra quick-
  record action, reversible removal, multi-outcome behavior selected by the owner, and responsive
  focus; do not auto-accept AI candidates.

## Phase 5: User Story 3 — Review progress from time and evidence (P1)

**Goal**: One detail view separates outcome progress, evidence coverage, and plan activity.

**Independent Test**: Seed valid, invalid, empty, and gapped periods and verify chronology and honest
states at 320/390/426/768/1280px.

- [ ] T014 [US3] Implement deterministic progress facts and trend states in
  `src/modules/goals/okr-progress/model.mjs`; verify numeric/qualitative separation, invalid
  periods, gaps, evidence coverage, and stable ordering without persistence.
- [ ] T015 [US3] Compose the Goal detail surface in
  `src/app/goals/[goalId]/page.js` and `src/app/goals/goal-detail-page.js`; show outcome, signals,
  plans, evidence, gaps, and insufficient-evidence explanation; verify raw content and source dates
  remain unchanged.
- [ ] T016 [US3] Align styles and interaction states in
  `src/app/goals/goal-detail.css` and `src/app/goals/goals.css`; verify existing Goals reading/
  content/value/action axes, keyboard focus, reduced motion, 44px targets, and no overflow. Do not
  introduce a new inset or a second detail route.
- [ ] T017 [US3] Add browser regression for Goal index-to-detail review in `e2e/run-mobile.mjs`;
  cover empty/invalid/gap states, numerical bounds, qualitative fallback, plan separation, and five
  required widths.

## Phase 6: User Story 4 — Ask AI for an explainable alignment review (P2, isolated)

**Goal**: AI reduces review effort while remaining a source-bound, read-only proposal.

**Independent Test**: Disclose selected sources, receive a strict response, accept one association, and
verify stale/error/offline/account-change paths perform zero writes.

- [ ] T018 [US4] Define the versioned alignment request/response and deterministic normalizer in
  `src/modules/goals/okr-progress/model.mjs` and
  `src/modules/goals/okr-progress/server.mjs`; verify source allowlist, bounds, direction/confidence,
  reason, citations, and fingerprint binding. Do not expose credentials or raw storage keys.
- [ ] T019 [US4] Add the authenticated same-origin route in
  `src/app/api/goals/analysis/route.js` using existing shared AI boundaries; verify one request,
  timeout/rate limits, invalid output rejection, no logs of raw content, and zero-write failures.
- [ ] T020 [US4] Add disclosure, source selection, cancellation, stale state, and explicit candidate
  acceptance in `src/app/goals/goal-detail-page.js` and the existing account data provider; verify
  accepted links use one `commitData` and AI never writes directly.
- [ ] T021 [US4] Add focused route/provider/model coverage in
  `tests/okr-progress-route.test.mjs` and browser coverage in `e2e/run-mobile.mjs`; use synthetic
  provider data, verify citations and account isolation, and keep real-user/provider quality as open
  manual evidence.

## Final phase: Integration, evidence, and return

- [ ] T022 [P] Update only feature-local documentation in
  `specs/REQ-20260906-03-okr-progress-review/quickstart.md` and `research.md` after the verified
  contract changes; do not edit `PROJECT_BOARD.md` in the implementation worktree.
- [ ] T023 Run focused Goal, plan/evidence, and AI regressions; inspect the first relevant failure and
  separate pre-existing dirty-tree failures from the feature write set.
- [ ] T024 Run `npm run design:check`, responsive mobile review, PWA/offline/account/backup checks,
  and record screenshots/logs in the feature package; do not claim real provider or deployment success
  from synthetic runs.
- [ ] T025 Run `npm run check` and `git diff --check`; preserve unrelated dirty changes and report
  any shared baseline failures exactly.
- [ ] T026 Review the final diff against `spec.md`, `plan.md`, the Constitution, and the board;
  return evidence to the controller. Do not commit, push, deploy, merge, or mark Accepted.

## Dependencies and Execution Order

- T001–T003 and owner discussion block all implementation.
- T004–T007 define failing/contract coverage before their corresponding implementation tasks.
- US1 blocks US2 and US3 model changes; US3 local facts block US4 AI review.
- T023–T026 are sequential after implementation and focused fixes.
- `[P]` marks file-level independence only; it never authorizes overlapping main-checkout writers.

## Implementation Strategy

1. Deliver the local Goal Loop foundation: outcome, signals, optional plan relation, and evidence facts.
2. Independently validate quick-record, offline, account, raw-note, backup, and responsive invariants.
3. Add the AI review only as an isolated, explicitly confirmed proposal path.
4. Run the full gate and 14-day pilot; return evidence to the controller for independent acceptance.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  board or OKR modification, or worktree merge.
- New dependencies, migrations, background automation, mandatory recording fields, autonomous AI
  writes, external data connectors, or broad refactors outside the admitted write set.
