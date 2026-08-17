/**
 * @fileoverview Pure account-scoped cache keys and conservative cloud reconciliation decisions.
 */

import { prepareTextCloudDocument } from "./cloud-document.mjs";

export const ACCOUNT_DATA_STORAGE_PREFIX = "log-note:data:user:";
export const ACCOUNT_SYNC_STORAGE_PREFIX = "log-note:sync:user:";

function cleanUserId(userId) {
  const value = String(userId || "").trim();
  if (!value) throw new Error("Authenticated user ID is required");
  return encodeURIComponent(value);
}

export function accountDataStorageKey(userId) {
  return `${ACCOUNT_DATA_STORAGE_PREFIX}${cleanUserId(userId)}:v1`;
}

export function accountSyncStorageKey(userId) {
  return `${ACCOUNT_SYNC_STORAGE_PREFIX}${cleanUserId(userId)}:v1`;
}

export function textStateFingerprint(state) {
  const canonical = canonicalJson(prepareTextCloudDocument(state).payload);
  return `v2:${canonical.length}:${fnv1a64(canonical, 0xcbf29ce484222325n)}:${fnv1a64(canonical, 0x84222325cbf29ce4n)}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1a64(value, seed) {
  let hash = seed;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

export function readSyncMetadata(rawValue, userId) {
  if (!rawValue) return null;
  try {
    const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
    const revision = Number(parsed?.revision);
    const fingerprint = typeof parsed?.fingerprint === "string" ? parsed.fingerprint : "";
    if (String(parsed?.userId || "") !== String(userId || "") || !Number.isInteger(revision) || revision < 1 || !fingerprint) return null;
    return { userId: String(userId), revision, fingerprint };
  } catch {
    return null;
  }
}

export function makeSyncMetadata(userId, revision, fingerprint) {
  return { userId: String(userId), revision: Number(revision), fingerprint: String(fingerprint) };
}

/**
 * Cloud documents intentionally contain no image references. When cloud text is
 * applied on a device, keep that device's image references on surviving entries.
 */
export function mergeCloudTextWithLocalAttachments(localState, cloudState) {
  const localAttachments = new Map(
    (localState?.entries || []).map((entry) => [entry.id, entry.attachments || []])
  );
  return {
    ...cloudState,
    entries: (cloudState?.entries || []).map((entry) => ({
      ...entry,
      attachments: localAttachments.get(entry.id) || []
    }))
  };
}

/** Never chooses an overwrite when the last shared revision cannot prove it is safe. */
export function reconcileAccountDocument({ localState, localExists, cloudDocument, metadata }) {
  if (!cloudDocument) {
    return localExists
      ? { action: "save-local", expectedRevision: null }
      : { action: "create-local", expectedRevision: null };
  }
  if (!localExists) return { action: "use-cloud", expectedRevision: cloudDocument.revision };

  const localFingerprint = textStateFingerprint(localState);
  const cloudFingerprint = textStateFingerprint(cloudDocument.payload);
  if (localFingerprint === cloudFingerprint) {
    return { action: "use-local", expectedRevision: cloudDocument.revision, fingerprint: localFingerprint };
  }
  if (!metadata) return { action: "conflict", expectedRevision: cloudDocument.revision };
  if (metadata.revision === cloudDocument.revision) {
    return metadata.fingerprint === localFingerprint
      ? { action: "use-local", expectedRevision: cloudDocument.revision, fingerprint: localFingerprint }
      : { action: "save-local", expectedRevision: cloudDocument.revision };
  }
  if (metadata.revision < cloudDocument.revision && metadata.fingerprint === localFingerprint) {
    return { action: "use-cloud", expectedRevision: cloudDocument.revision };
  }
  return { action: "conflict", expectedRevision: cloudDocument.revision };
}
