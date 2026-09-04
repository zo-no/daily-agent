# Feature Specification: Inline Record Editing

**Board Item**: `LN-080`
**Feature Directory**: `015-inline-record-edit`
**Created**: 2026-09-04
**Status**: Returned
**Input**: User description: "点击后不打开弹窗，直接在对应的行进行修改；点击前面的时间打开浮层微调。"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing

Automated regression is mandatory for every implemented story. Real-device visual evidence remains
required where automation cannot prove the interaction feels lighter than the former dialog.

### User Story 1 - Edit record text in its row (Priority: P1)

As the author reviewing a day, I can activate a record's text and edit it in the same row without
losing the surrounding timeline context or opening a modal.

**Why this priority**: This directly removes the largest interruption in the frequent browse-to-edit
part of the core loop.

**Independent Test**: Activate one ordinary record in either Time or Category view, change its text,
complete the edit, and observe that only that record changes through the established local-first save
path; repeat with Cancel and Escape and observe no change.

**Acceptance Scenarios**:

1. **Given** a day with multiple ordinary records, **When** the author activates one record's text,
   **Then** only that row becomes editable, retains the surrounding rows, and no modal or backdrop appears.
2. **Given** an active row edit with changed text, **When** the author chooses Done, **Then** the exact
   edited text is saved once and the row returns to reading mode.
3. **Given** an active row edit with changed text, **When** the author chooses Cancel or presses Escape,
   **Then** the stored record remains byte-for-byte unchanged and focus returns to that record's text.
4. **Given** an empty edited record without attachments, **When** the author chooses Done, **Then** the
   existing safe empty-record behavior remains explicit and does not silently overwrite valid content.

---

### User Story 2 - Fine-tune a record time in context (Priority: P1)

As the author scanning a day, I can activate the time at the start of a record and adjust only that
time in a small anchored surface without entering the content editor.

**Why this priority**: Time correction is a distinct, narrow edit and should not require the full
record-writing surface.

**Independent Test**: Activate a row time, set a valid value, complete the change, and observe that only
the time changes and the row reorders consistently; cancel or submit an invalid value and observe no write.

**Acceptance Scenarios**:

1. **Given** an ordinary record in reading mode, **When** the author activates its leading time,
   **Then** a lightweight surface anchored to that time opens, the record body does not enter edit mode,
   and no viewport-wide modal or backdrop appears.
2. **Given** an open time surface, **When** the author selects a valid time and chooses Done,
   **Then** only that record's time is saved once and timeline ordering updates consistently.
3. **Given** an open time surface, **When** the author chooses Cancel, presses Escape, activates outside,
   or provides an invalid value, **Then** no record field changes and focus returns to the same time control.

---

### User Story 3 - Reach advanced record details without a modal (Priority: P2)

As the author editing a record, I can progressively reveal its existing category, tags, attachments,
and delete action beneath the same row so removing the modal does not remove any current capability.

**Why this priority**: These actions are less frequent than text and time correction but remain required
for the complete edit/delete loop and data portability.

**Independent Test**: Expand More for an active row, change each supported detail through its existing
rules, add or remove an attachment, and delete with the existing confirmation; verify that closing or
cancelling before completion leaves stored data and attachment blobs unchanged.

**Acceptance Scenarios**:

1. **Given** an active row edit, **When** the author activates More, **Then** the current secondary fields
   appear directly beneath that row without a dialog and without hiding adjacent record context.
2. **Given** a structured ordinary record, **When** the author activates its body, **Then** its canonical
   structured fields appear in the row and required-field validation remains intact.
3. **Given** an existing attachment or delete action, **When** the author uses the row details,
   **Then** the current attachment lifecycle and delete confirmation remain unchanged.

### Edge Cases

- Only one ordinary record may own an active text editor or time surface at once; moving to another row
  safely cancels the previous unsaved draft.
- Date, Diary/Plan, Time/Category, Search, Settings, account, and source-data changes discard an unsaved
  row draft or open time surface without writing it.
- Records with Markdown, long text, tags, attachments, missing time, localized structured fields, or an
  Agent annotation retain readable layout and existing data semantics.
- An active Diary Agent session must stop before a row becomes editable; its annotation may not overlap
  or mutate the edit draft.
- At 320, 390, 426, 768, and 1280 pixels, the editable row and time surface must remain inside the visible
  writing plane, avoid the right rail and lower action dock, and introduce no horizontal overflow.
- Text, time, More, Done, Cancel, attachment, and delete controls remain keyboard reachable, have visible
  focus, and provide at least a 44 by 44 pixel target; reduced motion removes nonessential transitions.

## Product Admission

### Core-Loop Contribution

This directly improves `browse → edit/delete` by keeping correction beside the source record and
separating frequent text edits from narrow time adjustment.

### User Evidence

On 2026-09-03 the product owner explicitly identified the dialog as unnecessary friction and requested
row-local editing, with the leading time as the separate fine-tuning entry.

### Default Interface and Recording Cost

No permanent control or required recording decision is added. Existing row text and time become separate
targets. New-record creation keeps its current one-action composer and one further Done action. Editing an
existing record no longer opens a modal; Done and Cancel appear only while that row is active, and More is
progressive rather than permanent.

### Offline, Account, Privacy, Reversibility, and Backup

All edits reuse the authenticated account's local-first, revision-checked write path. No new network
request, identifier, schema field, storage key, analytics event, or remote payload is introduced. Cancel,
Escape, navigation, account change, invalid input, and failed local persistence are zero-write paths.
Raw content changes only after explicit Done. JSON, Markdown, and portable attachment backups retain the
same record shape and attachment ownership.

### Verification and Removability

Focused browser regression covers row-local text, time, structured fields, progressive details, attachment
and delete behavior, cancellation, focus restoration, account/source invalidation, responsive geometry,
and offline persistence. The design gate and complete repository quality gate remain mandatory. Removing
the row editor and time surface restores the prior dialog entry without migration or data cleanup.

### Exit Condition

Rework or remove the interaction if row editing causes accidental writes, hides required detail or delete
capabilities, makes Markdown or structured records harder to edit, collides with Agent/rail/action surfaces,
regresses offline/account/backup behavior, or is not preferred to the former dialog during real mobile use.

### Admission Decision

- **Score**: `18/20`
- **Decision**: `mainline candidate`
- **Red-line check**: The change removes an edit interruption, remains explicit and local-first, adds no
  required recording step or external boundary, preserves backups, and has passed the complete quality gate.

## Requirements

### Functional Requirements

- **FR-001**: Activating an ordinary record's content in Time or Category view MUST edit that record in
  the same row without mounting a modal, backdrop, or separate page.
- **FR-002**: Only one row editor or time surface MUST be active at once, and switching targets MUST cancel
  the prior unsaved state.
- **FR-003**: Row editing MUST provide explicit Done and Cancel actions; only Done may persist changed
  content or details, while Cancel and Escape MUST preserve the stored record exactly.
- **FR-004**: Activating a record's leading time MUST open a lightweight surface anchored to that control,
  without activating the body editor.
- **FR-005**: The time surface MUST accept one valid local time, provide Done and Cancel, close on Escape
  or outside activation, restore focus to its trigger, and change no field except `time`.
- **FR-006**: Saving a time change MUST preserve all other record fields and update both Time and Category
  view ordering consistently.
- **FR-007**: The row editor MUST progressively expose the current category, tags, attachments, and delete
  capabilities without a modal, while keeping their existing validation and confirmation rules.
- **FR-008**: Ordinary structured records MUST reuse their canonical fields and required-field validation;
  periodic records MUST retain their existing independent inline editor.
- **FR-009**: Starting a row edit MUST stop an active Diary Agent review and prevent Agent proposals or
  annotations from mutating or covering the active draft.
- **FR-010**: Date, surface, view, account, or source-record changes MUST invalidate unsaved row and time
  state without persistence.
- **FR-011**: The interaction MUST remain complete in Chinese and English and support keyboard, pointer,
  touch, visible focus, Escape, and reduced-motion use.
- **FR-012**: The new-record composer and its Hero content-improvement capability MUST remain unchanged;
  this feature only replaces the existing-record dialog entry.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it and chooses Done.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, attachment, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.

### Key Entities

- **Stored record**: Existing account-owned note whose schema, ownership, sync, export, and backup meaning
  remain unchanged.
- **Row draft**: Temporary page-local copy of one stored record, discarded until explicit completion.
- **Time draft**: Temporary page-local time value bound to one record and one trigger control.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In both Time and Category views, an author can begin correcting existing text with one
  activation on that text while remaining on the same page and seeing adjacent records.
- **SC-002**: A time-only correction requires one activation on the time, one value adjustment, and one
  completion action, with zero unrelated field changes across every automated case.
- **SC-003**: Cancel, Escape, target change, view/date/surface change, invalid time, account replacement,
  and failed persistence produce zero stored-record or attachment changes in automated regression.
- **SC-004**: All affected controls meet the 44-pixel target rule and the interaction has no horizontal
  overflow or rail/action collision at 320, 390, 426, 768, and 1280 pixels.
- **SC-005**: Focused tests, the design gate, and the complete repository quality gate pass; the product
  owner prefers the 390-pixel real-page interaction to the former dialog before the board item is accepted.

## Scope Boundaries

### In Scope

- Existing ordinary records in Time and Category views.
- Row-local text or structured-field editing, progressive existing details, and time-only adjustment.
- Cancellation, focus, responsive, Agent-isolation, local-first, and attachment safety behavior.

### Out of Scope

- New-record creation, periodic fixed-record editing, Plan blocks, Search result editing, bulk editing,
  autosave-on-blur, new metadata fields, schema migration, new network requests, or generalized popovers.
- Redesigning the Hero improvement capability, Diary/Plan Agent logic, record ordering rules, the right rail,
  sync, exports, backups, or account authentication.

## Assumptions and Dependencies

- `LN-080` is Assigned to the single writer in the main checkout; unrelated dirty changes remain owned by
  their existing tasks and must be preserved.
- Explicit Done is retained for content/details to prevent accidental edits; clicking outside does not save.
- The time surface is a narrow editor for time only, not a replacement full-record dialog.
- Existing data, attachment, and local-first save primitives remain the canonical implementation boundary.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-003, SC-001 | Time/Category browser journeys for inline edit, Done, Cancel, Escape, and no modal | Row-local text acceptance |
| FR-004–FR-006, SC-002 | Anchored time-surface journey with valid, invalid, outside, Escape, focus, and ordering checks | Time fine-tuning acceptance |
| FR-007–FR-010, SC-003 | Structured/details/attachment/delete/Agent/account invalidation regressions | Capability and zero-write boundary |
| FR-011–FR-012, SC-004 | Chinese/English keyboard/touch and five-width geometry evidence | Accessibility and responsive acceptance |
| NR-001–NR-004, SC-005 | Focused tests, `npm run design:check`, `npm run check`, diff review, and owner mobile review | Return and acceptance gate |
