import test from "node:test";
import assert from "node:assert/strict";
import { dateParamOrFallback, isRealIsoDate } from "../src/lib/date-param.mjs";

test("accepts only real YYYY-MM-DD values", () => {
  assert.equal(isRealIsoDate("2026-08-20"), true);
  assert.equal(isRealIsoDate("2026-02-29"), false);
  assert.equal(isRealIsoDate("2024-02-29"), true);
  assert.equal(isRealIsoDate("2026-2-09"), false);
  assert.equal(isRealIsoDate("not-a-date"), false);
});

test("falls back without normalizing invalid date parameters", () => {
  assert.equal(dateParamOrFallback("2026-08-19", "2026-08-20"), "2026-08-19");
  assert.equal(dateParamOrFallback("2026-02-30", "2026-08-20"), "2026-08-20");
  assert.equal(dateParamOrFallback(null, "2026-08-20"), "2026-08-20");
});
