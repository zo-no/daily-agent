import test from "node:test";
import assert from "node:assert/strict";
import { computeRailLayout } from "../src/lib/rail-layout.mjs";

const item = (id, anchorCenter, height = 44) => ({ id, anchorCenter, height });

test("aligns separated rail buttons to their content anchors", () => {
  const layout = computeRailLayout({
    availableHeight: 420,
    items: [item("records", 80), item("health", 210), item("work", 350)]
  });
  assert.equal(layout.overflow, false);
  assert.deepEqual(layout.positions.map(({ id, top }) => [id, top]), [
    ["records", 58],
    ["health", 188],
    ["work", 328]
  ]);
});

test("gathers headings above and below the viewport at opposite rail edges", () => {
  const top = computeRailLayout({
    availableHeight: 320,
    items: [item("one", -90), item("two", -20), item("three", 190)]
  });
  assert.deepEqual(top.positions.map(({ top: position }) => position), [4, 52, 168]);

  const bottom = computeRailLayout({
    availableHeight: 320,
    items: [item("one", 140), item("two", 390), item("three", 460)]
  });
  assert.deepEqual(bottom.positions.map(({ top: position }) => position), [118, 224, 272]);
});

test("never crosses document order when anchor targets collide", () => {
  const layout = computeRailLayout({
    availableHeight: 260,
    items: [item("one", 110), item("two", 116), item("three", 122)]
  });
  const positions = layout.positions.map(({ top }) => top);
  assert.equal(layout.overflow, false);
  assert.ok(positions[1] >= positions[0] + 48);
  assert.ok(positions[2] >= positions[1] + 48);
});

test("uses ordered internal scrolling when full touch targets do not fit", () => {
  const layout = computeRailLayout({
    availableHeight: 180,
    items: [item("one", 20, 58), item("two", 80, 58), item("three", 140, 58)]
  });
  assert.equal(layout.overflow, true);
  assert.deepEqual(layout.positions.map(({ top }) => top), [4, 66, 128]);
});
