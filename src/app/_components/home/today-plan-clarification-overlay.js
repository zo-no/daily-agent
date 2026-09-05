"use client";

/** Detached review dialog: it is portaled so source records never reflow. */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function TodayPlanClarificationOverlay({ session, onAnswer, onApply, onClose, t }) {
  const [answer, setAnswer] = useState(""); const closeRef = useRef(null); const inputRef = useRef(null); const primaryRef = useRef(null); const onCloseRef = useRef(onClose); const sessionRef = useRef(session); const overlay = session.overlay;
  onCloseRef.current = onClose;
  sessionRef.current = session;
  useEffect(() => {
    setAnswer("");
    requestAnimationFrame(() => (inputRef.current || primaryRef.current || closeRef.current)?.focus());
  }, [session.status, overlay?.question, overlay?.candidate, overlay?.none]);
  useEffect(() => { const keydown = (event) => { const current = sessionRef.current; if (event.key === "Escape" && (current.status === "analyzing" || current.overlay)) { event.preventDefault(); onCloseRef.current(); } }; window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown); }, []);
  if ((!overlay && session.status !== "analyzing") || typeof document === "undefined") return null;
  const style = overlay?.anchorRect ? (() => {
    const width = Math.min(360, window.innerWidth - 32);
    const left = Math.max(16, Math.min(overlay.anchorRect.left, window.innerWidth - width - 16));
    const preferredTop = overlay.anchorRect.bottom + 8;
    const top = preferredTop <= window.innerHeight - 240 ? preferredTop : Math.max(16, overlay.anchorRect.top - 248);
    return { "--clarification-top": `${top}px`, "--clarification-left": `${left}px`, "--clarification-max-height": `${Math.max(160, window.innerHeight - top - 16)}px` };
  })() : undefined;
  return createPortal(<div className="today-clarification-layer" role="presentation">
    <section className="today-clarification-popover" style={style} role="dialog" aria-modal="true" aria-label={t("agent.clarificationTitle")}>
      <header><span>Agent</span><button ref={closeRef} type="button" onClick={onClose} aria-label={t("common.close")}>×</button></header>
      {session.status === "disclosure" ? <><p>{t("agent.clarificationDisclosure", { plans: session.snapshot?.input.plans.length || 0, entries: session.snapshot?.input.entries.length || 0 })}</p><small>{t("agent.clarificationSessionOnly")}</small><div className="today-clarification-actions"><button type="button" onClick={onClose}>{t("common.cancel")}</button><button ref={primaryRef} type="button" onClick={() => onAnswer("__begin__")}>{t("agent.clarificationStart")}</button></div></> : session.status === "analyzing" ? <p role="status">{t("agent.clarificationAnalyzing")}</p> : overlay.candidate ? <><p className="today-clarification-label">{t("agent.clarificationCandidate")}</p><p className="today-clarification-candidate">{overlay.candidate}</p><div className="today-clarification-actions"><button type="button" onClick={onClose}>{t("agent.keepOriginal")}</button><button ref={primaryRef} type="button" onClick={onApply}>{t("agent.clarificationUse")}</button></div></> : overlay.none ? <><p>{t("agent.clarificationNone")}</p><button ref={primaryRef} type="button" onClick={onClose}>{t("common.done")}</button></> : <form onSubmit={(event) => { event.preventDefault(); if (answer.trim() && !session.busy) onAnswer(answer.trim()); }}><p>{overlay.question}</p><textarea ref={inputRef} value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={1200} disabled={session.busy} aria-label={t("agent.replyLabel")} /><div className="today-clarification-actions"><button type="button" onClick={onClose}>{t("common.cancel")}</button><button type="submit" disabled={!answer.trim() || session.busy}>{session.busy ? t("agent.replying") : t("agent.send")}</button></div></form>}
    </section>
  </div>, document.body);
}
