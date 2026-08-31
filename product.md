---
status: active-mvp
created_at: 2026-08-11
updated_at: 2026-08-29
---

# Log Note product brief

## Product premise

Log Note is a quiet personal-recording tool. Its first job is to make recording an event, observation, or recurring check easy enough to sustain every day. A real Supabase-compatible account is required before the workspace opens. The public distribution keeps email/password as the primary path and Google as an alternative; a separately configured Meituan-internal distribution may instead expose only Meituan SSO and use an approved Meituan-hosted workspace, but only when the same stable owner, per-user RLS, CAS revision, offline and backup contracts are proven. Each account owns an isolated device cache and one revisioned cloud document. Changes save locally first and then synchronize automatically, while automatic interpretation remains out of scope. A user-triggered, isolated smart-organize workspace may ask a server-side DeepSeek classifier to propose one existing category for a record, with deterministic on-device rules as an explicit fallback; the category's parent domain supplies the visible “domain / category” path. It never runs in the background, creates structure or tags, rewrites raw notes, or saves a suggestion without confirmation.

The present MVP is account-owned, offline-capable, and mobile-first. A new device must authenticate and load its account once; a previously authenticated device can continue from its local cache without a dependable connection. Google Calendar is an optional, separately authorized planning connection: Log Note plans remain local-first, while Google events are only a secondary planning context.

## Primary user and critical scenario

The primary user for the current stage is **the author using Log Note for their own daily records**. This is a deliberate narrow starting point, not a claim that the eventual product can serve only one person. Broader positioning requires evidence from sustained personal use before the mainline is generalized.

The critical scenario is:

> After signing in, the author records something fresh on a phone with minimal decisions; later, the same account can find, correct, remove, read, back up, and restore it, while an already authenticated device remains usable without a dependable network connection.

The mainline therefore optimizes this sequence before adding breadth:

```text
quick record → browse → search → edit/delete → backup/restore → offline use
```

Templates and periodic structure support this scenario when useful, but they must remain optional for an ordinary quick record. Account-scoped synchronization is infrastructure for durability, not an extra recording decision. Automatic analysis, recommendations, social use, and generalized task management are not part of the critical scenario. Optional organization remains a secondary browse aid and cannot add a recording step.

## Current-stage goal

The current stage is **MVP closure, reliable demonstration, and proof of sustained personal usefulness**. The goal is not to maximize features or time spent in the app. It is to prove that the author can depend on the core loop long enough to accumulate records that remain retrievable and portable.

This stage succeeds when all of the following are true:

1. The core loop can be demonstrated repeatedly on a mobile viewport without data loss after authentication, and an already authenticated device remains usable without a live network dependency.
2. The author completes a 14-day personal-use run with enough active recording days to evaluate real friction rather than a one-session demo.
3. At least one prior record is demonstrably useful later: the author can retrieve it when needed and judge that keeping it changed a later decision, recollection, review, or action.
4. Full JSON backup/restore, portable attachment backup/restore, readable Markdown export, offline recording, and version migration remain reliable as the product changes.

## Success metrics

### North-star metric: consecutive useful recording weeks

The single north-star metric is **consecutive useful recording weeks**.

A seven-day period qualifies as a useful recording week only when:

- the author creates at least one genuine personal record on at least **5 distinct days**; and
- by the end of the period, the author can retrieve at least one earlier record within **60 seconds** and identify a concrete use for it, such as correcting memory, continuing work, reviewing a pattern, or informing a decision.

The metric counts consecutive qualifying weeks, not total records. Ten entries on one day do not outperform five low-friction active days, and adding fields or features cannot improve the metric by itself. Until in-product private measurement exists, active days come from the exported record dates and the usefulness/retrieval check is recorded manually in the validation notes.

### Metrics measurable in the current mainline

| Metric | Definition | Current-stage target |
| --- | --- | --- |
| Reliable demonstration | A mobile run completes quick record, browse, search, edit, delete, full backup, confirmed restore, refresh persistence, and offline record/refresh without an unexpected error or lost current data. | Two complete consecutive runs pass; the automated quality gate remains green. |
| Recording continuity | Distinct days containing at least one genuine author-created record, excluding bundled seed/demo data. | At least 10 of 14 days, with no unexplained gap longer than 2 consecutive days. |
| Quick-record friction | Actions required to open the ordinary composer and save after typing. | At most 1 action to open and 1 further action to save; no new required classification or field. |
| Retrieval usefulness | A sampled prior record is found and the author states the concrete later use it served. | At least 1 useful retrieval per qualifying week, found within 60 seconds. |
| Data portability and recovery | A full backup is exported, validated, restored, and exported again without losing entries or structure; Markdown remains readable. | 100% pass for the release candidate and every storage-schema change. |
| Offline reliability | After an initial online load, core pages open offline and a new offline record survives refresh. | 100% pass in the PWA regression for the release candidate. |

Record count, screen time, number of templates, and number of shipped features are diagnostic facts only. They are not success metrics because they can reward friction, clutter, or compulsive use.

### Metrics unlocked only by later feedback-loop work

These metrics are definitions for future feedback-loop evaluation, not authorization to add summaries, recommendations, autonomous actions, or a persisted observation model. The isolated organizer is narrower: after an explicit click it may use a bounded remote classifier only to choose among existing categories, produces temporary “domain / category” suggestions, writes only `entry.categoryId` after explicit confirmation, and falls back to deterministic local rules. Broader AI remains locked behind separate product, architecture, and privacy review.

| Future metric | Definition | Earliest measurement condition |
| --- | --- | --- |
| Observation accuracy | Observations the author rates as accurate and supported by the cited source records, divided by all rated observations. “Plausible but unsupported” does not count as accurate. | Derived observations cite sources, never change raw notes, and can be corrected, deleted, and recomputed. |
| Suggestion execution rate | Accepted suggestions that the author actually completes as specified, divided by accepted suggestions whose execution window has ended. Declined suggestions are reported separately and do not lower execution quality. | Suggestions are optional, explain their evidence and cost, and create no action without explicit acceptance. |
| Experiment completion rate | Created 3–7 day experiments that reach a recorded before/after review, divided by experiments whose planned end date has passed. | The intervention, target variable, execution, result, and abandonment reason are distinct, recoverable data. |
| Experiment effectiveness rate | Completed experiments the author judges to have improved the target outcome without unacceptable cost or side effects, divided by completed experiments with a result judgment. | At least one target outcome and one cost/side-effect check are captured before the result is evaluated. |

No target percentage should be treated as a product claim until there are at least 10 rated observations or 5 completed experiments. Early samples are learning evidence, not proof of effectiveness.

## Feature admission and exit policy

Every proposed capability must first state the user behavior it improves in the core loop, the evidence for the problem, its default interface cost, its offline/privacy/recovery behavior, its verification method, and how it can be disabled or removed.

Score each dimension from 0 to 2 before implementation:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Core-loop contribution | Unrelated | Indirect support | Directly improves a core-loop behavior |
| User evidence | Assumption only | Repeated qualitative pain | Observed personal-use failure or measurable friction |
| Expected frequency | Rare | Weekly | Daily or part of most recordings |
| Default interface cost | Adds permanent primary-screen complexity | Lives on a secondary surface | Adds no default exposure or replaces existing complexity |
| Recording friction | Adds a required decision or step | Leaves the ordinary path unchanged | Removes a decision or step |
| Offline/account fit | Breaks an authenticated offline cache or crosses account ownership | Has a partial offline fallback | Local-first writes, isolated account ownership, and full cached-device offline use |
| Privacy and reversibility | Opaque, destructive, or sent beyond approved boundaries | Recoverable with explicit controls | Account-scoped, traceable, reversible, and export-compatible |
| Performance and maintenance | Persistent background or broad coupling | Bounded cost | Near-zero idle cost and a narrow module boundary |
| Verifiability | Subjective only | Repeatable manual check | Clear automated regression plus user outcome check |
| Removability | Entangled with raw records or core navigation | Removable through migration | Off by default, isolated, or removable without changing raw notes |

- **16–20:** eligible for a mainline candidate, subject to all quality and privacy gates.
- **12–15:** experiment only; keep it off by default or in an isolated worktree/module.
- **0–11:** reject for the current stage or retain only as a research note.

Regardless of score, a feature is rejected from the mainline if it silently rewrites raw records, prevents an already authenticated device from using its local cache offline, crosses the approved account-scoped Supabase boundary, adds a required step to ordinary recording, breaks old backup recovery, or regresses the existing quality gate.

### LN-010 Phase 1 admission: local domain trends and one-glance review

- **Core-loop contribution:** improves browse by turning the active account's recent records into a compact, metric-linked 30-day view; it does not change quick record, search, edit/delete, backup/restore, or the ordinary composer path.
- **Evidence:** the product owner marked the desired current-domain-adjacent position on a real 390px Diary screenshot and explicitly asked for cross-time domain trends, status review, and an initially simple investment example. In follow-up visual review the owner rejected text-heavy evidence lists, requested no record index, removed the repeated permanent totals/split, and selected a compact straight line whose exact daily facts appear only on interaction.
- **Default cost:** one contextual 44px secondary action appears only beside the currently active mobile domain, plus one compact desktop entry. The review lives on `/insights`; no modal, required field, recording choice, background task, or extra save step is added. This is a deliberate primary-screen cost and must be re-evaluated after 14 days.
- **Offline, account, privacy, and recovery:** results are recomputed in memory from the active account's isolated local payload. No source note or derived result is persisted, synchronized, logged, exported, backed up, or sent to an analysis/market service. Account or payload replacement discards the prior transient result. Direct offline route reload remains required.
- **Investment boundary:** investment-like recognition uses an explicit localized name list only. The compact local review does not expose aggregate coverage, a recording prompt, record excerpts, or a record index; it keeps one fixed statement that the page reviews notes and is not investment advice. Security choice, price, timing, allocation, buy/sell/hold, return, P&L, prediction, and personalized risk advice are prohibited.
- **Verification and removability:** pure model tests reconcile every qualifying record exactly once, protect invalid/unresolved provenance, enforce evidence thresholds, preserve bounded internal derivation, and benchmark 5,000 records. Browser/PWA evidence covers the absent metric bands/index/excerpts/visible investment prompt, 320/390/426/768/1280px, 44px targets, keyboard/focus, Canvas text equivalence, account replacement, direct offline reload, and source immutability. Removing the route, links, model, local asset, translations, and shell entry needs no migration.
- **Exit condition:** keep isolated or remove if it is not opened twice in 14 days, the one-glance metric/rhythm summary is not judged useful and reconcilable, users mistake the fixed boundary for investment guidance, the rail action obscures domain navigation or quick recording, or any account/offline/backup/quality gate regresses.
- **Admission score:** 16/20, mainline candidate limited to this local, read-only Phase 1. Persisted observations, ratings, interventions, experiments, remote AI, market data, notifications, or automatic analysis remain `LN-010 Phase 2` and require LN-007/008/009.

### LN-076 admission: restrained archival journal surface

- **Core-loop contribution:** directly improves quick record and browse by making the ordinary home, populated record stream, fixed-record ledger and composer feel like one continuous private journal while keeping authored notes visually primary.
- **Evidence:** the product owner explicitly reported that the current UI does not feel premium, does not convincingly express a vintage book, and does not make recording feel sufficiently ritualized. The 390px baselines show a weak relationship between header and body, unowned blank bands, several competing illustration languages, and a generic rounded composer with an unrelated bright action treatment.
- **Default cost:** no new control, modal, field, route, copy block or required decision. Existing paper, editorial title/date, records, fixed ledger, binding rail and composer are visually reconciled. The ordinary composer still opens in one action and saves in one further action after typing.
- **Offline, privacy and recovery:** presentation and locally bundled visual assets only. No note, plan, structure, setting, account, sync, network, revision, export or backup field changes; authenticated offline rendering and raw-note integrity remain unchanged. The treatment can be removed without migration.
- **Verification and removability:** focused browser coverage checks home, populated timeline and composer hierarchy, one-action open/save, local asset sources, 44px targets, focus, reduced motion and 320/390/426/768/1280px overflow; the full design, mobile, PWA/offline and repository gates remain mandatory. Before/after screenshots require direct product-owner review, followed by a 14-day preference observation. Reverting the scoped CSS and local presentation assets restores the prior surface without reading or rewriting data.
- **Exit condition:** rework or remove if the author still judges the page generic, if ornament overtakes record text, if an accidental blank band remains, if quick recording gains a step, if responsive/accessibility/offline gates regress, or if 14-day use does not sustain a preference for the revised surface.
- **Admission score:** 19/20, mainline candidate subject to the full quality gate and direct visual review.

#### LN-076 Rework 2: spine-line Agent appearance boundary

- **Core-loop contribution and evidence:** preserves the already validated Diary Agent entry while
  fixing the product owner's observed failure: the full-body child reads as an illustration placed
  beside the page, not a companion emerging from the book. The owner selected the first 2026-08-29
  visual direction, a non-humanoid graphite line spirit joined to the right binding.
- **Default cost:** the existing optional 44px Diary Agent entry remains in the same paper interval
  and keeps the same wake/stop behavior. The selected spirit lives primarily in the 56px gutter,
  looks toward the notes, and is masked by the page edge; mobile idle copy remains hidden. No new
  home control, label, choice, recording step, required field, or modal is added.
- **Future-ready boundary:** appearance definition, visual state, and page mounting are separated so
  another bundled appearance can later be introduced without rewriting Agent behavior. This release
  contains one default only. A picker, upload, remote avatar, persisted preference, account setting,
  backup field, synchronization field, marketplace, and Plan Agent redesign remain outside scope and
  require their own product/privacy/offline admission.
- **Offline, privacy, recovery, and removal:** the spirit is a versioned local transparent asset in
  the offline shell. Appearance is not stored or transmitted and cannot affect records, plans,
  structure, accounts, revisions, exports, or backups. Removing the resolver, renderer, and local
  asset restores the prior presentation without migration.
- **Verification and exit:** unit coverage protects local state resolution and unknown-ID fallback;
  browser geometry protects page occlusion, gutter-majority placement, no overlap, 44px access,
  reduced motion, Diary/Plan isolation, and 320/390/426px overflow. Same-state design QA and the full
  quality gate are mandatory. Rework or remove if the spirit still reads as a sticker, the page does
  not convincingly hide it, it attracts more attention than records, or the generic seam adds
  persistent/product complexity before customization has evidence.

#### LN-076 Rework 3: persistent multi-state Agent activity stage

- **Core-loop contribution and evidence:** the product owner's marked review screenshot shows the
  Agent vanishing exactly when it should be attending to a note; two further annotations define the
  blank paper interval before fixed records and the adjacent binding gutter as its activity range.
  Keeping the companion present makes that interval purposeful without reducing authored-note space.
- **Default cost:** no new control, copy, route, field, decision, or recording step. The existing
  button and session statuses select visible `idle`, `scanning`, `reviewing`, and `complete` poses.
  The stage exists only on Diary days with ordinary records, matching the current Agent boundary.
- **Offline, privacy, recovery, and removal:** all poses are small versioned local transparent assets;
  stage movement is presentation-only CSS. No appearance or position is stored, transmitted, synced,
  exported, or backed up. Removing the state assets and stage rules requires no migration.
- **Verification and exit:** unit coverage requires distinct local state assets and fallback;
  responsive browser geometry requires a non-collapsed stage, persistent visibility, contained
  movement, zero row/annotation/fixed-field/rail overlap, 44px access, and deterministic reduced-motion
  states at 320/390/426px. Rework if the Agent again disappears, reads as a detached sticker, wanders
  into authored content, or turns the quiet journal into an attention-seeking animation surface.

#### LN-076 Rework 5: date-led header, rail view toggle, and flow-free Agent

- **Core-loop contribution and evidence:** the product owner's three marked 390px captures identify
  one shared browse-friction problem: the Agent's dedicated blank stage breaks proximity, the
  record-view title outranks the actual diary date, and a separate calendar tool spends one of the
  three scarce rail positions on a function already owned by the date. The requested replacement
  keeps content continuous while making date and browsing mode immediately legible.
- **Follow-up evidence:** three current-implementation captures show that a viewport-fixed Agent can
  enter the expanded month grid, its bundled vertical stroke can sit beside the binding as a second
  line, the record-to-fixed transition draws two nearby horizontal rules, and the lower-right
  Diary/Plan control remains detached from the upper navigation group.
  The accepted refinement anchors Agent after the date context, merges its stroke with the binding,
  and moves workspace switching into the same upper rail as Search and Settings.
- **Default cost:** the date becomes the left primary title and the same date/weekday control opens
  the existing month picker. The mobile rail uses Search, Settings, one single-button Diary/Plan
  toggle, and a Diary-only single-button Time/Category toggle in that order; no second Calendar button or lower
  Diary/Plan control remains. The Agent keeps one 44px
  control and the existing four visual states, but its presentation layer no longer contributes a
  blank block to document flow. Its zero-height anchor follows the date context so an expanded month
  moves it below the grid, and its vertical stroke resolves onto the one binding axis instead of
  producing a parallel line. Quick recording gains no step or required choice.
- **Offline, privacy, recovery, and removal:** this is presentation and control placement only. It
  adds no record, setting, account, network, sync, backup, or export field and reuses existing local
  Agent and rail assets. Reverting the header/rail markup and flow-free positioning restores the
  previous layout without migration.
- **Verification and exit:** responsive browser checks at 320/390/426/768/1280px must prove one
  primary date disclosure, no separate Calendar rail action, 44px record-view and workspace toggles
  in the declared rail order, preserved picker/Escape/focus behavior, and an Agent whose zero-height
  stage stays below an expanded month, never creates a record-to-ledger gap, never covers rows,
  inline annotations, fields, directory labels, or tools, and never draws a second binding line.
  The same evidence must show one horizontal transition rule between ordinary and fixed records.
  Rework if the date is no longer the first readable identity, mode becomes harder to discover, the
  Agent obscures content/calendar, a parallel line appears, or a blank stage returns.

#### LN-076 Rework 6: dual-label rail rockers

- **Core-loop contribution and evidence:** the product owner reviewed the current 390px rail and
  identified that the isolated “分类” and “日记” words do not read clearly enough as reversible mode
  controls. The requested correction keeps both alternatives visible, so browse mode and workspace
  mode can be understood before tapping.
- **Default cost:** the existing record-view and workspace buttons remain two separate, one-action
  controls in the same rail. The workspace rocker precedes the Diary-only record-view rocker, matching
  the product owner's latest direct correction. Each button remains one compact two-position rocker: both
  `Time / Category` and `Diary / Plan` labels remain visible while a raised paper thumb, position,
  and ink treatment identify the current side. No new control, navigation level, required decision,
  recording step, or four-state combined selector is added.
- **Offline, privacy, recovery, and removal:** markup, CSS, and responsive calendar clearance only.
  No record, plan, setting, account, request, synchronization, export, or backup field changes. The
  treatment is local, reversible, and removable without migration.
- **Verification and exit:** responsive browser checks must prove both localized labels are visible
  and untruncated, exactly one option is visibly current without color alone, the whole rocker keeps
  at least a `44px` target and one-action behavior, Plan hides only the record-view rocker, keyboard
  focus and reduced motion remain explicit, the narrow expanded calendar clears the taller rail
  stack, and 320/390/426/768/1280px do not overflow. Rework if the rocker feels like a generic OS
  switch, obscures the binding, makes either label unreadable, or collides with calendar/content.

#### LN-076 Rework 7: quiet composer details

- **Core-loop contribution and evidence:** the product owner supplied the current expanded composer
  and asked to optimize the record UI. The capture shows that the blank writing leaf remains almost
  full-height after `More` opens, while metadata, attachments, and deletion form one long generic
  stack. The correction improves editing scanability without changing quick recording.
- **Default cost:** no new control, field, route, modal, or required decision. Closed mode remains a
  generous writing surface. Expanded mode keeps writing usable but compacts it above a metadata
  ledger, a distinct attachment section, and an existing-record danger footer. Opening and saving a
  normal record remain one action each around typing.
- **Offline, privacy, recovery, and removal:** presentation wrappers, disclosure ARIA, and scoped CSS
  only. Record values, attachment blobs, deletion confirmation, account isolation, local-first sync,
  raw notes, export, and backup formats do not change. The treatment is removable without migration.
- **Verification and exit:** responsive browser checks cover closed/expanded states at
  320/390/426/768/1280px, disclosure semantics, minimum writing height, section order, 44px targets,
  focus, reduced motion, exact save, attachment, and deletion. Rework if details still create a
  dominant blank band, writing feels secondary, delete blends into routine fields, or quick record,
  offline use, or the quality gate regresses.

#### LN-076 Rework 8: viewport-fixed spine companion

- **Core-loop contribution and evidence:** repeated 390px review showed that a flow-mounted Agent
  leaves an unowned band, disappears during long-page scrolling, can enter the expanded calendar,
  and can contribute a second vertical line. The product owner explicitly wants the companion to
  remain visible on the right spine and crawl within the safe visible rail while Diary is open.
- **Default cost:** no new navigation, required choice, record step, or persistent control is added.
  The existing Agent button moves to an application-shell layer. It appears on populated and empty
  Diary dates, patrols only at `320–700px`, rests on desktop, and yields to the existing rail tools.
  Empty-date activation produces only a temporary margin note and never starts analysis or writes.
  Owner follow-up keeps the same slow 28/20/32/30-second rail patrol but requires visible character
  acting inside the raster: six source-faithful frames distinguish re-grip/body-follow, scan
  stretch/retract, hand-to-chin thinking with gaze changes, and completion coil/settle.
- **Offline, privacy, recovery, and removal:** character-only static and motion assets are bundled and
  precached. Motion mode, document visibility, calendar pause, and the temporary empty-date note are
  session/presentation state only. Immutable frame/cycle/pose/gaze metadata describes each bundled
  appearance but never stores the current frame. No record, plan, appearance preference, account,
  request, sync, export, or backup field changes; the layer can be removed without migration.
- **Verification and exit:** responsive checks cover top/middle/bottom scroll at
  320/390/426/600/700/768/1280px, four state rhythms, 44px target tracking, hidden surfaces,
  calendar tuck, reduced motion, background pause, six-frame APNG metadata and state-specific gaze/
  pose sequences, empty-date dismissal/no-write, exactly one spine, offline assets, and the full
  quality gate. Fall back to a static peek if patrol causes obstruction, measurable performance
  cost, persistent distraction, or any core-loop regression.

#### LN-076 Rework 4: compact category chapters and one boundary rule

- **Core-loop contribution and evidence:** the product owner's marked 390px Category screenshot
  identifies two browse-friction symptoms: a large stacked `Health → Body metrics` heading that reads
  like an administration form, and two consecutive hand-drawn rules between the final Health row and
  the Learning chapter. Both weaken the journal's reading rhythm without adding information.
- **Default cost:** Category view keeps each domain and its first visible category/progress in one
  compact editorial chapter line; any later categories continue as explicit subordinate headings.
  Adjacent domains use one explainable row-ending rule plus section whitespace rather than a second
  equal-weight top rule. No control, field, copy decision, recording step, or data mutation is added.
- **Offline, privacy, recovery, and removal:** this is DOM grouping and scoped presentation only. It
  does not rename, merge, persist, transmit, export, or back up domains/categories, and it does not
  affect fixed-record writes. Reverting the grouped-view markup and CSS restores the previous layout
  without migration.
- **Verification and exit:** browser checks at 320/390/426/768/1280px must prove both headings remain
  programmatically distinct, the compact line wraps without overflow, later category headings and
  periodic progress remain explicit, fields keep 44px targets, and no boundary contains two
  consecutive rule assets. Rework if users can no longer read the structure, the compact title crowds
  long names, or one remaining rule still feels decorative rather than tied to a row.

Admission is temporary, not permanent. Before release, every new capability must name a 14- or 30-day evidence window and an exit condition. It returns to isolation or is removed when it is unused, fails its promised user outcome, increases quick-record steps, adds unexplained primary-screen controls, causes a material performance or reliability regression, or creates continuing maintenance cost disproportionate to its measured value. Removing a capability must preserve raw notes and supported backups.

### LN-075 Rework 9 admission: Search and Settings become left-page workspace tools

- **Core-loop contribution:** improves browse and search-adjacent orientation by keeping the secondary Settings workspace attached to the selected diary page instead of navigating away; quick recording remains unchanged.
- **Evidence:** after the binding-hole rail was established, the primary user explicitly grouped Settings and Search with the current page and asked that Settings stop jumping to a separate destination.
- **Default cost:** the existing Settings rail control opens one continuous paper layer over the still-mounted diary. Search, Calendar, and Settings are mutually exclusive; close, Escape, and backdrop return to the same date, Diary/Plan and Time/Category mode, scroll position, and focused Settings control. Mobile keeps the six-item index and one full-width detail; desktop keeps the quiet left rail and one work panel. No recording choice or required field is added.
- **Offline, privacy and recovery:** all six existing settings tasks reuse their current account-scoped local-first actions. No new request, credential, schema, storage key, note rewrite, backup format, or sync behavior is introduced. `/settings`, its hash aliases, `/templates` compatibility, and `focus=periodic` remain supported direct routes.
- **Verification and removability:** browser regression covers URL stability, mounted diary context, six panels, tool mutual exclusion, close/Escape/backdrop, focus and scroll restoration, reduced motion, 320–1280px overflow, direct-route hashes, offline/PWA, and the full quality gate. A 14-day observation window should confirm that users understand Settings as belonging to the current book without finding the layer confining. Reverting the trigger, embedded mode, and surface CSS restores the route-only interaction without migrating data.
- **Exit condition:** revert or isolate the layer if it loses page context, traps focus, causes mobile overflow, makes any settings task less usable than the direct route, or increases quick-record friction.

### LN-075 Rework 5 admission: hand-drawn record rules and title-anchored directory nodes

- **Core-loop contribution:** improves daily browse by making the Time view read as one chronology, giving record rows the same drawn-paper rhythm as the reference, and letting the right directory reveal where the corresponding content headings actually are.
- **Evidence:** after reviewing Rework 4, the primary user explicitly rejected the duplicated left-side Health heading in Time order, corrected the time/content mark from a short vertical rule to a short horizontal stroke, identified the straight row and rail rules as mechanically drawn, clarified that directory dots align with left headings and gather at the rail edges only when those headings leave the viewport, and rejected a hard rectangular input outline in favor of a hand-drawn selected-row mark.
- **Default cost:** Time keeps one visible Serif Record heading only when ordinary time records exist. An empty date omits both that heading and explanatory empty copy, creates no Record directory node, and begins directly with any applicable fixed fields without an orphaned divider. Periodic fields remain editable in place but their domain names move to the read-only right directory instead of repeating as left headings. A generated transparent short dash separates time from content; generated transparent long strokes separate rows/sections; a generated transparent graphite brush remains the full-height rail. Directory buttons retain `44px+` targets, follow their section-heading Y positions, and preserve document order while smoothly clamping into top/bottom stacks. Focusing a record or fixed row reveals one generated blue loop around the complete row from left to right instead of outlining only the inner control. Reduced motion makes both repositioning and loop reveal immediate. Quick recording keeps the same two actions and adds no decision.
- **Offline, privacy and recovery:** this is presentation, read-only navigation, and versioned static raster work. It does not change entry content, `categoryId`, tags, domains, categories, templates, plans, storage keys, account isolation, revisions, network behavior, migrations, or Markdown/JSON/portable backup semantics. All new RGBA assets remain in the offline shell.
- **Verification and removability:** compare the supplied references with 426×923 Time, Category, focused-row, scrolled-top, middle, and bottom states; automate heading visibility, short-horizontal geometry, raster rule sources, full-row focus geometry, anchor alignment, edge stacking, stable order, smooth/reduced-motion behavior, `44px+` hit targets, 320/390/426/600/671/700 overflow, desktop rail absence, PWA caching, and existing calendar/record interactions. A 14-day observation window should confirm that the rail improves orientation and the selection loop improves focus recognition without distracting from reading. The visual assets and layout algorithm can be removed without migrating data.
- **Exit condition:** rework or remove the moving directory or focus loop if nodes obscure fixed controls, reorder independently from content, jitter during ordinary scroll, fail to return to matching headings, make long labels unreadable, if the loop masks row content, or if either treatment adds more visual weight than the records it indexes.

### LN-075 Rework 4 admission (superseded by Rework 5): fine edge rail, compact calendar start, and open record paper

- **Core-loop contribution:** improves browse by making the page index quieter, removing a false blank shelf above the month grid, and letting time and fixed records scan like one continuous diary page without changing quick-record steps.
- **Evidence:** the primary user marked the rail and nodes as too heavy, identified the large empty band above the open month picker as erroneous height, and supplied a third reference showing time records and health metrics as open rows rather than cards or ownership pills.
- **Default cost:** on mobile the generated rail occupies a `2px` layout slot with an approximately `1px` optical stroke; idle/active marks render at `12px` inside unchanged `44px+` buttons. The picker begins directly after the title bar, while the fixed upper controls remain above it and the first date row clears the complete Search/Settings/mode stack; below `390px`, only the calendar's internal top padding grows enough to put weekday labels below that stack. Time view adds one Serif “Record” heading and uses a compact time column, one short per-row vertical hairline, and weak row rules. Fixed records group by their real domain heading and use metric/value rows on the paper surface. Visual domain/category ownership remains available to assistive technology but no longer appears as a capsule; genuine user `#tags` remain visible.
- **Offline, privacy and recovery:** this changes derived display metadata, raster assets, and layout only. Entry content, domains, categories, templates, plans, account isolation, storage, revisions, network behavior, restore validation, Markdown/JSON/portable backups, and raw tags are unchanged. The fine RGBA assets remain in the versioned offline shell.
- **Verification and removability:** compare the three supplied references with 426×923 Time, Category, Fixed-record and open-calendar states; automate 320/360/361/389/390/426/600/671/700/768/1280, open-paper geometry, hidden ownership semantics, real tag preservation, picker/tool clearance, 44px targets, transparent assets, PWA/offline behavior and horizontal overflow. A 14-day observation window should confirm that records scan faster and the rail no longer competes with content. These presentation changes can be reverted without data migration.
- **Exit condition:** rework if the rail still reads as a heavy divider, marks become hard to activate, the picker recreates a dead shelf or overlaps Settings, record rows lose their time/domain context, or the open layout makes inline fixed-record entry harder to recognize.

### LN-075 Rework 3 admission (superseded by Rework 4): quiet title boundary, hand-drawn rail controls, and a bounded month picker

- **Core-loop contribution:** improves browse by making the selected date, current record view, visible domains, and calendar entry easier to scan without changing the two-action quick-record path.
- **Evidence:** the primary user first clarified that one mobile line links the entire page, then explicitly removed the divider below `Time / Category`, moved the Calendar interaction onto that line, required one hand-drawn icon family, and marked the previous month picker as visually broken because it crossed the rail and exposed clipped months.
- **Default cost:** this historical pass kept one generated full-height brush axis. Search, Calendar, Settings, real domain nodes, Diary/Plan, export, record creation, and Plan creation used real controls on that axis; the title date became static identity text and the Calendar button became the only month-picker toggle. It established exactly previous/current/next month, no horizontal scrolling, 42 day targets of at least `44px`, brush/picker/tool layering, and the `390px` narrow-screen split. Rework 4 above preserves those interaction contracts while replacing the too-heavy rail geometry and the spacer below the three utilities.
- **Offline, privacy and recovery:** this remains presentation and local navigation only. Entries, plans, structure, storage keys, account isolation, revisions, network boundaries, and backup formats are unchanged. Generated transparent PNG controls are versioned in the offline application shell.
- **Verification and removability:** automated coverage checks 320/360/361/389/390/426/600/671/700/768/1280, exact three-month order, 42 day targets, viewport bounds, brush/picker/tool layering, directory unmounting, keyboard month navigation, Escape focus return, scroll-position restoration, reduced motion, PWA caching, old routes, and no horizontal overflow. A 14-day observation window should confirm that users can open another day without interpreting the picker or rail as broken; the calendar layer and raster family remain removable without migrating data.
- **Exit condition:** rework or isolate the rail/picker if controls drift off-axis, the brush crosses dates, a month is clipped, the picker obscures record access, the right-edge controls become unreachable, or quick recording gains a step.

### LN-075 Rework 2 admission (superseded by Rework 4): editorial home and one unified mobile edge rail

- **Core-loop contribution:** improves browse by making the current record view, selected date, and visible domain groups easier to scan, while leaving quick recording at the same number of steps.
- **Evidence:** after reviewing the domain-directory implementation, the primary user marked the right edge and clarified that it is one line connecting the entire mobile page: search, Settings, visible domain nodes, Diary/Plan, download, and record creation all belong on the same axis. The earlier split between a directory line and a separate action group was visibly incorrect.
- **Default cost:** one generated brush stroke spans the mobile viewport. Existing search and Settings actions sit at its top, the Category view inserts read-only nodes only for domain sections actually present on the selected date, and the existing Diary/Plan plus applicable export/add action sit at its bottom. Time, empty-day, and Plan states keep the rail and valid actions without inventing domain nodes. Domain buttons remain navigation only and never create or change stored domains, categories, or `#tags`. Desktop keeps the compact header and hides the mobile rail. No recording decision is added.
- **Offline, privacy and recovery:** this is presentation, navigation, and information-architecture work. Entries, plans, structure, storage keys, account isolation, revision checks, network boundaries, and all backup formats remain unchanged. Generated raster controls are part of the offline application shell.
- **Verification and removability:** historical rail evidence remains useful, but its full-width month-picker rule is superseded by the bounded layering and three-month contract above. Record setup, old deep links, keyboard search, reduced motion, offline caching, and backup compatibility must continue to pass.
- **Exit condition:** remove or isolate the rail if its labels do not match visible content, fixed controls obscure the reading column, the visual axis breaks into independent stacks, it becomes a second structure editor, search becomes unreachable, or quick recording gains a step.

### LN-055 / LN-071 admission: local smart organize by existing category

- **Core-loop contribution:** improves browse and later retrieval by reducing the cost of filing accumulated records into the existing domain/category structure.
- **Evidence:** the primary user repeatedly requested daily-record classification, then clarified that organization normally applies to one chosen day rather than a cross-date batch.
- **Default cost:** one secondary illustrated helper appears only when the selected day has ordinary records; it opens `/organize` with that date and does not change quick-record actions. The workspace asks for exactly one date, defaults to today, and previews all ordinary records from that natural day. The preview is not a multi-select list, and the organizer does not expose cross-date ranges, search, select-all, invert, or a manual whole-day assignment.
- **Privacy and recovery:** no background job, schema migration, persisted suggestion, new category, or new tag. An already authenticated device can use deterministic local rules offline. Only a confirmed existing `categoryId` is stored through the account-scoped local-first save path; content, tags, template, attachments, date, and time remain unchanged, and the last apply can be undone.
- **Verification and removability:** pure model/provider tests confirm that only the chosen date's ordinary records are analyzed, plus six-viewport browser regression for date changes and the existing apply/undo path. The `/organize` route, provider, and secondary entry can be removed without changing raw entries.
- **Exit condition:** keep isolated or remove if suggestions are usually low-confidence, accepted filing does not improve retrieval, or the secondary surface creates maintenance cost disproportionate to weekly use.

### LN-069 / LN-071 admission: bounded DeepSeek category placement

- **Core-loop contribution:** improves browse and retrieval by recognizing semantic matches that direct keyword rules miss, without adding a recording step.
- **Evidence:** after repeated use of the single-day organizer, the product owner explicitly requested a real AI connection and supplied a DeepSeek credential. The local rules remained useful as an offline fallback but were too literal for custom Chinese wording.
- **Default cost:** no new home control, modal, field, background task, or database table. DeepSeek is called only after the existing “Organize N records” action.
- **Privacy and recovery:** the browser sends the selected day’s ordinary record `id/content/currentCategoryId`, the bounded existing category paths and hints, and at most 24 category-labelled examples to an authenticated same-origin server route. It does not send email, attachments, tags, or the complete account document. The server-held key never enters the browser bundle, account document, backup, or logs. Model output may reference only request entry IDs and existing category IDs, with at most one non-current category per entry. Invalid, unavailable, timed-out, rate-limited, offline, or unconfigured requests visibly fall back to local rules. Suggestions remain session-only; raw text and tags are never rewritten and only explicit apply changes `entry.categoryId` through the existing reversible save path.
- **Verification and removability:** pure tests cover body and context limits, Supabase token and origin checks, rate limits, timeouts, damaged JSON, output allowlists and fallback. Existing mobile and PWA gates continue to exercise apply/undo and raw-text preservation without external-network dependence. Removing the API route and remote adapter restores the local provider without migrating records or backups.
- **Exit condition:** return remote classification to isolation if accepted suggestions fall below 50%, invalid output exceeds 20%, normal requests exceed 8 seconds, costs become material, or users do not accept the disclosed data boundary.

### LN-074 Rework 16 admission: confirmed seven-day domain summary

- **Core-loop contribution:** improves browse by letting the author review one current domain's
  recent notes as a short, bounded weekly synthesis after first seeing the factual local line.
- **Evidence:** the product owner explicitly requested that the current-domain records from the
  latest week be gathered for AI discussion, then selected a one-shot summary with no chat and a
  mandatory second confirmation after reviewing the exact UI and privacy boundary.
- **Default cost:** one secondary text action appears after the local 30-day line. Its first click
  opens disclosure only; the request starts only after “Start summary.” The result contains one
  overview of at most three sentences and at most three one-sentence themes, with no source index, excerpts,
  follow-up input, automatic request, primary navigation, or added quick-record step.
- **Offline, privacy and recovery:** a same-origin authenticated route receives only the current
  account/current domain's last seven local calendar days, bounded to the most recent 80 ordinary
  and periodic records and 4000 characters per record, using only
  `id/date/time/content/sourceType` plus window, domain name, and locale. Account identifiers, tags,
  attachments, images, field objects, templates, category trees, other domains, and the full
  document are excluded. Results and disclosure state remain in page memory, never update raw
  notes, Supabase, caches, exports, or backups, and are discarded on stop, domain/account change,
  or page exit. Offline, unconfigured, timeout, invalid, or unsafe responses are visibly
  unavailable and never masquerade as local AI output.
- **Verification and removability:** model/route/provider tests cover the whitelist, seven-day
  boundary, truncation, auth/origin/body/rate/timeout, output allowlists and financial-safety
  rejection. Browser checks cover the two-step request, abort/stale-result behavior, zero/limited
  samples, responsive/focus behavior, and no writes. Removing the text action, provider, route, and
  isolated model restores the local-only page without migration or backup changes.
- **Exit condition:** keep isolated or remove if it is not reused within 14 days, the median
  Start-to-success time across at least three successful confirmed requests exceeds 8 seconds,
  authors distrust the summary or disclosure, privacy concerns arise,
  or maintaining the remote boundary costs more than the observed browse benefit.

### LN-074 Rework 8 admission: perceptible annotation role

- **Core-loop contribution:** improves browse by making the user's record and the Agent's supporting note distinguishable in an ordinary glance rather than only through measured CSS differences.
- **Evidence:** the product owner reviewed Rework 7 and said the result showed no visible difference. The remaining problem was categorical, not numeric: both source and Agent still looked like the same Sans body-copy role, and the annotation's gutter/top reserve still made it feel like a second content block.
- **Default cost:** Diary mobile only. Records remain `16px` full-ink Sans. Agent questions become `14px` muted Serif/Songti annotations; category stays `13px/600`, actions and placeholders become `12px`, actual input remains `16px`, and every action remains at least `44px`. The gutter moves `10px` closer to the text and the top reserve drops from `24px` to `12px`; the real source axis and annotation right edge do not move.
- **Offline, privacy and recovery:** presentation, regression assertions, screenshots, and design documentation only. Agent behavior, requests, writes, account ownership, offline fallback, synchronization, raw notes, exports, and backups are unchanged.
- **Verification and removability:** focused browser checks compare source/question font family, size and ink in addition to existing axes/proximity/44px contracts; Diary/Plan isolation and the complete quality gate remain mandatory. CSS can be reverted without migration.
- **Exit condition:** rework if the Agent still reads as another record paragraph, Serif harms Chinese/English readability, the tighter gutter collides with text, or Plan/right-rail geometry changes.

### LN-074 Rework 12 admission: usable reply width and discoverable close

- **Core-loop contribution:** improves in-place review by making the reply field genuinely writable on a phone and making review dismissal obvious without leaving the current diary context.
- **Evidence:** the product owner reviewed the Rework 11 category screenshot and identified that interaction had become inconvenient. Reserving `136–140px` for two actions left only about `120px` of writing space at 390px, forced the Chinese placeholder into three lines, and the low-contrast bare `×` did not look reliably operable.
- **Default cost:** mobile Diary review restores the reply field to the full annotation width. One or two unresolved actions sit in one compact right-aligned row directly below the input instead of permanently occupying its horizontal space. The close control keeps a 44px target but gains a visible 28px inner icon surface and prompt clearance. Typography, right-side icons, Plan Agent, quick recording, and explicit-write behavior do not change.
- **Offline, privacy and recovery:** layout markup, CSS, assertions, screenshots, and design documentation only. Agent requests, data, account ownership, synchronization, raw notes, exports, and backups are unchanged.
- **Verification and removability:** focused browser geometry requires at least 220px reply width at 390px and 160px at 320px, a 0–4px input/action gap, one horizontal action pair, 44px actions/close target, visible close glyph, prompt clearance, no overflow, and Diary/Plan/date/rail isolation. The treatment is removable without migration.
- **Exit condition:** rework if typing still feels constrained, actions detach into a large visual band, the close control competes with prompt text, 320px overflows, or Plan/right-rail geometry changes.

### LN-074 Rework 13 admission: remove repeated category copy

- **Core-loop contribution:** improves browse and filing decisions by separating the question from the concrete category result, so the user can scan the proposed destination once and act on it.
- **Evidence:** the product owner identified that the category path was repeated in both the Agent question and the category label (for example, “交易 / 市场”), creating redundant copy and a muddled hierarchy.
- **Default cost:** category review keeps one generic question and one explicit `Domain / Category` label; no new action, field, or recording step is added.
- **Offline, privacy and recovery:** prompt generation, normalization, tests, and screenshots only. Agent data boundaries, local fallback, explicit category writes, undo, backups, and raw notes are unchanged.
- **Verification and removability:** local and remote category items normalize to the generic prompt in Chinese and English; focused Diary browser evidence asserts the path appears exactly once. The correction is removable without migration.
- **Exit condition:** rework if the category destination becomes ambiguous, the label disappears, or localized prompts become less clear.

### LN-074 Rework 11 admission: compact mobile reading grid

- **Core-loop contribution:** improves browse and in-place review by fitting more real notes into the first mobile viewport and making source, annotation, separators, and fixed fields read as one continuous page.
- **Evidence:** the product owner marked the remaining blank bands after Rework 10 and explicitly requested community layout research. SkillHub surfaced a three-layer page/module/component specification pattern; Nielsen Norman Group's proximity guidance says related elements should stay close and whitespace should separate only meaningful groups; WCAG 2.5.8 confirms that target size/spacing and visible glyph size are separate concerns.
- **Default cost:** 390px Diary review only changes layout geometry: active header content anchors to the bottom of its protected band, the time/content gutter becomes `42px + 10px`, ordinary one-line records use `56px`, category actions share the reply row, and fixed-record tools use a 28px visual slot while the real Adjust target remains 44px. Type hierarchy, right-side icons, Plan Agent, quick recording, and explicit-write behavior do not change.
- **Offline, privacy and recovery:** CSS, layout assertions, screenshots, and design documentation only. No Agent request, data, account, synchronization, raw-note, export, or backup behavior changes.
- **Verification and removability:** focused browser geometry covers summary proximity, 52px source gutter, 56px ordinary/fixed rows, shared reply/action row, 28px fixed-tool slot, right-rail clearance, eight responsive widths, and Plan isolation; the full quality gate remains mandatory. The treatment is removable without migration.
- **Exit condition:** rework if time values clip, annotation/source axes drift, action targets overlap, fixed tools collide with fields, or the denser page harms scanning at 320–420px.

### LN-074 Rework 7 admission: source hierarchy, real text axis, and compact proximity

- **Core-loop contribution:** improves browse by keeping the user's record visibly primary while making the attached Agent note easier to associate and faster to scan.
- **Evidence:** after the icon-lane, hierarchy, and internal-axis passes, the product owner marked the 390px page again: Agent text still resembled record body copy, the annotation was aligned to a padded container rather than the visible record text, and the stop/reply/actions/next-record gaps still formed oversized blank bands.
- **Default cost:** Diary mobile only. The source record remains `16px` full ink; the Agent question becomes `14px` supporting ink, category/actions `13px`, and placeholder `12px` while the actual textarea stays `16px`. The annotation aligns to `.entry-content`, preserves its right edge and the icon lane, uses `4px` from reply to actions, and ends `12–16px` before the next record. All actions remain at least `44px`; Plan Agent and quick recording are unchanged.
- **Offline, privacy and recovery:** CSS, visual-contract tests, screenshots, and design documentation only. Agent requests, session state, explicit writes, account isolation, revision checks, raw notes, offline fallback, synchronization, export, and backup remain unchanged.
- **Verification and removability:** a focused 390px browser test must first fail on the old `-22px` text-axis offset, then assert source/question/category/action/placeholder hierarchy, actual text-edge alignment, compact vertical gaps, fixed right edge, 44px actions, and Plan isolation. The treatment is removable without migration.
- **Exit condition:** rework if the Agent again competes with record text, any annotation element drifts from the visible source axis, blank bands obscure grouping, actions lose legibility/44px targets, or Plan/right-rail geometry changes.

### LN-074 Rework 4 admission: icon rail and cohesive row annotation

- **Core-loop contribution:** improves browse and in-place review by making the source record, its Agent note, and the right-side actions easier to scan without adding any recording step.
- **Evidence:** the product owner marked the 390px page again and explicitly requested icons for Search / Calendar / Settings / Export, removal of the active travelling child and unattractive dashed source underline, and less visual fragmentation from the tall bracket plus large independent buttons.
- **Default cost:** the idle wake illustration remains optional. During active Diary review, the source row is followed immediately by one compact annotation with a short local accent and one segmented 44px action group. The four rail utilities are icon-only and sit in the narrow lane immediately right of the binding line instead of covering it; they retain accessible names, keyboard order, focus/active state, and at least 44px hit areas. Plan Agent is not redesigned in this pass.
- **Offline, privacy and recovery:** presentation only. Requests, session state, confirmed writes, account ownership, revision checks, offline fallback, raw records, schema, export and backup behavior are unchanged.
- **Verification and removability:** focused browser checks assert icon visibility and label absence, 44px targets, rail alignment, no Diary traveller, no dashed underline, compact annotation geometry, segmented actions, Plan isolation and 320–1280px overflow. The CSS/markup treatment can be reverted without data migration.
- **Exit condition:** rework if icon meaning is unclear, focus/active state becomes invisible, action grouping hides primary versus secondary choices, the source relationship becomes ambiguous, or the compact treatment reduces 44px accessibility.

### LN-074 Rework 1 admission: in-page session-only diary Agent

- **Core-loop contribution:** improves browse and edit by reviewing one selected day's ordinary notes in their original rows, asking for missing facts, and offering existing-category filing without leaving the diary page.
- **Evidence:** the product owner supplied a concrete reference and explicitly requested that the illustrated Agent wake on tap, move to the corresponding line, ask for detail, support casual conversation, and absorb classification so it no longer depends on a separate page.
- **Default cost:** the existing secondary helper illustration remains visible only on Diary days with ordinary records. Activating it starts an optional row-local session; it does not add a home modal, required field, recording decision or quick-record step. `/organize` remains a compatible direct/fallback surface rather than the primary path.
- **Offline, privacy and recovery:** analysis may send only the selected natural day's ordinary `id/time/content/currentCategoryId`, date, language, and bounded existing Domain / Category IDs and names through the authenticated same-origin route. It excludes email, account identity, tags, attachments, plans, category hints/history, other days and the complete document. Conversation sends only the active source record, active item and at most eight bounded session messages. Server output may reference only request record IDs and existing non-current category IDs. Unknown, duplicate, oversized or invalid output is discarded. Sessions and messages exist only in page memory and never enter Supabase, JSON/Markdown/portable backups or Service Worker caches. Offline/no-token/no-key/timeout falls back to modest local questions and literal existing-category matches. Keep/dismiss/chat never writes. Append-to-original, new-record and category actions require separate user confirmation; category changes expose undo. Raw notes are never silently rewritten.
- **Verification and removability:** model/route tests cover minimal input, auth/origin/body/rate/timeout boundaries, record/category allowlists, reply normalization and local fallback. Browser regression covers wake, row anchoring, casual reply, keep original, append, new record, category apply/undo, cancellation, Plan/empty states, reduced motion, eight responsive widths and right-rail geometry. The Agent route/provider/component can be removed and the helper restored to `/organize` without migration.
- **Exit condition:** keep isolated or remove if it is not reused in a 14-day observation window, users distrust the prompts or classification, normal remote review exceeds 8 seconds or costs become material, row-local UI obscures quick recording, or persistent observations/learned behavior are required before LN-007/008/009 are completed.

### LN-074 Rework 2 / Rework 17 admission: in-page session-only Plan Agent

- **Core-loop contribution:** improves browse and edit for one selected day's existing local plans by pointing out time overlap or an unclear title in the plan grid, while leaving quick recording and plan creation unchanged.
- **Evidence:** after iterating on and visually validating the Diary Agent's row-local interaction, the product owner explicitly requested that the same Agent review Plan rather than opening a separate AI page.
- **Default cost:** the illustrated Agent remains visible inside Plan on every selected date. When there is at least one editable local plan it retains the optional wake control; on Google-only or empty days it is passive and shows one weak line, “编写计划后和我聊聊吧”, without dispatching analysis. It adds no required plan field or creation step and does not compete with the add-plan action.
- **Offline, privacy and recovery:** analysis may send only the selected date, language, local plan `id/title/startMinute/endMinute`, and bounded visible Google conflict `title/startMinute/endMinute` through the existing authenticated same-origin Agent route. Google/calendar/event IDs, external references, tokens, descriptions, locations, attendees, diary records, other dates, account identity and the full document are excluded. Google context has no executable identity and can never be an update target. Sessions, messages, issues and proposals stay in page memory and never enter Supabase or backups. Offline/no-token/timeout uses deterministic overlap and vague-title checks. Chat and keep-original never write; title or time changes require a separate explicit update action and reuse the revision-checked local-first plan save path.
- **Verification and removability:** model/route tests cover minimal fields, local-plan allowlists, Google identifier exclusion, fallback and invalid proposals. Browser regression covers persistent passive Google-only/empty states, one-line localized guidance, wake/anchor, conversation without mutation, explicit title/time update, cancellation, reduced motion and 320–1280px geometry. Removing the Plan adapter, passive branch, translations and styles returns the Agent to Diary-only behavior without migration or backup changes.
- **Exit condition:** keep isolated or remove if it obscures Plan creation, cannot reliably stay attached to the source plan, proposes unsafe time ranges, invites users to treat Google events as editable, exceeds the existing Agent latency/cost boundary, or is not reused during the same 14-day observation window. Untimed plans, automatic scheduling, reminders and multi-day planning require separate admission.

### LN-070 admission: daily Markdown merge import

- **Core-loop contribution:** improves the start of sustained recording and later browse/search by moving existing daily notes into the same account-owned history instead of forcing manual re-entry.
- **Evidence:** the primary user has several days of canonical Obsidian daily Markdown and explicitly asked for those records to be added to the current Log Note account, while also asking for a reusable CLI/API/MCP path later.
- **Default cost:** one secondary action inside Settings → Restore. The home page, composer, quick-record actions and required fields do not change.
- **Offline, privacy and recovery:** files are read and parsed in the browser, merged into the authenticated account cache, then synchronized through the existing revision-checked writer. The import does not call AI, upload source files, replace current data or change existing records. Exact date/time/content duplicates are skipped. Invalid, empty, oversized or cancelled imports leave current state unchanged.
- **Verification and removability:** pure parser and merge tests cover template/example removal, original text and time preservation, multi-line notes, filename validation, empty files, exact deduplication and repeat-import idempotence. Mobile settings and the complete quality gate remain required. The parser is a standalone module that a future authenticated CLI/MCP adapter may reuse; removing the settings action requires no data migration.
- **Exit condition:** keep CLI/MCP isolated or remove the import UI if canonical daily files cannot be parsed without user-specific exceptions, imports produce duplicates or altered raw text, or the workflow is not reused after initial migration.

### LN-057 admission: in-context date selection

- **Core-loop contribution:** reduces browse friction by keeping date selection inside the active record or day-plan context instead of sending the user through a separate Calendar view and a second confirmation choice.
- **Evidence:** the primary user reported that the existing path was not smooth; the previous state required choosing a date and then choosing again between records and planning.
- **Default cost:** one shared date context serves both Diary and Plan. Static month/day (`18px`) and weekday (`14px`) text accompany the editorial `Time / Category` title, while a real Calendar button on the hand-drawn rail is the sole disclosure control. No month title, activity count or record total competes with it. Across viewports the visible brand/language cluster, wide search field, and standalone Record setup control are omitted from the home header; language and Record setup live in Settings, while search remains reachable as an icon and keyboard shortcut. The bounded seven-column month grid begins directly after the title bar, shares that upper band with the higher-layer rail utilities, and ends with a fixed previous/current/next month row. The entire visible home page remains the horizontal gesture surface: while collapsed it changes day, while expanded it changes month, but the paper, app bar and contextual actions stay visually grounded. Once horizontal intent is clear, a direction shadow covers the viewport but its visible dark band resolves within `min(44vw, 420px)`: rightward movement is darkest at the left edge and leftward movement mirrors it. A compact warm-graphite date plate shows the complete localized target year, month and day. It keeps a stable vertical anchor, sits one restrained step to the left for a leftward gesture and to the right for a rightward gesture, and uses a `150ms` fade/scale-in without following the finger, carrying an arrow or moving any content. A completed gesture quickly clears both cues and updates the date/month; an incomplete gesture only clears them. The redundant visible previous/next pair remains removed. Activating the rail Calendar button, selecting a day or adjacent month, and keyboard grid navigation remain the non-swipe paths. It replaces the independent Calendar mode and former duplicate date controls, adds no home primary action, and does not change quick-record steps.
- **Privacy and recovery:** selection is local UI state. Existing entries, plan blocks, schema, backup, Markdown, account, network and offline boundaries remain unchanged; switching between records and day planning preserves both the selected date and the expanded upper date context.
- **Verification and removability:** browser regression covers removal of the arrow component, full-surface horizontal-swipe date/month updates, stable paper/header/actions, complete localized target dates, left/right fixed offsets, strict final-distance threshold and retreat cancellation, warm-graphite computed colors, month-grid and month-track alternatives, preserved vertical scrolling, protected inputs/dialogs, Plan round trips, reduced motion, keyboard month navigation, signal dots, 44px targets, open-calendar viewport resizing, and the 320/360/361/389/390/426/600/671/700/768/1280 boundary widths. The gesture and date plate remain an isolated UI hook/surface and can be revised without migrating raw data.
- **Exit condition:** rework or remove the expansion if it obscures record access, loses the selected date on return, fails to reduce the path to two actions for another day's records, or creates mobile overflow.

### LN-066 / LN-036 admission: required account identity and automatic revisioned saving

- **Core-loop contribution:** gives users a recoverable domestic-network-friendly email/password identity and makes database persistence the normal result of recording, without delaying the local write on a slow or unavailable network.
- **Evidence:** the product owner clarified first that a local fake identity is insufficient, then explicitly simplified the product to “not logged in, cannot use.”
- **Default cost:** the root route and every management route share one mobile account gate. The public distribution exposes email/password and Google; an explicitly configured Meituan-internal distribution replaces those visible entries with one Meituan SSO action and hides Google Calendar. After authentication, no extra cloud-enable or save action is required.
- **Privacy and recovery:** Supabase-compatible Auth handles sessions and, where enabled, passwords; Log Note never stores passwords, SSO secrets, MIS/employee identifiers or access tokens in record data, backups or logs. Text records, plans, structure, and settings write to an account-scoped local cache first, then debounce-save one versioned JSON document behind per-user RLS and compare-and-swap revision checks. Storage ownership remains the verified stable user ID; company claims are display metadata unless a separately reviewed owner model says otherwise. Each account also owns a separate local attachment namespace. Image Blobs remain local and their references are omitted from the cloud payload. Unknown legacy data is never silently uploaded: an empty cloud requires an explicit adopt/fresh choice, while a non-empty cloud wins on a new device. RLS is account isolation, not end-to-end encryption.
- **Verification and removability:** pure credential, cache-key, reconciliation and cloud-document tests; authenticated/unauthenticated responsive browser coverage; stale-revision refusal; two-user RLS reversal; real email and Google login/logout; and authenticated offline regression. A conflict pauses cloud writes and offers “use cloud” or an explicit “keep this device” overwrite after a complete rollback download.
- **Exit condition:** pause automatic saving if text-only scope is mistaken for image backup, conflict handling cannot prevent silent overwrite, account switching leaks caches, or authentication weakens offline reliability on an already authenticated device.

### LN-067 admission: explicit Google Calendar plan sync

- **Core-loop contribution:** improves browse and planning by keeping intended time blocks beside the daily record without turning the record surface into a general calendar.
- **Evidence:** the product owner explicitly requested that Log Note plans synchronize with Google Calendar after using the local day-plan surface.
- **Default cost:** connection, status and manual refresh live only inside Account settings. The home page gains no permanent sync control; Google events reuse the existing Plan surface.
- **Privacy and recovery:** Calendar permission is requested separately from Log Note sign-in. The Google access token stays in page memory and is never written to Log Note state, Supabase, backups or the Service Worker. Google event cache is account-scoped and local-only. Clearing it never deletes records or local plans.
- **Authority and reversibility:** Log Note is authoritative only for Google events carrying its private `logNoteManaged` marker. Existing Google events are read-only in Log Note. A missing local plan may delete only a marked Log Note event; unmarked Google events are never modified or deleted.
- **Verification and removability:** pure mapping and reconciliation tests cover time zones, multi-day display, all-day events, idempotent updates and managed deletion. Browser tests use fake Google clients. The provider, cache and settings section can be removed without migrating entries or local plan content.
- **Exit condition:** return the feature to isolation if users mistake read-only Google events for editable Log Note plans, authorization harms the offline core loop, sync produces unexplained duplicates/deletions, or the connection is rarely used during the evidence window.

## The model: domain, category, template

The product has three independently managed layers:

```text
Domain → Category → Template → Template fields
```

- A **domain** is a broad area of life, such as Daily, Health, Learning, or Trading.
- A **category** belongs to exactly one domain and is the record’s organizational home.
- A **template** belongs to exactly one category and defines how a record is captured: its input mode, default tags, prompt, fields, and—when applicable—schedule.
- Template **fields** are an ordered array. That same order drives the entry form, composed content, and Markdown output.

Domains, categories, and templates are separate concepts; categories are not encoded as `parent · child` names. Their hierarchy and sibling order are maintained in versioned JSON and in Settings → Record setup.

## Recording modes

### Linear records

Linear records capture something that happened or was noticed at a time. They appear in the compact timeline and can be reviewed in a grouped-by-domain view. A free-text template is the lowest-friction default, while structured templates can collect text, long text, a number, an option, a rating, and required values.

### Periodic records

Periodic records capture a recurring check rather than another timeline event. A periodic template has one of three cadences:

- **Time point** — expected at a given local time, for example morning weight.
- **Daily** — one check associated with a day.
- **Weekly** — one check associated with a weekday.

They are displayed in their own section and ordered by the template’s configured order. This distinction keeps recurring health or rhythm checks legible today and gives later review systems a reliable periodic signal.

## Current user flow

1. Sign in with email/password or Google. A new device loads the account once; a previously authenticated device may continue from its isolated cache offline.
2. On the record page, tap `+` to create a note with the current date and time.
3. Keep the default quick template for an immediate note, or select a relevant template.
4. Save, then edit or delete the entry from the timeline when needed. Each successful local change schedules an automatic revision-checked cloud save.
5. Read the compact selected-date text beside the editorial `Time / Category` title, and use the hand-drawn Calendar button on the right rail to expand or collapse the bounded month picker. The visible brand/language cluster, wide search field, standalone Record setup control, and old title divider are omitted. Swipe horizontally to move by day while collapsed and by month while open; the seven-column grid and fixed previous/current/next month row remain direct, keyboard-accessible alternatives. On mobile, one generated full-height right rail carries Search, Calendar, Settings, Diary/Plan, and the current mode's export/add actions on a shared axis. Category view indexes the real domains rendered for the selected date; Time indexes the visible Record section when ordinary entries exist and each visible periodic domain without repeating those domain names as left headings. When there are no ordinary entries, Time omits the Record heading and its explanatory empty state entirely, then begins the fixed-record surface without an orphaned rule. Nodes scroll to matching sections, align with in-range headings, gather in stable order at the directory edges when headings leave the readable window, and fall back to internal scrolling only when full `44px+` targets no longer fit. Empty states create no node without matching content. Entering Plan hides Diary-only export/new-record, section-directory, and organizer controls, keeps the rail, and aligns the existing add-plan action to it without resetting the selected date or record view. When Google Calendar is explicitly connected, local plans synchronize to marked events in the primary calendar and existing Google events appear read-only in the same Plan surface.
6. Use Settings → Record setup to manage domains/categories or to define templates and their fields. The fixed-record Adjust link opens the same panel in periodic focus mode; legacy `/templates` URLs remain compatible.
7. Reorder the structure with an accessible drag handle, keyboard drag, or move controls. Moving a template to another category updates historical entries to that category; moving a category to another domain changes its domain through the category relationship.
8. Open Settings from the right rail as a current-page paper tool layer while the selected diary remains mounted underneath. Settings is organized by six user tasks: General, Account, Download, Restore, Images, and Record setup. Desktop keeps a left rail with one active work panel; mobile opens on the complete six-item index and drills into one full-width detail page. Closing returns to the same date, mode, scroll position, and rail control. The direct `/settings` route remains compatible; `/settings#record-setup` with optional `focus=periodic` remains canonical for external/direct entry, `/templates` remains a compatibility redirect, and `#structure` still targets Download. Account, backup, recovery protection, and portable/JSON boundaries remain unchanged.

The record page defaults to English and can switch to Simplified Chinese. Interface language changes never rewrite or translate user-recorded content.

## Initial data

For demonstration and regression coverage, a first-run state includes **14 non-empty records** from `2026_08_11.md`. Their stored content and source-line metadata are retained exactly. The source file itself is not changed. Empty lines and incomplete fixed values (for example a weight with only the unit) are not seeded.

## Export contract

- Current-day and all-date Markdown are reading/archiving exports.
- A full JSON backup contains the complete versioned text state: domains, categories, templates, Markdown settings, entries, local plan blocks, and attachment references. It never embeds image bytes or external-service credentials.
- A portable `.lnbackup` package contains that state plus each referenced local image and a SHA-256 checksum. It is the supported artifact for moving records with images between browsers or devices.
- Structure JSON contains only domains, categories, templates, and Markdown settings. A general structure JSON example is provided for customizing the model outside the UI.
- Local plan blocks are not emitted into readable Markdown or Structure JSON; they remain a separate planning layer and may later reference an explicitly connected external calendar.
- Markdown formatting is user-configurable: grouped hierarchy or flat timeline, headings, entry line, date heading, and date separator.

## Account-owned offline boundary and recovery

The MVP stores an authenticated account's active versioned text state and local plan blocks in an account-scoped browser `localStorage` key. Optional image Blobs live in the same IndexedDB database but carry an owner namespace, so cleanup and display cannot cross accounts. Supabase Auth provides email/password or Google identity. After login, the app reads the account's cloud document, keeps the local cache responsive, and automatically debounce-saves text state to Postgres. Compare-and-swap revisions prevent last-write-wins: an unexpected remote revision pauses synchronization until the user selects a version. There is no automatic three-way merge or remote image bucket. A separately granted Google Calendar access token remains in page memory only; read-only Google event context uses a separate account-scoped local cache and is omitted from Supabase documents and backups. Image references are metadata only and are omitted from cloud payloads; images are limited to JPEG/PNG/WebP, 5 MiB each and 50 MiB per local account namespace, and remote URLs are never loaded as images. Users with images should keep exporting the portable attachment backup.

If local data is malformed or cannot be migrated, the app retains the original payload and blocks automatic writes instead of replacing it with default data. A user-confirmed restore of valid JSON can resume persistence. An explicit reset capability exists in the data layer for a future confirmed reset surface; defaults are never written merely because loading failed.

## Future decisions still open

The current primary user and mainline boundary are decided above. The product is intentionally not yet positioned beyond a personal, local-first recording tool. These later expansion decisions still require product-owner input and evidence from sustained use:

1. Should future value center on personal reflection, health rhythm review, trading/work learning, or a broader life log?
2. What evidence would justify expanding from the author to a defined group with shared recording needs?
3. If AI is later approved, should its first tested role summarize, ask follow-up questions, detect patterns, or propose behavioral adjustments?
4. When evidence justifies it, should the current whole-document revision model evolve into record-level merging and cloud image storage?
