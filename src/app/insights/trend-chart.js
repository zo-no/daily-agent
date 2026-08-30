"use client";

/** Draw one restrained, data-backed line while keeping the same facts available as text. */

import { useEffect, useMemo, useRef } from "react";

function shortDate(value, locale) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

export function TrendChart({ domainName, locale, series, t }) {
  const canvasRef = useRef(null);
  const points = Array.isArray(series) ? series : [];
  const summary = useMemo(() => {
    if (!points.length) return "";
    const middleIndex = Math.floor((points.length - 1) / 2);
    const first = points[0];
    const middle = points[middleIndex];
    const last = points.at(-1);
    return t("insights.chartSummary", {
      firstDate: shortDate(first.date, locale),
      first: first.count,
      middleDate: shortDate(middle.date, locale),
      middle: middle.count,
      lastDate: shortDate(last.date, locale),
      last: last.count
    });
  }, [locale, points, t]);
  const label = t("insights.chartLabel", { domain: domainName });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points.length) return undefined;
    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      const width = Math.max(240, Math.round(canvas.getBoundingClientRect().width));
      const height = Math.max(176, Math.round(canvas.getBoundingClientRect().height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const plot = { left: 26, right: width - 10, top: 16, bottom: height - 31 };
      const plotWidth = Math.max(1, plot.right - plot.left);
      const plotHeight = Math.max(1, plot.bottom - plot.top);
      const maximum = Math.max(1, ...points.map((point) => Number(point.count) || 0));
      const x = (index) => plot.left + (points.length <= 1 ? 0 : index / (points.length - 1)) * plotWidth;
      const y = (count) => plot.bottom - (Number(count) || 0) / maximum * plotHeight;

      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "rgba(112, 101, 84, .24)";
      context.lineWidth = 1;
      for (let guide = 0; guide <= 2; guide += 1) {
        const guideY = plot.top + guide / 2 * plotHeight;
        context.beginPath();
        context.moveTo(plot.left, guideY + .5);
        context.lineTo(plot.right, guideY + .5);
        context.stroke();
      }

      context.strokeStyle = "#315b9b";
      context.lineWidth = 2;
      context.beginPath();
      points.forEach((point, index) => {
        const pointX = x(index);
        const pointY = y(point.count);
        if (index === 0) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
      });
      context.stroke();

      context.fillStyle = "#315b9b";
      points.forEach((point, index) => {
        if (!point.count) return;
        context.beginPath();
        context.arc(x(index), y(point.count), 2.6, 0, Math.PI * 2);
        context.fill();
      });

      context.fillStyle = "#756f64";
      context.font = '11px "IBM Plex Mono", monospace';
      context.textBaseline = "top";
      const labels = [0, Math.floor((points.length - 1) / 2), points.length - 1];
      labels.forEach((index, labelIndex) => {
        const text = shortDate(points[index].date, locale);
        const measured = context.measureText(text).width;
        const anchor = labelIndex === 0 ? plot.left : labelIndex === labels.length - 1 ? plot.right - measured : x(index) - measured / 2;
        context.fillText(text, Math.max(0, Math.min(width - measured, anchor)), plot.bottom + 10);
      });
    };

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [locale, points]);

  return (
    <figure className="insights-trend-chart" data-insights-required>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        data-chart-kind="line"
        data-point-count={points.length}
      />
      <figcaption data-chart-summary>{summary}</figcaption>
    </figure>
  );
}
