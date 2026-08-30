# Feature Specification: Domain Trends and One-Glance Review

**Board Item**: `[LN-010 Phase 1]`
**Feature Directory**: `[007-domain-insights]`
**Created**: 2026-08-30
**Status**: Draft
**Input**: User description: "在首页领域目录旁增加一个控件，进入独立系统页，按领域用折线图等方式回顾近期记录并给出轻量状态分析；投资领域优先提供有依据的复盘建议，首版保持简单。后续视觉复核明确要求减少文字、不显示记录索引，并选定极简一屏方案。"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove the acceptance claim.

### User Story 1 - Open a focused domain review (Priority: P1)

As the author browsing records on a phone, I can use a small analysis control beside the currently
active domain in the right-side directory and arrive at a separate review page already focused on
that domain.

**Why this priority**: It is the requested entry point and the shortest path from a familiar domain
label to a useful cross-time review, without adding a decision to ordinary recording.

**Independent Test**: On a populated mobile Diary page, activate the analysis control beside the
current domain and verify that the review page opens in one action, names that domain first, and
offers a clear one-action return to the Diary; scroll to another domain and verify that the control
moves with the current directory location.

**Acceptance Scenarios**:

1. **Given** a current domain directory item, **When** the author activates its adjacent analysis control, **Then** the review page opens focused on the same domain while preserving the current records.
2. **Given** keyboard or touch input at a mobile width, **When** the author reaches the control, **Then** it has an understandable accessible name, a target of at least 44px, visible focus, and does not overlap the directory label or page content.
3. **Given** a stale or unknown domain link, **When** the review page opens, **Then** it safely falls back to the first available domain or the all-domain empty state without error or data mutation.

---

### User Story 2 - Understand the last 30 days by domain (Priority: P1)

As the author, I can see a restrained 30-day view of recording activity by domain so I can notice
where I have been paying attention and whether that attention is becoming more or less consistent.

**Why this priority**: A time trend turns accumulated notes into a browse aid while staying factual,
local, and simpler than a generalized AI analysis system.

**Independent Test**: With known records across multiple dates and domains, verify that the page
shows the correct 30-day counts, active-day totals, daily rhythm, domain comparison, and compact
ordinary/periodic split without a visible record index; repeat with no records and with only one
active day.

**Acceptance Scenarios**:

1. **Given** records from the last 30 calendar days, **When** the author opens the review page, **Then** each domain reports its record count, active days, daily activity rhythm, and ordinary/periodic split using the current account's data only, without listing record excerpts or a record index.
2. **Given** fewer than three qualifying records or fewer than two active days in a domain, **When** its review is shown, **Then** the page labels the evidence as insufficient and does not claim a trend or state.
3. **Given** records older than the 30-day window, periodic records, missing categories, or removed domains, **When** the review is calculated, **Then** inclusion and fallback rules remain explicit and totals are not silently double-counted.
4. **Given** an already authenticated device without network access, **When** the author opens or refreshes the review page, **Then** the locally available account review remains usable and no remote analysis is attempted.

---

### User Story 3 - Receive a cautious investment review prompt (Priority: P2)

As the author with an investment-, trading-, or finance-named domain, I can see a factual summary of
my recent investment-recording coverage and one restrained, coverage-linked review prompt that helps improve my next
reflection without telling me what to buy, sell, or hold.

**Why this priority**: Investment is the user's concrete example, but free-form notes cannot safely
establish portfolio performance or justify personalized financial recommendations. A source-linked
recording-quality prompt is the smallest useful and responsible first version.

**Independent Test**: With a synthetic investment domain and source notes that include or omit
decision rationale, outcome, and risk language, verify the aggregate coverage summary and deterministic prompt;
verify that no price target, security recommendation, return claim, or unsupported fact appears.

**Acceptance Scenarios**:

1. **Given** a domain whose visible name clearly indicates investment, trading, or finance, **When** at least three recent records exist, **Then** the page summarizes only observable aggregate recording coverage and does not expose record excerpts or a record index.
2. **Given** the recent notes omit a decision reason, review outcome, or risk boundary, **When** the prompt is produced, **Then** it suggests recording one missing reflection element and clearly states that it is not investment advice.
3. **Given** ambiguous note text or too little evidence, **When** the domain is reviewed, **Then** the page says what is missing instead of estimating profit, loss, sentiment, portfolio health, or a market action.

### Edge Cases

- The account has no domains, no categories, no entries, or only records outside the window.
- The requested domain ID was removed, renamed, or belongs to another account's cached history.
- An entry has a missing category, an unknown category, an invalid date, or a date on the 30-day boundary.
- A periodic entry and an ordinary entry share a date and category; they remain separately described and are counted once each only where the selected metric explicitly includes them.
- The device is offline, the account changes while the page is open, or the local payload enters recovery protection.
- Long Chinese and English domain names, 320/390/426px screens, keyboard focus, high zoom, and reduced motion do not obscure controls or charts.

## Product Admission *(mandatory)*

### Core-Loop Contribution

The feature improves **browse** and later retrieval by turning account-owned history into a
compact, reconcilable recent overview. It does not change quick record, search, edit/delete,
backup/restore, or offline workflows.

### User Evidence

The primary author explicitly requested a domain-adjacent control and marked its intended mobile
location on the current Diary screenshot. The author also named the concrete problem: accumulated
records are difficult to assess across time, especially for investment reflection. During visual
review the author rejected text-heavy evidence lists, requested no record index, and delegated the
choice of the selected one-glance composition.

### Default Interface and Recording Cost

The home page gains one quiet secondary analysis action beside the one currently active
domain-directory item; the action follows the current directory location instead of repeating beside
every domain, and the analysis itself lives on a separate page. Opening the normal composer remains one action and
saving after typing remains one further action. No modal, required field, background task, default
prompt, or recording decision is added.

### Offline, Account, Privacy, Reversibility, and Backup

The first version computes results only from the active account's locally available records. No raw
record, category, plan, setting, or derived observation is written, synchronized, exported, or
backed up. No note content, identity, attachment, or analysis leaves the browser. Account changes
must replace the visible review rather than reuse the prior account's result. Removing the page and
its entry controls requires no migration and cannot alter supported backups.

### Verification and Removability

Pure regression tests cover date windows, domain/category mapping, ordinary versus periodic record
rules, insufficient evidence, investment-domain recognition, aggregate coverage, and conservative
prompt selection. Responsive browser evidence covers the domain-adjacent entry, navigation, return,
empty state, 320/390/426/768/1280px layout, accessibility, and offline refresh. The aggregation
model, review page, and entry control remain isolated and can be removed without reading or rewriting
stored data.

### Exit Condition

Keep the capability isolated or remove it if the author does not open it at least twice during a
14-day real-use window, cannot reconcile the one-glance summary with the visible metrics, judges
prompts inaccurate or unhelpful, mistakes prompts for financial advice, or the new rail action obscures domain navigation
or quick recording.

### Admission Decision

- **Score**: `16/20` using the rubric in `product.md`
- **Decision**: `mainline candidate` limited to local, read-only, metric-linked analysis
- **Red-line check**: No raw-note rewrite, recording step, cross-account reuse, network transfer, backup change, or authenticated-offline regression is permitted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide one domain-adjacent analysis control for the currently active domain-directory item on the mobile Diary page, and MUST move that control when another domain becomes current.
- **FR-002**: Activating a domain analysis control MUST open one secondary review page in one action and focus the corresponding domain.
- **FR-003**: The review page MUST let the author move among all current domains without returning home and MUST provide a clear return to the Diary.
- **FR-004**: The review page MUST use a rolling window of the current local calendar day plus the preceding 29 calendar days.
- **FR-005**: A qualifying record is a record with a valid local date inside the inclusive window. For each domain, the system MUST report qualifying record count, distinct active days, daily record-count series, and ordinary/periodic split; the default review surface MUST NOT list source records or excerpts. Each qualifying record MUST belong to exactly one configured-domain bucket or the unresolved bucket, and the root total MUST equal the sum of all bucket totals.
- **FR-006**: The system MUST distinguish ordinary and periodic records in its labels and MUST NOT silently count one record more than once in the same metric.
- **FR-007**: Records with missing or removed structure MUST be grouped into a clearly named unresolved bucket rather than discarded or attributed to another domain.
- **FR-008**: The system MUST label a domain as insufficient for trend interpretation when it has fewer than three qualifying records or fewer than two active days in the window.
- **FR-009**: Every qualitative observation or prompt MUST identify the factual metric or aggregate coverage gap that supports it. The page MUST NOT require a visible source-record index to make that support understandable.
- **FR-010**: Investment-like recognition MUST use the current localized domain name only: Chinese tokens `投资`, `交易`, `理财`, or `金融`, and case-insensitive English word-boundary tokens `investment`, `trading`, or `finance`; note content MUST NOT affect recognition. For those domains, the first version MUST analyze only recording coverage for decision rationale, review outcome, and risk boundary; it MUST NOT infer portfolio performance or recommend a security, price, timing, allocation, buy, sell, or hold action.
- **FR-011**: Whenever investment-review content is shown, including empty, insufficient, and recovery-protected states, it MUST show a visible statement that it analyzes the author's notes and is not investment advice.
- **FR-012**: The review MUST be computed from the active account's locally available state, make no analysis network request, and update safely when the active account state changes. While account identity or payload revision changes, the page MUST discard any pending derivation result from the previous account and show hydration until the replacement derivation completes.
- **FR-013**: The feature MUST NOT persist, synchronize, export, or back up computed series, observations, prompts, coverage, or any temporary source excerpt used during derivation.
- **FR-014**: Empty, insufficient, offline, removed-domain, invalid-date, and account-change states MUST remain usable and MUST NOT modify source data.
- **FR-015**: Domain entry controls and review-page controls MUST expose localized names, visible keyboard focus, and touch targets of at least 44px.
- **FR-016**: At 320, 390, 426, 768, and 1280 CSS pixels, the page MUST have zero horizontal document overflow and no required label, axis annotation, trend word, investment boundary, or control text may be clipped or overlap; trend direction and domain selection MUST NOT rely on color alone.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.
- **NR-005**: The ordinary composer MUST still open in at most one action and save in at most one further action after typing.
- **NR-006**: Existing domain-directory controls MUST continue to scroll to their record sections; the adjacent analysis control MUST remain a separate action.

### Key Entities *(include only when data is involved)*

- **Source Record**: An account-owned ordinary or periodic record with an original date, content, and category relationship. It remains immutable during analysis.
- **Domain**: The current account's top-level record area. A review is focused on one domain but can compare all current domains.
- **Analysis Window**: The inclusive 30-calendar-day interval ending on the device's current local date.
- **Daily Activity Point**: One date and the number of qualifying records for one domain on that date; it is computed and never stored.
- **Domain Review**: A computed collection of totals, active days, series points, evidence sufficiency, and optional aggregate investment coverage for one domain.
- **Review Prompt**: One temporary, aggregate-coverage-linked reflection suggestion. For investment-like domains it is restricted to recording quality and carries a non-advice boundary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the currently active mobile domain-directory item, the author reaches a review focused on that domain with one action and returns to the Diary with one action; after another item becomes current, the same action moves to and focuses that domain.
- **SC-002**: For fixtures spanning at least three domains and both window boundaries, 100% of displayed totals, active-day counts, series points, and unresolved records match the source data.
- **SC-003**: With fewer than three records or two active days, 100% of tested domains show an insufficient-evidence state and no trend claim.
- **SC-004**: Across synthetic investment fixtures, 100% of prompts cite an observable aggregate coverage gap, include the non-advice boundary, and contain no buy/sell/hold, security, price, return, or allocation recommendation.
- **SC-005**: On a previously authenticated offline device, the review opens and refreshes from the active account cache with no analysis network request and no source-data mutation.
- **SC-006**: At 320/390/426/768/1280px, all entry and page controls are reachable, at least 44px where interactive, keyboard operable, and the page has no horizontal overflow.
- **SC-007**: With a deterministic 5,000-record fixture in headless Playwright Chromium using the existing E2E mobile profile (`390 × 844`, touch enabled, device scale factor `2`), record derivation plus first review render completes within 1,000ms.
- **SC-008**: Real-use acceptance remains pending until the author uses the page at least twice in 14 days and rates the one-glance metric/rhythm summary or one investment prompt as useful and non-misleading.

## Scope Boundaries *(mandatory)*

### In Scope

- One quiet analysis entry beside the current mobile domain and an equivalent reachable desktop entry.
- One separate, account-owned, offline-capable review page.
- A fixed rolling 30-day activity view, domain comparison, active-day/record totals, and compact ordinary/periodic split.
- One deterministic, temporary reflection prompt per sufficiently supported domain.
- Investment-like domain coverage checks for rationale, outcome, and risk-boundary recording.
- Localized Chinese and English copy, empty/insufficient states, accessibility, and responsive validation.

### Out of Scope

- Remote AI, market prices, brokerage connections, portfolio holdings, P&L calculation, predictions, sentiment scoring, or personalized financial actions.
- Persisted observations, ratings, interventions, experiments, goals, notifications, background jobs, or automatic analysis.
- Changing, appending, classifying, tagging, deleting, or otherwise mutating source records.
- New storage fields, migrations, synchronization payloads, backup formats, exports, or account permissions.
- A general dashboard platform, custom date ranges, chart configuration, comparison cohorts, or social sharing.

## Assumptions and Dependencies

- This specification is the local read-only first phase of `LN-010`; the later persisted “record → adjustment → experiment → result” loop remains dependent on `LN-007`, `LN-008`, and `LN-009` and is not authorized here.
- The current account already owns domain/category structure and date-stamped records through the established local-first data contract.
- The device's local calendar date is the authoritative end of the 30-day window.
- Investment-like domains are recognized from their current visible names in supported Chinese and English terms; ambiguous domains receive only the generic factual review.
- Browser automation uses synthetic records only. Real personal note content must not enter fixtures, logs, or screenshots.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-003, SC-001 | Mobile browser entry/focus/return regression and screenshots | LN-010 Phase 1 user-triggered review |
| FR-004–FR-009, SC-002–SC-003 | Pure aggregation-model tests with boundary and insufficient-data fixtures | LN-010 Phase 1 evidence-supported pattern |
| FR-010–FR-011, SC-004 | Investment prompt safety tests and synthetic screenshot | LN-010 Phase 1 restrained recording prompt |
| FR-012–FR-014, SC-005 | Offline/PWA and account-state regression; source-state equality assertion | LN-010 Phase 1 local-first and reversible boundary |
| FR-015–FR-016, SC-006 | Accessibility and 320/390/426/768/1280px geometry checks | LN-010 Phase 1 secondary-surface usability |
| SC-007 | Local performance fixture at 5,000 records | LN-010 Phase 1 bounded cost |
| SC-008 | 14-day product-owner observation note | LN-010 Phase 1 real-use acceptance; remains pending after implementation |
