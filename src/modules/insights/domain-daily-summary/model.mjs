/** @fileoverview Local today selection and strict daily-domain summary contracts. */

import { AiClassifierError, MAX_AI_CONTENT_CHARS, MAX_AI_ENTRIES } from "../../../shared/ai/http-boundary.mjs";
import { isInvestmentDomainName } from "../analytics/model.mjs";

export const MAX_DOMAIN_DAILY_OVERVIEW_CHARS = 420;
export const MAX_DOMAIN_DAILY_THEME_TITLE_CHARS = 60;
export const MAX_DOMAIN_DAILY_THEME_SUMMARY_CHARS = 220;
export const MAX_DOMAIN_DAILY_THEMES = 3;

const REQUEST_KEYS = Object.freeze(["domainName", "date", "locale", "entries"]);
const ENTRY_KEYS = Object.freeze(["id", "date", "time", "content", "sourceType"]);
const OUTPUT_KEYS = Object.freeze(["overview", "overviewEntryIds", "themes"]);
const THEME_KEYS = Object.freeze(["title", "summary", "entryIds"]);
const RESPONSE_KEYS = Object.freeze(["overview", "overviewEntryIds", "themes", "providerId", "generatedAt"]);
const GENERAL_UNSAFE = /(?:(?:你|您)(?:有|患有|存在|表现出|出现|需要)|诊断|导致|造成|引起|使得|致使|源于|因为|所以|由于|因此|因而|有关|相关|关联|影响|说明你|表明你|意味着|反映出|可能有|可能是|也许有|或许有|行为评分|打分|建议|推荐|劝|应该|应当|必须|不妨|可尝试|最好|可以考虑|任务|待办|提醒)|\b(?:diagnos\w*|causal|because|therefore|due\s+to|caus(?:e|es|ed|ing)|leads?\s+to|results?\s+(?:in|from)|related\s+to|linked\s+to|associated\s+with|indicat\w*|suggests?|you\s+(?:have|suffer|experience|show|need)|may\s+(?:have|be)|might\s+(?:have|be)|need(?:s)?\s+to|score|scoring|recommend\w*|advise|advice|should|must|ought|you are|you should|tasks?|to-?dos?|remind(?:er|ers|ing)?)\b/i;
const INVESTMENT_UNSAFE = /(?:买|卖|持有|加仓|减仓|仓位|标的|证券|价格|目标价|时机|配置|组合|风险承受|收益|回报|盈利|亏损|预测|看多|看空|做多|做空|止盈|止损|抄底|走势|涨跌)|\b(?:buy|sell|hold|security|securities|position|allocation|portfolio|timing|price(?:\s+target)?|risk\s+tolerance|returns?|profit|loss|forecast|predict\w*|bullish|bearish|long|short|stop\s*loss|take\s*profit|market\s+(?:prediction|outlook))\b/i;

function error(code, message, status) { return new AiClassifierError(code, message, status); }
function invalidInput(message) { return error("AI_DOMAIN_DAILY_SUMMARY_INPUT_INVALID", message, 422); }
function invalidResponse(message) { return error("AI_DOMAIN_DAILY_SUMMARY_RESPONSE_INVALID", message, 502); }
function pad(value) { return String(value).padStart(2, "0"); }
export function todayLocalDate(now = new Date()) { return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; }
function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return true;
}
function validTime(value) { if (value === "") return true; const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value)); return Boolean(m) && Number(m[1]) < 24 && Number(m[2]) < 60 && (m[3] === undefined || Number(m[3]) < 60); }
function chars(value) { return Array.from(String(value)); }
function bounded(value, max, trim = true) { const source = typeof value === "string" ? value : String(value ?? ""); return chars(trim ? source.trim() : source).slice(0, max).join(""); }
function assertKeys(value, allowed, makeError, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw makeError(`${label} must be an object`);
  const keys = Object.keys(value); const set = new Set(allowed);
  if (keys.length !== allowed.length || keys.some((key) => !set.has(key))) throw makeError(`${label} contains unsupported fields`);
}
function sentenceCount(value) { const parts = String(value || "").trim().split(/[。！？.!?]+/u).filter((part) => part.trim()); return parts.length || 0; }
function sortNewest(a, b) { return String(b.date).localeCompare(String(a.date)) || String(b.time).localeCompare(String(a.time)) || String(b.id).localeCompare(String(a.id)); }

export function buildDailyDomainInput(data = {}, { domainId = "", domainName = "", locale = "en", now, date: requestedDate } = {}) {
  const date = requestedDate === undefined ? todayLocalDate(now) : String(requestedDate);
  if (!parseDate(date)) throw invalidInput("daily summary date is invalid");
  const domain = (Array.isArray(data.domains) ? data.domains : []).find((item) => String(item?.id || "") === String(domainId));
  const name = bounded(domainName || domain?.name, 80);
  const categoryIds = new Set((Array.isArray(data.categories) ? data.categories : [])
    .filter((item) => domain && String(item?.domainId || "") === String(domainId))
    .map((item) => String(item?.id || "")).filter(Boolean));
  const periodicTemplates = new Set((Array.isArray(data.templates) ? data.templates : [])
    .filter((item) => item?.recordType === "periodic" && item?.id).map((item) => String(item.id)));
  const localCandidates = []; const candidates = []; let omittedCount = 0;
  for (const [index, entry] of (Array.isArray(data.entries) ? data.entries : []).entries()) {
    if (entry?.kind === "plan" || entry?.type === "plan" || entry?.recordType === "plan") continue;
    if (String(entry?.date || "") !== date || !categoryIds.has(String(entry?.categoryId || ""))) continue;
    const rawTime = entry?.time;
    const time = rawTime == null ? "" : rawTime;
    const sourceType = periodicTemplates.has(String(entry?.templateId || "")) ? "periodic" : "ordinary";
    localCandidates.push({
      id: typeof entry?.id === "string" ? entry.id.trim() : "",
      date,
      time,
      content: typeof entry?.content === "string" ? bounded(entry.content, MAX_AI_CONTENT_CHARS, false) : null,
      sourceType,
      _index: index
    });
  }
  const totalCount = localCandidates.length;
  const ordinaryCount = localCandidates.filter((entry) => entry.sourceType === "ordinary").length;
  localCandidates.sort((a, b) => sortNewest(a, b) || a._index - b._index);
  const seen = new Set();
  for (const candidate of localCandidates) {
    if (!candidate.id || chars(candidate.id).length > 128 || candidate.content === null || seen.has(candidate.id) || typeof candidate.time !== "string" || !validTime(candidate.time)) {
      omittedCount += 1;
      continue;
    }
    seen.add(candidate.id);
    candidates.push(candidate);
  }
  const entries = candidates.slice(0, MAX_AI_ENTRIES).map(({ _index, ...entry }) => entry);
  omittedCount += Math.max(0, candidates.length - entries.length);
  const result = { domainId: String(domainId), domainName: name, date, locale: locale === "zh-CN" ? "zh-CN" : "en", entries, totalCount, ordinaryCount, periodicCount: totalCount - ordinaryCount, omittedCount, requestable: entries.length > 0 };
  result.sourceFingerprint = JSON.stringify({
    domainId: result.domainId,
    domainName: result.domainName,
    date: result.date,
    locale: result.locale,
    totalCount: result.totalCount,
    ordinaryCount: result.ordinaryCount,
    periodicCount: result.periodicCount,
    omittedCount: result.omittedCount,
    entries: result.entries
  });
  return result;
}

export function sanitizeDomainDailySummaryInput(value) {
  assertKeys(value, REQUEST_KEYS, invalidInput, "daily domain summary input");
  if (typeof value.domainName !== "string" || !value.domainName.trim() || chars(value.domainName.trim()).length > 80) throw invalidInput("domain name is invalid");
  if (!parseDate(value.date) || (value.locale !== "en" && value.locale !== "zh-CN")) throw invalidInput("daily summary scope is invalid");
  if (!Array.isArray(value.entries) || value.entries.length < 1 || value.entries.length > MAX_AI_ENTRIES) throw invalidInput("daily summary requires between 1 and 80 records");
  const seen = new Set();
  const entries = value.entries.map((entry) => {
    assertKeys(entry, ENTRY_KEYS, invalidInput, "daily summary entry");
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const date = entry.date;
    const time = entry.time;
    if (!id || chars(id).length > 128 || seen.has(id) || typeof date !== "string" || date !== value.date || typeof time !== "string" || !validTime(time) || typeof entry.content !== "string" || chars(entry.content).length > MAX_AI_CONTENT_CHARS || !["ordinary", "periodic"].includes(entry.sourceType)) throw invalidInput("daily summary entry is invalid");
    seen.add(id); return { id, date, time, content: entry.content, sourceType: entry.sourceType };
  });
  return { domainName: value.domainName.trim(), date: value.date, locale: value.locale, entries };
}

function validateIds(ids, allowed, label) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_AI_ENTRIES) throw invalidResponse(`${label} sources are invalid`);
  const seen = new Set(); return ids.map((raw) => { const id = typeof raw === "string" ? raw.trim() : ""; if (!id || !allowed.has(id) || seen.has(id)) throw invalidResponse(`${label} contains an unknown or duplicate source ID`); seen.add(id); return id; });
}

export function normalizeDomainDailySummaryOutput(value, input, generatedAt = Date.now(), providerId = "domain-daily-summary") {
  assertKeys(value, OUTPUT_KEYS, invalidResponse, "daily domain summary output");
  const overview = typeof value.overview === "string" ? value.overview.trim() : "";
  if (!overview || chars(overview).length > MAX_DOMAIN_DAILY_OVERVIEW_CHARS || sentenceCount(overview) > 3) throw invalidResponse("daily overview is invalid");
  const allowed = new Set(input.entries.map((entry) => entry.id)); const overviewEntryIds = validateIds(value.overviewEntryIds, allowed, "daily overview");
  if (!Array.isArray(value.themes) || value.themes.length > MAX_DOMAIN_DAILY_THEMES) throw invalidResponse("daily themes are invalid");
  const titles = new Set(); const themes = value.themes.map((theme) => {
    assertKeys(theme, THEME_KEYS, invalidResponse, "daily theme"); const title = typeof theme.title === "string" ? theme.title.trim() : ""; const summary = typeof theme.summary === "string" ? theme.summary.trim() : ""; const key = title.toLocaleLowerCase();
    if (!title || chars(title).length > MAX_DOMAIN_DAILY_THEME_TITLE_CHARS || titles.has(key) || !summary || chars(summary).length > MAX_DOMAIN_DAILY_THEME_SUMMARY_CHARS || sentenceCount(summary) > 1) throw invalidResponse("daily theme is invalid");
    titles.add(key); return { title, summary, entryIds: validateIds(theme.entryIds, allowed, "daily theme") };
  });
  const result = { overview, overviewEntryIds, themes, providerId: String(providerId || "").trim(), generatedAt: Number(generatedAt) };
  if (!result.providerId || chars(result.providerId).length > 128 || !Number.isFinite(result.generatedAt) || result.generatedAt < 0) throw invalidResponse("daily summary metadata is invalid");
  const text = [overview, ...themes.flatMap((theme) => [theme.title, theme.summary])].join("\n");
  if (GENERAL_UNSAFE.test(text) || (isInvestmentDomainName(input.domainName) && INVESTMENT_UNSAFE.test(text))) throw error("AI_DOMAIN_DAILY_SUMMARY_UNSAFE", "daily summary crossed the safety boundary", 502);
  return result;
}

export function validateDomainDailySummaryResponse(value, input) {
  assertKeys(value, RESPONSE_KEYS, invalidResponse, "daily domain summary response");
  return normalizeDomainDailySummaryOutput({ overview: value.overview, overviewEntryIds: value.overviewEntryIds, themes: value.themes }, input, value.generatedAt, value.providerId);
}
