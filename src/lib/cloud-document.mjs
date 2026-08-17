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
  return ["42P01", "PGRST202", "PGRST205"].includes(String(error?.code || ""));
}

export function cloudRevisionConflict(error) {
  return String(error?.code || "") === "40001";
}
