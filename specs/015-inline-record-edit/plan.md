# Implementation Plan: Inline Record Editing

**Board Item**: `LN-080` | **Date**: 2026-09-04 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

Existing free-text ordinary records will replace their content cell with the compact textarea when the
content itself is activated; the separate pencil is removed. Activating the leading stored-record time opens
the canonical complete `RecordComposer` dialog, not a time-only popover. The existing detailed inline
`RecordComposer` remains available only while Diary Agent owns an `enrich-detail` follow-up for that source
row: Done saves the author-edited record and advances, while Cancel keeps the original and advances. No
schema, route, dependency, network, sync, or backup change is introduced.

The latest owner rework replaces the stream-level add button with a single quiet quick-add row. Its local
clock ticks at second precision while idle, freezes on input focus, refreshes when its time is activated,
and saves a new ordinary record on blur or Enter through the same `commitData` boundary. Legacy minute-only
times remain readable and editable.

## Rework Change Contract — 2026-09-04 Owner Correction

```yaml
work_item: LN-080
outcome: Stored-record time opens the complete composer dialog; free-text content directly opens the compact inline textarea; the pencil is removed; the detailed inline composer is reserved for Diary Agent enrich-detail follow-up with Done-save-and-advance and Cancel-keep-and-advance.
write_set: PROJECT_BOARD.md, product.md, ARCHITECTURE.md, DESIGN.md, design-qa.md, the canonical record-page standard, specs/015-inline-record-edit/**, src/app/_components/home/home-page.js, src/app/_components/home/home-record-views.js, src/app/_components/home/home-timeline.css, src/app/entry-composer.css, src/app/record-time-editor.js deletion, src/lib/record-inline-edit-model.mjs, src/lib/i18n.mjs, tests/record-inline-edit-model.test.mjs, and e2e/run-mobile.mjs
exclusions: structured raw-text editing, fixed/periodic record editing, quick-add behavior, lower action dock, Diary Agent classification and Plan Agent behavior, provider/routes, settings, calendar review behavior, schema migration, persistence mechanism, sync, export format, backup format, .specify/feature.json, and unrelated dirty files
public_contracts: the canonical RecordComposer remains the only complete form; stored-time activation selects its dialog presentation; enrich-detail Agent ownership selects its inline presentation; direct free-text blur-save remains a content-only commitData patch
invariants: only one edit surface, Done-only complete writes, Cancel/Escape/stale zero-write, Agent Cancel equals keep-original-and-advance, 44px targets, local-first writes, account isolation, offline use, raw-note integrity, attachment staging, backup compatibility
verification: focused LN-080 browser regression, focused Diary Agent regression, npm run design:check, npm run check, git diff --check, and 390px visual comparison
open_evidence: product-owner preference on the refreshed real mobile page
```

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing React state, `RecordComposer`, `StructuredFields`, attachment draft
helpers, i18n, and `commitData`; no new dependency
**Storage and Ownership**: Existing authenticated account document and account-scoped attachment store;
quick/dialog/Agent-linked drafts remain transient component state
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: Authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: Opening direct text or the complete dialog performs no network request; the
Agent-linked editor uses the already-active review item and dispatches no new proposal request
**Constraints**: Local-first, account isolated, revision safe, offline capable, backup compatible, one active
editor surface, second-precision quick-add time, and blur-save only for deliberate compact inputs
**Scale/Scope**: One selected day, one active ordinary record, Time and Category views, widths
320/390/426/768/1280; existing record data volume and ordering limits remain unchanged

## Source-of-Truth and Readiness Check

- [x] The `LN-080` board item exists with clear outcome, permissions, acceptance, and verification.
- [x] `product.md` will receive the durable admission decision before application behavior changes.
- [x] `DESIGN.md`, `docs/设计规范/AGENTS.md`, the design index, and the record-page standard were read.
- [x] The dirty tree was inspected; existing LN-079, Agent extraction, documentation, package, and local
      evidence changes are unrelated and will be preserved.
- [x] This session is the sole writer; no sub-agent or second worktree owns overlapping files.

## Constitution Check

- [x] Existing-record correction becomes lighter; new-record opening and save step counts are unchanged.
- [x] Authenticated offline use, account ownership, and stale-revision safety reuse `commitData` unchanged.
- [x] Direct free-text changes only after valid blur-save; complete and Agent-linked drafts change stored
      text only after Done. Cancel/Escape/context invalidation remain zero-write.
- [x] No new privacy/network/schema boundary exists; backups and restore keep the current record shape.
- [x] Focused Node/browser regression, design validation, mobile review, and `npm run check` are mandatory.
- [x] This is the smallest complete slice that preserves text, time, details, attachments, and delete access.
- [x] No commit, push, publish, deploy, deletion, reset, history rewrite, OKR change, or merge is authorized.

Post-design check: all gates remain satisfied. The only added state distinguishes dialog and Agent-linked
inline presentation; writes delegate to the current canonical complete save or the existing content-only
quick-edit patch.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/_components/home/home-page.js` owns selected date/view, one record `draft`, attachment lifecycle, `saveEntry`,
  `deleteEntry`, Agent cancellation, and canonical `commitData` writes.
- `src/app/_components/home/home-record-views.js` renders each ordinary entry in both Time and
  Category views; `onOpenEntry` currently opens the editor draft.
- `src/app/record-composer.js` owns free-text/structured editing, Markdown selection tools, Hero
  improvement, progressive details, attachment actions, delete, explicit Done, and cancellation.
- `src/app/dialog-surface.js` supplies the modal/backdrop/focus-trap wrapper currently used by every
  `RecordComposer` instance.
- `src/app/_components/home/home-timeline.css` and `src/app/entry-composer.css` own open-paper row and editor geometry.
- `src/app/_components/home/use-draft-attachments.js` stages attachment changes until save or discard.
- `src/lib/data.mjs` and `src/app/log-note-data-provider.js` retain record shape, local-first persistence,
  account isolation, and revision-checked synchronization.
- `e2e/run-mobile.mjs` contains the existing add/search/edit/delete, structured record, Markdown,
  attachment, Agent, focus, and multi-width journeys that must be updated rather than bypassed.

### Reuse and Compatibility Decisions

- Keep one form implementation: `RecordComposer` uses its dialog wrapper for new records and stored-time
  activation, and its inline wrapper only for an Agent `enrich-detail` item.
- The row remains the stable `data-entry-id`/Agent anchor. Its content and time become separate real buttons
  to avoid nested interactive controls when the form is mounted.
- `saveEntry`, `deleteEntry`, attachment staging, template localization, required-field checks, Hero
  proposal state, and record serialization stay canonical.
- The existing validator continues accepting legacy `HH:mm` and second-precision `HH:mm:ss` for quick add;
  the obsolete time-only merge and popover are removed.
- Old records, deep links, search selection, exports, backups, sync, and ordering remain compatible.
- `localTime` remains minute precision for existing callers; a dedicated second-precision formatter owns
  the quick-add clock. Validators accept both legacy `HH:mm` and new `HH:mm:ss` record times.

## Proposed Design

### Data and Control Flow

```text
Click free-text content
  → stop active Diary Agent review
  → close any complete/Agent-linked draft through the existing discard guard
  → replace only the current content cell with one focused textarea
  → blur with valid changed text → one content-only commitData → return to read state
  → Escape / empty / failed persistence → zero write; cancel or retain the input as applicable

Click structured record content
  → stop active Diary Agent review and use the complete-dialog fallback

Click leading stored-record time
  → stop active Diary Agent review
  → close/cancel any compact or Agent-linked draft through the existing discard guard
  → copy the stored entry into the existing draft boundary
  → mount the shared complete editor in DialogSurface
  → Done → existing validation + saveEntry + attachment finalization + commitData
  → Cancel/Escape/context invalidation → discard staged attachment changes + no commitData

Diary Agent enrich-detail item becomes active
  → copy its source record into the existing draft boundary without stopping the Agent
  → mount the shared detailed editor inline with the Agent question visibly attached
  → Done → existing complete save + attachment finalization → advance review
  → Cancel → discard draft/staged attachments → keep original → advance review
  → stop/stale/context replacement → discard without write
```

Only one quick input, complete dialog, or Agent-linked row draft exists. A successful complete save naturally
re-runs existing derived sorting for both views. A source/account/date/view replacement invalidates transient UI state.

```text
Inline quick-add idle
  → local HH:mm:ss ticks once per second
  → input focus freezes the displayed timestamp
  → leading time activation refreshes timestamp to now and restores input focus
  → non-empty blur / Enter → one ordinary-record commitData → clear → resume clock
  → empty blur / Escape → zero write → clear/resume as applicable
  → persistence failure → retain timestamp and content for correction
```

### Trust and Privacy Boundaries

- Browser-only local state receives the selected stored record and draft fields already used by the editor.
- The existing account-scoped `commitData` boundary receives the complete explicit record save or one
  content-only direct-text patch.
- Attachment Blob staging continues through the current account-scoped helper and is finalized only after
  the record save succeeds.
- No service, Route Handler, Provider, analytics sink, or new log receives record data.
- The existing optional Hero request boundary is unchanged and remains available only inside a free-text
  draft under its existing LN-078 rules.

### UI and Interaction Contract

- Reading state: time and content are separate controls inside one open-paper row; the pencil is absent.
- Ordinary read rows use compact vertical rhythm without decorative horizontal rules. In the populated idle
  stream, a time/input quick-add row follows the ordinary records and saves directly through the canonical
  write boundary; empty and active-review states retain their established spacing.
- Free-text content activation: only the current content cell becomes a compact textarea. Valid changed text saves on
  blur, Escape cancels, and empty/failed save keeps the stored record safe. The initial swap preserves row/body
  height, the text start axis, and the following record position; only newly entered lines may grow the row.
- Structured content and stored-time activation open the canonical complete dialog; no time-only popover exists.
- An Agent `enrich-detail` item expands the source row just enough for the shared detailed editor. The Agent
  question stays above the form; Done saves and advances, Cancel keeps the original and advances.
- Escape closes the innermost compact/dialog/Agent-linked state.
- Closing restores focus to the originating content/time control when it remains mounted.
- All actions remain at least 44px, with visible focus, localized names, no nested buttons, and deterministic
  reduced-motion behavior.
- On narrow screens the Agent-linked inline editor uses the writing column width; the complete dialog keeps
  its existing responsive containment.

## Project Structure and Write Set

```text
Read:
  AGENTS.md
  PROJECT_BOARD.md
  product.md
  ARCHITECTURE.md
  DESIGN.md
  docs/设计规范/**
  specs/013-composer-content-improvement/**
  src/app/_components/home/home-page.js
  src/app/_components/home/home-record-views.js
  src/app/_components/home/agent-diary-review.js
  src/app/record-composer.js
  src/app/_components/home/use-draft-attachments.js
  src/app/_components/home/home-timeline.css
  src/app/entry-composer.css
  e2e/run-mobile.mjs

Write:
  PROJECT_BOARD.md
  product.md
  DESIGN.md
  docs/设计规范/规范/页面/记录与结构管理页面规范.md
  specs/015-inline-record-edit/**
  src/lib/data.mjs
  src/lib/record-inline-edit-model.mjs
  src/app/_components/home/home-page.js
  src/app/_components/home/home-record-views.js
  src/app/record-composer.js
  src/app/record-time-editor.js (delete obsolete time-only surface)
  src/app/_components/home/home-timeline.css
  src/app/entry-composer.css
  src/lib/i18n.mjs
  tests/record-inline-edit-model.test.mjs
  e2e/run-mobile.mjs

Exclude:
  record schema/migrations, providers/routes, sync/storage implementations, Plan/fixed-record editors,
  Diary Agent classification and Plan Agent business logic, right-rail geometry, package dependencies,
  service worker assets, generated
  output, deployment, git history, and all unrelated dirty files
  .specify/feature.json (currently owned by another active feature pointer)
```

**Integration Order**: One writer updates durable contracts, adds failing focused regressions, rewires row
targets and draft presentation state, binds the detailed inline form to Agent `enrich-detail`, removes the
obsolete pencil/time-only surface, resolves scoped CSS, runs focused checks, then runs the full gate and
records exact evidence. It may mark Returned only if the complete gate passes.

## Test and Evidence Plan

### Automated Regression

- Unit/model/contract tests: `tests/record-inline-edit-model.test.mjs` continues covering valid/missing/invalid
  legacy and second-precision times used by quick add; obsolete time-only merge assertions are removed.
- Browser/mobile tests: update `e2e/run-mobile.mjs` to cover direct content input and no pencil, exact
  blur-save/Escape/no-write, stored-time activation of the complete dialog, structured fields, More/category/
  tags/attachments/delete, Agent-linked Done/Cancel transitions, Agent stop, search/deep-link entry, and
  Chinese/English.
- Responsive evidence: the focused journey asserts 44px targets, no nested interactive controls,
  no overflow, and no rail/dock collision at 320/390/426/768/1280px.
- PWA/offline/account tests: existing full gate must prove authenticated offline persistence, attachment
  ownership, account generation, backup/restore, and controlled update remain green.
- Design validation: update the one canonical record-page rule, run `npm run design:check`, and inspect the
  focused 390px Time/Category direct-input, complete-dialog, and Agent-linked editor captures.
- Full gate: `npm run check`, followed by `git diff --check` and a scoped diff audit.

### Real-Environment or Manual Evidence

The product owner must compare the 390px installed-PWA Time and Category direct-text flow, complete dialog
opened from time, and Agent-linked editor against the supplied references, and verify a real attachment
edit/delete flow. This subjective preference is not automated acceptance.

### Acceptance Evidence Handoff

Record focused test counts, full gate stages, exact screenshot paths, width matrix, zero-write cases,
changed-file audit, and remaining owner review in the LN-080 board row. Keep the item In progress while
any required gate is red; after every gate passes, mark only Returned because independent controller
verification is still required for Accepted.

## Rollback, Removal, and Migration

No data migration exists. Legacy `HH:mm` values remain valid while new quick records may store `HH:mm:ss`.
Reverting the quick-add row to the former button and removing the second-precision formatter restores the
previous add surface; stored records and attachments remain readable because their shape and persistence
path never changed.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Agent-owned inline presentation for the existing editor | Preserves Hero, details, attachments, delete, and one validation path while binding follow-up to its source | A second Agent answer form would separate the question from the record being corrected |
| Complete dialog from the stored-time target | Matches the owner's corrected meaning of “浮层” and keeps every current edit capability reachable | A time-only popover is the rejected interpretation |
| Two controls inside one semantic row | Gives time and content distinct actions without invalid nested interactivity | Keeping the whole row as one button cannot contain an inline form or expose independent time behavior |
