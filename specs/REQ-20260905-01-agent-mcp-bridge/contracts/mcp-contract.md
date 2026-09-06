# MCP Contract: Log Note Agent Bridge v1

**Requirement**: `REQ-20260905-01`
**Transport**: local stdio MCP client to loopback Log Note bridge
**Protocol rule**: all unknown fields are rejected; all limits are measured before dispatching to the browser.

## Security envelope

The MCP process receives only `LOG_NOTE_BRIDGE_URL` and a short-lived pairing secret. The browser
creates and binds the secret to the authenticated account and current session generation. The MCP
caller cannot supply an account ID. The server never accepts Supabase service-role keys, Google
access tokens, browser storage, or arbitrary URLs.

Every request carries:

```json
{
  "protocolVersion": 1,
  "requestId": "request_xxx"
}
```

`requestId` is required, non-empty, and bounded. Reusing a request ID with a different payload is an
error. A request, proposal, or result is discarded when the pairing is revoked, the browser
generation changes, or the 30-minute inactivity window expires.

## Resources

### `lognote://categories`

Returns existing domains and categories only:

```json
{
  "schemaVersion": 1,
  "revision": 12,
  "fingerprint": "v1:...",
  "domains": [{ "id": "health-domain", "name": "健康" }],
  "categories": [{ "id": "health-food", "domainId": "health-domain", "name": "饮食" }]
}
```

### `lognote://plans?date=YYYY-MM-DD`

Returns at most 30 plan blocks for one date. Google-source blocks are readable but carry
`readOnly: true`.

### `lognote://records?from=YYYY-MM-DD&to=YYYY-MM-DD`

Returns at most 50 records across at most 7 natural days. Record content may be returned because the
user explicitly requested the records, but attachments, Blob URLs, source files, and unrelated
account fields are excluded. Responses are capped at 256 KiB and include `truncated`.

Equivalent tools (`list_plans`, `list_records`, `get_plan`, `get_record`) use the same limits and
schemas. An ID lookup must still be checked against the current account and requested scope.

## Proposal tools

### `propose_plan_change`

Input:

```json
{
  "protocolVersion": 1,
  "requestId": "request_xxx",
  "operation": "create|update|delete",
  "targetId": "plan_xxx",
  "draft": {
    "date": "2026-09-05",
    "startTime": "09:00",
    "endTime": "10:00",
    "title": "项目评审",
    "flexibility": "fixed"
  },
  "expectedRevision": 12,
  "sourceFingerprint": "v1:..."
}
```

`targetId` is required for update/delete and omitted for create. `draft` is limited to the
allowlisted local-plan fields. A Google-source plan is never a valid update/delete target.

### `propose_record_change`

Input uses the same envelope. Create requires `date`, `time` (possibly empty), `content`, and an
existing `categoryId`. Update/delete require `targetId`; only explicitly included allowlisted fields
may change. Attachments are not accepted. No operation may create a category or silently change
content because a category or plan changed.

Output for both proposal tools:

```json
{
  "schemaVersion": 1,
  "proposalId": "proposal_xxx",
  "requestId": "request_xxx",
  "target": { "kind": "record", "id": "entry_xxx" },
  "operation": "update",
  "before": { "content": "原文", "categoryId": "daily" },
  "after": { "content": "新文", "categoryId": "daily" },
  "sourceFingerprint": "v1:...",
  "expectedRevision": 12,
  "expiresAt": "2026-09-05T12:00:00.000Z",
  "writePolicy": "preview-required"
}
```

Proposal creation is zero-write. It does not alter local state, Supabase, backups, Google, or the
browser's ordinary draft.

## Commit tool

`commit_change` requires:

```json
{
  "protocolVersion": 1,
  "requestId": "request_xxx",
  "proposalId": "proposal_xxx",
  "confirmation": "confirmed",
  "target": { "kind": "record", "id": "entry_xxx" },
  "expectedRevision": 12,
  "sourceFingerprint": "v1:..."
}
```

The browser re-reads the current account state before applying anything. It rejects the operation
when the proposal is expired, the pairing is no longer current, the target or category is invalid,
the target fingerprint differs, the revision is stale, or the confirmation envelope is incomplete.

Successful output:

```json
{
  "schemaVersion": 1,
  "applied": true,
  "alreadyApplied": false,
  "revision": 13,
  "fingerprint": "v1:...",
  "readBack": { "kind": "record", "id": "entry_xxx", "date": "2026-09-05", "time": "09:30", "content": "新文", "categoryId": "daily" }
}
```

Stale, cancelled, offline, unauthenticated, revoked, or invalid operations return a stable error
code and no write. A repeated identical proposal returns `alreadyApplied: true` or the same result;
it cannot create a second record or plan.

## Skill contract

The accompanying Skill must instruct the Agent to:

1. read the relevant snapshot before proposing a change;
2. distinguish future plan intent from past/current record fact;
3. use only existing categories;
4. show the exact date, time, target, category and before/after diff;
5. ask for explicit confirmation before `commit_change`;
6. report “saved” only after the commit response contains read-back evidence;
7. report conflict/offline/revoked states without retrying or guessing.

The Skill must not contain credentials, account-specific data, hidden write instructions, or a
fallback that bypasses MCP.
