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

Before editing, run `git status --short`, identify user-owned or unrelated changes, and do not
overwrite, reset, stash, or clean them. Report any overlap with the intended write set before
proceeding.

## AI-ready context and generation contract

- `ARCHITECTURE.md#ai-ready-架构目标` is the canonical technical boundary for developer Agents and
  product runtime Agents. Feature specs may narrow that contract, but must not silently weaken it.
- Before editing, a developer Agent must reconcile the board item, product invariants, architecture,
  active spec, current code, tests, and dirty tree. It must state the intended outcome, write set,
  exclusions, public contracts, invariants, verification, and unresolved evidence.
- Generated code must follow Next.js App Router conventions first, use the narrowest stable public
  module entry, preserve one-way dependencies, and extend the canonical implementation instead of
  creating a parallel route, store, model, or persistence path.
- Visual and interaction work must treat existing alignment axes as public design contracts. Before
  implementation, name the page edge, reading/content axis, and any value/action axis being reused;
  do not introduce a new inset or compensation unless a real semantic level requires it and the
  active spec records that exception. Elements in the same reading flow and column must reuse those
  axes. Verify them at every affected mobile and desktop breakpoint.
- Runtime AI output is an untrusted proposal, never an instruction to mutate data. Validate it with a
  strict versioned schema, bind it to the current account/target/request/fingerprint, preview it,
  require explicit confirmation, re-check staleness, apply one atomic `commitData`, and verify the
  result through the existing local-first and revision-checked persistence path.
- Agent-generated work is only `Returned` until focused regressions and the repository quality gate
  pass. Missing credentials, production observations, or owner decisions remain explicit open
  evidence; an Agent may not infer them or mark the board item `Accepted`.

## Coding standards

Before writing or reviewing code, read `/Users/kual/Desktop/memory/coding规范/index.md` and follow
the matching formal specification routed by that index. The `调研/` directory under that source is
background material, not normative project rules. Prefer the smallest change that satisfies the
active task, and search for the existing canonical implementation before adding a route, component,
schema, store, adapter, or persistence path.

## Text and document generation

For generated documents, requirements, explanations, prompts, reports, or other formal text, run
sigo review before delivery. Check completeness, accuracy, format and constraints, omissions, and
executability. If sigo is unavailable, state that limitation and perform the same checks manually;
do not claim that sigo was run when it was not available.

## Governance files and edit boundaries

The following are human-owned governance sources:

`AGENTS.md`, `PROJECT_CONTEXT.md`, `PROJECT_BOARD.md`, `product.md`, and `ARCHITECTURE.md`.

An Agent may read them and propose changes, but must not modify them unless the user explicitly
identifies the file and authorizes the change. Feature specs, ADRs, design rules, migrations,
deployment configuration, and CI configuration may be modified only when the active task includes
them in its write set. Source code, tests, scripts, and public assets remain subject to the active
Change Contract and must not be edited outside that write set.

Agents may record implementation or documentation friction in `Reflect/`. `Reflect/` is feedback
only: it is not a source of truth, task, requirement, or implementation instruction. Agents must
not use it as normative input or automatically convert it into code or policy changes.

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

## Product and delivery constraints

`product.md` is the product-behavior source of truth and `PROJECT_CONTEXT.md` is the concise
summary of the core loop and invariants. Before changing behavior, read those sources instead of
copying their rules into this file.

The Agent must preserve the documented quick-record, account-isolation, offline, local-first
revision/CAS, raw-note, backup-compatibility, and AI preview/confirmation boundaries. Any proposed
exception must be recorded in the active board item or feature spec before implementation.

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
- After acceptance, the project controller updates the board and pulls the first Ready item in the
  same control cycle.
- If the Ready queue is non-empty, dependencies are satisfied, no legitimate wait exists, and the
  write slot is free, the project controller should not leave the queue idle.
- Test failure, rate limiting, an interrupted turn, or incomplete output is recovery work in the same task, not a reason to create a duplicate task.
- A task may stop only for user choice/approval/credentials, an external observation period, a real permission or write conflict, no Ready work, or completed project acceptance.

When verification fails, report the exact command, the first relevant failure, whether it is caused
by the current write set or pre-existing dirty work, and what remains unverified. Do not claim
completion from partial results.

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
