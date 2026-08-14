import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import test from "node:test";
import { spawnServerProcess, stopServerProcess } from "../e2e/process-lifecycle.mjs";

function processIsActive(pid) {
  if (process.platform === "linux") {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
      const state = stat.slice(stat.lastIndexOf(")") + 2, stat.lastIndexOf(")") + 3);
      return state !== "Z";
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

async function readWithTimeout(stream, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      once(stream, "data"),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Timed out reading descendant pid")), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

test("server cleanup terminates descendants that inherit its output pipes", {
  skip: process.platform === "win32"
}, async () => {
  const childScript = [
    'const { spawn } = require("node:child_process");',
    'const descendant = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: ["ignore", "inherit", "inherit"] });',
    'console.log(descendant.pid);',
    'setInterval(() => {}, 1000);'
  ].join("\n");
  const server = spawnServerProcess(process.execPath, ["-e", childScript], {
    stdio: ["ignore", "pipe", "pipe"]
  });

  const [chunk] = await readWithTimeout(server.stdout, 2_000);
  const descendantPid = Number(String(chunk).trim());
  assert.ok(Number.isInteger(descendantPid) && descendantPid > 0);

  await stopServerProcess(server, { graceMs: 1_000 });

  assert.equal(server.exitCode !== null || server.signalCode !== null, true);
  assert.equal(server.stdout.destroyed, true);
  assert.equal(processIsActive(descendantPid), false);
});
