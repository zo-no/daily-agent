# Research: Current-cycle OKR detail and progress review

## Decision 1: Extend the existing Goal payload

**Decision**: Add optional `keyResults` to the normalized Goal and keep `entries` as the canonical raw record source.

**Rationale**: Existing goals and backups already flow through `goal-model.mjs` and `data.mjs`. Optional fields preserve old data and avoid a parallel store.

**Alternatives considered**: A separate OKR store was rejected because it would duplicate ownership and complicate backup/account isolation.

## Decision 2: Treat R as derived evidence

**Decision**: A result record is a reference to an existing entry, with no duplicate raw-note entity in the first slice.

**Rationale**: Existing entries already carry date, time, and content. Derived references preserve raw-note integrity and keep quick recording unchanged.

**Alternatives considered**: Independently authored R entities are deferred until user evidence shows that ordinary records cannot express the needed review.

## Decision 3: Reuse the established AI boundary

**Decision**: Use a same-origin authenticated route, bounded allowlist, request fingerprint, strict response schema, and ephemeral client state.

**Rationale**: This matches the existing daily summary and plan-record review contracts and preserves local-first/no-write behavior.

**Alternatives considered**: Generic chat or background analysis was rejected because it widens data scope and weakens explicit confirmation.
