# About Marketing Requirements Checklist

**Purpose**: Review whether the mature public About requirements are complete, clear, measurable,
and consistent before implementation
**Created**: 2026-09-01
**Feature**: [spec.md](../spec.md)
**Owner**: Product/design reviewer; `[x]` means the requirement wording has been reviewed, not that
the implementation is complete.

## Requirement completeness

- [ ] CHK001 Are first-viewport brand, promise, product-proof, and action requirements all explicitly
  defined? [Completeness, Spec §FR-003]
- [ ] CHK002 Is the full About narrative order specified from hero through final action without
  duplicate section responsibilities? [Completeness, Spec §FR-013]
- [ ] CHK003 Are the exact trust principles and Calendar authority boundaries named rather than
  summarized as generic privacy language? [Completeness, Spec §FR-013–FR-014]
- [ ] CHK004 Are fixed-demo-content and no-live-account-data requirements explicit for every product
  illustration? [Coverage, Spec §Edge Cases]

## Clarity and consistency

- [ ] CHK005 Is “mature promotional page” translated into observable hierarchy, content, and action
  criteria rather than subjective polish alone? [Clarity, Spec §US1, FR-003]
- [ ] CHK006 Are About claims consistent with the local-first, account-owned, offline, backup, and raw
  note contracts in `product.md`? [Consistency, Spec §FR-014]
- [ ] CHK007 Is Calendar consistently described as optional, with existing Google events read-only and
  only Log Note-managed events writable? [Consistency, Spec §FR-014]
- [ ] CHK008 Are unsupported maturity, security, approval, AI, adoption, and certification claims
  explicitly prohibited? [Coverage, Spec §FR-014]

## Acceptance quality and non-functional coverage

- [ ] CHK009 Can a reviewer objectively determine whether the first viewport communicates identity,
  purpose, Calendar relationship, and both actions? [Measurability, Spec §SC-006]
- [ ] CHK010 Are mobile width, body-size, touch-target, focus, reduced-motion, and no-overflow
  requirements quantified for the About composition? [Coverage, Spec §FR-008, Edge Cases]
- [ ] CHK011 Are graceful fallbacks defined when animation or advanced CSS is unavailable?
  [Edge Case, Spec §Edge Cases]
- [ ] CHK012 Are removal, provider isolation, no-tracking, no-new-dependency, and no-core-loop-cost
  boundaries documented consistently across spec and plan? [Consistency, Spec §Product Admission]

## Notes

- Newly generated items intentionally remain unchecked for product/design reviewer ownership.
- `$speckit-implement` may consume this checklist but must not mark reviewer approval.
