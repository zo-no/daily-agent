/**
 * @fileoverview 为 textarea 非空选区生成可逆的 Markdown 粗体与斜体纯文本变换。
 */

const SYNTAX = {
  bold: { marker: "**", removeCount: 2 },
  italic: { marker: "*", removeCount: 1 }
};

function clampIndex(value, index) {
  if (!Number.isFinite(index)) return 0;
  return Math.min(value.length, Math.max(0, Math.trunc(index)));
}

function alignStartToCodePoint(value, index) {
  if (index <= 0 || index >= value.length) return index;
  const previous = value.charCodeAt(index - 1);
  const current = value.charCodeAt(index);
  return previous >= 0xd800 && previous <= 0xdbff && current >= 0xdc00 && current <= 0xdfff ? index - 1 : index;
}

function alignEndToCodePoint(value, index) {
  if (index <= 0 || index >= value.length) return index;
  const previous = value.charCodeAt(index - 1);
  const current = value.charCodeAt(index);
  return previous >= 0xd800 && previous <= 0xdbff && current >= 0xdc00 && current <= 0xdfff ? index + 1 : index;
}

function normalizeNonEmptySelection(value, selectionStart, selectionEnd) {
  const first = clampIndex(value, selectionStart);
  const second = clampIndex(value, selectionEnd);
  if (first === second) return null;
  const start = alignStartToCodePoint(value, Math.min(first, second));
  const end = alignEndToCodePoint(value, Math.max(first, second));
  return { start, end };
}

function countStarsBefore(value, index) {
  let count = 0;
  while (index - count - 1 >= 0 && value[index - count - 1] === "*") count += 1;
  return count;
}

function countStarsAfter(value, index) {
  let count = 0;
  while (index + count < value.length && value[index + count] === "*") count += 1;
  return count;
}

function delimiterIsActive(kind, leftStars, rightStars) {
  if (kind === "bold") return leftStars >= 2 && rightStars >= 2;
  return leftStars % 2 === 1 && rightStars % 2 === 1;
}

function selectionContext(value, selectionStart, selectionEnd, kind) {
  if (!SYNTAX[kind]) return null;
  const selection = normalizeNonEmptySelection(value, selectionStart, selectionEnd);
  if (!selection) return null;
  const { start, end } = selection;
  const selectedLeftStars = countStarsAfter(value, start);
  const selectedRightStars = countStarsBefore(value, end);
  const selectedWrapped = end - start >= SYNTAX[kind].removeCount * 2
    && delimiterIsActive(kind, selectedLeftStars, selectedRightStars);
  const outerLeftStars = countStarsBefore(value, start);
  const outerRightStars = countStarsAfter(value, end);
  const outerWrapped = delimiterIsActive(kind, outerLeftStars, outerRightStars);
  return { start, end, selectedWrapped, outerWrapped };
}

/** Return whether the selected text currently has the requested Markdown emphasis. */
export function markdownSelectionFormatState(value, selectionStart, selectionEnd, kind) {
  const context = selectionContext(String(value ?? ""), selectionStart, selectionEnd, kind);
  return Boolean(context && (context.selectedWrapped || context.outerWrapped));
}

/**
 * Return one exact textarea replacement and the selection to restore afterward.
 * Empty selections and unknown formats intentionally produce no edit.
 */
export function markdownSelectionFormatEdit(value, selectionStart, selectionEnd, kind) {
  value = String(value ?? "");
  const syntax = SYNTAX[kind];
  const context = selectionContext(value, selectionStart, selectionEnd, kind);
  if (!syntax || !context) return null;

  const { start, end, selectedWrapped, outerWrapped } = context;
  const selected = value.slice(start, end);
  if (selectedWrapped) {
    const replacement = selected.slice(syntax.removeCount, selected.length - syntax.removeCount);
    return {
      replaceStart: start,
      replaceEnd: end,
      replacement,
      selectionStart: start,
      selectionEnd: start + replacement.length,
      active: false
    };
  }
  if (outerWrapped) {
    const replaceStart = start - syntax.removeCount;
    const replaceEnd = end + syntax.removeCount;
    return {
      replaceStart,
      replaceEnd,
      replacement: selected,
      selectionStart: replaceStart,
      selectionEnd: replaceStart + selected.length,
      active: false
    };
  }

  const replacement = `${syntax.marker}${selected}${syntax.marker}`;
  return {
    replaceStart: start,
    replaceEnd: end,
    replacement,
    selectionStart: start + syntax.marker.length,
    selectionEnd: end + syntax.marker.length,
    active: true
  };
}

function selectedLineRange(value, selectionStart, selectionEnd) {
  const selection = normalizeNonEmptySelection(value, selectionStart, selectionEnd);
  if (!selection) return null;
  const start = value.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const selectedEnd = selection.end > selection.start && value[selection.end - 1] === "\n" ? selection.end - 1 : selection.end;
  const nextBreak = value.indexOf("\n", selectedEnd);
  return { start, end: nextBreak < 0 ? value.length : nextBreak };
}

function lineStyle(line) {
  if (/^# [^\n]+$/.test(line)) return "title";
  if (/^## [^\n]+$/.test(line)) return "subtitle";
  return "body";
}

/** Return title, subtitle, body, or mixed for the complete lines touched by a non-empty selection. */
export function markdownSelectionBlockStyle(value, selectionStart, selectionEnd) {
  value = String(value ?? "");
  const range = selectedLineRange(value, selectionStart, selectionEnd);
  if (!range) return "body";
  const styles = new Set(value.slice(range.start, range.end).split("\n").filter((line) => line.length).map(lineStyle));
  return styles.size === 1 ? [...styles][0] : "mixed";
}

/** Apply one semantic Markdown line style to every complete line touched by the selection. */
export function markdownSelectionBlockEdit(value, selectionStart, selectionEnd, style) {
  value = String(value ?? "");
  if (!new Set(["body", "title", "subtitle"]).has(style)) return null;
  const range = selectedLineRange(value, selectionStart, selectionEnd);
  if (!range) return null;
  const prefix = style === "title" ? "# " : style === "subtitle" ? "## " : "";
  const replacement = value.slice(range.start, range.end).split("\n").map((line) => {
    if (!line.length) return line;
    return `${prefix}${line.replace(/^#{1,2} /, "")}`;
  }).join("\n");
  if (replacement === value.slice(range.start, range.end)) return null;
  return {
    replaceStart: range.start,
    replaceEnd: range.end,
    replacement,
    selectionStart: range.start,
    selectionEnd: range.start + replacement.length,
    active: style
  };
}
