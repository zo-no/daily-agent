# Research: Agent 计划与记录编写闭环

**Requirement**: `REQ-20260905-02` | **Date**: 2026-09-05

## Decision 1: Reuse the existing plan and record entities

`planBlocks` already models future time blocks with start/end times, while `entries` already models
dated facts with a time point, raw content, and category. Reusing them keeps backup, search, rendering,
and offline behavior compatible.

## Decision 2: Keep record intervals out of the first authoring release

Adding `endTime` would affect normalization, sorting, editors, Markdown, JSON backups, and old-data
migrations. The first release therefore keeps `entries.date/time`; a confirmed interval need becomes a
separate schema decision with explicit export and migration rules.

## Decision 3: Proposal-first single-target authoring

One target per proposal makes the before/after review, fingerprint, revision check, idempotency, and
zero-write failure behavior testable. Batch authoring is excluded until evidence justifies a separate
confirmation and rollback design.

## Open evidence

- LN-084 real-client acceptance and the exact client discovery path.
- Whether sustained use proves a record interval is needed after the point-time authoring flow ships.
- Real account A/B and offline browser lifecycle evidence.
