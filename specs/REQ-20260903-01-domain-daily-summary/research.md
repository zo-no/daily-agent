# Research: Current-Domain Daily Summary

## Decision 1: Use an isolated one-day public contract

**Decision**: Add `/api/organize/domain-daily-summary` and dedicated daily model, Provider, route, and
UI state. Keep `/api/organize/domain-review` and all seven-day modules unchanged.

**Rationale**: The accepted weekly sanitizer requires an exact inclusive seven-day window and the
weekly prompt names seven days. Widening it would weaken two feature contracts and make daily and
weekly stale-state evidence indistinguishable.

**Alternatives considered**:

- Add `period: day|week` to the weekly endpoint: rejected because request-controlled mode expands the
  accepted endpoint and couples two independently removable surfaces.
- Send one day through `windowStart === windowEnd`: rejected because the current strict validator
  correctly rejects it.
- Reuse the dirty global plan/day-review trial: rejected because LN-079 explicitly excludes plans and
  requires current-domain selection.

## Decision 2: Reuse the existing embedded Mastra execution boundary

**Decision**: Route the new server capability through `runDeepSeekProposal` with fixed capability ID
`domain-daily-summary`, one request-scoped Agent, strict structured output, one generate step, one
project normalizer step, no tools, no memory, no retry, and no persistent snapshot.

**Rationale**: The repository already has the approved runtime boundary and provider safeguards.
Mastra's official documentation describes schema-bound sequential Workflow steps as the predictable,
auditable mechanism for known flows and supports Agent calls inside Workflow steps. The daily summary
has a known generate→validate sequence, not an open-ended task or durable process.

**Alternatives considered**:

- Add the `mastra` CLI and a Studio-only `index.ts`: rejected because local tooling is not required by
  product runtime and would expand package/lockfile/deployment scope.
- Create a standalone Mastra server: rejected because it duplicates auth, routing, deployment, and
  timeout boundaries.
- Add Agent memory, tools, dynamic workflows, or scheduling: rejected because the result is
  session-only and the model must never read or write beyond the explicit request.

**Primary references**:

- [Mastra workflow overview](https://mastra.ai/ai-workflows)
- [Mastra structured-output migration guidance](https://mastra.ai/blog/migration-guide-streaming)
- Repository boundary: `src/mastra/index.mjs`, `src/mastra/agents/structured-proposal-agent.mjs`,
  `src/mastra/workflows/structured-proposal-workflow.mjs`, and `src/lib/deepseek-model.mjs`

## Decision 3: Derive today locally and bind every result to a complete scope

**Decision**: The browser computes the device-local `YYYY-MM-DD`, selects category members of the
selected configured domain, classifies periodic records from the current template definition, and
creates an in-memory fingerprint from the exact normalized source set. The result owner is
`accountId + domainId + domainName + date + locale + sourceFingerprint`.

**Rationale**: Authentication permits route use but does not prove that client-submitted text belongs
to a domain. Selection therefore stays inside the already account-isolated browser payload, and stale
result rejection must cover every value that can change meaning while a request is in flight.

**Alternatives considered**:

- Have the server fetch the account document: rejected because it introduces a second read path,
  revision semantics, and unnecessary access to the full document.
- Bind only account/domain/date: rejected because edits, recategorization, template-type changes,
  renames, and locale changes could display a response for a different source set.
- Check the date only on initial mount: rejected because midnight may pass while the report remains
  open; schedule the next boundary and refresh on focus/visibility.

## Decision 4: Count local candidates but send only strict requestable sources

**Decision**: The visible total and ordinary/periodic split count valid local-today records whose
current category belongs to the selected domain. Transmission additionally requires a valid unique
bounded ID and valid empty/`HH:mm` time. Invalid or duplicate transport sources are omitted
deterministically and included in the disclosed omitted count; after stable newest-first ordering,
only the newest 80 are sent. If no source is requestable, the UI performs no request.

**Rationale**: The local fact line should reflect the user's selected domain while the public API must
never silently repair malformed identifiers or time values. Explicit omission preserves both truths.

**Alternatives considered**:

- Count only the newest 80: rejected because the visible today total would become a transport count.
- Coerce malformed IDs/times: rejected because it invents source identity and weakens grounding.
- Reject the whole local report: rejected because one malformed source must not disable the existing
  chart or hide otherwise valid local counts.

## Decision 5: Require source IDs for validation but hide them from the page

**Decision**: The model returns `overviewEntryIds` plus one or more `entryIds` for each theme. The
server and browser validate that every visible section references only sources from the request; the
React view renders only overview/title/summary and never IDs or source text.

**Rationale**: A claim of grounding needs machine-checkable source coverage. Requiring references for
the overview closes a gap in the weekly precedent while keeping internal identifiers out of visible
output. IDs prove coverage and allowlisting, not semantic truth; the fixed prompt limits claims and
the 14-day owner review supplies real reconciliation evidence.

**Alternatives considered**:

- Return prose without IDs: rejected because unsupported themes could not be deterministically
  rejected.
- Render links or excerpts: rejected because it duplicates record browsing and violates the quiet
  summary surface.
- Partially keep valid themes from an invalid result: rejected because the feature requires whole-
  result rejection.

## Decision 6: Keep daily and weekly lifecycle state independent

**Decision**: Implement a daily-specific inline component and DOM/i18n namespace, using the weekly
state machine only as reference. Daily success, retry, abort, and date invalidation cannot mutate or
reuse weekly state.

**Rationale**: LN-079 appears immediately before the weekly section but has a different date scope,
disclosure, endpoint, and freshness boundary. Shared state would make switching and late-response
behavior harder to prove.

**Alternatives considered**:

- One generic summary component with mode props: rejected for this slice because it requires changing
  the already accepted weekly component and broadens regression scope.
- Show both inside one card: rejected because the page contract requires an open-paper hierarchy and
  distinct secondary actions.

## Decision 7: Make the precise privacy statement durable

**Decision**: Extend the existing optional-AI policy paragraphs in English and Chinese to state that
daily domain summary sends only current-domain/today bounded record text (80 records × 4,000 Unicode
characters), excludes plans and non-selected context, and is unconditionally session-only/no-write.

**Rationale**: The current policy truthfully covers optional domain summaries in general, but its
“temporary unless applied” wording spans write-capable tools and does not state that this result can
never be applied or saved. The in-product disclosure and public policy should agree.

**Alternatives considered**:

- Rely on inline disclosure only: rejected because durable privacy documentation is required for a
  new personal-text transfer boundary.
- Rewrite the whole policy: rejected because only one precise addition is required and the file has
  unrelated current edits that must be preserved.
