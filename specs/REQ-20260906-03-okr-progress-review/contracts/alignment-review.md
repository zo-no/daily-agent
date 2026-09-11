# Contract: one-button Goal alignment review

**Requirement**: `REQ-20260906-03`
**Status**: Candidate contract; implementation blocked by Core-Chain Change Gate.

This contract returns an inert, source-cited review. It has no product write permission.

## Browser precondition and disclosure

Before the primary action is enabled, the Goal detail MUST show:

- Goal ID only inside the local binding; the user-facing Goal statement and current period;
- checked-at date and the rule that plans use the whole period while records stop at the check time;
- local plan count, local record count, omitted/invalid counts, whether the period is within 366 days,
  and the 100-plan/200-record/360-character bounds;
- the approved provider name or a local-only/offline state;
- a statement that bounded Goal/KR text, plan metadata and record excerpts will be sent for one review.

The UI MUST NOT offer a source picker, second “fit” action, association acceptance step, or background run.
Clicking **检查目标对齐** is the explicit confirmation of this already-visible snapshot.

## Request

The request MUST include:

```ts
{
  schemaVersion: 'goal-alignment-v1',
  requestId: string,
  fingerprint: string,
  locale: 'zh-CN' | 'en',
  goal: { id: string, content: string, startDate: string, endDate: string, status: string },
  keyResults: Array<{ id: string, content: string, status: string, targetValue: number | null, currentValue: number | null, unit: string }>,
  plans: Array<{ id: string, date: string, title: string, startTime: string, endTime: string, phase: 'future' | 'elapsed' }>,
  records: Array<{ id: string, date: string, time: string, content: string }>,
  sourceSummary: { planCount: number, recordCount: number, omittedPlans: number, omittedRecords: number, checkedAt: string }
}
```

`plans` and `records` are automatically derived from the current account snapshot. The request MUST
NOT include account IDs, credentials, storage keys, attachments, image bytes, Google events, unrelated
records, full documents, provider tokens, or hidden metadata. Existing limits apply: 256 KiB request
body, one request, one model call, no automatic retry, 20-second server timeout and 25-second browser
timeout.

A missing/reversed/future-only period, no material, an over-limit period, offline state, or absent
provider configuration may return a local safe state without sending a request.

## Response

The response MUST include:

```ts
{
  schemaVersion: 'goal-alignment-v1',
  requestId: string,
  fingerprint: string,
  overall: 'toward' | 'activity-only' | 'drifting' | 'blocked' | 'insufficient',
  confidence: 'low' | 'medium' | 'high',
  summary: string,
  scopes: Array<{
    scope: 'objective' | 'key-result',
    keyResultId?: string,
    status: 'toward' | 'activity-only' | 'drifting' | 'blocked' | 'insufficient',
    reason: string,
    sourceRefs: Array<{ type: 'plan' | 'record', id: string, date: string }>
  }>,
  gaps: string[],
  nextFocus?: string,
  coverage: { planCount: number, recordCount: number, omittedPlans: number, omittedRecords: number }
}
```

Every judgment MUST cite one or more allowlisted sources unless its status is `insufficient` and its
reason is an explicit absence/ambiguity statement. `toward` needs a record-based result fact; a plan
alone can only support `activity-only` or `insufficient`. `blocked` needs a cited blocker. No record,
plan count, keyword overlap, or source omission may alone produce `drifting`. `nextFocus` is read-only
copy and MUST NOT be interpreted as a write command.

Unknown fields, duplicate sources, non-allowlisted IDs, mismatched dates, missing bindings, invalid
enums, unbounded strings, or coverage inconsistent with the request invalidate the complete response;
partial application is forbidden. The browser also revalidates response bindings and references.

## Browser state and write semantics

- The proposal is kept in page memory only and is cleared on cancel, navigation, account replacement,
  Goal/KR/period/source change, a later request, or fingerprint mismatch.
- A valid result never updates Goal, KR, plan, record, backup, cloud document, or `commitData`.
- Cancellation, offline, authentication failure, provider failure, timeout, rate limit, invalid output,
  stale response, or account change show a distinct safe state and perform zero writes.
- Source citations may navigate to an existing record/plan view, but a missing source is a no-op.
- A future capability may save a user-approved review as an ordinary record or relationship; that is
  outside this contract and must reuse the existing explicit writer.
