import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inflateSync } from "node:zlib";

import { backupPayload, createInitialState } from "../src/lib/data.mjs";
import {
  AGENT_APPEARANCE_STATES,
  DEFAULT_AGENT_APPEARANCE_ID,
  resolveAgentAppearance
} from "../src/lib/agent-appearance.mjs";

function readApngMetadata(png) {
  let offset = 8;
  const metadata = { frames: 0, plays: 0, delays: [] };
  while (offset < png.byteLength) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === "acTL") {
      metadata.frames = data.readUInt32BE(0);
      metadata.plays = data.readUInt32BE(4);
    }
    if (type === "fcTL") {
      metadata.delays.push([data.readUInt16BE(20), data.readUInt16BE(22) || 100]);
    }
  }
  return metadata;
}

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodeFirstRgbaFrame(png) {
  let offset = 8;
  let width = 0;
  let height = 0;
  const imageData = [];
  while (offset < png.byteLength) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, "Agent artwork should use 8-bit channels");
      assert.equal(data[9], 6, "Agent artwork should be RGBA");
      assert.equal(data[12], 0, "Agent artwork should be non-interlaced");
    }
    if (type === "IDAT") imageData.push(data);
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const filtered = inflateSync(Buffer.concat(imageData));
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[sourceOffset];
    sourceOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[sourceOffset];
      sourceOffset += 1;
      const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0;
      const above = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[(y - 1) * stride + x - bytesPerPixel]
        : 0;
      const reconstructed = filter === 0
        ? raw
        : filter === 1
          ? raw + left
          : filter === 2
            ? raw + above
            : filter === 3
              ? raw + Math.floor((left + above) / 2)
              : raw + paethPredictor(left, above, upperLeft);
      pixels[y * stride + x] = reconstructed & 0xff;
    }
  }
  return { height, pixels, width };
}

function maxVerticalInkCoverage(png, windowWidth = 8) {
  const { height, pixels, width } = decodeFirstRgbaFrame(png);
  let maximum = 0;
  for (let startX = 0; startX <= width - windowWidth; startX += 1) {
    let rowsWithInk = 0;
    for (let y = 0; y < height; y += 1) {
      let rowHasInk = false;
      for (let x = startX; x < startX + windowWidth; x += 1) {
        const offset = (y * width + x) * 4;
        const luminance = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
        if (pixels[offset + 3] > 40 && luminance < 220) {
          rowHasInk = true;
          break;
        }
      }
      if (rowHasInk) rowsWithInk += 1;
    }
    maximum = Math.max(maximum, rowsWithInk / height);
  }
  return maximum;
}

test("Diary Agent appearance resolves one local default for every bounded visual state", () => {
  assert.equal(DEFAULT_AGENT_APPEARANCE_ID, "spine-line");
  assert.deepEqual(AGENT_APPEARANCE_STATES, ["idle", "scanning", "reviewing", "complete"]);

  const expectedAssets = {
    idle: {
      staticAsset: "/ui/diary/agent-spine-spirit-idle-still.png",
      motionAsset: "/ui/diary/agent-spine-spirit-idle-motion.png",
      cycleMs: 3000,
      frameDurationMs: 500,
      poses: ["grip", "reach-up", "body-follow", "settle"],
      gaze: ["center", "up", "down"]
    },
    scanning: {
      staticAsset: "/ui/diary/agent-spine-spirit-scanning-still.png",
      motionAsset: "/ui/diary/agent-spine-spirit-scanning-motion.png",
      cycleMs: 2400,
      frameDurationMs: 400,
      poses: ["peek", "stretch", "retract", "settle"],
      gaze: ["left", "center", "right"]
    },
    reviewing: {
      staticAsset: "/ui/diary/agent-spine-spirit-reviewing-still.png",
      motionAsset: "/ui/diary/agent-spine-spirit-reviewing-motion.png",
      cycleMs: 4000,
      frameDurationMs: 667,
      poses: ["observe", "chin-touch", "head-tilt", "settle"],
      gaze: ["record", "note", "center"]
    },
    complete: {
      staticAsset: "/ui/diary/agent-spine-spirit-complete-still.png",
      motionAsset: "/ui/diary/agent-spine-spirit-complete-motion.png",
      cycleMs: 3000,
      frameDurationMs: 500,
      poses: ["coil", "stretch", "regrip", "settle"],
      gaze: ["down", "up", "center"]
    }
  };

  for (const state of AGENT_APPEARANCE_STATES) {
    const appearance = resolveAgentAppearance(DEFAULT_AGENT_APPEARANCE_ID, state);
    assert.equal(appearance.id, DEFAULT_AGENT_APPEARANCE_ID);
    assert.equal(appearance.state, state);
    assert.equal(appearance.staticAsset, expectedAssets[state].staticAsset);
    assert.equal(appearance.motionAsset, expectedAssets[state].motionAsset);
    assert.equal(appearance.asset, expectedAssets[state].staticAsset, "Legacy asset alias should resolve to the still frame");
    assert.deepEqual(appearance.intrinsicSize, { width: 128, height: 128 });
    assert.equal(appearance.motion.kind, "apng");
    assert.equal(appearance.motion.frameCount, 6);
    assert.equal(appearance.motion.cycleMs, expectedAssets[state].cycleMs);
    assert.equal(appearance.motion.frameDurationMs, expectedAssets[state].frameDurationMs);
    assert.deepEqual(appearance.motion.poses, expectedAssets[state].poses);
    assert.deepEqual(appearance.motion.gaze, expectedAssets[state].gaze);
    assert.equal(appearance.motionMode, "animated");
    for (const asset of [appearance.staticAsset, appearance.motionAsset]) {
      assert.match(asset, /^\/ui\/diary\//);
      assert.doesNotMatch(asset, /^(?:https?:|data:|blob:)/);
    }
    assert.equal(appearance.presentationClass, "agent-appearance-spine-line");
  }

  assert.equal(resolveAgentAppearance(DEFAULT_AGENT_APPEARANCE_ID, "reviewing", "still").motionMode, "still");
  assert.equal(resolveAgentAppearance(DEFAULT_AGENT_APPEARANCE_ID, "reviewing", "unsupported").motionMode, "animated");
});

test("Diary Agent appearance falls back without expanding persisted product data", () => {
  const fallback = resolveAgentAppearance("unknown-custom-agent", "unsupported-state");
  assert.equal(fallback.id, DEFAULT_AGENT_APPEARANCE_ID);
  assert.equal(fallback.state, "idle");
  assert.equal(Object.isFrozen(fallback.definition), true);

  const state = createInitialState();
  const backup = backupPayload(state);
  for (const payload of [state, backup]) {
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /agentAppearance|agentAvatar|spine-line|agent-spine-spirit/);
  }
});

test("The bundled spine-spirit states use bounded character-only stills and distinct slow APNG motion", async () => {
  const expectedDelays = {
    idle: [1, 2],
    scanning: [2, 5],
    reviewing: [2, 3],
    complete: [1, 2]
  };
  const assets = AGENT_APPEARANCE_STATES.flatMap((state) => [
    [`agent-spine-spirit-${state}-still.png`, state, false],
    [`agent-spine-spirit-${state}-motion.png`, state, true]
  ]);

  for (const [name, state, animated] of assets) {
    const png = await readFile(new URL(`../public/ui/diary/${name}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", name);
    assert.equal(png.readUInt32BE(16), 128, `${name} width`);
    assert.equal(png.readUInt32BE(20), 128, `${name} height`);
    assert.equal(png[25], 6, `${name} must preserve an alpha channel`);
    assert.ok(maxVerticalInkCoverage(png) < 0.65, `${name} must not carry a second full-height spine line`);
    assert.equal(png.includes(Buffer.from("acTL")), animated, `${name} animation contract`);
    if (animated) {
      const metadata = readApngMetadata(png);
      assert.equal(metadata.frames, 6, `${name} should contain several visible crawl/thinking poses`);
      assert.equal(metadata.plays, 0, `${name} should loop while the Agent is active`);
      assert.deepEqual(metadata.delays, Array.from({ length: 6 }, () => expectedDelays[state]), `${name} should keep its state-specific restrained frame rhythm`);
    }
    assert.ok(png.byteLength < 100_000, `${name} should stay cheap to precache: ${png.byteLength}`);
  }
});
