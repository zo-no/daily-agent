# Research: Unified Runtime AI Execution

## Decision 1: Migrate all five implemented remote capabilities

**Decision**: Treat Diary analyze/reply, Plan analyze/reply, daily chronological review, existing-
category classification, and confirmed seven-day domain review as the complete current remote AI
inventory.

**Rationale**: Source inventory finds four public routes and five distinct model contracts. Migrating
only Plan would still leave daily review, category classification, and domain review on legacy paths.

**Alternatives considered**:

- Migrate Plan only: rejected because it contradicts “all AI capabilities.”
- Include LN-077 template generation: rejected because it is unimplemented and separately gated.
- Remove the user-facing legacy organizer: rejected because the user authorized execution migration,
  while product contracts require `/organize` compatibility and offline fallback.

## Decision 2: Use one generic execution mechanism with capability-specific contracts

**Decision**: Create a capability-parameterized Agent/Workflow adapter but keep strict schemas,
prompts, sanitized input envelopes, normalizers, and public error vocabulary in the route/business
modules that already own them.

**Rationale**: Execution mechanics are identical, while business safety differs materially between
classification, plan editing, chronology, and financial-summary rejection. This removes duplication
without creating a second source of business truth.

**Alternatives considered**:

- Five copied Agent/Workflow implementations: rejected due to duplicated retry/error/snapshot logic.
- One universal output schema: rejected because it weakens capability-specific validation.
- Standalone Mastra service: rejected because deployment/auth/latency complexity adds no current value.

## Decision 3: Retain only the provider factory, remove direct AI SDK execution

**Decision**: Keep `@ai-sdk/openai-compatible` as the DeepSeek language-model factory passed into
Mastra, remove project `generateText`/`Output` usage and the raw DeepSeek fetch implementation, then
remove the direct top-level `ai` dependency when source inventory reaches zero.

**Rationale**: Mastra accepts AI SDK provider models and deliberately hides provider-spec differences
behind its Agent API. A provider factory is transport construction, not a competing orchestration path.

**Alternatives considered**:

- Use a Mastra-hosted gateway/model router: rejected because it changes provider/data/deployment scope.
- Keep direct AI SDK calls for simple summaries: rejected because it preserves two execution systems.
- Remove the provider package too: rejected because DeepSeek uses a custom OpenAI-compatible base URL.

## Decision 4: Preserve a 512 KiB provider-response ceiling

**Decision**: Wrap the fetch passed to the provider, stream/read at most 512 KiB, then return a rebuilt
bounded `Response` for provider parsing. Reject both oversized declared bodies and oversized streamed
bodies.

**Rationale**: The legacy classifier had an explicit response ceiling. Moving it to a generic provider
must not regress that boundary, especially while two Low findings for the same provider-utils
advisory remain open.

**Alternatives considered**:

- Trust output-token limits alone: rejected because bytes can exceed semantic token expectations.
- Force-upgrade Mastra's internal provider-utils: rejected because it crosses unsupported major aliases.
- Ignore the existing Low findings: rejected because audit evidence must remain explicit.

## Decision 5: Keep runtime and release gates unchanged

**Decision**: Target the exact existing `@mastra/core@1.63.2` and Node `>=22.13.0`; do not edit
Plus/Cargo/CatPaw Node 20 configuration in this feature.

**Rationale**: Local Node 20 success is diagnostic only and cannot replace the upstream runtime
contract. Deployment changes require separate authorization and evidence.

**Alternatives considered**:

- Downgrade to pre-1 Mastra for Node 20: rejected in Rework 19 due to obsolete API and larger graph.
- Upgrade internal deployment now: rejected because it is an external release-platform change.
