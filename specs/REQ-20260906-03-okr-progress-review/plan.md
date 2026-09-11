# Implementation Plan: Goal Loop — outcome alignment and evidence review

**Requirement**: `REQ-20260906-03` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

> This plan is derived from the revised product candidate. It does not authorize implementation,
> commit, push, deployment, or board-status changes. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative.

## Summary

Converge the existing Goals/OKR work into one local Goal Loop: user-owned outcomes and success
signals, optional plan relations, derived evidence from existing records, and an explicit read-only
alignment review. Reuse existing stores and the `commitData` writer. Keep quick capture untouched.
The AI alignment portion remains isolated until the owner confirms the core-chain gate and a 14-day
pilot demonstrates useful, low-cost review.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing React UI, account data provider, Goal/Plan models, shared AI
boundary, and current provider adapter; no new dependency is proposed.
**Storage and Ownership**: Extend the account-scoped Goal/Plan payload only through existing
`commitData`; raw records remain canonical; derived evidence and AI reviews stay in memory for the
first slice.
**Testing**: Node model/contract tests, focused Playwright mobile E2E, PWA authenticated-offline and
backup checks, `npm run design:check`, `npm run check`, and a manual 14-day pilot.
**Target Platforms**: Authenticated mobile-first browsers and desktop responsive layouts.
**Performance Goals**: Local Goal detail remains responsive for 200 visible records; creating a Goal
with one signal takes no more than two minutes in the pilot; AI stays within the existing timeout,
payload, and one-request budget.
**Constraints**: Local-first, account isolated, revision safe, offline capable, backup compatible,
raw-note preserving, explicit AI disclosure/confirmation, no autonomous writes, no required capture
decision.
**Scale/Scope**: One Goals surface and detail route; zero to three signals per outcome; at most 200
selected evidence records per review; widths 320/390/426/768/1280px.

## Source-of-Truth and Readiness Check

- [ ] The related board scope, priority, dependencies, permissions, and acceptance mapping are
      confirmed. The current package remains a draft candidate and does not edit the human-owned board.
- [x] `product.md`, `PROJECT_CONTEXT.md`, and `ARCHITECTURE.md` provide the local-first, raw-note,
      account, AI-disclosure, and single-writer constraints used here.
- [x] `DESIGN.md` and `docs/设计规范/AGENTS.md` provide the existing reading/content/value/action
      axes and 44px interaction requirements.
- [x] The current dirty working tree was inspected; the write set below excludes all unrelated
      source, governance, migration, and deployment changes.
- [x] No second writer is authorized. Any implementation must be serialized in the main checkout or
      explicitly isolated.

## Core-Chain Change Contract

- **Canonical path**: Goal/plan/evidence edits → account-scoped `commitData` → local cache →
  revision-checked sync. Ordinary quick record remains its existing direct path.
- **Reuse**: `goal-model`, `plan-model`, existing `entries`, `LogNoteDataProvider`, backup/restore
  normalization, local evidence derivation, and the existing disclosed AI review route pattern.
- **Replacement / deletion**: Remove any duplicate Goal store, second evidence writer, automatic
  completion path, background AI job, or separate chat surface introduced during implementation.
  Temporary AI candidates disappear on cancel, stale input, rejection, account change, or removal.
- **State writers**: Explicit user edits and accepted associations are the only state changes.
  `commitData` is the one persistence writer; local derivation and AI review have zero write access.
- **Public contract**: Backward-compatible Goal/KR fields; optional plan-to-Goal/KR references; derived
  evidence references; versioned AI review with direction, confidence, reason, and source references.
- **Invariants**: No required quick-record step; raw notes intact; offline/account isolation and
  revision/CAS safety preserved; only disclosed bounded sources leave the browser; no AI autonomous
  mutation; backups and exports remain compatible.
- **Verification**: Focused model/route/provider tests, browser/PWA/account/offline/backup checks,
  design validation, full `npm run check`, and a two-outcome 14-day pilot.
- **Unresolved evidence**: Owner confirmation of active-outcome cap, horizon presets, many-to-many
  association semantics, provider/retention policy, and lifecycle vocabulary.
- **Discussion status**: Pending owner discussion; tasks are planning material and not implementation
  authorization.

## Constitution Check

- [x] Core recording steps and the home page's primary job are preserved.
- [x] Authenticated offline use, account ownership, stale-revision safety, and backup compatibility
      are preserved.
- [x] Raw notes are not silently rewritten; accepted relationship changes remain explicit and
      reversible.
- [x] Network payloads, provider credentials, source limits, and AI failure/zero-write behavior are
      specified.
- [x] Regression, responsive, accessibility, PWA, and real-pilot evidence are required.
- [x] The local Goal Loop is the smallest useful vertical slice; enterprise administration and
      background automation are excluded.
- [x] The design does not require unauthorized delivery or governance changes.
- [ ] Owner discussion and board admission are complete. This is the only open Constitution gate.

## Existing System Investigation

### Relevant code and contracts

- `src/lib/goal-model.mjs`: current canonical Goal normalization and optional KR/record references.
- `src/lib/plan-model.mjs`: current plan normalization with optional Goal and priority metadata.
- `src/modules/goals/okr-progress/model.mjs`: local period/evidence facts and analysis input builder.
- `src/app/_components/goals-workspace.js`: existing Goals CRUD/editor surface.
- `src/app/goals/goal-detail-page.js` and `src/app/goals/goal-detail.css`: current detail/timeline UI.
- `src/app/_components/plan-editor.js`: current optional plan Goal selection.
- `src/app/_providers/log-note-data-provider.js` and `src/lib/account-sync.mjs`: account cache,
  `commitData`, revision/CAS, and delayed synchronization.
- `src/modules/organize/plan-record-review/`: existing bounded local plan/record evidence and AI
  relation patterns.
- `src/shared/ai/`, `src/infrastructure/ai/`, and `src/mastra/`: shared auth, provider, schema,
  timeout, and request-scoped execution boundaries.
- Existing Goal, plan/record review, backup, PWA, design, and project-structure tests.

### Reuse and compatibility decisions

- Keep the current Goal payload as the compatibility root; add only optional fields.
- Keep raw `entries` as the evidence source; recompute evidence after restore, account change, or
  deletion rather than persisting copies.
- Keep plan completion separate from outcome progress.
- Keep AI review session-only in the first slice; if a user wants history, a later feature may save a
  normal record through the ordinary writer.
- Treat unassociated in-period records as **candidate evidence** for discovery, never accepted evidence
  until the user confirms the relationship.
- Do not add a new state library, route family, database migration, or provider dependency.

## Proposed Design

### Data and control flow

1. The user creates or edits an outcome and optional signals in the Goals surface.
2. The user optionally attaches a local plan to the outcome or one signal. The plan remains an
   attempted path with its own status and time.
3. The user continues to make ordinary quick records without selecting a goal.
4. Goal detail derives candidate and accepted evidence from local records, preserving date, time, and
   raw content. It displays outcome progress, evidence coverage, and plan activity separately.
5. The user may accept/remove evidence associations from the detail view. Each confirmed change uses
   the existing `commitData` boundary and is reversible.
6. For AI review, the user chooses a bounded source window and sees a disclosure before sending.
7. The authenticated same-origin capability validates the request and returns a strict, source-bound
   read-only proposal. The browser rejects unknown sources, stale fingerprints, and invalid output.
8. The user accepts or rejects each candidate. Acceptance re-reads current state and performs one
   `commitData`; cancel, stale, offline, failure, or account change performs zero writes.

### Trust and privacy boundaries

- Local derivation can inspect only the current account's Goals, plans, and records.
- An AI request may include selected Goal/KR statements, optional why/guardrails, valid horizon,
  bounded plan title/time/status, bounded record date/time/content excerpts, opaque request-local IDs,
  and a source fingerprint.
- It must exclude credentials, account identifiers, raw storage keys, attachments, unrelated records,
  provider tokens, external calendar/health/investment data, and the full account document.
- Requests require current authentication, same-origin checks, versioned schema, bounded counts/lengths,
  one provider call, existing timeout/rate limits, and no application-log raw content.
- Responses must echo request bindings only after validation, use the direction enum and bounded arrays,
  and include source references from the allowlist. Unknown fields or sources invalidate the entire
  response.
- No AI output is cached in persistent storage or used as a write instruction. Cancel, timeout,
  provider error, invalid output, account replacement, and stale response all leave data unchanged.

### UI and interaction contract

- Goals index exposes no more than the agreed small active set by default; paused/completed outcomes
  remain reachable without competing with quick capture.
- Goal detail uses the existing Goals reading/content/value/action axes and stays within two navigation
  levels. It groups outcome, signals, plans, evidence, gaps, and review explanation.
- Goal creation/editing is optional and does not appear in the quick-record composer.
- AI review begins with a disclosure and source-selection step; result cards show direction, confidence,
  reason, and source dates. The user can accept, reject, or dismiss candidates.
- Empty, invalid-period, insufficient-evidence, offline, unavailable-provider, stale, and account-
  changed states are distinct and recoverable.
- Keyboard focus, reduced motion, 44px targets, readable body text, and no horizontal overflow are
  required at 320/390/426/768/1280px.

## Project Structure and Write Set

```text
Read:
  PROJECT_CONTEXT.md, PROJECT_BOARD.md, product.md, ARCHITECTURE.md, DESIGN.md
  specs/REQ-20260906-03-okr-progress-review/*
  src/lib/goal-model.mjs, src/lib/plan-model.mjs
  src/modules/goals/okr-progress/*
  src/app/goals/*, src/app/_components/goals-workspace.js, src/app/_components/plan-editor.js
  existing tests/e2e and shared AI boundaries

Allowed feature-artifact edits now:
  specs/REQ-20260906-03-okr-progress-review/spec.md
  specs/REQ-20260906-03-okr-progress-review/research.md
  specs/REQ-20260906-03-okr-progress-review/data-model.md
  specs/REQ-20260906-03-okr-progress-review/contracts/alignment-review.md
  specs/REQ-20260906-03-okr-progress-review/plan.md
  specs/REQ-20260906-03-okr-progress-review/tasks.md
  specs/REQ-20260906-03-okr-progress-review/quickstart.md
  specs/REQ-20260906-03-okr-progress-review/checklists/requirements.md

Excluded:
  PROJECT_BOARD.md, AGENTS.md, PROJECT_CONTEXT.md, product.md, ARCHITECTURE.md, DESIGN.md
  all application source, tests, migrations, deployment files, dependencies, commits, pushes,
  publishes, and worktree merges during this specification run
```

### Branch split addendum

`feature/req-20260906-03-okr-progress-review` 承载目标工作区、Goals 页面、目标日期区间标记和对应样式。`home-page.js`、`home-header.js`、`home-header.css`、`i18n.mjs`、`tests/home-floating-bars.test.mjs` 同时包含 Inline Chat 变更，迁移时只接收 Goals 代码块；Inline Chat 代码块归 `REQ-20260910-01`。

**Integration Order**: Owner discussion and board admission → update spec/plan/tasks → implement the
local Goal Loop foundation → independently validate → consider isolated AI review → run full gate →
controller acceptance. Use one writer for shared model/UI files.

## Test and Evidence Plan

### Automated regression

- **Goal and signal model**: optional-field defaults, numeric direction/bounds, qualitative fallback,
  lifecycle transitions, old payloads, JSON/Markdown compatibility, and raw-note preservation.
- **Plan/evidence model**: optional Goal/KR references, candidate versus accepted evidence, out-of-period
  exclusion, invalid dates/times, multi-outcome mapping, and plan-completion separation.
- **AI contract**: [contracts/alignment-review.md](./contracts/alignment-review.md) defines the exact
  allowlist, source selection, strict versioned output, source references,
  confidence/direction enums, stale fingerprints, account binding, cancellation, zero-write failures.
- **Browser/mobile**: Goal creation/detail, plans and evidence, empty/gap/insufficient states, explicit
  AI disclosure and acceptance, keyboard/focus, reduced motion, no overflow at five widths.
- **PWA/offline/account/backup**: cached Goal browsing offline, account replacement clears review
  state, old backup round trip, accepted association removal, and no cross-account source leakage.
- **Full gate**: `npm run design:check`, `npm run check`, and `git diff --check`.

### Real-environment or manual evidence

- Owner's 390px visual review of Goal detail and review states.
- Two-outcome 14-day pilot: one work outcome and one personal outcome, setup/review duration, evidence
  links, accepted/rejected AI candidates, false-positive notes, and quick-record friction.
- Real provider quality and latency, real authenticated account isolation, cross-device CAS, and
  deployment evidence remain external acceptance gates; synthetic tests cannot replace them.

### Acceptance Evidence Handoff

Return focused test results, responsive screenshots/JSON, request/response contract captures with
synthetic sources, backup/offline/account evidence, and the pilot log to the controller. The controller
must compare the result with the board acceptance criteria and record remaining external evidence before
any Accepted status.

## Rollback, Removal, and Migration

No mandatory migration is required. Optional fields normalize to empty/null values and old backups
remain valid. Disable the AI alignment entry independently if privacy, quality, cost, or adoption
thresholds fail. Removing the Goal Loop detail and derived review leaves raw records, plans, and
existing backups readable; remove only accepted relationship metadata through an explicit reversible
migration if it was persisted. Do not delete raw records as part of rollback.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Success-signal semantics (numeric and qualitative) | Goals need an honest definition of progress | A single free-text Goal cannot distinguish progress from activity |
| Derived evidence relationship | Existing records are the factual source for review | Duplicating records would break raw-note ownership and backup compatibility |
| Explicit source-bound AI review | AI can reduce review effort without autonomous writes | Background or automatic analysis would widen privacy and maintenance cost |
| Optional plan-to-signal link | A plan should explain which success signal it attempts | Goal-only links cannot explain competing paths within one outcome |
