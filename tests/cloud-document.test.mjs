import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialState } from "../src/lib/data.mjs";
import {
  cloudRevisionConflict,
  cloudNetworkUnavailable,
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

test("incremental sync migration defines separate item streams, tombstones, cursors, RLS and CAS RPCs", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260907120000_incremental_sync.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.log_note_record_items/i);
  assert.match(sql, /create table if not exists public\.log_note_plan_items/i);
  assert.match(sql, /server_seq bigint generated always as identity/i);
  assert.match(sql, /deleted_at timestamptz/i);
  assert.match(sql, /create or replace function public\.pull_log_note_changes/i);
  assert.match(sql, /create or replace function public\.push_log_note_changes/i);
  assert.match(sql, /v_current_version <> v_base_version/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /select auth\.uid\(\)/i);
});

test("incremental bootstrap migration publishes backfilled rows to the cursor stream", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260908100000_incremental_sync_bootstrap_changes.sql", import.meta.url), "utf8");
  assert.match(sql, /last_server_seq = 0/i);
  assert.match(sql, /log_note_sync_changes/i);
  assert.match(sql, /:bootstrap/i);
  assert.match(sql, /update public\.log_note_(record|plan)_items/i);
});

test("incremental compatibility bridge keeps legacy document writes and item streams connected", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260909120000_incremental_sync_legacy_bridge.sql", import.meta.url), "utf8");
  assert.match(sql, /bridge_log_note_document_to_items/i);
  assert.match(sql, /refresh_log_note_legacy_document_records/i);
  assert.match(sql, /refresh_log_note_legacy_document_plans/i);
  assert.match(sql, /operation_id := md5/i);
  assert.match(sql, /deleted_at = now()/i);
  assert.match(sql, /pg_trigger_depth\(\) > 1/i);
});
test("incremental RPC validates entity identity and strips record attachments server-side", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260907120000_incremental_sync.sql", import.meta.url), "utf8");
  assert.match(sql, /v_payload->>'id' <> v_entity_id/i);
  assert.match(sql, /v_payload := v_payload - 'attachments'/i);
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
  assert.equal(cloudNetworkUnavailable(new TypeError("fetch failed")), true);
  assert.equal(cloudNetworkUnavailable(new Error("Network request failed")), true);
  assert.equal(cloudNetworkUnavailable({ status: 503 }), true);
  assert.equal(cloudNetworkUnavailable({ code: "40001" }), false);
});

test("the deployed-schema correction rejects a null expected revision for existing documents", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260816170000_require_expected_revision.sql", import.meta.url), "utf8");
  assert.match(sql, /if p_expected_revision is null or current_document\.revision <> p_expected_revision then/i);
  assert.match(sql, /errcode = '40001'/i);
});
