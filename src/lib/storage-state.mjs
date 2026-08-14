/**
 * @fileoverview Local storage loading and persistence guards for Log Note data.
 *
 * A load failure is deliberately different from an empty storage key: the app
 * may render its initial state in both cases, but only the empty-key path is
 * allowed to persist automatically.
 */

export function loadStoredState(getStorage, key, createState, restoreState) {
  let rawPayload;
  try {
    const storage = typeof getStorage === "function" ? getStorage() : getStorage;
    rawPayload = storage.getItem(key);
    if (rawPayload === null) {
      return { mode: "new", state: createState(), canPersist: true, rawPayload: null, error: null };
    }
    return {
      mode: "ready",
      state: restoreState(JSON.parse(rawPayload)),
      canPersist: true,
      rawPayload: null,
      error: null
    };
  } catch (error) {
    return {
      mode: "recovery-needed",
      state: createState(),
      canPersist: false,
      rawPayload: rawPayload ?? null,
      error
    };
  }
}

export function persistStoredState(getStorage, key, state, { allowWrite = true } = {}) {
  if (!allowWrite) return { ok: false, blocked: true, error: null };
  try {
    const storage = typeof getStorage === "function" ? getStorage() : getStorage;
    storage.setItem(key, JSON.stringify(state));
    return { ok: true, blocked: false, error: null };
  } catch (error) {
    return { ok: false, blocked: false, error };
  }
}
