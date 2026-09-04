import test from "node:test";
import assert from "node:assert/strict";

import { localTimeWithSeconds } from "../src/lib/data.mjs";
import { isValidRecordTime } from "../src/lib/record-inline-edit-model.mjs";

test("record inline time accepts only complete 24-hour local times", () => {
  for (const value of ["00:00", "06:15", "19:59", "23:59", "00:00:00", "09:30:05", "23:59:59"]) assert.equal(isValidRecordTime(value), true, value);
  for (const value of ["", "6:15", "24:00", "23:60", "9:30:00", "09:30:60", "09:60:00", null, undefined, 930]) assert.equal(isValidRecordTime(value), false, String(value));
});

test("second-precision local time formatter preserves leading zeroes", () => {
  assert.equal(localTimeWithSeconds(new Date(2026, 8, 4, 6, 5, 9)), "06:05:09");
  assert.equal(localTimeWithSeconds(new Date(2026, 8, 4, 23, 59, 58)), "23:59:58");
});
