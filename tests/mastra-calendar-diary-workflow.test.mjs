import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { Mastra } from "@mastra/core/mastra";
import { createHumanReviewedProposalWorkflow } from "../src/mastra/workflows/human-reviewed-proposal-workflow.mjs";

const inputSchema = z.object({ events: z.array(z.object({ title: z.string() })), entries: z.array(z.object({ content: z.string() })) });
const outputSchema = z.object({ overview: z.string() });
const input = { events: [{ title: "  Synthetic meeting  " }], entries: [{ content: "Synthetic note" }] };

test("human-reviewed workflow suspends before generation, approves once, and rejects with zero calls", async () => {
  let calls = 0;
  let generatedInput;
  const agent = { generate: async (value) => { calls += 1; generatedInput = JSON.parse(value); return { object: { overview: "Synthetic result" } }; } };
  const definition = createHumanReviewedProposalWorkflow({ capabilityId: "test-calendar-diary", agent, inputSchema, outputSchema, sanitize: (value) => ({ ...value, events: value.events.map((event) => ({ title: event.title.trim() })) }), normalize: (value) => value });
  const workflow = new Mastra({ workflows: { testCalendarDiaryWorkflow: definition }, logger: false }).getWorkflow("testCalendarDiaryWorkflow");
  const createRun = () => typeof workflow.createRunAsync === "function" ? workflow.createRunAsync() : workflow.createRun();

  const approveRun = await createRun();
  const suspended = await approveRun.start({ inputData: input });
  assert.equal(suspended.status, "suspended"); assert.equal(calls, 0);
  const approved = await approveRun.resume({ step: "approve-test-calendar-diary", resumeData: { decision: "approve" } });
  assert.equal(approved.status, "success"); assert.deepEqual(approved.result, { status: "approved", result: { overview: "Synthetic result" } }); assert.equal(calls, 1);
  assert.equal(generatedInput.events[0].title, "Synthetic meeting");

  const rejectRun = await createRun();
  assert.equal((await rejectRun.start({ inputData: input })).status, "suspended");
  const rejected = await rejectRun.resume({ step: "approve-test-calendar-diary", resumeData: { decision: "reject" } });
  assert.equal(rejected.status, "success"); assert.deepEqual(rejected.result, { status: "rejected", result: null }); assert.equal(calls, 1);
});
