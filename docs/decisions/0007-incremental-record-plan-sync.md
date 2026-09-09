# ADR-0007: Use incremental record and plan synchronization streams

- **Status**: Proposed for REQ-20260907 incremental sync
- **Date**: 2026-09-09

## Context

The existing account sync writes one complete text document through a document
revision CAS. A small record edit therefore transfers the whole account and a
concurrent edit pauses the entire account, even when the two devices changed
different entries. Records and plans need independent progress, durable offline
outbox state, and a merge decision that never silently overwrites a field.

## Decision

Store records and plans in separate account-scoped item tables and append every
accepted mutation to a shared, server-sequenced change log. Clients keep one
cursor, baseline, and coalesced outbox per stream. Push uses item-version CAS;
pull uses the server cursor. A field-level three-way merge combines independent
changes, while same-field edits and delete-versus-edit cases remain in the
settings conflict box. Deletes are tombstones and can be resolved back to a
payload.

The legacy document remains the compatibility path for structure, settings,
older clients, and bootstrap reconciliation. Record attachments are always
kept as device-local references and are not included in stream payloads.

## Consequences

Local commits remain synchronous and network-independent. Normal record or plan
edits upload bounded deltas, while structure and settings continue to use the
existing document CAS. Realtime may wake the coordinator later; cursor pulls
remain the source of truth. The stream can be removed behind
`NEXT_PUBLIC_LOG_NOTE_INCREMENTAL_SYNC=0` while the legacy path remains.

## Migration and removal

The migration creates item tables, RLS, CAS RPCs, and bootstrap change rows from
existing documents. The client falls back to legacy reconciliation when the
stream schema is unavailable. Once old protocol traffic is below the agreed
seven-day threshold, the legacy write compatibility can be removed in a later
ADR; this decision does not authorize that removal.
