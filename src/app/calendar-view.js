"use client";

/**
 * @fileoverview 在当前记录上下文中提供可展开日期选择器与本地日计划。
 */

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { buildCalendarMonth, calendarKeyboardTarget, shiftCalendarMonth } from "@/lib/calendar-model.mjs";
import { localDate } from "@/lib/data.mjs";
import {
  createPlanDraft,
  layoutPlanBlocks,
  planBlocksForDate,
  snapPlanMinutes,
  timeToMinutes
} from "@/lib/plan-model.mjs";
import { fullDateLabel } from "./date-label";
import { PlanEditor } from "./plan-editor";

const WEEKDAY_DATES = [7, 8, 9, 10, 11, 12, 13];
const DAY_START_MINUTES = 6 * 60;
const DAY_END_MINUTES = 24 * 60;
const HOUR_HEIGHT = 72;
const DAY_HOURS = Array.from({ length: 19 }, (_, index) => index + 6);

function monthLabel(year, month, locale) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(new Date(year, month, 1));
}

function monthTrackLabel(dateString, locale) {
  const [year, month] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(year, month - 1, 1));
}

/** Shared open month grid used by the home context and single-day tools. */
export function CalendarMonthPicker({
  allDayPlans = [],
  entries = [],
  locale,
  onDateChange,
  onDaySelect,
  onMonthChange,
  planBlocks = [],
  selectedDate,
  t
}) {
  const weekStartsOn = locale === "zh-CN" ? 1 : 0;
  const month = useMemo(
    () => buildCalendarMonth(selectedDate, entries, weekStartsOn),
    [selectedDate, entries, weekStartsOn]
  );
  const planCountByDate = useMemo(() => {
    const counts = new Map();
    planBlocks.forEach((block) => counts.set(block.date, (counts.get(block.date) || 0) + 1));
    allDayPlans.forEach((block) => counts.set(block.date, (counts.get(block.date) || 0) + 1));
    return counts;
  }, [allDayPlans, planBlocks]);
  const monthOptions = useMemo(
    () => [-1, 0, 1].map((offset) => shiftCalendarMonth(selectedDate, offset)),
    [selectedDate]
  );
  const gridRef = useRef(null);
  const pendingFocusRef = useRef("");
  const weekdayIndexes = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    gridRef.current?.querySelector(`[data-calendar-date="${pendingFocusRef.current}"]`)?.focus();
    pendingFocusRef.current = "";
  }, [selectedDate]);

  function selectDay(date) {
    (onDaySelect || onDateChange)(date);
  }

  function changeMonth(date) {
    (onMonthChange || onDateChange)(date);
  }

  function handleKeyboard(event, date) {
    const target = calendarKeyboardTarget(date, event.key, weekStartsOn);
    if (target === date) return;
    event.preventDefault();
    pendingFocusRef.current = target;
    selectDay(target);
  }

  return <>
    <div className="calendar-grid" role="grid" aria-label={monthLabel(month.year, month.month, locale)} ref={gridRef}>
      <div className="calendar-weekdays" role="row">
        {weekdayIndexes.map((weekday) => (
          <span role="columnheader" key={weekday}>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, WEEKDAY_DATES[weekday]))}</span>
        ))}
      </div>
      {month.weeks.map((week) => (
        <div className="calendar-week" role="row" key={week[0].date}>
          {week.map((cell) => {
            const label = fullDateLabel(cell.date, locale);
            const planCount = planCountByDate.get(cell.date) || 0;
            return (
              <div role="gridcell" aria-selected={cell.selected} key={cell.date}>
                <button
                  className={`calendar-day${cell.inMonth ? "" : " outside-month"}${cell.selected ? " selected" : ""}${cell.count ? " has-records" : ""}${planCount ? " has-plans" : ""}`}
                  type="button"
                  data-calendar-date={cell.date}
                  tabIndex={cell.selected ? 0 : -1}
                  aria-current={cell.today ? "date" : undefined}
                  aria-label={`${cell.count ? t("home.calendarDayRecords", { date: label, count: cell.count }) : t("home.calendarDayEmpty", { date: label })}${planCount ? `, ${t("plan.count", { count: planCount })}` : ""}`}
                  onClick={() => selectDay(cell.date)}
                  onKeyDown={(event) => handleKeyboard(event, cell.date)}
                >
                  <span className="calendar-day-number"><span>{cell.day}</span></span>
                  <span className="calendar-day-signals" aria-hidden="true">
                    {cell.count > 0 && <span className="calendar-record-signal" />}
                    {planCount > 0 && <span className="calendar-plan-signal" />}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
    <nav className="calendar-month-track" aria-label={t("home.monthTrack")}>
      {monthOptions.map((date) => {
        const isCurrent = date.slice(0, 7) === selectedDate.slice(0, 7);
        return (
          <button
            className={isCurrent ? "active" : ""}
            type="button"
            key={date.slice(0, 7)}
            data-calendar-month={date.slice(0, 7)}
            aria-current={isCurrent ? "true" : undefined}
            aria-label={monthLabel(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, locale)}
            onClick={() => changeMonth(date)}
          >
            {monthTrackLabel(date, locale)}
          </button>
        );
      })}
    </nav>
  </>;
}

/** Renders an in-context date picker or the local day-plan workspace without owning persistence. */
export function CalendarView({
  calendarMode,
  entries,
  googleCalendarSupported = true,
  planBlocks,
  allDayPlans = [],
  locale,
  selectedDate,
  onDateChange,
  onDeletePlan,
  onSavePlan,
  activePlanAgentId = "",
  agentReviewPanel = null,
  agentReviewKey = "",
  agentStatus = "idle",
  clarificationPlanIds,
  clarificationSourceIdForPlan,
  agentIntro = "",
  onAgentStart,
  onAgentStop,
  onAgentRestart,
  onOpenClarification,
  onPlanEditorOpen,
  planCreateRequest = null,
  onPlanCreateRequestHandled,
  t
}) {
  const [planDraft, setPlanDraft] = useState(null);
  const [agentAnchor, setAgentAnchor] = useState(null);
  const selectedPlans = useMemo(() => planBlocksForDate(planBlocks, selectedDate), [planBlocks, selectedDate]);
  const editableSelectedPlans = useMemo(() => selectedPlans.filter((item) => item.source === "local"), [selectedPlans]);
  const selectedAllDayPlans = useMemo(() => allDayPlans.filter((item) => item.date === selectedDate), [allDayPlans, selectedDate]);
  const planLayout = useMemo(() => layoutPlanBlocks(selectedPlans), [selectedPlans]);
  const dayScrollRef = useRef(null);

  useEffect(() => {
    if (calendarMode !== "day" || !dayScrollRef.current) return;
    const firstPlan = selectedPlans[0] ? timeToMinutes(selectedPlans[0].startTime) : null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const target = selectedDate === localDate(now) ? currentMinutes : firstPlan;
    const visibleTarget = target === null ? 9 * 60 : target;
    dayScrollRef.current.scrollTop = Math.max(0, ((visibleTarget - DAY_START_MINUTES) / 60) * HOUR_HEIGHT - 120);
  }, [calendarMode, selectedDate, selectedPlans]);

  useEffect(() => {
    if (calendarMode !== "day" || !activePlanAgentId || !dayScrollRef.current) {
      setAgentAnchor(null);
      return undefined;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const block = dayScrollRef.current?.querySelector(`[data-plan-id="${CSS.escape(activePlanAgentId)}"]`);
      const shell = dayScrollRef.current?.closest(".day-plan-shell");
      if (!block || !shell) return;
      const blockBox = block.getBoundingClientRect();
      const shellBox = shell.getBoundingClientRect();
      const panel = shell.querySelector(".plan-agent-review-layer > .agent-review-panel");
      const panelHeight = panel?.getBoundingClientRect().height || 246;
      const blockTop = blockBox.top - shellBox.top;
      const blockBottom = blockBox.bottom - shellBox.top;
      const safeBottom = shellBox.height - 96;
      const below = blockBottom + 12;
      const panelY = below + panelHeight <= safeBottom
        ? below
        : Math.max(18, blockTop - panelHeight - 12);
      setAgentAnchor({
        travelerY: Math.max(72, Math.min(shellBox.height - 130, blockTop + Math.min(blockBox.height * .35, 42))),
        panelY
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const block = dayScrollRef.current.querySelector(`[data-plan-id="${CSS.escape(activePlanAgentId)}"]`);
    block?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    requestAnimationFrame(schedule);
    dayScrollRef.current.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      dayScrollRef.current?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [activePlanAgentId, agentReviewKey, calendarMode]);

  function editPlan(block) {
    onPlanEditorOpen?.();
    setPlanDraft({ ...block });
  }

  function openNewPlan(startMinutes = 9 * 60) {
    onPlanEditorOpen?.();
    setPlanDraft(createPlanDraft(selectedDate, startMinutes));
  }

  useEffect(() => {
    if (calendarMode !== "day" || !planCreateRequest?.id) return;
    const now = new Date();
    const startMinutes = selectedDate === localDate(now)
      ? now.getHours() * 60 + now.getMinutes()
      : 9 * 60;
    openNewPlan(startMinutes);
    onPlanCreateRequestHandled?.(planCreateRequest.id);
  }, [calendarMode, planCreateRequest, selectedDate, onPlanCreateRequestHandled]);

  function openPlanAtPointer(event) {
    const canvas = event.currentTarget;
    const offset = Math.max(0, Math.min(canvas.clientHeight, event.clientY - canvas.getBoundingClientRect().top));
    openNewPlan(snapPlanMinutes(DAY_START_MINUTES + (offset / HOUR_HEIGHT) * 60));
  }

  const now = new Date();
  const today = localDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const showCurrentTime = selectedDate === today && currentMinutes >= DAY_START_MINUTES && currentMinutes <= DAY_END_MINUTES;

  return (
    <section className={`calendar-view view-panel${calendarMode === "day" ? " day-mode" : " picker-mode"}`} aria-label={t(calendarMode === "day" ? "plan.dayGridLabel" : "home.calendarViewLabel")}>
      {calendarMode === "month" ? <CalendarMonthPicker
        allDayPlans={allDayPlans}
        entries={entries}
        locale={locale}
        onDateChange={onDateChange}
        planBlocks={planBlocks}
        selectedDate={selectedDate}
        t={t}
      /> : (
        <div className={`day-plan-shell${selectedAllDayPlans.length ? " has-all-day" : ""}`}>
          {selectedAllDayPlans.length > 0 && (
            <section className="day-plan-all-day" aria-label={t("plan.allDay")}>
              <span>{t("plan.allDay")}</span>
              <div>
                {selectedAllDayPlans.map((block) => (
                  <button type="button" key={block.id} onClick={() => editPlan(block)}>
                    <strong>{block.title}</strong><small>{t("plan.googleSource")}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="day-plan-scroll" ref={dayScrollRef}>
            <div className="day-plan-grid" style={{ height: `${(DAY_END_MINUTES - DAY_START_MINUTES) / 60 * HOUR_HEIGHT}px` }}>
              <div className="day-plan-hours" aria-hidden="true">
                {DAY_HOURS.map((hour) => <span key={hour} style={{ top: `${(hour - 6) * HOUR_HEIGHT}px` }}>{String(hour).padStart(2, "0")}:00</span>)}
              </div>
              <div className="day-plan-canvas" role="grid" aria-label={t("plan.dayGridLabel")} onClick={openPlanAtPointer}>
                {DAY_HOURS.map((hour) => <span className="day-plan-hour-line" aria-hidden="true" key={hour} style={{ top: `${(hour - 6) * HOUR_HEIGHT}px` }} />)}
                {planLayout.map(({ block, column, columns }) => {
                  const start = Math.max(DAY_START_MINUTES, timeToMinutes(block.startTime));
                  const end = Math.min(DAY_END_MINUTES, timeToMinutes(block.endTime));
                  if (end <= DAY_START_MINUTES || start >= DAY_END_MINUTES) return null;
                  const top = ((start - DAY_START_MINUTES) / 60) * HOUR_HEIGHT;
                  const height = Math.max(44, ((end - start) / 60) * HOUR_HEIGHT - 4);
                  return (
                    <Fragment key={block.id}>
                    <button
                      className={`plan-block ${block.flexibility === "fixed" ? "fixed" : ""}${block.source === "google" ? " google" : ""}`}
                      type="button"
                      data-plan-id={block.id}
                      data-agent-active={activePlanAgentId === block.id ? "true" : undefined}
                      aria-current={activePlanAgentId === block.id ? "step" : undefined}
                      onClick={(event) => { event.stopPropagation(); editPlan(block); }}
                      style={{
                        top: `${top + 2}px`,
                        height: `${height}px`,
                        left: `calc(${column * (100 / columns)}% + ${column ? 3 : 0}px)`,
                        width: `calc(${100 / columns}% - 4px)`
                      }}
                    >
                      <strong>{block.title}</strong>
                      <span>{block.startTime}–{block.endTime}{block.source === "google" ? ` · ${t("plan.googleSource")}` : ""}</span>
                    </button>
                    {clarificationPlanIds?.has(block.id) && <button className="today-clarification-marker today-clarification-plan-marker" type="button" data-clarification-plan-id={block.id} aria-label={t("agent.clarificationMarker")} onClick={(event) => { event.stopPropagation(); onOpenClarification?.(clarificationSourceIdForPlan?.(block.id), event.currentTarget); }} style={{ top: `${top + 4}px`, left: `calc(${(column + 1) * (100 / columns)}% - 28px)` }}><span aria-hidden="true" /></button>}
                    </Fragment>
                  );
                })}
                {showCurrentTime && <span className="day-plan-now" aria-label={t("plan.currentTime")} style={{ top: `${((currentMinutes - DAY_START_MINUTES) / 60) * HOUR_HEIGHT}px` }} />}
              </div>
            </div>
          </div>
          {!selectedPlans.length && !selectedAllDayPlans.length && (
            <div className="day-plan-empty">
              <p>{t("plan.empty")}</p>
              {googleCalendarSupported && <p className="day-plan-empty-hint">{t("plan.googleCalendarHint")}</p>}
            </div>
          )}
          {(!editableSelectedPlans.length || agentStatus !== "reviewing") && (
            <div
              className={`plan-agent-home${editableSelectedPlans.length && agentStatus !== "idle" ? " is-awake" : ""}`}
              data-agent-passive={!editableSelectedPlans.length ? "true" : undefined}
              data-agent-status={editableSelectedPlans.length ? agentStatus : "idle"}
            >
              {editableSelectedPlans.length ? (
                <button
                  className="plan-agent-wake"
                  type="button"
                  aria-label={agentStatus === "idle" ? t("agent.planWake") : t("agent.stop")}
                  aria-pressed={agentStatus !== "idle"}
                  onClick={agentStatus === "idle" ? onAgentStart : onAgentStop}
                >
                  <img className="plan-agent-wake-path" src="/ui/diary/organize-path.png" alt="" aria-hidden="true" />
                  <img className="plan-agent-wake-figure" src="/ui/diary/organize-helper.png" alt="" aria-hidden="true" />
                </button>
              ) : (
                <div className="plan-agent-wake is-passive" aria-hidden="true">
                  <img className="plan-agent-wake-path" src="/ui/diary/organize-path.png" alt="" />
                  <img className="plan-agent-wake-figure" src="/ui/diary/organize-helper.png" alt="" />
                </div>
              )}
              {!editableSelectedPlans.length && <span className="plan-agent-passive-hint">{t("agent.planEmptyHint")}</span>}
              {!!editableSelectedPlans.length && agentStatus === "idle" && <span>{t("agent.planWakeHint")}</span>}
              {!!editableSelectedPlans.length && agentStatus === "scanning" && <span role="status" aria-live="polite">{t("agent.planScanning")}</span>}
              {!!editableSelectedPlans.length && agentStatus === "complete" && (
                <div className="plan-agent-complete" role="status" aria-live="polite">
                  <strong>{t("agent.planComplete")}</strong>
                  <small>{agentIntro || t("agent.completeHint")}</small>
                  <button type="button" onClick={onAgentRestart}>{t("agent.reviewAgain")}</button>
                  <button type="button" onClick={onAgentStop}>{t("common.done")}</button>
                </div>
              )}
            </div>
          )}

          {agentStatus === "reviewing" && activePlanAgentId && agentAnchor && (
            <div className="plan-agent-review-layer" style={{ "--plan-agent-y": `${agentAnchor.travelerY}px`, "--plan-agent-panel-y": `${agentAnchor.panelY}px` }}>
              <div className="plan-agent-traveler" aria-hidden="true">
                <img className="plan-agent-traveler-path" src="/ui/diary/organize-path.png" alt="" />
                <img src="/ui/diary/organize-helper.png" alt="" />
              </div>
              {agentReviewPanel}
            </div>
          )}
        </div>
      )}

      {planDraft && <PlanEditor
        initialDraft={planDraft}
        onClose={() => setPlanDraft(null)}
        onDelete={(block) => { if (onDeletePlan(block) !== false) setPlanDraft(null); }}
        onSave={onSavePlan}
        t={t}
      />}
    </section>
  );
}
