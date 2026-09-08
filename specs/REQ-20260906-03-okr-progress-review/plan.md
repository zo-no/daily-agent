# Implementation Plan: Current-cycle OKR detail and progress review

**Requirement**: `REQ-20260906-03` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

Extend the canonical local Goal model and Goals route with optional child KRs, then add a detail
surface that derives chronological evidence from existing records. Keep the ordinary record composer
unchanged. Add a session-only, explicitly confirmed Goal analysis adapter that follows the existing
AI route boundary and returns a strict, read-only review. Goal report export remains deferred.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing React, Zod, local data provider, AI HTTP boundary, and DeepSeek
execution adapter; no new dependency.
**Storage and Ownership**: Extend the existing account-scoped `data.goals` payload through
`commitData`; derived evidence and AI proposals stay in memory. Existing versioned backup
normalization must accept old flat goals.
**Testing**: Node test runner, focused Playwright browser E2E, PWA production checks, design
validation, and `npm run check`.
**Target Platforms**: Authenticated mobile-first browsers and desktop responsive layouts.
**Performance Goals**: Goal detail local derivation should remain synchronous for normal records and
complete within one interaction frame for a 200-record goal; AI request uses existing timeout/rate
limits and bounded payloads.
**Constraints**: Local-first, account isolated, revision safe, offline capable, backup compatible,
raw-note preserving, explicit AI disclosure/confirmation, no autonomous writes.
**Scale/Scope**: One goal detail route, up to 50 KRs per goal, up to 200 evidence records in an AI
request, existing Goals/Records stores only, widths 320/390/426/768/1280px.

## Source-of-Truth and Readiness Check

- [ ] The board item exists and its intended outcome, dependencies, permissions, acceptance, and
      verification method are clear. **Blocked:** new requirement admission is still pending in
      human-owned `PROJECT_BOARD.md`; this plan does not edit that file.
- [x] `product.md` contains the durable local-first, AI disclosure, and removal constraints used by
      this spec; the new product admission is recorded in `spec.md` pending board admission.
- [x] Visual or interaction work has read `DESIGN.md` and `docs/设计规范/AGENTS.md`.
- [x] The current dirty working tree was inspected and the write set avoids unrelated user changes.
- [x] No second writer owns overlapping files or state.

## Constitution Check

*GATE: Must pass before implementation design and be re-checked after the design is complete.*

- [x] Core recording steps and the home page's primary job are preserved or improved.
- [x] Authenticated offline use, account ownership, and stale-revision safety are preserved.
- [x] Raw notes are not silently rewritten; all changes are explicit and reversible.
- [x] Privacy, network payloads, credentials, backups, restore, and removal are specified.
- [x] Tests are mandatory and cover the acceptance scenarios and relevant failure paths.
- [x] The change is the smallest independently testable vertical slice; export and generalized OKR
      management are excluded.
- [x] Implementation does not require unauthorized commit, push, publish, deploy, deletion, reset,
      history rewrite, OKR change, or worktree merge. Delivery authorization is separate from design.

## Existing System Investigation

### Relevant Code and Contracts

- `src/lib/goal-model.mjs`: canonical Goal normalization and legacy-compatible defaults.
- `src/lib/data.mjs`: versioned state, `normalizeData`, local-first payload ownership, backup/export.
- `src/app/goals/goals-page.js` and `src/app/goals/goals.css`: current Goals index and editor.
- `src/app/goals/page.js`: App Router entry point.
- `src/app/log-note-data-provider.js` and `src/app/use-log-note-data.js`: account-scoped
  `commitData`, hydration, offline cache, and revision/CAS sync.
- `src/modules/organize/plan-record-review/model.mjs`: bounded chronological evidence derivation and
  source fingerprint pattern.
- `src/modules/insights/domain-daily-summary/{model,server,client}.mjs`: explicit AI boundary,
  allowlist, provider errors, strict output, and no-write client pattern.
- `src/shared/ai/http-boundary.mjs` and `src/infrastructure/ai/deepseek-execution.mjs`: shared
  auth/origin/content-type, timeout, rate-limit, and provider execution contracts.
- `tests/goal-model.test.mjs`, existing daily summary/plan review route tests, and browser scripts:
  regression and responsive evidence.

### Reuse and Compatibility Decisions

Reuse `commitData`, Goal normalization, existing `entries` (`date`, `time`, `content`) and the
existing AI transport/strict-validation helpers. Extend Goal records with optional `keyResults` and
optional evidence association metadata only where needed. Do not add a second store, a second record
schema, a parallel AI client, or a new Settings export path. Old goals normalize to an empty KR list.

## Proposed Design

### Data and Control Flow

1. Goal editor can add/edit/remove KRs under the existing Goal. Numeric values are optional and
   validated; qualitative KRs use explicit status.
2. Goals index opens `/goals/[goalId]` through one detail entry action. The detail loader reads the
   current account data, resolves the goal, filters records to the valid goal period and optional
   association, sorts date ascending then valid time ascending with stable fallback, and derives
   recorded-day/gap metrics without writing.
3. The detail page renders O/K hierarchy, period summary, KR progress, and grouped date/time/content
   evidence. It renders an undated/empty state for invalid or absent periods.
4. AI disclosure is built from the same local facts. On explicit confirmation, the client sends only
   the allowlisted current-goal fields with a request ID and source fingerprint to a same-origin
   route. The route authenticates, validates strict input, calls the existing DeepSeek adapter, and
   validates strict output. The client accepts the response only if goal/account/fingerprint state
   is current; it never calls `commitData` for analysis.

### Trust and Privacy Boundaries

- Browser local state is the source of truth for Goal/KR/Record facts and remains available offline.
- Remote AI receives only goal/KR titles, valid period, aggregate counts, evidence date/time, and
  bounded content excerpts. It receives no account ID, credentials, storage keys, attachments,
  unrelated records, or write capability.
- Same-origin and bearer authentication, request size limits, timeout and rate limit use shared AI
  helpers. Raw content is not written to application logs.
- Output is versioned and strict, bound to request ID and source fingerprint, and rendered as an
  inert proposal. Cancel, offline, missing configuration, auth failure, timeout, invalid output,
  account replacement, or stale state causes zero data writes.

### UI and Interaction Contract *(when applicable)*

Goals index remains the page entry. Detail is one navigation deeper, with a back action. Reuse the
existing Goals reading/content/value/action axes; do not add arbitrary inset compensation. The AI
disclosure and result live in the detail reading flow, with keyboard focus return, Escape/cancel,
reduced-motion-safe transitions, 44px minimum targets, and no horizontal overflow at required widths.
Loading, empty, invalid-period, provider-unconfigured, offline, auth, timeout, invalid-output, and
stale states are distinct. No AI control is shown as an automatic background action.

## Project Structure and Write Set

```text
Read/reuse:
  src/lib/data.mjs
  src/lib/goal-model.mjs
  src/app/log-note-data-provider.js
  src/app/use-log-note-data.js
  src/modules/organize/plan-record-review/model.mjs
  src/modules/insights/domain-daily-summary/{model,server,client}.mjs
  src/shared/ai/http-boundary.mjs
  src/infrastructure/ai/deepseek-execution.mjs
  DESIGN.md, docs/设计规范/AGENTS.md, product.md, ARCHITECTURE.md

Allowed feature writes:
  specs/REQ-20260906-03-okr-progress-review/{spec.md,plan.md,tasks.md,research.md,data-model.md,quickstart.md,checklists/requirements.md,contracts/}
  src/lib/goal-model.mjs
  src/modules/goals/okr-progress/{model.mjs,server.mjs,client.mjs}
  src/app/goals/{goals-page.js,goals.css,page.js,goal-detail-page.js,goal-detail.css}
  src/app/i18n.js
  src/lib/i18n.mjs
  src/app/api/goals/analysis/route.js
  tests/goal-model.test.mjs
  tests/okr-progress-model.test.mjs
  tests/okr-progress-route.test.mjs
  e2e/run.mjs (only focused scenarios if required by existing harness)

Explicit exclusions:
  PROJECT_BOARD.md, PROJECT_CONTEXT.md, product.md, ARCHITECTURE.md, AGENTS.md
  Existing unrelated dirty files, Settings export/backup behavior, raw record schema, and output/
```

**Integration Order**: Single writer: model/normalization and tests → detail UI → AI route/client and
tests → focused browser/PWA/design verification → full quality gate. Do not stage unrelated files.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract tests: Goal KR normalization/backward compatibility; period filtering,
  ordering, gap counts, numeric/qualitative progress; AI allowlist, size limits, strict output,
  request fingerprint, stale response, and zero-write error paths.
- Browser/mobile tests: Goals entry to detail; numeric and qualitative KR states; grouped timeline;
  empty/invalid period; disclosure/cancel/confirm; distinct AI states; keyboard/focus and required
  viewport geometry.
- PWA/offline/account tests: cached detail browsing, account replacement invalidation, no remote
  request while offline, old backup normalization, and unchanged quick recording.
- Design validation: `npm run design:check` plus mobile width checks and `git diff --check`.
- Full gate: `npm run check`.

### Real-Environment or Manual Evidence

A real provider smoke is needed only if credentials are configured; record request-field allowlist,
strict response, latency, and unchanged local state. Production deployment, real-account acceptance,
and the 14-day adoption observation remain open evidence and must not be inferred from local tests.

### Acceptance Evidence Handoff

Provide focused test output, full gate output, responsive/manual screenshots or browser logs, the
provider configuration state, request fingerprint/zero-write evidence, current commit SHA, and the
remote branch SHA for the controller to record in `PROJECT_BOARD.md`.

## Rollback, Removal, and Migration

Optional Goal/KR fields normalize from and to the existing versioned data payload; old goals with no
KRs remain valid. Removing the detail route, AI module, translations, and styles leaves raw records,
existing Goals, and Settings backups intact. If a future migration becomes necessary, it must be
versioned through `data.mjs` and covered by backup/restore tests; this slice does not require one.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Optional KR child data on Goal | The OKR source contains multiple KRs and both numeric/qualitative outcomes | Keeping only flat Goal text cannot express O/K progress without losing structure |
| Goal detail model and route | Time/content evidence needs a stable review surface reachable from Goals | Embedding all evidence into the index would make the primary list too dense and reduce removability |
| Session-only AI analysis boundary | User asked for current completion analysis while architecture forbids autonomous writes | Reusing a generic chat or background summary would widen data scope and weaken request binding |
