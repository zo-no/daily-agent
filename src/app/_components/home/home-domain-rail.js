"use client";

/** Home-owned mobile directory for the content sections rendered on the selected day. */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { computeRailLayout } from "@/lib/rail-layout.mjs";

function reducedMotionEnabled() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function DomainDirectoryRail({ sections, sectionRefs, selectedDate, t }) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || "");
  const scrollRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef(new Map());
  const buttonRefs = useRef(new Map());
  const frameRef = useRef(0);
  const readyFrameRef = useRef(0);
  const sectionSignature = sections.map((section) => `${section.id}:${section.targetId}:${section.name}`).join("|");
  const resolveAnchor = (section) => sectionRefs.current.get(section.id)
    || document.getElementById(section.targetId)?.querySelector("[data-rail-anchor]")
    || document.getElementById(section.targetId);

  useEffect(() => {
    setActiveSectionId(sections[0]?.id || "");
  }, [sectionSignature, selectedDate]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const list = listRef.current;
    if (!container || !list || !sections.length) return undefined;
    container.dataset.positioned = "false";
    let layoutAttempts = 0;

    const updateLayout = () => {
      frameRef.current = 0;
      const containerBox = container.getBoundingClientRect();
      const rendered = sections.map((section) => ({
        section,
        anchor: resolveAnchor(section),
        item: itemRefs.current.get(section.id),
        button: buttonRefs.current.get(section.id)
      })).filter(({ anchor, item, button }) => anchor?.isConnected && item?.isConnected && button?.isConnected);
      if (!rendered.length) {
        if (layoutAttempts < 8) {
          layoutAttempts += 1;
          frameRef.current = requestAnimationFrame(updateLayout);
        }
        return;
      }

      const layout = computeRailLayout({
        availableHeight: container.clientHeight,
        gap: 12,
        items: rendered.map(({ section, anchor, item, button }) => {
          const anchorBox = anchor.getBoundingClientRect();
          const alignmentOffset = Math.max(0, (item.offsetHeight - button.offsetHeight) / 2);
          return {
            id: section.id,
            anchorCenter: anchorBox.top + anchorBox.height / 2 - containerBox.top + alignmentOffset,
            height: item.offsetHeight
          };
        })
      });
      container.dataset.overflow = String(layout.overflow);
      if (!layout.overflow && container.scrollTop) container.scrollTop = 0;
      const positions = new Map(layout.positions.map(({ id, top }) => [id, top]));
      rendered.forEach(({ section, item }) => item.style.setProperty("--rail-y", `${positions.get(section.id) || 0}px`));
      if (rendered.length < sections.length && layoutAttempts < 8) {
        layoutAttempts += 1;
        frameRef.current = requestAnimationFrame(updateLayout);
      } else {
        layoutAttempts = 0;
      }

      const readingLine = Math.min(containerBox.bottom, Math.max(containerBox.top, window.innerHeight * 0.3));
      let nextActiveId = rendered[0].section.id;
      rendered.forEach(({ section, anchor }) => {
        if (anchor.getBoundingClientRect().top <= readingLine) nextActiveId = section.id;
      });
      const documentBottom = document.documentElement.scrollHeight - window.innerHeight;
      if (documentBottom > 2 && window.scrollY >= documentBottom - 2) nextActiveId = rendered.at(-1).section.id;
      setActiveSectionId((current) => current === nextActiveId ? current : nextActiveId);

      if (container.dataset.positioned !== "true") {
        cancelAnimationFrame(readyFrameRef.current);
        readyFrameRef.current = requestAnimationFrame(() => { container.dataset.positioned = "true"; });
      }
    };
    const scheduleLayout = () => {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(updateLayout);
    };

    const resizeObserver = new ResizeObserver(scheduleLayout);
    const mutationObserver = new MutationObserver(scheduleLayout);
    resizeObserver.observe(container);
    const workspace = document.querySelector(".home-workspace");
    if (workspace) {
      resizeObserver.observe(workspace);
      mutationObserver.observe(workspace, { childList: true, subtree: true });
    }
    sections.forEach((section) => {
      const anchor = resolveAnchor(section);
      if (anchor?.isConnected) resizeObserver.observe(anchor);
    });
    window.addEventListener("scroll", scheduleLayout, { passive: true });
    window.addEventListener("resize", scheduleLayout);
    window.visualViewport?.addEventListener("resize", scheduleLayout);
    document.fonts?.ready?.then(scheduleLayout)?.catch(() => {});
    updateLayout();

    return () => {
      window.removeEventListener("scroll", scheduleLayout);
      window.removeEventListener("resize", scheduleLayout);
      window.visualViewport?.removeEventListener("resize", scheduleLayout);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      cancelAnimationFrame(frameRef.current);
      cancelAnimationFrame(readyFrameRef.current);
    };
  }, [activeSectionId, sectionSignature, sectionRefs, selectedDate]);

  useEffect(() => {
    const container = scrollRef.current;
    const item = itemRefs.current.get(activeSectionId);
    if (!container || !item || container.dataset.overflow !== "true") return;
    const containerBox = container.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    if (itemBox.top < containerBox.top) {
      container.scrollTo({ top: container.scrollTop + itemBox.top - containerBox.top - 8, behavior: reducedMotionEnabled() ? "auto" : "smooth" });
    } else if (itemBox.bottom > containerBox.bottom) {
      container.scrollTo({ top: container.scrollTop + itemBox.bottom - containerBox.bottom + 8, behavior: reducedMotionEnabled() ? "auto" : "smooth" });
    }
  }, [activeSectionId]);

  if (!sections.length) return null;

  return (
    <nav className="domain-directory-rail" aria-label={t("home.sectionDirectory")}>
      <div className="domain-directory-scroll" ref={scrollRef} data-positioned="false" data-overflow="false">
        <ol ref={listRef}>
          {sections.map((section) => {
            const active = section.id === activeSectionId;
            return (
              <li
                key={section.id}
                className={active && section.domainId ? "has-domain-insights" : undefined}
                ref={(node) => {
                  if (node) itemRefs.current.set(section.id, node);
                  else itemRefs.current.delete(section.id);
                }}
              >
                <button
                  ref={(node) => {
                    if (node) buttonRefs.current.set(section.id, node);
                    else buttonRefs.current.delete(section.id);
                  }}
                  className="domain-directory-node"
                  data-section-id={section.id}
                  data-domain-id={section.domainId || undefined}
                  data-edge-rail-item="section"
                  type="button"
                  aria-label={t("home.jumpToSection", { section: section.name })}
                  aria-controls={section.targetId}
                  aria-current={active ? "location" : undefined}
                  onClick={() => {
                    setActiveSectionId(section.id);
                    resolveAnchor(section)?.scrollIntoView({
                      behavior: reducedMotionEnabled() ? "auto" : "smooth",
                      block: "start"
                    });
                  }}
                >
                  <img src={active ? "/ui/diary/rail-node-active-fine.png" : "/ui/diary/rail-node-idle-fine.png"} alt="" aria-hidden="true" />
                  <span title={section.name}>{section.name}</span>
                </button>
                {active && section.domainId && (
                  <Link
                    className="domain-directory-insights-link"
                    data-domain-id={section.domainId}
                    data-edge-rail-item="insights"
                    href={`/insights?domain=${encodeURIComponent(section.domainId)}`}
                    aria-label={t("home.openDomainInsights", { domain: section.name })}
                    title={t("home.openDomainInsights", { domain: section.name })}
                  >
                    <img src="/ui/diary/rail-insights.png" alt="" aria-hidden="true" />
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
