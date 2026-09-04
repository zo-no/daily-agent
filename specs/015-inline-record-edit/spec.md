# Feature Specification: Inline Record Editing

**Board Item**: `LN-080`
**Feature Directory**: `015-inline-record-edit`
**Created**: 2026-09-04
**Status**: Owner rework implemented; focused verification passed; complete repository gate pending
**Input**: User description: "点击后不打开弹窗，直接在对应的行进行修改；点击前面的时间打开浮层微调。" Latest clarification: "点击时间会出现浮层。点击文字直接变成输入框，和点击笔一样的效果，笔去掉吧。" Correction: "我说的浮层是完整编写的浮层，而不是只调整时间的浮层。"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## Clarifications

### Session 2026-09-04

- Q: What does each existing-record target open? → A: Activating the leading time opens the complete record-writing dialog surface, not a time-only popover. Activating free-text content directly opens the compact inline input that the pencil previously opened, and the pencil is removed.
- Q: Where does the former detailed inline editor belong? → A: It is reserved for a Diary Agent `enrich-detail` follow-up, with the Agent question visibly bound to the source row. Done saves the author-edited record through the canonical local-first path and advances the review; Cancel keeps the original record, writes nothing, and advances.

## User Scenarios & Testing

Automated regression is mandatory for every implemented story. Real-device visual evidence remains
required where automation cannot prove the interaction feels lighter than the former dialog.

### User Story 1 - Edit record text directly in its row (Priority: P1)

As the author reviewing a day, I can activate a record's text itself and edit it in the same row
without finding a separate pencil, losing the surrounding timeline context, or opening another surface.

**Why this priority**: This directly removes the largest interruption in the frequent browse-to-edit
part of the core loop.

**Independent Test**: Activate the text on one free-text ordinary record in either Time or Category
view, change its text, move focus away, and observe that only that record content changes through the
established local-first save path; repeat with Escape and observe no change. Confirm there is no separate
pencil and the leading time opens the complete record-writing dialog.

**Acceptance Scenarios**:

1. **Given** a free-text ordinary record, **When** the author activates its text, **Then** only that row's
   content cell becomes a focused input, surrounding rows remain visible, and no pencil, modal, backdrop,
   detailed composer, or time popup appears. With unchanged text, the row/body height, text start axis, and
   following record position remain unchanged; only newly entered content that needs more lines may expand it.
2. **Given** an active quick input with changed non-empty text, **When** it loses focus, **Then** the exact
   trimmed text is saved once, every non-content field remains exact, and the row returns to reading mode.
3. **Given** an active quick input with changed text, **When** the author presses Escape, **Then** the
   stored record remains byte-for-byte unchanged and focus returns to that record's text target.
4. **Given** an empty quick input or failed local persistence, **When** blur attempts to save, **Then**
   valid stored content is not overwritten and the input remains available for correction.
5. **Given** an ordinary record in reading mode, **When** the author activates its text, **Then** the
   compact text input opens directly and the former detailed inline editor does not open from that action.

---

### User Story 2 - Open the complete record composer from time (Priority: P1)

As the author scanning a day, I can activate the time at the start of a record and open the complete
record-writing dialog so content, time, and existing details remain available in one familiar surface.

**Why this priority**: The owner explicitly corrected the earlier interpretation: “浮层” means the
complete record-writing surface, not a narrow time-only control.

**Independent Test**: Activate a row time and confirm the canonical complete edit dialog opens with the
record prefilled. Change content, time, or details and complete once through the established save path;
cancel or press Escape and observe no write.

**Acceptance Scenarios**:

1. **Given** an ordinary record in reading mode, **When** the author activates its leading time,
   **Then** the canonical complete edit dialog and backdrop open with that record prefilled; no time-only
   popover or detailed row editor appears.
2. **Given** the complete edit dialog, **When** the author changes any supported record field and chooses
   Done, **Then** one complete record update is saved through the existing local-first boundary and ordering
   reflects any date/time/category change.
3. **Given** the complete edit dialog, **When** the author chooses Close, presses Escape, or dismisses a
   changed draft after confirming discard, **Then** no record or attachment change is persisted.

---

### User Story 3 - Continue an Agent detail follow-up in the existing editor (Priority: P2)

As the author answering a Diary Agent question that asks for a missing useful fact, I can use the
existing detailed inline editor in the source row so the question and the record being changed stay
in one context.

**Why this priority**: The owner explicitly removed the detailed editor from ordinary text activation
and reserved that larger writing surface for Agent follow-up context.

**Independent Test**: Start a Diary Agent missing-detail question and confirm the detailed editor appears
inside the source row with the Agent question visible, while ordinary record-text activation still opens
only the compact input. Edit the source record and choose Done to save once and advance; repeat with Cancel
to keep the source record unchanged and advance.

**Acceptance Scenarios**:

1. **Given** a missing-detail Agent question, **When** the author enters its edit response, **Then** the
   existing detailed editor appears in the source row and the question remains visibly associated with it.
2. **Given** an Agent-linked detailed edit, **When** the author chooses Done, **Then** the author-edited
   complete record is saved once through the canonical path and the review advances without a second AI
   proposal or confirmation step.
3. **Given** an Agent-linked detailed edit, **When** the author chooses Cancel, **Then** the original record
   and attachments remain unchanged and the review advances as “keep original”.
4. **Given** no active missing-detail Agent question, **When** the author activates ordinary record text,
   **Then** only the compact content input appears and the detailed editor remains absent.
5. **Given** an Agent-linked detailed edit that becomes stale, **Then** no record or
   attachment change is persisted.

---

### User Story 4 - Add a record in one quiet row (Priority: P1)

As the author recording the current moment, I can type directly beside a live second-precision time
without opening another surface.

**Independent Test**: On a populated idle Diary day, observe a live `HH:mm:ss` time beside one input,
focus and type a note, then blur or press Enter and verify exactly one ordinary record is saved with the
frozen second-precision time. Repeat with empty text and Escape and verify zero writes.

**Acceptance Scenarios**:

1. **Given** the inline add row is idle, **When** time passes, **Then** its leading `HH:mm:ss` display
   follows the local clock once per second without announcing each tick to assistive technology.
2. **Given** the author focuses the adjacent input, **Then** the displayed time freezes and the existing
   record stream, lower record stamp, and surrounding paper remain visible.
3. **Given** non-empty text, **When** the input blurs or Enter is pressed, **Then** one ordinary record is
   created through the canonical local-first write boundary with that exact second-precision time.
4. **Given** the draft is idle or focused, **When** the author activates the leading time, **Then** it
   refreshes to the current local `HH:mm:ss` value and leaves the input ready for typing.
5. **Given** empty text, Escape, account/date/view replacement, or failed persistence, **Then** no record
   is created; a failed save retains the correction-ready draft.

### Edge Cases

- Only one ordinary record may own an active quick input, Agent-linked detailed editor, or complete dialog
  draft at once. Blur from a quick input saves valid changed text; Agent-linked and dialog drafts keep
  explicit completion.
- Account and source-data replacement discard transient quick/detailed/dialog state without writing into the
  replacement account. Ordinary pointer focus movement out of a quick input follows the requested blur-save.
- Records with Markdown, long text, tags, attachments, missing time, localized structured fields, or an
  Agent annotation retain readable layout and existing data semantics.
- Direct text activation on any row must stop an active Diary Agent session before the compact input opens.
  The separate Agent-linked detailed editor remains owned by its active missing-detail question, and no
  other annotation may overlap or mutate either draft.
- At 320, 390, 426, 768, and 1280 pixels, the editable row and complete dialog must remain inside the visible
  writing plane, avoid the right rail and lower action dock, and introduce no horizontal overflow.
- Text, quick input, time, and any Agent-linked editor controls remain keyboard reachable, have visible
  focus, and provide at least a 44 by 44 pixel target; reduced motion removes nonessential transitions.

## Product Admission

### Core-Loop Contribution

This directly improves `browse → edit/delete` by making the record text itself the single compact
correction entry while keeping the complete record-writing dialog reachable from the leading time.

### User Evidence

On 2026-09-03 the product owner explicitly identified the dialog as unnecessary friction and requested
row-local editing, with the leading time as the requested floating-surface entry. During the 2026-09-04 390px
review, the owner marked the area after the record stream and requested a direct add action plus denser rows
without horizontal rules, then removed the short time/content dash and requested a blur-save input while
keeping time as the floating-surface interaction. The latest correction states that this surface is the
complete record composer rather than a time-only popover, removes the redundant pencil, assigns its exact
compact-input behavior to direct text activation, and binds the former detailed row editor to Agent follow-up.

### Default Interface and Recording Cost

When the ordinary record stream is populated and no Diary review is active, one inline quick-add row appears
after it with a live `HH:mm:ss` time and single-line input. It opens no surface; non-empty blur or Enter saves
once, while the lower record stamp remains the complete composer path. Empty days and active reviews keep their
former spacing. Existing row text and time remain separate targets; read rows omit decorative rules while
keeping `44px+` targets. The record text directly becomes the compact input, while the detailed inline
editor no longer opens from ordinary text activation and is reserved for the clarified Agent follow-up flow.

### Offline, Account, Privacy, Reversibility, and Backup

All edits reuse the authenticated account's local-first, revision-checked write path. No new network
request, identifier, schema field, storage key, analytics event, or remote payload is introduced. Cancel,
Escape, navigation, account change, invalid input, and failed local persistence are zero-write paths.
Direct text changes save only after a valid edited input loses focus. Agent-linked detailed changes save
only on Done; Cancel is a zero-write “keep original” transition. JSON, Markdown, and portable attachment
backups retain the same record shape and attachment ownership.

### Verification and Removability

Focused browser regression covers direct text activation, absence of the pencil, complete-dialog activation
from time, cancellation, focus restoration, account/source invalidation, Agent-linked editor isolation, responsive
geometry, and offline persistence. The design gate and complete repository quality gate remain mandatory.
Removing the direct-input binding restores a separate edit action without migration or data cleanup.

### Exit Condition

Rework or remove the interaction if direct text activation causes accidental writes, makes record details
or structured records unreachable, collides with Agent/rail/action surfaces, regresses offline/account/
backup behavior, or is not preferred during real mobile use.

### Admission Decision

- **Score**: `18/20`
- **Decision**: `mainline candidate`
- **Red-line check**: The change removes an edit interruption, remains explicit and local-first, adds no
  required recording step or external boundary, preserves backups, and has passed the complete quality gate.

## Requirements

### Functional Requirements

- **FR-001**: Activating the text of each free-text ordinary record in Time or Category view MUST replace
  only its current content cell with a focused input, without rendering a separate pencil, modal, backdrop,
  detailed composer, time-only surface, or separate page. The initial swap MUST preserve the reading row's
  height, body height, text start axis, and following-row position; new user-entered lines MAY expand it.
- **FR-002**: Only one quick input, Agent-linked detailed row editor, or complete dialog draft MUST be active at
  once. A valid changed quick input saves on blur; switching Agent-linked/dialog targets keeps their explicit
  completion rules.
- **FR-003**: Quick text editing MUST save one content-only patch when its input loses focus, cancel with
  zero writes on Escape, reject empty text without overwriting the stored record, and retain/refocus the
  input when persistence fails. Escape MUST restore focus to the same record-text target.
- **FR-004**: Activating a record's leading time MUST open the canonical complete record edit dialog with
  that record prefilled; it MUST NOT open a time-only popover or the detailed row editor.
- **FR-005**: The complete edit dialog MUST retain content, supported structured fields, date, time,
  category, tags, attachment, Hero-improvement, and confirmed-delete capabilities already owned by the
  canonical composer. Done MUST perform one existing complete-record save; Close/Escape/discard MUST write nothing.
- **FR-006**: A saved complete-dialog edit MUST update Time and Category ordering consistently while
  retaining the existing account, attachment, offline, revision, export, and backup boundaries.
- **FR-007**: The existing detailed inline editor MUST no longer open from ordinary record-text activation;
  it MUST be reserved for a Diary Agent missing-detail follow-up and keep the question visibly bound to the
  source row. Done MUST save the author-edited record once and advance; Cancel MUST keep the original record,
  discard staged attachment changes, and advance without an AI proposal/confirmation round trip.
- **FR-008**: Ordinary structured records MUST retain a reachable canonical edit path and required-field
  validation; periodic records MUST retain their existing independent inline editor.
- **FR-009**: Starting a direct text edit on another row MUST stop an active Diary Agent review and prevent
  Agent proposals or annotations from mutating or covering the active draft. Entering an Agent-linked
  detailed editor MUST keep ownership on that Agent's source record.
- **FR-010**: Account or source-record replacement MUST invalidate quick, detailed, and dialog state without
  writing across ownership. Ordinary focus departure from a quick input MUST follow FR-003 blur-save.
- **FR-011**: The interaction MUST remain complete in Chinese and English and support keyboard, pointer,
  touch, visible focus, Escape, and reduced-motion use.
- **FR-012**: The new-record composer and its Hero content-improvement capability MUST remain available
  from the lower record stamp. After a populated idle ordinary-record surface, the former secondary add
  button MUST be replaced by one inline quick-add row with a leading live time and adjacent input.
- **FR-013**: Read-only ordinary records MUST omit both decorative horizontal row rules, the short
  time/content dash, and the separate pencil; reclaim the removed space as a `4–10px` content inset and use
  a compact repeated rhythm while preserving content readability, `44px+` time/content targets, focus
  treatment, Agent anchoring, and direct-input expansion.
- **FR-014**: The inline quick-add time MUST display local `HH:mm:ss`, update once per second only while
  the input is unfocused, freeze on input focus, and refresh to the current second when its time control is
  activated. The ticking value MUST NOT produce repeated live-region announcements.
- **FR-015**: Blurring a non-empty quick-add input or pressing Enter MUST create exactly one ordinary
  record with the frozen `HH:mm:ss` through the existing local-first boundary, then clear the input and
  resume the live clock. Empty blur and Escape MUST be zero-write; failed persistence MUST retain the draft.
- **FR-016**: Stored record time MUST accept legacy `HH:mm` and new `HH:mm:ss` values without changing
  the record shape. The complete composer's time field MUST preserve both formats where supported, while
  downstream sorting, review, export, backup, and restore remain compatible.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly leaves a valid changed
  quick input or chooses Done in the complete dialog or Agent-linked detailed editor.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, attachment, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.

### Key Entities

- **Stored record**: Existing account-owned note whose schema, ownership, sync, export, and backup meaning
  remain unchanged.
- **Row draft**: Temporary page-local copy of one stored record, discarded until explicit completion.
- **Dialog draft**: Temporary page-local complete record copy opened from one record's leading time.
- **Agent-linked draft**: Temporary page-local complete record copy bound to one `enrich-detail` question.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In both Time and Category views, an author can begin correcting existing text with one
  activation on that text while remaining on the same page and seeing adjacent records; no pencil is shown.
- **SC-002**: One activation on a stored record time opens the complete edit dialog, and one Done action
  persists one valid supported change through the canonical save path.
- **SC-003**: Cancel, Escape, target change, view/date/surface change, invalid input, account replacement,
  and failed persistence produce zero stored-record or attachment changes in automated regression.
- **SC-004**: All affected controls meet the 44-pixel target rule and the interaction has no horizontal
  overflow or rail/action collision at 320, 390, 426, 768, and 1280 pixels.
- **SC-005**: Focused tests, the design gate, and the complete repository quality gate pass; the product
  owner prefers the 390-pixel real-page interaction to the former dialog before the board item is accepted.
- **SC-006**: A populated idle Diary stream exposes no standalone add button; its quick-add row saves one
  second-precision record from blur or Enter in both Time and Category views with no modal.

## Scope Boundaries

### In Scope

- Existing ordinary records in Time and Category views.
- Direct row-local free-text editing, complete-dialog activation from time, and the Agent-linked detailed-editor handoff.
- One inline quick-add row after the ordinary record surface and compact rule-free read-row presentation.
- Cancellation, focus, responsive, Agent-isolation, local-first, and attachment safety behavior.

### Out of Scope

- Periodic fixed-record editing, Plan blocks, Search result editing, bulk editing, new metadata fields,
  schema migration, new network requests, or generalized popovers.
- Redesigning the Hero improvement capability, Plan Agent logic, record ordering rules, the right rail,
  sync, exports, backups, or account authentication. Diary Agent changes are limited to the missing-detail
  editor handoff defined by this rework.

## Assumptions and Dependencies

- `LN-080` is Assigned to the single writer in the main checkout; unrelated dirty changes remain owned by
  their existing tasks and must be preserved.
- Only the deliberate one-line quick-add input and direct record-text edit use blur-save behavior. The
  complete dialog and Agent-linked detailed editor keep explicit Done/Cancel completion.
- The surface opened from a stored record time is the canonical complete record dialog, not a time-only popover.
- Existing data, attachment, and local-first save primitives remain the canonical implementation boundary.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-003, SC-001 | Time/Category browser journeys for direct text input, no pencil, blur-save, Escape, empty/failure retention, and no modal | Row-local text acceptance |
| FR-004–FR-006, SC-002 | Stored-time activation opens the complete dialog; Done/Close/Escape, field reachability, focus, and ordering checks | Complete composer acceptance |
| FR-007–FR-010, SC-003 | Agent-linked editor prompt binding, Done-save-and-advance, Cancel-keep-and-advance, structured reachability, stale/account invalidation | Capability and zero-write boundary |
| FR-011–FR-013, SC-004 | Chinese/English keyboard/touch, stream-add, rule-free/dash-free compact rows, reclaimed inset, and five-width geometry evidence | Accessibility and responsive acceptance |
| NR-001–NR-004, SC-005 | Focused tests, `npm run design:check`, `npm run check`, diff review, and owner mobile review | Return and acceptance gate |
