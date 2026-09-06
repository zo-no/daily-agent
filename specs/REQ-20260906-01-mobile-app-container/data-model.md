# Data Model: Mobile App Store Container

This feature intentionally adds no persisted business entity and no new cloud schema. The existing
account payload, attachment references, backups, and revision metadata remain the canonical data.

## Native Capability Adapter (ephemeral)

| Field | Meaning | Persistence | Validation |
|---|---|---|---|
| `platform` | `android` or `ios` | Runtime only | Known platform enum |
| `appState` | `active`, `inactive`, or `background` | Runtime only | Transition events are monotonic per session |
| `networkState` | `online` or `offline` | Runtime only | Must not override server/CAS result |
| `callbackState` | Pending OAuth/deep-link correlation | Runtime only | One-time, origin-checked, expires on timeout |
| `shareRequest` | Generated filename, MIME type, and Blob/content handle | Runtime only | Uses existing export output; no record mutation |
| `pickerRequest` | Image/backup selection request and cancellation state | Runtime only | Cancellation and denial are zero-write |

## Mobile Release Package (release evidence)

| Field | Meaning | Persistence | Validation |
|---|---|---|---|
| `applicationId` | Stable Android/iOS package identity | Repository/release metadata | Matches signing and store listing |
| `version` | User-visible and build version | Repository/release metadata | Monotonic per platform |
| `origin` | Approved HTTPS Log Note origin | Build configuration | HTTPS, allowlisted, no credential query parameters |
| `supportedOs` | Minimum supported Android/iOS versions | Build metadata | Matches tested device matrix |
| `privacyMetadata` | Store data-use and account-deletion declarations | Store submission package | Matches privacy/terms routes and actual behavior |

## Existing canonical entities retained

- Account-owned text state and revision: existing `LogNoteDataProvider` and `commitData` path.
- Account-owned image Blob: existing owner-scoped IndexedDB attachment store.
- Portable backup: existing JSON/attachment bundle formats and validation.
- Auth session: existing Supabase Auth session and callback route.

No adapter may become an owner or writer of these entities.
