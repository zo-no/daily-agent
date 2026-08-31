# Data Model: Local Domain Insights

This feature adds no persisted entity, schema version, synchronization field, or backup key. Every structure below is a transient result computed from the existing account payload.

## Existing fields read

- `domains[]`: `id`, `name`, `order`
- `categories[]`: `id`, `domainId`, `name`, `order`
- `templates[]`: `id`, `categoryId`, `name`, `order`, `recordType`
- `entries[]`: `id`, `date`, `time`, `content`, `categoryId`, `templateId`, `createdAt`

Attachments, field values, tags, settings, and account identifiers are not required by the analytics model.

## Computed structures

### `AnalysisWindow`

| Field | Type | Rule |
|---|---|---|
| `startDate` | `YYYY-MM-DD` | Local date 29 days before `endDate` |
| `endDate` | `YYYY-MM-DD` | Explicit test date or current local date |
| `days` | array | Exactly 30 ascending local-date strings |

### `DailyActivityPoint`

| Field | Type | Rule |
|---|---|---|
| `date` | string | One value from `AnalysisWindow.days` |
| `count` | non-negative integer | Records assigned to this domain and date |
| `ordinaryCount` | non-negative integer | Records on this date whose resolved template is not periodic |
| `periodicCount` | non-negative integer | Records on this date whose resolved template is periodic |

For every point, `ordinaryCount + periodicCount === count`. The 30 points remain ascending and are
computed in memory only.

### `SourceReference` (internal derivation only)

| Field | Type | Rule |
|---|---|---|
| `id` | string | Existing record ID |
| `date` | string | Existing valid local date |
| `time` | string | Existing time when available |
| `excerpt` | string | Whitespace-normalized display copy, bounded to 160 Unicode code points |
| `periodic` | boolean | `templateId` resolves to a template whose `recordType` is `periodic` |

The source record is never mutated. The selected one-glance UI does not display a source index or
excerpt; this bounded structure remains internal for deterministic investment coverage and regression
checks only, and must not be written back.

### `InvestmentCoverage`

| Field | Type | Meaning |
|---|---|---|
| `rationale` | integer | Recent sources containing a narrow rationale cue |
| `outcome` | integer | Recent sources containing a narrow outcome/review cue |
| `riskBoundary` | integer | Recent sources containing a narrow risk/exit/boundary cue |
| `leastCovered` | enum | Deterministic minimum of `rationale`, `outcome`, `riskBoundary` |

Coverage is keyword presence for internal regression only. It is not rendered, semantic truth, financial scoring, or advice.

Investment-like domain recognition reads only the current domain name and matches this closed list:
Chinese `投资|交易|理财|金融|股票|基金|证券`; English case-insensitive word-boundary
`investment|investing|trading|finance|stock(s)|fund(s)|securities|brokerage`.
Record content never changes domain recognition.

### `DomainReview`

| Field | Type | Rule |
|---|---|---|
| `domainId` | string | Configured domain ID, or `unresolved` for invalid provenance |
| `name` | string | Raw configured domain name; localized at render time |
| `totalRecords` | integer | Sum of daily counts |
| `activeDays` | integer | Daily points whose count is greater than zero |
| `ordinaryRecords` | integer | Records not backed by a resolved `recordType: periodic` template, including ordinary structured/free templates |
| `periodicRecords` | integer | Records backed by a resolved `recordType: periodic` template |
| `series` | `DailyActivityPoint[30]` | Fixed ascending series |
| `recentSources` | `SourceReference[]` | Most recent first, internally bounded; not rendered as a record index |
| `evidenceState` | `empty` \| `insufficient` \| `ready` | See threshold below |
| `trendDirection` | `up` \| `down` \| `steady` \| `unknown` | Compare latest seven days with preceding seven days only when ready |
| `investmentLike` | boolean | Name matches a narrow localized investment keyword |
| `investmentCoverage` | object/null | Internal regression field for investment-like domains; never rendered |
| `promptKey` | string/null | Internal legacy localization key; never rendered by the compact page |

### Root result

```text
{
  window: AnalysisWindow,
  domains: DomainReview[],
  unresolved: DomainReview | null,
  totals: {
    records: integer,
    activeDays: integer,
    domainsWithRecords: integer
  }
}
```

## Validation and state transitions

- A record date must match `YYYY-MM-DD` and round-trip through a local calendar date. Invalid dates are excluded from the time series and reported through aggregate diagnostic counts, never coerced.
- A qualifying record is an existing record with a valid local date inside the inclusive window. It is assigned exactly once: to a configured domain through its configured category, or to `unresolved`; root `totals.records` equals the sum of every configured-domain and unresolved bucket total.
- `periodicRecords + ordinaryRecords === totalRecords` for every review.
- `empty`: zero qualifying records.
- `insufficient`: fewer than 3 qualifying records or fewer than 2 active days.
- `ready`: at least 3 qualifying records across at least 2 active days.
- Provider/account replacement discards the previous transient result and recomputes from the new payload.
- No transition writes to the source payload, browser storage, service worker data cache, or Supabase.
