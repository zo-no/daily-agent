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
- Diary exposes Search, Settings, and one localized `Category / 分类` toggle in the upper rail. Its
  unpressed state is timeline and its pressed state is grouped Category; `aria-pressed`, a raised
  paper surface, and ink express the active state without color alone. Plan exposes only Search and
  Settings there. One localized Diary/Plan rocker lives in the lower quick dock in both modes and
  continues to show both labels with a raised thumb whose position identifies the current mode.
  Both controls are at least 44px, visual and keyboard order match, labels do not truncate in Chinese
  or English, and no upper Diary/Plan duplicate remains.
- Diary's lower action row places visible `Export today / 导出今日日记` copy to the left of the blue
  record stamp. Both actions are at least 44px and keep their existing behavior. Plan hides both
  Diary-only actions, retains the lower workspace rocker, and keeps the existing add-plan action.
- The content directory begins at least 24px below the complete upper tool stack. If nearby section
  targets share that edge, 44px nodes keep document order and the
  existing 12px gap instead of overlapping or swapping.
- The first meaningful content begins after one owned section gap; decorative filler is forbidden.

## Authored record stream

- Original note text remains 16px full-ink Instrument Sans with current Markdown semantics.
- Time stays secondary Mono metadata and the short dash remains local to each record row.
- Rows and fixed records remain open-paper content, not raised cards.
- At mobile widths, the Diary Agent uses the selected single-line graphite spirit in every existing
  session state. `idle`, `scanning`, `reviewing`, and `complete` each resolve a distinct local pose;
  the appearance stays visible and the button keeps its accessible name and at least 44px hit area.
- The Diary page mounts an appearance renderer rather than hard-coding the character asset. A
  missing or unknown internal appearance ID resolves to the bundled default. Appearance rendering
  must not own or change wake, stop, scanning, review, completion, or write behavior.
- The Agent is a direct application-shell viewport layer and contributes no document-flow height.
  Every Diary date shows it; Plan, Search, Settings, and composer surfaces hide it. Mobile
  `320–700px` patrols only between the upper tools and lower actions, while desktop is a still peek.
  Calendar open uses a compact paused pose outside every date target.
- Each state resolves `staticAsset`, `motionAsset`, `intrinsicSize`, and `motionMode`, with `asset`
  preserved as the static compatibility alias. Character artwork contains no full-height spine
  stroke; the page rail is the only visible binding line.
- Idle/scanning/reviewing use distinct slow 28/20/32-second grip-and-pause travel rhythms, reviewing
  uses a reduced range, and complete settles into a 30-second return patrol. Focus, press, document
  hiding, calendar, and reduced motion freeze travel
  without separating the visible artwork from its button.
- On an empty Diary date, activation shows only the localized 4.5-second margin note. It dismisses on
  timeout, second activation, Escape, date or surface change, and cannot start analysis or write.
- A populated idle Diary shows one localized two-line tap-to-analyze hint directly below the figure.
  It travels with the same safe-track companion, adds no hit target or flow height, and is absent on
  empty dates, Calendar, scanning, reviewing, and complete.
- The last ordinary record owns the only horizontal transition into fixed records; the fixed section
  contributes no additional top rule or spacer.
- Agent review remains a visibly secondary margin note. The viewport companion may attend from the
  protected spine but never overlays or replaces authored text.

## Category journal chapters

- Category view renders each domain heading, its first visible category heading, and any periodic
  completion ratio as one compact editorial chapter line. Domain and category remain separate
  headings in the accessibility tree and keep their existing IDs/data.
- When a domain owns more than one visible category, every later category keeps its own explicit
  subordinate heading and progress, so compacting the chapter opening never hides real hierarchy.
- A domain boundary owns at most one visible full-width rule. The final record/metric row may keep its
  weak hand-drawn divider; the following domain must then begin through 24–32px section whitespace
  without another top rule.
- Periodic rows, prompts, values, inline expansion, focus, and save behavior remain unchanged.

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
