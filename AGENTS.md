# Log Note Project Instructions

## Read order

1. Read `PROJECT_CONTEXT.md` for the stable system map, ownership boundaries, interfaces, and iteration path.
2. Read `PROJECT_BOARD.md` for task priority, dependencies, acceptance criteria, and current evidence.
3. Read `product.md` before changing product behavior or scope.
4. Read `ARCHITECTURE.md` before generating code, moving modules, changing routes, or adding AI/Agent integration.
5. If the active board item has a `specs/<feature>/` package, read its `spec.md`, `plan.md`,
   `tasks.md`, and relevant supporting artifacts before implementation or verification.
6. For visual or interaction work, read `DESIGN.md` and then follow `docs/设计规范/AGENTS.md`.
7. Inspect the existing dirty working tree before editing. Preserve unrelated and user-owned changes.

## AI-ready context and generation contract

- `ARCHITECTURE.md#ai-ready-架构目标` is the canonical technical boundary for developer Agents and
  product runtime Agents. Feature specs may narrow that contract, but must not silently weaken it.
- Before editing, a developer Agent must reconcile the board item, product invariants, architecture,
  active spec, current code, tests, and dirty tree. It must state the intended outcome, write set,
  exclusions, public contracts, invariants, verification, and unresolved evidence.
- Generated code must follow Next.js App Router conventions first, use the narrowest stable public
  module entry, preserve one-way dependencies, and extend the canonical implementation instead of
  creating a parallel route, store, model, or persistence path.
- Runtime AI output is an untrusted proposal, never an instruction to mutate data. Validate it with a
  strict versioned schema, bind it to the current account/target/request/fingerprint, preview it,
  require explicit confirmation, re-check staleness, apply one atomic `commitData`, and verify the
  result through the existing local-first and revision-checked persistence path.
- Agent-generated work is only `Returned` until focused regressions and the repository quality gate
  pass. Missing credentials, production observations, or owner decisions remain explicit open
  evidence; an Agent may not infer them or mark the board item `Accepted`.

## Mastra Studio

Mastra Studio is an optional local developer surface, not part of the Log Note product runtime or
its acceptance evidence. From the repository root, run `nvm use && npm run studio`, then open
`http://localhost:4111`. Stop the process when the inspection session is finished; generated
`.mastra/` files remain local and ignored.

Use Studio only when an active implementation or debugging task needs to:

- manually exercise a deliberately registered Agent, Workflow, or tool with synthetic data;
- inspect local execution traces and failures while diagnosing the Mastra adapter;
- compare bounded prompt or model behavior before encoding the result in focused regressions; or
- verify Studio registration and bundling during a Mastra upgrade.

The current `src/mastra/index.ts` registers the bounded LN-079 current-domain daily-summary and LN-081
Calendar/diary-review debugging primitives. They accept operator-supplied synthetic input and reuse the
production schemas, normalizers, and tool-free/memory-free Workflow factories. LN-081's explicit
approve/reject step may suspend and resume only this local development workflow. Production AI
capabilities remain request-scoped through `src/mastra/index.mjs`; do not register additional persistent
Studio primitives merely for visibility.

Any additional Studio-visible primitive must belong to an explicit board item or bounded debugging task,
reuse the canonical project factory, schema, and normalizer, and keep tools, memory, persistence,
snapshots, account data, private notes, and direct writes disabled unless separately approved. Keep
Studio bound to localhost; do not expose it as an unauthenticated shared or production service.

Studio success never replaces Route Handler authentication, strict schema validation, preview and
confirmation, `commitData` read-back, focused regressions, the repository quality gate, real Provider
evidence, or deployment verification. Normal product use, routine UI QA, and production monitoring do
not require Studio.

## Spec Kit workflow

Spec Kit 0.16.5 is installed for this repository. Use the project-scoped Codex skills for every
new feature or materially changed behavior:

```text
$speckit-specify → $speckit-clarify (when needed) → $speckit-plan
→ $speckit-checklist (when useful) → $speckit-tasks → $speckit-analyze
→ implementation and independent acceptance
```

- Run `$speckit-specify` for exactly one existing `PROJECT_BOARD.md` item and record its `LN-###`
  ID in the generated spec. Do not use Spec Kit to create a competing backlog.
- Treat `.specify/memory/constitution.md` and `.specify/templates/overrides/` as the Spec Kit
  integration layer. `AGENTS.md`, `product.md`, `ARCHITECTURE.md`, and `PROJECT_BOARD.md` remain the
  higher-level operational, product, technical, and status sources described in the Constitution.
- `$speckit-implement` is not permission to commit, push, publish, deploy, delete, reset, rewrite
  history, modify OKRs, or merge worktrees. It must preserve unrelated dirty changes and return
  evidence for the controller to verify.
- Tests are mandatory even though upstream Spec Kit's generic task template treats them as optional.
  A feature is not returned until the relevant regression and the repository quality gate pass.
- Keep `.specify/` and `.agents/skills/` versioned. Do not add `.agents/` to `.gitignore`; this repo
  intentionally checks in the skills that define the shared workflow. Never place credentials or
  private records in them.

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
