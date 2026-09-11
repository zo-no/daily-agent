# Requirements Quality Checklist: personal OKR period alignment review

**Requirement**: `REQ-20260906-03`
**Purpose**: Validate specification completeness and quality before implementation planning
**Feature**: [spec.md](../spec.md)

> `[x]` means the requirement is clear in the design artifact. It does not mean implementation or
> acceptance is complete.

## User outcome and scope

- [x] CHK001 The core-loop behavior, personal user, and supporting evidence are explicit.
- [x] CHK002 Stories are independently testable and bounded against enterprise OKR, task management,
      and quick-record behavior.
- [x] CHK003 Default interface cost is one optional Goal-detail action; ordinary capture cost is stated.
- [x] CHK004 Assumptions, exclusions, dependencies, and open owner decisions are visible.

## Local-first, account, and data safety

- [x] CHK005 Account ownership, offline behavior, stale snapshots, and account switching are covered.
- [x] CHK006 Raw-note integrity, reversibility, backup, restore, export, and old-data behavior are covered.
- [x] CHK007 Network data, authorization, limits, secrets, logging, fallback, and result disposal are named.

## Acceptance and removal

- [x] CHK008 Normal, empty, invalid, interrupted, over-limit, and provider-failure scenarios are testable.
- [x] CHK009 Automated checks and real-provider/manual/14-day evidence are distinguished.
- [x] CHK010 Removal, rollback, migration, and non-adoption conditions are testable.
- [ ] CHK011 Requirements map one-to-one to an admitted `PROJECT_BOARD.md` item.

## Current revision checks

- [x] CHK012 OKR is defined as goal semantics plus a period-scoped evidence review, not a complete enterprise process.
- [x] CHK013 Work and life share one personal Goal list; terminology remains secondary to behavior.
- [x] CHK014 The period snapshot automatically includes local plans and records; no manual source picker is required.
- [x] CHK015 One primary action, visible disclosure, cited output, strict schema, stale binding and zero-write paths are explicit.
- [x] CHK016 The five outcome states distinguish toward, action-only, drift, blocked and insufficient evidence.
- [x] CHK017 Plan activity, record evidence and outcome direction are explicitly separated.
- [x] CHK018 Existing 100/200/360 request bounds, 366-day safety limit, and over-limit behavior are explicit.

## Notes

- CHK011 remains unchecked because the human-owned board has not yet admitted this requirement.
- This package is a design candidate. No checkbox authorizes implementation, commit, deployment, or
  modification of Goals/OKRs.
