import { Mastra } from "@mastra/core";
import { webcrypto as nodeWebcrypto } from "node:crypto";
import { createStructuredProposalAgent } from "./agents/structured-proposal-agent.mjs";
import {
  AiRuntimeError,
  createStructuredProposalWorkflow
} from "./workflows/structured-proposal-workflow.mjs";

if (typeof globalThis.crypto === "undefined" && nodeWebcrypto) {
  globalThis.crypto = nodeWebcrypto;
}

/** Run one request-scoped structured proposal; tools remain opt-in per capability. */
export async function runStructuredProposal({
  capabilityId,
  model,
  instructions,
  inputSchema,
  outputSchema,
  normalize,
  abortSignal,
  modelSettings,
  input,
  tools,
  toolChoice = "none",
  maxSteps = 1
}) {
  if (abortSignal?.aborted) {
    throw new AiRuntimeError("AI_RUNTIME_ABORTED", "AI execution was aborted");
  }

  const structuredProposalAgent = createStructuredProposalAgent({
    capabilityId,
    model,
    instructions,
    tools
  });
  const structuredProposalWorkflow = createStructuredProposalWorkflow({
    capabilityId,
    agent: structuredProposalAgent,
    inputSchema,
    outputSchema,
    normalize,
    abortSignal,
    modelSettings,
    toolChoice,
    maxSteps
  });
  const mastra = new Mastra({
    agents: { structuredProposalAgent },
    workflows: { structuredProposalWorkflow },
    logger: false
  });
  const workflow = mastra.getWorkflow("structuredProposalWorkflow");
  const run = typeof workflow.createRunAsync === "function"
    ? await workflow.createRunAsync()
    : await workflow.createRun();
  const response = await run.start({ inputData: input });
  if (response.status === "success") return response.result.result;
  if (response.status === "failed" && response.error) throw response.error;
  throw new Error(`AI workflow ended with status ${response.status}`);
}
