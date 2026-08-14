import test from "node:test";
import assert from "node:assert/strict";
import { markdownListEnterEdit } from "../src/lib/markdown-list-input.mjs";

function apply(value, start, end = start) {
  const edit = markdownListEnterEdit(value, start, end);
  if (!edit) return null;
  return {
    ...edit,
    value: value.slice(0, edit.replaceStart) + edit.replacement + value.slice(edit.replaceEnd)
  };
}

test("无序列表 Enter 续写同类前缀", () => {
  const result = apply("- first", 7);
  assert.equal(result.value, "- first\n- ");
  assert.equal(result.selectionStart, 10);
  assert.equal(result.selectionEnd, 10);
});

test("任务列表 Enter 续写未完成任务前缀", () => {
  const result = apply("- [ ] task", 10);
  assert.equal(result.value, "- [ ] task\n- [ ] ");
  assert.equal(result.selectionStart, result.value.length);
});

test("空列表项 Enter 移除当前前缀并退出列表", () => {
  assert.equal(apply("- first\n- ", 10).value, "- first\n");
  assert.equal(apply("- [ ] task\n- [ ] ", 17).value, "- [ ] task\n");
});

test("光标中段拆分当前项并保持后半段", () => {
  const result = apply("- 你好🙂世界", 6);
  assert.equal(result.value, "- 你好🙂\n- 世界");
  assert.equal(result.selectionStart, 9);
});

test("选区由新的列表换行替换", () => {
  const value = "- before selected after";
  const start = value.indexOf("selected");
  const result = apply(value, start, start + "selected".length);
  assert.equal(result.value, "- before \n-  after");
  assert.equal(result.selectionStart, "- before \n- ".length);
});

test("选中当前项全部内容时替换选区而不是误退出列表", () => {
  const value = "- selected";
  const result = apply(value, 2, value.length);
  assert.equal(result.value, "- \n- ");
});

test("普通文本、前缀内光标和无效选区保持浏览器默认行为", () => {
  assert.equal(markdownListEnterEdit("plain", 5, 5), null);
  assert.equal(markdownListEnterEdit("- item", 1, 1), null);
  assert.equal(markdownListEnterEdit("- first\n- second", 4, 12), null);
  assert.equal(markdownListEnterEdit("- item", -1, 0), null);
  assert.equal(markdownListEnterEdit("- item", 6, 99), null);
});

test("缩进列表保持缩进且不会把任务列表降级为普通列表", () => {
  assert.equal(apply("  - nested", 10).value, "  - nested\n  - ");
  assert.equal(apply("  - [ ] nested", 14).value, "  - [ ] nested\n  - [ ] ");
});
