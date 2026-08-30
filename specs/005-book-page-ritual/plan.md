# Implementation Plan: Book-page Ritual

**Board Item**: `LN-076` | **Date**: 2026-08-28 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

Turn the existing mobile home, populated timeline, fixed records, and ordinary composer into one
restrained private-journal system. The implementation stays in the existing presentation layer:
warm paper and ink tokens, a legible binding gutter, stronger editorial rhythm, compact ownership of
vertical space, and a composer that reads as a continuation of the page instead of a generic sheet.
No stored state, network request, route, action count, or business behavior changes.

Rework 2 replaces the ill-fitting full-body helper with the product owner's selected single-line
spirit. A small presentation-only appearance boundary resolves a bundled character definition and
its visual states before the page mounts it. The boundary is deliberately narrower than a
customization feature: it has one default, no user-facing picker, no persistence, no remote asset,
and no coupling to Agent analysis or write behavior.

Rework 3 corrects two owner-observed implementation failures without broadening the feature: the
appearance no longer disappears while review is active, and the deliberate paper interval before
fixed records plus the binding gutter becomes a persistent Agent activity stage. The existing
session status selects one local pose and one bounded motion treatment for `idle`, `scanning`,
`reviewing`, or `complete`; reduced motion keeps the same state legible at a static resting point.

Rework 8 supersedes the later flow-mounted placement while preserving the same state machine. The
character moves into one application-shell viewport layer, remains present on every Diary date,
patrols a collision-free mobile spine segment, rests on desktop, and yields to calendar, tools,
composer, focus, press, hidden-document, and reduced-motion states. Character-only local assets
remove the duplicate spine, and an empty-date activation returns only a transient no-write note.

### Frontend Working Model

- **Visual thesis**: a carefully used archival journal—warm cotton paper, charcoal text, deep blue
  ink, quiet letterpress hierarchy, and a believable binding edge without distressed filters or
  ornamental skeuomorphism.
- **Content plan**: editorial view/date identity → ordinary authored record stream → optional Agent
  margin note → fixed-record ledger → existing record/export actions; the composer continues the
  same page with writing first and optional metadata second.
- **Interaction thesis**: state changes retain short content entrance, the existing hand-drawn
  keyboard focus loop, the composer's page-leaf entrance, and bounded Agent movement inside the
  protected viewport spine. Hover/tap feedback uses ink-color and sub-2px movement; reduced motion
  shows final states immediately.
- **Agent appearance thesis**: the Diary Agent is a resident character gripping the existing spine,
  not an idle-only ornament or a second spine drawing. Idle patrols the mobile safe segment,
  scanning moves faster, reviewing narrows its range, complete settles, and desktop remains quiet.
  Appearance definitions describe static/motion assets and intrinsic size, while Agent session
  behavior remains owned by the existing page state machine.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing CSS, locally bundled Instrument Sans / Instrument Serif / IBM
Plex Mono, and existing local diary raster/SVG assets; no new dependency
**Storage and Ownership**: N/A for the feature; account cache, Supabase document, and IndexedDB image
ownership remain unchanged
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: Authenticated mobile-first browsers and desktop responsive layouts at 320,
390, 426, 768, and 1280px, including installed/offline PWA and reduced motion
**Performance Goals**: Zero new network requests, zero background work, one small static appearance
resolver, and no material increase to the existing locally cached diary asset budget
**Constraints**: Local-first, account isolated, revision safe, offline capable, backup compatible;
44px affected targets; ordinary composer opens in one action and saves in one action after typing
**Scale/Scope**: Home diary shell, editorial header, time-record stream, fixed-record ledger,
existing mobile binding rail, and ordinary composer; Search/Calendar/Settings/Plan/Agent internals are
compatibility surfaces only

## Source-of-Truth and Readiness Check

- [x] The board item exists and its intended outcome, dependencies, permissions, acceptance, and
      verification method are clear.
- [x] `product.md` contains or will receive the durable product-admission decision when behavior or
      scope changes.
- [x] Visual or interaction work has read `DESIGN.md` and `设计规范/AGENTS.md`.
- [x] The current dirty working tree was inspected and the write set avoids unrelated user changes.
- [x] No second writer owns overlapping files or state.

## Constitution Check

*GATE: Passed before design and re-checked after the design below.*

- [x] Core recording steps and the home page's primary job are preserved or improved.
- [x] Authenticated offline use, account ownership, and stale-revision safety are preserved.
- [x] Raw notes are not silently rewritten; all changes are explicit and reversible.
- [x] Privacy, network payloads, credentials, backups, restore, and removal are fully specified.
- [x] Tests are mandatory and cover the acceptance scenarios and relevant failure paths.
- [x] The change is the smallest independently testable vertical slice with no speculative breadth.
- [x] Implementation does not require unauthorized commit, push, publish, deploy, deletion, reset,
      history rewrite, OKR change, or worktree merge.

Post-design re-check: the design adds no entity, route, request, permission, primary control, required
recording choice, or migration. The gates remain satisfied.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/globals.css` owns paper, ink, type, spacing, generic overlay, surface, buttons, and motion.
- `src/app/home-header.js` and `src/app/home-header.css` own the editorial Time/Category/Plan title,
  date identity, Search/Calendar/Settings controls, and date-swipe feedback.
- `src/app/page.js`, `src/app/home-record-views.js`, and `src/app/home-timeline.css` compose the diary
  work area, ordinary records, Agent interval, mobile binding rail, domain directory, workspace
  switch, export, and record actions.
- `src/lib/agent-appearance.mjs` and `src/app/agent-appearance.js` now provide the Rework 2 appearance
  seam, but all statuses still resolve the same idle asset. `src/app/home-timeline.css` explicitly
  hides `reviewing` and collapses the helper slot during active review; those are the narrow failures
  Rework 3 replaces.
- `src/app/fixed-records.js` and `src/app/home-fixed-records.css` render the open-paper periodic ledger
  and inline value controls.
- `src/app/record-composer.js`, `src/app/entry-composer.css`, and `src/app/attachments.css` render the
  ordinary editor, optional template/format/details controls, and attachments.
- `public/ui/diary/paper-texture.svg` and existing local PNGs supply the offline-safe paper, binding,
  record-rule, focus-loop, Agent, export, and record marks.
- `e2e/run-mobile.mjs` already protects open-paper rows, fixed-record semantics, 44px targets,
  responsive overflow, reduced motion, quick record, composer formatting, rail geometry, and tool
  isolation. `e2e/run-pwa.mjs` protects installed/offline behavior.
- `DESIGN.md`, `设计规范/规范/基础/视觉系统规范.md`,
  `设计规范/规范/页面/记录与结构管理页面规范.md`, and
  `设计规范/规范/交互/反馈与动效规范.md` are the applicable design contracts.

### Reuse and Compatibility Decisions

- Reuse the existing paper texture and hand-drawn asset family; do not introduce remote fonts,
  generated network media, a second accent, or a new illustration style.
- Keep the current React structure and accessible names unless a minimal presentation hook is proven
  necessary. Prefer scoped CSS changes over markup or state changes.
- Preserve the current open-paper rule: ordinary/fixed records are not cards; authentic user
  `#tags`, hidden ownership semantics, the Agent's secondary role, and the right rail remain intact.
- Preserve all storage keys, entry fields, sync revision behavior, route/hash compatibility,
  Markdown/JSON/portable backup formats, and prior data behavior byte-for-byte.

## Proposed Design

### Data and Control Flow

There is no new persistent or network data flow. Existing account-scoped data renders through the
same home and composer components; presentation selectors map existing view states (`timeline`,
`grouped`, `day-plan`, tool open, calendar open, Agent active, composer open) to the revised material
and spacing system. For Diary Agent appearance only, the page supplies the existing session status
to a presentation component, which resolves a frozen local definition and mounts the matching local
asset. Unknown IDs resolve to the default. Entry creation/edit/delete, inline fixed saves, Agent
analysis/replies/writes, sync, conflict handling, export, restore, cancellation, and offline fallback
remain on their existing paths.

### Trust and Privacy Boundaries

No process or service receives additional data. The browser loads only versioned application CSS,
fonts, SVG, and PNG assets already within the service-worker boundary. No record content, identifier,
account data, image, token, or derived visual state is added to logs, requests, screenshots, or new
storage. Test fixtures continue to use synthetic records only.

### UI and Interaction Contract

- **Journal material**: one warm paper plane with restrained local fiber, charcoal ink, deep blue ink
  for action/focus, and a slightly quieter bound-edge gutter. Texture supports material but never
  competes with text or reduces input contrast.
- **Editorial identity**: Time/Category/Plan remains the strongest navigation title, date stays
  adjacent and subordinate, and the first content boundary follows at a deliberate section gap.
  No duplicated title, hero, slogan, or decorative top divider is added.
- **Reading rhythm**: authored record text remains 16px full-ink Sans per the existing Agent
  hierarchy decision. Mono time, short dash, hand-drawn row rule, Agent note, and fixed-record ledger
  stay secondary. Section gaps have an owner and no mobile first viewport contains an unexplained
  dominant blank band.
- **Binding gutter**: the existing mobile rail becomes a visually legible page edge by separating
  writing column and bound gutter with tone and shadow while preserving the exact control axis,
  domain anchors, keyboard order, and 44px hit areas.
- **Diary Agent appearance**: use character-only transparent graphite assets derived from the
  selected line spirit; no frame contains the book-spine stroke. One fixed shell layer owns the
  moving button and artwork together, while the existing rail remains the only binding line.
- **Appearance boundary**: one frozen definition contains a stable ID and per-state
  `staticAsset`, `motionAsset`, `intrinsicSize`, and presentation class. A resolver supplies the
  default for unknown IDs and exposes `motionMode` plus the legacy `asset` alias. Rendering owns no
  analysis, write, persistence, export, or backup behavior.
- **Composer**: the mobile surface reads as a raised page leaf through paper continuity, compact
  corners, a book-like header, and restrained ink actions. The textarea remains the dominant area;
  templates, formatting, More, details, attachments, close, and Done preserve their current
  semantics and target sizes.
- **Motion**: the resident Agent is the single approved ambient exception: mobile idle/scanning/
  reviewing use slow 28/20/32-second one-way spine travel with short grip pauses, complete settles
  into a 30-second return patrol, and desktop remains still.
  Calendar, focus, press, hidden document, and reduced motion pause or remove travel. No page-turn,
  looping grain, parallax, cursor-following decoration, or content displacement is added.
- **Responsive/accessibility**: no horizontal overflow at 320/390/426/768/1280px; long localized
  date/text wraps safely; focus remains visible; affected targets remain at least 44px; contrast and
  input text remain readable in both languages.

## Project Structure and Write Set

```text
Read:
  AGENTS.md
  PROJECT_BOARD.md
  product.md
  DESIGN.md
  设计规范/AGENTS.md
  设计规范/规范/{基础,页面,交互}/*.md
  src/app/{page.js,home-header.js,home-record-views.js,fixed-records.js,record-composer.js}
  src/app/{globals,home-header,home-timeline,home-fixed-records,entry-composer,attachments}.css
  e2e/{run-mobile,run-pwa}.mjs
  public/ui/diary/*

Allowed to change:
  PROJECT_BOARD.md
  product.md
  DESIGN.md
  设计规范/规范/基础/视觉系统规范.md
  设计规范/规范/页面/记录与结构管理页面规范.md
  设计规范/规范/交互/反馈与动效规范.md
  specs/005-book-page-ritual/**
  src/app/globals.css
  src/app/home-header.css
  src/app/home-timeline.css
  src/app/home-fixed-records.css
  src/app/entry-composer.css
  src/app/page.js and src/app/record-composer.js only if a presentation hook is required
  src/app/home-record-views.js
  src/app/agent-appearance.js
  src/lib/agent-appearance.mjs
  src/lib/i18n.mjs
  public/ui/diary/agent-spine-spirit-*.{png,webp}
  public/sw.js
  tests/agent-appearance.test.mjs
  e2e/{run-mobile,run-pwa}.mjs
  output/playwright/ln-076-agent-spirit/ln-076-*.png
  output/playwright/ln-076-agent-spirit/ln-076-visual-evidence.json
  design-qa.md

Explicitly excluded:
  authentication, cloud sync, Supabase migrations, storage keys, entry/plan/structure schemas,
  Agent providers/routes, Search/Calendar/Settings/Plan business behavior, import/export payloads,
  backup formats, deployment, commit, push, publish, and unrelated dirty files
```

**Integration Order**: One main-checkout writer: contracts and regression assertions → scoped visual
tokens/material → header and record rhythm → fixed ledger → composer → targeted regression and
visual review → full gates → board evidence.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract tests: no new data model; existing unit suite must remain green. Add browser
  contract assertions for visual ownership because the behavior is CSS/geometry-driven.
- Browser/mobile tests: add one `LN-076` focused journey in `e2e/run-mobile.mjs` covering baseline
  home, populated timeline, composer, quick open/type/save, local material assets, owned vertical
  gaps, binding gutter, content primacy, 44px controls, focus, reduced motion, and 320/390/426/768/
  1280px overflow.
- Rework 3 contract tests: cover the default appearance ID, local asset allowlist, distinct bounded
  idle/scanning/reviewing/complete state resolution, unknown-ID fallback, decorative image semantics,
  and absence of appearance fields from account state and backup fixtures. Mobile geometry covers a
  non-collapsed stage in every state, stage/gutter containment, zero overlap with rows, annotations,
  fixed fields and rail controls, the unchanged 44px button, and static state-specific reduced-motion
  positions.
- Rework 8 contract tests: cover static/motion/intrinsic/legacy appearance fields, character-only
  alpha geometry, service-worker precache, Diary/empty visibility, hidden surfaces, top/middle/bottom
  fixed geometry, four state timings, calendar/focus/press/background/reduced-motion pause, empty-date
  dismissal and no-write behavior, and exactly one rail at 320/390/426/600/700/768/1280px.
- PWA/offline/account tests: run the existing production installed/offline suite; assert no remote
  font/image dependency and no new request/state boundary.
- Design validation: update the three applicable design sources, run `npm run design:check`, and
  visually compare the 390px home/timeline/composer before and after states.
- Full gate: `npm run check`

### Real-Environment or Manual Evidence

The product owner must compare the captured before/after 390px states for perceived coherence,
book-page character, note primacy, and recording ritual. A 14-day personal-use observation remains
the only honest evidence for sustained preference and no perceived quick-record friction.

### Acceptance Evidence Handoff

Record targeted browser pass count, `npm run design:check` result, full `npm run check` result,
responsive geometry evidence, and the paths to `ln-076-{home,timeline,composer}-390.png` plus
`ln-076-visual-evidence.json` in `PROJECT_BOARD.md`. Keep the product-owner comparison and 14-day
preference check explicitly pending until performed.

## Rollback, Removal, and Migration

No migration is required. Reverting the scoped CSS, optional presentation hook, local evidence
assertions, and design documentation restores the prior appearance without reading or rewriting
stored data. Existing locally cached assets may remain harmlessly cached until the normal
service-worker version advances.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Scoped journal material/gutter tokens | Unify paper, ink, binding, and composer without changing global product behavior | A single color swap leaves the current unrelated spacing, rail, and generic composer hierarchy intact |
| Focused visual-contract browser assertions | Translate subjective feedback into repeatable geometric and accessibility gates | Screenshots alone cannot detect overflow, target-size, motion, or quick-record regressions |
| One appearance resolver and presentation component | Keep future bundled/custom appearance work from rewriting the Agent state machine or page action markup | Replacing only the current image path would repeat the same coupling and leave no safe extension seam |

## Rework 4 Plan: Compact Category Chapters And One Boundary Rule

**Input evidence**: the product owner's marked 390px Category screenshot showing the stacked
`健康 / 身体指标` hierarchy and the two full-width rules between `睡眠` and `学习`.

**Constitution check**: this remains a presentation-only browse refinement. It adds no recording
step, network boundary, persistence, migration, backup member, raw-note rewrite, or home control.
The main-checkout writer is this task; unrelated dirty changes remain untouched.

**Implementation boundary**:

- Update `src/app/home-record-views.js` only to expose the domain/first-category chapter line while
  retaining distinct `h2`/`h3` semantics, later category headings, and existing data/actions.
- Update `src/app/home-timeline.css` for one-line/wrapped chapter geometry and a whitespace-owned
  adjacent-domain transition. Do not change record data, names, ordering, fixed-record behavior,
  right-rail ownership, Agent geometry, Time view, or composer.
- Update `e2e/run-mobile.mjs` before implementation with assertions for semantic headings, progress,
  compact first-category geometry, later-category hierarchy, one-rule boundary, 44px inputs, and
  320/390/426/768/1280px overflow.
- After implementation, capture the same seeded 390px state and a normalized reference/implementation
  comparison under `output/ln-076-category-chapters/`; update `design-qa.md`, durable design sources,
  and board evidence only after focused and full gates pass.

**Acceptance order**: failing regression → semantic markup → scoped CSS → focused browser evidence →
same-input design QA → design check → full `npm run check` → Returned board evidence.

## Rework 5 Plan: Date-led Header, Rail View Toggle, And Flow-free Agent

**Input evidence**: three product-owner 390px captures showing (1) the dedicated Agent interval as
excess blank space, (2) the line spirit safely coexisting beside fixed-record rows, and (3) arrows
requesting that the date replace `Time / Category` as the left primary title while the rail's
Calendar position becomes the record-view switch. Three follow-up captures show the remaining
defects: the Agent is fixed inside an expanded month grid, its internal stroke creates a second
parallel spine line, the fixed section adds a second horizontal rule after the final ordinary row,
and Diary/Plan remains detached in the lower action area.

**Constitution check**: this improves browse and preserves quick recording. It changes no record,
Agent action, picker kernel, account, offline, sync, backup, export, or schema behavior. The date
itself owns the existing month disclosure, so removing the duplicate rail Calendar entry does not
remove functionality or add a navigation level. One writer remains in the dirty main checkout and
must preserve unrelated changes.

**Implementation boundary**:

- Update `src/app/home-header.js` to render the existing date disclosure as the first and strongest
  heading, remove the separate rail Calendar control, and replace the former editorial
  Time/Category title with one Diary-only rail toggle. Replace the lower workspace segment with one
  shared upper-rail Diary/Plan toggle. Diary orders Search/Settings/view/workspace; Plan orders
  Search/Settings/workspace. Keep Plan's context subordinate to the shared date and retain the
  existing refs/callbacks.
- Update `src/app/home-header.css` for date-first type, integrated disclosure/focus treatment, and
  the existing 44px rail rhythm. The view toggle may use localized visible text; do not invent a new
  pictogram or asset family.
- Update `src/app/page.js` and `src/app/home-record-views.js` so the existing Agent mount is composed
  after the shared date context and before active Diary content, with existing state/actions
  unchanged. Update `src/app/home-timeline.css` so the mount has zero document-flow height, rests
  below an expanded picker, and aligns or occludes the idle/complete asset stroke on the one binding
  axis while ordinary and fixed rows keep their natural proximity. Completion controls may remain
  meaningful content, but no state may restore an empty spacer. Update `src/app/home-fixed-records.css`
  so the final ordinary row owns the one transition rule and the fixed section adds none.
- Update `e2e/run-mobile.mjs` before implementation with one Rework 5 scenario covering date
  dominance/disclosure semantics, absence of `.home-calendar-button`, declared Diary/Plan rail
  order, one-action Time/Category and Diary/Plan changes, absence of a lower workspace duplicate,
  calendar open/select/Escape/focus return, zero-height date-context-following Agent geometry,
  single-spine alignment, a single ordinary-to-fixed horizontal rule, all-state/reduced-motion visibility, protected calendar/content/tool
  regions, and 320/390/426/768/1280px overflow.
- Preserve the selected local Agent assets, appearance resolver, record/category chapters, swipe
  navigation, month grid, directory rail, Diary/Plan switch, fixed-record writes, and quick composer.

**Acceptance order**: failing Rework 5 regression → unified header/rail semantics → date-relative flow-free Agent mount and single-spine alignment →
focused behavior and geometry → same-input 390px design QA → durable design sources → design check →
full `npm run check` → Returned board evidence.

## Rework 6 Plan: Dual-label Rail Rockers

**Input evidence**: the product owner's cropped 390px rail capture marking the standalone current
labels “分类” and “日记”, plus the direct request for a current-style rocker that keeps both modes
visible.

**Constitution check**: this is a presentation-only discoverability correction inside the existing
two mode buttons. It adds no mode, control, recording step, state field, request, persistence,
account boundary, backup member, or migration. The two scopes remain separate: record view is
Time/Category and workspace is Diary/Plan.

**Implementation boundary**:

- Update `src/app/home-header.js` with one shared presentation-only rocker renderer. Keep one outer
  button and the existing callbacks, data attributes, accessible action labels, rail order, and Plan
  omission rule; render both localized labels inside each button and mark exactly one as current.
- Update `src/app/home-header.css` with a restrained raised-paper thumb, graphite trough, deep-blue
  current ink, vertical mobile layout, horizontal desktop layout, visible focus, a 140–180ms state
  transition, and immediate reduced-motion state. Do not add an image asset or imitate a generic OS
  toggle.
- If the taller mobile controls extend the rail stack, adjust only the `<390px` picker top clearance
  in `src/app/home-calendar.css` and the directory's post-Settings top clearance in
  `src/app/home-timeline.css`; preserve wider picker geometry, directory ownership, and all month or
  anchor logic.
- Extend the existing Rework 5 browser scenario before implementation: both localized labels visible
  and untruncated, one current option per rocker, raised thumb position changes after one click,
  target size, keyboard focus, reduced motion, Plan omission, no overlap, and
  320/390/426/768/1280px overflow. Preserve all Agent, date, picker, record, and data assertions.

**Acceptance order**: failing dual-label assertions → shared rocker markup → scoped responsive
presentation and narrow picker clearance → focused browser evidence and 390px visual review →
durable design sources → `npm run design:check` → full `npm run check` → Returned board evidence.

## Rework 7 Plan: Quiet Composer Details

**Input evidence**: the product owner's 2026-08-30 mobile composer capture with `More` expanded,
showing an oversized blank writing band, generic equal-weight metadata fields, an attachment action
without a strong section boundary, and record deletion mixed into routine details.

**Constitution check**: this is a presentation and disclosure-semantics correction inside the
existing ordinary composer. It adds no field, required decision, recording step, route, request,
persistence member, account boundary, backup member, or migration. Existing close, save, attachment,
delete-confirmation, dialog focus, and raw-text behavior remain authoritative.

**Implementation boundary**:

- Extend the existing composer browser journey before implementation with open-details assertions
  for disclosure semantics, minimum writing height, section order, delete separation, 44px targets,
  visible focus, responsive overflow, reduced motion, and exact saved text.
- Update `src/app/record-composer.js` only to expose `aria-expanded` / `aria-controls`, provide a
  stable details region, and add presentation wrappers around metadata and the existing-record danger
  action. Preserve inputs, names, values, callbacks, conditional rendering, and button behavior.
- Update `src/app/entry-composer.css` and, only where needed, `src/app/attachments.css`: closed mode
  stays a generous lifted writing leaf; open-details mode uses a bounded writing area above a compact
  ledger, a distinct attachment section, and a separated danger footer. Use existing archival tokens,
  restrained corners, explicit focus, safe-area padding, and immediate reduced-motion feedback.
- Verify 320/390/426/768/1280px, capture closed and expanded 390px evidence, run composer-focused
  regressions, then `npm run design:check`, `npm run check`, and `git diff --check`.

**Acceptance order**: failing expanded-composer assertions → semantic grouping → scoped responsive
composition → focused screenshots and interaction evidence → durable design sources → repository
quality gates → Returned board evidence.

## Rework 8 Plan: Viewport-fixed Spine Companion

**Input evidence**: the product owner's marked long-page, expanded-calendar, and binding captures plus
the approved final plan. They establish four concrete failures: the character scrolls away, can enter
calendar cells, leaves a content-flow void, and duplicates the page spine.

**Constitution check**: this improves browse companionship without changing quick-record steps, raw
notes, analysis inputs, explicit writes, account boundaries, storage, synchronization, export, or
backup. Long-running motion is narrowly allowed only for the visible Diary companion; it pauses when
the document is hidden and becomes fully static for reduced motion. No background work is added.

**Implementation boundary**:

- First extend `tests/agent-appearance.test.mjs`, `e2e/run-mobile.mjs`, and `e2e/run-pwa.mjs` with
  failing contracts for the new appearance shape, local assets, fixed layer, safe-track geometry,
  state timings, pause conditions, empty-date no-write note, hidden surfaces, and offline cache.
- Replace the content-flow mount with one direct child of `main.app-shell`. Its fixed track derives
  from `100dvh`, safe-area insets, the upper tool stack, and lower action dock; rail controls remain
  above it and clickable. Mobile patrol is limited to `320–700px`; desktop is a quiet fixed peek.
- Keep the current `idle/scanning/reviewing/complete` review state machine. Add only transient local
  presentation state for the empty-date note and document visibility. Empty dates never call the
  review provider or `commitData`; populated dates keep their current wake/stop behavior.
- Extend the frozen appearance registry to per-state `staticAsset`, `motionAsset`, `intrinsicSize`,
  and resolved `motionMode`, preserving `asset` as a compatibility alias. Unknown appearances and
  states fall back to the bundled idle definition.
- Generate character-only transparent local assets with no full-height vertical stroke. Use frame
  animation for grip/peek/body contraction and CSS transform for rail travel. Keep six real raster
  frames per state: idle re-grips and lets the body follow, scanning stretches/retracts, reviewing
  keeps the existing hand-to-chin thinking silhouette while the eyes inspect the source, and complete
  coils/re-grips before settling. Register frame count, cycle, poses, and gaze as immutable appearance
  metadata; add every new asset to the service-worker application shell and offline verification.
- Use `data-agent-surface`, `data-agent-status`, `data-agent-motion-mode`, and empty-date markers for
  deterministic tests. Calendar open, focus, press, page hiding, and reduced-motion freeze the
  traveler; surface changes clear the transient note and hide the layer where required.
- Verify 320/390/426/600/700/768/1280px at top/middle/bottom scroll, four states, calendar, empty
  date, reduced motion, and hidden surfaces. Build a same-viewport owner/implementation comparison,
  update `design-qa.md`, then run `npm run design:check`, focused tests, `npm run check`, and
  `git diff --check`.

**Acceptance order**: durable Rework 8 contract → failing unit/E2E → character-only offline assets →
fixed shell layer and transient empty note → state/pause motion → visible grip/reach/follow and
thinking/gaze frames → same-state visual comparison → repository quality gates → Returned board
evidence.
