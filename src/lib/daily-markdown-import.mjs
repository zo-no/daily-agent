/**
 * @fileoverview Parses daily Markdown into ordinary Log Note records without changing source text.
 */

const DAILY_FILENAME = /^(\d{4})[_-](\d{2})[_-](\d{2})\.md$/i;
const IMPORTABLE_SECTIONS = new Set(["daily", "diet", "rest", "study", "trading"]);
const BALANCE_LABEL = /^(微信|支付宝|同花顺|工商银行|北京银行|ZA|币安|餐补|汇丰)：?$/;
const BALANCE_VALUE = /^[\d.+-]+(?:HKD)?$/i;

function dateFromFilename(filename) {
  const basename = String(filename || "").split(/[\\/]/).at(-1);
  const match = basename.match(DAILY_FILENAME);
  if (!match) throw new Error("Daily Markdown filenames must use YYYY_MM_DD.md or YYYY-MM-DD.md");
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) {
    throw new Error("Daily Markdown filename contains an invalid date");
  }
  return `${year}-${month}-${day}`;
}

function sectionForHeading(line, current) {
  if (line === "## 日常记录") return "daily";
  if (line === "## 健康") return "health";
  if (line === "### 固定记录") return "fixed";
  if (line === "#### 饮食节奏") return "diet";
  if (line === "#### 作息与恢复") return "rest";
  if (line === "## 学习") return "study";
  if (line === "## 交易" || line === "### 今日观察") return "trading";
  return current;
}

function isTemplateOrPrivateAppendix(text) {
  return !text
    || /^HH:MM(?:-HH:MM)?\b/.test(text)
    || text.includes("必要时补充")
    || text.startsWith("参考字段：")
    || /^无\s*\/\s*乏力/.test(text)
    || BALANCE_LABEL.test(text)
    || BALANCE_VALUE.test(text);
}

function exactEntryKey(entry) {
  return `${entry.date}\u0000${entry.time}\u0000${entry.content}`;
}

/** Parses one supported daily Markdown file into date/time/content candidates. */
export function parseDailyMarkdown(filename, markdown) {
  const date = dateFromFilename(filename);
  const entries = [];
  let section = "daily";
  let previous = null;

  function add(time, content) {
    const normalized = content.trim();
    if (!IMPORTABLE_SECTIONS.has(section) || isTemplateOrPrivateAppendix(normalized)) return;
    const entry = { date, time, content: normalized };
    entries.push(entry);
    previous = entry;
  }

  for (const rawLine of String(markdown || "").split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("#")) {
      section = sectionForHeading(trimmed, section);
      previous = null;
      continue;
    }
    if (!trimmed || trimmed.startsWith(">") || !IMPORTABLE_SECTIONS.has(section)) continue;

    const withoutBullet = trimmed.replace(/^[-*]\s*/, "");
    if (isTemplateOrPrivateAppendix(withoutBullet)) continue;

    if (previous && section === "daily" && /^\s*\d+\.\s/.test(rawLine)) {
      previous.content += `\n${trimmed}`;
      continue;
    }

    const timed = withoutBullet.match(/^([01]\d|2[0-3]):([0-5]\d)\s*(.*)$/);
    if (timed) {
      if (timed[3].trim()) add(`${timed[1]}:${timed[2]}`, timed[3]);
      continue;
    }

    add("", withoutBullet);
  }

  const seen = new Set();
  return entries.filter((entry) => {
    const key = exactEntryKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Parses several files without relying on browser-only File APIs. */
export function parseDailyMarkdownFiles(files) {
  return files.flatMap(({ name, text }) => parseDailyMarkdown(name, text));
}

/** Merges candidates as ordinary quick records and leaves all existing state untouched. */
export function mergeDailyMarkdownEntries(state, candidates, createId) {
  if (!state || !Array.isArray(state.entries) || typeof createId !== "function") {
    throw new Error("A valid Log Note state and ID factory are required");
  }
  const quickTemplate = state.templates?.find((item) => item.id === "quick")
    || state.templates?.find((item) => item.recordType === "linear" && item.inputMode === "free")
    || null;
  const categoryId = quickTemplate?.categoryId || state.categories?.[0]?.id || "";
  const existing = new Set(state.entries.map(exactEntryKey));
  const imported = [];
  let skipped = 0;

  candidates.forEach((candidate, index) => {
    const normalized = {
      date: String(candidate.date || ""),
      time: String(candidate.time || ""),
      content: String(candidate.content || "")
    };
    const key = exactEntryKey(normalized);
    if (!normalized.date || !normalized.content || existing.has(key)) {
      skipped += 1;
      return;
    }
    existing.add(key);
    imported.push({
      id: createId("entry"),
      ...normalized,
      categoryId,
      tags: [],
      templateId: quickTemplate?.id || null,
      fieldValues: {},
      attachments: [],
      createdAt: Date.parse(`${normalized.date}T00:00:00`) + index
    });
  });

  return {
    state: imported.length ? { ...state, entries: [...state.entries, ...imported] } : state,
    imported,
    skipped
  };
}
