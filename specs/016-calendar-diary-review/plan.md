# Implementation Plan: Calendar and Diary Review

**Board Item**: `LN-081` | **Date**: 2026-09-04 | **Spec**: [spec.md](spec.md)

## Summary

Extend the unmounted today-review draft into a Google-Calendar-versus-diary review on `/insights`.
Reuse the current account-scoped Calendar cache, same-origin authenticated AI boundary, Mastra structured
proposal adapter, and strict project normalizer. Local facts render without AI. The browser projects real
sources to opaque request-local IDs and requires explicit approval before transfer. Results stay transient.
A development-only code-defined workflow reuses the same schemas/normalizer and suspends before generation
so Studio can inspect approve/reject paths with synthetic data.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing React context/state, Zod, Mastra 1.27.2, AI SDK DeepSeek adapter; no new dependency
**Storage and Ownership**: Existing account-scoped Google cache and Log Note document are read-only sources;
review input, approval, run state, and output are transient
**Testing**: Node test runner, Playwright mobile E2E, Studio workflow tests, PWA production checks, design validation
**Target Platforms**: Authenticated mobile-first browsers, desktop responsive layouts, localhost Mastra Studio
**Performance Goals**: Local derivation under one render turn for 40 events/80 entries; one approved Provider call,
zero retry, 25-second browser ceiling; no idle background work
**Constraints**: Today-only, account isolated, explicit transfer approval, opaque IDs, no writes, backup compatible
**Scale/Scope**: 40 Calendar sources, 80 diary sources, 12 suggestions, widths 320/390/426/768/1280

## Source-of-Truth and Readiness Check

- [x] `LN-081` exists with outcome, permissions, acceptance, and explicit open evidence.
- [x] `product.md` records the durable feature-admission decision.
- [x] `DESIGN.md`, `docs/设计规范/AGENTS.md`, and the Insights/page rules were read.
- [x] The dirty tree was inspected; LN-080, Google-scope, and other user changes remain excluded unless a
      mixed-file hunk is explicitly required by LN-081.
- [x] This session is the only writer.

## Constitution Check

- [x] Quick recording and the home page are unchanged; the feature lives on secondary Insights.
- [x] Existing account cache and authenticated offline use remain available; AI is optional and no-send offline.
- [x] Raw notes and Calendar events are never written; suggestions are inert and removable.
- [x] The request/exclusion allowlist, opaque IDs, credentials, failure, backups, and removal are specified.
- [x] Focused regressions and `npm run check` are mandatory.
- [x] The slice reuses one route/model/provider and one Studio adapter without a generalized platform.
- [x] Commit and push are authorized; deploy, merge, PR, history rewrite, deletion, and OKR changes are not.

Post-design check: all gates remain satisfied. Human approval is placed before private content crosses the
same-origin/Provider boundary. Studio receives synthetic input only and has no application read/write path.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/google-calendar-provider.js` already owns authorized, account-scoped cached timed/all-day events.
- `src/app/insights/insights-page.js` owns authenticated data readiness and existing daily/weekly sections.
- The unmounted `daily-plan-review.*` draft has local facts, disclosure, Provider, Route Handler, and tests,
  but currently reads local plans, excludes Google events, lacks opaque request IDs/fingerprint, and is absent
  from Insights.
- `src/mastra/index.mjs` remains production request-scoped. `src/mastra/index.ts` is the Studio registry.
- `createStructuredProposalWorkflow` already provides strict one-call generation for production but disables
  snapshots and has no suspend step; the new Studio workflow stays separate.
- LN-079 provides the established Insights lifecycle, stale invalidation, accessibility, and Studio boundaries.

### Reuse and Compatibility Decisions

- Adopt and rename the untracked draft rather than create a parallel plan-review implementation.
- Consume `useGoogleCalendar()` from the already wrapped Insights page; never fetch Google from route/Studio.
- Keep `/api/organize/day-review` as the narrow endpoint but rename symbols/capability to calendar-diary review.
- Centralize input/output Zod schemas and instructions in the route module for production and Studio reuse.
- Project real source IDs to `event-001`/`entry-001` before Provider input; the route sees no persistent IDs.
- No data schema, localStorage key, Supabase path, Calendar OAuth scope, service worker contract, or backup changes.

## Proposed Design

### Data and Control Flow

```text
current account + device-local today
  → cached Google timed/all-day events + today entries
  → bounded immutable projection + opaque IDs + deterministic fingerprint
  → local facts (zero network)
  → user opens exact disclosure (zero network)
  → explicit approve
  → authenticated same-origin Route Handler → one structured Agent call → strict normalizer
  → browser revalidates request/fingerprint/source IDs → session-only suggestions

Studio synthetic input
  → validate/count step → suspend approval step
  → reject: terminal no-call result
  → approve: one Agent generation → same normalizer → transient workflow result
```

Account/date/source/fingerprint change, navigation, Stop, or a newer request aborts/invalidates results.
Provider failure produces an unavailable state; deterministic local facts remain visible and are never labelled AI.

### Trust and Privacy Boundaries

- Browser receives current account data and Calendar cache; only it knows persistent IDs and token memory.
- Route receives the strict fields in `contracts/api-contract.md`; Bearer verifies route access but the server never
  reads the account document or Google API.
- DeepSeek receives the same sanitized request; source strings are untrusted content, not instructions.
- Output accepts only allowed suggestion kinds and request IDs, is revalidated in browser, and is never written.
- Studio receives operator-supplied synthetic values only; no auth/cache/Calendar/Supabase imports or tools/memory.

### UI and Interaction Contract

- Place one global today section before the domain report content; it does not depend on selected domain.
- Show three compact facts and bounded local issues on open paper, not a card or modal.
- No Calendar events: explain connection/cache absence and hide remote action.
- Open action reveals counts, exact transmitted fields, exclusions, and transient/no-write behavior.
- Approve, Cancel, Stop, Retry are real 44px controls with logical focus restoration and polite status.
- Long localized text wraps without overflow at all five target widths; reduced motion changes no meaning.

## Project Structure and Write Set

```text
Write:
  PROJECT_BOARD.md, product.md, ARCHITECTURE.md
  specs/016-calendar-diary-review/**, .specify/feature.json
  src/app/insights/insights-page.js, src/app/insights/insights.css
  src/app/insights/daily-calendar-review.js
  src/app/api/organize/day-review/route.js
  src/lib/daily-calendar-review-model.mjs
  src/lib/daily-calendar-review-provider.mjs
  src/lib/daily-calendar-review-route.mjs
  src/lib/i18n.mjs, src/lib/public-policies.mjs
  src/mastra/index.ts, src/mastra/studio-calendar-diary-review.mjs
  src/mastra/workflows/human-reviewed-proposal-workflow.mjs
  tests/daily-calendar-review-model.test.mjs
  tests/ai-daily-calendar-review-route.test.mjs
  tests/mastra-calendar-diary-workflow.test.mjs
  tests/project-structure.test.mjs, tests/public-policies.test.mjs
  e2e/run-mobile.mjs
  docs/2026-09-04-Google日历与今日记录复盘工作流介绍.md

Exclude:
  LN-080 source/spec/design changes; Calendar OAuth scope/client/sync/cache format; record/plan schema;
  commitData/Supabase/export/backup; LN-079 behavior; deployment, generated output, PR/merge/history/OKR
```

**Integration Order**: One writer locks contracts, adds failing model/route/workflow tests, adopts the draft,
mounts the UI, updates docs/policy, runs focused tests, Studio verification, design/full gates, audits/stages only
LN-081, commits, pushes, and verifies the remote hash.

## Test and Evidence Plan

### Automated Regression

- Model: today filtering, timed/all-day matching, overlap, bounds, opaque projection, stable fingerprint, forgery.
- Route/provider: exact allowlist, unknown keys, limits, auth/origin/rate/body/timeout, one call, strict output.
- Workflow: suspended pre-call state, approve one call, reject zero call, invalid resume data, same normalizer.
- Browser: local facts, no-Calendar zero action/call, disclosure cancel, approve, stop/stale, no writes, five widths.
- Structure/policy: Studio registration/no privileged imports and exact bilingual disclosure.
- Full gate: `npm run design:check`, `npm run check`, `git diff --check` under Node 22.

### Real-Environment or Manual Evidence

Use intentionally non-sensitive Calendar/diary content to verify a real OAuth cache and three Provider runs.
The owner must reconcile every retained suggestion, review the 390px density, and decide after 14 days whether
usage/latency/clarity meet the exit condition. Studio is local developer evidence, not deployment acceptance.

### Acceptance Evidence Handoff

Record focused counts, full-gate stages, Studio workflow/API/browser evidence, screenshot path, exact commits and
remote hash, Sigo document review, and all remaining OAuth/Provider/owner/deployment checks in the LN-081 row.

## Rollback, Removal, and Migration

No migration exists. Removing the Insights section, dedicated model/provider/route, Studio registration/workflow,
translations/styles/policy paragraph, and docs restores the previous behavior. Source records, cached Calendar
events, backups, and cloud documents need no conversion or cleanup.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Opaque projection and fingerprint | Prevent persistent IDs from leaving and stale output from rendering | Sending existing IDs or binding only date weakens privacy and ownership |
| Studio-only suspend workflow | The user explicitly requested visible Human-in-the-loop inspection | Production HTTP cannot remain paused across a human decision; no suspend would hide the requested checkpoint |
| Separate global today section | Calendar comparison is cross-domain and cannot belong to one selected domain | Folding it into LN-079 would break that feature's current-domain/no-plan contract |
