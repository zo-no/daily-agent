/**
 * @fileoverview 统一渲染记录归属与用户标签，保持语义色调和几何一致。
 */

import "./record-label.css";

export function RecordLabel({ children, className = "", tone = "scope" }) {
  const classes = ["record-label", `record-label--${tone}`, className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}

export function RecordTagList({ tags, className = "" }) {
  if (!tags?.length) return null;
  const classes = ["record-label-list", className].filter(Boolean).join(" ");
  return <span className={classes}>{tags.map((tag) => <RecordLabel key={tag} tone="tag">#{tag}</RecordLabel>)}</span>;
}
