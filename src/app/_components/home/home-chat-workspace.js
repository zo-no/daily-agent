"use client";

import { useEffect, useRef } from "react";

export function HomeChatWorkspace({ messages = [], error = "", busy = false, t }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [busy, messages.length]);

  return <section className="home-chat-workspace" data-home-chat-workspace aria-label={t("home.chatMode")}>
    <div className="home-chat-messages" aria-live="polite" aria-busy={busy}>
      {!messages.length && <p className="home-chat-empty">{t("agent.chatEmpty")}</p>}
      {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`home-chat-message is-${message.role}`} data-chat-message-role={message.role}><span>{message.content}</span>{message.toolCall && <small>{t("agent.chatPreviewOnly")}</small>}</div>)}
      {busy && <div className="home-chat-message is-assistant is-thinking" data-chat-message-role="assistant" aria-label={t("agent.chatThinking")}><span aria-hidden="true">•••</span></div>}
      <div ref={endRef} aria-hidden="true" />
    </div>
    {error && <p className="home-chat-error" role="alert">{error}</p>}
  </section>;
}
