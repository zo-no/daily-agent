# Implementation Plan: In-page Agent Plan Review

**Board Item**: `LN-074` | **Date**: 2026-08-23 | **Spec**: [spec.md](./spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

Extend the existing transient Diary Agent into a persistent selected-day Plan companion. The same
illustrated Agent remains visible on empty, Google-only, and local-plan days. It is passive and shows
one weak single-line invitation when no editable local plan exists; otherwise it exposes the existing
wake control, scans a minimal allowlisted plan payload, and anchors one compact annotation to one
concrete plan. Discussion never writes. A separately confirmed proposal may update only that plan's
title and/or time through the existing local-first `commitData` path. Google events are bounded
read-only conflict context and never update targets. The adapter, UI hooks, and mode-specific contract
remain removable without migration.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing React, AI SDK, Zod, Supabase authentication, and CSS only; no new dependency
**Storage and Ownership**: Existing account-scoped `planBlocks` document field via `useLogNoteData`; transient Agent state is not persisted
**Testing**: Node test runner, existing mobile browser harness, PWA production checks, design validation
**Target Platforms**: Authenticated mobile-first browsers and desktop responsive layouts at 320–1280px
**Performance Goals**: Deterministic fallback reaches an anchored issue/complete state within 2s; no additional startup request or persistent background work
**Constraints**: Local-first, account isolated, revision safe, offline capable, backup compatible, explicit writes only, Google mutation excluded
**Scale/Scope**: One selected date, at most existing Agent request limits, one active annotation, existing `/api/organize/agent` route and Plan modules

## Source-of-Truth and Readiness Check

- [x] The board item exists and its intended outcome, dependencies, permissions, acceptance, and verification method are clear.
- [x] `product.md` and the feature spec contain the bounded product-admission decision.
- [x] Visual or interaction work has read `DESIGN.md` and `docs/设计规范/AGENTS.md`.
- [x] The current dirty working tree was inspected and the write set avoids unrelated user changes.
- [x] No second writer owns overlapping files or state.

## Constitution Check

*GATE: Passed before design and re-checked after Phase 1 design.*

- [x] Core recording steps and the home page's primary job are preserved; Plan Agent is optional and Plan-only.
- [x] Authenticated offline use, account ownership, and stale-revision safety reuse existing paths.
- [x] Raw notes and plans are not silently rewritten; all plan changes require explicit confirmation.
- [x] Privacy, exact network fields, credential exclusion, backup compatibility, and removal are specified.
- [x] Tests cover acceptance scenarios, invalid proposals, Google exclusion, cancellation, and responsive behavior.
- [x] The change is one selected-day vertical slice with no scheduling, reminders, or persisted AI entities.
- [x] No commit, push, publish, deploy, deletion, reset, history rewrite, OKR change, or worktree merge is required.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/page.js` owns Diary Agent session state, authentication provider creation, cancellation,
  `commitData`, selected date, and Plan save/delete orchestration.
- `src/app/calendar-view.js` renders selected-day local and Google time blocks and owns the transient
  Plan editor draft. Local and Google blocks already expose stable IDs.
- `src/app/agent-diary-review.js` and `src/app/home-timeline.css` define the compact annotation,
  conversation, vertically stacked mobile actions, complete state, and illustrated Agent language.
- `src/lib/agent-review-provider.mjs`, `agent-review-route.mjs`, and `agent-review-model.mjs` provide
  same-origin authenticated bounded requests, model output normalization, cancellation, and local fallback.
- `src/lib/plan-model.mjs` requires every persisted local plan to have a valid title, date, start time,
  and end time. There is currently no untimed local-plan entity.
- Google timed events are merged only for display; Google all-day events remain a separate read-only list.
- Existing backups persist `planBlocks`; no Agent session, message, proposal, or derived issue is persisted.

### Reuse and Compatibility Decisions

- Add an Agent domain discriminator (`reviewTarget: "diary" | "plan"`) while retaining
  `mode: "analyze" | "reply"`, so old Diary calls and response normalization remain compatible.
- Reuse the existing endpoint, authentication, rate limiting, timeout, and error response contract.
- Add plan-specific pure functions beside Diary functions instead of widening Diary item semantics.
- Reuse `savePlanBlock`/`commitData` for confirmed local updates; never provide an executable Google ID.
- Add stable `data-plan-id` hooks and a Plan-specific row-local annotation layer to the existing grid.
- Since the current schema cannot contain an untimed local plan, deterministic fallback detects overlap
  and vague titles only. The `plan-time` issue type covers overlap proposals; missing-time detection stays
  dormant until the product deliberately admits an untimed plan model.
- Backup, restore, export, links, and persisted data shapes remain unchanged.

## Proposed Design

### Data and Control Flow

1. Plan derives editable local plans for `selectedDate` separately from merged display blocks.
2. The Plan companion renders for every selected date. When no editable local plan exists it renders
   the passive artwork plus localized invitation without a button, request, or write path. The wake
   control appears only when at least one editable local plan exists and no Plan editor is open.
3. Activation creates an abortable transient Plan session and sends only local plan ID/title/time plus
   bounded Google title/time conflict context for the selected day.
4. Server sanitization reconstructs allowlists, calls the model, and normalizes every item/proposal back
   to one local plan ID. Invalid IDs, dates, minutes, fields, and Google targets are dropped.
5. On remote failure, local analysis deterministically identifies overlapping local/local or local/Google
   intervals and vague local titles, returning at most one item per local plan.
6. CalendarView scrolls the affected block into view, marks that block, positions the illustrated Agent,
   and renders a compact annotation overlay within the Plan shell aligned to the active block.
7. Reply messages and proposals remain only in React state. Chat never calls `commitData`.
8. “更新计划” revalidates plan ID/date/source and proposed fields against the current local state, then
   delegates to `savePlanBlock`; “保持原计划” advances without a write.
9. Date/mode/tool/editor/navigation changes abort the request and clear transient Plan state. A failed
   write stays on the current item and follows the existing revision-conflict toast/path.

### Trust and Privacy Boundaries

- Browser → same-origin route, authenticated bearer session:
  - local plans: `id`, `title`, `startMinute`, `endMinute`
  - Google context: `title`, `startMinute`, `endMinute`
  - request context: `reviewTarget`, `mode`, `date`, `locale`, active local plan ID, bounded messages/item
- Explicitly excluded: other dates, diary entries, categories, account identity, tokens in JSON,
  descriptions, attendees, locations, calendar IDs, event IDs, etags, external refs, full document.
- Server credentials remain environment-only. Request/response bodies are not logged by feature code.
- Response allowlists permit only known local plan IDs and optional bounded `title`, `startMinute`,
  `endMinute`; no action field is accepted.
- Google events can explain a collision but are omitted from the update allowlist by construction.
- Offline/missing-token/timeout uses local analysis and keeps normal Plan CRUD available.

### UI and Interaction Contract

- Visual thesis: a quiet handwritten margin companion that points to one time block, not a card or modal.
- Content plan: existing day grid remains dominant; wake figure sits near the lower margin; one active
  block gets a single replacement accent; one compact annotation contains prompt, conversation, and actions.
- Interaction thesis: restrained wake motion, smooth block-to-block travel/scroll, and one drawn accent
  replacing the block's normal edge; all motion is removed under reduced-motion preference.
- Idle/scanning/reviewing/complete reuse Diary status language with Plan-specific accessible copy.
- Empty and Google-only Plan states keep the idle figure but replace the wake button with non-interactive
  artwork and one 12px supporting line: Chinese is exactly “编写计划后和我聊聊吧”; the localized English
  equivalent remains a single line at the narrow target. The add-plan action stays visually primary.
- The active plan retains one visible boundary treatment; no duplicate underline/rule is added.
- Initial question state shows reply plus “保持原计划”. After a valid proposal it shows a concise
  before/after preview plus “更新计划” and “保持原计划”. Mobile actions stack vertically with no separators.
- The annotation is compact, cardless, does not move the fixed right rail, does not cover add/navigation
  controls, and keeps 44px touch targets, keyboard focus, live status, and no horizontal overflow.
- Opening the Plan editor cancels review before the editor appears. Google blocks remain ordinary read-only blocks.

## Project Structure and Write Set

```text
Read/reference:
  AGENTS.md, PROJECT_BOARD.md, product.md, DESIGN.md, docs/设计规范/AGENTS.md
  specs/003-agent-diary-review/*

Allowed changes:
  specs/004-agent-plan-review/*
  PROJECT_BOARD.md
  src/app/page.js
  src/app/home-record-views.js
  src/app/calendar-view.js
  src/app/agent-diary-review.js
  src/app/home-day-plan.css
  src/app/home-timeline.css
  src/lib/agent-review-model.mjs
  src/lib/agent-review-provider.mjs
  src/lib/agent-review-route.mjs
  src/lib/i18n.mjs
  tests/agent-review-model.test.mjs
  tests/ai-agent-review-route.test.mjs
  e2e/run-mobile.mjs
  output/ln-074-plan-agent-review/*

Explicit exclusions:
  persistence schema/migrations, Google write/sync modules, backup format, auth model,
  package dependencies, unrelated dirty files, commits/push/deploy/OKRs
```

**Integration Order**: Single writer: pure model/route contract → tests → page/session wiring → Plan DOM/UI → browser acceptance → full gate → board evidence.

## Test and Evidence Plan

### Automated Regression

- Unit/model/contract tests: local overlap/vague detection, one-item-per-plan, minimal payload,
  local-ID allowlist, invalid/cross-date/Google proposals, bounded messages, explicit proposal shape,
  Diary backward compatibility, authentication/origin/size/rate/timeout fallback.
- Browser/mobile tests: persistent passive empty/Google-only states, local-plan wake and anchoring, chat without mutation,
  keep-original exact preservation, explicit title/time update, editor/date/mode/tool cancellation,
  Google read-only target exclusion, keyboard controls, reduced motion, 320/390/426/700/1280px geometry.
- PWA/offline/account tests: missing token uses deterministic fallback; existing local Plan CRUD and
  offline shell remain usable; no account/cache changes.
- Design validation: `npm run design:check`, computed geometry/no-overflow assertions, and screenshots
  showing passive-empty/Google-only plus idle/scanning/review/proposal/complete states on mobile.
- Full gate: `npm run check` and `git diff --check`.

### Real-Environment or Manual Evidence

- Review Chinese DeepSeek wording with synthetic plans only; verify it asks a natural concrete question
  and does not imply an automatic write.
- Subjectively inspect that the annotation reads as a margin note, the figure points to the plan, one
  accent replaces the block boundary, and controls remain legible without looking like a form/menu.
- Real Google OAuth mutation is intentionally not exercised; evidence verifies the request lacks Google IDs.

### Acceptance Evidence Handoff

Record focused test counts, full gate output, viewport geometry, provider/fallback mode, and screenshot
paths under `output/ln-074-plan-agent-review/` in `PROJECT_BOARD.md`. Keep LN-074 Rework 2 as Returned
until independent comparison with every acceptance criterion is complete.

## Rollback, Removal, and Migration

No migration exists. Remove the Plan adapter/session props, passive companion branch, Plan styles,
plan-specific model/route branches, translations, and tests to return to Diary-only Agent behavior.
Existing plans, Google cache, backups, and raw notes remain untouched. A feature-level UI flag can hide
the Plan companion and wake control without data cleanup.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Plan-specific request/response branch on existing endpoint | Enforces different allowlists and Google read-only context | Reusing Diary `entries` semantics would blur trust boundaries and permit wrong fields |
| Transient Plan session adapter in page/calendar | Anchors Agent to a real time block and reuses local-first writes | A global chat panel would lose source identity and repeat the UI problems the user rejected |
| Overlay annotation aligned to the plan grid | Time blocks are absolutely positioned and cannot accept flow content safely | Inserting a large card into the grid would obscure adjacent times and shrink mobile workspace |

## Post-Design Constitution Re-check

All gates remain passed: no new recording step, persistence/schema, silent rewrite, Google mutation,
credential exposure, backup change, or unauthorized repository operation was introduced by the design.
