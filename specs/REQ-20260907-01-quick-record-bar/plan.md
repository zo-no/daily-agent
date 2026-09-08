# Implementation Plan: Quick Record Bar

**Requirement**: `REQ-20260907-01`
**Date**: 2026-09-07
**Spec**: [spec.md](./spec.md)

## Summary

Move the canonical quick-record row into the top of the Time record section, make the blue `记` action switch to today's Time view and focus that row, restore `+` as the complete-record action, and add transient long-press progress without changing persistence.

## Technical Context

- **Runtime**: Next.js App Router, React client components, JavaScript modules.
- **Canonical UI**: `src/app/_components/home/home-page.js`, `home-action-dock.js`, `home-record-workspace.js`, `home-record-views.js`, and `home-timeline.css`.
- **Canonical write path**: `saveInlineQuickRecord` → `commitData`; no new store, route, field, or API.
- **Existing sort**: `use-home-record-model.js` keeps same-day entries latest-first by `time`, then `createdAt`.
- **Verification**: focused Playwright browser regression, `npm run design:check`, `npm run check`, and `git diff --check`.

## Constitution Check

- Preserve quick-record, offline, privacy, account-isolation, CAS, raw-note, export, and backup invariants: PASS.
- Reuse canonical components and persistence boundary; no parallel route/store/writer: PASS.
- Keep the new transient UI removable without data migration: PASS.
- No governance file or historical LN-080 spec is rewritten: PASS.

## Write Set

- `specs/REQ-20260907-01-quick-record-bar/*`
- `src/app/_components/home/home-page.js`
- `src/app/_components/home/home-action-dock.js`
- `src/app/_components/home/home-record-workspace.js`
- `src/app/_components/home/home-record-views.js`
- `src/app/_components/home/home-timeline.css`
- `src/lib/i18n.mjs`
- focused browser regression file only if its existing dirty diff can be preserved without overlap

## Design Decisions

1. `记` opens a transient quick-record session; `+` owns complete record/plan creation.
2. Quick date is always `localDate()` at click/save time, preventing historical-date plus current-time combinations.
3. The row is rendered immediately below the Time `记录` heading and above latest-first entries; it remains resident for today's populated timeline and is created on demand for an empty day.
4. The input receives a focus token after the navigation state settles; successful saves clear only content and keep the row.
5. Long press is pointer-only visual feedback with a 600 ms threshold. Keyboard activation bypasses the pointer state machine.

## Verification Plan

- Browser: populated/empty/history/continuous save, `+`, blur/Enter/Escape/empty/failure, long press/keyboard/movement, Diary/Plan, account/offline/agent context, and all five responsive widths.
- Static: existing record-action and sort tests plus any new component regression.
- Quality: `npm run design:check`, `npm run check`, `git diff --check`.
