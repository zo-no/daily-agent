# Log Note feature specifications

Each directory below is one Spec Kit feature package for exactly one existing `PROJECT_BOARD.md`
item. Create it with `$speckit-specify`, record the `LN-###` board ID, and continue through
`$speckit-plan`, `$speckit-tasks`, and `$speckit-analyze` before implementation.

These files refine requirements and implementation evidence. They do not replace the product or
board truth sources and cannot mark a task Accepted.

## Active package mapping

- `specs/007-domain-insights/` refines `LN-010 Phase 1`: local, read-only 30-day domain trends and bounded reflection prompts. The persisted experiment loop remains `LN-010 Phase 2` and is not authorized by this package.
- `specs/008-domain-weekly-summary/` refines `LN-074 Rework 16`: an explicitly confirmed,
  session-only AI summary of the current domain's latest seven local calendar days. It does not
  weaken or replace the local-only `LN-010 Phase 1` contract.
