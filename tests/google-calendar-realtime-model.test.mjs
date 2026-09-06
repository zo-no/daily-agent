import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyGoogleCalendarCache,
  normalizeGoogleCalendarCache,
  applyGoogleCalendarChanges,
  googleCalendarSyncMetadata
} from "../src/lib/google-calendar-model.mjs";

test("sync metadata is versioned and normalizes invalid cursor state", () => {
  assert.deepEqual(googleCalendarSyncMetadata(), {
    version: 1, syncToken: null, lastSyncedAt: null, status: "disconnected", issue: ""
  });
  const cache = normalizeGoogleCalendarCache({ ...emptyGoogleCalendarCache(), syncToken: "cursor-1", syncStatus: "synced" });
  assert.equal(cache.syncToken, "cursor-1");
  assert.equal(cache.syncStatus, "synced");
});

test("managed sync issues remain bounded metadata and keep only actionable remote fields", () => {
  const cache = normalizeGoogleCalendarCache({
    managedIssues: [{
      planId: "plan-1",
      eventId: "event-1",
      kind: "remote-changed",
      detectedAt: "2026-09-05T09:00:00.000Z",
      remote: {
        eventId: "event-1",
        calendarId: "primary",
        title: "Updated",
        date: "2026-09-05",
        startTime: "10:00",
        endTime: "11:00",
        etag: "etag-2",
        privateNotes: "must not survive"
      }
    }, { planId: "invalid", eventId: "event-2", kind: "unknown" }]
  });
  assert.equal(cache.managedIssues.length, 1);
  assert.deepEqual(cache.managedIssues[0].remote, {
    eventId: "event-1",
    calendarId: "primary",
    title: "Updated",
    date: "2026-09-05",
    startTime: "10:00",
    endTime: "11:00",
    etag: "etag-2"
  });
});

test("incremental changes deduplicate by event id, apply tombstones, and preserve ordinary events", () => {
  const initial = normalizeGoogleCalendarCache({
    timedEvents: [{ id: "google:primary:e1:2026-09-05", date: "2026-09-05", title: "Old", startTime: "09:00", endTime: "10:00", source: "google", externalRef: { provider: "google", calendarId: "primary", eventId: "e1", etag: "v1" } }],
    syncToken: "old"
  });
  const next = applyGoogleCalendarChanges(initial, [
    { id: "e1", etag: "v2", summary: "New", start: { dateTime: "2026-09-05T09:00:00.000Z" }, end: { dateTime: "2026-09-05T10:00:00.000Z" } },
    { id: "e1", etag: "v2", summary: "New", start: { dateTime: "2026-09-05T09:00:00.000Z" }, end: { dateTime: "2026-09-05T10:00:00.000Z" } },
    { id: "e2", status: "cancelled" }
  ], "next");
  assert.equal(next.syncToken, "next");
  assert.equal(next.timedEvents.length, 1);
  assert.equal(next.timedEvents[0].title, "New");
  assert.equal(next.tombstones[0].eventId, "e2");
});

test("incremental updates preserve every segment of a cross-day event and clear a stale tombstone", () => {
  const initial = applyGoogleCalendarChanges(emptyGoogleCalendarCache(), [{
    id: "cross-day",
    summary: "Overnight",
    start: { dateTime: "2026-09-05T15:00:00.000Z" },
    end: { dateTime: "2026-09-06T17:00:00.000Z" },
    etag: "v1"
  }], "cursor-1", "primary", "2026-09-05T00:00:00.000Z");
  assert.equal(initial.timedEvents.length, 3);
  const deleted = applyGoogleCalendarChanges(initial, [{ id: "cross-day", status: "cancelled" }], "cursor-2", "primary", "2026-09-06T00:00:00.000Z");
  assert.equal(deleted.timedEvents.length, 0);
  assert.deepEqual(deleted.tombstones, [{ eventId: "cross-day", deletedAt: "2026-09-06T00:00:00.000Z" }]);
  const restored = applyGoogleCalendarChanges(deleted, [{
    id: "cross-day",
    summary: "Overnight (moved)",
    start: { dateTime: "2026-09-06T15:00:00.000Z" },
    end: { dateTime: "2026-09-07T17:00:00.000Z" },
    etag: "v3"
  }], "cursor-3", "primary", "2026-09-06T12:00:00.000Z");
  assert.equal(restored.timedEvents.length, 3);
  assert.equal(restored.tombstones.length, 0);
  assert.equal(restored.timedEvents[0].title, "Overnight (moved)");
});

test("tombstone history stays bounded while preserving the newest deletions", () => {
  const events = Array.from({ length: 120 }, (_, index) => ({ id: `deleted-${index}`, status: "cancelled" }));
  const next = applyGoogleCalendarChanges(emptyGoogleCalendarCache(), events, "cursor");
  assert.equal(next.tombstones.length, 100);
  assert.equal(next.tombstones[0].eventId, "deleted-20");
  assert.equal(next.tombstones.at(-1).eventId, "deleted-119");
});
