/**
 * @fileoverview Deterministic, offline classifier provider for matching records to existing tags.
 */

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "but", "for", "from", "have", "into", "just", "that", "the", "this", "with",
  "今天", "一个", "一些", "已经", "然后", "还是", "这个", "那个", "我们", "自己", "可以", "没有", "进行"
]);

const TAG_ALIASES = {
  work: ["work", "工作", "项目", "报告", "评审", "会议", "待办"],
  health: ["health", "健康", "运动", "跑步", "体重", "用药", "吃药"],
  study: ["study", "学习", "课程", "读书", "文章", "知识"],
  learning: ["learning", "学习", "课程", "读书", "文章", "知识"],
  meal: ["meal", "早餐", "午餐", "晚餐", "饮食", "食物", "饭后", "胃肠"],
  sleep: ["sleep", "睡眠", "入睡", "起床", "午休"],
  "交易": ["交易", "市场", "投资", "撤资", "股票", "仓位"],
  "工作": ["工作", "项目", "报告", "评审", "会议", "待办"],
  "学习": ["学习", "课程", "读书", "文章", "知识", "模版"],
  "饮食": ["饮食", "早餐", "午餐", "晚餐", "食物", "饭后", "胃肠", "控糖"],
  "作息": ["作息", "睡眠", "入睡", "起床", "午休", "休息"]
};

function tokens(value) {
  const normalized = String(value || "").toLocaleLowerCase();
  const latin = normalized.match(/[\p{L}\p{N}]{2,}/gu) || [];
  const chineseRuns = normalized.match(/[\p{Script=Han}]{2,}/gu) || [];
  const chinesePairs = chineseRuns.flatMap((run) => Array.from(run).slice(0, -1).map((character, index) => character + Array.from(run)[index + 1]));
  return [...new Set([...latin, ...chinesePairs].filter((token) => !STOP_WORDS.has(token)))];
}

function confidenceFor(score) {
  if (score >= 0.88) return "high";
  if (score >= 0.7) return "medium";
  return "low";
}

function buildProfiles(entries, availableTags) {
  const allowed = new Set(availableTags);
  const profiles = new Map(availableTags.map((tag) => [tag, new Map()]));
  const counts = new Map(availableTags.map((tag) => [tag, 0]));
  entries.forEach((entry) => {
    (entry.tags || []).filter((tag) => allowed.has(tag)).forEach((tag) => {
      counts.set(tag, counts.get(tag) + 1);
      tokens(entry.content).forEach((token) => profiles.get(tag).set(token, (profiles.get(tag).get(token) || 0) + 1));
    });
  });
  return { counts, profiles };
}

function scoreTag(entry, tag, profiles, counts) {
  const content = String(entry.content || "").toLocaleLowerCase();
  const normalizedTag = tag.toLocaleLowerCase();
  const tagParts = tokens(normalizedTag);
  if (normalizedTag.length >= 2 && content.includes(normalizedTag)) {
    return { score: 0.96, reason: "tag-name" };
  }
  if (tagParts.length && tagParts.some((part) => content.includes(part))) {
    return { score: 0.88, reason: "tag-keyword" };
  }
  const alias = TAG_ALIASES[normalizedTag]?.find((keyword) => content.includes(keyword));
  if (alias) return { score: 0.9, reason: "tag-keyword", evidence: [alias] };

  const profile = profiles.get(tag);
  const entryTokens = tokens(content);
  const matches = entryTokens
    .map((token) => ({ token, count: profile?.get(token) || 0 }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count || left.token.localeCompare(right.token));
  if (!matches.length || !counts.get(tag)) return { score: 0, reason: "none" };
  const score = Math.min(0.84, 0.64 + Math.min(matches.length, 3) * 0.07);
  return { score, reason: "history", evidence: matches.slice(0, 3).map((item) => item.token) };
}

/** Create a replaceable provider with the same async contract a future local model can implement. */
export function createRuleClassifierProvider() {
  return {
    id: "local-rules-v1",
    async analyze({ entries, allEntries, availableTags, maxTags = 3 }) {
      const vocabulary = [...new Set(availableTags)].sort((left, right) => left.localeCompare(right));
      const { counts, profiles } = buildProfiles(allEntries, vocabulary);
      const groups = new Map();
      const unmatchedEntryIds = [];

      entries.forEach((entry) => {
        const currentTags = new Set(entry.tags || []);
        const ranked = vocabulary
          .filter((tag) => !currentTags.has(tag))
          .map((tag) => ({ tag, ...scoreTag(entry, tag, profiles, counts) }))
          .filter((item) => item.score >= 0.7)
          .sort((left, right) => right.score - left.score || left.tag.localeCompare(right.tag))
          .slice(0, maxTags);

        if (!ranked.length) unmatchedEntryIds.push(entry.id);
        ranked.forEach((match) => {
          if (!groups.has(match.tag)) {
            groups.set(match.tag, { id: `tag:${match.tag}`, tag: match.tag, entries: [], confidence: "high" });
          }
          const group = groups.get(match.tag);
          group.entries.push({ entryId: entry.id, score: match.score, reason: match.reason, evidence: match.evidence || [] });
          if (match.score < 0.88) group.confidence = "medium";
        });
      });

      return {
        providerId: this.id,
        groups: [...groups.values()].sort((left, right) => right.entries.length - left.entries.length || left.tag.localeCompare(right.tag)),
        unmatchedEntryIds,
        analyzedEntryIds: entries.map((entry) => entry.id),
        generatedAt: Date.now()
      };
    }
  };
}

export { confidenceFor };
