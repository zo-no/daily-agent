# Contract: Goal Loop alignment review

**Requirement**: `REQ-20260906-03`
**Status**: Candidate contract; implementation is blocked by the Core-Chain Change Gate.

This is a browser-to-approved-provider review contract. It returns an inert proposal and has no product
write permission.

## Request

The request MUST include:

- `schemaVersion`: `goal-alignment-v1`.
- `requestId`: opaque request-local identifier.
- `fingerprint`: current Goal, selected source, and account-context binding.
- `locale`: supported UI language.
- `goal`: bounded statement, optional why/guardrails, valid horizon, and up to three signals.
- `plans`: selected local plan references with bounded title, time, status, and optional signal reference.
- `records`: selected raw-record references with opaque source ID, date, time, and bounded content excerpt.
- `sourceSummary`: counts and date range matching the selected arrays.

The request MUST NOT include credentials, account IDs, storage keys, attachments, external-provider tokens,
unselected records, full documents, or hidden metadata. Counts, lengths, and total payload size are
bounded by the existing AI HTTP policy.

## Response

The response MUST include:

- The echoed `schemaVersion`, `requestId`, and `fingerprint` after server validation.
- `direction`: one of `toward`, `stalled`, `drifting`, `blocked`, or `insufficient`.
- `confidence`: `low`, `medium`, or `high`.
- `summary`: one bounded explanation.
- `observations`: bounded items, each with a reason and one or more allowlisted `sourceRefs`.
- `candidateAssociations`: optional proposed Goal/KR-to-record links, each requiring explicit user
  acceptance.
- `unknowns`: bounded statements when evidence is insufficient or ambiguous.

Unknown fields, duplicate sources, non-allowlisted references, missing bindings, invalid enum values,
or over-limit content invalidate the complete response. Partial application is forbidden.

## Browser behavior

- The disclosure shows the source types, counts, date range, and bounded excerpt policy before sending.
- Cancel, offline, account replacement, stale fingerprint, provider failure, timeout, and invalid
  response discard the proposal and perform zero writes.
- The user may accept or reject each candidate association. Acceptance re-reads current state and uses
  one existing `commitData` command; the AI route never writes.
- The review is session-only and is cleared on account, Goal, source, locale, or request-context change.
- A later feature may save a user-approved summary as an ordinary record; this contract does not do so.
