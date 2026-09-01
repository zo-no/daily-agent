import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLIC_POLICY_DOCUMENTS,
  PUBLIC_POLICY_PATHS,
  PUBLIC_POLICY_SITE,
  isPublicPolicyPath,
  publicPolicyDocumentText
} from "../src/lib/public-policies.mjs";
import { GOOGLE_CALENDAR_SCOPE, googleCalendarSyncWindow } from "../src/lib/google-calendar-model.mjs";

const LOCALES = ["en", "zh-CN"];

test("public policy routes use one stable identity and complete bilingual documents", () => {
  assert.deepEqual(PUBLIC_POLICY_PATHS, ["/about", "/privacy", "/terms"]);
  assert.equal(PUBLIC_POLICY_SITE.productName, "Log Note");
  assert.equal(PUBLIC_POLICY_SITE.supportEmail, "x2742160682@gmail.com");
  assert.match(PUBLIC_POLICY_SITE.effectiveDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(Object.keys(PUBLIC_POLICY_DOCUMENTS), ["about", "privacy", "terms"]);

  for (const [slug, document] of Object.entries(PUBLIC_POLICY_DOCUMENTS)) {
    assert.equal(document.slug, slug);
    assert.equal(document.path, `/${slug}`);
    for (const locale of LOCALES) {
      assert.ok(document.title[locale]);
      assert.ok(document.description[locale]);
      assert.ok(document.intro[locale]);
      assert.ok(document.sections[locale].length >= 3);
      assert.equal(new Set(document.sections[locale].map((section) => section.id)).size, document.sections[locale].length);
    }
    assert.deepEqual(
      document.sections.en.map((section) => section.id),
      document.sections["zh-CN"].map((section) => section.id),
      `${slug} material sections must stay parallel across languages`
    );
  }
});

test("public policy allowlist is exact and does not weaken authenticated routes", () => {
  for (const path of PUBLIC_POLICY_PATHS) assert.equal(isPublicPolicyPath(path), true);
  for (const path of ["/", "/settings", "/templates", "/about/extra", "/privacy-policy", "/auth/callback"]) {
    assert.equal(isPublicPolicyPath(path), false, `${path} must not enter the public policy boundary`);
  }
});

test("public privacy policy matches the implemented Google Calendar scope and read window", () => {
  const privacy = PUBLIC_POLICY_DOCUMENTS.privacy;
  const english = publicPolicyDocumentText(privacy, "en");
  const chinese = publicPolicyDocumentText(privacy, "zh-CN");
  const window = googleCalendarSyncWindow(new Date(2026, 7, 31, 12, 0, 0));

  assert.ok(english.includes(GOOGLE_CALENDAR_SCOPE));
  assert.ok(chinese.includes(GOOGLE_CALENDAR_SCOPE));
  assert.equal(GOOGLE_CALENDAR_SCOPE, "https://www.googleapis.com/auth/calendar.events");
  const timeMin = new Date(window.timeMin);
  const timeMax = new Date(window.timeMax);
  assert.deepEqual([timeMin.getFullYear(), timeMin.getMonth(), timeMin.getDate()], [2026, 7, 1]);
  assert.deepEqual([timeMax.getFullYear(), timeMax.getMonth(), timeMax.getDate()], [2026, 10, 30]);

  for (const phrase of [
    "primary Google Calendar",
    "30 days before",
    "91 days after",
    "read-only",
    "Log Note-managed",
    "browser memory",
    "localStorage",
    "Supabase",
    "not sell",
    "advertising",
    "Limited Use",
    "same-origin endpoint",
    "DeepSeek",
    "may be used to develop, improve, or train",
    "training opt-out",
    "overlapping Google events",
    "title and time",
    "not included in the AI prompt",
    "remain temporary",
    "remains in test status",
    "must not enable the Calendar-to-AI transfer",
    "revoke",
    "deletion"
  ]) assert.match(english, new RegExp(phrase, "i"), `English privacy policy must disclose ${phrase}`);

  for (const phrase of [
    "主日历",
    "过去 30 天",
    "未来 91 天",
    "只读",
    "Log Note 管理",
    "浏览器内存",
    "localStorage",
    "Supabase",
    "不会出售",
    "广告",
    "有限使用",
    "同源接口",
    "DeepSeek",
    "可能用于开发、改进或训练",
    "退出训练",
    "Google 事件标题和时间",
    "只读冲突上下文",
    "不会进入 AI 提示词",
    "当前会话",
    "当前仍是测试状态",
    "必须从 AI 请求中移除",
    "撤销",
    "删除"
  ]) assert.ok(chinese.includes(phrase), `Chinese privacy policy must disclose ${phrase}`);
  assert.doesNotMatch(english, /Google user data is not disclosed to the AI provider/i);
  assert.doesNotMatch(chinese, /Google 用户数据不会提供给 AI 服务/);
});

test("public terms cover the service boundary without unsupported legal identity claims", () => {
  const terms = PUBLIC_POLICY_DOCUMENTS.terms;
  const english = publicPolicyDocumentText(terms, "en");
  const chinese = publicPolicyDocumentText(terms, "zh-CN");
  const materialSections = [
    "agreement-and-eligibility",
    "accounts",
    "user-content",
    "acceptable-use",
    "backup",
    "third-party",
    "service-availability",
    "disclaimers",
    "termination",
    "changes-contact"
  ];

  assert.deepEqual(terms.sections.en.map((section) => section.id), materialSections);
  assert.match(english, /independent personal project/i);
  assert.match(english, /you retain ownership/i);
  assert.match(english, /Google|Supabase/);
  assert.match(english, /as is/i);
  assert.match(chinese, /独立个人项目/);
  assert.match(chinese, /内容的所有权/);

  const allTerms = `${english}\n${chinese}`;
  for (const unsupported of [
    /Log Note,? Inc\.?/i,
    /Log Note (?:Ltd|LLC|有限责任公司)/i,
    /governed by the laws of/i,
    /exclusive jurisdiction/i,
    /注册地址|统一社会信用代码|专属管辖/
  ]) assert.doesNotMatch(allTerms, unsupported);
});

test("public policy source contains no runtime account data or secret-shaped values", () => {
  const serialized = JSON.stringify(PUBLIC_POLICY_DOCUMENTS);
  assert.doesNotMatch(serialized, /eyJ[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(serialized, /AIza[0-9A-Za-z_-]{20,}/);
  assert.doesNotMatch(serialized, /service[_-]?role/i);
  assert.doesNotMatch(serialized, /e2e-user|auth\.uid\(\)/i);
});
