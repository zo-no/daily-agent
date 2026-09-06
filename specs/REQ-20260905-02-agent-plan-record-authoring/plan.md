# Implementation Plan: Agent 计划与记录编写闭环

**Requirement**: `REQ-20260905-02` | **Date**: 2026-09-05 | **Spec**: [spec.md](spec.md)

## Summary

Extend the accepted LN-084 bridge with clear plan and record authoring semantics. Reuse the existing
`planBlocks`, `entries`, normalization, `commitData`, revision/CAS, backup, and offline paths. Keep
the bridge single-target and proposal-first. Do not add record intervals or a second persistence path.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing Zod schemas, plan/data models, LN-084 MCP bridge, and current
`LogNoteDataProvider`; no new dependency is expected.
**Storage and Ownership**: Current account local cache and Supabase text document remain canonical;
Agent proposals are transient and the browser owns commits.
**Testing**: Node test runner, focused MCP/controller regressions, Playwright mobile/PWA, design check,
and the full quality gate.
**Target Platforms**: Authenticated mobile-first browser plus supported Codex/Claude stdio clients.
**Performance Goals**: A bounded local proposal/read journey should complete without an additional
background process or home-page startup cost; payload limits remain those defined by LN-084.
**Constraints**: Account isolation, local-first offline use, revision safety, raw-text integrity,
backup compatibility, Google-plan read-only semantics, and explicit confirmation.
**Scale/Scope**: One plan or record per proposal; no unbounded batch or interval-record migration.

## Source-of-Truth and Readiness Check

- [x] The board item, dependency on LN-084, acceptance, and verification method are explicit.
- [x] Product admission is recorded in `product.md` and this package.
- [x] Existing dirty changes are excluded from the write set.
- [x] One writer owns the implementation; this package does not authorize concurrent work.
- [x] No new homepage control, cloud writer, or persistence store is proposed.

## Constitution Check

- [x] Quick recording and authenticated offline use remain unchanged.
- [x] Account ownership and stale revision protection are preserved.
- [x] Raw records change only through explicit confirmed fields.
- [x] Privacy, backup, rollback, and removal boundaries are defined.
- [x] Tests and real-client evidence are mandatory and separate.
- [x] The slice is bounded to existing plan/record entities.

## Existing System Investigation

- `src/lib/plan-model.mjs` is the canonical plan normalizer and enforces valid time blocks.
- `src/lib/data.mjs` is the canonical record/state normalizer and backup compatibility boundary.
- `src/app/log-note-data-provider.js` owns local-first `commitData` and revision/CAS synchronization.
- `src/modules/agent-bridge/mcp/` owns LN-084 validation, snapshots, proposals, and browser controller.
- Existing `RecordComposer`, `PlanEditor`, and category allowlists remain the product editing paths.

## Proposed Design

### Data and Control Flow

```text
read bounded snapshot → choose one target → create inert proposal → show before/after
→ explicit user confirmation → re-read current browser state
→ validate target/category/source/fingerprint/revision/expiry
→ one commitData update → local read-back → existing CAS sync status
```

Plan proposals expose date, start/end time, title, and flexibility. Record proposals expose only the
existing date, time, content, category, and explicitly selected existing metadata. A create receives a
generated ID only at commit time; update/delete bind to a previously read target. Failure at any check
leaves the state, backups, and exports unchanged.

### Trust and Privacy Boundaries

The external Agent sees only the LN-084 allowlisted snapshot and proposal. The browser binds every
operation to the current authenticated session generation. No token, service key, full document,
Google private field, attachment byte, or other-account value crosses the bridge. Logs are redacted.

### UI and Interaction Contract

Proposal review remains in the isolated Agent Bridge settings surface. It must show exact target,
operation, date/time, category, and before/after values; confirmation and rejection stay keyboard
reachable with 44px targets. The home quick-record surface and existing Plan editor geometry do not
change.

## Project Structure and Write Set

```text
Read: AGENTS.md, PROJECT_CONTEXT.md, PROJECT_BOARD.md, product.md, ARCHITECTURE.md,
     specs/REQ-20260905-01-agent-mcp-bridge/**, src/lib/data.mjs, src/lib/plan-model.mjs,
     src/app/log-note-data-provider.js, existing Plan/Record tests and UI.
Write: src/modules/agent-bridge/mcp/** only where LN-085 semantics are missing;
       tests/agent-plan-record-*.test.mjs, e2e/run-mobile.mjs focused authoring cases,
       specs/REQ-20260905-02-agent-plan-record-authoring/**, and product/board evidence when required.
Exclude: LN-084 transport/pairing, entries endTime, Google Calendar, homepage redesign,
         migrations, service keys, direct cloud writes, commits/push/deploy, unrelated dirty files.
```

## Verification Plan

- Unit/model: plan and record CRUD, allowlists, source distinction, exact raw content, stale and
  idempotent behavior.
- Browser/PWA: read/propose/confirm/read-back, account replacement, revocation, offline refusal,
  unchanged manual recording and backup/export.
- Gate: focused tests, `npm run design:check` for interaction changes, `npm run check`, and
  `git diff --check`.
- Manual: one redacted real Codex or Claude journey on a synthetic account; no acceptance claim without it.

## Rollback and Removal

Disable the LN-085 action semantics and remove their tests and documentation. No entries, plans,
backups, cloud rows, or image blobs require migration because proposals and session state are transient.
