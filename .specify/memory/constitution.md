<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principles: VI now names ARCHITECTURE.md and MADR as technical truth sources and adopts
  Spec Kit Living Spec semantics
- Modified sections: Spec Kit Delivery Workflow; Governance precedence
- Compatibility: existing board items and feature packages remain valid; no business behavior changes
- Follow-up TODOs: none
-->

# Log Note Specification Constitution

## Core Principles

### I. Protect the Core Recording Loop

Every change MUST improve or preserve `quick record → browse → search → edit/delete →
backup/restore → offline use`. The home page MUST retain one primary job: recording something
quickly. Opening the ordinary composer MUST take at most one action, and saving after typing MUST
take at most one further action. Templates, AI, planning, integrations, and advanced structure MUST
remain optional and MUST NOT add a required recording decision.

### II. Preserve Account-Owned Local-First Operation

All text, plans, structure, and settings MUST write to the authenticated account's isolated local
cache before network synchronization. A previously authenticated device MUST remain able to record,
browse, search, edit, and delete offline. Account switching MUST NOT expose, upload, clean up, or
reuse another account's records or images. Revision conflicts MUST pause synchronization instead of
silently overwriting newer data.

### III. Keep Raw Records Intact and Changes Reversible

Raw note content MUST NOT be silently rewritten by AI, migrations, imports, or derived features.
Any capability that changes organization or derived state MUST be explicit, traceable, and
reversible. Complete JSON backup/restore, portable attachment backup, and readable Markdown export
MUST remain compatible. Invalid or older input MUST NOT overwrite the current payload.

### IV. Admit Only Evidence-Backed, Removable Features

Before implementation, every feature specification MUST identify the core-loop behavior it
improves, supporting user evidence, default interface and recording-step cost, offline/account fit,
privacy and recovery behavior, verification method, removal path, and failure or non-adoption exit
condition. A mainline feature MUST be rejected if it silently changes raw notes, prevents cached
offline use, crosses an unapproved data boundary, adds a required recording step, breaks backup
compatibility, or regresses the quality gate.

### V. Verification Is Part of the Feature

Tests are mandatory, not optional. Every implementation MUST include relevant regression coverage
and MUST pass `npm run check`. Interaction changes MUST also pass `npm run design:check`, responsive
mobile review, accessibility checks, and visual evidence appropriate to the acceptance criteria.
External-account, cross-device, OAuth, deployment, or observation-period claims MUST remain pending
until verified in the real environment; automation MUST NOT fabricate that evidence.

### VI. Maintain One Truth for Each Decision

`AGENTS.md` is the operational rule source, `product.md` is the durable product-behavior source,
`ARCHITECTURE.md` is the current technical-baseline source, and accepted records under
`docs/decisions/` preserve the rationale for architecturally significant choices.
`PROJECT_BOARD.md` is the only source for priority, task state, dependencies, acceptance, and
validation evidence. Feature artifacts under `specs/` refine one board item and MUST use Living Spec
semantics: `spec.md` is the current change contract, while `plan.md` and `tasks.md` are derived
execution material that MUST be reconciled after the contract changes. Important implementation
rationale MUST move to an ADR instead of surviving only in a disposable plan. Feature artifacts MUST
NOT create a competing backlog or declare a board item accepted; `tasks.md` completion is
implementation evidence only.

## Product and Data Constraints

- The supported application is a Next.js 15 and React 19 mobile-first PWA with a real Supabase
  account boundary, account-scoped caches, revision-checked text synchronization, and local image
  storage.
- Common actions MUST remain within two navigation levels. Dragging MUST NOT be the only way to
  complete an action. Mobile touch targets and text sizing MUST follow `DESIGN.md` and
  `docs/设计规范/AGENTS.md`.
- New network, AI, calendar, social, automation, or plugin capabilities MUST document the exact data
  leaving the browser, authorization, key handling, offline fallback, deletion/recomputation,
  operating cost, and removal boundary.
- Secrets, access tokens, private records, and user identifiers MUST NOT enter specifications,
  logs, screenshots, fixtures, backups, Service Worker caches, or repository-managed agent files.
- Scope MUST use the smallest independently testable vertical slice. Speculative infrastructure and
  unrelated cleanup MUST be excluded unless separately admitted and tracked.

## Spec Kit Delivery Workflow

1. Reconcile `PROJECT_BOARD.md`, the active task, the working tree, and current validation evidence.
2. Create or update one feature package with `$speckit-specify`; its spec MUST reference exactly one
   Log Note board ID. Use `$speckit-clarify` when a material product, privacy, or scope decision is
   unresolved.
3. Update `spec.md` first whenever the approved behavior changes. Run `$speckit-plan`, then
   `$speckit-checklist` when additional requirements-quality review is useful, then `$speckit-tasks`.
   Treat plans and tasks as derived material, reconcile them with the current spec, and record any
   architecturally significant rationale as an ADR. Run `$speckit-analyze` before implementation and
   resolve every critical inconsistency.
4. Implementation may start only when the corresponding board item is Ready or Assigned, all
   dependencies and permissions are satisfied, and the main-checkout write slot is free.
5. Use one writer in the main checkout. Parallel markers describe dependency independence, not
   permission for overlapping writers. Independent writers require isolated worktrees and an
   explicit integration order.
6. `$speckit-implement` MUST follow the declared write set, preserve unrelated dirty changes, run
   the specified checks, and return evidence. It MUST NOT commit, push, publish, deploy, delete,
   reset, rewrite history, modify OKRs, or merge worktrees without explicit user authorization.
7. Returned implementation is independently compared with the spec, plan, tasks, Constitution, and
   board acceptance criteria. Only the controller may update the board item to Accepted.

## Governance

This Constitution governs all Spec Kit artifacts and implementation work in Log Note. When wording
conflicts, the precedence is: explicit user instruction, repository `AGENTS.md`, this Constitution,
`product.md`, the active board item, `ARCHITECTURE.md`, the active feature `spec.md`, then derived
feature-local artifacts. Accepted ADRs explain architecture decisions but do not override the current
technical baseline; changing a decision requires superseding its ADR and updating the baseline.
Product truth and board status remain in their canonical files even when repeated for traceability.

Amendments require a documented rationale, compatibility impact, migration or removal plan when
applicable, and explicit project-owner approval. Version changes follow semantic versioning:
breaking governance changes increment MAJOR, new principles or material expansions increment MINOR,
and clarifications increment PATCH. Every feature plan and independent acceptance review MUST check
Constitution compliance. Official Spec Kit managed files may be upgraded through the CLI; Log Note
customizations MUST live in project overrides or the Constitution so upgrades remain reviewable.

**Version**: 1.1.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-09-01
