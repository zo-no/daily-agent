# [PROJECT_NAME] Specification Constitution

## Core Principles

### I. Protect the Core Recording Loop

Every change MUST improve or preserve `quick record → browse → search → edit/delete →
backup/restore → offline use`. The home page MUST retain one primary job: recording something
quickly. Ordinary quick recording MUST NOT gain a required decision.

### II. Preserve Account-Owned Local-First Operation

Authenticated data MUST write to the isolated local cache before synchronization. Previously
authenticated devices MUST continue core use offline. Account switching MUST NOT expose, upload,
clean up, or reuse another account's records or images. Revision conflicts MUST stop writes rather
than silently overwrite newer data.

### III. Keep Raw Records Intact and Changes Reversible

AI, migrations, imports, and derived features MUST NOT silently rewrite raw note content. Changes
to organization or derived state MUST be explicit, traceable, reversible, and compatible with JSON,
Markdown, and portable attachment backup and restore.

### IV. Admit Only Evidence-Backed, Removable Features

Every feature MUST state its core-loop contribution, user evidence, default interface cost, offline
and privacy boundary, verification method, removal path, and exit condition. Features that cross a
red line remain isolated or are rejected.

### V. Verification Is Part of the Feature

Tests are mandatory. Implemented behavior MUST have relevant regression coverage and pass the
repository quality gate. Real-account, cross-device, OAuth, deployment, and observation claims MUST
remain pending until verified in the real environment.

### VI. Maintain One Truth for Each Decision

`AGENTS.md` governs operations, `product.md` governs durable product behavior, and
`PROJECT_BOARD.md` governs priority, state, dependencies, acceptance, and evidence. Feature files
under `specs/` refine one board item and MUST NOT create a competing backlog or declare acceptance.

## Product and Data Constraints

- Preserve account isolation, offline use, revision safety, backup compatibility, and the existing
  mobile-first interaction rules.
- New network, AI, calendar, social, automation, or plugin capabilities MUST document data fields,
  authorization, secrets, limits, logs, fallback, deletion/recomputation, cost, and removal.
- Secrets, tokens, private records, and identifiers MUST NOT enter specs, logs, screenshots,
  fixtures, backups, Service Worker caches, or repository-managed agent files.

## Spec Kit Delivery Workflow

Use `$speckit-specify → $speckit-clarify (when needed) → $speckit-plan → $speckit-tasks →
$speckit-analyze` for one existing board item. Use one writer in the main checkout. The
implementation skill returns evidence; the controller independently verifies it and updates the
board. No commit, push, publish, deploy, delete, reset, history rewrite, OKR modification, or
worktree merge is implied.

## Governance

This Constitution applies to all Spec Kit artifacts and implementation work. Amendments require
rationale, compatibility impact, migration/removal planning, and project-owner approval. Version
changes follow semantic versioning: MAJOR for breaking governance changes, MINOR for new principles
or material expansions, and PATCH for clarifications. Project customizations MUST live here or in
`.specify/templates/overrides/` so official CLI upgrades remain reviewable.

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
