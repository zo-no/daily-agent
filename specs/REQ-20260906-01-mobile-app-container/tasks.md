---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Mobile App Store Container

**Requirement**: `REQ-20260906-01`
**Input**: Feature artifacts from `/specs/REQ-20260906-01-mobile-app-container/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only; `PROJECT_BOARD.md`
> remains the sole task-status and acceptance source.

## Format: `[ID] [P?] [Story?] Description with exact path`

- **[P]** means dependency-independent work in different files. It does not authorize concurrent
  writers in the main checkout.
- **[Story]** maps implementation and tests to one independently testable user story.
- Every task names exact paths, verification, and relevant exclusions.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile LN-037, `specs/REQ-20260906-01-mobile-app-container/`, the dirty tree, current PWA/auth/file paths, and existing validation evidence in `PROJECT_BOARD.md`, `product.md`, `ARCHITECTURE.md`, and `git status`.
- [x] T002 Confirm the exact write set, exclusions, one-writer ownership, and open real-device/store evidence in `specs/REQ-20260906-01-mobile-app-container/plan.md` before editing application files.
- [x] T003 [P] Record the native adapter boundary and deferred Calendar/MCP decision in `specs/REQ-20260906-01-mobile-app-container/research.md` and `specs/REQ-20260906-01-mobile-app-container/contracts/mobile-container.md`.

## Phase 2: Contract-First Regression Coverage

**Purpose**: Define the platform-neutral behavior before adding native projects.

- [x] T004 [P] Add adapter contract/model tests for origin allowlisting, lifecycle/network states, callback correlation, picker/share cancellation, and zero-write boundaries in `tests/mobile-container-contract.test.mjs` and `tests/mobile-container-model.test.mjs`.
- [x] T005 [P] Add browser/PWA regressions for browser fallback, Service Worker boundary, existing account gate, and unchanged core record/offline paths in `e2e/run-mobile.mjs` and `e2e/run-pwa.mjs`.
- [x] T006 Run `node --test tests/mobile-container-*.test.mjs` and the focused Playwright/PWA scenarios; record the expected pre-implementation failures in the task evidence without modifying unrelated tests.

## Phase 3: User Story 1 - Install and Open the Store Container (Priority: P1)

**Goal**: Produce identifiable Android/iOS debug and release-capable container projects that open the approved HTTPS origin.

**Independent Test**: Build both projects, install on representative devices/simulators, cold-launch, background/foreground, and verify the account gate without opening a generic browser tab.

- [x] T007 [US1] Add pinned Capacitor runtime/CLI/plugin dependencies and scripts in `package.json` and `package-lock.json`; do not add business or storage dependencies.
- [x] T008 [US1] Add the approved-origin, app identity, platform allowlist, and build metadata contract in `capacitor.config.ts`; document the required runtime variables in `specs/REQ-20260906-01-mobile-app-container/quickstart.md` without committing secrets.
- [x] T009 [US1] Generate and configure the Android project under `android/` and the iOS project under `ios/`, including icons, display name, package identifiers, minimum OS versions, and no committed signing credentials.
- [x] T010 [US1] Implement the platform-neutral adapter contract and safe browser fallback in `src/infrastructure/mobile/contract.mjs` and `src/infrastructure/mobile/web-bridge.mjs`.
- [x] T011 [US1] Add the client adapter entry and runtime-origin/container detection in `src/app/native-bridge.js`, preserving the existing App Router and provider boundaries.
- [ ] T012 [US1] Verify package launch, app identity, approved-origin navigation, external-origin handling, and update/cold-start behavior with `tests/mobile-container-contract.test.mjs` and device smoke evidence. **Open: iOS simulator build passes; Android build is blocked by missing local Android SDK; real-device smoke and OAuth remain unverified.**

## Phase 4: User Story 2 - Continue the Core Recording Loop Offline (Priority: P1)

**Goal**: Preserve local-first account-owned recording and safe reconnect behavior inside the container.

**Independent Test**: Use synthetic authenticated data, disable network, create/browse/search/edit/delete, background/relaunch, reconnect, and verify revision/CAS behavior and account isolation.

- [x] T013 [P] [US2] Implement lifecycle and network state adapters in `src/app/native-lifecycle.js` and `src/infrastructure/mobile/contract.mjs` without becoming a persistence writer.
- [x] T014 [US2] Update `src/app/service-worker-registration.js` to keep browser/PWA registration intact and make container behavior explicit and safe.
- [x] T015 [US2] Integrate lifecycle/network recovery with the existing `src/app/log-note-data-provider.js` retry path without changing `commitData`, revision/CAS, or account generation semantics.
- [x] T016 [US2] Add offline background/foreground, process-relaunch, reconnect, account-switch, stale-revision, and no-cache failure coverage in `tests/mobile-container-model.test.mjs`, `tests/account-sync.test.mjs` or the existing canonical sync test path, and `e2e/run-mobile.mjs`.
- [x] T017 [US2] Verify that no native adapter writes text, plans, settings, attachments, Supabase, or backups directly; preserve existing account isolation and backup tests.

## Phase 5: User Story 3 - Use Mobile Authentication, Files, and Share (Priority: P2)

**Goal**: Make login callbacks, image/backup pickers, and export/share usable through platform surfaces while preserving zero-write failure behavior.

**Independent Test**: Complete success, cancel, denied-permission, invalid-file, stale-callback, and insufficient-storage paths on Android and iOS test devices.

- [x] T018 [US3] Add deep-link/OAuth callback handling in `src/app/native-bridge.js` and `src/app/auth/callback/page.js`, preserving the existing Supabase code-exchange path and safe duplicate/stale callback behavior.
- [x] T019 [US3] Add image/backup picker and export/share adapters in `src/app/native-file-actions.js`, `src/app/download-file.js`, and `src/infrastructure/mobile/web-bridge.mjs` while reusing existing Blob/File and backup validation models.
- [x] T020 [US3] Configure Android intent filters and iOS URL/universal-link registration in `android/` and `ios/`; keep secrets and tokens out of URLs and native logs.
- [x] T021 [US3] Add focused contract and browser/PWA coverage for login cancellation, picker cancellation, invalid restore, export/share, permission denial, and owner-preserving attachment behavior in `tests/mobile-container-contract.test.mjs`, `tests/attachment*.test.mjs`, `e2e/run-mobile.mjs`, and `e2e/run-pwa.mjs`.
- [x] T022 [US3] Verify the existing JSON, Markdown, and portable attachment backup formats remain byte/semantic compatible after container file operations.

## Phase 6: User Story 4 - Store Readiness and Release Verification (Priority: P2)

**Goal**: Prepare reproducible signed candidates, privacy/support metadata, and beta/store submission evidence without claiming external acceptance prematurely.

**Independent Test**: Run the release checklist against both candidates, use Android internal testing and iOS TestFlight, and record all external outcomes separately from local test output.

- [ ] T023 [P] [US4] Add release build/version/package validation and no-secret checks in `tests/mobile-release-contract.test.mjs` and the platform project configuration.
- [ ] T024 [P] [US4] Add the store submission checklist and evidence template in `specs/REQ-20260906-01-mobile-app-container/quickstart.md` or a feature-local `release-checklist.md`, covering privacy, account deletion, support URLs, screenshots, OS matrix, and review notes.
- [ ] T025 [US4] Validate the existing `src/app/privacy/page.js`, `src/app/terms/page.js`, and account deletion/settings path against the store disclosure contract; do not add analytics or new data collection.
- [ ] T026 [US4] Run Android and iOS debug/release smoke tests, upgrade tests, and beta distribution checks; record unresolved signing, OAuth, review, production, or device evidence without marking LN-037 Accepted. **Open: signing, TestFlight/Play internal testing, store metadata, production HTTPS origin, and Supabase redirect allowlist.**

## Final Phase: Integration, Evidence, and Return

- [ ] T027 [P] Update only feature-local docs or README/release notes when the shipped container contract is verified; do not modify governance sources or the board in this implementation pass.
- [x] T028 Run all focused container, browser, PWA, and existing regression tests and inspect failures for false positives or stale snapshots.
- [x] T029 Run `npm run design:check` and complete responsive mobile, keyboard, safe-area, back-navigation, and reduced-motion review for affected interaction surfaces.
- [x] T030 Run `npm run check` and `git diff --check`; record any failure as current-write-set or pre-existing dirty-tree evidence. **`npm run check` remains red on 10 shared homepage/visual E2E scenarios; all 340 model tests, PWA, build, design check, and diff check pass.**
- [x] T031 Review the final diff against `spec.md`, `plan.md`, `tasks.md`, the Constitution, and the declared write set; preserve unrelated dirty changes and verify no parallel persistence path exists.
- [x] T032 Return implementation evidence and remaining real-device/store/manual checks to the controller; do not update `PROJECT_BOARD.md` to Accepted without independent verification.

## Dependencies and Execution Order

- T001–T003 block application edits.
- T004–T006 precede bridge and native project implementation.
- T007–T012 establish the installable container before offline and file integration.
- T013–T017 preserve the P1 core loop and must pass before P2 store polish.
- T018–T022 depend on the adapter contract and container shell.
- T023–T026 depend on working Android/iOS candidates and are partly external/manual.
- T027–T032 are final integration and evidence gates.

## Parallel Opportunities

- T004 and T005 can be prepared independently in separate files, but one writer still integrates them in the main checkout.
- T023 and T024 can be prepared independently after the store shell exists.
- Android and iOS device smoke checks can run in parallel only in isolated environments; they do not authorize overlapping source writers.

## Requirement Coverage Map

- FR-001/FR-004/SC-001/SC-006 → T007–T012, T026.
- FR-002/FR-009/SC-002/SC-003 → T013–T017, T028–T030.
- FR-003/FR-005/SC-003 → T018–T022.
- FR-006 → T003, T017, T031.
- FR-007/SC-004 → T004–T006, T028–T030.
- FR-008/SC-005 → T023–T026.
- FR-010/SC-007 → T002, T027, T031–T032.

## Implementation Strategy

1. Deliver User Stories 1 and 2 as the MVP: store package, launch, auth gate, offline core loop, and safe reconnect.
2. Add User Story 3 only after the adapter boundary proves zero-write cancellation and backup compatibility.
3. Complete User Story 4 with real device/beta/store evidence; keep external claims open until observed.
4. Stop and return to this same task for rework on failure; do not create a duplicate board item.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OKR modification, or worktree merge.
- React Native/Flutter/native UI rewrites, SQLite migration, new cloud schema, new persistence writer,
  Calendar/MCP launch scope, analytics, notifications, widgets, or unrelated visual refactors.
