# Minimal UI Requirements Checklist: Domain Trends and One-Glance Review

**Board Item**: `[LN-010 Phase 1]`
**Purpose**: Reviewer requirements-quality gate for the product-owner-selected concise review surface
**Created**: 2026-08-30
**Feature**: [spec.md](../spec.md)

> `[x]` means a reviewer found the requirement clear and sufficient. It does not mean the
> implementation or board item is complete.

## Information Hierarchy

- [x] CHK001 Are the selected-domain context, compact selector count, and 30-day window named unambiguously as the first reading layer without a permanent metric band? [Clarity, Spec §User Story 2, FR-004–FR-006]
- [x] CHK002 Is the prohibition on a visible record index, source excerpt, and generic reflection block explicit without removing the internal data-safety contract? [Consistency, Spec §FR-005, FR-009, FR-013]
- [x] CHK003 Is the ordinary/periodic split explicitly deferred to selected-day detail, while the evidence state stays visible and subordinate to the line? [Hierarchy, Spec §FR-005–FR-008; UI Contract §Required information]
- [x] CHK004 Is the maximum visible explanatory copy bounded enough to make “one-glance” objectively reviewable? [Ambiguity, Spec §SC-006; UI Contract §Required information]

## Line, Interaction, and Responsive Meaning

- [x] CHK005 Are straight-line geometry and visible date-label requirements complete for empty, one-active-day, and multi-active-day series without requiring a redundant caption? [Coverage, Spec §Edge Cases; UI Contract §States]
- [x] CHK006 Is the complete non-visual alternative specified separately from the deliberately minimal visible rhythm? [Clarity, Spec §FR-016; UI Contract §Responsive and accessibility acceptance]
- [x] CHK007 Are long Chinese/English domain labels and 320px domain-selector wrapping defined without weakening 44px targets? [Coverage, Spec §FR-015–FR-016]
- [x] CHK008 Are pointer, touch, single-focus keyboard commands, live-region detail, and close behavior specified consistently across desktop and mobile? [Completeness, Spec §FR-015; UI Contract §Chart interaction]

## Safety and Exceptional States

- [x] CHK009 Is the fixed non-advice boundary explicitly retained while visible investment coverage, the recording prompt, source links, and excerpts are removed from the compact surface? [Consistency, Spec §FR-010–FR-011]
- [x] CHK010 Are empty investment, recovery-protected investment, and insufficient investment states required to avoid crashes and keep the boundary visible? [Coverage, Spec §FR-011, FR-014]
- [x] CHK011 Is unresolved-record copy allowed only when applicable and kept visually subordinate to the one-glance summary? [Clarity, Spec §FR-007; UI Contract §States]
- [x] CHK012 Are source payload immutability, account replacement, direct offline reload, and zero analysis-network behavior still fully specified after removal of visible sources? [Consistency, Spec §FR-012–FR-014, SC-005]

## Notes

- Leave an item unchecked until a reviewer has assessed the requirements wording.
- `$speckit-implement` reads checklist state but does not modify reviewer markers.
- This checklist reviews requirement quality only; implementation evidence belongs in `tasks.md`, `design-qa.md`, and `PROJECT_BOARD.md`.
- Validation iteration 1: 12/12 requirements-quality checks passed after the selected-day detail,
  compact-copy bound, responsive selector, and local-only safety boundaries were made explicit.
