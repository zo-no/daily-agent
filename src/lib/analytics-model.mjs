/**
 * @fileoverview Pure, local-only domain activity review derived from account-owned records.
 */

export const ANALYSIS_WINDOW_DAYS = 30;
export const MIN_TREND_RECORDS = 3;
export const MIN_TREND_ACTIVE_DAYS = 2;

const DEFAULT_RECENT_SOURCES = 3;
const MAX_RECENT_SOURCES = 10;
const INVESTMENT_DOMAIN_PATTERN = /(?:投资|交易|理财|金融)|\b(?:investment|trading|finance)\b/i;
const INVESTMENT_CUES = Object.freeze({
  rationale: /(?:因为|原因|理由|逻辑|判断|依据|假设|thesis|because|reason|rationale|hypothesis)/i,
  outcome: /(?:结果|复盘|回看|验证|表现|收盘|后来|收益|盈利|亏损|outcome|result|review|performed|performance|after close)/i,
  riskBoundary: /(?:风险|止损|退出|失效|边界|仓位|上限|risk|stop(?: loss)?|exit|invalidat|boundary|limit|position size)/i
});

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
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDay) return null;
  return { year, month, day };
}

function shiftCalendarDate(value, amount) {
  const parsed = parseLocalDate(value);
  if (!parsed) throw new TypeError("Expected a valid local date in YYYY-MM-DD format");
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + amount));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

function normalizedExcerpt(content, limit = 160) {
  const value = String(content || "").replace(/\s+/g, " ").trim();
  const characters = Array.from(value);
  if (characters.length <= limit) return value;
  return `${characters.slice(0, limit).join("")}…`;
}

function sourceSort(left, right) {
  return String(right.date).localeCompare(String(left.date))
    || String(right.time || "").localeCompare(String(left.time || ""))
    || (Number(right.createdAt) || 0) - (Number(left.createdAt) || 0)
    || String(right.id).localeCompare(String(left.id));
}

function domainSort(left, right) {
  return (Number(left.order) || 0) - (Number(right.order) || 0)
    || String(left.name || "").localeCompare(String(right.name || ""))
    || String(left.id).localeCompare(String(right.id));
}

function emptyReview(domain, days, unresolved = false) {
  return {
    domainId: unresolved ? "unresolved" : String(domain.id),
    name: unresolved ? "Unresolved" : String(domain.name || ""),
    order: unresolved ? Number.MAX_SAFE_INTEGER : Number(domain.order) || 0,
    totalRecords: 0,
    activeDays: 0,
    ordinaryRecords: 0,
    periodicRecords: 0,
    series: days.map((date) => ({ date, count: 0 })),
    recentSources: [],
    evidenceState: "empty",
    trendDirection: "unknown",
    trendEvidence: { previousSeven: 0, latestSeven: 0 },
    investmentLike: unresolved ? false : isInvestmentDomainName(domain.name),
    investmentCoverage: null,
    investmentPromptKey: null,
    investmentSourceIds: [],
    promptKey: null,
    _sources: []
  };
}

function finalizeReview(review, maxRecentSources) {
  review.activeDays = review.series.reduce((total, point) => total + (point.count > 0 ? 1 : 0), 0);
  const orderedSources = review._sources.sort(sourceSort);
  const reviewedSources = orderedSources.slice(0, maxRecentSources);
  review.recentSources = reviewedSources
    .map(({ content: _content, ...source }) => source);
  if (review.totalRecords === 0) {
    review.evidenceState = "empty";
  } else if (review.totalRecords < MIN_TREND_RECORDS || review.activeDays < MIN_TREND_ACTIVE_DAYS) {
    review.evidenceState = "insufficient";
  } else {
    review.evidenceState = "ready";
  }

  review.trendEvidence = {
    previousSeven: review.series.slice(-14, -7).reduce((sum, point) => sum + point.count, 0),
    latestSeven: review.series.slice(-7).reduce((sum, point) => sum + point.count, 0)
  };
  if (review.evidenceState === "ready") {
    review.trendDirection = review.trendEvidence.latestSeven > review.trendEvidence.previousSeven
      ? "up"
      : review.trendEvidence.latestSeven < review.trendEvidence.previousSeven
        ? "down"
        : "steady";
    review.promptKey = `insights.prompt.${review.trendDirection}`;
  }

  if (review.investmentLike) {
    const coverage = { rationale: 0, outcome: 0, riskBoundary: 0 };
    for (const source of reviewedSources) {
      for (const [key, pattern] of Object.entries(INVESTMENT_CUES)) {
        if (pattern.test(source.content)) coverage[key] += 1;
      }
    }
    const leastCovered = ["rationale", "outcome", "riskBoundary"]
      .reduce((least, key) => coverage[key] < coverage[least] ? key : least, "rationale");
    review.investmentCoverage = { ...coverage, leastCovered };
    review.investmentPromptKey = `insights.investmentPrompt.${leastCovered}`;
    review.investmentSourceIds = reviewedSources.map((source) => source.id);
  }

  delete review._sources;
  return review;
}

export function isInvestmentDomainName(name) {
  return INVESTMENT_DOMAIN_PATTERN.test(String(name || "").trim());
}

export function buildDomainInsights(data = {}, options = {}) {
  const endDate = options.endDate === undefined ? todayLocalDate() : String(options.endDate);
  if (!parseLocalDate(endDate)) throw new TypeError("endDate must be a valid local date in YYYY-MM-DD format");
  const maxRecentSources = Math.min(
    MAX_RECENT_SOURCES,
    Math.max(1, Number.parseInt(options.maxRecentSources, 10) || DEFAULT_RECENT_SOURCES)
  );
  const startDate = shiftCalendarDate(endDate, -(ANALYSIS_WINDOW_DAYS - 1));
  const days = Array.from({ length: ANALYSIS_WINDOW_DAYS }, (_, index) => shiftCalendarDate(startDate, index));
  const dayIndex = new Map(days.map((date, index) => [date, index]));

  const sourceDomains = Array.isArray(data?.domains) ? data.domains : [];
  const domains = sourceDomains
    .filter((domain) => domain && String(domain.id || ""))
    .map((domain) => ({ id: String(domain.id), name: String(domain.name || ""), order: Number(domain.order) || 0 }))
    .sort(domainSort);
  const reviews = new Map(domains.map((domain) => [domain.id, emptyReview(domain, days)]));
  const categoryDomain = new Map();
  for (const category of Array.isArray(data?.categories) ? data.categories : []) {
    const categoryId = String(category?.id || "");
    const domainId = String(category?.domainId || "");
    if (categoryId && reviews.has(domainId)) categoryDomain.set(categoryId, domainId);
  }
  const periodicTemplates = new Set(
    (Array.isArray(data?.templates) ? data.templates : [])
      .filter((template) => template && String(template.id || "") && template.recordType === "periodic")
      .map((template) => String(template.id))
  );
  const unresolved = emptyReview({ id: "unresolved", name: "Unresolved" }, days, true);
  const activeDates = new Set();
  const diagnostics = { invalidDateRecords: 0, outsideWindowRecords: 0 };

  for (const entry of Array.isArray(data?.entries) ? data.entries : []) {
    const date = String(entry?.date || "");
    if (!parseLocalDate(date)) {
      diagnostics.invalidDateRecords += 1;
      continue;
    }
    const index = dayIndex.get(date);
    if (index === undefined) {
      diagnostics.outsideWindowRecords += 1;
      continue;
    }

    const domainId = categoryDomain.get(String(entry?.categoryId || ""));
    const review = domainId ? reviews.get(domainId) : unresolved;
    const periodic = periodicTemplates.has(String(entry?.templateId || ""));
    review.totalRecords += 1;
    review.series[index].count += 1;
    if (periodic) review.periodicRecords += 1;
    else review.ordinaryRecords += 1;
    review._sources.push({
      id: String(entry?.id || ""),
      date,
      time: String(entry?.time || ""),
      excerpt: normalizedExcerpt(entry?.content),
      periodic,
      createdAt: Number(entry?.createdAt) || 0,
      content: String(entry?.content || "")
    });
    activeDates.add(date);
  }

  const finalizedDomains = [...reviews.values()].map((review) => finalizeReview(review, maxRecentSources));
  const finalizedUnresolved = unresolved.totalRecords > 0 ? finalizeReview(unresolved, maxRecentSources) : null;
  return {
    window: { startDate, endDate, days },
    domains: finalizedDomains,
    unresolved: finalizedUnresolved,
    totals: {
      records: finalizedDomains.reduce((sum, review) => sum + review.totalRecords, 0) + (finalizedUnresolved?.totalRecords || 0),
      activeDays: activeDates.size,
      domainsWithRecords: finalizedDomains.reduce((sum, review) => sum + (review.totalRecords > 0 ? 1 : 0), 0)
    },
    diagnostics
  };
}
