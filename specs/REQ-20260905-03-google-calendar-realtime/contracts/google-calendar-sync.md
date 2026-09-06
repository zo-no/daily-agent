# Contract: Google Calendar 近实时同步

**Requirement**: `REQ-20260905-03`
**Status**: Draft; push routes are conditional on deployment approval.

## Incremental read contract

The Calendar adapter requests a bounded primary-calendar scope. When a valid `syncToken` exists, the
request asks for changes since that token and includes deleted items. A response may contain pages,
tombstones, repeated events, or an updated next token. The adapter treats the event ID and etag as the
facts and never treats a push notification body as a complete event.

The adapter must keep the query shape stable across a token stream. It must not add incompatible
`timeMin`, `timeMax`, `orderBy`, `q`, or equivalent filters only on incremental requests. Boundedness
therefore applies to retained/displayed fields and cache policy, while the cursor stream remains
consistent until a full rebuild is required.

The adapter returns a normalized result:

```json
{
  "schemaVersion": 1,
  "calendarId": "primary",
  "events": [],
  "deletedEventIds": [],
  "nextSyncToken": "opaque",
  "fullRebuildRequired": false,
  "observedAt": "2026-09-05T00:00:00.000Z"
}
```

Tokens and full provider payloads are internal adapter values and must not be returned to Agent tools,
logs, backups, or user-facing exports.

## Managed write contract

Only a local plan that is owned by the current account and carries the Log Note managed marker may
create, update, or delete a Google event. An update uses the known event ID and etag/precondition. A
precondition failure returns `conflict` and leaves both local and remote facts available for explicit
resolution. A local deletion only targets its own managed event.

Ordinary Google events are read-only. The adapter must reject writes when the marker, account, event ID,
calendar ID, or authorization generation is missing or mismatched.

## Optional webhook contract

`POST /api/google-calendar/webhook` (only when approved) accepts only a bounded notification header set
and channel binding. It verifies channel ID, resource ID, account binding, expiration and generation,
then enqueues or triggers the same incremental sync. It returns a fast 2xx and does not trust a body as
event data. Duplicate, late, expired, forged, or old-generation notifications are no-ops with an
observable bounded result.

`POST /api/google-calendar/watch` creates or renews a channel only for an authenticated account with an
approved long-lived authorization path. `POST /api/google-calendar/sync` requests a manual or recovery
sync without exposing tokens. Optional `DELETE /api/google-calendar/watch` stops a current channel.

## State and error contract

User-visible states are `disconnected`, `connecting`, `syncing`, `synced`, `dirty`, `offline`, `error`,
`conflict`, `revoked`, and `rebuilding`. Error codes distinguish authorization, deployment, network,
cursor-expired, conflict, and account-generation failures. No error may claim cloud persistence when
the local state was only cached.
