import {
  DAILY_LOG_SCHEMA_VERSION,
  DAILY_LOG_STATUSES,
  dailyLogInputSchema,
  dailyLogProposalSchema,
  normalizeDailyLogText
} from "./contract.mjs";

const COPY = Object.freeze({
  "zh-CN": Object.freeze({
    title: "今日工作总结",
    completed: "已完成：",
    "in-progress": "进行中：",
    blocked: "受阻："
  }),
  en: Object.freeze({
    title: "Daily work summary",
    completed: "Completed:",
    "in-progress": "In progress:",
    blocked: "Blocked:"
  })
});

function fingerprint(value) {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-${hash.toString(16).padStart(8, "0")}`;
}

function contentFor(locale, items) {
  const copy = COPY[locale];
  const sections = [copy.title];

  DAILY_LOG_STATUSES.forEach((status) => {
    const matching = items.filter((item) => item.status === status);
    if (!matching.length) return;
    sections.push([copy[status], ...matching.map((item) => `- ${item.summary}`)].join("\n"));
  });

  return sections.join("\n\n");
}

/** Build one deterministic, explicitly unsaved ordinary-record candidate. */
export function prepareDailyLogProposal(value) {
  const input = dailyLogInputSchema.parse(value);
  const items = input.items.map((item) => ({
    id: normalizeDailyLogText(item.id),
    status: item.status,
    summary: normalizeDailyLogText(item.summary)
  }));
  const normalizedSource = {
    schemaVersion: DAILY_LOG_SCHEMA_VERSION,
    targetDate: input.targetDate,
    locale: input.locale,
    items
  };

  return dailyLogProposalSchema.parse({
    schemaVersion: DAILY_LOG_SCHEMA_VERSION,
    kind: "daily-work-log",
    targetDate: input.targetDate,
    locale: input.locale,
    sourceIds: items.map((item) => item.id),
    sourceFingerprint: fingerprint(JSON.stringify(normalizedSource)),
    recordCandidate: {
      date: input.targetDate,
      time: "",
      content: contentFor(input.locale, items)
    },
    writePolicy: "preview-required"
  });
}
