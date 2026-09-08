import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../src/lib/data.mjs";
import {
  AGENT_BRIDGE_MAX_RECORDS,
  AGENT_BRIDGE_MAX_PLANS,
  AGENT_BRIDGE_MAX_DAYS,
  AGENT_BRIDGE_MAX_RESPONSE_BYTES,
  recordQuerySchema,
  planQuerySchema,
  stableFingerprint
} from "../src/modules/agent-bridge/mcp/schema.mjs";
import {
  createCategoriesSnapshot,
  createPlansSnapshot,
  createRecordsSnapshot
} from "../src/modules/agent-bridge/mcp/read-snapshot.mjs";

function fixtureState() {
  const state = createInitialState();
  const category = state.categories.find((item) => item.id === "daily");
  state.entries = [
    {
      id: "entry-visible",
      date: "2026-09-05",
      time: "09:30",
      content: "保留原文，不暴露附件内容",
      categoryId: category.id,
      tags: ["private"],
      templateId: null,
      fieldValues: { hidden: "structured value" },
      attachments: [{ id: "blob-1", name: "private.png", storage: "indexeddb", mediaType: "image/png", bytes: 12 }]
    }
  ];
  state.planBlocks = [
    {
      id: "plan-local",
      date: "2026-09-05",
      startTime: "10:00",
      endTime: "11:00",
      title: "本地计划",
      source: "local",
      flexibility: "fixed",
      externalRef: null
    },
    {
      id: "plan-google",
      date: "2026-09-05",
      startTime: "13:00",
      endTime: "14:00",
      title: "Google 只读计划",
      source: "google",
      flexibility: "movable",
      externalRef: { provider: "google", calendarId: "primary", eventId: "event-1", etag: "etag-1" }
    }
  ];
  return state;
}

test("read query schemas reject unknown fields and over-wide ranges", () => {
  assert.throws(() => planQuerySchema.parse({ date: "2026-09-05", extra: true }));
  assert.throws(() => recordQuerySchema.parse({ from: "2026-09-01", to: "2026-09-10" }));
  assert.equal(AGENT_BRIDGE_MAX_RECORDS, 50);
  assert.equal(AGENT_BRIDGE_MAX_PLANS, 30);
  assert.equal(AGENT_BRIDGE_MAX_DAYS, 7);
  assert.equal(AGENT_BRIDGE_MAX_RESPONSE_BYTES, 256 * 1024);
});

test("read snapshots are bounded, account-scoped projections with stable fingerprints", () => {
  const state = fixtureState();
  const plans = createPlansSnapshot({ state, date: "2026-09-05", revision: 12, updatedAt: "2026-09-05T09:00:00.000Z" });
  const records = createRecordsSnapshot({ state, from: "2026-09-05", to: "2026-09-05", revision: 12, offline: true });
  const categories = createCategoriesSnapshot({ state, revision: 12 });

  assert.equal(plans.data.length, 2);
  assert.equal(plans.data.find((item) => item.source === "google").readOnly, true);
  assert.equal(records.data[0].content, "保留原文，不暴露附件内容");
  assert.equal(records.data[0].categoryId, state.categories.find((item) => item.id === "daily").id);
  assert.equal(records.data[0].attachments, undefined);
  assert.equal(records.offline, true);
  assert.equal(categories.data.categories[0].id, state.categories[0].id);
  assert.equal(plans.schemaVersion, 1);
  assert.match(plans.fingerprint, /^fnv1a-[0-9a-f]{8}$/);
  assert.equal(plans.fingerprint, stableFingerprint(plans.data));
});

test("oversized projected content is bounded without mutating source state", () => {
  const state = fixtureState();
  state.entries[0].content = "x".repeat(12_000);
  const snapshot = createRecordsSnapshot({ state, from: "2026-09-05", to: "2026-09-05", revision: 1 });
  assert.equal(state.entries[0].content.length, 12_000);
  assert.equal(snapshot.data[0].content.length, 10_000);
  assert.equal(snapshot.truncated, true);
});
