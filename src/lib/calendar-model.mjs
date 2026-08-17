/**
 * @fileoverview 为本地记录月历提供无副作用的日期网格、月份切换和键盘导航。
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(dateString) {
  if (!DATE_PATTERN.test(String(dateString || ""))) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function dateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function moveDate(dateStringValue, amount) {
  const date = parseDate(dateStringValue);
  if (!date) return dateStringValue;
  date.setDate(date.getDate() + amount);
  return dateString(date);
}

export function shiftCalendarMonth(dateStringValue, amount) {
  const date = parseDate(dateStringValue);
  if (!date || !Number.isInteger(amount)) return dateStringValue;
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, monthEnd));
  return dateString(date);
}

export function calendarKeyboardTarget(dateStringValue, key, weekStartsOn = 0) {
  const date = parseDate(dateStringValue);
  if (!date) return dateStringValue;
  if (key === "ArrowLeft") return moveDate(dateStringValue, -1);
  if (key === "ArrowRight") return moveDate(dateStringValue, 1);
  if (key === "ArrowUp") return moveDate(dateStringValue, -7);
  if (key === "ArrowDown") return moveDate(dateStringValue, 7);
  if (key === "PageUp") return shiftCalendarMonth(dateStringValue, -1);
  if (key === "PageDown") return shiftCalendarMonth(dateStringValue, 1);
  const normalizedWeekStart = weekStartsOn === 1 ? 1 : 0;
  const offset = (date.getDay() - normalizedWeekStart + 7) % 7;
  if (key === "Home") return moveDate(dateStringValue, -offset);
  if (key === "End") return moveDate(dateStringValue, 6 - offset);
  return dateStringValue;
}

/** Builds the visible month grid and per-day record density from normalized entries. */
export function buildCalendarMonth(selectedDate, entries = [], weekStartsOn = 0, today = dateString(new Date())) {
  const selected = parseDate(selectedDate);
  if (!selected) throw new TypeError("selectedDate must be a real YYYY-MM-DD date");
  const normalizedWeekStart = weekStartsOn === 1 ? 1 : 0;
  const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const startOffset = (monthStart.getDay() - normalizedWeekStart + 7) % 7;
  const gridStart = new Date(selected.getFullYear(), selected.getMonth(), 1 - startOffset);
  const counts = new Map();
  for (const entry of entries) {
    if (!parseDate(entry?.date)) continue;
    counts.set(entry.date, (counts.get(entry.date) || 0) + 1);
  }

  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const value = dateString(date);
    return {
      date: value,
      day: date.getDate(),
      inMonth: date.getMonth() === selected.getMonth(),
      selected: value === selectedDate,
      today: value === today,
      count: counts.get(value) || 0
    };
  });
  const monthPrefix = `${selectedDate.slice(0, 7)}-`;
  const active = [...counts.entries()].filter(([date, count]) => date.startsWith(monthPrefix) && count > 0);

  return {
    year: selected.getFullYear(),
    month: selected.getMonth(),
    cells,
    weeks: Array.from({ length: 6 }, (_, index) => cells.slice(index * 7, index * 7 + 7)),
    activeDays: active.length,
    recordCount: active.reduce((total, [, count]) => total + count, 0)
  };
}
