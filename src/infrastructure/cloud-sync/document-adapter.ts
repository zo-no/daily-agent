"use client";

import { normalizeCloudDocument, prepareTextCloudDocument } from "./protocol";
import { SYNC_KINDS, SYNC_PULL_LIMIT, makeSyncMutation } from "./protocol";

type Row = Record<string, unknown>;
type Response<T> = { data: T; error: unknown };
interface Query<T> {
  select(columns: string): Query<T>;
  eq(column: string, value: string): Query<T>;
  order(column: string, options: { ascending: boolean }): Query<T>;
  maybeSingle(): Promise<Response<T | null>>;
  single(): Promise<Response<T>>;
  range(start: number, end: number): Promise<Response<T>>;
}
interface Channel {
  on(event: string, filter: Row, callback: () => void): Channel;
  subscribe(): Promise<unknown> | unknown;
}
interface CloudClient {
  from(table: string): Query<Row | Row[]>;
  rpc(name: string, params: Row): RpcResponse<Row | Row[]>;
  channel?(name: string): Channel;
  removeChannel?(channel: Channel): Promise<unknown> | unknown;
}
interface RpcResponse<T> extends Promise<Response<T>> {
  single(): Promise<Response<Row>>;
}

const CLOUD_DOCUMENT_COLUMNS = "user_id,revision,payload,updated_at,device_id";
const SYNC_COLUMNS = "entity_id,payload,item_version,last_server_seq,deleted_at,updated_at";
const SYNC_TABLES = Object.freeze({ record: "log_note_record_items", plan: "log_note_plan_items" });

function syncTable(kind: string): string {
  if (!SYNC_KINDS.includes(kind)) throw new Error("Unknown sync entity kind");
  return SYNC_TABLES[kind as keyof typeof SYNC_TABLES];
}

export async function readCloudDocument(client: CloudClient, userId: string) {
  const { data, error } = await client.from("log_note_documents").select(CLOUD_DOCUMENT_COLUMNS).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return normalizeCloudDocument(data);
}

export async function saveCloudDocument(client: CloudClient, userId: string, state: unknown, expectedRevision: number | null, deviceId: string, operationId: string) {
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

export async function readSyncItemsSnapshot(client: CloudClient, userId: string, kind: string, limit = SYNC_PULL_LIMIT, offset = 0) {
  const table = syncTable(kind);
  const pageSize = Math.min(Math.max(Number(limit) || SYNC_PULL_LIMIT, 1), SYNC_PULL_LIMIT);
  const start = Math.max(Number(offset) || 0, 0);
  const { data, error } = await client.from(table).select(SYNC_COLUMNS).eq("user_id", userId).order("entity_id", { ascending: true }).range(start, start + pageSize - 1);
  if (error) throw error;
  const rows = (data as Row[] | null) || [];
  const items = rows.map((row) => ({ kind, entityId: String(row.entity_id), operation: row.deleted_at ? "delete" : "upsert", payload: row.deleted_at ? null : row.payload || null, itemVersion: Number(row.item_version), serverSeq: Number(row.last_server_seq || 0), operationId: "", deviceId: "", createdAt: row.updated_at ? String(row.updated_at) : "" }));
  return { changes: items, hasMore: items.length === pageSize };
}

export async function readSyncStream(client: CloudClient, userId: string, kind: string, limit = SYNC_PULL_LIMIT, cursor = 0) {
  const snapshot = await pullSyncChanges(client, userId, kind, cursor, limit);
  return { items: snapshot.changes.map((change) => ({ entityId: change.entityId, payload: change.operation === "delete" ? null : change.payload, itemVersion: change.itemVersion, serverSeq: change.serverSeq, deletedAt: change.operation === "delete" ? change.createdAt : null, updatedAt: change.createdAt })), cursor: snapshot.changes.reduce((max, item) => Math.max(max, item.serverSeq), Number(cursor) || 0) };
}

export async function readSyncItem(client: CloudClient, userId: string, kind: string, entityId: string) {
  const table = syncTable(kind);
  const { data, error } = await client.from(table).select(SYNC_COLUMNS).eq("user_id", userId).eq("entity_id", String(entityId)).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Row;
  return { entityId: String(row.entity_id), payload: row.payload || null, itemVersion: Number(row.item_version), serverSeq: Number(row.last_server_seq || 0), deletedAt: row.deleted_at ? String(row.deleted_at) : null, updatedAt: row.updated_at ? String(row.updated_at) : "" };
}

export async function pullSyncChanges(client: CloudClient, userId: string, kind: string, cursor = 0, limit = SYNC_PULL_LIMIT) {
  syncTable(kind);
  const { data, error } = await client.rpc("pull_log_note_changes", { p_entity_type: kind, p_after_server_seq: Number(cursor) || 0, p_limit: Math.min(Math.max(Number(limit) || SYNC_PULL_LIMIT, 1), SYNC_PULL_LIMIT) });
  if (error) throw error;
  const rows = (data as Row[] | null) || [];
  return { changes: rows.map((row) => ({ kind, entityId: String(row.entity_id), operation: String(row.operation), payload: row.payload || null, itemVersion: Number(row.item_version), serverSeq: Number(row.server_seq), operationId: row.operation_id ? String(row.operation_id) : "", deviceId: row.device_id ? String(row.device_id) : "", createdAt: row.created_at ? String(row.created_at) : "" })), hasMore: rows.length >= Math.min(Math.max(Number(limit) || SYNC_PULL_LIMIT, 1), SYNC_PULL_LIMIT) };
}

export async function pushSyncBatch(client: CloudClient, userId: string, kind: string, mutations: Row[], deviceId: string) {
  syncTable(kind);
  const wireMutations = mutations.map((mutation) => {
    const normalized = makeSyncMutation({
      ...mutation,
      kind,
      operation: String(mutation.operation || ""),
      entityId: String(mutation.entityId || ""),
      operationId: String(mutation.operationId || ""),
      deviceId: String(mutation.deviceId || deviceId)
    });
    return { entityId: normalized.entityId, operation: normalized.operation, baseVersion: normalized.baseVersion, payload: normalized.payload, operationId: normalized.operationId };
  });
  if (!wireMutations.length) return [];
  const { data, error } = await client.rpc("push_log_note_changes", { p_entity_type: kind, p_mutations: wireMutations, p_device_id: deviceId });
  if (error) throw error;
  const rows = (data as Row[] | null) || [];
  return rows.map((row) => ({ kind, outcome: String(row.outcome), entityId: String(row.entity_id), operation: String(row.operation), operationId: row.operation_id ? String(row.operation_id) : "", itemVersion: Number(row.item_version || 0), serverSeq: Number(row.server_seq || 0), payload: row.payload || null, conflictVersion: row.conflict_version === null || row.conflict_version === undefined ? null : Number(row.conflict_version), conflictPayload: row.conflict_payload || null, conflictDeletedAt: row.conflict_deleted_at ? String(row.conflict_deleted_at) : null }));
}

export function subscribeSyncChanges(client: CloudClient, userId: string, onChange: () => void) {
  if (!client?.channel || !userId || typeof onChange !== "function") return () => {};
  const channel = client.channel(`log-note-sync:${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "log_note_sync_changes", filter: `user_id=eq.${userId}` }, onChange);
  let active = true;
  Promise.resolve(channel.subscribe()).catch(() => {});
  return () => { if (!active) return; active = false; Promise.resolve(client.removeChannel?.(channel)).catch(() => {}); };
}
