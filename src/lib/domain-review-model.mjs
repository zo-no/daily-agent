/**
 * @fileoverview Pure seven-day current-domain selection and strict summary validation.
 */

import {
  AiClassifierError,
  MAX_AI_CONTENT_CHARS,
  MAX_AI_ENTRIES
} from "./ai-classifier-route.mjs";
import { isInvestmentDomainName } from "./analytics-model.mjs";

export const DOMAIN_REVIEW_WINDOW_DAYS = 7;
export const MAX_DOMAIN_NAME_CHARS = 80;
export const MAX_DOMAIN_REVIEW_OVERVIEW_CHARS = 420;
export const MAX_DOMAIN_REVIEW_THEME_TITLE_CHARS = 60;
export const MAX_DOMAIN_REVIEW_THEME_SUMMARY_CHARS = 220;
export const MAX_DOMAIN_REVIEW_THEMES = 3;

const REQUEST_KEYS = Object.freeze(["windowStart", "windowEnd", "domainName", "locale", "entries"]);
const ENTRY_KEYS = Object.freeze(["id", "date", "time", "content", "sourceType"]);
const MODEL_OUTPUT_KEYS = Object.freeze(["overview", "themes"]);
const THEME_KEYS = Object.freeze(["title", "summary", "entryIds"]);
const RESPONSE_KEYS = Object.freeze(["overview", "themes", "providerId", "generatedAt"]);
const GENERAL_UNSAFE_PATTERN = /(?:(?:你|您)(?:有|患有|存在|表现出|出现|需要)|诊断|导致|造成|引起|使得|致使|源于|因为|所以|由于|因此|因而|有关|相关|关联|影响|说明你|表明你|意味着|反映出|可能有|可能是|也许有|或许有|行为评分|打分|建议|推荐|劝|应该|应当|必须|需要|不妨|可尝试|最好|可以考虑)|\b(?:diagnos\w*|causal|because|therefore|due\s+to|caus(?:e|es|ed|ing)|leads?\s+to|results?\s+(?:in|from)|contributes?\s+to|related\s+to|linked\s+to|associated\s+with|indicat\w*|suggests?|you\s+(?:have|suffer|experience|show|need)|may\s+(?:have|be)|might\s+(?:have|be)|need(?:s)?\s+to|score|scoring|recommend\w*|advise|advice|should|must|ought|you are|you should)\b/i;
const INVESTMENT_UNSAFE_PATTERN = /(?:买|卖|持有|加仓|减仓|仓位|标的|证券|价格|目标价|时机|配置|组合|风险承受|收益|回报|盈利|亏损|预测|看多|看空|做多|做空|止盈|止损|抄底|走势|涨跌)|\b(?:buy|sell|hold|security|securities|position|allocation|portfolio|timing|price(?:\s+target)?|risk\s+tolerance|returns?|profit|loss|forecast|predict\w*|bullish|bearish|long|short|stop\s*loss|take\s*profit|market\s+(?:prediction|outlook))\b/i;

function invalidInput(message) {
  return new AiClassifierError("AI_DOMAIN_REVIEW_INPUT_INVALID", message, 422);
}

function invalidResponse(message) {
  return new AiClassifierError("AI_DOMAIN_REVIEW_RESPONSE_INVALID", message, 502);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayLocalDate(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDay) return null;
  return { year, month, day };
}

function shiftCalendarDate(value, amount) {
  const parsed = parseLocalDate(value);
  if (!parsed) throw invalidInput("domain review date is invalid");
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + amount));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

function validTime(value) {
  if (value === "") return true;
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  return Boolean(match) && Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

function unicodeLength(value) {
  return Array.from(String(value)).length;
}

function boundedUnicode(value, maximum, { trim = true } = {}) {
  const source = typeof value === "string" ? value : String(value ?? "");
  const normalized = trim ? source.trim() : source;
  return Array.from(normalized).slice(0, maximum).join("");
}

function assertExactKeys(value, allowed, errorFactory, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw errorFactory(`${label} must be an object`);
  }
  const allowedSet = new Set(allowed);
  const keys = Object.keys(value);
  if (keys.length !== allowed.length || keys.some((key) => !allowedSet.has(key))) {
    throw errorFactory(`${label} contains unsupported fields`);
  }
}

function entrySortNewest(left, right) {
  return String(right.date).localeCompare(String(left.date))
    || String(right.time || "").localeCompare(String(left.time || ""))
    || String(right.id).localeCompare(String(left.id));
}

function sentenceCount(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  const segments = text.split(/[。！？.!?]+/u).map((part) => part.trim()).filter(Boolean);
  return Math.max(1, segments.length);
}

function normalizedThemeKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function assertSafeOutput(summary, input) {
  const text = [summary.overview, ...summary.themes.flatMap((theme) => [theme.title, theme.summary])].join("\n");
  if (GENERAL_UNSAFE_PATTERN.test(text)) {
    throw new AiClassifierError("AI_DOMAIN_REVIEW_UNSAFE", "domain review output crossed the advice boundary", 502);
  }
  if (isInvestmentDomainName(input.domainName) && INVESTMENT_UNSAFE_PATTERN.test(text)) {
    throw new AiClassifierError("AI_DOMAIN_REVIEW_UNSAFE", "investment review output crossed the safety boundary", 502);
  }
}

/**
 * Selects the active account payload's latest seven local days for one configured domain.
 * The caller supplies an account-isolated payload; no account identifier is read or returned.
 */
export function buildWeeklyDomainInput(data = {}, options = {}) {
  const endDate = options.endDate === undefined ? todayLocalDate(options.now) : String(options.endDate);
  if (!parseLocalDate(endDate)) throw invalidInput("domain review end date is invalid");
  const windowStart = shiftCalendarDate(endDate, -(DOMAIN_REVIEW_WINDOW_DAYS - 1));
  const domainId = boundedUnicode(options.domainId, 128);
  const configuredDomain = (Array.isArray(data?.domains) ? data.domains : [])
    .find((domain) => String(domain?.id || "") === domainId);
  const requestedDomainName = boundedUnicode(options.domainName, MAX_DOMAIN_NAME_CHARS);
  const domainName = requestedDomainName || boundedUnicode(configuredDomain?.name, MAX_DOMAIN_NAME_CHARS);
  const locale = options.locale === "zh-CN" ? "zh-CN" : "en";
  const targetCategories = new Set(
    (Array.isArray(data?.categories) ? data.categories : [])
      .filter((category) => configuredDomain && String(category?.domainId || "") === domainId)
      .map((category) => String(category?.id || ""))
      .filter(Boolean)
  );
  const periodicTemplates = new Set(
    (Array.isArray(data?.templates) ? data.templates : [])
      .filter((template) => template?.recordType === "periodic" && String(template?.id || ""))
      .map((template) => String(template.id))
  );
  const seenIds = new Set();
  const candidates = [];
  for (const entry of Array.isArray(data?.entries) ? data.entries : []) {
    const date = String(entry?.date || "");
    const id = boundedUnicode(entry?.id, 128);
    if (!id || seenIds.has(id) || !parseLocalDate(date) || date < windowStart || date > endDate) continue;
    if (!targetCategories.has(String(entry?.categoryId || ""))) continue;
    const rawTime = entry?.time;
    const time = rawTime === undefined || rawTime === null ? "" : rawTime;
    if (typeof time !== "string" || !validTime(time)) continue;
    seenIds.add(id);
    const periodic = periodicTemplates.has(String(entry?.templateId || ""));
    candidates.push({
      id,
      date,
      time,
      content: boundedUnicode(entry?.content, MAX_AI_CONTENT_CHARS, { trim: false }),
      sourceType: periodic ? "periodic" : "ordinary"
    });
  }
  candidates.sort(entrySortNewest);
  const ordinaryCount = candidates.reduce((count, entry) => count + (entry.sourceType === "ordinary" ? 1 : 0), 0);
  const periodicCount = candidates.length - ordinaryCount;
  const activeDays = new Set(candidates.map((entry) => entry.date)).size;
  const entries = candidates.slice(0, MAX_AI_ENTRIES);
  return {
    windowStart,
    windowEnd: endDate,
    domainId,
    domainName,
    locale,
    entries,
    totalCount: candidates.length,
    ordinaryCount,
    periodicCount,
    omittedCount: Math.max(0, candidates.length - entries.length),
    limitedSample: candidates.length < 3 || activeDays < 2
  };
}

/** Strictly validates the public API request without silently dropping extra fields. */
export function sanitizeDomainReviewInput(value) {
  assertExactKeys(value, REQUEST_KEYS, invalidInput, "domain review input");
  const windowStart = String(value.windowStart || "");
  const windowEnd = String(value.windowEnd || "");
  if (!parseLocalDate(windowStart) || !parseLocalDate(windowEnd)
    || shiftCalendarDate(windowStart, DOMAIN_REVIEW_WINDOW_DAYS - 1) !== windowEnd) {
    throw invalidInput("domain review window must contain exactly seven local dates");
  }
  if (typeof value.domainName !== "string" || !value.domainName.trim()
    || unicodeLength(value.domainName.trim()) > MAX_DOMAIN_NAME_CHARS) {
    throw invalidInput("domain review name is invalid");
  }
  if (value.locale !== "en" && value.locale !== "zh-CN") throw invalidInput("domain review locale is invalid");
  if (!Array.isArray(value.entries) || value.entries.length < 1 || value.entries.length > MAX_AI_ENTRIES) {
    throw invalidInput("domain review requires between 1 and 80 records");
  }
  const seen = new Set();
  const entries = value.entries.map((entry) => {
    assertExactKeys(entry, ENTRY_KEYS, invalidInput, "domain review entry");
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const date = String(entry.date || "");
    const time = String(entry.time ?? "");
    if (!id || unicodeLength(id) > 128 || seen.has(id)) throw invalidInput("domain review entry ID is invalid");
    if (!parseLocalDate(date) || date < windowStart || date > windowEnd) throw invalidInput("domain review entry date is invalid");
    if (!validTime(time)) throw invalidInput("domain review entry time is invalid");
    if (typeof entry.content !== "string" || unicodeLength(entry.content) > MAX_AI_CONTENT_CHARS) {
      throw invalidInput("domain review entry content is invalid");
    }
    if (entry.sourceType !== "ordinary" && entry.sourceType !== "periodic") {
      throw invalidInput("domain review source type is invalid");
    }
    seen.add(id);
    return {
      id,
      date,
      time,
      content: entry.content,
      sourceType: entry.sourceType
    };
  });
  return {
    windowStart,
    windowEnd,
    domainName: value.domainName.trim(),
    locale: value.locale,
    entries
  };
}

/** Validates model output and adds server-controlled metadata. */
export function normalizeDomainReviewOutput(value, input, generatedAt = Date.now(), providerId = "domain-review") {
  assertExactKeys(value, MODEL_OUTPUT_KEYS, invalidResponse, "domain review model output");
  const overview = typeof value.overview === "string" ? value.overview.trim() : "";
  if (!overview || unicodeLength(overview) > MAX_DOMAIN_REVIEW_OVERVIEW_CHARS || sentenceCount(overview) > 3) {
    throw invalidResponse("domain review overview is invalid");
  }
  if (!Array.isArray(value.themes) || value.themes.length > MAX_DOMAIN_REVIEW_THEMES) {
    throw invalidResponse("domain review themes are invalid");
  }
  const allowedIds = new Set(input.entries.map((entry) => entry.id));
  const themeKeys = new Set();
  const themes = value.themes.map((theme) => {
    assertExactKeys(theme, THEME_KEYS, invalidResponse, "domain review theme");
    const title = typeof theme.title === "string" ? theme.title.trim() : "";
    const summary = typeof theme.summary === "string" ? theme.summary.trim() : "";
    const key = normalizedThemeKey(title);
    if (!title || unicodeLength(title) > MAX_DOMAIN_REVIEW_THEME_TITLE_CHARS || !key || themeKeys.has(key)) {
      throw invalidResponse("domain review theme title is invalid or duplicated");
    }
    if (!summary || unicodeLength(summary) > MAX_DOMAIN_REVIEW_THEME_SUMMARY_CHARS || sentenceCount(summary) > 1) {
      throw invalidResponse("domain review theme summary is invalid");
    }
    if (!Array.isArray(theme.entryIds) || theme.entryIds.length < 1 || theme.entryIds.length > MAX_AI_ENTRIES) {
      throw invalidResponse("domain review theme sources are invalid");
    }
    const ids = [];
    const seenIds = new Set();
    for (const rawId of theme.entryIds) {
      const id = typeof rawId === "string" ? rawId.trim() : "";
      if (!id || !allowedIds.has(id) || seenIds.has(id)) {
        throw invalidResponse("domain review theme contains an unknown or duplicate source ID");
      }
      seenIds.add(id);
      ids.push(id);
    }
    themeKeys.add(key);
    return { title, summary, entryIds: ids };
  });
  const safeProviderId = typeof providerId === "string" ? providerId.trim() : "";
  const safeGeneratedAt = Number(generatedAt);
  if (!safeProviderId || unicodeLength(safeProviderId) > 128 || !Number.isFinite(safeGeneratedAt) || safeGeneratedAt < 0) {
    throw invalidResponse("domain review metadata is invalid");
  }
  const result = { overview, themes, providerId: safeProviderId, generatedAt: safeGeneratedAt };
  assertSafeOutput(result, input);
  return result;
}

/** Strict client-side validation of the server response. */
export function validateDomainReviewResponse(value, input) {
  assertExactKeys(value, RESPONSE_KEYS, invalidResponse, "domain review response");
  return normalizeDomainReviewOutput(
    { overview: value.overview, themes: value.themes },
    input,
    value.generatedAt,
    value.providerId
  );
}
