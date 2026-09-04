import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTENT_IMPROVEMENT_SCHEMA_VERSION,
  MAX_CONTENT_IMPROVEMENT_RESULT_CHARS,
  MAX_CONTENT_IMPROVEMENT_SOURCE_CHARS,
  contentImprovementFingerprint,
  contentImprovementInstructions,
  normalizeContentImprovementOutput,
  sanitizeContentImprovementInput,
  validateContentImprovementResponse
} from "../src/modules/composer/content-improvement/model.mjs";

const content = "以后做事先想清楚，再开始行动。\n\n- 保留 Markdown\n- 保留原意 ✨";
const request = {
  schemaVersion: CONTENT_IMPROVEMENT_SCHEMA_VERSION,
  requestId: "improve_12345678",
  target: "composer_12345678",
  sourceFingerprint: contentImprovementFingerprint(content),
  locale: "zh-CN",
  content
};

test("内容优化输入只接受六个字段并逐字保留正文", () => {
  const safe = sanitizeContentImprovementInput(request);
  assert.deepEqual(Object.keys(safe).sort(), [
    "content",
    "locale",
    "requestId",
    "schemaVersion",
    "sourceFingerprint",
    "target"
  ]);
  assert.equal(safe.content, content);
  assert.equal(safe.target, "composer_12345678");
  assert.doesNotMatch(safe.target, /entry|user|account/i);

  assert.throws(() => sanitizeContentImprovementInput({ ...request, entryId: "entry-a" }), /unknown|field|schema/i);
  assert.throws(() => sanitizeContentImprovementInput({ ...request, content: " ".repeat(20), sourceFingerprint: contentImprovementFingerprint(" ".repeat(20)) }), /content/i);
  const overLimit = "中".repeat(MAX_CONTENT_IMPROVEMENT_SOURCE_CHARS + 1);
  assert.throws(() => sanitizeContentImprovementInput({
    ...request,
    content: overLimit,
    sourceFingerprint: contentImprovementFingerprint(overLimit)
  }), /content/i);
});

test("正文 fingerprint 对中文、Markdown、emoji 与空白逐字稳定", () => {
  assert.equal(contentImprovementFingerprint(content), contentImprovementFingerprint(content));
  assert.notEqual(contentImprovementFingerprint(content), contentImprovementFingerprint(` ${content}`));
  assert.notEqual(contentImprovementFingerprint(content), contentImprovementFingerprint(`${content}!`));
  assert.match(contentImprovementFingerprint(content), /^v1:[0-9]+:[a-f0-9]{8}$/);
  assert.throws(() => sanitizeContentImprovementInput({ ...request, sourceFingerprint: "v1:1:00000000" }), /fingerprint/i);
});

test("模型输出只允许一个有界候选字段，响应必须精确回显绑定", () => {
  const improvedContent = "以后做事，先把能想到的细节想清楚，再开始行动。\n\n- 保留 Markdown\n- 保留原意 ✨";
  const proposal = normalizeContentImprovementOutput({ improvedContent }, request);
  assert.deepEqual(proposal, {
    schemaVersion: 1,
    requestId: request.requestId,
    target: request.target,
    sourceFingerprint: request.sourceFingerprint,
    improvedContent
  });
  assert.deepEqual(validateContentImprovementResponse(proposal, request), proposal);

  assert.throws(() => normalizeContentImprovementOutput({ improvedContent, explanation: "forbidden" }, request), /unknown|field|schema/i);
  assert.throws(() => normalizeContentImprovementOutput({ improvedContent: "" }, request), /content/i);
  assert.throws(() => normalizeContentImprovementOutput({ improvedContent: "x".repeat(MAX_CONTENT_IMPROVEMENT_RESULT_CHARS + 1) }, request), /content/i);
  assert.throws(() => validateContentImprovementResponse({ ...proposal, requestId: "improve_other" }, request), /request|binding|mismatch/i);
  assert.throws(() => validateContentImprovementResponse({ ...proposal, extra: true }, request), /unknown|field|schema/i);
});

test("固定指令把正文视作不可信数据并禁止虚构、建议和解释", () => {
  for (const locale of ["zh-CN", "en"]) {
    const instructions = contentImprovementInstructions(locale);
    assert.match(instructions, /untrusted|不可信/i);
    assert.match(instructions, /invent|虚构|事实/i);
    assert.match(instructions, /advice|建议|diagnos|诊断/i);
    assert.match(instructions, /JSON/i);
    assert.match(instructions, /improvedContent/);
  }
});
