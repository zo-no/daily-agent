# Feature Specification: In-page Agent Plan Review

**Board Item**: `LN-074`
**Feature Directory**: `004-agent-plan-review`
**Created**: 2026-08-23
**Status**: Rework ready for planning
**Input**: User descriptions: "在计划里也使用现有 Agent 审核。"；"计划状态下agent也应该一直出现，并有一行小字‘编写计划后和我聊聊吧’。"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove the acceptance claim.

### User Story 1 - Wake Agent in Plan (Priority: P1)

On every selected-day Plan surface, the user sees the same illustrated Agent used by Diary. When the
day has editable local plans, the user can wake it to scan those plans and move to one concrete plan
that needs attention without navigating away or covering the plan editor. When the day has no
editable local plans, the companion remains visible but passive and invites the user to write a plan
before chatting.

**Why this priority**: It gives Plan the same contextual review language as Diary while keeping the
existing create/edit flow unchanged.

**Independent Test**: Seed local plans with an overlap and a vague title, enter Plan, wake the Agent,
and verify one local plan becomes the active source while every plan remains unchanged.

**Acceptance Scenarios**:

1. **Given** the selected day has at least one editable local plan, **When** the user wakes the Agent in Plan, **Then** a transient review begins in place and anchors to one real local plan ID.
2. **Given** the day has only read-only Google events or no plans, **When** Plan is shown, **Then** the Agent remains visible, exposes no review activation, and displays the single-line supporting copy “编写计划后和我聊聊吧” in Chinese or its localized equivalent.
3. **Given** the Agent is scanning, **When** it detects a time overlap or vague title, **Then** it opens one compact paper annotation beside the affected local plan.

### User Story 2 - Discuss a Plan Issue (Priority: P1)

The user can answer a concrete follow-up question or chat briefly about the active plan. The reply
stays transient until the user chooses a separate resolution action.

**Why this priority**: The Agent should understand or explain a plan before proposing a change.

**Independent Test**: Send one answer for a vague plan and verify the Agent responds without changing
the title, date, time, source, or Google Calendar state.

**Acceptance Scenarios**:

1. **Given** a local plan has an open review item, **When** the user replies, **Then** the conversation remains attached to that plan and no persistent field changes.
2. **Given** the user chooses keep original, **When** the item advances, **Then** the source plan remains byte-for-byte and minute-for-minute unchanged.

### User Story 3 - Confirm a Plan Update (Priority: P1)

After discussion, the Agent may propose a clearer title or a non-overlapping start/end time for the
same local plan. The user explicitly applies the proposal or keeps the original.

**Why this priority**: It closes the review loop while preserving local-first ownership and trust.

**Independent Test**: Confirm a title-only proposal and a time-only proposal, then verify only the
explicitly proposed fields change through the normal local-first save path.

**Acceptance Scenarios**:

1. **Given** a valid title proposal exists, **When** the user chooses update plan, **Then** only that local plan's title changes and its ID/source/date/time remain unchanged.
2. **Given** a valid time proposal exists, **When** the user chooses update plan, **Then** only its start/end minutes change and the result remains within the selected day with start before end.
3. **Given** a proposal references a Google event, unknown plan ID, another date, or invalid minutes, **When** it is received, **Then** it is discarded and no write is offered.

### Edge Cases

- Switching date, opening Diary, Calendar, Search, Settings, editing a plan, or leaving the page cancels the transient Plan review.
- Google events may be used only as visible conflict context already present on the selected day; they remain read-only and are never update targets.
- Offline, timeout, missing credentials, invalid output, or cancellation keeps Plan fully usable and falls back to deterministic local checks for overlap and vague titles.
- A stale cloud revision follows the existing conflict path; the Agent cannot bypass it.
- The interaction remains usable at 320–1280px with 44px targets, keyboard access, no horizontal overflow, and reduced motion.

## Product Admission

### Core-Loop Contribution

Improves browse and edit for the selected day's plans while preserving the primary quick-record loop.

### User Evidence

The product owner explicitly requested using the existing Agent review interaction inside Plan after
iteratively validating the Diary Agent's row-local behavior.

### Default Interface and Recording Cost

The existing Agent illustration remains present throughout Plan. It is actionable only when editable
local plans exist; otherwise it is a passive companion with one weak line of guidance. It adds no
required plan-creation field, decision, or action and does not compete with the add-plan control.

### Offline, Account, Privacy, Reversibility, and Backup

Only the selected day's local plan ID, title, start/end minutes, and bounded read-only Google event
title/time context may leave the browser through the authenticated same-origin Agent boundary.
Other dates, notes, identity, tokens, descriptions, attendees, locations, and the full document are
excluded. Offline review uses local deterministic checks. Conversation and proposals are transient.
Writes require explicit confirmation and reuse the account-owned local-first plan save path. Existing
backup and restore formats remain unchanged.

### Verification and Removability

Model/route tests cover minimal inputs, allowlists, invalid proposals, fallback, and explicit writes.
Browser tests cover Plan activation, anchoring, discussion, title/time confirmation, Google read-only
boundaries, cancellation, accessibility, and responsive widths. Removing the Plan adapter and hooks
returns the Diary-only Agent without migration.

### Exit Condition

Keep isolated or remove if Plan review obscures creation, cannot reliably identify the source plan,
produces unsafe time changes, exceeds the existing latency/cost boundary, or is not used during the
same 14-day Agent observation window.

### Admission Decision

- **Score**: `17/20` using the rubric in `product.md`
- **Decision**: `mainline candidate` as a bounded extension of LN-074
- **Red-line check**: no silent rewrite, required creation step, persisted AI entity, account-boundary change, Google mutation, or backup-format change

## Requirements

### Functional Requirements

- **FR-001**: Plan MUST display the existing Agent on every selected date. It MUST expose the optional wake control only when the day contains at least one editable local plan; otherwise the figure MUST be non-interactive and accompanied by the single-line supporting copy “编写计划后和我聊聊吧” in Chinese or its localized equivalent.
- **FR-002**: Activating Plan review MUST stay on Plan, scan only the selected day, and associate each item with one allowlisted local plan ID.
- **FR-003**: Review MUST detect bounded issues supported by the current timed-plan model: overlapping timed items and vague local titles.
- **FR-004**: The Agent MUST anchor to one local plan at a time and render a compact annotation without moving the right rail or blocking Plan controls.
- **FR-005**: Conversation MUST remain transient and MUST NOT mutate a plan until a separate explicit update action.
- **FR-006**: A confirmed update MUST change only allowlisted title and/or start/end fields and preserve ID, date, source, and unrelated fields.
- **FR-007**: Proposed minutes MUST be finite, within the selected day, and ordered start before end; invalid or unknown proposals MUST be discarded.
- **FR-008**: Google events MUST remain read-only update-excluded context, and access tokens or nonessential fields MUST NOT enter the Agent request.
- **FR-009**: Requests MUST retain existing authentication, origin, size, rate, timeout, schema, allowlist, cancellation, and offline protections.
- **FR-010**: Date, mode, tool, editor, account, and navigation transitions MUST cancel review and clear transient state.
- **FR-011**: Diary Agent, quick recording, Plan CRUD, calendar synchronization, and `/organize` compatibility MUST not regress.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content and plan fields MUST remain unchanged unless the user explicitly confirms an edit.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.

### Key Entities

- **Plan review session**: Transient selected-day Plan state containing status, allowlisted items, active item, messages, proposal, and cancellation lifecycle; never persisted.
- **Plan review item**: A reference to one editable local plan and one bounded issue type: overlap or vague title.
- **Plan update proposal**: Optional allowlisted title and/or start/end values for the active local plan, applied only after explicit confirmation.
- **Read-only conflict context**: Minimal selected-day Google event title/time used only to explain overlap; never an update target.

## Success Criteria

### Measurable Outcomes

- **SC-001**: With local fallback, waking Plan Agent reaches the first anchored issue or a clear complete state within 2 seconds.
- **SC-002**: 100% of plan writes require an explicit update action and all keep-original/chat-only journeys preserve the stored plan exactly.
- **SC-003**: Invalid, cross-date, unknown-ID, and Google-target proposals produce zero writes in all contract tests.
- **SC-004**: Across 320–1280px, the Agent is visible in local-plan, Google-only, and empty Plan states; the passive hint remains one line at the 320px Chinese target; actionable controls retain 44px targets with no horizontal overflow, hint/add-action collision, action-dock overlap, or changed rail geometry.
- **SC-005**: Focused model/route/browser checks and the full quality gate pass; real-model Chinese wording remains manual evidence.

## Scope Boundaries

### In Scope

- Persistent Plan companion presence, passive empty/Google-only guidance, selected-day local Plan activation, overlap/vagueness checks, row-local discussion, explicit title/time update, keep-original, Google read-only conflict context, cancellation, and offline fallback.

### Out of Scope

- Automatic scheduling, new tasks/plans from conversation, reminders, multi-day planning, priorities, dependencies, recurring plans, Google mutation, attendee/location analysis, persisted chat, learned preferences, and new schema.

## Assumptions and Dependencies

- LN-074 Diary Agent remains the visual/session foundation and LN-067 remains the Google Calendar read-only boundary.
- Existing local plans have stable IDs, selected dates, titles, and required start/end times without migration. Untimed local plans remain out of scope until separately admitted.
- “Always visible” applies to the selected-day Plan surface itself; existing modal/tool layering may visually cover the underlying surface while an editor or another workspace is open.
- The dirty working tree contains user-owned unrelated changes that must be preserved.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-004, US1 | Browser state-matrix evidence for persistent/passive empty and Google-only states, plus model tests and screenshots for wake, scan, and local-plan anchoring | LN-074 Plan extension |
| FR-005–FR-008, US2–US3 | Route/model/browser tests for transient chat, explicit updates, invalid proposal rejection, Google read-only behavior | LN-074 safety and reversibility |
| FR-009–FR-011, Edge Cases | Auth/fallback/cancellation, Diary regression, responsive/PWA/full gate | LN-074 returned evidence |
| SC-001–SC-005 | Timed fallback, eight-width geometry, `npm run check`, manual real-model review | LN-074 acceptance evidence |
