/**
 * @fileoverview Verifies production PWA installation, cache isolation, offline routes, and upgrades.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { spawnServerProcess, stopServerProcess } from "./process-lifecycle.mjs";

const port = Number(process.env.E2E_PWA_PORT || (30_000 + (process.pid % 20_000)));
const baseURL = `http://127.0.0.1:${port}`;
const outputRoot = process.env.E2E_OUTPUT_DIR ? resolve(process.env.E2E_OUTPUT_DIR) : join(process.cwd(), "output/playwright");
const outputDir = join(outputRoot, "pwa");
const ownsNextDistDir = !process.env.NEXT_DIST_DIR;
const nextDistDir = process.env.NEXT_DIST_DIR || `.next-e2e-pwa-${process.pid}`;
const imageFixture = join(process.cwd(), "public/icon-192.png");
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
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

async function assertHidden(locator, message) {
  await locator.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {
    assert.fail(message || "Expected element to become hidden");
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NEXT_DIST_DIR: nextDistDir, NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_LOG_NOTE_E2E_AUTH: "1" }
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
      if (response.ok && /\bReady in\b/.test(serverLog)) {
        await delay(50);
        if (server.exitCode !== null) throw new Error(`Next production server exited early with code ${server.exitCode}`);
        return;
      }
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${baseURL}`);
}

async function assertVisible(locator, message) {
  await locator.waitFor({ state: "visible", timeout: 20_000 });
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

/** Activates one worker version and proves the previous cache was removed. */
async function activateVersion(page, version, previousVersion = null) {
  return page.evaluate(async ({ version: targetVersion, previousVersion: previous }) => {
    const registration = await navigator.serviceWorker.register(`/sw.js?v=${targetVersion}`, { scope: "/", updateViaCache: "none" });
    await registration.update();
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const active = registration.active;
      if (active?.scriptURL.includes(`v=${targetVersion}`)) {
        const cacheNames = await caches.keys();
        const logNoteCaches = cacheNames.filter((name) => name.startsWith("log-note-"));
        if (logNoteCaches.length === 1 && logNoteCaches[0] === `log-note-${targetVersion}` && (!previous || !cacheNames.includes(`log-note-${previous}`))) {
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
if (ownsNextDistDir) await rm(nextDistDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
let serverLog = "";
let evidence = {};
let failure = null;
let browser;
let server;

try {
  const transparentDiaryAssets = await Promise.all([
    "rail-calendar.png",
    "rail-brush-handdrawn.png",
    "rail-node-idle-fine.png",
    "rail-node-active-fine.png",
    "record-rule-handdrawn.png",
    "record-time-dash-handdrawn.png",
    "record-focus-loop.png",
    "agent-spine-spirit.png",
    "agent-spine-spirit-scanning.png",
    "agent-spine-spirit-reviewing.png",
    "agent-spine-spirit-complete.png",
    "agent-spine-spirit-idle-still.png",
    "agent-spine-spirit-idle-motion.png",
    "agent-spine-spirit-scanning-still.png",
    "agent-spine-spirit-scanning-motion.png",
    "agent-spine-spirit-reviewing-still.png",
    "agent-spine-spirit-reviewing-motion.png",
    "agent-spine-spirit-complete-still.png",
    "agent-spine-spirit-complete-motion.png"
  ].map(async (name) => ({
    name,
    data: await readFile(join(process.cwd(), `public/ui/diary/${name}`))
  })));
  for (const asset of transparentDiaryAssets) {
    assert.equal(asset.data[25], 6, `The hand-drawn ${asset.name} PNG should keep a real RGBA transparency channel`);
  }
  const paperTexture = await readFile(join(process.cwd(), "public/ui/diary/paper-texture.svg"), "utf8");
  assert.match(paperTexture, /<feTurbulence\b/, "The book-page background should use a real local fiber texture");
  assert.doesNotMatch(paperTexture, /<text\b|<image\b/, "The book-page background must not contain text or external imagery");
  const buildOutput = await run("npx", ["next", "build"]);
  serverLog += buildOutput;
  console.log(buildOutput.trim());
  server = spawnServerProcess("npx", ["next", "start", "-p", String(port)], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_DIST_DIR: nextDistDir, NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_LOG_NOTE_E2E_AUTH: "1" }
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

    await context.setOffline(true);
    await page.goto(`${baseURL}/settings#record-setup`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.locator("#record-setup .template-manager-embedded"), "A home-only installation should open canonical Record setup offline without first warming Settings");
    await page.goto(`${baseURL}/templates?focus=periodic`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByText("Fixed records", { exact: true }), "A home-only installation should preserve the legacy periodic route offline");
    await page.goto(`${baseURL}/organize`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("heading", { name: "Smart organize" }), "A home-only installation should open Smart organize offline");
    await page.goto(`${baseURL}/insights`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("heading", { name: "Domain insights" }), "A home-only installation should open Domain insights offline");
    evidence.coldInstallOffline = { canonicalRecordSetup: true, legacyPeriodic: true, organize: true, insights: true };
    await context.setOffline(false);
    await page.goto(baseURL, { waitUntil: "networkidle" });

    await page.goto(`${baseURL}/settings#record-setup`, { waitUntil: "networkidle" });
    await assertVisible(page.locator("#record-setup .template-manager-embedded"), "Canonical Record setup should render online inside Settings");
    await page.goto(`${baseURL}/templates`, { waitUntil: "networkidle" });
    await page.waitForURL(`${baseURL}/settings#record-setup`);
    await assertVisible(page.locator("#record-setup .template-manager-embedded"), "The legacy templates route should redirect to Settings online");
    await page.goto(`${baseURL}/templates?focus=periodic`, { waitUntil: "networkidle" });
    await page.waitForURL(`${baseURL}/settings?focus=periodic#record-setup`);
    await assertVisible(page.getByText("Fixed records", { exact: true }), "The legacy periodic route should redirect to the focused Settings editor online");
    await page.goto(`${baseURL}/settings`, { waitUntil: "networkidle" });
    await assertVisible(page.getByRole("heading", { name: "Settings" }), "Settings should render online");
    await page.goto(`${baseURL}/organize`, { waitUntil: "networkidle" });
    await assertVisible(page.getByRole("heading", { name: "Smart organize" }), "Smart organize should render online without a model or account");
    await page.goto(`${baseURL}/insights`, { waitUntil: "networkidle" });
    await assertVisible(page.getByRole("heading", { name: "Domain insights" }), "Domain insights should render online without a remote model");
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
    assert.match(initialWorker.scriptURL, /\/sw\.js\?v=v14$/);
    assert.equal(initialWorker.version.version, "v14");
    assert.equal(initialWorker.cacheNames.includes("log-note-v14"), true);
    for (const size of ["192x192", "512x512"]) {
      const icon = manifest.icons.find((item) => item.sizes === size && item.type === "image/png");
      assert.ok(icon, `Manifest must include a ${size} PNG icon`);
      assert.equal(icon.purpose.includes("maskable"), true);
      assert.equal(icon.status, 200);
      assert.equal(icon.mime, "image/png");
      assert.ok(icon.bytes > 500, `${size} PNG should have image content`);
    }
    evidence.installability = { manifest, initialWorker };

    const diaryAssetEvidence = await page.evaluate(async (urls) => Promise.all(urls.map(async (url) => {
      const response = await fetch(url);
      const blob = await response.blob();
      const cacheNames = [];
      for (const cacheName of await caches.keys()) {
        if (await (await caches.open(cacheName)).match(url)) cacheNames.push(cacheName);
      }
      return { url, status: response.status, type: blob.type, bytes: blob.size, cacheNames };
    })), [
      "/ui/diary/rail-brush-handdrawn.png",
      "/ui/diary/rail-node-idle-fine.png",
      "/ui/diary/rail-node-active-fine.png",
      "/ui/diary/record-rule-handdrawn.png",
      "/ui/diary/record-time-dash-handdrawn.png",
      "/ui/diary/record-focus-loop.png",
      "/ui/diary/rail-search.png",
      "/ui/diary/rail-calendar.png",
      "/ui/diary/paper-texture.svg",
      "/ui/diary/rail-settings.png",
      "/ui/diary/rail-insights.png",
      "/ui/diary/record-stamp.png",
      "/ui/diary/export-stamp.png",
      "/ui/diary/plan-add-stamp.png",
      "/ui/diary/agent-spine-spirit.png",
      "/ui/diary/agent-spine-spirit-scanning.png",
      "/ui/diary/agent-spine-spirit-reviewing.png",
      "/ui/diary/agent-spine-spirit-complete.png",
      "/ui/diary/agent-spine-spirit-idle-still.png",
      "/ui/diary/agent-spine-spirit-idle-motion.png",
      "/ui/diary/agent-spine-spirit-scanning-still.png",
      "/ui/diary/agent-spine-spirit-scanning-motion.png",
      "/ui/diary/agent-spine-spirit-reviewing-still.png",
      "/ui/diary/agent-spine-spirit-reviewing-motion.png",
      "/ui/diary/agent-spine-spirit-complete-still.png",
      "/ui/diary/agent-spine-spirit-complete-motion.png",
      "/ui/diary/organize-helper.png",
      "/ui/diary/organize-path.png"
    ]);
    assert.ok(diaryAssetEvidence.every((item) => item.status === 200 && item.bytes > 100), `Generated diary assets should be real cached responses: ${JSON.stringify(diaryAssetEvidence)}`);
    assert.equal(diaryAssetEvidence.find((item) => item.url.endsWith("paper-texture.svg"))?.type, "image/svg+xml", `Paper texture should be served as an SVG image: ${JSON.stringify(diaryAssetEvidence)}`);
    assert.ok(diaryAssetEvidence.filter((item) => !item.url.endsWith("paper-texture.svg")).every((item) => item.type === "image/png"), `Hand-drawn raster controls should remain PNGs: ${JSON.stringify(diaryAssetEvidence)}`);
    assert.ok(diaryAssetEvidence.every((item) => item.cacheNames.includes("log-note-v14")), `Generated diary assets should be pre-cached for offline UI: ${JSON.stringify(diaryAssetEvidence)}`);
    evidence.diaryAssets = diaryAssetEvidence;

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

    const nextCacheEvidence = await page.evaluate(async () => {
      const scriptUrl = document.querySelector('script[src*="/_next/"]')?.src;
      if (!scriptUrl) throw new Error("Could not find a Next.js script for runtime cache verification");
      const scriptResponse = await fetch(scriptUrl);
      await scriptResponse.arrayBuffer();
      const rscUrl = new URL("/?_rsc=e2e-cache-check", location.origin).href;
      const rscResponse = await fetch(rscUrl, { headers: { RSC: "1", Accept: "text/x-component" } });
      await rscResponse.arrayBuffer();
      const scriptMatches = [];
      const rscMatches = [];
      const deadline = Date.now() + 3_000;
      while (!scriptMatches.length && Date.now() < deadline) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          if (await cache.match(scriptUrl)) scriptMatches.push(cacheName);
        }
        if (!scriptMatches.length) await new Promise((resolve) => setTimeout(resolve, 50));
      }
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        if (await cache.match(rscUrl)) rscMatches.push(cacheName);
      }
      return { scriptUrl, scriptMatches, rscMatches };
    });
    assert.ok(nextCacheEvidence.scriptMatches.includes("log-note-v14"), "Successful Next.js scripts should enter the runtime cache");
    assert.deepEqual(nextCacheEvidence.rscMatches, [], "RSC payloads must not enter the application cache");
    evidence.nextCacheBoundary = nextCacheEvidence;

    const authCallbackCacheEvidence = await page.evaluate(async () => {
      const callbackUrl = new URL("/auth/callback?code=e2e-cache-probe", location.origin).href;
      await fetch(callbackUrl);
      const matches = [];
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        if (await cache.match(callbackUrl)) matches.push(cacheName);
      }
      return { callbackUrl, matches };
    });
    assert.deepEqual(authCallbackCacheEvidence.matches, [], "OAuth callback URLs and authorization codes must never enter CacheStorage");
    evidence.authCallbackCache = authCallbackCacheEvidence;

    const installPromptCaptured = await page.evaluate(() => {
      const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
      Object.defineProperties(promptEvent, {
        prompt: { value: async () => undefined },
        userChoice: { value: Promise.resolve({ outcome: "dismissed", platform: "web" }) }
      });
      window.dispatchEvent(promptEvent);
      return promptEvent.defaultPrevented;
    });
    assert.equal(installPromptCaptured, true, "The root layout should retain the install prompt before settings opens");
    await page.locator(".home-settings-button").click();
    const settingsDialog = page.locator(".settings-page-workspace");
    await assertVisible(settingsDialog, "Home should open Settings as an in-page tool");
    assert.equal(new URL(page.url()).pathname, "/", "Opening Settings from home should preserve the diary route");
    await settingsDialog.locator(".settings-mobile-menu a").filter({ hasText: "General" }).first().click();
    const installButton = page.getByRole("button", { name: "Install Log Note", exact: true });
    await assertVisible(installButton, "Settings should receive the install prompt captured on home");
    await installButton.click();
    await assertHidden(installButton, "The one-shot install prompt should clear after use");
    await page.goto(baseURL, { waitUntil: "networkidle" });

    const cdp = await context.newCDPSession(page);
    evidence.installability.chromeErrors = await cdp.send("Page.getInstallabilityErrors").catch((error) => ({ unavailable: error.message }));
    if (Array.isArray(evidence.installability.chromeErrors.installabilityErrors)) {
      assert.equal(evidence.installability.chromeErrors.installabilityErrors.length, 0, "Chrome should report no manifest/service worker installability errors");
    }

    await context.setOffline(true);
    await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("button", { name: "Add record" }), "Home should open offline from the application shell");
    await page.getByRole("button", { name: "Open calendar" }).click();
    await assertVisible(page.getByRole("region", { name: "Calendar view" }), "Calendar should browse local records while fully offline");
    const offlineViewToggle = page.locator('[data-edge-rail-item="record-view"]');
    await assertVisible(offlineViewToggle, "The single record-view rail toggle should remain available offline");
    await offlineViewToggle.click();
    assert.equal(await offlineViewToggle.getAttribute("data-view-mode"), "grouped", "Record view should switch locally while offline");
    await page.goto(`${baseURL}/settings#record-setup`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.locator("#record-setup .template-manager-embedded"), "Canonical Record setup should open offline from the cached Settings shell");
    await page.goto(`${baseURL}/settings?focus=periodic#record-setup`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByText("Fixed records", { exact: true }), "Focused Record setup should open offline from the cached Settings shell");
    await page.goto(`${baseURL}/templates`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.locator("#record-setup .template-manager-embedded"), "The cached legacy templates entry should remain compatible offline");
    await page.goto(`${baseURL}/templates?focus=periodic`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByText("Fixed records", { exact: true }), "The cached legacy periodic entry should remain compatible offline");
    await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("heading", { name: "Settings" }), "Settings should open offline from the application shell");
    await page.getByRole("link", { name: "Account", exact: true }).click();
    await assertVisible(page.getByRole("heading", { name: "Sign in and sync", exact: true }), "Authenticated account status should remain readable offline");
    const offlineDataBeforeAccount = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
    await assertVisible(page.getByText("E2E Writer", { exact: true }), "A previously authenticated account should keep using its device cache offline");
    await assertVisible(page.getByText("Test session", { exact: true }));
    await page.reload({ waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByText("E2E Writer", { exact: true }), "The authenticated device cache should remain available after an offline refresh");
    assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), offlineDataBeforeAccount, "Offline account settings must not alter Log Note data");
    await page.goto(`${baseURL}/settings/`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("heading", { name: "Settings" }), "Trailing-slash routes should use their matching offline shell");
    await page.goto(`${baseURL}/organize`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("heading", { name: "Smart organize" }), "Smart organize should open offline from the application shell");
    await page.goto(`${baseURL}/insights?domain=trading-domain`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await assertVisible(page.getByRole("heading", { name: "Domain insights" }), "Domain insights should open directly offline from the application shell");
    await assertVisible(page.locator('[data-insights-domain-id="trading-domain"]'), "Offline Domain insights should retain local account domain context");
    const uncachedScriptUrl = new URL(`/_next/static/chunks/e2e-uncached-${Date.now()}.js`, baseURL);
    let uncachedScriptContentType = null;
    const captureUncachedScript = (response) => {
      if (response.url() === uncachedScriptUrl.href) uncachedScriptContentType = response.headers()["content-type"] || "";
    };
    page.on("response", captureUncachedScript);
    const uncachedScriptResult = await page.evaluate((scriptUrl) => new Promise((resolve) => {
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => resolve("timeout"), 5_000);
      script.src = scriptUrl;
      script.onload = () => { window.clearTimeout(timeout); resolve("loaded"); };
      script.onerror = () => { window.clearTimeout(timeout); resolve("failed"); };
      document.head.append(script);
    }), uncachedScriptUrl.href);
    await page.waitForTimeout(100);
    page.off("response", captureUncachedScript);
    assert.equal(uncachedScriptResult, "failed", "An uncached script should fail while offline");
    assert.doesNotMatch(uncachedScriptContentType || "", /text\/html/i, "An uncached static-resource failure must not receive the home HTML shell");
    const offlineNextBoundary = await page.evaluate(async ({ scriptUrl }) => {
      const response = await fetch(scriptUrl);
      const body = await response.text();
      let rscFailed = false;
      try {
        await fetch("/?_rsc=e2e-offline", { headers: { RSC: "1", Accept: "text/x-component" } });
      } catch {
        rscFailed = true;
      }
      return { contentType: response.headers.get("content-type"), beginsWithHtml: /^\s*<!doctype html/i.test(body), rscFailed };
    }, nextCacheEvidence);
    assert.match(offlineNextBoundary.contentType || "", /javascript|ecmascript/, "Cached scripts should retain a script content type offline");
    assert.equal(offlineNextBoundary.beginsWithHtml, false, "Cached scripts must retain their original body offline");
    assert.equal(offlineNextBoundary.rscFailed, true, "Offline RSC requests should fail instead of receiving cached HTML");
    evidence.offlineNextBoundary = { ...offlineNextBoundary, uncachedScriptResult, uncachedScriptContentType };
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
    evidence.offline = { routes: ["/", "/settings#record-setup", "/settings?focus=periodic#record-setup", "/templates", "/templates?focus=periodic", "/settings", "/settings#account", "/settings/", "/organize", "/insights?domain=trading-domain"], calendarView: true, persistedEntry: "PWA offline persistence record", localImage: true };

    await context.setOffline(false);
    const previous = await activateVersion(page, "e2e-previous");
    const updated = await activateVersion(page, "e2e-current", "e2e-previous");
    assert.equal(previous.details.version, "e2e-previous");
    assert.equal(updated.details.version, "e2e-current");
    assert.equal(updated.cacheNames.includes("log-note-e2e-previous"), false, "Activation must clear the previous cache");
    const restored = await activateVersion(page, "v14", "e2e-current");
    assert.equal(restored.details.version, "v14");
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
  await writeFile(join(outputDir, "results.json"), JSON.stringify({ baseURL, executablePath: executablePath || "Playwright default", nextDistDir, evidence, failure: failure?.message || null, serverLog }, null, 2));
  if (ownsNextDistDir) await rm(nextDistDir, { recursive: true, force: true });
}

if (failure) process.exitCode = 1;
else console.log("✓ PWA: installability, authenticated offline cache, persistence, and controlled update verified.");
