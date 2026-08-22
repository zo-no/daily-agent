/** Strictly validates local calendar dates supplied through internal URLs. */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isRealIsoDate(value) {
  const input = String(value || "");
  if (!ISO_DATE_PATTERN.test(input)) return false;
  const [year, month, day] = input.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function dateParamOrFallback(value, fallback) {
  return isRealIsoDate(value) ? String(value) : fallback;
}
