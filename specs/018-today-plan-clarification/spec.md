# Feature Specification: Today Plan Clarification

**Board Item**: `LN-083`
**Created**: 2026-09-04
**Status**: In progress

## User Scenarios

### P1 — Human-approved review

The author taps the existing side Diary Hero while viewing the device's real local today. The page
builds a bounded local view of editable local plans and today's records, then clearly states the
exact count of plan titles/times and record texts that would leave the browser. Nothing is sent
until the author chooses **Start review**.

### P1 — Clarify a marked fact without moving the page

After a valid result, at most five record or local-plan targets display a 44px accessible marker.
Selecting one opens a desktop popover or mobile bottom sheet. The source layout does not move. The
author may answer at most two factual questions, then explicitly use a candidate, keep the original,
or close it. No result auto-advances to another marker.

### P1 — Apply a bounded candidate

An existing-record candidate replaces only that record's content after source fingerprint recheck.
A plan-without-record candidate creates one ordinary record at that plan's end time. Neither path
modifies the source plan. The existing account-scoped `commitData` path remains the sole write path.

## Requirements

- **FR-001**: The side Hero reviews only device-local today, only editable local plans, and only
  today's record text. Google events, identities, categories, attachments, and other dates are excluded.
- **FR-002**: Analysis requires one explicit disclosure and approval; cancellation, offline states,
  invalid output, stale inputs, timeout, and rate limiting write nothing.
- **FR-003**: Requests and results use strict versioned schemas, opaque request-local IDs, bounded
  source counts, binding fingerprints, no retry, no tools, no memory, and no persistence.
- **FR-004**: Analysis produces at most five source-allowlisted targets. A reply may ask one further
  question only after the first answer, then returns a candidate or no proposal. Each reply is
  grounded in the selected bounded source snapshot and the ordered, at-most-two-question history.
- **FR-005**: Markers and popovers do not enter document flow or change source element geometry.
- **FR-006**: Candidate application is explicit, verifies the current source fingerprint, and writes
  through `commitData` exactly once. Plans are read-only targets.
- **FR-007**: Composer Hero content optimization and Plan Agent behavior remain separate.

## Success Criteria

- Exact outbound request fields, source allowlists, stale echoes, two-question bound, and zero-write
  failure behavior have focused regression coverage.
- At 320/390/426/768/1280px, marker insertion preserves source and following-row geometry; keyboard
  focus reaches the detached dialog and returns to its trigger.
- `npm run design:check` and `npm run check` pass under Node 22, or shared pre-existing failures are
  identified separately.

## Out of Scope

- Historical-date review, Google Calendar input, plan mutation, automatic writes, background runs,
  Agent memory/tools, schema migration, backup/export changes, deployment, or analytics.
