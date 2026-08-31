# Data Model: Confirmed Seven-Day Domain Summary

## WeeklyDomainInput

Session-only browser selection result.

| Field | Type | Rules |
| --- | --- | --- |
| `windowStart` | local date string | current local date minus six natural days |
| `windowEnd` | local date string | current local date |
| `domainId` | string | internal browser-only configured domain ID; never transmitted |
| `domainName` | string | transmitted, trimmed, max 80 characters |
| `locale` | `en` or `zh-CN` | transmitted |
| `entries` | `DomainReviewEntry[]` | newest 80 qualifying entries |
| `totalCount` | integer | all qualifying current-domain records before truncation |
| `ordinaryCount` | integer | all qualifying ordinary records before truncation |
| `periodicCount` | integer | all qualifying periodic records before truncation |
| `omittedCount` | integer | `totalCount - entries.length` |
| `limitedSample` | boolean | fewer than 3 records or fewer than 2 active days |

Invariants:

- `ordinaryCount + periodicCount === totalCount`.
- Every entry date is within the inclusive seven-day window.
- Every entry resolves through a current category to `domainId`.
- `entries.length <= 80`; IDs are unique; no input object is mutated.

## DomainReviewEntry

Strict transmitted record shape.

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | non-empty, max 128 characters |
| `date` | local date string | valid and within the request window |
| `time` | string | empty or valid `HH:mm` |
| `content` | string | trimmed, may be empty, max 4000 Unicode characters; empty text yields no invented fact |
| `sourceType` | enum | `ordinary` or `periodic` |

Forbidden siblings include account/category/domain/template IDs, tags, attachments, images,
field values, timestamps, plans, and arbitrary metadata.

## DomainWeeklySummary

Validated server response and page-session result.

| Field | Type | Rules |
| --- | --- | --- |
| `overview` | string | non-empty, bounded, at most three sentences |
| `themes` | `DomainReviewTheme[]` | zero to three unique themes |
| `providerId` | string | server controlled, non-empty, bounded |
| `generatedAt` | number | server controlled epoch milliseconds |

## DomainReviewTheme

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | non-empty, max 60 characters, unique after normalization |
| `summary` | string | one bounded sentence, max 220 characters |
| `entryIds` | string[] | one to 80 unique IDs, all present in the request |

`entryIds` support server/client grounding validation only. The UI renders neither them nor any
derived record list, excerpt, deep link, or count per theme.

## SummarySession

Browser-only state machine:

```text
idle → disclosure → loading → result
                   ↘ unavailable
```

- `idle`: action available or zero-state message.
- `disclosure`: no request; current selector snapshot shown.
- `loading`: owns request generation and AbortController.
- `result`: validated summary tied to the same account/domain snapshot.
- `unavailable`: short failure category only, no provider text.

Any domain/account/page change or Stop invalidates the generation and returns to `idle`; re-analysis
returns to `disclosure`.
