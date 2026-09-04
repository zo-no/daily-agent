# Implementation Plan: Current-Domain Daily Summary

**Board Item**: `LN-079` | **Requirement**: `REQ-20260903-01` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

Add one compact, current-domain “today” section after the existing 30-day chart and before the
seven-day summary. The browser derives local-today ordinary/periodic counts from the active account's
hydrated payload, makes no request until a separate disclosure confirmation, and then sends one
strictly bounded request through a new `/api/organize/domain-daily-summary` contract. The route uses
the existing DeepSeek-to-Mastra request-scoped Agent/Workflow adapter with a new fixed
`domain-daily-summary` capability. Output is revalidated as a source-grounded, session-only overview
with at most three themes. A development-only Studio registration exposes the same bounded Agent and
two-step Workflow to operator-supplied synthetic input on localhost. The feature adds no product
write, storage field, migration, background task, standalone runtime, or plan comparison, and can be
removed without data cleanup.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: existing Next.js/React, Zod, `@mastra/core@1.63.2`,
`@ai-sdk/openai-compatible`, and the development-only `mastra@1.27.2` Studio CLI
**Storage and Ownership**: no new storage; selection reads the active account's hydrated local
payload and all disclosure/result state remains in the mounted page component only
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: preserve the existing 5,000-record insights derivation/render budget of at
most 1 second in the 390×844 Chromium fixture; one model call, zero automatic retry, 20-second server
and 25-second client timeouts; median visible result within 8 seconds across three real successful
non-sensitive requests remains external evidence
**Constraints**: local-first, account isolated, revision safe, offline capable, backup compatible
**Scale/Scope**: one selected domain and one device-local date; at most 80 transmitted records,
4,000 Unicode characters per record, 256 KiB HTTP request, 512 KiB provider-response ceiling, and
320/390/426/768/1280px responsive review

## Source-of-Truth and Readiness Check

- [x] The board item exists and its intended outcome, dependencies, permissions, acceptance, and
      verification method are clear.
- [x] `product.md` contains the durable LN-079 product admission and records the approved local
      ordinary/periodic split exception.
- [x] Visual and interaction planning read `DESIGN.md`, `docs/设计规范/AGENTS.md`, and the formal
      domain-review page specification.
- [x] The dirty working tree was inspected. The implementation write set identifies dirty overlap
      explicitly and excludes unrelated Google Calendar, home-Agent, CLI, and plan-review trials.
- [x] No second writer owns overlapping files or state; delegated research was read-only.
- [x] The owner has confirmed the product implementation and the bounded Studio debugging extension,
      and explicitly authorized commit and push. Publish, deploy, destructive cleanup, and history
      changes remain unauthorized.

## Constitution Check

*GATE: Must pass before implementation design and be re-checked after the design is complete.*

- [x] Core recording steps and the home page's primary job are unchanged; the feature improves browse
      only on the secondary `/insights` surface.
- [x] Authenticated offline CRUD, account ownership, and revision safety remain outside the feature;
      unavailable remote synthesis cannot block the local report.
- [x] Raw notes are never rewritten. The feature exposes no apply, save, delete, or `commitData` path.
- [x] Exact payloads, credentials, session lifetime, policy disclosure, response validation, backup
      exclusion, removal, and zero-write failure are specified.
- [x] Tests are mandatory and cover selection, contracts, disclosure, stale context, safety,
      responsive behavior, offline preservation, and the complete gate.
- [x] The design is one removable current-domain/current-day vertical slice and excludes planning,
      scheduling, chat, persistence, and generalized Agent infrastructure.
- [x] Commit and normal push are explicitly authorized. Publish, deploy, deletion, reset, history
      rewrite, OKR change, and worktree merge remain outside scope.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/insights/insights-page.js` already owns account-transition protection, domain selection,
  localized domain names, the 30-day chart, and provider composition. Its current dirty
  `DailyPlanReview` mount is a separate plan-versus-diary trial that conflicts with LN-079 and is not
  acceptance evidence.
- `src/app/insights/weekly-summary.js` defines the established inline state pattern: idle → disclosure
  → loading → result/unavailable, with focus return, AbortController, generation token, and no local
  AI fallback. It is reference behavior, not a shared daily state container.
- `src/lib/domain-review-model.mjs`, `domain-review-provider.mjs`, and `domain-review-route.mjs` own an
  exact seven-day contract. Their sanitizer rejects any non-seven-day window, so LN-079 cannot reuse
  or widen that public contract.
- `src/lib/analytics-model.mjs` is the current local domain/category/periodic classification precedent;
  the new selector reads the same active account payload but does not transmit analytics `_sources`.
- `src/lib/ai-route-boundary.mjs` owns same-origin/body/error primitives and shared 80-entry/4,000-
  character limits. `src/lib/deepseek-model.mjs` owns provider construction, timeout, response bound,
  and the only project import of `src/mastra/index.mjs`.
- `src/mastra/` already creates one capability-named, tool-free, memory-free Agent and a two-step
  generate→normalize Workflow with zero retries and snapshots disabled. Mastra's official workflow
  guidance also treats typed sequential steps as the predictable path; LN-079 needs no dynamic,
  durable, scheduled, or tool-using workflow.
- `src/app/api/organize/domain-review/route.js` is the App Router precedent for Supabase Bearer
  verification, account-rate limiting, Node runtime, and dynamic/no-cache handling.
- `docs/设计规范/规范/页面/领域复盘页面规范.md` currently admits the local 30-day chart and optional
  seven-day summary, but not the approved local-today split or daily disclosure states.
- `src/lib/public-policies.mjs` already discloses optional domain-summary transfer generally; LN-079
  needs a precise current-domain/today/session-only paragraph without weakening the existing Google
  Limited Use boundary.
- Existing weekly model/route and mobile E2E tests provide patterns, while LN-079 requires separate
  daily tests and selectors so weekly success cannot masquerade as daily evidence.

### Reuse and Compatibility Decisions

- Add dedicated `domain-daily-summary-*` business modules and public endpoint. Do not parameterize or
  edit the seven-day input contract, endpoint, component state, output, or tests.
- Reuse only stable shared boundaries: date/category/template semantics, `ai-route-boundary`,
  Supabase authentication/rate limiting, `runDeepSeekProposal`, and the generic Mastra adapter.
- Register `domain-daily-summary` as server-selected code, never request data. The Agent has no tools,
  memory, persistence, or write callback; one Workflow run generates and normalizes one result.
- Keep daily output validation capability-owned. Deliberate duplication of the small daily schema and
  safety vocabulary is preferred to renaming or weakening the accepted weekly module during this
  isolated change.
- Use daily-specific i18n keys, DOM selectors, Provider error codes, and session state. Do not reuse
  the dirty `insights.today*` plan-versus-diary language.
- Replace only the conflicting `DailyPlanReview` import/mount in `insights-page.js` when implementation
  is authorized. Leave its untracked files and route untouched; deleting or integrating that trial is
  outside LN-079.
- Register only the owner-approved LN-079 synthetic-input debugging primitive in `src/mastra/index.ts`.
  Reuse the production daily schema, normalizer, and generic Agent/Workflow factories; keep account
  lookup, browser storage, Supabase, tools, memory, snapshots, and writes absent. Product runtime code
  continues exclusively through request-scoped `index.mjs`.
- Existing data, URLs, seven-day results, account caches, sync revisions, exports, backups, and Service
  Worker behavior remain byte-compatible because no persisted model changes.

## Proposed Design

### Data and Control Flow

```text
active authenticated account payload + selected domain + local clock + locale
  → buildDailyDomainSummaryInput
       exact local-date/category membership
       ordinary/periodic counts
       stable newest-first normalization and newest-80 cap
       source/scope fingerprint kept in browser only
  → render compact today line (always local, zero request)
  → open disclosure (zero request)
  → separate confirmation
  → browser Provider strips UI-only fields and validates exact request
  → POST /api/organize/domain-daily-summary
  → origin + JSON + 256 KiB + Bearer + Supabase user + account rate limit
  → strict daily sanitizer
  → runDeepSeekProposal(capabilityId: domain-daily-summary)
  → one tool-free Mastra Agent generation
  → Workflow normalizer validates structure, overview/theme source coverage, and safety
  → private/no-store response
  → browser validates again and renders text only; source IDs stay hidden
```

The component owns `accountId/domainId/domainName/date/locale/sourceFingerprint` as one scope. Any
change increments a generation token, aborts the current request, clears disclosure/failure/result,
and reconstructs the local selection. A timeout scheduled for the next local midnight, plus
`visibilitychange`/focus refresh, advances the date even if the page stays mounted. Stop, unmount, or
a newer request uses the same abort-and-generation barrier. There is no local synthesized fallback:
the local today counts and existing chart remain usable while remote output is unavailable.

### Trust and Privacy Boundaries

- Browser selection reads only the current account payload already available to `/insights`. Internal
  `accountId`, `domainId`, category/template mappings, full source fingerprint, and omission reasons
  never enter the request.
- The exact request is `domainName/date/locale/entries[{id,date,time,content,sourceType}]`; it contains
  at most 80 stable newest sources and 4,000 Unicode characters per content. Plans, other dates/domains,
  unresolved structure, tags, attachments, images, fields, templates, category trees, credentials,
  account identity, and the full document are forbidden by strict-key validation.
- Only the authenticated same-origin Node route receives the request. The Supabase publishable key is
  used server-side to verify the Bearer token; the DeepSeek credential remains an environment secret.
- The configured model receives only sanitized input plus a fixed daily factual-synthesis prompt.
  Record text is untrusted data, not instructions. No private body, source text, token, or upstream
  detail may be logged or reflected in errors.
- Model output includes temporary `overviewEntryIds` and per-theme `entryIds` solely for source
  coverage and allowlist validation. The browser revalidates them but never renders them. Missing,
  unknown, or duplicate references, unsafe advice, invalid structure, excess lengths/themes, or
  investment actions invalidate the whole response. Schema validation cannot prove semantic truth;
  the fixed prompt restricts content to the referenced sources, while real source reconciliation
  remains explicit external acceptance evidence.
- All HTTP responses are `private, no-store`; component state is discarded on scope change/unmount
  and never reaches analytics, storage, sync, export, backup, or Service Worker caches.
- Offline, missing configuration, auth/origin failure, rate limit, timeout, upstream failure, abort,
  and invalid response produce bounded localized states and zero source writes.

### UI and Interaction Contract *(when applicable)*

- Preserve this reading order: domain selector → heading/evidence → 30-day chart/detail → local today
  line and daily action → existing seven-day summary → investment boundary/unresolved notice.
- Use one open-paper section with a thin rule and daily-specific selectors; no card shell, modal,
  gradient, thick shadow, chat, excerpt, source list, score, recommendation, or primary action.
- The default line shows localized exact date, total, ordinary, and periodic counts. This is the sole
  approved exception to the page's permanent subtype-split prohibition.
- First activation expands inline disclosure with domain/date/counts/omission/remote-transfer/session
  boundaries. Start and Cancel are separate buttons. Loading offers Stop. Failure offers Retry, which
  returns to disclosure rather than immediately requesting. Zero qualifying records are quiet and
  have no request action; records that cannot form a valid bounded payload show a no-send state.
- All interactive targets are real buttons at least 44×44px with visible focus and logical order.
  Status uses a polite atomic live region, loading uses `aria-busy`, Cancel/Stop return focus to the
  opener, success focuses Re-analyze, and failure focuses Retry. Reduced motion removes nonessential
  transition.
- Chinese/English copy and long domain names wrap without document overflow at
  320/390/426/768/1280px. Synthetic screenshots at 390px and desktop provide subjective density
  evidence; geometry assertions remain automated.

## Project Structure and Write Set

```text
Read/reference:
  AGENTS.md, PROJECT_BOARD.md, product.md, ARCHITECTURE.md, DESIGN.md
  docs/设计规范/AGENTS.md
  docs/设计规范/规范/页面/领域复盘页面规范.md
  docs/decisions/0004-domain-daily-summary-isolated-capability.md
  specs/008-domain-weekly-summary/**
  src/app/insights/**, src/app/api/organize/domain-review/route.js
  src/lib/analytics-model.mjs, src/lib/ai-route-boundary.mjs
  src/lib/domain-review-*.mjs, src/lib/deepseek-model.mjs, src/mastra/**

Allowed changes after separate implementation approval:
  PROJECT_BOARD.md
  product.md
  ARCHITECTURE.md
  DESIGN.md
  docs/设计规范/规范/页面/领域复盘页面规范.md
  specs/README.md
  .specify/feature.json
  specs/014-domain-daily-summary/**
  src/app/insights/insights-page.js
  src/app/insights/insights.css
  src/app/insights/daily-domain-summary.js                 # new
  src/app/api/organize/domain-daily-summary/route.js      # new
  src/lib/domain-daily-summary-model.mjs                  # new
  src/lib/domain-daily-summary-provider.mjs               # new
  src/lib/domain-daily-summary-route.mjs                  # new
  src/lib/i18n.mjs
  src/lib/public-policies.mjs
  tests/daily-domain-summary-model.test.mjs               # new
  tests/ai-daily-domain-summary-route.test.mjs            # new
  tests/project-structure.test.mjs
  tests/public-policies.test.mjs
  tests/mastra-studio.test.mjs                              # new
  e2e/run-mobile.mjs
  package.json, package-lock.json, .gitignore, .nvmrc
  src/mastra/index.ts, src/mastra/studio-domain-daily-summary.mjs

Explicit exclusions:
  src/app/insights/daily-plan-review.js, src/app/api/organize/day-review/**
  src/lib/daily-plan-review-*.mjs, tests/*daily-plan-review*
  src/app/page.js, src/app/use-home-agent.js
  src/app/settings/**, src/lib/google-calendar-model.mjs
  src/lib/domain-review-*.mjs, src/app/insights/weekly-summary.js
  persisted data/storage/sync/backup/export schemas, migrations, Service Worker, deployment
  unrelated dirty files; publish, deploy, delete, reset, history rewrite, OKR changes
```

Files already dirty in the allowed set (`PROJECT_BOARD.md`, `product.md`, `insights-page.js`,
`insights.css`, `i18n.mjs`, `public-policies.mjs`) require a fresh pre-edit diff and minimal hunk
patches; no formatter or whole-file rewrite may absorb adjacent user changes.

**Integration Order**: one main-checkout writer after owner approval: reconcile dirty hunks → update
living docs/design contract → add failing model/route/structure/policy tests → implement daily model
and Provider/route → replace only the conflicting page mount and add daily UI/styles/i18n → add browser
regression → add the bounded Studio registration → focused validation → real Studio/API inspection →
`design:check` → complete gate → record exact evidence without changing the item to Accepted.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract tests: `tests/daily-domain-summary-model.test.mjs` covers local today, current
  domain, ordinary/periodic classification, removed/unresolved and plan exclusion, invalid/duplicate
  sources, stable newest-80 selection, Unicode truncation without mutation, exact keys, sentence/theme
  bounds, required source coverage, duplicate/unknown IDs, general advice, and investment safety. The route/provider
  test covers auth/origin/type/body/rate limits, one call/no retry, timeout/Abort, private/no-store,
  strict payload/response, all safe errors, and the `domain-daily-summary` Mastra capability.
- Browser/mobile tests: add a separately filterable daily-summary journey to `e2e/run-mobile.mjs` for
  placement, zero-request open/cancel/empty, exact disclosure, one confirmed request, success without
  IDs/chat/write controls, Stop/late response, retry re-confirmation, offline/unsafe/invalid errors,
  source/domain/account/locale/date/page invalidation, weekly-state independence, focus, touch, and
  320/390/426/768/1280px overflow.
- PWA/offline/account tests: compare source payload/localStorage/export bytes before and after daily
  flows; verify authenticated offline `/insights` and local chart remain usable, no AI result is
  cached/restored, and account replacement never shows or sends the previous scope.
- Design validation: update the formal page specification, run `npm run design:check`, assert 44px
  targets/reduced motion/reading order, and inspect synthetic 390px plus desktop screenshots.
- Full gate: `npm run check`
- Studio: start `npm run studio`, verify the Agent and Workflow list APIs, inspect the two-step graph
  and synthetic input form in a real browser, then stop the local process after the user is finished.

### Real-Environment or Manual Evidence

- Measure at least three real, non-sensitive, successful configured-provider requests; record each
  confirmed start-to-visible-result duration and the median. This is required for the ≤8-second claim.
- Owner uses the feature at least twice over 14 days and records whether results are reconcilable with
  today's notes and whether the extra line crowds the report. Until then SC-007 remains pending.
- Review 390px/mobile and desktop screenshots for quiet paper hierarchy and long bilingual copy.
- Real deployment configuration, provider data handling, log redaction, and real account boundaries
  remain external evidence. Mocked route tests cannot prove them, and internal Node 20 deployment
  remains outside this Mastra-enabled release path.

### Acceptance Evidence Handoff

Record focused test names/counts, filtered E2E results, five viewport geometry checks, payload and
localStorage/export byte comparisons, `design:check`, `npm run check`, `git diff --check`, synthetic
screenshot paths, and the exact remaining latency/adoption/deployment evidence in `PROJECT_BOARD.md`.
Implementation may become `Returned`; only independent acceptance after external evidence may mark it
`Accepted`.

## Rollback, Removal, and Migration

No migration or persisted value exists. Removal deletes the daily component, endpoint, three daily
business modules, daily tests/copy/styles, capability inventory entry, and the precise policy/design
paragraph, then restores the page from chart directly to weekly summary. Existing records, plans,
domain/category/template structure, cache, revisions, Supabase document, exports, backups, weekly
summary, and Service Worker need no cleanup. A temporary feature toggle is unnecessary because the
slice is isolated and has no background execution.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Separate daily model/Provider/route/component | Exact one-day input and lifecycle must not weaken the accepted seven-day contract | Parameterizing `domain-review` would make its exact-seven-day validator, prompt, errors, and evidence ambiguous |
| Next-local-midnight invalidation | “Today” can change while `/insights` remains mounted | Data/domain effects alone do not fire when only the device calendar day changes |
| Precise public-policy paragraph | Personal text leaves the browser and this result is never applicable | The current general optional-AI paragraph does not state current-domain/today, 80×4,000, or unconditional session-only/no-write behavior |

## Post-Design Constitution Re-check

All Constitution gates remain passed after the design. The feature stays off the recording path,
reads only current account state, sends one disclosed bounded request, owns no storage or write,
preserves offline review and the weekly contract, includes removal and complete evidence plans, and
adds only the owner-requested development Studio CLI/registration. The owner has approved
implementation plus commit and normal push; publish and deploy remain closed.
