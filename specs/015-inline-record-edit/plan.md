# Implementation Plan: Inline Record Editing

**Board Item**: `LN-080` | **Date**: 2026-09-04 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

Existing ordinary records will edit inside their Time or Category row. The current editor form remains
the canonical content/details implementation but gains an inline presentation wrapper; only new records
retain the modal wrapper. Each record row becomes a semantic container with separate time and content
buttons. A small non-modal time editor anchors to the time button and commits a validated time-only patch
through the existing local-first boundary. No schema, route, dependency, network, sync, or backup change is
introduced.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing React state, `RecordComposer`, `StructuredFields`, attachment draft
helpers, i18n, and `commitData`; no new dependency
**Storage and Ownership**: Existing authenticated account document and account-scoped attachment store;
row/time drafts remain transient component state
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: Authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: Opening a row or time surface performs no network request and completes in one render
turn; inactive rows add no background work
**Constraints**: Local-first, account isolated, revision safe, offline capable, backup compatible, one active
editor surface, explicit save, no silent write
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
- [x] Stored text changes only after explicit Done; Cancel/Escape/context invalidation remain zero-write.
- [x] No new privacy/network/schema boundary exists; backups and restore keep the current record shape.
- [x] Focused Node/browser regression, design validation, mobile review, and `npm run check` are mandatory.
- [x] This is the smallest complete slice that preserves text, time, details, attachments, and delete access.
- [x] No commit, push, publish, deploy, deletion, reset, history rewrite, OKR change, or merge is authorized.

Post-design check: all gates remain satisfied. The only added state is transient presentation state; the
only write delegates to the current canonical record save or a validated time-only entry merge.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/page.js` owns selected date/view, one record `draft`, attachment lifecycle, `saveEntry`,
  `deleteEntry`, Agent cancellation, and canonical `commitData` writes.
- `src/app/home-record-views.js` renders each ordinary entry as one whole-row button in both Time and
  Category views; `onOpenEntry` currently opens the editor draft.
- `src/app/record-composer.js` owns free-text/structured editing, Markdown selection tools, Hero
  improvement, progressive details, attachment actions, delete, explicit Done, and cancellation.
- `src/app/dialog-surface.js` supplies the modal/backdrop/focus-trap wrapper currently used by every
  `RecordComposer` instance.
- `src/app/home-timeline.css` and `src/app/entry-composer.css` own open-paper row and editor geometry.
- `src/app/use-draft-attachments.js` stages attachment changes until save or discard.
- `src/lib/data.mjs` and `src/app/log-note-data-provider.js` retain record shape, local-first persistence,
  account isolation, and revision-checked synchronization.
- `e2e/run-mobile.mjs` contains the existing add/search/edit/delete, structured record, Markdown,
  attachment, Agent, focus, and multi-width journeys that must be updated rather than bypassed.

### Reuse and Compatibility Decisions

- Refactor presentation only: `RecordComposer` keeps one form implementation and chooses a modal wrapper
  for new records or an inline wrapper for existing records.
- The row remains the stable `data-entry-id`/Agent anchor. Its content and time become separate real buttons
  to avoid nested interactive controls when the form is mounted.
- `saveEntry`, `deleteEntry`, attachment staging, template localization, required-field checks, Hero
  proposal state, and record serialization stay canonical.
- A small pure helper validates `HH:mm` and returns a time-only record copy; it never invents or normalizes
  other fields.
- Old records, deep links, search selection, exports, backups, sync, and ordering remain compatible.

## Proposed Design

### Data and Control Flow

```text
Click record content
  → stop active Diary Agent review
  → close any time surface without write
  → copy the stored entry into the existing draft boundary
  → mount the shared editor form inside that row
  → Done → existing validation + saveEntry + attachment finalization + commitData
  → Cancel/Escape/context invalidation → discard staged attachment changes + no commitData

Click leading time
  → stop active Diary Agent review
  → close/cancel any row draft through the existing discard guard
  → mount one anchored non-modal time surface for that entry
  → valid Done → pure time-only merge → one commitData → close and restore focus
  → Cancel/Escape/outside/invalid/context change → no commitData → close and restore focus
```

Only one row draft or time surface exists. A successful time write naturally re-runs the existing derived
sorting for both views. A source/account/date/view replacement invalidates transient UI state.

### Trust and Privacy Boundaries

- Browser-only local state receives the selected stored record and draft fields already used by the editor.
- The existing account-scoped `commitData` boundary receives the complete explicit record save or one
  time-only immutable merge.
- Attachment Blob staging continues through the current account-scoped helper and is finalized only after
  the record save succeeds.
- No service, Route Handler, Provider, analytics sink, or new log receives record data.
- The existing optional Hero request boundary is unchanged and remains available only inside a free-text
  draft under its existing LN-078 rules.

### UI and Interaction Contract

- Reading state: time and content are separate controls inside one open-paper row; neither adds card chrome.
- Content activation: that row expands just enough for the shared editor. Done and Cancel appear first;
  Markdown tools and More remain progressive. Neighboring records stay visible.
- Time activation: a solid-paper, non-modal `role="dialog"` surface is positioned from the time cell,
  contains one `type="time"` input plus Done/Cancel, and never covers the edited row's content or right rail.
- Escape closes the innermost active row/time state. The time surface also closes on outside activation.
- Closing restores focus to the originating content/time control when it remains mounted.
- All actions remain at least 44px, with visible focus, localized names, no nested buttons, and deterministic
  reduced-motion behavior.
- On narrow screens the inline editor uses the writing column width; the time surface may shift inside the
  viewport while remaining visually anchored to the leading time.

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
  src/app/page.js
  src/app/home-record-views.js
  src/app/record-composer.js
  src/app/use-draft-attachments.js
  src/app/home-timeline.css
  src/app/entry-composer.css
  e2e/run-mobile.mjs

Write:
  PROJECT_BOARD.md
  product.md
  DESIGN.md
  docs/设计规范/规范/页面/记录与结构管理页面规范.md
  specs/015-inline-record-edit/**
  .specify/feature.json
  src/lib/record-inline-edit-model.mjs
  src/app/page.js
  src/app/home-record-views.js
  src/app/record-composer.js
  src/app/record-time-editor.js
  src/app/home-timeline.css
  src/app/entry-composer.css
  src/lib/i18n.mjs
  tests/record-inline-edit-model.test.mjs
  e2e/run-mobile.mjs

Exclude:
  record schema/migrations, providers/routes, sync/storage implementations, Plan/fixed-record editors,
  Agent business logic, right-rail geometry, package dependencies, service worker assets, generated
  output, deployment, git history, and all unrelated dirty files
```

**Integration Order**: One writer updates durable contracts, adds failing focused regressions, introduces
the pure time helper and time surface, enables inline composer presentation, rewires row controls/page
state, resolves scoped CSS, runs focused checks, then runs the full gate and records Returned evidence.

## Test and Evidence Plan

### Automated Regression

- Unit/model/contract tests: `tests/record-inline-edit-model.test.mjs` covers valid/missing/invalid times,
  unchanged identity, and exact preservation of every non-time record field.
- Browser/mobile tests: update `e2e/run-mobile.mjs` to cover no modal/backdrop for existing records, one-row
  edit, exact save, Cancel/Escape/no-write, time-only surface/save/reorder/cancel/outside/focus, structured
  fields, More/category/tags/attachments/delete, Agent stop, search/deep-link entry, and Chinese/English.
- Responsive evidence: the focused journey asserts 44px targets, no nested interactive controls,
  no overflow, and no rail/dock collision at 320/390/426/768/1280px.
- PWA/offline/account tests: existing full gate must prove authenticated offline persistence, attachment
  ownership, account generation, backup/restore, and controlled update remain green.
- Design validation: update the one canonical record-page rule, run `npm run design:check`, and inspect the
  focused 390px Time/Category row and time-surface captures.
- Full gate: `npm run check`, followed by `git diff --check` and a scoped diff audit.

### Real-Environment or Manual Evidence

The product owner must compare the 390px installed-PWA Time and Category edit flows with the former modal,
confirm the time surface feels like a fine adjustment rather than a second editor, and verify a real
attachment edit/delete flow. This subjective preference is not automated acceptance.

### Acceptance Evidence Handoff

Record focused test counts, full gate stages, exact screenshot paths, width matrix, zero-write cases,
changed-file audit, and remaining owner review in the LN-080 board row. Mark only Returned; independent
controller verification is still required for Accepted.

## Rollback, Removal, and Migration

No data migration exists. Reverting the row control split, inline presentation prop, time surface/helper,
and scoped styles restores the prior existing-record modal. Stored records and attachments remain readable
because their shape and persistence path never changed.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Inline presentation for the existing editor | Preserves structured fields, Hero, details, attachments, delete, and one validation path | A separate text-only editor would create a second incomplete save path and remove current capabilities |
| Separate time surface and pure time merge | Matches the product owner's narrow fine-tuning entry while proving unrelated fields stay exact | Reusing the full editor would retain the modal interruption; autosave would violate explicit-write safety |
| Two controls inside one semantic row | Gives time and content distinct actions without invalid nested interactivity | Keeping the whole row as one button cannot contain an inline form or expose independent time behavior |
