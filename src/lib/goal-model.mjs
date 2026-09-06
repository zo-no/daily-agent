/**
 * @fileoverview Shared local Goal/OKR metadata. Goals are intentionally flat;
 * plans may reference one goal without changing the quick-record path.
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
  return {
    id,
    content,
    startDate,
    endDate,
    status: STATUSES.has(candidate.status) ? candidate.status : "active",
    createdAt: Number.isFinite(Number(candidate.createdAt)) ? Number(candidate.createdAt) : index,
    updatedAt: Number.isFinite(Number(candidate.updatedAt)) ? Number(candidate.updatedAt) : index
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
  return { id: null, content: "", startDate: "", endDate: "", status: "active", createdAt: now, updatedAt: now };
}

export { STATUSES, validDate };
