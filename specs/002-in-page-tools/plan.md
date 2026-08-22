# Implementation Plan: Left-Workspace Tools

**Board Item**: `LN-075 Rework 9` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Render Search and Settings as paper-continuous workspaces constrained to the left content column, like
the existing Calendar presentation. Keep the diary mounted underneath, preserve the fixed right binding
rail and bottom actions, and retain standalone `/settings` route and hash behavior. The change is UI-only
and reversible.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing React state, Search presentation, `SettingsPage`, local-first data providers, and Playwright harness; no new dependency
**Storage and Ownership**: Existing account-scoped local state and IndexedDB image storage; no new persistence
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: Authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: Open/close within one interaction; no new network request or background work caused by switching the workspace
**Constraints**: local-first, account isolated, revision safe, offline capable, backup compatible, one writer in the main checkout
**Scale/Scope**: Home workspace switching, Search and Settings embedding, stable right-side layout, surface CSS, and focused browser assertions at 320–1280px

## Source-of-Truth and Readiness Check

- [x] The board item and current user request define a narrow interaction change with clear acceptance.
- [x] `product.md` and `PROJECT_BOARD.md` already contain the rail and settings contracts; this plan preserves existing settings behavior.
- [x] Visual/interaction work read `DESIGN.md` and `设计规范/AGENTS.md`.
- [x] The dirty working tree was inspected; the write set below avoids unrelated generated evidence.
- [x] No second writer owns overlapping files or state.

## Constitution Check

- [x] Core recording steps and the home page's primary job are preserved.
- [x] Authenticated offline use, account ownership, and stale-revision safety are preserved.
- [x] Raw notes are not silently rewritten; settings actions remain explicit.
- [x] Privacy, network payloads, credentials, backups, restore, and removal are unchanged.
- [x] Tests cover URL, focus, scroll, mutual exclusion, route compatibility, and responsive failure paths.
- [x] The change is the smallest independently testable vertical slice.
- [x] No unauthorized commit, push, publish, deploy, deletion, reset, history rewrite, or merge is required.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/page.js`: home state for selected date, calendar, search, plan mode, and scroll context.
- `src/app/home-header.js`: binding-rail Search, Calendar, and Settings controls.
- `src/app/search-dialog.js`: existing search query and result behavior, currently presented in a modal.
- `src/app/dialog-surface.js`: retained for true modal tasks such as record composition, but removed from home Search and Settings presentation.
- `src/app/settings/settings-page.js`: complete six-panel settings implementation with standalone route hash support.
- `src/app/settings/page.js`, `src/app/settings-dialog.css`, `src/app/management-header.css`: direct route and settings layout.
- `e2e/run-mobile.mjs`: existing rail, search, settings, keyboard, touch-target, overflow, and route compatibility checks.

### Reuse and Compatibility Decisions

Use `SettingsPage` as the only settings behavior owner and extend its embedded mode with a workspace
presentation that omits the route-level header. Keep standalone hashes and mobile index/detail behavior
unchanged. Reuse the Search query/results component without `DialogSurface`. Home owns Escape, toggle,
focus restoration, and mutual exclusion because the right rail remains interactive.

## Proposed Design

### Data and Control Flow

Home owns mutually exclusive Search, Calendar, and Settings state. Search or Settings mounts an opaque
paper-continuous workspace over only the left content column while the underlying diary React tree stays
mounted and inert. The right rail and bottom actions remain outside this workspace and keep their geometry.
Toggle-close or Escape unmounts only the workspace and restores focus to the initiating rail control.

### Trust and Privacy Boundaries

No new data boundary, request, credential, cache key, or storage operation is introduced. Existing
settings actions continue to use the authenticated account-scoped local-first provider.

### UI and Interaction Contract

- Settings rail is a button, not a route link, with its existing accessible name and 44px target.
- Search, Calendar, and Settings are mutually exclusive left-workspace modes.
- Search and Settings continue the existing paper without a viewport backdrop, floating sheet, or nested card treatment.
- The binding rail, content directory, Diary/Plan switch, export, and record actions keep their position and remain operable.
- Active rail controls toggle closed; Escape restores focus. Mobile Settings detail back returns to the six-item Settings index.
- Embedded panel selection never mutates the home URL. Standalone hash behavior remains untouched.
- Reduced motion, keyboard navigation, and no-overflow requirements follow existing home and settings rules.

## Project Structure and Write Set

```text
Read:  src/app/page.js, src/app/home-header.js, src/app/dialog-surface.js,
       src/app/search-dialog.js, src/app/settings/settings-page.js,
       src/app/settings/page.js, src/app/management-header.js,
       src/app/management-header.css, src/app/settings-dialog.css,
       src/app/globals.css, src/app/search-dialog.css, e2e/run-mobile.mjs, e2e/run-pwa.mjs
Write: src/app/page.js, src/app/home-header.js, src/app/settings/settings-page.js,
       src/app/search-dialog.js, src/app/search-dialog.css, src/app/settings-dialog.css,
       src/app/home-timeline.css,
       e2e/run-mobile.mjs, e2e/run-pwa.mjs, product.md, DESIGN.md,
       PROJECT_BOARD.md, specs/002-in-page-tools/*
Exclude: data model, storage, auth, sync, calendar logic, backup formats, generated unrelated evidence
```

**Integration Order**: Add geometry and containment assertions, convert Search and Settings from modal
presentation to left-workspace presentation, keep the right-side DOM outside that boundary, add responsive
paper-continuous CSS, then run focused and full gates.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract tests: existing suite; no new data model.
- Browser/mobile tests: open/close Search and Settings from home, URL stability, diary mount/date/mode/scroll, right-side geometry within 1px, left-boundary containment, mutual exclusion, six panels, focus restoration, direct route hashes, and widths 320/390/426/600/671/700/768/1280.
- PWA/offline/account tests: existing authenticated offline and persistence checks; no changed boundary.
- Design validation: `npm run design:check` and screenshots for Search and Settings inside the left paper workspace at mobile and desktop widths.
- Full gate: `npm run check` and `git diff --check`.

### Real-Environment or Manual Evidence

User visual review of the current diary with Search and Settings opened at 390px and 1280px remains
required. Automation cannot decide whether the left workspace reads as part of the same book page while
the right rail remains visually unchanged.

### Acceptance Evidence Handoff

Return focused browser output, screenshots, URL/focus/scroll measurements, design-check result, full
quality-gate result, and the remaining subjective visual review to the controller. Do not mark the board
item Accepted automatically.

## Rollback, Removal, and Migration

Revert the Search/Settings workspace branches, embedded workspace prop, surface CSS, and focused E2E assertions.
The direct route and stored data need no migration or recovery.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Embedded mode on `SettingsPage` | Prevents duplicated settings actions and keeps direct route compatibility | A second settings implementation would drift in six panels and recovery behavior |
| Left-workspace overlay over mounted diary | Preserves the diary's scroll/layout anchors while only the marked content region changes | Unmounting the diary would move directory anchors and lose the stable-page effect |
| Tool mutual-exclusion state | Prevents contradictory workspace modes and stale focus | Independent visible surfaces would overlap |
