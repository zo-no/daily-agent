import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { classifyAiRuntimeError } from "./structured-proposal-workflow.mjs";

const approvalOutputSchema = z.object({ approved: z.boolean(), inputData: z.unknown() }).strict();
const generatedSchema = z.object({ approved: z.boolean(), inputData: z.unknown(), modelOutput: z.unknown().nullable() }).strict();
const workflowOutputSchema = z.object({ status: z.enum(["approved", "rejected"]), result: z.unknown().nullable() }).strict();
export const humanApprovalResumeSchema = z.object({ decision: z.enum(["approve", "reject"]) }).strict();
export const humanApprovalSuspendSchema = z.object({ question: z.string(), eventCount: z.number().int().nonnegative(), diaryCount: z.number().int().nonnegative(), outboundFields: z.array(z.string()), noWrite: z.boolean() }).strict();

/** Studio-only suspend/resume workflow; callers must provide synthetic input. */
export function createHumanReviewedProposalWorkflow({ capabilityId, agent, inputSchema, outputSchema, sanitize = (value) => value, normalize, modelSettings = {} }) {
  if (!capabilityId || !agent || !inputSchema || !outputSchema || typeof sanitize !== "function" || typeof normalize !== "function") throw new TypeError("Human-reviewed workflow configuration is incomplete");
  const approve = createStep({
    id: `approve-${capabilityId}`,
    description: "Pause before any private source content is sent to the Agent.",
    inputSchema,
    outputSchema: approvalOutputSchema,
    resumeSchema: humanApprovalResumeSchema,
    suspendSchema: humanApprovalSuspendSchema,
    retries: 0,
    execute: async ({ inputData, resumeData, suspend }) => {
      const sanitizedInput = sanitize(inputData);
      if (!resumeData) return suspend({ question: "Approve sending this synthetic Calendar/diary payload to the configured model?", eventCount: sanitizedInput.events.length, diaryCount: sanitizedInput.entries.length, outboundFields: ["request metadata", "event title/time/all-day", "diary time/text", "request-local source IDs"], noWrite: true });
      return { approved: resumeData.decision === "approve", inputData: sanitizedInput };
    }
  });
  const generate = createStep({
    id: `generate-${capabilityId}`,
    description: "Generate once only after explicit approval.",
    inputSchema: approvalOutputSchema,
    outputSchema: generatedSchema,
    retries: 0,
    execute: async ({ inputData, abortSignal }) => {
      if (!inputData.approved) return { ...inputData, modelOutput: null };
      try {
        const generated = await agent.generate(JSON.stringify(inputData.inputData), { structuredOutput: { schema: outputSchema, errorStrategy: "strict" }, abortSignal, maxSteps: 1, toolChoice: "none", modelSettings: { ...modelSettings, maxRetries: 0 } });
        if (generated.error) throw generated.error;
        return { ...inputData, modelOutput: generated.object };
      } catch (error) { throw classifyAiRuntimeError(error, abortSignal); }
    }
  });
  const normalizeStep = createStep({
    id: `normalize-${capabilityId}`,
    description: "Reject or normalize through the capability-owned project boundary.",
    inputSchema: generatedSchema,
    outputSchema: workflowOutputSchema,
    retries: 0,
    execute: async ({ inputData }) => inputData.approved
      ? { status: "approved", result: await normalize(inputData.modelOutput, inputData.inputData) }
      : { status: "rejected", result: null }
  });
  return createWorkflow({ id: `${capabilityId}-human-reviewed-workflow`, description: "Validate synthetic sources, pause for human approval, then generate and normalize one inert suggestion set.", inputSchema, outputSchema: workflowOutputSchema, options: { validateInputs: true, allowUnclaimedResumes: true } }).then(approve).then(generate).then(normalizeStep).commit();
}
