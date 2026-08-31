# Tasks: In-page Agent Plan Review

**Input**: Design documents from `specs/004-agent-plan-review/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/agent-plan-review.md`, `quickstart.md`

**Tests**: Mandatory under repository governance. Story tests are written before implementation and must fail for the missing behavior.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Reconcile the active LN-074 extension and lock the allowed write set.

- [x] T001 Record the Plan Agent implementation scope and evidence placeholders under LN-074 Rework 2 in PROJECT_BOARD.md
- [x] T002 Review current Diary Agent and Plan regression baselines in tests/agent-review-model.test.mjs, tests/ai-agent-review-route.test.mjs, and e2e/run-mobile.mjs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish plan-specific pure contracts without changing UI or persistence.

- [x] T003 [P] Add failing Plan input/output allowlist, overlap, vague-title, invalid proposal, and Diary compatibility tests in tests/agent-review-model.test.mjs
- [x] T004 [P] Add failing minimal payload, auth boundary, Google identifier exclusion, reply, and fallback tests in tests/ai-agent-review-route.test.mjs
- [x] T005 Implement Plan review input entities, deterministic fallback, proposal normalization, and local-plan allowlists in src/lib/agent-review-model.mjs
- [x] T006 Extend the browser provider with reviewTarget-aware minimal Plan analyze/reply payloads and local fallback in src/lib/agent-review-provider.mjs
- [x] T007 Extend server sanitization, Plan Zod schemas, prompts, and normalized responses while preserving Diary compatibility in src/lib/agent-review-route.mjs

**Checkpoint**: Focused model/route tests pass; no UI or persisted data shape has changed.

---

## Phase 3: User Story 1 - Wake Agent in Plan (Priority: P1) 🎯 MVP

**Goal**: Wake the existing illustrated Agent in Plan, scan selected-day local plans, and anchor one compact annotation to a concrete local plan without mutation.

**Independent Test**: Seed overlapping/vague local plans, wake Plan Agent, and verify one stable local plan ID becomes active while all stored plans remain unchanged; Google-only/empty days expose no wake control.

### Tests for User Story 1

- [x] T008 [US1] Add failing Plan wake, local-plan anchoring, Google-only/empty visibility, and 2-second fallback journeys in e2e/run-mobile.mjs

### Implementation for User Story 1

- [x] T009 [US1] Add Plan Agent session lifecycle, selected-day local/Google input derivation, start/stop/advance, and cancellation orchestration in src/app/page.js
- [x] T010 [US1] Pass Plan Agent state, callbacks, and stable local plan identity through src/app/home-record-views.js
- [x] T011 [US1] Add active data-plan-id, block geometry reporting, compact annotation anchoring, and editor-open cancellation hooks in src/app/calendar-view.js
- [x] T012 [US1] Add Plan-specific idle/scanning/review/complete copy in src/lib/i18n.mjs
- [x] T013 [US1] Style the illustrated wake/traveler and single active-block accent without duplicate rules or rail/add-button obstruction in src/app/home-day-plan.css

**Checkpoint**: User Story 1 passes independently at mobile and desktop widths with zero writes.

---

## Phase 4: User Story 2 - Discuss a Plan Issue (Priority: P1)

**Goal**: Reply or chat transiently about the active plan and keep the source unchanged until a separate resolution action.

**Independent Test**: Reply to a vague-plan prompt, inspect the attached conversation, and verify chat and keep-original preserve every stored plan field exactly.

### Tests for User Story 2

- [x] T014 [US2] Add failing transient conversation, keep-original byte/minute preservation, busy, keyboard, and cancellation journeys in e2e/run-mobile.mjs

### Implementation for User Story 2

- [x] T015 [US2] Add Plan reply orchestration and transient message/proposal state using the active local plan allowlist in src/app/page.js
- [x] T016 [US2] Generalize the existing row-local conversation component for Plan prompts, reply placeholders, progress, and keep-original behavior in src/app/agent-diary-review.js
- [x] T017 [US2] Add compact cardless Plan conversation and vertically stacked mobile action styles in src/app/home-day-plan.css

**Checkpoint**: User Stories 1 and 2 pass independently; no chat-only path invokes commitData.

---

## Phase 5: User Story 3 - Confirm a Plan Update (Priority: P1)

**Goal**: Preview and explicitly apply a valid title-only or time-only proposal to the same local plan.

**Independent Test**: Apply synthetic title and time proposals and verify only proposed fields change; invalid, unknown, cross-date, and Google targets produce no update action or write.

### Tests for User Story 3

- [x] T018 [P] [US3] Add browser-write proposal revalidation and field-preservation regression cases in tests/agent-review-model.test.mjs
- [x] T019 [US3] Add failing proposal preview, explicit title/time update, invalid target, stale active plan, and save-failure journeys in e2e/run-mobile.mjs

### Implementation for User Story 3

- [x] T020 [US3] Add current-state proposal revalidation and explicit update delegation through the existing save path in src/app/page.js
- [x] T021 [US3] Add concise before/after proposal preview and a single update-plan action to src/app/agent-diary-review.js
- [x] T022 [US3] Add Plan proposal/update/error copy in src/lib/i18n.mjs
- [x] T023 [US3] Style proposal preview and two vertically stacked mobile actions without menu separators in src/app/home-day-plan.css

**Checkpoint**: All three stories pass independently and Google events remain impossible update targets.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Prove responsive, offline, privacy, compatibility, and repository quality requirements.

- [x] T024 Run focused Node tests and Plan Agent mobile E2E, fixing regressions only in the approved implementation/test files
- [x] T025 Capture synthetic idle, scanning, review, proposal, and complete screenshots plus geometry evidence under output/ln-074-plan-agent-review/
- [x] T026 Run npm run design:check and verify 320–1280px targets, overflow, rail geometry, reduced motion, and action stacking
- [x] T027 Run npm run check and git diff --check, preserving unrelated dirty working-tree changes
- [x] T028 Record exact evidence, remaining real-model/manual checks, and Returned status under LN-074 Rework 2 in PROJECT_BOARD.md

---

## Phase 7: Rework 17 - Persistent Plan Companion (User Story 1, Priority: P1)

**Goal**: Keep the illustrated Agent visible throughout Plan while preserving local-plan-only review activation.

**Independent Test**: Show empty, Google-only, and local-plan dates in Plan. The first two retain the
non-interactive figure and one-line invitation with zero wake button/request/write; the local-plan date
retains the existing 44px wake/review journey.

- [x] T029 [US1] Replace the Google-only hidden-state assertion with failing empty/Google-only persistent-presence, exact-copy, no-button, one-line, zero-write, and responsive assertions in e2e/run-mobile.mjs
- [x] T030 [US1] Add the exact Chinese passive invitation and concise English localized equivalent in src/lib/i18n.mjs
- [x] T031 [US1] Split passive Plan presence from actionable local-plan wake rendering in src/app/calendar-view.js without changing review/session/request paths
- [x] T032 [US1] Add 12px muted single-line passive hint and non-interactive artwork geometry without add-action/right-rail overlap in src/app/home-day-plan.css
- [x] T033 [US1] Run the focused Plan Agent E2E and capture 320/390px empty and Google-only evidence under output/playwright/ln-074-plan-agent-persistent/
- [x] T034 Run npm run design:check, npm run check, and git diff --check; review the scoped diff and record Rework 17 Returned evidence in PROJECT_BOARD.md

---

## Dependencies & Execution Order

- Phase 1 precedes all implementation.
- Phase 2 blocks every user story because UI must consume normalized Plan contracts.
- US1 establishes activation and anchoring; US2 depends on the active Plan session from US1; US3 depends on US2 proposal state.
- Phase 6 begins only after desired stories pass their independent checkpoints.

## Parallel Opportunities

- T003 and T004 touch separate test concerns and can be prepared in parallel, though one writer executes changes serially in this checkout.
- T018 can be prepared independently from the initial US3 browser journey design.
- T030 and the failing T029 assertions touch separate files, but the main checkout still uses one writer and executes them serially.
- Read-only screenshot review and test-output inspection may run in parallel with no file writes.

## Implementation Strategy

1. Build and verify the Plan trust boundary first.
2. Deliver US1 as the smallest visual MVP: optional wake, scan, anchor, no writes.
3. Add transient discussion without broadening persistence.
4. Add the explicit update action only after proposal revalidation is covered.
5. Finish with responsive visual evidence and the full repository gate.

## Format Validation

All 34 tasks use the required checkbox, sequential task ID, optional `[P]`, required story label in
story phases, concrete action, and exact repository path.
