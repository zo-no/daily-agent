# Data Model: OAuth Public Policies

**Board Item**: `[LN-067]`
**Date**: 2026-08-31

No account schema, Supabase table, browser storage key, note payload, plan payload, backup, or
migration is added. The model below is static application content.

## PublicPolicySite

| Field | Type | Rule |
| --- | --- | --- |
| `productName` | string | Exactly `Log Note` |
| `supportEmail` | email string | One public contact shared by all pages |
| `effectiveDate` | ISO date | One version date shared by both languages |
| `documents` | ordered collection | Exactly `about`, `privacy`, `terms` |

## PublicPolicyDocument

| Field | Type | Rule |
| --- | --- | --- |
| `slug` | enum | `about`, `privacy`, or `terms` |
| `path` | absolute path | `/about`, `/privacy`, or `/terms` |
| `title` | localized text | Non-empty English and Chinese title |
| `description` | localized text | Page metadata summary in both languages |
| `intro` | localized text | Concise public explanation |
| `sections` | ordered localized sections | Stable IDs, headings, and paragraphs/lists |

## LocalizedPolicySection

| Field | Type | Rule |
| --- | --- | --- |
| `id` | stable string | Unique within a document and shared across languages |
| `heading` | string | Describes one disclosure or terms topic |
| `paragraphs` | string array | Human-readable, no HTML or secret interpolation |
| `items` | string array | Optional list, semantically parallel across languages |

## AboutMarketingContent

| Field | Type | Rule |
| --- | --- | --- |
| `hero` | localized object | One promise, one supporting sentence, and two stable actions |
| `preview` | localized static fixture | Fixed non-account records/plans with no runtime data source |
| `coreLoop` | ordered localized steps | Exactly the durable six-part product loop |
| `principles` | ordered localized statements | Local-first, account isolation, raw-note integrity, portability |
| `calendar` | localized object | Calendar is optional; existing events read-only; managed events scoped |
| `finalCta` | localized object | One closing promise, app action, privacy action, and support path |

Marketing content is public build data, not account data. English and Chinese arrays share stable IDs
and order. The static preview never reads seed fixtures, browser storage, Supabase, or Google APIs.

## GoogleCalendarDisclosureContract

The disclosure is static public information derived from current implementation constants and flow:

| Field | Current value |
| --- | --- |
| OAuth scope | `https://www.googleapis.com/auth/calendar.events` |
| Calendar | User's primary Google Calendar |
| Read window | 30 days before through 91 days after the current day |
| Existing event authority | Read-only inside Log Note |
| Managed event authority | Create, update, and delete only privately Log Note-marked events |
| Access token storage | Browser memory for the current page session; not Log Note data/backup/SW |
| Event cache | Account-scoped browser local storage; excluded from Supabase and backups |
| Cloud plan reference | Provider, calendar ID, event ID, and version/etag for Log Note-managed events |
| Disconnect | Revoke/clear token and local Google cache; do not delete Google Calendar events |

## Lifecycle and ownership

1. Documents ship with the public application build and have no account owner.
2. A visitor reads them without initializing account-owned record or Calendar providers.
3. A material data-flow, contact, or terms change requires updating both localized content and the
   effective date before release.
4. Removing the routes removes only static public content and links; no user-data migration exists.
