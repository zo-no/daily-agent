# Implementation Plan: [FEATURE]

**Board Item**: `[LN-###]` | **Date**: [DATE] | **Spec**: [link]

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

[Primary user outcome, narrow technical approach, and the boundary that keeps the change removable.]

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: [existing libraries reused; justify every new dependency]
**Storage and Ownership**: [account cache, Supabase document, IndexedDB image boundary, or N/A]
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: [interaction, bundle, network, startup, or background-work budget]
**Constraints**: local-first, account isolated, revision safe, offline capable, backup compatible
**Scale/Scope**: [records, payload limits, responsive widths, routes, or modules affected]

## Source-of-Truth and Readiness Check

- [ ] The board item exists and its intended outcome, dependencies, permissions, acceptance, and
      verification method are clear.
- [ ] `product.md` contains or will receive the durable product-admission decision when behavior or
      scope changes.
- [ ] Visual or interaction work has read `DESIGN.md` and `docs/设计规范/AGENTS.md`.
- [ ] The current dirty working tree was inspected and the write set avoids unrelated user changes.
- [ ] No second writer owns overlapping files or state.

## Constitution Check

*GATE: Must pass before implementation design and be re-checked after the design is complete.*

- [ ] Core recording steps and the home page's primary job are preserved or improved.
- [ ] Authenticated offline use, account ownership, and stale-revision safety are preserved.
- [ ] Raw notes are not silently rewritten; all changes are explicit and reversible.
- [ ] Privacy, network payloads, credentials, backups, restore, and removal are fully specified.
- [ ] Tests are mandatory and cover the acceptance scenarios and relevant failure paths.
- [ ] The change is the smallest independently testable vertical slice with no speculative breadth.
- [ ] Implementation does not require unauthorized commit, push, publish, deploy, deletion, reset,
      history rewrite, OKR change, or worktree merge.

## Existing System Investigation

### Relevant Code and Contracts

[List current modules, data flows, routes, tests, design specs, migrations, and external contracts.]

### Reuse and Compatibility Decisions

[State what is reused, what remains unchanged, and how older data/backups/links continue to work.]

## Proposed Design

### Data and Control Flow

[Describe local write, render, synchronization, fallback, conflict, cancellation, and recovery flows
as applicable.]

### Trust and Privacy Boundaries

[List every process or service receiving data, exact fields, authentication, secret location,
logging restrictions, response validation, limits, and offline behavior.]

### UI and Interaction Contract *(when applicable)*

[Navigation depth, default exposure, focus/keyboard/touch behavior, responsive widths, reduced
motion, empty/error states, and visual evidence requirements.]

## Project Structure and Write Set

```text
[Concrete existing paths that may be read]
[Concrete files/directories allowed to change]
[Explicit exclusions]
```

**Integration Order**: [single-writer sequence; isolated worktree order if explicitly authorized]

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract tests: [cases and files]
- Browser/mobile tests: [journeys and widths]
- PWA/offline/account tests: [cases]
- Design validation: [specs and visual checks]
- Full gate: `npm run check`

### Real-Environment or Manual Evidence

[OAuth, cross-device, real-account, deployment, external observation, or subjective product checks
that automation cannot honestly replace.]

### Acceptance Evidence Handoff

[Exact results, screenshots, logs, exports, revision numbers, and remaining manual checks to record
in `PROJECT_BOARD.md`.]

## Rollback, Removal, and Migration

[How to disable or remove the feature, recover current data, preserve backups, and reverse any
migration. State when no migration is required.]

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| [dependency/module/schema/control] | [observed need] | [specific insufficiency] |
