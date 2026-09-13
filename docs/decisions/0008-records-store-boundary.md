# ADR-0008: Introduce an account-scoped records store for client subscriptions

- **Status**: Implemented in working tree; verification and owner review pending
- **Date**: 2026-09-12
- **Scope**: `REQ-20260911-01`, records synchronization only

## Context

`LogNoteDataProvider` owns the account lifecycle, local-first persistence, full
document reconciliation, record and plan streams, retries, and conflict UI. A
record update therefore caused consumers that only needed record data to depend
on the whole Context value. The records stream also needs an account-scoped
subscription boundary while the plan stream remains a separate future slice.

## Decision

Introduce a per-provider Zustand vanilla store at
`src/app/_stores/records-store.ts`. The store owns the in-memory record
state (`entries`) and the record stream state (`cursor`, `base`,
`versions`, `outbox`, and `conflicts`). Components read it with selectors through
`RecordsStoreContext` and `useRecordsStore`.

The store does **not** own localStorage, Supabase clients, access tokens,
attachments, or cloud write policy. `commitData` remains the single write entry;
the existing Provider performs the local write and then publishes the successful
result into the store. The aggregate payload is derived from this record state
and the remaining non-record state, rather than retaining another entries array. The existing sync protocol and CAS adapters remain
authoritative for network behavior.

The store is reset with the current account generation whenever the auth scope
changes. It is not persisted with Zustand `persist`, and no global singleton is
created. A later plan store must use the same account lifecycle and must not add
a second aggregate persistence path.

## Consequences

- Record consumers can migrate to selector subscriptions without changing the
  `AccountDataPayload` backup format or local-first semantics.
- The Provider remains a compatibility and orchestration layer during this
  slice; record sync controller extraction is a follow-up migration step.
- Account data restoration still updates the aggregate payload through the
  existing local recovery boundary before the store state changes.
- Store-level tests and selector migrations must preserve account isolation,
  conflict visibility, and offline local writes.

## Removal condition

If selector measurements show no reduction in unnecessary record renders after
the remaining consumers migrate, remove the store and its context without
changing the existing persistence or synchronization modules.

## Review limits

This is the first records migration, not completion of the sync controller
extraction or the account and plan stores. The compatibility data Context still
subscribes to the aggregate payload; no render-performance improvement is claimed
for its existing consumers. Store-only consumers can select entries independently
of stream updates. The existing persistence and synchronization paths remain in
the Provider, with no new storage backend or network writer.

Focused store tests execute the real vanilla store and cover instance isolation,
account reset, record subscriptions during stream changes, and action availability
after reset. They do not prove cloud convergence or browser account switching.
