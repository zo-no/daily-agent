import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

function startServer() {
  const child = spawn(process.execPath, ["scripts/log-note-mcp.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      LOG_NOTE_BRIDGE_URL: "http://127.0.0.1:3100",
      LOG_NOTE_PAIRING_TOKEN: "mcp-contract-test-token"
    },
    stdio: ["pipe", "pipe", "pipe"]
  });
  let buffer = "";
  let stderr = "";
  const pending = new Map();

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    while (buffer.includes("\n")) {
      const index = buffer.indexOf("\n");
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      if (message.id !== undefined) pending.get(message.id)?.(message);
    }
  });

  let nextId = 0;
  function request(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP request timed out: ${method}; stderr=${stderr}`));
      }, 5_000);
      pending.set(id, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  function notify(method, params = {}) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  return { child, request, notify };
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    once(child, "close"),
    new Promise((resolve) => setTimeout(resolve, 1_000))
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

test("stdio MCP bridge completes handshake and exposes bounded resources/tools", async () => {
  const server = startServer();
  try {
    const initialized = await server.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "contract-test", version: "1" }
    });
    assert.equal(initialized.error, undefined);
    assert.equal(initialized.result.serverInfo.name, "log-note-agent-bridge");
    assert.ok(initialized.result.capabilities.resources);
    assert.ok(initialized.result.capabilities.tools);

    server.notify("notifications/initialized");
    const tools = await server.request("tools/list");
    assert.deepEqual(tools.result.tools.map((tool) => tool.name), [
      "list_plans",
      "list_records",
      "get_plan",
      "get_record",
      "propose_plan_change",
      "propose_record_change",
      "commit_change"
    ]);
    for (const tool of tools.result.tools) {
      assert.equal(tool.inputSchema.additionalProperties, false, `${tool.name} must reject unknown fields`);
    }

    const resources = await server.request("resources/list");
    assert.deepEqual(resources.result.resources.map((resource) => resource.uri), ["lognote://categories"]);

    const templates = await server.request("resources/templates/list");
    assert.deepEqual(templates.result.resourceTemplates.map((resource) => resource.uriTemplate), [
      "lognote://plans{?date}",
      "lognote://records{?from,to}"
    ]);
  } finally {
    await stopServer(server.child);
  }
});
