# Contract: Public OAuth Policy Surface

**Board Item**: `[LN-067]`
**Version date**: 2026-08-31

## Stable routes

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/about` | None | Public application identity and Calendar purpose |
| `GET` | `/privacy` | None | Public privacy and Google user-data disclosure |
| `GET` | `/terms` | None | Public service terms |

All three routes must return normal HTML when Supabase and Google services are unavailable. They must
not redirect to sign-in, render the account gate, or initialize account-owned Log Note/Calendar data.

## Shared visible contract

Every route exposes:

- the `Log Note` identity;
- Chinese and English content for the same document version;
- `Effective / 生效：2026-08-31`;
- `x2742160682@gmail.com` as support/privacy/deletion contact;
- links to `/about`, `/privacy`, `/terms`, and `/`;
- one `main`, one page-level `h1`, descriptive section headings, and visible focus.

## Privacy material-disclosure contract

The Privacy page must disclose each of these topics in both languages:

1. Supabase authentication profile fields used for identity and account ownership.
2. Account-owned note/plan/settings cloud document and local-first storage boundary.
3. Google scope `https://www.googleapis.com/auth/calendar.events` and primary calendar.
4. 30-day past and 91-day future read window for schedule context/conflict display.
5. Existing, unmarked Google events are read-only in Log Note.
6. Create/update/delete is limited to events carrying Log Note's private managed marker.
7. Google access token remains in browser memory and is excluded from Log Note state, Supabase,
   backups, logs, and the Service Worker.
8. Normalized Google event cache is account-scoped browser storage and is excluded from Supabase and
   backups.
9. Managed-event provider/calendar/event ID and etag/version may synchronize with the account-owned
   plan document in Supabase.
10. Processors/third parties are limited to Supabase and Google for user-requested features; no sale,
    advertising, unrelated transfer, or generalized AI use of Google user data.
11. Google API Services User Data Policy and Limited Use compliance.
12. Retention, reasonable security, disconnect, Google Account revocation, local site-data clearing,
    and support-email deletion request behavior.
13. Explicitly started AI tools send only bounded task fields through an authenticated same-origin
    endpoint to the configured model provider. Plan review may include overlapping Google event title
    and time as read-only conflict context for that visible review; other AI tools receive no Google
    Calendar data. Account credentials, Google tokens, and images are excluded; no Google data is used
    for advertising or generalized model training; raw notes are not silently rewritten and results
    remain temporary unless applied.

## Terms material-section contract

The Terms page must cover:

1. independent-project identity and acceptance/eligibility;
2. account security and accurate information;
3. user ownership of content and narrow permission to process it for requested features;
4. acceptable use and prohibited abuse;
5. backup/export responsibility and destructive-action caution;
6. optional Google/Supabase third-party services and their separate terms;
7. service changes, availability, beta/experimental features, and no availability guarantee;
8. no professional advice and as-is disclaimer to the extent permitted;
9. suspension/termination and user control to stop use/revoke access/request cloud deletion;
10. versioned terms changes and support contact.

The page must not name an unverified company, registration number, street address, governing law, or
exclusive court.

## Compatibility contract

- Every non-public route retains the existing required-account behavior.
- The home composer, note/plan data, Calendar sync algorithm, storage keys, backup formats, and
  Service Worker behavior remain unchanged.
- Legal links are secondary and do not become new primary home controls.
