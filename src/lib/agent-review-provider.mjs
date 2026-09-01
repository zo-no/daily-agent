/** Browser provider for transient Agent diary review with deterministic local fallback. */

import {
  createLocalAgentReview,
  createLocalPlanAgentReview,
  normalizeAgentReplyOutput,
  normalizeAgentReviewOutput,
  normalizePlanAgentReplyOutput
} from "./agent-review-model.mjs";

function minimalPayload(value, mode) {
  if (value.reviewTarget === "plan") {
    const payload = {
      reviewTarget: "plan",
      mode,
      date: value.date,
      locale: value.locale,
      plans: (value.plans || []).map((plan) => ({
        id: plan.id,
        title: plan.title,
        startMinute: plan.startMinute,
        endMinute: plan.endMinute
      })),
      conflicts: (value.conflicts || []).map((item) => ({
        title: item.title,
        startMinute: item.startMinute,
        endMinute: item.endMinute
      }))
    };
    if (mode === "reply") {
      payload.activePlanId = value.activePlanId;
      payload.item = {
        kind: value.item?.kind,
        prompt: value.item?.prompt,
        proposal: value.item?.proposal || null
      };
      payload.messages = (value.messages || []).slice(-8).map((message) => ({ role: message.role, content: message.content }));
    }
    return payload;
  }
  const payload = {
    mode,
    date: value.date,
    locale: value.locale,
    entries: (value.entries || []).map((entry) => ({
      id: entry.id,
      time: entry.time || "",
      content: entry.content,
      currentCategoryId: entry.currentCategoryId || entry.categoryId || ""
    })),
    categories: (value.categories || []).map((category) => ({
      id: category.id,
      domainName: category.domainName,
      name: category.name
    }))
  };
  if (mode === "reply") {
    payload.activeEntryId = value.activeEntryId;
    payload.item = {
      kind: value.item?.kind,
      prompt: value.item?.prompt,
      categoryId: value.item?.categoryId || "",
      questionGoal: value.item?.questionGoal || "enrich-detail",
      candidateCategoryIds: (value.item?.candidateCategoryIds || []).slice(0, 3)
    };
    payload.messages = (value.messages || []).slice(-8).map((message) => ({ role: message.role, content: message.content }));
  }
  return payload;
}

function localReply(value) {
  const userText = [...(value.messages || [])].reverse().find((message) => message.role === "user")?.content || "";
  if (value.reviewTarget === "plan") {
    const timeMatch = /(?:^|\s)([01]\d|2[0-3]):([0-5]\d)\s*[-–—~至]\s*([01]\d|2[0-3]):([0-5]\d)(?:$|\s)/.exec(userText);
    const startMinute = timeMatch ? Number(timeMatch[1]) * 60 + Number(timeMatch[2]) : null;
    const endMinute = timeMatch ? Number(timeMatch[3]) * 60 + Number(timeMatch[4]) : null;
    return normalizePlanAgentReplyOutput({
      reply: value.locale === "zh-CN" ? "计划还没改，确认后才会更新。" : "The plan is unchanged until you confirm.",
      proposal: timeMatch && endMinute > startMinute
        ? { planId: value.activePlanId, startMinute, endMinute }
        : userText ? { planId: value.activePlanId, title: userText.slice(0, 240) } : null
    }, value, value.activePlanId);
  }
  if (value.item?.questionGoal === "clarify-category") {
    const normalizedUserText = String(userText).toLocaleLowerCase();
    const candidateIds = new Set((value.item.candidateCategoryIds || []).slice(0, 3));
    const matches = (value.categories || []).filter((category) => {
      if (!candidateIds.has(category.id)) return false;
      return [category.id, category.domainName, category.name]
        .map((part) => String(part || "").trim().toLocaleLowerCase())
        .filter(Boolean)
        .some((part) => normalizedUserText.includes(part));
    });
    if (matches.length === 1) {
      return normalizeAgentReplyOutput({
        outcome: "category",
        reply: value.locale === "zh-CN" ? "这个回答已经能区分分类，确认后才会归档。" : "That answer distinguishes the category; filing still requires confirmation.",
        categoryId: matches[0].id
      }, value);
    }
    const answerCount = (value.messages || []).filter((message) => message.role === "user").length;
    return normalizeAgentReplyOutput(answerCount < 2 ? {
      outcome: "ask",
      reply: value.locale === "zh-CN" ? "还不能确定。可以再说说这条记录的主要对象或目的么？" : "I still cannot tell. What is the main subject or purpose of this note?"
    } : {
      outcome: "none",
      reply: value.locale === "zh-CN" ? "现有信息还不足以安全分类，建议保持原文。" : "There is not enough information to classify this safely, so keep the original."
    }, value);
  }
  return normalizeAgentReplyOutput({
    outcome: userText ? "append" : "none",
    reply: value.locale === "zh-CN" ? "我记下了。确认后才会补到原记录或作为新记录。" : "Got it. It will only be appended or saved as a new note after you confirm.",
    proposedAppend: userText
  }, value);
}

export function createRemoteAgentReviewProvider({
  endpoint = "/api/organize/agent",
  fetchImpl = globalThis.fetch,
  getAccessToken
} = {}) {
  async function request(mode, value) {
    try {
      const token = typeof getAccessToken === "function" ? await getAccessToken() : "";
      if (!token || typeof fetchImpl !== "function") throw new Error("remote agent unavailable");
      const controller = new AbortController();
      const abortFromCaller = () => controller.abort();
      if (value.signal?.aborted) controller.abort();
      else value.signal?.addEventListener("abort", abortFromCaller, { once: true });
      const timeout = setTimeout(() => controller.abort(), 25_000);
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(minimalPayload(value, mode)),
          cache: "no-store",
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
        value.signal?.removeEventListener("abort", abortFromCaller);
      }
      if (!response.ok) throw new Error(`remote agent failed with ${response.status}`);
      const result = await response.json();
      if (value.reviewTarget === "plan") return result;
      return mode === "reply"
        ? normalizeAgentReplyOutput(result, value)
        : normalizeAgentReviewOutput(result, value, result.generatedAt || Date.now(), result.providerId || "remote-agent-review");
    } catch (error) {
      if (mode === "reply") return { ...localReply(value), fallbackReason: error?.name === "AbortError" ? "remote-timeout" : "remote-unavailable" };
      return value.reviewTarget === "plan" ? createLocalPlanAgentReview(value, {
        locale: value.locale,
        fallbackReason: error?.name === "AbortError" ? "remote-timeout" : "remote-unavailable"
      }) : createLocalAgentReview(value, {
        locale: value.locale,
        fallbackReason: error?.name === "AbortError" ? "remote-timeout" : "remote-unavailable"
      });
    }
  }
  return {
    id: "deepseek-agent-review-v1",
    analyze(value) { return request("analyze", value); },
    reply(value) { return request("reply", value); }
  };
}
