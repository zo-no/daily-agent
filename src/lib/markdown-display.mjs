/**
 * @fileoverview 将受支持的基础 Markdown 解析为仅含文本的安全展示树。
 */

function starRun(value, start) {
  let end = start;
  while (value[end] === "*") end += 1;
  return end - start;
}

function delimiterLength(run) {
  if (run >= 3) return 3;
  return run;
}

function findClosingDelimiter(value, start, length) {
  let index = start;
  while (index < value.length) {
    const next = value.indexOf("*", index);
    if (next < 0) return -1;
    const run = starRun(value, next);
    const eligible = length === 1 ? run % 2 === 1 : run >= length;
    if (eligible) return next + run - length;
    index = next + run;
  }
  return -1;
}

function pushText(nodes, value) {
  if (!value) return;
  const previous = nodes.at(-1);
  if (previous?.type === "text") previous.value += value;
  else nodes.push({ type: "text", value });
}

/** Parse the supported emphasis subset while leaving unmatched markers as text. */
export function parseMarkdownInline(value) {
  value = String(value ?? "");
  const nodes = [];
  let index = 0;
  while (index < value.length) {
    const markerStart = value.indexOf("*", index);
    if (markerStart < 0) {
      pushText(nodes, value.slice(index));
      break;
    }
    pushText(nodes, value.slice(index, markerStart));
    const run = starRun(value, markerStart);
    const length = delimiterLength(run);
    const closing = findClosingDelimiter(value, markerStart + length, length);
    if (closing < 0 || closing === markerStart + length) {
      pushText(nodes, value.slice(markerStart, markerStart + run));
      index = markerStart + run;
      continue;
    }
    const children = parseMarkdownInline(value.slice(markerStart + length, closing));
    if (length === 3) nodes.push({ type: "strong", children: [{ type: "emphasis", children }] });
    else nodes.push({ type: length === 2 ? "strong" : "emphasis", children });
    index = closing + length;
  }
  return nodes;
}

function paragraph(lines) {
  return { type: "paragraph", lines: lines.map(parseMarkdownInline) };
}

/** Parse headings, paragraphs, bullets, tasks, and inline emphasis without interpreting HTML or URLs. */
export function parseMarkdownDisplay(value) {
  const lines = String(value ?? "").replaceAll("\r\n", "\n").split("\n");
  const blocks = [];
  let paragraphLines = [];
  let listItems = [];

  function flushParagraph() {
    if (paragraphLines.length) blocks.push(paragraph(paragraphLines));
    paragraphLines = [];
  }

  function flushList() {
    if (listItems.length) blocks.push({ type: "list", items: listItems });
    listItems = [];
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,2}) (.+)$/);
    const task = line.match(/^- \[([ xX])\] (.*)$/);
    const bullet = line.match(/^- (.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length, children: parseMarkdownInline(heading[2]) });
    } else if (task || bullet) {
      flushParagraph();
      const source = task ? task[2] : bullet[1];
      listItems.push({ checked: task ? task[1].toLowerCase() === "x" : null, children: parseMarkdownInline(source) });
    } else if (!line.length) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}
