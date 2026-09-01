# AI Safety and Compact Mobile UX Checklist: Hero-Triggered Composer Content Improvement

**Board Item**: `LN-078`
**Purpose**: Requirements-quality review for one-shot AI safety and compact mobile interaction
**Created**: 2026-09-01
**Feature**: [spec.md](../spec.md)

> `[x]` means a reviewer found the requirement clear and sufficient. It does not mean the
> implementation or board item is complete.

## User Outcome and Scope

- [x] CHK001 The exact edit behavior and direct owner evidence are explicit
- [x] CHK002 Each story is independently testable and bounded against chat, templates, and structure
- [x] CHK003 Hero exposure, no-dialog layout, target sizes, and unchanged save steps are measurable
- [x] CHK004 Assumptions, Node/runtime dependency, dirty-tree exclusions, and manual evidence are visible

## Local-First, Account, and Data Safety

- [x] CHK005 Account token handling, account-generation staleness, offline writing, and CAS safety are covered
- [x] CHK006 Raw-note two-confirmation boundary, cancel/removal, backup/export, and no migration are covered
- [x] CHK007 The six request fields, forbidden fields, auth, secrets, rate/body/time/response bounds,
      logs, strict output, and zero-write failure are explicit
- [x] CHK008 Stale, out-of-order, empty, identical, invalid, interrupted, and retry behavior are testable

## Compact Interaction and Accessibility

- [x] CHK009 Hero-only activation, one writing area, no chat/panel, and one compact action group are explicit
- [x] CHK010 320/390/426/1280px, 44px targets, focus, screen-reader labels, Escape, and reduced motion are covered
- [x] CHK011 Candidate read-only state and blocking of ambiguous save/format/details actions are explicit

## Acceptance and Removal

- [x] CHK012 Automated evidence and real Provider/latency/14-day evidence are distinguished
- [x] CHK013 Removal needs no migration and the exit criteria are measurable
- [x] CHK014 Requirements map directly to `LN-078` without creating another backlog or acceptance source

## Notes

- The old rule that composer surfaces hide the application-shell Agent is preserved for the traveler;
  the explicit owner decision adds one composer-local Hero and prevents a double mount.
- “Use improved draft” is not “save”; persistence still requires the existing `Done`.
