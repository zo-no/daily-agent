# Feature Specification: Left-Workspace Tools

**Board Item**: `LN-075 Rework 9`
**Feature Directory**: `002-in-page-tools`
**Created**: 2026-08-21
**Status**: Rework
**Input**: User correction that Search and Settings must render only inside the same left content area used by Calendar, while the right binding rail and bottom actions remain visually unchanged.

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for the implemented story. Manual visual review remains required
for the left-workspace balance because perceived continuity with the diary is not fully measurable.

### User Story 1 - Use tools inside the diary's left workspace (Priority: P1)

As a diary user, I can open Search, Calendar, or Settings from the right binding rail and use that tool
inside the existing left content area while the right rail and bottom diary actions stay in place.

**Why this priority**: The rail presents tools as bindings on one book page. Replacing the entire page
with a modal-like settings sheet breaks that structure just as much as route navigation did.

**Independent Test**: On the home route, record the right rail and bottom-action geometry, URL,
selected date, Diary/Plan mode, and scroll position. Open Search and Settings in turn; verify only the
left workspace changes, the persistent right-side geometry does not move, and closing restores the
diary context.

**Acceptance Scenarios**:

1. **Given** the user is on `/`, **when** they activate Search, Calendar, or Settings, **then** that tool is rendered within the left content workspace and the right binding rail, content directory, Diary/Plan switch, export action, and record action keep their positions and visual treatment.
2. **Given** Settings is active in the left workspace, **when** the user selects any of the six existing panels and changes a setting, **then** the panel works through the existing local-first behavior without adding a recording step or changing the diary route.
3. **Given** Search or Settings is active, **when** the user activates its rail control again or presses Escape, **then** the diary content returns, focus returns to the initiating rail control, and date, mode, and scroll context are preserved.
4. **Given** one left-workspace tool is active, **when** the user activates another tool, **then** the left workspace switches directly to the requested tool without stacking a backdrop, modal, or second paper surface.

### Edge Cases

- Opening Settings while Search or Calendar is active replaces only the left workspace without leaving a stale overlay or changing the selected date.
- On mobile, Settings panel navigation drills into one detail workspace and its back control returns to the settings index; it does not close Settings.
- At 320, 390, 426, 600, 671, 700, 768, and 1280px, the tool workspace does not cross the binding axis, cover right-side controls, overflow horizontally, clip controls, or create unreachable 44px targets.
- Direct `/settings`, `/settings#record-setup`, and legacy `#structure` behavior remain compatible.
- Escape and toggle-close behavior remains usable with reduced motion and keyboard navigation; the in-page workspace does not trap focus away from the persistent right rail.

## Product Admission *(mandatory)*

### Core-Loop Contribution

Improves browse and search-adjacent orientation by keeping all three page tools within one stable book
composition; quick recording remains the same number of actions and the record action stays visible.

### User Evidence

The user explicitly corrected the first implementation: the reference is Calendar's placement in the
left content area, not a full-page settings overlay. The attached screenshot marks the replaceable left
workspace and states that the right side must not change.

### Default Interface and Recording Cost

Each rail control switches the left workspace in one action. It adds no required field, confirmation,
or recording decision. Search, Calendar, and Settings are mutually exclusive workspace modes, while
the right rail and quick actions remain persistent.

### Offline, Account, Privacy, Reversibility, and Backup

The workspace reuses existing search and settings actions and data providers. No new data leaves the browser, account
cache or sync boundary changes, raw notes are untouched unless explicitly edited, and all existing JSON,
portable backup, Markdown, offline, and direct-route behavior remains unchanged. Removing the workspace
mode restores the existing direct surfaces without migration.

### Verification and Removability

Playwright covers URL stability, mounted diary context, persistent right-side geometry, focus
restoration, tool switching, panel actions, direct-route compatibility, responsive overflow, and
reduced-motion behavior. `npm run design:check` and `npm run check` remain mandatory. The in-page
workspace is isolated behind the existing Search and Settings presentation boundaries.

### Exit Condition

Keep the workspace mode isolated or revert it if it shifts or covers the right-side controls, loses diary
context, increases recording steps, causes focus loss or mobile overflow, or makes the six settings tasks
less usable than the direct route.

### Admission Decision

- **Score**: `19/20`
- **Decision**: `mainline candidate`
- **Red-line check**: No raw-note, offline, account, privacy, recording-step, or backup red line is triggered.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Search and Settings MUST render inside the same left content workspace used by Calendar on `/`, without route navigation or a viewport-wide modal/backdrop.
- **FR-002**: Activating Search, Calendar, or Settings MUST leave the right binding rail, content directory, Diary/Plan switch, export action, and record action visually present and geometrically stable.
- **FR-003**: The Settings workspace MUST expose all six existing settings panels and preserve their current local-first actions, recovery states, translations, and accessibility names.
- **FR-004**: Search, Calendar, and Settings MUST allow at most one active workspace tool at a time; activating one replaces the left workspace directly without stacked surfaces or stale focus state.
- **FR-005**: Search and Settings MUST close through their active rail control and Escape, restore focus to that rail control, and preserve the prior selected date, view mode, plan mode, and scroll context.
- **FR-006**: Embedded Settings panel selection MUST use local UI state and MUST NOT write a hash or replace the home URL; standalone `/settings` hash aliases and direct navigation MUST remain compatible.
- **FR-007**: Tool workspaces MUST continue the existing paper surface without nested card chrome and MUST remain inside the left-side boundary at all supported widths.
- **FR-008**: Existing 44px targets, keyboard navigation, reduced-motion behavior, account isolation, offline use, raw-note integrity, and backup/export compatibility MUST remain unchanged.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data/direct-route behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 320, 390, 426, 600, 671, 700, 768, and 1280px, opening Search and Settings leaves the URL unchanged, keeps the diary shell mounted, and keeps every persistent right-side control within 1px of its pre-open position.
- **SC-002**: Search and Settings content stays entirely to the left of the binding axis, produces no viewport-wide backdrop and no horizontal overflow, and leaves all persistent right-side controls visible and operable.
- **SC-003**: Toggle-close and Escape each restore the diary within one interaction, return focus to the initiating rail control, and preserve the pre-open scroll position within 1px.
- **SC-004**: All six settings panels remain reachable and existing standalone `/settings` deep links pass without changed hash semantics; `npm run design:check` and `npm run check` exit 0.

## Scope Boundaries *(mandatory)*

### In Scope

- Home Search and Settings workspace presentation, mutual exclusion with Calendar, persistent right-side geometry, focus and scroll restoration, and responsive paper-workspace styling.
- Regression coverage and focused visual evidence for the supported widths.

### Out of Scope

- New settings capabilities, changes to settings data models or actions, route removal, account/sync changes, backup schema changes, calendar behavior, or a general modal-system rewrite.

## Assumptions and Dependencies

- The existing Search behavior, `SettingsPage`, account provider, and local-first data provider remain the single implementation sources; only their in-page presentation changes.
- The direct `/settings` route remains a supported compatibility surface and is not replaced by a redirect.
- The current dirty worktree contains unrelated user-owned changes that must not be reverted or reformatted.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001, FR-002, FR-004, SC-001–SC-002 | Home browser journey measures right-side geometry and left-boundary containment for Search and Settings at eight widths | LN-075 Rework 9 current-page tool behavior |
| FR-003, FR-006, SC-004 | Existing settings panel regression plus direct `/settings` hash checks | LN-075 settings compatibility |
| FR-005, FR-007, SC-003 | Toggle/Escape focus and scroll assertions plus mobile and desktop screenshots | LN-075 visual/interaction acceptance |
| FR-008, NR-001–NR-004 | `npm run design:check`, `npm run check`, PWA/offline regression | Constitution quality gate |
