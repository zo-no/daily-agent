/**
 * @fileoverview 本地计划时间块的数据约束与日视图计算；Google 事件未来通过来源映射接入同一模型。
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PLAN_SOURCES = new Set(["local", "google"]);
const PLAN_FLEXIBILITY = new Set(["fixed", "movable", "resizable"]);

const PLAN_MINUTES_PER_DAY = 24 * 60;
const PLAN_DEFAULT_DURATION_MINUTES = 60;
const PLAN_SNAP_MINUTES = 15;

export function timeToMinutes(value) {
  if (!TIME_PATTERN.test(String(value || ""))) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value) {
  const minutes = Math.max(0, Math.min(PLAN_MINUTES_PER_DAY - 1, Math.round(Number(value) || 0)));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function snapPlanMinutes(value, step = PLAN_SNAP_MINUTES) {
  return Math.max(0, Math.min(PLAN_MINUTES_PER_DAY - step, Math.round(Number(value) / step) * step));
}

function validDate(value) {
  if (!DATE_PATTERN.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizeExternalRef(value) {
  if (!value || typeof value !== "object") return null;
  const provider = String(value.provider || "").trim();
  const calendarId = String(value.calendarId || "").trim();
  const eventId = String(value.eventId || "").trim();
  if (!provider || !calendarId || !eventId) return null;
  return {
    provider,
    calendarId,
    eventId,
    etag: value.etag ? String(value.etag) : null
  };
}

/** Validates one persisted or externally supplied local plan block. */
export function normalizePlanBlock(candidate, index = 0) {
  if (!candidate || typeof candidate !== "object") throw new Error("Plan block is invalid");
  const id = String(candidate.id || "").trim();
  const date = String(candidate.date || "");
  const title = String(candidate.title || "").trim().slice(0, 240);
  const startTime = String(candidate.startTime || "");
  const endTime = String(candidate.endTime || "");
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (!id || id.length > 180) throw new Error("Plan block ID is invalid");
  if (!validDate(date)) throw new Error("Plan block date is invalid");
  if (!title) throw new Error("Plan block title is required");
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    throw new Error("Plan block time range is invalid");
  }
  const source = PLAN_SOURCES.has(candidate.source) ? candidate.source : "local";
  const flexibility = PLAN_FLEXIBILITY.has(candidate.flexibility) ? candidate.flexibility : "movable";
  return {
    id,
    date,
    title,
    startTime,
    endTime,
    source,
    flexibility,
    externalRef: normalizeExternalRef(candidate.externalRef),
    createdAt: Number.isFinite(Number(candidate.createdAt)) ? Number(candidate.createdAt) : index,
    updatedAt: Number.isFinite(Number(candidate.updatedAt)) ? Number(candidate.updatedAt) : index
  };
}

export function normalizePlanBlocks(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Plan blocks must be an array");
  const blocks = value.map(normalizePlanBlock);
  const ids = new Set();
  blocks.forEach((block) => {
    if (ids.has(block.id)) throw new Error("The backup contains duplicate plan block IDs");
    ids.add(block.id);
  });
  return blocks.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.createdAt - b.createdAt);
}

export function planBlocksForDate(blocks, date) {
  return blocks.filter((block) => block.date === date);
}

export function createPlanDraft(date, startMinutes = 9 * 60) {
  const start = snapPlanMinutes(startMinutes);
  const end = Math.min(PLAN_MINUTES_PER_DAY - 1, start + PLAN_DEFAULT_DURATION_MINUTES);
  return {
    id: null,
    date,
    title: "",
    startTime: minutesToTime(start),
    endTime: minutesToTime(end),
    source: "local",
    flexibility: "movable",
    externalRef: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/** Assigns overlapping plan blocks to stable display columns for one day. */
export function layoutPlanBlocks(blocks) {
  const sorted = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.createdAt - b.createdAt).map((block) => ({
    block,
    start: timeToMinutes(block.startTime),
    end: timeToMinutes(block.endTime)
  }));
  const result = [];
  let group = [];
  let groupEnd = -1;

  function flushGroup() {
    if (!group.length) return;
    const columnEnds = [];
    const placed = group.map((item) => {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column < 0) column = columnEnds.length;
      columnEnds[column] = item.end;
      return { ...item, column };
    });
    const columns = Math.max(1, columnEnds.length);
    placed.forEach((item) => result.push({ block: item.block, column: item.column, columns }));
    group = [];
    groupEnd = -1;
  }

  sorted.forEach((item) => {
    if (group.length && item.start >= groupEnd) flushGroup();
    group.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  });
  flushGroup();
  return result;
}
