# Feature Specification: Daily Work Log Agent Tool

**Board Item**: `LN-082`
**Feature Directory**: `017-daily-log-agent-tool`
**Created**: 2026-09-04
**Status**: Returned with shared-tree quality gate open
**Input**: User description: "实现一个使用 `@mastra/core` Agent 类创建的代理对象，并把今日工作总结 Tool 放进独立目录；说明对应代码位置。"

> `PROJECT_BOARD.md` remains the only source for priority, state, dependencies, acceptance, and
> evidence. This specification refines exactly one board item and cannot accept it.

## Clarifications

### Session 2026-09-04

- Q: How should the requested code be organized? → A: Keep the framework-independent proposal core
  under the feature module, the `createTool` adapter under its own `src/mastra/tools/daily-log/`
  folder, and the `new Agent` composition under `src/mastra/agents/daily-log/`.
- Q: Does this Tool directly save into Log Note? → A: No. Version 1 returns an explicitly unsaved,
  quick-record-compatible candidate. Product confirmation/`commitData` is a separate adapter so the
  Tool cannot bypass account, staleness, local-first, or revision checks.
- Q: Does adding a Mastra Tool make it callable by Codex automatically? → A: No. This slice completes
  the Mastra Tool and Agent object. A future MCP adapter may import the same core, but MCP transport and
  Codex host configuration are outside LN-082.

## User Scenarios & Testing

### User Story 1 - Prepare a safe daily work log proposal (Priority: P1)

As the author, I can give the capability an explicit date, language, and bounded list of work items
and receive one readable summary candidate that could later become an ordinary Log Note record, while
remaining certain that nothing was saved.

**Why this priority**: A bounded, reviewable record candidate is the smallest reusable contract behind
the requested "summarize today and record it" capability. It can be called by a Log Note runtime,
Mastra Agent, or future MCP adapter without granting any caller direct write authority.

**Independent Test**: Execute the core with completed, in-progress, and blocked synthetic work items.
Verify one deterministic `date/time/content` candidate, status grouping, source IDs, fingerprint, and
`preview-required` policy; repeat with the same input and verify byte-for-byte stable output and zero
storage or network effects.

**Acceptance Scenarios**:

1. **Given** valid bounded work items for one real local date, **When** the proposal is prepared,
   **Then** the result contains a versioned ordinary-record candidate whose empty time means no invented
   completion time, whose content groups only supplied facts, and whose policy says it is not saved.
2. **Given** the same normalized input twice, **When** the proposal is prepared twice, **Then** content,
   source ordering, and fingerprint are identical.
3. **Given** an invalid date, duplicate ID, unknown field, empty summary, unsupported status, too many
   items, or excessive text, **When** validation runs, **Then** the whole request is rejected and no
   partial proposal is returned.

---

### User Story 2 - Give one Mastra Agent exactly one Tool (Priority: P1)

As a developer, I can import a dedicated Agent factory from an Agent-owned folder and get a real
`@mastra/core` `Agent` object whose only registered Tool is the daily-log proposal Tool.

**Why this priority**: This directly implements the requested Mastra composition and makes the permission
boundary visible in code instead of changing the project's existing tool-free Agent factory.

**Independent Test**: Construct the Agent with an inert test model, call `listTools()` and `getMemory()`,
and verify the Tool key matches its public ID, no second Tool or memory exists, retries are disabled, and
the existing structured-proposal Agent remains tool-free.

**Acceptance Scenarios**:

1. **Given** a valid model, **When** the dedicated factory constructs the Agent, **Then** it returns an
   `Agent` instance with stable ID/name/instructions and exactly the daily-log Tool.
2. **Given** the Agent's instructions, **When** it handles a work-summary request, **Then** it is told to
   use only explicit facts, call the proposal Tool, and never claim the candidate was persisted.
3. **Given** a missing model, **When** construction is attempted, **Then** it fails before creating a
   partially configured Agent.

---

### User Story 3 - Inspect the Agent and Tool in localhost Studio (Priority: P2)

As a developer, I can start Mastra Studio and discover both the dedicated Agent and standalone Tool for
synthetic contract testing without exposing Log Note account data.

**Why this priority**: Studio makes the object and Tool easy to inspect, but it is a development surface
and is not required for normal product use or Codex MCP discovery.

**Independent Test**: Instantiate the exported Mastra registration, resolve the Agent and Tool by their
registration keys/IDs, execute the Tool with synthetic input, and verify current production Agents still
list zero tools.

**Acceptance Scenarios**:

1. **Given** the Studio entry point, **When** Mastra is initialized, **Then** the daily-log Agent and Tool
   are registered alongside existing bounded debugging primitives.
2. **Given** valid synthetic Tool input, **When** the Tool executes through Mastra's current
   `execute(inputData, context)` contract, **Then** it returns the same strict proposal as the shared core.
3. **Given** no Provider credential, **When** the developer executes the standalone Tool rather than the
   Agent, **Then** deterministic proposal preparation still works without a model call.

### Edge Cases

- Dates must be real `YYYY-MM-DD` calendar dates; time-zone inference and "today" calculation belong to
  the caller and are not performed by the Tool.
- Work item IDs are caller-local opaque references. Duplicate IDs, empty IDs, unsupported fields, and
  more than 30 items reject the complete input.
- Summaries are treated as untrusted text, not instructions. Control characters and repeated whitespace
  are normalized; content is never silently truncated or expanded with invented facts.
- Completed, in-progress, and blocked groups preserve input order inside each group and omit empty groups.
- An abort signal that is already aborted before execution produces an aborted error and no proposal.
- Model/provider failure cannot affect the pure Tool contract and cannot persist a candidate.
- Studio input must remain synthetic. Secrets, account IDs, private records, browser cache, task history,
  tokens, and production snapshots are prohibited.

## Product Admission

### Core-Loop Contribution

The capability prepares a reviewable candidate for the future `record` step. This first slice is isolated
developer infrastructure and leaves the product's current quick-record loop unchanged.

### User Evidence

The product owner explicitly requested the Agent object, Tool, folder separation, and code-location
explanation on 2026-09-04.

### Default Interface and Recording Cost

There is no product UI, request, background work, required field, or recording step. Only direct imports
and localhost Studio expose the capability.

### Offline, Account, Privacy, Reversibility, and Backup

The core is deterministic and local. It accepts only caller-supplied bounded facts and has no access to
accounts, browser state, Supabase, files, network, `commitData`, exports, or backups. Its output explicitly
requires preview and confirmation. Removing it requires no data migration or cleanup.

### Verification and Removability

Pure contract tests, Mastra Tool tests, Agent registration tests, Studio registration tests, existing
tool-free Agent regressions, `npm run design:check`, full Node tests, PWA/browser gates, and
`git diff --check` are required. The isolated folders and Studio registration can be removed independently.

### Exit Condition

Keep isolated or remove if no approved Log Note or Codex adapter reuses it within 14 days, callers mistake
the proposal for a saved note, supplied facts are not traceable in output, or any privacy/dependency/quality
gate regresses.

### Admission Decision

- **Score**: `14/20`
- **Decision**: `isolated experiment`
- **Red-line check**: No raw-note rewrite, account access, external transfer, required recording step,
  direct write, backup change, Agent memory, or persistent workflow is introduced.

## Requirements

### Functional Requirements

- **FR-001**: The shared core MUST accept exactly schema version, target date, locale, and 1–30 work items
  with opaque ID, one allowed status, and non-empty summary.
- **FR-002**: Input validation MUST reject unknown fields, non-real dates, duplicate IDs, unsupported locale
  or status, per-field overflow, total text over 8,000 Unicode characters, and more than 30 items.
- **FR-003**: The core MUST normalize control characters and whitespace without silently truncating text,
  changing status, reordering items inside a status group, or inventing facts/times/actions.
- **FR-004**: Output MUST use a strict versioned schema and include kind, target date, locale, ordered source
  IDs, deterministic source fingerprint, a record candidate, and `writePolicy: "preview-required"`.
- **FR-005**: The record candidate MUST contain only `date`, empty `time`, and readable `content`, matching
  the candidate shape accepted by the existing ordinary daily Markdown merge path.
- **FR-006**: Chinese and English output MUST have equivalent information hierarchy, group only statuses
  present in the input, and identify itself as a work summary without claiming persistence.
- **FR-007**: The core MUST be framework-independent, deterministic, free of network/storage/global-state
  reads, and callable by future adapters without importing Mastra.
- **FR-008**: The Mastra Tool MUST live under `src/mastra/tools/daily-log/`, use `createTool`, publish strict
  input/output schemas, and implement the current `execute(inputData, context)` signature.
- **FR-009**: The Tool MUST check the execution context abort signal before work and MUST delegate proposal
  creation to the shared core rather than duplicating business rules.
- **FR-010**: The dedicated Agent implementation MUST live under `src/mastra/agents/daily-log/`, instantiate
  `Agent` from `@mastra/core/agent`, register exactly the daily-log Tool, disable automatic retries, and
  configure no memory or persistent storage.
- **FR-011**: The Agent instructions MUST require explicit-source factual summaries and MUST prohibit claims
  that a proposal was saved, direct writes, hidden history discovery, or fabricated activity.
- **FR-012**: The existing request-scoped structured-proposal Agent and all production AI capabilities MUST
  remain tool-free; LN-082 MUST NOT change their runtime registration or HTTP paths.
- **FR-013**: The localhost Studio entry MUST register the dedicated Agent and standalone Tool using only
  synthetic operator input and MUST keep Studio out of the product acceptance boundary.
- **FR-014**: Tests MUST cover core happy paths/limits, schema rejection, deterministic fingerprints,
  abort behavior, Tool execution, Agent Tool discovery/no memory, Studio discovery, and existing tool-free
  Agent non-regression.
- **FR-015**: Documentation MUST distinguish the shared core, Mastra Tool adapter, Agent composition, Studio
  registration, and the not-yet-built Log Note confirmation/MCP adapters, and MUST state exact code paths.

### Key Entities

- **Work Item**: One caller-supplied factual activity with an opaque ID, status (`completed`, `in-progress`,
  or `blocked`), and bounded summary.
- **Daily Log Proposal**: A deterministic, versioned, unsaved output bound to one date and source
  fingerprint, containing a quick-record-compatible candidate and explicit preview-required policy.
- **Daily Log Tool**: The Mastra adapter that validates schemas, observes cancellation, and delegates to the
  shared proposal core.
- **Daily Log Agent**: A stateless Mastra Agent configured with exactly the Daily Log Tool.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Valid synthetic input produces exactly one strict proposal whose candidate contains every
  supplied work item exactly once and no unsupported facts.
- **SC-002**: Repeating the same normalized input 100 times produces byte-for-byte identical content and
  fingerprint; the regression corpus mutates date, locale, status, ID, and summary separately and observes
  a different fingerprint for every tested mutation.
- **SC-003**: Every invalid boundary class in FR-002 is rejected before output, with zero partial results.
- **SC-004**: `listTools()` on the dedicated Agent returns exactly one Tool under its public ID and
  `getMemory()` returns `undefined`; the existing structured-proposal Agent still returns zero tools.
- **SC-005**: The Studio Mastra instance resolves the new Agent and Tool, and the Tool can execute without
  Provider credentials; no product route, UI, storage key, schema migration, or network request is added.
- **SC-006**: Focused regressions and the repository `npm run check` quality gate pass under Node 22, or any
  unrelated pre-existing failure is isolated and reported without being attributed to LN-082.

## Assumptions and Dependencies

- The caller, not the Tool, determines the device-local target date and supplies already selected work facts.
- Agent model configuration follows the existing localhost DeepSeek Studio convention; standalone Tool
  execution does not require a model or Provider credential.
- The existing quick-record candidate contract remains `date/time/content`; no persistent schema change is
  needed.
- `@mastra/core` 1.63.2 and Zod 4.4.x remain the installed canonical APIs for this slice.

## Explicitly Out of Scope

- Product UI, preview/confirmation interaction, `commitData`, account/state/fingerprint re-read, sync, undo,
  export, backup, or any actual Log Note write.
- MCP server, Codex host configuration, remote HTTP exposure, OAuth, direct Supabase write, or deployment.
- Reading Codex task history, Git history, browser data, files, calendars, private notes, or other tools.
- Agent memory, scheduled/background execution, automatic daily runs, notifications, and generalized Tool
  registries.

## Change Contract

- **Outcome**: one importable strict proposal core, one Mastra Tool, one stateless Tool-enabled Agent, and
  one localhost Studio registration, all covered by focused tests.
- **Write set**: `PROJECT_BOARD.md`, `product.md`, `ARCHITECTURE.md`, `docs/decisions/`,
  `specs/017-daily-log-agent-tool/`, `src/modules/agent-bridge/daily-log/`,
  `src/mastra/tools/daily-log/`, `src/mastra/agents/daily-log/`, `src/mastra/index.ts`, and focused tests.
- **Exclusions**: all dirty UI files, product routes, existing runtime Agent behavior, persistence, MCP,
  deployment, commit, push, and acceptance-state changes.
- **Public contracts**: strict input/output schemas, `prepareDailyLogProposal`, `prepareDailyLogTool`,
  `createDailyLogAgent`, and Studio registration keys.
- **Invariants**: preview before write, zero direct writes, existing Agents tool-free, account/offline/backup
  behavior unchanged, and no secrets/private fixtures.
- **Verification**: focused Node tests, existing Mastra regressions, full `npm run check`, scoped diff, and
  Sigo review of generated documentation.
- **Open evidence**: real Provider behavior, product confirmation/commit integration, MCP/Codex discovery,
  deployment, and 14-day adoption are not claimed by this slice.
