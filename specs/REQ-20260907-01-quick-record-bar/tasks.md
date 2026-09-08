# Tasks: Quick Record Bar

## Phase 1: Setup

- [x] T001 Reconcile the quick-record spec and preserve unrelated dirty changes in `specs/REQ-20260907-01-quick-record-bar/`.

## Phase 2: Foundational

- [x] T002 [P] Add quick-record action labels and placeholder translations in `src/lib/i18n.mjs`.
- [x] T003 [P] Add focused regression scaffolding for the action bar and quick row in the existing browser test harness.

## Phase 3: User Story 1 — Quick record from `记`

- [x] T004 [US1] Add transient quick-record session and today/Time navigation in `src/app/_components/home/home-page.js`.
- [x] T005 [US1] Move `InlineQuickRecord` below the timeline heading, support empty days, external focus, and Escape cancellation in `src/app/_components/home/home-record-views.js` and `src/app/_components/home/home-record-workspace.js`.
- [x] T006 [US1] Keep the existing quick save callback and ensure continuous saves retain the input row in `src/app/_components/home/home-page.js`.
- [x] T007 [US1] Verify populated, empty, historical, continuous-save, blur, Enter, Escape, empty, and failed-save flows in the focused browser regression.

## Phase 4: User Story 2 — Complete-record `+`

- [x] T008 [US2] Split `记` and `+` callbacks while preserving Diary `RecordComposer` and Plan creation semantics in `src/app/_components/home/home-action-dock.js` and `src/app/_components/home/home-page.js`.
- [x] T009 [US2] Verify complete-record fields, attachments, plan mode, export, keyboard names, and 44px targets in the focused browser regression.

## Phase 5: User Story 3 — Long-press feedback

- [x] T010 [US3] Implement pointer threshold, movement/leave cancellation, click suppression, keyboard bypass, and circular progress UI in `src/app/_components/home/home-action-dock.js` and `src/app/_components/home/home-timeline.css`.
- [x] T011 [US3] Verify long-press states and responsive widths in the focused browser regression.

## Phase 6: Polish and verification

- [x] T012 [P] Update action-dock and timeline axes for 320/390/426/768/1280 px without horizontal overflow in `src/app/_components/home/home-timeline.css`.
- [ ] T013 Run `npm run design:check`, `npm run check`, and `git diff --check`; record unresolved external evidence without changing governance files.
