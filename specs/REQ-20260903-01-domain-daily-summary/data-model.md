# Data Model: Current-Domain Daily Summary

No persistent entity or version is added. Every value below exists only during local derivation, one
HTTP request, or the mounted `/insights` page session.

## Daily Domain Selection

- `accountId`: current browser account binding; required for invalidation, never transmitted
- `domainId`: selected configured domain binding; never transmitted
- `domainName`: localized visible name, trimmed to at most 80 Unicode characters
- `date`: device-local calendar date as valid `YYYY-MM-DD`
- `locale`: exact `zh-CN` or `en`
- `totalCount`: all valid local-today records in categories currently owned by the selected domain
- `ordinaryCount`: qualifying candidates whose current template is not periodic
- `periodicCount`: qualifying candidates whose current template has `recordType: periodic`
- `entries`: stable newest requestable sources, at most 80
- `omittedCount`: local candidates omitted for invalid/duplicate transport identity or newest-80 cap
- `sourceFingerprint`: deterministic browser-only serialization/hash input of the normalized scope
- `requestable`: `entries.length > 0`

Invariants:

- `ordinaryCount + periodicCount === totalCount`.
- Plans, other dates/domains, and entries whose category is missing or no longer belongs to a configured
  domain do not affect counts or entries.
- Selection does not mutate, trim, reorder, or annotate the source payload.
- Stable order is time descending, then ID descending, then original index as final deterministic tie.
- A content copy is capped to 4,000 Unicode code points; stored content remains untouched.
- Duplicate IDs keep the first source in stable newest order and increment omission for later copies.

## Daily Summary Source

Public request representation:

- `id`: non-empty string, at most 128 Unicode characters, unique within the request
- `date`: exactly the selection date
- `time`: empty or valid 24-hour `HH:mm`
- `content`: string, at most 4,000 Unicode characters; an explicit empty string is valid
- `sourceType`: exact `ordinary` or `periodic`

Forbidden request values include account/domain/category/template IDs, tags, attachments, images,
structured fields, plan data, other dates/domains, unresolved records, timestamps beyond date/time,
the source fingerprint, and the full account document.

## Daily Summary Request

- `domainName`: non-empty and at most 80 Unicode characters
- `date`: one valid local calendar date
- `locale`: `zh-CN` or `en`
- `entries`: 1–80 exact Daily Summary Sources

Every object rejects unknown keys. Authentication controls endpoint access; the server treats all
submitted text and IDs as untrusted request data and does not dereference account storage.

## Model Output and Validated Result

Model output:

- `overview`: non-empty, at most 420 Unicode characters and three sentences
- `overviewEntryIds`: one or more unique IDs from this request only
- `themes`: zero to three unique themes
- `themes[].title`: non-empty, at most 60 Unicode characters
- `themes[].summary`: non-empty, at most 220 Unicode characters and one sentence
- `themes[].entryIds`: one or more unique IDs from this request only

Server-controlled response metadata:

- `providerId`: bounded non-empty provider/model identifier
- `generatedAt`: finite non-negative epoch milliseconds

Validation rejects the whole result for an extra key, missing/unknown/duplicate source reference,
duplicate theme, diagnosis, causal assertion, score, advice, recommendation, task/reminder, length or
count violation, or investment buy/sell/hold/security/price/timing/position/allocation/return/profit/
loss/forecast wording. The fixed prompt permits only facts present in the referenced sources. The UI
renders only overview, theme title, and theme summary; semantic source reconciliation remains a real
owner-acceptance check rather than a claim made from schema validation alone.

## Disclosure and UI Session

Phases:

```text
empty | unrequestable | idle → disclosure → loading → result
                                  ↑     ↘ unavailable
                                  └ retry/re-analyze
```

- `empty`: zero local qualifying records; no request action
- `unrequestable`: local records exist but none passes strict transport rules; no request action
- `idle`: local counts/action visible; no request made
- `disclosure`: scope, counts, omission, transfer, and no-write lifetime visible; still no request
- `loading`: exactly one current request owns the phase and exposes Stop
- `result`: one browser-revalidated session result
- `unavailable`: bounded safe failure; Retry returns to disclosure without requesting

The session owner is the complete scope key. Account, domain ID/name, date, locale, normalized source
fingerprint, unmount, Stop, or a newer generation invalidates the owner, aborts work, and prevents a
late response from entering `result`.
