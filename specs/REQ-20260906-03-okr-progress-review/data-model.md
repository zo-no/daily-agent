# Data model

## Goal

Existing fields remain unchanged: `id`, `content`, `startDate`, `endDate`, `status`, `createdAt`, `updatedAt`.
New optional field: `keyResults: KeyResult[]`, normalized to `[]` for old goals.

## KeyResult

- `id`: unique within the goal, stable string.
- `content`: required title, bounded to 240 characters.
- `status`: `active`, `completed`, or `paused`.
- `targetValue`, `currentValue`: optional finite numbers.
- `unit`: optional bounded string.
- `recordIds`: optional references to existing entry IDs; never copies content.

Numeric progress is shown only when target is finite and greater than zero and current is finite; display is bounded to 0–100%.

## Derived GoalEvidence

Created in memory from `entries` and Goal/KR record references. It contains source entry ID, date, time, content, and KR IDs. It is never persisted as a second note.

## Analysis request/response

Request schema version `okr-progress-v1`: goal/KR titles, valid period, aggregate counts, evidence date/time, bounded excerpts, request ID, and source fingerprint. Response is read-only with completed, in-progress, missingEvidence, risks, and nextSteps arrays plus echoed binding metadata.
