# Implementation Plan: Right Rail Visual Hierarchy

**Board Item**: `LN-075 Rework 8` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Refine the existing home right rail so its three utility controls read as one compact binding-hole group, while content-directory labels retain a stronger editorial role. The change stays presentation-only, reuses current assets, and preserves all navigation and recording behavior.

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: Existing CSS and Playwright mobile harness; no new dependency
**Storage and Ownership**: N/A; presentation-only
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: no new runtime work; CSS-only refinement plus existing rail layout observer
**Constraints**: local-first, account isolated, revision safe, offline capable, backup compatible
**Scale/Scope**: home header/rail CSS and focused mobile visual assertions at 320–1280px

## Source-of-Truth and Readiness Check

- [x] The board item exists and its intended outcome, dependencies, permissions, acceptance, and verification method are clear.
- [x] `product.md` and `PROJECT_BOARD.md` already contain the durable LN-075 rail contract; this refinement does not change product behavior.
- [x] Visual or interaction work has read `DESIGN.md` and `docs/设计规范/AGENTS.md`.
- [x] The current dirty working tree was inspected and the write set avoids unrelated user changes.
- [x] No second writer owns overlapping files or state.

## Constitution Check

- [x] Core recording steps and the home page's primary job are preserved.
- [x] Authenticated offline use, account ownership, and stale-revision safety are preserved.
- [x] Raw notes are not silently rewritten; all changes are explicit and reversible.
- [x] Privacy, network payloads, credentials, backups, restore, and removal are unchanged.
- [x] Tests cover acceptance scenarios and responsive failure paths.
- [x] The change is the smallest independently testable vertical slice.
- [x] No unauthorized commit, push, publish, deploy, deletion, reset, history rewrite, or merge is required.

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/home-header.js` and `src/app/home-header.css`: three utility controls and desktop/mobile typography.
- `src/app/home-domain-rail.js` and `src/app/home-timeline.css`: directory nodes, anchored positions, and mobile rail band.
- `src/app/page.js`: shared brush and action rail composition.
- `e2e/run-mobile.mjs`: existing rail assets, geometry, touch-target, keyboard, picker-clearance, and responsive assertions.
- `docs/设计规范/规范/基础/视觉系统规范.md` and `docs/设计规范/规范/页面/记录与结构管理页面规范.md`: 4px rhythm, semantic type roles, single axis, and 44px target requirements.

### Reuse and Compatibility Decisions

Reuse all current PNG assets and DOM semantics. Do not change rail section data, anchor computation, action ordering, date/calendar behavior, or any storage/backup contract.

## Proposed Design

### Data and Control Flow

No data flow changes. Existing React state, anchor registration, layout observer, focus behavior, and calendar state remain unchanged.

### Trust and Privacy Boundaries

No data leaves the browser and no account or private record is touched.

### UI and Interaction Contract

- Mobile utilities use one 44px × 44px grid cell each, 4px between cells, and 14px Instrument Sans labels with underline.
- The directory uses the same 44px target and 12px hole but 16px Instrument Serif labels without underline.
- Utility group starts at the safe-area top inset; directory starts after a 24px semantic gap and remains anchored to content headings.
- All rail centers remain within 1.5px of the shared brush axis; label slots stay within the existing clearance envelope.
- Desktop keeps a compact horizontal utility group and hides the mobile brush/directory.
- Hover, focus, active, current, reduced-motion, keyboard order, and long-label clipping semantics remain as-is.

## Project Structure and Write Set

```text
Read: src/app/home-header.js, src/app/home-header.css, src/app/home-domain-rail.js,
      src/app/home-timeline.css, src/app/page.js, e2e/run-mobile.mjs,
      DESIGN.md, docs/设计规范/规范/基础/视觉系统规范.md,
      docs/设计规范/规范/页面/记录与结构管理页面规范.md
Write: src/app/home-header.css, src/app/home-timeline.css, e2e/run-mobile.mjs,
       specs/001-rail-hierarchy/*
Exclude: data model, storage, auth, calendar logic, record components, generated unrelated evidence
```

**Integration Order**: Update focused assertions first, update the two CSS surfaces, run focused mobile evidence, then run the full gate. One writer in the main checkout.

## Test and Evidence Plan

### Automated Regression

- Unit/model/contract tests: existing `npm test`; no new model contract.
- Browser/mobile tests: extend `e2e/run-mobile.mjs` for utility/directory grouping, 4px rhythm, exact type roles, shared axis, clearance, and existing keyboard/touch/picker cases.
- PWA/offline/account tests: existing `npm run test:pwa`; no changed boundary.
- Design validation: `npm run design:check` and mobile screenshots at 320/390/426/600/671/700/768/1280px.
- Full gate: `npm run check`.

### Real-Environment or Manual Evidence

User visual review of the 390px screenshot is required because perceived balance is subjective; automation must still prove all measurable geometry and accessibility contracts.

### Acceptance Evidence Handoff

Record focused screenshot path, measured rail geometry, test counts, design check output, and any remaining subjective review in `PROJECT_BOARD.md` without marking the board item Accepted automatically.

## Rollback, Removal, and Migration

Revert the focused CSS and E2E assertion changes; no migration or data recovery is required.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Focused geometry assertions | Prevent subjective regressions in proximity/alignment/contrast | Screenshot-only review cannot enforce 44px targets or a shared axis |
