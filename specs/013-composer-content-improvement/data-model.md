# Data Model: Hero-Triggered Composer Content Improvement

No persisted data entity, schema version, migration, backup field, export field, cache key, or cloud
document member is introduced.

## ImprovementRequestV1

Transient browser-to-server JSON:

| Field | Type | Constraint | Purpose |
| --- | --- | --- | --- |
| `schemaVersion` | literal `1` | required | rejects incompatible request/response contracts |
| `requestId` | string | unique, bounded safe token | orders and identifies one request |
| `target` | string | random opaque bounded composer-session key | prevents response crossing drafts without exposing a record ID |
| `sourceFingerprint` | string | deterministic bounded digest/token | binds result to exact captured content |
| `locale` | enum | `zh-CN` or `en` | response language only |
| `content` | string | exact length 1–4000 and non-whitespace | the only record content sent; never trimmed or truncated |

Unknown fields reject the entire request. Identity exists only in the Bearer header and is not copied
into this value.

## ImprovementProposalV1

Transient server-to-browser JSON:

| Field | Type | Constraint | Purpose |
| --- | --- | --- | --- |
| `schemaVersion` | literal `1` | exact echo | protocol binding |
| `requestId` | string | exact validated echo | request binding |
| `target` | string | exact validated echo | draft binding |
| `sourceFingerprint` | string | exact validated echo | source binding |
| `improvedContent` | string | non-empty, bounded | untrusted candidate only |

Unknown fields or any echo mismatch reject the entire proposal.

## ComposerImprovementState

Session-only UI state:

```text
idle
  → pending { request, sourceContent, AbortController }
  → candidate { binding, sourceContent, improvedContent, view: original|candidate }
  → idle after cancel/use/close/source change/error
```

- `pending` and `candidate` cannot persist, synchronize, export, or enter backup.
- `Use improved draft` copies `improvedContent` into the existing draft and discards this state.
- `Done` then uses the existing entry model and save path; this feature adds no write method.
- Account, target, template, source content, close, or newer-request change invalidates the state.

## Validation and State Transitions

| Current | Event | Next | Write |
| --- | --- | --- | --- |
| idle | tap empty | idle + message | none |
| idle | tap non-empty | pending | none |
| pending | valid matching response | candidate | none |
| pending | stale/abort/error | idle + message when relevant | none |
| candidate | view original/candidate | candidate | none |
| candidate | cancel | idle, original draft | none |
| candidate | use | idle, existing draft content updated | draft only |
| idle | Done | composer closes | existing `commitData` only |
