/** Deterministic, local-only OKR evidence and progress facts. */

const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EXCERPT = 360;

function validDate(value) {
  if (!DATE_PATTERN.test(String(value || ""))) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return date.toISOString().slice(0, 10) === value;
}

function timeValue(value) {
  const match = TIME_PATTERN.exec(String(value || ""));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || (match[3] && Number(match[3]) > 59)) return null;
  return Number(match[1]) * 60 + Number(match[2]) + Number(match[3] || 0) / 60;
}

function compareEntries(left, right) {
  return String(left.date).localeCompare(String(right.date))
    || (timeValue(left.time) === null ? 1 : timeValue(right.time) === null ? -1 : timeValue(left.time) - timeValue(right.time))
    || Number(left.createdAt || 0) - Number(right.createdAt || 0)
    || String(left.id).localeCompare(String(right.id));
}

function daysBetween(startDate, endDate) {
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) return [];
  const result = [];
  const cursor = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export function numericProgress(keyResult) {
  const target = Number(keyResult?.targetValue);
  const current = Number(keyResult?.currentValue);
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(current)) return null;
  return Math.max(0, Math.min(1, current / target));
}

export function buildGoalProgressFacts({ goal, entries = [] } = {}) {
  if (!goal) return null;
  const startDate = validDate(goal.startDate) ? goal.startDate : "";
  const endDate = validDate(goal.endDate) ? goal.endDate : "";
  const periodDays = daysBetween(startDate, endDate);
  const keyResults = Array.isArray(goal.keyResults) ? goal.keyResults : [];
  const allowedIds = new Set(keyResults.flatMap((item) => Array.isArray(item.recordIds) ? item.recordIds : []));
  const goalRecordIds = new Set(Array.isArray(goal.recordIds) ? goal.recordIds : []);
  const hasExplicitAssociations = allowedIds.size > 0 || goalRecordIds.size > 0;
  const evidence = entries.filter((entry) => {
    if (!entry || !entry.id || !String(entry.content || "").trim()) return false;
    if (startDate && String(entry.date) < startDate) return false;
    if (endDate && String(entry.date) > endDate) return false;
    return !hasExplicitAssociations || goalRecordIds.has(entry.id) || allowedIds.has(entry.id) || entry.goalId === goal.id;
  }).map((entry) => ({ id: String(entry.id), date: String(entry.date || ""), time: String(entry.time || ""), content: String(entry.content || ""), createdAt: Number(entry.createdAt || 0), keyResultIds: keyResults.filter((item) => item.recordIds?.includes(entry.id)).map((item) => item.id) })).sort(compareEntries);
  const recordedDates = [...new Set(evidence.map((entry) => entry.date).filter(Boolean))];
  const missingDates = periodDays.filter((date) => !recordedDates.includes(date));
  const keyResultFacts = keyResults.map((item) => {
    const related = evidence.filter((entry) => entry.keyResultIds.includes(item.id));
    return { ...item, progress: numericProgress(item), evidenceCount: related.length, evidenceDates: [...new Set(related.map((entry) => entry.date))] };
  });
  return {
    goal: { id: goal.id, content: goal.content, startDate, endDate, status: goal.status },
    keyResults: keyResultFacts,
    evidence,
    periodDays,
    recordedDates,
    missingDates,
    metrics: { periodDayCount: periodDays.length, recordedDayCount: recordedDates.length, missingDayCount: missingDates.length, evidenceCount: evidence.length }
  };
}

export function buildOkrAnalysisInput(facts, { locale = "zh-CN", requestId = `okr-${Date.now()}`, sourceFingerprint = "" } = {}) {
  const source = {
    schemaVersion: "okr-progress-v1",
    locale: locale === "en" ? "en" : "zh-CN",
    goal: facts.goal,
    keyResults: facts.keyResults.map(({ id, content, status, targetValue, currentValue, unit, progress, evidenceCount, evidenceDates }) => ({ id, content, status, targetValue, currentValue, unit, progress, evidenceCount, evidenceDates })),
    metrics: facts.metrics,
    evidence: facts.evidence.slice(0, 200).map(({ id, date, time, content, keyResultIds }) => ({ id, date, time, content: content.slice(0, MAX_EXCERPT), keyResultIds }))
  };
  return { ...source, requestId, sourceFingerprint: sourceFingerprint || JSON.stringify(source) };
}

export { validDate, timeValue };
