#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { spawn } from "node:child_process";

const execFileAsync = promisify(execFile);
const expectedHealth = '{"status":"ok","service":"log-note"}';

export function validateRuntimeDistDir(value, revision) {
  if (!/^[0-9a-f]{40}$/.test(revision)) {
    throw new Error("source revision must be a lowercase 40-character Git commit");
  }

  const prefix = revision.slice(0, 12);
  const pattern = new RegExp(`^\\.next-tencent-${prefix}-[0-9]+$`);
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error("release runtimeDistDir does not match the source revision");
  }
  return value;
}

export function collectNextStaticAssetPaths(html) {
  const assets = [];
  const seen = new Set();
  const pattern = /(?:src|href)=["'](\/_next\/static\/[^"'<>\s]+)["']/g;

  for (const match of html.matchAll(pattern)) {
    const assetPath = match[1].replaceAll("&amp;", "&");
    if (!seen.has(assetPath)) {
      seen.add(assetPath);
      assets.push(assetPath);
    }
  }
  return assets;
}

async function assertPathType(targetPath, expectedType) {
  const value = await stat(targetPath);
  if (expectedType === "file" ? !value.isFile() : !value.isDirectory()) {
    throw new Error(`${targetPath} is not a ${expectedType}`);
  }
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (!port) {
    throw new Error("could not reserve a loopback port");
  }
  return port;
}

async function fetchWithTimeout(url, timeoutMs = 2_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timeout);
  }
}

function captureProcessOutput(child) {
  let output = "";
  const append = (chunk) => {
    output = `${output}${chunk}`.slice(-8_000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  return () => output.trim();
}

async function stopProcess(child, exitPromise) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    exitPromise,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await exitPromise;
  }
}

async function waitForServer(baseUrl, child, getOutput) {
  const deadline = Date.now() + 30_000;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`standalone server exited before readiness\n${getOutput()}`);
    }
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/healthz`);
      const body = await response.text();
      if (response.status === 200 && body === expectedHealth) return;
      lastError = new Error(`health check returned ${response.status}: ${body}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`standalone server did not become ready: ${lastError?.message || "timeout"}\n${getOutput()}`);
}

async function verifyHomepageAssets(baseUrl) {
  const homepageResponse = await fetchWithTimeout(`${baseUrl}/`);
  if (homepageResponse.status !== 200) {
    throw new Error(`homepage returned HTTP ${homepageResponse.status}`);
  }

  const homepage = await homepageResponse.text();
  const assets = collectNextStaticAssetPaths(homepage);
  if (!assets.some((asset) => new URL(asset, baseUrl).pathname.endsWith(".js"))) {
    throw new Error("homepage references no Next.js JavaScript asset");
  }
  if (!assets.some((asset) => new URL(asset, baseUrl).pathname.endsWith(".css"))) {
    throw new Error("homepage references no Next.js stylesheet asset");
  }

  for (const asset of assets) {
    const response = await fetchWithTimeout(new URL(asset, baseUrl));
    const body = await response.arrayBuffer();
    if (response.status !== 200 || body.byteLength === 0) {
      throw new Error(`${asset} returned HTTP ${response.status} with ${body.byteLength} bytes`);
    }
  }

  return assets.length;
}

export async function verifyTencentRelease(artifactPath, revision) {
  if (!/^[0-9a-f]{40}$/.test(revision)) {
    throw new Error("source revision must be a lowercase 40-character Git commit");
  }

  const absoluteArtifact = path.resolve(artifactPath);
  await assertPathType(absoluteArtifact, "file");
  const extractedRoot = await mkdtemp(path.join(os.tmpdir(), "log-note-release-verify-"));
  let child;
  let exitPromise;

  try {
    await execFileAsync("tar", [
      "--extract",
      "--gzip",
      "--file",
      absoluteArtifact,
      "--directory",
      extractedRoot,
    ]);

    const metadata = JSON.parse(await readFile(path.join(extractedRoot, "release.json"), "utf8"));
    if (metadata.sourceRevision !== revision) {
      throw new Error("release metadata revision mismatch");
    }
    const runtimeDistDir = validateRuntimeDistDir(metadata.runtimeDistDir, revision);
    await Promise.all([
      assertPathType(path.join(extractedRoot, "server.js"), "file"),
      assertPathType(path.join(extractedRoot, "public"), "directory"),
      assertPathType(path.join(extractedRoot, runtimeDistDir, "static"), "directory"),
    ]);

    const port = await reservePort();
    child = spawn(process.execPath, ["server.js"], {
      cwd: extractedRoot,
      env: {
        ...process.env,
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const getOutput = captureProcessOutput(child);
    exitPromise = new Promise((resolve) => child.once("exit", resolve));
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl, child, getOutput);
    const assetCount = await verifyHomepageAssets(baseUrl);
    process.stdout.write(`verified release ${revision}: homepage and ${assetCount} static assets are healthy\n`);
  } finally {
    if (child && exitPromise) await stopProcess(child, exitPromise);
    await rm(extractedRoot, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  verifyTencentRelease(process.argv[2] || "", process.argv[3] || "").catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
