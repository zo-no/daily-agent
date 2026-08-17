/**
 * @fileoverview 将附件 Blob 独立保存在 IndexedDB，避免二进制进入 localStorage。
 */

import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES,
  SUPPORTED_IMAGE_TYPES,
  normalizeAttachmentRef
} from "./attachment-model.mjs";

const DATABASE_NAME = "log-note-attachments";
const DATABASE_VERSION = 1;
const STORE_NAME = "images";
export const ATTACHMENT_TOTAL_LIMIT_ERROR = "attachment_total_limit";
let activeOwnerId = "legacy";

export function setAttachmentStorageOwner(ownerId) {
  activeOwnerId = String(ownerId || "legacy");
}

function recordBelongsToOwner(record, ownerId) {
  return String(record?.ownerId || "legacy") === ownerId;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction was aborted"));
  });
}

function openAttachmentDatabase(indexedDb = globalThis.indexedDB) {
  if (!indexedDb) return Promise.reject(new Error("IndexedDB is unavailable"));
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open attachment storage"));
    request.onblocked = () => reject(new Error("Attachment storage upgrade is blocked"));
  });
}

async function withStore(mode, callback) {
  const database = await openAttachmentDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const result = await callback(transaction.objectStore(STORE_NAME), transaction);
    await transactionDone(transaction);
    return result;
  } finally {
    database.close();
  }
}

async function listAttachmentRecords() {
  return withStore("readonly", async (store) => requestResult(store.getAll()));
}

function normalizeStoredAttachment(blob, ref) {
  if (!(blob instanceof Blob)) throw new Error("Attachment must be a Blob");
  const normalized = normalizeAttachmentRef({ ...ref, bytes: blob.size, mediaType: blob.type || ref?.mediaType });
  if (!SUPPORTED_IMAGE_TYPES.has(blob.type)) throw new Error("Only JPEG, PNG, and WebP images are supported");
  if (blob.size > MAX_ATTACHMENT_BYTES) throw new Error("Image exceeds the 5 MiB limit");
  return normalized;
}

function attachmentTotalLimitError() {
  const error = new Error("Local image storage exceeds the 50 MiB limit");
  error.code = ATTACHMENT_TOTAL_LIMIT_ERROR;
  return error;
}

export async function attachmentStorageSummary() {
  const ownerId = activeOwnerId;
  const records = (await listAttachmentRecords()).filter((record) => recordBelongsToOwner(record, ownerId));
  return {
    count: records.length,
    bytes: records.reduce((sum, item) => sum + (Number(item.bytes) || item.blob?.size || 0), 0)
  };
}

export async function getAttachmentBlob(id) {
  const ownerId = activeOwnerId;
  const record = await withStore("readonly", async (store) => requestResult(store.get(String(id))));
  return recordBelongsToOwner(record, ownerId) && record?.blob instanceof Blob ? record.blob : null;
}

export function projectedAttachmentStorageBytes(records, id, nextBytes) {
  const current = (records || []).reduce((sum, item) => sum + (Number(item.bytes) || item.blob?.size || 0), 0);
  const previous = (records || []).find((item) => String(item.id) === String(id));
  return current - (Number(previous?.bytes) || previous?.blob?.size || 0) + Number(nextBytes || 0);
}

export async function putAttachmentBlob(blob, ref) {
  const ownerId = activeOwnerId;
  const normalized = normalizeStoredAttachment(blob, ref);

  return withStore("readwrite", async (store) => {
    const records = (await requestResult(store.getAll())).filter((record) => recordBelongsToOwner(record, ownerId));
    const total = projectedAttachmentStorageBytes(records, normalized.id, blob.size);
    if (total > MAX_ATTACHMENT_TOTAL_BYTES) throw attachmentTotalLimitError();
    store.put({ ...normalized, ownerId, blob });
    return normalized;
  });
}

/** Writes a fully validated replacement set without counting blobs removed after state commit. */
export async function putReplacementAttachmentBlobs(files) {
  const ownerId = activeOwnerId;
  const records = (files || []).map(({ blob, ref }) => ({ ...normalizeStoredAttachment(blob, ref), ownerId, blob }));
  const total = records.reduce((sum, item) => sum + item.bytes, 0);
  if (total > MAX_ATTACHMENT_TOTAL_BYTES) throw attachmentTotalLimitError();
  return withStore("readwrite", async (store) => {
    records.forEach((record) => store.put(record));
    return records.map(({ blob, ...ref }) => ref);
  });
}

export async function deleteAttachmentBlobs(ids) {
  const ownerId = activeOwnerId;
  const uniqueIds = [...new Set((ids || []).map(String).filter(Boolean))];
  if (!uniqueIds.length) return 0;
  return withStore("readwrite", async (store) => {
    const records = await Promise.all(uniqueIds.map((id) => requestResult(store.get(id))));
    const ownedIds = uniqueIds.filter((_id, index) => recordBelongsToOwner(records[index], ownerId));
    ownedIds.forEach((id) => store.delete(id));
    return ownedIds.length;
  });
}

export async function removeOrphanAttachmentBlobs(keepIds) {
  const ownerId = activeOwnerId;
  const keep = new Set((keepIds || []).map(String));
  return withStore("readwrite", async (store) => {
    const records = await requestResult(store.getAll());
    const orphanIds = records.filter((record) => recordBelongsToOwner(record, ownerId)).map((item) => item.id).filter((id) => !keep.has(String(id)));
    orphanIds.forEach((id) => store.delete(id));
    return orphanIds.length;
  });
}

/** Assigns only unowned legacy blobs referenced by the explicitly adopted legacy state. */
export async function claimLegacyAttachmentBlobs(ids) {
  const ownerId = activeOwnerId;
  const uniqueIds = [...new Set((ids || []).map(String).filter(Boolean))];
  if (!uniqueIds.length) return { ownerId, ids: [] };
  return withStore("readwrite", async (store) => {
    const claimedIds = [];
    for (const id of uniqueIds) {
      const record = await requestResult(store.get(id));
      if (record && !record.ownerId) {
        store.put({ ...record, ownerId });
        claimedIds.push(id);
      }
    }
    return { ownerId, ids: claimedIds };
  });
}

/** Rolls back only blobs claimed by the matching two-phase legacy adoption. */
export async function releaseClaimedLegacyAttachmentBlobs(claim) {
  const ownerId = String(claim?.ownerId || "");
  const ids = [...new Set((claim?.ids || []).map(String).filter(Boolean))];
  if (!ownerId || !ids.length) return 0;
  return withStore("readwrite", async (store) => {
    let released = 0;
    for (const id of ids) {
      const record = await requestResult(store.get(id));
      if (record && record.ownerId === ownerId) {
        const legacyRecord = { ...record };
        delete legacyRecord.ownerId;
        store.put(legacyRecord);
        released += 1;
      }
    }
    return released;
  });
}
