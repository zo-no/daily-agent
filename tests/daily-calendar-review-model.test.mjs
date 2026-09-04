import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarDiaryLocalReview, buildCalendarDiaryReviewInput, normalizeCalendarDiaryReviewOutput } from "../src/modules/insights/calendar-diary-review/model.mjs";

const date = "2026-09-04";
const sources = {
  timedEvents: [
    { id: "google:primary:secret-a", date, title: "项目评审", startTime: "10:00", endTime: "11:00", htmlLink: "secret" },
    { id: "google:primary:secret-b", date, title: "设计同步", startTime: "10:30", endTime: "11:30", externalRef: { eventId: "secret" } },
    { id: "old", date: "2026-09-03", title: "旧事件", startTime: "09:00", endTime: "10:00" }
  ],
  allDayEvents: [{ id: "google:secret-day", date, title: "发布日", allDay: true }],
  entries: [
    { id: "real-record-1", date, time: "10:40", content: "完成项目评审并记下三个决定", tags: ["secret"] },
    { id: "real-record-2", date, time: "18:00", content: "晚饭后散步" },
    { id: "old-record", date: "2026-09-03", time: "12:00", content: "旧记录" }
  ]
};

test("today selection uses Google timed/all-day events, opaque IDs, bounds, and no persistent metadata", () => {
  const input = buildCalendarDiaryReviewInput(sources, { date, locale: "zh-CN" });
  assert.deepEqual(input.events.map((event) => event.id), ["event-001", "event-002", "event-003"]);
  assert.deepEqual(input.entries.map((entry) => entry.id), ["entry-001", "entry-002"]);
  assert.equal(input.events[0].allDay, true);
  assert.equal(input.events[0].startMinute, null);
  assert.match(input.sourceFingerprint, /^fnv1a-[0-9a-f]{8}$/);
  assert.doesNotMatch(JSON.stringify(input), /secret|real-record|htmlLink|externalRef|tags|old-record/);
});

test("local review matches diary, keeps all-day items, and identifies only timed overlaps", () => {
  const input = buildCalendarDiaryReviewInput(sources, { date });
  const review = buildCalendarDiaryLocalReview(input);
  assert.deepEqual(review.facts, { eventCount: 3, diaryCount: 2, matchedEventCount: 1, unrecordedEventCount: 2, outsideCalendarCount: 1, overlapCount: 1 });
  assert.deepEqual(review.issues.map((issue) => issue.kind), ["calendar-unrecorded", "calendar-unrecorded", "record-outside-calendar", "calendar-overlap"]);
});

test("strict output rejects forged, duplicate, and unsupported suggestion sources", () => {
  const input = { ...buildCalendarDiaryReviewInput(sources, { date }), requestId: "request-1" };
  const valid = normalizeCalendarDiaryReviewOutput({ overview: "有两项日程值得回看。", suggestions: [{ kind: "calendar-unrecorded", title: "回看设计同步", summary: "可对照当时是否留下了记录。", sourceIds: ["event-002"] }] }, input, 42, "test");
  assert.equal(valid.requestId, "request-1");
  assert.throws(() => normalizeCalendarDiaryReviewOutput({ overview: "x", suggestions: [{ kind: "calendar-unrecorded", title: "x", summary: "x", sourceIds: ["forged"] }] }, input), /sources are invalid/);
  assert.throws(() => normalizeCalendarDiaryReviewOutput({ overview: "x", suggestions: [{ kind: "write-calendar", title: "x", summary: "x", sourceIds: ["event-001"] }] }, input), /suggestion is invalid/);
});
