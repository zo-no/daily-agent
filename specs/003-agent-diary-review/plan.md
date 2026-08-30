# Implementation Plan: In-page Agent Diary Review

**Board Item**: `LN-074` | **Date**: 2026-08-22 | **Spec**: [spec.md](spec.md)

## Summary

Keep the transient row-local Agent session while applying the latest product-owner screenshot correction. Reuse all existing data, authentication, and write boundaries; change only the Diary row-local visual hierarchy and proximity. Search / Calendar / Settings / Export remain icon-only in the right-side lane; the source record remains the page's dominant `16px` content, while the annotation recedes and aligns to the actual record text edge rather than its padded body container. No persisted chat or schema migration is introduced.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: existing AI SDK/Zod/Supabase authentication and current React/CSS stack; no new dependency
**Storage and Ownership**: session state in Home only; confirmed writes use the existing account cache and revisioned Supabase document
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: local fallback anchors within 2 seconds; remote request keeps existing timeout/rate limits
**Constraints**: local-first, account isolated, revision safe, offline capable, backup compatible
**Scale/Scope**: one selected day, ordinary records only, existing categories only, eight responsive widths

## Source-of-Truth and Readiness Check

- [x] LN-074 exists and this work is a bounded interaction rework using LN-069/LN-071 foundations.
- [x] `product.md` and `DESIGN.md` receive durable admission/interaction wording.
- [x] `DESIGN.md`, `设计规范/AGENTS.md`, visual, motion, and record-page specs were read.
- [x] Dirty-tree inspection completed; edits are limited to feature artifacts and Agent-related home/AI/test/docs paths.
- [x] One writer owns the main checkout.

## Constitution Check

- [x] Quick-record steps and the home page's primary job remain unchanged.
- [x] Offline use, account ownership, and revision safety are preserved.
- [x] Raw notes change only after explicit confirmation and category change is reversible.
- [x] Requests are minimal; sessions are transient; backups and restore are unchanged.
- [x] Unit, browser, PWA, design, and full-gate tests are mandatory.
- [x] The feature is a removable single-day slice without persisted observations.
- [x] No commit, push, deploy, destructive action, OKR change, or worktree merge is required.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/page.js` owns the home helper, current-day data, `commitData`, composer, Plan/date/tool state.
- `src/app/home-record-views.js` renders ordinary rows in both Time and Category views.
- `src/app/home-timeline.css` owns open-paper rows and helper geometry.
- `src/lib/daily-review-*` provides selected-day minimal requests and deterministic chronology fallback.
- `src/lib/ai-classifier-route.mjs` provides authenticated origin/body/rate/timeout protections and existing-category normalization.
- `src/app/api/organize/review/route.js` is the current authenticated review endpoint.
- `tests/ai-daily-review-route.test.mjs`, `tests/daily-review-model.test.mjs`, and `e2e/run-mobile.mjs` are the regression foundations.

### Reuse and Compatibility Decisions

Keep `/organize` unchanged as a direct fallback. Add an Agent-specific model/provider/route so chronology and classification contracts are not weakened. Reuse `commitData` for explicit writes and current category objects for allowlisting. No storage version or backup field changes.

## Proposed Design

### Data and Control Flow

1. Home activates a transient session and sends selected-day `id/time/content` plus bounded existing category IDs/names.
2. The provider returns allowlisted review items (`question`, `category`, or `note`) associated with one record; Home reconciles the response once more against the latest selected-day entries and category list, dropping invalid, duplicate, unknown, or already-current category items before rendering.
3. Home anchors the Agent to the current row, scrolls it into view, and expands `AgentDiaryReview` beneath the row.
4. A short user response can be sent back with only the source record, current item, and bounded session messages. The response returns conversational text plus optional proposed append text.
5. Only explicit append/new-record/category actions call `commitData`; keep/dismiss only advances the transient queue.
   If a rendered category suggestion has become current before confirmation, Home reports the no-op and advances without calling `commitData`.
6. Switching date/mode/tool or unmount aborts the request and clears session state.

### Trust and Privacy Boundaries

- Browser → same-origin server: date, locale, current-day record `id/time/content`, bounded existing category `id/domainName/name`, and for replies only the active record/item plus short messages.
- Supabase access token authenticates the request; DeepSeek key stays server-side.
- Server output is schema validated, length bounded, record/category allowlisted, deduplicated, and never logged with private text.
- Offline/no token/no key/timeout returns local ambiguity candidates based on short/vague text; it never fabricates conversation or blocks editing.

### UI and Interaction Contract

- Existing helper becomes a button. Idle → scanning → reviewing → complete/error.
- In Time and Category views the active item is inserted immediately after its record row; no modal, drawer, or card wall.
- The idle wake illustration remains the optional entry, but active Diary review renders no travelling child overlay. Plan Agent remains isolated and unchanged.
- The active row uses `aria-current` and immediate annotation adjacency. The dashed/long source underline is removed; keyboard focus retains its separate full-row loop.
- Resolution actions use compact borderless 44px text targets aligned to the annotation's right edge, with a restrained accent-text primary state instead of segmented or filled/outlined blocks.
- Search/Settings/Calendar/Plan/date change stop the session. Quick add/export and rail geometry remain stable.
- At mobile widths the empty closed-calendar context contributes no standalone vertical band; the first record section starts after a 24–32px region gap.
- The annotation starts on the record-content reading axis, stays clear of the rail, and collapses the idle helper slot while a row review is active.
- The conversation uses one short corner/tick accent instead of a tall three-sided bracket, and the action group follows the same reading axis.
- Search, Calendar, Settings, and Export use the existing hand-drawn icon family as icon-only controls in the lane immediately right of the shared binding line. Their hit areas remain at least 44px and visually center on the glyphs; accessible names and active/focus state remain. Export crops to the single download glyph rather than exposing the rejected double ring.
- On mobile, the source record stays `16px` full-ink Sans. The annotation stays in the same Sans reading system but recedes to a `13px` muted question, `12px` category/action/placeholder chrome, a `10px` Mono role label, and `11px` progress. The textarea itself stays `16px` to prevent mobile focus zoom; quietness never comes from shrinking hit areas.
- Mobile alignment uses one source-reading axis for prompt/category/reply. A short `2px × 24px` source marker sits about `12px` to its left; progress and close move to the upper right. Actions terminate on the conversation right edge without creating a second left-aligned content block.
- The reading axis is measured from `.entry-content`, not `.entry-body`. Prompt-to-category uses about `6px`, category-to-reply remains `2–8px`, reply-to-actions is at most `4px`, and the annotation ends `8–14px` before the next record. Its right edge and the right-side icon lane remain fixed, and Plan Agent keeps its existing geometry.
- At `320–420px`, active Diary review bottom-anchors the title/summary inside the existing protected header, uses a `42px` time column plus `10px` content inset, keeps ordinary/fixed one-line rows near `56px`, preserves full reply width, places one/two unresolved actions in one compact row immediately below it, and gives fixed-record tools only a `28px` visual slot while preserving the real 44px Adjust target above the first field.

## Rework 13: Category Copy De-duplication

The category path is a result label, not part of the question. Keep the local fallback and normalized remote category prompt generic in both locales, instruct the remote model not to repeat the path, and retain the existing `Domain / Category` label as the sole concrete destination. This is a copy-only correction: no request fields, persistence, action, layout, or account boundary changes.

## Rework 15: Category Queue Reconciliation

Treat server normalization as one safety layer, not the final view state. Reconcile every returned review item against the latest client entries and categories before opening the queue. Category suggestions that are already current are not actionable and are removed; if state changes after the queue opens, confirming the stale suggestion becomes an explicit no-write success with localized feedback and advances. Valid category changes keep the existing local-first write and undo path.

## Project Structure and Write Set

```text
Read/reuse: src/lib/ai-classifier-route.mjs, src/lib/daily-review-*.mjs,
            src/app/organize/*, src/app/use-log-note-data.js
Change:     PROJECT_BOARD.md, product.md, DESIGN.md,
            src/app/page.js, src/app/home-header.css, src/app/home-record-views.js, src/app/home-timeline.css,
            src/app/home-fixed-records.css,
            src/app/agent-diary-review.js, src/lib/agent-review-model.mjs,
            src/lib/agent-review-provider.mjs, src/lib/agent-review-route.mjs,
            src/app/api/organize/agent/route.js, src/lib/i18n.mjs,
            tests/agent-review-model.test.mjs, tests/ai-agent-review-route.test.mjs,
            e2e/run-mobile.mjs, public/sw.js, specs/003-agent-diary-review/*
Exclude:    schema/migrations, account/auth flows, backups, images, Plan/Calendar logic,
            unrelated screenshots and dirty user assets
```

**Integration Order**: model/tests → route/provider/tests → row component → Home state/write integration → CSS/i18n/PWA → E2E/docs/gates.

## Test and Evidence Plan

### Automated Regression

- Unit/model/contract: allowlists, local fallback, invalid IDs/categories, duplicate/unknown review items, same-current category reconciliation, reply normalization, input limits, auth/origin/rate/timeout.
- Browser/mobile: wake, scan, row anchoring, casual reply, append/new/keep/category/undo, stale same-current no-write advance, cancellation, Plan/empty/offline, reduced motion, eight widths.
- Focused composition assertions: closed-calendar gap, content-column annotation alignment, zero active-review helper spacer, no Diary traveller, no dashed source underline, one short source marker, borderless right-aligned text actions, icon-only utilities/export in the right-side rail lane, computed source/question/category/action/role hierarchy, upper-right progress/close separation, 6px prompt/category pairing, 16px mobile input, and 44px targets.
- Density assertions: 12–16px active header gap, 52px one-line active source row, one unresolved action sharing the reply row, one-row three-action resolution at 390px, and no more than 16px section separation before fixed records without shrinking 44px targets.
- Compact-grid assertions: no more than 18px from Agent summary to Record heading, no more than 52px source gutter, 56px ordinary/fixed rows, 28px fixed-tool header/first-row offset, and unchanged right rail/Plan Agent.
- Reply-usability assertions: textarea width at least 220px at 390px and 160px at 320px, one right-aligned unresolved-action row 0–4px below the input, 44px action/close targets, a visible 28px close surface with prompt clearance, and no overflow.
- PWA/offline/account: Agent assets cached; offline fallback does not block current CRUD; no session persistence.
- Design validation: update durable motion/page rule and run `npm run design:check`.
- Full gate: `npm run check`.

### Real-Environment or Manual Evidence

The product owner reviews real Chinese diary wording and whether the moving Agent feels helpful rather than distracting. Automation uses mocked/private-safe inputs and does not send real notes.

### Acceptance Evidence Handoff

Record focused test counts, final `npm run check`, responsive screenshots for idle/question/category/complete at 390 and 1280, and remaining real-model wording/14-day adoption checks in `PROJECT_BOARD.md`.

## Rollback, Removal, and Migration

No migration. Removing the Agent route/provider/component and restoring the helper link returns the prior `/organize` flow. Confirmed record/category changes are ordinary supported data and remain valid.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Transient Agent session state machine | Associates scanning, row focus, conversation, and cancellation safely | Reusing `/organize` cannot provide the requested in-context movement |
| Agent review response contract | Supports questions and category suggestions without weakening existing read-only chronology | Free-form chat output cannot be safely tied to record/category allowlists |
| Row insertion point in both views | Keeps the conversation beside its source record | A global chat drawer loses record context and duplicates a separate page |
