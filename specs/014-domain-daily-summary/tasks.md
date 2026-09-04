---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Current-Domain Daily Summary

**Board Item**: `LN-079`
**Requirement**: `REQ-20260903-01`
**Input**: Feature artifacts from `/specs/014-domain-daily-summary/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only; `PROJECT_BOARD.md`
> remains the sole task-status and acceptance source.

## Phase 1: Reconcile and Guard the Work

- [X] T001 Reconcile `PROJECT_BOARD.md`, `specs/014-domain-daily-summary/spec.md`, `specs/014-domain-daily-summary/plan.md`, current `git status`, weekly-summary evidence, permissions, and one-writer ownership before editing application files.
- [X] T002 Confirm the exact allowed write set and exclusions in `specs/014-domain-daily-summary/plan.md`; preserve the dirty plan-versus-diary trial, home-Agent changes, Google Calendar changes, Mastra Studio entry, package metadata, and unrelated user files.
- [X] T003 [P] Re-read `product.md`, `ARCHITECTURE.md`, `DESIGN.md`, `docs/设计规范/AGENTS.md`, and `docs/设计规范/规范/页面/领域复盘页面规范.md`; verify current-domain/local-today/session-only behavior and the ordinary/periodic split exception are admitted.

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Define the daily scope, Mastra boundary, privacy contract, and UI behavior before implementation.

- [X] T004 [P] Add model and response-contract tests in `tests/daily-domain-summary-model.test.mjs` for local today, current-domain membership, ordinary/periodic counts, plan/other-domain/unresolved exclusion, stable newest-80 ordering, Unicode truncation without source mutation, exact request keys, source coverage, output bounds, general safety, and investment safety.
- [X] T005 [P] Add route/provider contract tests in `tests/ai-daily-domain-summary-route.test.mjs` for exact fields, same-origin, Bearer, content type, 256 KiB body, rate limit, no-store, one-call/no-retry, timeout/Abort, Mastra capability `domain-daily-summary`, invalid output, unsafe output, and bounded public errors.
- [X] T006 [P] Extend `tests/project-structure.test.mjs` and `tests/public-policies.test.mjs` for the new capability and bilingual daily-domain policy; assert no CLI, standalone runtime, tool, memory, persistence, or plan-comparison boundary.
- [X] T007 [P] Add a filterable daily-summary journey in `e2e/run-mobile.mjs` using synthetic fixtures and `[data-daily-*]` selectors for placement, disclosure, empty/no-send, confirm, success, Stop, retry, stale scope, no-write, focus, 44px targets, and five viewport widths.
- [X] T008 Run the focused tests from `specs/014-domain-daily-summary/quickstart.md` and record expected pre-implementation failures without changing unrelated snapshots, generated output, or dirty user changes.

## Phase 3: User Story 1 - Summarize Today's Selected-Domain Notes (Priority: P1)

**Goal**: Show local today counts and let the author explicitly request one concise current-domain summary.

**Independent Test**: With synthetic records spanning domains, dates, ordinary/periodic templates, and removed structure, verify the local line, zero-request disclosure, exact one-request confirmation, and source-bounded result before the independent weekly summary.

- [X] T009 [US1] Implement `buildDailyDomainInput` and deterministic local-date/category/template selection in `src/lib/domain-daily-summary-model.mjs`; calculate ordinary/periodic counts, omission accounting, newest-80 selection, Unicode bounds, and browser-only scope fingerprint without mutating the source payload.
- [X] T010 [US1] Implement strict daily request/response schemas and normalization in `src/lib/domain-daily-summary-model.mjs`; enforce source references, sentence/count/length limits, general unsafe-language rejection, investment unsafe-language rejection, and server metadata validation.
- [X] T011 [US1] Implement remote-only transport in `src/lib/domain-daily-summary-provider.mjs`; send the exact minimal payload, obtain the access token, enforce the 25-second client timeout and caller Abort, map safe errors, and revalidate the response.
- [X] T012 [US1] Implement the authenticated same-origin boundary in `src/lib/domain-daily-summary-route.mjs` and `src/app/api/organize/domain-daily-summary/route.js`; enforce strict body parsing, rate limiting, 20-second timeout, `domain-daily-summary` Mastra execution, fixed factual prompt, no tools/memory/retry/snapshot, and safe errors.
- [X] T013 [US1] Implement the inline state machine in `src/app/insights/daily-domain-summary.js`; cover empty/unrequestable/idle/disclosure/loading/result/unavailable, local counts, disclosure-before-request, explicit confirmation, one-request guard, result-only rendering, and session-only ownership.
- [X] T014 [US1] Mount the daily component and Provider in `src/app/insights/insights-page.js` between the 30-day chart and `WeeklySummary`; remove only the conflicting `DailyPlanReview` import/mount and leave its dirty trial files untouched.
- [X] T015 [US1] Add daily-specific localized labels and bounded states in `src/lib/i18n.mjs`; do not reuse the dirty `insights.today*` plan-review vocabulary.
- [X] T016 [US1] Add restrained open-paper styles in `src/app/insights/insights.css` for the daily section, thin rule, result/theme rows, wrapping, focus-visible, `aria-live`, `aria-busy`, 44px controls, and reduced motion.
- [X] T017 [US1] Run the model, route, structure, policy, and filtered browser tests from `specs/014-domain-daily-summary/quickstart.md`; verify the existing weekly state and 30-day local review remain independent.

## Phase 4: User Story 2 - Retain Control When Context or Availability Changes (Priority: P1)

**Goal**: Prevent stale or fabricated output when the author cancels, stops, retries, goes offline, or changes account, domain, locale, source payload, page, or local date.

**Independent Test**: Exercise every cancellation and scope-change path with delayed synthetic responses; verify abort/clear behavior, no late result, no source mutation, and continued local offline review.

- [X] T018 [US2] Add generation-token, AbortController, focus-return, duplicate-confirmation, retry-reconfirmation, unmount, and stale-result guards in `src/app/insights/daily-domain-summary.js`.
- [X] T019 [US2] Add next-local-midnight scheduling, visibility/focus date refresh, and source/domain/account/locale fingerprint invalidation in `src/app/insights/daily-domain-summary.js`; clear old disclosure/result state before showing the new scope.
- [X] T020 [US2] Extend `e2e/run-mobile.mjs` with delayed-response Stop, page exit, domain switch, account replacement, locale change, source change, midnight refresh, offline, timeout, unconfigured, rate-limited, invalid-response, and zero-write assertions.
- [X] T021 [US2] Verify localStorage/account payload bytes, export/backup behavior, and existing offline `/insights` usability before and after daily flows in `e2e/run-mobile.mjs`, `tests/daily-domain-summary-model.test.mjs`, and `tests/ai-daily-domain-summary-route.test.mjs`; do not add daily result persistence or cache entries.

## Phase 5: User Story 3 - Preserve the Investment-Review Boundary (Priority: P2)

**Goal**: Keep the existing non-advice boundary visible and reject any generated market guidance or prediction in full.

**Independent Test**: Feed investment-like domain names and adversarial Chinese/English outputs through model, route, and browser paths; verify unsafe output becomes unavailable and no partial text renders.

- [X] T022 [US3] Add adversarial investment-output fixtures and whole-result rejection assertions in `tests/daily-domain-summary-model.test.mjs` and `tests/ai-daily-domain-summary-route.test.mjs` for buy/sell/hold, security, price, timing, position, allocation, return, profit/loss, and forecast terms.
- [X] T023 [US3] Preserve the single existing fixed non-advice boundary in `src/app/insights/insights-page.js` and map unsafe daily output to localized safe-unavailable state in `src/app/insights/daily-domain-summary.js` and `src/lib/i18n.mjs`; do not duplicate the boundary inside the daily section.
- [X] T024 [US3] Add investment-domain browser assertions in `e2e/run-mobile.mjs` for visible non-advice copy, rejected unsafe output, no partial themes, no recommendation controls, and unchanged source payload.

## Final Phase: Integration, Evidence, and Return

- [X] T025 [P] Update `docs/设计规范/规范/页面/领域复盘页面规范.md`, `DESIGN.md`, and `src/lib/public-policies.mjs` only for the verified daily contract, decision note, and precise bilingual transfer wording; preserve unrelated dirty hunks and run the design validator.
- [X] T026 [P] Update `ARCHITECTURE.md`, `specs/README.md`, and `docs/decisions/0004-domain-daily-summary-isolated-capability.md` only to register the isolated daily capability and accepted request/session decision; do not document the plan-versus-diary trial as LN-079 behavior.
- [X] T027 Run the focused model/route/structure/policy tests and filtered daily browser journey from `specs/014-domain-daily-summary/quickstart.md`; inspect false positives, stale snapshots, missing source coverage, and unrelated dirty-worktree failures.
- [X] T028 Run `npm run design:check` and complete 320/390/426/768/1280px responsive, keyboard, touch, visible-focus, `aria-live`, reduced-motion, and synthetic screenshot review.
- [X] T029 Run `npm run check` and `git diff --check`; record exact results, test counts, and any external-provider limitation without modifying unrelated files.
- [X] T030 Review the final diff against `spec.md`, `plan.md`, all contracts, Constitution, declared write set, and `PROJECT_BOARD.md`; verify no package/schema/storage/backup/service-worker/deployment change slipped in and preserve unrelated dirty changes.
- [X] T031 Record Returned implementation evidence, focused/full test output, screenshots, payload/no-write comparisons, and remaining real-provider latency/adoption/deployment checks in `PROJECT_BOARD.md`; do not mark LN-079 Accepted without independent controller verification.

## Owner-Requested Studio Debugging Extension

- [X] T032 Export the canonical daily input/output schemas and prompt builder without changing the production request contract.
- [X] T033 Register one localhost-only Studio Agent and two-step Workflow that accepts synthetic input and has no account lookup, Supabase access, tools, memory, snapshots, or writes.
- [X] T034 Add a Studio registration regression and verify `/api/agents`, `/api/workflows`, the real Agents list, Workflow list, two-step graph, and run-input form.
- [X] T035 Re-run the focused and full repository gates, record exact Studio evidence in `PROJECT_BOARD.md`, then create and push the reviewable implementation commit without including unrelated dirty work.

## Dependencies and Execution Order

- T001–T003 reconcile authority and write ownership; they block all edits.
- T004–T008 establish failing contract coverage before T009–T016 implementation.
- User Story 1 (T009–T017) establishes the daily slice and blocks Story 2/3 browser extensions that exercise its state and safety paths.
- User Story 2 (T018–T021) depends on Story 1 lifecycle and proves cancellation, freshness, offline, and no-write invariants.
- User Story 3 (T022–T024) depends on the daily normalizer and UI result path but is independently testable once Story 1 is complete.
- T025–T031 run after all story paths and keep documentation/evidence aligned with verified behavior.

## Parallel Execution Examples

- After T003, T004–T007 may be authored in parallel in isolated worktrees only; the main checkout still permits one writer at a time.
- After T009–T012 land, T013/T015/T016 can proceed independently by file, while T014 integrates the page mount after the component entry is stable.
- T022 can run in parallel with T025/T026 only in isolated worktrees and must be integrated serially; no overlapping main-checkout writers are allowed.

## Implementation Strategy

1. Deliver the P1 vertical slice: local current-domain today line, explicit disclosure, confirmed one-shot Mastra summary, strict source/safety validation, and session-only result.
2. Add cancellation, midnight/context invalidation, offline/no-write, and responsive evidence before returning the P1 slice.
3. Complete the investment boundary as the P2 safety story without adding advice or persistence.
4. Run the complete repository gate and return evidence; leave real latency/adoption/deployment checks explicitly open until independently observed.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite, OKR modification, or worktree merge.
- New dependencies, migrations, network data boundaries, homepage controls, required recording fields, standalone Mastra runtime/CLI, plan comparison, persistent AI results, or broad refactors not admitted by `spec.md` and `plan.md`.
