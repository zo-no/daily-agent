---
description: "Dependency-ordered migration of every existing remote AI capability to embedded Mastra"
---

# Tasks: Unified Runtime AI Execution

**Board Item**: `LN-074 Rework 20`
**Input**: Feature artifacts from `specs/012-mastra-ai-consolidation/`
**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, runtime contract,
Constitution check, clear board readiness and user authorization

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Format: `[ID] [P?] [Story?] Description with exact path`

- **[P]** means dependency-independent work in different files. It does not authorize concurrent
  writers in the main checkout.
- **[Story]** maps implementation and tests to one independently testable user story.
- Every task names its exact path, verification, and relevant exclusions.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile `LN-074 Rework 20`, the active feature pointer, `product.md`, `ARCHITECTURE.md`, existing Diary/Plan/daily/classifier/domain contracts, permissions, current validation evidence, and `git status`
- [x] T002 Declare the one-writer change contract, exact write set, public-contract invariants, exclusions, verification, rollback, and external evidence before editing application files
- [x] T003 [P] Prove no durable product behavior changes are needed in `product.md`; preserve the existing admissions for `LN-069`, `LN-071`, and `LN-074` instead of adding duplicate product truth

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Lock the five-capability execution and legacy-removal contract before implementation.

- [x] T004 [P] [US1] Replace the Diary-only runtime regression with five capability registration, strict input/output, one-call, no-retry, no-tool/Agent-memory/application-storage/persistent-snapshot, abort, invalid-output, and injected-normalizer tests in `tests/agent-review-runtime.test.mjs`
- [x] T005 [P] [US2] Add DeepSeek URL/key/model validation, 512 KiB declared/streamed response bounds, Abort propagation, and private-error redaction tests in `tests/deepseek-model.test.mjs`
- [x] T006 [P] [US1] Add Plan-through-Mastra success and unchanged public error tests in `tests/ai-agent-review-route.test.mjs`
- [x] T007 [P] [US1] Add Mastra success/failure compatibility tests for daily, category, and domain routes in `tests/ai-daily-review-route.test.mjs`, `tests/ai-classifier-route.test.mjs`, and `tests/ai-domain-review-route.test.mjs`
- [x] T008 [P] [US3] Add a source/dependency inventory assertion to `tests/project-structure.test.mjs` covering all four routes, five capability IDs, one provider adapter, zero top-level `ai` imports, zero direct `generateText`/`Output.object`, and zero hand-written `/chat/completions`
- [x] T009 Run the Node 22 focused tests from `specs/012-mastra-ai-consolidation/quickstart.md` and record the expected pre-implementation failures without changing unrelated snapshots or output assets

## Phase 3: User Story 1 - Keep Every Existing AI Journey Working (Priority: P1)

**Goal**: Route all five existing remote capabilities through one strict embedded Mastra execution mechanism while preserving their public contracts.

**Independent Test**: Run one valid synthetic model response for every capability and prove the same route response with exactly one model call and one project normalization.

- [x] T010 [US2] Create the single HTTPS/local-test DeepSeek model adapter and 512 KiB bounded provider transport in `src/lib/deepseek-model.mjs`
- [x] T011 [US1] Replace the Diary-specific Agent factory with a capability-parameterized, tool-free, Agent-memory-free Agent that configures no application or durable storage in `src/mastra/agents/structured-proposal-agent.mjs`
- [x] T012 [US1] Replace the Diary-specific Workflow with a capability-parameterized transient generation-and-normalization Workflow in `src/mastra/workflows/structured-proposal-workflow.mjs`
- [x] T013 [US1] Replace the Diary-only composition root with allowlisted capability definitions and generic create/execute exports in `src/mastra/index.mjs`
- [x] T014 [US1] Migrate Diary and Plan analyze/reply execution to the shared runtime while preserving route schemas, prompts, normalizers, limits, and public errors in `src/lib/agent-review-route.mjs`
- [x] T015 [US1] Migrate single-day chronological review to the shared runtime while preserving sanitization, chronology, prompt, output limit, normalizer, and public errors in `src/lib/daily-review-route.mjs`
- [x] T016 [US1] Migrate existing-category classification to the shared runtime while preserving request bounds, ID/score allowlists, ordering, and public errors in `src/lib/ai-classifier-route.mjs`
- [x] T017 [US1] Migrate confirmed domain review to the shared runtime while preserving its strict response validator, financial-safety rejection, disclosure contract, and public errors in `src/lib/domain-review-route.mjs`
- [x] T018 [US1] Run all five route suites plus `tests/agent-review-model.test.mjs`, `tests/daily-review-model.test.mjs`, and `tests/domain-review-model.test.mjs` under Node 22 and correct only migration regressions

## Phase 4: User Story 2 - Fail Consistently and Preserve Offline Use (Priority: P1)

**Goal**: Centralize provider construction and safe failures without weakening response bounds, local fallback, or zero-write behavior.

**Independent Test**: Exercise declared and streamed oversized provider responses, abort, rate limit, invalid structure, and unavailable provider for each public route; verify existing error/fallback behavior and zero writes.

- [x] T019 [US2] Add shared safe runtime error classification in `src/mastra/workflows/structured-proposal-workflow.mjs` without importing top-level AI SDK error classes or exposing upstream details
- [x] T020 [US2] Make `src/lib/agent-review-route.mjs`, `src/lib/daily-review-route.mjs`, `src/lib/ai-classifier-route.mjs`, and `src/lib/domain-review-route.mjs` translate shared runtime failures into their unchanged public codes
- [x] T021 [US2] Run provider, route, browser-provider, and local-fallback regression in `tests/deepseek-model.test.mjs`, all `tests/ai-*-route.test.mjs`, and existing model/provider tests; verify no UI/source-data file was modified

## Phase 5: User Story 3 - Remove the Superseded Execution System (Priority: P1)

**Goal**: Leave one project-owned remote execution path and no legacy direct model invocation.

**Independent Test**: Source/dependency inventory reports five Mastra capabilities, one provider factory module, and zero project direct generation or raw model-endpoint paths.

- [x] T022 [US3] Delete superseded `src/mastra/agents/diary-review-agent.mjs` and `src/mastra/workflows/diary-review-workflow.mjs` after their generic replacements pass focused tests
- [x] T023 [US3] Remove all project top-level `ai` imports, direct `generateText`/`Output.object`, raw `/chat/completions` request construction, raw provider JSON parsing, and duplicated DeepSeek base-URL helpers from the four route modules
- [x] T024 [US3] Remove the direct `ai` dependency and refresh only `package.json` and `package-lock.json`; verify `@mastra/core@1.63.2` and `@ai-sdk/openai-compatible@2.0.69` remain the intended direct dependencies
- [x] T025 [US3] Run `tests/project-structure.test.mjs`, the quickstart source inventory, `npm ls`, and `git diff --check`; ensure third-party internals and documentation examples are excluded from the zero-direct-call assertion

## Final Phase: Integration, Evidence, and Return

- [x] T026 [P] Update the current technical baseline and supersede the Diary-only wording in `ARCHITECTURE.md` and `docs/decisions/0003-embed-mastra-without-standalone-runtime.md`; add the feature package to `specs/README.md`
- [x] T027 Run all focused runtime/provider/route/model/structure regression listed in `specs/012-mastra-ai-consolidation/quickstart.md` under Node 22 and inspect error output for false positives or stale direct-path assumptions
- [ ] T028 Pass `/Users/kual/.nvm/versions/node/v22.22.0/bin/npm test`, production build, `npm run design:check`, PWA regression, the complete `npm run check`, and `git diff --check`; the current scoped implementation passes unit/build/design/PWA/diff evidence, but the full gate is blocked at 33/34 mobile scenarios by the pre-existing public OAuth reduced-motion transform assertion outside this feature's write set
- [x] T029 Run production dependency inventory/audit against the official registry and record the actual result in `PROJECT_BOARD.md`; do not force-upgrade Mastra internal provider aliases
- [x] T030 Review the final diff against `spec.md`, `plan.md`, `tasks.md`, the Constitution, architecture, declared write set, and board acceptance; preserve all unrelated dirty changes
- [x] T031 Use sigo to review generated specification, `ARCHITECTURE.md`, `docs/decisions/0003-embed-mastra-without-standalone-runtime.md`, `PROJECT_BOARD.md`, and the final explanation for completeness, accuracy, constraints, omissions, and executability; apply only in-scope corrections
- [x] T032 Record focused/full counts, package/source removal, bounded-response evidence, rollback, build/audit status, external Node 20/dependency/real-model evidence, and the current `Waiting` status in `PROJECT_BOARD.md` without marking Returned/Accepted, committing, pushing, or deploying

## Dependencies and Execution Order

- T001–T003 block every application edit.
- T004–T009 define the failing contract before T010–T024 implementation.
- T010–T013 establish the bounded provider and shared runtime before any route migration.
- T014–T017 may be implemented sequentially only; one writer owns their shared imports and runtime.
- T022–T024 run only after all five focused capability suites pass.
- T026 documents verified structure; T027–T030 block Return; T031–T032 close text quality and evidence.
- No parallel writer is authorized; `[P]` marks file independence only.

## Implementation Strategy

1. Prove the generic runtime with synthetic models.
2. Migrate Diary and Plan behind the unchanged shared endpoint.
3. Migrate daily review, classification, and domain review one at a time with their focused suite.
4. Centralize provider bounding and remove direct execution/dependency only after compatibility passes.
5. Run full repository gates and record external blockers without expanding into deployment work.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive reset/history rewrite, OKR
  modification, or worktree merge.
- New provider, model gateway, tool, memory, storage, snapshot, schema, migration, UI, endpoint,
  homepage control, background work, LN-077 implementation, or internal Node runtime upgrade.
