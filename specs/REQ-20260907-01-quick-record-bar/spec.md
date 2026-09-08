# Feature Specification: Quick Record Bar

**Requirement ID**: `REQ-20260907-01`
**Feature Directory**: `REQ-20260907-01-quick-record-bar`
**Created**: 2026-09-07
**Status**: Implementation authorized
**Legacy Board Item**: `LN-080` (history preserved; this spec narrows the new entry contract)

## User Scenarios & Testing

### User Story 1 - Capture a quick record from the persistent action bar (Priority: P1)

As a diary user, I can click `记` and immediately type a plain-text quick record at the top of today's record stream.

**Independent Test**: On a day with records and an empty day, click `记`; the app switches to today, reveals the Record heading and quick input, scrolls to that section, focuses the input, and saves a non-empty entry through the existing local-first path.

**Acceptance Scenarios**:

1. **Given** any selected date or workspace view, **when** the user clicks `记`, **then** the app switches to today's Time view, stops temporary Diary/Plan review state, and focuses a quick input directly under `记录`.
2. **Given** today has no entries, **when** the user clicks `记`, **then** the Record section is rendered temporarily and remains usable without a separate empty-state action.
3. **Given** the quick input is focused, **when** the user presses Enter or leaves it with non-empty content, **then** one entry is saved with today's real date, current second-precision time, and the existing quick category; the input remains available for another note.
4. **Given** Escape, empty content, or a failed save, **when** the input is cancelled or submitted, **then** no new entry is written and the failure path remains recoverable.

### User Story 2 - Keep complete records and quick records distinct (Priority: P1)

As a diary or plan user, I can tell whether I am opening a complete record editor or starting a quick record.

**Independent Test**: Click `+` in Diary/Time mode and verify the existing `RecordComposer` still exposes date, time, category, template, and attachment editing; click `+` in Plan mode and verify the existing plan creation request remains unchanged.

**Acceptance Scenarios**:

1. **Given** Diary/Time mode, **when** the user clicks `+`, **then** the existing complete `RecordComposer` opens without changing its data or save contract.
2. **Given** Plan mode, **when** the user clicks the contextual add control, **then** the existing plan creation semantics remain intact.
3. **Given** the bottom action bar, **when** the user inspects controls, **then** `记` is named and announced as quick record while `+` is named as complete add; export remains available in the same bar.

### User Story 3 - Understand long press without accidental recording (Priority: P2)

As a touch user, I receive clear long-press feedback without triggering voice input or another persistence path.

**Independent Test**: Hold `记` for about 600 ms and inspect the ring; release before the threshold to run the single-click quick-record action, release after the threshold to suppress the click, and move/leave/cancel to reset the ring.

**Acceptance Scenarios**:

1. **Given** a pointer is pressed on `记`, **when** it remains within the target for the threshold, **then** a circular progress ring completes and no voice permission, microphone call, or record write occurs.
2. **Given** the pointer is released before the threshold, **when** the browser click would normally fire, **then** exactly the single-click quick-record action runs.
3. **Given** the threshold was reached, or the pointer moved, left, or was cancelled, **when** the interaction ends, **then** the click is suppressed or cancelled as appropriate and the progress ring resets.
4. **Given** keyboard focus, **when** Enter or Space is pressed, **then** the action is always treated as a normal single click.

## Edge Cases

- A historical date never receives a current-time quick record: the click first changes the selected date to the device's real today.
- Existing entries remain latest-first by the current time ordering; the quick input is a fixed visual row above them.
- Account changes, offline saves, CAS conflicts, and backup/export continue using existing boundaries.
- At 320, 390, 426, 768, and 1280 px the action bar, record heading, time column, and input column do not overflow; actionable targets remain at least 44 px.

## Product Admission

**Core-loop contribution**: Reduces quick-record steps and aligns the input position with the reading entry point.

**Evidence**: Users reported mixed date/time values when entering today's thought from yesterday, bottom-input/top-result disorientation, and ambiguity between `记` and `+`.

**Default cost**: One click to reveal/focus, then Enter or blur to save; no required category, template, attachment, confirmation, or network request.

**Offline, privacy, reversibility, backup**: Reuses the existing `saveInlineQuickRecord` and `commitData` path. No new field, route, schema, account boundary, or remote payload is introduced.

**Removal condition**: Keep isolated or revert if it adds a recording step, breaks complete-record editing, causes date mixing, loses offline/CAS behavior, or fails responsive quality gates.

## Functional Requirements

- **FR-001**: `记` MUST be the quick-record action; its click MUST switch to real today, Time view, and the top of the Record section before focusing the input.
- **FR-002**: The Record section and quick input MUST render when the selected day has zero entries while the quick-record session is open; on today's populated timeline the same row may remain resident, but focus is still initiated by `记`.
- **FR-003**: Quick saves MUST use today's date, current `HH:mm:ss`, the existing quick category, and `commitData`; the input MUST remain available after success.
- **FR-004**: Empty content, Escape, save failure, context replacement, account change, and cancellation MUST produce zero new writes.
- **FR-005**: `+` MUST continue to open `RecordComposer` in Diary/Time and preserve plan creation semantics in Plan mode.
- **FR-006**: Long press MUST add only transient progress and click suppression; it MUST NOT add microphone access, voice calls, fields, persistence, or a second write path.
- **FR-007**: Timeline sorting, raw note content, account isolation, local-first revision/CAS, export, and backup compatibility MUST remain unchanged.
- **FR-008**: The action bar and record flow MUST preserve accessible names, keyboard activation, 44 px targets, and supported responsive axes without horizontal overflow.

## Success Criteria

- **SC-001**: In focused browser regression, all quick-record scenarios pass for populated, empty, historical, continuous-save, cancel, and failed-save states.
- **SC-002**: Complete-record and plan-add regressions pass with no change to their existing fields or save behavior.
- **SC-003**: Long-press threshold, progress reset, click suppression, movement cancellation, and keyboard activation are each observable in automated tests.
- **SC-004**: `npm run design:check`, `npm run check`, and `git diff --check` pass; the five required widths show no horizontal overflow and no target below 44 px.

## Scope Boundaries

**In scope**: Home action dock semantics, quick-input placement and transient state, timeline anchor/focus behavior, long-press visual feedback, translations, focused browser regression, and the feature specification package.

**Out of scope**: Voice recording, new record schema or `sourceType`, AI processing, new persistence/sync APIs, changes to backup format, and rewriting LN-080 history.

## Assumptions

- Latest-first time sorting remains the canonical reading order.
- The `记录` heading and quick input are one reading flow; no additional chat-message store is introduced.
- In Plan mode, the existing contextual plan-add control remains authoritative; quick-record is entered from Diary/Time.
