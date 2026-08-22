# [CHECKLIST TYPE] Checklist: [FEATURE NAME]

**Board Item**: `[LN-###]`
**Purpose**: [Requirements-quality dimension being reviewed]
**Created**: [DATE]
**Feature**: [link to spec.md]

> `[x]` means a reviewer found the requirement clear and sufficient. It does not mean the
> implementation or board item is complete.

## User Outcome and Scope

- [ ] CHK001 The improved core-loop behavior and supporting user evidence are explicit
- [ ] CHK002 Each story is independently useful, testable, and bounded against adjacent features
- [ ] CHK003 Default UI exposure and recording-step cost are measurable
- [ ] CHK004 Assumptions, dependencies, exclusions, and unresolved decisions are visible

## Local-First, Account, and Data Safety

- [ ] CHK005 Account ownership, offline behavior, stale revisions, and account switching are covered
- [ ] CHK006 Raw-note integrity, reversibility, backup, restore, export, and old-data behavior are covered
- [ ] CHK007 Every network/privacy boundary names exact data, authorization, secret handling, limits,
  logs, fallback, and deletion or recomputation behavior

## Acceptance and Removal

- [ ] CHK008 Acceptance scenarios include normal, empty, invalid, interrupted, and failure behavior
- [ ] CHK009 Automated regression and genuine real-environment/manual evidence are distinguished
- [ ] CHK010 Removal, rollback, migration, exit conditions, and non-adoption criteria are testable
- [ ] CHK011 Requirements map to the board acceptance criteria without creating a second backlog

## Notes

- Leave an item unchecked until the requirements-quality issue is resolved or explicitly accepted.
- `$speckit-implement` treats unchecked checklists as a gate and MUST NOT modify reviewer markers.
