# Quickstart: Validate Inline Record Editing

## Prerequisites

- Use the repository Node version: `nvm use`.
- Preserve the dirty working tree and do not stage generated `output/playwright/**` evidence blindly.
- Start from an authenticated fixture containing free-text, Markdown, structured, tagged, and attached ordinary records in both Time and Category views.

## Focused validation

1. Run `node --test tests/record-inline-edit-model.test.mjs`.
2. Run the focused browser scenario by its exact LN-080 title after it is added to `e2e/run-mobile.mjs`.
3. Inspect the 390px Time and Category captures. Direct free-text input keeps surrounding records visible;
   stored-time activation shows the complete composer dialog; Agent `enrich-detail` shows the detailed
   inline editor with its question bound to the source row.
4. Run `npm run design:check`, `npm run check`, and `git diff --check`.

## Required scenarios

- Direct free-text exact blur-save, no pencil, Escape zero-write and focus restoration.
- Stored-time activation opens the complete dialog; Markdown list/format, Hero improvement, time/date,
  details, attachments, and confirmed delete remain available there.
- Structured-field validation and localized labels.
- More details, category/tags, attachment stage/finalize/discard, and confirmed delete.
- Complete-dialog valid save and ordering update; Close/Escape/invalid/failure zero-write.
- Agent `enrich-detail` prompt binding, Done-save-and-advance, Cancel-keep-and-advance, and stale/stop zero-write;
  classification and Plan Agent controls remain unchanged.
- Inline quick-add idle clock uses `HH:mm:ss`, freezes on focus, refreshes from the time control, saves once
  on blur/Enter without a modal, resumes after save, and keeps empty/Escape/failure as zero-write paths.
- Legacy `HH:mm` and new `HH:mm:ss` survive normalize/export/restore and affected review projections.
- Mutual exclusion across compact/dialog/Agent-linked editors and invalidation on date/view/Search/Settings/Plan/account/source change.
- Diary Agent stop and absence of annotation overlap.
- Chinese and English at 320/390/426/768/1280px, 44px targets, no nested controls, no overflow or rail/dock collision, and deterministic reduced motion.

## Expected result

Only after every automated gate passes and the scoped diff still contains no schema, network, or
dependency change may LN-080 be reported as Returned with the real-mobile preference check pending.
Until then, keep it In progress and record the exact failing evidence.
