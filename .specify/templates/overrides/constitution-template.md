<!--
This project override keeps future Spec Kit constitution amendments aligned with the current global
rules. The generated constitution must retain the project's concrete sources of truth and versioning.
-->

# [PROJECT_NAME] Specification Constitution

## Core Principles

### I. Protect the Core Recording Loop

Every change MUST improve or preserve `quick record -> browse -> search -> edit/delete ->
backup/restore -> offline use`. The home page MUST retain one primary job, and ordinary quick
recording MUST NOT gain a required decision.

### II. Preserve Account-Owned Local-First Operation

Authenticated data MUST write to the isolated local cache before synchronization. Previously
authenticated devices MUST continue core use offline. Account switching MUST NOT expose, upload,
clean up, or reuse another account's records or images. Revision conflicts MUST stop writes rather
than silently overwrite newer data.

### III. Keep Raw Records Intact and Changes Reversible

AI, migrations, imports, and derived features MUST NOT silently rewrite raw note content. Changes to
organization or derived state MUST be explicit, traceable, reversible, and compatible with supported
backup and restore formats.

### IV. Admit Only Evidence-Backed, Removable Features

Every feature MUST state its core-loop contribution, user evidence, default interface cost, offline
and privacy boundary, verification method, removal path, and exit condition. Features that cross a
documented product red line remain isolated or are rejected.

### V. Verification Is Part of the Feature

Tests are mandatory. Implemented behavior MUST have relevant regression coverage and pass the
repository quality gate. Real-account, cross-device, OAuth, deployment, and observation claims MUST
remain pending until verified in the real environment.

### VI. Maintain One Truth for Each Decision

`AGENTS.md` governs operations, `product.md` governs durable product behavior, `ARCHITECTURE.md`
governs the current technical baseline, and `PROJECT_BOARD.md` governs priority, state, dependencies,
acceptance, and evidence. Feature files refine one board item and MUST NOT create a competing backlog
or declare acceptance.

### VII. Keep Shared Contracts Runtime-Neutral and Layered

Shared business contracts MUST use TypeScript and remain free of UI, framework, browser, network,
secret, and runtime-configuration imports. Domain ownership MUST be separated from browser/UI,
storage, network, and Supabase adapters; directory names MUST make responsibility searchable.

### VIII. Prefer Community State Libraries and One Persistence Writer

Client-wide mutable state MUST use a maintained community library selected through an ADR and evidence;
the project MUST NOT create a custom Store. A Store is an in-memory projection and MUST NOT write
persistence directly. Edits, imports, recovery, and synchronization MUST converge on one controlled
persistence boundary.

### IX. Migrate Legacy Entrypoints Toward Deletion

Legacy paths carrying core behavior MUST not receive new references. Migrations MUST record temporary
compatibility reasons, removal conditions, and structural/regression evidence. Old serialized data
compatibility belongs in explicit migration rules, not permanent module aliases.

### X. Core-Chain Changes Require Owner Discussion

Before implementation, changes touching recording, saving, recovery, synchronization, backup, account
isolation, shared contracts, Store boundaries, or persistence MUST record a change contract and owner
discussion status. The contract covers canonical path, reuse, replacement/deletion, state writers,
public contracts, invariants, verification, and unresolved evidence. Later core-chain changes rerun the
same gate.

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

- Preserve account isolation, offline use, revision safety, backup compatibility, and mobile-first
  interaction rules.
- New network, AI, calendar, social, automation, or plugin capabilities MUST document data fields,
  authorization, secrets, limits, logs, fallback, deletion/recomputation, cost, and removal.
- Secrets, tokens, private records, and identifiers MUST NOT enter specs, logs, screenshots, fixtures,
  backups, Service Worker caches, or repository-managed agent files.
- Use the smallest independently testable vertical slice; exclude speculative infrastructure and
  unrelated cleanup unless separately admitted.

## Spec Kit Delivery Workflow

Use `$speckit-specify -> $speckit-clarify (when useful) -> $speckit-plan -> $speckit-checklist (when
useful) -> $speckit-tasks -> $speckit-analyze` for one existing board item. Complete the core-chain
change gate before tasks or implementation when applicable. Research starts as a root-level
`research.md` and may promote to `research/README.md` plus topic files when it outgrows one document;
keep one active research entry point. For a staged feature, label business phases as `P...` and
planning stages as `S...`, add a root `README.md` and `phases/<business-phase>/README.md`, and keep
root `research/` and `checklists/` discoverable. Root `spec.md`, `plan.md`, `quickstart.md`, and
`tasks.md` remain canonical anchors; phase files add detail without duplicating them. Use one writer in
the main checkout. The implementation skill returns evidence; the controller independently verifies it
and updates the board. No commit, push, publish, deploy, delete, reset, history rewrite, OKR
modification, or worktree merge is implied.

## Git and Delivery Rules

- New business requirements MUST use `REQ-YYYYMMDD-NN`; infrastructure or workflow changes MUST use
  `INFRA-YYYYMMDD-NN`. Existing historical identifiers remain unchanged.
- Each commit MUST contain one independently reviewable concern and use
  `type(REQ-YYYYMMDD-NN): observable result` or `type(INFRA-YYYYMMDD-NN): observable result`.
  Allowed types are `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, and `chore`.
- Every commit body MUST contain `原因:`, `变化:`, and `验证:` in that order. `验证:` records only
  commands and results that were actually run; placeholders and planned checks are invalid.
- Commit, push, pull request, merge, publish, and deploy are separate actions. Normal pushes only;
  force push and history rewrites require fresh explicit confirmation.
- Before commit or push, inspect staged/unstaged changes, exact remote and branch, and exclude
  unrelated dirty files.

## Governance

This Constitution applies to all Spec Kit artifacts and implementation work. Amendments require
rationale, compatibility impact, migration/removal planning, and project-owner approval. Version
changes follow semantic versioning: MAJOR for breaking governance changes, MINOR for new principles
or material expansions, and PATCH for clarifications. Project customizations MUST live here or in
`.specify/templates/overrides/` so official CLI upgrades remain reviewable.

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
