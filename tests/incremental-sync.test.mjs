import assert from "node:assert/strict";
import test from "node:test";
import {
  coalesceSyncMutations,
  diffSyncItems,
  makeSyncMutation,
  mergeSyncCollections,
  mergeSyncItem,
  sortSyncItems
} from "../src/lib/incremental-sync.mjs";

const record = (id, content, overrides = {}) => ({
  id,
  date: "2026-09-07",
  time: "09:00",
  content,
  categoryId: "daily",
  tags: [],
  templateId: null,
  fieldValues: {},
  attachments: [],
  createdAt: 1,
  ...overrides
});

const plan = (id, title, overrides = {}) => ({
  id,
  date: "2026-09-07",
  startTime: "10:00",
  endTime: "11:00",
  title,
  source: "local",
  flexibility: "movable",
  goalId: null,
  priority: null,
  externalRef: null,
  createdAt: 1,
  updatedAt: 1,
  ...overrides
});

test("new records and plans are identified by UUID and sorted by business time", () => {
  const mutations = diffSyncItems({
    kind: "record",
    before: [],
    after: [record("b", "later", { time: "10:00" }), record("a", "first", { time: "09:00" })],
    deviceId: "device-1"
  });
  assert.deepEqual(sortSyncItems("record", mutations.map((item) => item.payload)).map((item) => item.id), ["a", "b"]);
  assert.equal(mutations.every((item) => item.operation === "upsert" && item.baseVersion === 0), true);
});

test("diff ignores identical normalized payloads and emits tombstones for deletes", () => {
  const before = [record("keep", "same"), record("remove", "gone")];
  const after = [record("keep", "same")];
  const mutations = diffSyncItems({ kind: "record", before, after, versions: { remove: 7 }, deviceId: "device-1" });
  assert.equal(mutations.length, 1);
  assert.deepEqual(mutations[0], { ...mutations[0], operation: "delete", entityId: "remove", baseVersion: 7, payload: null });
});

test("outbox coalescing keeps the earliest base and latest operation", () => {
  const first = makeSyncMutation({ kind: "record", operation: "upsert", entityId: "r1", baseVersion: 3, payload: record("r1", "one"), operationId: "op-1", deviceId: "d1" });
  const second = makeSyncMutation({ kind: "record", operation: "upsert", entityId: "r1", baseVersion: 4, payload: record("r1", "two"), operationId: "op-2", deviceId: "d1" });
  const result = coalesceSyncMutations([first, second]);
  assert.equal(result.length, 1);
  assert.equal(result[0].baseVersion, 3);
  assert.equal(result[0].payload.content, "two");
  assert.equal(result[0].operationId, "op-2");
});

test("three-way merge combines different fields on the same record", () => {
  const base = record("r1", "old", { time: "09:00" });
  const local = record("r1", "local", { time: "09:00" });
  const remote = record("r1", "old", { time: "10:00" });
  const result = mergeSyncItem({ kind: "record", base, local, remote });
  assert.equal(result.status, "merged");
  assert.equal(result.item.content, "local");
  assert.equal(result.item.time, "10:00");
});

test("same-field edits become a conflict instead of a silent overwrite", () => {
  const base = plan("p1", "old");
  const local = plan("p1", "local");
  const remote = plan("p1", "remote");
  const result = mergeSyncItem({ kind: "plan", base, local, remote });
  assert.equal(result.status, "conflict");
  assert.deepEqual(result.conflicts, ["title"]);
});

test("delete versus unchanged and delete versus edit have distinct outcomes", () => {
  const base = record("r1", "old");
  assert.equal(mergeSyncItem({ kind: "record", base, local: null, remote: base }).item, null);
  const conflict = mergeSyncItem({ kind: "record", base, local: null, remote: record("r1", "remote") });
  assert.equal(conflict.status, "conflict");
  assert.deepEqual(conflict.conflicts, ["deleted"]);
});

test("collection merge keeps independent additions and reports only affected IDs", () => {
  const result = mergeSyncCollections({
    kind: "plan",
    base: [plan("shared", "same")],
    local: [plan("shared", "same"), plan("local", "local")],
    remote: [plan("shared", "same"), plan("remote", "remote")]
  });
  assert.deepEqual(result.items.map((item) => item.id).sort(), ["local", "remote", "shared"]);
  assert.deepEqual(result.conflicts, []);
});
