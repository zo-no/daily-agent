import { spawn } from "node:child_process";

const usesProcessGroups = process.platform !== "win32";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function processGroupIsRunning(pid) {
  if (!usesProcessGroups || !pid) return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function signalProcessTree(child, signal) {
  if (!child?.pid) return false;
  if (usesProcessGroups) {
    try {
      process.kill(-child.pid, signal);
      return true;
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
      return false;
    }
  }
  if (child.exitCode === null && child.signalCode === null) return child.kill(signal);
  return false;
}

async function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.removeListener("exit", handleExit);
      resolve(false);
    }, timeoutMs);
    function handleExit() {
      clearTimeout(timeout);
      resolve(true);
    }
    child.once("exit", handleExit);
  });
}

export function spawnServerProcess(command, args, options = {}) {
  return spawn(command, args, { ...options, detached: usesProcessGroups });
}

export async function stopServerProcess(child, { graceMs = 5_000 } = {}) {
  if (!child) return;

  signalProcessTree(child, "SIGTERM");
  const childExited = await waitForChildExit(child, graceMs);
  if (!childExited || processGroupIsRunning(child.pid)) {
    signalProcessTree(child, "SIGKILL");
    await waitForChildExit(child, 1_000);
  }

  child.stdout?.destroy();
  child.stderr?.destroy();
}
