import assert from "node:assert/strict";
import test from "node:test";
import { createRecordsStore } from "../src/app/_stores/records-store.ts";

test("records stores isolate provider instances and reset all account-owned state", () => {
  const first = createRecordsStore("first", 1);
  const second = createRecordsStore("second", 1);
  const entries = [{ id: "record-a", content: "unchanged raw text" }];
  first.getState().setEntries(entries);
  first.getState().setStream({
    cursor: 12, base: { "record-a": entries[0] }, versions: { "record-a": 2 },
    outbox: [{ entityId: "record-a" }], conflicts: [{ entityId: "record-a" }]
  });
  assert.deepEqual(second.getState().entries, []);
  assert.equal(second.getState().stream, null);
  first.getState().reset("third", 2);
  assert.equal(first.getState().accountId, "third");
  assert.equal(first.getState().generation, 2);
  assert.deepEqual(first.getState().entries, []);
  assert.equal(first.getState().stream, null);
  assert.equal(second.getState().accountId, "second");
});

test("record stream changes preserve the selected entries reference", () => {
  const store = createRecordsStore("first", 1);
  const entries = [{ id: "record-a", content: "original" }];
  store.getState().setEntries(entries);
  let entriesChanges = 0;
  const stop = store.subscribe((next, previous) => {
    if (!Object.is(next.entries, previous.entries)) entriesChanges += 1;
  });
  store.getState().setStream({ cursor: 1, base: {}, versions: {}, outbox: [], conflicts: [] });
  assert.equal(entriesChanges, 0);
  assert.equal(store.getState().entries, entries);
  store.getState().setEntries([{ ...entries[0], content: "edited" }]);
  assert.equal(entriesChanges, 1);
  assert.equal(entries[0].content, "original");
  stop();
});

test("reset retains callable actions for the next account session", () => {
  const store = createRecordsStore("first", 1);
  const actions = store.getState();
  actions.reset(null, 2);
  assert.equal(store.getState().setEntries, actions.setEntries);
  assert.equal(store.getState().setStream, actions.setStream);
  const guestEntries = [{ id: "guest-record", content: "offline guest" }];
  store.getState().setEntries(guestEntries);
  assert.equal(store.getState().entries, guestEntries);
  assert.equal(store.getState().accountId, null);
});
