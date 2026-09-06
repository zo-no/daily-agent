#!/usr/bin/env node

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createLogNoteMcpServer } from "../src/infrastructure/mcp/server.mjs";

try {
  const handle = serveStdio(() => createLogNoteMcpServer(), { legacy: "serve", onerror: (error) => process.stderr.write(`[log-note-mcp] ${error.message}\n`) });
  process.once("SIGINT", () => { void handle.close(); });
  process.once("SIGTERM", () => { void handle.close(); });
} catch (error) {
  process.stderr.write(`[log-note-mcp] ${error?.message || "startup failed"}\n`);
  process.exitCode = 1;
}
