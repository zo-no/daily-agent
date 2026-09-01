import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const generatedProposalSchema = z.object({
  inputData: z.unknown(),
  modelOutput: z.unknown()
}).strict();
const normalizedProposalSchema = z.object({ result: z.unknown() }).strict();

export class AiRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AiRuntimeError";
    this.code = code;
  }
}

function errorChainIncludes(error, predicate) {
  const pending = [error];
  const seen = new Set();
  while (pending.length) {
    const current = pending.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (predicate(current)) return true;
    for (const nested of [
      current.cause,
      current.error,
      current.originalError,
      current.details?.cause,
      current.details?.error
    ]) {
      if (nested && (typeof nested === "object" || typeof nested === "function")) {
        pending.push(nested);
      }
    }
  }
  return false;
}

function runtimeError(code, message) {
  return new AiRuntimeError(code, message);
}

export function classifyAiRuntimeError(error, abortSignal) {
  if (abortSignal?.aborted || errorChainIncludes(error, (candidate) => (
    candidate?.name === "AbortError"
    || candidate?.code === "AI_PROVIDER_TIMEOUT"
    || candidate?.code === "AI_RUNTIME_ABORTED"
  ))) {
    return runtimeError("AI_RUNTIME_ABORTED", "AI execution was aborted");
  }
  if (errorChainIncludes(error, (candidate) => (
    candidate?.code === "AI_PROVIDER_RESPONSE_TOO_LARGE"
    || candidate?.code === "AI_RUNTIME_RESPONSE_TOO_LARGE"
  ))) {
    return runtimeError("AI_RUNTIME_RESPONSE_TOO_LARGE", "AI response was too large");
  }
  if (errorChainIncludes(error, (candidate) => (
    candidate?.statusCode === 429
    || candidate?.status === 429
    || candidate?.code === "AI_RUNTIME_RATE_LIMITED"
  ))) {
    return runtimeError("AI_RUNTIME_RATE_LIMITED", "AI provider rate limited the request");
  }
  if (errorChainIncludes(error, (candidate) => (
    candidate?.code === "STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED"
    || candidate?.code === "AI_RUNTIME_INVALID_OUTPUT"
    || candidate?.name === "AI_NoObjectGeneratedError"
    || candidate?.name === "AI_NoOutputGeneratedError"
    || String(candidate?.message || "").startsWith("Structured output validation failed")
  ))) {
    return runtimeError("AI_RUNTIME_INVALID_OUTPUT", "AI returned invalid structured output");
  }
  if (errorChainIncludes(error, (candidate) => (
    Number.isInteger(candidate?.statusCode) && candidate.statusCode >= 400
  ))) {
    return runtimeError("AI_RUNTIME_UPSTREAM_ERROR", "AI provider request failed");
  }
  return runtimeError("AI_RUNTIME_UNAVAILABLE", "AI execution failed");
}

export function createStructuredProposalWorkflow({
  capabilityId,
  agent,
  inputSchema,
  outputSchema,
  normalize,
  abortSignal,
  modelSettings = {}
}) {
  if (!agent) throw new TypeError("Structured proposal workflow requires an Agent");
  if (!inputSchema) throw new TypeError("Structured proposal workflow requires an input schema");
  if (!outputSchema) throw new TypeError("Structured proposal workflow requires an output schema");
  if (typeof normalize !== "function") {
    throw new TypeError("Structured proposal workflow requires a normalizer");
  }

  const generateProposal = createStep({
    id: `generate-${capabilityId}`,
    description: "Generate one strict, inert structured proposal.",
    inputSchema,
    outputSchema: generatedProposalSchema,
    retries: 0,
    execute: async ({ inputData }) => {
      if (abortSignal?.aborted) {
        throw runtimeError("AI_RUNTIME_ABORTED", "AI execution was aborted");
      }
      try {
        const generated = await agent.generate(JSON.stringify(inputData), {
          structuredOutput: { schema: outputSchema, errorStrategy: "strict" },
          abortSignal,
          maxSteps: 1,
          toolChoice: "none",
          modelSettings: { ...modelSettings, maxRetries: 0 }
        });
        if (generated.error) throw generated.error;
        return { inputData, modelOutput: generated.object };
      } catch (error) {
        throw classifyAiRuntimeError(error, abortSignal);
      }
    }
  });

  const normalizeProposal = createStep({
    id: `normalize-${capabilityId}`,
    description: "Apply the capability-owned schema, allowlists, and conflict rules.",
    inputSchema: generatedProposalSchema,
    outputSchema: normalizedProposalSchema,
    retries: 0,
    execute: async ({ inputData }) => {
      if (abortSignal?.aborted) {
        throw runtimeError("AI_RUNTIME_ABORTED", "AI execution was aborted");
      }
      const result = await normalize(inputData.modelOutput, inputData.inputData);
      if (result === undefined) throw new TypeError("AI normalizer returned no result");
      return { result };
    }
  });

  return createWorkflow({
    id: `${capabilityId}-workflow`,
    description: "Generate and normalize one bounded project proposal.",
    inputSchema,
    outputSchema: normalizedProposalSchema,
    options: {
      validateInputs: true,
      shouldPersistSnapshot: () => false
    }
  })
    .then(generateProposal)
    .then(normalizeProposal)
    .commit();
}
