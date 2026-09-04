# Quickstart: Validate Inline Record Editing

## Prerequisites

- Use the repository Node version: `nvm use`.
- Preserve the dirty working tree and do not stage generated `output/playwright/**` evidence blindly.
- Start from an authenticated fixture containing free-text, Markdown, structured, tagged, and attached ordinary records in both Time and Category views.

## Focused validation

1. Run `node --test tests/record-inline-edit-model.test.mjs`.
2. Run the focused browser scenario by its exact LN-080 title after it is added to `e2e/run-mobile.mjs`.
3. Inspect the 390px Time and Category captures. Surrounding records remain visible, the editor uses open-paper geometry, and the time surface reads as a small adjustment attached to the time.
4. Run `npm run design:check`, `npm run check`, and `git diff --check`.

## Required scenarios

- Free-text exact save; Cancel and Escape zero-write.
- Markdown list/format preservation and Hero improvement still available in the row editor.
- Structured-field validation and localized labels.
- More details, category/tags, attachment stage/finalize/discard, and confirmed delete.
- Time-only valid save, ordering update, invalid/cancel/outside/Escape zero-write, and focus restoration.
- Mutual exclusion across rows/time and invalidation on date/view/Search/Settings/Plan/account/source change.
- Diary Agent stop and absence of annotation overlap.
- Chinese and English at 320/390/426/768/1280px, 44px targets, no nested controls, no overflow or rail/dock collision, and deterministic reduced motion.

## Expected result

All automated gates pass, the scoped diff contains no schema/network/dependency changes, and LN-080 is reported as Returned with the real-mobile product-owner preference check still pending.
