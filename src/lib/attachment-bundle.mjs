/**
 * @fileoverview 无依赖的 Log Note 便携附件包：JSON 清单后顺序拼接原始图片字节。
 */

import {
  ATTACHMENT_SCHEMA_VERSION,
  MAX_PORTABLE_BACKUP_BYTES,
  attachmentRefsFromState,
  normalizeAttachmentRef
} from "./attachment-model.mjs";

const MAGIC = new TextEncoder().encode("LOGNOTE-ATTACHMENTS\n");
const HEADER_LIMIT = 2 * 1024 * 1024;
export const PORTABLE_BACKUP_MIME = "application/vnd.log-note.backup";
export const PORTABLE_BACKUP_EXTENSION = ".lnbackup";

function uint32Bytes(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function readUint32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

function equalBytes(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) throw new Error("Secure checksum support is unavailable");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", value);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createPortableBackup(state, loadBlob, exportedAt = new Date().toISOString()) {
  const refs = attachmentRefsFromState(state);
  const files = [];
  let totalBytes = 0;
  for (const ref of refs) {
    const blob = await loadBlob(ref.id);
    if (!(blob instanceof Blob) || blob.size !== ref.bytes || blob.type !== ref.mediaType) {
      throw new Error(`Attachment ${ref.name} is missing or does not match its reference`);
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    totalBytes += bytes.byteLength;
    files.push({ ref, bytes, sha256: await sha256Hex(bytes) });
  }

  const header = {
    format: "log-note-portable-backup",
    version: ATTACHMENT_SCHEMA_VERSION,
    exportedAt,
    state,
    files: files.map(({ ref, bytes, sha256 }) => ({ ...ref, bytes: bytes.byteLength, sha256 }))
  };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  if (headerBytes.byteLength > HEADER_LIMIT) throw new Error("Portable backup manifest is too large");
  const packageBytes = MAGIC.byteLength + 4 + headerBytes.byteLength + totalBytes;
  if (packageBytes > MAX_PORTABLE_BACKUP_BYTES) throw new Error("Portable backup exceeds the 60 MiB limit");
  return new Blob([MAGIC, uint32Bytes(headerBytes.byteLength), headerBytes, ...files.map((item) => item.bytes)], { type: PORTABLE_BACKUP_MIME });
}

export async function parsePortableBackup(blob, validateState) {
  if (!(blob instanceof Blob) || blob.size > MAX_PORTABLE_BACKUP_BYTES) throw new Error("Portable backup is invalid or too large");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength < MAGIC.byteLength + 4 || !equalBytes(bytes.slice(0, MAGIC.byteLength), MAGIC)) throw new Error("Portable backup signature is invalid");
  const headerLength = readUint32(bytes, MAGIC.byteLength);
  const headerStart = MAGIC.byteLength + 4;
  const headerEnd = headerStart + headerLength;
  if (!headerLength || headerLength > HEADER_LIMIT || headerEnd > bytes.byteLength) throw new Error("Portable backup manifest is invalid");

  let header;
  try {
    header = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(headerStart, headerEnd)));
  } catch {
    throw new Error("Portable backup manifest is not valid UTF-8 JSON");
  }
  if (header?.format !== "log-note-portable-backup" || header.version !== ATTACHMENT_SCHEMA_VERSION || !Array.isArray(header.files)) {
    throw new Error("Portable backup version is unsupported");
  }
  const state = validateState(header.state);
  const refs = attachmentRefsFromState(state);
  if (refs.length !== header.files.length) throw new Error("Portable backup attachment list is incomplete");
  const refsById = new Map(refs.map((ref) => [ref.id, ref]));
  let cursor = headerEnd;
  const files = [];
  for (const rawFile of header.files) {
    const file = normalizeAttachmentRef(rawFile);
    const expected = refsById.get(file.id);
    if (!expected || JSON.stringify(file) !== JSON.stringify(expected)) throw new Error("Portable backup attachment reference does not match its state");
    const end = cursor + file.bytes;
    if (end > bytes.byteLength) throw new Error("Portable backup image data is truncated");
    const fileBytes = bytes.slice(cursor, end);
    if (!/^[a-f0-9]{64}$/.test(rawFile.sha256) || await sha256Hex(fileBytes) !== rawFile.sha256) throw new Error("Portable backup image checksum failed");
    files.push({ ref: file, blob: new Blob([fileBytes], { type: file.mediaType }) });
    cursor = end;
  }
  if (cursor !== bytes.byteLength) throw new Error("Portable backup contains unexpected trailing data");
  return { state, files, exportedAt: String(header.exportedAt || "") };
}
