"use client";

/**
 * @fileoverview 提供首页弹窗共用的遮罩与对话框容器。
 */

export function DialogSurface({ children, onClose, className = "", label }) {
  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`surface ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </section>
    </div>
  );
}
