"use client";

/**
 * @fileoverview 左侧抽屉工作区菜单：在「记录」「目标(OKR)」两个模块之间切换。
 * 保留 HomePage 拥有的 `goalsActive` 状态作为唯一事实来源，菜单只通过回调转发意图。
 * 进/退场由受控 `open` + 内部 `visible`/`closing` 驱动，避免 `return null` 造成的瞬时消失。
 */

import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui";

const CLOSE_ANIMATION_MS = 200;

function focusableWithin(node) {
  if (!node) return [];
  return [...node.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getClientRects().length);
}

export function HomeWorkspaceMenu({ goalsActive = false, open = false, onClose, onSelectRecords, onSelectGoals, t }) {
  const menuRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const visibleRef = useRef(false);
  const exitTimerRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      visibleRef.current = true;
      setVisible(true);
      setClosing(false);
      return undefined;
    }
    if (!visibleRef.current) return undefined;
    visibleRef.current = false;
    setClosing(true);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      setVisible(false);
      setClosing(false);
    }, CLOSE_ANIMATION_MS);
    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!visible) return undefined;
    const previousFocus = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableWithin(menuRef.current);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [visible]);

  if (!visible) return null;

  const recordModeActive = !goalsActive;
  const activeModeLabel = goalsActive ? t("home.modeGoals") : t("home.modeRecords");

  return (
    <div
      className={`workspace-menu-layer${closing ? " is-closing" : ""}`}
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <nav ref={menuRef} className={`workspace-menu${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={t("home.workspaceMenuTitle")}>
        <header className="workspace-menu-header">
          <h2>{t("home.workspaceMenuTitle")}</h2>
          <button
            ref={closeRef}
            className="workspace-menu-close"
            type="button"
            onClick={onClose}
            aria-label={t("home.closeMenu")}
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="workspace-menu-body">
          <div className="workspace-menu-section">
            <button
              className="workspace-menu-mode"
              data-workspace-menu-mode="records"
              type="button"
              aria-pressed={recordModeActive}
              onClick={() => {
                onSelectRecords?.();
                onClose();
              }}
            >
              <span className="workspace-menu-mode-icon" aria-hidden="true"><Icon name="structure" size={22} /></span>
              <span className="workspace-menu-mode-text">
                <strong>{t("home.modeRecords")}</strong>
                <small>{t("home.modeRecordsHint")}</small>
              </span>
            </button>
          </div>

          <div className="workspace-menu-section">
            <button
              className="workspace-menu-mode"
              data-workspace-menu-mode="goals"
              type="button"
              aria-pressed={goalsActive}
              onClick={() => {
                onSelectGoals?.();
                onClose();
              }}
            >
              <span className="workspace-menu-mode-icon" aria-hidden="true"><Icon name="book" size={22} /></span>
              <span className="workspace-menu-mode-text">
                <strong>{t("home.modeGoals")}</strong>
              </span>
            </button>
          </div>
        </div>

        <footer className="workspace-menu-footer">
          <span>{activeModeLabel}</span>
        </footer>
      </nav>
    </div>
  );
}
