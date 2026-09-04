# Research: Book-page Ritual

## Decision 1: Use restrained archival material, not literal antiquing

- **Decision**: Build the mood from warm paper, charcoal text, deep blue ink, editorial typography,
  binding depth, and owned whitespace. Avoid yellow stains, leather textures, ornate borders,
  multiple script fonts, or simulated damage.
- **Rationale**: The user asked for quality, vintage-book character, and ritual. Material restraint
  supports long-form daily use and preserves the existing quiet-product invariant.
- **Alternatives considered**: Heavy skeuomorphic book covers and distressed parchment were rejected
  as visually loud, harder to read, and likely to date quickly.

## Decision 2: Treat the right rail as a binding gutter

- **Decision**: Keep the existing rail axis and controls, but give the narrow right lane a subtle
  page-edge tone and inset depth so the brush line has a material role.
- **Rationale**: The current baseline contains a structurally useful rail, yet its isolated line can
  read as arbitrary decoration. A gutter makes the same geometry explain the book metaphor without
  adding controls.
- **Alternatives considered**: Removing the rail would discard validated navigation; adding literal
  rings or holes would add repeated ornament and compete with the tools.

## Decision 3: Preserve two-typeface hierarchy and authored-note primacy

- **Decision**: Retain Instrument Serif/Songti for editorial titles, Instrument Sans for authored
  note text and controls, and IBM Plex Mono for time/progress metadata.
- **Rationale**: This respects the established record-versus-Agent hierarchy, supports Chinese and
  English, and avoids using typography as decoration.
- **Alternatives considered**: Switching all note text to Serif would undermine a previously
  accepted hierarchy; adding a script face would exceed the two-typeface system and impair scanning.

## Decision 4: Remove accidental space through rhythm, not filler

- **Decision**: Tighten the first content boundary and section transitions so every large gap denotes
  a real section or writing interval. Do not add an empty-state sentence, quote, ornament, or hero.
- **Rationale**: The baseline's blank bands weaken perceived craft. Filler would add noise without
  improving the core loop.
- **Alternatives considered**: Decorative quotes, daily prompts, and counts were rejected because
  they add permanent home-page content and compete with quick recording.

## Decision 5: Make the composer a page leaf while preserving the sheet contract

- **Decision**: Keep the current dialog semantics, focus trap, and bottom-sheet entrance; revise its
  surface material, corner language, header, writing area, and action styling to read as a leaf
  lifted from the same journal.
- **Rationale**: This changes the recording moment without changing opening, typing, optional
  details, or saving behavior.
- **Alternatives considered**: Full-page route navigation and a page-turn animation were rejected as
  behavior changes that add transition cost and complicate focus, offline, and mobile testing.

## Decision 6: Use state-explaining motion only

- **Decision**: Keep short entrance, focus, and press transitions; add no ambient or decorative
  motion, and preserve reduced-motion final states.
- **Rationale**: Ritual comes from continuity and feedback, not animation volume. This matches the
  formal motion standard and keeps typing responsive.
- **Alternatives considered**: Grain animation, parallax, page curl, and ink-spread effects were
  rejected as ornamental and potentially distracting.

## Decision 7: Make acceptance both geometric and perceptual

- **Decision**: Automate steps, overflow, targets, asset locality, geometry, focus, and motion; use
  side-by-side screenshots and a 14-day owner observation for perceived quality and sustained ritual.
- **Rationale**: Automated evidence cannot truthfully prove that a visual direction feels premium,
  while subjective review cannot reliably protect interaction contracts.
- **Alternatives considered**: Screenshot-only acceptance was rejected as insufficient for behavior;
  automated-only acceptance was rejected as incapable of proving the user's stated outcome.

## Decision 8: Separate Agent appearance from Agent behavior without shipping customization

- **Decision**: Resolve the selected graphite line spirit through one static, replaceable appearance
  definition with local assets and bounded visual states. The page passes the existing Agent status
  into a presentation-only renderer; unknown appearance IDs fall back to the bundled default.
- **Rationale**: The product owner selected a non-humanoid line spirit and explicitly asked that a
  future custom Agent image not require another page-level rewrite. A narrow appearance seam supports
  that future without creating a settings feature, data migration, remote media boundary, or backup
  contract today.
- **Alternatives considered**: Replacing the hard-coded image URL in place was rejected because the
  page would still own character details. A persisted appearance preference, upload flow, remote URL,
  theme system, or marketplace was rejected as speculative scope with new privacy, offline, account,
  recovery, and product-admission work.

## Decision 9: Make the blank paper interval a persistent multi-state Agent stage

- **Decision**: Keep the line spirit visible for `idle`, `scanning`, `reviewing`, and `complete`, with
  one distinct local pose per state. The deliberate interval between ordinary and fixed records plus
  its adjacent binding gutter is the only movement territory; reduced motion uses static positions.
- **Rationale**: Product-owner screenshots show that hiding the Agent during review breaks character
  continuity and that the large interval reads as dead whitespace. Assigning that space a specific
  Agent function preserves note primacy while making the companion feel resident in the book.
- **Alternatives considered**: Collapsing the interval during review was rejected because it removes
  the Agent and contradicts the stated territory. A viewport-global floating avatar was rejected
  because it could cover authored content and controls. Canvas/vector procedural animation was
  rejected in favor of local raster poses and CSS-only bounded presentation, preserving offline use
  and the replaceable appearance contract.
- **Supersession**: This narrows Decision 6's ambient-motion prohibition only for the bounded Agent
  stage requested by the product owner; grain, parallax, page curl, and unrelated decorative motion
  remain prohibited.

## Decision 10: Treat domain openings as compact chapters, not stacked modules

- **Decision**: In Category view, place a domain's first visible category and progress on the same
  editorial heading line as the domain, with safe wrapping for long names. Keep each later category
  as a separate subordinate heading. Remove the next domain's redundant top rule and let the last row
  divider plus 24–32px whitespace express the transition.
- **Rationale**: The marked 390px evidence shows that two stacked headings overstate a shallow branch
  and make repeated names feel like a settings form. The two adjacent rules also assign two visual
  boundaries to one relationship. A compact chapter line preserves structure while matching the
  journal's reading rhythm and reducing decorative noise.
- **Alternatives considered**: Hiding the category name was rejected because Category view must keep
  the full hierarchy. Merging domain/category data or renaming built-ins was rejected as a data and
  export change. Retaining both rules with different colors or lengths was rejected because the
  second rule still has no independent semantic job.

## Decision 11: Let date own the header and let the Agent share the binding lane

- **Decision**: Make the date/weekday the single primary left header and its own month-disclosure
  trigger. Replace the redundant rail Calendar action with one localized Time/Category toggle between
  Search and Settings. Move the existing four-state Agent presentation to a zero-height upper
  binding layer so ordinary and fixed content keep normal proximity while the figure remains visible
  beside the page edge.
- **Rationale**: The latest marked captures show that the earlier dedicated stage gave the Agent
  space at the cost of the journal's reading rhythm. The date is the stable identity shared by Time,
  Category, and Plan; making it primary removes header competition. Calendar already belongs to the
  date, while record view is the missing high-frequency rail control.
- **Alternatives considered**: Keeping a shorter Agent spacer was rejected because any empty block
  still moves unrelated content. A global draggable avatar was rejected for collision and complexity.
  Keeping both the date disclosure and Calendar rail button was rejected as duplicate entry points.
  A two-button Time/Category segment in the narrow rail was rejected because the owner asked for one
  switch button and two 44px targets would recreate vertical tool weight.
- **Supersession**: This replaces Decision 9's dedicated ordinary-to-fixed activity territory only.
  Decision 8's local appearance seam, the four distinct assets, state behavior, Plan/empty-day
  isolation, and reduced-motion requirement remain current.

## Decision 12: Anchor Agent after date context and unify workspace navigation

- **Decision**: Compose the zero-height Diary Agent mount after the shared date context instead of
  fixing it to a viewport `top`. Align or occlude the idle/complete asset's vertical stroke on the
  existing binding axis. Move Diary/Plan into the upper rail as one 44px current-mode toggle, ordered
  after Settings and the Diary-only record-view toggle; remove its lower duplicate. The owner later
  clarified the then-current order as Search → Settings → record view → workspace; Decision 16
  supersedes only the two rockers' relative position.
- **Rationale**: Current captures prove that a viewport coordinate ignores the expanded month grid,
  and that two nearby vertical strokes look like a positioning error rather than one character
  emerging from the book. The last ordinary row already owns the horizontal transition, so a fixed
  section top rule creates the same double-boundary defect on the reading axis. Workspace mode is
  navigation of the same scope as record view, not a
  bottom action; grouping both with Search and Settings improves proximity and removes duplication.
- **Alternatives considered**: Hiding Agent while the calendar is open was rejected because it breaks
  the persistent-character contract. Keeping a fixed position with a larger hard-coded `top` was
  rejected because calendar height and viewport size vary. Editing away the binding stroke from only
  one pose was rejected because the selected character identity depends on merging into the spine;
  optical alignment preserves that identity. A two-button Diary/Plan segment in the narrow rail was
  rejected because two 44px rows repeat labels and add weight where one reversible toggle suffices.

## Decision 13: Keep one button per scope, but show both modes inside a rocker

- **Decision**: Retain the record-view and workspace controls as two independent buttons, while each
  button continuously displays its two localized alternatives. A raised paper thumb moves between
  the labels; its position, surface, and ink identify the current mode. Mobile uses a vertical rocker
  within the binding gutter, while desktop may use the same contract horizontally.
- **Rationale**: The product owner's current-state capture shows that isolated “分类” and “日记”
  labels read as destinations rather than reversible controls. Showing both alternatives improves
  discoverability without restoring two separate 44px buttons per mode pair or adding another
  navigation level.
- **Alternatives considered**: A four-state combined selector was rejected because record view and
  workspace are different scopes and Plan intentionally has no Time/Category choice. Two independent
  option buttons per pair were rejected because they would double focus stops and vertical weight.
  A generic platform switch with unlabeled ends was rejected because it would hide meaning and clash
  with the archival paper system.
- **Supersession**: This replaces only Decisions 11–12's single-current-label presentation. Their
  single-button behavior, Plan omission, date ownership, Agent placement, and data boundaries remain
  current; Decision 16 owns the later rail-order correction.

## Decision 14: Treat expanded composer details as a ledger beneath the writing leaf

- **Decision**: Keep the closed composer as a generous writing leaf. When `More` opens, bound the
  writing region and place existing metadata, attachments, and deletion beneath it in three levels:
  compact metadata ledger, secondary attachment section, separated danger footer. Expose the
  disclosure state and controlled region semantically.
- **Rationale**: The supplied mobile capture shows that the current flex/min-height combination
  preserves nearly the full blank writing leaf while also appending a long generic form. This makes
  optional information feel detached and pushes destructive action into the same hierarchy as
  routine fields. A bounded writing area preserves authorship without hiding the information the
  user explicitly requested by opening `More`.
- **Alternatives considered**: Replacing the composer with a multi-step editor was rejected because
  it adds navigation and threatens one-action save. Turning every field into an independent card was
  rejected because it creates a dashboard wall on the paper. Collapsing the textarea to a single row
  was rejected because editing the record must remain the primary activity. Moving delete into an
  overflow menu was rejected because it changes discoverability and interaction behavior beyond the
  visual correction requested.

## Decision 15: Let one viewport companion grip the real spine

- **Decision**: Move the Diary Agent from date/content composition into one application-shell fixed
  layer. At `320–700px` it patrols the safe visible spine segment; at wider widths it rests in one
  quiet peek. Every Diary date shows it, while Plan, Search, Settings, and composer surfaces hide it.
  Calendar open compacts and pauses it outside the month grid.
- **Rationale**: The approved captures and direct owner feedback show that document-flow placement
  creates unused space and allows the companion to scroll away. A fixed character that yields to
  rail tools matches the intended resident-book behavior while keeping the writing plane open.
- **Motion decision**: Use state-specific local frames derived from the previous Agent artwork for
  grip/peek/body contraction and transform the button plus artwork together. Idle, scanning, and
  reviewing use slow 28/20/32-second one-way travel with short grip pauses; reviewing reduces range
  and complete settles into a 30-second return patrol. Focus, press, hidden document, calendar, and reduced
  motion pause or remove travel. This is the only ambient-motion exception and creates no background
  process.
- **Empty-day decision**: Retain the idle companion but do not imply content exists. Activation shows
  one localized 4.5-second margin note and never calls analysis or writes. Timeout, second activation,
  Escape, date change, and surface change dismiss it.
- **Idle affordance decision**: On a populated idle Diary, place the localized tap-to-analyze hint in
  two quiet lines directly below the character and move it with the same traveler. Hide it for empty
  dates, Calendar, and every active/completed review state so the invitation never promises an
  unavailable action or competes with review feedback.
- **Asset decision**: Character assets contain no spine line. The appearance registry exposes
  `staticAsset`, `motionAsset`, `intrinsicSize`, and `motionMode`, retains `asset` as a legacy alias,
  and stays internal/no-persistence. Local frame assets are precached for installed offline use.
- **Alternatives considered**: A shortened flow spacer still scrolls away. Hiding on empty dates
  breaks residency. A viewport avatar away from the spine loses the book relationship. Baking the
  spine into the character repeats the double-line defect. Continuous desktop travel adds distraction
  without solving a mobile problem.
- **Supersession**: This replaces Decisions 11–12 only for Agent placement, empty-day visibility, and
  motion. Their date ownership and single-spine requirements remain; Decision 13 rockers,
  Decision 14 composer details, and Decision 16 rail order remain independent.

## Decision 16: Put workspace before record view

- **Decision**: Keep Search and Settings first, then place the existing Diary/Plan rocker before the
  Diary-only Time/Category rocker. Plan continues to omit only Time/Category.
- **Rationale**: The product owner's marked current-state capture directly asks to swap these two
  controls. Moving DOM order with visual order keeps touch and keyboard navigation aligned.
- **Alternatives considered**: CSS-only visual reordering was rejected because it would leave Tab
  order inconsistent. Merging the controls was rejected because workspace and record view remain
  independent scopes.
- **Supersession**: This changes only the relative position of the two rockers in Decisions 12–13.
  Labels, state, callbacks, dimensions, spacing, Plan omission, calendar clearance, data, and
  quick-record behavior remain unchanged.

## Decision 17: Share one writing-plane edge without shrinking calendar targets

- **Decision**: Derive embedded tool width and narrow expanded-calendar width from one mobile
  writing-plane inset ending 8px before the visible brush. Keep the ordinary record stream's larger
  Agent reserve independent. Below 390px, clamp the picker to the minimum width required for seven
  44px columns instead of stretching it to the viewport edge.
- **Rationale**: The owner captures reveal two failures from implicit width ownership: Search is
  needlessly narrow while Calendar is needlessly wide. One explicit edge removes both, and the
  seven-column minimum explains the only remaining overlap at 320/360px rather than treating it as
  decorative gutter masking.
- **Alternatives considered**: Reducing the global 82px record reserve would risk authored text and
  the travelling Agent. Giving Search a one-off width would leave Settings inconsistent. Shrinking
  calendar days below 44px would violate the touch contract. Keeping the opaque full-width mask
  preserves the reported defect.
- **Supersession**: This replaces only the below-390 full-gutter-mask choice in Decisions 12–13.
  Date ownership, first-row tool clearance, layer order, rail controls, all behavior and data remain.

## Decision 18: Show Today only when it can recover date context

- **Decision**: Place one quiet localized `Today / 今天` action beside the date disclosure only when
  the selected date differs from local today. One activation selects today, closes an open picker,
  focuses the persistent date disclosure, and preserves Diary/Plan plus Time/Category state.
- **Rationale**: The product owner directly identified the missing one-click recovery. Conditional
  visibility makes the action available exactly when it has information value, while avoiding a
  permanent home control or another item on the constrained binding rail.
- **Alternatives considered**: A permanent Today button was rejected as redundant on today. A new
  right-rail control was rejected because it would disturb the approved tool order. Reopening the
  calendar and selecting today was rejected because it leaves the stated browse recovery indirect.
  Resetting workspace or record-view state was rejected because those modes are independent of date.

## Decision 19: Put workspace navigation beside contextual quick actions

- **Decision**: Keep Search, Settings, and Diary-only Time/Category in the upper tool lane. Move the
  single Diary/Plan rocker into the lower quick dock for both modes. In Diary, place visible
  `Export today / 导出今日日记` copy to the left of the blue record stamp; in Plan, hide those
  Diary-only actions and keep the existing add-plan action.
- **Rationale**: the product owner's marked 390px PWA directly assigns workspace navigation to the
  lower action context and identifies the unlabeled export mark as unclear. The move reduces upper
  density without adding an action, while the label explains the existing export scope.
- **Alternatives considered**: CSS-only visual reordering was rejected because keyboard/DOM order
  would remain wrong. Duplicating workspace above and below was rejected as ambiguous. Replacing the
  export asset or changing its payload was rejected because the request concerns placement and
  discoverability. A second-line label was rejected because it would recreate a tall action band.
- **Supersession**: this replaces Decision 16's rocker placement and the mobile icon-only export
  requirement only. Mode callbacks, rocker semantics, export content, record creation, Plan add,
  Agent, storage, account, offline, sync, and backup contracts remain unchanged.

## Decision 20: Let Category light up without restating Time

- **Decision**: Replace only the upper record-view rocker's two continuously visible labels and
  moving thumb with one persistent localized `Category / 分类` button. Timeline is its unpressed
  state; grouped Category is its pressed state. Use a raised paper surface, ink, and
  `aria-pressed` together so the change does not rely on color. Retain the lower Diary/Plan rocker.
- **Rationale**: the product owner's marked current-state capture says every point of rail space is
  important and explicitly requests lit/unlit Category behavior. Timeline is the default reading
  surface and need not consume a second visible label; Category remains one action away and gains a
  standard toggle state.
- **Alternatives considered**: Keeping the dual-label record rocker was rejected as unnecessarily
  prominent. An icon-only control was rejected because no source icon exists and Category meaning
  would be less legible. A generic sliding switch was rejected because it would still add chrome and
  would not fit the paper system. Changing the lower Diary/Plan rocker was rejected as outside the
  marked scope.
- **Supersession**: This supersedes Decision 13 only for record-view presentation. Existing record
  modes and callback, Plan omission, upper placement, workspace rocker, data, offline, sync, backup,
  export, and quick recording remain current.

## Decision 21: Expand the mobile domain directory only when Category is active

- **Decision**: Replace the visible Category label with the existing structure icon. On mobile,
  Search and Settings stay in the top header, the icon is independently fixed at the upper-right,
  timeline mounts no directory, and grouped view restores the existing narrow directory until the
  icon is activated again. Desktop keeps the icon in the top tools and never shows the directory.
- **Rationale**: The owner identified the permanent mobile strip as avoidable loss of writing width
  and explicitly separated desktop top-navigation from a mobile on-demand browsing aid.
- **Alternatives considered**: A persistent mobile directory was rejected for consuming scarce
  writing width. A visible text label was rejected as too intrusive. A desktop vertical rail was
  rejected because it changes the established page width. Auto-closing after a domain jump was
  rejected because the owner wants Category to remain a browsing mode.
- **Supersession**: This replaces Decision 20's visible label and earlier timeline-directory rules
  only. `viewMode`, callbacks, domain ordering, Plan omission, Search/Settings/Calendar behavior,
  data, offline, sync, backup, export, and quick recording remain unchanged.
