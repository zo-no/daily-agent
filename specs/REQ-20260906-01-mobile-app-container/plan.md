# Implementation Plan: Mobile App Store Container

**Requirement**: `REQ-20260906-01` | **Date**: 2026-09-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/REQ-20260906-01-mobile-app-container/spec.md`

## Summary

Package the existing mobile-first Next.js/PWA experience as Android and iOS store artifacts using a
thin native container around the approved HTTPS origin. Reuse the current account gate,
`LogNoteDataProvider`, `commitData`, owner-scoped IndexedDB attachment store, backup/export models,
Supabase Auth, and Route Handlers. Add only the platform adapters required for app identity,
deep-link OAuth, file/image/share, lifecycle/network, safe-area, keyboard, back navigation, and
release evidence. Do not create a second business store or rewrite the UI.

## Technical Context

**Language/Version**: JavaScript/React 19, Next.js 15.5.23, Node.js >=22.13.0; native projects use
the Capacitor-compatible Android/iOS toolchains available on the build machines.

**Primary Dependencies**: Existing Next.js/React/Supabase stack plus Capacitor core/CLI and only the
official platform plugins required by the contract (`app`, `browser`, `filesystem`, `keyboard`,
`network`, `share`, `status-bar`). Exact versions must be pinned together and verified by the build.

**Storage**: Existing account-scoped `localStorage` and owner-scoped IndexedDB; no new database or
cloud schema.

**Testing**: Existing `node:test`, Playwright mobile/PWA tests, production build, plus Android/iOS
debug/release smoke tests on physical or simulator devices. Store and OAuth evidence is manual and
must remain separate from local automation.

**Target Platform**: Android and iOS store packages with an approved HTTPS runtime origin; existing
browser/PWA remains supported.

**Project Type**: Existing Next.js web application with mobile container projects.

**Performance Goals**: After the app runtime is ready, the account gate is usable within 5 seconds
on a representative device/network; offline core actions remain immediate through existing local
writes.

**Constraints**: First launch may require network to fetch the HTTPS origin. Previously authenticated
devices retain offline core use. Native adapters cannot bypass `commitData`, revision/CAS,
account-scoped attachment ownership, backup validation, or explicit AI confirmation.

**Scale/Scope**: Two mobile packages, one web runtime origin, one adapter boundary, four user stories,
no new persisted entities, Calendar/MCP deferred.

## Constitution Check

| Principle | Result | Evidence |
|---|---|---|
| Core recording loop | PASS | User Story 2 keeps quick record, browse, search, edit/delete, backup/restore, offline. |
| Local-first/account ownership | PASS | Existing provider and `commitData` remain the only text writer; attachment owner remains canonical. |
| Raw records/reversibility | PASS | No schema or backup rewrite; picker/share cancellation is zero-write. |
| Evidence-backed/removable | PASS | Device/store evidence is explicit; adapters and packages can be removed without migration. |
| Verification | PASS | Browser/PWA gates plus device and store evidence are required. |
| One truth per decision | PASS | This package refines LN-037 and does not modify board or governance sources. |

## Project Structure

```text
specs/REQ-20260906-01-mobile-app-container/
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/mobile-container.md
└── tasks.md

src/app/
├── native-bridge.js                 # narrow client adapter entry
├── native-lifecycle.js              # lifecycle/network integration
├── native-file-actions.js           # picker/share integration
└── service-worker-registration.js   # browser/PWA vs container boundary

src/infrastructure/mobile/
├── contract.mjs                     # platform-neutral adapter contract
└── web-bridge.mjs                   # browser fallback and safe no-op behavior

capacitor.config.ts                  # approved origin and app metadata
android/                             # generated Android container project
ios/                                 # generated iOS container project

tests/mobile-container-contract.test.mjs
tests/mobile-container-model.test.mjs
e2e/run-mobile.mjs
e2e/run-pwa.mjs
```

**Structure Decision**: Keep business behavior in the existing `src/app`, `src/modules`,
`src/shared`, and `src/infrastructure` boundaries. Add one platform-neutral native adapter contract
and one web fallback. Generated Android/iOS projects own only platform packaging and bridge wiring;
they must not own records, sync, auth policy, or AI mutation.

## Delivery Phases

### Phase 0: Reconcile and research

- Confirm LN-037 scope, current dirty tree, existing PWA/auth/file paths, and real build prerequisites.
- Record the remote-origin container decision and deferred Calendar/MCP boundary.

### Phase 1: Contract-first foundation

- Add adapter contract and browser fallback.
- Add platform detection/configuration without changing business persistence.
- Add focused contract/model tests before bridge integration.

### Phase 2: Store container and lifecycle

- Add Capacitor configuration and generated Android/iOS projects.
- Wire app lifecycle, network recovery, status bar/safe area, keyboard, back navigation, and
  allowlisted external navigation.
- Keep Service Worker registration browser/PWA-only or explicitly safe inside the container.

### Phase 3: Auth, files, and share

- Wire deep-link OAuth callback handoff.
- Adapt image/backup pickers and export/share to existing browser-compatible File/Blob boundaries.
- Preserve cancellation, invalid-input, owner, and zero-write semantics.

### Phase 4: Device and release verification

- Add Android/iOS focused smoke flows and release checklist evidence.
- Run full repository quality gates.
- Leave signing credentials, store review, production OAuth, and real-device observations as open
  evidence until the owner verifies them.

## Complexity Tracking

| Added complexity | Why required now | Simpler alternative rejected because |
|---|---|---|
| Native container projects | Application-store package identity and review require platform artifacts | PWA alone cannot satisfy store distribution request |
| Native adapter boundary | File/share/auth/lifecycle behavior differs from a desktop browser | Direct platform calls from business components would create parallel ownership |
| Remote HTTPS runtime | Existing Next.js server/API boundary is dynamic and not a static-only bundle | Local bundle would require a larger runtime/static-export migration |
