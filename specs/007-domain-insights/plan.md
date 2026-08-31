# Implementation Plan: Local Domain Insights

**Branch**: `007-domain-insights` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)
**Board item**: `LN-010 Phase 1`

## Summary

Add a contextual analysis control stacked below the currently active domain label in the mobile home-page rail, plus a compact desktop entry. The active label and action form one right-rail column and do not occupy the left reading surface. The control opens `/insights`, where the authenticated account's existing local records are summarized over a fixed rolling 30-calendar-day window by domain. The selected product-owner rework reduces the page to one compact domain selector, one short evidence state, one truthful 30-day line, and one on-demand selected-day detail; it explicitly removes permanent totals/splits, the visible record index, excerpts, generic reflection copy, and repeated trend prose. Investment-like domains retain only the fixed non-advice boundary; the local phase does not calculate returns, fetch market data, or recommend transactions.

The entire result is derived in memory from `useLogNoteData()` and is never persisted or sent over the network. Raw notes remain unchanged.

## Technical Context

**Language/Version**: JavaScript, React 19, Next.js 15
**Primary Dependencies**: Existing application dependencies only; Canvas 2D for the interactive straight line
**Storage**: Read-only use of the account-scoped hydrated application payload; no schema or backup-format changes
**Testing**: Node unit tests, the repository Playwright regression suite, PWA checks, design checks, mobile visual review
**Target Platform**: Mobile-first responsive web app and installed PWA
**Performance Goal**: Derive and render a 30-day view from 5,000 records within one second on the supported test environment
**Constraints**: Offline-capable, no external analytics or AI service, no raw-note mutation, no new required recording step, 44 px minimum interactive targets
**Scale/Scope**: One account payload, all configured domains, fixed 30 daily buckets, bounded internal evidence derivation with no visible record index

## Readiness and Constitution Check

- `PROJECT_BOARD.md`, `product.md`, `DESIGN.md`, `设计规范/AGENTS.md`, and the relevant design sources were read before implementation.
- The requested behavior is attached to existing board item `LN-010`; the board will split a shippable local Phase 1 from the later persisted experiment loop whose dependencies remain unmet.
- The feature admission records core-loop value, interface cost, offline/privacy behavior, reversibility, verification, and non-adoption criteria.
- The working tree is already dirty. This plan uses one writer and an explicit narrow write set, preserving all unrelated changes.
- The feature is secondary and read-only. It neither changes home-page recording steps nor silently rewrites notes.
- No new remote trust boundary, account data store, market-data dependency, or investment-action generator is introduced.

## Project Structure

### Documentation

```text
specs/007-domain-insights/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
└── checklists/
    └── requirements.md
```

### Existing relevant source

```text
src/app/page.js
src/app/home-domain-rail.js
src/app/home-timeline.css
src/app/home-header.js
src/app/home-header.css
src/app/management-header.js
src/lib/data.mjs
src/lib/i18n.mjs
public/sw.js
tests/
e2e/
```

### Planned additions

```text
src/lib/analytics-model.mjs
src/app/insights/page.js
src/app/insights/insights-page.js
src/app/insights/insights.css
src/app/insights/trend-chart.js
public/ui/diary/rail-insights.png
tests/analytics-model.test.mjs
```

## Data Flow

1. The mobile domain rail already identifies `activeSectionId` through scroll position. Only the active domain exposes an analysis action below its label in the same right-rail column, linking to `/insights?domain=<id>`.
2. The desktop header exposes the same secondary destination without changing the established mobile Search → Settings → Time/Category → Diary/Plan order.
3. `/insights` reads the current authenticated account payload from `useLogNoteData()` after hydration.
4. A pure model builder creates exactly 30 local-date keys, maps categories to domains and templates to periodic/non-periodic, then scans qualifying records once.
5. Each qualifying record contributes to exactly one domain or to an explicit unresolved bucket. The model computes totals, active days, daily counts, bounded internal source references, trend direction, and internal investment-name/coverage facts used only by regression. Internal source references and investment coverage are not listed in the page UI.
6. The page selects the requested domain when valid, otherwise the first domain with records, then
   the first configured domain. A Canvas component draws the selected daily totals as a straight
   30-point line. One focusable wrapper maps pointer or keyboard selection to a daily point and
   exposes the selected date's total/subtype counts plus 30-day active days through real DOM text.
7. Account or payload changes trigger a fresh in-memory derivation. Nothing is written to local storage, IndexedDB, Supabase, logs, or backup payloads.

## Trust Boundary

The analysis may read only existing account-owned domain, category, template, and record fields needed to group and display the review. It performs no fetch, analytics beacon, AI call, market-data request, or console logging of note content. It returns computed display objects only. Investment domains receive only the fixed non-advice boundary; the local view has no investment prompt and cannot produce buy, sell, hold, allocation, timing, price-target, or return claims.

The future weekly AI summary is intentionally excluded from this package and belongs to its own
`LN-074 Rework 16` specification. The local chart must remain fully usable when that secondary
network capability is unavailable or removed.

## UI Contract

- Mobile: a separate 44 px action appears below the currently active domain label, using a local transparent hand-drawn asset and an explicit accessible label. The label and action share one right-rail column with at least 4 px vertical clearance; the domain mark remains aligned to the spine and the domain control keeps its scroll role.
- Desktop: a compact secondary Insights link appears in the header; the established mobile rocker order remains unchanged.
- Page: reuse the management header and the product's quiet open-paper surface. Avoid a dashboard card wall.
- Primary content: compact domain selector, selected domain plus 30-day window, one short evidence-state label, and one interactive straight-line daily rhythm. The selector is the only permanent record total; the selected date reveals daily total, ordinary/periodic split, and 30-day active days on demand. The default surface has no permanent metric band, record index, source excerpt, or generic reflection block.
- Investment content: only a clear “record review, not investment advice” boundary; no visible coverage, prompt, source link, or excerpt.
- States: hydration, recovery, empty domain list, insufficient evidence, zero-activity domain, unresolved records, and offline reload all have explicit handling.
- Accessibility: semantic buttons/links, keyboard operation, 44 px targets, focus visibility, non-color trend labels, Canvas text alternative, and no motion dependency.

## Visual Thesis

The page should feel like a distilled archival folio opened from the notebook's index—not a financial terminal or generic SaaS dashboard. One calm blue line is the visual anchor. Typography, ruled separators, warm paper, and restrained negative space carry hierarchy; the user should understand the selected domain and 30-day rhythm without permanent metric bands, then reveal the exact daily total, subtype split, and active-day concentration directly below the chart when needed.

## Content and Interaction Plan

- Lead with the compact domain selector, then the selected domain/window and one evidence-state line.
- Let users switch domains without leaving the page.
- Use one compact 30-day straight line with start/middle/end date labels. Pointer or the single keyboard focus reveals one two-line daily detail below the chart; omit permanent totals, source records, excerpts, and the generic prompt.
- Keep the fixed investment boundary below the general rhythm without a coverage ledger or recording prompt; it remains mandatory in empty, insufficient, and ready states.
- Link back through the existing management header; opening and reviewing remain within two navigation levels.

## Write Set

- Product/process: `PROJECT_BOARD.md`, `product.md`, `DESIGN.md`, relevant files under `设计规范/`, `specs/README.md`, `.specify/feature.json`, and this feature package.
- Model/localization: `src/lib/analytics-model.mjs`, `src/lib/i18n.mjs`.
- UI: `src/app/insights/**`, `src/app/home-domain-rail.js`, `src/app/home-timeline.css`, `src/app/home-header.js`, `src/app/home-header.css`; `src/app/page.js` only if source return context requires it.
- Offline/asset: `public/ui/diary/rail-insights.png`, `public/sw.js`, `src/app/service-worker-registration.js`.
- Verification: focused model/E2E/PWA tests, screenshot output, and `design-qa.md`.

No other file is in scope without a recorded plan update.

## Verification Plan

1. Unit-test date boundaries, domain/category mapping, unresolved handling, periodic split, insufficient-evidence threshold, deterministic trend direction, investment-name recognition, internal source bounding, and input immutability.
2. Run focused browser coverage for current-domain entry, route fallback, domain switching, the absent visible record index, chart text alternative, investment boundary, loading/empty states, and mobile/desktop target geometry.
3. Capture 320, 390, 426, 768, and 1280 px evidence; compare the 390 px home rail against the supplied screenshot and inspect the insights page in the in-app browser.
4. Verify direct offline reload of `/insights` and update the service-worker cache contract.
5. Run `npm run design:check` and `npm run check`.
6. Complete `design-qa.md` with a passing final result before handoff, then record evidence and remaining real-use validation on the board.

## Rollback and Isolation

The feature can be removed by deleting the `/insights` route, its two entry links, the pure model, local asset, translations, and service-worker shell entry. Because no persisted schema or backup payload changes, rollback requires no data migration. A 14-day real-use review should keep the surface isolated or remove it if fewer than 20% of active users open it twice, if users interpret the fixed boundary as investment guidance, or if the entry harms quick-record completion.

## Complexity Tracking

| Decision | Why needed | Simpler alternative rejected |
|---|---|---|
| Pure bounded analytics model | Guarantees deterministic, testable, offline account-scoped derivation | Computing ad hoc inside React would mix privacy-sensitive grouping with rendering |
| Compact Canvas rhythm with text equivalent | Supports a real variable data series and the selected one-glance visual without a new dependency or fake static graphic | A new chart library adds bundle/API surface; an image cannot represent live data |
| Current-domain-only mobile action | Matches the supplied interaction target while containing rail cost | Repeating an action for every domain would crowd the binding and add duplicate controls |
| PWA document-shell update | Direct offline reload is part of acceptance | Online-only navigation violates the product invariant |
