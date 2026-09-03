# ADR-0004: Isolate the current-domain daily summary capability

- **Status**: Accepted for LN-079 implementation
- **Date**: 2026-09-03
- **Board item**: `LN-079`
- **Requirement**: `REQ-20260903-01`

## Context

Log Note already exposes a confirmed, session-only seven-day domain summary through
`/api/organize/domain-review`. Its model contract deliberately requires an exact seven-day window.
LN-079 needs a different scope: the selected configured domain and the device-local current day only.
The page also contains an unrelated dirty plan-versus-diary experiment that must not become part of
the daily-domain product contract.

## Decision

Implement LN-079 as an isolated `domain-daily-summary` capability with its own model, browser Provider,
Route Handler, UI state machine, selectors, translations, tests, and public endpoint. The capability
will reuse the approved `runDeepSeekProposal` and embedded Mastra Agent/Workflow boundary: one
request-scoped Agent, strict structured output, one generate step, one normalizer step, no tools,
memory, retries, application storage, or workflow snapshots.

The browser derives and binds the current account, domain, local date, locale, and normalized source
fingerprint. The public request sends only the explicitly disclosed bounded source whitelist. Results
remain page-session state and are never written, synchronized, exported, backed up, or cached.

For the owner-requested bounded debugging task, Mastra Studio registers the same daily-summary Agent
and two-step Workflow through `src/mastra/index.ts`. Studio accepts only operator-supplied synthetic
input and reuses the production schema, normalizer, and generic Agent/Workflow factories. It has no
account lookup, browser storage, Supabase access, tools, Agent memory, workflow snapshot, or write path.

## Consequences

- The accepted seven-day endpoint and evidence remain unchanged and independently removable.
- Daily schema and safety validation intentionally duplicate a small amount of weekly logic so a
  one-day contract cannot weaken the exact-seven-day boundary.
- The `mastra` CLI is a development-only dependency used to host Studio on localhost. No migration,
  persistence, background job, standalone production Mastra service, or plan comparison is introduced.
- Removing the daily component, endpoint, capability, tests, copy, and style leaves existing records,
  caches, backups, and weekly behavior untouched.

## Rejected alternatives

- Add a day/week mode to the weekly endpoint: couples two independently scoped contracts and expands
  its accepted validator.
- Send a one-day window to the weekly endpoint: violates its exact-seven-day invariant.
- Reuse the dirty plan-versus-diary experiment: violates the current-domain/no-plan scope and would
  make its unrelated files part of the accepted surface.
