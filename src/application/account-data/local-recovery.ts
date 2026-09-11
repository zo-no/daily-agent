import type { AccountDataPayload, LocalRecoveryState, LocalWriteResult } from "@/shared/contracts";
import type { LocalRecoveryPort } from "./ports";

export function loadLocalAccountData(port: LocalRecoveryPort, key: string): LocalRecoveryState {
  return port.load(key);
}

export function saveLocalAccountData(
  port: LocalRecoveryPort,
  key: string,
  state: AccountDataPayload,
  allowWrite = true
): LocalWriteResult {
  return port.save(key, state, allowWrite);
}
