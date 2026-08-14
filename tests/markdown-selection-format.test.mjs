import test from "node:test";
import assert from "node:assert/strict";
import {
  markdownSelectionBlockEdit,
  markdownSelectionBlockStyle,
  markdownSelectionFormatEdit,
  markdownSelectionFormatState
} from "../src/lib/markdown-selection-format.mjs";

function apply(value, start, end, kind) {
  const edit = markdownSelectionFormatEdit(value, start, end, kind);
  if (!edit) return null;
  return {
    ...edit,
    value: value.slice(0, edit.replaceStart) + edit.replacement + value.slice(edit.replaceEnd)
  };
}

test("normalizes forward and reverse UTF-16 selection boundaries", () => {
  assert.deepEqual(apply("前中文后", 1, 3, "bold"), {
    replaceStart: 1, replaceEnd: 3, replacement: "**中文**", selectionStart: 3, selectionEnd: 5, active: true, value: "前**中文**后"
  });
  assert.deepEqual(apply("前中文后", 3, 1, "italic"), {
    replaceStart: 1, replaceEnd: 3, replacement: "*中文*", selectionStart: 2, selectionEnd: 4, active: true, value: "前*中文*后"
  });
});

test("keeps emoji surrogate pairs intact at programmatic half-boundaries", () => {
  const result = apply("A🙂B", 2, 3, "bold");
  assert.equal(result.value, "A**🙂**B");
  assert.equal(result.selectionStart, 3);
  assert.equal(result.selectionEnd, 5);
});

test("wraps multiline text, existing Markdown, and surrounding whitespace without rewriting it", () => {
  assert.equal(apply("前 - 一\n- 二 后", 2, 10, "bold").value, "前 **- 一\n- 二 **后");
  assert.equal(apply("x **old** y", 2, 9, "italic").value, "x ***old*** y");
  assert.equal(apply("x  spaced  y", 1, 11, "italic").value, "x*  spaced  *y");
});

test("clicking the same action again unwraps while keeping the inner selection", () => {
  const bold = apply("plain", 0, 5, "bold");
  assert.equal(markdownSelectionFormatState(bold.value, bold.selectionStart, bold.selectionEnd, "bold"), true);
  const unbold = apply(bold.value, bold.selectionStart, bold.selectionEnd, "bold");
  assert.equal(unbold.value, "plain");
  assert.deepEqual([unbold.selectionStart, unbold.selectionEnd], [0, 5]);

  const italic = apply("*plain*", 0, 7, "italic");
  assert.equal(italic.value, "plain");
  assert.deepEqual([italic.selectionStart, italic.selectionEnd], [0, 5]);
});

test("bold and italic nest and toggle independently", () => {
  const italicInsideBold = apply("**text**", 2, 6, "italic");
  assert.equal(italicInsideBold.value, "***text***");
  assert.equal(markdownSelectionFormatState(italicInsideBold.value, 3, 7, "bold"), true);
  assert.equal(markdownSelectionFormatState(italicInsideBold.value, 3, 7, "italic"), true);
  assert.equal(apply(italicInsideBold.value, 3, 7, "italic").value, "**text**");

  const boldInsideItalic = apply("*text*", 1, 5, "bold");
  assert.equal(boldInsideItalic.value, "***text***");
  assert.equal(apply(boldInsideItalic.value, 3, 7, "bold").value, "*text*");
});

test("empty selections and unknown formats do nothing", () => {
  assert.equal(markdownSelectionFormatEdit("text", 2, 2, "bold"), null);
  assert.equal(markdownSelectionFormatEdit("text", 0, 4, "link"), null);
  assert.equal(markdownSelectionFormatState("text", 2, 2, "italic"), false);
});

test("semantic sizes transform complete lines and return to body text", () => {
  const value = "before\n第一行🙂\n第二行\nafter";
  const title = markdownSelectionBlockEdit(value, 9, 15, "title");
  assert.equal(value.slice(0, title.replaceStart) + title.replacement + value.slice(title.replaceEnd), "before\n# 第一行🙂\n# 第二行\nafter");
  assert.deepEqual([title.selectionStart, title.selectionEnd], [7, 20]);
  const titled = "before\n# 第一行🙂\n# 第二行\nafter";
  assert.equal(markdownSelectionBlockStyle(titled, 8, 19), "title");
  const body = markdownSelectionBlockEdit(titled, 8, 19, "body");
  assert.equal(titled.slice(0, body.replaceStart) + body.replacement + titled.slice(body.replaceEnd), value);
});

test("subtitle replaces only supported heading markers and preserves blank lines", () => {
  const value = "# One\n\n## Two\n### raw";
  const edit = markdownSelectionBlockEdit(value, value.length, 0, "subtitle");
  assert.equal(edit.replacement, "## One\n\n## Two\n## ### raw");
  assert.equal(markdownSelectionBlockStyle(edit.replacement, 0, edit.replacement.length), "subtitle");
});

test("semantic size ignores empty selections, unknown styles, and no-op changes", () => {
  assert.equal(markdownSelectionBlockEdit("text", 2, 2, "title"), null);
  assert.equal(markdownSelectionBlockEdit("text", 0, 4, "huge"), null);
  assert.equal(markdownSelectionBlockEdit("# text", 0, 6, "title"), null);
});
