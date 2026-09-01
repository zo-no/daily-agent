# Feature Specification: Unified Runtime AI Execution

**Board Item**: `LN-074 Rework 20`
**Feature Directory**: `012-mastra-ai-consolidation`
**Created**: 2026-09-01
**Status**: Implementation authorized
**Input**: User description: "现在开始吧 AI 能力都迁移过去，之前的 AI 能力可以去掉了。"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove the acceptance claim.

### User Story 1 - Keep Every Existing AI Journey Working (Priority: P1)

An authenticated author can continue using Diary review, Plan review, single-day chronological
review, existing-category organization, and the confirmed seven-day domain summary without learning
a new interaction or seeing a changed response contract.

**Why this priority**: Consolidation is valuable only if all existing optional AI journeys remain
available and no partial migration leaves two competing execution systems.

**Independent Test**: Exercise one valid synthetic request for each of the five capabilities and
verify that each produces its existing bounded proposal or summary shape through the same public
route, with source data unchanged until an already-defined explicit action is confirmed.

**Acceptance Scenarios**:

1. **Given** any implemented remote AI capability, **When** the author completes its existing
   activation or confirmation flow, **Then** the same public request and response contract remains
   available and at most one model request is made.
2. **Given** Diary or Plan returns an actionable proposal, **When** the response is displayed,
   **Then** it remains inert until the existing separate confirmation action and cannot write by
   itself.
3. **Given** single-day or seven-day review returns a summary, **When** it is displayed, **Then** it
   remains session-only and does not introduce a write action or persistent result.

---

### User Story 2 - Fail Consistently and Preserve Offline Use (Priority: P1)

An author who is offline or encounters missing configuration, timeout, rate limit, cancellation, or
invalid model output receives the same safe fallback or unavailable state as before. Ordinary
recording, browsing, plans, local organization, and the local domain review remain usable.

**Why this priority**: A shared execution boundary must not weaken the product's offline-first and
zero-write failure behavior.

**Independent Test**: For every capability, exercise abort, invalid structured output, rate limit,
and unavailable-provider cases; verify the established public error/fallback behavior and zero
persistent changes.

**Acceptance Scenarios**:

1. **Given** a model request is aborted or exceeds the server timeout, **When** it finishes late,
   **Then** no stale result is returned or applied and the established timeout behavior is preserved.
2. **Given** a model returns unknown IDs, forbidden fields, conflicting outcomes, unsafe content, or
   invalid structure, **When** project validation runs, **Then** the whole affected proposal is
   rejected or reduced according to the existing capability contract with zero writes.
3. **Given** the device is offline or remote AI is unconfigured, **When** the author uses a capability
   with a deterministic local fallback, **Then** that fallback remains available without the shared
   remote execution boundary.

---

### User Story 3 - Remove the Superseded Execution System (Priority: P1)

A maintainer can identify one server-side execution boundary for every implemented remote AI
capability. Superseded direct generation and hand-written provider invocation paths are absent, while
provider configuration, business validation, and public routes remain separately owned and removable.

**Why this priority**: The user's goal is not merely to add another wrapper; it is to remove the
duplicate legacy execution paths that would otherwise keep maintenance and failure behavior split.

**Independent Test**: A structure regression inventories every server-side remote-model entry point,
proves each delegates to the shared execution boundary, and proves no project module directly invokes
the former generation API or hand-written model endpoint.

**Acceptance Scenarios**:

1. **Given** the source tree after migration, **When** remote-model invocation imports and endpoint
   calls are searched, **Then** only the shared provider construction and shared execution boundary
   remain.
2. **Given** one capability is removed later, **When** its route, business model, and shared runtime
   registration are removed, **Then** stored notes, plans, structures, exports, and backups require no
   migration.

### Edge Cases

- One capability uses a different output shape or safety rule; its project-owned schema and normalizer
  remain authoritative rather than being weakened into a generic response.
- A response contains nested provider errors; timeout, rate-limit, invalid-output, and unavailable
  classes remain mapped to the existing public error code for that route.
- The model transport returns an unexpectedly large body; the existing bounded-response protection
  remains effective before parsing or validation.
- A request is cancelled between generation and normalization; normalization and browser delivery do
  not proceed.
- A capability has no local AI imitation, such as the weekly summary; failure stays explicitly
  unavailable instead of fabricating local model output.
- Internal deployment remains on an unsupported runtime version; successful local diagnostics cannot
  authorize that deployment.

## Product Admission *(mandatory)*

### Core-Loop Contribution

Preserves browse and edit assistance while reducing the chance that equivalent AI failures behave
differently across Diary, Plan, organization, and review surfaces. It does not alter quick recording.

### User Evidence

The product owner explicitly requested migrating every existing AI capability to the selected Agent
and Workflow foundation and removing the superseded AI execution implementation.

### Default Interface and Recording Cost

No control, page, modal, field, background action, or recording step is added. Existing optional
activation, disclosure, confirmation, cancellation, and result surfaces remain unchanged.

### Offline, Account, Privacy, Reversibility, and Backup

Existing per-capability request whitelists, same-origin authentication, server-held secret, rate/body/
time limits, response validation, cancellation, and session-only boundaries remain unchanged. The
shared execution layer receives only already-sanitized input and has no tool, memory, storage, or
write access. Existing local fallbacks stay outside the remote layer. Raw notes and plans are not
silently rewritten; backups and storage schemas do not change.

### Verification and Removability

Contract tests cover all five capabilities, one-call/no-retry execution, failure mapping, strict
normalization, bounded responses, and absence of legacy model calls. Existing browser and PWA gates
prove public flows and offline behavior remain unchanged. The shared layer and provider adapter can
be removed without data migration by restoring a different execution adapter behind the same routes.

### Exit Condition

Keep the consolidation isolated or roll it back if any public contract changes, a local fallback is
lost, model calls multiply, response bounding weakens, the complete quality gate regresses, supported
deployment runtimes cannot run it, or maintenance cost exceeds the reduction in duplicate code.

### Admission Decision

- **Score**: `18/20` using the rubric in `product.md`
- **Decision**: `mainline candidate` as an implementation consolidation of existing admitted features
- **Red-line check**: no silent raw rewrite, required recording step, new data boundary, offline-core
  dependency, persisted AI entity, or backup-format change

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The shared server execution boundary MUST cover all five implemented remote AI
  capabilities: Diary analyze/reply, Plan analyze/reply, single-day chronological review,
  existing-category organization, and confirmed seven-day domain summary.
- **FR-002**: Each capability MUST preserve its existing HTTP path, request schema, response schema,
  browser provider behavior, public error codes, output limits, and cancellation behavior.
- **FR-003**: Each execution MUST make at most one model request, MUST disable automatic retries, and
  MUST prohibit tool use, Agent memory, application-configured or durable storage, and persistent
  workflow snapshots. Mastra's process-local transient default store is not application state.
- **FR-004**: Authentication, origin/content-type/body/rate limits, input sanitization, provider
  configuration, timeout ownership, business schemas, ID allowlists, safety checks, output
  normalization, confirmation, writing, and undo MUST remain owned by the existing project boundary.
- **FR-005**: Runtime output MUST remain an untrusted proposal and MUST pass the capability-specific
  project normalizer before it can reach a browser response.
- **FR-006**: Diary and Plan actionable outcomes MUST remain session-only until the existing explicit
  confirmation, and summaries/classification results MUST retain their existing persistence and
  reversibility rules.
- **FR-007**: Deterministic local fallbacks and explicitly unavailable states MUST remain independent
  of the remote execution layer and usable under their existing offline/unconfigured conditions.
- **FR-008**: Timeout, abort, rate-limit, invalid-output, and upstream-unavailable failures MUST map to
  each route's existing public error behavior without leaking private upstream details.
- **FR-009**: Provider responses MUST remain byte-bounded before untrusted JSON is fully accepted by
  the application.
- **FR-010**: Project-owned direct generation calls and hand-written model-endpoint invocation paths
  superseded by the shared boundary MUST be removed; provider model construction may remain as the
  single narrow external-provider adapter.
- **FR-011**: The migration MUST NOT change pages, interaction steps, storage schemas, sync paths,
  Service Worker caches, exports, backups, or deployment configuration.
- **FR-012**: The implementation MUST run only on the declared supported server runtime; unsupported
  internal deployment remains blocked until independently upgraded or isolated.

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.
- **NR-005**: Google events remain identity-free read-only Plan context and cannot become write targets.
- **NR-006**: Weekly-summary financial-safety rejection and per-request disclosure remain unchanged.

### Key Entities *(include only when data is involved)*

- **Capability execution**: One transient, capability-named generation and normalization run over an
  already-sanitized input; it has no identity beyond the request and is never persisted.
- **Structured model output**: Untrusted capability-specific data that must satisfy its strict schema
  and project normalizer before a public response exists.
- **Provider model adapter**: The only server-side construction boundary for provider URL, secret,
  model ID, bounded transport, and structured-output compatibility.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Automated inventory and contract tests prove 100% of the five remote capabilities use
  the shared execution boundary and zero superseded direct generation/model-endpoint calls remain.
- **SC-002**: Each capability's success, abort, rate-limit, invalid-output, and unavailable paths pass
  focused regression with at most one recorded model call and zero automatic retries.
- **SC-003**: Existing public route/provider tests pass without changing fixture request/response
  shapes or expected public error codes.
- **SC-004**: Node 22 production build, all unit tests, PWA checks, repository quality gate, dependency
  audit review, and diff validation complete before the item is Returned.
- **SC-005**: Real-model language quality, supported internal deployment, and any accepted dependency
  risk remain explicit external evidence and are not inferred from local automation.

## Scope Boundaries *(mandatory)*

### In Scope

- Consolidating the five existing server-side remote AI executions, centralizing provider creation
  and response bounds, deleting superseded execution code/dependency, updating architecture evidence,
  and adding regression coverage.

### Out of Scope

- New AI behaviors, UI, tools, memory, persistent chat or workflow state, an independent runtime
  service, model/provider changes, deployment runtime upgrades, schemas/migrations, background work,
  LN-077 template generation, and unrelated cleanup.

## Assumptions and Dependencies

- Existing public capability contracts and local fallbacks are correct and remain the behavioral
  baseline; this change replaces execution internals only.
- The supported Mastra-enabled server runtime remains Node.js `>=22.13.0`.
- Internal Plus/Cargo/CatPaw remains blocked on its separate Node 20 decision.
- The two Low findings for the same transitive dependency advisory remain a deployment gate until
  upgraded or explicitly accepted; this feature does not force an incompatible override.
- The dirty working tree contains unrelated user-owned changes that must be preserved.

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001–FR-005, US1 | Runtime registration/one-call tests plus five route success contracts | Rework 20 complete migration |
| FR-006–FR-009, US2 | Failure mapping, zero-write/fallback and bounded-transport tests | Rework 20 safety compatibility |
| FR-010–FR-012, US3 | Source inventory, dependency graph, structure test and Node 22 build | Rework 20 legacy removal/runtime gate |
| NR-001–NR-006 | Existing Agent, organizer, summary, PWA and full repository gates | Core-loop non-regression |
| SC-004–SC-005 | Commands, audit result, board evidence and explicit external blockers | Returned versus Accepted boundary |
