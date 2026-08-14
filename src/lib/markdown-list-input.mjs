/**
 * @fileoverview Pure textarea edits for lightweight Markdown list continuation.
 */

const TASK_LIST_PREFIX = /^(\s*)- \[ \] /;
const UNORDERED_LIST_PREFIX = /^(\s*)- /;

function listPrefix(line) {
  const task = line.match(TASK_LIST_PREFIX);
  if (task) return `${task[1]}- [ ] `;
  const unordered = line.match(UNORDERED_LIST_PREFIX);
  return unordered ? `${unordered[1]}- ` : null;
}

/**
 * Return the single native textarea edit for Enter, or null for normal input.
 */
export function markdownListEnterEdit(value, selectionStart, selectionEnd) {
  if (typeof value !== "string") return null;
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd)) return null;
  if (selectionStart < 0 || selectionEnd < selectionStart || selectionEnd > value.length) return null;

  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const currentLineEnd = value.indexOf("\n", selectionStart);
  const lineEnd = currentLineEnd === -1 ? value.length : currentLineEnd;
  if (selectionEnd > lineEnd) return null;
  const line = value.slice(lineStart, lineEnd);
  const prefix = listPrefix(line);
  if (!prefix || selectionStart < lineStart + prefix.length) return null;

  const beforeSelection = value.slice(lineStart, selectionStart);
  const afterSelection = value.slice(selectionEnd, lineEnd);
  const emptyItem = selectionStart === selectionEnd && beforeSelection === prefix && afterSelection === "";

  if (emptyItem) {
    return {
      replaceStart: lineStart,
      replaceEnd: selectionEnd,
      replacement: "",
      selectionStart: lineStart,
      selectionEnd: lineStart
    };
  }

  const replacement = `\n${prefix}`;
  const nextCaret = selectionStart + replacement.length;
  return {
    replaceStart: selectionStart,
    replaceEnd: selectionEnd,
    replacement,
    selectionStart: nextCaret,
    selectionEnd: nextCaret
  };
}
