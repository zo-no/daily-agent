import assert from "node:assert/strict";
import test from "node:test";
import {
  googleCalendarAccessIssue,
  googleEventIsManaged,
  googleEventPlanId,
  mapGoogleEventsToCache,
  planToGoogleEvent,
  reconcileManagedGoogleEvents
} from "../src/lib/google-calendar-model.mjs";

test("Google Calendar access errors become stable user-facing issue codes", () => {
  assert.equal(googleCalendarAccessIssue({ code: "deployment-unavailable" }), "deployment-unavailable");
  assert.equal(googleCalendarAccessIssue({ code: "origin_mismatch" }), "domain-restricted");
  assert.equal(googleCalendarAccessIssue({ message: "idpiframe_initialization_failed: Not a valid origin for the client" }), "domain-restricted");
  assert.equal(googleCalendarAccessIssue({ code: "access_denied", message: "Access blocked: current account cannot use this app" }), "account-restricted");
  assert.equal(googleCalendarAccessIssue({ code: "org_internal" }), "account-restricted");
  assert.equal(googleCalendarAccessIssue({ code: "admin_policy_enforced" }), "account-restricted");
  assert.equal(googleCalendarAccessIssue({ type: "popup_failed_to_open" }), "popup-blocked");
  assert.equal(googleCalendarAccessIssue({ type: "popup_closed" }), "authorization-cancelled");
  assert.equal(googleCalendarAccessIssue({ code: "access_denied" }), "authorization-cancelled");
  assert.equal(googleCalendarAccessIssue({ reason: "accessNotConfigured" }), "api-unavailable");
  assert.equal(googleCalendarAccessIssue(new Error("unexpected failure")), "request-failed");
});

function localPlan(overrides = {}) {
  return {
    id: "plan-1",
    date: "2026-08-17",
    title: "Write release notes",
    startTime: "09:00",
    endTime: "10:00",
    source: "local",
    ...overrides
  };
}

function managedEvent(overrides = {}) {
  return {
    id: "event-1",
    etag: "etag-1",
    summary: "Write release notes",
    start: { dateTime: new Date(2026, 7, 17, 9, 0).toISOString() },
    end: { dateTime: new Date(2026, 7, 17, 10, 0).toISOString() },
    extendedProperties: { private: { logNoteManaged: "true", logNotePlanId: "plan-1" } },
    ...overrides
  };
}

test("Log Note plans map to privately marked Google events", () => {
  const event = planToGoogleEvent(localPlan(), "Asia/Shanghai");
  assert.equal(event.summary, "Write release notes");
  assert.equal(event.extendedProperties.private.logNoteManaged, "true");
  assert.equal(event.extendedProperties.private.logNotePlanId, "plan-1");
  assert.equal(new Date(event.end.dateTime) - new Date(event.start.dateTime), 60 * 60 * 1000);
});

test("managed reconciliation is idempotent and never deletes unmarked Google events", () => {
  const plan = localPlan();
  const remote = managedEvent();
  const unmarked = { id: "personal", summary: "Personal calendar event" };
  const result = reconcileManagedGoogleEvents([plan], [remote, unmarked]);
  assert.equal(result.createPlans.length, 0);
  assert.equal(result.updatePairs.length, 0);
  assert.equal(result.unchangedPairs.length, 1);
  assert.deepEqual(result.deleteEvents, []);
  assert.equal(googleEventIsManaged(unmarked), false);
  assert.equal(googleEventPlanId(remote), "plan-1");
});

test("only marked orphan and duplicate events are deleted", () => {
  const first = managedEvent();
  const duplicate = managedEvent({ id: "event-duplicate" });
  const orphan = managedEvent({ id: "event-orphan", extendedProperties: { private: { logNoteManaged: "true", logNotePlanId: "deleted-plan" } } });
  const result = reconcileManagedGoogleEvents([localPlan()], [first, duplicate, orphan]);
  assert.deepEqual(result.deleteEvents.map((event) => event.id).sort(), ["event-duplicate", "event-orphan"]);
});

test("changed local plans update managed events and missing plans create events", () => {
  const changed = localPlan({ title: "Updated title" });
  const second = localPlan({ id: "plan-2", title: "Second plan" });
  const result = reconcileManagedGoogleEvents([changed, second], [managedEvent()]);
  assert.equal(result.updatePairs[0].plan.title, "Updated title");
  assert.equal(result.createPlans[0].id, "plan-2");
});

test("Google cache separates timed, cross-day, and all-day read-only events", () => {
  const timedStart = new Date(2026, 7, 17, 23, 30);
  const timedEnd = new Date(2026, 7, 18, 1, 0);
  const cache = mapGoogleEventsToCache([
    {
      id: "cross-day",
      summary: "Overnight work",
      status: "confirmed",
      start: { dateTime: timedStart.toISOString() },
      end: { dateTime: timedEnd.toISOString() }
    },
    {
      id: "all-day",
      summary: "Trip",
      status: "confirmed",
      start: { date: "2026-08-17" },
      end: { date: "2026-08-19" }
    },
    managedEvent(),
    { id: "cancelled", status: "cancelled", start: { date: "2026-08-17" }, end: { date: "2026-08-18" } }
  ], "primary", "2026-08-17T00:00:00.000Z");
  assert.deepEqual(cache.timedEvents.map((item) => item.date), ["2026-08-17", "2026-08-18"]);
  assert.deepEqual(cache.allDayEvents.map((item) => item.date), ["2026-08-17", "2026-08-18"]);
  assert.ok(cache.timedEvents.every((item) => item.source === "google"));
  assert.equal(cache.timedEvents.some((item) => item.externalRef.eventId === "event-1"), false);
});
