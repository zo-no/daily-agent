export const DEFAULT_AGENT_APPEARANCE_ID = "spine-line";

export const AGENT_APPEARANCE_STATES = Object.freeze(["idle", "scanning", "reviewing", "complete"]);

const SPINE_SPIRIT_INTRINSIC_SIZE = Object.freeze({ width: 128, height: 128 });

function motionProfile({ cycleMs, frameDurationMs, gaze, poses }) {
  return Object.freeze({
    kind: "apng",
    frameCount: 6,
    frameDurationMs,
    cycleMs,
    poses: Object.freeze(poses),
    gaze: Object.freeze(gaze)
  });
}

const SPINE_SPIRIT_MOTION = Object.freeze({
  idle: motionProfile({
    cycleMs: 3000,
    frameDurationMs: 500,
    poses: ["grip", "reach-up", "body-follow", "settle"],
    gaze: ["center", "up", "down"]
  }),
  scanning: motionProfile({
    cycleMs: 2400,
    frameDurationMs: 400,
    poses: ["peek", "stretch", "retract", "settle"],
    gaze: ["left", "center", "right"]
  }),
  reviewing: motionProfile({
    cycleMs: 4000,
    frameDurationMs: 667,
    poses: ["observe", "chin-touch", "head-tilt", "settle"],
    gaze: ["record", "note", "center"]
  }),
  complete: motionProfile({
    cycleMs: 3000,
    frameDurationMs: 500,
    poses: ["coil", "stretch", "regrip", "settle"],
    gaze: ["down", "up", "center"]
  })
});

function stateAppearance(state) {
  return Object.freeze({
    staticAsset: `/ui/diary/agent-spine-spirit-${state}-still.png`,
    motionAsset: `/ui/diary/agent-spine-spirit-${state}-motion.png`,
    intrinsicSize: SPINE_SPIRIT_INTRINSIC_SIZE,
    motion: SPINE_SPIRIT_MOTION[state]
  });
}

const SPINE_LINE_APPEARANCE = Object.freeze({
  id: DEFAULT_AGENT_APPEARANCE_ID,
  presentationClass: "agent-appearance-spine-line",
  states: Object.freeze({
    idle: stateAppearance("idle"),
    scanning: stateAppearance("scanning"),
    reviewing: stateAppearance("reviewing"),
    complete: stateAppearance("complete")
  }),
  assets: Object.freeze({
    idle: "/ui/diary/agent-spine-spirit-idle-still.png",
    scanning: "/ui/diary/agent-spine-spirit-scanning-still.png",
    reviewing: "/ui/diary/agent-spine-spirit-reviewing-still.png",
    complete: "/ui/diary/agent-spine-spirit-complete-still.png"
  })
});

const AGENT_APPEARANCES = Object.freeze({
  [DEFAULT_AGENT_APPEARANCE_ID]: SPINE_LINE_APPEARANCE
});

export function resolveAgentAppearance(appearanceId, requestedState, requestedMotionMode = "animated") {
  const definition = AGENT_APPEARANCES[appearanceId] || SPINE_LINE_APPEARANCE;
  const state = AGENT_APPEARANCE_STATES.includes(requestedState) ? requestedState : "idle";
  const stateDefinition = definition.states[state] || definition.states.idle;
  const motionMode = requestedMotionMode === "still" ? "still" : "animated";

  return Object.freeze({
    id: definition.id,
    state,
    staticAsset: stateDefinition.staticAsset,
    motionAsset: stateDefinition.motionAsset,
    intrinsicSize: stateDefinition.intrinsicSize,
    motion: stateDefinition.motion,
    motionMode,
    asset: stateDefinition.staticAsset,
    presentationClass: definition.presentationClass,
    definition
  });
}
