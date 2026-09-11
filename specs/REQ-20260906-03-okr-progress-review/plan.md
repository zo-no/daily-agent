# Implementation Plan: personal OKR period alignment review

**Requirement**: `REQ-20260906-03`
**Date**: 2026-09-11
**Spec**: [spec.md](./spec.md)

> This is derived execution material. It does not authorize implementation, commits, deployment, board changes, or changes to OKRs.

## Summary

Extend the existing Goals detail into one read-only alignment review. Reuse current Goal/KR, local plan blocks, raw entries, account Provider, and existing plan-record review/AI boundaries. The browser deterministically builds the current Goal-period snapshot, displays its scope, and sends it only after the user clicks one primary action. The response explains progress with cited plan/record evidence and uncertainty. No manual source picker, new relationship editor, persistent review, or second writer is introduced.

## Technical Context

- Runtime: existing Next.js 15 / React 19 PWA; Node route handlers and current Mastra/DeepSeek adapter.
- Canonical local model: `src/lib/goal-model.mjs`, `src/lib/plan-model.mjs`, raw `entries`, `data.planBlocks`.
- Existing local facts: `src/modules/goals/okr-progress/model.mjs`.
- Existing nearest collector and bounds: `src/modules/organize/plan-record-review/model.mjs` (100 plans, 200 records, 360-character excerpts).
- Existing UI: `src/app/goals/goal-detail-page.js`, `src/app/goals/goal-detail.css`, `src/app/goals/goals-page.js`.
- Existing provider/writer: `src/app/_providers/log-note-data-provider.js`; user edits continue through `commitData`.
- Existing remote boundary: same-origin authenticated Node route, 256 KiB request, 20s server timeout, 25s browser timeout, 512 KiB provider response, one model call and zero automatic retries.
- No new dependency, database migration, Store, background job, connector, or persistence path.

## Readiness and Constitution Check

- [x] Goal detail remains secondary; ordinary quick capture receives no required field or action.
- [x] Account-local filtering, offline manual use, raw-note integrity, backup compatibility, and revision/CAS remain unchanged.
- [x] AI payload is bounded, disclosed, authenticated, source-allowlisted, and read-only.
- [x] Invalid, stale, cancelled, offline, and failed results have zero writes.
- [x] Five responsive widths, keyboard focus, reduced motion, and 44px targets are planned.
- [ ] Core-chain owner discussion and one-to-one board mapping are complete. This is the only implementation gate still open.

## Existing System Investigation

1. `goal-model.mjs` already stores one shared account Goal list with dates, status, KRs, and legacy record IDs; do not add a work/personal partition or new motivation/cadence fields.
2. `okr-progress/model.mjs` currently filters entries by dates but narrows to explicit associations when they exist; the new local snapshot must remove that exclusion for review while retaining old association data.
3. Goal detail currently shows record association controls and has no plan section; this feature removes the association control from this review surface and adds read-only plan/record facts. It must not delete stored legacy associations.
4. The plan-record review capability provides the closest bounded collector and remote client pattern; extend the canonical path instead of copying a second AI client.

## Proposed Design

### Data and control flow

1. Goal detail reads the current account snapshot and validates the Goal period.
2. A deterministic local builder gathers local plans and ordinary records by inclusive business date, separates future plans from occurred records, applies the existing bounds, and computes a fingerprint.
3. The page displays period, checked-at date, counts, omitted/invalid state, and the exact excerpt policy before the button is enabled.
4. With a valid bounded snapshot, **检查目标对齐** is the only primary action. The visible disclosure makes this click the explicit send confirmation.
5. The authenticated route validates schema, account token, same origin, body size, source allowlist, and request binding; the existing AI adapter performs one structured generation.
6. The browser validates the response a second time, renders overall/scoped judgments and citations, and keeps it in page memory only.
7. Any account/Goal/source/fingerprint change, cancel, timeout, invalid response, or route failure clears the result and performs no `commitData`.

### Trust and privacy boundaries

Only the current Goal/KR text, period, bounded local plan metadata, bounded record date/time/excerpts, source counts, locale, request ID and fingerprint cross the approved provider boundary. No account ID, credentials, storage key, attachment, image, Google event, unrelated record, or full document crosses it. Provider logs must not contain raw excerpts. The route never reads Supabase documents directly and never writes application data.

### UI and interaction contract

Goal detail keeps existing page/content/value/action axes. One primary button has a disabled/safe state for no period, future-only period, over-limit snapshot, offline, or no sources. No source picker, extra confirmation dialog, KR association editor, chat panel, or background polling. Results show citations by opening the existing source record/plan view when possible; unavailable source navigation is a safe no-op. `en` and `zh-CN` labels carry the same state semantics.

## Project Structure and Write Set

```text
Read/reuse:
  src/lib/goal-model.mjs
  src/lib/plan-model.mjs
  src/modules/goals/okr-progress/
  src/modules/organize/plan-record-review/
  src/app/_providers/log-note-data-provider.js
  src/app/goals/
  src/shared/ai/ src/infrastructure/ai/ src/mastra/

Expected implementation write set after owner admission:
  src/modules/goals/okr-progress/model.mjs, server.mjs, client.mjs (if needed)
  src/app/api/goals/alignment/route.js
  src/app/goals/goal-detail-page.js, goal-detail.css, i18n copy
  focused tests and e2e scenarios
  this feature package's evidence docs

Explicit exclusions:
  PROJECT_BOARD.md, AGENTS.md, PROJECT_CONTEXT.md, product.md, ARCHITECTURE.md,
  quick-record writer, new store, migrations, external connectors, deployments,
  unrelated dirty files, commits, pushes, merges, or board/OKR modifications.
```

**Integration order**: owner discussion and board mapping → contract/model tests → deterministic snapshot → detail UI → route/runtime → browser/PWA regression → independent acceptance. One writer owns shared model/UI files at a time.

## Test and Evidence Plan

- Model: date boundaries, future plans, invalid dates, legacy associations not excluding sources, 366-day bound, stable order, 100/200/360 limits, fingerprint changes, status semantics.
- Contract/route: exact disclosure fields, request size, bearer/same-origin, source allowlist, enum/unknown-field rejection, one-call/no-retry, response citations, stale/account binding, no raw logs, zero writes.
- Browser: one-button journey, no-data/plan-only/record-only/irrelevant/conflict/over-limit states, citations, cancellation, late response, account change, offline, keyboard, reduced motion, English/Chinese, 320/390/426/768/1280px.
- PWA/account/backup: quick-record non-regression, authenticated offline browsing and recording, account replacement, old backup round trip, raw record byte preservation.
- Full gate: `npm run design:check`, `npm run check`, `git diff --check`.
- Manual evidence (SC-005): owner 390px review, real provider quality/latency, real account isolation, cross-device CAS, and 14-day personal-use observation remain open.

## Rollback and removal

Disable the route and remove the Goal-detail entry, model adapter, tests and copy; keep Goals, plans, records, associations, backups and manual recording unchanged. No migration is necessary because the review result is not persisted.

## Complexity Tracking

| Added complexity | Why it is needed | Simpler alternative rejected |
| --- | --- | --- |
| Period snapshot with separate plan/record bounds | Makes one-click review bounded and auditable | Sending the full account document crosses privacy and cost limits |
| Cited multi-state judgment | Distinguishes activity from outcome evidence | One score hides uncertainty and treats missing records as failure |
| Existing AI route reuse | Provides explanation without a new writer | Background analysis would add privacy, cost and lifecycle policy |
