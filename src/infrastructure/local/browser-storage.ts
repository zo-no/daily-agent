/** @fileoverview Adapts browser localStorage to the account-data recovery port. */

import type { AccountDataPayload, LocalRecoveryState, LocalWriteResult } from "@/shared/contracts";
import { loadStoredState, persistStoredState } from "@/lib/storage-state.mjs";
import { createInitialState, restoreState } from "@/domain/account-data";
import type { LocalRecoveryPort } from "@/application/account-data";

/** Keeps browser storage details behind the application-owned recovery contract. */
export const browserStorage: LocalRecoveryPort = {
  load(key: string): LocalRecoveryState {
    return loadStoredState(() => window.localStorage, key, createInitialState, restoreState) as LocalRecoveryState;
  },
  save(key: string, state: AccountDataPayload, allowWrite = true): LocalWriteResult {
    return persistStoredState(() => window.localStorage, key, state, { allowWrite }) as LocalWriteResult;
  }
};
