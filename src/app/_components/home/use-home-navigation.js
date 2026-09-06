"use client";

/**
 * @fileoverview 管理首页日历、工具面板和移动端目录的视口生命周期。
 */

import { useEffect, useRef, useState } from "react";

/** Keeps viewport restoration and responsive directory state out of page orchestration. */
export function useHomeNavigation() {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mobileDirectoryEnabled, setMobileDirectoryEnabled] = useState(false);
  const monthTriggerRef = useRef(null);
  const calendarReturnScrollRef = useRef(null);
  const calendarOpenedDateRef = useRef(null);
  const calendarScrollFrameRef = useRef(0);
  const calendarViewportWidthRef = useRef(null);

  useEffect(() => () => {
    cancelAnimationFrame(calendarScrollFrameRef.current);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const sync = () => setMobileDirectoryEnabled(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!calendarOpen) return undefined;
    const viewportWidth = () => document.documentElement.clientWidth || window.innerWidth;
    calendarViewportWidthRef.current = viewportWidth();
    const keepCalendarVisible = () => {
      const nextWidth = viewportWidth();
      if (Math.abs(nextWidth - calendarViewportWidthRef.current) < 1) return;
      calendarViewportWidthRef.current = nextWidth;
      scheduleCalendarScroll(0, { smooth: false });
    };
    window.addEventListener("resize", keepCalendarVisible);
    window.visualViewport?.addEventListener("resize", keepCalendarVisible);
    return () => {
      window.removeEventListener("resize", keepCalendarVisible);
      window.visualViewport?.removeEventListener("resize", keepCalendarVisible);
      calendarViewportWidthRef.current = null;
    };
  }, [calendarOpen]);

  function scheduleCalendarScroll(top, { smooth = true } = {}) {
    cancelAnimationFrame(calendarScrollFrameRef.current);
    calendarScrollFrameRef.current = requestAnimationFrame(() => {
      calendarScrollFrameRef.current = requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top, left: 0, behavior: smooth && !reducedMotion ? "smooth" : "auto" });
      });
    });
  }

  return {
    calendarOpen,
    calendarOpenedDateRef,
    calendarReturnScrollRef,
    monthTriggerRef,
    mobileDirectoryEnabled,
    setCalendarOpen,
    scheduleCalendarScroll
  };
}
