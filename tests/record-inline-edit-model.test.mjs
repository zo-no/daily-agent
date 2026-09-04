import test from "node:test";
import assert from "node:assert/strict";

import { localTimeWithSeconds } from "../src/lib/data.mjs";
import { isValidRecordTime, mergeRecordTime } from "../src/lib/record-inline-edit-model.mjs";

const source = Object.freeze({
  id: "entry-1",
  date: "2026-09-04",
  time: "08:05",
  content: "Original text",
  categoryId: "daily",
  tags: ["private", "morning"],
  templateId: "quick",
  fieldValues: { mood: "steady" },
  attachments: [{ id: "image-1", name: "note.webp", bytes: 128 }],
  createdAt: 1234
});

test("record inline time accepts only complete 24-hour local times", () => {
  for (const value of ["00:00", "06:15", "19:59", "23:59", "00:00:00", "09:30:05", "23:59:59"]) assert.equal(isValidRecordTime(value), true, value);
  for (const value of ["", "6:15", "24:00", "23:60", "9:30:00", "09:30:60", "09:60:00", null, undefined, 930]) assert.equal(isValidRecordTime(value), false, String(value));
});

test("second-precision local time formatter preserves leading zeroes", () => {
  assert.equal(localTimeWithSeconds(new Date(2026, 8, 4, 6, 5, 9)), "06:05:09");
  assert.equal(localTimeWithSeconds(new Date(2026, 8, 4, 23, 59, 58)), "23:59:58");
});

test("record inline time merge changes only time and preserves nested field identities", () => {
  const updated = mergeRecordTime(source, "06:15");
  assert.deepEqual(updated, { ...source, time: "06:15" });
  assert.notEqual(updated, source);
  assert.equal(updated.tags, source.tags);
  assert.equal(updated.fieldValues, source.fieldValues);
  assert.equal(updated.attachments, source.attachments);
});

test("record inline time merge rejects invalid input without producing a candidate", () => {
  for (const value of ["", "6:15", "24:00", "23:60", null]) assert.equal(mergeRecordTime(source, value), null);
  assert.equal(mergeRecordTime(null, "06:15"), null);
});

test("record inline time merge returns the same record for an unchanged time", () => {
  assert.equal(mergeRecordTime(source, source.time), source);
});

test("record inline time merge preserves a second-precision value exactly", () => {
  const updated = mergeRecordTime(source, "06:15:42");
  assert.deepEqual(updated, { ...source, time: "06:15:42" });
});
