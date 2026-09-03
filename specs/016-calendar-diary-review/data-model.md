# Data Model: Calendar and Diary Review

No persistent entity is added.

## Browser Selection

- `date`: device-local `YYYY-MM-DD`
- `calendarEvents`: current account cache items on `date`, bounded to 40 after stable time/title order
- `entries`: current account entries on `date`, bounded to 80 after stable time/creation order
- `requestId`: random per approved run
- `sourceFingerprint`: deterministic digest of the exact bounded projection, date, and locale

## Public Request Sources

- Event: `{ id, title, startMinute?, endMinute?, allDay }`
- Entry: `{ id, time, content }`
- IDs are unique request-local opaque values. Timed events require a valid increasing interval; all-day events omit
  minutes. Titles are ≤240 characters and entry content ≤4,000 characters.

## Review Result

- `schemaVersion`: `calendar-diary-review-v1`
- `requestId`, `targetDate`, `sourceFingerprint`: exact request echo
- `overview`: bounded factual review
- `suggestions[]`: `{ kind, title, summary, sourceIds[] }`, at most 12
- Allowed kinds: `calendar-unrecorded`, `record-outside-calendar`, `calendar-overlap`
- `providerId`, `generatedAt`: bounded server-controlled metadata

Every value is transient. Suggestions contain no command, application state, persistent ID, or write callback.

## UI State

`calendar-empty | idle → disclosure → loading → result | unavailable`, with Stop/cancel/retry returning through a
fresh approval. Source/account/date/fingerprint change invalidates loading and result states.

## Studio State

`validating → suspended-for-approval → rejected | generating → normalized`. Suspend payload contains only synthetic
request metadata, source counts, and a field summary. Resume data is strict `{ decision: "approve" | "reject" }`.
