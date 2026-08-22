# Feature Specification: Right Rail Visual Hierarchy

**Board Item**: `LN-075 Rework 8`
**Feature Directory**: `001-rail-hierarchy`
**Created**: 2026-08-21
**Status**: Ready
**Input**: User feedback that the right rail has uncoordinated sizing and fails proximity, alignment, repetition, and contrast.

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing

### User Story 1 - Scan the rail without visual competition (Priority: P1)

As a mobile diary user, I can distinguish the three utility actions from the current-content directory at a glance while both remain visibly part of one book-binding rail.

**Why this priority**: The current oversized vertical labels compete with the diary title and form rows, making the whole page feel mis-scaled despite preserving the correct actions.

**Independent Test**: At 390px, compare the utility group, one directory item, the page title, and the first form row. The rail uses one axis and repeated node geometry; utilities are a compact group, the directory is stronger than utilities but weaker than page content, and no label is clipped.

**Acceptance Scenarios**:

1. **Given** the diary contains one visible periodic domain, **when** the user scans the first viewport, **then** Search, Calendar, and Settings read as one compact utility group, and the domain label reads as a separate content-index group.
2. **Given** a utility is focused or Calendar is expanded, **when** its state changes, **then** only that control gains the accent treatment while all 44px targets and keyboard names remain intact.

### Edge Cases

- At 320px and with a top safe-area inset, the title, date, utility labels, and first record row do not overlap or clip.
- Long directory labels remain a single vertical column with their full accessible name.
- Reduced motion removes reposition and reveal animation without changing geometry.
- At 701px and wider, the compact desktop header remains legible and the mobile full-height rail stays hidden.

## Product Admission

### Core-Loop Contribution

Improves browse and quick-record orientation by reducing navigation competition around the active diary content; recording steps remain unchanged.

### User Evidence

The product owner supplied a marked 390px screenshot and explicitly identified uncoordinated sizing and failures in proximity, alignment, repetition, and contrast.

### Default Interface and Recording Cost

No controls, fields, modals, or required decisions are added. Opening and saving a normal quick note retain the same action counts.

### Offline, Account, Privacy, Reversibility, and Backup

This is presentation-only. It creates no data, network, account, synchronization, note-content, export, restore, or backup change. Removal is a local style rollback.

### Verification and Removability

Browser regression measures group spacing, common axis, visual sizes, type roles, state contrast, hit targets, responsive boundaries, and screenshots. Existing full quality gate remains mandatory. The change is isolated to home rail styling and its visual contract.

### Exit Condition

Keep the refinement isolated or revert it if it reduces 44px reachability, causes title/calendar overlap, makes directory labels indistinguishable from utilities, or fails the project quality gate.

### Admission Decision

- **Score**: `18/20`
- **Decision**: `mainline candidate`
- **Red-line check**: No raw-note, offline, account, privacy, recording-step, or backup red line is triggered.

## Requirements

### Functional Requirements

- **FR-001**: The three rail utilities MUST form one compact group using identical 44px target geometry, identical 10–12px binding holes, one label type style, and a consistent 4px internal rhythm.
- **FR-002**: Utility labels MUST use 14px Instrument Sans with a restrained underline, while directory labels MUST use 16px Instrument Serif without an underline; both MUST remain weaker than the 32px active page title and 18px record labels.
- **FR-003**: Utility holes, directory holes, the full-height brush, workspace switch, export, and add actions MUST remain centered on the same X axis within 1.5px.
- **FR-004**: The utility group MUST sit 8px from the top safe-area boundary, use no gap larger than 4px between its three targets, and leave at least 24px before the directory's usable band.
- **FR-005**: Idle utilities and directory labels MUST use muted ink; hover, keyboard focus, expanded Calendar, and current directory state MUST use the single accent color without increasing layout size.
- **FR-006**: All existing keyboard names, focus order, Calendar expanded state, 44px hit targets, responsive visibility rules, long-label truncation, and reduced-motion behavior MUST remain unchanged.
- **FR-007**: The home title/date cluster and record stream MUST retain sufficient right clearance so rail targets and labels never cover content at supported mobile widths.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.

## Success Criteria

### Measurable Outcomes

- **SC-001**: At 320, 390, 426, 600, 671, and 700px, the three utilities form a non-overlapping 132–140px compact stack with 44px targets and no horizontal overflow.
- **SC-002**: At mobile widths, all node centers differ from the rail center by no more than 1.5px; utility text is exactly 14px and directory text exactly 16px.
- **SC-003**: Visual evidence at 390px shows a clear hierarchy of page title → record content → directory label → utility labels, and `npm run check` passes.

## Scope Boundaries

### In Scope

- Home rail utility and directory typography, spacing, alignment, state contrast, and responsive clearance.
- Automated geometry assertions and refreshed visual evidence.

### Out of Scope

- New controls, icon assets, data behavior, note layout redesign, calendar behavior, action-dock redesign, desktop information architecture, or changes outside the home rail contract.

## Assumptions and Dependencies

- Existing binding-hole, brush, focus-loop, export, and record-stamp assets remain the visual asset source.
- `LN-075 Rework 7` provides the current background and rail baseline.
- The current main checkout has one writer and contains unrelated user-owned changes that must be preserved.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-005, SC-001–SC-002 | Mobile geometry/style assertions in `e2e/run-mobile.mjs` | LN-075 Rework 8 visual hierarchy acceptance |
| FR-006–FR-007 | Existing keyboard, calendar, touch-target, overflow, and breakpoint regression | LN-075 non-regression contract |
| SC-003, NR-004 | 390px screenshot and `npm run check` | LN-075 returned evidence |
