import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdownDisplay, parseMarkdownInline } from "../src/lib/markdown-display.mjs";

test("parses bold, italic, combined emphasis, and nested toolbar output", () => {
  assert.deepEqual(parseMarkdownInline("A **bold** *italic* ***both***"), [
    { type: "text", value: "A " },
    { type: "strong", children: [{ type: "text", value: "bold" }] },
    { type: "text", value: " " },
    { type: "emphasis", children: [{ type: "text", value: "italic" }] },
    { type: "text", value: " " },
    { type: "strong", children: [{ type: "emphasis", children: [{ type: "text", value: "both" }] }] }
  ]);
  assert.deepEqual(parseMarkdownInline("**hello *world***"), [
    { type: "strong", children: [
      { type: "text", value: "hello " },
      { type: "emphasis", children: [{ type: "text", value: "world" }] }
    ] }
  ]);
});

test("parses headings, line breaks, bullets, and task lists", () => {
  assert.deepEqual(parseMarkdownDisplay("# Title\n## Subtitle\nline one\nline two\n\n- item\n- [ ] todo\n- [x] done"), [
    { type: "heading", level: 1, children: [{ type: "text", value: "Title" }] },
    { type: "heading", level: 2, children: [{ type: "text", value: "Subtitle" }] },
    { type: "paragraph", lines: [[{ type: "text", value: "line one" }], [{ type: "text", value: "line two" }]] },
    { type: "list", items: [
      { checked: null, children: [{ type: "text", value: "item" }] },
      { checked: false, children: [{ type: "text", value: "todo" }] },
      { checked: true, children: [{ type: "text", value: "done" }] }
    ] }
  ]);
});

test("leaves unknown, broken, HTML, image, and URL syntax as literal text", () => {
  const source = "### raw\n**broken\n<script>alert(1)</script>\n![remote](https://example.com/x.png)";
  const blocks = parseMarkdownDisplay(source);
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].lines.map((line) => line.map((node) => node.value).join("")), source.split("\n"));
});
