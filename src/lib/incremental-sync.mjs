/**
 * Pure protocol and merge helpers for the account-scoped record and plan
 * synchronization streams. The browser remains the owner of the full local
 * state; this module only deals with item deltas and conflict decisions.
 */

export const SYNC_KINDS = Object.freeze(["record", "plan"]);
export const SYNC_OPERATIONS = Object.freeze(["upsert", "delete"]);
export const SYNC_BATCH_LIMIT = 50;
export const SYNC_PULL_LIMIT = 200;

const METADATA_FIELDS = new Set(["id", "createdAt", "updatedAt"]);

function assertKind(kind) {
  if (!SYNC_KINDS.includes(kind)) throw new Error("Unknown sync entity kind");
  return kind;
}

function assertId(id) {
  const value = String(id || "").trim();
  if (!value || value.length > 180) throw new Error("Sync entity ID is invalid");
  return value;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function newOperationId() {
  return globalThis.crypto?.randomUUID?.()
    || `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameValue(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function normalizePayload(kind, item) {
  assertKind(kind);
  if (!item) return null;
  const payload = clone(item);
  payload.id = assertId(payload.id);
  if (kind === "record") payload.attachments = [];
  return payload;
}

export function syncEntityKey(kind, entityId) {
  return `${assertKind(kind)}:${assertId(entityId)}`;
}

export function syncItemFingerprint(kind, item) {
  const payload = normalizePayload(kind, item);
  return payload ? canonicalJson(payload) : "null";
}

export function makeSyncMutation({
  kind,
  operation,
  entityId,
  baseVersion = 0,
  payload = null,
  operationId,
  deviceId,
  clientAt = Date.now()
}) {
  assertKind(kind);
  if (!SYNC_OPERATIONS.includes(operation)) throw new Error("Unknown sync operation");
  const id = assertId(entityId);
  const version = Number(baseVersion);
  if (!Number.isInteger(version) || version < 0) throw new Error("Sync base version is invalid");
  const normalizedPayload = operation === "upsert" ? normalizePayload(kind, payload) : null;
  if (operation === "upsert" && !normalizedPayload) throw new Error("Sync upsert payload is required");
  if (operation === "upsert" && normalizedPayload.id !== id) throw new Error("Sync payload ID does not match entity ID");
  const normalizedOperationId = assertId(operationId || newOperationId());
  const normalizedDeviceId = assertId(deviceId || "local-device");
  return {
    kind,
    operation,
    entityId: id,
    baseVersion: version,
    payload: normalizedPayload,
    operationId: normalizedOperationId,
    deviceId: normalizedDeviceId,
    clientAt: Number.isFinite(Number(clientAt)) ? Number(clientAt) : Date.now()
  };
}

/** Coalesces unsent mutations while keeping the earliest common base version. */
export function coalesceSyncMutations(mutations = []) {
  const result = new Map();
  mutations.forEach((mutation) => {
    const current = makeSyncMutation(mutation);
    const key = syncEntityKey(current.kind, current.entityId);
    const previous = result.get(key);
    if (!previous) {
      result.set(key, current);
      return;
    }
    result.set(key, makeSyncMutation({
      ...current,
      baseVersion: previous.baseVersion,
      operationId: current.operationId,
      clientAt: current.clientAt
    }));
  });
  return [...result.values()];
}

function byId(items = []) {
  return new Map(items.filter((item) => item?.id).map((item) => [String(item.id), item]));
}

/**
 * Derives item mutations from two local snapshots. `versions` contains the
 * last server item version for each id and defaults to zero for new items.
 */
export function diffSyncItems({ kind, before = [], after = [], versions = {}, deviceId = "local-device" }) {
  assertKind(kind);
  const previous = byId(before);
  const current = byId(after);
  const ids = new Set([...previous.keys(), ...current.keys()]);
  const mutations = [];
  [...ids].sort().forEach((id) => {
    const beforeItem = previous.get(id) || null;
    const afterItem = current.get(id) || null;
    if (beforeItem && afterItem && sameValue(normalizePayload(kind, beforeItem), normalizePayload(kind, afterItem))) return;
    const baseVersion = Number(versions[id] || 0);
    mutations.push(makeSyncMutation({
      kind,
      operation: afterItem ? "upsert" : "delete",
      entityId: id,
      baseVersion,
      payload: afterItem,
      deviceId
    }));
  });
  return mutations;
}

function mergeField(base, local, remote, field) {
  if (METADATA_FIELDS.has(field)) return { value: local ?? remote ?? base, conflict: false };
  if (field === "updatedAt") return { value: Math.max(Number(local) || 0, Number(remote) || 0, Number(base) || 0), conflict: false };
  if (sameValue(local, base)) return { value: clone(remote), conflict: false };
  if (sameValue(remote, base)) return { value: clone(local), conflict: false };
  if (sameValue(local, remote)) return { value: clone(local), conflict: false };
  return { value: undefined, conflict: true };
}

/**
 * Performs a field-level three-way merge. A null item is a tombstone. The
 * caller decides how to persist a returned conflict; this function never
 * chooses a silent overwrite.
 */
export function mergeSyncItem({ kind, base = null, local = null, remote = null }) {
  assertKind(kind);
  const normalizedBase = normalizePayload(kind, base);
  const normalizedLocal = normalizePayload(kind, local);
  const normalizedRemote = normalizePayload(kind, remote);
  const localAttachments = kind === "record" && Array.isArray(local?.attachments) ? clone(local.attachments) : [];
  const withLocalAttachments = (item) => kind === "record" && item ? { ...item, attachments: localAttachments } : item;

  if (!normalizedLocal && !normalizedRemote) return { status: "merged", item: null, conflicts: [] };
  if (!normalizedBase && normalizedLocal && !normalizedRemote) return { status: "merged", item: withLocalAttachments(normalizedLocal), conflicts: [] };
  if (!normalizedBase && !normalizedLocal && normalizedRemote) return { status: "merged", item: normalizedRemote, conflicts: [] };
  if (!normalizedLocal && normalizedRemote && (!normalizedBase || sameValue(normalizedRemote, normalizedBase))) {
    return { status: "merged", item: null, conflicts: [] };
  }
  if (!normalizedRemote && normalizedLocal && (!normalizedBase || sameValue(normalizedLocal, normalizedBase))) {
    return { status: "merged", item: null, conflicts: [] };
  }
  if (!normalizedLocal || !normalizedRemote) {
    return { status: "conflict", item: null, conflicts: ["deleted"], base: normalizedBase, local: normalizedLocal, remote: normalizedRemote };
  }
  if (!normalizedBase) {
    if (sameValue(normalizedLocal, normalizedRemote)) return { status: "merged", item: withLocalAttachments(normalizedLocal), conflicts: [] };
    return { status: "conflict", item: null, conflicts: ["created"], base: null, local: normalizedLocal, remote: normalizedRemote };
  }

  const fields = new Set([
    ...Object.keys(normalizedBase),
    ...Object.keys(normalizedLocal),
    ...Object.keys(normalizedRemote)
  ]);
  const merged = {};
  const conflicts = [];
  [...fields].sort().forEach((field) => {
    const result = mergeField(normalizedBase[field], normalizedLocal[field], normalizedRemote[field], field);
    if (result.conflict) conflicts.push(field);
    else if (result.value !== undefined) merged[field] = result.value;
  });
  if (conflicts.length) return { status: "conflict", item: null, conflicts, base: normalizedBase, local: normalizedLocal, remote: normalizedRemote };
  merged.id = normalizedLocal.id || normalizedRemote.id;
  if (kind === "record") merged.attachments = localAttachments;
  return { status: "merged", item: merged, conflicts: [] };
}

export function mergeSyncCollections({ kind, base = [], local = [], remote = [] }) {
  assertKind(kind);
  const baseMap = byId(base);
  const localMap = byId(local);
  const remoteMap = byId(remote);
  const ids = [...new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()])].sort();
  const items = [];
  const conflicts = [];
  ids.forEach((id) => {
    const result = mergeSyncItem({ kind, base: baseMap.get(id), local: localMap.get(id), remote: remoteMap.get(id) });
    if (result.status === "conflict") conflicts.push({ kind, entityId: id, ...result });
    else if (result.item) items.push(result.item);
  });
  return { items, conflicts };
}

function mergeChangeWithCurrent({ kind, baseMap, localMap, currentItem, change }) {
  const base = baseMap.get(change.entityId) || null;
  const local = localMap.get(change.entityId) || null;
  const remote = change.operation === "delete" ? null : change.payload || null;
  const result = mergeSyncItem({ kind, base, local, remote });
  if (result.status === "conflict") {
    return {
      kind,
      entityId: change.entityId,
      status: "conflict",
      conflicts: result.conflicts,
      base,
      local,
      remote,
      current: currentItem || null,
      serverSeq: change.serverSeq,
      itemVersion: change.itemVersion,
      operation: change.operation
    };
  }
  return {
    kind,
    entityId: change.entityId,
    status: "merged",
    item: result.item || null,
    base: remote,
    serverSeq: change.serverSeq,
    itemVersion: change.itemVersion,
    operation: change.operation
  };
}

/**
 * Applies ordered remote changes onto a local collection, keeping the current
 * local version when the field-level merge succeeds and surfacing conflicts
 * when both sides changed the same field or delete state.
 */
export function applySyncChanges({ kind, base = [], local = [], changes = [] }) {
  assertKind(kind);
  const baseMap = byId(base);
  const localMap = byId(local);
  const mergedMap = new Map(localMap);
  const nextBaseMap = new Map(baseMap);
  const nextVersions = {};
  const conflicts = [];

  changes
    .slice()
    .sort((left, right) => Number(left?.serverSeq || 0) - Number(right?.serverSeq || 0))
    .forEach((change) => {
      const result = mergeChangeWithCurrent({
        kind,
        baseMap: nextBaseMap,
        localMap: mergedMap,
        currentItem: mergedMap.get(change.entityId) || null,
        change
      });

      nextVersions[change.entityId] = Number(change.itemVersion) || 0;

      if (result.status === "conflict") {
        conflicts.push(result);
        return;
      }

      if (result.item) mergedMap.set(change.entityId, result.item);
      else mergedMap.delete(change.entityId);

      nextBaseMap.set(change.entityId, result.base);
    });

  return {
    items: sortSyncItems(kind, [...mergedMap.values()]),
    conflicts,
    base: Object.fromEntries(nextBaseMap.entries()),
    versions: nextVersions,
    latestServerSeq: changes.reduce((max, change) => Math.max(max, Number(change.serverSeq) || 0), 0)
  };
}

export function sortSyncItems(kind, items = []) {
  assertKind(kind);
  return [...items].sort((left, right) => {
    const date = String(left?.date || "").localeCompare(String(right?.date || ""));
    if (date) return date;
    const time = String(kind === "record" ? left?.time || "" : left?.startTime || "").localeCompare(String(kind === "record" ? right?.time || "" : right?.startTime || ""));
    if (time) return time;
    const created = (Number(left?.createdAt) || 0) - (Number(right?.createdAt) || 0);
    return created || String(left?.id || "").localeCompare(String(right?.id || ""));
  });
}
