import { Agent } from "@mastra/core/agent";

/**
 * Create one request-scoped Agent with no tools, memory, or persistent state.
 */
export function createStructuredProposalAgent({ capabilityId, model, instructions }) {
  if (!capabilityId) throw new TypeError("AI capability identifier is required");
  if (!model) throw new TypeError("Structured proposal Agent requires a model");
  if (typeof instructions !== "string" || !instructions.trim()) {
    throw new TypeError("Structured proposal Agent requires instructions");
  }

  return new Agent({
    id: `${capabilityId}-agent`,
    name: `${capabilityId} Agent`,
    description: "Produces one inert, schema-bounded project proposal.",
    instructions,
    model,
    maxRetries: 0
  });
}
