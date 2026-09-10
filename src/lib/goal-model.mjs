/**
 * @fileoverview Shared local Goal/OKR metadata. Goals remain the compatibility
 * root while optional key results add structure without changing quick records.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["active", "completed", "paused"]);

function validDate(value) {
  if (!DATE_PATTERN.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function normalizeGoal(candidate, index = 0) {
  if (!candidate || typeof candidate !== "object") throw new Error("Goal is invalid");
  const id = String(candidate.id || "").trim();
  const content = String(candidate.content || "").trim().slice(0, 240);
  const startDate = String(candidate.startDate || "");
  const endDate = String(candidate.endDate || "");
  if (!id || id.length > 180) throw new Error("Goal ID is invalid");
  if (!content) throw new Error("Goal content is required");
  if (startDate && !validDate(startDate)) throw new Error("Goal start date is invalid");
  if (endDate && !validDate(endDate)) throw new Error("Goal end date is invalid");
  if (startDate && endDate && startDate > endDate) throw new Error("Goal date range is invalid");
  const keyResults = Array.isArray(candidate.keyResults) ? candidate.keyResults.map((item, itemIndex) => normalizeKeyResult(item, itemIndex)) : [];
  const recordIds = [...new Set((Array.isArray(candidate.recordIds) ? candidate.recordIds : []).map((value) => String(value).trim()).filter(Boolean))].slice(0, 200);
  const ids = new Set();
  keyResults.forEach((item) => {
    if (ids.has(item.id)) throw new Error("The goal contains duplicate key result IDs");
    ids.add(item.id);
  });
  return {
    id,
    content,
    startDate,
    endDate,
    status: STATUSES.has(candidate.status) ? candidate.status : "active",
    createdAt: Number.isFinite(Number(candidate.createdAt)) ? Number(candidate.createdAt) : index,
    updatedAt: Number.isFinite(Number(candidate.updatedAt)) ? Number(candidate.updatedAt) : index,
    keyResults,
    recordIds
  };
}

export function normalizeKeyResult(candidate, index = 0) {
  if (!candidate || typeof candidate !== "object") throw new Error("Key result is invalid");
  const id = String(candidate.id || `kr-${index + 1}`).trim();
  const content = String(candidate.content || "").trim().slice(0, 240);
  if (!id || id.length > 180) throw new Error("Key result ID is invalid");
  if (!content) throw new Error("Key result content is required");
  const targetValue = Number(candidate.targetValue);
  const currentValue = Number(candidate.currentValue);
  const unit = String(candidate.unit || "").trim().slice(0, 40);
  const recordIds = [...new Set((Array.isArray(candidate.recordIds) ? candidate.recordIds : []).map((value) => String(value).trim()).filter(Boolean))].slice(0, 200);
  return {
    id,
    content,
    status: STATUSES.has(candidate.status) ? candidate.status : "active",
    targetValue: Number.isFinite(targetValue) ? targetValue : null,
    currentValue: Number.isFinite(currentValue) ? currentValue : null,
    unit,
    recordIds
  };
}

export function normalizeGoals(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Goals must be an array");
  const ids = new Set();
  const goals = value.map(normalizeGoal);
  goals.forEach((goal) => {
    if (ids.has(goal.id)) throw new Error("The backup contains duplicate goal IDs");
    ids.add(goal.id);
  });
  return goals.sort((left, right) => Number(right.updatedAt) - Number(left.updatedAt) || left.content.localeCompare(right.content));
}

export function createGoalDraft() {
  const now = Date.now();
  return { id: null, content: "", startDate: "", endDate: "", status: "active", keyResults: [], createdAt: now, updatedAt: now };
}

/** Return a goal with one existing record attached to the goal or a child KR. */
export function setGoalRecordAssociation(goal, recordId, keyResultId = null, attached = true) {
  if (!goal || typeof goal !== "object") throw new Error("Goal is invalid");
  const id = String(recordId || "").trim();
  if (!id) throw new Error("Record ID is invalid");
  const krId = keyResultId ? String(keyResultId).trim() : null;
  const keyResults = (Array.isArray(goal.keyResults) ? goal.keyResults : []).map((item) => {
    const ids = new Set(Array.isArray(item.recordIds) ? item.recordIds : []);
    if (krId && item.id === krId) {
      if (attached) ids.add(id); else ids.delete(id);
    } else if (item.recordIds?.includes(id) && ((krId && attached) || !krId)) {
      ids.delete(id);
    }
    return { ...item, recordIds: [...ids].slice(0, 200) };
  });
  const goalIds = new Set(Array.isArray(goal.recordIds) ? goal.recordIds : []);
  if (attached && !krId) goalIds.add(id); else if (!attached) goalIds.delete(id);
  if (attached && krId) goalIds.delete(id);
  return { ...goal, recordIds: [...goalIds].slice(0, 200), keyResults };
}

export { STATUSES, validDate };
