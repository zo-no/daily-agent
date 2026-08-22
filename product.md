---
status: active-mvp
created_at: 2026-08-11
updated_at: 2026-08-21
---

# Log Note product brief

## Product premise

Log Note is a quiet personal-recording tool. Its first job is to make recording an event, observation, or recurring check easy enough to sustain every day. A real Supabase account is required before the workspace opens; email/password is the primary path and Google is an alternative. Each account owns an isolated device cache and one revisioned cloud document. Changes save locally first and then synchronize automatically, while automatic interpretation remains out of scope. A user-triggered, isolated smart-organize workspace may ask a server-side DeepSeek classifier to propose one existing category for a record, with deterministic on-device rules as an explicit fallback; the category's parent domain supplies the visible “domain / category” path. It never runs in the background, creates structure or tags, rewrites raw notes, or saves a suggestion without confirmation.

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
- **Default cost:** on mobile the generated rail occupies a `2px` layout slot with an approximately `1px` optical stroke; idle/active marks render at `12px` inside unchanged `44px+` buttons. The picker begins directly after the title bar, while the fixed Search/Calendar/Settings controls remain above it and the first date row clears the Settings hit target; below `390px`, only the calendar's internal top padding grows enough to put weekday labels below Settings. Time view adds one Serif “Record” heading and uses a compact time column, one short per-row vertical hairline, and weak row rules. Fixed records group by their real domain heading and use metric/value rows on the paper surface. Visual domain/category ownership remains available to assistive technology but no longer appears as a capsule; genuine user `#tags` remain visible.
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

### LN-074 admission: session-only daily timeline review

- **Core-loop contribution:** improves browse by turning one selected day's scattered notes into a time-ordered account that remains traceable to the original records.
- **Evidence:** after using the single-day organizer, the product owner explicitly requested another AI capability: a first daily organization/summary version limited to sorting out time, rather than broader analysis or recommendations.
- **Default cost:** the existing secondary `/organize` workspace gains one compact two-task switch, with “Timeline review” as the default and existing category filing preserved beside it. The home page, composer, quick-record actions and required fields do not change.
- **Offline, privacy and recovery:** only the selected natural day's ordinary record `id/time/content`, the date and interface language may leave the browser through the authenticated same-origin route. Email, account ID, category structure, tags, attachments, plans, other days and the complete document are excluded. The server may return one short overview and time segments that cite request entry IDs; the UI always shows the cited original records, while the server removes invalid or duplicate references and restores omitted records with deterministic local timeline groups. Results are session-only, never rewrite or append to raw notes, never synchronize, and never enter JSON/Markdown/portable backups. Offline, unavailable, timed-out, rate-limited or invalid model output falls back to a local chronological view with no generated summary.
- **Verification and removability:** pure tests cover bounded inputs, schema failures, output allowlists, deduplication, chronological normalization, missing-time placement, authenticated request controls and browser fallback. Browser regression covers both tasks, date cancellation, source traceability and six responsive widths. The review provider, API route and task panel can be removed without migrating records or backups.
- **Exit condition:** keep isolated or remove if summaries cannot be traced back to source records, chronology is wrong, normal requests exceed 8 seconds, the feature is not reused during a 14-day observation window, or users expect behavioral interpretation that this time-only version deliberately does not provide.

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
- **Default cost:** the root route and every management route share one mobile account gate. Email/password and Google are the only entry paths. After authentication, no extra cloud-enable or save action is required.
- **Privacy and recovery:** Supabase Auth handles passwords and sessions; Log Note never stores passwords in record data, backups or logs. Text records, plans, structure, and settings write to an account-scoped local cache first, then debounce-save one versioned JSON document behind per-user RLS and compare-and-swap revision checks. Each account also owns a separate local attachment namespace. Image Blobs remain local and their references are omitted from the cloud payload. Unknown legacy data is never silently uploaded: an empty cloud requires an explicit adopt/fresh choice, while a non-empty cloud wins on a new device. RLS is account isolation, not end-to-end encryption.
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
