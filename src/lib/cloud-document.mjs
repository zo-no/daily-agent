/**
 * @fileoverview Pure helpers for the explicit, text-only cloud document boundary.
 */

import { normalizeState, restoreState } from "./data.mjs";

export const CLOUD_PROTOCOL_VERSION = 1;

export function prepareTextCloudDocument(rawState) {
  const state = normalizeState(rawState);
  let omittedImages = 0;
  const payload = {
    ...state,
    entries: state.entries.map((entry) => {
      omittedImages += entry.attachments.length;
      return { ...entry, attachments: [] };
    })
  };
  return {
    payload,
    omittedImages,
    dataVersion: payload.version,
    structureSchemaVersion: payload.structureSchemaVersion
  };
}

export function normalizeCloudDocument(row) {
  if (!row) return null;
  const revision = Number(row.revision);
  if (!row.user_id || !Number.isInteger(revision) || revision < 1) {
    throw new Error("Cloud document metadata is invalid");
  }
  return {
    userId: String(row.user_id),
    revision,
    payload: restoreState(row.payload),
    updatedAt: String(row.updated_at || ""),
    deviceId: row.device_id ? String(row.device_id) : ""
  };
}

export function cloudSchemaUnavailable(error) {
  return ["42P01", "42883", "PGRST202", "PGRST205"].includes(String(error?.code || ""));
}

export function cloudRevisionConflict(error) {
  return String(error?.code || "") === "40001";
}

/** Network failures can occur while the browser still reports itself online. */
export function cloudNetworkUnavailable(error) {
  const code = String(error?.code || "").toUpperCase();
  const status = Number(error?.status || error?.statusCode || 0);
  if (["ABORT_ERR", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH", "EAI_AGAIN"].includes(code)) return true;
  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  const message = String(error?.message || error || "").toLowerCase();
  return error?.name === "AbortError"
    || /fetch failed|failed to fetch|networkerror|load failed|connection (?:reset|refused|closed|timed? ?out)|request timed? ?out|dns|offline/.test(message)
    || /\bnetwork(?: request)? (?:failed|error|unavailable|timeout)\b/.test(message);
}

/** Maps all cloud failures to the user-visible sync state without exposing provider details. */
export function cloudSyncStatus(error, online = true) {
  if (!online) return "offline";
  if (cloudSchemaUnavailable(error)) return "setup-required";
  if (cloudRevisionConflict(error)) return "conflict";
  return cloudNetworkUnavailable(error) ? "retrying" : "error";
}
