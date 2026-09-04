# Implementation Plan: Daily Work Log Agent Tool

**Branch**: `017-daily-log-agent-tool` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-daily-log-agent-tool/spec.md`

## Summary

Implement LN-082 as a narrow, preview-only vertical slice. A framework-independent module validates
caller-supplied work facts and deterministically builds one versioned ordinary-record candidate. A
Mastra `createTool` adapter exposes that core, and a dedicated `new Agent` composition registers exactly
that Tool. localhost Studio registers both for synthetic debugging. No product route, UI, MCP transport,
account read, persistence, or `commitData` path is added.

## Technical Context

**Language/Version**: JavaScript ESM on Node.js `>=22.13.0`; TypeScript only for the existing Mastra Studio entry

**Primary Dependencies**: `@mastra/core` 1.63.2 (`Agent`, `Mastra`, `createTool`), Zod 4.4.x, existing `@ai-sdk/openai-compatible` Studio model adapter

**Storage**: N/A; the proposal is returned to the caller and is never stored

**Testing**: Node built-in test runner plus existing repository design, browser, PWA, build, and diff gates

**Target Platform**: Local/server Node runtime; localhost Mastra Studio is a development-only surface

**Project Type**: Next.js 15 / React 19 PWA with embedded Mastra development/runtime adapters

**Performance Goals**: Deterministic proposal construction below 20 ms for the maximum 30 items on the local test host; zero idle/background cost

**Constraints**: One Tool only; 30 items and 8,000 Unicode source characters maximum; no network/storage/global reads; no model retry, Agent memory, workflow snapshot, product write, MCP, or UI

**Scale/Scope**: One shared core, one Tool, one Agent factory, one Studio registration, and focused tests/documentation

## Constitution Check

*GATE: Passed before research and re-checked after design.*

| Principle | Plan evidence | Result |
| --- | --- | --- |
| I. Protect the Core Recording Loop | No product UI or current recording behavior changes; output is only an unsaved candidate | Pass |
| II. Account-Owned Local-First | No account or persistence access; any future write must reuse the existing confirmation and `commitData` path | Pass |
| III. Raw Records and Reversibility | No source record is read or changed; removal needs no migration | Pass |
| IV. Evidence-Backed, Removable Features | `product.md` and LN-082 record evidence, zero default cost, exit condition, isolation, and removal | Pass |
| V. Verification | Focused TDD and full `npm run check` are mandatory; external/MCP/product evidence remains open | Pass |
| VI. One Truth Per Decision | Spec refines only LN-082; `ARCHITECTURE.md` and ADR-0005 record the approved Tool exception | Pass |

The only deliberate architecture expansion is a single preview-only Tool in a dedicated Agent. It is
separately admitted by LN-082 and ADR-0005, does not weaken the default tool-free production runtime, and
does not create a general Tool platform.

## Architecture and Dependency Direction

```text
src/modules/agent-bridge/daily-log/index.mjs
  → strict schemas + deterministic proposal core
  ↑
src/mastra/tools/daily-log/index.mjs
  → createTool adapter + abort handling
  ↑
src/mastra/agents/daily-log/index.mjs
  → new Agent({ tools: { "prepare-daily-log": tool } })
  ↑
src/mastra/studio-daily-log.mjs
  → development model configuration
  ↑
src/mastra/index.ts
  → localhost Studio registration
```

The shared core imports neither Mastra nor application UI/storage. The Mastra Tool imports only the core.
The Agent imports the Tool. Studio owns Provider construction. This direction permits a future MCP adapter
to import the core without routing through an Agent or duplicating proposal rules.

## Project Structure

### Documentation (this feature)

```text
specs/017-daily-log-agent-tool/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── daily-log-tool.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── modules/agent-bridge/daily-log/
│   ├── contract.mjs
│   ├── core.mjs
│   └── index.mjs
└── mastra/
    ├── agents/daily-log/index.mjs
    ├── tools/daily-log/index.mjs
    ├── studio-daily-log.mjs
    └── index.ts

tests/
├── mastra-daily-log-tool.test.mjs
├── mastra-studio.test.mjs
└── agent-review-runtime.test.mjs
```

**Structure Decision**: The business contract belongs under `src/modules` because future Log Note and MCP
adapters must reuse it without importing Mastra. The user's requested Tool and Agent each receive their own
folder. Public `index.mjs` files keep callers independent of internal filenames. Existing flat, generic
Mastra factories remain unchanged.

## Implementation Phases

### Phase 0 - Research and contract lock

1. Verify the attached canonical Mastra documentation against installed 1.63.2 exports.
2. Lock input/output bounds, date semantics, fingerprint algorithm, candidate compatibility, and abort behavior.
3. Record the preview-only exception in ADR-0005 and the current architecture baseline.

### Phase 1 - Tests first

1. Add failing pure-core tests for language/status formatting, limits, duplicate IDs, strict fields,
   determinism, fingerprint sensitivity, and no invented time.
2. Add failing Tool/Agent tests for `execute(inputData, context)`, abort behavior, exactly one Tool,
   missing-model rejection, no memory, and existing tool-free Agent preservation.
3. Extend the Studio regression to require Agent and standalone Tool registration.

### Phase 2 - Shared core and adapters

1. Implement strict Zod schemas and the deterministic proposal core.
2. Implement the `createTool` adapter with context abort handling.
3. Implement the dedicated `new Agent` composition and localhost Studio model instance.
4. Register the Agent and Tool in `src/mastra/index.ts` without changing production `index.mjs`.

### Phase 3 - Verification and documentation

1. Run focused Node regressions and direct Tool execution.
2. Run `npm run design:check`, full `npm test`, then `npm run check` under Node 22; isolate unrelated dirty-tree failures.
3. Validate the quickstart and inspect the scoped diff.
4. Use Sigo to review generated text for completeness, accuracy, constraints, omissions, and executable steps.
5. Update LN-082 evidence as Returned only; do not commit, push, deploy, or mark Accepted.

## Post-Design Constitution Re-check

The contract keeps all writes and external discovery out of scope, gives each dependency one direction,
keeps existing production Agents tool-free, defines strict bounds and deterministic verification, and names
the future confirmation/MCP work as separate adapters. All Constitution gates remain passed.

## Complexity Tracking

No Constitution violation requires an exception. The extra framework-independent module is necessary to
avoid coupling future MCP or product confirmation code to Mastra; it is three small files with one public
entry rather than a new runtime, service, store, or protocol.

## Open Evidence

- No real Provider call is required to validate Tool execution; Agent wording quality remains unverified.
- No Log Note product confirmation or write integration exists in LN-082.
- No MCP server or Codex configuration exists in LN-082, so Codex discovery is not claimed.
- No deployment, production data, or 14-day reuse evidence is claimed.
