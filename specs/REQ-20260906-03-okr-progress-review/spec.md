# Feature Specification: Current-cycle OKR detail and progress review

**Requirement**: `REQ-20260906-03`
**Feature Directory**: `REQ-20260906-03-okr-progress-review`
**Created**: 2026-09-06
**Status**: Draft
**Input**: Review `/Users/kual/Desktop/memory/@Record/reviews/2026/20260906-OKR.md`; add time/content evidence and current-completion AI analysis to Goals. Export is deferred from the first slice.

<!-- Historical packages may add one legacy board mapping; do not add a second primary ID. -->

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review one objective by time and content (Priority: P1)

As a user reviewing an OKR, I can open a goal from the Goals page and see its objective, key
results, current period, and the related records in chronological order. Each evidence item keeps
the stored date, time, and raw content so I can explain what was done and what remains missing.

**Why this priority**: The current Goals page is a flat status list. The OKR review asks for
regular daily records for Log Note, health, investment, and later preparation/process/retrospective
records. A time-and-content review is the smallest useful slice before analysis or reporting.

**Independent Test**: Seed one goal with a date range, two key results, and records on several
dates (including one gap). Open the goal detail route and verify the hierarchy, period, chronological
evidence, gap indicator, and unchanged raw content without opening the AI action.

**Acceptance Scenarios**:

1. **Given** a goal with a start/end period and records inside that period, **When** the user opens
   the goal detail, **Then** the page shows the O/K hierarchy, period, record date/time/content, and
   the number of distinct recorded dates in chronological order.
2. **Given** a goal with no records or gaps in its period, **When** the user opens the detail,
   **Then** the page clearly shows an empty/missing-evidence state and does not fabricate progress.
3. **Given** a qualitative key result without numeric fields, **When** the user reviews progress,
   **Then** the page uses evidence coverage and explicit status labels, without inventing a numeric
   percentage.

### User Story 2 - Track optional numeric and qualitative key results (Priority: P1)

As a user, I can define one or more key results under a goal. A key result may have optional
target/current/unit values for measurable work, or may remain qualitative and rely on time/content
evidence. Existing flat goals continue to work as a single objective with no key result migration
required.

**Why this priority**: The supplied OKR review mixes measurable cadence goals (“one month of daily
records”) with qualitative outcomes (“Log Note iteration”, “preparation/process/retrospective”).
Both must fit the same page without forcing numeric data into qualitative work.

**Independent Test**: Create one numeric KR and one qualitative KR, refresh the page, edit each
without changing records, and verify numeric progress is calculated only from valid numeric values
while qualitative progress remains evidence/status based.

**Acceptance Scenarios**:

1. **Given** a KR with valid target, current, and unit values, **When** the detail is rendered,
   **Then** it shows the bounded numeric progress and the source values used.
2. **Given** a KR with missing, zero, negative, or non-numeric target data, **When** the detail is
   rendered, **Then** it falls back to an explicit qualitative/evidence state and does not divide by
   zero or display misleading completion.
3. **Given** an existing goal created before this feature, **When** the user opens it, **Then** it
   remains readable and editable with its current content, dates, and status.

### User Story 3 - Ask AI for a current-cycle completion review (Priority: P1)

As a user, I can deliberately request an AI review of the current goal period. Before the request,
the page discloses the exact local facts that will be sent. The response is a read-only proposal
that distinguishes completed evidence, ongoing work, missing evidence, risks, and next steps; it
never edits goals, key results, or records.

**Why this priority**: The user wants help judging current completion, while the product and
architecture require local-first facts, an explicit user action, strict output, and no autonomous
data mutation.

**Independent Test**: With a seeded goal and records, click the disclosed AI action once, capture
the request allowlist and response, then verify the stored goal/records and locally computed facts
are unchanged. Repeat with no provider configuration and with an expired/stale response.

**Acceptance Scenarios**:

1. **Given** a current goal period and local evidence, **When** the user opens the AI review,
   **Then** the disclosure lists the goal/KR titles, period, aggregate counts, dates, times, and
   bounded record excerpts that will be sent, with an explicit start/cancel choice.
2. **Given** the user confirms and the provider returns valid output, **When** the response arrives,
   **Then** the page renders a read-only review with completed, in-progress, missing-evidence,
   risk, and next-step sections bound to the current request fingerprint.
3. **Given** the user cancels, goes offline, has no configured provider, or the request becomes
   stale, **When** the action completes, **Then** no remote request or data write occurs (as
   applicable), and the page shows a distinct cancellation, offline, configuration, or stale state.

### Edge Cases

- A goal has no dates, an end date before its start date, or a period that has not started; render a
  safe empty state and do not infer missing days outside a valid period.
- Records have missing/invalid times or duplicate dates; preserve their raw values and use a stable
  chronological fallback without silently rewriting them.
- A record is outside the goal period or cannot be associated with a KR; keep it available in the
  general record view and exclude it from the goal evidence aggregate unless explicitly linked.
- The account changes, local storage is replaced, or the device is offline; clear stale AI state,
  preserve account isolation, and keep cached goal/record browsing available.
- Long content, keyboard navigation, reduced motion, and 320/390/426/768/1280px viewports must not
  create horizontal overflow or targets below the existing interaction minimum.

## Product Admission *(mandatory)*

### Core-Loop Contribution

This improves `browse → search → edit/delete → backup/restore → offline use` by making existing
date/time/content records explainable against a goal period. It does not add a required step to
the ordinary quick-record path.

### User Evidence

The user explicitly requested a Goals-page redesign based on the OKR review at
`/Users/kual/Desktop/memory/@Record/reviews/2026/20260906-OKR.md`, specifically to record and review
progress by time and content and to ask AI about current completion. The review contains month-long
daily-record goals for Log Note, health, and investment, plus preparation/process/retrospective
evidence for leisure work.

### Default Interface and Recording Cost

The existing Goals index remains the entry point. A secondary goal-detail surface adds O/K hierarchy,
period summary, chronological evidence, and an explicit AI review action. Records remain quick to
write with the same fields and actions; goal/KR association is optional and can happen from the
detail surface. No modal or confirmation is added to ordinary recording.

### Offline, Account, Privacy, Reversibility, and Backup

Goal and evidence browsing is local-first and account-scoped. Raw records are never rewritten by
derived progress or AI. After explicit confirmation, only the goal/KR titles, valid period, aggregate
counts, evidence dates/times, and bounded content excerpts may cross the approved provider boundary;
account identifiers, credentials, raw storage keys, and unrelated records must not be sent. The
server-side provider call uses the existing authentication/origin checks, timeout and rate limits,
keeps raw content out of application logs, and returns a distinct configuration/authentication/
offline/timeout/invalid-output state. AI output is ephemeral/read-only in this slice; cancellation,
provider failure, account replacement, and stale responses discard the proposal and produce no writes.
Existing JSON/Markdown backup and restore contracts remain unchanged. Export of a goal report is
explicitly deferred and is not a requirement of this slice.

### Verification and Removability

Model tests cover period filtering, stable ordering, gap/continuity counts, numeric validation,
qualitative fallback, allowlisted AI input, strict output, fingerprint/stale checks, and zero-write
failure paths. Browser and PWA checks cover the Goals entry, detail hierarchy, empty/missing states,
keyboard/focus, reduced motion, account replacement, offline browsing, 44px targets, and
320/390/426/768/1280px geometry. The feature is isolated behind the Goals detail route/module and
can be removed without migrating raw records or existing backups.

### Exit Condition

Keep the feature isolated or rework it if it adds a required recording step, causes measurable
quick-record friction, sends undisclosed or cross-account data, produces invalid AI output above the
existing strict-output threshold, loses offline browsing, or is not used during a 14-day review
window. Removing it must leave raw records and supported backups intact.

### Admission Decision

- **Score**: `18/20` using the rubric in `product.md`
- **Decision**: `mainline candidate`, limited to this local, read-only current-cycle review
- **Red-line check**: No raw-note rewrite, required quick-record step, account-boundary crossing,
  backup incompatibility, or autonomous AI mutation is introduced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Goals surface MUST provide a detail view for one objective with its period, key
  results, and chronological evidence grouped by stored date and time.
- **FR-002**: The system MUST preserve each evidence record's raw date, time, and content and MUST
  make missing dates and empty periods explicit.
- **FR-003**: A goal MUST support zero or more key results. Each KR MAY contain target, current, and
  unit values; all three are optional and must be validated before numeric progress is shown.
- **FR-004**: Qualitative KRs MUST use explicit status and evidence coverage instead of fabricated
  numeric percentages.
- **FR-005**: Evidence association MUST be optional and MUST NOT add a required decision to quick
  recording. In the first slice, an R is a derived reference to an existing record/evidence item,
  not a second raw-note entity.
- **FR-006**: The AI review MUST be initiated only by an explicit user action after a disclosure of
  the exact current-goal facts and bounded excerpts that will be sent.
- **FR-007**: The AI request MUST use a versioned strict schema, current account/goal/request
  binding, and a request fingerprint. The response MUST be read-only and MUST include completed,
  in-progress, missing-evidence, risks, and next-step sections.
- **FR-008**: Cancellation, offline, missing configuration, authentication failure, timeout,
  invalid output, account replacement, and stale responses MUST result in no goal, KR, or record
  mutation and MUST use distinct user-facing states.
- **FR-009**: The first slice MUST NOT implement goal-level Markdown/JSON export or change existing
  Settings backup/export behavior.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.
- **NR-005**: Same-level reading/content/value/action axes MUST reuse the existing Goals and record
  axes at all affected mobile and desktop breakpoints.

### Key Entities

- **Objective/Goal**: The existing user-owned objective with content, optional period, status, and
  lifecycle timestamps. It remains the compatibility root for existing goals.
- **Key Result (KR)**: A user-owned child of a goal with a title, optional target/current/unit,
  optional period override, and explicit qualitative/numeric status. It is editable without changing
  raw records.
- **Evidence record (R)**: A derived reference to an existing local record, retaining its source
  identifier/date/time/content and optional goal/KR association. It is not a duplicate raw note.
- **Current-cycle analysis**: An ephemeral, request-bound read-only AI proposal derived from local
  goal/KR/evidence facts. It is never treated as authoritative stored progress.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can reach a goal's time/content review from the Goals index in one deliberate
  navigation and identify period, recorded days, gaps, and evidence content without opening another
  module.
- **SC-002**: Numeric KRs show correct bounded progress for valid values, while qualitative KRs and
  invalid numeric inputs never display fabricated percentages.
- **SC-003**: Every AI request is preceded by visible disclosure and explicit confirmation; focused
  tests prove exactly one bounded request, strict output validation, stale invalidation, and zero
  data writes on cancel/error/offline/configuration paths.
- **SC-004**: Existing quick recording, account replacement, offline browsing, backup/restore, and
  the repository quality gate pass without regression.

## Scope Boundaries *(mandatory)*

### In Scope

- Goals index entry to a current-cycle goal detail surface.
- O/K hierarchy with optional numeric KR fields and qualitative fallback.
- Chronological time/content evidence, recorded-day counts, and missing-period indicators.
- Optional evidence association that preserves existing raw records.
- Explicit, disclosed, local-fact-only AI completion analysis with read-only output.
- Focused model, browser, PWA, responsive, accessibility, offline, and account-isolation tests.

### Out of Scope

- Goal-level Markdown/JSON report export; this is intentionally deferred.
- Automatic/background AI analysis, persistent AI history, autonomous writes, suggestions that create
  tasks/reminders, or generalized OKR/project management.
- Replacing the existing quick-record editor, changing record schema, or migrating all historical
  records into manually tagged KR entities.
- Google Calendar, investment/health data connectors, social sharing, or remote analytics.

## Assumptions and Dependencies

- The existing Goal and Record stores remain the canonical persistence paths; the implementation
  extends them rather than adding a parallel store or route.
- In the first slice, `R` is the evidence view of an existing record. A separately authored,
  independently ordered R entity is deferred unless later user evidence requires it.
- A goal's start/end dates define the current cycle. If a goal has no valid period, the detail uses
  an explicit undated state and does not invent a month.
- The approved AI provider and current account-scoped local-first boundary remain available. Missing
  credentials are reported as configuration state, not account failure.
- `PROJECT_BOARD.md` admission, priority, and acceptance evidence still require the project
  controller; this draft does not modify that governance file.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| US1, FR-001–FR-005, SC-001–SC-002 | Goal-detail model tests, focused browser scenarios, responsive/design checks, manual review with seeded OKR records | Pending board admission |
| US3, FR-006–FR-008, SC-003 | AI disclosure/request allowlist tests, strict-schema/stale/zero-write tests, provider-config and offline browser checks | Pending board admission |
| NR-001–NR-005, SC-004 | Existing Node quality gate, full browser/PWA/design checks, account replacement and backup compatibility checks | Pending board admission |
