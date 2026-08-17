/**
 * @fileoverview Verifies calendar navigation, locale week order, and record-density projection.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarMonth, calendarKeyboardTarget, shiftCalendarMonth } from "../src/lib/calendar-model.mjs";

test("月历始终生成六周并以周日起始英文月份", () => {
  const month = buildCalendarMonth("2026-08-14", [], 0, "2026-08-14");
  assert.equal(month.cells.length, 42);
  assert.equal(month.weeks.length, 6);
  assert.equal(month.cells[0].date, "2026-07-26");
  assert.equal(month.cells.at(-1).date, "2026-09-05");
  assert.equal(month.cells.find((cell) => cell.date === "2026-08-14").today, true);
});

test("中文月历从周一开始且保留相邻月份日期", () => {
  const month = buildCalendarMonth("2026-08-14", [], 1);
  assert.equal(month.cells[0].date, "2026-07-27");
  assert.equal(month.cells[6].date, "2026-08-02");
});

test("记录密度只统计真实日期并汇总当前月份", () => {
  const month = buildCalendarMonth("2026-08-14", [
    { date: "2026-08-01" }, { date: "2026-08-01" }, { date: "2026-08-14" },
    { date: "2026-07-31" }, { date: "2026-02-30" }, { date: "broken" }
  ]);
  assert.equal(month.activeDays, 2);
  assert.equal(month.recordCount, 3);
  assert.equal(month.cells.find((cell) => cell.date === "2026-08-01").count, 2);
  assert.equal(month.cells.find((cell) => cell.date === "2026-07-31").count, 1);
});

test("翻月会把月末安全夹到目标月份最后一天", () => {
  assert.equal(shiftCalendarMonth("2024-01-31", 1), "2024-02-29");
  assert.equal(shiftCalendarMonth("2025-01-31", 1), "2025-02-28");
  assert.equal(shiftCalendarMonth("2026-12-31", 1), "2027-01-31");
});

test("方向键、翻页键和周首尾键使用本地日期导航", () => {
  assert.equal(calendarKeyboardTarget("2026-08-14", "ArrowLeft"), "2026-08-13");
  assert.equal(calendarKeyboardTarget("2026-08-14", "ArrowDown"), "2026-08-21");
  assert.equal(calendarKeyboardTarget("2026-08-31", "PageDown"), "2026-09-30");
  assert.equal(calendarKeyboardTarget("2026-08-14", "Home", 1), "2026-08-10");
  assert.equal(calendarKeyboardTarget("2026-08-14", "End", 1), "2026-08-16");
});

test("无效日期不会被静默改写", () => {
  assert.equal(shiftCalendarMonth("2026-02-30", 1), "2026-02-30");
  assert.equal(calendarKeyboardTarget("invalid", "ArrowRight"), "invalid");
  assert.throws(() => buildCalendarMonth("2026-02-30"), /real YYYY-MM-DD/);
});
