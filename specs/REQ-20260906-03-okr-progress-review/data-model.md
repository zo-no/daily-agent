# Data model: Goal Loop

**Requirement**: `REQ-20260906-03`
**Status**: Design candidate; owner discussion and board admission remain open.

The model extends existing account-owned Goals, plans, and records. New fields are optional so old
payloads and backups remain readable. Derived evidence and alignment reviews are not duplicate raw
records.

## Outcome / Goal

Existing fields remain compatible:

- `id`: stable account-local identifier.
- `content`: the destination statement.
- `startDate`, `endDate`: optional custom horizon; invalid or reversed ranges are treated as undated.
- `status`: `active`, `completed`, or `paused`; lifecycle labels such as `abandoned` or `reframed`
  require a later owner-confirmed revision.
- `createdAt`, `updatedAt`: lifecycle timestamps.

Optional Goal Loop fields:

- `why`: bounded user-authored meaning or motivation.
- `guardrails`: bounded non-goals or constraints that prevent optimizing the wrong result.
- `cadence`: optional preferred review interval; it does not schedule work in the first slice.
- `keyResults`: zero to three Success Signal objects.
- `planIds`: optional references to local plans; can be derived from plan references if the existing
  payload does not persist reverse links.
- `recordIds`: accepted evidence references, bounded and removable.

## Success Signal / Key Result

- `id`: stable within its Goal.
- `content`: user-authored definition of a meaningful result.
- `kind`: `numeric` or `qualitative`.
- `baselineValue`, `currentValue`, `targetValue`: optional finite numbers.
- `direction`: `increase`, `decrease`, or `maintain`; numeric progress is invalid without it.
- `unit`: optional bounded display unit.
- `evidenceRule`: optional plain-language description of what counts as supporting evidence.
- `status`: `active`, `completed`, or `paused`.
- `recordIds`: accepted references to existing raw records.

Numeric progress is shown only when the numeric values, direction, and unit are valid. It is bounded
to the display range and never inferred from record counts. Qualitative signals show status and
evidence coverage instead of a percentage.

## Plan

Existing plan fields remain authoritative. Optional references:

- `goalId`: one outcome reference.
- `keyResultId`: one optional signal reference within that outcome.
- `priority`: existing local priority metadata.

A plan is a time-bounded hypothesis or attempted path. Its completion state is independent from
outcome progress and cannot, by itself, become evidence.

## Evidence Record

Evidence is derived from an existing raw record:

- `recordId`: source record identifier.
- `date`, `time`, `content`: read-only snapshot for the current view; raw source remains canonical.
- `goalIds`, `keyResultIds`: accepted user-controlled associations.
- `sourceState`: `accepted`, `candidate`, `unassigned`, or `stale` for review purposes.

The product may show a candidate relationship from local rules or AI, but only an explicit user
action can change an association to `accepted`. Removing an association never deletes the source
record. Multiple accepted outcomes are allowed only if the owner confirms the many-to-many rule.

## Alignment Review

An alignment review is session-only in this slice:

- `schemaVersion`: versioned request/response contract.
- `requestId`, `fingerprint`: bind the response to the current Goal, selected sources, and account
  context.
- `direction`: `toward`, `stalled`, `drifting`, `blocked`, or `insufficient`.
- `confidence`: bounded `low`, `medium`, or `high`.
- `reason`: short explanation grounded in selected sources.
- `sourceRefs`: allowlisted record/plan references and dates.
- `candidateAssociations`: optional proposed links requiring explicit confirmation.

The review is not authoritative progress and is not written to the Goal, plan, record, backup, or
cloud document. A later feature may let the user save a summary as an ordinary record through the
existing record path.

## Compatibility and migration

- Missing optional fields normalize to empty or null values.
- Unknown or invalid optional fields are ignored without replacing valid current data.
- Existing records, plans, JSON backups, and Markdown exports keep their current shapes and raw text.
- Derived evidence is recomputed from current local data after restore, account switch, or deletion.
- Removing the feature drops accepted relationship metadata and transient reviews without deleting
  raw records or plans.
