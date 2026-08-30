# UX Requirements Checklist: Book-page Ritual

**Board Item**: `LN-076`
**Purpose**: Review whether the visual hierarchy, recording ritual, accessibility, and responsive requirements are sufficiently clear before implementation
**Created**: 2026-08-28
**Feature**: [spec.md](../spec.md)

> `[x]` means a reviewer found the requirement clear and sufficient. It does not mean the
> implementation or board item is complete.

## User Outcome and Scope

- [ ] CHK001 Is the requested “premium vintage-book character” translated into explicit material and hierarchy qualities without relying only on subjective adjectives? [Clarity, Spec §FR-001, §SC-001]
- [ ] CHK002 Are the home, populated timeline, fixed-record ledger, binding gutter, and ordinary composer explicitly included while adjacent tool internals and data behavior are excluded? [Completeness, Spec §Scope Boundaries]
- [ ] CHK003 Are the unchanged one-action composer opening and one-action saving costs stated as measurable requirements? [Measurability, Spec §FR-006, §SC-002]
- [ ] CHK004 Does the specification clearly forbid new default controls, required choices, filler content, card walls, and decorative motion? [Consistency, Spec §Default Interface and Recording Cost, §Out of Scope]

## Visual Hierarchy and Material

- [ ] CHK005 Is authored note primacy defined consistently across home, timeline, Agent adjacency, and fixed-record content? [Consistency, Spec §FR-002, §User Story 2]
- [ ] CHK006 Is the requirement for an “owned” first content gap measurable enough to distinguish deliberate section rhythm from the baseline's accidental blank band? [Measurability, Spec §FR-003, §SC-001]
- [ ] CHK007 Are paper, ink, typography, date identity, separators, binding edge, and record actions required to form one system rather than separate decorative treatments? [Completeness, Spec §FR-001]
- [ ] CHK008 Is the prohibition against routine cards, thick repeated borders, and ornamental skeuomorphism consistent with the continuous-paper requirement? [Consistency, Spec §FR-004, §Assumptions]
- [ ] CHK009 Are the composer's material continuity and the continued dominance of the writing area both specified without weakening close, Done, and optional-detail recognition? [Clarity, Spec §FR-005, §User Story 3]

## Interaction and Accessibility

- [ ] CHK010 Are 44px targets, visible focus, keyboard operation, and reduced-motion behavior specified for every affected interaction family? [Coverage, Spec §FR-007]
- [ ] CHK011 Are the preserved meanings and transitions of Search, Calendar, Settings, Diary/Plan, Agent, export, fixed-record adjustment, and ordinary record actions explicit? [Completeness, Spec §FR-009]
- [ ] CHK012 Are long bilingual dates, notes, tags, fixed placeholders, and empty-day states covered as responsive edge cases? [Coverage, Spec §Edge Cases, §FR-008]
- [ ] CHK013 Is the distinction between state-explaining motion and forbidden decorative motion clear enough to review consistently? [Clarity, Spec §Out of Scope, Plan §UI and Interaction Contract]

## Offline, Acceptance, and Removal

- [ ] CHK014 Are local-asset, offline, account-isolation, raw-note, export, and backup invariants all explicit for a presentation-only change? [Completeness, Spec §Offline, Account, Privacy, Reversibility, and Backup, §FR-010]
- [ ] CHK015 Are geometric automation and subjective owner comparison clearly separated so neither is used to make claims it cannot prove? [Acceptance Criteria, Spec §SC-001–SC-005]
- [ ] CHK016 Are the responsive widths, zero-overflow threshold, zero-collision threshold, target size, and quality-gate outcomes objectively measurable? [Measurability, Spec §SC-003–SC-004]
- [ ] CHK017 Are rollback, 14-day observation, and rework/removal triggers documented without requiring data migration? [Completeness, Spec §Exit Condition, §Verification and Removability]

## Notes

- Focus: visual hierarchy/material and interaction/accessibility requirements at standard depth.
- Actor/timing: product-owner and implementation reviewer before visual acceptance.
- Leave an item unchecked until the requirements-quality issue is resolved or explicitly accepted.
- `$speckit-implement` treats unchecked checklists as a gate and MUST NOT modify reviewer markers.
