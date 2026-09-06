# Log Note feature specifications

Each directory below is one Spec Kit feature package for exactly one existing `PROJECT_BOARD.md`
item. New packages use `Requirement: REQ-YYYYMMDD-NN`; historical packages keep their original
`LN-###` value as `Legacy Board Item` and are not renumbered. Create the package with
`$speckit-specify`, then continue through `$speckit-plan`, `$speckit-tasks`, and `$speckit-analyze`
before implementation.

These files refine requirements and implementation evidence. They do not replace the product or
board truth sources and cannot mark a task Accepted.

## Metadata rule

- New `spec.md` files own one `Requirement`; historical `spec.md` files own one `Legacy Board Item`
  and do not receive a synthetic requirement. A package that already has both keeps exactly that
  one-to-one mapping. New package directories use `<Requirement>-<feature-slug>`; the slug is for
  navigation and does not define another numbering sequence.
- `plan.md`, `tasks.md`, and checklists repeat only the `Requirement` when standalone navigation
  needs it; they do not add a second primary ID.
- Existing `LN-###` values in requirements, evidence, commits, and board rows remain unchanged.
- Packages created before this rule was adopted may still show legacy headers; migrate them only
  when their owning task is resumed, without rewriting body references.

## Active package mapping

- `specs/007-domain-insights/` refines `LN-010 Phase 1`: local, read-only 30-day domain trends and bounded reflection prompts. The persisted experiment loop remains `LN-010 Phase 2` and is not authorized by this package.
- `specs/008-domain-weekly-summary/` refines `LN-074 Rework 16`: an explicitly confirmed,
  session-only AI summary of the current domain's latest seven local calendar days. It does not
  weaken or replace the local-only `LN-010 Phase 1` contract.
- `specs/011-ai-template-evolution/` refines `LN-077`: a draft, isolated proposal for zero-request
  local defaults, one-template creation, conservative existing-template patches, and a separately
  gated Agent structure package. Real-note platform use and implementation remain blocked by the
  board dependencies and product-source updates recorded in the package.
- `specs/012-mastra-ai-consolidation/` refines `LN-074 Rework 20`: migrate all five existing remote
  AI capabilities to one embedded Mastra Agent/Workflow boundary and remove superseded direct
  generation and hand-written provider execution without changing public routes or product flows.
- `specs/013-composer-content-improvement/` refines `LN-078`: place the existing Hero inside the
  ordinary free-text composer as a one-shot content-improvement control, preview the untrusted
  candidate in the same writing area, and require explicit draft use plus the existing `Done` save.
- `specs/REQ-20260903-01-domain-daily-summary/` refines `LN-079`: add an explicitly confirmed, session-only
  Mastra summary of the selected domain's device-local-today ordinary and periodic records between
  the local 30-day chart and the independent seven-day summary; plans and persistence stay excluded.
- `specs/REQ-20260905-01-agent-mcp-bridge/` refines `LN-084`: provide an account-bound local MCP/Skill bridge
  with bounded reads, proposal-first writes, explicit confirmation, revision/fingerprint checks,
  and browser-owned commits; real Codex/Claude discovery and account evidence remain separate gates.
- `specs/REQ-20260905-02-agent-plan-record-authoring/` refines `LN-085`: extend the accepted bridge with
  single-target plan and record CRUD proposals while preserving existing schemas, raw text,
  category allowlists, local-first commits, and backup compatibility.
- `specs/REQ-20260905-03-google-calendar-realtime/` refines `LN-086`: add syncToken-based near-real-time Calendar
  changes, managed-event identity, tombstones, etag conflicts, revocation/account isolation, and
  conditional push/webhook deployment gates without changing record schema or MCP behavior.
- `specs/REQ-20260906-01-mobile-app-container/` refines `LN-037`: package the existing PWA in
  maintainable Android/iOS containers without creating a second product data or auth path.
