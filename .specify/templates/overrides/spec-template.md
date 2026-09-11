# Feature Specification: [FEATURE NAME]

**Requirement**: `REQ-YYYYMMDD-NN`
**Feature Directory**: `REQ-YYYYMMDD-NN-[feature-name]`
**Created**: [DATE]
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

<!-- Historical packages may add one legacy board mapping; do not add a second primary ID. -->

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## Core-Chain Change Gate *(mandatory when applicable)*

Set **Touches core chain** to `Yes` when the feature changes recording, saving, recovery,
synchronization, backup, account isolation, shared contracts, Store boundaries, or persistence.
When it is `Yes`, complete every field below before generating `tasks.md` or implementing code.

- **Touches core chain**: [Yes / No]
- **Canonical path**: [single business command/use-case and current callers]
- **Reuse**: [existing modules and contracts to extend]
- **Replacement / deletion**: [parallel or legacy paths to migrate, removal conditions]
- **State writers**: [each writer and the one controlled persistence boundary]
- **Public contract**: [types, commands, adapters, and compatibility surface]
- **Invariants**: [offline, account, privacy, raw-data, revision, backup, and recovery rules]
- **Verification**: [focused regression, quality gate, and real/manual evidence]
- **Unresolved evidence**: [unknowns, blocked observations, or `None`]
- **Discussion status**: [Not applicable / Pending owner discussion / Confirmed]

When **Touches core chain** is `Yes`, the feature MUST remain `Pending` until the owner has discussed
and confirmed a core-chain scope, impact, invariant, and verification plan.

<!--
Research artifact convention: start with a root-level research.md for a small feature. Promote it
to research/ only when the research has multiple independently reviewable topics or evidence
sets; move the original content to research/README.md and keep that README as the single index.
Do not create numbered phase directories unless the feature explicitly needs them.
-->

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove the acceptance claim.

### User Story 1 - [Brief Title] (Priority: P1)

[Describe one independently valuable user journey in plain language.]

**Why this priority**: [Explain the user value and why it is the narrowest useful slice.]

**Independent Test**: [Describe how this story can be verified on its own.]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [observable result]
2. **Given** [failure/offline/boundary state], **When** [action], **Then** [safe result]

---

[Add further prioritized user stories only when they remain independently testable.]

### Edge Cases

- [Boundary, empty, invalid, stale, interrupted, or retry condition]
- [Offline, account-switch, privacy, backup, restore, or migration condition]
- [Responsive, keyboard, touch, reduced-motion, or accessibility condition when applicable]

## Product Admission *(mandatory)*

### Core-Loop Contribution

[Name the exact behavior improved in `quick record → browse → search → edit/delete →
backup/restore → offline use`.]

### User Evidence

[Record observed pain, measurable friction, repeated qualitative feedback, or an explicit user
request. Assumption-only ideas must remain isolated.]

### Default Interface and Recording Cost

[State new default controls, surfaces, modals, fields, and the before/after number of recording
actions. Ordinary quick recording must not gain a required decision.]

### Offline, Account, Privacy, Reversibility, and Backup

[State local-first behavior, exact data boundary, account isolation, network fallback, raw-note
protection, undo/removal behavior, and JSON/Markdown/portable-backup compatibility.]

### Verification and Removability

[Name automated regression, real-environment/manual evidence, isolated module boundary, and removal
or rollback path.]

### Exit Condition

[Define the failure, non-adoption, cost, performance, privacy, or maintenance condition that keeps
the capability isolated or removes it.]

### Admission Decision

- **Score**: `[0-20]` using the rubric in `product.md`
- **Decision**: `[mainline candidate / isolated experiment / reject]`
- **Red-line check**: [Confirm none of the Constitution's rejection conditions are triggered]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST [specific testable behavior]
- **FR-002**: The system MUST [specific failure or fallback behavior]
- **FR-003**: The system MUST preserve [relevant existing behavior or data contract]

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.

### Key Entities *(include only when data is involved)*

- **[Entity]**: [Meaning, ownership, lifecycle, and relationships without implementation detail]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [User-observable completion or friction outcome]
- **SC-002**: [Reliability, offline, recovery, privacy, or performance outcome]
- **SC-003**: [Automated and real-user evidence required for acceptance]

## Scope Boundaries *(mandatory)*

### In Scope

- [Smallest behavior and data surface required]

### Out of Scope

- [Adjacent feature, generalized platform, migration, redesign, or cleanup intentionally excluded]

## Assumptions and Dependencies

- [Reasonable assumption]
- [Board dependency, permission, credential, observation period, or external system dependency]

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| [FR/SC/Scenario ID] | [test, screenshot, manual session, export, log] | [acceptance criterion] |
