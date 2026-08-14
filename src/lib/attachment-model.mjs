/**
 * @fileoverview 图片附件引用的纯数据约束，不接触浏览器存储。
 */

export const ATTACHMENT_SCHEMA_VERSION = 1;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_TOTAL_BYTES = 50 * 1024 * 1024;
export const MAX_PORTABLE_BACKUP_BYTES = 60 * 1024 * 1024;

export const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

function cleanName(value) {
  return String(value || "image").trim().slice(0, 180) || "image";
}

function cleanAlt(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, 240);
}

export function normalizeAttachmentRef(candidate) {
  if (!candidate || typeof candidate !== "object") throw new Error("Attachment reference is invalid");
  const id = String(candidate.id || "").trim();
  const mediaType = String(candidate.mediaType || "").toLowerCase();
  const bytes = Number(candidate.bytes);
  if (!id || id.length > 160) throw new Error("Attachment ID is invalid");
  if (candidate.storage !== "indexeddb") throw new Error("Attachment storage mode is unsupported");
  if (!SUPPORTED_IMAGE_TYPES.has(mediaType)) throw new Error("Attachment media type is unsupported");
  if (!Number.isInteger(bytes) || bytes <= 0 || bytes > MAX_ATTACHMENT_BYTES) throw new Error("Attachment size is invalid");
  return {
    id,
    kind: "image",
    storage: "indexeddb",
    mediaType,
    bytes,
    name: cleanName(candidate.name),
    alt: cleanAlt(candidate.alt || candidate.name),
    createdAt: Number.isFinite(Number(candidate.createdAt)) ? Number(candidate.createdAt) : 0
  };
}

export function normalizeAttachmentRefs(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Record attachments must be an array");
  const refs = value.map(normalizeAttachmentRef);
  const ids = new Set();
  refs.forEach((ref) => {
    if (ids.has(ref.id)) throw new Error("Record contains duplicate attachment IDs");
    ids.add(ref.id);
  });
  return refs;
}

export function attachmentRefsFromState(state) {
  const refs = [];
  const ids = new Set();
  for (const entry of state?.entries || []) {
    for (const rawRef of entry.attachments || []) {
      const ref = normalizeAttachmentRef(rawRef);
      if (ids.has(ref.id)) throw new Error("Backup contains a shared or duplicate attachment ID");
      ids.add(ref.id);
      refs.push(ref);
    }
  }
  return refs;
}

export function stateWithRemappedAttachmentIds(state, idMap) {
  return {
    ...state,
    entries: state.entries.map((entry) => ({
      ...entry,
      attachments: (entry.attachments || []).map((rawRef) => {
        const ref = normalizeAttachmentRef(rawRef);
        const id = idMap.get(ref.id);
        if (!id) throw new Error("Portable backup attachment mapping is incomplete");
        return { ...ref, id };
      })
    }))
  };
}

export function formatAttachmentBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}
