"use client";

/**
 * @fileoverview 保存首页编辑中图片的 IndexedDB 写入、撤销与最终清理状态。
 */

import { useRef, useState } from "react";
import { MAX_ATTACHMENT_BYTES, SUPPORTED_IMAGE_TYPES } from "@/lib/attachment-model.mjs";
import { ATTACHMENT_TOTAL_LIMIT_ERROR, deleteAttachmentBlobs, putAttachmentBlob } from "@/lib/attachment-store.mjs";
import { makeId } from "@/lib/data.mjs";

function draftKey(value) {
  return value ? `${value.id || "new"}:${value.createdAt || ""}` : "";
}

/** 让图片 Blob 与尚未提交的记录草稿一起成功、撤销或删除。 */
export function useDraftAttachments({ draft, setDraft, setToast, t }) {
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const draftRef = useRef(draft);
  const pendingAddedIds = useRef(new Set());
  const pendingCleanupIds = useRef(new Set());
  const pendingRemovedIds = useRef(new Set());
  draftRef.current = draft;

  async function cleanupAttachmentBlobs(ids) {
    const cleanupIds = [...new Set([...pendingCleanupIds.current, ...(ids || [])])];
    if (!cleanupIds.length) return true;
    try {
      await deleteAttachmentBlobs(cleanupIds);
      cleanupIds.forEach((id) => pendingCleanupIds.current.delete(id));
      return true;
    } catch (error) {
      console.error(error);
      cleanupIds.forEach((id) => pendingCleanupIds.current.add(id));
      setToast(t("toast.attachmentCleanupPending"));
      return false;
    }
  }

  /** Stores one local image only while the originating draft still owns the upload. */
  async function addAttachment(file) {
    if (!draft || draft.attachments?.length) return;
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setToast(t("toast.attachmentTypeUnsupported"));
      return;
    }
    if (!file.size || file.size > MAX_ATTACHMENT_BYTES) {
      setToast(t("toast.attachmentTooLarge"));
      return;
    }
    setAttachmentBusy(true);
    const targetDraftKey = draftKey(draft);
    const ref = {
      id: makeId("attachment"),
      kind: "image",
      storage: "indexeddb",
      mediaType: file.type,
      bytes: file.size,
      name: file.name || "image",
      alt: file.name || "",
      createdAt: Date.now()
    };
    try {
      const storedRef = await putAttachmentBlob(file, ref);
      if (draftKey(draftRef.current) !== targetDraftKey) {
        await cleanupAttachmentBlobs([storedRef.id]);
        return;
      }
      pendingAddedIds.current.add(storedRef.id);
      setDraft((current) => current ? { ...current, attachments: [storedRef] } : current);
      setToast(t("toast.attachmentAdded"));
    } catch (error) {
      console.error(error);
      setToast(error?.code === ATTACHMENT_TOTAL_LIMIT_ERROR ? t("toast.attachmentStorageFull") : t("toast.attachmentSaveFailed"));
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function removeAttachment(attachment) {
    setAttachmentBusy(true);
    setDraft((current) => current ? { ...current, attachments: (current.attachments || []).filter((item) => item.id !== attachment.id) } : current);
    if (pendingAddedIds.current.has(attachment.id)) {
      const deleted = await cleanupAttachmentBlobs([attachment.id]);
      if (deleted) pendingAddedIds.current.delete(attachment.id);
    } else {
      pendingRemovedIds.current.add(attachment.id);
    }
    setAttachmentBusy(false);
  }

  function resetAttachmentChanges() {
    pendingAddedIds.current.clear();
    pendingRemovedIds.current.clear();
  }

  async function discardAttachmentChanges() {
    const cleaned = await cleanupAttachmentBlobs([...pendingAddedIds.current]);
    resetAttachmentChanges();
    return cleaned;
  }

  async function finalizeAttachmentChanges(keptAttachments) {
    const keptIds = new Set(keptAttachments.map((item) => item.id));
    const cleanupIds = [
      ...pendingRemovedIds.current,
      ...[...pendingAddedIds.current].filter((id) => !keptIds.has(id))
    ];
    const cleaned = await cleanupAttachmentBlobs(cleanupIds);
    resetAttachmentChanges();
    return cleaned;
  }

  async function deleteDraftAttachments(attachments) {
    const ids = new Set([
      ...attachments.map((item) => item.id),
      ...pendingAddedIds.current,
      ...pendingRemovedIds.current
    ]);
    const cleaned = await cleanupAttachmentBlobs([...ids]);
    resetAttachmentChanges();
    return cleaned;
  }

  return {
    addAttachment,
    attachmentBusy,
    deleteDraftAttachments,
    discardAttachmentChanges,
    finalizeAttachmentChanges,
    removeAttachment
  };
}
