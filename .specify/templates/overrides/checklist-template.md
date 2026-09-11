# [CHECKLIST TYPE] Checklist: [FEATURE NAME]

**Requirement**: `REQ-YYYYMMDD-NN`
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

## Core-Chain Change Gate *(when applicable)*

- [ ] CHK008 If the feature touches the core chain, `spec.md` names the canonical path, reuse,
  replacement/deletion targets, state writers, public contract, invariants, verification, and
  unresolved evidence
- [ ] CHK009 If the feature touches the core chain, owner discussion and confirmation precede
  `tasks.md` and implementation

## Acceptance and Removal

- [ ] CHK010 Acceptance scenarios include normal, empty, invalid, interrupted, and failure behavior
- [ ] CHK011 Automated regression and genuine real-environment/manual evidence are distinguished
- [ ] CHK012 Removal, rollback, migration, exit conditions, and non-adoption criteria are testable
- [ ] CHK013 Requirements map to the board acceptance criteria without creating a second backlog

## Staged Package and Evidence Organization *(when applicable)*

- [ ] CHK014 A staged package has a root `README.md` and
      `phases/<business-phase>/README.md` with the current conclusion, planning stage, reading route,
      decision queue, and next gate
- [ ] CHK015 Business delivery phases (`P...`) and planning stages (`S...`) are named separately
- [ ] CHK016 The feature-level `research/README.md` indexes all research topics and evidence, with no
      second active research entry point; a small feature may use root `research.md`
- [ ] CHK017 The feature-level `checklists/` directory contains the built-in and applicable phase
      review gates, and each `phases/<business-phase>/README.md` links to its relevant checklist items
- [ ] CHK018 Root `spec.md`, `plan.md`, `quickstart.md`, and `tasks.md` remain canonical anchors;
      nested phase documents do not duplicate or contradict their requirements, plan, or tasks
- [ ] CHK019 A phase is promoted to a new `REQ` only with an independent board item, acceptance,
      release or rollback boundary, and owner decision

## Notes

- Leave an item unchecked until the requirements-quality issue is resolved or explicitly accepted.
- `$speckit-implement` treats unchecked checklists as a gate and MUST NOT modify reviewer markers.
- For staged packages, review `README.md` → phase README → research/checklists → plan before marking
  the package ready for tasks.
