/**
 * @fileoverview 首页底部导出与新增操作区。
 */

import { compactDateLabel } from "../../date-label";

/** Keeps primary actions visually local while callbacks remain owned by HomePage. */
export function HomeActionDock({ dayPlanActive, exportToday, locale, openPrimaryCreate, selectedDate, t }) {
  return (
    <div
      className="action-dock action-rail"
      aria-label={t("home.quickActions")}
      data-bottom-action-bar
      data-edge-rail-item="workspace-actions"
    >
      {!dayPlanActive && (
        <button
          className="export-fab"
          data-edge-rail-item="export"
          type="button"
          onClick={exportToday}
          aria-label={t("home.exportCurrent", { date: compactDateLabel(selectedDate, locale, t) })}
        >
          <span className="export-rail-icon" aria-hidden="true">
            <img src="/ui/diary/export-stamp.png" alt="" />
          </span>
          <span className="export-fab-label">{t("home.exportTodayLabel")}</span>
        </button>
      )}
      <button
        className="fab home-primary-create"
        data-bottom-action="create"
        data-edge-rail-item="record"
        data-workspace-create={dayPlanActive ? "plan" : "diary"}
        type="button"
        onClick={openPrimaryCreate}
        aria-label={dayPlanActive ? t("plan.add") : t("home.addRecord")}
      >
        <img src="/ui/diary/record-stamp.png" alt="" aria-hidden="true" />
      </button>
    </div>
  );
}
