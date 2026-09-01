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
- The record-view rail toggle must expose the current/next Time or Category meaning without relying
  on color alone. Both labels must remain visible inside one two-position rocker, and the control
  must not appear as a Diary view control while Plan is active.
- The workspace rail toggle must expose the current/next Diary or Plan meaning without relying on
  color alone. Both labels must remain visible inside one two-position rocker, it must remain
  available in both workspaces, and it must have no duplicate lower-page instance.
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
  layout spacing; section whitespace MUST communicate a specific boundary or available writing area.
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
- **FR-009**: Search, Calendar, Settings, Diary/Plan, Agent, export, fixed-record adjustment, and
  ordinary record actions MUST retain their existing meaning, reachability, and state transitions.
- **FR-010**: All visual resources required by the treatment MUST remain available on an already
  authenticated offline device and in the installed application.
- **FR-011**: Every Diary date MUST expose the selected graphite line-spirit appearance for
  `idle`, `scanning`, `reviewing`, and `complete`, including dates without ordinary records. The
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
- **FR-014**: In Category view, each domain MUST present its domain heading, first visible category,
  and any periodic completion ratio as one compact editorial chapter line while preserving separate
  heading semantics and the complete `Domain → Category` reading order. Any later visible categories
  MUST continue as explicit subordinate headings.
- **FR-015**: A transition between Category-view domains MUST use at most one visible weak rule. The
  previous row's divider MAY close its group, but the next domain MUST then rely on deliberate section
  whitespace rather than drawing a second equal-weight top rule.
- **FR-016**: The selected diary date MUST be the leftmost and visually strongest home-page title.
  Date and weekday MUST form one disclosure control that opens/closes the existing month picker,
  preserves the same date identity DOM while expanded, supports Escape and focus return, and removes
  the separate Calendar action from the right rail.
- **FR-017**: In Diary, the upper right tool lane MUST contain Search, Settings, and one
  single-button Time/Category rocker in that order. In Plan, the same lane MUST contain only Search
  and Settings. The single Diary/Plan rocker MUST live in the lower quick-action dock in both modes.
  Each rocker MUST show both localized mode labels at once, keep the whole control at least
  `44px`, change its existing mode in one action, and expose the current mode through thumb position,
  raised surface, and ink rather than color alone. Labels MUST remain untruncated in Chinese and
  English. The selected date MUST be preserved, and no duplicate Diary/Plan control may remain in the
  upper tool lane.
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
- **FR-021**: At `320–700px`, the Agent MUST patrol only the viewport-safe segment between the upper
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
- **FR-022**: On an empty Diary date, activating the Agent MUST show the localized temporary margin
  note for today or another date, make no analysis request and no data write, and dismiss after 4.5
  seconds, a second activation, Escape, date change, or leaving Diary. Existing populated-date wake,
  stop, review, and explicit-write behavior MUST remain unchanged.
- **FR-023**: The Agent viewport layer MUST render only in Diary. Plan, Search, Settings, and the
  ordinary composer MUST hide it; returning to Diary MUST restore the appropriate current pose.
- **FR-024**: A populated Diary in `idle` MUST show the localized tap-to-analyze hint directly below
  the Agent artwork. The hint MUST travel inside the same viewport-safe segment, remain subordinate
  to authored text, and contribute no document-flow height or new hit target. Empty dates, Calendar,
  `scanning`, `reviewing`, and `complete` MUST hide the invitation.
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
- **FR-029**: Diary's upper tool lane MUST contain Search, Settings, and the Diary-only
  Time/Category rocker in that order, without a workspace rocker. The single Diary/Plan rocker MUST
  live in the lower quick-action dock in both Diary and Plan, remain at least `44px`, keep both
  localized labels visible, and preserve its existing one-action callback and state.
- **FR-030**: In Diary, the lower action row MUST place one visible localized
  `Export today / 导出今日日记` action to the left of the existing blue record action. The controls
  MUST align horizontally, remain at least `44px`, and retain their current export/open behaviors.
  Plan MUST hide both Diary-only actions, keep the lower workspace rocker, and retain its existing
  contextual add-plan action without collision or duplicate workspace controls.

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
- **SC-009**: At 320, 390, 426, 768, and 1280px, each domain exposes distinct domain and first-category
  headings plus an accessible progress label on one compact line or a safe wrapped continuation,
  later categories remain explicit, all affected inputs retain at least 44px targets, and automated
  geometry finds no pair of consecutive full-width rules at an adjacent-domain boundary.
- **SC-010**: At 320, 390, 426, 768, and 1280px, automated and visual evidence shows exactly one
  primary date disclosure, zero separate Calendar rail buttons, upper Diary order Search → Settings
  → Time/Category, upper Plan order Search → Settings, and exactly one lower Diary/Plan rocker. Both
  localized labels remain visible and untruncated in each rocker, exactly one current option is
  expressed by position and raised surface, targets remain at least 44px, one-action Time/Category
  and Diary/Plan switching works, no upper workspace duplicate exists, and the existing calendar
  open/select/Escape/focus-return journey
  completing without overflow or collision. At widths below 390px, the first date row MUST clear the
  complete taller tool stack; when the directory is present, its window MUST begin at least 24px
  below the complete upper tool stack and preserve ordered 44px nodes with the existing 12px gap.
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
- **SC-015**: Visibility checks prove Diary shows the Agent on populated and empty dates while Plan,
  Search, Settings, and the composer do not; returning to Diary restores it without a network request.
- **SC-016**: At every target width, a populated idle Diary renders the exact localized hint below
  the artwork and keeps it inside the viewport-safe track; empty, Calendar, scanning, reviewing, and
  complete states render no idle invitation.
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
- **SC-020**: At `320`, `390`, `426`, `768`, and `1280px`, automated and visual evidence proves one
  lower Diary/Plan rocker, no upper duplicate, an upper Diary order of Search → Settings →
  Time/Category, and a horizontal labeled export/record row. The same journey proves Plan keeps only
  Search/Settings above and the lower workspace rocker beside its unchanged add-plan context; all
  affected targets remain at least `44px`, mode and export callbacks still work, and no content,
  Agent, or viewport collision appears.

## Scope Boundaries *(mandatory)*

### In Scope

- The visible home diary shell, editorial date/view identity, populated time-record reading flow,
  fixed-record presentation, existing binding rail, and ordinary composer.
- Locally bundled presentation assets required to unify those surfaces.
- One internal, replaceable Agent-appearance definition and the selected bundled default line-spirit
  asset family, isolated from Agent behavior and persisted data.
- One application-shell viewport Agent layer on every Diary date; mobile patrols the protected spine
  segment, desktop rests, and the existing four behavior states remain without a document-flow slot.
- One date-led header disclosure, one Diary-only dual-label record-view rocker in the upper tools,
  and one shared dual-label Diary/Plan rocker in the lower quick dock.
- One conditional secondary Today action adjacent to the date disclosure while another date is
  selected; it is not a persistent right-rail control.
- Category-view chapter headers and adjacent-domain separators, including responsive wrapping for
  the domain/first-category line while retaining explicit later-category hierarchy.
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
- Rework 4 uses the product owner's 2026-08-29 marked Category screenshot as the source truth for the
  named hierarchy and double-rule defects; no new visual direction is invented outside that scope.
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

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-005, SC-001 | Before/after home, populated timeline, and composer captures | One coherent private-journal system; no accidental blank band |
| FR-006, SC-002 | Browser quick-record open/type/save regression | Recording step count and raw-text integrity |
| FR-007–FR-009, SC-003 | Responsive browser geometry, focus, tool-isolation, and reduced-motion checks | 44px targets; no overflow; existing behavior preserved |
| FR-010, NR-002–NR-006, SC-004 | Design check, installed/offline regression, and full quality gate | Offline/PWA and repository quality requirements |
| FR-011–FR-013, FR-021–FR-025, SC-006–SC-008, SC-011, SC-013–SC-017 | Same-state owner/implementation comparison; top/middle/bottom responsive geometry; four-state timing; calendar/reduced/background pause; empty-date no-write; hidden-surface; fixed-row rule separation; local-asset and offline tests | Viewport-resident spine companion, exactly one rail, safe patrol, deliberate ledger-rule gap, deterministic pause, no storage or quick-record regression |
| FR-014–FR-015, SC-009 | Marked 390px Category reference, responsive compact-heading geometry, semantic heading/progress assertions, and adjacent-domain rule count | Compact domain/first-category clarity, explicit later categories, one boundary rule, no data or input regression |
| FR-016–FR-018, SC-010 | Six marked 390px references, responsive date/rail geometry, calendar/focus journey, localized rocker assertions | Date-first identity, no separate Calendar rail action, one-button Time/Category and Diary/Plan switches, no behavior/data regression |
| FR-019–FR-020, SC-012 | Closed/open-details composer screenshots plus responsive disclosure, writing-height, section-order, danger-boundary, target, focus, and exact-save assertions | Writing remains primary; optional details scan compactly; delete is safely separated; quick recording is unchanged |
| FR-026–FR-027, SC-018 | 320/360/389/390 embedded-tool and calendar computed geometry plus focused PWA-shaped screenshots | One writing-plane edge; no inherited search reserve or full-gutter calendar mask; 44px dates preserved |
| FR-028, SC-019 | Responsive Diary/Plan browser journey for off-today visibility, one-click return, picker closure, focus restoration, mode preservation, target size, payload identity, and bilingual copy | Direct one-click return-to-today feedback without a persistent rail item or data change |
| SC-005 | Product-owner comparison plus 14-day personal-use observation | Perceived quality and ritual outcome; exit decision |
