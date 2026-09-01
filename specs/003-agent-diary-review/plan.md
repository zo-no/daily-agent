# Implementation Plan: In-page Agent Diary Review

**Board Item**: `LN-074` | **Date**: 2026-08-22 | **Spec**: [spec.md](spec.md)

## Summary

Keep the transient row-local Agent session and its bounded classification/clarification behavior, but replace the hand-written server orchestration with an embedded Mastra Agent and Workflow. Reuse all existing data, authentication, normalization, explicit-write, and offline boundaries. Mastra runs inside the current Next.js server process; no separate Agent service, persistent memory, tool registry, or schema migration is introduced. Search / Calendar / Settings / Export geometry and the existing compact annotation treatment remain unchanged.

## Technical Context

**Runtime**: Node.js `>=22.13.0` for the Mastra-enabled server path; Next.js 15, React 19, browser/PWA. The existing internal Plus/Cargo/CatPaw Node 20 path remains a separate unresolved release gate.
**Primary Dependencies**: exact `@mastra/core@1.63.2`, existing AI SDK/Zod/OpenAI-compatible DeepSeek model, Supabase authentication, and current React/CSS stack
**Storage and Ownership**: session state in Home only; confirmed writes use the existing account cache and revisioned Supabase document
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: local fallback anchors within 2 seconds; remote request keeps existing timeout/rate limits
**Constraints**: local-first, account isolated, revision safe, offline capable, backup compatible
**Scale/Scope**: one selected day, ordinary records only, existing categories only, eight responsive widths

## Source-of-Truth and Readiness Check

- [x] LN-074 exists and this work is a bounded interaction rework using LN-069/LN-071 foundations.
- [x] `product.md` and `DESIGN.md` receive durable admission/interaction wording.
- [x] `DESIGN.md`, `docs/设计规范/AGENTS.md`, visual, motion, and record-page specs were read.
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
- `src/lib/agent-review-model.mjs` already centralizes local review and normalization, so Mastra can remain an execution dependency while pure project code continues to own policy and validation.

### Reuse and Compatibility Decisions

Keep `/organize` unchanged as a direct fallback. Add an Agent-specific model/provider/route so chronology and classification contracts are not weakened. Reuse `commitData` for explicit writes and current category objects for allowlisting. No storage version or backup field changes.

## Proposed Design

### Data and Control Flow

1. Home activates a transient session and sends selected-day `id/time/content` plus bounded existing category IDs/names.
2. The provider returns allowlisted review items (`question` or `category`) associated with one record; records without a useful filing or factual-completeness decision produce no item. Home reconciles the response once more against the latest selected-day entries and category list, dropping invalid, duplicate, unknown, or already-current category items before rendering.
3. Home anchors the Agent to the current row, scrolls it into view, and expands `AgentDiaryReview` beneath the row.
4. A short user response can be sent back with only the source record, current item, bounded candidate categories, and bounded session messages. The response returns exactly one inert `ask`, `append`, `category`, or `none` outcome.
5. Only explicit append/new-record/category actions call `commitData`; keep/dismiss only advances the transient queue.
   If a rendered category suggestion has become current before confirmation, Home reports the no-op and advances without calling `commitData`.
6. Switching date/mode/tool or unmount aborts the request and clears session state.

### Rework 18 Analysis Workflow

1. **Qualify**: reject empty, duplicate, out-of-day, unknown-category, and already-current inputs before they become review work.
2. **Analyze**: for each record, select one mutually exclusive branch: a strong non-current category, a `clarify-category` question with two or three candidate IDs, an `enrich-detail` question, or no item.
3. **Clarify**: send only the active record, active item, bounded category list, and at most eight session messages. Normalize the response to `ask`, `append`, `category`, or `none`.
4. **Constrain**: `category` must name an allowlisted non-current candidate; `append` must contain only supplied facts; simultaneous or invalid proposals become `none`. A second unresolved user answer also becomes `none`.
5. **Confirm**: displaying or answering never writes. Existing explicit append/new-record/category actions perform the only writes; category keeps undo.
6. **Advance**: a confirmed action or Keep original advances one item. Date, account, tool, Plan, stop, or unmount cancels the workflow and clears all transient fields.

This is an application workflow, not an autonomous tool loop. An embedded Mastra workflow performs one Agent generation step followed by project-owned normalization for each analyze or reply request. React continues to own the transient user session, and pure model functions remain the policy/validation boundary. Mastra Memory, tools, suspend/resume persistence, a standalone Mastra server, background runners, and multi-agent delegation stay disabled because the feature admits none of that authority or state.

### Trust and Privacy Boundaries

- Browser → same-origin server: date, locale, current-day record `id/time/content`, bounded existing category `id/domainName/name`, and for replies only the active record/item plus short messages.
- Supabase access token authenticates the request; DeepSeek key stays server-side.
- Server output is schema validated, length bounded, record/category allowlisted, deduplicated, and never logged with private text.
- Offline/no token/no key/timeout follows the same bounded local branches and deterministic replies; it never guesses a category after an unresolved answer or blocks editing.

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

## Rework 18: Classification and Clarification Convergence

Add `questionGoal` and bounded `candidateCategoryIds` only to transient question items. Extend the reply contract with a mutually exclusive `outcome` and optional category proposal. The model prompt must prefer direct classification when evidence is strong, ask only questions that change filing or factual completeness, and avoid filler comments. Local fallback mirrors the same branch structure with literal category evidence and refuses to guess after an unresolved answer. Home stores only the current reply outcome and proposed category ID, hides further reply input once a terminal outcome exists, and reuses the existing category label/actions when a question resolves into classification.

## Rework 19: Direct Mastra Orchestration

- `src/mastra/agents/diary-review-agent.mjs` creates the bounded Diary review Agent around the existing OpenAI-compatible DeepSeek model. It has no tools or memory and receives the existing mode-specific instructions.
- `src/mastra/workflows/diary-review-workflow.mjs` defines one typed workflow with a model-generation step and a project-normalization step. Analyze and reply remain the only modes; each run performs at most one model request.
- `src/mastra/index.mjs` is the small composition root that registers the Agent and Workflow and exposes one execution function to the existing route module. It is an embedded library boundary, not a new HTTP server or product-wide Runtime abstraction.
- `src/lib/agent-review-route.mjs` keeps request sanitization, authentication-facing errors, DeepSeek configuration, timeout mapping, and the Plan Agent path. Only Diary analyze/reply delegates to Mastra; the public `/api/organize/agent` payload and response contract do not change.
- Project normalization runs after the Mastra Agent result and remains authoritative for record/category allowlists, mutually exclusive outcomes, the two-answer cap, and provider IDs. A successful framework run can never bypass these checks or write data.
- The dependency requires Node.js `>=22.13.0`, matching the public Tencent runtime but not the existing internal Plus/Cargo/CatPaw Node 20 contract. Local acceptance must use the installed Node 22 runtime. Passing the exact pinned version's focused tests/build on Node 20 is diagnostic evidence only and does not authorize an unsupported internal deployment.

### Deployment Compatibility Gate

- Keep `@mastra/core` pinned to `1.63.2`; do not silently fall back to the pre-1 `0.24.9` line merely to satisfy Node 20. In the same working tree, npm reported 371 added packages for the old-version switch and 125 when restoring 1.63.2; the old line also loses the current supported API/runtime baseline.
- Do not edit `manifest.yaml`, `.catpaw/catpaw_deploy.yaml`, `ops/start-cargo.sh`, or their deployment tests as part of Rework 19. Upgrading that platform is a separate release decision with its own build, start, health, and rollback evidence.
- Until that decision is made, the Mastra change is a returned Node 22 implementation, not an internally deployable or Accepted change.
- The npm official audit currently reports one Low transitive finding (`GHSA-866g-f22w-33x8`) in Mastra's AI SDK v5 compatibility alias. The active model provider resolves through provider-utils 4 and the endpoint retains auth, rate, timeout, token, and one-call bounds, but the audit is not clean. Do not force an internal major-version override; recheck or explicitly accept the dependency risk before deployment.

## Project Structure and Write Set

```text
Read/reuse: src/lib/ai-classifier-route.mjs, src/lib/daily-review-*.mjs,
            src/app/organize/*, src/app/use-log-note-data.js
Change:     package.json, package-lock.json, PROJECT_BOARD.md, ARCHITECTURE.md,
            docs/decisions/README.md,
            docs/decisions/0003-embed-mastra-without-standalone-runtime.md,
            src/mastra/index.mjs,
            src/mastra/agents/diary-review-agent.mjs,
            src/mastra/workflows/diary-review-workflow.mjs,
            src/lib/agent-review-route.mjs,
            tests/agent-review-runtime.test.mjs,
            tests/ai-agent-review-route.test.mjs,
            tests/project-structure.test.mjs,
            specs/003-agent-diary-review/*
Exclude:    UI/CSS/visual geometry, Service Worker, API route adapter,
            schema/migrations, account/auth flows, backups, images, Plan/Calendar behavior,
            Dify/LN-077, standalone Agent services, unrelated screenshots and dirty user assets
```

**Integration Order**: runtime contract test → dependency and Mastra composition → Diary route delegation → focused model/route/runtime tests → production build → full gate and board evidence.

## Test and Evidence Plan

### Automated Regression

- Unit/model/contract: allowlists, local fallback, invalid IDs/categories, duplicate/unknown review items, same-current category reconciliation, reply normalization, input limits, auth/origin/rate/timeout.
- Analysis workflow: single-match direct category; multi-match `clarify-category`; detail question; reply outcomes `ask/append/category/none`; candidate enforcement; simultaneous-proposal rejection; two-answer cap; no write before explicit action; valid apply/advance/undo.
- Mastra integration: Agent and Workflow registration, one model request per run, analyze/reply schema selection, post-run project normalization, abort/timeout propagation, invalid framework output rejection, unchanged Plan path, and unchanged public route contract.
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

No migration. Removing `src/mastra/`, the `@mastra/core` dependency, and the narrow Diary delegation restores the previous direct AI SDK call without changing the route, browser provider, UI, or stored data. Confirmed record/category changes are ordinary supported data and remain valid.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Transient Agent session state machine | Associates scanning, row focus, conversation, and cancellation safely | Reusing `/organize` cannot provide the requested in-context movement |
| Agent review response contract | Supports questions and category suggestions without weakening existing read-only chronology | Free-form chat output cannot be safely tied to record/category allowlists |
| Row insertion point in both views | Keeps the conversation beside its source record | A global chat drawer loses record context and duplicates a separate page |
| Embedded Mastra Agent + Workflow | Uses a maintained Agent/workflow implementation while keeping project policy and contracts stable | A self-built Runtime duplicates framework capabilities; a standalone service adds deployment and governance before a second consumer exists |
