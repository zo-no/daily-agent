"use client";

/**
 * @fileoverview 以 React 文本节点安全渲染 Log Note 支持的基础 Markdown。
 */

import { parseMarkdownDisplay } from "@/lib/markdown-display.mjs";

function InlineNodes({ nodes }) {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`;
    if (node.type === "strong") return <strong key={key}><InlineNodes nodes={node.children} /></strong>;
    if (node.type === "emphasis") return <em key={key}><InlineNodes nodes={node.children} /></em>;
    return <span key={key}>{node.value}</span>;
  });
}

/** Render supported Markdown without HTML injection, remote media, or link activation. */
export function MarkdownContent({ content, compact = false }) {
  const blocks = parseMarkdownDisplay(content);
  return (
    <span className={`markdown-content${compact ? " compact" : ""}`}>
      {blocks.map((block, blockIndex) => {
        const key = `${block.type}-${blockIndex}`;
        if (block.type === "heading") {
          return <span className={`markdown-heading level-${block.level}`} key={key}><InlineNodes nodes={block.children} /></span>;
        }
        if (block.type === "list") {
          return (
            <span className="markdown-list" role="list" key={key}>
              {block.items.map((item, itemIndex) => (
                <span className="markdown-list-item" role="listitem" key={`${key}-${itemIndex}`}>
                  <span className="markdown-list-marker" aria-hidden="true">{item.checked === null ? "•" : item.checked ? "☑" : "☐"}</span>
                  <span><InlineNodes nodes={item.children} /></span>
                </span>
              ))}
            </span>
          );
        }
        return (
          <span className="markdown-paragraph" key={key}>
            {block.lines.map((line, lineIndex) => (
              <span key={`${key}-${lineIndex}`}><InlineNodes nodes={line} />{lineIndex < block.lines.length - 1 && <br />}</span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
