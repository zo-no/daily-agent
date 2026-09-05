---
description: "LN-082 dependency-ordered implementation task list"
---

# Tasks: Daily Work Log Agent Tool

**Board Item**: `LN-082`
**Input**: Feature artifacts from `/specs/017-daily-log-agent-tool/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, accepted preview-only boundary, one-writer ownership

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile LN-082, product admission, architecture, active feature, dirty tree, permissions,
  and current evidence in `PROJECT_BOARD.md`, `product.md`, `ARCHITECTURE.md`, `.specify/feature.json`,
  and `git status --short`; confirm all dirty UI/spec work outside LN-082 remains untouched
- [x] T002 Confirm the write set and exclusions in `specs/017-daily-log-agent-tool/spec.md`: no product
  UI/route, `commitData`, MCP, Codex config, new dependency, deployment, commit, push, or acceptance change
- [x] T003 [P] Record the single preview-only Tool exception and dependency direction in
  `ARCHITECTURE.md`, `docs/decisions/0005-preview-only-daily-log-agent-tool.md`, and
  `docs/decisions/README.md` without weakening ADR-0003's default production tool-free boundary

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Lock the pure proposal, Mastra adapter, and Studio boundaries before source implementation.

- [x] T004 [P] [US1] Add failing core/schema tests in `tests/mastra-daily-log-tool.test.mjs` for Chinese
  and English grouping, exact candidate shape, 30-item/8,000-character bounds, real dates, strict fields,
  duplicates, whitespace/control normalization, deterministic output, and fingerprint sensitivity
- [x] T005 [P] [US2] Add failing Tool/Agent tests in `tests/mastra-daily-log-tool.test.mjs` for the current
  two-argument `execute`, pre-abort behavior, `Agent` construction, one Tool under its ID, missing-model
  rejection, absent memory, and no write/network contract
- [x] T006 [P] [US3] Extend `tests/mastra-studio.test.mjs` with failing expectations for the daily-log
  Agent and standalone Tool registration while retaining existing Agent/Workflow assertions
- [x] T007 Run the focused Node tests under Node 22 and record the expected module/registration failures
  before creating `src/modules/agent-bridge/daily-log/` or the new Mastra folders

## Phase 3: User Story 1 - Prepare a safe daily work log proposal (Priority: P1)

**Goal**: Return one deterministic, strict, unsaved quick-record-compatible proposal from bounded facts.

**Independent Test**: `tests/mastra-daily-log-tool.test.mjs` proves valid/invalid/deterministic behavior
without importing Mastra for core-only cases.

- [x] T008 [US1] Implement strict constants and Zod input/output schemas in
  `src/modules/agent-bridge/daily-log/contract.mjs`
- [x] T009 [US1] Implement real-date validation, Unicode/whitespace normalization, duplicate/total bound
  checks, FNV-1a fingerprinting, localized status formatting, and `preview-required` proposal construction
  in `src/modules/agent-bridge/daily-log/core.mjs`
- [x] T010 [US1] Expose only the supported core contract from
  `src/modules/agent-bridge/daily-log/index.mjs`
- [x] T011 [US1] Run core-focused cases in `tests/mastra-daily-log-tool.test.mjs` and verify every supplied
  item appears once, no time/fact is invented, invalid input returns no partial proposal, and repeated
  normalized input is byte-for-byte stable

## Phase 4: User Story 2 - Give one Mastra Agent exactly one Tool (Priority: P1)

**Goal**: Implement the requested independent Tool folder and dedicated `new Agent` composition.

**Independent Test**: Direct Tool execution matches the core; Agent discovery shows exactly one Tool and no memory.

- [x] T012 [US2] Implement `prepareDailyLogTool` with `createTool`, strict shared schemas, current
  `execute(inputData, context)` signature, and pre-abort handling in
  `src/mastra/tools/daily-log/index.mjs`
- [x] T013 [US2] Implement `createDailyLogAgent` with `new Agent`, stable instructions, ID-keyed Tool
  registration, zero retries, no memory, and missing-model validation in
  `src/mastra/agents/daily-log/index.mjs`
- [x] T014 [US2] Run Tool/Agent-focused cases in `tests/mastra-daily-log-tool.test.mjs` and the existing
  tool-free regression in `tests/agent-review-runtime.test.mjs`

## Phase 5: User Story 3 - Inspect in localhost Studio (Priority: P2)

**Goal**: Register the concrete Agent object and standalone Tool for synthetic development testing.

**Independent Test**: The test Mastra registry resolves the new Agent and Tool, and the Tool executes without Provider credentials.

- [x] T015 [US3] Configure the development-only DeepSeek model and export
  `dailyLogStudioAgent` from `src/mastra/studio-daily-log.mjs`, reusing existing Studio environment rules
- [x] T016 [US3] Register `dailyLogStudioAgent` and `prepareDailyLogTool` in `src/mastra/index.ts` while
  leaving production `src/mastra/index.mjs` unchanged
- [x] T017 [US3] Pass the updated `tests/mastra-studio.test.mjs` registry/source assertions and direct
  standalone Tool execution without a Provider key

## Phase 6: Integration, Evidence, and Return

- [x] T018 [P] Reconcile exact code locations and not-yet-built confirmation/MCP boundaries in
  `specs/017-daily-log-agent-tool/quickstart.md`, `ARCHITECTURE.md`, and ADR-0005
- [x] T019 Run the focused Node command from `specs/017-daily-log-agent-tool/quickstart.md` under Node 22
- [x] T020 Run `npm run design:check`, full `npm test`, and `git diff --check`; then run complete
  `npm run check`, preserving and separately reporting unrelated dirty-tree failures
- [x] T021 Use Sigo to review all generated user-facing/internal documentation for completeness,
  accuracy, format/constraints, omissions, and executable steps; fix only LN-082 text
- [x] T022 Review the final diff against LN-082, spec, plan, contracts, Constitution, and declared write
  set; confirm no product UI, persistence, MCP, dependency, secret, or unrelated file entered the change
- [x] T023 Record focused/full-gate evidence and open Provider/product/MCP/deployment/adoption checks in
  the LN-082 row of `PROJECT_BOARD.md`; mark only Returned, never Accepted

## Dependencies and Execution Order

- T001–T003 establish governance and architecture before implementation.
- T004–T007 must fail for the intended missing implementation/registration reason before T008.
- T008–T011 complete the core and block Tool/Agent work.
- T012–T014 complete P1 Mastra composition and block Studio integration.
- T015–T017 complete Studio visibility; they do not block standalone core/Tool use.
- T018–T023 require all desired stories and block return to the controller.
- `[P]` denotes file/dependency independence only; the main checkout still has one writer.

## Implementation Strategy

1. Deliver the pure proposal core as the smallest independently useful contract.
2. Wrap it once with the requested Mastra Tool and give one dedicated Agent exactly that Tool.
3. Add localhost Studio discoverability without expanding production runtime permissions.
4. Validate focused behavior before running the dirty repository's full gate.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OKR modification, or worktree merge.
- Product confirmation/write UI, `commitData`, MCP server/configuration, remote endpoint, OAuth, direct
  Supabase write, Agent memory, schedules, task-history reads, new dependencies, or broad refactors.
