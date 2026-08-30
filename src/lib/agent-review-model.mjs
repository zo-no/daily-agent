/**
 * @fileoverview Pure normalization and deterministic fallback for transient row-local diary review.
 */

import { boundedString } from "./ai-classifier-route.mjs";

const MAX_PROMPT_CHARS = 280;
const MAX_APPEND_CHARS = 400;
const VAGUE_MARKERS = /(?:分化|变化|这个|那个|有点|处理了|弄好了|搞定|还行|不太|something|that|it\b)/i;
const VAGUE_PLAN_MARKERS = /^(?:处理一下|弄一下|搞一下|看看|跟进|开会|工作|任务|待办|其他|something|work|task|meeting)$/i;
const BUILTIN_CATEGORY_MARKERS = {
  study: ["学习", "课程", "读书", "文章", "复习"],
  trading: ["市场", "交易", "仓位", "开盘", "收盘"],
  "health-food": ["早餐", "午餐", "晚餐", "饮食", "做饭"],
  "health-rest": ["睡眠", "起床", "午休", "恢复"]
};

function compactContent(value) {
  return boundedString(value, 4000).replace(/\s+/g, " ");
}

function localQuestion(content, locale) {
  const snippet = compactContent(content).slice(0, 42);
  if (locale === "zh-CN") {
    return snippet ? `“${snippet}”具体发生了什么？可以补充变化、原因或结果。` : "这条记录还可以补充什么细节？";
  }
  return snippet ? `What exactly happened in “${snippet}”? Add the change, reason, or result.` : "What detail would make this note clearer?";
}

function categoryReviewPrompt(locale) {
  return locale === "zh-CN"
    ? "这条记录需要归到这个分类吗？"
    : "File this note in the suggested category?";
}

function categorySuggestion(entry, categories) {
  const content = compactContent(entry.content).toLocaleLowerCase();
  return categories.find((category) => {
    if (category.id === entry.currentCategoryId) return false;
    const words = [category.domainName, category.name]
      .flatMap((value) => compactContent(value).toLocaleLowerCase().split(/[\s/·]+/))
      .filter((word) => word.length >= 2);
    return words.some((word) => content.includes(word))
      || (BUILTIN_CATEGORY_MARKERS[category.id] || []).some((word) => content.includes(word));
  });
}

/** Local fallback is intentionally modest: it asks about vague notes and matches literal existing categories. */
export function createLocalAgentReview(input, {
  locale = input?.locale === "zh-CN" ? "zh-CN" : "en",
  fallbackReason = "local-only",
  generatedAt = Date.now()
} = {}) {
  const categories = Array.isArray(input?.categories) ? input.categories : [];
  const items = [];
  for (const entry of Array.isArray(input?.entries) ? input.entries : []) {
    const content = compactContent(entry.content);
    if (!content) continue;
    const category = categorySuggestion(entry, categories);
    if (category) {
      items.push({
        id: `local:category:${entry.id}`,
        entryId: entry.id,
        kind: "category",
        prompt: categoryReviewPrompt(locale),
        categoryId: category.id,
        proposedAppend: ""
      });
      continue;
    }
    if (content.length < 24 || VAGUE_MARKERS.test(content)) {
      items.push({
        id: `local:question:${entry.id}`,
        entryId: entry.id,
        kind: "question",
        prompt: localQuestion(content, locale),
        categoryId: "",
        proposedAppend: ""
      });
      continue;
    }
  }
  return {
    providerId: "local-agent-review-v1",
    fallbackReason,
    intro: locale === "zh-CN"
      ? (items.length ? `发现 ${items.length} 处可以一起看看。` : "今天的记录已经很清楚。")
      : (items.length ? `I found ${items.length} note${items.length === 1 ? "" : "s"} to review.` : "Today's notes already read clearly."),
    items: items.slice(0, 24),
    analyzedEntryIds: (input?.entries || []).map((entry) => entry.id),
    generatedAt
  };
}

/** Restricts model review items to this request's records and existing categories. */
export function normalizeAgentReviewOutput(value, input, generatedAt = Date.now(), providerId = "deepseek") {
  const entries = Array.isArray(input?.entries) ? input.entries : [];
  const entryIds = new Set(entries.map((entry) => entry.id));
  const currentCategoryByEntry = new Map(entries.map((entry) => [entry.id, entry.currentCategoryId || ""]));
  const categoryIds = new Set((input?.categories || []).map((category) => category.id));
  const usedEntries = new Set();
  const items = [];

  for (const [index, raw] of (Array.isArray(value?.items) ? value.items : []).slice(0, 48).entries()) {
    const entryId = boundedString(raw?.entryId, 128);
    const kind = raw?.kind === "question" || raw?.kind === "category" || raw?.kind === "note" ? raw.kind : "";
    const prompt = boundedString(raw?.prompt, MAX_PROMPT_CHARS);
    if (!entryIds.has(entryId) || usedEntries.has(entryId) || !kind || !prompt) continue;
    const categoryId = boundedString(raw?.categoryId, 128);
    if (kind === "category" && (!categoryIds.has(categoryId) || currentCategoryByEntry.get(entryId) === categoryId)) continue;
    usedEntries.add(entryId);
    items.push({
      id: `agent:${index}:${entryId}`,
      entryId,
      kind,
      // The category path is rendered as a separate, scannable label in the UI.
      // Keep the question generic so model output cannot duplicate that label.
      prompt: kind === "category" ? categoryReviewPrompt(input?.locale) : prompt,
      categoryId: kind === "category" ? categoryId : "",
      proposedAppend: kind === "question" ? boundedString(raw?.proposedAppend, MAX_APPEND_CHARS) : ""
    });
  }

  return {
    providerId,
    intro: boundedString(value?.intro, 180),
    items,
    analyzedEntryIds: entries.map((entry) => entry.id),
    generatedAt
  };
}

/** Resolve a category action against the record's latest local category. */
export function agentCategoryResolution(entry, categoryId, categories = []) {
  const targetCategoryId = boundedString(categoryId, 128);
  if (!entry || !targetCategoryId || !categories.some((category) => category?.id === targetCategoryId)) return "invalid";
  const currentCategoryId = boundedString(entry.categoryId || entry.currentCategoryId, 128);
  return currentCategoryId === targetCategoryId ? "already-current" : "apply";
}

/** Drop stale or no-op review rows before they become an interactive Agent step. */
export function reconcileAgentReviewItems(items, entries, categories) {
  const entryMap = new Map((Array.isArray(entries) ? entries : []).map((entry) => [entry?.id, entry]));
  const usedEntries = new Set();
  const reconciled = [];
  for (const item of Array.isArray(items) ? items : []) {
    const entry = entryMap.get(item?.entryId);
    if (!entry || usedEntries.has(item.entryId)) continue;
    if (item.kind === "category") {
      if (agentCategoryResolution(entry, item.categoryId, categories) !== "apply") continue;
    } else if (item.kind !== "question" && item.kind !== "note") {
      continue;
    }
    usedEntries.add(item.entryId);
    reconciled.push(item);
  }
  return reconciled;
}

/** Conversation output may propose text but never carries an executable action. */
export function normalizeAgentReplyOutput(value) {
  return {
    reply: boundedString(value?.reply, 500),
    proposedAppend: boundedString(value?.proposedAppend, MAX_APPEND_CHARS)
  };
}

function validPlanMinute(value, { allowEnd = false } = {}) {
  return Number.isInteger(value) && value >= 0 && value <= (allowEnd ? 1440 : 1439);
}

function validPlanInterval(startMinute, endMinute) {
  return validPlanMinute(startMinute) && validPlanMinute(endMinute, { allowEnd: true }) && endMinute > startMinute;
}

function planIntervalOverlaps(left, right) {
  return left.startMinute < right.endMinute && right.startMinute < left.endMinute;
}

function formatPlanMinute(value) {
  const minutes = Math.max(0, Math.min(1439, Math.round(Number(value) || 0)));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function vaguePlanTitle(title) {
  const compact = compactContent(title);
  return compact.length < 5 || VAGUE_PLAN_MARKERS.test(compact) || VAGUE_MARKERS.test(compact);
}

function normalizePlanProposal(value, input, planId) {
  if (!value || typeof value !== "object" || boundedString(value.planId, 128) !== planId) return null;
  const source = (input?.plans || []).find((plan) => plan.id === planId);
  if (!source) return null;
  const proposal = { planId };
  const title = boundedString(value.title, 240);
  if (title && title !== source.title) proposal.title = title;
  const hasStart = value.startMinute !== undefined;
  const hasEnd = value.endMinute !== undefined;
  if (hasStart && hasEnd && validPlanInterval(value.startMinute, value.endMinute)
    && (value.startMinute !== source.startMinute || value.endMinute !== source.endMinute)) {
    proposal.startMinute = value.startMinute;
    proposal.endMinute = value.endMinute;
  }
  return Object.keys(proposal).length > 1 ? proposal : null;
}

/** Deterministic selected-day Plan fallback: overlap first, then a modest vague-title question. */
export function createLocalPlanAgentReview(input, {
  locale = input?.locale === "zh-CN" ? "zh-CN" : "en",
  fallbackReason = "local-only",
  generatedAt = Date.now()
} = {}) {
  const plans = Array.isArray(input?.plans) ? input.plans.filter((plan) => validPlanInterval(plan.startMinute, plan.endMinute)) : [];
  const conflicts = Array.isArray(input?.conflicts) ? input.conflicts.filter((item) => validPlanInterval(item.startMinute, item.endMinute)) : [];
  const items = [];
  for (const plan of plans) {
    const localOverlap = plans.find((other) => other.id !== plan.id && planIntervalOverlaps(plan, other));
    const readOnlyOverlap = conflicts.find((other) => planIntervalOverlaps(plan, other));
    const overlap = localOverlap || readOnlyOverlap;
    if (overlap) {
      const range = `${formatPlanMinute(overlap.startMinute)}–${formatPlanMinute(overlap.endMinute)}`;
      items.push({
        id: `local:plan-overlap:${plan.id}`,
        planId: plan.id,
        kind: "plan-overlap",
        prompt: locale === "zh-CN"
          ? `与“${compactContent(overlap.title)}”在 ${range} 重叠，要调整吗？`
          : `Overlaps “${compactContent(overlap.title)}” at ${range}. Adjust it?`,
        proposal: null
      });
      continue;
    }
    if (vaguePlanTitle(plan.title)) {
      items.push({
        id: `local:plan-question:${plan.id}`,
        planId: plan.id,
        kind: "plan-question",
        prompt: locale === "zh-CN"
          ? `“${compactContent(plan.title)}”具体准备完成什么？可以补充对象或结果。`
          : `What exactly should “${compactContent(plan.title)}” accomplish? Add the object or outcome.`,
        proposal: null
      });
    }
  }
  return {
    providerId: "local-plan-agent-review-v1",
    fallbackReason,
    intro: locale === "zh-CN"
      ? (items.length ? `发现 ${items.length} 个计划值得确认。` : "这一天的计划没有明显冲突。")
      : (items.length ? `I found ${items.length} plan${items.length === 1 ? "" : "s"} to review.` : "This day's plans have no obvious conflicts."),
    items: items.slice(0, 24),
    analyzedPlanIds: plans.map((plan) => plan.id),
    generatedAt
  };
}

/** Restricts model Plan items and proposals to selected-day local plan IDs. */
export function normalizePlanAgentReviewOutput(value, input, generatedAt = Date.now(), providerId = "deepseek") {
  const plans = Array.isArray(input?.plans) ? input.plans : [];
  const planIds = new Set(plans.map((plan) => plan.id));
  const usedPlans = new Set();
  const items = [];
  for (const [index, raw] of (Array.isArray(value?.items) ? value.items : []).slice(0, 48).entries()) {
    const planId = boundedString(raw?.planId, 128);
    const kind = ["plan-question", "plan-overlap", "plan-time"].includes(raw?.kind) ? raw.kind : "";
    const prompt = boundedString(raw?.prompt, MAX_PROMPT_CHARS);
    if (!planIds.has(planId) || usedPlans.has(planId) || !kind || !prompt) continue;
    usedPlans.add(planId);
    items.push({
      id: `agent-plan:${index}:${planId}`,
      planId,
      kind,
      prompt,
      proposal: normalizePlanProposal(raw?.proposal, input, planId)
    });
  }
  return {
    providerId,
    intro: boundedString(value?.intro, 180),
    items,
    analyzedPlanIds: plans.map((plan) => plan.id),
    generatedAt
  };
}

/** Plan conversation may return an inert proposal, never an executable action. */
export function normalizePlanAgentReplyOutput(value, input, activePlanId) {
  return {
    reply: boundedString(value?.reply, 500),
    proposal: normalizePlanProposal(value?.proposal, input, boundedString(activePlanId, 128))
  };
}

/** Revalidates and merges an explicit Plan proposal into current local state. */
export function mergePlanUpdateProposal(current, proposal, selectedDate) {
  if (!current || current.source !== "local" || current.date !== selectedDate || proposal?.planId !== current.id) return null;
  const input = {
    plans: [{
      id: current.id,
      title: current.title,
      startMinute: Number(String(current.startTime || "").slice(0, 2)) * 60 + Number(String(current.startTime || "").slice(3, 5)),
      endMinute: Number(String(current.endTime || "").slice(0, 2)) * 60 + Number(String(current.endTime || "").slice(3, 5))
    }]
  };
  if (!validPlanInterval(input.plans[0].startMinute, input.plans[0].endMinute)) return null;
  const safe = normalizePlanProposal(proposal, input, current.id);
  if (!safe) return null;
  return {
    ...current,
    ...(safe.title ? { title: safe.title } : {}),
    ...(safe.startMinute !== undefined ? {
      startTime: formatPlanMinute(safe.startMinute),
      endTime: formatPlanMinute(safe.endMinute)
    } : {})
  };
}
