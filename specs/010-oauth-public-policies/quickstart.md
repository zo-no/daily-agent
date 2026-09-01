# Quickstart: Verify OAuth Public Policies

**Board Item**: `[LN-067]`

## Automated verification

```bash
npm test -- --test-name-pattern="public policy"
E2E_TEST_FILTER="public OAuth policy pages" npm run test:e2e
npm run design:check
npm run check
```

Focused browser execution may be run directly when avoiding the PWA suite during iteration:

```bash
E2E_TEST_FILTER="public OAuth policy pages" node e2e/run-mobile.mjs
```

## Signed-out manual review

1. Use a private browser window with no Log Note session.
2. Open `/about`, `/privacy`, and `/terms` directly on the target HTTPS domain.
3. Confirm no page shows the account gate or waits for Supabase/Google.
4. Switch/read both Chinese and English sections and compare all material data statements.
5. Follow every About/Privacy/Terms/App link and test keyboard focus.
6. Review at 320 px, 390 px, and desktop width with no clipped scope/URL text.

## Implementation-truth review

Before each release that changes authentication or Calendar behavior, compare the policy against:

- `src/lib/google-calendar-model.mjs`
- `src/app/google-calendar-client.js`
- `src/app/google-calendar-provider.js`
- `src/lib/auth-model.mjs`
- `src/app/log-note-data-provider.js`

Update policy content and its effective date before deploying a materially changed data flow.

## Google Cloud handoff after deployment

1. Resolve the Calendar-to-AI release blocker: either verify provider contract/settings prohibit
   generalized-model training of Google Workspace data and add sufficient contextual consent, or
   remove Calendar-derived context from every AI request.
2. Confirm the three exact production URLs return HTTPS 200 while signed out.
3. Enter the production About/app-home URL and `/privacy` URL in OAuth Branding.
4. Verify the production domain in the account used for Google Cloud.
5. Complete Data Access scope justification and any requested demonstration video.
6. Only then publish/submit the OAuth app for verification.

## Manual-only boundary

Automation cannot publish the Google Cloud app, prove domain ownership, provide legal advice, or
guarantee Google approval. Record those results separately in `PROJECT_BOARD.md`.
