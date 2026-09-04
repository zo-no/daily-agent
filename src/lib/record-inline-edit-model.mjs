/** @fileoverview Validates second-precision times used by the quick-record path. */

const RECORD_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export function isValidRecordTime(value) {
  return typeof value === "string" && RECORD_TIME_PATTERN.test(value);
}
