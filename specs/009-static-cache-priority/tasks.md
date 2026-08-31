---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: 静态资源缓存优先

**Board Item**: `[LN-036 Phase 2]`
**Input**: Feature artifacts from `/specs/009-static-cache-priority/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile `LN-036 Phase 2`, current feature context, dirty working tree, write ownership, product contract, and existing PWA evidence in `PROJECT_BOARD.md`, `product.md`, and `git status`.
- [x] T002 Confirm the exact single-writer write set and exclusions in `specs/009-static-cache-priority/plan.md` before editing application code.
- [x] T003 Record in `specs/009-static-cache-priority/spec.md` why `product.md` needs no durable wording change: no data boundary or user-visible workflow changes.

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Define online cache-hit and privacy boundaries before implementation.

- [x] T004 [P] Add a controlled Service Worker regression for cached build-resource no-network behavior, miss fill, excluded requests, and safe offline miss in `tests/service-worker.test.mjs`.
- [x] T005 [P] Update production PWA version and cache-boundary assertions for the next application-shell version in `e2e/run-pwa.mjs`.
- [x] T006 Run `node --test tests/service-worker.test.mjs` before the implementation and retain the expected no-network assertion failure in the task handoff.

## Phase 3: User Story 1 - 重复打开时快速取得应用资源 (Priority: P1)

**Goal**: 已缓存的同源版本化构建资源在线重复请求时不触网，首次资源仍会填充当前离线壳。

**Independent Test**: 受控 Service Worker 命中返回既有响应且网络调用为零；生产 PWA 继续在离线时返回原始构建资源，且私密边界不变。

- [x] T007 [US1] Implement the cache-first branch limited to same-origin versioned build resources in `public/sw.js`.
- [x] T008 [US1] Increase and align the application-shell version in `public/sw.js` and `src/app/service-worker-registration.js` so old runtime entries cannot serve after this policy change.
- [x] T009 [US1] Verify online hit, miss fill, offline resource semantics, API/RSC/auth exclusion, local account persistence, and controlled update via `tests/service-worker.test.mjs` and `e2e/run-pwa.mjs`.

## Final Phase: Integration, Evidence, and Return

- [x] T010 Run the focused tests and inspect `tests/service-worker.test.mjs` and `e2e/run-pwa.mjs` output for false positives or stale version assertions.
- [x] T011 Run `npm run design:check`, `npm test`, `npm run test:e2e`, `npm run check`, and `git diff --check`; retain the last complete results without changing unrelated output or screenshots.
- [x] T012 Review the final diff against `specs/009-static-cache-priority/spec.md`, `plan.md`, `contracts/cache-policy.md`, Constitution, and LN-036 acceptance criteria; preserve unrelated dirty changes.
- [x] T013 Record returned evidence and remaining genuine real-account/cross-device checks in `PROJECT_BOARD.md` only after independent controller verification; do not mark LN-036 Accepted.

## Dependencies and Execution Order

`T001 → T002 → T004/T005 → T006 → T007/T008 → T009 → T010 → T011 → T012 → T013`

- T004 and T005 do not overlap but remain serialized because the main checkout allows one writer.
- T006 must fail before T007 establishes the cache-first implementation.
- T008 must be complete before any production PWA run uses the new shell.

## Implementation Strategy

1. Deliver the single P1 branch for versioned build resources only.
2. Keep all other cache classes unchanged and prove exclusion behavior before and after the code change.
3. Use the new shell version to make the rollback/release boundary deterministic.
4. Stop on any account, API, RSC, authentication, offline or quality-gate regression; do not expand to pages or data caching.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OKR modification, or worktree merge.
- New dependencies, migrations, network data boundaries, homepage controls, required recording
  fields, telemetry, broad cache redesign, or any caching of user content.

## Execution Evidence — 2026-08-31

- T006 expected failure before implementation: the cached build-resource test returned the network response and recorded a network fetch.
- Focused Service Worker suite after implementation: 4/4 passed.
- `npm test`: 203/203 passed.
- `npm run test:pwa` with isolated temporary evidence output: passed; confirms v15 installation, offline shell, API/RSC/auth exclusion, account-local persistence, and controlled update.
- Integrated release verification passed design rules 11/11, unit tests 203/203, browser scenarios 31/31, production build, and the standalone PWA install/offline/persistence/update suite. One concurrent all-in-one run reached the PWA phase and exited while starting its temporary server; the immediate isolated rerun passed, so no product regression was reproduced.
- `git diff --check`: passed. T011 and T013 are complete; this feature package still does not declare LN-036 accepted because the existing real-account and cross-device checks remain pending.
