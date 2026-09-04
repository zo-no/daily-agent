# Feature Specification: Calendar and Diary Review

**Board Item**: `LN-081`
**Feature Directory**: `016-calendar-diary-review`
**Created**: 2026-09-04
**Status**: Returned with external evidence open
**Input**: User description: "优化今日复盘工作流：看看有没有 Google 日历内容，比对今日记录并给出建议；加入 Human-in-the-loop，在 Studio 可见，完成后 push 并提供介绍文档。"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing

Automated regression is mandatory for every implemented story. Real Google OAuth, Provider quality,
and product-owner visual judgment remain explicit acceptance evidence that automation cannot replace.

### User Story 1 - Review today's calendar against today's diary (Priority: P1)

As the author reviewing today, I can see whether today's cached Google Calendar events are reflected in
today's diary, where diary records fall outside the calendar, and whether timed events overlap, without
changing either source.

**Why this priority**: This is the smallest useful answer to the requested comparison and improves the
existing secondary browse/review surface before any AI interpretation is introduced.

**Independent Test**: Open `/insights` with today's cached timed and all-day Google events plus today's
entries. Verify local counts, matched/unrecorded/unplanned/overlap facts and immutable sources; repeat with
no Calendar cache and with another date/account and verify those sources never enter the review.

**Acceptance Scenarios**:

1. **Given** cached Google events and diary records for the device-local today, **When** the author opens
   Insights, **Then** the page shows bounded local facts and source-linked mismatch categories without a
   network request or write.
2. **Given** an all-day event or overlapping timed events, **When** local facts are built, **Then** the
   all-day event participates in title matching and only valid timed intervals participate in overlap facts.
3. **Given** no cached Google events, **When** the author opens the section, **Then** it explains that no
   Calendar context is available, keeps diary facts visible, and does not offer or start an AI request.

---

### User Story 2 - Approve a bounded AI suggestion request (Priority: P1)

As the author, I can inspect exactly what will leave the browser and explicitly approve or reject the
request before an Agent compares the sources and returns transient, source-bounded suggestions.

**Why this priority**: Calendar titles and diary text are private content. The requested Agent capability
is admissible only when the human checkpoint protects the external-transfer boundary.

**Independent Test**: Open the disclosure and reject it, proving zero request and zero write. Approve once,
capture the request body, and prove it contains only request metadata, opaque IDs, event title/time/all-day,
and diary time/text. Return malformed or forged output and prove normalization removes it and sources remain
unchanged.

**Acceptance Scenarios**:

1. **Given** reviewable Calendar and diary data, **When** the author opens the Agent action, **Then** the UI
   discloses the exact item counts, fields, transient-result behavior, and excluded-write boundary.
2. **Given** an open disclosure, **When** the author cancels or rejects, **Then** no model request occurs and
   the underlying records, events, caches, cloud document, export, and backup remain unchanged.
3. **Given** explicit approval, **When** the request succeeds, **Then** exactly one authenticated same-origin
   model call returns a versioned overview and at most twelve allowed, source-linked suggestions for the
   current page session only.
4. **Given** offline state, timeout, rate limiting, invalid output, a late response, or a change of account,
   date, events, or entries, **When** the request resolves or fails, **Then** it cannot replace the current
   review or write any product data.

---

### User Story 3 - Inspect and resume the workflow in Studio (Priority: P2)

As a developer, I can open Mastra Studio, run the same review contract with synthetic data, see the
human-approval step suspend before the Agent call, and resume it with approve or reject.

**Why this priority**: Studio visibility makes the requested workflow and approval boundary inspectable,
but it is developer tooling rather than a product acceptance surface.

**Independent Test**: Start `npm run studio`, select the registered workflow, run a synthetic payload,
verify suspension before any Agent call, resume once with `approve` and receive normalized output, then run
again with `reject` and receive a terminal rejected result with no Agent call.

**Acceptance Scenarios**:

1. **Given** a synthetic workflow run, **When** it reaches approval without resume data, **Then** Studio
   displays a suspended step containing counts and the exact outbound field summary and does not call the Agent.
2. **Given** a suspended run, **When** the developer resumes with `approve`, **Then** the Agent runs at most
   once and the project normalizer returns the same versioned output contract as production.
3. **Given** a suspended run, **When** the developer resumes with `reject`, **Then** the workflow terminates
   as rejected without tools, Agent memory, account data, product writes, or a Provider call.

### Edge Cases

- Duplicate, empty, overlong, invalid-time, reversed-interval, cross-date, or more-than-limit source items
  are rejected or bounded before the model call; real identifiers never become request identifiers.
- All-day events have no invented times. Entries without valid times remain reviewable but cannot form an
  interval overlap.
- The same title appearing multiple times remains separately source-linked through opaque request IDs.
- A Google token can exist only in the page's Calendar provider memory and never enters the review model,
  Route Handler, Studio input, logs, snapshot payload, response, or documentation example.
- Account replacement, Calendar disconnect/sync, date rollover, source edit, navigation, Stop, and a newer
  request invalidate pending or displayed Agent results.
- Keyboard and touch users can open, approve, cancel, stop, retry, and restore focus; affected targets are at
  least 44 pixels and widths 320/390/426/768/1280 do not overflow.

## Product Admission

### Core-Loop Contribution

The feature improves `browse` by reconciling today's schedule context with authored notes on the existing
Insights surface. It does not alter the primary `quick record` path.

### User Evidence

The product owner directly requested the Google Calendar comparison, suggestions, Human-in-the-loop,
Studio visibility, push, and an introduction document on 2026-09-04.

### Default Interface and Recording Cost

One compact secondary section appears on `/insights`; local facts are immediate and the optional Agent
request requires disclosure plus approval. No home control, automatic run, modal, required field, chat,
background task, reminder, or recording step is added.

### Offline, Account, Privacy, Reversibility, and Backup

Only the active account's already cached Calendar events and today entries are read. Local facts work
offline; AI does not. Approved payloads use opaque request-local IDs and a strict allowlist. Suggestions are
untrusted session state and never enter `commitData`, Calendar APIs, caches, Supabase, exports, or backups.
Removal requires no migration or data cleanup.

### Verification and Removability

Focused model/provider/route/workflow/browser regressions, Studio suspend/resume verification, design checks,
the full repository gate, an outbound-payload capture, and a scoped Git diff provide automated evidence.
Real OAuth/Provider behavior and owner visual/content judgment remain manual. The section and isolated modules
can be removed without touching source data.

### Exit Condition

Keep isolated or remove if it is used fewer than twice in 14 days, suggestions cannot be reconciled to visible
sources, three successful requests have median latency over eight seconds, the disclosure is unclear, the
secondary surface becomes crowded, privacy concerns arise, or any core-loop or quality invariant regresses.

### Admission Decision

- **Score**: `16/20`
- **Decision**: `mainline candidate`
- **Red-line check**: No raw-note rewrite, required recording step, offline dependency, cross-account access,
  backup migration, Calendar write, or automatic external transfer is introduced.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST build review facts only from the device-local today, the current account's
  cached Google timed/all-day events, and the current account's today diary entries.
- **FR-002**: Local facts MUST report event count, diary count, matched-event count, Calendar-without-diary,
  diary-without-Calendar, and timed-event overlap groups without a network request.
- **FR-003**: With zero cached Google events, the system MUST show a clear Calendar-empty state and MUST NOT
  start or offer a remote Agent review.
- **FR-004**: The system MUST require an explicit human approval after field/count disclosure and before
  transmitting Calendar or diary content to the Route Handler or model Provider.
- **FR-005**: The browser MUST replace real source IDs with unique request-local opaque IDs before the
  outbound boundary and MUST map suggestions back only to sources in that one request.
- **FR-006**: The approved request MUST contain only schema version, request ID, target date/fingerprint,
  locale, up to 40 events (`id`, `title`, optional start/end minutes, `allDay`) and up to 80 diary entries
  (`id`, `time`, `content`).
- **FR-007**: The request MUST exclude Google/account credentials and identity, real calendar/event/record
  IDs, external links, locations, attendees, descriptions beyond the event title, tags, categories,
  templates, fields, attachments, images, plans, other dates, and the complete document.
- **FR-008**: The authenticated same-origin Route Handler MUST enforce JSON/body/field/count/string/time
  limits, duplicate-ID rejection, rate limits, one Provider call, zero retries, and bounded timeout/response.
- **FR-009**: Model output MUST use a strict versioned schema with an overview and no more than twelve
  suggestions of only `calendar-unrecorded`, `record-outside-calendar`, or `calendar-overlap`; normalization
  MUST remove forged IDs, unsupported kinds, duplicate source groups, and unsafe/empty text.
- **FR-010**: The page MUST keep results transient and invalidate them when account, date, fingerprint,
  source data, request identity, or a newer run changes; no result or decision may write product data.
- **FR-011**: The page MUST support cancel, stop, retry, offline/unconfigured/timeout/rate-limit/invalid-output
  states with zero writes and no fabricated Agent result.
- **FR-012**: Studio MUST register a synthetic-input workflow that uses the production schema and normalizer,
  suspends before the Agent call, resumes through a strict approve/reject schema, calls the Agent only after
  approval, and terminates rejection without a Provider call.
- **FR-013**: The Studio primitive MUST have no product account/cache/Supabase/Calendar access, tools, Agent
  memory, or write capability; any run state exists only for local development and is not product history.
- **FR-014**: The introduction document MUST explain the user flow, local versus remote boundaries, exact
  inputs/outputs, Human-in-the-loop semantics, Studio run/resume steps, test method, and known limits.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content and Google Calendar events MUST remain unchanged by review or suggestions.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: Quick recording, the LN-079 current-domain summary, existing Calendar sync, and Plan editing
  MUST retain their current behavior.
- **NR-005**: The existing quality gate MUST remain green.

### Key Entities

- **Calendar review source**: One request-local, read-only projection of a cached timed or all-day Google
  event; owned by the current page session and detached from its real Google identifier.
- **Diary review source**: One request-local, read-only projection of a today's account-owned entry; detached
  from its persistent record identifier.
- **Review fingerprint**: Deterministic digest of the exact bounded projections used to detect stale results.
- **Approval decision**: Transient approve/reject response bound to one request and source fingerprint.
- **Review suggestion**: Untrusted normalized text plus allowed kind and request-local source IDs; never a
  command or write intent.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can understand today's event/diary counts and mismatches on `/insights` without a
  network request, and can reach the bounded suggestions with one action plus one explicit approval.
- **SC-002**: Every captured remote request contains only the FR-006 fields, obeys 40/80 limits, contains no
  persistent identifier or credential, and rejected/empty/offline/stale cases make zero Provider calls.
- **SC-003**: Automated regressions prove source immutability and zero calls/writes for cancellation,
  rejection, failure, stale response, account/date/source change, and forged output.
- **SC-004**: Studio exposes one workflow that demonstrably suspends before generation and resumes both
  approve and reject paths with at most one/zero Agent calls respectively.
- **SC-005**: Affected controls meet 44-pixel targets with visible focus and no horizontal overflow at
  320/390/426/768/1280 pixels; focused tests, design checks, and `npm run check` pass.
- **SC-006**: Real Google OAuth and non-sensitive Provider trials let the owner reconcile every retained
  suggestion to visible sources before LN-081 can be Accepted.

## Scope Boundaries

### In Scope

- Today-only cached Google timed/all-day events and today-only diary entries on `/insights`.
- Deterministic local comparison, confirmed bounded Agent suggestions, stale/cancel/failure safety.
- One code-defined Studio workflow with synthetic input and suspend/resume approval.
- Route/provider/model/UI tests, focused mobile evidence, architecture/product/board updates, and introduction.

### Out of Scope

- Reading Google APIs from the server or Studio; obtaining or refreshing OAuth tokens; broader Calendar
  scopes; changing existing Calendar sync or OAuth scope; other calendars, dates, locations, attendees,
  descriptions, conferencing, links, or attachments.
- Writing Calendar events, raw notes, plans, tasks, reminders, notifications, summaries, decisions, or
  suggestions; persistence, `commitData`, Supabase, backup/export/schema changes, scheduled runs, learned
  profiles, generalized chat, or production Studio exposure.
- LN-080 inline editing, unrelated dirty design/doc changes, deployment, merge, PR creation, or OKR updates.

## Assumptions and Dependencies

- Google events have already been explicitly authorized and cached by the existing account-scoped Calendar
  provider; no cache means no Calendar review request.
- Device-local date determines today, matching existing Log Note day boundaries.
- The Provider may be unconfigured in test/deployment environments; deterministic local facts remain useful.
- Studio runs only on localhost with synthetic data. Human approval authorizes that one local workflow run,
  not future runs or product data access.
- The branch is stacked on the already pushed LN-079 Studio branch. Existing uncommitted LN-080 and design
  changes remain outside the LN-081 commit via precise staging.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-003, SC-001 | Pure model tests plus browser empty/populated local-facts journeys | Today-only local comparison |
| FR-004–FR-008, SC-002–SC-003 | Provider/Route payload capture, reject/cancel/offline/stale and auth/limit tests | Human approval and privacy boundary |
| FR-009–FR-011, NR-001–NR-004 | Normalizer forgery tests, browser immutability snapshot, full gate | Transient safe suggestions and non-regression |
| FR-012–FR-013, SC-004 | Workflow mock-Agent suspend/resume test and localhost Studio API/browser verification | Studio-visible Human-in-the-loop workflow |
| FR-014, SC-006 | Introduction document, Sigo review, real OAuth/Provider and owner review listed as open | Explainability and remaining acceptance evidence |
| SC-005, NR-005 | Focused 390px capture, five-width assertions, `npm run design:check`, `npm run check` | Responsive and repository gate |
