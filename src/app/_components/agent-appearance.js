import {
  DEFAULT_AGENT_APPEARANCE_ID,
  resolveAgentAppearance
} from "@/lib/agent-appearance.mjs";

/** Presentation-only Agent artwork. Session behavior remains owned by the calling surface. */
export function AgentAppearance({
  appearanceId = DEFAULT_AGENT_APPEARANCE_ID,
  motionMode = "animated",
  status = "idle"
}) {
  const appearance = resolveAgentAppearance(appearanceId, status, motionMode);
  const visibleAsset = appearance.motionMode === "animated"
    ? appearance.motionAsset
    : appearance.staticAsset;

  return (
    <span
      className={`organize-helper-appearance ${appearance.presentationClass}`}
      data-agent-appearance={appearance.id}
      data-agent-appearance-state={appearance.state}
      data-agent-motion-mode={appearance.motionMode}
      data-agent-static-asset={appearance.staticAsset}
      data-agent-motion-asset={appearance.motionAsset}
      data-agent-motion-frame-count={appearance.motion.frameCount}
      data-agent-motion-cycle-ms={appearance.motion.cycleMs}
      data-agent-motion-poses={appearance.motion.poses.join(" ")}
      data-agent-gaze-states={appearance.motion.gaze.join(" ")}
      style={{
        "--agent-intrinsic-width": appearance.intrinsicSize.width,
        "--agent-intrinsic-height": appearance.intrinsicSize.height
      }}
      aria-hidden="true"
    >
      <img
        className="organize-helper-figure"
        src={visibleAsset}
        width={appearance.intrinsicSize.width}
        height={appearance.intrinsicSize.height}
        alt=""
      />
    </span>
  );
}
