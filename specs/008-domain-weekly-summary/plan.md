# Implementation Plan: Confirmed Seven-Day Domain Summary

**Board Item**: `LN-074 Rework 16` | **Date**: 2026-08-31 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

Add one removable, session-only AI summary beneath the completed local 30-day line. A pure browser
selector constructs a seven-day current-domain whitelist and disclosure facts. A separate
authenticated `/api/organize/domain-review` route calls the existing configured DeepSeek boundary,
validates a deliberately small response, and returns no local imitation on failure. The page owns a
two-step disclosure/loading/result state machine and aborts it whenever context changes.

## Technical Context

**Runtime**: Node.js 22 target, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: existing React, AI SDK, Zod, Supabase authentication; no new dependency
**Storage and Ownership**: active account payload is read locally; input and result are page-session only
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: disclosure is immediate; server timeout 20s; client timeout 25s; normal real-model target under 8s
**Constraints**: local-first core remains usable, account isolated, revision safe, offline capable, backup compatible
**Scale/Scope**: seven dates, 80 entries, 4000 Unicode characters each, 256 KiB request, one route and one page

## Source-of-Truth and Readiness Check

- [x] `LN-074 Rework 16` exists with intended outcome, privacy boundary, dependencies, acceptance,
      and manual observation conditions in `PROJECT_BOARD.md`.
- [x] `product.md` contains the durable isolated-experiment admission and exit condition.
- [x] `DESIGN.md`, `设计规范/AGENTS.md`, and the domain-review page specification were read for the
      preceding line-chart work and remain the visual source of truth.
- [x] The dirty working tree was inspected; unrelated user screenshots, docs, and source changes
      remain untouched.
- [x] One writer owns the main checkout; parallel agents are read-only.

## Constitution Check

- [x] Quick-record steps and the home page's primary job remain unchanged.
- [x] Authenticated offline CRUD, account ownership, and stale-revision safety remain unchanged;
      only the optional remote summary is unavailable offline.
- [x] Raw notes are never rewritten and the summary has no write action.
- [x] Exact request fields, authentication, secret handling, limits, failure behavior, persistence,
      backups, and removal are specified.
- [x] Unit, route/provider, browser, PWA, design, and full-gate tests are mandatory.
- [x] This is one confirmed summary with no chat, persistence, background work, or generalized AI.
- [x] No commit, push, publish, deploy, deletion, reset, history rewrite, OKR change, or worktree
      merge is required.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/insights/insights-page.js` owns current account/domain selection and the local review UI.
- `src/lib/analytics-model.mjs` already resolves category→domain and periodic template membership.
- `src/app/auth-provider.js` exposes the current identity/session and changes on account replacement.
- `src/lib/ai-classifier-route.mjs` supplies 256 KiB JSON reading, same-origin/Bearer helpers,
  private/no-store responses, bounded strings, 80×4000 limits, 20s timeout, typed errors, and rate limiting.
- `src/lib/daily-review-route.mjs` supplies the current AI SDK + Zod structured-output pattern.
- `src/lib/*-provider.mjs` supplies caller Abort plus 25s browser timeout patterns; this feature must
  omit their deterministic local-fallback behavior.
- `src/app/api/organize/review/route.js` supplies the Supabase token-verification route adapter.
- `tests/ai-daily-review-route.test.mjs`, `tests/analytics-model.test.mjs`, and `e2e/run-mobile.mjs`
  supply the focused contract and browser foundations.

### Reuse and Compatibility Decisions

Reuse only the security primitives and configured server provider. Add an independent domain-review
selector, route, provider, and tests; do not reinterpret the single-day organizer or Agent chat.
No storage version, database column, sync field, backup/export field, Service Worker result cache,
or migration is introduced. `LN-010 Phase 1` remains functional if every new module is removed.

## Proposed Design

### Data and Control Flow

1. `buildWeeklyDomainInput` receives the active account payload, selected configured domain, locale,
   and current local date. It validates the seven dates, resolves category ownership and periodic
   templates, filters current-domain records, counts all qualifying subtype totals, sorts newest by
   date/time/id, bounds text by Unicode characters, and returns at most 80 entries plus disclosure facts.
2. Activating the AI text action changes `idle → disclosure` only. Cancel/context change returns to
   `idle`; zero records never expose a start action.
3. Start creates a request-generation token and `AbortController`, changes to `loading`, obtains the
   current access token, and posts the strict whitelist to `/api/organize/domain-review`.
4. The route checks origin/content type/Bearer/account/rate/body, strictly sanitizes the seven-day
   request, calls DeepSeek with a 20-second abort, validates all response IDs and safety boundaries,
   and adds server-controlled provider/time metadata.
5. The browser validates the response again, confirms the generation token/context still matches,
   and changes to `result`; every failure becomes `unavailable` with a short localized code class.
6. Stop, re-analysis, domain/account change, and unmount abort and invalidate the generation. A
   re-analysis action returns to a fresh disclosure and cannot send immediately.

### Trust and Privacy Boundaries

- Browser selection source: current account's local `domains/categories/templates/entries` only.
- Browser → same-origin route JSON: exactly `windowStart`, `windowEnd`, `domainName`, `locale`, and
  `entries[{id,date,time,content,sourceType}]`.
- HTTP authorization: current Supabase access token in the header; never included in the JSON or model prompt.
- Route → configured DeepSeek: the sanitized whitelist only; server secret remains environment-only.
- Explicit exclusions: account/user/email, category/domain IDs or trees, tags, attachments/images,
  field objects, template IDs, plans, other domains/dates, full document, logs containing note text.
- Authentication authorizes route use; the server does not fetch the account document. The
  account-isolated browser selector establishes current-account/domain scope. The server treats IDs
  and text as untrusted request data, never dereferences other-account data, stores nothing, and
  returns no source text.
- Limits: 7 inclusive dates, 80 unique entries, 4000 Unicode characters each, 256 KiB body, per-user
  rate limiter, 20s server timeout, 25s client timeout, no retries, private/no-store response.
- Response: overview and up to three unique themes with only request IDs; provider/time are server
  controlled. IDs remain internal validation data and are not rendered.
- Failure: no local summary fallback, no persistence, no write, and no stale result reuse.

### UI and Interaction Contract

- Place one borderless 44px-minimum text action after the chart, separated by a thin rule. It must
  read as secondary to the local line and must not become a rounded dashboard card.
- Disclosure is an open-paper inline region containing domain, local date span, ordinary/periodic
  totals, sent/omitted count, remote-text statement, and session-only/no-write statement.
- Use two clear 44px actions: Start summary and Cancel. Loading replaces them with status and Stop.
- Result contains a small state marker, one overview paragraph, and up to three ruled theme rows.
  No chat field, source links, IDs, excerpts, advice, gradient, thick shadow, or persistent control.
- Limited evidence has one fixed marker; zero records shows a quiet disabled/unavailable line.
- Investment-like domains keep the existing visible non-advice boundary regardless of AI state.
- Switching domain/account clears UI before replacement content; focus remains visible; all copy
  wraps at 320/390/426/768/1280px without page overflow; reduced motion removes transitions.

## Project Structure and Write Set

```text
Read/reuse:  src/lib/ai-classifier-route.mjs, src/lib/daily-review-route.mjs,
             src/app/api/organize/review/route.js, src/app/auth-provider.js,
             src/app/insights/*, tests/ai-daily-review-route.test.mjs
Change:      PROJECT_BOARD.md, product.md, DESIGN.md, specs/README.md,
             .specify/feature.json, specs/008-domain-weekly-summary/*,
             src/lib/domain-review-model.mjs, src/lib/domain-review-route.mjs,
             src/lib/domain-review-provider.mjs,
             src/app/api/organize/domain-review/route.js,
             src/app/insights/weekly-summary.js,
             src/app/insights/insights-page.js, src/app/insights/insights.css,
             src/lib/i18n.mjs, tests/domain-review-model.test.mjs,
             tests/ai-domain-review-route.test.mjs, e2e/run-mobile.mjs,
             设计规范/规范/页面/领域复盘页面规范.md, design-qa.md
Exclude:     migrations/schema, local/cache/sync/backup payloads, SW result caching,
             home primary controls, single-day Agent/organizer behavior, attachments/images,
             unrelated output assets and dirty user changes
```

**Integration Order**: completed LN-010 interactive line → selector/model tests → route/provider tests
→ UI state and disclosure → focused browser/offline → design QA/docs → full gate.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract: cross-month/year/leap seven-day bounds; current-domain/account filtering;
  ordinary+periodic inclusion; unassigned/other-domain exclusion; Unicode 4000 bound; deterministic
  newest-80 truncation; exact request keys; strict date/time/source type; duplicate IDs; forged IDs;
  duplicate/overlong themes; investment-output rejection; client response validation and Abort.
- Route/provider: origin, JSON, Bearer/Supabase verification, user-keyed rate limit, 256 KiB body,
  20s timeout, 25s client timeout, no retries/local fallback, private/no-store, typed failures.
- Browser/mobile: first click zero requests; cancel zero requests; confirm exactly one strict request;
  limited/zero states; valid compact result; re-analysis reconfirm; Stop/offline/error; domain/account
  switch and late completion; no writes; no source index/chat; 320/390/426/768/1280px and focus.
- PWA/offline/account: direct `/insights` stays available and the local line remains usable; weekly
  remote summary reports unavailable without caching request/result.
- Design validation: same-state 390×844 reference/implementation comparison plus responsive review
  and `npm run design:check`.
- Full gate: `npm run check` and `git diff --check`.

### Real-Environment or Manual Evidence

Use a non-sensitive test account to review real Chinese model quality and whether the disclosure is
trusted. Measure wall-clock Start-to-success time for at least three successful confirmed requests;
the 14-day median target is at most 8 seconds, while cancellations and failures are reported
separately. Observe repeat use for 14 days. Do not send real private notes during automated validation.

### Acceptance Evidence Handoff

Record exact focused/full commands and counts, request whitelist capture, abort/zero-request proof,
390/1280 screenshots, design comparison, unchanged local payload proof, and remaining real-model/
14-day checks in `PROJECT_BOARD.md`. Do not mark Accepted from synthetic automation alone.

## Rollback, Removal, and Migration

No migration. Remove the weekly-summary component, provider, route, model, translations, and spec
entry to restore the previous local-only review. There is no stored result to delete and existing
records/backups remain byte-compatible.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Independent domain-review route | Preserves the distinct seven-day whitelist and non-chat response contract | Reusing a single-day Agent endpoint would weaken both contracts |
| Two-step session state | Makes private text transfer explicit per request and cancels stale work | One-click generation would violate the selected disclosure boundary |
| Strict response and investment safety validator | Prevents fabricated sources, verbose output, and actionable financial text | Prompt instructions alone are not an enforceable boundary |
