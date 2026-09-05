# Data Model: Daily Work Log Agent Tool

No entity in this feature is persisted. All values exist only for one function/Tool call.

## WorkItem

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Caller-local opaque ID; trimmed, 1–96 Unicode characters; unique within one request |
| `status` | enum | `completed`, `in-progress`, or `blocked` |
| `summary` | string | Explicit factual summary; 1–800 Unicode characters before normalization |

The complete request contains 1–30 items and no more than 8,000 Unicode characters across IDs and
summaries. Unknown fields reject the complete request.

## DailyLogInput

| Field | Type | Rules |
| --- | --- | --- |
| `schemaVersion` | literal | `1` |
| `targetDate` | string | Real calendar date in `YYYY-MM-DD`; no time-zone inference |
| `locale` | enum | `zh-CN` or `en` |
| `items` | WorkItem[] | Strict, bounded, non-empty, duplicate-free |

## DailyLogProposal

| Field | Type | Rules |
| --- | --- | --- |
| `schemaVersion` | literal | `1` |
| `kind` | literal | `daily-work-log` |
| `targetDate` | string | Echo of validated date |
| `locale` | enum | Echo of validated locale |
| `sourceIds` | string[] | Normalized IDs in original input order |
| `sourceFingerprint` | string | `fnv1a-` plus eight lower-case hexadecimal digits over normalized input |
| `recordCandidate` | object | Strict `date`, empty `time`, and generated `content` only |
| `writePolicy` | literal | `preview-required` |

## RecordCandidate

| Field | Type | Rules |
| --- | --- | --- |
| `date` | string | Same as `targetDate` |
| `time` | literal | Empty string; the Tool never invents a completion time |
| `content` | string | Localized title plus only non-empty status groups and one bullet per normalized item |

`RecordCandidate` deliberately matches the input candidate shape used by
`mergeDailyMarkdownEntries`. It is not a stored Log Note entry: it has no ID, category, template, tags,
attachments, field values, account, revision, or timestamps. Those fields can be resolved only by the
existing product confirmation/write path.

## State Transitions

```text
raw caller input
  → strict parse
  → normalized bounded facts
  → deterministic fingerprint + content
  → unsaved proposal (preview-required)
  → caller displays/discards it
```

There is no persisted or accepted state in LN-082. A future adapter must introduce `previewed → confirmed
→ revalidated → committed → read-back` under its own specification.

## Error Semantics

- Schema/date/duplicate/size errors reject before proposal creation.
- A pre-aborted Tool execution throws an `AbortError` before core execution.
- No error path returns a partial candidate or changes external state.
