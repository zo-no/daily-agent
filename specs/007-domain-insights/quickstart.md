# Quickstart: Verify Local Domain Insights

## Focused checks

```bash
npm run design:check
node --test tests/analytics-model.test.mjs
E2E_TEST_FILTER="domain insights" node e2e/run-mobile.mjs
```

## Manual mobile review

1. Start the normal local application server.
2. Open the home page at 390 × 844 with multiple domains and categorized records.
3. Scroll until a different domain becomes current; confirm the analysis action moves to that domain and the original mark still scrolls.
4. Activate the action and confirm the matching domain opens on `/insights`.
5. Switch domains and inspect the two primary totals, compact 30-day rhythm, text equivalent, ordinary/periodic split, and insufficient/empty states; confirm there is no visible record index or excerpt.
6. Check an investment-like domain: only aggregate rationale/outcome/risk-boundary coverage, one restrained recording prompt, and the non-advice boundary may appear.
7. Repeat geometry checks at 320, 426, 768, and 1280 px; verify keyboard focus and 44 px targets.

## Visual evidence

- Capture the supplied-reference home state and implementation at the same 390 px viewport.
- Capture `/insights` at 390 and 1280 px.
- Assemble a combined reference/implementation comparison and inspect it in the in-app browser.
- Record findings and a final passing result in the repository-root `design-qa.md`.

## Offline check

1. Load the authenticated account and `/insights` online once.
2. Enable the repository's PWA/offline test mode.
3. Directly reload `/insights?domain=<known id>`.
4. Confirm the page and local icon render, the account-isolated cached payload is used, and no external analysis request occurs.

## Full gate

```bash
npm run check
```

Record the exact command results, screenshots, and remaining 14-day real-use validation in `PROJECT_BOARD.md` before acceptance.
