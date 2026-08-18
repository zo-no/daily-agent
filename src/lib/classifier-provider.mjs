/**
 * @fileoverview Deterministic offline and authenticated remote category classifiers.
 */

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "but", "for", "from", "have", "into", "just", "that", "the", "this", "with",
  "今天", "一个", "一些", "已经", "然后", "还是", "这个", "那个", "我们", "自己", "可以", "没有", "进行", "记录"
]);

const CATEGORY_ALIASES = {
  "health-food": ["早餐", "午餐", "晚餐", "加餐", "饮食", "食物", "吃了", "喝了", "饭后", "胃肠", "控糖"],
  "health-rest": ["作息", "睡眠", "入睡", "起床", "熬夜", "午休", "休息", "恢复", "饮水", "用药"],
  "health-fixed": ["体重", "晨重", "晚重", "腰围", "步数", "身体指标"],
  study: ["学习", "课程", "读书", "文章", "知识", "笔记", "复习"],
  trading: ["交易", "市场", "投资", "股票", "基金", "仓位", "行情", "撤资"]
};

function tokens(value) {
  const normalized = String(value || "").toLocaleLowerCase();
  const latin = normalized.match(/[\p{L}\p{N}]{2,}/gu) || [];
  const chineseRuns = normalized.match(/[\p{Script=Han}]{2,}/gu) || [];
  const chinesePairs = chineseRuns.flatMap((run) => {
    const characters = Array.from(run);
    return characters.slice(0, -1).map((character, index) => character + characters[index + 1]);
  });
  return [...new Set([...latin, ...chinesePairs].filter((token) => !STOP_WORDS.has(token)))];
}

function confidenceFor(score) {
  if (score >= 0.88) return "high";
  if (score >= 0.7) return "medium";
  return "low";
}

function categoryPhrases(category) {
  return [...new Set([
    category.name,
    category.domainName,
    ...(category.hints || []),
    ...(CATEGORY_ALIASES[category.id] || [])
  ].map((value) => String(value || "").toLocaleLowerCase().trim()).filter((value) => value.length >= 2))];
}

function buildProfiles(entries, categoryIds) {
  const allowed = new Set(categoryIds);
  const profiles = new Map(categoryIds.map((categoryId) => [categoryId, new Map()]));
  const counts = new Map(categoryIds.map((categoryId) => [categoryId, 0]));
  entries.forEach((entry) => {
    if (!allowed.has(entry.categoryId)) return;
    counts.set(entry.categoryId, counts.get(entry.categoryId) + 1);
    tokens(entry.content).forEach((token) => {
      const profile = profiles.get(entry.categoryId);
      profile.set(token, (profile.get(token) || 0) + 1);
    });
  });
  return { counts, profiles };
}

function scoreCategory(entry, category, profiles, counts) {
  const content = String(entry.content || "").toLocaleLowerCase();
  const categoryName = String(category.name || "").toLocaleLowerCase();
  if (categoryName.length >= 2 && content.includes(categoryName)) {
    return { score: 0.96, reason: "category-name", evidence: [category.name] };
  }

  const aliases = CATEGORY_ALIASES[category.id] || [];
  const alias = aliases.find((keyword) => content.includes(String(keyword).toLocaleLowerCase()));
  if (alias) return { score: 0.92, reason: "category-keyword", evidence: [alias] };

  const hint = categoryPhrases(category)
    .filter((phrase) => phrase !== categoryName && phrase !== String(category.domainName || "").toLocaleLowerCase())
    .find((phrase) => content.includes(phrase));
  if (hint) return { score: 0.88, reason: "category-keyword", evidence: [hint] };

  const profile = profiles.get(category.id);
  const matches = tokens(content)
    .map((token) => ({ token, count: profile?.get(token) || 0 }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count || left.token.localeCompare(right.token));
  if (!matches.length || !counts.get(category.id)) return { score: 0, reason: "none", evidence: [] };
  const score = Math.min(0.84, 0.63 + Math.min(matches.length, 3) * 0.07);
  return { score, reason: "history", evidence: matches.slice(0, 3).map((item) => item.token) };
}

/** Create a replaceable provider that assigns at most one existing category per record. */
export function createRuleClassifierProvider() {
  return {
    id: "local-rules-v2",
    async analyze({ entries, allEntries, categories }) {
      const vocabulary = Array.isArray(categories) ? categories : [];
      const { counts, profiles } = buildProfiles(allEntries || [], vocabulary.map((category) => category.id));
      const groups = new Map();
      const unmatchedEntryIds = [];

      (entries || []).forEach((entry) => {
        const match = vocabulary
          .filter((category) => category.id !== entry.categoryId)
          .map((category, index) => ({ category, index, ...scoreCategory(entry, category, profiles, counts) }))
          .filter((item) => item.score >= 0.7)
          .sort((left, right) => right.score - left.score || left.index - right.index)[0];

        if (!match) {
          unmatchedEntryIds.push(entry.id);
          return;
        }
        if (!groups.has(match.category.id)) {
          groups.set(match.category.id, {
            id: `category:${match.category.id}`,
            categoryId: match.category.id,
            entries: [],
            confidence: "high"
          });
        }
        const group = groups.get(match.category.id);
        group.entries.push({ entryId: entry.id, score: match.score, reason: match.reason, evidence: match.evidence });
        if (confidenceFor(match.score) === "medium") group.confidence = "medium";
      });

      return {
        providerId: this.id,
        groups: vocabulary.map((category) => groups.get(category.id)).filter(Boolean),
        unmatchedEntryIds,
        analyzedEntryIds: (entries || []).map((entry) => entry.id),
        generatedAt: Date.now()
      };
    }
  };
}

function historyExamples(entries, selectedEntries, categories) {
  const allowed = new Set(categories.map((category) => category.id));
  const selectedIds = new Set(selectedEntries.map((entry) => entry.id));
  const groups = new Map(categories.map((category) => [category.id, []]));
  (entries || [])
    .filter((entry) => !selectedIds.has(entry.id) && allowed.has(entry.categoryId) && String(entry.content || "").trim())
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
    .forEach((entry) => groups.get(entry.categoryId).push(entry));

  const examples = [];
  let offset = 0;
  while (examples.length < 24) {
    let added = false;
    categories.forEach((category) => {
      if (examples.length >= 24) return;
      const entry = groups.get(category.id)?.[offset];
      if (!entry) return;
      examples.push({ id: entry.id, content: entry.content, categoryId: entry.categoryId });
      added = true;
    });
    if (!added) break;
    offset += 1;
  }
  return examples;
}

/** Uses the authenticated server route first and explicitly falls back to local category rules. */
export function createRemoteClassifierProvider({
  getAccessToken,
  fetchImpl = globalThis.fetch,
  fallbackProvider = createRuleClassifierProvider(),
  endpoint = "/api/organize/analyze"
} = {}) {
  return {
    id: "deepseek-remote-v2",
    async analyze({ entries, allEntries, categories }) {
      try {
        const token = typeof getAccessToken === "function" ? await getAccessToken() : "";
        if (!token || typeof fetchImpl !== "function") throw new Error("remote classifier unavailable");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25_000);
        let response;
        try {
          response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              entries: entries.map((entry) => ({ id: entry.id, content: entry.content, currentCategoryId: entry.categoryId || "" })),
              examples: historyExamples(allEntries, entries, categories),
              categories
            }),
            cache: "no-store",
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeout);
        }
        if (!response.ok) throw new Error(`remote classifier failed with ${response.status}`);
        const result = await response.json();
        if (!result || !Array.isArray(result.groups) || !Array.isArray(result.analyzedEntryIds)) {
          throw new Error("remote classifier returned an invalid result");
        }
        return result;
      } catch (error) {
        const fallback = await fallbackProvider.analyze({ entries, allEntries, categories });
        return { ...fallback, fallbackReason: error?.name === "AbortError" ? "remote-timeout" : "remote-unavailable" };
      }
    }
  };
}

export { confidenceFor };
