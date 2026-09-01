# Implementation Plan: Unified Runtime AI Execution

**Board Item**: `LN-074 Rework 20` | **Date**: 2026-09-01 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> `ARCHITECTURE.md`, and `PROJECT_BOARD.md` remain authoritative for governance, product truth,
> technical boundaries, and task state.

## Summary

Preserve all five existing user-facing remote AI capabilities while replacing their split server
execution with one embedded Mastra pattern: a capability-named, tool-free and memory-free Agent
per request, followed by a transient two-step Workflow that generates strict structured output and
invokes the existing project normalizer. Centralize DeepSeek model construction, HTTPS validation,
response-byte bounding, timeout ownership, and private error classification in one server adapter.
Keep every public route, browser provider, sanitizer, schema, allowlist, safety validator, local
fallback, confirmation, write, and undo contract in its existing project module. Remove direct
project imports from `ai`, the raw DeepSeek fetch path, and the no-longer-needed top-level `ai`
dependency. No independent Runtime service, UI change, data migration, tool, memory, or snapshot is
introduced; Mastra's unavoidable process-local default store is not configured as application
storage and workflow snapshot persistence remains disabled.

## Technical Context

**Runtime**: Node.js `>=22.13.0`, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: existing `@mastra/core@1.63.2`, `@ai-sdk/openai-compatible@2.0.69`, Zod;
remove the direct `ai` dependency after project imports reach zero
**Storage and Ownership**: no new storage; all runtime inputs/outputs remain request or page-session
state, while existing confirmed writes continue through account-scoped `commitData`
**Testing**: Node test runner, existing Playwright mobile/PWA gates, production build, design
validation, dependency audit, source inventory
**Target Platforms**: Node 22 server routes used by authenticated mobile-first and desktop clients;
existing internal Node 20 deployment remains unsupported and blocked
**Performance Goals**: one model call, zero automatic retries, no persistent background work, existing
20-second server and 25-second client timeout budgets, unchanged output-token ceilings
**Constraints**: local-first, account isolated, revision safe, offline capable, backup compatible,
untrusted proposals, provider response capped at 512 KiB before parsing
**Scale/Scope**: four public routes, five capability IDs, existing request maxima of 80 records,
64 categories, 24 examples, 4000 characters per record, and 256 KiB request bodies

## Source-of-Truth and Readiness Check

- [x] `LN-074 Rework 20` exists with a complete outcome, scope, authorization, acceptance, rollback,
      runtime gate, and verification method.
- [x] `product.md` already admits each affected user-facing capability; this internal consolidation
      changes no durable product behavior and does not require a competing product admission.
- [x] No visual or interaction work is planned, so `DESIGN.md` and page-spec edits are excluded.
- [x] The dirty working tree was inspected; the write set is limited to the AI execution boundary,
      its tests, package metadata, architecture truth, one new feature package, and board evidence.
- [x] The main checkout has one writer and no delegated writer owns overlapping files.

## Constitution Check

*GATE: Passed before design and re-checked after Phase 1 design.*

- [x] Quick recording, home-page controls, and every existing AI activation step remain unchanged.
- [x] Authenticated offline CRUD, account ownership, local fallbacks, and stale-revision safety stay
      outside the remote execution adapter and remain intact.
- [x] Model output remains an inert proposal; no raw note or plan can change without the existing
      explicit confirmation and project-owned write path.
- [x] Exact network payloads, secrets, request/response bounds, errors, backups, removal, and
      unsupported deployment evidence are specified.
- [x] Tests cover all five successes, one-call/no-retry behavior, response bounds, cancellation,
      error mapping, public compatibility, and absence of legacy execution paths.
- [x] The work is one server-execution consolidation and excludes new AI behavior, UI, persistence,
      deployment upgrades, and LN-077.
- [x] The user authorized implementation and removal of superseded AI execution code, but not commit,
      push, publish, deploy, reset, history rewrite, OKR change, or worktree merge.

## Existing System Investigation

### Relevant Code and Contracts

- `src/lib/agent-review-route.mjs` owns the shared Diary/Plan endpoint. Diary already delegates to
  Mastra; Plan still calls AI SDK `generateText` directly.
- `src/lib/daily-review-route.mjs` owns the single-day chronological review and calls AI SDK
  `generateText` directly.
- `src/lib/domain-review-route.mjs` owns the confirmed seven-day summary and calls AI SDK
  `generateText` directly before its additional project safety validator.
- `src/lib/ai-classifier-route.mjs` owns shared HTTP security primitives and the legacy category
  classifier; its classifier still constructs and parses a raw DeepSeek `fetch` request.
- `src/mastra/agents/diary-review-agent.mjs`,
  `src/mastra/workflows/diary-review-workflow.mjs`, and `src/mastra/index.mjs` implement a Diary-only
  Agent/Workflow adapter with no tools, memory, storage, logs, retries, or snapshots.
- Browser providers and App Router handlers already expose four stable interfaces:
  `/api/organize/agent`, `/api/organize/review`, `/api/organize/analyze`, and
  `/api/organize/domain-review`.
- Capability-specific normalizers in `agent-review-model.mjs`, `daily-review-model.mjs`,
  `domain-review-model.mjs`, and `ai-classifier-route.mjs` remain the business truth.
- `tests/agent-review-runtime.test.mjs` currently covers Diary runtime mechanics; the four route test
  files cover public contracts and synthetic provider failures.

### Reuse and Compatibility Decisions

- Replace the Diary-only Agent and Workflow with capability-parameterized equivalents. Capability
  IDs are fixed allowlisted configuration, not request-controlled data.
- Keep one Agent and one transient Workflow per request so locale/mode-specific instructions and
  strict output schemas remain isolated. Do not create a long-lived global session or store.
- Keep `@ai-sdk/openai-compatible` solely as the model provider factory accepted by Mastra. It is not
  a competing execution engine. Remove all project imports from the top-level `ai` package, then
  remove that direct dependency.
- Move DeepSeek URL/key/model/fetch validation and bounded response transport into
  `src/lib/deepseek-model.mjs`. This adapter may create the language model but cannot own prompts,
  schemas, normalizers, route authentication, or writes.
- Retain the current 512 KiB provider response ceiling by wrapping the provider fetch and rebuilding
  a bounded `Response` before the AI SDK provider reads it. This prevents consolidation from
  weakening the manual classifier's existing byte boundary.
- Generalize safe Mastra error codes and let each route translate them into its established public
  error code. Upstream messages, payloads, and private causes are not returned or logged.
- Preserve every route's sanitizer and response validation. A generic Workflow never decides
  categories, plan changes, chronology, theme safety, or investment boundaries.
- Keep all local browser fallbacks untouched. They are product behavior, not legacy remote execution.
- Do not add `serverExternalPackages` solely to suppress a successful-build warning without an
  upstream requirement.

## Proposed Design

### Data and Control Flow

```text
existing App Router handler
  → existing auth/origin/content-type/body/rate checks
  → existing capability sanitizer
  → shared DeepSeek model adapter
       HTTPS/base URL validation
       secret/model/fetch validation
       512 KiB bounded provider response
       20s AbortController owned by the route call
  → capability-named Mastra Agent (no tools/Agent memory/application or durable storage; maxRetries 0)
  → transient Workflow step 1: strict structured generation (maxSteps 1, toolChoice none)
  → transient Workflow step 2: injected project-owned normalizer
  → existing route response validator/error mapper
  → unchanged private/no-store JSON response
```

Capability mapping:

| Capability ID | Existing route | Strict output owner | Project normalizer |
| --- | --- | --- | --- |
| `diary-review` | `/api/organize/agent` | Diary analyze/reply schemas | Diary review/reply normalizers |
| `plan-review` | `/api/organize/agent` | Plan analyze/reply schemas | Plan review/reply normalizers |
| `daily-review` | `/api/organize/review` | Daily segment schema | chronological review normalizer |
| `category-classifier` | `/api/organize/analyze` | existing category group schema | classifier ID/score normalizer |
| `domain-review` | `/api/organize/domain-review` | weekly overview/theme schema | domain normalizer plus response safety validator |

The runtime validates a capability-specific sanitized input envelope, calls the model once, then
passes the result and original sanitized input to the injected normalizer. An abort before or between
steps fails the run. Every non-success workflow status becomes a safe error and never returns partial
output.

### Trust and Privacy Boundaries

- Browser → same-origin routes: exact existing whitelists and Bearer authentication remain unchanged.
- Route → DeepSeek: only sanitized capability input and capability instructions; provider secret is
  environment-only and never enters prompts, responses, logs, specs, fixtures, or backups.
- Provider response: bounded to 512 KiB before structured parsing; output-token limits remain
  700/1200/1600/1800/2000 according to the existing capability.
- Runtime: capability ID is selected by server code, not request data. Tools, Agent memory,
  application-configured or durable storage, persistent snapshots, retries, and logging are absent.
  Mastra's process-local default store is not application state. The runtime has no reference to
  `commitData`, Supabase, browser state, or account caches.
- Project normalizers: enforce request IDs, current categories, candidate lists, current plan target,
  chronology, unique themes, unsafe financial text, and mutually exclusive outcomes.
- Failure: timeout, abort, rate limit, invalid structure, oversized response, and upstream failure
  carry safe internal categories only; route modules retain their public status/error vocabulary.
- Offline: deterministic browser providers remain the only local fallback and never instantiate the
  remote runtime.

### UI and Interaction Contract

No UI or interaction change. Existing activation, disclosure, Stop/Cancel, focus, responsive,
reduced-motion, explicit Apply/Update/Undo, and unavailable/fallback states are regression scope only.

## Project Structure and Write Set

```text
Read/reference:
  AGENTS.md, PROJECT_BOARD.md, product.md, ARCHITECTURE.md, docs/decisions/
  specs/003-agent-diary-review/, specs/004-agent-plan-review/
  specs/008-domain-weekly-summary/
  src/app/api/organize/**, src/lib/*review*, src/lib/ai-classifier-route.mjs

Allowed changes:
  PROJECT_BOARD.md
  ARCHITECTURE.md
  docs/decisions/0003-embed-mastra-without-standalone-runtime.md
  specs/README.md
  .specify/feature.json
  specs/012-mastra-ai-consolidation/**
  package.json
  package-lock.json
  src/mastra/**
  src/lib/deepseek-model.mjs
  src/lib/agent-review-route.mjs
  src/lib/daily-review-route.mjs
  src/lib/domain-review-route.mjs
  src/lib/ai-classifier-route.mjs
  tests/agent-review-runtime.test.mjs
  tests/deepseek-model.test.mjs
  tests/ai-agent-review-route.test.mjs
  tests/ai-daily-review-route.test.mjs
  tests/ai-domain-review-route.test.mjs
  tests/ai-classifier-route.test.mjs
  tests/project-structure.test.mjs

Explicit exclusions:
  src/app UI and browser provider behavior
  local deterministic fallbacks
  data/storage/sync/backup schema and migrations
  Service Worker and deployment/Cargo/CatPaw configuration
  LN-077 and unimplemented AI features
  unrelated dirty files and generated screenshots
  commit, push, publish, deploy, reset, history rewrite, OKR changes
```

**Integration Order**: Single writer: feature artifacts → failing runtime/route/source-inventory tests
→ generic Mastra adapter and bounded provider → capability routes one at a time → remove old files and
direct dependency → focused/full validation → architecture/board evidence.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/runtime: five registered capability IDs, strict input/output schemas, injected normalizer,
  one model call, no retry/tool/memory/storage/snapshot, abort between steps, safe error categories.
- Provider adapter: valid HTTPS and localhost URLs, missing key/fetch, 512 KiB declared/streamed
  response rejection, request Abort propagation, no private payload in thrown errors.
- Route contracts: unchanged valid outputs and public error codes for Diary/Plan analyze/reply, daily
  review, category classification, and domain review; existing request fixtures remain valid.
- Source inventory: no `generateText`, `Output`, top-level `ai` imports, manual
  `/chat/completions` construction, or raw provider response parsing remains outside the provider
  package and Mastra internals.
- Browser/mobile: no changed files expected; existing Agent, organizer, and domain-summary E2E remain
  part of the complete gate.
- PWA/offline/account: existing production installability, authenticated offline cache, persistence,
  update, local fallback, and no-write paths.
- Design validation: unchanged UI still runs the existing 11-file design specification validator.
- Build/audit: Node 22 production build, `npm ls`, official-registry production audit review.
- Full gate: `npm run check` and `git diff --check`.

### Real-Environment or Manual Evidence

- Real DeepSeek Chinese quality, provider latency, and user trust remain the existing per-capability
  observation evidence; synthetic tests do not transmit private notes.
- Internal Plus/Cargo/CatPaw remains Node 20. It cannot receive the Mastra-enabled change until a
  separately authorized Node 22 upgrade and independent deployment validation, or explicit release
  isolation.
- The two Low findings reported for the same transitive provider-utils advisory remain open until an
  upstream dependency graph clears them or the owner explicitly accepts the risk. The bounded
  transport is defense-in-depth, not a claim that the dependency audit is clean.

### Acceptance Evidence Handoff

Record exact focused/full command counts, five-capability source inventory, package removal, Node 22
build, PWA/full-gate result, audit result, rollback, and all external blockers in `PROJECT_BOARD.md`.
Keep Rework 20 `Returned`, not `Accepted`, unless the complete gate and required independent evidence
are both satisfied.

## Rollback, Removal, and Migration

No data migration exists. Rollback restores each route's prior model execution behind the unchanged
public contract, restores the Diary-only Mastra files and direct `ai` dependency if needed, and
removes the shared provider/runtime modules. Records, plans, categories, session results, account
caches, Supabase documents, exports, backups, and Service Worker state require no cleanup.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Capability-parameterized Mastra adapter | One framework path must retain five distinct schemas and normalizers | One generic schema would weaken business allowlists and safety checks |
| Shared bounded DeepSeek model adapter | Four routes duplicate URL/key/fetch/timeout setup and one raw path has a separate byte bound | Leaving provider setup in every route preserves the duplicate execution system the user asked to remove |
| Safe cross-provider error classifier | Mastra and supported AI SDK provider versions wrap errors differently | Importing top-level AI SDK error classes would keep the superseded direct execution dependency |

## Post-Design Constitution Re-check

All gates remain passed: the design changes only server execution internals, preserves the complete
public and local-fallback behavior, adds no persistence or UI, keeps all writes project-owned and
explicit, documents removal and external evidence, and authorizes no repository or deployment action
beyond the user's requested implementation.
