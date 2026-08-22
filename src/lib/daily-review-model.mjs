/**
 * @fileoverview Pure chronological normalization for session-only daily AI review.
 */

function normalizedTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? `${match[1]}:${match[2]}` : "";
}

function periodForTime(time) {
  if (!time) return "unscheduled";
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function boundedText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function chronologicalReviewEntries(entries = []) {
  return [...entries].sort((left, right) => {
    const leftTime = normalizedTime(left?.time);
    const rightTime = normalizedTime(right?.time);
    if (!leftTime && rightTime) return 1;
    if (leftTime && !rightTime) return -1;
    return leftTime.localeCompare(rightTime)
      || Number(left?.createdAt || 0) - Number(right?.createdAt || 0)
      || String(left?.id || "").localeCompare(String(right?.id || ""));
  });
}

function sourceSegments(entries) {
  const groups = [];
  chronologicalReviewEntries(entries).forEach((entry) => {
    const time = normalizedTime(entry.time);
    const period = periodForTime(time);
    const previous = groups.at(-1);
    if (!previous || previous.period !== period) {
      groups.push({ period, entries: [] });
    }
    groups.at(-1).entries.push(entry);
  });
  return groups.map((group, index) => segmentFromEntries({
    entries: group.entries,
    id: `local:${group.period}:${index}`,
    period: group.period,
    sourceOnly: true
  }));
}

function segmentFromEntries({ entries, id, period, sourceOnly, summary = "", title = "" }) {
  const times = entries.map((entry) => normalizedTime(entry.time)).filter(Boolean);
  return {
    id,
    period: period || periodForTime(times[0] || ""),
    title: boundedText(title, 60),
    summary: boundedText(summary, 360),
    entryIds: entries.map((entry) => entry.id),
    startTime: times[0] || "",
    endTime: times.at(-1) || "",
    sourceOnly: Boolean(sourceOnly)
  };
}

/** Local fallback never pretends that concatenated source text is an AI summary. */
export function createLocalDailyReview(entries, {
  fallbackReason = "local-only",
  generatedAt = Date.now()
} = {}) {
  const ordered = chronologicalReviewEntries(entries);
  return {
    providerId: "local-timeline-v1",
    fallbackReason,
    overview: "",
    segments: sourceSegments(ordered),
    analyzedEntryIds: ordered.map((entry) => entry.id),
    generatedAt
  };
}

/**
 * Restrict model output to the selected day's IDs, remove duplicate references,
 * restore omissions with local groups and derive every time label from raw entries.
 */
export function normalizeDailyReviewOutput(value, input, generatedAt = Date.now(), providerId = "deepseek") {
  const entries = chronologicalReviewEntries(input?.entries || []);
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const order = new Map(entries.map((entry, index) => [entry.id, index]));
  const used = new Set();
  const generatedSegments = [];

  for (const [index, rawSegment] of (Array.isArray(value?.segments) ? value.segments : []).slice(0, 16).entries()) {
    const segmentEntries = [];
    for (const rawId of Array.isArray(rawSegment?.entryIds) ? rawSegment.entryIds : []) {
      const entryId = boundedText(rawId, 128);
      const entry = entryMap.get(entryId);
      if (!entry || used.has(entryId)) continue;
      used.add(entryId);
      segmentEntries.push(entry);
    }
    if (!segmentEntries.length) continue;
    segmentEntries.sort((left, right) => order.get(left.id) - order.get(right.id));
    generatedSegments.push(segmentFromEntries({
      entries: segmentEntries,
      id: `ai:${index}:${segmentEntries[0].id}`,
      sourceOnly: false,
      summary: rawSegment.summary,
      title: rawSegment.title
    }));
  }

  const omittedSegments = sourceSegments(entries.filter((entry) => !used.has(entry.id)));
  const segments = [...generatedSegments, ...omittedSegments]
    .sort((left, right) => Math.min(...left.entryIds.map((id) => order.get(id))) - Math.min(...right.entryIds.map((id) => order.get(id))));

  return {
    providerId,
    overview: boundedText(value?.overview, 240),
    segments,
    analyzedEntryIds: entries.map((entry) => entry.id),
    generatedAt
  };
}

export { normalizedTime, periodForTime };
