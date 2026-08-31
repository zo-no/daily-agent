"use client";

/** Draw one truthful 30-day line and reveal exact daily facts only on request. */

import { useEffect, useId, useMemo, useRef, useState } from "react";

function dateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function axisDate(value) {
  const parsed = dateParts(value);
  if (!parsed) return String(value || "");
  return `${String(parsed.month).padStart(2, "0")}.${String(parsed.day).padStart(2, "0")}`;
}

function detailDate(value, locale) {
  const parsed = dateParts(value);
  if (!parsed) return String(value || "");
  if (locale === "zh-CN") return `${parsed.month}月${parsed.day}日`;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)));
}

function seriesAlternative(points, locale, t) {
  const nonZero = points.filter((point) => Number(point.count) > 0);
  if (!nonZero.length) return t("insights.chartEmpty");
  return nonZero.map((point) => t("insights.chartSeriesPoint", {
    count: Number(point.count) || 0,
    date: detailDate(point.date, locale)
  })).join("; ");
}

export function TrendChart({ domainName, locale, series, t }) {
  const figureRef = useRef(null);
  const canvasRef = useRef(null);
  const descriptionId = useId();
  const instructionId = useId();
  const [selectedIndex, setSelectedIndex] = useState(null);
  const points = Array.isArray(series) ? series : [];
  const totalRecords = useMemo(
    () => points.reduce((sum, point) => sum + (Number(point.count) || 0), 0),
    [points]
  );
  const activePoints = useMemo(
    () => points.filter((point) => Number(point.count) > 0),
    [points]
  );
  const latestActiveIndex = useMemo(() => {
    for (let index = points.length - 1; index >= 0; index -= 1) {
      if (Number(points[index]?.count) > 0) return index;
    }
    return -1;
  }, [points]);
  const label = t("insights.chartLabel", {
    activeDays: activePoints.length,
    domain: domainName,
    end: points.at(-1)?.date || "",
    records: totalRecords,
    start: points[0]?.date || ""
  });
  const alternative = useMemo(
    () => seriesAlternative(points, locale, t),
    [locale, points, t]
  );
  const selected = selectedIndex === null ? null : points[selectedIndex] || null;

  useEffect(() => {
    setSelectedIndex(null);
  }, [domainName, series]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points.length) return undefined;
    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const plot = { left: 8, right: Math.max(9, width - 8), top: 12, bottom: Math.max(13, height - 30) };
      const plotWidth = Math.max(1, plot.right - plot.left);
      const plotHeight = Math.max(1, plot.bottom - plot.top);
      const x = (index) => plot.left + (points.length <= 1 ? 0 : index / (points.length - 1)) * plotWidth;
      const maxCount = Math.max(1, ...points.map((point) => Math.max(0, Number(point.count) || 0)));
      const y = (count) => plot.bottom - Math.max(0, Number(count) || 0) / maxCount * plotHeight;
      const styles = getComputedStyle(figureRef.current || canvas);
      const accent = styles.getPropertyValue("--accent").trim() || "#294f96";
      const muted = styles.getPropertyValue("--muted").trim() || "#756d61";
      const line = styles.getPropertyValue("--line").trim() || "#cec3b2";
      const lineSoft = styles.getPropertyValue("--line-soft").trim() || "#e4dccf";

      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 1;
      context.strokeStyle = lineSoft;
      for (const ratioY of [1 / 3, 2 / 3]) {
        const guideY = plot.top + plotHeight * ratioY;
        context.beginPath();
        context.moveTo(plot.left, guideY + .5);
        context.lineTo(plot.right, guideY + .5);
        context.stroke();
      }

      context.strokeStyle = line;
      context.beginPath();
      context.moveTo(plot.left, plot.bottom + .5);
      context.lineTo(plot.right, plot.bottom + .5);
      context.stroke();

      if (totalRecords > 0) {
        context.strokeStyle = accent;
        context.lineWidth = 1.5;
        context.beginPath();
        points.forEach((point, index) => {
          const pointX = x(index);
          const pointY = y(point.count);
          if (index === 0) context.moveTo(pointX, pointY);
          else context.lineTo(pointX, pointY);
        });
        context.stroke();

        context.fillStyle = accent;
        points.forEach((point, index) => {
          if (Number(point.count) <= 0) return;
          context.beginPath();
          context.arc(x(index), y(point.count), selectedIndex === index ? 4.25 : 2.4, 0, Math.PI * 2);
          context.fill();
        });
        if (selectedIndex !== null && Number(points[selectedIndex]?.count) <= 0) {
          context.beginPath();
          context.arc(x(selectedIndex), plot.bottom, 4.25, 0, Math.PI * 2);
          context.fill();
        }
      }

      context.font = '11px "IBM Plex Mono", monospace';
      context.textBaseline = "top";
      context.fillStyle = muted;
      const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];
      [...new Set(labelIndexes)].forEach((index) => {
        const text = axisDate(points[index]?.date);
        const measured = context.measureText(text).width;
        const anchor = index === 0
          ? plot.left
          : index === points.length - 1
            ? plot.right - measured
            : x(index) - measured / 2;
        context.fillText(text, Math.max(0, Math.min(width - measured, anchor)), plot.bottom + 10);
      });
    };

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [points, selectedIndex, totalRecords]);

  const selectFromPointer = (event) => {
    if (!totalRecords || points.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const plotLeft = 8;
    const plotRight = Math.max(plotLeft + 1, bounds.width - 8);
    const relativeX = Math.max(plotLeft, Math.min(plotRight, event.clientX - bounds.left));
    const index = Math.max(0, Math.min(
      points.length - 1,
      Math.round((relativeX - plotLeft) / (plotRight - plotLeft) * (points.length - 1))
    ));
    setSelectedIndex((current) => current === index ? null : index);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      if (selectedIndex !== null) {
        event.preventDefault();
        setSelectedIndex(null);
      }
      return;
    }
    if (!totalRecords || !points.length) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedIndex(latestActiveIndex);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setSelectedIndex(event.key === "Home" ? 0 : points.length - 1);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const origin = selectedIndex === null ? latestActiveIndex : selectedIndex;
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      setSelectedIndex(Math.max(0, Math.min(points.length - 1, origin + delta)));
    }
  };

  return (
    <figure
      ref={figureRef}
      className="insights-trend-chart"
      data-insights-required
      data-chart-kind="line"
      data-chart-empty={totalRecords === 0 ? "true" : "false"}
      data-selected-index={selectedIndex ?? ""}
      tabIndex={0}
      role="group"
      aria-label={label}
      aria-describedby={`${instructionId} ${descriptionId}`}
      onKeyDown={handleKeyDown}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        data-chart-canvas
        data-active-days={activePoints.length}
        data-point-count={points.length}
        onClick={selectFromPointer}
      />
      {totalRecords === 0 && <p className="insights-chart-empty" data-chart-empty-label>{t("insights.chartEmpty")}</p>}
      <p id={instructionId} className="visually-hidden">{t("insights.chartInstructions")}</p>
      <figcaption id={descriptionId} data-chart-summary>{alternative}</figcaption>
      <div className="insights-chart-live" aria-live="polite" aria-atomic="true">
        {selected && (
          <div className="insights-chart-detail" data-chart-detail data-date={selected.date}>
            <p>{t("insights.chartDetailPrimary", {
              count: Number(selected.count) || 0,
              date: detailDate(selected.date, locale)
            })}</p>
            <p>{t("insights.chartDetailSecondary", {
              activeDays: activePoints.length,
              ordinary: Number(selected.ordinaryCount) || 0,
              periodic: Number(selected.periodicCount) || 0
            })}</p>
          </div>
        )}
      </div>
    </figure>
  );
}
