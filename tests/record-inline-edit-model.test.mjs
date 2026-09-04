import test from "node:test";
import assert from "node:assert/strict";

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
  for (const value of ["00:00", "06:15", "19:59", "23:59"]) assert.equal(isValidRecordTime(value), true, value);
  for (const value of ["", "6:15", "24:00", "23:60", "09:30:00", null, undefined, 930]) assert.equal(isValidRecordTime(value), false, String(value));
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
