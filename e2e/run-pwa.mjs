import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { spawnServerProcess, stopServerProcess } from "./process-lifecycle.mjs";

const port = Number(process.env.E2E_PWA_PORT || 3142);
const baseURL = `http://127.0.0.1:${port}`;
const outputDir = join(process.cwd(), "output/playwright/pwa");
const imageFixture = join(process.cwd(), "public/icon-192.png");
const cachedChromium = join(homedir(), "Library/Caches/ms-playwright/chromium_headless_shell-1169/chrome-mac/headless_shell");
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || (existsSync(cachedChromium) ? cachedChromium : undefined);
const device = {
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2
};

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve(output) : reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${output}`)));
  });
}

async function waitForServer(server) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next production server exited early with code ${server.exitCode}`);
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${baseURL}`);
}

async function assertVisible(locator, message) {
  await locator.waitFor({ state: "visible", timeout: 10_000 });
  assert.equal(await locator.isVisible(), true, message);
}

async function workerDetails(page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const active = registration.active;
    const channel = new MessageChannel();
    const version = await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Timed out reading service worker version")), 5_000);
      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        resolve(event.data);
      };
      active.postMessage({ type: "log-note:version" }, [channel.port2]);
    });
    return { scriptURL: active.scriptURL, controller: navigator.serviceWorker.controller?.scriptURL || null, version, cacheNames: await caches.keys() };
  });
}

async function activateVersion(page, version, previousVersion = null) {
  return page.evaluate(async ({ version: targetVersion, previousVersion: previous }) => {
    const registration = await navigator.serviceWorker.register(`/sw.js?v=${targetVersion}`, { scope: "/", updateViaCache: "none" });
    await registration.update();
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const active = registration.active;
      if (active?.scriptURL.includes(`v=${targetVersion}`)) {
        const cacheNames = await caches.keys();
        if (cacheNames.includes(`log-note-${targetVersion}`) && (!previous || !cacheNames.includes(`log-note-${previous}`))) {
          const channel = new MessageChannel();
          const details = await new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("Timed out reading updated worker version")), 3_000);
            channel.port1.onmessage = (event) => {
              window.clearTimeout(timeout);
              resolve(event.data);
            };
            active.postMessage({ type: "log-note:version" }, [channel.port2]);
          });
          return { details, cacheNames, scriptURL: active.scriptURL };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out activating controlled service worker ${targetVersion}`);
  }, { version, previousVersion });
}

console.log(`Building production app for PWA validation at ${baseURL}`);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
let serverLog = "";
let evidence = {};
let failure = null;
let browser;
let server;

try {
  serverLog += await run("npx", ["next", "build"]);
  server = spawnServerProcess("npx", ["next", "start", "-p", String(port)], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }
  });
  server.stdout.on("data", (chunk) => { serverLog += chunk; });
  server.stderr.on("data", (chunk) => { serverLog += chunk; });
  await waitForServer(server);

  browser = await chromium.launch({ executablePath, timeout: 30_000, headless: true });
  const context = await browser.newContext(device);
  const page = await context.newPage();
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  try {
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await assertVisible(page.getByRole("button", { name: "Add record" }), "Home should render online");
    await page.waitForFunction(async () => {
      await navigator.serviceWorker.ready;
      return Boolean(navigator.serviceWorker.controller);
    }, null, { timeout: 10_000 });
    await page.goto(`${baseURL}/templates`, { waitUntil: "networkidle" });
    await assertVisible(page.getByRole("heading", { name: "Record setup" }), "Templates should render online");
    await page.goto(`${baseURL}/settings`, { waitUntil: "networkidle" });
    await assertVisible(page.getByRole("heading", { name: "Settings" }), "Settings should render online");
    await page.goto(baseURL, { waitUntil: "networkidle" });

    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      const body = await fetch(link.href).then((response) => response.json());
      const icons = await Promise.all(body.icons.map(async (icon) => {
        const response = await fetch(icon.src);
        const blob = await response.blob();
        return { ...icon, status: response.status, mime: blob.type, bytes: blob.size };
      }));
      return { href: link.href, display: body.display, startUrl: body.start_url, icons };
    });
    const initialWorker = await workerDetails(page);
    assert.match(initialWorker.scriptURL, /\/sw\.js\?v=v4$/);
    assert.equal(initialWorker.version.version, "v4");
    assert.equal(initialWorker.cacheNames.includes("log-note-v4"), true);
    for (const size of ["192x192", "512x512"]) {
      const icon = manifest.icons.find((item) => item.sizes === size && item.type === "image/png");
      assert.ok(icon, `Manifest must include a ${size} PNG icon`);
      assert.equal(icon.purpose.includes("maskable"), true);
      assert.equal(icon.status, 200);
      assert.equal(icon.mime, "image/png");
      assert.ok(icon.bytes > 500, `${size} PNG should have image content`);
    }
    evidence.installability = { manifest, initialWorker };

    const apiCacheEvidence = await page.evaluate(async () => {
      const response = await fetch("/api/reports/download");
      const body = await response.json();
      const cacheNames = await caches.keys();
      const matches = [];
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        if (await cache.match("/api/reports/download")) matches.push(cacheName);
      }
      return { status: response.status, code: body.error?.code, matches };
    });
    assert.equal(apiCacheEvidence.status, 405);
    assert.equal(apiCacheEvidence.code, "REPORT_METHOD_NOT_ALLOWED");
    assert.deepEqual(apiCacheEvidence.matches, [], "Service worker must not cache report API responses");
    evidence.reportApiCache = apiCacheEvidence;

    const cdp = await context.newCDPSession(page);
    evidence.installability.chromeErrors = await cdp.send("Page.getInstallabilityErrors").catch((error) => ({ unavailable: error.message }));
    if (Array.isArray(evidence.installability.chromeErrors.installabilityErrors)) {
      assert.equal(evidence.installability.chromeErrors.installabilityErrors.length, 0, "Chrome should report no manifest/service worker installability errors");
    }

    await context.setOffline(true);
    await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("button", { name: "Add record" }), "Home should open offline from the application shell");
    await page.goto(`${baseURL}/templates`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("heading", { name: "Record setup" }), "Templates should open offline from the application shell");
    await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("heading", { name: "Settings" }), "Settings should open offline from the application shell");
    await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await page.getByRole("button", { name: "Add record" }).click();
    await page.locator(".writing-area textarea").fill("PWA offline persistence record");
    await page.getByRole("button", { name: "More" }).click();
    await page.locator('input[type="file"][accept*="image/jpeg"]').setInputFiles(imageFixture);
    await assertVisible(page.locator(".toast", { hasText: "Image kept locally" }), "Offline image should save to IndexedDB");
    await page.getByRole("button", { name: "Done" }).click();
    await assertVisible(page.locator(".toast", { hasText: "Saved" }), "Offline record should save locally");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 10_000 });
    const offlineEntry = page.locator(".timeline .entry", { hasText: "PWA offline persistence record" });
    await assertVisible(offlineEntry, "Offline record should remain after refresh");
    await assertVisible(offlineEntry.locator("img"), "Offline IndexedDB image should remain after refresh");
    assert.match(await offlineEntry.locator("img").getAttribute("src"), /^blob:/);
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(outputDir, "ln-042-offline-image.png"), fullPage: true });
    evidence.offline = { routes: ["/", "/templates", "/settings"], persistedEntry: "PWA offline persistence record", localImage: true };

    await context.setOffline(false);
    const previous = await activateVersion(page, "e2e-previous");
    const updated = await activateVersion(page, "e2e-current", "e2e-previous");
    assert.equal(previous.details.version, "e2e-previous");
    assert.equal(updated.details.version, "e2e-current");
    assert.equal(updated.cacheNames.includes("log-note-e2e-previous"), false, "Activation must clear the previous cache");
    const restored = await activateVersion(page, "v4", "e2e-current");
    assert.equal(restored.details.version, "v4");
    evidence.update = { previous, updated, restored };

    await page.screenshot({ path: join(outputDir, "pwa-verified.png"), fullPage: true });
    await context.tracing.stop({ path: join(outputDir, "pwa-verified.zip") });
  } catch (error) {
    failure = error;
    await page.screenshot({ path: join(outputDir, "pwa-failure.png"), fullPage: true }).catch(() => {});
    await context.tracing.stop({ path: join(outputDir, "pwa-failure.zip") }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
} catch (error) {
  failure = error;
  console.error(`✗ PWA validation: ${error.message}`);
} finally {
  await browser?.close();
  await stopServerProcess(server);
  await writeFile(join(outputDir, "results.json"), JSON.stringify({ baseURL, executablePath: executablePath || "Playwright default", evidence, failure: failure?.message || null, serverLog }, null, 2));
}

if (failure) process.exitCode = 1;
else console.log("✓ PWA: installability, offline shell, persistence, and controlled update verified.");
