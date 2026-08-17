# Log Note Project Instructions

## Read order

1. Read `PROJECT_BOARD.md` for task priority, dependencies, acceptance criteria, and current evidence.
2. Read `product.md` before changing product behavior or scope.
3. For visual or interaction work, read `DESIGN.md` and then follow `设计规范/AGENTS.md`.
4. Inspect the existing dirty working tree before editing. Preserve unrelated and user-owned changes.

## Product invariant

Log Note is a quiet, account-owned, offline-capable, mobile-first recording tool. Optimize this loop before adding breadth:

```text
quick record → browse → search → edit/delete → backup/restore → offline use
```

- The home page has one primary job: record something quickly.
- Opening the composer takes at most one action; saving a normal quick note takes at most one further action after typing.
- Templates and advanced structure are optional. They must not add a required decision to quick recording.
- First use requires a real Supabase account. A previously authenticated device must keep recording, browsing, searching, editing, and deleting from that account's isolated local cache when the network is unavailable.
- Each authenticated account owns a separate browser cache and cloud document. Switching accounts must never expose, upload, clean up, or reuse another account's records or images.
- Text records, plans, structure, and settings save locally first and then synchronize automatically through revision-checked writes. A stale revision must pause synchronization instead of overwriting another device.
- Raw notes are never silently rewritten by AI, migrations, or derived features.
- New capabilities default to a secondary surface, off, or isolated. Do not add a home-page control, default modal, or required field without evidence that it improves the core loop.
- Keep common actions within two navigation levels. Dragging must never be the only way to complete an action.
- Complete JSON backup/restore and readable Markdown export remain compatible across changes. Invalid or old input must not overwrite the current payload.

## Feature admission

Before implementation, a feature must state:

1. Which behavior in the core loop it improves.
2. What user evidence or measurable pain supports it.
3. Its default interface cost and effect on recording steps.
4. Its offline, privacy, reversibility, and backup behavior.
5. How it will be tested and how it can be removed or kept isolated.
6. A failure or non-adoption condition that would cause it to remain isolated or be removed.

Reject a mainline feature if it silently changes raw notes, prevents an already authenticated device from working offline, sends data outside the approved account-scoped Supabase boundary, adds a required recording step, breaks backup compatibility, or regresses the existing quality gate. AI, social features, generalized task/calendar management, and plugin platforms require separate product, architecture, and privacy approval.

## Continuous delivery loop

Use this state machine for every board item:

```text
Ready → Assigned → In progress → Returned → Verify → Accepted → Pull next
                           ↘ Waiting / Rework ↗
```

The controller must reconcile `PROJECT_BOARD.md`, the active task, the working tree, and validation evidence at the start of every run and whenever an executor returns.

- `Returned` means an executor reports work; it is not completion.
- `Accepted` requires independent comparison with the board acceptance criteria and recorded evidence.
- After acceptance, update the board and pull the first Ready item in the same control cycle.
- If the Ready queue is non-empty, dependencies are satisfied, no legitimate wait exists, and the write slot is free, the project must not remain idle.
- Test failure, rate limiting, an interrupted turn, or incomplete output is recovery work in the same task, not a reason to create a duplicate task.
- A task may stop only for user choice/approval/credentials, an external observation period, a real permission or write conflict, no Ready work, or completed project acceptance.

## Agent coordination

- Use one writer at a time in the main checkout.
- Multiple read-only agents may explore code, research product evidence, inspect logs, or independently verify a result in parallel.
- Every delegated task must declare its scope, exclusions, write set, acceptance evidence, and return format.
- If two writers would touch the same files or state, serialize them. Truly independent writers require isolated worktrees and an explicit integration order.
- The main controller owns priority, product decisions, integration, and final acceptance. Sub-agent output is evidence, not authority to expand scope or close a task.
- Continue an existing task when its stable scope still applies; do not create duplicate project tasks for retries or small follow-ups.

## Ready and done

A board item is Ready only when its dependency, intended outcome, scope, acceptance criteria, verification method, product guardrail, and decision/permission status are clear. If a durable Codex task identity is required but unavailable, escalate the numbering gap before implementation; temporary read-only sub-agents do not need project task numbers.

A code task is Done only when:

- its board acceptance criteria are met;
- relevant regression coverage exists;
- `npm run check` passes;
- interaction changes also pass `npm run design:check` and mobile review;
- evidence and remaining manual checks are recorded in `PROJECT_BOARD.md`.

Do not commit, push, publish, delete, reset, rewrite history, modify OKRs, or merge the isolated AI worktree without explicit authorization.
