"use client";

/** Draw one restrained, data-backed rhythm while keeping the same facts available as text. */

import { useEffect, useMemo, useRef } from "react";

function shortDate(value) {
  const [, month, day] = String(value).split("-");
  return month && day ? `${month}.${day}` : String(value || "");
}

export function TrendChart({ domainName, series, t }) {
  const canvasRef = useRef(null);
  const points = Array.isArray(series) ? series : [];
  const totalRecords = useMemo(
    () => points.reduce((sum, point) => sum + (Number(point.count) || 0), 0),
    [points]
  );
  const activePoints = useMemo(
    () => points.filter((point) => Number(point.count) > 0),
    [points]
  );
  const summary = useMemo(() => {
    if (!points.length || activePoints.length === 0) return t("insights.chartEmpty");
    if (activePoints.length === 1) {
      return t("insights.chartSingleDay", { date: shortDate(activePoints[0].date) });
    }
    return t("insights.chartActiveDays", { count: activePoints.length });
  }, [activePoints, points.length, t]);
  const label = t("insights.chartLabel", {
    activeDays: activePoints.length,
    domain: domainName,
    end: points.at(-1)?.date || "",
    records: totalRecords,
    start: points[0]?.date || ""
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points.length) return undefined;
    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      const width = Math.max(240, Math.round(canvas.getBoundingClientRect().width));
      const height = Math.max(168, Math.round(canvas.getBoundingClientRect().height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const plot = { left: 2, right: width - 8, top: 16, bottom: height - 38 };
      const plotWidth = Math.max(1, plot.right - plot.left);
      const x = (index) => plot.left + (points.length <= 1 ? 0 : index / (points.length - 1)) * plotWidth;
      const styles = getComputedStyle(canvas);
      const accent = styles.getPropertyValue("--accent").trim() || "#294f96";
      const muted = styles.getPropertyValue("--muted").trim() || "#756d61";
      const line = styles.getPropertyValue("--line").trim() || "#cec3b2";

      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = line;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(plot.left, plot.bottom + .5);
      context.lineTo(plot.right, plot.bottom + .5);
      context.stroke();

      [0, 7, 14, 21, points.length - 1].forEach((index) => {
        if (index < 0 || index >= points.length) return;
        context.beginPath();
        context.moveTo(x(index), plot.bottom - 5);
        context.lineTo(x(index), plot.bottom + 5);
        context.stroke();
      });

      points.forEach((point, index) => {
        const count = Math.max(0, Math.round(Number(point.count) || 0));
        if (!count) return;
        const visibleDots = Math.min(count, 6);
        const availableHeight = Math.max(28, plot.bottom - plot.top - 8);
        const dotStep = visibleDots <= 1 ? 0 : Math.min(12, availableHeight / (visibleDots - 1));
        const bottomDot = plot.bottom - 8;
        const topDot = bottomDot - dotStep * (visibleDots - 1);
        context.strokeStyle = accent;
        context.lineWidth = 1.25;
        context.beginPath();
        context.moveTo(x(index), plot.bottom);
        context.lineTo(x(index), topDot);
        context.stroke();
        context.fillStyle = accent;
        for (let marker = 0; marker < visibleDots; marker += 1) {
          context.beginPath();
          context.arc(x(index), bottomDot - dotStep * marker, 3, 0, Math.PI * 2);
          context.fill();
        }
      });

      context.font = '11px "IBM Plex Mono", monospace';
      context.textBaseline = "top";
      const activeIndexes = points
        .map((point, index) => Number(point.count) > 0 ? index : -1)
        .filter((index) => index >= 0);
      const labelIndexes = activeIndexes.length === 1
        ? [0, activeIndexes[0], points.length - 1]
        : [0, Math.floor((points.length - 1) / 2), points.length - 1];
      [...new Set(labelIndexes)].forEach((index) => {
        const text = shortDate(points[index].date);
        const measured = context.measureText(text).width;
        const anchor = index === 0
          ? plot.left
          : index === points.length - 1
            ? plot.right - measured
            : x(index) - measured / 2;
        context.fillStyle = Number(points[index].count) > 0 ? accent : muted;
        context.fillText(text, Math.max(0, Math.min(width - measured, anchor)), plot.bottom + 12);
      });
    };

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [points]);

  return (
    <figure className="insights-trend-chart" data-insights-required>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        data-chart-kind="rhythm"
        data-active-days={activePoints.length}
        data-point-count={points.length}
      />
      <figcaption data-chart-summary>{summary}</figcaption>
    </figure>
  );
}
