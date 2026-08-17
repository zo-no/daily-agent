import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import {
  MAX_ATTACHMENT_BYTES,
  attachmentRefsFromState,
  normalizeAttachmentRef,
  normalizeAttachmentRefs,
  stateWithRemappedAttachmentIds
} from "../src/lib/attachment-model.mjs";
import { createPortableBackup, parsePortableBackup, PORTABLE_BACKUP_MIME } from "../src/lib/attachment-bundle.mjs";
import { projectedAttachmentStorageBytes } from "../src/lib/attachment-store.mjs";
import { backupPayload, createInitialState, normalizeState, restoreState } from "../src/lib/data.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function fixtureRef(overrides = {}) {
  return {
    id: "attachment-fixture",
    kind: "image",
    storage: "indexeddb",
    mediaType: "image/png",
    bytes: 4,
    name: "fixture.png",
    alt: "fixture image",
    createdAt: 1,
    ...overrides
  };
}

function stateWithAttachment(ref = fixtureRef()) {
  const state = createInitialState();
  state.entries[0] = { ...state.entries[0], attachments: [ref] };
  return state;
}

test("附件引用只接受受控本地图片元数据", () => {
  assert.deepEqual(normalizeAttachmentRef(fixtureRef()), fixtureRef());
  assert.throws(() => normalizeAttachmentRef(fixtureRef({ storage: "remote" })), /storage mode/);
  assert.throws(() => normalizeAttachmentRef(fixtureRef({ mediaType: "image/svg+xml" })), /media type/);
  assert.throws(() => normalizeAttachmentRef(fixtureRef({ bytes: MAX_ATTACHMENT_BYTES + 1 })), /size/);
  assert.throws(() => normalizeAttachmentRefs([fixtureRef(), fixtureRef()]), /duplicate/);
});

test("本地容量计算在新增时累加、替换同 ID 时扣除旧文件", () => {
  const records = [{ id: "a", bytes: 10 }, { id: "b", bytes: 20 }];
  assert.equal(projectedAttachmentStorageBytes(records, "c", 5), 35);
  assert.equal(projectedAttachmentStorageBytes(records, "a", 6), 26);
});

test("v2 文本备份升级后补空附件数组，v3 备份保留引用但不内联二进制", () => {
  const legacy = createInitialState();
  legacy.version = 2;
  delete legacy.entries[0].attachments;
  assert.deepEqual(normalizeState(legacy).entries[0].attachments, []);

  const state = stateWithAttachment();
  const payload = backupPayload(state);
  const parsed = JSON.parse(payload);
  assert.equal(parsed.version, 4);
  assert.deepEqual(parsed.entries[0].attachments, [fixtureRef()]);
  assert.equal(payload.includes("data:image"), false);
});

test("便携附件包校验清单、原始字节和 SHA-256 后完整恢复", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]);
  const ref = fixtureRef({ bytes: bytes.byteLength });
  const state = stateWithAttachment(ref);
  const bundle = await createPortableBackup(state, async (id) => {
    assert.equal(id, ref.id);
    return new Blob([bytes], { type: ref.mediaType });
  }, "2026-08-14T00:00:00.000Z");
  assert.equal(bundle.type, PORTABLE_BACKUP_MIME);

  const restored = await parsePortableBackup(bundle, restoreState);
  assert.equal(restored.exportedAt, "2026-08-14T00:00:00.000Z");
  assert.deepEqual(attachmentRefsFromState(restored.state), [ref]);
  assert.deepEqual(new Uint8Array(await restored.files[0].blob.arrayBuffer()), bytes);
});

test("损坏、截断或元数据不匹配的便携附件包在替换数据前被拒绝", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const state = stateWithAttachment(fixtureRef({ bytes: 4 }));
  const bundle = await createPortableBackup(state, async () => new Blob([bytes], { type: "image/png" }));
  const raw = new Uint8Array(await bundle.arrayBuffer());
  raw[raw.length - 1] ^= 255;
  await assert.rejects(() => parsePortableBackup(new Blob([raw]), normalizeState), /checksum/);
  await assert.rejects(() => parsePortableBackup(new Blob([raw.slice(0, -2)]), normalizeState), /truncated|checksum/);
  await assert.rejects(() => createPortableBackup(state, async () => new Blob([bytes], { type: "image/jpeg" })), /does not match/);
});

test("恢复时可为附件重新分配 ID，不覆盖当前浏览器中的同名 Blob", () => {
  const state = normalizeState(stateWithAttachment());
  const remapped = stateWithRemappedAttachmentIds(state, new Map([["attachment-fixture", "attachment-new"]]));
  assert.equal(remapped.entries[0].attachments[0].id, "attachment-new");
  assert.equal(state.entries[0].attachments[0].id, "attachment-fixture");
});
