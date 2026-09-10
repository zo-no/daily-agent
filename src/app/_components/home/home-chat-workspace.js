"use client";

import { useEffect, useRef } from "react";

/**
 * Transparent, collapsible chat overlay. It floats above the record workspace
 * instead of replacing it, so the quick-record composer stays the primary surface.
 */
export function HomeChatWorkspace({ messages = [], error = "", busy = false, expanded = true, onToggle, t }) {
  const endRef = useRef(null);

  useEffect(() => {
    if (!expanded) return;
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [busy, expanded, messages.length]);

  return (
    <section className="home-chat-workspace" data-home-chat-workspace aria-label={t("home.chatMode")}>
      <button
        className="home-chat-summary"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? t("agent.chatCollapse") : t("agent.chatExpand")}
      >
        <span className="home-chat-title">{t("agent.chatTitle")}</span>
        {messages.length > 0 && <span className="home-chat-count">{messages.length}</span>}
        <span className="home-chat-caret" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && (
        <div className="home-chat-panel">
          <div className="home-chat-messages" aria-live="polite" aria-busy={busy}>
            {!messages.length && <p className="home-chat-empty">{t("agent.chatEmpty")}</p>}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`home-chat-message is-${message.role}`} data-chat-message-role={message.role}>
                <span>{message.content}</span>
                {message.toolCall && <small>{t("agent.chatPreviewOnly")}</small>}
              </div>
            ))}
            {busy && <div className="home-chat-message is-assistant is-thinking" data-chat-message-role="assistant" aria-label={t("agent.chatThinking")}><span aria-hidden="true">•••</span></div>}
            <div ref={endRef} aria-hidden="true" />
          </div>
          {error && <p className="home-chat-error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
