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

export function openAttachmentDatabase(indexedDb = globalThis.indexedDB) {
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

export async function listAttachmentRecords() {
  return withStore("readonly", async (store) => requestResult(store.getAll()));
}

export async function attachmentStorageSummary() {
  const records = await listAttachmentRecords();
  return {
    count: records.length,
    bytes: records.reduce((sum, item) => sum + (Number(item.bytes) || item.blob?.size || 0), 0)
  };
}

export async function getAttachmentBlob(id) {
  const record = await withStore("readonly", async (store) => requestResult(store.get(String(id))));
  return record?.blob instanceof Blob ? record.blob : null;
}

export function projectedAttachmentStorageBytes(records, id, nextBytes) {
  const current = (records || []).reduce((sum, item) => sum + (Number(item.bytes) || item.blob?.size || 0), 0);
  const previous = (records || []).find((item) => String(item.id) === String(id));
  return current - (Number(previous?.bytes) || previous?.blob?.size || 0) + Number(nextBytes || 0);
}

export async function putAttachmentBlob(blob, ref) {
  if (!(blob instanceof Blob)) throw new Error("Attachment must be a Blob");
  const normalized = normalizeAttachmentRef({ ...ref, bytes: blob.size, mediaType: blob.type || ref?.mediaType });
  if (!SUPPORTED_IMAGE_TYPES.has(blob.type)) throw new Error("Only JPEG, PNG, and WebP images are supported");
  if (blob.size > MAX_ATTACHMENT_BYTES) throw new Error("Image exceeds the 5 MiB limit");

  return withStore("readwrite", async (store) => {
    const records = await requestResult(store.getAll());
    const total = projectedAttachmentStorageBytes(records, normalized.id, blob.size);
    if (total > MAX_ATTACHMENT_TOTAL_BYTES) throw new Error("Local image storage exceeds the 50 MiB limit");
    store.put({ ...normalized, blob });
    return normalized;
  });
}

export async function deleteAttachmentBlob(id) {
  return withStore("readwrite", async (store) => {
    store.delete(String(id));
    return true;
  });
}

export async function deleteAttachmentBlobs(ids) {
  const uniqueIds = [...new Set((ids || []).map(String).filter(Boolean))];
  if (!uniqueIds.length) return 0;
  return withStore("readwrite", async (store) => {
    uniqueIds.forEach((id) => store.delete(id));
    return uniqueIds.length;
  });
}

export async function removeOrphanAttachmentBlobs(keepIds) {
  const keep = new Set((keepIds || []).map(String));
  return withStore("readwrite", async (store) => {
    const records = await requestResult(store.getAll());
    const orphanIds = records.map((item) => item.id).filter((id) => !keep.has(String(id)));
    orphanIds.forEach((id) => store.delete(id));
    return orphanIds.length;
  });
}
