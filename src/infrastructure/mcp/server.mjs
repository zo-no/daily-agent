import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  categoryQuerySchema,
  operationSchema,
  planQuerySchema,
  recordQuerySchema,
  requestEnvelopeSchema,
  targetSchema
} from "../../shared/agent-bridge/protocol.mjs";
import { BridgeClientError, createBridgeClientFromEnv } from "./bridge-client.mjs";

const TOOL_REQUEST_ID = "mcp-tool";

function responseFor(uri, value) {
  return {
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(value) }]
  };
}

function toolResponse(value) {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}

function errorResponse(error) {
  const code = error instanceof BridgeClientError ? error.code : "BRIDGE_ERROR";
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ error: { code, message: error?.message || "bridge request failed" } }) }]
  };
}

function parseReadArgs(schema, args) {
  return schema.parse({ protocolVersion: 1, requestId: TOOL_REQUEST_ID, ...args });
}

export function createLogNoteMcpServer({ bridgeClient = createBridgeClientFromEnv() } = {}) {
  const server = new McpServer({
    name: "log-note-agent-bridge",
    version: "1.0.0"
  }, {
    instructions: "Log Note distinguishes future time-block plans from past/current records. Read first, propose one target, show the diff, ask for explicit confirmation, then commit and verify read-back."
  });

  server.registerResource(
    "categories",
    "lognote://categories",
    { title: "Log Note categories", description: "Existing domains and categories for the paired account", mimeType: "application/json" },
    async (uri) => {
      try {
        categoryQuerySchema.parse({ protocolVersion: 1, requestId: TOOL_REQUEST_ID });
        return responseFor(uri, await bridgeClient.request({ kind: "list-categories", payload: {} }));
      } catch (error) {
        throw error;
      }
    }
  );

  server.registerResource(
    "plans",
    new ResourceTemplate("lognote://plans{?date}", { list: undefined }),
    { title: "Log Note plans", description: "Bounded plan blocks for one date; Google-origin blocks are read-only", mimeType: "application/json" },
    async (uri, variables) => {
      try {
        const date = String(variables?.date || new URL(uri.href).searchParams.get("date") || "");
        const parsed = parseReadArgs(planQuerySchema, { date });
        return responseFor(uri, await bridgeClient.request({ kind: "list-plans", payload: { date: parsed.date } }));
      } catch (error) {
        throw error;
      }
    }
  );

  server.registerResource(
    "records",
    new ResourceTemplate("lognote://records{?from,to}", { list: undefined }),
    { title: "Log Note records", description: "Bounded records for at most seven days in the paired account", mimeType: "application/json" },
    async (uri, variables) => {
      try {
        const url = new URL(uri.href);
        const parsed = parseReadArgs(recordQuerySchema, {
          from: String(variables?.from || url.searchParams.get("from") || ""),
          to: String(variables?.to || url.searchParams.get("to") || "")
        });
        return responseFor(uri, await bridgeClient.request({ kind: "list-records", payload: { from: parsed.from, to: parsed.to } }));
      } catch (error) {
        throw error;
      }
    }
  );

  server.registerTool("list_plans", {
    title: "List plans",
    description: "Read future time-block plans for one date in the current paired account.",
    inputSchema: z.object({ date: z.string() }).strict()
  }, async (args) => {
    try {
      const parsed = parseReadArgs(planQuerySchema, args);
      return toolResponse(await bridgeClient.request({ kind: "list-plans", payload: { date: parsed.date } }));
    } catch (error) {
      return errorResponse(error);
    }
  });

  server.registerTool("list_records", {
    title: "List records",
    description: "Read past/current records for a bounded inclusive date range of at most seven days.",
    inputSchema: z.object({ from: z.string(), to: z.string() }).strict()
  }, async (args) => {
    try {
      const parsed = parseReadArgs(recordQuerySchema, args);
      return toolResponse(await bridgeClient.request({ kind: "list-records", payload: { from: parsed.from, to: parsed.to } }));
    } catch (error) {
      return errorResponse(error);
    }
  });

  server.registerTool("get_plan", {
    title: "Get plan",
    description: "Read one plan by ID within an explicit date scope.",
    inputSchema: z.object({ id: z.string(), date: z.string() }).strict()
  }, async ({ id, date }) => {
    try {
      const parsed = parseReadArgs(planQuerySchema, { date });
      return toolResponse(await bridgeClient.request({ kind: "get-plan", payload: { id, date: parsed.date } }));
    } catch (error) {
      return errorResponse(error);
    }
  });

  server.registerTool("get_record", {
    title: "Get record",
    description: "Read one record by ID within an explicit bounded date scope.",
    inputSchema: z.object({ id: z.string(), from: z.string(), to: z.string() }).strict()
  }, async ({ id, from, to }) => {
    try {
      const parsed = parseReadArgs(recordQuerySchema, { from, to });
      return toolResponse(await bridgeClient.request({ kind: "get-record", payload: { id, from: parsed.from, to: parsed.to } }));
    } catch (error) {
      return errorResponse(error);
    }
  });

  const changeInput = z.object({
    operation: operationSchema,
    targetId: z.string().optional(),
    draft: z.record(z.string(), z.unknown()).default({}),
    expectedRevision: z.number().int().nonnegative(),
    sourceFingerprint: z.string().min(1).max(240)
  }).strict();

  server.registerTool("propose_plan_change", {
    title: "Propose plan change",
    description: "Create a preview-only one-plan proposal. It never writes until the user confirms.",
    inputSchema: changeInput
  }, async (args) => {
    try {
      const parsed = changeInput.parse(args);
      return toolResponse(await bridgeClient.request({ kind: "propose-plan-change", payload: parsed }));
    } catch (error) {
      return errorResponse(error);
    }
  });

  server.registerTool("propose_record_change", {
    title: "Propose record change",
    description: "Create a preview-only one-record proposal. The existing category must be used and raw content changes only when explicit.",
    inputSchema: changeInput
  }, async (args) => {
    try {
      const parsed = changeInput.parse(args);
      return toolResponse(await bridgeClient.request({ kind: "propose-record-change", payload: parsed }));
    } catch (error) {
      return errorResponse(error);
    }
  });

  server.registerTool("commit_change", {
    title: "Commit confirmed change",
    description: "Commit one previously previewed plan or record proposal after explicit confirmation, then return read-back evidence.",
    inputSchema: z.object({
      proposalId: z.string(),
      confirmation: z.literal("confirmed"),
      target: targetSchema,
      expectedRevision: z.number().int().nonnegative(),
      sourceFingerprint: z.string().min(1).max(240)
    }).strict()
  }, async (args) => {
    try {
      return toolResponse(await bridgeClient.request({ kind: "commit-change", payload: args }));
    } catch (error) {
      return errorResponse(error);
    }
  });

  return server;
}
