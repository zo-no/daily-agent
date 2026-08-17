"use client";

/**
 * @fileoverview Authenticated Supabase access for explicit Log Note document snapshots.
 */

import { normalizeCloudDocument, prepareTextCloudDocument } from "@/lib/cloud-document.mjs";

const CLOUD_DOCUMENT_COLUMNS = "user_id,revision,payload,updated_at,device_id";

export async function readCloudDocument(client, userId) {
  const { data, error } = await client
    .from("log_note_documents")
    .select(CLOUD_DOCUMENT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return normalizeCloudDocument(data);
}

export async function saveCloudDocument(client, userId, state, expectedRevision, deviceId, operationId) {
  const prepared = prepareTextCloudDocument(state);
  const { data, error } = await client.rpc("save_log_note_document", {
    p_payload: prepared.payload,
    p_data_version: prepared.dataVersion,
    p_structure_schema_version: prepared.structureSchemaVersion,
    p_expected_revision: expectedRevision,
    p_device_id: deviceId,
    p_operation_id: operationId
  }).single();
  if (error) throw error;
  const document = normalizeCloudDocument(data);
  if (document?.userId !== userId) throw new Error("Cloud document owner mismatch");
  return { document, omittedImages: prepared.omittedImages };
}
