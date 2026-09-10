/**
 * @fileoverview 可靠启动和回收 E2E 使用的 Next.js 子进程树。
 */

import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const usesProcessGroups = process.platform !== "win32";
const tsConfigPath = join(process.cwd(), "tsconfig.json");

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

/**
 * 保存 tsconfig.json 原文，供 E2E 结束恢复。
 * Next.js 在自定义 NEXT_DIST_DIR 下会向 tsconfig.json 的 include 追加
 * `<distDir>/types/**` 条目，污染工作区；测试后恢复原文即可避免。
 */
export async function snapshotTsConfig() {
  try {
    return await readFile(tsConfigPath, "utf8");
  } catch {
    return null;
  }
}

/** 恢复 snapshotTsConfig 保存的 tsconfig.json 原文。 */
export async function restoreTsConfig(snapshot) {
  if (snapshot == null) return;
  await writeFile(tsConfigPath, snapshot, "utf8");
}
