"use client";

/**
 * @fileoverview 为模板和设置提供一致的管理页导航与标题层级。
 */

import Link from "next/link";
import { Icon } from "./ui";

/** Render the shared header used by first-level management pages. */
export function ManagementHeader({ action = null, backHref = "/", backIcon = "chevronLeft", backLabel, onBack = null, title }) {
  return (
    <header className="management-header">
      <Link className="icon-button" href={backHref} aria-label={backLabel} onClick={onBack}><Icon name={backIcon} /></Link>
      <div className="management-title"><span>Log Note</span><h1>{title}</h1></div>
      <div className="management-header-action">{action}</div>
    </header>
  );
}
