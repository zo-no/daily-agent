# Quickstart: Confirmed Seven-Day Domain Summary

## Synthetic happy path

1. Load `/insights?domain=<synthetic-domain>` with ordinary and periodic records inside the latest
   seven local dates.
2. Activate “AI summary for the last 7 days.” Confirm that no request occurred.
3. Verify domain, inclusive dates, subtype totals, remote-text/session-only statements, and any
   truncation notice.
4. Select Start summary and intercept exactly one `/api/organize/domain-review` request.
5. Assert the request contains only the documented whitelist and the response renders one overview
   plus at most three themes without IDs, excerpts, source links, chat, or writes.

## Failure paths

- Cancel disclosure: zero requests.
- Zero records: no Start action and zero requests.
- Limited sample: request allowed; fixed marker visible.
- Stop/domain/account/page change: request aborted and late completion ignored.
- Offline/no token/no config/timeout/invalid/unsafe: short unavailable state; local chart still works.
- Re-analysis: returns to disclosure; no immediate request.

## Focused verification

```text
node --test tests/domain-review-model.test.mjs tests/ai-domain-review-route.test.mjs
env E2E_OUTPUT_DIR=output/playwright/ln-074-domain-weekly E2E_TEST_FILTER='domain insights' node e2e/run-mobile.mjs
npm run test:pwa
npm run design:check
git diff --check
```

Run the full `npm run check` only after focused failures are resolved. Automated fixtures must remain
synthetic and must not contain real private notes or credentials.
