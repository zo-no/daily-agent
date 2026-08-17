/**
 * @fileoverview 统一日期选择器、首页与搜索结果的本地化日期显示。
 */

import { localDate, shiftDate } from "@/lib/data.mjs";

function dateFromLocalString(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function fullDateLabel(dateString, locale) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(dateFromLocalString(dateString));
}

export function diaryDateLabel(dateString, locale) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric"
  }).format(dateFromLocalString(dateString));
}

export function weekdayLabel(dateString, locale) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long"
  }).format(dateFromLocalString(dateString));
}

export function compactDateLabel(dateString, locale, t) {
  const date = dateFromLocalString(dateString);
  const today = localDate();
  if (dateString === today) return t("common.today");
  if (dateString === shiftDate(today, -1)) return t("common.yesterday");
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }).format(date);
}
