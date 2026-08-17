"use client";

/**
 * @fileoverview 用全屏方向阴影表达首页日期与月份横滑。
 */

import { useEffect, useRef, useState } from "react";
import { shiftCalendarMonth } from "@/lib/calendar-model.mjs";
import { shiftDate } from "@/lib/data.mjs";

const BLOCKED_SWIPE_TARGETS = "input, textarea, select, [contenteditable='true'], [role='dialog'], .overlay, .calendar-month-track";
const IDLE_MOTION = { phase: "idle", edgeProgress: 0, direction: "none", ready: false, targetLabel: "" };

function swipeThreshold(viewportWidth) {
  return viewportWidth * 0.2;
}

function easeOutCubic(progress) {
  return 1 - ((1 - progress) ** 3);
}

function motionLabel(dateString, locale) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" })
    .format(new Date(year, month - 1, day));
}

/** Own the full-screen gesture while keeping the paper surface visually grounded. */
export function useHomeDateSwipe({ calendarOpen, disabled, locale, onDateChange, selectedDate }) {
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const timersRef = useRef([]);
  const [motion, setMotion] = useState(IDLE_MOTION);

  function clearScheduledMotion() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function resetGesture() {
    gestureRef.current = null;
  }

  function targetDate(amount) {
    const shift = calendarOpen ? shiftCalendarMonth : shiftDate;
    return shift(selectedDate, amount);
  }

  function revertShadow(direction) {
    resetGesture();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotion((current) => ({
      ...current,
      phase: "reverting",
      direction,
      ready: false
    }));
    schedule(() => setMotion(IDLE_MOTION), reducedMotion ? 1 : 120);
  }

  function commitShadow(amount) {
    clearScheduledMotion();
    resetGesture();
    const direction = amount > 0 ? "next" : "previous";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextDate = targetDate(amount);
    const targetLabel = motionLabel(nextDate, locale);

    if (reducedMotion) {
      onDateChange(nextDate);
      setMotion(IDLE_MOTION);
      return;
    }

    setMotion((current) => ({
      ...current,
      phase: "absorbing",
      edgeProgress: 1,
      direction,
      ready: true,
      targetLabel
    }));

    schedule(() => {
      onDateChange(nextDate);
      setMotion((current) => ({
        ...current,
        phase: "fading",
        ready: false
      }));
      schedule(() => setMotion(IDLE_MOTION), 105);
    }, 70);
  }

  function handlePointerDown(event) {
    if (disabled || motion.phase !== "idle") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest?.(BLOCKED_SWIPE_TARGETS)) return;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      cancelled: false
    };
  }

  function handlePointerMove(event) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.cancelled) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.dragging) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 10) return;
      if (Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
        gesture.cancelled = true;
        return;
      }
      gesture.dragging = true;
      window.getSelection()?.removeAllRanges();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    const threshold = swipeThreshold(window.innerWidth);
    const progress = Math.min(1, Math.abs(deltaX) / threshold);
    const amount = deltaX < 0 ? 1 : -1;
    const direction = amount > 0 ? "next" : "previous";
    const nextDate = targetDate(amount);
    const ready = Math.abs(deltaX) > threshold;
    setMotion({
      phase: "dragging",
      edgeProgress: progress,
      direction,
      ready,
      targetLabel: motionLabel(nextDate, locale)
    });
  }

  function handlePointerUp(event) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const threshold = swipeThreshold(window.innerWidth);
    const shouldNavigate = gesture.dragging && Math.abs(deltaX) > threshold;

    if (!gesture.dragging) {
      resetGesture();
      return;
    }
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 120);
    const direction = deltaX < 0 ? "next" : "previous";
    if (!shouldNavigate) {
      revertShadow(direction);
      return;
    }
    commitShadow(deltaX < 0 ? 1 : -1);
  }

  function handlePointerCancel() {
    const gesture = gestureRef.current;
    if (!gesture?.dragging) {
      resetGesture();
      return;
    }
    revertShadow(motion.direction);
  }

  function handleClickCapture(event) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  return {
    motion,
    swipeProps: {
      onClickCapture: handleClickCapture,
      onPointerCancelCapture: handlePointerCancel,
      onPointerDownCapture: handlePointerDown,
      onPointerMoveCapture: handlePointerMove,
      onPointerUpCapture: handlePointerUp
    },
    swipeStyle: (() => {
      const easedProgress = easeOutCubic(motion.edgeProgress);
      return {
        "--swipe-shadow-opacity": String(Math.min(0.68, easedProgress * 0.68)),
        "--swipe-date-card-opacity": String(Math.min(1, easedProgress)),
        "--swipe-date-card-scale": String(0.94 + easedProgress * 0.06)
      };
    })()
  };
}
