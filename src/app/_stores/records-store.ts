/**
 * @fileoverview Keeps record entries and incremental-sync state isolated to one provider account session.
 */

import { createStore, type StoreApi } from "zustand/vanilla";
import type {
  AccountEntry,
  PlanBlock,
  SyncEntityKind,
  SyncMutation,
  SyncOperation
} from "@/shared/contracts";

type SyncItem = AccountEntry | PlanBlock;

/** Captures the local and remote candidates until the user resolves the conflict. */
type RecordsStreamConflict = {
  entityId: string;
  conflicts: string[];
  base: SyncItem | null;
  local: SyncItem | null;
  remote: SyncItem | null;
  kind?: SyncEntityKind;
  status?: "conflict";
  current?: SyncItem | null;
  serverSeq?: number;
  itemVersion?: number;
  operation?: SyncOperation;
};

export interface RecordsStreamState {
  cursor: number;
  base: Record<string, SyncItem | null>;
  versions: Record<string, number>;
  outbox: SyncMutation[];
  conflicts: RecordsStreamConflict[];
}

export interface RecordsStoreState {
  accountId: string | null;
  /** Monotonic session token used to reject results from a previous account. */
  generation: number;
  entries: AccountEntry[];
  /** Incremental record-stream state; plan state remains owned by the provider for now. */
  stream: RecordsStreamState | null;
  /** Replaces only the selected record collection and preserves the store instance. */
  setEntries: (entries: AccountEntry[]) => void;
  /** Replaces the record stream snapshot without changing record entries. */
  setStream: (stream: RecordsStreamState | null) => void;
  /** Clears account-owned records and stream data before a new session is hydrated. */
  reset: (accountId: string | null, generation: number) => void;
}

export type RecordsStore = StoreApi<RecordsStoreState>;

/** Creates an isolated store instance for one LogNoteDataProvider. */
export function createRecordsStore(
  accountId: string | null = null,
  generation = 0
): RecordsStore {
  return createStore<RecordsStoreState>((set) => ({
    accountId,
    generation,
    entries: [],
    stream: null,
    setEntries: (entries) => set({ entries }),
    setStream: (stream) => set({ stream }),
    reset: (nextAccountId, nextGeneration) => set({
      accountId: nextAccountId,
      generation: nextGeneration,
      entries: [],
      stream: null
    })
  }));
}
