import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialState } from "../src/lib/data.mjs";
import {
  cloudRevisionConflict,
  cloudSchemaUnavailable,
  normalizeCloudDocument,
  prepareTextCloudDocument
} from "../src/lib/cloud-document.mjs";

test("text cloud documents preserve records and plans while omitting local image references", () => {
  const state = createInitialState();
  state.entries = [{
    id: "entry-1", date: "2026-08-16", time: "08:00", content: "raw text", categoryId: state.categories[0].id,
    tags: [], templateId: null, fieldValues: {}, source: null, sourceLine: null, createdAt: 1,
    attachments: [{ id: "image-1", kind: "image", storage: "indexeddb", mediaType: "image/png", bytes: 10, name: "a.png", alt: "a", createdAt: 1 }]
  }];
  state.planBlocks = [{ id: "plan-1", date: "2026-08-16", startTime: "08:00", endTime: "09:00", title: "Plan", source: "local", flexibility: "movable", externalRef: null, createdAt: 1, updatedAt: 1 }];
  const prepared = prepareTextCloudDocument(state);
  assert.equal(prepared.omittedImages, 1);
  assert.equal(prepared.payload.entries[0].content, "raw text");
  assert.deepEqual(prepared.payload.entries[0].attachments, []);
  assert.equal(prepared.payload.planBlocks[0].title, "Plan");
});

test("cloud rows require an owned positive revision and restore through the backup contract", () => {
  const payload = createInitialState();
  const document = normalizeCloudDocument({ user_id: "user-1", revision: 2, payload, updated_at: "2026-08-16T00:00:00Z", device_id: "device-1" });
  assert.equal(document.userId, "user-1");
  assert.equal(document.revision, 2);
  assert.equal(document.payload.version, payload.version);
  assert.throws(() => normalizeCloudDocument({ user_id: "user-1", revision: 0, payload }));
});

test("cloud error classification keeps missing schema and stale revisions distinct", () => {
  assert.equal(cloudSchemaUnavailable({ code: "PGRST205" }), true);
  assert.equal(cloudSchemaUnavailable({ code: "40001" }), false);
  assert.equal(cloudRevisionConflict({ code: "40001" }), true);
});

test("the deployed-schema correction rejects a null expected revision for existing documents", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260816170000_require_expected_revision.sql", import.meta.url), "utf8");
  assert.match(sql, /if p_expected_revision is null or current_document\.revision <> p_expected_revision then/i);
  assert.match(sql, /errcode = '40001'/i);
});
