# Feature Specification: Goal Loop — outcome alignment and evidence review

**Requirement**: `REQ-20260906-03`
**Feature Branch**: `feature/req-20260906-03-okr-progress-review`
**Feature Directory**: `REQ-20260906-03-okr-progress-review`
**Created**: 2026-09-06
**Revised**: 2026-09-11
**Status**: Draft
**Input**: User-requested market review and product iteration: record user goals, use an OKR-like
outcome model, connect goals with plans and records over time, and use AI to judge whether the user
is moving toward the goal.

<!-- This package refines the existing Goals/OKR design candidate. It does not create a second
board item or imply that the related implementation has been accepted. -->

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification records the product direction and cannot accept a task.

## Core-Chain Change Gate

- **Touches core chain**: Yes. Goal/plan/evidence associations and any confirmed derived state use
  the existing record and local-first persistence boundary.
- **Canonical path**: User edits a Goal or optional plan/evidence association → the existing
  account-scoped `commitData` command → local account cache → revision-checked synchronization.
  Ordinary quick record remains its existing `quick record → commitData` path.
- **Reuse**: Existing Goal normalization, plan metadata, raw `entries`, account-scoped data provider,
  backup/restore format, local evidence derivation, and the established disclosed AI review boundary.
- **Replacement / deletion**: Do not add a Goal store, duplicate evidence entity, second plan writer,
  background AI writer, or parallel chat flow. Any temporary candidate association is removed when
  cancelled, stale, rejected, or when this feature is removed.
- **State writers**: User edits and explicit association confirmation are the only product writers;
  `commitData` remains the single persistence writer. Derived facts and AI review results are
  session-only in this slice.
- **Public contract**: A Goal has an outcome statement and optional success signals; a plan may
  reference a Goal and optional KR; evidence references existing records; an AI review returns a
  versioned, source-bound, read-only proposal.
- **Invariants**: Quick recording adds no required choice; raw notes remain unchanged; authenticated
  offline use and account isolation continue; network payloads are disclosed, bounded, and approved;
  stale or invalid proposals produce zero writes; backups remain compatible.
- **Verification**: Model and contract regression, responsive browser journeys, offline/account and
  backup checks, `npm run design:check`, `npm run check`, plus a 14-day pilot for adoption and friction.
- **Unresolved evidence**: Product owner still needs to confirm the active-goal limit, goal horizons,
  AI cadence/provider policy, and whether accepted associations may be many-to-many.
- **Discussion status**: Pending owner discussion. This document records a candidate design; it does
  not authorize implementation or board acceptance.

## User Scenarios & Testing

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
is required when automation cannot prove the acceptance claim.

### User Story 1 — Define a meaningful outcome (Priority: P1)

As a user, I can record a small number of outcomes without turning them into a task list. Each
outcome states what I want, why it matters, its time horizon, and zero to three optional signals that
describe what progress would look like when the outcome is trackable. An outcome without a signal
remains valid but is explicitly not measurable by the Goal Loop.

**Why this priority**: The product need is to remember direction, not to create another task manager.
The outcome and its success signals are the minimum structure needed for later alignment.

**Independent Test**: Create a numeric and a qualitative outcome, close and reopen the Goals surface,
and verify that the meaning, horizon, signal definitions, and lifecycle state remain understandable.

**Acceptance Scenarios**:

1. **Given** an empty Goals surface, **When** the user creates an outcome with a short statement,
  optional why/horizon, and optionally one or more signals, **Then** the outcome is readable as a
  destination and not presented as a list of actions.
2. **Given** a signal without valid numeric baseline/target data, **When** the user reviews it,
   **Then** the product uses qualitative evidence and an explicit status rather than inventing a
   percentage.
3. **Given** an older Goal payload without the new optional fields, **When** it is opened,
   **Then** it remains readable and editable without data migration or loss.

### User Story 2 — Relate plans and records without slowing capture (Priority: P1)

As a user, I can optionally connect a plan to an outcome or signal and later connect an existing
record as evidence. A plan describes an attempted path; a record describes a fact that happened.
Neither association is required when making a quick record.

**Why this priority**: One shared relationship lets the same feature support planning, journaling,
retrospectives, and outcome review while preserving the quiet recording loop.

**Independent Test**: Create a plan linked to a signal, make a normal quick record without selecting
any goal, then associate the record from the goal detail view and remove the association. Verify that
the raw record and plan text never change.

**Acceptance Scenarios**:

1. **Given** a local plan and an active outcome, **When** the user edits the plan, **Then** an optional
   outcome/signal reference can be added without changing its title, time, or completion semantics.
2. **Given** a raw record in or near the outcome period, **When** the user reviews the outcome,
   **Then** the record can be accepted as evidence, left unassigned, or removed from the evidence
   set without rewriting its stored content.
3. **Given** a normal quick-record action, **When** the user saves it, **Then** no goal selection,
   extra modal, or network dependency is introduced.

### User Story 3 — Review progress from time and evidence (Priority: P1)

As a user, I can open one outcome and see its signals, current horizon, plans, evidence timeline,
recorded days, gaps, and an honest explanation of what can and cannot be concluded.

**Why this priority**: A goal becomes useful when it explains the relationship between intention and
actual records, including periods with insufficient evidence.

**Independent Test**: Seed one outcome with a numeric signal, a qualitative signal, linked plans, raw
records on several dates, and a gap. Verify the hierarchy, chronology, evidence counts, gap state,
and unchanged raw content at mobile and desktop widths.

**Acceptance Scenarios**:

1. **Given** valid outcome dates and evidence, **When** the user opens the detail, **Then** the page
   shows the O/K relationship, plans, evidence date/time/content, recorded-day count, and missing
   days without fabricating work.
2. **Given** an invalid or absent period, **When** the user opens the detail, **Then** the page shows
   an undated or unavailable-evidence state and does not infer a cycle.
3. **Given** a qualitative signal, **When** the user reviews progress, **Then** the page shows
   evidence coverage and status labels, not a misleading numeric completion value.

### User Story 4 — Ask AI for an explainable alignment review (Priority: P2, isolated)

As a user, I can deliberately ask whether recent plans and records appear to move an outcome forward.
The AI may propose evidence links and a direction label, but it cannot become the source of truth or
write data by itself.

**Why this priority**: AI can reduce the cost of reflection, but the product must first prove that
the local Goal Loop is understandable and useful without background automation.

**Independent Test**: With a seeded outcome, plans, and records, inspect the disclosure, select the
sources, request one review, and verify source citations, stale invalidation, and zero writes on
cancel, failure, account change, or offline use.

**Acceptance Scenarios**:

1. **Given** a current outcome and local sources, **When** the user starts an AI review, **Then** the
   exact source types, counts, date range, and bounded excerpts are disclosed before sending.
2. **Given** a valid response, **When** it returns, **Then** each direction judgment is bound to
   source references and uses one of `toward`, `stalled`, `drifting`, `blocked`, or `insufficient`;
   the result remains read-only until the user explicitly accepts a proposed association.
3. **Given** cancellation, offline mode, missing configuration, an invalid response, an account
   change, or a stale fingerprint, **When** the action ends, **Then** no Goal, plan, KR, or record is
   mutated and the state explains why.

### Edge Cases

- A Goal has no horizon, a reversed horizon, or a future-only horizon; show a safe state and do not
  count days outside a valid period.
- A signal has no numeric target, zero/negative target, missing baseline, or mixed units; fall back
  to qualitative status and evidence coverage.
- A record is outside the period, has an invalid date/time, or is linked to multiple outcomes;
  preserve its raw values and require explicit association semantics.
- A plan is completed but produces no supporting evidence; keep plan completion separate from outcome
  progress.
- A user pauses or completes a Goal; prior records remain available and the lifecycle change is
  reversible through normal editing. Abandon and reframe labels remain owner decisions for a later
  lifecycle revision.
- Account replacement, local cache replacement, offline browsing, backup restore, long content,
  keyboard focus, reduced motion, and 320/390/426/768/1280px layouts must remain safe.

## Product Admission

### Core-Loop Contribution

This improves `quick record → browse → search → edit/delete → backup/restore → offline use` by
making existing records explainable against user-defined outcomes. It adds no required action to
ordinary recording and keeps advanced review behind an optional Goals surface.

### User Evidence

The user explicitly asked for one capability that records goals, aligns plans and records, and uses
AI to judge progress. Market and community research found repeated friction from enterprise check-ins,
duplicated task systems, metric fatigue, and privacy concerns; the opportunity is a low-maintenance,
record-first loop rather than a full OKR administration product.

### Default Interface and Recording Cost

The Goals surface shows a small active set and a detail view with outcome, signals, plans, evidence,
and review. Goal association is optional and occurs after capture or from plan/detail surfaces.
The ordinary quick-record path keeps its existing fields, navigation, and save actions; no goal
picker, check-in form, streak, or mandatory daily review is added.

### Offline, Account, Privacy, Reversibility, and Backup

Goal, plan, and evidence browsing remains local-first and account-scoped. Raw records are never
rewritten by derived progress or AI. After explicit confirmation, only the selected outcome/signal
definitions, valid horizon, bounded plan metadata, evidence dates/times, and bounded content excerpts
may cross the approved provider boundary. Credentials, account identifiers, raw storage keys,
attachments, unrelated records, and full documents never leave the approved boundary. AI results are
session-only in this slice; cancellation, failure, account replacement, and stale responses produce
zero writes. Existing JSON/Markdown backup and restore contracts remain unchanged.

### Verification and Removability

Model tests cover optional fields, numeric/qualitative fallback, evidence derivation, many-to-many
candidate mapping, lifecycle states, and raw-note preservation. Browser/PWA checks cover quick-record
non-regression, Goals navigation, empty and gap states, disclosure, cancellation, source citations,
offline browsing, account replacement, accessibility, and responsive geometry. Removing the Goal Loop
surface leaves existing records, plans, and backups readable; accepted associations can be dropped as
derived metadata without deleting raw content.

### Exit Condition

Keep the AI alignment slice isolated or remove it if it adds any recording step, creates more than a
small measurable review burden, produces untraceable or frequently rejected matches, crosses an
undisclosed data boundary, weakens offline use, or shows no useful reuse during a 14-day pilot. The
local Goal Loop remains eligible for continuation only if users can understand it without AI.

### Admission Decision

- **Score**: `18/20` using the rubric in `product.md`
- **Decision**: `mainline candidate` for local Goal Loop; AI alignment remains an `isolated experiment`
  until owner discussion and 14-day evidence.
- **Red-line check**: No raw-note rewrite, required quick-record step, unapproved data export,
  backup incompatibility, or autonomous AI mutation is permitted.

## Requirements

### Functional Requirements

- **FR-001**: The Goals surface MUST let a user define an outcome with a statement, optional why,
  horizon, lifecycle state, and zero to three optional success signals.
- **FR-002**: A success signal MUST support either validated numeric baseline/current/target/direction/
  unit fields or a qualitative evidence rule and explicit status; invalid numeric input MUST never
  produce a percentage.
- **FR-003**: A local plan MAY reference one outcome and one signal as an attempted path; plan
  completion MUST remain distinct from outcome progress.
- **FR-004**: Existing raw records MAY be referenced as evidence by one or more outcomes/signals only
  through explicit user acceptance or a visible user-controlled association surface.
- **FR-005**: Quick recording MUST remain free of goal selection, mandatory check-ins, streaks, or
  network dependencies.
- **FR-006**: Goal detail MUST show signals, horizon, linked plans, chronological evidence, recorded
  days, missing periods, and an explicit insufficient-evidence state.
- **FR-007**: Progress MUST distinguish outcome progress, evidence coverage, and plan activity;
  qualitative signals MUST use status/coverage rather than fabricated numeric completion.
- **FR-008**: AI alignment MUST be initiated only by an explicit user action after disclosure of the
  exact selected source types, counts, date range, and bounded excerpts.
- **FR-009**: AI output MUST use a versioned strict schema, current request/goal binding, source
  allowlist, direction enum, confidence, reason, and source references; it is read-only until
  explicit association confirmation.
- **FR-010**: Cancellation, offline mode, missing configuration, authentication failure, timeout,
  invalid output, account replacement, and stale responses MUST produce distinct safe states and zero
  Goal, plan, KR, or record mutations.
- **FR-011**: Older Goal, plan, record, JSON backup, and Markdown export data MUST remain readable
  without mandatory migration or loss of raw fields.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: User-confirmed writes MUST converge on the existing `commitData` persistence boundary;
  AI and derived review code MUST NOT become a second writer.
- **NR-005**: Same-level reading/content/value/action axes MUST reuse existing Goals, plan, and record
  axes at all affected mobile and desktop breakpoints.
- **NR-006**: No AI output may be treated as proof of goal achievement without source references and
  a user-visible uncertainty state.

### Key Entities

- **Outcome/Goal**: User-owned direction with statement, optional meaning, horizon, lifecycle state,
  and child success signals. It remains compatible with existing flat Goals.
- **Success Signal/KR**: User-owned definition of progress. It is numeric only when baseline/current/
  target/direction/unit are valid; otherwise it is qualitative and evidence-based.
- **Plan**: A time-bounded attempted path with optional outcome/signal references and priority. It
  does not become evidence merely because it is completed.
- **Evidence Record**: A derived reference to an existing raw record, retaining source ID, date, time,
  content, and accepted outcome/signal references. It is not a duplicate note.
- **Alignment Review**: A session-only, request-bound local/AI interpretation with direction,
  confidence, reason, and source references. It is not authoritative stored progress.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can create an outcome with at least one success signal in two minutes or less
  during a manual pilot, without changing the number of actions required for a quick record.
- **SC-002**: From the Goals index, one deliberate navigation exposes the outcome, signals, plans,
  evidence chronology, recorded days, gaps, and an insufficient-evidence state.
- **SC-003**: Valid numeric signals show bounded progress; qualitative signals and invalid numeric
  inputs never show fabricated percentages in model and browser regression.
- **SC-004**: Every AI request has visible disclosure, explicit confirmation, bounded selected sources,
  traceable citations, and zero writes on cancellation, failure, offline, account-change, or stale
  paths.
- **SC-005**: In a 14-day pilot, at least one evidence record is linked to each of the two pilot
  outcomes, and the median review interaction remains under two minutes; these are continuation
  signals rather than claims of goal achievement.
- **SC-006**: Existing quick recording, account replacement, offline browsing, backup/restore, design
  checks, and the repository quality gate pass without regression.

## Scope Boundaries

### In Scope

- A unified local Goal Loop surface using outcome, success signal, optional plan relation, evidence
  timeline, and explicit status/trend explanation.
- Backward-compatible optional Goal/KR metadata and explicit lifecycle states.
- Optional one-to-many or many-to-many evidence candidates, with user-controlled acceptance semantics.
- A disclosed, bounded, source-cited, read-only AI alignment review as an isolated experiment.
- Focused model, browser, PWA, responsive, accessibility, offline, account-isolation, and
  backup-compatibility verification.

### Out of Scope

- Enterprise OKR administration, cascades, approvals, performance reviews, team permissions, or
  mandatory weekly check-ins.
- Background or scheduled AI, automatic goal completion, automatic task/reminder creation, streaks,
  social sharing, or autonomous data mutation.
- Goal-level Markdown/JSON report export in this slice.
- External health, investment, calendar, wearable, analytics, or project-management integrations.
- Replacing the quick-record editor, duplicating raw notes, creating a second store, or broad
  refactoring unrelated to the Goal Loop.

## Assumptions and Dependencies

- The first usable pilot covers both work and personal outcomes, with no more than three active
  outcomes shown by default; the exact cap remains an owner decision.
- Horizons are custom dates; annual/quarterly presets may be added later without changing the core
  relationship model.
- Each outcome may have one to three signals. A plan is an explicit hypothesis/path, not proof of
  progress; users may attach a plan to a specific signal when that relationship is meaningful.
- AI review is manual and user-initiated. The user chooses the source window; the approved provider
  and server-side key boundary follow existing project policy. On-device execution remains a later
  option.
- A record may support multiple accepted outcome/signal references only after explicit confirmation;
  the UI must make the relationship visible and removable.
- Review results remain ephemeral until a later, separately admitted decision allows the user to save
  a summary as an ordinary record.
- `PROJECT_BOARD.md` admission, priority, status, and acceptance evidence remain controller-owned;
  this revision does not modify that governance file.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| US1, FR-001–FR-002, SC-001 | Goal model/editor regression, old-data round trip, responsive manual pilot | Pending owner discussion and board admission |
| US2, FR-003–FR-005, FR-011, NR-001–NR-004 | Plan/record association tests, quick-record regression, backup/restore checks | Pending owner discussion and board admission |
| US3, FR-006–FR-007, SC-002–SC-003 | Deterministic evidence model tests, goal-detail browser journeys, mobile visual review | Pending owner discussion and board admission |
| US4, FR-008–FR-010, NR-006, SC-004 | Disclosure/source allowlist contract tests, stale/zero-write paths, provider/offline browser checks | Pending owner discussion and board admission |
| SC-005–SC-006, NR-005 | 14-day pilot log, `npm run design:check`, `npm run check`, `git diff --check` | Pending independent acceptance |
