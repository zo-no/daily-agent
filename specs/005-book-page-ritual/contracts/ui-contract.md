# UI Contract: Book-page Ritual

## Home journal shell

- The home remains one continuous paper surface and keeps one primary job: recording.
- The mobile writing column ends before the existing binding axis; the right gutter may change tone
  and depth but must not change control coordinates, hit areas, or keyboard order.
- Embedded Search and Settings end `8px` before the visible binding brush at `320–700px`; they do not
  inherit the ordinary record stream's larger Agent reserve.
- The selected date/weekday is the leftmost and strongest page identity and is itself the one month-
  disclosure control. No separate Calendar action exists in the mobile rail.
- When another date is selected, one secondary localized `Today / 今天` action appears beside that
  identity; it is absent on today. One activation selects local today, closes an open picker, returns
  focus to the date disclosure, and preserves Diary/Plan plus Time/Category state. It remains at
  least 44px and never becomes a right-rail item or data write.
- Diary exposes Search, Settings, one Plan-icon workspace toggle, then one structure-icon record-view
  toggle. Plan omits only record view. Each toggle uses one persistent icon: Diary/timeline are
  unpressed, while Plan/grouped use `aria-pressed=true`, a raised paper surface, and ink/border/shadow
  feedback that does not rely on color alone. Both controls are at least 44px, localized accessible
  names describe the reverse action, and DOM, visual, and keyboard order match. Mobile fixes workspace
  above record view on one upper-right axis; desktop keeps the same order inline.
- The lower action dock contains no Diary/Plan control, visible mode label, rocker, capsule boundary,
  or inset surface. The existing blue record stamp opens the current record editor in Diary and the
  current plan editor in Plan. Diary keeps visible `Export today / 导出今日日记` to the stamp's left;
  Plan hides export and has no separate add-plan button.
- The content directory begins at least 24px below the complete upper tool stack. If nearby section
  targets share that edge, 44px nodes keep document order and the
  existing 12px gap instead of overlapping or swapping.
- The first meaningful content begins after one owned section gap; decorative filler is forbidden.

### Rework 14 record-view trigger and responsive directory

- The Diary record-view control is the existing structure icon with a localized
  `Switch to Category / Switch to Time` accessible name, `aria-pressed`, visible focus, and a real
  target of at least `44px`; it has no visible Category text.
- At `320–700px`, Search and Settings remain a horizontal top-header pair. The Category trigger is
  independently fixed on the upper-right axis. Timeline renders no binding-gutter background, brush
  asset, domain directory, blank strip, or directory reserve. Grouped view mounts the existing
  approximately `92px` rail and reserves its existing `82px` content inset until the same trigger
  returns to timeline. Domain jumps do not close it. The rail enters with a restrained approximately
  `160ms` width/translation/opacity transition; reduced motion resolves immediately.
- Search, Settings, and Calendar temporarily unmount the directory without changing grouped state;
  closing them restores it. Plan renders no trigger, binding surface, brush, directory, or right
  reserve.
- At `701px+`, the trigger remains in the header tools. Neither mode mounts a vertical directory or
  changes the record-stream width.

### Upper workspace toggle and open lower action dock

- The workspace toggle remains in the upper tools in both Diary and Plan and keeps its position,
  dimensions, focus treatment, and callback. Its pressed state alone changes with workspace mode.
- The shared stamp always uses `/ui/diary/record-stamp.png`. Diary activation opens the existing
  record composer. Plan activation opens the existing `PlanEditor`; today begins at current local time
  and another selected date begins at `09:00`, then saves through the unchanged plan callback.
- `.day-plan-add` is not rendered. Clicking the time grid and editing existing plans remain unchanged.
  Plan Agent remains in the Plan content layer and clears the open lower action dock.

### Rework 14 owner follow-up

- Mobile Time mounts no `.diary-agent-viewport` and no visible idle-invitation copy. Ordinary timeline
  rows, their visible time strings, and the direct quick-record time use the shell's basic left edge;
  neither the timeline list nor quick row adds an extra outer inset. At `320–426px`, fixed-record labels
  join that edge; the ledger still uses the full record-stream width and wider layouts keep its centered
  readable width. This horizontal rule supersedes the earlier `8px` Time-row inset.
- Grouped Diary may mount the existing Agent, but renders no visible idle invitation. A directory
  domain control follows the center of its matching `[data-rail-anchor]` while that heading is inside
  the directory window. If the active domain also exposes insights, the domain control remains the
  alignment point and the insights action extends below it.
- Offscreen headings clamp in document order with `4px` edge padding and the existing inter-item gap.
  The mobile directory uses the safe vertical segment below the complete mode-control stack and above
  the open lower action dock; reduced motion removes repositioning transitions.

## Authored record stream

- Original note text remains 16px full-ink Instrument Sans with current Markdown semantics.
- Time stays secondary Mono metadata and the short dash remains local to each record row. In Time
  view, all ordinary rows and the direct quick-add row share one time-column edge and one content
  start; the input's text begins with authored record text rather than creating a third column.
- In grouped Category, each visible `.record-domain` owns exactly one quick-add row inside its first
  `.record-category`. The row follows that category's ordinary entries and precedes its periodic
  fields and every later category. It retains the same second-precision, focus, Escape, and save
  behavior, and saves to that first category without presenting another classification choice.
- Grouped historical and contextual-create rows use one `64px` time track from the domain heading's
  left edge. Legacy `HH:mm`, current `HH:mm:ss`, and the ticking quick time are left-aligned there;
  historical content, the quick input box, and its editable text begin together on the next edge.
- Rows and fixed records remain open-paper content, not raised cards.
- In grouped Diary at mobile widths, the Diary Agent uses the selected single-line graphite spirit in every existing
  session state. `idle`, `scanning`, `reviewing`, and `complete` each resolve a distinct local pose;
  the appearance stays visible and the button keeps its accessible name and at least 44px hit area.
- The Diary page mounts an appearance renderer rather than hard-coding the character asset. A
  missing or unknown internal appearance ID resolves to the bundled default. Appearance rendering
  must not own or change wake, stop, scanning, review, completion, or write behavior.
- The Agent is a direct application-shell viewport layer and contributes no document-flow height.
  Grouped Diary shows it; Time, Plan, Search, Settings, and composer surfaces hide it. Mobile
  `320–700px` patrols only between the upper tools and lower actions, while desktop is a still peek.
  Calendar open uses a compact paused pose outside every date target.
- Each state resolves `staticAsset`, `motionAsset`, `intrinsicSize`, and `motionMode`, with `asset`
  preserved as the static compatibility alias. Character artwork contains no full-height spine
  stroke; the page rail is the only visible binding line.
- Idle/scanning/reviewing use distinct slow 28/20/32-second grip-and-pause travel rhythms, reviewing
  uses a reduced range, and complete settles into a 30-second return patrol. Focus, press, document
  hiding, calendar, and reduced motion freeze travel
  without separating the visible artwork from its button.
- On an empty grouped Diary date, activation shows only the localized 4.5-second margin note. It dismisses on
  timeout, second activation, Escape, date or surface change, and cannot start analysis or write.
- The application-shell Agent renders no visible tap-to-analyze invitation in any state. Its button
  keeps a localized accessible name without adding copy, a second hit target, or flow height.
- The last ordinary record owns the only horizontal transition into fixed records; the fixed section
  contributes no additional top rule or spacer.
- Agent review remains a visibly secondary margin note. The viewport companion may attend from the
  protected spine but never overlays or replaces authored text.

## Category journal hierarchy

- Category view renders the domain heading on its own line. Every visible category, including the
  first, keeps an explicit standalone secondary heading and any completion ratio on the next
  category-owned line. Existing heading IDs/data and accessibility relationships remain unchanged.
- Every category heading uses regular weight and shares the domain heading's left edge; its records or
  metrics retain one restrained inset. Embedded fixed rows use a `52px` rhythm while inputs and row
  actions retain at least `44px` targets.
- A domain boundary owns at most one visible full-width rule. The final record/metric row may keep its
  weak hand-drawn divider; the following domain must then begin through 24–32px section whitespace
  without another top rule.
- Periodic prompts, values, inline expansion, focus, and save behavior remain unchanged.

## Ordinary composer

- The existing record action opens the composer in one action.
- Close and Done retain accessible names, 44px targets, keyboard behavior, and visible focus.
- The textarea is the dominant visible area; template/format/More/details remain optional.
- Done saves a normal typed note in one further action, preserving text exactly.
- The mobile surface may read as a page leaf but remains the same dialog/focus contract.
- More is one disclosure button with programmatic expanded state and a stable controlled region.
- Closed mode keeps the writing leaf visually dominant. Expanded mode keeps a usable writing area
  above one compact metadata ledger; it must not retain a dominant accidental blank band.
- Date/time, category/tags, and attachments remain optional and preserve their existing values and
  callbacks. Attachments receive their own weak section boundary rather than becoming another card.
- Delete appears only for an existing record and sits in a separated danger footer after routine
  details; its existing confirmation and deletion behavior do not change.

## Responsive and motion boundary

- 320, 390, 426, 768, and 1280px have no horizontal overflow or essential action collision.
- Long localized date, note, tag, and placeholder content must wrap or clip only where an existing
  semantic truncation contract already exists.
- All affected interactive targets remain at least 44px.
- Below 390px, the expanded calendar's first date row clears the complete taller rocker/tool stack.
  Its paper uses the normal 8px pre-brush writing edge whenever seven 44px columns fit; otherwise it
  expands only to that seven-column minimum. At 360px this permits no more than 8px past the binding
  axis, and at 320px only the same minimum-grid overlap is allowed. It never stretches merely to mask
  the full gutter. At wider mobile widths the existing 8–12px rail clearance remains sufficient.
- Reduced motion shows final focus/open/state feedback without traversal and freezes each Agent state
  at a deterministic safe spine position with no document-flow height.

## Offline and data boundary

- Fonts, texture, lines, focus loop, rail, and action imagery must be local application assets.
- No presentation state enters local account data, the cloud document, IndexedDB, logs, exports, or
  backups.
- No user-facing appearance selection, remote avatar URL, upload, or stored preference exists in
  this release.

## Mobile Time and Plan base alignment

- At `320–700px`, the shell's mobile inline padding owns the date, `Records`, and ordinary/direct
  quick-record time left edge. At `320–426px`, fixed labels share that edge within `1px`; wider fixed
  ledgers retain their centered readable width.
- Time strings are left-aligned. The Time list and direct quick-record row add no second outer inset;
  longer `HH:mm:ss` values must not escape left of the shared paper edge.
- Ordinary content and quick-record input text keep one shared content start. Target sizes, inline/time
  editors, Grouped callbacks, persistence, and account data do not change.
- At `320–700px` in Plan, the selected date, every hour label, and the optional all-day label share
  the shell's current left edge within `1px` and use left text alignment. The `64px` canvas/content
  axis, empty guidance, blocks, independent scrolling, editor callbacks, Agent, and Google context do
  not change.
- In grouped Diary at every supported width, embedded fixed-record labels and expandable labels share the
  domain/category heading edge. Their label track absorbs the removed `24px` outer inset, so the
  value/input and chevron axes remain fixed.

## Shared date-to-content frame

- One `HomeDateContentFrame` contains the existing date context and whichever Time, Category, or Plan
  surface is active. The wrapper is private presentation structure, not a route, state, or data contract.
- With the month picker collapsed, the frame alone contributes `12px` above active content. With the
  picker expanded, it contributes `0`; Escape and focus restoration remain owned by the same date context.
- `.timeline`, `.grouped-view`, the first `.record-domain`, and `.calendar-view.day-mode` resolve zero
  top margin/padding. No breakpoint or mode-specific adjacent selector may recreate that first gap.
- Desktop and `701–800px` topbars use a `64px` minimum height. Existing `700px`-and-below safe-area
  heights and upper-tool clearance remain unchanged.
- Internal record/domain/category/fixed-row/plan-grid spacing, controls, callbacks, records, plans,
  Agent, account, offline, sync, export, and backup contracts do not change.

## Record-structure entry and route ownership

- A populated Time view renders one `Adjust / 调整` action in the same heading cluster as
  `Record / 记录`; it targets `/settings#record-setup`, exposes the localized editor name, remains
  keyboard focusable, and keeps a `44px+` target.
- Fixed-record progress headers contain progress only. They do not own a second setup link.
- `/settings#record-setup` renders the complete Domain → Category → Template tree for linear and
  periodic templates. No query parameter filters the editor into a fixed-record-only page.
- `/templates` and retired `focus=periodic` URLs are compatibility inputs only and canonicalize to the
  complete editor. Periodic schedules, homepage visibility, inline filling, and stored data are unchanged.
