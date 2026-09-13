/** @fileoverview Defines the local account-data recovery boundary consumed by application code. */

import type { AccountDataPayload, LocalRecoveryState, LocalWriteResult } from "@/shared/contracts";

export interface LocalRecoveryPort {
  load(key: string): LocalRecoveryState;
  save(key: string, state: AccountDataPayload, allowWrite?: boolean): LocalWriteResult;
}
