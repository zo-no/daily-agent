# Feature Specification: Current-Domain Daily Summary

**Board Item**: `LN-079`
**Requirement**: `REQ-20260903-01`
**Feature Directory**: `014-domain-daily-summary`
**Created**: 2026-09-03
**Status**: Confirmed
**Input**: User description: "我想要做一个今日总结的功能，基于 Mastra，然后在领域页面展示。确认范围为当前领域、仅总结今日记录、不包含计划对照。"

**Developer extension**: On 2026-09-03, the owner also requested that the same bounded Agent and
Workflow be visible in localhost Mastra Studio for synthetic-input inspection. This does not add a
product entry point or relax the current-domain/session-only contract.

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove the acceptance claim.

### User Story 1 - Summarize today's selected-domain notes (Priority: P1)

As the author reviewing one domain, I can see how many ordinary and periodic records belong to that
domain today and explicitly request a concise synthesis, so I can understand the day's focus without
leaving the domain report or rereading every note.

**Why this priority**: This is the smallest complete form of the requested value. It improves browse
inside the existing domain context without adding a recording step, changing a note, or introducing
plan semantics that the domain model does not own.

**Independent Test**: With synthetic records across several dates and domains, open one domain report
and verify that the today line counts only that domain's local-today ordinary and periodic records;
open disclosure and confirm that exactly one bounded request produces a short result grounded only in
those records.

**Acceptance Scenarios**:

1. **Given** the selected domain has ordinary and periodic records today, **When** its report opens,
   **Then** a compact section after the 30-day line shows the local date, correct total, correct
   ordinary/periodic split, and a secondary action before the existing seven-day summary.
2. **Given** the author activates the daily-summary action, **When** the disclosure opens, **Then** it
   names the current domain and date, shows the included counts and remote-text boundary, and makes
   zero remote requests until the author separately confirms.
3. **Given** the author confirms a non-empty disclosure, **When** the request succeeds, **Then** the
   page shows one factual overview of one to three sentences and no more than three themes, each with
   one short explanation, without showing a chat, source index, excerpt list, suggestion, or write
   action.
4. **Given** records also exist today in another domain or on another date, **When** the selected-domain
   summary is requested, **Then** none of those records affects the visible counts or leaves the
   browser in the request.

---

### User Story 2 - Retain control when context or availability changes (Priority: P1)

As the author, I can cancel, stop, retry, or change context without a stale summary appearing or any
source data changing, so the optional remote synthesis never weakens trust in the local report.

**Why this priority**: A personal-note summary crosses a privacy boundary. Explicit activation,
bounded transmission, stale-result rejection, and no-write behavior are part of the feature rather
than follow-up hardening.

**Independent Test**: Exercise cancel, stop, offline, missing configuration, timeout, rate-limit,
invalid response, account switch, domain switch, language switch, and page exit; verify zero source
mutation, no late result, and continued use of the existing local domain report.

**Acceptance Scenarios**:

1. **Given** disclosure is open, **When** the author cancels, **Then** no request occurs and focus
   returns to the daily-summary action.
2. **Given** a request is running, **When** the author stops it or changes domain, account, language,
   source payload, or page, **Then** the in-flight work is cancelled, transient state is cleared, and
   a late response cannot render.
3. **Given** the device is offline or the remote service is unavailable, unconfigured, rate-limited,
   slow, or returns invalid output, **When** the author attempts a summary, **Then** the page reports a
   bounded unavailable state, makes no write, and does not present local text concatenation as an AI
   result.
4. **Given** the selected domain has no records today, **When** the report opens, **Then** it shows a
   quiet empty state and cannot dispatch a summary request.

---

### User Story 3 - Preserve the investment-review boundary (Priority: P2)

As the author reviewing an investment-like domain, I receive only a factual synthesis of my own
notes and never a market action, prediction, or portfolio recommendation.

**Why this priority**: The domain page already supports investment reflection, and a generated daily
summary must not turn that existing review surface into financial guidance.

**Independent Test**: Feed synthetic investment notes and adversarial outputs through every result
path and verify that any buy/sell/hold, security, price, position, allocation, return, or forecast
language invalidates the whole result while the fixed non-advice boundary remains visible.

**Acceptance Scenarios**:

1. **Given** the selected domain is investment-like, **When** a valid factual daily summary succeeds,
   **Then** it appears alongside the existing visible non-advice boundary without adding a market
   action or performance claim.
2. **Given** a generated result contains prohibited financial guidance or prediction language,
   **When** it is validated, **Then** the entire result is rejected and the page shows an unavailable
   state rather than a partial summary.

### Edge Cases

- Device-local midnight changes while the report is open; the old date, disclosure, and result must
  be cleared before the new today scope is shown.
- The selected domain is renamed or removed, a category moves to another domain, or an entry changes
  category while a request is pending; the old result must not render.
- More than 80 qualifying records exist today, individual content exceeds 4000 Unicode characters,
  or invalid/duplicate record identifiers are present; selection and rejection rules must remain
  deterministic and disclosed when source records are omitted.
- The domain has only ordinary records, only periodic records, malformed dates/times, or records whose
  category no longer belongs to a configured domain.
- A request is confirmed twice rapidly, the author retries after failure, or a response arrives after
  stop/unmount; at most one current request may own the visible result.
- Long Chinese and English domain names, 320/390/426/768/1280px viewports, high zoom, keyboard-only
  use, touch use, visible focus, and reduced motion must not obscure controls or reading order.
- Account replacement, offline reload, backup, restore, and export must not retain or reproduce a
  daily-summary result.

## Product Admission *(mandatory)*

### Core-Loop Contribution

The feature improves **browse** by giving one selected domain a concise, author-triggered synthesis
of its records from the current local day. Quick record, search, edit/delete, backup/restore, and
offline CRUD remain unchanged.

### User Evidence

On 2026-09-03 the product owner explicitly requested a Mastra-based today summary on the domain page
and confirmed the narrowed scope: current domain only, today's records only, and no plan comparison.
The owner approved placing a compact daily count and subtype split after the 30-day line and before
the existing seven-day summary.

### Default Interface and Recording Cost

One compact today line and one secondary summary action appear in the existing domain report. The
line is a narrow, approved exception to the earlier prohibition on a permanent ordinary/periodic
split: it reports only the selected domain's local today and does not restore metric cards, source
lists, excerpts, or coverage modules. The action first opens disclosure and requires a separate
confirmation. No home-page control, required field, modal, background task, automatic request,
chat, or additional recording action is introduced.

### Offline, Account, Privacy, Reversibility, and Backup

Only an authenticated same-origin request may receive the active account's selected-domain records
from the device's local today. The bounded data consists of domain name, date, locale, and at most 80
records containing only identifier, date, time, content, and ordinary/periodic source type, with each
content value capped at 4000 Unicode characters. Account identity, plans, tags, attachments, images,
structured fields, templates, categories, other domains, unresolved records, and the complete account
document stay in the browser. Generated output is untrusted page-session state; it is never written,
synchronized, exported, or backed up. Removing the feature requires no migration or cleanup.

### Verification and Removability

Pure selection and normalization tests cover local-today/current-domain inclusion, deterministic
bounds, output grounding, and financial safety. Route/provider tests cover authentication, same
origin, exact fields, body and response limits, one request, no automatic retry, timeout, abort, and
safe error mapping. Browser regression covers disclosure-before-request, cancel, stop, retry, stale
context, zero records, no writes, responsive layout, keyboard/focus, and preservation of the existing
offline local review. The isolated daily section and capability can be removed without touching source
records or persisted formats.

### Exit Condition

Keep the capability isolated or remove it if the author does not use it at least twice in 14 days,
cannot reconcile results with today's source notes, the median confirmed start-to-result time across
at least three successful requests exceeds 8 seconds, the extra line makes the report feel crowded,
privacy concerns arise, or any recording, offline, account, backup, accessibility, investment-safety,
dependency, or complete quality gate regresses.

### Admission Decision

- **Score**: `16/20` using the rubric in `product.md`
- **Decision**: `mainline candidate` limited to explicit, session-only current-domain daily synthesis
- **Red-line check**: no silent raw-note rewrite, required recording step, offline-core dependency,
  persisted AI state, backup-format change, or undisclosed cross-account/cross-domain transfer is
  permitted

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The domain report MUST place one compact daily-summary section after the selected
  domain's 30-day line and before the existing seven-day summary.
- **FR-002**: The daily line MUST use the device's current local calendar date and MUST show the
  selected domain's qualifying total plus ordinary and periodic counts. This is the only approved
  exception to the report's existing rule against a permanently visible subtype split.
- **FR-003**: A qualifying source MUST be an ordinary or periodic record from the active account whose
  valid local date equals today and whose current category belongs to the selected configured domain.
  Plans, other dates, other domains, and unresolved or removed structure MUST NOT qualify.
- **FR-004**: When more than 80 sources qualify, the system MUST select the newest 80 using a stable,
  deterministic order and MUST disclose the omitted count before confirmation. Each included content
  value MUST be limited to 4000 Unicode characters without changing the stored source.
- **FR-005**: The first activation MUST open a confirmation area and MUST make zero remote requests.
  It MUST show the selected domain, exact local date, ordinary/periodic counts, any omitted-source
  count, that note text will leave the browser for the configured AI service, and that the result is
  session-only and cannot change records.
- **FR-006**: Only a separate confirmation action MAY start generation. One confirmation MUST produce
  at most one remote generation request with zero automatic retries; repeated activation while the
  request is current MUST NOT produce duplicate work.
- **FR-007**: The request MUST contain only domain name, local date, locale, and included sources with
  `id`, `date`, `time`, `content`, and `sourceType`. It MUST NOT contain account identity, plans, tags,
  attachments, images, field objects, templates, category structure, other-domain records,
  unresolved records, or the complete document.
- **FR-008**: A successful rendered result MUST contain an overview of one to three sentences and at
  most three themes, each with a title and one short explanation. It MUST NOT display internal identifiers,
  source indexes, source links, excerpts, chat, follow-up input, advice, scores, causal claims, new
  facts, tasks, reminders, or persistence actions.
- **FR-009**: Every accepted overview and theme MUST be supported by at least one source sent in the
  current request. Validation-only source IDs MAY cross the same-origin response boundary but MUST
  NOT be rendered, logged, persisted, exported, or backed up. Missing support, duplicate,
  structurally invalid, over-limit, or prohibited output MUST invalidate the result rather than be
  partially rendered.
- **FR-010**: An investment-like domain MUST retain the existing fixed non-advice boundary. Any result
  containing buy, sell, hold, security selection, price, timing, position, allocation, return,
  portfolio performance, or forecast language MUST be rejected in full.
- **FR-011**: A selected domain with zero qualifying sources MUST show a quiet empty state, MUST hide
  or disable generation, and MUST make zero remote requests.
- **FR-012**: Cancel MUST make zero requests. Stop, local-midnight change, source change, domain/account/
  language change, page exit, or a newer request MUST cancel and clear transient state so a stale or
  late result cannot render.
- **FR-013**: Offline, unconfigured, unauthorized, forbidden-origin, over-limit, timed-out,
  rate-limited, unavailable, and invalid-output states MUST use bounded localized copy, MUST make no
  write, and MUST NOT fabricate or relabel a local summary as AI output.
- **FR-014**: Disclosure and result state MUST remain in page memory only and MUST NOT enter records,
  plans, account caches, synchronization, analytics, logs, export, or any backup format.
- **FR-015**: Existing 30-day local review, domain switching, seven-day summary, investment boundary,
  authenticated offline access, and return navigation MUST remain usable when the daily remote
  summary is unavailable.
- **FR-016**: Daily-summary controls MUST have localized accessible names, visible focus, logical
  keyboard order, touch targets of at least 44px, and a polite live status for loading, cancellation,
  failure, and success. Reduced motion MUST remove non-essential transition.
- **FR-017**: At 320, 390, 426, 768, and 1280 CSS pixels, the section MUST introduce no horizontal
  document overflow, clipped required text, overlapping controls, card wall, gradient, thick shadow,
  or new primary action.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.
- **NR-005**: The ordinary composer MUST still open in at most one action and save in at most one
  further action after typing.
- **NR-006**: Plans and plan-review behavior MUST remain outside the daily-domain summary.
- **NR-007**: The existing seven-day summary contract and its result must remain independent; a daily
  result cannot be reused as a weekly result or survive a period switch.

### Key Entities *(include only when data is involved)*

- **Daily Summary Scope**: The active account, selected configured domain, device-local today, locale,
  and current qualifying source set that together own one transient request.
- **Qualifying Source**: One current-domain ordinary or periodic record from local today. Its stored
  content is never changed by selection or truncation.
- **Disclosure**: A zero-request preview of scope, counts, omission, transmission, and session-only
  behavior that must precede every generation attempt.
- **Daily Summary Result**: An untrusted, source-grounded overview and bounded theme list, plus
  non-visible source references used only for validation, owned by one current scope and discarded
  when that scope changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For fixtures spanning at least three domains, two dates, ordinary and periodic records,
  and removed structure, 100% of displayed daily totals and transmitted sources match the selected
  current-domain/local-today scope, with 0 sources from plans, other dates, other domains, or unresolved
  structure.
- **SC-002**: In all tested flows, opening or cancelling disclosure produces 0 remote requests; one
  confirmation produces exactly 1 request; and stop or any scope change produces 0 late visible
  results and 0 source-data mutations.
- **SC-003**: 100% of accepted results stay within one to three overview sentences and three themes,
  reference only current sources, and contain 0 prohibited advice, scoring, invented facts, internal
  identifiers, or persistence actions.
- **SC-004**: At 320/390/426/768/1280px, all controls are reachable and at least 44px where
  interactive, required Chinese and English text remains readable, and the page has 0 horizontal
  overflow or control overlap.
- **SC-005**: A previously authenticated offline device retains 100% of existing local domain-review
  and record CRUD behavior while the daily AI summary shows no fabricated result and makes no source
  write.
- **SC-006**: Across at least three real, non-sensitive successful requests, the median confirmed
  start-to-visible-result time is no more than 8 seconds; automated evidence cannot satisfy this
  external acceptance item.
- **SC-007**: Mainline acceptance remains pending until the author uses the capability at least twice
  in 14 days and judges the results reconcilable with today's notes and the additional section not
  disruptive to the domain report.

## Scope Boundaries *(mandatory)*

### In Scope

- One compact local-today count/split and one confirmed daily-summary action on the selected domain
  report, between the existing 30-day line and seven-day summary.
- Current-domain ordinary and periodic records from the device's local today only.
- One bounded, source-grounded, page-session result with explicit disclosure, cancel, stop, retry,
  stale-context invalidation, localized states, and investment safety.
- Responsive, keyboard, touch, reduced-motion, privacy, offline, and no-write verification.

### Out of Scope

- Plan comparison, plan completion inference, cross-domain daily reporting, other dates, custom date
  ranges, automatic or scheduled generation, notifications, background jobs, or reminders.
- Persistent summaries, AI memory, learned profiles, feedback storage, tasks, advice, scores,
  recommendations, raw-note rewriting, classification, tags, or structure creation.
- New storage fields, migrations, synchronization payloads, backup/export formats, analytics, or
  Service Worker data caching.
- A standalone Agent service, generalized runtime, tool registry, plugin system, chat interface,
  model picker, or unrelated home/Settings/Agent refactor.

## Assumptions and Dependencies

- Implementation planning must use the project's existing approved Mastra execution boundary as
  explicitly requested; this is a delivery dependency, not new user-facing behavior.
- The active account's current domain/category structure and records are available through the
  existing local-first data contract, and the device's local calendar date is authoritative for
  "today."
- The existing seven-day domain summary remains a separate capability and provides the established
  authentication, disclosure, bounded-output, abort, and financial-safety precedents.
- Business implementation, dependency edits, commit, push, publish, and deploy remain outside the
  current authorization until the product owner reviews this specification and the derived plan.
- Browser fixtures and screenshots must use synthetic content only; private personal notes and
  credentials must not enter tests, logs, specifications, or visual evidence.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| US1, FR-001–FR-009, SC-001–SC-003 | Pure scope/output tests; authenticated route/provider contract tests; confirmed browser flow | Current-domain/today selection, exact data boundary, one request, bounded result |
| US2, FR-011–FR-015, SC-002, SC-005 | Browser abort/stale/offline/account-switch tests and source-payload byte comparison | Zero-request states, no late result, no write, local review preserved |
| US3, FR-010, SC-003 | Adversarial investment-output tests and visible-boundary browser assertion | Whole-result financial-safety rejection |
| FR-016–FR-017, SC-004 | 320/390/426/768/1280px Chinese/English, keyboard, touch, focus, reduced-motion regression and screenshots | Responsive and accessible domain-page placement |
| NR-001–NR-007 | Focused regressions plus `npm run design:check`, `npm run check`, backup/export comparison | Core loop, account/offline, backup, plan isolation, weekly-summary non-regression |
| SC-006–SC-007 | Three real non-sensitive timed requests and 14-day product-owner observation | External latency, reconciliation, adoption, and density acceptance remain pending |
