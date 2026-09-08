"use client";

/**
 * @fileoverview Authenticated Supabase access for explicit Log Note document snapshots.
 */

import { normalizeCloudDocument, prepareTextCloudDocument } from "@/lib/cloud-document.mjs";
import { SYNC_KINDS, SYNC_PULL_LIMIT, makeSyncMutation } from "@/lib/incremental-sync.mjs";

const CLOUD_DOCUMENT_COLUMNS = "user_id,revision,payload,updated_at,device_id";
const SYNC_COLUMNS = "entity_id,payload,item_version,last_server_seq,deleted_at,updated_at";
const SYNC_TABLES = Object.freeze({ record: "log_note_record_items", plan: "log_note_plan_items" });

function syncTable(kind) {
  if (!SYNC_KINDS.includes(kind)) throw new Error("Unknown sync entity kind");
  return SYNC_TABLES[kind];
}

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

export async function readSyncStream(client, userId, kind, limit = SYNC_PULL_LIMIT, offset = 0) {
  const snapshot = await pullSyncChanges(client, userId, kind, offset, limit);
  return {
    items: snapshot.changes.map((change) => ({
      entityId: change.entityId,
      payload: change.operation === "delete" ? null : change.payload,
      itemVersion: change.itemVersion,
      serverSeq: change.serverSeq,
      deletedAt: change.operation === "delete" ? change.createdAt : null,
      updatedAt: change.createdAt
    })),
    cursor: snapshot.changes.reduce((max, item) => Math.max(max, item.serverSeq), 0)
  };
}

export async function readSyncItem(client, userId, kind, entityId) {
  const table = syncTable(kind);
  const { data, error } = await client
    .from(table)
    .select(SYNC_COLUMNS)
    .eq("user_id", userId)
    .eq("entity_id", String(entityId))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    entityId: String(data.entity_id),
    payload: data.payload || null,
    itemVersion: Number(data.item_version),
    serverSeq: Number(data.last_server_seq || 0),
    deletedAt: data.deleted_at ? String(data.deleted_at) : null,
    updatedAt: data.updated_at ? String(data.updated_at) : ""
  };
}

export async function pullSyncChanges(client, userId, kind, cursor = 0, limit = SYNC_PULL_LIMIT) {
  syncTable(kind);
  const { data, error } = await client.rpc("pull_log_note_changes", {
    p_entity_type: kind,
    p_after_server_seq: Number(cursor) || 0,
    p_limit: Math.min(Math.max(Number(limit) || SYNC_PULL_LIMIT, 1), SYNC_PULL_LIMIT)
  });
  if (error) throw error;
  return {
    changes: (data || []).map((row) => ({
      kind,
      entityId: String(row.entity_id),
      operation: String(row.operation),
      payload: row.payload || null,
      itemVersion: Number(row.item_version),
      serverSeq: Number(row.server_seq),
      operationId: row.operation_id ? String(row.operation_id) : "",
      deviceId: row.device_id ? String(row.device_id) : "",
      createdAt: row.created_at ? String(row.created_at) : ""
    })),
    hasMore: (data || []).length >= Math.min(Math.max(Number(limit) || SYNC_PULL_LIMIT, 1), SYNC_PULL_LIMIT)
  };
}

export async function pushSyncBatch(client, userId, kind, mutations, deviceId) {
  syncTable(kind);
  const wireMutations = mutations.map((mutation) => {
    const normalized = makeSyncMutation({ ...mutation, kind, deviceId: mutation.deviceId || deviceId });
    return {
      entityId: normalized.entityId,
      operation: normalized.operation,
      baseVersion: normalized.baseVersion,
      payload: normalized.payload,
      operationId: normalized.operationId
    };
  });
  if (!wireMutations.length) return [];
  const { data, error } = await client.rpc("push_log_note_changes", {
    p_entity_type: kind,
    p_mutations: wireMutations,
    p_device_id: deviceId
  });
  if (error) throw error;
  return (data || []).map((row) => ({
    kind,
    outcome: String(row.outcome),
    entityId: String(row.entity_id),
    operation: String(row.operation),
    operationId: row.operation_id ? String(row.operation_id) : "",
    itemVersion: Number(row.item_version || 0),
    serverSeq: Number(row.server_seq || 0),
    payload: row.payload || null,
    conflictVersion: row.conflict_version === null || row.conflict_version === undefined ? null : Number(row.conflict_version),
    conflictPayload: row.conflict_payload || null,
    conflictDeletedAt: row.conflict_deleted_at ? String(row.conflict_deleted_at) : null
  }));
}
