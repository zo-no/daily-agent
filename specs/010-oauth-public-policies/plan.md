# Implementation Plan: OAuth Public Policies

**Board Item**: `[LN-067]` | **Date**: 2026-08-31 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

Keep the three static bilingual public routes and exact provider boundary, while upgrading `/about`
from a policy-shaped document into a mature, brand-led product story. The page uses structured public
copy and a fixed illustrative Log Note surface to explain the core recording loop, local-first trust,
portability, and optional Google Calendar context. Privacy and Terms remain quiet legal documents;
Calendar sync, data models, storage, backups, and every non-public route remain unchanged.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing Next.js routing, React, and bundled fonts; no new dependency
**Storage and Ownership**: Static build content only; no account storage or cloud writes
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: Public and authenticated mobile-first browsers plus desktop responsive layouts
**Performance Goals**: Server-rendered readable HTML, no external page asset, no account/Calendar
provider startup on public routes, and no added authenticated-app startup work beyond pathname routing
**Constraints**: local-first core unchanged, account isolation, public signed-out access, accurate
Google Limited Use disclosure, backup compatibility
**Scale/Scope**: 3 public routes, 1 structured content model, 1 provider boundary, 1 promotional About
composition, 2 link surfaces, 320/390/1280 px evidence

## Source-of-Truth and Readiness Check

- [x] The board item exists and its intended outcome, dependencies, permissions, acceptance, and
      verification method are clear.
- [x] `product.md` contains the durable LN-067 data boundary and will receive a narrow public-policy
      support addendum.
- [x] Visual or interaction work has read `DESIGN.md` and `设计规范/AGENTS.md`.
- [x] The current dirty working tree was inspected; unrelated `output/playwright/**` evidence remains
      excluded from the write set.
- [x] No second writer owns overlapping files or state.

## Constitution Check

*GATE: Passed before design and re-checked after the design below.*

- [x] Core recording steps and the home page's primary job are preserved.
- [x] Authenticated offline use, account ownership, and stale-revision safety are preserved.
- [x] Raw notes are not silently rewritten; this feature has no data write.
- [x] Privacy, network payloads, credentials, backups, restore, and removal are fully specified.
- [x] Tests are mandatory and cover the acceptance scenarios and relevant failure paths.
- [x] The change is the smallest independently testable vertical slice with no speculative breadth.
- [x] Implementation does not require unauthorized commit, push, publish, deploy, deletion, reset,
      history rewrite, OKR change, or worktree merge.

**Post-design re-check**: Passed. The explicit public-path allowlist is narrower than changing
`AuthGate` semantics globally; structured static copy has no persistence/network path; legal links stay
secondary; the full existing gate remains mandatory for every other route.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/layout.js` currently mounts `AuthProvider → AuthGate → LogNoteDataProvider →
  GoogleCalendarProvider` around every page.
- `src/app/auth-provider.js` owns signed-out gate UI and protects every route except OAuth callback.
- `src/app/settings/settings-page.js` owns authenticated Account/Calendar controls and is the correct
  secondary in-product link surface.
- `src/lib/google-calendar-model.mjs`, `src/app/google-calendar-client.js`, and
  `src/app/google-calendar-provider.js` define the disclosure facts recorded in the policy contract.
- `src/app/globals.css`, `src/app/auth-gate.css`, and design documents define paper, typography,
  spacing, focus, responsive, and touch-target tokens.
- `tests/*.test.mjs` provides pure contract coverage; `e2e/run-mobile.mjs` provides signed-out,
  responsive, semantic, and link coverage.

### Reuse and Compatibility Decisions

Reuse root metadata conventions, bundled Instrument font roles, CSS tokens, Next links, and existing
auth/settings layouts. Keep all account gates, Supabase/Google clients, route aliases, local storage,
PWA behavior, cloud revision handling, notes/plans, and backup/export contracts unchanged. Public
pages are additive and require no migration.

## Proposed Design

### About Art Direction

- **Visual thesis**: an editorial field guide opened on warm archival paper—quiet, precise, and
  unmistakably a private journal rather than a generic SaaS card wall.
- **Content plan**: brand promise and action → one dominant product proof → core recording loop →
  four durable trust principles → optional Calendar context → final action and contact.
- **Interaction thesis**: a short staggered hero entrance establishes hierarchy; the product surface
  gains one restrained depth response on hover/focus; later sections may reveal once as they enter the
  viewport where supported. All motion is progressive enhancement and disappears under reduced motion.
- **Copy thesis**: lead with the reader's conflict—important moments are easy to lose, but capturing
  them should not turn life into a dashboard. Use concrete product facts, short bilingual pairs, and
  no unverified superlatives, adoption claims, certification, or privacy promises beyond the code.

### Data and Control Flow

1. Root layout keeps Service Worker registration and the language provider.
2. `AppProviders` reads the current pathname. Exact public paths render children directly; every
   other path uses the existing auth/data/Calendar provider chain.
3. Privacy and Terms select immutable documents from `public-policies.mjs` and render both localized
   variants through the shared document shell. About reads the same structured source but uses a
   dedicated promotional composition and shared masthead/footer primitives.
4. Public navigation uses same-origin links only; contact uses a `mailto:` link. No request or data
   mutation occurs.
5. Sign-in and Account settings render secondary links to the same three stable routes.

### Trust and Privacy Boundaries

- Public-page process: receives only versioned static content; no user/account/record/Calendar fields.
- Browser storage: public rendering reads no Log Note or Google Calendar keys. Existing locale
  persistence remains outside the policy data model and is not exposed.
- Supabase and Google: receive no request caused by public-page rendering.
- Credentials/tokens: never interpolated or logged; policy text contains only public contact data.
- External navigation: none except the public support `mailto:` action and a plain reference link to
  Google's policy if retained; external links use `noopener noreferrer`.

### UI and Interaction Contract *(when applicable)*

- About uses one edge-to-edge hero with constrained copy, one dominant illustrative journal/plan
  surface, open sections instead of a card grid, one `h1`, bilingual pairs, contact, and cross-links.
- Privacy and Terms keep the existing quiet document layout with compact masthead, effective date,
  parallel English/Chinese articles, and contact.
- Public navigation remains within one level; no modal, acceptance checkbox, animation, or homepage
  primary control.
- Body copy is at least 16 px; links and controls have visible focus and 44 px target height.
- Long scope and URL strings wrap; 320/390/1280 px have no horizontal overflow.
- Semantic `main`, `article`, `section`, headings, lists, address/contact, and language attributes.

## Project Structure and Write Set

```text
Read:
  PROJECT_BOARD.md
  product.md
  DESIGN.md
  设计规范/**
  src/app/layout.js
  src/app/auth-provider.js
  src/app/settings/settings-page.js
  src/app/google-calendar-*.js
  src/lib/google-calendar-model.mjs
  src/lib/auth-model.mjs
  tests/**
  e2e/run-mobile.mjs

May change:
  .specify/feature.json
  specs/010-oauth-public-policies/**
  product.md
  PROJECT_BOARD.md
  src/app/layout.js
  src/app/app-providers.js
  src/app/public-page-shell.js
  src/app/public-pages.css
  src/app/about/page.js
  src/app/privacy/page.js
  src/app/terms/page.js
  src/app/auth-provider.js
  src/app/auth-gate.css
  src/app/settings/settings-page.js
  src/app/settings-dialog.css
  src/lib/public-policies.mjs
  tests/public-policies.test.mjs
  e2e/run-mobile.mjs

Excluded:
  src/app/google-calendar-client.js
  src/app/google-calendar-provider.js
  src/lib/google-calendar-model.mjs
  Supabase schema/migrations
  public/service-worker artifacts unless a verified cache need appears
  output/playwright/** existing user evidence
```

**Integration Order**: Single writer: failing contract/E2E → policy model → provider allowlist →
shared pages/styles → sign-in/settings links → focused checks → full gate → board evidence.

**About Rework Integration Order**: update LN-067 artifacts → extend copy/claim regression → expose
shared masthead/footer → build About composition → responsive/keyboard/reduced-motion checks → full
gate → board evidence. Existing provider routing and legal pages are not rewritten.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract tests: `tests/public-policies.test.mjs` checks stable routes, shared identity,
  localization parity, About story order and claim guards, all material disclosure topics,
  implementation scope/window constants, no unsupported legal identity/jurisdiction, and public
  allowlist.
- Browser/mobile tests: `e2e/run-mobile.mjs` signs out, visits each route directly, checks headings,
  account-gate absence, cross-links, semantics, 44 px navigation, focus, and 320/390/1280 overflow.
  About also checks first-viewport identity/actions, fixed product proof, heading-only story order,
  no live form/account data, and reduced-motion behavior.
- PWA/offline/account tests: Existing PWA authenticated-offline and account-gate suites must remain
  green; no new precache claim is required.
- Design validation: Existing 11 design checks plus manual computed-size/overflow browser assertions.
- Full gate: `npm run check`.

### Real-Environment or Manual Evidence

After deployment, inspect the exact HTTPS routes in a private browser, verify domain ownership and
Google Cloud URL equality, review bilingual wording, and retain screenshots. Legal review, Google
publication/verification, and real-account Calendar lifecycle remain manual and require owner action.
Before publication, either obtain and evidence AI-provider contract/settings that prohibit generalized
model training of Google Workspace data plus a sufficient contextual consent flow, or remove
Calendar-derived context from every AI request. Public disclosure alone is not acceptance evidence.

### Acceptance Evidence Handoff

Record focused unit/browser counts, full gate result, checked viewports, written routes, disclosure
contract date, and remaining production/legal/Google checks in the LN-067 board row. Do not mark the
board item Accepted or claim deployment/publication.

## Rollback, Removal, and Migration

No migration exists. Remove the three routes, structured content/styles, legal links, and their exact
public allowlist entries to restore the previous gate. Account data, Calendar events, local cache,
Supabase documents, raw notes, and all backups remain intact.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Exact route-aware provider shell | Public review pages cannot sit behind the existing root gate | Public static `.html` files would use different URLs and duplicate app layout/metadata |
| Structured bilingual policy model | Google review and current users need consistent, testable disclosures | Inline duplicated prose would drift across languages and tests |
| Secondary sign-in/account links | Policy must be discoverable before and after authorization | Homepage controls would add noise to the core recording surface |
