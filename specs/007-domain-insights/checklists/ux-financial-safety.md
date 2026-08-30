# UX and Financial-Safety Checklist: Local Domain Insights

**Board Item**: `LN-010 Phase 1`
**Purpose**: Reviewer requirements-quality gate for contextual navigation, local-first analysis, accessibility, and the investment-review boundary
**Created**: 2026-08-30
**Feature**: [spec.md](../spec.md)

> `[x]` means a reviewer found the requirement clear and sufficient. It does not mean the
> implementation or board item is complete.

## User Outcome and Scope

- [x] CHK001 Is the distinction between a current-domain review and a general cross-domain dashboard explicit throughout the requirements? [Clarity, Spec §User Story 1, FR-001–FR-003]
- [x] CHK002 Are the mobile and desktop entry requirements both specified without changing the quick-record action count or the established upper-rail control order? [Completeness, Spec §Product Admission, FR-001–FR-002]
- [x] CHK003 Is the fixed 30-calendar-day window defined precisely enough to resolve local-day boundaries and inclusive endpoints? [Clarity, Spec §FR-004]
- [x] CHK004 Are the initial-version exclusions—market data, portfolio performance, free-form AI, persisted insights, and generalized coaching—documented consistently? [Consistency, Spec §Out of Scope, FR-010, FR-013]

## Navigation and Visual Hierarchy

- [x] CHK005 Are the separate meanings and hit areas of the existing domain mark and adjacent analysis action unambiguous? [Clarity, Spec §FR-001; UI Contract §Home-page entry]
- [x] CHK006 Are requirements defined for the analysis action moving when the current scroll-spy domain changes, including its accessible name? [Completeness, Spec §FR-001, FR-015]
- [x] CHK007 Is the visual relationship between the analysis action, binding axis, upper rail, and lower download action bounded with measurable non-overlap criteria? [Measurability, UI Contract §Home-page entry]
- [x] CHK008 Are page hierarchy and content-density requirements specific enough to distinguish an archival field report from a generic card dashboard? [Clarity, Plan §Visual Thesis; UI Contract §Insights route]
- [x] CHK009 Are selected-domain and trend-direction requirements defined beyond color alone for every responsive size? [Coverage, Spec §FR-016, SC-006]

## Analytics Meaning and Evidence

- [x] CHK010 Are qualifying-record, active-day, ordinary-record, periodic-record, and unresolved-record definitions mutually exclusive and reconcilable? [Consistency, Spec §FR-005–FR-007; Data Model §DomainReview]
- [x] CHK011 Is the insufficient-evidence threshold quantified and consistently applied to both labels and the prohibition on trend claims? [Clarity, Spec §FR-008, SC-003]
- [x] CHK012 Does every qualitative observation requirement name the supporting metric or bounded source set without implying that excerpts replace source records? [Completeness, Spec §FR-009; Data Model §SourceReference]
- [x] CHK013 Are invalid dates, removed categories/domains, and unresolved provenance addressed without coercion, silent discard, or cross-domain attribution? [Coverage, Spec §Edge Cases, FR-007, FR-014]
- [x] CHK014 Are zero-activity and sparse-activity requirements phrased neutrally enough to avoid unsupported negative judgments about the author? [Clarity, UI Contract §States]

## Investment-Review Safety

- [x] CHK015 Is the rule for identifying an investment-like domain narrow, deterministic, and localizable rather than inferred from arbitrary note content? [Clarity, Spec §FR-010; Data Model §InvestmentCoverage]
- [x] CHK016 Are rationale, outcome, and risk-boundary coverage defined explicitly as keyword-based recording evidence rather than financial truth or quality scores? [Clarity, Data Model §InvestmentCoverage]
- [x] CHK017 Is the prohibited-output boundary exhaustive across transaction action, security choice, price, timing, allocation, projected return, and personalized risk tolerance? [Completeness, Spec §FR-010–FR-011; UI Contract §Investment-like domain boundary]
- [x] CHK018 Is the visible non-advice statement required in every investment-review state, including empty and insufficient evidence? [Coverage, Spec §FR-011, SC-004]
- [x] CHK019 Are fixed reflection prompts required to cite an observable coverage gap or source set and remain removable without changing raw records? [Consistency, Spec §FR-009–FR-013, SC-004]
- [x] CHK020 Are conditions that would keep the feature isolated or remove it defined when users interpret prompts as advice or find them misleading? [Acceptance Criteria, Spec §Exit Condition, SC-008]

## Local-First, Account, and Data Safety

- [x] CHK021 Are the exact source fields read and the prohibited destinations—network, logs, storage, sync, export, and backup—specified? [Completeness, Plan §Trust Boundary; Data Model §Existing fields read]
- [x] CHK022 Are account hydration, account replacement, recovery mode, and stale-result disposal requirements defined so one account's result cannot appear for another? [Coverage, Spec §FR-012–FR-014; UI Contract §States]
- [x] CHK023 Is direct offline route reload distinguished from merely revisiting an already open client-side page? [Clarity, Spec §SC-005; UI Contract §Offline contract]
- [x] CHK024 Are raw-note immutability and computed-result recomputation/rollback requirements objectively testable without a migration? [Measurability, Spec §FR-013–FR-014; Plan §Rollback and Isolation]

## Accessibility, Performance, and Acceptance

- [x] CHK025 Are keyboard, visible-focus, localized-name, 44 px target, Canvas alternative, and reduced-motion requirements defined for all controls and information graphics? [Completeness, Spec §FR-015–FR-016; UI Contract §Responsive and accessibility acceptance]
- [x] CHK026 Are 320/390/426/768/1280 px layout requirements paired with objective overflow, reachability, and readability criteria? [Measurability, Spec §SC-006]
- [x] CHK027 Is the one-second performance criterion tied to a defined 5,000-record fixture, supported environment, and initial local review boundary? [Clarity, Spec §SC-007]
- [x] CHK028 Are automated evidence, visual/mobile review, offline verification, and the pending 14-day real-use criterion kept distinct? [Consistency, Spec §Evidence Mapping, SC-008]
- [x] CHK029 Does the rollback requirement enumerate every added surface and make clear that no stored-data cleanup is needed? [Completeness, Plan §Rollback and Isolation]
- [x] CHK030 Do all requirements map back to `LN-010 Phase 1` without prematurely claiming the later persisted experiment loop? [Traceability, Spec §Evidence Mapping, Spec §Assumptions and Dependencies]

## Notes

- Leave an item unchecked until a reviewer has assessed the requirements wording.
- `$speckit-implement` reads checklist state but does not modify reviewer markers.
- This checklist reviews the specification; implementation evidence belongs in the feature tasks and board.
