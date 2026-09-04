# Feature Specification: Book-page Ritual

**Board Item**: `LN-076`
**Feature Directory**: `005-book-page-ritual`
**Created**: 2026-08-28
**Status**: Draft
**Input**: User description: "我觉得现在的UI不高级，没有把书本的那种复古感，记录的仪式感拉满"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove the acceptance claim.

### User Story 1 - Enter a convincing private journal (Priority: P1)

As the author opening Log Note on a phone, I see a calm, coherent book page whose paper, ink,
typography, date identity, binding edge, and record actions feel like parts of one personal journal,
so recording begins with focus instead of visually unrelated controls and empty space.

**Why this priority**: The home page is visited for nearly every recording session. It is the
narrowest surface on which the stated lack of quality, book character, and ritual is immediately
felt, while it can improve the experience without changing any data or workflow.

**Independent Test**: Compare the same 390px home state before and after the change, then verify at
320, 390, 426, 768, and 1280px that the date, primary workspace, binding edge, and available actions
form one readable hierarchy with no unexplained dominant blank band, collision, or horizontal
overflow.

**Acceptance Scenarios**:

1. **Given** an authenticated author opens an ordinary diary day, **When** the page settles,
   **Then** record content or the available recording surface is visually primary and the page reads
   as one continuous journal rather than a collection of unrelated ornaments.
2. **Given** the authenticated device is offline, **When** the author opens the cached home page,
   **Then** the complete visual treatment and all existing recording actions remain available
   without a network request or missing remote asset.
3. **Given** the author is browsing a date other than local today in Diary or Plan, **When** they
   activate the adjacent Today action, **Then** the selected date returns to today in one action,
   an open month picker closes, focus returns to the date disclosure, and the current workspace and
   record-view modes remain unchanged.

---

### User Story 2 - Read past entries as authored journal lines (Priority: P1)

As the author browsing a day with records, I can scan date, time, note text, optional tags, Agent
entry, and fixed records in a clear editorial rhythm, with my original record text holding the
strongest content role.

**Why this priority**: Browse is the second step of the core loop, and the current baseline shows
record rows, large gaps, hand-drawn rules, rail labels, and secondary content competing instead of
forming one reading flow.

**Independent Test**: Render a day containing multiple ordinary entries, the Diary Agent entry, and
fixed records; verify the original entries are the dominant readable content, related content stays
proximate, and secondary elements do not obscure or imitate the records.

**Acceptance Scenarios**:

1. **Given** a day with ordinary and fixed records, **When** the author scrolls through it, **Then**
   spacing and separators distinguish sections without card walls, repeated headings, or a large
   decorative void interrupting the reading sequence.
2. **Given** a 320px viewport, keyboard focus, or reduced-motion preference, **When** the author
   browses and operates the page, **Then** text stays legible, actions remain at least 44px, focus is
   visible, and no essential relationship depends on motion.
3. **Given** a mobile day with ordinary records and the Diary Agent available, **When** the Agent is
   idle, scanning, reviewing, or complete, **Then** the selected non-humanoid graphite line spirit
   remains visible from the binding edge after the current date context without reserving a blank
   block in document flow, uses a distinct pose for the current state, and may sit beside ordinary or
   fixed rows while leaving the month grid, authored text, fields, inline review, directory labels,
   and tools unobscured.
4. **Given** the Agent moves along the binding edge, **When** the viewport is 320–426px or reduced
   motion is requested, **Then** its visible body stays in the paper-edge lane, its real control
   remains at least 44px, document content does not move to make room for it, and reduced motion
   freezes it at a deterministic state-specific resting position.
5. **Given** Category view contains a domain followed by another domain,
   **When** the author scans the chapter boundary, **Then** the domain, category, and periodic progress
   of the first visible category read as one compact editorial heading while remaining distinct
   semantics, later categories retain clear subordinate headings, and only one weak rule appears
   between the last row and the next chapter.

---

### User Story 3 - Make a note through a deliberate but still quick editor (Priority: P1)

As the author opening the ordinary composer, I enter a quiet writing surface that feels like
continuing the current journal page, while close, writing, optional details, and save remain obvious
and fast.

**Why this priority**: The composer is the moment of recording. A coherent ritual matters here only
if it preserves the product's one-action open and one-action save contract.

**Independent Test**: From the home page, open the ordinary composer with one action, type a normal
note, save with one further action, and verify the editor is visually continuous with the book page
at all target widths without adding a required choice.

**Acceptance Scenarios**:

1. **Given** the author is on the home page, **When** they activate the existing record action,
   **Then** the composer opens in one action with a clear writing area, close action, and save action.
2. **Given** the author types only ordinary note text, **When** they save,
   **Then** saving completes in one action and the stored text is exactly what they entered.

### Edge Cases

- An empty day must remain calm and actionable without inventing empty-state prose or leaving a
  dominant accidental void between the date and the available recording context.
- Long Chinese and English entries, large text, long localized dates, genuine `#tags`, and fixed
  record placeholders must wrap without clipping the binding edge or action lane.
- Calendar, Search, Settings, Diary/Plan, Agent review, and the composer must retain their existing
  state transitions, focus return, and Escape behavior.
- Offline and installed-PWA rendering must use only locally available visual assets.
- Reduced motion must remove non-essential transitions while preserving the final hierarchy and
  state feedback.
- The appearance boundary must fall back to the bundled default when an unknown appearance is
  requested; appearance selection must not change Agent review behavior, record data, or layout
  ownership.
- The Agent viewport layer must remain visible during long Diary scrolling and inline review; it
  hides for Plan, Search, Settings, and composer surfaces, while empty Diary dates keep the idle
  companion and use a transient no-write note on activation.
- The date disclosure must remain one stable DOM and focus target in collapsed and expanded states;
  removing the separate Calendar rail button must not remove Escape-to-close or focus return.
- The record-view trigger must expose the current/next Time or Category meaning without relying on
  color alone. Mobile Time renders only the fixed structure trigger; grouped mode adds the domain
  rail, and Plan renders neither trigger nor rail.
- Diary and Plan must share one keyboard-operable Plan-icon toggle in the upper tools. Diary is its
  unpressed state and Plan its raised pressed state. The lower dock contains no workspace labels or
  capsule; its contextual blue stamp opens the existing record editor in Diary and existing plan
  editor in Plan.
- When the month picker expands, the Agent must tuck into a compact paused pose outside every calendar
  cell. Character assets must contain no full-height vertical stroke, so only the existing page spine
  remains visible.
- At 320, 360, 389, and 390px, Search and the expanded month picker must resolve against the same
  binding geometry. Seven calendar columns keep 44px targets even when that forces unavoidable
  overlap at 320px; extra width must not be used to mask the remaining binding gutter.
- The Today action must be absent while today is selected, appear only for another selected date,
  remain at least 44px in both languages, and leave the date disclosure as the stable focus target
  after the action removes itself.

## Product Admission *(mandatory)*

### Core-Loop Contribution

The feature directly improves quick record and browse: it makes the recording surface easier to
enter, makes authored notes easier to distinguish and scan, and makes opening the composer feel like
continuing the same journal page. Search, edit/delete, backup/restore, and offline use are preserved.

### User Evidence

The product owner explicitly reported that the current UI lacks perceived quality, convincing
vintage-book character, and a sufficiently strong recording ritual. The captured 390px baselines
show the concrete symptoms: a weak relationship between the header and body, large unowned gaps,
multiple illustration languages, and a composer that reads as a generic bottom sheet rather than
part of the same journal. Rework 3 is additionally supported by the product owner's marked
screenshots: the Agent disappears during review and the full blank interval plus right binding
gutter reads as unused space instead of the Agent's persistent activity territory.
Rework 4 is supported by a further marked 390px Category screenshot: the stacked `健康 / 身体指标`
and `学习 / 学习记录` headings occupy the weight of two separate modules, while the last Health row
and the next domain each draw a full-width rule, creating two adjacent boundaries for one transition.
The latest marked follow-up rejects the interim inline `健康 / 身体指标` title because `身体指标` is
also a secondary heading, and identifies excess vertical whitespace in the embedded fixed rows.
Rework 5 is supported by three additional marked 390px captures: the dedicated Agent stage remains a
large unowned void, the Agent can instead coexist along the binding beside fixed rows, and the current
`Time / Category` title should trade places with the date while the rail's Calendar position becomes
the record-view switch. Three follow-up captures of the implementation show a viewport-fixed Agent
inside the expanded month grid, two parallel vertical lines, and a detached lower-right Diary/Plan
switch. The same evidence shows two nearby horizontal rules between the last ordinary record and
fixed fields; these define the remaining anchoring, single-spine, single-transition, and unified-rail defects.
Rework 6 is supported by the product owner's cropped current-state rail capture and direct request:
the standalone “分类” and “日记” words do not reveal their alternatives strongly enough, and both
mode pairs should be visible as rail-native rockers.
Rework 7 is supported by the product owner's current composer capture and direct request to optimize
the record UI: opening `More` leaves an oversized blank writing region above a long undifferentiated
form, attachments read like another form field, and the destructive action is mixed into routine
metadata. The correction must keep writing primary while making optional information scan as a
compact ledger beneath it.
Rework 8 is supported by the product owner's repeated marked Diary captures and explicit final plan:
the Agent disappears during long-page scrolling, can drift into the expanded calendar, and its
appearance-owned stroke creates a second spine. The desired behavior is a resident right-spine
companion that remains visible across the Diary viewport, patrols a protected mobile rail, and still
exists on empty dates without inventing content or starting review.
Rework 10 is supported by two installed-PWA captures from the product owner at a narrow mobile
viewport. The expanded calendar consumes almost the full viewport and paints over the binding
gutter, while Search inherits the ordinary record stream's Agent reserve and ends roughly 42px
before the brush. These opposite failures show that tool surfaces and the picker need one explicit
writing-plane boundary instead of inheriting record-row spacing or masking the whole gutter.
Rework 11 is supported by the product owner's direct feedback that the date-led header should
provide a one-click way back to today. The current date disclosure can select another day but leaves
no visible shortcut for returning, so a common browse recovery action is unnecessarily indirect.
Rework 12 is supported by the product owner's marked 390px PWA. The upper Diary/Plan rocker is
explicitly moved beside the lower quick actions, while the existing export mark gains the visible
scope label `Export today / 导出今日日记` next to the blue record stamp. This is a placement and
discoverability correction, not a new action or export format.

### Default Interface and Recording Cost

No new persistent primary control, modal, field, decision, or navigation item is added. Rework 11
adds one conditional secondary Today action beside the date identity only while another date is
selected; it disappears immediately on return. Existing home, timeline, fixed-record, rail, and
composer elements otherwise stay within their current roles. Opening the ordinary composer remains
at most one action; saving after typing remains at most one further action.

### Offline, Account, Privacy, Reversibility, and Backup

This feature is display-only and introduces no record, structure, settings, account, sync, or
network data. Assets must remain in the offline application shell. Account isolation, local-first
writes, revision checks, raw-note integrity, Markdown export, JSON backup/restore, and portable image
backup remain unchanged. The treatment can be reverted without migrating or rewriting stored data.

### Verification and Removability

Targeted browser regression covers visual hierarchy, composer steps, 44px targets, focus, reduced
motion, overflow, and isolation of existing tool states across 320, 390, 426, 768, and 1280px.
Before/after evidence covers the mobile home, populated timeline, and composer. The repository design
check and full quality gate are mandatory. Presentation rules and local decorative assets remain a
separable layer that can be removed without changing content or stored state.

### Exit Condition

Rework or remove the treatment if the author still judges the page visually generic after direct
comparison, if the result depends on ornamental noise instead of readable hierarchy, if note text
loses primacy, if quick recording gains a step, if any target width overflows, or if the change
regresses offline rendering, accessibility, input responsiveness, or the quality gate. Review the
treatment again after 14 days of personal use; lack of sustained preference is evidence to simplify
or revert it.

### Admission Decision

- **Score**: `19/20` using the rubric in `product.md`
- **Decision**: `mainline candidate`
- **Red-line check**: The feature does not rewrite raw records, block authenticated offline use,
  cross the approved account boundary, add a required recording step, alter backup compatibility,
  or waive the existing quality gate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home diary MUST present its paper, ink, typography, date identity, separators,
  binding edge, and record actions as one coherent private-journal visual system.
- **FR-002**: Authored record text MUST remain the strongest content role on a populated day;
  controls, directories, Agent entry, fixed-record prompts, and decorative marks MUST remain
  subordinate and distinguishable.
- **FR-003**: The initial mobile viewport MUST NOT contain a dominant unowned blank band caused by
  layout spacing; at `390px`, the first owned content boundary MUST begin `24–80px` after the closed
  date context, and section whitespace MUST communicate a specific boundary or available writing area.
- **FR-004**: Ordinary records and fixed-record fields MUST stay on one continuous paper surface;
  routine content MUST NOT become a card wall or acquire thick repeated borders and shadows.
- **FR-005**: The ordinary composer MUST feel continuous with the current journal page while keeping
  its writing area, close action, optional-detail access, and save action immediately recognizable.
- **FR-006**: Opening the ordinary composer MUST take at most one action, and saving a normal note
  after typing MUST take at most one further action with no additional required field or choice.
- **FR-007**: All existing interactive targets affected by the treatment MUST remain at least 44px,
  keyboard operable, visibly focusable, and usable with reduced motion.
- **FR-008**: The home, populated timeline, and composer MUST avoid horizontal overflow, clipped
  essential text, and action collisions at 320, 390, 426, 768, and 1280px.
- **FR-009**: Search, Calendar, Settings, Diary/Plan, Agent, export, record-structure adjustment, and
  ordinary record actions MUST retain their existing meaning, reachability, and state transitions.
- **FR-010**: All visual resources required by the treatment MUST remain available on an already
  authenticated offline device and in the installed application.
- **FR-011**: Every grouped Diary date MUST expose the selected graphite line-spirit appearance for
  `idle`, `scanning`, `reviewing`, and `complete`, including dates without ordinary records. Timeline
  MUST NOT mount this application-shell Agent. When present, the
  appearance and its activation target MUST live in one application-shell viewport layer rather
  than the document flow, remain visible while the page scrolls, and never overlap authored text,
  inline annotation, fixed field, directory label, calendar target, or rail control. The target MUST
  remain keyboard operable, visibly focusable, and at least `44px`.
- **FR-012**: Agent appearance MUST remain separate from review behavior and stored product data.
  Each state definition MUST provide a local `staticAsset`, local `motionAsset`, `intrinsicSize`,
  a state-specific immutable motion profile, and a resolved `motionMode`, while retaining the legacy
  `asset` alias for callers. The profile MUST describe the APNG frame count, local cycle, body poses,
  and gaze states without storing the current frame. Unknown IDs and states MUST fall back safely,
  and registering another bundled appearance MUST not require changes to review logic, persisted
  state, exports, or backups.
- **FR-013**: Agent artwork MUST contain only the character and MUST NOT contain a full-height
  vertical stroke. The existing page rail remains the one visible spine. Agent presentation MUST
  contribute no document-flow height or new ordinary-to-fixed separator; the last ordinary row
  continues to own the only horizontal transition into fixed records.
- **FR-014**: In Category view, every visible category, including a domain's first category, MUST use
  a standalone secondary-heading line beneath the domain while preserving the complete
  `Domain → Category` reading order. All category headings MUST use regular weight and share the
  domain heading's left edge; periodic completion belongs beside its category heading, and records or
  metrics remain one restrained level inset. Embedded fixed-record rows MUST use a `52px` rhythm while
  their inputs and row actions retain at least `44px` targets.
- **FR-015**: A transition between Category-view domains MUST use at most one visible weak rule. The
  previous row's divider MAY close its group, but the next domain MUST then rely on deliberate section
  whitespace rather than drawing a second equal-weight top rule.
- **FR-016**: The selected diary date MUST be the leftmost and visually strongest home-page title.
  Date and weekday MUST form one disclosure control that opens/closes the existing month picker,
  preserves the same date identity DOM while expanded, supports Escape and focus return, and removes
  the separate Calendar action from the right rail.
- **FR-017**: In Diary, the upper right tool lane MUST contain Search, Settings, and one
  single-button localized Category toggle in that order. In Plan, the same lane MUST contain only
  Search and Settings. The Category toggle MUST use unpressed for timeline and pressed for grouped
  view, change mode in one action, and expose the active state through `aria-pressed`, raised surface,
  and ink rather than color alone. The single Diary/Plan rocker MUST live in the lower quick-action
  dock in both modes, show both localized mode labels at once, and expose its current mode through
  thumb position, raised surface, and ink. Both controls MUST remain at least `44px`; labels MUST
  remain untruncated in Chinese and English. The selected date MUST be preserved, and no duplicate
  Diary/Plan control may remain in the upper tool lane.
- **FR-018**: Reordering date, view, workspace, and Agent presentation MUST NOT change the month-picker kernel,
  horizontal day/month swipe behavior, search/settings state, Diary/Plan switch, Agent review/write
  rules, record ordering, fixed-record input behavior, or quick-record step count.
- **FR-019**: When ordinary-composer details are closed, the textarea MUST remain the dominant page
  leaf. When details are open, the writing area MUST remain immediately usable but yield enough
  height for date/time, category/tags, and attachments to be scanned without a dominant accidental
  blank band or a wall of equal-weight cards.
- **FR-020**: The optional-details trigger MUST expose its expanded state and controlled region to
  assistive technology. Attachments MUST form a distinct secondary section, while record deletion
  MUST remain available only for an existing record in a separated danger footer with a clear
  boundary; none of these presentation changes may alter callbacks, stored values, or confirmation
  behavior.
- **FR-021**: At `320–700px` in grouped Diary, the Agent MUST patrol only the viewport-safe segment between the upper
  Search/Settings/view tools and the lower workspace/export/new-record actions. `idle` uses a
  28-second one-way trip with short grip pauses, `scanning` 20 seconds, `reviewing` 32 seconds across
  a visibly reduced range, and `complete` briefly settles into a 30-second return patrol. At `701px`
  and wider it MUST remain in a quiet fixed peek. Slow rail travel MUST remain separate from the
  character's local six-frame action: `idle` cycles grip → upward reach → body follow → settle in
  about 3 seconds; `scanning` peeks, stretches, retracts, and scans in about 2.4 seconds; `reviewing`
  keeps the hand-to-chin pose while the head and gaze inspect the record/note over about 4 seconds;
  `complete` coils, stretches, re-grips, and settles over about 3 seconds. Eye direction MUST change
  only with these readable actions, not as a continuous twitch. Calendar open, focus, press, hidden document, and
  `prefers-reduced-motion: reduce` MUST pause or remove traversal without hiding the correct pose.
- **FR-022**: On an empty grouped Diary date, activating the Agent MUST show the localized temporary margin
  note for today or another date, make no analysis request and no data write, and dismiss after 4.5
  seconds, a second activation, Escape, date change, or leaving Diary. Existing populated-date wake,
  stop, review, and explicit-write behavior MUST remain unchanged.
- **FR-023**: The Agent viewport layer MUST render only in grouped Diary. Timeline, Plan, Search,
  Settings, and the ordinary composer MUST hide it; returning to grouped Diary MUST restore the
  appropriate current pose.
- **FR-024**: The application-shell Diary Agent MUST NOT render visible tap-to-analyze invitation
  copy in any state. Its button retains a localized accessible name; empty dates, Calendar,
  `scanning`, `reviewing`, and `complete` keep the writing plane equally quiet.
- **FR-025**: At `320–700px`, each fixed-record hand-drawn row rule MUST remain left-anchored and
  stop `24px` before the row's right edge so it does not visually connect to the Diary Agent. The row
  hit area, columns, focus loop, raster asset, values, and callbacks MUST remain unchanged. Inline
  fixed inputs MAY stop `4px` before their prior right edge only to keep the travelling `44px` Agent
  target from intercepting them; their height, value, focus, save behavior, and wider layout remain
  unchanged.
- **FR-026**: At `320–700px`, an embedded Search or Settings workspace MUST end `8px` before the
  visible binding brush. It MUST NOT inherit the ordinary record stream's `82px` Agent/content
  reserve, cover the upper rail controls, or create horizontal overflow. Search and Settings state,
  focus, callbacks, scroll restoration, and wider layouts MUST remain unchanged.
- **FR-027**: At widths below `390px`, the expanded month picker MUST use the smallest paper width
  that preserves seven `44px` day columns and its compact outer padding. At `360px`, calendar content
  MAY extend at most `8px` beyond the binding axis solely to preserve those targets; at `320px`, only
  the mathematically unavoidable overlap from the same minimum grid is allowed. At `389px`, the
  content MUST return to an `8px` pre-brush gap and transition continuously to the existing `390px`
  layout. The picker MUST NOT return to a near-full-viewport opaque gutter mask.
- **FR-028**: When the selected date differs from the device's local today, the date title cluster
  MUST expose exactly one localized secondary Today action beside the existing date disclosure.
  The action MUST be absent on today, keep a target of at least `44px`, and in one activation select
  today, close an expanded month picker, return focus to the unchanged date disclosure, preserve the
  current Diary/Plan and Time/Category modes, and produce no record, plan, storage, or network write.
- **FR-029**: Diary's upper tool lane MUST contain Search, Settings, and the Diary-only localized
  Category toggle in that order, without a workspace rocker. The Category toggle MUST be unpressed
  in timeline view and pressed in grouped view, expose `aria-pressed`, change state in one action in
  either direction, and remain visibly distinguishable without color alone. The single Diary/Plan rocker MUST
  live in the lower quick-action dock in both Diary and Plan, remain at least `44px`, keep both
  localized labels visible, and preserve its existing one-action callback and state.
- **FR-030**: In Diary, the lower action row MUST place one visible localized
  `Export today / 导出今日日记` action to the left of the existing blue record action. The controls
  MUST align horizontally, remain at least `44px`, and retain their current export/open behaviors.
  Plan MUST hide both Diary-only actions, keep the lower workspace rocker, and retain its existing
  contextual add-plan action without collision or duplicate workspace controls.
- **FR-031**: Rework 14 supersedes Rework 13 only for record-view presentation and the mobile
  directory's visibility. Category MUST use the existing structure icon with an accessible
  localized action name and `aria-pressed`. At `320–700px`, Search and Settings MUST remain in the
  top header while the Category icon stays independently fixed in the upper-right with a target of
  at least `44px`; timeline MUST mount no domain directory and reserve no directory width. Grouped
  view MUST mount the existing narrow directory, keep it open after a domain jump, and remove it
  again when the same icon returns to timeline. At `701px+`, the icon stays in the top tools,
  switching MUST NOT mount a vertical directory or change the record-stream width. Plan MUST omit
  the icon and directory. Search, Settings, and Calendar MAY temporarily unmount the directory but
  MUST restore it when they close if grouped mode is still current.
- **FR-032**: The Rework 14 correction supersedes FR-029 and FR-030 only for the lower workspace
  control, contextual creation, and Plan rail ownership, and clarifies FR-031's mobile rail surface.
  At `320–700px`, timeline MUST render no binding-gutter background, spine asset, domain directory,
  blank rail strip, or directory content inset; it MUST retain only the fixed structure trigger.
  Grouped Diary MUST reveal the existing approximately `92px` domain rail with a restrained
  approximately `160ms` width/translation/opacity transition, while reduced motion switches
  immediately. Plan MUST render no structure trigger, binding surface, spine asset, directory, or
  right-side reserve at any width. One persistent bottom bar MUST render three sibling controls in
  DOM, visual, and keyboard order: Diary, Plan, then the existing blue record stamp. The stamp MUST
  open the existing record composer in Diary and the existing `PlanEditor` in Plan; today's new plan
  defaults to current local time and another selected date defaults to `09:00`. The old `.day-plan-add`
  control MUST be absent. The bar's outer surface MUST be one continuous capsule with matching corner
  radii, never a mixed square/round silhouette. Export MUST keep its existing Diary-only appearance,
  position, and behavior.
  Existing time-grid creation, plan editing, Plan Agent behavior, persistence, and data contracts
  MUST remain unchanged.
- **FR-033**: The Rework 14 owner follow-up narrows Diary Agent visibility and restores the directory's
  title-anchored movement contract. At `320–700px`, timeline MUST mount no Diary Agent surface or idle
  invitation, MUST inset ordinary record rows by at least `8px` inside the existing shell padding,
  and MUST center the fixed-record ledger across the reclaimed writing plane. In Time view, every
  ordinary time target and the direct quick-add time target MUST share one metadata-column edge, while
  authored content and the quick-add input text MUST share one content start. In grouped Diary, every
  visible domain MUST end with exactly one quick-add row that saves into the domain's first category,
  without a second classification decision or a new persisted field. Grouped Diary MAY mount
  the existing Agent without visible idle-invitation copy. Each grouped domain directory control MUST
  move with its matching chapter heading while that heading is inside the directory window, including
  aligning the `44px` domain control rather than the optional insights control; headings above or below
  the window MUST clamp in document order at the top or bottom edge. The mobile directory window MUST
  extend from below the fixed mode-control stack to above the open lower action dock, without collision.
- **FR-034**: The latest Rework 14 owner follow-up supersedes FR-029, FR-030, and FR-032 only for
  workspace-control placement and presentation. One Plan-icon workspace toggle MUST live in the
  upper tools in both modes, remain at least `44px`, and preserve the existing one-action callback.
  Diary MUST expose `aria-pressed=false`; Plan MUST expose `aria-pressed=true` plus a raised paper
  surface and non-color-only ink/border/elevation state. The localized accessible name MUST describe
  the reverse action. Diary DOM, visual, and keyboard order MUST be Search, Settings, workspace, then
  the Diary-only structure-icon record-view toggle; Plan MUST omit only record view. At `320–700px`,
  workspace MUST remain fixed above record view on the same upper-right axis without collision. The
  lower action dock MUST render no Diary/Plan control, visible mode label, rocker, capsule boundary,
  or inset surface. It MUST retain the existing contextual blue stamp in both modes and the existing
  Diary-only export action. Plan MUST retain no separate `.day-plan-add`. Existing mode state,
  record/plan editors, date, Agent, persistence, data, account, offline, sync, export content, and
  backup contracts MUST remain unchanged.
- **FR-035**: The owner's latest marked mobile capture supersedes FR-033 only for Time-view horizontal
  alignment. At `320–700px`, the selected-date text, `Records` heading, every ordinary-record time
  target and visible time string, and the direct quick-record time target and visible time string MUST
  share the shell's base left edge within `1px`. At phone widths `320–426px`, the first fixed-record
  label MUST join the same current `18px` edge; wider fixed ledgers MAY retain their established
  centered readable width.
  Ordinary and quick-record time strings MUST use basic left alignment; the timeline MUST NOT add a
  second outer inset or use right alignment that lets longer `HH:mm:ss` values cross that base edge.
  Ordinary content and quick-record input text MUST continue to share one content start. Target size,
  row height, inline editing, time editing, save behavior, data, account, offline, sync, export, and
  backup contracts MUST remain unchanged.
- **FR-036**: In grouped Diary, historical time text and the contextual quick-record time MUST all
  begin on the current domain heading's left edge, regardless of whether a stored entry uses legacy
  `HH:mm` or current `HH:mm:ss`. Historical authored content, the contextual quick-record input box,
  and its editable text MUST share one second left edge. The two axes MUST use one fixed time column,
  preserve `44px+` targets, and create no horizontal overflow at `320–700px`; Time view, stored time
  precision, category assignment, save behavior, data, and network contracts remain unchanged.
- **FR-037**: The owner's clarification extends FR-035's basic mobile paper edge to Plan. At
  `320–700px`, the selected-date text, every Plan hour label, and the all-day label when rendered MUST
  share the shell's current base left edge within `1px` and MUST use left alignment rather than a
  right-positioned compensation. The existing `64px` Plan canvas/content axis, empty guidance, plan
  blocks, independent grid scrolling, CRUD, Plan Agent, Google read-only context, data, account,
  offline, sync, export, and backup contracts MUST remain unchanged.
- **FR-038**: In grouped Diary at every supported width, every embedded fixed-record label and expandable fixed
  label MUST share the domain/category heading's left edge within `1px`. Removing the former `24px`
  label inset MUST add the same width to the label track so the existing value/input and chevron axes
  do not move. Row height, `44px+` inputs, hand-drawn rules, Agent clearance, category ownership,
  saves, data, account, offline, sync, export, and backup contracts MUST remain unchanged.
- **FR-039**: One shared date-content frame MUST own the first vertical gap for Time, grouped Category,
  and Plan. With the picker collapsed, the frame MUST use one `12px` spacing token; with the picker
  expanded, that gap MUST be `0`. The Time root, grouped root, first grouped domain, and day-plan root
  MUST add no top margin or padding at any supported breakpoint. Desktop and `701–800px` topbars MUST
  use a `64px` minimum height, while existing mobile safe-area heights remain unchanged. Typography,
  internal section spacing, controls, records, plans, data, and persistence MUST remain unchanged.
- **FR-041**: The latest grouped quick-record placement correction supersedes FR-033 only where it
  placed the contextual row at the end of a domain. Every visible domain MUST retain exactly one row,
  but that row MUST be a direct child of the first category's ordinary-record list, after all ordinary
  entries and before that category's periodic fields or any later category. Its first-category save
  target, second-precision behavior, focus, Enter, blur, Escape, failure handling, persistence, and
  data contract MUST remain unchanged.
- **FR-040**: The Time view MUST place one concise record-structure adjustment link beside the visible
  `Record / 记录` heading. The link MUST target `/settings#record-setup`, remain keyboard reachable with
  a visible focus state, and expose at least a `44px` hit target. Fixed-record progress headers MUST NOT
  retain a second management link. The product MUST expose one complete Domain → Category → Template
  editor for both linear and periodic templates; `focus=periodic` MUST NOT select or render a separate
  fixed-record management surface. Legacy `/templates` and `focus=periodic` URLs MAY remain as
  compatibility inputs but MUST canonicalize to `/settings#record-setup`. Fixed-record data, inline
  filling, `homeVisible`, persistence, sync, backup, and export contracts MUST remain unchanged.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.
- **NR-005**: No new network call, storage field, revisioned payload field, or background behavior
  may be introduced by this presentation change.
- **NR-006**: This release MUST NOT expose an appearance picker, upload flow, marketplace, account
  preference, backup member, or synchronization field for Agent appearance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In side-by-side review of the three baseline states and their replacements, the product
  owner can identify one consistent book-page system across home, timeline, and composer without
  pointing to a dominant accidental blank band or visually unrelated control family.
- **SC-002**: A normal quick note still takes no more than one action to open the editor and one
  further action to save after typing, with the saved text matching the entered text exactly.
- **SC-003**: The home, populated timeline, and composer complete automated checks at 320, 390, 426,
  768, and 1280px with zero horizontal overflow, zero essential action collision, all affected
  targets at least 44px, and visible keyboard focus.
- **SC-004**: The same surfaces render and remain operable in authenticated offline and installed
  application checks, with reduced motion enabled, and the complete repository quality gate passes.
- **SC-005**: After 14 days of personal use, the author prefers the revised recording surface to the
  captured baseline and reports no added friction in starting or saving an ordinary note.
- **SC-006**: At 320, 390, 426, 600, and 700px, automated top/middle/bottom scroll geometry keeps the
  Agent entirely inside the viewport and its safe rail in every supported state, with a target of at
  least 44px, zero flow contribution, no new ordinary/fixed gap, and zero overlap with authored text,
  annotations, fields, directory labels, upper tools, export, or record actions. At 768 and 1280px
  the same checks show one stationary quiet peek.
- **SC-007**: Automated contract coverage proves that the default appearance definition is local,
  exposes static/motion assets, intrinsic size, immutable motion profile, and legacy alias for every
  state, contains no full-height spine stroke, resolves without changing Agent actions, and returns
  the default for an unknown identifier; no appearance value or current frame is present in account
  state or backup fixtures.
- **SC-008**: With reduced motion enabled at 320, 390, 426, 600, and 700px, all four Agent states
  render at deterministic safe positions with no running animation, no loss of visibility, and no
  document-flow height. Calendar and hidden-document checks produce the same paused result.
- **SC-009**: At 320, 390, 426, 768, and 1280px, each domain and first category occupy distinct heading
  sections, every category heading computes to regular weight and shares the domain heading's left
  edge, the accessible progress label remains beside its category, embedded fixed rows measure `52px`,
  all affected inputs retain at least 44px targets, and automated geometry finds no pair of
  consecutive full-width rules at an adjacent-domain boundary.
- **SC-010 (superseded presentation)**: Its date-disclosure, Calendar-removal, target-size,
  one-action switching, picker, overflow, and directory-clearance checks remain covered by SC-021 and
  SC-024. Its visible labels, dual-label rockers, lower workspace placement, and old tool-order checks
  are historical and MUST NOT be used as current acceptance criteria.
- **SC-011**: At 320, 390, 426, 600, and 700px with the picker collapsed and expanded, the Agent
  contributes no document-flow height, tucks into one compact paused pose outside all month cells,
  and overlaps authored text, inputs, annotations, directory nodes, and rail controls by at most
  1px². Static and motion assets contain no near-full-height opaque column, the DOM exposes exactly
  one rail element, and the ordinary-to-fixed boundary exposes exactly one hand-drawn rule.
- **SC-012**: At 320, 390, 426, 768, and 1280px, opening composer details exposes a valid expanded
  disclosure, keeps at least 160px of usable writing height on mobile, reveals the metadata and
  attachment sections without horizontal overflow, separates an existing record's delete action
  from routine fields, and preserves 44px targets, keyboard focus, reduced-motion behavior, exact
  typed text, and the existing one-action save path.
- **SC-013**: Timing and computed-style coverage distinguishes 28-second idle, 20-second scanning,
  32-second reviewing-with-reduced-range, and 30-second complete-settle rail motion. Asset contracts
  also prove six looping RGBA APNG frames with restrained state-specific delays and registered crawl,
  scan, thinking, completion, and gaze sequences; focus, pointer hold, calendar, document hiding, and
  reduced-motion pause it while keeping the button co-located with the art.
- **SC-014**: Empty-date activation shows the correct today/other-day copy, dismisses on timeout,
  second activation, Escape, date change, and surface change, and produces zero review-provider calls,
  record writes, plan writes, persisted fields, or backup differences.
- **SC-015**: Visibility checks prove grouped Diary shows the Agent on populated and empty dates while
  timeline, Plan, Search, Settings, and the composer do not; returning to grouped Diary restores it
  without a network request.
- **SC-016**: At every target width and Agent state, the application-shell Diary Agent renders no
  visible idle invitation while preserving its localized accessible button name.
- **SC-017**: At 320, 390, 426, 600, and 700px, computed style and visual evidence show each fixed
  row rule left-anchored at `calc(100% - 24px)` width; geometry also proves the travelling Agent
  target does not overlap inline fixed inputs, with no new overflow, focus, value, or content regression.
- **SC-018**: Automated geometry at `320`, `360`, `389`, and `390px` proves embedded Search ends
  `8±1px` before the brush, the expanded calendar preserves all `44px` day targets, and its content
  right edge equals the farther-right of the normal pre-brush boundary or the seven-column minimum.
  The same run proves no horizontal overflow, no covered rail control, and a smooth 389→390 boundary;
  focused screenshots confirm the search blank band and near-full-width calendar mask are removed.
- **SC-019**: At `320`, `390`, `426`, `768`, and `1280px`, automated and visual evidence proves the
  localized Today action is absent on today and visible only on another selected date, remains at
  least `44px` without overflow or collision, works in Diary and Plan, closes an open picker in one
  activation, restores focus to the date disclosure, preserves both mode states, and changes no
  stored payload.
- **SC-020 (superseded presentation)**: Its responsive target-size, export callback, and collision
  checks remain current through SC-024. The lower Diary/Plan rocker, absence of an upper workspace
  toggle, and old Plan add-action expectations are historical and MUST NOT be used as acceptance.
- **SC-021**: At `390px`, timeline has no directory, zero directory padding, top-row Search and
  Settings, and one fixed `44px+` Category icon. One activation mounts the existing narrow directory
  and reserves its width; domain navigation leaves it open; a second activation unmounts it. At
  `700/701px` the mobile/desktop boundary has no horizontal overflow, and at `1280px` neither mode
  renders a vertical directory or changes the record-stream width. Plan and temporary tool surfaces
  suppress the trigger/directory according to FR-031.
- **SC-022**: At `390px`, automated DOM and geometry evidence proves timeline has one fixed structure
  trigger and zero rail background, spine asset, directory, blank strip, or right reserve. Grouped
  Diary reveals the existing approximately `92px` rail with a restrained transition and preserves it
  after a domain jump. Plan has zero structure trigger, spine, directory, right reserve, export, and
  `.day-plan-add`; the upper workspace toggle remains reachable and the open lower dock contains no
  workspace duplicate or capsule. Diary stamp opens the record composer, Plan stamp opens the
  existing plan editor with the approved time default, and the Plan Agent remains reachable without
  colliding with the dock. The same assertions hold across `320/390/426/700/701/1280px`, with no
  horizontal overflow, focus regression, reduced-motion dependency, persistence change, or desktop
  content-width shift.
- **SC-023**: At `390px`, timeline contains zero Diary Agent surfaces and zero visible idle invitations;
  the first ordinary time target begins at least `8px` inside the shell's existing mobile padding, and
  the fixed-record ledger is centered within `1px` of the full record stream. In grouped Diary, a
  directory control whose heading is inside the directory window remains within `2px` of that heading's
  vertical center during scroll, the first offscreen heading clamps `4±1px` from the directory top, the
  window remains clear of the structure trigger and open lower action dock, and no visible idle-invitation copy is
  rendered. The same behavior creates no horizontal overflow at `320/390/426/700px` and does not alter
  the desktop layout.
- **SC-024**: At `390px`, automated DOM, computed-style, keyboard, and visual evidence proves exactly
  one workspace toggle exists in the upper tools and none exists in the lower dock. Diary shows the
  unpressed Plan icon above the unpressed/pressed record-view icon; one activation enters Plan with a
  raised `aria-pressed=true` workspace state, removes only record view and Diary export, and a second
  activation returns to Diary. The lower dock contains no Diary/Plan mode button or capsule chrome and
  keeps exactly one contextual blue stamp, which opens the correct existing editor in both modes.
  The same target, ordering, focus, reduced-motion, no-overflow, and no-lower-duplicate assertions hold
  at `320/390/426/700/701/1280px`, with localized accessible names in Chinese and English.
- **SC-025**: At `390px`, computed geometry proves the date text, `Records` heading, ordinary time
  targets and time strings, direct quick-record time target and time string, and fixed-record labels
  share one left edge within `1px`. A pre-change run MUST fail with the duplicate timeline inset and
  right-aligned long time string recorded; the corrected run MUST pass without reducing any affected
  target below `44px`, separating ordinary and quick-record content starts, or changing persistence.
  The same no-overflow and interaction behavior MUST remain valid at `320/390/426px`; wider layouts
  retain their established centered readable-width ledger. This supersedes SC-023 only for its former
  Time-view horizontal-inset assertion.
- **SC-026**: At `390px`, computed geometry for at least two grouped historical rows, including mixed
  minute/second precision when present, places every time text and the contextual quick-record time
  within `1px` of the domain heading edge. Every historical content target, quick-record input box,
  and quick-record text start share the second axis within `1px`, with zero horizontal overflow.
- **SC-027**: A pre-change `320px` run records the selected date at `18px`, Plan hour labels at
  `19.984px`, and the prior `right: 8px` positioning. After correction, computed geometry at
  `320/390/426/700px` places every Plan hour label within `1px` of the selected date, uses left text
  alignment, preserves a separate Plan content axis, and creates no horizontal overflow. The existing
  local-plan create/edit/persist/delete journey MUST continue to pass unchanged.
- **SC-028**: At `320/390/426/700/768/1280px`, computed geometry places every embedded fixed-record label,
  including the expandable Sleep label, within `1px` of its domain and category headings. The fixed
  value/input column keeps its responsive axis—`152±1px` from that shared edge below `600px` and
  `160±1px` at `600–700px`, `212±1px` at `701–800px`, and `224±1px` above `800px`—embedded rows
  remain `52px`, inputs remain at least `44px`, and horizontal overflow remains zero.
- **SC-029**: A pre-change `320px` run records a `68px` date-to-Time-heading gap, a `92px`
  date-to-Category-heading gap, zero shared frames, `20px` Time-root padding, and `24px` first-domain
  padding. After correction, `320/390/700/768/846/894px` render exactly one shared frame; Time and
  Category heading gaps differ by no more than `1px`; frame padding is `12px`; Time, Category, first
  domain, and Plan roots resolve zero top padding; desktop/tablet visible date-to-content rhythm stays
  within `20–36px`; Plan CRUD and date-disclosure journeys remain green with zero overflow.
- **SC-031**: A pre-change grouped run MUST fail because each contextual quick-record row is a direct
  child at the end of `.record-domain`. After correction, `320/390/426/700/768/1280px` DOM-order
  evidence MUST prove one row per domain, ownership by the first category, placement after its ordinary
  entries and before its periodic fields and later categories, `44px+` targets, zero horizontal
  overflow, and an unchanged saved `categoryId` equal to that first category.
- **SC-030**: At `320/390/426/700/768/1280px`, a populated Time view renders exactly one visible
  adjustment link beside `Record / 记录`, keeps its center within `2px` of the heading center, limits
  their horizontal gap to `4–16px`, and provides a `44px+` target and visible keyboard focus. Fixed
  progress headers render zero links. Activating the link, visiting `/templates`, or visiting
  `/templates?focus=periodic` reaches `/settings#record-setup`, where the complete structure tree shows
  linear and periodic templates together and periodic visibility can still be changed and read back.

## Scope Boundaries *(mandatory)*

### In Scope

- The visible home diary shell, editorial date/view identity, populated time-record reading flow,
  fixed-record presentation, existing binding rail, and ordinary composer.
- Locally bundled presentation assets required to unify those surfaces.
- One internal, replaceable Agent-appearance definition and the selected bundled default line-spirit
  asset family, isolated from Agent behavior and persisted data.
- One application-shell viewport Agent layer only in grouped Diary; mobile patrols the protected spine
  segment, desktop rests, and the existing four behavior states remain without a document-flow slot.
  Timeline keeps the Agent completely absent.
- One date-led header disclosure; one Plan-icon workspace toggle; one Diary-only structure-icon
  record-view toggle fixed below it at the mobile paper edge and kept after it in desktop upper tools;
  and one open lower action dock with the contextual blue stamp plus Diary-only export.
- One conditional secondary Today action adjacent to the date disclosure while another date is
  selected; it is not a persistent right-rail control.
- Category-view domain/category headers and adjacent-domain separators, including standalone aligned
  first-category headings and compact embedded fixed rows while retaining explicit later hierarchy.
- The ordinary composer's open/closed details composition, semantic disclosure state, compact
  metadata grouping, attachment boundary, and existing-record danger footer.
- Responsive width ownership for embedded Search/Settings workspaces and the expanded Calendar,
  using one mobile writing-plane boundary while preserving seven 44px date columns.
- Focused regression and visual evidence for the target responsive widths and states.

### Out of Scope

- New recording fields, templates, page themes, theme pickers, font pickers, or a user-facing Agent
  appearance picker/upload flow.
- Persisted or synchronized Agent preferences, user asset storage, remote avatar URLs, an appearance
  marketplace, or more than the single selected default appearance.
- Redesigning Settings, Search, or Calendar internal behavior/content; Agent behavior, Plan behavior,
  authentication, onboarding, synchronization, backup formats, import/export content, and data
  models also remain unchanged. Rework 10 changes only their responsive container ownership.
- AI-generated note content, remote fonts or imagery, audio feedback, page-turn simulation, or Agent
  motion outside the protected viewport spine segment.

## Assumptions and Dependencies

- `LN-076` is the single board item refined by this package and has no unresolved implementation
  dependency beyond the current working tree and existing quality gate.
- The product owner wants a restrained, editorial private-journal character rather than literal
  skeuomorphic leather, yellowed-paper effects, ornate borders, or multiple competing typefaces.
- Existing local hand-drawn assets may be retained, redrawn, reduced, or removed when doing so makes
  the overall system more coherent and remains compatible with offline caching.
- The product owner selected the first displayed 2026-08-29 ideation result as the exact visual
  target: a non-humanoid single-line spirit whose hand grips the existing binding and whose small
  head peeks from behind the page. The generated reference is retained locally for same-state
  comparison during implementation.
- Rework 5 supersedes Rework 3's ordinary-to-fixed activity interval: the same four Agent states and
  Plan/empty-day visibility boundary remain, but the figure now occupies a flow-free upper binding
  layer and may coexist beside rows without moving them.
- Baseline evidence is the existing set under `output/playwright/ln-076-*-baseline-390.png`.
- Rework 4 uses the product owner's marked Category screenshots, including the latest 2026-09-04
  correction, as source truth for standalone secondary headings, compact fixed rows, and the
  double-rule defect; no new visual direction is invented outside that scope.
- Rework 5 uses the product owner's three 2026-08-29 marked captures as source truth for date-first
  hierarchy, date-owned month disclosure, and removal of the Agent's blank document-flow stage. The
  three follow-up implementation captures plus the owner's first order clarification are source
  truth for date-context-relative Agent placement and one visible binding line. Rework 6's later
  owner correction remains source truth for rocker appearance, while Rework 12 supersedes its
  placement with upper Search/Settings/record-view and the lower workspace rocker.
- Rework 6 uses the product owner's cropped current-state rail captures as source truth for replacing
  the two isolated current-mode words with separate two-position rockers whose alternatives remain
  visible without changing their scope or click behavior, and for the later direct correction that
  places Diary/Plan before Time/Category.
- Rework 7 uses the product owner's 2026-08-30 composer capture as source truth for reducing the
  details-open blank band and separating optional metadata, attachments, and deletion. Existing
  fields, values, callbacks, dialog behavior, confirmation, and storage formats remain unchanged.
- Rework 8 supersedes Rework 5 only for Agent placement, empty-date visibility, and motion. Rework 5's
  date ownership, right-rail navigation, single real spine, and single ordinary-to-fixed rule remain
  current; Rework 6 rockers and Rework 7 composer disclosure are unaffected.
- Rework 10 supersedes only the earlier below-390 decision to let an opaque picker cover the full
  gutter. Tool order, picker state and keyboard behavior, the 44px target minimum, Agent visibility,
  record spacing, and every data boundary remain current.
- Rework 11 uses the product owner's direct one-click return request as sufficient evidence for one
  conditional recovery action. It does not reopen the removed Calendar rail entry or change the
  existing date-selection, swipe, workspace, record-view, or persistence contracts.
- Rework 12 supersedes Rework 6 only for workspace-rocker placement and supersedes the mobile
  icon-only export rule only for the visible same-day scope label. Rocker semantics, current-day
  export content, record/plan actions, Agent, date, account, offline, sync, and backup remain current.
- Rework 13 supersedes Rework 6 only for record-view presentation. One persistent localized Category
  label now toggles between unpressed timeline and pressed grouped view; the lower Diary/Plan rocker,
  callbacks, mode state, Plan omission, Agent, data, offline, sync, backup, and export remain current.
- Rework 14 supersedes Rework 13's visible Category label and the earlier always-mounted mobile
  directory rule. Its approved correction also supersedes Rework 12's lower two-position workspace
  rocker and separate Plan add stamp: Diary, Plan, and the shared blue stamp now form one persistent
  bottom bar, while Plan owns no right rail. It keeps the same transient `timeline | grouped` state,
  current record/plan editors, and existing callbacks. All data, offline, account, sync, backup,
  export, Agent, and quick-record persistence contracts remain current.
- The Rework 14 owner follow-up further supersedes the earlier every-Diary Agent visibility and idle
  invitation rules: timeline owns no Agent, grouped Diary keeps the interaction without visible prompt
  copy, and the grouped directory again follows chapter headings with top/bottom clamping across the
  larger safe window. It changes no Agent request, proposal, write, persistence, or data contract.
- The latest Rework 14 owner follow-up supersedes only the lower Diary/Plan portion of FR-032 and
  Decision 22. Workspace now uses the same upper single-icon pressed-state language as record view,
  while the lower dock loses its mode controls and capsule. Contextual creation, editor callbacks,
  Plan rail absence, Agent clearance, export ownership, and every data boundary remain current.
- The latest marked alignment follow-up supersedes FR-033 and SC-023 only where they required an
  additional Time-row left inset. The shell padding itself now owns the one mobile paper baseline;
  Agent absence, fixed-ledger width, grouped navigation, content-column alignment, and every data or
  interaction contract remain current.
- The owner's immediate clarification extends that same baseline to Plan hour and all-day labels.
  It supersedes only the previous alignment boundary that excluded Plan; Plan canvas/content geometry,
  behavior, data, Agent, Google context, and persistence remain current.
- The shared-top-rhythm follow-up supersedes all mode-specific and adjacent-sibling top-spacing rules
  between the shared date context and active Time, Category, or Plan content. It does not supersede
  internal record, domain-to-domain, category, fixed-row, plan-grid, safe-area, or calendar spacing.
- The latest grouped quick-record placement correction supersedes only FR-033's domain-end location.
  The row count, first-category destination, clock, focus, save, zero-write, data, and network contracts
  remain current.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-005, SC-001 | Before/after home, populated timeline, and composer captures | One coherent private-journal system; no accidental blank band |
| FR-006, SC-002 | Browser quick-record open/type/save regression | Recording step count and raw-text integrity |
| FR-007–FR-009, SC-003 | Responsive browser geometry, focus, tool-isolation, and reduced-motion checks | 44px targets; no overflow; existing behavior preserved |
| FR-010, NR-002–NR-006, SC-004 | Design check, installed/offline regression, and full quality gate | Offline/PWA and repository quality requirements |
| FR-011–FR-013, FR-021–FR-025, SC-006–SC-008, SC-011, SC-013–SC-017 | Same-state owner/implementation comparison; top/middle/bottom responsive geometry; four-state timing; calendar/reduced/background pause; empty-date no-write; hidden-surface; fixed-row rule separation; local-asset and offline tests | Viewport-resident spine companion, exactly one rail, safe patrol, deliberate ledger-rule gap, deterministic pause, no storage or quick-record regression |
| FR-014–FR-015, SC-009 | Marked 390px Category reference, responsive separate-heading and 52px fixed-row geometry, semantic heading/progress assertions, and adjacent-domain rule count | Distinct domain/category hierarchy, compact ledger rows, one boundary rule, no data or input regression |
| FR-016–FR-018, SC-010 | Six marked 390px references, responsive date/rail geometry, calendar/focus journey, localized mode-control assertions | Date-first identity, no separate Calendar rail action, one-button Category and Diary/Plan switches, no behavior/data regression |
| FR-019–FR-020, SC-012 | Closed/open-details composer screenshots plus responsive disclosure, writing-height, section-order, danger-boundary, target, focus, and exact-save assertions | Writing remains primary; optional details scan compactly; delete is safely separated; quick recording is unchanged |
| FR-026–FR-027, SC-018 | 320/360/389/390 embedded-tool and calendar computed geometry plus focused PWA-shaped screenshots | One writing-plane edge; no inherited search reserve or full-gutter calendar mask; 44px dates preserved |
| FR-028, SC-019 | Responsive Diary/Plan browser journey for off-today visibility, one-click return, picker closure, focus restoration, mode preservation, target size, payload identity, and bilingual copy | Direct one-click return-to-today feedback without a persistent rail item or data change |
| SC-005 | Product-owner comparison plus 14-day personal-use observation | Perceived quality and ritual outcome; exit decision |
| FR-029, SC-010, SC-020 | Historical Rework 12/13 evidence retained for traceability; current workspace presentation is accepted only through FR-034/SC-024 | Superseded lower-rocker expectations must not drive current implementation |
| FR-031, SC-021 | 390px timeline/grouped journeys, persistent domain jump, 700/701 boundary, 1280px width invariance, tool/calendar suppression, focus and reduced-motion checks | On-demand mobile directory without desktop width loss or new persistence |
| FR-032, SC-022 | Mobile Time/Grouped/Plan DOM and geometry counts; open lower-dock contextual-create journeys; Plan Agent collision checks; 320/390/426/700/701/1280 screenshots | No dormant right rail in Time/Plan; no lower workspace duplicate; no data or editor duplication |
| FR-033, SC-023 | Mobile Time Agent DOM count, ordinary-row inset and fixed-ledger centering; grouped heading/control scroll deltas, edge clamps, safe-window geometry, and matched owner screenshots | Quiet full-width Time reading; title-anchored grouped navigation; no visible idle prompt or data change |
| FR-034, SC-024 | Failing-then-passing upper workspace-toggle journey; bilingual pressed state, DOM/keyboard order, focus, reduced motion, lower-capsule absence, contextual editor dispatch, and 320/390/426/700/701/1280 geometry plus Time/Grouped/Plan screenshots | One reversible upper workspace switch; no redundant lower mode capsule; unchanged editors and data |
| FR-036, SC-026 | Grouped historical/quick-record computed left edges plus same-state owner comparison at 390px and responsive overflow checks | One domain-edge time axis and one authored-content axis across legacy/current times and contextual creation |
| FR-035, SC-025 | Marked 390px source plus failing-then-passing computed left-edge geometry for date, heading, ordinary/quick times, and fixed labels; LN-076/LN-080 focused regressions and responsive no-overflow checks | One basic mobile paper baseline; no duplicate Time inset or right-aligned time overflow; unchanged interaction and data |
| FR-037, SC-027 | Failing-then-passing Plan hour-label geometry at 320px; shared date/hour left edges across 320/390/426/700px; unchanged day-plan CRUD journey and Plan screenshot | Time and Plan continue one basic mobile paper edge without moving the Plan content axis or changing behavior |
| FR-038, SC-028 | Grouped fixed-label, input-axis, row-height, target, and overflow geometry at 320/390/426/700/768/1280px plus marked owner comparisons | Grouped fixed labels join the domain/category edge at every supported width without moving values or changing writes |
| FR-039, SC-029 | Failing-then-passing shared-frame geometry at 320/390/700/768/846/894px; normalized Time/Category screenshot comparisons; unchanged date-disclosure and Plan CRUD journeys | One date-owned top rhythm; no stacked view-specific gap, desktop blank band, overflow, or behavior change |
| FR-041, SC-031 | Failing-then-passing grouped DOM-order, target, overflow, and saved-category assertions plus the marked/current 390px comparison | Creation remains adjacent to the first-category record stream instead of being separated by periodic fields or later categories |
| FR-040, SC-030 | Responsive Record-heading/action geometry, fixed-header link count, canonical-route assertions, full-tree visibility, periodic `homeVisible` round-trip, and same-viewport screenshot comparison | One structure-management entry and one canonical editor without removing fixed-record behavior or data |
