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
3. Scroll until a different domain becomes current; confirm its label and analysis action form one vertical right-rail column, the action moves with that domain, the label does not enter the left reading surface, and the original mark still scrolls.
4. Activate the action and confirm the matching domain opens on `/insights`.
5. Switch domains and inspect the compact 30-day line and text equivalent; confirm the domain count
   appears only in the selector and no permanent metric/split block, record index, or excerpt exists.
6. Select dates by pointer/touch and keyboard. Confirm the detail reports the selected date's total,
   ordinary/periodic split, and 30-day active days; repeat selection and Escape both close it.
7. Check an investment-like domain: no coverage block, recording prompt, source link, or excerpt appears; only the fixed non-advice boundary remains beneath the local line.
8. Repeat geometry checks at 320, 426, 768, and 1280 px; verify compact tab gaps, local tab-strip overflow, keyboard focus, and 44 px targets.

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
