<!--
Sync Impact Report
- Version change: 1.4.0 → 1.5.0
- Added principle: XI hierarchical staged feature packages and reader-first review artifacts
- Modified sections: Spec Kit Delivery Workflow; staged package and report organization
- Compatibility: existing board items and feature packages remain valid; generic rules previously
  repeated in feature documents are now governed here; no business behavior changes
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

### VII. Keep Shared Contracts Runtime-Neutral and Layered

Business data contracts shared by browser/client and server MUST be written in TypeScript and remain
runtime-neutral. Domain ownership MUST be separated from runtime adapters: domain contracts and
use-case rules belong under `src/modules/<domain>/`; browser and UI integration belong under
`src/app/` (including client Store integration); storage, network, and Supabase adapters belong under
an explicit infrastructure/runtime boundary. A domain contract MUST NOT import React, Next.js,
Supabase, browser APIs, network clients, secrets, or runtime configuration. A `shared` directory may
contain only code proven to be business-neutral across domains.

### VIII. Prefer Community State Libraries and One Persistence Writer

When client-wide mutable state needs a Store, the project MUST use a maintained community library
selected through an ADR and reproducible evidence. The project MUST NOT create or maintain a custom
Store implementation. A Store is an in-memory projection and lifecycle boundary: it MUST NOT write
localStorage, IndexedDB, Supabase, or other persistence directly. Ordinary edits, imports, recovery,
and future synchronization MUST converge on one controlled persistence boundary; semantic commands
may differ, but a second unreviewed state writer is prohibited.

### IX. Migrate Legacy Entrypoints Toward Deletion

Legacy paths such as `src/lib` when they carry core domain, recovery, or synchronization behavior MUST
not receive new references. Each migration MUST record the callers being moved, any temporary
compatibility reason, a removal condition, and structural/regression evidence. Compatibility for old
serialized data and backups belongs in explicit migration rules; permanent module aliases are not a
default architecture.

### X. Core-Chain Changes Require Owner Discussion

Before implementation, any change touching recording, saving, recovery, synchronization, backup,
account isolation, shared contracts, Store boundaries, or persistence MUST pass a core-chain change
gate. The feature `spec.md` and `plan.md` MUST record the canonical path, reuse points, replacement or
deletion targets, state writers, public contracts, invariants, verification evidence, unresolved
evidence, and discussion status. The product owner MUST discuss and confirm the scope, impact,
invariants, and verification plan before tasks or implementation begin. Every later modification to
the core chain MUST rerun this gate.

### XI. Organize Staged Work for Review and Portability

A feature with multiple independently reviewable stages MUST use one `REQ` package with a root
`README.md` as its reading entry and a `phases/` directory for phase-local summaries and detail. The
package MUST distinguish business delivery phases from planning stages. The feature-level `research/`
and `checklists/` directories remain canonical Spec Kit packages: `research/README.md` indexes the
research evidence, and `checklists/` contains the built-in and phase-specific review gates. Root
`spec.md`, `plan.md`, `quickstart.md`, and `tasks.md` remain the Spec Kit canonical anchors; nested
documents provide detail and MUST link back to those anchors instead of becoming competing sources of
truth. A phase MAY become a new `REQ` only when it has its own board item, acceptance, release or
rollback boundary, and owner decision. Small single-stage features MAY keep the standard flat layout.

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
- `src/modules/<domain>/` expresses business ownership, not a frontend or backend runtime. Runtime
  adapters and client Store integration MUST stay at their explicit boundaries; directory names MUST
  make responsibility searchable and MUST NOT hide multiple unrelated concerns behind an ambiguous
  aggregate such as `structure`.
- New client state dependencies MUST be community-maintained and justified by an ADR or equivalent
  evidence. A dependency decision MUST NOT silently become a second persistence path.

## Spec Kit Delivery Workflow

1. Reconcile `PROJECT_BOARD.md`, the active task, the working tree, and current validation evidence.
2. Create or update one feature package with `$speckit-specify`; its spec MUST reference exactly one
   Log Note board ID. Use `$speckit-clarify` when a material product, privacy, or scope decision is
   unresolved.
3. Update `spec.md` first whenever the approved behavior changes. For a core-chain change, complete
   the Change Contract and owner discussion gate before generating tasks or editing application code.
   Run `$speckit-plan`, then
   `$speckit-checklist` when additional requirements-quality review is useful, then `$speckit-tasks`.
   Treat plans and tasks as derived material, reconcile them with the current spec, and record any
   architecturally significant rationale as an ADR. Run `$speckit-analyze` before implementation and
   resolve every critical inconsistency.
   Research artifacts start as a root-level `research.md`; promote that file to `research/README.md`
   plus topic files only when the research has outgrown one document. Keep one active research entry
   point. For a staged feature, label business delivery phases as `P...` and planning stages as `S...`,
   create the root `README.md` and `phases/<business-phase>/README.md`, and keep the feature root
   `research/` and `checklists/` packages discoverable by Spec Kit. Root standard artifacts remain
   canonical anchors; phase documents contain detail and iteration briefs without duplicating a full
   spec, plan, or task list. Do not create a new `REQ` unless the phase meets Principle XI.
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

### Core-Chain Change Gate

The gate applies to the current feature and to every later modification of the core chain. A plan
cannot enter implementation with any of these fields missing: canonical path; reuse, replacement,
and deletion decisions; state-writer inventory; public contract; invariants; automated and real
environment verification; unresolved evidence; and owner discussion status. A feature may state
that the gate is not applicable, but that decision itself must be explicit and reviewable.

## Git and Delivery Rules

- New business requirements MUST use `REQ-YYYYMMDD-NN`; infrastructure or workflow changes MUST use
  `INFRA-YYYYMMDD-NN`. Existing `LN-###` identifiers remain historical or board mappings and MUST
  not be renamed. New requirement branches use `feature/req-YYYYMMDD-NN-short-description`; new
  infrastructure branches use `feature/infra-YYYYMMDD-NN-short-description`. Existing branch names
  remain unchanged.
- Every commit MUST answer one independently reviewable and reversible concern. The title MUST use
  `type(REQ-YYYYMMDD-NN): observable result` or `type(INFRA-YYYYMMDD-NN): observable result`, with
  `type` chosen from `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, or `chore`. Vague titles such
  as "optimize logic" or "adjust" are not acceptable.
- Every commit MUST include these three sections in this order, each with at least one concrete item:
  `原因:` (why), `变化:` (what behavior or boundary changed), and `验证:` (what was actually run).
  The `验证:` section MUST contain real command results, never planned checks or placeholders.
- Commit, push, pull request, merge, publish, and deploy are separate actions. A commit MUST NOT be
  treated as push authorization. Ordinary pushes MUST use normal fast-forward history; force push is
  prohibited. Rebase, squash, amend, reset-rebuild, cherry-pick replay, and any other history rewrite
  require a fresh explicit confirmation immediately before execution.
- Before committing, the writer MUST inspect staged and unstaged changes and MUST NOT include unrelated
  dirty files. Before pushing, the writer MUST verify the exact remote, branch, commit range, and the
  complete commit-message gate for every commit being sent.

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

**Version**: 1.5.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-09-11
