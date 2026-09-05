# Research: Daily Work Log Agent Tool

## 1. Current Mastra Tool contract

**Decision**: Use `createTool` from `@mastra/core/tools` with `id`, concise description, strict Zod
`inputSchema` and `outputSchema`, and `execute(inputData, context)`. Read `context.abortSignal` only.

**Rationale**: The product owner supplied the current canonical Mastra Tools documentation, which states
that other `execute` shapes are outdated. The installed `@mastra/core` 1.63.2 package exports
`./tools`, and its declaration defines the same input-plus-context execution contract.

**Alternatives rejected**:

- `execute({ context })` or older wrapper shapes: contradicted by current documentation.
- An untyped function attached directly to the Agent: loses standalone Tool discovery and schema validation.
- A Tool that calls `commitData`: impossible in the server/Studio boundary and violates Log Note's write protocol.

## 2. Agent composition and Tool identity

**Decision**: Construct the dedicated object with `new Agent` from `@mastra/core/agent`, inject its model,
and register the Tool as `{ [prepareDailyLogTool.id]: prepareDailyLogTool }`.

**Rationale**: Mastra Tool names in calls/streams are determined by the object key, not only the Tool `id`.
Using the ID as the key keeps discovery, traces, tests, and future adapter naming aligned. Model injection
keeps Provider configuration outside the reusable Agent definition.

**Alternatives rejected**:

- Add the Tool to `createStructuredProposalAgent`: would give every existing production capability new
  authority and invalidate their tool-free regression.
- Put Provider construction in the Agent folder: couples the reusable Agent to Studio secrets/environment.
- Add memory or task tools: no daily-log contract needs persistent conversational state.

## 3. Shared core location

**Decision**: Put schemas and deterministic proposal construction under
`src/modules/agent-bridge/daily-log/`; keep Mastra-specific code in the requested Tool/Agent folders.

**Rationale**: `ARCHITECTURE.md` requires reusable business capabilities to live under `src/modules` and
not depend on `app` or Mastra. A future Log Note confirmation adapter and MCP server can therefore import
the same core without calling an Agent or duplicating validation/formatting.

**Alternatives rejected**:

- Put all logic in `src/mastra/tools/daily-log/`: future non-Mastra adapters would depend on framework code.
- Put core logic in the Agent folder: reverses dependency direction and makes the Tool unusable alone.
- Create a general plugin/tool registry: speculative infrastructure outside one vertical slice.

## 4. Proposal rather than persistence

**Decision**: Return a versioned `date/time/content` candidate with deterministic fingerprint and
`writePolicy: "preview-required"`; never save it in this slice.

**Rationale**: Log Note writes are browser-local-first and require current-account/state re-read, explicit
confirmation, one atomic `commitData`, and revision-checked sync. A server/Studio Tool has none of that
context. The candidate shape already matches the daily Markdown merge boundary and is sufficient for a
future confirmation adapter.

**Alternatives rejected**:

- Direct Supabase write: creates a second persistence path and can overwrite a dirty local device state.
- Persist a proposal in Agent/Workflow memory: creates retention and stale-state problems without user value.
- Claim a Mastra Tool is automatically a Codex Tool: Codex still requires an MCP transport/configuration.

## 5. Deterministic summary format and bounds

**Decision**: Accept 1–30 explicit work items, 8,000 Unicode source characters total, and statuses
`completed`, `in-progress`, or `blocked`. Normalize control/whitespace, preserve input order inside each
status, omit empty groups, emit no time, and fingerprint the normalized date/locale/items with FNV-1a.

**Rationale**: The model can extract and classify facts, while the Tool provides predictable formatting,
validation, traceability, and a cheap repeatable test. Empty time avoids inventing completion timestamps.
The bounds keep Tool context and record size finite without silently truncating user facts.

**Alternatives rejected**:

- Let the Tool infer work from repository/Codex history: requires new read permissions and source contracts.
- Free-form model-generated Markdown as Tool output: cannot guarantee traceability or stable structure.
- Random proposal IDs: make deterministic tests and idempotent preview comparison harder; the source
  fingerprint already identifies content and is not a persistence ID.

## 6. Studio and deployment boundary

**Decision**: Register the standalone Tool and one configured Agent in localhost Studio. Keep production
`src/mastra/index.mjs` unchanged and keep Studio synthetic-only.

**Rationale**: The user asked for a concrete Agent object and Tool. Studio is the current inspectable
development surface. The Tool itself can run without a Provider key; an actual Agent generation requires
the existing Studio Provider environment.

**Alternatives rejected**:

- Add a new production HTTP route: no product caller or auth/consent contract is approved in LN-082.
- Standalone Mastra service: ADR-0003 rejects it until a real transport consumer requires it.
- MCP exposure in the same change: materially expands authentication, deployment, and Codex configuration scope.
