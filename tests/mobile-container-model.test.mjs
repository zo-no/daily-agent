import test from "node:test";
import assert from "node:assert/strict";
import { isZeroWriteNativeFailure, nativeCapabilityUnavailable } from "../src/infrastructure/mobile/contract.mjs";

test("native cancellation and failure are zero-write outcomes", () => {
  assert.equal(isZeroWriteNativeFailure({ cancelled: true }), true);
  assert.equal(isZeroWriteNativeFailure({ ok: false }), true);
  assert.equal(isZeroWriteNativeFailure({ ok: true }), false);
});

test("unavailable capability has a stable error code", () => {
  const error = nativeCapabilityUnavailable("share");
  assert.equal(error.code, "MOBILE_CAPABILITY_UNAVAILABLE");
  assert.match(error.message, /share/);
});
