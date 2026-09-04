/** @fileoverview Validates and applies the only field owned by the inline time editor. */

const RECORD_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isValidRecordTime(value) {
  return typeof value === "string" && RECORD_TIME_PATTERN.test(value);
}

export function mergeRecordTime(entry, time) {
  if (!entry || typeof entry !== "object" || !isValidRecordTime(time)) return null;
  return entry.time === time ? entry : { ...entry, time };
}
