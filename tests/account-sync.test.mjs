import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/lib/data.mjs";
import {
  accountDataStorageKey,
  accountSyncStorageKey,
  makeSyncMetadata,
  mergeCloudTextWithLocalAttachments,
  readSyncMetadata,
  reconcileAccountDocument,
  textStateFingerprint
} from "../src/lib/account-sync.mjs";

function cloudDocument(state, revision = 1) {
  return { userId: "user-1", revision, payload: state, updatedAt: "", deviceId: "" };
}

test("account caches and sync metadata are isolated by authenticated user", () => {
  assert.equal(accountDataStorageKey("user-1"), "log-note:data:user:user-1:v1");
  assert.equal(accountSyncStorageKey("user-2"), "log-note:sync:user:user-2:v1");
  assert.notEqual(accountDataStorageKey("user-1"), accountDataStorageKey("user-2"));
  assert.throws(() => accountDataStorageKey(""));
});

test("sync metadata rejects another owner and malformed revisions", () => {
  const state = createInitialState();
  const metadata = makeSyncMetadata("user-1", 3, textStateFingerprint(state));
  assert.deepEqual(readSyncMetadata(JSON.stringify(metadata), "user-1"), metadata);
  assert.equal(readSyncMetadata(JSON.stringify(metadata), "user-2"), null);
  assert.equal(readSyncMetadata(JSON.stringify({ ...metadata, revision: 0 }), "user-1"), null);
});

test("text fingerprints are fixed-size and ignore object key insertion order", () => {
  const first = createInitialState();
  const second = structuredClone(first);
  first.markdownSettings = { headingLevel: 2, includeEmpty: false };
  second.markdownSettings = { includeEmpty: false, headingLevel: 2 };
  assert.equal(textStateFingerprint(first), textStateFingerprint(second));
  assert.match(textStateFingerprint(first), /^v2:\d+:[0-9a-f]{16}:[0-9a-f]{16}$/);
});

test("a new device uses the cloud document and an empty cloud accepts local creation", () => {
  const local = createInitialState();
  assert.equal(reconcileAccountDocument({ localState: local, localExists: false, cloudDocument: cloudDocument(local), metadata: null }).action, "use-cloud");
  assert.equal(reconcileAccountDocument({ localState: local, localExists: true, cloudDocument: null, metadata: null }).action, "save-local");
});

test("remote changes auto-load only when local state still matches the last shared fingerprint", () => {
  const base = createInitialState();
  const remote = structuredClone(base);
  remote.entries = [];
  const metadata = makeSyncMetadata("user-1", 1, textStateFingerprint(base));
  assert.equal(reconcileAccountDocument({ localState: base, localExists: true, cloudDocument: cloudDocument(remote, 2), metadata }).action, "use-cloud");

  const edited = structuredClone(base);
  edited.planBlocks = [{ id: "plan-1", date: "2026-08-16", startTime: "08:00", endTime: "09:00", title: "Local", source: "local", flexibility: "movable", externalRef: null, createdAt: 1, updatedAt: 1 }];
  assert.equal(reconcileAccountDocument({ localState: edited, localExists: true, cloudDocument: cloudDocument(remote, 2), metadata }).action, "conflict");
});

test("unknown local and cloud divergence never silently overwrites either version", () => {
  const local = createInitialState();
  const remote = structuredClone(local);
  remote.entries = [];
  assert.equal(reconcileAccountDocument({ localState: local, localExists: true, cloudDocument: cloudDocument(remote, 4), metadata: null }).action, "conflict");
});

test("applying cloud text keeps local image references on surviving entries", () => {
  const local = createInitialState();
  local.entries = [{
    id: "entry-1",
    date: "2026-08-16",
    time: "08:00",
    content: "local",
    category: "",
    fields: {},
    templateId: null,
    attachments: [{ id: "image-1", kind: "image", storage: "indexeddb", mediaType: "image/png", bytes: 10, name: "a.png", alt: "a", createdAt: 1 }],
    createdAt: 1,
    updatedAt: 1
  }];
  const cloud = structuredClone(local);
  cloud.entries[0] = { ...cloud.entries[0], content: "cloud", attachments: [] };
  cloud.entries.push({ ...cloud.entries[0], id: "entry-2", content: "remote only", attachments: [] });

  const merged = mergeCloudTextWithLocalAttachments(local, cloud);
  assert.equal(merged.entries[0].content, "cloud");
  assert.deepEqual(merged.entries[0].attachments, local.entries[0].attachments);
  assert.deepEqual(merged.entries[1].attachments, []);
  assert.deepEqual(cloud.entries[0].attachments, []);
});
