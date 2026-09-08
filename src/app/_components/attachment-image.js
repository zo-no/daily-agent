"use client";

/**
 * @fileoverview 只从 IndexedDB Blob 创建 object URL，绝不解释远程图片地址。
 */

import { useEffect, useState } from "react";
import { getAttachmentBlob } from "@/lib/attachment-store.mjs";

export function AttachmentImage({ attachment, compact = false, t }) {
  const [state, setState] = useState({ status: "loading", url: "" });

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setState({ status: "loading", url: "" });
    getAttachmentBlob(attachment.id).then((blob) => {
      if (!active) return;
      if (!blob || blob.type !== attachment.mediaType || blob.size !== attachment.bytes) {
        setState({ status: "missing", url: "" });
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setState({ status: "ready", url: objectUrl });
    }).catch(() => active && setState({ status: "missing", url: "" }));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.bytes, attachment.id, attachment.mediaType]);

  if (state.status === "ready") {
    return <img className={`attachment-image${compact ? " compact" : ""}`} src={state.url} alt={attachment.alt || t("attachments.imageAlt")} loading="lazy" onError={() => setState({ status: "missing", url: "" })} />;
  }
  return (
    <span className={`attachment-placeholder${compact ? " compact" : ""}`} role="img" aria-label={state.status === "loading" ? t("attachments.loading") : t("attachments.unavailable")}>
      <span aria-hidden="true">{state.status === "loading" ? "…" : "×"}</span>
      <small>{state.status === "loading" ? t("attachments.loading") : t("attachments.unavailable")}</small>
    </span>
  );
}

export function AttachmentGallery({ attachments, t }) {
  if (!attachments?.length) return null;
  return (
    <span className="attachment-gallery" aria-label={t("attachments.galleryLabel", { count: attachments.length })}>
      {attachments.map((attachment) => <AttachmentImage key={attachment.id} attachment={attachment} t={t} />)}
    </span>
  );
}
