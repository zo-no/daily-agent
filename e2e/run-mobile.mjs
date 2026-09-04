/**
 * @fileoverview Runs mobile-first browser regressions for Log Note's core local recording flows.
 */

import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { spawnServerProcess, stopServerProcess } from "./process-lifecycle.mjs";

const port = Number(process.env.E2E_PORT || (30_000 + (process.pid % 20_000)));
const baseURL = `http://127.0.0.1:${port}`;
const testDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());
const internalAuthOnly = process.argv.includes("--internal-auth");
const googleCalendarUnavailableOnly = process.argv.includes("--google-calendar-unavailable");
const outputDir = process.env.E2E_OUTPUT_DIR
  ? resolve(process.env.E2E_OUTPUT_DIR)
  : internalAuthOnly
    ? join(tmpdir(), "log-note-internal-auth-e2e")
    : googleCalendarUnavailableOnly
      ? join(tmpdir(), "log-note-google-calendar-unavailable-e2e")
    : join(process.cwd(), "output/playwright");
const ownsNextDistDir = !process.env.NEXT_DIST_DIR;
const nextDistDir = process.env.NEXT_DIST_DIR || `.next-e2e-mobile-${process.pid}`;
const legacyPeriodicBackup = JSON.parse(await readFile(fileURLToPath(new URL("../tests/fixtures/legacy-periodic-free-backup.json", import.meta.url)), "utf8"));
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
const authMode = internalAuthOnly
  ? "meituan-sso"
  : process.env.NEXT_PUBLIC_LOG_NOTE_AUTH_MODE || "standard";
const testFilter = internalAuthOnly
  ? "internal distribution"
  : googleCalendarUnavailableOnly
    ? "Google Calendar unavailable deployment"
    : process.env.E2E_TEST_FILTER || "";
const device = {
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2
};

const tests = [];
const ln032Evidence = {};
const ln058Evidence = { viewportWidths: [320, 390, 600, 671, 768, 1280] };
function test(name, run) { tests.push({ name, run }); }

function fileSlug(name) {
  return name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");
}

function shiftDate(date, offset) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + offset));
  return shifted.toISOString().slice(0, 10);
}

async function waitForServer(server) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next development server exited early with code ${server.exitCode}\n${serverLog}`);
    try {
      const response = await fetch(baseURL);
      if (response.ok && /\bReady in\b/.test(serverLog)) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (server.exitCode !== null) throw new Error(`Next development server exited early with code ${server.exitCode}\n${serverLog}`);
        return;
      }
    } catch {
      // The server is still compiling; retry shortly.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseURL}\n${serverLog}`);
}

async function assertVisible(locator, message) {
  await locator.waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await locator.isVisible(), true, message);
}

async function assertHidden(locator, message) {
  await locator.waitFor({ state: "hidden", timeout: 10_000 });
  assert.equal(await locator.isVisible().catch(() => false), false, message);
}

async function resetLocalData(page) {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("button", { name: "Add record" }));
}

async function addQuickRecord(page, content) {
  await page.getByRole("button", { name: "Add record" }).click();
  await page.locator(".writing-area textarea").fill(content);
  await page.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Saved" }));
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth, `${label} should not scroll horizontally: ${JSON.stringify(dimensions)}`);
}

async function assertMinTouchTarget(locator, label) {
  await locator.page().waitForTimeout(250);
  const box = await locator.boundingBox();
  assert.ok(box && box.width >= 43.99 && box.height >= 43.99, `${label} should be at least 44px: ${JSON.stringify(box)}`);
}

async function setRecordView(page, mode) {
  const toggle = page.locator('[data-edge-rail-item="record-view"]');
  await assertVisible(toggle, `Record-view toggle should be available before switching to ${mode}`);
  if (await toggle.getAttribute("data-view-mode") !== mode) await toggle.click();
  assert.equal(await toggle.getAttribute("data-view-mode"), mode, `Record view should switch to ${mode}`);
  return toggle;
}

async function setWorkspaceMode(page, mode) {
  const toggle = page.locator('[data-edge-rail-item="workspace"]');
  await assertVisible(toggle, `Workspace toggle should be available before switching to ${mode}`);
  if (await toggle.getAttribute("data-workspace-mode") !== mode) await toggle.click();
  assert.equal(await toggle.getAttribute("data-workspace-mode"), mode, `Workspace should switch to ${mode}`);
  return toggle;
}

async function captureDownload(page, action) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 15_000 }), action()]);
      return download;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await page.waitForTimeout(250);
    }
  }
  throw lastError;
}

async function downloadText(page, action) {
  const download = await captureDownload(page, action);
  const stream = await download.createReadStream();
  let content = "";
  for await (const chunk of stream) content += chunk;
  return content;
}

async function downloadBuffer(page, action) {
  const download = await captureDownload(page, action);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return { filename: download.suggestedFilename(), buffer: Buffer.concat(chunks) };
}

async function leaveSettings(page) {
  const backToSettings = page.getByRole("link", { name: "Back to settings" });
  if (await backToSettings.isVisible().catch(() => false)) await backToSettings.click();
  const embeddedSettings = page.locator(".settings-page-workspace");
  if (await embeddedSettings.isVisible().catch(() => false)) {
    await page.locator(".home-settings-button").click();
    return;
  }
  await page.getByRole("link", { name: "Back to records" }).click();
}

async function openHomeSettings(page) {
  await page.locator(".home-settings-button").click();
  const settings = page.locator(".settings-page-workspace");
  await assertVisible(settings);
  assert.equal(new URL(page.url()).pathname, "/", "Home Settings should not navigate away from the diary route");
  return settings;
}

async function openSettingsPanel(page, name) {
  const current = new URL(page.url());
  if (current.pathname === "/settings" && current.hash) {
    await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  }
  const embedded = page.locator(".settings-page-workspace");
  const root = await embedded.isVisible().catch(() => false) ? embedded : page;
  const mobile = await page.evaluate(() => window.innerWidth <= 760);
  if (mobile && await root.locator(".settings-page.settings-mobile-detail").count()) {
    const back = root.getByRole("link", { name: "Back to settings" });
    if (await back.isVisible().catch(() => false)) await back.click();
  }
  let panelLink = mobile
    ? root.locator(".settings-mobile-menu a").filter({ hasText: name }).first()
    : root.locator(".settings-nav a").filter({ hasText: name }).first();
  if (!(await panelLink.isVisible().catch(() => false))) {
    const back = root.getByRole("link", { name: "Back to settings" });
    if (await back.isVisible().catch(() => false)) await back.click();
    panelLink = mobile
      ? root.locator(".settings-mobile-menu a").filter({ hasText: name }).first()
      : root.locator(".settings-nav a").filter({ hasText: name }).first();
  }
  await panelLink.waitFor({ state: "visible" });
  await panelLink.click();
}

async function openRecordSetup(page, { periodic = false } = {}) {
  const target = `${baseURL}/settings${periodic ? "?focus=periodic" : ""}#record-setup`;
  await page.goto(target, { waitUntil: "domcontentloaded" });
  const panel = page.locator("#record-setup");
  await assertVisible(panel.locator(".template-manager-embedded"));
  return panel;
}

async function assertFixedInputControls(page, viewportLabel, expectedMobileSizing) {
  const metrics = await page.locator(".fixed-inline-control").evaluateAll((controls) => controls.map((control) => {
    const input = control.querySelector("input");
    const inputBox = input?.getBoundingClientRect();
    const controlBox = control.getBoundingClientRect();
    return {
      inputFontSize: Number.parseFloat(input ? getComputedStyle(input).fontSize : "0"),
      inputWidth: inputBox?.width || 0,
      inputHeight: inputBox?.height || 0,
      controlWidth: controlBox.width,
      buttonCount: control.querySelectorAll("button").length
    };
  }));
  assert.ok(metrics.length > 0, `${viewportLabel} should render fixed value controls`);
  for (const metric of metrics) {
    assert.equal(metric.buttonCount, 0, `${viewportLabel} fixed values should save without a redundant submit button: ${JSON.stringify(metric)}`);
    assert.ok(Math.abs(metric.inputWidth - metric.controlWidth) <= 1, `${viewportLabel} fixed input should use the full value column: ${JSON.stringify(metric)}`);
    assert.ok(metric.inputHeight >= 43.99, `${viewportLabel} fixed input should keep a 44px touch target: ${JSON.stringify(metric)}`);
    if (expectedMobileSizing) {
      assert.ok(metric.inputFontSize >= 16, `${viewportLabel} fixed input should use at least 16px text: ${JSON.stringify(metric)}`);
    }
  }
  await assertNoHorizontalOverflow(page, viewportLabel);
}

test("account gate: unauthenticated routes stay locked behind mobile sign-in", async (page) => {
  await page.evaluate(() => window.localStorage.setItem("log-note:e2e-auth-locked", "1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("heading", { name: "Sign in to Log Note" }));
  await assertVisible(page.getByRole("tab", { name: "Sign in" }));
  await assertVisible(page.getByRole("tab", { name: "Create account" }));
  await assertVisible(page.getByRole("button", { name: "Continue with Google" }));
  const gateLayout = await page.locator(".account-gate-card").evaluate((card) => {
    const box = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      width: box.width,
      top: box.top,
      borderTopWidth: style.borderTopWidth,
      borderRadius: style.borderRadius,
      shadow: style.boxShadow,
      pageHeight: document.documentElement.scrollHeight
    };
  });
  assert.ok(Math.abs(gateLayout.width - gateLayout.viewportWidth) <= 1, `Mobile account gate should use the full canvas: ${JSON.stringify(gateLayout)}`);
  assert.equal(gateLayout.borderTopWidth, "0px", `Mobile account gate should not retain a desktop card border: ${JSON.stringify(gateLayout)}`);
  assert.equal(gateLayout.borderRadius, "0px", `Mobile account gate should not retain a desktop card radius: ${JSON.stringify(gateLayout)}`);
  assert.equal(gateLayout.shadow, "none", `Mobile account gate should not retain a desktop card shadow: ${JSON.stringify(gateLayout)}`);
  assert.ok(gateLayout.pageHeight <= gateLayout.viewportHeight + 1, `Mobile account gate should fit the first viewport: ${JSON.stringify(gateLayout)}`);
  await page.getByRole("tab", { name: "Create account" }).click();
  await assertVisible(page.getByRole("heading", { name: "Create your Log Note account" }));
  await page.getByRole("tab", { name: "Sign in" }).click();
  assert.equal(await page.getByRole("button", { name: "Add record" }).count(), 0, "The recording workspace must not mount before authentication");
  await assertMinTouchTarget(page.getByRole("button", { name: "Sign in", exact: true }), "Account gate sign-in");
  await assertMinTouchTarget(page.getByRole("tab", { name: "Sign in" }), "Account gate sign-in tab");
  await assertMinTouchTarget(page.getByRole("tab", { name: "Create account" }), "Account gate registration tab");
  await assertMinTouchTarget(page.getByRole("button", { name: "Continue with Google" }), "Account gate Google action");
  for (const input of await page.locator(".account-password-form input").all()) await assertMinTouchTarget(input, "Account gate credential field");
  await assertNoHorizontalOverflow(page, "390px account gate");
  await page.goto(`${baseURL}/templates`, { waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("heading", { name: "Sign in to Log Note" }), "Management routes must use the same account gate");
  assert.equal(await page.getByRole("heading", { name: "Record setup" }).count(), 0);
});

test("public OAuth policy pages stay readable before sign-in", async (page) => {
  await page.evaluate(() => window.localStorage.setItem("log-note:e2e-auth-locked", "1"));
  const documents = [
    { path: "/about", heading: /Log Note.*Keep the day|Log Note.*把今天记下来/, marketing: true },
    { path: "/privacy", heading: /Privacy Policy|隐私权政策/ },
    { path: "/terms", heading: /Terms of Service|服务条款/ }
  ];

  for (const document of documents) {
    await page.goto(`${baseURL}${document.path}`, { waitUntil: "domcontentloaded" });
    const main = page.locator("main.public-policy-page");
    await assertVisible(main);
    assert.equal(await page.locator('[data-public-provider-boundary="true"]').count(), 1, `${document.path} must stay outside account-owned providers`);
    await assertVisible(main.getByRole("heading", { level: 1, name: document.heading }));
    assert.equal(await page.locator(".account-gate").count(), 0, `${document.path} must bypass the account gate`);
    if (document.marketing) {
      assert.equal(await main.locator("h1").count(), 1, "About must keep one page-level heading");
      assert.ok(await main.locator('[lang="en"]').count() > 0, "About must include English content");
      assert.ok(await main.locator('[lang="zh-CN"]').count() > 0, "About must include Chinese content");
      const preview = main.locator('[data-about-static-preview="true"]');
      await assertVisible(preview);
      assert.equal(await preview.locator("form, input, textarea, select, button").count(), 0, "About preview must remain a fixed illustration");
      assert.deepEqual(await main.locator("[data-about-section]").evaluateAll((sections) => sections.map((section) => section.dataset.aboutSection)), [
        "core-loop",
        "principles",
        "calendar",
        "final-cta"
      ]);
    } else {
      assert.equal(await main.locator('article[lang="en"]').count(), 1, `${document.path} must include English content`);
      assert.equal(await main.locator('article[lang="zh-CN"]').count(), 1, `${document.path} must include Chinese content`);
    }
    assert.equal(await main.getByText("x2742160682@gmail.com", { exact: true }).count() >= 1, true, `${document.path} must expose support contact`);
    assert.equal(await main.locator('nav a[href="/about"]').count(), 1);
    assert.equal(await main.locator('nav a[href="/privacy"]').count(), 1);
    assert.equal(await main.locator('nav a[href="/terms"]').count(), 1);

    for (const viewport of [
      { width: 320, height: 844 },
      { width: 390, height: 844 },
      { width: 1280, height: 900 }
    ]) {
      await page.setViewportSize(viewport);
      await assertNoHorizontalOverflow(page, `${viewport.width}px ${document.path}`);
      const navLinks = main.locator("nav a");
      for (const link of await navLinks.all()) await assertMinTouchTarget(link, `${viewport.width}px public policy navigation`);
      if (document.marketing) {
        const firstViewport = await main.evaluate((root) => {
          const hero = root.querySelector(".public-about-hero").getBoundingClientRect();
          const preview = root.querySelector('[data-about-static-preview="true"]').getBoundingClientRect();
          const primary = root.querySelector(".public-about-hero .public-about-primary").getBoundingClientRect();
          return {
            viewportHeight: window.innerHeight,
            heroTop: hero.top,
            heroHeight: hero.height,
            previewTop: preview.top,
            primaryBottom: primary.bottom
          };
        });
        assert.ok(firstViewport.heroTop <= 1 && firstViewport.heroHeight >= firstViewport.viewportHeight, `About hero must establish the first viewport at ${viewport.width}px: ${JSON.stringify(firstViewport)}`);
        assert.ok(firstViewport.primaryBottom <= firstViewport.viewportHeight, `About primary action must remain in the first viewport at ${viewport.width}px: ${JSON.stringify(firstViewport)}`);
        assert.ok(firstViewport.previewTop < firstViewport.viewportHeight, `About product proof must begin in the first viewport at ${viewport.width}px: ${JSON.stringify(firstViewport)}`);
        await assertMinTouchTarget(main.locator(".public-about-hero .public-about-primary"), `${viewport.width}px About primary action`);
        await assertMinTouchTarget(main.locator(".public-about-hero .public-about-secondary"), `${viewport.width}px About privacy action`);
        await page.screenshot({ path: join(outputDir, `ln-067-public-about-${viewport.width}-first-viewport.png`) });
        if (viewport.width === 1280) {
          await page.screenshot({ path: join(outputDir, "ln-067-public-about-1280.png"), fullPage: true });
        }
      }
      if (viewport.width === 390) {
        await page.screenshot({ path: join(outputDir, `ln-067-public-${document.path.slice(1)}-390.png`), fullPage: true });
      }
    }

    if (document.marketing) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const motion = await main.evaluate((root) => ({
        heroAnimation: getComputedStyle(root.querySelector(".public-about-hero-copy > *")).animationName,
        previewAnimation: getComputedStyle(root.querySelector(".public-about-product")).animationName,
        previewTransform: getComputedStyle(root.querySelector(".public-about-product-paper")).transform
      }));
      assert.deepEqual(motion, { heroAnimation: "none", previewAnimation: "none", previewTransform: "none" });
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
  }

  await page.goto(`${baseURL}/about`, { waitUntil: "domcontentloaded" });
  const firstPolicyLink = page.locator(".public-policy-nav a").first();
  await firstPolicyLink.focus();
  const focusStyle = await firstPolicyLink.evaluate((link) => {
    const style = getComputedStyle(link);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
  });
  assert.ok(focusStyle.outlineStyle !== "none" || focusStyle.outlineWidth !== "0px" || focusStyle.boxShadow !== "none", `Policy links need visible keyboard focus: ${JSON.stringify(focusStyle)}`);
  await page.getByRole("link", { name: /Open Log Note|打开 Log Note/ }).first().click();
  await page.waitForURL(baseURL + "/");
  await assertVisible(page.getByRole("heading", { name: "Sign in to Log Note" }));
  for (const path of ["/about", "/privacy", "/terms"]) {
    assert.equal(await page.locator(`.account-gate-legal a[href="${path}"]`).count(), 1, `Sign-in must link to ${path}`);
  }
  await page.evaluate(() => window.localStorage.removeItem("log-note:e2e-auth-locked"));
  await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  await openSettingsPanel(page, "Account");
  const calendarPrivacyLink = page.getByRole("link", { name: "How Google data is handled" });
  await assertVisible(calendarPrivacyLink);
  assert.equal(await calendarPrivacyLink.getAttribute("href"), "/privacy#en-google-calendar");
  await assertMinTouchTarget(calendarPrivacyLink, "Contextual Google privacy link");
  for (const path of ["/about", "/privacy", "/terms"]) {
    assert.equal(await page.locator(`.account-legal-links a[href="${path}"]`).count(), 1, `Account settings must link to ${path}`);
  }
});

if (authMode === "meituan-sso") {
  test("account gate: internal distribution exposes only Meituan SSO and hides Calendar settings", async (page) => {
    await page.evaluate(() => window.localStorage.setItem("log-note:e2e-auth-locked", "1"));
    await page.reload({ waitUntil: "domcontentloaded" });

    await assertVisible(page.getByRole("heading", { name: "Use your Meituan account" }));
    const meituanAction = page.getByRole("button", { name: "Continue with Meituan" });
    await assertVisible(meituanAction);
    await assertMinTouchTarget(meituanAction, "Internal Meituan SSO action");
    assert.equal(await page.locator(".account-password-form").count(), 0, "Internal mode must not render password entry");
    assert.equal(await page.getByRole("tab", { name: "Create account" }).count(), 0, "Internal mode must not render registration");
    assert.equal(await page.getByRole("button", { name: "Continue with Google" }).count(), 0, "Internal mode must not render Google sign-in");
    assert.equal(await page.getByRole("button", { name: "Add record" }).count(), 0, "The recording workspace must stay locked before company sign-in");
    for (const width of [320, 390, 426]) {
      await page.setViewportSize({ width, height: 844 });
      await assertNoHorizontalOverflow(page, `${width}px internal account gate`);
      await assertMinTouchTarget(meituanAction, `${width}px internal Meituan SSO action`);
    }

    await page.evaluate(() => window.localStorage.removeItem("log-note:e2e-auth-locked"));
    await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
    await openSettingsPanel(page, "Account");
    await assertVisible(page.locator(".account-identity-row"));
    await assertVisible(page.locator(".account-cloud-workspace"));
    assert.equal(await page.locator(".google-calendar-workspace").count(), 0, "Internal mode must not render Google Calendar settings");
    await assertVisible(page.getByRole("button", { name: "Sign out" }));
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await setWorkspaceMode(page, "plan");
    assert.equal(await page.getByText("Google Calendar sync · Account settings", { exact: true }).count(), 0, "Internal mode must not advertise disabled Google Calendar sync in Plan");
    for (const width of [320, 390, 426]) {
      await page.setViewportSize({ width, height: 844 });
      await assertNoHorizontalOverflow(page, `${width}px internal Account settings`);
    }
  });
}

test("home hierarchy: fixed records follow the day's content without weakening quick record", async (page) => {
  const fixedRecords = page.locator(".fixed-records");
  const addRecord = page.getByRole("button", { name: "Add record" });
  await assertVisible(fixedRecords);
  await assertVisible(fixedRecords.getByText("0/6", { exact: true }));
  await assertVisible(fixedRecords.getByLabel("0 completed, 6 remaining"));
  assert.equal(await fixedRecords.getByText("Type values here; open forms expand in place.", { exact: true }).count(), 0, "Fixed record controls should explain their interaction directly");
  assert.equal(await fixedRecords.getByText("6 remaining", { exact: true }).count(), 0, "The visible ratio should not repeat the remaining count");
  const mobileFixedBox = await fixedRecords.boundingBox();
  assert.ok(mobileFixedBox && mobileFixedBox.y < 844);
  assert.equal(await page.locator("#timeline-records, .timeline-empty").count(), 0, "An empty time view should not render a Record heading or explanatory empty state");
  assert.equal(await page.locator('.domain-directory-node[data-section-id="timeline:records"]').count(), 0, "An empty time view should not render a Record directory node without matching content");
  const emptyTimelineLayout = await page.locator(".home-workspace").evaluate((workspace) => {
    const fixed = workspace.querySelector(".fixed-records");
    const dateTitle = document.querySelector(".home-date-title");
    const style = getComputedStyle(fixed);
    const box = (element) => element.getBoundingClientRect();
    return {
      fixedTop: box(fixed).top,
      titleBottom: box(dateTitle).bottom,
      topRule: style.backgroundImage,
      topPadding: style.paddingTop
    };
  });
  assert.ok(emptyTimelineLayout.fixedTop > emptyTimelineLayout.titleBottom + 23, `Fixed records should keep a calm section gap after the title: ${JSON.stringify(emptyTimelineLayout)}`);
  assert.equal(emptyTimelineLayout.topRule, "none", `A fixed-record section with no preceding time content should not add an orphaned separator: ${JSON.stringify(emptyTimelineLayout)}`);
  assert.equal(emptyTimelineLayout.topPadding, "0px", `An empty time surface should not reserve the old record section height: ${JSON.stringify(emptyTimelineLayout)}`);
  await assertVisible(addRecord);
  await assertFixedInputControls(page, "390px empty home", true);
  await page.setViewportSize({ width: 426, height: 923 });
  await page.screenshot({ path: join(outputDir, "ln-075-empty-time-clean-426.png"), fullPage: false });
  await page.setViewportSize({ width: 320, height: 844 });
  await assertFixedInputControls(page, "320px empty home", true);
  for (const width of [600, 671, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await assertFixedInputControls(page, `${width}px compact home`, false);
    const compactLayout = await page.locator("main").evaluate(() => {
      const title = document.querySelector(".home-date-title");
      const fixedSection = document.querySelector(".fixed-records");
      const fixedRow = document.querySelector(".fixed-entry");
      const fixedControl = document.querySelector(".fixed-inline-control");
      const box = (element) => element.getBoundingClientRect();
      return {
        titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
        fixedWidth: box(fixedSection).width,
        rowWidth: box(fixedRow).width,
        controlWidth: box(fixedControl).width,
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth
      };
    });
    assert.equal(compactLayout.titleFontSize, 18, `${width}px should keep the compact date beside the stronger editorial view title: ${JSON.stringify(compactLayout)}`);
    assert.ok(compactLayout.fixedWidth <= 621, `${width}px fixed records should remain one readable cluster: ${JSON.stringify(compactLayout)}`);
    assert.ok(compactLayout.rowWidth <= 561, `${width}px fixed rows should not stretch across the viewport: ${JSON.stringify(compactLayout)}`);
    assert.ok(compactLayout.controlWidth <= 321, `${width}px fixed values should keep a compact value column: ${JSON.stringify(compactLayout)}`);
    assert.equal(compactLayout.scrollWidth, compactLayout.viewportWidth, `${width}px compact home should not overflow: ${JSON.stringify(compactLayout)}`);
    await page.screenshot({ path: join(outputDir, `ln-052-compact-home-${width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  const desktopFixedBox = await fixedRecords.boundingBox();
  assert.ok(desktopFixedBox && desktopFixedBox.y < 720);
  assert.equal(await page.locator("#timeline-records, .timeline-empty").count(), 0, "Desktop should apply the same empty-time suppression as mobile");
  await assertFixedInputControls(page, "1280px empty home", false);
  await addQuickRecord(page, "Row spacing");
  await page.setViewportSize({ width: 390, height: 844 });
  const compactEntryPaper = await page.locator(".timeline .entry", { hasText: "Row spacing" }).evaluate((entry) => {
    const content = entry.querySelector(".entry-content");
    const textRange = document.createRange();
    textRange.selectNodeContents(content);
    const rowBox = entry.getBoundingClientRect();
    const textBox = textRange.getBoundingClientRect();
    return {
      rowHeight: rowBox.height,
      textToRuleGap: rowBox.bottom - 3 - textBox.bottom
    };
  });
  assert.ok(compactEntryPaper.rowHeight >= 55.5 && compactEntryPaper.rowHeight <= 57.5, `390px single-line timeline records should use the compact 56px reading row: ${JSON.stringify(compactEntryPaper)}`);
  assert.ok(compactEntryPaper.textToRuleGap >= 8 && compactEntryPaper.textToRuleGap <= 20.5, `Single-line record text should sit close to its handwritten rule without touching it: ${JSON.stringify(compactEntryPaper)}`);
  await page.evaluate(() => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    const entry = state.entries.find((item) => item.content === "Row spacing");
    entry.tags = ["food", "rest"];
    window.localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const timelineEntry = page.locator(".timeline .entry", { hasText: "Row spacing" });
  await assertVisible(timelineEntry);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileEntryBox = await timelineEntry.boundingBox();
  const mobileFixedWithEntryBox = await fixedRecords.boundingBox();
  assert.ok(mobileEntryBox && mobileFixedWithEntryBox && mobileFixedWithEntryBox.y > mobileEntryBox.y);
  const timelinePaper = await timelineEntry.evaluate((entry) => {
    const time = entry.querySelector("[data-entry-time-action]");
    const body = entry.querySelector(".entry-body");
    const content = entry.querySelector(".entry-content");
    const rowBox = entry.getBoundingClientRect();
    const timeBox = time.getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    return {
      rowHeight: rowBox.height,
      rowBorder: getComputedStyle(entry).borderBottomWidth,
      rowBorderColor: getComputedStyle(entry).borderBottomColor,
      rowRule: getComputedStyle(entry).backgroundImage,
      bodyBorder: getComputedStyle(body).borderLeftWidth,
      bodyDividerWidth: getComputedStyle(body, "::before").width,
      bodyDividerHeight: getComputedStyle(body, "::before").height,
      bodyDividerAsset: getComputedStyle(body, "::before").backgroundImage,
      timeBeforeBody: Math.abs(timeBox.right - bodyBox.left),
      contentInset: contentBox.left - bodyBox.left,
      hiddenScope: entry.querySelector(".visually-hidden")?.textContent || ""
    };
  });
  assert.ok(timelinePaper.rowHeight >= 71.5, `Timeline rows should keep the open-paper reading rhythm: ${JSON.stringify(timelinePaper)}`);
  assert.equal(timelinePaper.rowBorder, "1px", `Timeline rows should preserve divider geometry without a straight CSS stroke: ${JSON.stringify(timelinePaper)}`);
  assert.match(timelinePaper.rowBorderColor, /rgba\([^)]*, 0\)/, `Timeline CSS borders should be transparent beneath the hand-drawn rule: ${JSON.stringify(timelinePaper)}`);
  assert.match(timelinePaper.rowRule, /record-rule-handdrawn\.png/, `Timeline rows should use the hand-drawn raster rule: ${JSON.stringify(timelinePaper)}`);
  assert.equal(timelinePaper.bodyBorder, "0px", `Timeline rows should not form one continuous table rule: ${JSON.stringify(timelinePaper)}`);
  assert.equal(timelinePaper.bodyDividerWidth, "18px", `Each timeline row should use the reference's short dash between time and content: ${JSON.stringify(timelinePaper)}`);
  assert.equal(timelinePaper.bodyDividerHeight, "6px", `The local time divider should remain a restrained hand-drawn dash: ${JSON.stringify(timelinePaper)}`);
  assert.match(timelinePaper.bodyDividerAsset, /record-time-dash-handdrawn\.png/, `The short divider must use the generated hand-drawn raster asset: ${JSON.stringify(timelinePaper)}`);
  assert.ok(timelinePaper.timeBeforeBody <= 1, `Timeline columns should meet at the separator: ${JSON.stringify(timelinePaper)}`);
  assert.ok(timelinePaper.contentInset >= 12 && timelinePaper.contentInset <= 18, `Timeline body copy should keep one compact inset after the separator: ${JSON.stringify(timelinePaper)}`);
  assert.match(timelinePaper.hiddenScope, /Daily|日常/, `Removed ownership pills should remain available to assistive technology: ${JSON.stringify(timelinePaper)}`);
  assert.equal(await page.locator(".timeline .entry-meta, .fixed-entry-scope").count(), 0, "Ownership capsules should not remain visible in the reference-style record layout");
  const fixedPaper = await fixedRecords.evaluate((section) => {
    const style = getComputedStyle(section);
    const rows = [...section.querySelectorAll(".fixed-entry")];
    const positions = rows.map((row) => {
      const label = row.querySelector(".fixed-entry-label").getBoundingClientRect();
      const value = row.querySelector(".fixed-inline-control, .fixed-entry-value").getBoundingClientRect();
      return { labelX: label.x, valueX: value.x, valueAfterLabel: value.x > label.x };
    });
    const labelRuleGaps = rows.map((row) => {
      const label = row.querySelector(".fixed-entry-label");
      const range = document.createRange();
      range.selectNodeContents(label);
      const text = range.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      return {
        label: label.textContent.trim(),
        inline: row.matches(".fixed-entry-inline"),
        lineCount: range.getClientRects().length,
        gap: rowBox.bottom - 3 - text.bottom
      };
    });
    return {
      background: style.backgroundColor,
      shadow: style.boxShadow,
      radius: style.borderRadius,
      borderTop: style.borderTopWidth,
      borderTopColor: style.borderTopColor,
      sectionRule: style.backgroundImage,
      borderRight: style.borderRightWidth,
      hiddenTitle: section.querySelector(".fixed-records-header h2.visually-hidden")?.textContent || "",
      visibleTitleCount: [...section.querySelectorAll(".fixed-records-header h2")].filter((title) => {
        const box = title.getBoundingClientRect();
        return box.width > 1 && box.height > 1;
      }).length,
      rowBorders: rows.map((row) => ({
        width: getComputedStyle(row).borderBottomWidth,
        color: getComputedStyle(row).borderBottomColor,
        rule: getComputedStyle(row).backgroundImage,
        ruleSize: getComputedStyle(row).backgroundSize,
        rulePosition: getComputedStyle(row).backgroundPosition
      })),
      labelRuleGaps,
      valueSpread: positions.length ? Math.max(...positions.map((item) => item.valueX)) - Math.min(...positions.map((item) => item.valueX)) : 0,
      valuesAfterLabels: positions.every((item) => item.valueAfterLabel)
    };
  });
  assert.match(fixedPaper.hiddenTitle, /Health|健康/, `Time view should preserve the periodic domain only for semantics and the right-side directory: ${JSON.stringify(fixedPaper)}`);
  assert.equal(fixedPaper.visibleTitleCount, 0, `Time view must not repeat Health as a visible left-side title: ${JSON.stringify(fixedPaper)}`);
  assert.equal(fixedPaper.background, "rgba(0, 0, 0, 0)", `Fixed records should stay on continuous paper: ${JSON.stringify(fixedPaper)}`);
  assert.equal(fixedPaper.shadow, "none", `Fixed records should not retain a raised card shadow: ${JSON.stringify(fixedPaper)}`);
  assert.equal(fixedPaper.radius, "0px", `Fixed records should not retain a card radius: ${JSON.stringify(fixedPaper)}`);
  assert.equal(fixedPaper.borderTop, "0px", `Fixed records should not add a second horizontal divider after the final ordinary record: ${JSON.stringify(fixedPaper)}`);
  assert.equal(fixedPaper.borderTop, "0px", `The fixed section must not render a straight CSS rule: ${JSON.stringify(fixedPaper)}`);
  assert.equal(fixedPaper.sectionRule, "none", `The final ordinary-record rule should own the transition into fixed records: ${JSON.stringify(fixedPaper)}`);
  assert.equal(fixedPaper.borderRight, "0px", `Fixed records should not be boxed on four sides: ${JSON.stringify(fixedPaper)}`);
  assert.ok(fixedPaper.rowBorders.every(({ width, color, rule }) => width === "1px" && /rgba\([^)]*, 0\)/.test(color) && /record-rule-handdrawn\.png/.test(rule)), `Fixed metric rows should share the generated hand-drawn divider rhythm: ${JSON.stringify(fixedPaper)}`);
  assert.ok(fixedPaper.rowBorders.every(({ ruleSize, rulePosition }) => /calc\(100% - 24px\) 3px/.test(ruleSize) && /^0% 100%/.test(rulePosition)), `Mobile fixed-record rules should stop 24px before the Agent-safe edge instead of visually connecting to the character: ${JSON.stringify(fixedPaper)}`);
  const singleLineRuleGaps = fixedPaper.labelRuleGaps.filter(({ inline, lineCount }) => inline && lineCount === 1);
  assert.ok(singleLineRuleGaps.length > 0 && singleLineRuleGaps.every(({ gap }) => gap >= 6 && gap <= 16.5), `Single-line fixed labels should sit close to their handwritten rule without touching it: ${JSON.stringify(singleLineRuleGaps)}`);
  assert.ok(fixedPaper.valueSpread <= 1, `Fixed values should share one stable reading axis: ${JSON.stringify(fixedPaper)}`);
  assert.equal(fixedPaper.valuesAfterLabels, true, `Each fixed value should follow its metric label: ${JSON.stringify(fixedPaper)}`);
  await page.setViewportSize({ width: 426, height: 923 });
  const focusedFixedInput = fixedRecords.locator(".fixed-inline-control input").first();
  await focusedFixedInput.focus();
  await page.waitForTimeout(220);
  const focusLoop = await focusedFixedInput.evaluate((input) => {
    const row = input.closest(".fixed-entry");
    const loop = getComputedStyle(row, "::after");
    return {
      inputOutlineWidth: getComputedStyle(input).outlineWidth,
      background: loop.backgroundImage,
      clipPath: loop.clipPath,
      opacity: Number.parseFloat(loop.opacity),
      transitionDuration: loop.transitionDuration
    };
  });
  assert.equal(focusLoop.inputOutlineWidth, "0px", `Fixed inputs should not retain the hard rectangular focus outline: ${JSON.stringify(focusLoop)}`);
  assert.match(focusLoop.background, /record-focus-loop\.png/, `Focused rows should use the generated blue hand-drawn loop: ${JSON.stringify(focusLoop)}`);
  assert.ok(focusLoop.opacity >= 0.99 && !/100%/.test(focusLoop.clipPath), `The completed focus motion should encircle the whole row: ${JSON.stringify(focusLoop)}`);
  assert.match(focusLoop.transitionDuration, /0\.2s/, `The row loop should draw in with a restrained motion: ${JSON.stringify(focusLoop)}`);
  await page.screenshot({ path: join(outputDir, "ln-075-focus-loop-426.png"), fullPage: false });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await focusedFixedInput.evaluate((input) => getComputedStyle(input.closest(".fixed-entry"), "::after").transitionDuration.split(",").every((value) => Number.parseFloat(value) <= 0.001)), true, "Reduced motion should show the completed row loop immediately");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await focusedFixedInput.blur();
  await page.setViewportSize({ width: 390, height: 844 });
  const labelSystem = await page.locator("main").evaluate(() => {
    const userTag = document.querySelector(".entry-tags .record-label--tag");
    const style = getComputedStyle(userTag);
    const box = userTag.getBoundingClientRect();
    return {
      background: style.backgroundColor,
      borderRadius: style.borderRadius,
      display: style.display,
      fontSize: Number.parseFloat(style.fontSize),
      height: box.height
    };
  });
  assert.equal(await page.locator(".entry-tags.record-label-list").count(), 1, "Timeline tags should use the shared label-list component");
  assert.equal(await page.locator(".record-label").evaluateAll((labels) => labels.every((label) => label.classList.contains("record-label--tag"))), true, "Only user-authored tags should remain as visible capsules");
  assert.ok(["flex", "inline-flex"].includes(labelSystem.display), `User tags should retain the shared compact label display: ${JSON.stringify(labelSystem)}`);
  assert.equal(labelSystem.fontSize, 12, `User tags should retain metadata sizing: ${JSON.stringify(labelSystem)}`);
  assert.ok(Math.abs(labelSystem.height - 22) <= 0.5 && labelSystem.borderRadius === "999px", `User tags should remain compact capsules: ${JSON.stringify(labelSystem)}`);
  assert.notEqual(labelSystem.background, "rgba(0, 0, 0, 0)", `User tags should retain their low-saturation accent surface: ${JSON.stringify(labelSystem)}`);
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 600, height: 900 },
    { width: 671, height: 900 },
    { width: 700, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 720 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px fixed-record hierarchy`);
    const adjustFixedRecords = fixedRecords.getByRole("link", { name: "Adjust" });
    await assertMinTouchTarget(adjustFixedRecords, `${viewport.width}px fixed-record adjust action`);
    const headerHierarchy = await fixedRecords.locator(".fixed-records-header").evaluate((header) => {
      const title = header.querySelector("h2");
      const tools = header.querySelector(".fixed-records-tools");
      const count = tools.querySelector("span");
      const action = tools.querySelector("a");
      const titleStyle = getComputedStyle(title);
      const toolsStyle = getComputedStyle(tools);
      const countStyle = getComputedStyle(count);
      const actionStyle = getComputedStyle(action);
      const headerBox = header.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      const countBox = count.getBoundingClientRect();
      const actionBox = action.getBoundingClientRect();
      return {
        headerHeight: headerBox.height,
        titleText: title.textContent,
        titleClass: title.className,
        titleWidth: titleBox.width,
        titleHeight: titleBox.height,
        toolsDirection: toolsStyle.flexDirection,
        countFontSize: Number.parseFloat(countStyle.fontSize),
        countFontWeight: Number.parseInt(countStyle.fontWeight, 10),
        countColor: countStyle.color,
        actionFontSize: Number.parseFloat(actionStyle.fontSize),
        actionFontWeight: Number.parseInt(actionStyle.fontWeight, 10),
        actionColor: actionStyle.color,
        centerDelta: Math.abs((countBox.top + countBox.height / 2) - (actionBox.top + actionBox.height / 2)),
        countBeforeAction: countBox.right <= actionBox.left
      };
    });
    assert.equal(headerHierarchy.toolsDirection, "row", `Fixed-record tools should read as one compact cluster: ${JSON.stringify(headerHierarchy)}`);
    assert.match(headerHierarchy.titleText, /Health|健康/, `The hidden title should retain the real domain for assistive technology: ${JSON.stringify(headerHierarchy)}`);
    assert.match(headerHierarchy.titleClass, /visually-hidden/, `The time view should hide the duplicate domain title on the left: ${JSON.stringify(headerHierarchy)}`);
    assert.ok(headerHierarchy.titleWidth <= 1 && headerHierarchy.titleHeight <= 1, `The domain title should not consume visible layout space in time view: ${JSON.stringify(headerHierarchy)}`);
    assert.ok(headerHierarchy.headerHeight >= 43.99, `The tools-only fixed header should retain a 44px action row: ${JSON.stringify(headerHierarchy)}`);
    assert.equal(headerHierarchy.countFontSize, 12, `Fixed-record progress should use metadata sizing: ${JSON.stringify(headerHierarchy)}`);
    assert.ok(headerHierarchy.countFontWeight <= 500, `Fixed-record progress should remain visually quiet: ${JSON.stringify(headerHierarchy)}`);
    assert.equal(headerHierarchy.actionFontSize, 14, `Fixed-record adjust should remain a secondary action label: ${JSON.stringify(headerHierarchy)}`);
    assert.ok(headerHierarchy.actionFontWeight <= 500, `Fixed-record adjust should not compete with the section title: ${JSON.stringify(headerHierarchy)}`);
    assert.ok(headerHierarchy.centerDelta <= 1, `Progress and adjust should share one baseline cluster: ${JSON.stringify(headerHierarchy)}`);
    assert.equal(headerHierarchy.countBeforeAction, true, `Progress should precede the related adjust action: ${JSON.stringify(headerHierarchy)}`);
    await fixedRecords.locator(".fixed-records-header").evaluate((header) => {
      header.tabIndex = -1;
      header.focus();
    });
    await page.keyboard.press("Tab");
    const reachedAdjustWithKeyboard = await adjustFixedRecords.evaluate((link) => document.activeElement === link);
    assert.equal(reachedAdjustWithKeyboard, true, `${viewport.width}px adjust should be reachable by keyboard`);
    const focusStyle = await adjustFixedRecords.evaluate((link) => ({
      focusVisible: link.matches(":focus-visible"),
      outlineStyle: getComputedStyle(link).outlineStyle,
      outlineWidth: getComputedStyle(link).outlineWidth
    }));
    assert.equal(focusStyle.focusVisible, true, `Adjust should expose a keyboard-only focus state: ${JSON.stringify(focusStyle)}`);
    assert.notEqual(focusStyle.outlineStyle, "none", `Adjust should expose a keyboard focus ring: ${JSON.stringify(focusStyle)}`);
    assert.ok(Number.parseFloat(focusStyle.outlineWidth) >= 2, `Adjust focus ring should remain visible: ${JSON.stringify(focusStyle)}`);
    await adjustFixedRecords.blur();
    await page.screenshot({ path: join(outputDir, `ln-073-label-system-${viewport.width}.png`), fullPage: true });
    await page.screenshot({ path: join(outputDir, `ln-061-fixed-scope-tags-${viewport.width}.png`), fullPage: true });
    await page.screenshot({ path: join(outputDir, `ln-062-fixed-header-tools-${viewport.width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await addRecord.click();
  await assertVisible(page.locator(".surface.composer"));
  await assertNoHorizontalOverflow(page, "390px populated home");
});

test("book-page ritual: home, authored timeline, and composer share one archival journal system", async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const addRecord = page.getByRole("button", { name: "Add record" });
  const fixedRecords = page.locator(".fixed-records");
  await assertVisible(addRecord);
  await assertVisible(fixedRecords);
  await page.locator("nextjs-portal").evaluateAll((portals) => portals.forEach((portal) => { portal.style.display = "none"; }));

  const emptyJournal = await page.locator("main.app-shell").evaluate((shell) => {
    const style = getComputedStyle(shell);
    const gutter = getComputedStyle(shell, "::before");
    const title = document.querySelector(".home-date-title").getBoundingClientRect();
    const fixed = document.querySelector(".fixed-records").getBoundingClientRect();
    return {
      paper: style.getPropertyValue("--journal-paper").trim(),
      ink: style.getPropertyValue("--journal-ink").trim(),
      accent: style.getPropertyValue("--journal-accent").trim(),
      gutterWidth: Number.parseFloat(gutter.width),
      gutterBackground: gutter.backgroundImage,
      gapAfterDate: fixed.top - title.bottom,
      bodyTexture: getComputedStyle(document.body).backgroundImage,
      railSource: document.querySelector(".home-edge-rail-brush")?.getAttribute("src") || ""
    };
  });
  assert.ok(emptyJournal.paper && emptyJournal.ink && emptyJournal.accent, `The journal shell should expose one scoped paper/ink/accent material system: ${JSON.stringify(emptyJournal)}`);
  assert.ok(emptyJournal.gutterWidth >= 54 && emptyJournal.gutterWidth <= 58, `The existing rail should sit inside one quiet 56px binding gutter: ${JSON.stringify(emptyJournal)}`);
  assert.match(emptyJournal.gutterBackground, /linear-gradient/, `The binding gutter should have page-edge depth instead of reading as an isolated line: ${JSON.stringify(emptyJournal)}`);
  assert.ok(emptyJournal.gapAfterDate >= 24 && emptyJournal.gapAfterDate <= 80, `The empty journal should use one owned section gap instead of a dominant blank band: ${JSON.stringify(emptyJournal)}`);
  assert.match(emptyJournal.bodyTexture, /paper-texture\.svg/, `The archival material must remain a local offline paper texture: ${JSON.stringify(emptyJournal)}`);
  assert.match(emptyJournal.railSource, /^\/ui\/diary\//, `The binding rail must remain a local offline asset: ${JSON.stringify(emptyJournal)}`);
  await page.screenshot({ path: join(outputDir, "ln-076-home-390.png"), fullPage: false });

  await addRecord.click();
  const composer = page.locator(".surface.composer");
  const textarea = composer.locator(".writing-area textarea");
  const close = composer.getByRole("button", { name: "Close" });
  const done = composer.getByRole("button", { name: "Done" });
  await assertVisible(composer);
  await assertMinTouchTarget(close, "LN-076 composer close");
  await assertMinTouchTarget(done, "LN-076 composer Done");
  const composerMaterial = await composer.evaluate((surface) => {
    const box = surface.getBoundingClientRect();
    const style = getComputedStyle(surface);
    const header = surface.querySelector(".surface-header");
    const writing = surface.querySelector(".writing-area");
    const save = surface.querySelector(".save-button");
    return {
      height: box.height,
      viewportHeight: window.innerHeight,
      topLeftRadius: Number.parseFloat(style.borderTopLeftRadius),
      topRightRadius: Number.parseFloat(style.borderTopRightRadius),
      backgroundImage: style.backgroundImage,
      headerBackground: getComputedStyle(header).backgroundImage,
      writingBackground: getComputedStyle(writing).backgroundImage,
      saveRadius: Number.parseFloat(getComputedStyle(save).borderRadius),
      textareaFontSize: Number.parseFloat(getComputedStyle(surface.querySelector("textarea")).fontSize)
    };
  });
  assert.ok(composerMaterial.height >= composerMaterial.viewportHeight * .72, `The ordinary composer should open as a substantial page leaf rather than a small generic sheet: ${JSON.stringify(composerMaterial)}`);
  assert.ok(composerMaterial.topLeftRadius <= 10 && composerMaterial.topRightRadius <= 10, `The page leaf should use compact book-page corners: ${JSON.stringify(composerMaterial)}`);
  assert.match(composerMaterial.backgroundImage, /paper-texture\.svg/, `The composer should continue the same local paper material: ${JSON.stringify(composerMaterial)}`);
  assert.ok(composerMaterial.saveRadius <= 8, `Done should use a restrained ink-action geometry rather than a generic large pill: ${JSON.stringify(composerMaterial)}`);
  assert.ok(composerMaterial.textareaFontSize >= 18, `The writing area should remain the composer's dominant text surface: ${JSON.stringify(composerMaterial)}`);
  await page.screenshot({ path: join(outputDir, "ln-076-composer-390.png"), fullPage: false });
  const firstContent = "LN-076 第一页记录";
  await textarea.fill(firstContent);
  await done.click();
  await assertVisible(page.locator(".timeline .entry", { hasText: firstContent }));
  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 });
  await addQuickRecord(page, "Second archival journal line");
  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(100);

  const populatedJournal = await page.locator(".timeline").evaluate((timeline) => {
    const title = document.querySelector(".home-date-title").getBoundingClientRect();
    const timelineBox = timeline.getBoundingClientRect();
    const heading = timeline.querySelector(".timeline-header").getBoundingClientRect();
    const firstEntry = timeline.querySelector(".entry");
    const entryBox = firstEntry.getBoundingClientRect();
    const content = firstEntry.querySelector(".entry-content");
    const contentStyle = getComputedStyle(content);
    const timeStyle = getComputedStyle(firstEntry.querySelector("time"));
    const fixed = document.querySelector(".fixed-records").getBoundingClientRect();
    return {
      gapAfterDate: timelineBox.top - title.bottom,
      headingToFirstEntry: entryBox.top - heading.bottom,
      contentFontSize: Number.parseFloat(contentStyle.fontSize),
      contentColor: contentStyle.color,
      timeFontFamily: timeStyle.fontFamily,
      timelineBeforeFixed: entryBox.bottom <= fixed.top,
      entryRule: getComputedStyle(firstEntry).backgroundImage
    };
  });
  assert.ok(populatedJournal.gapAfterDate >= 16 && populatedJournal.gapAfterDate <= 72, `Populated diary content should begin with one compact editorial gap: ${JSON.stringify(populatedJournal)}`);
  assert.ok(populatedJournal.headingToFirstEntry >= 0 && populatedJournal.headingToFirstEntry <= 16, `The Record heading should stay attached to its authored rows: ${JSON.stringify(populatedJournal)}`);
  assert.equal(populatedJournal.contentFontSize, 16, `Authored notes should keep their established 16px primary reading role: ${JSON.stringify(populatedJournal)}`);
  assert.match(populatedJournal.timeFontFamily, /IBM Plex Mono/, `Time should remain subordinate Mono metadata: ${JSON.stringify(populatedJournal)}`);
  assert.equal(populatedJournal.timelineBeforeFixed, true, `Authored timeline rows should precede the fixed ledger: ${JSON.stringify(populatedJournal)}`);
  assert.match(populatedJournal.entryRule, /record-rule-handdrawn\.png/, `Authored rows should retain the local hand-drawn paper rule: ${JSON.stringify(populatedJournal)}`);
  await page.screenshot({ path: join(outputDir, "ln-076-timeline-390.png"), fullPage: false });

  const responsive = [];
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px LN-076 journal`);
    await assertMinTouchTarget(addRecord, `${viewport.width}px LN-076 record action`);
    const metrics = await page.locator("main.app-shell").evaluate((shell) => {
      const overlapArea = (first, second) => Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left))
        * Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
      const figure = document.querySelector(".organize-helper-figure")?.getBoundingClientRect();
      const helper = document.querySelector(".organize-helper")?.getBoundingClientRect();
      const appearance = document.querySelector(".organize-helper-appearance");
      const appearanceBox = appearance?.getBoundingClientRect();
      const figureElement = document.querySelector(".organize-helper-figure");
      const stage = document.querySelector('[data-agent-surface="diary"]');
      const traveler = document.querySelector(".diary-agent-traveler");
      const wakeCopy = document.querySelector(".agent-wake-copy");
      const contentRows = [...document.querySelectorAll(".entry-content, .group-entry .entry-content, .fixed-entry-label, .fixed-entry-value")].map((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return range.getBoundingClientRect();
      });
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        titleBottom: document.querySelector(".home-date-title").getBoundingClientRect().bottom,
        contentTop: document.querySelector(".timeline").getBoundingClientRect().top,
        recordRight: document.querySelector(".timeline-list").getBoundingClientRect().right,
        railLeft: document.querySelector(".home-edge-rail-brush")?.getBoundingClientRect().left || null,
        gutterWidth: Number.parseFloat(getComputedStyle(shell, "::before").width),
        agentButtonRight: helper?.right ?? null,
        agentFigureLeft: figure?.left ?? null,
        agentFigureRight: figure?.right ?? null,
        agentFigureCenter: figure ? figure.left + figure.width / 2 : null,
        agentAppearanceRight: appearanceBox?.right ?? null,
        agentAppearance: appearance?.dataset.agentAppearance ?? null,
        agentAppearanceState: appearance?.dataset.agentAppearanceState ?? null,
        agentAsset: figureElement?.getAttribute("src") ?? null,
        agentMotionFrameCount: Number(appearance?.dataset.agentMotionFrameCount || 0),
        agentMotionCycleMs: Number(appearance?.dataset.agentMotionCycleMs || 0),
        agentMotionPoses: appearance?.dataset.agentMotionPoses ?? null,
        agentGazeStates: appearance?.dataset.agentGazeStates ?? null,
        agentMotionMode: stage?.dataset.agentMotionMode ?? null,
        agentPlacement: stage?.dataset.agentPlacement ?? null,
        agentStagePosition: stage ? getComputedStyle(stage).position : null,
        agentTravelerAnimation: traveler ? getComputedStyle(traveler).animationName : null,
        agentButtonWidth: helper?.width ?? null,
        agentButtonHeight: helper?.height ?? null,
        railCount: document.querySelectorAll(".home-edge-rail-brush").length,
        agentPathCount: document.querySelectorAll(".organize-helper-path").length,
        agentCopyDisplay: wakeCopy ? getComputedStyle(wakeCopy).display : null,
        agentTargetOverlap: helper ? Math.max(0, ...contentRows.map((row) => overlapArea(helper, row))) : 0
      };
    });
    if (viewport.width <= 700) {
      assert.ok(metrics.railLeft !== null && metrics.recordRight <= metrics.railLeft - 7.5, `${viewport.width}px authored records should stay clear of the binding gutter: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.gutterWidth >= 54 && metrics.gutterWidth <= 58, `${viewport.width}px should keep the same binding depth: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.agentAppearanceRight !== null && Math.abs((metrics.agentAppearanceRight - 5) - (metrics.railLeft + 2)) <= 2, `${viewport.width}px Agent grip should resolve onto the existing binding axis: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.agentButtonWidth >= 43.9 && metrics.agentButtonHeight >= 79.5, `${viewport.width}px the moving character should retain a synchronized accessible hit target: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentAppearance, "spine-line", `${viewport.width}px should mount the selected default appearance through the generic renderer: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentAppearanceState, "idle", `${viewport.width}px should expose the existing session state to appearance only: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentAsset, "/ui/diary/agent-spine-spirit-idle-motion.png", `${viewport.width}px should use the animated, source-faithful idle sprite: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentMotionFrameCount, 6, `${viewport.width}px idle artwork should expose several crawl poses: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentMotionCycleMs, 3000, `${viewport.width}px local grip cycle should stay slower than a twitch: ${JSON.stringify(metrics)}`);
      assert.match(metrics.agentMotionPoses, /grip.*reach-up.*body-follow.*settle/, `${viewport.width}px idle artwork should expose a grip/reach/follow crawl sequence: ${JSON.stringify(metrics)}`);
      assert.match(metrics.agentGazeStates, /center.*up.*down/, `${viewport.width}px idle artwork should expose restrained gaze changes: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentMotionMode, "animated", `${viewport.width}px Diary Agent should patrol only at the mobile breakpoint: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentTravelerAnimation, "diary-agent-spine-patrol", `${viewport.width}px Diary Agent should use the bounded book-spine patrol: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentPlacement, "viewport-spine", `${viewport.width}px should expose the viewport-spine placement contract: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentStagePosition, "fixed", `${viewport.width}px Agent should remain fixed to the viewport during document scroll: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.railCount, 1, `${viewport.width}px should render one real book-spine rail: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentPathCount, 0, `${viewport.width}px should remove the detached path from the old full-body illustration: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.agentCopyDisplay === null || metrics.agentCopyDisplay === "none", `${viewport.width}px should keep the left writing plane clear of idle Agent copy: ${JSON.stringify(metrics)}`);
    } else {
      assert.equal(metrics.agentMotionMode, "still", `${viewport.width}px desktop Agent should keep a quiet fixed pose: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentAsset, "/ui/diary/agent-spine-spirit-idle-still.png", `${viewport.width}px desktop should use the source-faithful still sprite: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.agentTravelerAnimation, "none", `${viewport.width}px desktop Agent should not patrol: ${JSON.stringify(metrics)}`);
    }
    assert.ok(metrics.agentTargetOverlap <= 1, `${viewport.width}px Agent hit target should not intercept record or fixed-ledger text: ${JSON.stringify(metrics)}`);
    responsive.push(metrics);
    await page.screenshot({ path: join(outputDir, `ln-076-responsive-home-${viewport.width}.png`), fullPage: false });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await addRecord.click();
  await assertVisible(composer);
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px LN-076 composer`);
    await assertMinTouchTarget(close, `${viewport.width}px LN-076 composer close`);
    await assertMinTouchTarget(done, `${viewport.width}px LN-076 composer Done`);
    await page.screenshot({ path: join(outputDir, `ln-076-responsive-composer-${viewport.width}.png`), fullPage: false });
  }
  await close.click();

  await page.locator(".export-fab").focus();
  await page.keyboard.press("Tab");
  const focus = await addRecord.evaluate((button) => ({
    visible: button.matches(":focus-visible"),
    outlineWidth: Number.parseFloat(getComputedStyle(button).outlineWidth)
  }));
  assert.equal(focus.visible, true, `The record action should expose keyboard focus: ${JSON.stringify(focus)}`);
  assert.ok(focus.outlineWidth >= 2, `The record action focus indication should remain visible: ${JSON.stringify(focus)}`);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotion = await page.locator(".timeline.view-panel").evaluate((panel) => ({
    animationDuration: Number.parseFloat(getComputedStyle(panel).animationDuration),
    entryTransition: getComputedStyle(panel.querySelector(".entry"), "::after").transitionDuration
  }));
  assert.ok(reducedMotion.animationDuration <= .001, `Reduced motion should remove the content entrance: ${JSON.stringify(reducedMotion)}`);
  assert.equal(reducedMotion.entryTransition.split(",").every((value) => Number.parseFloat(value) <= .001), true, `Reduced motion should reveal focus without animated drawing: ${JSON.stringify(reducedMotion)}`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await writeFile(join(outputDir, "ln-076-visual-evidence.json"), JSON.stringify({
    emptyJournal,
    composerMaterial,
    populatedJournal,
    responsive,
    focus,
    reducedMotion,
    quickRecord: { openActions: 1, saveActionsAfterTyping: 1, exactContent: firstContent }
  }, null, 2));
});

test("book-page ritual: expanded composer keeps writing primary and details ordered", async (page) => {
  const originalContent = "今天把记录页收拾得更安静。";
  await addQuickRecord(page, originalContent);
  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 });
  await page.locator(".timeline .entry", { hasText: originalContent }).locator("[data-entry-content-action]").click();

  const composer = page.locator("[data-inline-record-editor]");
  const textarea = composer.locator(".writing-area textarea");
  const more = composer.getByRole("button", { name: "More" });
  await assertVisible(composer);
  await page.locator("nextjs-portal").evaluateAll((portals) => portals.forEach((portal) => { portal.style.display = "none"; }));
  const writingFocus = await composer.locator(".writing-area").evaluate((writing) => ({
    writingShadow: getComputedStyle(writing).boxShadow,
    textareaOutline: getComputedStyle(writing.querySelector("textarea")).outlineStyle
  }));
  assert.notEqual(writingFocus.writingShadow, "none", `Focused writing should use a quiet margin mark: ${JSON.stringify(writingFocus)}`);
  assert.equal(writingFocus.textareaOutline, "none", `Focused writing should avoid a hard rectangular textarea outline: ${JSON.stringify(writingFocus)}`);
  await page.screenshot({ path: join(outputDir, "ln-076-composer-rework7-closed-390.png"), fullPage: false });
  assert.equal(await more.getAttribute("aria-expanded"), "false", "More should expose its closed disclosure state");
  const detailsId = await more.getAttribute("aria-controls");
  assert.ok(detailsId, "More should identify one stable controlled details region");
  const controlledDetails = composer.locator(`#${detailsId}`);
  assert.equal(await controlledDetails.count(), 1, "The controlled details region should remain stable while collapsed");
  assert.equal(await controlledDetails.isHidden(), true, "The stable details region should be hidden while collapsed");
  await assertMinTouchTarget(more, "LN-076 composer More");
  await more.click();
  assert.equal(await more.getAttribute("aria-expanded"), "true", "More should expose its expanded disclosure state");

  const details = composer.locator(`#${detailsId}`);
  const fields = details.locator(".composer-detail-fields");
  const attachments = details.locator(".composer-attachments");
  const danger = details.locator(".composer-danger-footer");
  await assertVisible(details);
  await assertVisible(fields);
  await assertVisible(attachments);
  await assertVisible(danger);
  await assertMinTouchTarget(attachments.getByRole("button", { name: "Add image" }), "LN-076 composer attachment action");
  await assertMinTouchTarget(danger.getByRole("button", { name: "Delete record" }), "LN-076 composer delete action");

  const responsive = [];
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px expanded LN-076 composer`);
    const metrics = await composer.evaluate((surface) => {
      const surfaceBox = surface.getBoundingClientRect();
      const writing = surface.querySelector(".writing-area").getBoundingClientRect();
      const fieldsBox = surface.querySelector(".composer-detail-fields").getBoundingClientRect();
      const attachmentsBox = surface.querySelector(".composer-attachments").getBoundingClientRect();
      const dangerBox = surface.querySelector(".composer-danger-footer").getBoundingClientRect();
      const detailsBox = surface.querySelector(".composer-details").getBoundingClientRect();
      const controlBoxes = [...surface.querySelectorAll(".composer-details input, .composer-details select, .composer-details button")]
        .filter((control) => !control.classList.contains("visually-hidden") && getComputedStyle(control).display !== "none")
        .map((control) => control.getBoundingClientRect());
      return {
        writingHeight: writing.height,
        writingBeforeDetails: writing.bottom <= detailsBox.top + 1,
        fieldsBeforeAttachments: fieldsBox.bottom <= attachmentsBox.top + 1,
        attachmentsBeforeDanger: attachmentsBox.bottom <= dangerBox.top + 1,
        dangerBorderTopWidth: Number.parseFloat(getComputedStyle(surface.querySelector(".composer-danger-footer")).borderTopWidth),
        detailControlOverflow: Math.max(0, ...controlBoxes.flatMap((box) => [surfaceBox.left - box.left, box.right - surfaceBox.right])),
        minDetailControlHeight: Math.min(...controlBoxes.map((box) => box.height)),
        surfaceScrollHeight: surface.scrollHeight,
        surfaceClientHeight: surface.clientHeight
      };
    });
    assert.ok(metrics.writingHeight >= 160, `${viewport.width}px expanded composer should keep a usable writing leaf: ${JSON.stringify(metrics)}`);
    if (viewport.width <= 426) {
      assert.ok(metrics.writingHeight <= 280, `${viewport.width}px expanded composer should yield height to requested details: ${JSON.stringify(metrics)}`);
    }
    assert.equal(metrics.writingBeforeDetails, true, `${viewport.width}px writing should precede details: ${JSON.stringify(metrics)}`);
    assert.equal(metrics.fieldsBeforeAttachments, true, `${viewport.width}px metadata should precede attachments: ${JSON.stringify(metrics)}`);
    assert.equal(metrics.attachmentsBeforeDanger, true, `${viewport.width}px attachments should precede deletion: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.dangerBorderTopWidth >= 1, `${viewport.width}px deletion should have a visible section boundary: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.detailControlOverflow <= 1, `${viewport.width}px detail controls should remain inside the composer edge: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.minDetailControlHeight >= 43.99, `${viewport.width}px visible detail controls should keep 44px targets: ${JSON.stringify(metrics)}`);
    responsive.push({ viewport, ...metrics });
    await page.screenshot({
      path: join(outputDir, `ln-076-composer-rework7-expanded-${viewport.width}.png`),
      fullPage: false
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await danger.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(outputDir, "ln-076-composer-rework7-danger-390.png"), fullPage: false });
  await textarea.scrollIntoViewIfNeeded();
  await textarea.focus();
  await page.keyboard.press("Tab");
  const composerHero = composer.locator("[data-content-improvement-trigger]");
  assert.equal(await composerHero.evaluate((button) => document.activeElement === button), true, "Tab should move from writing to the in-paper Hero");
  await assertMinTouchTarget(composerHero, "LN-078 keyboard Hero target");
  await page.keyboard.press("Tab");
  assert.equal(await more.evaluate((button) => document.activeElement === button), true, "Tab should move from the in-paper Hero to More");
  const focus = await more.evaluate((button) => ({
    visible: button.matches(":focus-visible"),
    outlineStyle: getComputedStyle(button).outlineStyle,
    outlineWidth: Number.parseFloat(getComputedStyle(button).outlineWidth)
  }));
  assert.equal(focus.visible, true, `More should expose keyboard focus: ${JSON.stringify(focus)}`);
  assert.notEqual(focus.outlineStyle, "none", `More should keep a visible focus outline: ${JSON.stringify(focus)}`);
  assert.ok(focus.outlineWidth >= 2, `More focus should remain at least 2px: ${JSON.stringify(focus)}`);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotion = await composer.evaluate((surface) => {
    const nodes = [surface, surface.querySelector(".writing-area"), surface.querySelector(".composer-details")];
    return nodes.map((node) => getComputedStyle(node).transitionDuration)
      .flatMap((value) => value.split(","))
      .every((value) => Number.parseFloat(value) <= .001);
  });
  assert.equal(reducedMotion, true, "Reduced motion should remove composer layout traversal");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const editedContent = `${originalContent}原文逐字保留。`;
  await textarea.fill(editedContent);
  await composer.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".timeline .entry", { hasText: editedContent }));
  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 });
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "zh-CN"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".timeline .entry", { hasText: editedContent }).locator("[data-entry-content-action]").click();
  const zhComposer = page.locator("[data-inline-record-editor]");
  await page.locator("nextjs-portal").evaluateAll((portals) => portals.forEach((portal) => { portal.style.display = "none"; }));
  await page.screenshot({ path: join(outputDir, "ln-076-composer-rework7-closed-zh-390.png"), fullPage: false });
  await zhComposer.getByRole("button", { name: "更多" }).click();
  await assertNoHorizontalOverflow(page, "390px Chinese expanded LN-076 composer");
  await page.screenshot({ path: join(outputDir, "ln-076-composer-rework7-expanded-zh-390.png"), fullPage: false });
  const zhDelete = zhComposer.getByRole("button", { name: "删除记录" });
  await zhDelete.scrollIntoViewIfNeeded();
  await assertMinTouchTarget(zhDelete, "LN-076 Chinese composer delete action");
  await page.screenshot({ path: join(outputDir, "ln-076-composer-rework7-danger-zh-390.png"), fullPage: false });
  await writeFile(join(outputDir, "ln-076-composer-rework7-evidence.json"), JSON.stringify({
    disclosure: { id: detailsId, expanded: true },
    responsive,
    focus,
    reducedMotion,
    exactContent: editedContent,
    localizedEvidence: "zh-CN"
  }, null, 2));
});

test("composer content improvement: Hero offers one compact same-paper proposal with explicit use", async (page) => {
  const routePattern = "**/api/records/improve";
  const captured = [];
  let responseMode = "success";
  let releaseDelayed = null;
  const improvementHandler = async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    captured.push({ body, headers: await request.allHeaders() });
    if (responseMode === "delayed") {
      await new Promise((resolve) => { releaseDelayed = resolve; });
    }
    try {
      if (responseMode === "failure") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "AI_NOT_CONFIGURED", message: "unavailable" } })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "private, no-store" },
        body: JSON.stringify({
          schemaVersion: body.schemaVersion,
          requestId: body.requestId,
          target: body.target,
          sourceFingerprint: body.sourceFingerprint,
          improvedContent: `${body.content}\n\nA clearer final sentence.`
        })
      });
    } catch {
      // Editing or closing the draft can abort the request before a delayed fixture is released.
    }
  };
  await page.route(routePattern, improvementHandler);

  const storageBefore = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await page.getByRole("button", { name: "Add record" }).click();
  const composer = page.locator(".surface.composer");
  const writing = composer.locator(".writing-area");
  const textarea = writing.locator("textarea");
  const hero = writing.locator("[data-content-improvement-trigger]");
  const done = composer.getByRole("button", { name: "Done" });
  await assertVisible(hero, "The ordinary free-text paper should expose the existing Hero as the improvement target");
  await assertMinTouchTarget(hero, "Composer Hero improvement target");
  assert.equal(await composer.locator("textarea").count(), 1, "Content improvement must not add a chat textarea");
  assert.equal(await composer.locator("[data-agent-chat], .agent-review-panel").count(), 0, "Content improvement must not mount Diary chat chrome");

  await hero.click();
  await assertVisible(writing.getByText("Write something first, then tap Hero."));
  assert.equal(captured.length, 0, "Blank content must not create a request");

  await textarea.fill("x".repeat(4001));
  await hero.click();
  await assertVisible(writing.getByText(/within 4000 characters/));
  assert.equal(captured.length, 0, "Over-limit content must not be truncated or sent");

  const source = "First sentence with **facts**. Keep the meaning and Markdown.";
  await textarea.fill(source);
  responseMode = "delayed";
  releaseDelayed = null;
  const firstRequest = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/records/improve");
  await hero.click();
  await firstRequest;
  await assertVisible(writing.getByRole("status").filter({ hasText: "Refining…" }));
  assert.equal(await hero.isDisabled(), true, "Pending state must disable duplicate Hero requests");
  await hero.click({ force: true });
  await page.waitForTimeout(50);
  assert.equal(captured.length, 1, "One Hero activation must create at most one request while pending");
  assert.equal(await done.isDisabled(), true, "Done must not save while a proposal is pending");
  releaseDelayed();
  await assertVisible(composer.getByRole("button", { name: "Use improved draft" }));

  assert.deepEqual(Object.keys(captured[0].body).sort(), ["content", "locale", "requestId", "schemaVersion", "sourceFingerprint", "target"]);
  assert.equal(captured[0].body.content, source, "The provider must receive the exact current free-text draft");
  assert.match(captured[0].body.target, /^composer_/);
  assert.match(captured[0].headers.authorization, /^Bearer /);
  for (const forbidden of ["categoryId", "tags", "attachments", "date", "time", "recordId", "accountId"]) {
    assert.equal(Object.hasOwn(captured[0].body, forbidden), false, `Improvement payload must omit ${forbidden}`);
  }
  assert.equal(await textarea.isEditable(), false, "The candidate should be inert until explicitly used");
  assert.equal(await textarea.inputValue(), `${source}\n\nA clearer final sentence.`);
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), storageBefore, "Receiving a candidate must not persist it");
  assert.equal(await done.isDisabled(), true, "Done must remain unavailable until the proposal is resolved");

  const viewOriginal = composer.getByRole("button", { name: "View original" });
  const useImproved = composer.getByRole("button", { name: "Use improved draft" });
  const cancel = composer.getByRole("button", { name: "Cancel", exact: true });
  for (const [control, label] of [[viewOriginal, "view original"], [useImproved, "use improved"], [cancel, "cancel improvement"]]) {
    await assertMinTouchTarget(control, `Composer improvement ${label}`);
  }
  await viewOriginal.click();
  assert.equal(await textarea.inputValue(), source, "View original should stay in the same writing area");
  await composer.getByRole("button", { name: "View improved" }).click();
  assert.equal(await textarea.inputValue(), `${source}\n\nA clearer final sentence.`);
  await cancel.click();
  assert.equal(await textarea.inputValue(), source, "Cancel must restore the untouched draft");
  assert.equal(await textarea.isEditable(), true);
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), storageBefore, "Cancel must be zero-write");

  responseMode = "delayed";
  releaseDelayed = null;
  const staleSource = "This response will become stale.";
  const currentSource = "Current source after the pending request.";
  await textarea.fill(staleSource);
  const staleRequest = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/records/improve");
  await hero.click();
  await staleRequest;
  await textarea.fill(currentSource);
  for (let attempt = 0; !releaseDelayed && attempt < 20; attempt += 1) await page.waitForTimeout(10);
  releaseDelayed?.();
  await page.waitForTimeout(100);
  assert.equal(await textarea.inputValue(), currentSource, "Editing during a request must invalidate the late proposal");
  assert.equal(await composer.locator(".content-improvement-actions").count(), 0, "A stale response must not enter review");

  responseMode = "failure";
  await hero.click();
  await assertVisible(writing.getByText("Couldn’t improve this draft. Your text is unchanged."));
  assert.equal(await textarea.inputValue(), currentSource, "Provider failure must leave the draft untouched");
  assert.equal(await done.isEnabled(), true, "Manual save must remain available after failure");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), storageBefore, "Provider failure must be zero-write");

  responseMode = "success";
  await hero.click();
  await assertVisible(composer.getByRole("button", { name: "Use improved draft" }));
  await textarea.focus();
  await page.keyboard.press("Escape");
  assert.equal(await composer.locator(".content-improvement-actions").count(), 0, "Escape must cancel the current candidate");
  assert.equal(await textarea.inputValue(), currentSource, "Escape must return to the untouched source");
  assert.equal(await textarea.evaluate((element) => document.activeElement === element), true, "Canceling with Escape must restore writing focus");

  await hero.click();
  await assertVisible(composer.getByRole("button", { name: "Use improved draft" }));
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px composer content improvement`);
    const geometry = await writing.evaluate((node) => {
      const box = (selector) => {
        const element = node.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left } : null;
      };
      const writingBox = node.getBoundingClientRect();
      const textareaStyle = getComputedStyle(node.querySelector("textarea"));
      return {
        writing: { top: writingBox.top, right: writingBox.right, bottom: writingBox.bottom, left: writingBox.left },
        hero: box(".composer-agent-hero"),
        actions: box(".content-improvement-actions"),
        textareaPaddingRight: Number.parseFloat(textareaStyle.paddingRight),
        textareaPaddingBottom: Number.parseFloat(textareaStyle.paddingBottom)
      };
    });
    assert.ok(geometry.hero.left >= geometry.writing.left && geometry.hero.right <= geometry.writing.right + 1, `${viewport.width}px Hero must stay inside the writing paper: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.actions.left >= geometry.writing.left && geometry.actions.right <= geometry.writing.right + 1, `${viewport.width}px proposal actions must stay inside the writing paper: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.textareaPaddingRight >= 64 && geometry.textareaPaddingBottom >= 90, `${viewport.width}px text must reserve space for Hero and proposal actions: ${JSON.stringify(geometry)}`);
    for (const control of await composer.locator(".content-improvement-actions button").all()) {
      await assertMinTouchTarget(control, `${viewport.width}px composer improvement action`);
    }
    await page.screenshot({ path: join(outputDir, `ln-078-composer-improvement-${viewport.width}.png`), fullPage: false });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const accepted = `${currentSource}\n\nA clearer final sentence.`;
  await composer.getByRole("button", { name: "Use improved draft" }).click();
  assert.equal(await textarea.inputValue(), accepted, "Use improved draft should update only the current draft");
  assert.equal(await textarea.isEditable(), true);
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), storageBefore, "Using the proposal must still wait for Done before persistence");
  await done.click();
  await assertVisible(page.locator(".timeline .entry", { hasText: "A clearer final sentence." }));

  await page.getByRole("button", { name: "Add record" }).click();
  const structuredComposer = page.locator(".surface.composer");
  await structuredComposer.locator(".template-select select").selectOption("meal");
  await assertVisible(structuredComposer.locator(".structured-writing-area"));
  assert.equal(await structuredComposer.locator("[data-content-improvement-trigger]").count(), 0, "Structured editors must not expose draft rewriting");
  await structuredComposer.getByRole("button", { name: "Close" }).click();

  await page.goto(`${baseURL}/?newTemplate=morning-weight&date=${testDate}`, { waitUntil: "domcontentloaded" });
  const periodicComposer = page.locator(".surface.composer");
  await assertVisible(periodicComposer.locator(".fixed-writing-area"));
  assert.equal(await periodicComposer.locator("[data-content-improvement-trigger]").count(), 0, "Periodic value editors must not expose draft rewriting");
  await periodicComposer.getByRole("button", { name: "Close" }).click();
  await page.unroute(routePattern, improvementHandler);
});

test("home reference UI: one full-height mobile rail connects utilities, content sections, and record actions", async (page) => {
  const currentWeekday = new Date(`${testDate}T12:00:00.000Z`).getUTCDay();
  const railRightmostDate = shiftDate(testDate, ((6 - currentWeekday + 7) % 7) || 7);
  await page.evaluate(({ date, rightmostDate }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.domains = state.domains.map((domain) => domain.id === "learning-domain"
      ? { ...domain, name: "A deliberately long learning domain" }
      : domain);
    state.entries.push(
      { id: "rail-daily", date, time: "09:10", content: "Plan the day", categoryId: "daily", tags: [], templateId: "quick", fieldValues: {}, attachments: [], createdAt: 1 },
      { id: "rail-health", date, time: "10:20", content: "Lunch notes", categoryId: "health-food", tags: [], templateId: "meal", fieldValues: {}, attachments: [], createdAt: 2 },
      { id: "rail-learning", date, time: "11:30", content: "Read a chapter", categoryId: "study", tags: [], templateId: "learn", fieldValues: {}, attachments: [], createdAt: 3 },
      { id: "rail-calendar-rightmost", date: rightmostDate, time: "08:00", content: "Reach the rightmost calendar day", categoryId: "daily", tags: [], templateId: "quick", fieldValues: {}, attachments: [], createdAt: 4 }
    );
    for (let index = 0; index < 6; index += 1) {
      const domainId = `rail-overflow-domain-${index}`;
      const categoryId = `rail-overflow-category-${index}`;
      state.domains.push({ id: domainId, name: `Overflow domain ${index + 1}`, order: 100 + index });
      state.categories.push({ id: categoryId, domainId, name: `Overflow topic ${index + 1}`, order: 0 });
      state.entries.push({ id: `rail-overflow-entry-${index}`, date, time: `1${index}:40`, content: `Overflow note ${index + 1}`, categoryId, tags: [], templateId: "quick", fieldValues: {}, attachments: [], createdAt: 10 + index });
    }
    window.localStorage.setItem(key, JSON.stringify(state));
  }, { date: testDate, rightmostDate: railRightmostDate });
  await page.reload({ waitUntil: "domcontentloaded" });

  const paperSurface = await page.evaluate(() => {
    const bodyStyle = getComputedStyle(document.body);
    return {
      backgroundColor: bodyStyle.backgroundColor,
      backgroundImage: bodyStyle.backgroundImage,
      backgroundRepeat: bodyStyle.backgroundRepeat,
      backgroundSize: bodyStyle.backgroundSize
    };
  });
  assert.match(paperSurface.backgroundImage, /paper-texture\.svg/, `The home surface should use the local book-page texture: ${JSON.stringify(paperSurface)}`);
  assert.equal(paperSurface.backgroundRepeat, "repeat", `The paper texture should cover long diary pages continuously: ${JSON.stringify(paperSurface)}`);
  assert.equal(paperSurface.backgroundSize, "360px 360px", `The paper fiber scale should remain quiet and stable: ${JSON.stringify(paperSurface)}`);

  const viewToggle = page.locator('[data-edge-rail-item="record-view"]');
  const workspaceToggle = page.locator('[data-edge-rail-item="workspace"]');
  const dateDisclosure = page.locator(".home-date-title .date-context-disclosure");
  const addRecord = page.getByRole("button", { name: "Add record", exact: true });
  const exportCurrent = page.getByRole("button", { name: /^Export .* Markdown$/ });
  const search = page.getByRole("button", { name: "Search", exact: true });
  const settings = page.getByRole("button", { name: "Settings", exact: true });
  const organizer = page.locator(".organize-helper");
  const edgeRail = page.locator(".home-edge-rail-brush");

  await assertVisible(search);
  await assertVisible(viewToggle);
  await assertVisible(workspaceToggle);
  await assertVisible(settings);
  assert.equal(await settings.getAttribute("type"), "button", "Home Settings should be an in-page tool button, not a route link");
  assert.equal(await page.locator(".brand, .language-toggle, .search-wide").count(), 0, "The compact home header should remove the old brand, language, and wide search controls");
  assert.equal(await page.locator('.topbar a[href="/templates"]').count(), 0, "Record setup should no longer live in the home header");
  assert.equal(await page.locator(".topbar .top-actions .icon-button:visible").count(), 3, "Search, settings, and record view should own the compact upper rail tools");
  assert.equal(await page.locator(".home-calendar-button, .workspace-mode-switch").count(), 0, "Calendar and workspace should not retain retired parallel controls");
  assert.equal(await page.locator(".topbar .top-actions .icon-button svg").count(), 0, "Right-rail utilities should use the generated hand-drawn PNG family rather than mixed SVG icons");
  const expectedUtilityIcons = [
    [search, "/ui/diary/rail-search.png"],
    [settings, "/ui/diary/rail-settings.png"]
  ];
  for (const [control, expectedIcon] of expectedUtilityIcons) {
    const icon = control.locator(".home-edge-rail-icon img");
    await assertVisible(icon, "Each utility should expose one recognizable hand-drawn icon");
    assert.equal(new URL(await icon.getAttribute("src"), baseURL).pathname, expectedIcon, "Each utility should use its matching rail icon asset");
    assert.equal((await control.textContent()).trim(), "", "Icon-only rail utilities should not repeat visible text labels");
    assert.equal(await control.locator(".home-edge-rail-label, .home-edge-rail-hole").count(), 0, "The icon should replace the old label plus binding-hole pair");
  }
  const railIconStyles = await page.evaluate(() => {
    const utility = document.querySelector(".home-search-button .home-edge-rail-icon");
    const directory = document.querySelector(".domain-directory-node > span");
    const utilityStyle = getComputedStyle(utility);
    const directoryStyle = getComputedStyle(directory);
    return {
      utilityWidth: utility.getBoundingClientRect().width,
      utilityHeight: utility.getBoundingClientRect().height,
      utilityOpacity: Number.parseFloat(utilityStyle.opacity),
      directoryFontSize: Number.parseFloat(directoryStyle.fontSize),
      directoryFontFamily: directoryStyle.fontFamily,
      directoryWritingMode: directoryStyle.writingMode,
      directoryUnderline: directoryStyle.textDecorationLine,
      directoryWeight: Number.parseFloat(directoryStyle.fontWeight)
    };
  });
  assert.ok(railIconStyles.utilityWidth >= 23 && railIconStyles.utilityWidth <= 30 && railIconStyles.utilityHeight >= 23 && railIconStyles.utilityHeight <= 30, `Utility icons should stay compact inside 44px targets: ${JSON.stringify(railIconStyles)}`);
  assert.ok(railIconStyles.utilityOpacity >= 0.55, `Utility icons should remain recognizable without competing with the diary: ${JSON.stringify(railIconStyles)}`);
  assert.match(railIconStyles.directoryFontFamily, /Instrument Serif/i, `Directory labels should retain the editorial serif treatment: ${JSON.stringify(railIconStyles)}`);
  assert.ok(Math.abs(railIconStyles.directoryFontSize - 16) <= 0.1, `Directory labels should use the 16px content-index role: ${JSON.stringify(railIconStyles)}`);
  assert.equal(railIconStyles.directoryUnderline, "none", `Directory labels should remain content indexes rather than utility controls: ${JSON.stringify(railIconStyles)}`);
  assert.equal(await viewToggle.getAttribute("data-view-mode"), "timeline");
  assert.equal(await workspaceToggle.getAttribute("data-workspace-mode"), "diary");
  await assertVisible(organizer, "A day with ordinary records should expose the functional Agent illustration");
  assert.equal(await organizer.getAttribute("type"), "button", "The Agent should wake in place instead of navigating to another workspace");
  assert.equal(await organizer.getAttribute("data-date"), testDate, "The Agent should review the selected date");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(220);

  const timelineRailAlignment = await page.evaluate(() => {
    const node = document.querySelector('.domain-directory-node[data-section-id="timeline:records"]');
    const heading = document.querySelector("#timeline-records-heading");
    const directory = document.querySelector(".domain-directory-scroll");
    const nodeBox = node.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    const directoryBox = directory.getBoundingClientRect();
    return {
      nodeCenter: nodeBox.top + nodeBox.height / 2,
      headingCenter: headingBox.top + headingBox.height / 2,
      directoryTop: directoryBox.top,
      directoryBottom: directoryBox.bottom
    };
  });
  const expectedTimelineNodeCenter = Math.min(
    timelineRailAlignment.directoryBottom - 26,
    Math.max(timelineRailAlignment.directoryTop + 26, timelineRailAlignment.headingCenter)
  );
  assert.ok(Math.abs(timelineRailAlignment.nodeCenter - expectedTimelineNodeCenter) <= 3, `The Record point should align to the title when possible and clamp to the usable directory edge when compact content begins above it: ${JSON.stringify(timelineRailAlignment)}`);

  await setRecordView(page, "grouped");
  await assertVisible(page.locator(".domain-directory-rail"));
  assert.equal(await page.locator(".domain-directory-node").count(), 9, "The directory should contain only domains with content on the selected day, including an overflowing list");
  assert.equal(await page.locator(".record-domain").count(), 9, "Directory nodes should map one-to-one to visible domain sections");
  assert.equal(await page.locator('.domain-directory-node[aria-current="location"]').count(), 1, "Exactly one domain should be current");
  assert.equal(await page.locator('.domain-directory-node[data-domain-id="learning-domain"]').getAttribute("aria-label"), "Jump to A deliberately long learning domain", "Truncated labels must keep their full accessible name");
  const longDirectoryLabel = await page.locator('.domain-directory-node[data-domain-id="learning-domain"] > span').evaluate((label) => {
    const box = label.getBoundingClientRect();
    const style = getComputedStyle(label);
    return { width: box.width, height: box.height, whiteSpace: style.whiteSpace, overflow: style.overflow, writingMode: style.writingMode };
  });
  assert.ok(longDirectoryLabel.width <= 20.5 && longDirectoryLabel.height <= 48.5, `A long vertical directory label should remain one clipped column: ${JSON.stringify(longDirectoryLabel)}`);
  assert.equal(longDirectoryLabel.whiteSpace, "nowrap", `A long directory name should truncate instead of growing extra columns: ${JSON.stringify(longDirectoryLabel)}`);
  assert.equal(longDirectoryLabel.overflow, "hidden", `A long directory name should stay inside its visual label slot: ${JSON.stringify(longDirectoryLabel)}`);

  for (const viewport of [
    { width: 320, height: 844, name: "ln-075-unified-rail-320.png" },
    { width: 390, height: 844, name: "ln-075-unified-rail-390.png" },
    { width: 426, height: 923, name: "ln-075-unified-rail-426.png" },
    { width: 600, height: 900, name: "ln-075-unified-rail-600.png" },
    { width: 671, height: 900, name: "ln-075-unified-rail-671.png" },
    { width: 700, height: 900, name: "ln-075-unified-rail-700.png" },
    { width: 768, height: 900, name: "ln-075-unified-rail-768.png" },
    { width: 1280, height: 720, name: "ln-075-unified-rail-1280.png" }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(80);
    await assertNoHorizontalOverflow(page, `${viewport.width}px reference home`);
    for (const [control, label] of [[dateDisclosure, "date disclosure"], [viewToggle, "record view"], [workspaceToggle, "workspace"], [exportCurrent, "export"], [addRecord, "add record"], [search, "search"], [settings, "settings"]]) {
      await assertMinTouchTarget(control, `${viewport.width}px ${label}`);
    }
    const railDisplay = await page.locator(".domain-directory-rail").evaluate((node) => getComputedStyle(node).display);
    assert.equal(railDisplay === "none", viewport.width > 700, `${viewport.width}px should ${viewport.width > 700 ? "hide" : "show"} the domain directory`);
    if (viewport.width <= 700) {
      await assertVisible(edgeRail, `${viewport.width}px should keep one full-height rail visible`);
      for (const node of await page.locator(".domain-directory-node").all()) await assertMinTouchTarget(node, `${viewport.width}px domain directory node`);
      const railGeometry = await page.evaluate(() => {
        const box = (selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 };
        };
        const line = box(".home-edge-rail-brush");
        const domainMarks = [...document.querySelectorAll(".domain-directory-node > img")].map((node) => {
          const rect = node.getBoundingClientRect();
          return { centerX: rect.left + rect.width / 2, width: rect.width, height: rect.height, src: node.getAttribute("src") };
        });
        const domainTargets = [...document.querySelectorAll(".domain-directory-node")].map((node) => {
          const rect = node.getBoundingClientRect();
          return { centerX: rect.left + rect.width / 2, width: rect.width, active: node.getAttribute("aria-current") === "location" };
        });
        const domainLabels = [...document.querySelectorAll(".domain-directory-node > span")].map((label) => {
          const rect = label.getBoundingClientRect();
          return { centerX: rect.left + rect.width / 2, active: label.parentElement.getAttribute("aria-current") === "location" };
        });
        const insights = document.querySelector(".domain-directory-insights-link");
        return {
          viewportHeight: window.innerHeight,
          line,
          search: box(".home-search-button"),
          searchIcon: box(".home-search-button .home-edge-rail-icon"),
          recordView: box('[data-edge-rail-item="record-view"]'),
          workspace: box('[data-edge-rail-item="workspace"]'),
          settings: box(".home-settings-button"),
          settingsIcon: box(".home-settings-button .home-edge-rail-icon"),
          directory: box(".domain-directory-rail"),
          exportAction: box(".export-fab"),
          exportIcon: box(".export-rail-icon"),
          recordAction: box(".fab"),
          title: box(".home-title-cluster"),
          lineSource: document.querySelector(".home-edge-rail-brush").getAttribute("src"),
          toolsPosition: getComputedStyle(document.querySelector(".top-actions")).position,
          domainMarks,
          domainTargets,
          domainLabels,
          insights: insights ? box(".domain-directory-insights-link") : null
        };
      });
      const alignedCenters = [
        ...railGeometry.domainMarks.map((mark) => mark.centerX)
      ];
      for (const center of alignedCenters) {
        assert.ok(Math.abs(center - railGeometry.line.centerX) <= 1.5, `${viewport.width}px rail item should share the line axis: ${JSON.stringify({ center, railGeometry })}`);
      }
      for (const [control, icon] of [
        [railGeometry.search, railGeometry.searchIcon],
        [railGeometry.settings, railGeometry.settingsIcon]
      ]) {
        const controlOffset = control.centerX - railGeometry.line.centerX;
        const iconOffset = icon.centerX - railGeometry.line.centerX;
        assert.ok(controlOffset >= 26 && controlOffset <= 30, `${viewport.width}px utility target should sit to the right of the binding rail: ${JSON.stringify({ controlOffset, railGeometry })}`);
        assert.ok(iconOffset >= 26 && iconOffset <= 30, `${viewport.width}px utility icon should sit to the right of the binding rail: ${JSON.stringify({ iconOffset, railGeometry })}`);
        assert.ok(Math.abs(control.centerX - icon.centerX) <= 1, `${viewport.width}px utility icon should remain centered in its touch target: ${JSON.stringify({ control, icon })}`);
      }
      for (const control of [railGeometry.recordView, railGeometry.workspace]) {
        const controlOffset = control.centerX - railGeometry.line.centerX;
        assert.ok(controlOffset >= 26 && controlOffset <= 30, `${viewport.width}px text toggle should sit to the right of the binding rail: ${JSON.stringify({ controlOffset, railGeometry })}`);
      }
      const controlAxis = railGeometry.search.centerX;
      assert.ok(railGeometry.domainTargets.some((target) => target.active) && railGeometry.domainTargets.some((target) => !target.active), `${viewport.width}px alignment regression needs both current and ordinary directory targets: ${JSON.stringify(railGeometry)}`);
      for (const target of railGeometry.domainTargets) {
        assert.ok(Math.abs(target.centerX - controlAxis) <= 1, `${viewport.width}px directory targets should share the upper-control axis with or without an insights action: ${JSON.stringify({ target, controlAxis, railGeometry })}`);
        assert.ok(Math.abs(target.width - 44) <= .5, `${viewport.width}px directory targets should retain one 44px hit area: ${JSON.stringify({ target, railGeometry })}`);
      }
      for (const label of railGeometry.domainLabels) {
        assert.ok(Math.abs(label.centerX - controlAxis) <= 1, `${viewport.width}px directory labels should share one visible axis regardless of whether an adjacent action exists: ${JSON.stringify({ label, controlAxis, railGeometry })}`);
      }
      assert.ok(railGeometry.insights && Math.abs(railGeometry.insights.centerX - controlAxis) <= 1, `${viewport.width}px insights action should continue the same visible/control axis: ${JSON.stringify(railGeometry)}`);
      assert.ok(railGeometry.exportAction.right <= railGeometry.recordAction.left + 1, `${viewport.width}px same-day export should sit to the left of the record stamp: ${JSON.stringify(railGeometry)}`);
      assert.ok(Math.abs(railGeometry.exportAction.centerY - railGeometry.recordAction.centerY) <= 1, `${viewport.width}px export and record actions should share one horizontal center line: ${JSON.stringify(railGeometry)}`);
      assert.ok(railGeometry.recordAction.centerX > railGeometry.line.centerX, `${viewport.width}px the record stamp should remain on the quick-action side of the binding rail: ${JSON.stringify(railGeometry)}`);
      assert.ok(Math.abs(railGeometry.line.top) <= 0.5 && Math.abs(railGeometry.line.height - railGeometry.viewportHeight) <= 1, `${viewport.width}px rail brush should span the full viewport: ${JSON.stringify(railGeometry)}`);
      assert.ok(Math.abs(railGeometry.line.width - 4) <= 0.5, `${viewport.width}px rail brush should use a narrow 4px transparent slot with an irregular 1px optical stroke: ${JSON.stringify(railGeometry)}`);
      assert.match(railGeometry.lineSource, /rail-brush-handdrawn\.png$/, `${viewport.width}px should use the generated hand-drawn vertical brush asset: ${JSON.stringify(railGeometry)}`);
      assert.ok(railGeometry.domainMarks.every((mark) => Math.abs(mark.width - 12) <= 0.5 && Math.abs(mark.height - 12) <= 0.5), `${viewport.width}px domain marks should stay visually fine while their buttons retain large targets: ${JSON.stringify(railGeometry)}`);
      assert.ok(railGeometry.domainMarks.every((mark) => /rail-node-(?:idle|active)-fine\.png$/.test(mark.src)), `${viewport.width}px directory states should use the fine transparent node family: ${JSON.stringify(railGeometry)}`);
      assert.equal(railGeometry.toolsPosition, "fixed", `${viewport.width}px upper tools should be fixed to the rail: ${JSON.stringify(railGeometry)}`);
      const orderedTools = [railGeometry.search, railGeometry.settings, railGeometry.recordView];
      orderedTools.slice(1).forEach((control, index) => {
        const previous = orderedTools[index];
        assert.ok(previous.bottom <= control.top + 0.5, `${viewport.width}px upper tools should not overlap: ${JSON.stringify(railGeometry)}`);
        assert.ok(Math.abs(control.top - previous.bottom - 4) <= 0.5, `${viewport.width}px upper tools should repeat a 4px rhythm: ${JSON.stringify(railGeometry)}`);
      });
      assert.ok(railGeometry.directory.top - railGeometry.recordView.bottom >= 24, `${viewport.width}px the content directory should begin as a separate semantic group at least 24px after the complete upper tool stack: ${JSON.stringify(railGeometry)}`);
      assert.ok(railGeometry.title.right <= railGeometry.search.left - 4, `${viewport.width}px title and date should leave the icon rail tools unobscured: ${JSON.stringify(railGeometry)}`);
    } else {
      await assertHidden(edgeRail, `${viewport.width}px should hide the mobile full-height rail`);
    }
    const layout = await page.locator(".topbar").evaluate((header) => {
      const date = header.querySelector(".date-context-date");
      const weekday = header.querySelector(".date-context-weekday");
      const actions = header.querySelector(".top-actions");
      const title = header.querySelector(".home-title-cluster");
      const box = (element) => element.getBoundingClientRect();
      return {
        dateSize: Number.parseFloat(getComputedStyle(date).fontSize),
        weekdaySize: Number.parseFloat(getComputedStyle(weekday).fontSize),
        actionsPosition: getComputedStyle(actions).position,
        bottomBorderWidth: getComputedStyle(header).borderBottomWidth,
        afterBorderTopWidth: getComputedStyle(header, "::after").borderTopWidth,
        titleAndActionsShareRow: Math.abs((box(title).top + box(title).height / 2) - (box(actions).top + box(actions).height / 2)) <= 12
      };
    });
    assert.ok(layout.dateSize >= 32, `The date should remain the strongest mobile identity: ${JSON.stringify(layout)}`);
    assert.equal(layout.weekdaySize, 14, `The compact weekday should use 14px: ${JSON.stringify(layout)}`);
    assert.equal(layout.bottomBorderWidth, "0px", `Time and Category should not retain a horizontal divider below the title: ${JSON.stringify(layout)}`);
    assert.equal(layout.afterBorderTopWidth, "0px", `The removed title separator must not survive as a pseudo-element: ${JSON.stringify(layout)}`);
    if (viewport.width <= 700) {
      assert.equal(layout.actionsPosition, "fixed", `${viewport.width}px utilities should leave the title grid and sit on the rail: ${JSON.stringify(layout)}`);
    } else {
      assert.equal(layout.actionsPosition, "static", `${viewport.width}px desktop utilities should stay in the compact header: ${JSON.stringify(layout)}`);
      assert.equal(layout.titleAndActionsShareRow, true, `${viewport.width}px desktop should keep one compact header row: ${JSON.stringify(layout)}`);
    }
    await page.screenshot({ path: join(outputDir, viewport.name), fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.style.setProperty("--safe-top", "47px"));
  await page.waitForTimeout(80);
  const safeAreaGeometry = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect();
    const header = box(".topbar");
    const title = box(".home-title-cluster");
    const lastUpperTool = box('[data-edge-rail-item="record-view"]');
    const directory = box(".domain-directory-rail");
    return {
      headerHeight: header.height,
      titleTop: title.top,
      lastUpperToolBottom: lastUpperTool.bottom,
      directoryTop: directory.top,
      paddingTop: Number.parseFloat(getComputedStyle(document.querySelector(".topbar")).paddingTop)
    };
  });
  assert.equal(safeAreaGeometry.paddingTop, 47, `The mobile header should consume the simulated top safe area: ${JSON.stringify(safeAreaGeometry)}`);
  assert.ok(safeAreaGeometry.headerHeight >= 155 && safeAreaGeometry.titleTop >= 47, `The title should stay below the simulated notch: ${JSON.stringify(safeAreaGeometry)}`);
  assert.ok(safeAreaGeometry.directoryTop >= safeAreaGeometry.lastUpperToolBottom + 24, `The directory should start below the safe-area-adjusted complete upper tool stack: ${JSON.stringify(safeAreaGeometry)}`);
  await page.evaluate(() => document.documentElement.style.removeProperty("--safe-top"));
  await page.waitForTimeout(80);

  assert.equal(await page.evaluate(() => {
    const directory = document.querySelector(".domain-directory-rail");
    const workspace = document.querySelector(".home-workspace");
    return Boolean(directory.compareDocumentPosition(workspace) & Node.DOCUMENT_POSITION_FOLLOWING);
  }), true, "The domain directory should precede the record workspace in DOM and keyboard order");
  await settings.focus();
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.edgeRailItem), "record-view", "Tabbing after Settings should reach the remaining upper record-view rocker");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("organize-helper")), true, "Tabbing after the header tools should reach the persistent Diary companion");
  await assertMinTouchTarget(page.locator(".organize-helper:focus"), "Keyboard-focused Diary Agent");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("domain-directory-node")), true, "The visible domain directory should follow the companion before record controls");
  await page.waitForTimeout(220);
  const directoryFocus = await page.locator(".domain-directory-node:focus").evaluate((node) => {
    const loop = getComputedStyle(node, "::after");
    return { outlineWidth: getComputedStyle(node).outlineWidth, background: loop.backgroundImage, opacity: Number.parseFloat(loop.opacity) };
  });
  assert.equal(directoryFocus.outlineWidth, "0px", `Directory focus should not fall back to a hard rectangular browser outline: ${JSON.stringify(directoryFocus)}`);
  assert.match(directoryFocus.background, /record-focus-loop\.png/, `Directory focus should reuse the blue hand-drawn selection family: ${JSON.stringify(directoryFocus)}`);
  assert.ok(directoryFocus.opacity >= 0.99, `The focused directory node should expose a complete visible loop: ${JSON.stringify(directoryFocus)}`);

  const calendarTrigger = page.locator(".home-date-title .date-context-disclosure");
  await calendarTrigger.click();
  await assertHidden(page.locator(".domain-directory-rail"), "Opening the bounded month picker should suspend the interactive domain directory while keeping the rail brush");
  assert.equal(await page.locator(".domain-directory-rail").count(), 0, "Opening the month picker should unmount the domain directory instead of leaving an invisible overlay");
  await assertVisible(edgeRail, "The continuous rail brush should remain while the month picker is open");
  const rightmostCalendarDay = page.locator(`[data-calendar-date="${railRightmostDate}"]`);
  await assertVisible(rightmostCalendarDay);
  assert.equal(await rightmostCalendarDay.evaluate((day) => {
    const rect = day.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest(".calendar-day") === day;
  }), true, "The rightmost date button should own its center hit target without a directory overlay");
  await rightmostCalendarDay.click();
  assert.equal(await rightmostCalendarDay.getAttribute("aria-selected"), null, "Calendar selection is represented by the gridcell, not a duplicate button state");
  assert.equal(await rightmostCalendarDay.evaluate((day) => day.classList.contains("selected")), true, "The rightmost date should remain directly selectable in Category view");
  await calendarTrigger.click();
  await assertVisible(page.locator(".domain-directory-rail"), "Closing the picker should restore the directory when the selected day has a real domain");
  await page.reload({ waitUntil: "domcontentloaded" });
  await setRecordView(page, "grouped");
  await assertVisible(page.locator(".domain-directory-rail"));

  await page.evaluate((date) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    for (let index = 3; index < 6; index += 1) {
      state.entries.push({
        id: `rail-overflow-filler-${index}`,
        date,
        time: `2${index}:10`,
        content: Array.from({ length: index === 5 ? 54 : 18 }, (_, line) => `Overflow ${index + 1} detail ${line + 1}`).join("\n"),
        categoryId: `rail-overflow-category-${index}`,
        tags: [],
        templateId: "quick",
        fieldValues: {},
        attachments: [],
        createdAt: 30 + index
      });
    }
    window.localStorage.setItem(key, JSON.stringify(state));
  }, testDate);
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: join(outputDir, "ln-074-agent-idle-390.png"), fullPage: false });
  await setRecordView(page, "grouped");
  await assertVisible(page.locator(".domain-directory-rail"));
  const overflowingRail = page.locator(".domain-directory-scroll");
  const railOverflow = await overflowingRail.evaluate((node) => ({ scrollHeight: node.scrollHeight, clientHeight: node.clientHeight }));
  assert.ok(railOverflow.scrollHeight > railOverflow.clientHeight, `The long directory should have its own scroll range: ${JSON.stringify(railOverflow)}`);
  const brushBeforeRailScroll = await edgeRail.boundingBox();
  await overflowingRail.evaluate((node) => node.scrollTo({ top: node.scrollHeight, behavior: "auto" }));
  const brushAfterRailScroll = await edgeRail.boundingBox();
  assert.ok(Math.abs(brushBeforeRailScroll.y - brushAfterRailScroll.y) <= 0.5 && Math.abs(brushBeforeRailScroll.height - brushAfterRailScroll.height) <= 0.5, "The hand-drawn rail stroke should stay fixed while labels scroll internally");
  await overflowingRail.evaluate((node) => node.scrollTo({ top: 0, behavior: "auto" }));
  assert.equal(await overflowingRail.evaluate((node) => node.scrollTop), 0, "The automatic reveal check should begin with later directory nodes offscreen");

  const autoScrollTargetId = "rail-overflow-domain-5";
  await page.locator(`.record-domain[data-domain-id="${autoScrollTargetId}"]`).evaluate((node) => {
    const absoluteTop = node.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: absoluteTop - 120, behavior: "auto" });
  });
  await page.waitForTimeout(500);
  const scrollSpyState = await page.evaluate((targetId) => ({
    activeId: document.querySelector('.domain-directory-node[aria-current="location"]')?.dataset.domainId || null,
    documentBottom: document.documentElement.scrollHeight - window.innerHeight,
    scrollY: window.scrollY,
    targetTop: document.querySelector(`.record-domain[data-domain-id="${targetId}"]`)?.getBoundingClientRect().top ?? null
  }), autoScrollTargetId);
  assert.equal(scrollSpyState.activeId, autoScrollTargetId, `Page scrolling should update the current directory node: ${JSON.stringify(scrollSpyState)}`);
  const activeRailVisibility = await page.locator(`.domain-directory-node[data-domain-id="${autoScrollTargetId}"]`).evaluate((node) => {
    const container = node.closest(".domain-directory-scroll").getBoundingClientRect();
    const box = node.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, containerTop: container.top, containerBottom: container.bottom, scrollTop: node.closest(".domain-directory-scroll").scrollTop };
  });
  assert.ok(activeRailVisibility.top >= activeRailVisibility.containerTop - 1 && activeRailVisibility.bottom <= activeRailVisibility.containerBottom + 1 && activeRailVisibility.scrollTop > 0, `Page scrolling should update and reveal the current directory node: ${JSON.stringify(activeRailVisibility)}`);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    window.__railScrollBehavior = [];
    Element.prototype.__originalRailScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function captureRailScroll(options) {
      window.__railScrollBehavior.push(options?.behavior);
      return Element.prototype.__originalRailScrollIntoView?.call(this, options);
    };
  });
  await page.locator(".domain-directory-node").last().click();
  assert.equal((await page.evaluate(() => window.__railScrollBehavior)).at(-1), "auto", "Reduced motion should make domain jumps immediate");
  assert.equal(await page.locator(".domain-directory-node").last().getAttribute("aria-current"), "location", "A clicked domain should become current");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.keyboard.press("Meta+K");
  await assertVisible(page.locator(".search-workspace"));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+K");
  await assertVisible(page.locator(".search-workspace"), "Ctrl+K should preserve the existing search shortcut");
  await page.keyboard.press("Escape");

  const settingsTrigger = page.locator(".home-settings-button");
  await page.locator(".fixed-records").first().scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo({ top: Math.max(120, window.scrollY), behavior: "auto" }));
  const settingsContextBefore = await page.evaluate(() => ({
    hash: window.location.hash,
    path: window.location.pathname,
    search: window.location.search,
    scrollY: window.scrollY,
    selectedDate: document.querySelector(".home-date-title")?.textContent,
    planActive: document.querySelector('[data-edge-rail-item="workspace"]')?.dataset.workspaceMode,
    viewMode: document.querySelector('[data-edge-rail-item="record-view"]')?.dataset.viewMode
  }));
  const settingsDialog = await openHomeSettings(page);
  assert.equal(await page.locator("main.app-shell").count(), 1, "The diary shell should remain mounted below in-page Settings");
  assert.equal(await page.locator(".search-surface").count(), 0, "Opening Settings should not leave Search mounted");
  await assertVisible(settingsDialog);
  const mobileSettingsRows = settingsDialog.locator(".settings-mobile-menu a");
  assert.equal(await mobileSettingsRows.count(), 6, "In-page Settings should expose all six existing tasks");
  await settingsDialog.getByRole("link", { name: "Account", exact: true }).click();
  assert.equal(new URL(page.url()).hash, settingsContextBefore.hash, "Embedded panel navigation should not write a home hash");
  await assertVisible(settingsDialog.getByRole("link", { name: "Back to settings" }));
  await settingsDialog.getByRole("link", { name: "Back to settings" }).click();
  await page.keyboard.press("Escape");
  await assertHidden(settingsDialog);
  const settingsContextAfter = await page.evaluate(() => ({
    hash: window.location.hash,
    path: window.location.pathname,
    search: window.location.search,
    scrollY: window.scrollY,
    selectedDate: document.querySelector(".home-date-title")?.textContent,
    planActive: document.querySelector('[data-edge-rail-item="workspace"]')?.dataset.workspaceMode,
    viewMode: document.querySelector('[data-edge-rail-item="record-view"]')?.dataset.viewMode,
    focusRestored: document.activeElement?.classList.contains("home-settings-button")
  }));
  assert.deepEqual(
    { ...settingsContextAfter, scrollY: settingsContextBefore.scrollY, focusRestored: true },
    { ...settingsContextBefore, focusRestored: true },
    `Closing in-page Settings should preserve diary context and restore focus: ${JSON.stringify({ settingsContextBefore, settingsContextAfter })}`
  );
  assert.ok(Math.abs(settingsContextAfter.scrollY - settingsContextBefore.scrollY) <= 1, `Settings should restore the diary scroll position within 1px: ${JSON.stringify({ settingsContextBefore, settingsContextAfter })}`);

  await openHomeSettings(page);
  await page.locator(".home-settings-button").click();
  await assertHidden(page.locator(".settings-page-workspace"), "Toggling Settings should close the in-page workspace");

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 600, height: 900 },
    { width: 671, height: 900 },
    { width: 700, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    const responsiveSettings = await openHomeSettings(page);
    const embeddedGeometry = await responsiveSettings.evaluate((workspace) => {
      const pageSurface = workspace;
      const box = workspace.getBoundingClientRect();
      const workspaceBox = workspace.closest(".home-workspace").getBoundingClientRect();
      return {
        dialogBottom: box.bottom,
        dialogLeft: box.left,
        dialogRight: box.right,
        dialogTop: box.top,
        workspaceLeft: workspaceBox.left,
        workspaceRight: workspaceBox.right,
        pageClientWidth: pageSurface.clientWidth,
        pageScrollWidth: pageSurface.scrollWidth,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth
      };
    });
    assert.ok(embeddedGeometry.dialogBottom >= -0.5 && embeddedGeometry.dialogTop <= embeddedGeometry.viewportHeight + 0.5 && embeddedGeometry.dialogLeft >= embeddedGeometry.workspaceLeft - 0.5 && embeddedGeometry.dialogRight <= embeddedGeometry.workspaceRight + 0.5, `${viewport.width}px in-page Settings should stay inside the left workspace without an over-wide surface: ${JSON.stringify(embeddedGeometry)}`);
    assert.ok(embeddedGeometry.pageScrollWidth <= embeddedGeometry.pageClientWidth + 1, `${viewport.width}px in-page Settings should not overflow horizontally: ${JSON.stringify(embeddedGeometry)}`);
    if ([390, 1280].includes(viewport.width)) {
      await page.screenshot({ path: join(outputDir, `ln-075-inpage-settings-${viewport.width}.png`), fullPage: false });
    }
    await page.locator(".home-settings-button").click();
    await assertHidden(responsiveSettings);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  await setRecordView(page, "timeline");
  await assertVisible(page.locator(".domain-directory-rail"), "Time view should present a directory for its visible record and periodic sections");
  const timeRailLabels = await page.locator(".domain-directory-node > span").allTextContents();
  assert.equal(timeRailLabels[0], "Record", `Time view should begin with the one visible Record title: ${JSON.stringify(timeRailLabels)}`);
  assert.equal(timeRailLabels.includes("Health"), true, `Periodic domains should live in the right directory instead of repeating a left-side title: ${JSON.stringify(timeRailLabels)}`);
  assert.equal(await page.locator(".fixed-records-header h2:not(.visually-hidden)").count(), 0, "Time view must not render Health as a visible left heading");
  await assertVisible(edgeRail, "Time view should keep the unified utility and action rail");
  await setRecordView(page, "grouped");
  await setWorkspaceMode(page, "plan");
  await assertVisible(page.locator(".day-plan-shell"));
  await assertHidden(page.locator(".domain-directory-rail"), "Plan mode should not present diary domains");
  await assertVisible(edgeRail, "Plan mode should keep the unified rail without inventing domain nodes");
  await assertHidden(organizer, "Plan mode should not present the diary organizer");
  assert.equal(await page.locator(".record-action-row").count(), 0, "Plan mode should hide record-only export and add controls");
  const planRailAlignment = await page.evaluate(() => {
    const center = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return rect.left + rect.width / 2;
    };
    return { line: center(".home-edge-rail-brush"), workspace: center('[data-edge-rail-item="workspace"]'), addPlan: center(".day-plan-add") };
  });
  assert.ok(planRailAlignment.workspace - planRailAlignment.line >= 26 && planRailAlignment.workspace - planRailAlignment.line <= 30 && Math.abs(planRailAlignment.addPlan - planRailAlignment.line) <= 1.5, `Plan navigation should occupy the lower label lane while add remains on the binding axis: ${JSON.stringify(planRailAlignment)}`);
  await setWorkspaceMode(page, "diary");
  await assertVisible(addRecord);

  await page.evaluate((date) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.domains = state.domains.filter((domain) => ["daily-domain", "learning-domain"].includes(domain.id));
    state.categories = state.categories.filter((category) => ["daily", "study"].includes(category.id));
    state.templates = state.templates.map((template) => template.recordType === "periodic" ? { ...template, homeVisible: false } : template);
    state.entries = state.entries.filter((entry) => ["rail-daily", "rail-learning"].includes(entry.id));
    window.localStorage.setItem(key, JSON.stringify(state));
  }, testDate);
  await page.reload({ waitUntil: "domcontentloaded" });
  await setRecordView(page, "grouped");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await page.waitForTimeout(100);
  const shortPage = await page.evaluate(() => ({ scrollRange: document.documentElement.scrollHeight - window.innerHeight, scrollY: window.scrollY }));
  assert.ok(shortPage.scrollRange <= 2 && shortPage.scrollY === 0, `The reduced fixture should exercise a non-scrollable page: ${JSON.stringify(shortPage)}`);
  assert.equal(await page.locator('.domain-directory-node[aria-current="location"]').getAttribute("data-domain-id"), "daily-domain", "A non-scrollable page should keep its first visible domain current at the top");
  const anchoredDirectory = await page.evaluate(() => {
    const node = document.querySelector('.domain-directory-node[data-domain-id="learning-domain"]');
    const heading = document.querySelector('.record-domain[data-domain-id="learning-domain"] .record-domain-header h2');
    const directory = document.querySelector(".domain-directory-scroll");
    const nodeBox = node.getBoundingClientRect();
    const previousItemBox = node.closest("li").previousElementSibling?.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    const directoryBox = directory.getBoundingClientRect();
    return {
      nodeCenter: nodeBox.top + nodeBox.height / 2,
      nodeHeight: nodeBox.height,
      previousItemBottom: previousItemBox?.bottom ?? null,
      headingCenter: headingBox.top + headingBox.height / 2,
      directoryTop: directoryBox.top,
      directoryBottom: directoryBox.bottom,
      transitionDuration: getComputedStyle(node.parentElement).transitionDuration,
      overflow: directory.dataset.overflow,
      positioned: directory.dataset.positioned
    };
  });
  assert.equal(anchoredDirectory.overflow, "false", `A short directory should use title anchoring instead of the overflow list: ${JSON.stringify(anchoredDirectory)}`);
  assert.equal(anchoredDirectory.positioned, "true", `Directory nodes should finish their first layout before they animate: ${JSON.stringify(anchoredDirectory)}`);
  assert.ok(anchoredDirectory.headingCenter >= anchoredDirectory.directoryTop + 22 && anchoredDirectory.headingCenter <= anchoredDirectory.directoryBottom - 22, `The fixture heading should remain inside the directory window before ordered-target clamping: ${JSON.stringify(anchoredDirectory)}`);
  const expectedAnchoredCenter = Math.max(
    anchoredDirectory.headingCenter,
    anchoredDirectory.previousItemBottom + 12 + anchoredDirectory.nodeHeight / 2
  );
  assert.ok(Math.abs(anchoredDirectory.nodeCenter - expectedAnchoredCenter) <= 1.5, `An in-range directory point should align with its title or clamp after the preceding occupied rail item: ${JSON.stringify({ ...anchoredDirectory, expectedAnchoredCenter })}`);
  assert.match(anchoredDirectory.transitionDuration, /0\.18s/, `Directory points should return to their anchors with a restrained smooth motion: ${JSON.stringify(anchoredDirectory)}`);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator('.domain-directory-node[data-domain-id="learning-domain"]').evaluate((node) => getComputedStyle(node.parentElement).transitionDuration.split(",").every((value) => Number.parseFloat(value) <= 0.001)), true, "Reduced motion should make directory rearrangement immediate");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const organizerButton = page.locator(".organize-helper");
  const organizerFigure = organizerButton.locator(".organize-helper-figure");
  await organizerButton.scrollIntoViewIfNeeded();
  const [organizerButtonBox, organizerFigureBox] = await Promise.all([organizerButton.boundingBox(), organizerFigure.boundingBox()]);
  const organizerOverlap = await page.evaluate(() => {
    const target = document.querySelector(".organize-helper").getBoundingClientRect();
    const textRects = [...document.querySelectorAll(".entry-content, .group-entry .entry-content, .fixed-entry-label, .fixed-entry-value")].map((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect();
    });
    return Math.max(0, ...textRects.map((rect) => Math.max(0, Math.min(target.right, rect.right) - Math.max(target.left, rect.left)) * Math.max(0, Math.min(target.bottom, rect.bottom) - Math.max(target.top, rect.top))));
  });
  assert.ok(organizerOverlap <= 1, `The Agent target should not intercept actual record glyphs: ${organizerOverlap}`);
  const organizerFacePoint = { x: organizerFigureBox.x + organizerFigureBox.width * 0.5, y: organizerFigureBox.y + organizerFigureBox.height * 0.5 };
  assert.ok(
    organizerButtonBox.width >= 43.99
      && organizerButtonBox.height >= 43.99
      && organizerFacePoint.x >= organizerButtonBox.x
      && organizerFacePoint.x <= organizerButtonBox.x + organizerButtonBox.width
      && organizerFacePoint.y >= organizerButtonBox.y
      && organizerFacePoint.y <= organizerButtonBox.y + organizerButtonBox.height,
    `The character's visual center should travel with the same accessible target: ${JSON.stringify({ organizerButtonBox, organizerFigureBox, organizerFacePoint })}`
  );
  const organizerHit = await page.evaluate(({ x, y }) => ({
    className: document.elementFromPoint(x, y)?.className || null,
    pointerEvents: getComputedStyle(document.querySelector(".organize-helper-figure")).pointerEvents,
    belongsToButton: Boolean(document.elementFromPoint(x, y)?.closest?.(".organize-helper")),
    element: document.elementFromPoint(x, y)?.outerHTML?.slice(0, 120) || null
  }), organizerFacePoint);
  assert.equal(organizerHit.pointerEvents, "none", `The art should delegate interaction to the synchronized button target: ${JSON.stringify(organizerHit)}`);
  assert.equal(organizerHit.belongsToButton, true, `The center of the character should resolve to its real button target: ${JSON.stringify({ organizerButtonBox, organizerFigureBox, organizerFacePoint, organizerHit })}`);
  await organizerButton.click();
  await assertVisible(page.locator(".agent-review-panel, .agent-review-complete"));
  assert.equal(page.url(), `${baseURL}/`, "Waking the Agent should keep the user on the diary page");
  assert.equal(await page.locator('.entry[aria-current="step"], .group-entry[aria-current="step"]').count(), 1, "Exactly one source row should own the active Agent review item");
  assert.equal(await page.locator(".diary-agent-traveler").count(), 1, "Active Diary review should keep the viewport-resident companion visible");
});

test("date picker: collapse one shared date context above records and day plan", async (page) => {
  await page.clock.setFixedTime(new Date("2026-08-15T04:00:00.000Z"));
  await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem("log-note:data:v1"));
    state.planBlocks = [{
      id: "ln-054-plan",
      date: "2026-08-12",
      title: "Review month interaction",
      startTime: "10:00",
      endTime: "11:00",
      source: "local",
      flexibility: "movable",
      externalRef: null,
      createdAt: 1,
      updatedAt: 1
    }];
    window.localStorage.setItem("log-note:data:v1", JSON.stringify(state));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const calendarTrigger = page.locator(".home-date-title .date-context-disclosure");
  const sharedDateContext = page.locator(".shared-date-context");
  let lastSwipeReleaseMs = 0;
  const swipeFullPage = async (deltaX, screenshotName = "", surfaceSelector = ".home-workspace", holdBeforeRelease = 0, previewDeltaX = deltaX * 0.78) => {
    const shell = page.locator(".app-shell");
    const surface = page.locator(surfaceSelector);
    const box = await surface.boundingBox();
    assert.ok(box, "The visible workspace should expose a full-page swipe surface");
    const viewport = page.viewportSize();
    const startX = Math.min(Math.max(box.x + box.width * 0.54, 44), viewport.width - 44);
    const startY = Math.min(Math.max(box.y + 72, 44), viewport.height - 44);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + previewDeltaX, startY, { steps: 5 });
    await page.locator(".home-swipe-shadow").waitFor({ state: "visible" });
    await page.locator(".home-swipe-date-card").waitFor({ state: "visible" });
    const dragState = await shell.evaluate((element) => {
      const transform = (selector) => {
        const node = document.querySelector(selector);
        return node ? getComputedStyle(node).transform : null;
      };
      const dock = document.querySelector(".action-dock");
      const shadow = document.querySelector(".home-swipe-shadow");
      const dateCard = document.querySelector(".home-swipe-date-card");
      const shadowStyle = getComputedStyle(shadow);
      const shadowBox = shadow.getBoundingClientRect();
      const dateCardStyle = getComputedStyle(dateCard);
      const dateCardSurfaceStyle = getComputedStyle(dateCard.querySelector("span"));
      const dateCardBox = dateCard.getBoundingClientRect();
      return {
        phase: element.dataset.pageSwipePhase,
        navigationMotion: element.dataset.pageNavigationMotion,
        shellTouchAction: getComputedStyle(element).touchAction,
        titleTransform: transform(".date-context-title"),
        topbarTransform: transform(".topbar"),
        workspaceTransform: transform(".home-workspace"),
        dockTransform: dock ? getComputedStyle(dock).transform : null,
        shadowSide: shadow.dataset.side,
        shadowTransform: shadowStyle.transform,
        shadowLeft: shadowBox.left,
        shadowTop: shadowBox.top,
        shadowOpacity: Number.parseFloat(shadowStyle.opacity),
        shadowBackground: shadowStyle.backgroundImage,
        shadowWidth: shadowBox.width,
        shadowHeight: shadowBox.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        dateCardCount: document.querySelectorAll(".home-swipe-date-card").length,
        dateCardDirection: dateCard.dataset.direction,
        dateCardLabel: dateCard.textContent.trim(),
        dateCardOpacity: Number.parseFloat(dateCardStyle.opacity),
        dateCardScale: new DOMMatrix(dateCardSurfaceStyle.transform).a,
        dateCardAnimationName: dateCardSurfaceStyle.animationName,
        dateCardAnimationDuration: Number.parseFloat(dateCardSurfaceStyle.animationDuration),
        dateCardBackground: dateCardSurfaceStyle.backgroundColor,
        dateCardTransitionDuration: Math.max(...dateCardStyle.transitionDuration.split(",").map((value) => Number.parseFloat(value))),
        dateCardBaseWidth: Number.parseFloat(dateCardStyle.width),
        dateCardBaseHeight: Number.parseFloat(dateCardStyle.height),
        dateCardWidth: dateCardBox.width,
        dateCardHeight: dateCardBox.height,
        dateCardCenterX: dateCardBox.left + dateCardBox.width / 2,
        dateCardCenterY: dateCardBox.top + dateCardBox.height / 2,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        legacyOrbCount: document.querySelectorAll(".home-swipe-orb").length,
        edgeCueCount: document.querySelectorAll(".home-swipe-edge-cue").length
      };
    });
    assert.equal(dragState.phase, "dragging", `The full page should enter a dragging state: ${JSON.stringify(dragState)}`);
    assert.equal(dragState.shellTouchAction, "pan-y", "Full-page horizontal gestures should preserve vertical scrolling");
    assert.equal(dragState.titleTransform, "none", `The date title should not move independently from the page: ${JSON.stringify(dragState)}`);
    assert.equal(dragState.workspaceTransform, "none", `The paper workspace should stay visually grounded beneath the shadow: ${JSON.stringify(dragState)}`);
    assert.equal(dragState.topbarTransform, "none", `The app bar should remain stable beneath the shadow: ${JSON.stringify(dragState)}`);
    if (dragState.dockTransform) assert.equal(dragState.dockTransform, "none", `Floating actions should remain stable beneath the shadow: ${JSON.stringify(dragState)}`);
    assert.equal(dragState.legacyOrbCount, 0, `The gesture should not restore the finger-following orb: ${JSON.stringify(dragState)}`);
    assert.equal(dragState.edgeCueCount, 0, `The gesture should not render an edge component: ${JSON.stringify(dragState)}`);
    assert.equal(dragState.dateCardCount, 1, `The gesture should render one fixed date card: ${JSON.stringify(dragState)}`);
    assert.match(dragState.dateCardLabel, /2026/, `The date card should include the target year: ${JSON.stringify(dragState)}`);
    assert.match(dragState.dateCardLabel, /Aug|Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|\d{1,2}月/, `The date card should include the localized target month: ${JSON.stringify(dragState)}`);
    assert.match(dragState.dateCardLabel, /\d{1,2}/, `The date card should include the target day: ${JSON.stringify(dragState)}`);
    assert.ok(dragState.dateCardOpacity > 0.25, `The fixed date card should reveal the target date: ${JSON.stringify(dragState)}`);
    assert.equal(dragState.dateCardDirection, deltaX < 0 ? "next" : "previous", `The date card should preserve the swipe direction: ${JSON.stringify(dragState)}`);
    assert.match(dragState.shadowBackground, /rgba?\(111, 107, 97/, `The directional feedback should use warm graphite instead of black: ${JSON.stringify(dragState)}`);
    assert.match(dragState.dateCardBackground, /rgba?\(92, 87, 77/, `The date card should use warm graphite instead of black: ${JSON.stringify(dragState)}`);
    assert.ok(dragState.dateCardScale >= 0.88 && dragState.dateCardScale <= 1.001, `The date card should use a restrained fixed-position scale: ${JSON.stringify(dragState)}`);
    assert.ok(dragState.dateCardBaseWidth >= 124 && dragState.dateCardBaseWidth <= 190 && dragState.dateCardBaseHeight >= 44 && dragState.dateCardBaseHeight <= 52, `The fixed date card should fit a complete localized date without becoming oversized: ${JSON.stringify(dragState)}`);
    const dateCardOffset = dragState.dateCardCenterX - dragState.viewportWidth / 2;
    assert.ok(Math.abs(dateCardOffset) >= 36 && Math.abs(dateCardOffset) <= 57, `The date card should lean away from the viewport center by one restrained step: ${JSON.stringify(dragState)}`);
    assert.equal(Math.sign(dateCardOffset), deltaX < 0 ? -1 : 1, `The date card should lean in the swipe direction: ${JSON.stringify(dragState)}`);
    assert.ok(Math.abs(dragState.dateCardCenterY - dragState.viewportHeight / 2) <= 1, `The date card should keep a stable vertical anchor: ${JSON.stringify(dragState)}`);
    assert.equal(dragState.shadowSide, deltaX > 0 ? "left" : "right", `The full-screen shadow should originate from the incoming direction: ${JSON.stringify(dragState)}`);
    assert.ok(dragState.shadowOpacity > 0 && dragState.shadowOpacity <= 0.681, `The edge-weighted directional shadow should visibly follow the gesture without over-darkening the page: ${JSON.stringify(dragState)}`);
    assert.ok(Math.abs(dragState.shadowWidth - dragState.viewportWidth) <= 1 && Math.abs(dragState.shadowHeight - dragState.viewportHeight) <= 1, `The directional shadow should cover the full viewport: ${JSON.stringify(dragState)}`);
    assert.match(dragState.shadowBackground, deltaX > 0 ? /linear-gradient\(90deg/ : /linear-gradient\(270deg/, `The dark-to-transparent gradient should mirror the swipe direction: ${JSON.stringify(dragState)}`);
    assert.match(dragState.shadowBackground, /44vw|420px|171\.6px/, `The shadow should resolve inside the narrow edge band: ${JSON.stringify(dragState)}`);
    if (dragState.reducedMotion) {
      assert.equal(dragState.dateCardAnimationName, "none", `Reduced motion should remove the date-card entrance animation: ${JSON.stringify(dragState)}`);
      assert.ok(dragState.dateCardTransitionDuration <= 0.001, `Reduced motion should make date-card feedback immediate: ${JSON.stringify(dragState)}`);
      assert.equal(dragState.shadowTransform, "none", `Reduced motion should not translate the full-viewport shadow: ${JSON.stringify(dragState)}`);
      assert.ok(Math.abs(dragState.shadowLeft) <= 1 && Math.abs(dragState.shadowTop) <= 1, `Reduced motion should preserve the shadow's viewport geometry: ${JSON.stringify(dragState)}`);
    } else {
      assert.ok(dragState.dateCardAnimationDuration >= 0.14 && dragState.dateCardAnimationDuration <= 0.17, `The date-card entrance should remain a restrained 150ms cue: ${JSON.stringify(dragState)}`);
    }
    assert.ok(["next", "previous"].includes(dragState.navigationMotion), `The drag state should preserve its navigation direction: ${JSON.stringify(dragState)}`);
    const direction = dragState.navigationMotion;
    assert.equal(await page.evaluate(() => window.getSelection()?.toString() || ""), "", "A full-page swipe should not leave accidental text selection");
    if (screenshotName) await page.screenshot({ path: join(outputDir, screenshotName), fullPage: false });
    if (holdBeforeRelease) await page.waitForTimeout(holdBeforeRelease);
    await page.mouse.move(startX + deltaX, startY, { steps: 4 });
    const beforeReleaseOpacity = await page.locator(".home-swipe-date-card").evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
    const releaseStartedAt = Date.now();
    await page.mouse.up();
    if (holdBeforeRelease && !dragState.reducedMotion) {
      await page.waitForTimeout(40);
      const settlingOpacity = await page.locator(".home-swipe-date-card").evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
      assert.ok(settlingOpacity > 0 && settlingOpacity < beforeReleaseOpacity, `A slow short drag should transition smoothly toward rest instead of jumping away: ${JSON.stringify({ beforeReleaseOpacity, settlingOpacity })}`);
    }
    await page.waitForFunction(() => document.querySelector(".app-shell").dataset.pageSwipePhase === "idle");
    lastSwipeReleaseMs = Date.now() - releaseStartedAt;
    assert.equal(await page.locator(".home-swipe-shadow").count(), 0, "The full-screen shadow should disappear when the gesture settles");
    assert.equal(await page.locator(".home-swipe-date-card").count(), 0, "The fixed date card should disappear when the gesture settles");
    return direction;
  };
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "false");
  assert.equal(await page.locator(".date-context-date").count(), 1, "The shared date context should render one primary date");
  assert.equal(await page.locator(".date-context-weekday").count(), 1, "The shared date context should render one subordinate weekday");
  assert.equal(await page.locator(".date-context-details, .date-context-month, .date-context-summary").count(), 0, "The date heading should not mix in a duplicate month title or activity statistics");
  const diaryDateHierarchy = await page.evaluate(() => {
    const date = document.querySelector(".date-context-date");
    const separator = document.querySelector(".date-context-separator");
    const weekday = document.querySelector(".date-context-weekday");
    const dateRect = date.getBoundingClientRect();
    const separatorRect = separator.getBoundingClientRect();
    const weekdayRect = weekday.getBoundingClientRect();
    const dateStyle = getComputedStyle(date);
    const weekdayStyle = getComputedStyle(weekday);
    return {
      dateText: date.textContent,
      weekdayText: weekday.textContent,
      dateFontSize: Number.parseFloat(dateStyle.fontSize),
      weekdayFontSize: Number.parseFloat(weekdayStyle.fontSize),
      dateColor: dateStyle.color,
      weekdayColor: weekdayStyle.color,
      separatorText: separator.textContent,
      dateToSeparatorGap: separatorRect.left - dateRect.right,
      separatorToWeekdayGap: weekdayRect.left - separatorRect.right
    };
  });
  assert.equal(diaryDateHierarchy.dateText, "August 15");
  assert.equal(diaryDateHierarchy.weekdayText, "Saturday");
  assert.ok(diaryDateHierarchy.dateFontSize - diaryDateHierarchy.weekdayFontSize >= 4, `The weekday should be visibly smaller than the diary date: ${JSON.stringify(diaryDateHierarchy)}`);
  assert.notEqual(diaryDateHierarchy.dateColor, diaryDateHierarchy.weekdayColor, `The weekday should use a quieter color than the diary date: ${JSON.stringify(diaryDateHierarchy)}`);
  assert.equal(diaryDateHierarchy.separatorText, "·", `The date and weekday should use the reference's quiet middle-dot relationship: ${JSON.stringify(diaryDateHierarchy)}`);
  assert.ok(diaryDateHierarchy.dateToSeparatorGap >= 6 && diaryDateHierarchy.dateToSeparatorGap <= 10, `The separator should stay related to the primary date: ${JSON.stringify(diaryDateHierarchy)}`);
  assert.ok(diaryDateHierarchy.separatorToWeekdayGap >= 6 && diaryDateHierarchy.separatorToWeekdayGap <= 10, `The weekday should remain related without fusing into the primary date: ${JSON.stringify(diaryDateHierarchy)}`);

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 600, height: 900 },
    { width: 671, height: 900 },
    { width: 700, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 720 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px responsive date identity`);
    const responsiveHeader = await page.evaluate(() => {
      const header = document.querySelector(".topbar");
      const dateTitle = header.querySelector(".date-context-title");
      const dateText = header.querySelector(".date-context-date");
      const datePrimary = header.querySelector(".date-context-primary");
      const titleCluster = header.querySelector(".home-title-cluster");
      const actions = header.querySelector(".top-actions");
      const box = (element) => element.getBoundingClientRect();
      const headerBox = box(header);
      const titleBox = box(dateTitle);
      const primaryBox = box(datePrimary);
      const clusterBox = box(titleCluster);
      const actionsBox = box(actions);
      const line = document.querySelector(".home-edge-rail-brush");
      const lineBox = line ? box(line) : null;
      const searchBox = box(header.querySelector(".home-search-button"));
      const recordViewBox = box(header.querySelector('[data-edge-rail-item="record-view"]'));
      const workspaceBox = box(document.querySelector('.action-dock [data-edge-rail-item="workspace"]'));
      const settingsBox = box(header.querySelector(".home-settings-button"));
      const searchIconBox = box(header.querySelector(".home-search-button .home-edge-rail-icon"));
      const settingsIconBox = box(header.querySelector(".home-settings-button .home-edge-rail-icon"));
      return {
        headerBox,
        titleBox,
        primaryBox,
        clusterBox,
        actionsBox,
        lineBox,
        searchBox,
        recordViewBox,
        workspaceBox,
        settingsBox,
        searchIconBox,
        settingsIconBox,
        actionsPosition: getComputedStyle(actions).position,
        dateFullyVisible: dateText.scrollWidth <= dateText.clientWidth + 1,
        dateInsideHeader: titleBox.top >= headerBox.top && titleBox.bottom <= headerBox.bottom,
        lowerDateCount: document.querySelectorAll(".home-workspace .date-context-title").length,
        removedControlCount: header.querySelectorAll('.brand, .language-toggle, .search-wide, a[href="/templates"]').length,
        visibleToolCount: [...header.querySelectorAll(".top-actions .icon-button")]
          .filter((element) => {
            const rect = box(element);
            return rect.width > 0 && rect.height > 0;
          }).length
      };
    });
    assert.equal(responsiveHeader.dateInsideHeader, true, `The one date identity should live inside the app header: ${JSON.stringify({ viewport, responsiveHeader })}`);
    assert.equal(responsiveHeader.lowerDateCount, 0, `The workspace should not repeat the mobile date title: ${JSON.stringify({ viewport, responsiveHeader })}`);
    assert.equal(responsiveHeader.visibleToolCount, 3, `Search, settings, and record view should remain visible in the compact upper tools: ${JSON.stringify({ viewport, responsiveHeader })}`);
    assert.equal(responsiveHeader.removedControlCount, 0, `Removed brand, language, wide-search, and setup chrome must not leave hidden controls: ${JSON.stringify({ viewport, responsiveHeader })}`);
    assert.equal(responsiveHeader.dateFullyVisible, true, `The diary date should not be clipped by mobile tools: ${JSON.stringify({ viewport, responsiveHeader })}`);
    if (viewport.width <= 700) {
      const lineCenter = responsiveHeader.lineBox.left + responsiveHeader.lineBox.width / 2;
      const searchCenter = responsiveHeader.searchIconBox.left + responsiveHeader.searchIconBox.width / 2;
      const recordViewCenter = responsiveHeader.recordViewBox.left + responsiveHeader.recordViewBox.width / 2;
      const workspaceCenter = responsiveHeader.workspaceBox.left + responsiveHeader.workspaceBox.width / 2;
      const settingsCenter = responsiveHeader.settingsIconBox.left + responsiveHeader.settingsIconBox.width / 2;
      assert.equal(responsiveHeader.actionsPosition, "fixed", `Mobile search, settings, and record view should leave the title layout and sit on the upper rail: ${JSON.stringify({ viewport, responsiveHeader })}`);
      assert.ok([searchCenter, recordViewCenter, workspaceCenter, settingsCenter].every((center) => center - lineCenter >= 26 && center - lineCenter <= 30), `Mobile rail controls should share the right-side lane: ${JSON.stringify({ viewport, responsiveHeader })}`);
      assert.ok(responsiveHeader.searchBox.bottom <= responsiveHeader.settingsBox.top + 0.5 && responsiveHeader.settingsBox.bottom <= responsiveHeader.recordViewBox.top + 0.5, `Mobile upper utilities should stack as Search, Settings, then record view: ${JSON.stringify({ viewport, responsiveHeader })}`);
      assert.ok(responsiveHeader.recordViewBox.bottom <= responsiveHeader.workspaceBox.top, `The Diary/Plan rocker should remain in the lower quick dock below the upper utilities: ${JSON.stringify({ viewport, responsiveHeader })}`);
      assert.ok(responsiveHeader.clusterBox.right <= responsiveHeader.actionsBox.left - 4, `The title and date should remain clear of rail utilities: ${JSON.stringify({ viewport, responsiveHeader })}`);
    } else {
      const clusterCenter = responsiveHeader.clusterBox.top + responsiveHeader.clusterBox.height / 2;
      const actionsCenter = responsiveHeader.actionsBox.top + responsiveHeader.actionsBox.height / 2;
      assert.equal(responsiveHeader.actionsPosition, "static", `Desktop utilities should remain in the compact header: ${JSON.stringify({ viewport, responsiveHeader })}`);
      assert.ok(Math.abs(clusterCenter - actionsCenter) <= 12, `Desktop headers should keep date, search, settings, and record view on one line: ${JSON.stringify({ viewport, responsiveHeader })}`);
    }
    await page.screenshot({ path: join(outputDir, `ln-057-rework9-mobile-date-header-${viewport.width}.png`), fullPage: false });
    await page.screenshot({ path: join(outputDir, `ln-057-rework10-diary-plan-no-arrows-${viewport.width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator(".calendar-view.picker-mode").count(), 0, "Collapsed date context should not leave an empty month panel");
  const collapsedLayout = await page.evaluate(() => {
    const header = document.querySelector(".topbar").getBoundingClientRect();
    const currentSurface = document.querySelector(".timeline, .fixed-records").getBoundingClientRect();
    return { headerBottom: header.bottom, surfaceTop: currentSurface.top };
  });
  assert.ok(collapsedLayout.headerBottom <= collapsedLayout.surfaceTop + 1, `The editorial header should lead directly into the current diary surface, whether records exist or fixed fields begin first: ${JSON.stringify(collapsedLayout)}`);
  assert.equal(await page.locator(".content-mode-switch").count(), 0, "The deleted underlined tab row should not remain in the document");
  assert.equal(await page.locator(".month-disclosure-row, .selected-date-context").count(), 0, "Month, selected date, and day arrows should not render as separate components");
  assert.equal(await page.locator(".date-context-actions").count(), 0, "Swipe-enabled date navigation should not keep a redundant previous/next component");
  assert.equal(await page.getByRole("button", { name: /Previous day|Next day|Previous month|Next month/ }).count(), 0, "Date and month arrows should be removed from the visible interface");
  await swipeFullPage(-78, "ln-063-threshold-retreat-cancel-390.png", ".home-workspace", 0, -96);
  await assertVisible(page.getByRole("heading", { name: /Saturday, August 15/ }), "Returning to exactly one fifth of the viewport should cancel even after crossing the threshold");
  await swipeFullPage(-79, "ln-063-threshold-over-commit-390.png", ".home-workspace", 0, -79);
  await assertVisible(page.getByRole("heading", { name: /Sunday, August 16/ }), "Moving strictly beyond one fifth of the viewport should change the date");
  await swipeFullPage(79, "", ".home-workspace", 0, 79);
  await assertVisible(page.getByRole("heading", { name: /Saturday, August 15/ }));
  const nextDayMotion = await swipeFullPage(-86, "ln-057-rework16-left-swipe-right-shadow-orb-390.png", ".home-workspace");
  await assertVisible(page.getByRole("heading", { name: /Sunday, August 16/ }));
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "false", "A date swipe should not toggle the calendar disclosure");
  assert.equal(nextDayMotion, "next", "Swiping left across the page should use the forward date motion");
  const previousDayMotion = await swipeFullPage(86, "ln-057-rework16-right-swipe-left-shadow-orb-390.png");
  await assertVisible(page.getByRole("heading", { name: /Saturday, August 15/ }));
  assert.equal(previousDayMotion, "previous", "Swiping right across the page should use the previous date motion");
  await swipeFullPage(-24, "", ".home-workspace", 200);
  assert.ok(lastSwipeReleaseMs <= 180, `A below-threshold drag should settle within the 120ms feedback window plus browser tolerance: ${lastSwipeReleaseMs}ms`);
  await assertVisible(page.getByRole("heading", { name: /Saturday, August 15/ }), "A short horizontal drag should settle back without changing the date");
  const diagonalSurface = await page.locator(".home-workspace").boundingBox();
  await page.mouse.move(diagonalSurface.x + 180, diagonalSurface.y + 180);
  await page.mouse.down();
  await page.mouse.move(diagonalSurface.x + 198, diagonalSurface.y + 200, { steps: 4 });
  assert.equal(await page.locator(".home-swipe-shadow, .home-swipe-date-card").count(), 0, "A diagonal scroll gesture should not flash horizontal feedback");
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await swipeFullPage(-86);
  await swipeFullPage(86);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await assertVisible(page.getByRole("heading", { name: /Saturday, August 15/ }));
  await page.screenshot({ path: join(outputDir, "ln-057-collapsed-context-390.png"), fullPage: false });
  await page.screenshot({ path: join(outputDir, "ln-057-rework10-collapsed-diary-390.png"), fullPage: false });
  await page.locator(".date-context-date").evaluate((element) => { element.__lnDiaryProbe = "preserved"; });

  await calendarTrigger.click();
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "true");
  await assertVisible(page.getByRole("button", { name: "Close calendar" }));
  assert.equal(await page.locator(".date-context-date").evaluate((element) => element.__lnDiaryProbe), "preserved", "Opening the calendar should preserve the same diary-date DOM");
  assert.equal(await page.locator(".date-context-details, .date-context-month, .date-context-summary").count(), 0, "Expanded state should keep the same quiet date heading without duplicated metadata");
  assert.equal(await page.getByText("August 2026", { exact: true }).count(), 0, "The expanded picker should not add a visible duplicate month heading");
  assert.equal(await page.getByText(/Active days|Records 14|记录日|记录 14/, { exact: false }).count(), 0, "The date context should not present dashboard-like activity statistics");
  assert.equal(await page.getByRole("region", { name: "Timeline view" }).count(), 0, "An open calendar must not recreate an empty Record section");
  assert.equal(await page.locator(".view-switch").getByRole("button", { name: "Month", exact: true }).count(), 0, "The home view switch should not repeat the calendar entry");
  await assertVisible(page.locator('[data-edge-rail-item="record-view"][data-view-mode="timeline"]'));
  assert.equal(await page.locator('[data-edge-rail-item="record-view"]').count(), 1, "The rail should expose one record-view toggle, not parallel Time and Category actions");

  const calendar = page.locator(".calendar-view.picker-mode");
  await assertVisible(page.getByRole("region", { name: "Calendar view" }));
  await assertVisible(calendar.getByRole("grid", { name: "August 2026" }));
  assert.equal(await calendar.locator(".calendar-toolbar, .calendar-month-heading, .calendar-month-actions").count(), 0, "The expanded picker should not repeat its month heading, statistics, or arrow group");
  assert.equal(await page.locator(".date-context-actions").count(), 0, "Expanded state should not restore the removed arrow component");
  const nextMonthMotion = await swipeFullPage(-86, "ln-057-rework16-month-shadow-orb-390.png", ".calendar-grid");
  await assertVisible(calendar.getByRole("grid", { name: "September 2026" }));
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "true", "A month swipe should keep the picker expanded");
  assert.equal(nextMonthMotion, "next", "An expanded full-page swipe should advance the month");
  await swipeFullPage(86, "", ".calendar-grid");
  await assertVisible(calendar.getByRole("grid", { name: "August 2026" }));
  const seedDay = calendar.locator('[data-calendar-date="2026-08-11"]');
  const planDay = calendar.locator('[data-calendar-date="2026-08-12"]');
  await assertVisible(seedDay);
  assert.equal(await seedDay.locator(".calendar-record-signal").count(), 1, "Record activity should use a quiet signal dot");
  assert.equal(await planDay.locator(".calendar-plan-signal").count(), 1, "Plan activity should use a distinct quiet signal dot");
  assert.equal(await calendar.locator(".calendar-day-count, .calendar-plan-count").count(), 0, "Month cells should not use numeric badges");
  const monthOrder = await page.evaluate(() => {
    const grid = document.querySelector(".calendar-grid").getBoundingClientRect();
    const track = document.querySelector(".calendar-month-track").getBoundingClientRect();
    return { gridBottom: grid.bottom, trackTop: track.top };
  });
  assert.ok(monthOrder.gridBottom <= monthOrder.trackTop + 1, `Nearby months should follow the month grid: ${JSON.stringify(monthOrder)}`);
  assert.equal(await seedDay.getAttribute("aria-current"), null);
  await planDay.click();
  assert.equal(await page.getByRole("region", { name: "Timeline view" }).count(), 0, "Selecting a plan-only day should keep the empty Time surface visually silent");
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "true", "Choosing a day should keep the month context expanded");
  assert.equal(await calendar.locator(".calendar-day-context").count(), 0, "The picker should not add a second day-summary decision");
  assert.equal(await calendar.getByRole("button", { name: "Plan this day" }).count(), 0, "The picker should not repeat the day-plan decision");
  assert.equal(await calendar.getByRole("button", { name: "Diary" }).count(), 0, "The picker should update the diary directly");
  await assertVisible(page.getByRole("heading", { name: /Wednesday, August 12/ }));

  await planDay.press("Escape");
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "false", "Escape should collapse the month panel");
  assert.equal(await page.locator(".calendar-view.picker-mode").count(), 0, "Escape should remove the collapsed month panel from layout");
  await page.waitForFunction(() => document.activeElement?.classList.contains("date-context-disclosure"));
  assert.equal(await calendarTrigger.evaluate((element) => document.activeElement === element), true, "Escape from the calendar grid should restore focus to the date disclosure");

  const calendarScrollFixture = await page.addStyleTag({ content: ".home-record-stream { min-height: 1500px !important; }" });
  const calendarLaunchScroll = await page.evaluate(() => {
    const target = Math.min(480, Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
    window.scrollTo({ top: target, behavior: "auto" });
    return window.scrollY;
  });
  assert.ok(calendarLaunchScroll > 0, `The fixed rail calendar regression needs a scrolled page: ${calendarLaunchScroll}`);
  await calendarTrigger.click();
  await assertVisible(calendar);
  await page.waitForFunction(() => window.scrollY <= 1);
  const scrolledCalendarLayout = await page.evaluate(() => {
    const navigation = document.querySelector(".date-context-navigation").getBoundingClientRect();
    const picker = document.querySelector(".calendar-view.picker-mode").getBoundingClientRect();
    return { navigationTop: navigation.top, navigationBottom: navigation.bottom, pickerTop: picker.top, pickerBottom: picker.bottom, viewportHeight: window.innerHeight };
  });
  assert.ok(scrolledCalendarLayout.navigationTop >= -1 && scrolledCalendarLayout.pickerTop >= scrolledCalendarLayout.navigationBottom - 1 && scrolledCalendarLayout.pickerTop < scrolledCalendarLayout.viewportHeight, `Opening the fixed rail calendar should reveal the static date and picker from any page scroll position: ${JSON.stringify(scrolledCalendarLayout)}`);
  await calendar.locator('[data-calendar-date="2026-08-12"]').press("Escape");
  await page.waitForFunction(() => window.scrollY <= 1);
  await page.waitForFunction(() => document.activeElement?.classList.contains("date-context-disclosure"));
  assert.equal(await calendarTrigger.evaluate((element) => document.activeElement === element), true, "Closing without changing the date should restore focus to the left-side date disclosure");
  await calendarTrigger.click();
  await assertVisible(calendar);
  await page.waitForFunction(() => window.scrollY <= 1);
  await calendarScrollFixture.evaluate((element) => element.remove());

  const activeMonth = calendar.locator('[data-calendar-month="2026-08"]');
  assert.deepEqual(await calendar.locator(".calendar-month-track button").evaluateAll((buttons) => buttons.map((button) => button.dataset.calendarMonth)), ["2026-07", "2026-08", "2026-09"], "The compact month track should expose exactly the previous, current, and next month");
  assert.equal(await activeMonth.getAttribute("aria-current"), "true");
  assert.equal(await calendar.locator('.calendar-month-track [aria-current="true"]').count(), 1, "The compact month track should expose one current month");
  await calendar.locator('[data-calendar-month="2026-09"]').click();
  await assertVisible(calendar.getByRole("grid", { name: "September 2026" }));
  assert.deepEqual(await calendar.locator(".calendar-month-track button").evaluateAll((buttons) => buttons.map((button) => button.dataset.calendarMonth)), ["2026-08", "2026-09", "2026-10"], "Changing month should recenter the fixed three-month track");
  assert.equal(await calendar.locator('.calendar-month-track [aria-current="true"]').count(), 1, "Changing month should keep exactly one current item");
  await calendar.locator('[data-calendar-month="2026-08"]').click();
  await assertVisible(calendar.getByRole("grid", { name: "August 2026" }));

  await seedDay.click();
  await seedDay.press("ArrowRight");
  const nextDay = calendar.locator('[data-calendar-date="2026-08-12"]');
  await assertVisible(nextDay);
  assert.equal(await nextDay.getAttribute("tabindex"), "0");
  assert.equal(await nextDay.evaluate((element) => document.activeElement === element), true, "Arrow navigation should retain focus in the calendar grid");

  await nextDay.press("PageUp");
  await assertVisible(calendar.getByRole("grid", { name: "July 2026" }));
  assert.deepEqual(await calendar.locator(".calendar-month-track button").evaluateAll((buttons) => buttons.map((button) => button.dataset.calendarMonth)), ["2026-06", "2026-07", "2026-08"], "Keyboard month navigation should also recenter the compact month track");
  const julyDay = calendar.locator('[data-calendar-date="2026-07-12"]');
  assert.equal(await julyDay.evaluate((element) => document.activeElement === element), true, "PageUp should move one month and keep the day focused");
  await julyDay.press("PageDown");
  await assertVisible(calendar.getByRole("grid", { name: "August 2026" }));

  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "zh-CN"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("button", { name: "打开月历" }));
  await page.getByRole("button", { name: "打开月历" }).click();
  await page.waitForFunction(() => window.scrollY <= 1);
  await page.locator('[data-calendar-date="2026-08-12"]').click();
  await page.waitForFunction(() => window.scrollY <= 1);
  assert.match(await calendar.locator(".calendar-weekdays [role=columnheader]").first().textContent(), /一/, "Chinese calendar should begin on Monday");
  assert.equal(await page.locator(".date-context-date").textContent(), "8月12日", "Chinese should keep the date as the primary diary title");
  assert.match(await page.locator(".date-context-weekday").textContent(), /^星期/, "Chinese should keep the weekday as subordinate context");
  await assertVisible(page.locator('[data-edge-rail-item="workspace"][data-workspace-mode="diary"]'));
  assert.equal(await page.locator('[data-edge-rail-item="workspace"]').count(), 1, "Chinese should keep one workspace toggle in the lower quick dock");
  await swipeFullPage(-86, "ln-063-date-card-complete-zh-390.png", ".calendar-grid");
  await swipeFullPage(86, "", ".calendar-grid");
  assert.equal(await page.locator(".date-context-date").textContent(), "8月12日", "Chinese month swipes should return to the original selected date");
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open calendar" }).click();
  await page.waitForFunction(() => window.scrollY <= 1);
  await page.locator('[data-calendar-date="2026-08-12"]').click();
  await page.waitForFunction(() => window.scrollY <= 1);
  assert.match(await calendar.locator(".calendar-weekdays [role=columnheader]").first().textContent(), /Sun/, "English calendar should begin on Sunday");
  await assertVisible(page.locator('[data-edge-rail-item="workspace"][data-workspace-mode="diary"]'));
  assert.equal(await page.locator('[data-edge-rail-item="workspace"]').count(), 1, "English should keep one workspace toggle in the lower quick dock");
  await page.evaluate(() => document.activeElement?.blur());

  for (const viewport of [
    { width: 320, height: 844, name: "ln-057-expanded-context-320.png" },
    { width: 360, height: 844, name: "ln-057-expanded-context-360.png" },
    { width: 361, height: 844, name: "ln-057-expanded-context-361.png" },
    { width: 389, height: 844, name: "ln-057-expanded-context-389.png" },
    { width: 390, height: 844, name: "ln-057-expanded-context-390.png" },
    { width: 426, height: 923, name: "ln-057-expanded-context-426.png" },
    { width: 600, height: 900, name: "ln-057-expanded-context-600.png" },
    { width: 671, height: 900, name: "ln-057-expanded-context-671.png" },
    { width: 700, height: 900, name: "ln-057-expanded-context-700.png" },
    { width: 768, height: 900, name: "ln-057-expanded-context-768.png" },
    { width: 1280, height: 720, name: "ln-057-expanded-context-1280.png" }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => window.scrollY <= 1);
    await assertNoHorizontalOverflow(page, `${viewport.width}px in-context date picker`);
    await assertMinTouchTarget(calendar.locator('[data-calendar-month="2026-08"]'), `${viewport.width}px month track`);
    await assertMinTouchTarget(calendar.locator('[data-calendar-date="2026-08-12"]'), `${viewport.width}px selected calendar day`);
    await assertMinTouchTarget(calendarTrigger, `${viewport.width}px rail calendar control`);
    await assertMinTouchTarget(page.locator('[data-edge-rail-item="workspace"]'), `${viewport.width}px workspace toggle`);
    const monthLayout = await page.evaluate(() => {
      const navigation = document.querySelector(".date-context-navigation").getBoundingClientRect();
      const picker = document.querySelector(".calendar-view.picker-mode").getBoundingClientRect();
      const grid = document.querySelector(".calendar-grid").getBoundingClientRect();
      const trackElement = document.querySelector(".calendar-month-track");
      const track = trackElement.getBoundingClientRect();
      const currentSurface = document.querySelector(".timeline, .fixed-records").getBoundingClientRect();
      const topbar = document.querySelector(".topbar").getBoundingClientRect();
      const weekdays = document.querySelector(".calendar-weekdays").getBoundingClientRect();
      const weekdayLabels = [...document.querySelectorAll(".calendar-weekdays span")].map((label) => label.getBoundingClientRect());
      const railElement = document.querySelector(".home-edge-rail-brush");
      const rail = railElement.getBoundingClientRect();
      const upperTools = [...document.querySelectorAll(".home-edge-rail-tools > button")].map((tool) => tool.getBoundingClientRect());
      const toolsElement = document.querySelector(".top-actions");
      const pickerStyle = getComputedStyle(document.querySelector(".calendar-view.picker-mode"));
      const monthButtons = [...trackElement.querySelectorAll("button")].map((button) => button.getBoundingClientRect());
      const calendarDays = [...document.querySelectorAll(".calendar-day")].map((button) => button.getBoundingClientRect());
      const pickerBackgroundMatch = pickerStyle.backgroundColor.match(/^rgba?\((?:[^,]+,){3}\s*([\d.]+)\)$/);
      const pickerBackgroundAlpha = pickerStyle.backgroundColor === "transparent"
        ? 0
        : pickerBackgroundMatch
          ? Number.parseFloat(pickerBackgroundMatch[1])
          : 1;
      const toolsHitTargets = [...document.querySelectorAll(".home-edge-rail-tool")].every((tool) => {
        const box = tool.getBoundingClientRect();
        return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest(".home-edge-rail-tool") === tool;
      });
      const weekdayUpperToolOverlap = weekdayLabels.some((label) => upperTools.some((tool) => !(
        label.right <= tool.left
        || label.left >= tool.right
        || label.bottom <= tool.top
        || label.top >= tool.bottom
      )));
      return {
        navigationBottom: navigation.bottom,
        pickerLeft: picker.left,
        pickerRight: picker.right,
        pickerTop: picker.top,
        topbarBottom: topbar.bottom,
        weekdaysTop: weekdays.top,
        weekdayUpperToolOverlap,
        firstCalendarDayTop: Math.min(...calendarDays.map((button) => button.top)),
        pickerZIndex: Number.parseInt(pickerStyle.zIndex, 10) || 0,
        pickerBackground: pickerStyle.backgroundColor,
        pickerBackgroundAlpha,
        gridBottom: grid.bottom,
        gridLeft: grid.left,
        gridRight: grid.right,
        calendarDayMinWidth: Math.min(...calendarDays.map((button) => button.width)),
        calendarDayMinHeight: Math.min(...calendarDays.map((button) => button.height)),
        trackTop: track.top,
        trackLeft: track.left,
        trackRight: track.right,
        trackBottom: track.bottom,
        trackClientWidth: trackElement.clientWidth,
        trackScrollWidth: trackElement.scrollWidth,
        trackOverflowX: getComputedStyle(trackElement).overflowX,
        monthButtonCount: trackElement.querySelectorAll("button").length,
        monthButtonMinWidth: Math.min(...monthButtons.map((button) => button.width)),
        monthButtonMaxWidth: Math.max(...monthButtons.map((button) => button.width)),
        monthButtonLeft: Math.min(...monthButtons.map((button) => button.left)),
        monthButtonRight: Math.max(...monthButtons.map((button) => button.right)),
        monthButtonMinHeight: Math.min(...monthButtons.map((button) => button.height)),
        timelineTop: currentSurface.top,
        railLeft: rail.left,
        railZIndex: Number.parseInt(getComputedStyle(railElement).zIndex, 10) || 0,
        lastUpperToolBottom: Math.max(...upperTools.map((tool) => tool.bottom)),
        toolsZIndex: Number.parseInt(getComputedStyle(toolsElement).zIndex, 10) || 0,
        toolsHitTargets,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth
      };
    });
    assert.ok(monthLayout.navigationBottom <= monthLayout.pickerTop + 1, `${viewport.width}px month picker should expand below the static date identity: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.gridBottom <= monthLayout.trackTop + 1, `${viewport.width}px month track should follow the grid: ${JSON.stringify(monthLayout)}`);
    assert.equal(monthLayout.monthButtonCount, 3, `${viewport.width}px month track should show only previous, current, and next month: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.trackScrollWidth <= monthLayout.trackClientWidth + 1, `${viewport.width}px month track should fit without clipped offscreen months: ${JSON.stringify(monthLayout)}`);
    assert.equal(monthLayout.trackOverflowX, "hidden", `${viewport.width}px compact month track should not advertise a clipped horizontal scroller: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.monthButtonMinWidth >= 43.99 && monthLayout.monthButtonMinHeight >= 43.99, `${viewport.width}px each adjacent-month button should keep a 44px target: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.monthButtonMaxWidth <= 84.01, `${viewport.width}px adjacent-month buttons should stay compact instead of stretching into a segmented row: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.monthButtonLeft >= monthLayout.trackLeft - 1 && monthLayout.monthButtonRight <= monthLayout.trackRight + 1, `${viewport.width}px all three month controls should be fully contained in the track: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.calendarDayMinWidth >= 43.99 && monthLayout.calendarDayMinHeight >= 43.99, `${viewport.width}px all 42 calendar days should retain 44px hit targets: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.pickerLeft >= -1 && monthLayout.pickerRight <= monthLayout.viewportWidth + 1, `${viewport.width}px picker should stay fully inside the viewport: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.trackBottom <= monthLayout.timelineTop + 1, `${viewport.width}px records should follow the expanded month panel without a duplicate tab row: ${JSON.stringify(monthLayout)}`);
    if (viewport.width <= 700) {
      assert.ok(Math.abs(monthLayout.pickerTop - monthLayout.topbarBottom) <= 1, `${viewport.width}px picker should begin directly after the mobile title instead of reserving an empty 48px shelf: ${JSON.stringify(monthLayout)}`);
      const weekdayInset = monthLayout.weekdaysTop - monthLayout.topbarBottom;
      if (viewport.width <= 389) {
        assert.ok(weekdayInset >= 107 && weekdayInset <= 117, `${viewport.width}px opaque narrow picker should clear the complete icon-and-rocker rail stack: ${JSON.stringify(monthLayout)}`);
        assert.equal(monthLayout.weekdayUpperToolOverlap, false, `${viewport.width}px the complete upper tool stack should not cover a weekday label: ${JSON.stringify(monthLayout)}`);
      } else {
        assert.ok(weekdayInset >= 11 && weekdayInset <= 21, `${viewport.width}px weekday row should keep only the picker's compact top inset: ${JSON.stringify(monthLayout)}`);
      }
      if (viewport.width <= 389) assert.ok(monthLayout.firstCalendarDayTop >= monthLayout.lastUpperToolBottom + 3, `${viewport.width}px full-width first date row should clear the complete upper tool stack: ${JSON.stringify(monthLayout)}`);
      assert.ok(monthLayout.toolsZIndex > monthLayout.pickerZIndex && monthLayout.pickerZIndex > monthLayout.railZIndex, `${viewport.width}px layering should be rail brush, compact picker, then real rail controls: ${JSON.stringify(monthLayout)}`);
      assert.equal(monthLayout.toolsHitTargets, true, `${viewport.width}px upper utilities and lower workspace rocker should remain the topmost hit targets: ${JSON.stringify(monthLayout)}`);
      if (viewport.width <= 389) {
        const expectedGridRight = Math.max(monthLayout.gridLeft + (7 * 44), monthLayout.railLeft - 8);
        assert.equal(monthLayout.pickerBackgroundAlpha, 1, `${viewport.width}px narrow picker should keep an opaque paper surface behind its date targets: ${JSON.stringify(monthLayout)}`);
        assert.ok(Math.abs(monthLayout.gridRight - expectedGridRight) <= 1, `${viewport.width}px narrow picker should use only the normal writing edge or seven-column minimum: ${JSON.stringify({ expectedGridRight, monthLayout })}`);
        if (viewport.width === 360) {
          const bindingAxis = monthLayout.railLeft + 2;
          assert.ok(monthLayout.gridRight - bindingAxis <= 8.5, `360px picker may cross the binding axis only as required by seven 44px columns: ${JSON.stringify({ bindingAxis, monthLayout })}`);
        }
      } else {
        const gridRailGap = monthLayout.railLeft - monthLayout.gridRight;
        const trackRailGap = monthLayout.railLeft - monthLayout.trackRight;
        assert.ok(gridRailGap >= 7 && gridRailGap <= 13 && trackRailGap >= 7 && trackRailGap <= 13, `${viewport.width}px calendar content should keep a deliberate 8–12px gap from the rail: ${JSON.stringify({ gridRailGap, trackRailGap, monthLayout })}`);
      }
    }
    if (viewport.width <= 390) assert.ok(monthLayout.timelineTop < monthLayout.viewportHeight, `${viewport.width}px expanded records should reveal the current surface start: ${JSON.stringify(monthLayout)}`);
    await page.screenshot({ path: join(outputDir, viewport.name), fullPage: false });
    await page.screenshot({ path: join(outputDir, `ln-057-rework10-expanded-${viewport.width}.png`), fullPage: false });
    if (viewport.width === 390 || viewport.width === 1280) {
      await page.screenshot({ path: join(outputDir, `ln-061-single-date-navigation-${viewport.width}.png`), fullPage: false });
      await page.screenshot({ path: join(outputDir, `ln-057-rework7-fused-date-context-${viewport.width}.png`), fullPage: false });
      await page.screenshot({ path: join(outputDir, `ln-057-rework8-diary-date-${viewport.width}.png`), fullPage: false });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => window.scrollY <= 1);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => window.scrollTo({ top: 160, left: 0, behavior: "auto" }));
  await page.waitForFunction(() => window.scrollY >= 159);
  const calendarBeforeHeightOnlyResize = await page.evaluate(() => ({ scrollY: window.scrollY, width: document.documentElement.clientWidth }));
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(120);
  const calendarAfterHeightOnlyResize = await page.evaluate(() => ({ scrollY: window.scrollY, width: document.documentElement.clientWidth }));
  assert.equal(calendarAfterHeightOnlyResize.width, calendarBeforeHeightOnlyResize.width, "The height-only calendar check must keep the layout viewport width stable");
  assert.ok(Math.abs(calendarAfterHeightOnlyResize.scrollY - calendarBeforeHeightOnlyResize.scrollY) <= 2, `Changing only viewport height should not pull an open calendar away from the user's reading position: ${JSON.stringify({ calendarBeforeHeightOnlyResize, calendarAfterHeightOnlyResize })}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  await seedDay.click();
  await assertVisible(page.getByText("出发上班。", { exact: true }));
  await sharedDateContext.evaluate((element) => { element.dataset.sharedProbe = "preserved"; });
  await setRecordView(page, "grouped");
  await assertVisible(page.getByRole("region", { name: "Category view" }));
  await setWorkspaceMode(page, "plan");
  await assertVisible(page.getByRole("grid", { name: "Day plan time grid" }));
  assert.equal(await page.locator(".home-view-title").count(), 0, "Day plan should hide record-only time/category navigation");
  assert.equal(await page.locator(".home-plan-title").count(), 0, "Day plan should keep the shared date as the primary left-side identity");
  assert.equal(await page.locator(".domain-directory-rail, .organize-helper").count(), 0, "Day plan should hide diary-only navigation and helper art");
  assert.equal(await page.locator('[data-edge-rail-item="workspace"][data-workspace-mode="plan"]').count(), 1, "Day plan should keep one workspace toggle reachable in the lower quick dock");
  const dayPlanPicker = page.locator(".calendar-view.picker-mode");
  await assertVisible(dayPlanPicker, "Switching the lower workspace to day plan should keep the upper date picker visible");
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "true", "The upper date context should stay expanded while the lower workspace changes");
  assert.equal(await sharedDateContext.getAttribute("data-shared-probe"), "preserved", "Records and day planning should reuse the same upper DOM");
  for (const viewport of [
    { width: 390, height: 844, name: "ln-057-shared-day-plan-390.png" },
    { width: 1280, height: 720, name: "ln-057-shared-day-plan-1280.png" }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px stable date context with day plan`);
    await assertMinTouchTarget(page.locator('[data-edge-rail-item="workspace"]'), `${viewport.width}px workspace toggle`);
    const stackedLayout = await page.evaluate(() => {
      const picker = document.querySelector(".calendar-view.picker-mode").getBoundingClientRect();
      const track = document.querySelector(".calendar-month-track").getBoundingClientRect();
      const navigation = document.querySelector(".date-context-navigation").getBoundingClientRect();
      const workspaceSwitch = document.querySelector('[data-edge-rail-item="workspace"]').getBoundingClientRect();
      const dayGrid = document.querySelector(".calendar-view.day-mode").getBoundingClientRect();
      const addPlan = document.querySelector(".day-plan-add").getBoundingClientRect();
      return {
        pickerLeft: picker.left,
        pickerRight: picker.right,
        pickerTop: picker.top,
        navigationBottom: navigation.bottom,
        trackBottom: track.bottom,
        workspaceSwitchTop: workspaceSwitch.top,
        workspaceSwitchBottom: workspaceSwitch.bottom,
        workspaceSwitchRight: workspaceSwitch.right,
        workspaceSwitchCenterX: workspaceSwitch.left + workspaceSwitch.width / 2,
        dayGridTop: dayGrid.top,
        dayGridHeight: dayGrid.height,
        addPlanTop: addPlan.top,
        addPlanBottom: addPlan.bottom,
        addPlanRight: addPlan.right,
        addPlanCenterX: addPlan.left + addPlan.width / 2,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth
      };
    });
    assert.ok(stackedLayout.pickerLeft >= -0.5 && stackedLayout.pickerRight <= stackedLayout.viewportWidth + 0.5, `${viewport.width}px upper picker should remain fully visible: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.navigationBottom <= stackedLayout.pickerTop + 1, `${viewport.width}px month panel should follow the static date identity in day plan: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.trackBottom <= stackedLayout.dayGridTop + 1, `${viewport.width}px plan canvas should follow the month panel without a record-only tab row: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.dayGridHeight >= (viewport.width === 390 ? 216 : 120), `${viewport.width}px lower day-plan workspace should remain usable below the expanded picker: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.addPlanTop >= stackedLayout.dayGridTop && stackedLayout.addPlanBottom <= stackedLayout.viewportHeight, `${viewport.width}px add-plan action should remain inside the visible day-plan viewport: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.workspaceSwitchBottom <= stackedLayout.addPlanTop, `${viewport.width}px diary/plan switch should sit above the plan action: ${JSON.stringify(stackedLayout)}`);
    if (viewport.width <= 700) {
      assert.ok(stackedLayout.workspaceSwitchCenterX - stackedLayout.addPlanCenterX >= 26 && stackedLayout.workspaceSwitchCenterX - stackedLayout.addPlanCenterX <= 30, `${viewport.width}px workspace toggle should sit in the lower label lane while add-plan stays on the binding axis: ${JSON.stringify(stackedLayout)}`);
    } else {
      assert.ok(stackedLayout.workspaceSwitchRight <= stackedLayout.viewportWidth && stackedLayout.addPlanRight <= stackedLayout.viewportWidth, `${viewport.width}px desktop workspace and add-plan actions should remain within the app shell: ${JSON.stringify(stackedLayout)}`);
    }
    await page.screenshot({ path: join(outputDir, viewport.name), fullPage: false });
    await page.screenshot({ path: join(outputDir, `ln-057-rework10-plan-${viewport.width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await calendarTrigger.click();
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "false", "Plan should use the same collapsible date context before a day swipe");
  const planDaySwipe = await swipeFullPage(-86, "ln-057-rework16-plan-shadow-orb-390.png", ".day-plan-scroll");
  assert.equal(planDaySwipe, "next", "A collapsed full-page swipe inside Plan should advance the day");
  await assertVisible(page.getByRole("heading", { name: /Wednesday, August 12/ }));
  await assertVisible(page.locator(".calendar-view.day-mode .plan-block", { hasText: "Review month interaction" }), "The Plan canvas should update with the swiped date");
  await calendarTrigger.click();
  await assertVisible(dayPlanPicker, "Reopening the shared date context should restore the month picker after a Plan swipe");
  await dayPlanPicker.locator('[data-calendar-date="2026-08-12"]').click();
  await assertVisible(page.locator(".calendar-view.day-mode .plan-block", { hasText: "Review month interaction" }), "Choosing a date inside day plan should update the same time grid");
  await setWorkspaceMode(page, "diary");
  await assertVisible(page.getByRole("region", { name: "Category view" }), "Returning to Diary should restore the prior record view");
  await assertVisible(page.locator(".calendar-view.picker-mode"), "Returning to records should preserve the upper date picker");
  assert.equal(await sharedDateContext.getAttribute("data-shared-probe"), "preserved", "Returning to records should keep the same upper DOM");
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "true", "Returning to records should not reset the upper date context");
  await assertVisible(page.getByRole("heading", { name: /Wednesday, August 12/ }));
  assert.equal(await page.getByText("出发上班。", { exact: true }).count(), 0, "Returning from day plan should keep the selected date instead of resetting it");
  assert.equal(await page.locator('[data-edge-rail-item="record-view"]').getAttribute("data-view-mode"), "grouped");
});

test("mobile writing-plane: Search, Settings, and Calendar share the binding edge", async (page) => {
  const viewports = [
    { width: 320, height: 844 },
    { width: 360, height: 844 },
    { width: 389, height: 844 },
    { width: 390, height: 844 }
  ];
  const measureToolSurface = (selector) => page.evaluate((surfaceSelector) => {
    const surfaceElement = document.querySelector(surfaceSelector);
    const surface = surfaceElement.getBoundingClientRect();
    const brush = document.querySelector(".home-edge-rail-brush").getBoundingClientRect();
    const closeElement = surfaceElement.querySelector(".search-field .icon-button");
    const close = closeElement?.getBoundingClientRect() || null;
    return {
      surfaceLeft: surface.left,
      surfaceRight: surface.right,
      brushLeft: brush.left,
      brushRight: brush.right,
      gapToBrush: brush.left - surface.right,
      closeLeft: close?.left ?? null,
      closeRight: close?.right ?? null,
      closeWidth: close?.width ?? null,
      closeHeight: close?.height ?? null,
      closeHitTarget: close
        ? document.elementFromPoint(close.left + close.width / 2, close.top + close.height / 2)?.closest(".search-field .icon-button") === closeElement
        : null,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  }, selector);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    await page.locator(".home-search-button").click();
    const searchSurface = page.locator(".search-surface");
    await assertVisible(searchSurface);
    const searchLayout = await measureToolSurface(".search-surface");
    assert.ok(searchLayout.gapToBrush >= 7 && searchLayout.gapToBrush <= 9, `${viewport.width}px Search should end 8px before the binding brush: ${JSON.stringify(searchLayout)}`);
    assert.ok(searchLayout.closeRight <= searchLayout.surfaceRight + 0.5 && searchLayout.closeWidth >= 43.99 && searchLayout.closeHeight >= 43.99 && searchLayout.closeHitTarget, `${viewport.width}px Search close should remain a visible 44px target inside the writing surface: ${JSON.stringify(searchLayout)}`);
    assert.ok(searchLayout.scrollWidth <= searchLayout.clientWidth, `${viewport.width}px Search should not create horizontal overflow: ${JSON.stringify(searchLayout)}`);
    if ([360, 390].includes(viewport.width)) {
      await page.screenshot({ path: join(outputDir, `ln-076-pwa-width-search-${viewport.width}.png`), fullPage: false });
    }
    await page.keyboard.press("Escape");
    await assertHidden(searchSurface);

    const settingsSurface = await openHomeSettings(page);
    const settingsLayout = await measureToolSurface(".settings-page-workspace");
    assert.ok(settingsLayout.gapToBrush >= 7 && settingsLayout.gapToBrush <= 9, `${viewport.width}px Settings should end 8px before the binding brush: ${JSON.stringify(settingsLayout)}`);
    assert.ok(settingsLayout.scrollWidth <= settingsLayout.clientWidth, `${viewport.width}px Settings should not create horizontal overflow: ${JSON.stringify(settingsLayout)}`);
    await page.locator(".home-settings-button").click();
    await assertHidden(settingsSurface);

    const calendarTrigger = page.locator(".home-date-title .date-context-disclosure");
    await calendarTrigger.click();
    const picker = page.locator(".calendar-view.picker-mode");
    await assertVisible(picker);
    const calendarLayout = await page.evaluate(() => {
      const grid = document.querySelector(".calendar-grid").getBoundingClientRect();
      const brush = document.querySelector(".home-edge-rail-brush").getBoundingClientRect();
      const days = [...document.querySelectorAll(".calendar-day")].map((day) => day.getBoundingClientRect());
      const tools = [...document.querySelectorAll(".home-edge-rail-tool")];
      return {
        gridLeft: grid.left,
        gridRight: grid.right,
        brushLeft: brush.left,
        bindingAxis: brush.left + brush.width / 2,
        expectedGridRight: Math.max(grid.left + (7 * 44), brush.left - 8),
        dayMinWidth: Math.min(...days.map((day) => day.width)),
        dayMinHeight: Math.min(...days.map((day) => day.height)),
        toolsHitTargets: tools.every((tool) => {
          const box = tool.getBoundingClientRect();
          return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest(".home-edge-rail-tool") === tool;
        }),
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      };
    });
    assert.ok(Math.abs(calendarLayout.gridRight - calendarLayout.expectedGridRight) <= 1, `${viewport.width}px Calendar should use only the writing edge or seven-column minimum: ${JSON.stringify(calendarLayout)}`);
    assert.ok(calendarLayout.dayMinWidth >= 43.99 && calendarLayout.dayMinHeight >= 43.99, `${viewport.width}px Calendar days should retain 44px targets: ${JSON.stringify(calendarLayout)}`);
    assert.equal(calendarLayout.toolsHitTargets, true, `${viewport.width}px Calendar must leave upper rail controls clickable: ${JSON.stringify(calendarLayout)}`);
    assert.ok(calendarLayout.scrollWidth <= calendarLayout.clientWidth, `${viewport.width}px Calendar should not create horizontal overflow: ${JSON.stringify(calendarLayout)}`);
    if (viewport.width === 360) {
      assert.ok(calendarLayout.gridRight - calendarLayout.bindingAxis <= 8.5, `360px Calendar may cross the binding axis only as required by seven 44px columns: ${JSON.stringify(calendarLayout)}`);
    }
    if ([360, 390].includes(viewport.width)) {
      await page.screenshot({ path: join(outputDir, `ln-076-pwa-width-calendar-${viewport.width}.png`), fullPage: false });
    }
    await page.keyboard.press("Escape");
    await assertHidden(picker);
  }
});

test("day plan: create, edit, persist, and delete a local time block", async (page) => {
  await setWorkspaceMode(page, "plan");
  const calendar = page.locator(".calendar-view.day-mode");
  await assertVisible(calendar.getByRole("grid", { name: "Day plan time grid" }));
  await assertVisible(calendar.getByText("Google Calendar sync · Account settings", { exact: true }), "An empty public Plan should quietly explain where Google Calendar sync is configured");
  const emptyPlan = calendar.locator(".day-plan-empty");
  await assertVisible(emptyPlan.locator(":scope > p:not(.day-plan-empty-hint)"), "The primary empty-plan action should finish mounting before typography is measured");
  await assertVisible(emptyPlan.locator(":scope > .day-plan-empty-hint"), "The Calendar hint should finish mounting before typography is measured");
  const emptyPlanCopy = await emptyPlan.evaluate((emptyState) => {
    const primary = emptyState.querySelector("p:not(.day-plan-empty-hint)");
    const hint = emptyState.querySelector(".day-plan-empty-hint");
    return {
      primarySize: Number.parseFloat(getComputedStyle(primary).fontSize),
      hintSize: Number.parseFloat(getComputedStyle(hint).fontSize),
      hintColor: getComputedStyle(hint).color,
      primaryColor: getComputedStyle(primary).color
    };
  });
  assert.ok(emptyPlanCopy.hintSize < emptyPlanCopy.primarySize, `The Calendar hint should remain subordinate to the empty-plan action: ${JSON.stringify(emptyPlanCopy)}`);
  assert.notEqual(emptyPlanCopy.hintColor, emptyPlanCopy.primaryColor, `The Calendar hint should use the quieter metadata color: ${JSON.stringify(emptyPlanCopy)}`);
  const emptyPlanBounds = await calendar.locator(".day-plan-empty").boundingBox();
  const dayPlanBounds = await calendar.boundingBox();
  assert.ok(emptyPlanBounds && dayPlanBounds && emptyPlanBounds.x >= dayPlanBounds.x && emptyPlanBounds.x + emptyPlanBounds.width <= dayPlanBounds.x + dayPlanBounds.width, `The Calendar hint should remain inside the day-plan paper: ${JSON.stringify({ emptyPlanBounds, dayPlanBounds })}`);
  await page.screenshot({ path: join(outputDir, "ln-067-plan-sync-hint-390.png"), fullPage: false });
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "zh-CN"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await setWorkspaceMode(page, "plan");
  const chineseCalendarHint = page.getByText("Google 日历同步 · 账号设置", { exact: true });
  await assertVisible(chineseCalendarHint, "The compact Calendar hint should remain available in Chinese");
  const chineseHintGeometry = await chineseCalendarHint.evaluate((hint) => {
    const hintBox = hint.getBoundingClientRect();
    const emptyBox = hint.closest(".day-plan-empty").getBoundingClientRect();
    return {
      emptyLeft: emptyBox.left,
      hintLeft: hintBox.left,
      hintRight: hintBox.right,
      emptyRight: emptyBox.right,
      textAlign: getComputedStyle(hint).textAlign
    };
  });
  assert.equal(chineseHintGeometry.textAlign, "left", `The bilingual metadata should keep a stable left reading edge: ${JSON.stringify(chineseHintGeometry)}`);
  assert.ok(chineseHintGeometry.hintLeft >= chineseHintGeometry.emptyLeft && chineseHintGeometry.hintRight <= chineseHintGeometry.emptyRight, `The Chinese Calendar hint should not clip either edge: ${JSON.stringify(chineseHintGeometry)}`);
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  await page.screenshot({ path: join(outputDir, "ln-067-plan-sync-hint-zh-390.png"), fullPage: false });
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await setWorkspaceMode(page, "plan");
  assert.equal(await page.getByRole("button", { name: "Add record" }).count(), 0, "Day plan should not show the global add-record action");
  assert.equal(await page.locator(".export-fab").count(), 0, "Day plan should not show record export actions");
  assert.equal(await page.locator(".home-view-title").count(), 0, "Day plan should not show the record-only time/category title");
  assert.equal(await page.locator(".home-plan-title").count(), 0, "Day plan should keep the shared date as the primary left-side identity");
  assert.equal(await page.locator(".domain-directory-rail, .organize-helper").count(), 0, "Day plan should hide diary-only navigation and helper art");
  assert.equal(await page.locator('[data-edge-rail-item="workspace"][data-workspace-mode="plan"]').count(), 1, "Day plan should retain one lower quick-dock workspace toggle");
  assert.equal(await calendar.getByRole("button", { name: "Add plan block" }).count(), 1, "Day plan should expose one contextual add-plan action");
  assert.equal(new URL(await page.locator(".day-plan-add img").getAttribute("src"), baseURL).pathname, "/ui/diary/plan-add-stamp.png", "The plan action should use the generated hand-drawn blue stamp");
  assert.equal(await page.locator(".day-plan-add svg").count(), 0, "The plan action should not mix the old SVG icon into the hand-drawn rail family");
  await calendar.locator(".day-plan-scroll").evaluate((element) => { element.scrollTop = 0; });
  await calendar.locator(".day-plan-canvas").click({ position: { x: 120, y: 220 } });
  let editor = page.getByRole("dialog", { name: "New plan" });
  await assertVisible(editor, "Clicking an empty time slot should open the contextual plan editor");
  assert.equal(await editor.getByLabel("Starts").inputValue(), "09:00", "The clicked time slot should be snapped to 15 minutes");
  await editor.getByLabel("Plan").fill("Optimize promotion report");
  await editor.getByLabel("Starts").fill("14:00");
  await editor.getByLabel("Ends").fill("18:00");
  await editor.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Plan added" }));
  let block = calendar.locator(".plan-block", { hasText: "Optimize promotion report" });
  await assertVisible(block);
  assert.equal(await block.getByText("14:00–18:00", { exact: true }).count(), 1);
  const storedPlan = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).planBlocks[0]);
  assert.deepEqual(
    { title: storedPlan.title, startTime: storedPlan.startTime, endTime: storedPlan.endTime, source: storedPlan.source },
    { title: "Optimize promotion report", startTime: "14:00", endTime: "18:00", source: "local" }
  );
  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

  for (const viewport of [
    { width: 320, height: 844, name: "ln-047-google-day-plan-320.png" },
    { width: 390, height: 844, name: "ln-047-google-day-plan-390.png" },
    { width: 426, height: 923, name: "ln-047-google-day-plan-426.png" },
    { width: 600, height: 900, name: "ln-047-google-day-plan-600.png" },
    { width: 671, height: 900, name: "ln-047-google-day-plan-671.png" },
    { width: 700, height: 900, name: "ln-047-google-day-plan-700.png" },
    { width: 1280, height: 720, name: "ln-047-google-day-plan-1280.png" }
  ]) {
    await page.setViewportSize(viewport);
    await calendar.locator(".day-plan-scroll").evaluate((element) => { element.scrollTop = 7 * 72 - 18; });
    await assertNoHorizontalOverflow(page, `${viewport.width}px day plan`);
    await assertMinTouchTarget(calendar.getByRole("button", { name: "Add plan block" }), `${viewport.width}px add plan`);
    await assertMinTouchTarget(page.locator('[data-edge-rail-item="workspace"]'), `${viewport.width}px workspace toggle`);
    const layout = await page.evaluate(() => {
      const topbar = document.querySelector(".topbar");
      const workspace = document.querySelector(".home-workspace");
      const calendarView = document.querySelector(".calendar-view.day-mode");
      const scroll = document.querySelector(".day-plan-scroll");
      const addPlan = document.querySelector(".day-plan-add");
      const rail = document.querySelector(".home-edge-rail-brush");
      const box = (element) => element.getBoundingClientRect();
      return {
        viewportHeight: window.innerHeight,
        pageScrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
        topbar: box(topbar),
        workspace: box(workspace),
        calendar: box(calendarView),
        addPlan: box(addPlan),
        addPlanZIndex: Number.parseInt(getComputedStyle(addPlan).zIndex, 10),
        railZIndex: Number.parseInt(getComputedStyle(rail).zIndex, 10),
        actionDockCount: document.querySelectorAll(".action-dock").length,
        workspaceSwitchCount: document.querySelectorAll('[data-edge-rail-item="workspace"]').length,
        recordActionRowCount: document.querySelectorAll(".record-action-row").length,
        gridClientHeight: scroll.clientHeight,
        gridScrollHeight: scroll.scrollHeight,
        gridScrollTop: scroll.scrollTop
      };
    });
    assert.equal(layout.pageScrollY, 0, `Day plan should start at page scrollY=0: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.documentHeight <= layout.viewportHeight + 1, `The page itself should not scroll to reach day-plan actions: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.workspace.top >= layout.topbar.bottom - 1, `The day-plan workspace should begin below the topbar: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(Math.abs(layout.workspace.bottom - layout.viewportHeight) <= 1, `The day-plan workspace should fill the remaining viewport: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.calendar.bottom <= layout.viewportHeight + 1, `The day calendar should remain inside the viewport: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.addPlan.top >= layout.workspace.top && layout.addPlan.bottom <= layout.viewportHeight, `The add-plan FAB should remain fully visible: ${JSON.stringify({ viewport, layout })}`);
    if (viewport.width <= 700) assert.ok(layout.addPlanZIndex > layout.railZIndex, `The hand-drawn plan stamp should sit above the shared rail brush: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.actionDockCount, 1, `Day plan should keep one lower workspace dock without Diary-only actions: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.workspaceSwitchCount, 1, `Day plan should keep the diary/plan switch: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.recordActionRowCount, 0, `Day plan should remove diary-only export and add actions: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.gridClientHeight > 0 && layout.gridScrollHeight > layout.gridClientHeight, `The time grid should own vertical scrolling: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.gridScrollTop > 0, `The time grid should scroll independently without moving the page: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(await page.locator(".export-fab").count(), 0, "Record export should stay hidden inside day plan");
    await page.screenshot({ path: join(outputDir, viewport.name), fullPage: false });
    if (viewport.width !== 320) await page.screenshot({ path: join(outputDir, `ln-060-day-plan-no-record-switch-${viewport.width}.png`), fullPage: false });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await setWorkspaceMode(page, "diary");
  assert.equal(await page.getByRole("region", { name: "Timeline view" }).count(), 0, "Returning to an empty diary should restore actions without adding an empty Record section");
  const addRecord = page.getByRole("button", { name: "Add record" });
  await assertVisible(addRecord, "Leaving day plan should restore the home quick-record action");
  await assertVisible(page.locator(".export-fab"), "Leaving day plan should restore the record export action");
  await addRecord.click();
  const recordDialog = page.getByRole("dialog", { name: "New record" });
  await assertVisible(recordDialog);
  await recordDialog.locator(".writing-area textarea").fill("Quick record after day plan");
  await recordDialog.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".timeline .entry", { hasText: "Quick record after day plan" }), "Quick record should still save after leaving day plan");
  await setWorkspaceMode(page, "plan");
  block = page.locator(".calendar-view .plan-block", { hasText: "Optimize promotion report" });
  await block.click();
  editor = page.getByRole("dialog", { name: "Edit plan" });
  await editor.getByLabel("Plan").fill("Optimize weekly report");
  await editor.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Plan updated" }));

  await page.reload({ waitUntil: "domcontentloaded" });
  await setWorkspaceMode(page, "plan");
  block = page.locator(".calendar-view .plan-block", { hasText: "Optimize weekly report" });
  await assertVisible(block, "Local plan should survive refresh");
  await block.click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("dialog", { name: "Edit plan" }).getByRole("button", { name: "Delete plan" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Plan deleted" }));
  assert.equal(await page.locator(".calendar-view .plan-block").count(), 0);
});

test("Plan Agent: wake, anchor, discuss, explicitly update, and keep Google context read-only", async (page) => {
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "en"));
  await page.evaluate((date) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.planBlocks = [
      { id: "plan-agent-a", date, title: "处理一下", startTime: "09:00", endTime: "10:00", source: "local", flexibility: "movable", externalRef: null, createdAt: 1, updatedAt: 1 },
      { id: "plan-agent-b", date, title: "团队同步", startTime: "09:30", endTime: "10:30", source: "local", flexibility: "fixed", externalRef: null, createdAt: 2, updatedAt: 2 }
    ];
    window.localStorage.setItem(key, JSON.stringify(state));
  }, testDate);
  await page.reload({ waitUntil: "domcontentloaded" });

  await setWorkspaceMode(page, "plan");
  const wake = page.getByRole("button", { name: "Wake Plan Agent" });
  await assertVisible(wake);
  await assertMinTouchTarget(wake, "Plan Agent activation");
  const before = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).planBlocks);
  await wake.click();
  await assertVisible(page.getByText("Checking times and titles…", { exact: true }));

  const panel = page.locator(".plan-agent-review-layer .agent-review-panel");
  await assertVisible(panel);
  assert.equal(await page.locator('.plan-block[data-plan-id="plan-agent-a"][aria-current="step"]').count(), 1, "Plan Agent should anchor to the allowlisted local plan");
  assert.equal(await page.locator('.plan-block.google[aria-current="step"]').count(), 0, "Google context must never become the active update target");
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).planBlocks), before, "Waking Plan Agent must not mutate plans");
  assert.equal(await panel.getByRole("button", { name: "Update plan" }).count(), 0, "Discussion should begin without an executable update");
  assert.equal(await panel.getByRole("button", { name: "Keep original plan" }).count(), 1);

  const initialLayout = await page.evaluate(() => {
    const panel = document.querySelector(".plan-agent-review-layer .agent-review-panel")?.getBoundingClientRect();
    const rail = document.querySelector(".home-edge-rail-brush")?.getBoundingClientRect();
    const add = document.querySelector(".day-plan-add")?.getBoundingClientRect();
    return panel && rail && add ? {
      panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom, width: panel.width },
      rail: { left: rail.left, right: rail.right },
      add: { left: add.left, right: add.right, top: add.top, bottom: add.bottom }
    } : null;
  });
  assert.ok(initialLayout && initialLayout.panel.width <= 250, `Mobile Plan annotation should stay compact: ${JSON.stringify(initialLayout)}`);
  assert.ok(initialLayout.panel.right <= initialLayout.rail.left - 4, `Plan annotation should stay clear of the right rail: ${JSON.stringify(initialLayout)}`);
  assert.ok(initialLayout.panel.bottom <= initialLayout.add.top - 4 || initialLayout.panel.top >= initialLayout.add.bottom + 4, `Plan annotation should not cover add-plan: ${JSON.stringify(initialLayout)}`);
  await assertNoHorizontalOverflow(page, "390px Plan Agent review");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: join(outputDir, "ln-074-plan-agent-review-390.png"), fullPage: false });

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 844 },
    { width: 700, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    await assertNoHorizontalOverflow(page, `${viewport.width}px Plan Agent review`);
    await assertMinTouchTarget(panel.getByRole("button", { name: "Keep original plan" }), `${viewport.width}px Plan Agent keep action`);
    const geometry = await page.evaluate(() => {
      const panel = document.querySelector(".plan-agent-review-layer .agent-review-panel")?.getBoundingClientRect();
      const add = document.querySelector(".day-plan-add")?.getBoundingClientRect();
      const rail = document.querySelector(".home-edge-rail-brush")?.getBoundingClientRect();
      return panel && add && rail ? {
        panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
        add: { left: add.left, right: add.right, top: add.top, bottom: add.bottom },
        rail: { left: rail.left, right: rail.right }
      } : null;
    });
    assert.ok(geometry && geometry.panel.left >= 0 && geometry.panel.right <= viewport.width, `${viewport.width}px Plan annotation should remain inside the viewport: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.panel.bottom <= geometry.add.top - 4 || geometry.panel.top >= geometry.add.bottom + 4, `${viewport.width}px Plan annotation should stay clear of add-plan: ${JSON.stringify(geometry)}`);
    if (viewport.width <= 700) assert.ok(geometry.panel.right <= geometry.rail.left - 4, `${viewport.width}px Plan annotation should stay clear of the mobile rail: ${JSON.stringify(geometry)}`);
    if ([320, 1280].includes(viewport.width)) await page.screenshot({ path: join(outputDir, `ln-074-plan-agent-review-${viewport.width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 390, height: 844 });

  const proposedTitle = "完成发布前检查";
  await panel.locator("textarea").fill(proposedTitle);
  await panel.getByRole("button", { name: "Send", exact: true }).click();
  await assertVisible(panel.getByRole("button", { name: "Update plan" }));
  assert.equal((await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).planBlocks.find((item) => item.id === "plan-agent-a").title)), "处理一下", "Conversation and preview must not write");
  await assertVisible(panel.locator(".agent-review-plan-proposal strong", { hasText: proposedTitle }));

  const actionLayout = await panel.locator(".agent-review-actions").evaluate((element) => {
    const actions = [...element.querySelectorAll("button")].map((button) => ({ box: button.getBoundingClientRect(), borderLeft: getComputedStyle(button).borderLeftWidth, borderTop: getComputedStyle(button).borderTopWidth }));
    return {
      heights: actions.map(({ box }) => box.height),
      stacked: actions.every(({ box }, index) => index === 0 || box.top >= actions[index - 1].box.bottom - 0.5),
      borders: actions.map(({ borderLeft, borderTop }) => [borderLeft, borderTop])
    };
  });
  assert.ok(actionLayout.heights.every((height) => height >= 43.99), `Plan actions should retain 44px targets: ${JSON.stringify(actionLayout)}`);
  assert.equal(actionLayout.stacked, true, `Plan actions should stack vertically on mobile: ${JSON.stringify(actionLayout)}`);
  assert.ok(actionLayout.borders.every(([left, top]) => left === "0px" && top === "0px"), `Plan actions should not look like a divided menu: ${JSON.stringify(actionLayout)}`);
  await page.screenshot({ path: join(outputDir, "ln-074-plan-agent-proposal-390.png"), fullPage: false });

  await panel.getByRole("button", { name: "Update plan" }).click();
  const updated = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).planBlocks.find((item) => item.id === "plan-agent-a"));
  assert.equal(updated.title, proposedTitle);
  assert.equal(updated.startTime, "09:00");
  assert.equal(updated.endTime, "10:00");
  assert.equal(updated.source, "local");
  await panel.getByRole("button", { name: "Keep original plan" }).click();
  await assertVisible(page.getByText("Plan review complete", { exact: true }));

  await page.getByRole("button", { name: "Review again" }).click();
  await assertVisible(panel);
  await page.locator('.plan-block[data-plan-id="plan-agent-a"]').click();
  await assertHidden(panel, "Opening the Plan editor should cancel review");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Wake Plan Agent" }).click();
  await assertVisible(panel);
  await panel.getByRole("button", { name: "Keep original plan" }).click();
  await assertVisible(page.locator('.plan-block[data-plan-id="plan-agent-b"][aria-current="step"]'));
  await panel.locator("textarea").fill("改到 10:30-11:30");
  await panel.getByRole("button", { name: "Send", exact: true }).click();
  await assertVisible(panel.getByRole("button", { name: "Update plan" }));
  const beforeTimeConfirm = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).planBlocks.find((item) => item.id === "plan-agent-b"));
  assert.equal(beforeTimeConfirm.startTime, "09:30", "A time proposal must remain inert before confirmation");
  assert.equal(beforeTimeConfirm.endTime, "10:30", "A time proposal must preserve the original end before confirmation");
  await panel.getByRole("button", { name: "Update plan" }).click();
  const afterTimeConfirm = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).planBlocks.find((item) => item.id === "plan-agent-b"));
  assert.equal(afterTimeConfirm.title, "团队同步");
  assert.equal(afterTimeConfirm.startTime, "10:30");
  assert.equal(afterTimeConfirm.endTime, "11:30");
  assert.equal(afterTimeConfirm.source, "local");
  await assertVisible(page.getByText("Plan review complete", { exact: true }));

  const persistentEvidenceDir = join(outputDir, "ln-074-plan-agent-persistent");
  await mkdir(persistentEvidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  let passiveAgentRequests = 0;
  const observePassiveRequests = (request) => {
    if (new URL(request.url()).pathname === "/api/organize/agent") passiveAgentRequests += 1;
  };
  page.on("request", observePassiveRequests);
  await page.evaluate((date) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.planBlocks = [];
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "zh-CN");
    window.localStorage.setItem("log-note:google-calendar:user:e2e-user:v1", JSON.stringify({
      version: 1,
      calendarId: "primary",
      lastSyncedAt: "2026-08-23T00:00:00.000Z",
      timedEvents: [{
        id: `google:primary:plan-agent-only:${date}`,
        date,
        title: "Google-only context",
        startTime: "09:00",
        endTime: "10:00",
        source: "google",
        flexibility: "fixed",
        externalRef: { provider: "google", calendarId: "primary", eventId: "plan-agent-only", etag: "e2e" }
      }],
      allDayEvents: []
    }));
  }, testDate);
  await page.reload({ waitUntil: "domcontentloaded" });
  await setWorkspaceMode(page, "plan");
  await assertVisible(page.locator(".plan-block.google", { hasText: "Google-only context" }));
  const passiveAgent = page.locator('.plan-agent-home[data-agent-passive="true"]');
  await assertVisible(passiveAgent, "Google-only Plan should retain the passive Agent companion");
  await assertVisible(passiveAgent.getByText("编写计划后和我聊聊吧", { exact: true }));
  assert.equal(await passiveAgent.getByRole("button", { name: "唤醒计划 Agent" }).count(), 0, "Google-only days must not expose Plan Agent activation");
  await page.screenshot({ path: join(persistentEvidenceDir, "google-only-390.png"), fullPage: false });

  await page.setViewportSize({ width: 320, height: 760 });
  await page.evaluate(() => {
    window.localStorage.removeItem("log-note:google-calendar:user:e2e-user:v1");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await setWorkspaceMode(page, "plan");
  await assertVisible(passiveAgent, "Empty Plan should retain the passive Agent companion");
  const emptyStateBefore = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).planBlocks);
  const passiveMetrics = await passiveAgent.evaluate((node) => {
    const hint = node.querySelector(".plan-agent-passive-hint");
    const figure = node.querySelector(".plan-agent-wake-figure");
    const add = document.querySelector(".day-plan-add");
    const hintBox = hint.getBoundingClientRect();
    const figureBox = figure.getBoundingClientRect();
    const addBox = add.getBoundingClientRect();
    const overlapArea = (first, second) => Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left))
      * Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
    const hintStyle = getComputedStyle(hint);
    return {
      fontSize: Number.parseFloat(hintStyle.fontSize),
      lineHeight: Number.parseFloat(hintStyle.lineHeight),
      whiteSpace: hintStyle.whiteSpace,
      hintHeight: hintBox.height,
      hintOverflow: hint.scrollWidth - hint.clientWidth,
      hintAddOverlap: overlapArea(hintBox, addBox),
      figureAddOverlap: overlapArea(figureBox, addBox),
      rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  assert.equal(passiveMetrics.whiteSpace, "nowrap", `Passive Plan Agent hint should stay on one line: ${JSON.stringify(passiveMetrics)}`);
  assert.ok(passiveMetrics.fontSize >= 11.9 && passiveMetrics.fontSize <= 12.1, `Passive Plan Agent hint should use the 12px supporting role: ${JSON.stringify(passiveMetrics)}`);
  assert.ok(passiveMetrics.hintHeight <= passiveMetrics.lineHeight + 1, `Passive Plan Agent hint should occupy one text line: ${JSON.stringify(passiveMetrics)}`);
  assert.ok(passiveMetrics.hintOverflow <= 1, `Passive Plan Agent hint should not truncate at 320px: ${JSON.stringify(passiveMetrics)}`);
  assert.equal(passiveMetrics.hintAddOverlap, 0, `Passive hint should not cover the add-plan action: ${JSON.stringify(passiveMetrics)}`);
  assert.equal(passiveMetrics.figureAddOverlap, 0, `Passive artwork should not cover the add-plan action: ${JSON.stringify(passiveMetrics)}`);
  assert.ok(passiveMetrics.rootOverflow <= 1, `Passive Plan Agent should not create horizontal overflow: ${JSON.stringify(passiveMetrics)}`);
  const emptyStateAfter = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).planBlocks);
  assert.deepEqual(emptyStateAfter, emptyStateBefore, "Passive Plan Agent presence must not write a plan");
  assert.equal(passiveAgentRequests, 0, "Passive Plan Agent presence must not dispatch Agent requests");
  page.off("request", observePassiveRequests);
  await page.screenshot({ path: join(persistentEvidenceDir, "empty-320.png"), fullPage: false });
});

test("Google calendar: cached events are account-scoped, visible, and read-only", async (page) => {
  const dataBefore = await page.evaluate(({ date }) => {
    const state = JSON.parse(window.localStorage.getItem("log-note:data:v1"));
    state.planBlocks = [{
      id: "local-google-sync-plan",
      date,
      title: "Local planning review",
      startTime: "10:30",
      endTime: "11:30",
      flexibility: "fixed",
      source: "local",
      createdAt: 1,
      updatedAt: 1
    }];
    window.localStorage.setItem("log-note:data:v1", JSON.stringify(state));
    window.localStorage.setItem("log-note:google-calendar:user:e2e-user:v1", JSON.stringify({
      version: 1,
      calendarId: "primary",
      lastSyncedAt: "2026-08-17T02:00:00.000Z",
      timedEvents: [{
        id: `google:primary:timed-event:${date}`,
        date,
        title: "Google project review",
        startTime: "08:30",
        endTime: "09:30",
        source: "google",
        flexibility: "fixed",
        externalRef: { provider: "google", calendarId: "primary", eventId: "timed-event", etag: "etag-timed" }
      }],
      allDayEvents: [{
        id: `google-all-day:primary:all-day-event:${date}`,
        date,
        title: "Google all-day context",
        source: "google",
        allDay: true,
        externalRef: { provider: "google", calendarId: "primary", eventId: "all-day-event", etag: "etag-all-day" }
      }]
    }));
    return window.localStorage.getItem("log-note:data:v1");
  }, { date: testDate });
  await page.reload({ waitUntil: "domcontentloaded" });

  await setWorkspaceMode(page, "plan");
  await assertVisible(page.locator(".day-plan-all-day", { hasText: "Google all-day context" }));
  const googleBlock = page.locator(".plan-block.google", { hasText: "Google project review" });
  const localBlock = page.locator(".plan-block:not(.google)", { hasText: "Local planning review" });
  await assertVisible(googleBlock);
  await assertVisible(localBlock);
  assert.match(await googleBlock.textContent(), /Google/, "Imported Google events should expose a quiet source label");

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px Google calendar day plan`);
    await page.screenshot({ path: join(outputDir, `ln-067-google-calendar-day-plan-${viewport.width}.png`), fullPage: false });
  }

  await googleBlock.click();
  const googleDetails = page.getByRole("dialog", { name: "Event details" });
  await assertVisible(googleDetails);
  assert.equal(await googleDetails.locator("input:not([disabled]), select:not([disabled])").count(), 0, "Google event details must not expose editable controls");
  assert.equal(await googleDetails.getByRole("button", { name: "Delete plan" }).count(), 0, "Google events must not expose local deletion");
  await assertVisible(googleDetails.getByText("From Google Calendar. This event is read-only in Log Note.", { exact: true }));
  await googleDetails.locator(".surface-header .icon-button").click();

  await localBlock.click();
  const localEditor = page.getByRole("dialog", { name: "Edit plan" });
  await assertVisible(localEditor);
  assert.equal(await localEditor.getByLabel("Plan").isEnabled(), true, "Local plans must remain editable beside Google context");
  await assertVisible(localEditor.getByRole("button", { name: "Delete plan" }));
  await localEditor.locator(".surface-header .icon-button").click();

  await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  await openSettingsPanel(page, "Account");
  const googleSettings = page.locator(".google-calendar-workspace");
  await assertVisible(googleSettings.getByRole("heading", { name: "Google Calendar" }));
  await assertVisible(googleSettings.getByText("Authorization needed", { exact: true }));
  assert.equal(await googleSettings.getByRole("button", { name: "Sync now" }).isEnabled(), true, "A configured Calendar client should expose explicit sync");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), dataBefore, "Displaying Google cache must not rewrite Log Note data");

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await googleSettings.scrollIntoViewIfNeeded();
    await assertNoHorizontalOverflow(page, `${viewport.width}px Google calendar account setting`);
    await page.screenshot({ path: join(outputDir, `ln-067-google-calendar-settings-${viewport.width}.png`), fullPage: false });
  }

  page.once("dialog", (dialog) => dialog.accept());
  await googleSettings.getByRole("button", { name: "Disconnect and clear cache" }).click();
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:google-calendar:user:e2e-user:v1")), null, "Disconnect should clear only the current account's Google cache");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), dataBefore, "Disconnecting Google Calendar must not change local plans or records");
  await assertVisible(googleSettings.getByText("Not connected", { exact: true }));
});

if (googleCalendarUnavailableOnly) test("Google Calendar unavailable deployment explains the domain boundary", async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "zh-CN"));
  await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-settings-panel="account"]').click();
  const googleSettings = page.locator(".google-calendar-workspace");
  await assertVisible(googleSettings.getByRole("heading", { name: "Google 日历" }));
  assert.equal(await googleSettings.getAttribute("data-google-calendar-status"), "unavailable");
  assert.equal(await googleSettings.getAttribute("data-google-calendar-issue"), "deployment-unavailable");
  await assertVisible(googleSettings.getByText("当前域名不可用", { exact: true }));
  await assertVisible(googleSettings.getByText("当前域名尚未开通 Google 日历。计划仍保存在 Log Note，域名授权后即可连接同步。", { exact: true }));
  assert.equal(await googleSettings.getByText("NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID").count(), 0, "Settings must not expose build-time variable names");
  assert.equal(await googleSettings.getByRole("button", { name: "连接并同步" }).isEnabled(), false, "An unavailable domain must not expose a working connection action");
  await assertNoHorizontalOverflow(page, "390px Google Calendar unavailable deployment");
  await googleSettings.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(outputDir, "ln-067-google-calendar-domain-unavailable-390.png"), fullPage: false });
});

test("linear record: add, search, edit, and delete", async (page) => {
  const content = "E2E mobile record";
  await addQuickRecord(page, content);
  await assertVisible(page.locator(".timeline .entry", { hasText: content }));

  await page.locator(".home-search-button").click();
  const searchSurface = page.locator(".search-surface");
  await assertVisible(searchSurface);
  await searchSurface.locator("input").fill("mobile record");
  const result = page.locator(".search-result", { hasText: content });
  await assertVisible(result);
  const searchSpacing = await searchSurface.evaluate((surface) => {
    const count = surface.querySelector(".result-count").getBoundingClientRect();
    const resultBox = surface.querySelector(".search-result").getBoundingClientRect();
    const contentColumn = surface.querySelectorAll(".search-result > span")[1];
    const contentParts = [...contentColumn.children];
    return {
      countToResult: resultBox.top - count.bottom,
      contentPairGap: contentParts.length > 1 ? contentParts[1].getBoundingClientRect().top - contentParts[0].getBoundingClientRect().bottom : null
    };
  });
  ln058Evidence.search = searchSpacing;
  assert.ok(searchSpacing.countToResult >= 7 && searchSpacing.countToResult <= 9, `Search results should start one related-content rhythm after their count: ${JSON.stringify(searchSpacing)}`);
  assert.ok(searchSpacing.contentPairGap >= 3 && searchSpacing.contentPairGap <= 5, `Search result details should stay paired: ${JSON.stringify(searchSpacing)}`);
  await page.screenshot({ path: join(outputDir, "ln-058-search-390.png"), fullPage: true });
  await result.click();

  await page.locator(".writing-area textarea").fill(`${content} edited`);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
  assert.equal(await page.locator(".search-surface").count(), 0, "Search shortcut should not replace an active record draft");
  const inlineEditor = page.locator("[data-inline-record-editor]");
  await inlineEditor.getByRole("button", { name: "Cancel" }).focus();
  await page.keyboard.press("n");
  assert.equal(await page.getByRole("dialog", { name: "Edit record" }).count(), 0, "Existing record editing must remain non-modal");
  assert.equal(await inlineEditor.count(), 1, "New-record shortcut should not replace an active inline edit draft");
  assert.equal(await page.locator(".writing-area textarea").inputValue(), `${content} edited`, "Blocked shortcuts must preserve unsaved text");
  await page.getByRole("button", { name: "Done" }).click();
  const edited = page.locator(".timeline .entry", { hasText: `${content} edited` });
  await assertVisible(edited);

  await edited.locator("[data-entry-content-action]").click();
  await page.getByRole("button", { name: "More" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete record" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Record deleted" }));
  assert.equal(await page.locator(".timeline .entry", { hasText: `${content} edited` }).count(), 0);
});

test("LN-080 inline record editing keeps content in-row and time in a narrow surface", async (page) => {
  const firstContent = "Inline edit first record";
  const secondContent = "Inline edit second record";
  await addQuickRecord(page, firstContent);
  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 });
  await addQuickRecord(page, secondContent);
  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 });

  const readStored = () => page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  let firstRow = page.locator(".timeline .entry", { hasText: firstContent });
  const beforeCancel = await readStored();
  await firstRow.locator("[data-entry-content-action]").click();
  const inlineEditor = firstRow.locator("[data-inline-record-editor]");
  await assertVisible(inlineEditor);
  assert.equal(await page.locator('.overlay:has(.composer), [role="dialog"][aria-modal="true"]:has(.composer)').count(), 0, "Existing-record content should not open the modal composer");
  await inlineEditor.locator(".writing-area textarea").fill(`${firstContent} cancelled`);
  await inlineEditor.getByRole("button", { name: "Cancel" }).click();
  assert.deepEqual(await readStored(), beforeCancel, "Inline Cancel must leave the stored account payload exact");

  firstRow = page.locator(".timeline .entry", { hasText: firstContent });
  await firstRow.locator("[data-entry-content-action]").click();
  await firstRow.locator(".writing-area textarea").fill(`${firstContent} saved`);
  await firstRow.getByRole("button", { name: "Done" }).click();
  firstRow = page.locator(".timeline .entry", { hasText: `${firstContent} saved` });
  await assertVisible(firstRow);

  const beforeEscape = await readStored();
  await firstRow.locator("[data-entry-content-action]").click();
  await firstRow.locator(".writing-area textarea").fill(`${firstContent} escaped`);
  await page.keyboard.press("Escape");
  assert.deepEqual(await readStored(), beforeEscape, "Inline Escape must leave the stored account payload exact");

  firstRow = page.locator(".timeline .entry", { hasText: `${firstContent} saved` });
  const beforeAttachmentCancel = await readStored();
  await firstRow.locator("[data-entry-content-action]").click();
  await firstRow.getByRole("button", { name: "More" }).click();
  await firstRow.locator('input[type="file"][accept*="image/jpeg"]').setInputFiles(join(process.cwd(), "public/icon-192.png"));
  await assertVisible(page.locator(".toast", { hasText: "Image kept locally" }));
  await firstRow.getByRole("button", { name: "Cancel" }).click();
  await assertHidden(firstRow.locator("[data-inline-record-editor]"));
  assert.deepEqual(await readStored(), beforeAttachmentCancel, "Cancel must discard staged attachment metadata");
  const stagedAttachmentCount = await page.evaluate(async () => new Promise((resolve, reject) => {
    const open = indexedDB.open("log-note-attachments", 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains("images")) {
        database.close();
        resolve(0);
        return;
      }
      const request = database.transaction("images", "readonly").objectStore("images").count();
      request.onsuccess = () => { database.close(); resolve(request.result); };
      request.onerror = () => reject(request.error);
    };
  }));
  assert.equal(stagedAttachmentCount, 0, "Cancel must remove the staged image Blob");

  const storedBeforeTime = await readStored();
  const storedEntryBeforeTime = storedBeforeTime.entries.find((entry) => entry.content === `${firstContent} saved`);
  const timeTrigger = firstRow.locator("[data-entry-time-action]");
  await timeTrigger.click();
  const timeEditor = firstRow.locator("[data-record-time-editor]");
  await assertVisible(timeEditor);
  assert.equal(await timeEditor.getAttribute("aria-modal"), null, "Time fine-tuning should stay non-modal");
  assert.equal(await firstRow.locator("[data-inline-record-editor]").count(), 0, "Time activation must not activate content editing");
  await assertMinTouchTarget(timeEditor.locator('input[type="time"]'), "Time fine-tuning input");
  await assertMinTouchTarget(timeEditor.getByRole("button", { name: "Cancel" }), "Time fine-tuning Cancel");
  await assertMinTouchTarget(timeEditor.getByRole("button", { name: "Done" }), "Time fine-tuning Done");
  const timeGeometry = await firstRow.evaluate((row) => {
    const rowBox = row.getBoundingClientRect();
    const surfaceBox = row.querySelector("[data-record-time-editor]").getBoundingClientRect();
    return {
      belowCurrentRow: surfaceBox.top >= rowBox.bottom - 1,
      insideViewport: surfaceBox.left >= 0 && surfaceBox.right <= document.documentElement.clientWidth
    };
  });
  assert.equal(timeGeometry.belowCurrentRow, true, `Time surface should not cover its current row: ${JSON.stringify(timeGeometry)}`);
  assert.equal(timeGeometry.insideViewport, true, `Time surface should remain inside the viewport: ${JSON.stringify(timeGeometry)}`);
  await page.screenshot({ path: join(outputDir, "ln-080-time-editor-390.png"), fullPage: false });
  await timeEditor.locator('input[type="time"]').fill("06:15");
  await timeEditor.getByRole("button", { name: "Done" }).click();
  const storedAfterTime = await readStored();
  const storedEntryAfterTime = storedAfterTime.entries.find((entry) => entry.id === storedEntryBeforeTime.id);
  assert.deepEqual(storedEntryAfterTime, { ...storedEntryBeforeTime, time: "06:15" }, "Time Done must preserve every non-time field exactly");

  firstRow = page.locator(".timeline .entry", { hasText: `${firstContent} saved` });
  await firstRow.locator("[data-entry-time-action]").click();
  await firstRow.locator('[data-record-time-editor] input[type="time"]').fill("07:20");
  await page.keyboard.press("Escape");
  assert.equal((await readStored()).entries.find((entry) => entry.id === storedEntryBeforeTime.id).time, "06:15", "Escape must discard the time draft");
  assert.equal(await firstRow.locator("[data-entry-time-action]").evaluate((node) => document.activeElement === node), true, "Closing time fine-tuning should restore trigger focus");

  await firstRow.locator("[data-entry-time-action]").click();
  await firstRow.locator('[data-record-time-editor] input[type="time"]').fill("07:20");
  await firstRow.locator("[data-record-time-editor]").getByRole("button", { name: "Cancel" }).click();
  assert.equal((await readStored()).entries.find((entry) => entry.id === storedEntryBeforeTime.id).time, "06:15", "Time Cancel must discard the time draft");

  await firstRow.locator("[data-entry-time-action]").click();
  await firstRow.locator('[data-record-time-editor] input[type="time"]').fill("08:25");
  await page.locator("#timeline-records-heading").click();
  assert.equal((await readStored()).entries.find((entry) => entry.id === storedEntryBeforeTime.id).time, "06:15", "Outside activation must discard the time draft");

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    firstRow = page.locator(".timeline .entry", { hasText: `${firstContent} saved` });
    await firstRow.locator("[data-entry-content-action]").click();
    await assertNoHorizontalOverflow(page, `${viewport.width}px LN-080 inline content editor`);
    await assertMinTouchTarget(firstRow.getByRole("button", { name: "Done" }), `${viewport.width}px inline Done`);
    await assertMinTouchTarget(firstRow.getByRole("button", { name: "Cancel" }), `${viewport.width}px inline Cancel`);
    await page.screenshot({ path: join(outputDir, `ln-080-inline-record-time-${viewport.width}.png`), fullPage: false });
    await firstRow.getByRole("button", { name: "Cancel" }).click();
  }

  await setRecordView(page, "grouped");
  const groupedRow = page.locator(".group-entry", { hasText: `${firstContent} saved` });
  await groupedRow.locator("[data-entry-content-action]").click();
  await assertVisible(groupedRow.locator("[data-inline-record-editor]"));
  assert.equal(await page.locator('.overlay:has(.composer)').count(), 0, "Category-view existing records should also edit inline");
  await groupedRow.getByRole("button", { name: "Cancel" }).click();
});

test("markdown list input: continue, exit, select, compose, undo, and persist", async (page) => {
  await page.getByRole("button", { name: "Add record" }).click();
  const textarea = page.locator(".writing-area textarea");
  const replaceText = async (value) => {
    await textarea.evaluate((element, nextValue) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(element, nextValue);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    await page.waitForFunction(
      ({ selector, expected }) => document.querySelector(selector)?.value === expected,
      { selector: ".writing-area textarea", expected: value }
    );
  };
  const expectValue = async (value) => {
    await page.waitForFunction(
      ({ selector, expected }) => document.querySelector(selector)?.value === expected,
      { selector: ".writing-area textarea", expected: value }
    );
    assert.equal(await textarea.inputValue(), value);
  };
  await replaceText("- first");
  await textarea.press("End");
  await textarea.press("Enter");
  await expectValue("- first\n- ");
  await textarea.type("中文🙂");

  await replaceText("- [ ] task");
  await textarea.press("End");
  await textarea.press("Enter");
  await expectValue("- [ ] task\n- [ ] ");
  await textarea.press("Enter");
  await expectValue("- [ ] task\n");

  await replaceText("- middle🙂tail");
  await textarea.evaluate((element) => element.setSelectionRange(10, 10));
  await textarea.press("Enter");
  await expectValue("- middle🙂\n- tail");

  await replaceText("- before selected after");
  await textarea.evaluate((element) => {
    const start = element.value.indexOf("selected");
    element.setSelectionRange(start, start + "selected".length);
  });
  await textarea.press("Enter");
  await expectValue("- before \n-  after");

  await replaceText("- shift");
  await textarea.press("End");
  await textarea.press("Shift+Enter");
  assert.equal(await textarea.inputValue(), "- shift\n");

  await replaceText("- composing");
  await textarea.evaluate((element) => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, isComposing: true }));
  });
  assert.equal(await textarea.inputValue(), "- composing");

  await replaceText("- undo");
  await textarea.press("End");
  await textarea.press("Enter");
  await expectValue("- undo\n- ");
  await textarea.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
  await expectValue("- undo");

  const finalContent = "- 第一项🙂\n- 第二项";
  await replaceText(finalContent);
  for (const [width, height] of [[320, 844], [390, 844], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await assertNoHorizontalOverflow(page, `${width}px Markdown list composer`);
    assert.equal(await page.locator(".composer [data-rich-text-toolbar]").count(), 0, "List continuation must not add persistent rich-text chrome");
    await page.screenshot({ path: join(outputDir, `ln-038-composer-${width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".timeline .entry", { hasText: "第一项" }));
  await page.reload({ waitUntil: "domcontentloaded" });
  const saved = page.locator(".timeline .entry", { hasText: "第一项" });
  await assertVisible(saved);
  await saved.click();
  assert.equal(await page.locator(".writing-area textarea").inputValue(), finalContent);
});

test("Markdown selection formatting: edit, undo, render, search, export, and fit", async (page) => {
  await page.getByRole("button", { name: "Add record" }).click();
  const composer = page.locator(".surface.composer");
  const textarea = composer.locator(".writing-area textarea");
  const toolbar = composer.locator(".composer-toolbar");
  const selectionToolbar = composer.locator("[data-rich-text-toolbar]");
  const initial = "标题🙂\n正文 粗体 斜体\n- 列表\n- [ ] 任务\n普通换行\n下一行\n![remote](https://example.invalid/x.png)";
  await textarea.fill(initial);
  assert.equal(await selectionToolbar.count(), 0, "No selection should add no formatting chrome");
  await page.waitForTimeout(250);
  const baselineToolbarBox = await toolbar.boundingBox();

  const selectText = async (text, occurrence = 0) => {
    await textarea.evaluate((element, { text, occurrence }) => {
      let start = -1;
      let offset = 0;
      for (let index = 0; index <= occurrence; index += 1) {
        start = element.value.indexOf(text, offset);
        offset = start + text.length;
      }
      element.focus();
      element.setSelectionRange(start, start + text.length, "forward");
      element.dispatchEvent(new Event("select", { bubbles: true }));
    }, { text, occurrence });
    await assertVisible(selectionToolbar);
  };

  await selectText("标题🙂");
  await composer.getByLabel("Text style").selectOption("title");
  assert.equal(await textarea.inputValue(), initial.replace("标题🙂", "# 标题🙂"));
  await textarea.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
  assert.equal(await textarea.inputValue(), initial, "Heading transform should undo in one step");
  await selectText("标题🙂");
  await composer.getByLabel("Text style").selectOption("title");

  await selectText("粗体");
  const boldButton = composer.getByRole("button", { name: "Bold" });
  await assertMinTouchTarget(boldButton, "Bold formatting action");
  await page.locator("nextjs-portal").evaluateAll((portals) => portals.forEach((portal) => { portal.style.display = "none"; }));
  await boldButton.click();
  assert.match(await textarea.inputValue(), /正文 \*\*粗体\*\* 斜体/);
  assert.equal(await textarea.evaluate((element) => document.activeElement === element), true, "Formatting should restore textarea focus");
  assert.deepEqual(await textarea.evaluate((element) => {
    const start = element.value.indexOf("粗体");
    return [element.selectionStart, element.selectionEnd, element.value.slice(element.selectionStart, element.selectionEnd), start, start + "粗体".length];
  }), [12, 14, "粗体", 12, 14]);
  await textarea.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
  assert.match(await textarea.inputValue(), /正文 粗体 斜体/);
  await selectText("粗体");
  await boldButton.click();

  await selectText("粗体");
  const italicButton = composer.getByRole("button", { name: "Italic" });
  await assertMinTouchTarget(italicButton, "Italic formatting action");
  await italicButton.tap();
  assert.match(await textarea.inputValue(), /正文 \*\*\*粗体\*\*\* 斜体/);
  await italicButton.tap();
  assert.match(await textarea.inputValue(), /正文 \*\*粗体\*\* 斜体/);

  await selectText("斜体");
  await italicButton.tap();
  await textarea.press("ArrowRight");
  await textarea.type("！");
  assert.match(await textarea.inputValue(), /\*斜体！\*/);

  await selectText("下一行");
  await composer.getByLabel("Text style").selectOption("subtitle");
  assert.match(await textarea.inputValue(), /## 下一行/);
  await composer.getByLabel("Text style").selectOption("body");
  assert.doesNotMatch(await textarea.inputValue(), /## 下一行/);

  await selectText("普通换行");
  await textarea.press("Escape");
  assert.equal(await selectionToolbar.count(), 0, "Escape should collapse the selection before closing the composer");
  await assertVisible(composer);

  await selectText("普通换行");
  await textarea.evaluate((element) => element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "中" })));
  assert.equal(await selectionToolbar.count(), 0, "IME composition should hide formatting actions");
  const beforeComposingEnter = await textarea.inputValue();
  await textarea.evaluate((element) => element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, isComposing: true })));
  assert.equal(await textarea.inputValue(), beforeComposingEnter);
  await textarea.evaluate((element) => element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "中" })));

  await selectText("粗体");
  const formattedToolbarBox = await toolbar.boundingBox();
  assert.ok(baselineToolbarBox && formattedToolbarBox && Math.abs(baselineToolbarBox.height - formattedToolbarBox.height) <= 0.5, `Formatting must not increase toolbar height: ${JSON.stringify({ baselineToolbarBox, formattedToolbarBox })}`);
  await assertMinTouchTarget(composer.getByLabel("Text style"), "Text style action");
  await assertMinTouchTarget(composer.getByRole("button", { name: "More" }), "More action beside formatting");
  for (const [width, height] of [[320, 844], [390, 844], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await assertNoHorizontalOverflow(page, `${width}px Markdown formatting composer`);
    const composerBox = await composer.boundingBox();
    const currentToolbarBox = await toolbar.boundingBox();
    assert.ok(composerBox && currentToolbarBox && currentToolbarBox.width <= composerBox.width, `${width}px formatting toolbar should fit inside composer`);
    await page.screenshot({ path: join(outputDir, `ln-039-composer-${width}.png`), fullPage: true });
    if (width === 390) await page.screenshot({ path: join(outputDir, "ln-058-composer-390.png"), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const savedContent = await textarea.inputValue();
  await composer.getByRole("button", { name: "Done" }).click();

  const timelineEntry = page.locator(".timeline .entry", { hasText: "标题🙂" });
  await assertVisible(timelineEntry);
  await assertVisible(timelineEntry.locator(".markdown-heading.level-1", { hasText: "标题🙂" }));
  await assertVisible(timelineEntry.locator("strong", { hasText: "粗体" }));
  await assertVisible(timelineEntry.locator("em", { hasText: "斜体！" }));
  assert.equal(await timelineEntry.locator(".markdown-list-item").count(), 2);
  assert.equal(await timelineEntry.locator("img, a, script").count(), 0, "Unknown image, link, and HTML syntax must stay inert");
  await assertVisible(timelineEntry.getByText("![remote](https://example.invalid/x.png)", { exact: true }));
  await page.screenshot({ path: join(outputDir, "ln-039-timeline-390.png"), fullPage: true });

  await setRecordView(page, "grouped");
  const categoryEntry = page.locator(".group-entry", { hasText: "标题🙂" });
  await assertVisible(categoryEntry.locator(".markdown-heading.level-1"));
  await assertVisible(categoryEntry.locator("strong", { hasText: "粗体" }));

  await page.locator(".home-search-button").click();
  const searchSurface = page.locator(".search-surface");
  await searchSurface.locator("input").fill("**粗体**");
  const searchResult = searchSurface.locator(".search-result", { hasText: "标题🙂" });
  await assertVisible(searchResult);
  await assertVisible(searchResult.locator("strong", { hasText: "粗体" }));
  assert.equal(await searchResult.locator("img, a, script").count(), 0);
  await searchSurface.getByRole("button", { name: "Close" }).click();

  await openHomeSettings(page);
  await openSettingsPanel(page, "Download");
  const backupText = await downloadText(page, () => page.getByRole("button", { name: "Text backup" }).click());
  const backup = JSON.parse(backupText);
  assert.equal(backup.entries.find((entry) => entry.content.includes("标题🙂"))?.content, savedContent, "Backup should preserve raw Markdown exactly");
  const markdown = await downloadText(page, () => page.getByRole("button", { name: "Download today" }).click());
  assert.ok(markdown.includes(savedContent), "Markdown export should preserve entry.content exactly");
});

test("templates: structured required fields and periodic values", async (page) => {
  const fixedBefore = page.locator(".fixed-records");
  await assertVisible(fixedBefore);
  await assertVisible(fixedBefore.getByText("Morning weight", { exact: true }));
  await assertVisible(fixedBefore.getByPlaceholder(/morning weight, for example 66.95kg/i));
  const fixedModuleSurface = await fixedBefore.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      paddingLeft: Number.parseFloat(style.paddingLeft)
    };
  });
  assert.equal(fixedModuleSurface.borderRadius, "0px", `Periodic workspace should join the open paper instead of forming a card: ${JSON.stringify(fixedModuleSurface)}`);
  assert.equal(fixedModuleSurface.backgroundColor, "rgba(0, 0, 0, 0)", `Periodic workspace should use the same continuous paper as time records: ${JSON.stringify(fixedModuleSurface)}`);
  assert.equal(fixedModuleSurface.boxShadow, "none", `Periodic workspace should not retain a raised-card shadow: ${JSON.stringify(fixedModuleSurface)}`);
  assert.equal(fixedModuleSurface.paddingLeft, 0, `Periodic workspace should not retain card inset: ${JSON.stringify(fixedModuleSurface)}`);

  await page.getByRole("button", { name: "Add record" }).click();
  await page.locator(".writing-area textarea").fill("Draft survives template switching");
  await page.locator(".template-select select").selectOption("meal");
  await assertVisible(page.getByText(/Record what you ate/));
  await page.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Complete Meal" }));

  await page.getByRole("button", { name: "Breakfast" }).click();
  await page.getByPlaceholder("Food and drink").fill("E2E oats");
  await page.locator(".template-select select").selectOption("quick");
  assert.equal(await page.locator(".writing-area textarea").inputValue(), "Draft survives template switching");
  await page.locator(".template-select select").selectOption("meal");
  assert.equal(await page.getByPlaceholder("Food and drink").inputValue(), "E2E oats");
  await page.getByRole("button", { name: "Done" }).click();
  const mealEntry = page.locator(".timeline .entry", { hasText: "Meal: Breakfast" });
  await assertVisible(mealEntry);
  await mealEntry.click();
  assert.equal(await page.getByPlaceholder("Food and drink").inputValue(), "E2E oats");
  await page.getByPlaceholder("Food and drink").fill("E2E oats edited");
  await page.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".timeline .entry", { hasText: "E2E oats edited" }));

  const morningInput = page.getByPlaceholder(/morning weight, for example 66.95kg/i);
  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  await morningInput.fill("70.1kg");
  await morningInput.evaluate((element) => element.blur());
  await assertVisible(page.locator(".toast", { hasText: "Saved" }));
  await page.waitForFunction(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.some((entry) => entry.templateId === "morning-weight" && entry.content.endsWith("70.1kg")));
  const blurSavedContent = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.find((entry) => entry.templateId === "morning-weight" && entry.content.endsWith("70.1kg"))?.content);
  assert.match(blurSavedContent, /70\.1kg$/, "Fixed value should save when the input loses focus");
  await morningInput.fill("70.2kg");
  await morningInput.press("Enter");
  const periodic = page.locator(".fixed-records");
  await assertVisible(periodic);
  await assertVisible(periodic.getByText("Morning weight", { exact: true }));
  assert.equal(await morningInput.inputValue(), "70.2kg");
  assert.equal(await periodic.locator(".fixed-inline-control button").count(), 0, "Fixed values should not render a redundant save button");

  const sleepBlock = page.locator(".fixed-entry-block", { hasText: "Sleep" });
  await sleepBlock.locator(".fixed-entry-expand").click();
  await assertVisible(sleepBlock.getByPlaceholder("8h"));
  await sleepBlock.getByPlaceholder("8h").fill("7.5h");
  await sleepBlock.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Saved" }));
  await assertVisible(sleepBlock.getByText(/Sleep duration: 7.5h/));
});

test("category view: fixed records keep their actual category in UI and Markdown", async (page) => {
  const categoryState = {
    version: 2,
    structureSchemaVersion: 2,
    seedVersion: 3,
    domains: [
      { id: "health-domain", name: "Health", order: 0 },
      { id: "learning-domain", name: "Learning", order: 1 }
    ],
    categories: [
      { id: "health-metrics", domainId: "health-domain", name: "Health metrics", order: 0 },
      { id: "learning-log", domainId: "learning-domain", name: "Learning log", order: 0 }
    ],
    templates: [
      { id: "quick", name: "Quick note", categoryId: "learning-log", order: 0, recordType: "linear", schedule: null, homeVisible: true, inputMode: "free", tags: [], prompt: "", skeleton: "", fields: [] },
      { id: "focus-value", name: "Focus score", categoryId: "health-metrics", order: 0, recordType: "periodic", schedule: { cadence: "daily" }, homeVisible: true, inputMode: "value", tags: [], prompt: "Score from 1 to 10", skeleton: "", fields: [] }
    ],
    markdownSettings: { layout: "grouped", domainHeading: "## {{domain}}", categoryHeading: "### {{category}}", entryLine: "- {{time}}{{content}}{{tags}}", allDayHeading: "# {{date}}", daySeparator: "---" },
    entries: [
      { id: "linear-entry", date: testDate, time: "09:00", content: "Read the category model", categoryId: "learning-log", tags: ["learning"], templateId: "quick", fieldValues: {}, createdAt: 1 },
      { id: "focus-entry", date: testDate, time: "10:00", content: "Focus score=7", categoryId: "learning-log", tags: [], templateId: "focus-value", fieldValues: {}, createdAt: 2 }
    ]
  };
  await page.evaluate((state) => window.localStorage.setItem("log-note:data:v1", JSON.stringify(state)), categoryState);
  await page.reload({ waitUntil: "domcontentloaded" });
  await setRecordView(page, "grouped");

  const learningDomain = page.locator(".record-domain", { hasText: "Learning" });
  const learning = learningDomain.locator('.record-category[data-category-id="learning-log"]');
  const focusInput = learning.getByPlaceholder("Score from 1 to 10");
  await assertVisible(learning.getByText("Read the category model", { exact: true }));
  await assertVisible(focusInput);
  await page.waitForFunction(() => document.querySelector('input[placeholder="Score from 1 to 10"]')?.value === "7");
  assert.equal(await focusInput.inputValue(), "7");
  assert.equal(await page.locator(".record-domain", { hasText: "Health" }).count(), 0);

  await focusInput.fill("8");
  await focusInput.press("Enter");
  await assertVisible(page.getByRole("status").getByText("Record updated"));
  const savedState = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(savedState.entries.find((entry) => entry.id === "focus-entry").categoryId, "learning-log");

  const todayMarkdown = await downloadText(page, () => page.getByRole("button", { name: "Export Today Markdown" }).click());
  assert.match(todayMarkdown, /## Learning\s+### Learning log[\s\S]*Focus score=8/);
  assert.doesNotMatch(todayMarkdown, /## Health[\s\S]*Focus score=8/);
  await openHomeSettings(page);
  await openSettingsPanel(page, "Download");
  const allMarkdown = await downloadText(page, () => page.getByRole("button", { name: "Download all" }).click());
  assert.match(allMarkdown, /## Learning\s+### Learning log[\s\S]*Focus score=8/);
  assert.doesNotMatch(allMarkdown, /## Health[\s\S]*Focus score=8/);

  await leaveSettings(page);
  await setRecordView(page, "grouped");
  const currentLearningDomain = page.locator(".record-domain", { hasText: "Learning" });
  const currentLearning = currentLearningDomain.locator('.record-category[data-category-id="learning-log"]');
  const currentFocus = currentLearning.getByPlaceholder("Score from 1 to 10");
  const learningProgress = currentLearningDomain.locator("[data-category-progress]");
  assert.equal(await learningProgress.textContent(), "1/1");
  assert.equal(await learningProgress.getAttribute("aria-label"), "1 of 1 completed");
  assert.equal(await page.locator(".record-domain", { hasText: "Learning" }).locator(".record-domain-header .record-heading-cluster > span").count(), 0, "Domain headings should not count imported structure as record data");
  await page.waitForFunction(() => document.querySelector('input[placeholder="Score from 1 to 10"]')?.value === "8");
  await currentFocus.fill("");
  await currentFocus.press("Enter");
  await assertVisible(page.getByRole("status").getByText("Empty record deleted"));
  assert.equal(await currentLearning.getByPlaceholder("Score from 1 to 10").count(), 0);
  const healthFocus = page.locator(".record-domain", { hasText: "Health" }).getByPlaceholder("Score from 1 to 10");
  await assertVisible(healthFocus);
  assert.equal(await healthFocus.inputValue(), "");
  assert.equal(await currentLearningDomain.locator("[data-category-progress]").count(), 0, "Ordinary record categories should not repeat record counts in their chapter headings");
  const healthProgress = page.locator(".record-domain", { hasText: "Health" }).locator("[data-category-progress]");
  assert.equal(await healthProgress.textContent(), "0/1", "An unfilled periodic category should retain its completion denominator");
  assert.equal(await healthProgress.getAttribute("aria-label"), "0 of 1 completed");

  await page.setViewportSize({ width: 320, height: 844 });
  await assertNoHorizontalOverflow(page, "320px category view");
  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page, "390px category view");
  await page.screenshot({ path: join(outputDir, "ln-033-category-390.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await assertNoHorizontalOverflow(page, "1280px category view");
});

test("category hierarchy: domain, category, metric, then value guide the reading order", async (page) => {
  await page.evaluate(({ date }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.entries.push(
      { id: "ln-058-daily", date, time: "08:38", content: "Proximity baseline", categoryId: "daily", tags: [], templateId: "quick", fieldValues: {}, attachments: [], createdAt: 1 },
      { id: "ln-058-learning", date, time: "09:10", content: "Spacing audit", categoryId: "study", tags: [], templateId: "learn", fieldValues: {}, attachments: [], createdAt: 2 }
    );
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "zh-CN");
  }, { date: testDate });
  await page.reload({ waitUntil: "domcontentloaded" });
  await setRecordView(page, "grouped");

  const healthDomain = page.locator(".record-domain", { has: page.getByRole("heading", { name: "健康", exact: true }) });
  const bodyMetrics = healthDomain.locator('.record-category[data-category-id="health-fixed"]');
  const dailyCategory = page.locator(".record-domain", { has: page.getByRole("heading", { name: "日常", exact: true }) }).locator('.record-category[data-category-id="daily"]');
  const eveningMetric = bodyMetrics.locator(".fixed-entry", { hasText: "晚重" });
  const eveningLabel = eveningMetric.locator(".fixed-entry-label");
  const eveningInput = eveningMetric.locator("input");
  await assertVisible(eveningInput);
  await assertMinTouchTarget(eveningInput, "390px embedded periodic value input");
  await eveningInput.fill("123");
  await eveningInput.press("Enter");

  const hierarchy = await healthDomain.evaluate((domain) => {
    const domainTitle = domain.querySelector(".record-domain-header h2");
    const category = domain.querySelector(".record-category");
    const categoryTitle = document.getElementById(category.getAttribute("aria-labelledby"));
    const categoryCount = domain.querySelector(".record-domain-header [data-category-progress]");
    const metricLabel = category.querySelector(".fixed-entry-label");
    const metricInput = category.querySelector(".fixed-inline-control input");
    const metricRow = metricLabel.closest(".fixed-entry");
    const nextCategory = category.nextElementSibling;
    const nextCategoryProgress = nextCategory?.querySelector(".record-category-header .record-heading-cluster > span");
    const lastMetricRow = category.querySelector(".fixed-entry:last-child") || category.querySelector(".fixed-entry-block:last-child .fixed-entry");
    const categories = [...domain.querySelectorAll(":scope > .record-category")];
    const lastCategory = categories.at(-1);
    const lastDomainRow = lastCategory?.querySelector(".fixed-entry:last-child") || lastCategory?.querySelector(".fixed-entry-block:last-child .fixed-entry");
    const nextDomain = domain.nextElementSibling;
    const box = (element) => element.getBoundingClientRect();
    const textBox = (element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getBoundingClientRect();
    };
    const style = (element) => getComputedStyle(element);
    const domainBox = box(domainTitle);
    const categoryBox = box(categoryTitle);
    const categoryCountBox = box(categoryCount);
    const metricBox = textBox(metricLabel);
    const inputBox = box(metricInput);
    const metricRowBox = box(metricRow);
    const categorySurfaceBox = box(category);
    const nextCategorySurfaceBox = nextCategory ? box(nextCategory) : null;
    const lastMetricRowBox = lastMetricRow ? box(lastMetricRow) : null;
    const domainElementBox = box(domain);
    const lastCategoryBox = lastCategory ? box(lastCategory) : null;
    const lastDomainRowBox = lastDomainRow ? box(lastDomainRow) : null;
    const nextDomainTitleBox = nextDomain ? box(nextDomain.querySelector(".record-domain-header h2")) : null;
    return {
      fontSizes: {
        domain: Number.parseFloat(style(domainTitle).fontSize),
        category: Number.parseFloat(style(categoryTitle).fontSize),
        metric: Number.parseFloat(style(metricLabel).fontSize),
        value: Number.parseFloat(style(metricInput).fontSize)
      },
      x: { domain: domainBox.x, category: categoryBox.x, metric: metricBox.x, value: inputBox.x },
      categoryCountOwnedByChapter: Boolean(categoryCount?.closest("[data-domain-chapter-line]")),
      categoryCount: categoryCount.textContent,
      categoryProgressLabel: categoryCount.getAttribute("aria-label"),
      nextCategoryProgress: nextCategoryProgress?.textContent || null,
      nextCategoryProgressLabel: nextCategoryProgress?.getAttribute("aria-label") || null,
      countGaps: {
        category: categoryCountBox.x - categoryBox.right
      },
      card: {
        backgroundColor: style(category).backgroundColor,
        borderRadius: style(category).borderRadius,
        boxShadow: style(category).boxShadow,
        paddingLeft: Number.parseFloat(style(category).paddingLeft)
      },
      spacing: {
        chapterBaselineDelta: Math.abs(domainBox.bottom - categoryBox.bottom),
        categoryToFirstItem: metricRowBox.top - categoryBox.bottom,
        metricToValue: inputBox.x - metricBox.right,
        metricToCardEdge: lastMetricRowBox ? categorySurfaceBox.bottom - lastMetricRowBox.bottom : null,
        nextCategory: nextCategorySurfaceBox ? nextCategorySurfaceBox.top - categorySurfaceBox.bottom : null,
        contentToDomainEdge: lastCategoryBox ? domainElementBox.bottom - lastCategoryBox.bottom : null,
        nextDomainChapterGap: lastDomainRowBox && nextDomainTitleBox ? nextDomainTitleBox.top - lastDomainRowBox.bottom : null
      },
      nextDomainName: nextDomain?.querySelector(".record-domain-header h2")?.textContent || null,
      categoryBorders: {
        top: style(category).borderTopWidth,
        right: style(category).borderRightWidth,
        bottom: style(category).borderBottomWidth,
        left: style(category).borderLeftWidth
      }
    };
  });
  ln058Evidence.category = hierarchy.spacing;
  assert.ok(hierarchy.fontSizes.domain >= 24, `Domain title should lead the hierarchy: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.fontSizes.domain - hierarchy.fontSizes.category >= 6, `Domain should be visibly larger than category: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.fontSizes.category - hierarchy.fontSizes.metric >= 1, `Category should be visibly larger than metric: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.x.category - hierarchy.x.domain >= 12, `Category should indent from domain: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.x.metric - hierarchy.x.domain >= 16 && hierarchy.x.metric - hierarchy.x.domain <= 56, `Fields should use one restrained ledger inset beneath the chapter line: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.x.value > hierarchy.x.metric, `Value should follow the metric from left to right: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.categoryCountOwnedByChapter, true, `The visible count should remain owned by the first category inside the chapter line: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.categoryCount, "1/5", `Periodic categories should show completed templates over visible templates: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.categoryProgressLabel, "已完成1/5", `Periodic progress should expose an accessible label: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.nextCategoryProgress, "0/1", `Unfilled periodic categories should retain the denominator: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.nextCategoryProgressLabel, "已完成0/1", `Zero-completion progress should expose an accessible label: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.countGaps.category >= 0 && hierarchy.countGaps.category <= 8, `Category count should stay beside its title: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.card.borderRadius, "0px", `Periodic categories should join the continuous paper instead of forming cards: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.card.backgroundColor, "rgba(0, 0, 0, 0)", `Periodic categories should use the same open paper as ordinary records: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.card.boxShadow, "none", `Periodic categories should not retain a raised-card shadow: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.card.paddingLeft, 0, `Periodic categories should not retain card padding: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.chapterBaselineDelta <= 8, `Domain and first category should share one editorial baseline: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.categoryToFirstItem >= 8 && hierarchy.spacing.categoryToFirstItem <= 20, `Compact chapter heading and fields should remain visually grouped: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.metricToValue >= 16 && hierarchy.spacing.metricToValue <= 220, `Metric and value should form one readable open row without a dead middle: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.metricToCardEdge >= -1 && hierarchy.spacing.metricToCardEdge <= 1, `The last metric row should end the open category without card inset: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.nextCategory === null || (hierarchy.spacing.nextCategory >= 16 && hierarchy.spacing.nextCategory <= 20), `Adjacent categories should separate by one deliberate rhythm: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.nextDomainName, "学习", `The spacing fixture should expose the next domain: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.contentToDomainEdge >= -1 && hierarchy.spacing.contentToDomainEdge <= 1, `The final category should end at the domain edge without a decorative divider band: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.nextDomainChapterGap >= 24 && hierarchy.spacing.nextDomainChapterGap <= 40, `The next domain should begin after one section rhythm and no second rule: ${JSON.stringify(hierarchy)}`);
  assert.deepEqual(hierarchy.categoryBorders, { top: "0px", right: "0px", bottom: "0px", left: "0px" }, `The interactive module should remain unboxed on continuous paper: ${JSON.stringify(hierarchy)}`);
  const ordinaryCategorySurface = await dailyCategory.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, boxShadow: style.boxShadow };
  });
  assert.equal(ordinaryCategorySurface.backgroundColor, "rgba(0, 0, 0, 0)", `Ordinary record categories should remain on the continuous paper surface: ${JSON.stringify(ordinaryCategorySurface)}`);
  assert.equal(ordinaryCategorySurface.boxShadow, "none", `Ordinary record categories should not form a card wall: ${JSON.stringify(ordinaryCategorySurface)}`);

  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  await healthDomain.getByRole("heading", { name: "健康", exact: true }).click();
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

  for (const viewport of [
    { width: 320, height: 844, name: "ln-072-category-cards-320.png" },
    { width: 390, height: 844, name: "ln-072-category-cards-390.png" },
    { width: 426, height: 923, name: "ln-072-category-cards-426.png" },
    { width: 600, height: 900, name: "ln-072-category-cards-600.png" },
    { width: 671, height: 900, name: "ln-072-category-cards-671.png" },
    { width: 700, height: 900, name: "ln-072-category-cards-700.png" },
    { width: 768, height: 900, name: "ln-072-category-cards-768.png" },
    { width: 1280, height: 720, name: "ln-072-category-cards-1280.png" }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px category hierarchy`);
    const layout = await page.locator(".home-workspace").evaluate((workspace, viewportWidth) => {
      const dayTitleIdentity = document.querySelector(".home-date-title");
      const dayTitle = dayTitleIdentity.querySelector(".date-context-date");
      const calendarControl = document.querySelector(".home-date-title .date-context-disclosure");
      const viewSwitch = document.querySelector('[data-edge-rail-item="workspace"]');
      const topbar = document.querySelector(".topbar");
      const recordActions = document.querySelector(".record-action-row");
      const groupedView = workspace.querySelector(".grouped-view");
      const rows = [...workspace.querySelectorAll(".fixed-records-embedded .fixed-entry")];
      const inputs = [...workspace.querySelectorAll(".fixed-records-embedded .fixed-inline-control input")];
      const box = (element) => element.getBoundingClientRect();
      const titleBox = box(dayTitle);
      const switchBox = box(viewSwitch);
      const actionBox = box(recordActions);
      const inputXs = inputs.map((input) => box(input).x);
      return {
        titleHeight: titleBox.height,
        titleLineHeight: Number.parseFloat(getComputedStyle(dayTitle).lineHeight),
        calendarControlHeight: box(calendarControl).height,
        topbarHasSwitch: Boolean(topbar.querySelector('[data-edge-rail-item="workspace"]')),
        actionDockHasSwitch: Boolean(document.querySelector('.action-dock [data-edge-rail-item="workspace"]')),
        switchAboveActions: switchBox.bottom <= actionBox.top,
        groupedWidth: box(groupedView).width,
        rowBorders: rows.map((row) => getComputedStyle(row).borderBottomWidth),
        inputSpread: inputXs.length ? Math.max(...inputXs) - Math.min(...inputXs) : 0
      };
    }, viewport.width);
    assert.ok(layout.titleHeight <= layout.titleLineHeight + 1, `Date title should remain on one line: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.calendarControlHeight >= 43.99, `The date disclosure should remain a 44px touch target: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.topbarHasSwitch, false, `Diary and Plan should leave the upper tools: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.actionDockHasSwitch, true, `The lower quick dock should own Diary and Plan: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.switchAboveActions, true, `The lower workspace toggle should remain above record actions: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.groupedWidth <= 721, `Grouped content should remain one readable cluster: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.rowBorders.every((width) => width === "1px"), `Repeated field rows should share one divider rhythm: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.inputSpread <= 1, `Field controls should share one vertical alignment: ${JSON.stringify({ viewport, layout })}`);
    await page.screenshot({ path: join(outputDir, viewport.name), fullPage: true });
    await page.screenshot({ path: join(outputDir, viewport.name.replace("ln-041-category-hierarchy", "ln-043-compact-density")), fullPage: true });
    await page.screenshot({ path: join(outputDir, viewport.name.replace("ln-041-category-hierarchy", "ln-045-layout-principles")), fullPage: true });
  }

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 600, height: 900 },
    { width: 671, height: 900 },
    { width: 700, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 720 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px LN-058 proximity evidence`);
    await page.screenshot({ path: join(outputDir, `ln-058-proximity-${viewport.width}.png`), fullPage: true });
  }
});

test("LN-076 date-led header, rail view toggle, and viewport-spine Agent", async (page) => {
  await page.evaluate(({ date }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.entries = state.entries.filter((entry) => entry.id !== "ln-076-date-rail-agent");
    state.entries.push({
      id: "ln-076-date-rail-agent",
      date,
      time: "11:45",
      content: "学习了blender",
      categoryId: "study",
      tags: [],
      templateId: "learn",
      fieldValues: {},
      attachments: [],
      createdAt: 1
    });
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "zh-CN");
  }, { date: testDate });
  await page.reload({ waitUntil: "domcontentloaded" });

  const dateDisclosure = page.locator(".home-date-title .date-context-disclosure");
  const viewToggle = page.locator('[data-edge-rail-item="record-view"]');
  const workspaceToggle = page.locator('[data-edge-rail-item="workspace"]');
  await assertVisible(dateDisclosure, "The primary diary date should own the calendar disclosure");
  await assertVisible(viewToggle, "Diary should expose one rail record-view toggle");
  await assertVisible(workspaceToggle, "Diary and Plan should share one lower quick-dock workspace toggle");
  assert.equal(await page.locator(".home-calendar-button").count(), 0, "The rail should not retain a second Calendar action");
  assert.equal(await page.locator(".home-view-title").count(), 0, "Time and Category should no longer compete with the date as a page title");
  assert.equal(await page.locator(".workspace-mode-switch").count(), 0, "Diary and Plan should not remain duplicated in the lower action area");
  assert.equal(await page.locator('.top-actions [data-edge-rail-item="workspace"]').count(), 0, "Workspace should no longer occupy the upper tool stack");
  assert.equal(await page.locator('.action-dock [data-edge-rail-item="workspace"]').count(), 1, "The lower quick dock should own the only workspace rocker");
  assert.deepEqual(
    await page.locator(".home-edge-rail-tools > button").evaluateAll((buttons) => buttons.map((button) => button.dataset.edgeRailItem)),
    ["search", "settings", "record-view"],
    "Search, Settings, and record view should own the Diary upper rail in that order"
  );
  await assertVisible(page.locator(".export-fab-label"), "Diary export should name its same-day scope");
  assert.equal(await page.locator(".export-fab-label").textContent(), "导出今日日记", "Chinese export copy should match the marked source");

  const readRocker = async (toggle) => toggle.locator("[data-mode-rocker]").evaluate((rocker) => {
    const rockerBox = rocker.getBoundingClientRect();
    const thumb = rocker.querySelector("[data-mode-rocker-thumb]");
    const thumbBox = thumb.getBoundingClientRect();
    const options = [...rocker.querySelectorAll("[data-mode-option]")];
    const current = options.filter((option) => option.dataset.current === "true");
    const currentBox = current[0]?.getBoundingClientRect();
    const thumbStyle = getComputedStyle(thumb);
    return {
      labels: options.map((option) => option.textContent.trim()),
      currentLabels: current.map((option) => option.textContent.trim()),
      labelsContained: options.every((option) => {
        const box = option.getBoundingClientRect();
        return box.left >= rockerBox.left - 1 && box.right <= rockerBox.right + 1
          && box.top >= rockerBox.top - 1 && box.bottom <= rockerBox.bottom + 1;
      }),
      labelsUntruncated: options.every((option) => option.scrollWidth <= option.clientWidth + 1),
      thumbContainsCurrentCenter: Boolean(currentBox)
        && thumbBox.left <= currentBox.left + currentBox.width / 2
        && thumbBox.right >= currentBox.left + currentBox.width / 2
        && thumbBox.top <= currentBox.top + currentBox.height / 2
        && thumbBox.bottom >= currentBox.top + currentBox.height / 2,
      thumbLeft: thumbBox.left,
      thumbTop: thumbBox.top,
      thumbBackground: thumbStyle.backgroundColor,
      thumbShadow: thumbStyle.boxShadow
    };
  });
  const initialRecordRocker = await readRocker(viewToggle);
  const initialWorkspaceRocker = await readRocker(workspaceToggle);
  assert.deepEqual(initialRecordRocker.labels, ["时间", "分类"], `Record view should keep both localized modes visible: ${JSON.stringify(initialRecordRocker)}`);
  assert.deepEqual(initialWorkspaceRocker.labels, ["日记", "计划"], `Workspace should keep both localized modes visible: ${JSON.stringify(initialWorkspaceRocker)}`);
  assert.deepEqual(initialRecordRocker.currentLabels, ["时间"], `Exactly one record mode should be current: ${JSON.stringify(initialRecordRocker)}`);
  assert.deepEqual(initialWorkspaceRocker.currentLabels, ["日记"], `Exactly one workspace mode should be current: ${JSON.stringify(initialWorkspaceRocker)}`);
  for (const [name, rocker] of [["record", initialRecordRocker], ["workspace", initialWorkspaceRocker]]) {
    assert.equal(rocker.labelsContained, true, `${name} rocker labels should stay inside the trough: ${JSON.stringify(rocker)}`);
    assert.equal(rocker.labelsUntruncated, true, `${name} rocker labels should remain untruncated: ${JSON.stringify(rocker)}`);
    assert.equal(rocker.thumbContainsCurrentCenter, true, `${name} rocker thumb position should identify the current mode without color alone: ${JSON.stringify(rocker)}`);
    assert.notEqual(rocker.thumbBackground, "rgba(0, 0, 0, 0)", `${name} rocker should expose a raised paper thumb: ${JSON.stringify(rocker)}`);
    assert.notEqual(rocker.thumbShadow, "none", `${name} rocker thumb should remain materially distinct from the trough: ${JSON.stringify(rocker)}`);
  }
  await assertMinTouchTarget(dateDisclosure, "date disclosure");
  await assertMinTouchTarget(viewToggle, "record-view rail toggle");
  await assertMinTouchTarget(workspaceToggle, "workspace rail toggle");
  await assertMinTouchTarget(page.locator(".home-settings-button"), "settings rail control");

  const orderedUpperTools = await page.locator(".top-actions").evaluate((actions) => {
    const box = (selector) => actions.querySelector(selector).getBoundingClientRect();
    const search = box('[data-edge-rail-item="search"]');
    const settings = box('[data-edge-rail-item="settings"]');
    const recordView = box('[data-edge-rail-item="record-view"]');
    const ordered = [search, settings, recordView];
    return {
      recordViewHeight: recordView.height,
      gaps: ordered.slice(1).map((control, index) => control.top - ordered[index].bottom)
    };
  });
  assert.ok(orderedUpperTools.recordViewHeight >= 44, `The upper record-view rocker should preserve a real touch target: ${JSON.stringify(orderedUpperTools)}`);
  assert.ok(orderedUpperTools.gaps.every((gap) => Math.abs(gap - 4) <= 0.5), `Search, Settings, and record view should follow one 4px vertical rhythm: ${JSON.stringify(orderedUpperTools)}`);

  const lowerQuickActions = await page.locator(".action-dock").evaluate((dock) => {
    const workspace = dock.querySelector('[data-edge-rail-item="workspace"]').getBoundingClientRect();
    const row = dock.querySelector(".record-action-row").getBoundingClientRect();
    const exportAction = dock.querySelector(".export-fab").getBoundingClientRect();
    const record = dock.querySelector('[data-edge-rail-item="record"]').getBoundingClientRect();
    const label = dock.querySelector(".export-fab-label");
    const overlap = Math.max(0, Math.min(exportAction.right, record.right) - Math.max(exportAction.left, record.left))
      * Math.max(0, Math.min(exportAction.bottom, record.bottom) - Math.max(exportAction.top, record.top));
    return {
      workspaceAboveRow: workspace.bottom <= row.top + 1,
      exportBeforeRecord: exportAction.right <= record.left + 1,
      verticallyAligned: Math.abs((exportAction.top + exportAction.height / 2) - (record.top + record.height / 2)),
      overlap,
      labelVisible: getComputedStyle(label).display !== "none" && label.getBoundingClientRect().width > 0,
      labelSingleLine: label.scrollHeight <= label.clientHeight + 1
    };
  });
  assert.equal(lowerQuickActions.workspaceAboveRow, true, `Workspace should sit directly above the contextual Diary actions: ${JSON.stringify(lowerQuickActions)}`);
  assert.equal(lowerQuickActions.exportBeforeRecord, true, `Export should sit to the left of the blue record stamp: ${JSON.stringify(lowerQuickActions)}`);
  assert.ok(lowerQuickActions.verticallyAligned <= 1, `Export and record should share one horizontal center line: ${JSON.stringify(lowerQuickActions)}`);
  assert.equal(lowerQuickActions.overlap, 0, `Export and record targets should not overlap: ${JSON.stringify(lowerQuickActions)}`);
  assert.equal(lowerQuickActions.labelVisible, true, `The same-day export label should remain visible: ${JSON.stringify(lowerQuickActions)}`);
  assert.equal(lowerQuickActions.labelSingleLine, true, `The same-day export label should stay on one line: ${JSON.stringify(lowerQuickActions)}`);

  await viewToggle.focus();
  const rockerFocus = await viewToggle.locator("[data-mode-rocker]").evaluate((rocker) => ({
    boxShadow: getComputedStyle(rocker).boxShadow,
    outlineStyle: getComputedStyle(rocker).outlineStyle
  }));
  assert.ok(rockerFocus.boxShadow !== "none" || rockerFocus.outlineStyle !== "none", `Keyboard focus should remain visible on the complete rocker: ${JSON.stringify(rockerFocus)}`);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedThumbDuration = await viewToggle.locator("[data-mode-rocker-thumb]").evaluate((thumb) => getComputedStyle(thumb).transitionDuration);
  assert.ok(reducedThumbDuration.split(",").every((duration) => Number.parseFloat(duration) <= 0.01), `Reduced motion should make rocker state placement immediate: ${reducedThumbDuration}`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const initialHeader = await page.locator(".topbar").evaluate((header) => {
    const date = header.querySelector(".date-context-date");
    const weekday = header.querySelector(".date-context-weekday");
    const title = header.querySelector(".home-date-title");
    const box = (element) => element.getBoundingClientRect();
    return {
      dateSize: Number.parseFloat(getComputedStyle(date).fontSize),
      weekdaySize: Number.parseFloat(getComputedStyle(weekday).fontSize),
      titleLeft: box(title).left,
      toolLeft: box(header.querySelector('[data-edge-rail-item="search"]')).left,
      titleTag: title.tagName,
      disclosureExpanded: header.querySelector(".date-context-disclosure").getAttribute("aria-expanded")
    };
  });
  assert.equal(initialHeader.titleTag, "H1", `The date should remain the page heading: ${JSON.stringify(initialHeader)}`);
  assert.ok(initialHeader.dateSize >= 30 && initialHeader.dateSize - initialHeader.weekdaySize >= 10, `The date should be the strongest header identity: ${JSON.stringify(initialHeader)}`);
  assert.ok(initialHeader.titleLeft < initialHeader.toolLeft, `The date should begin on the left before the rail tools: ${JSON.stringify(initialHeader)}`);
  assert.equal(initialHeader.disclosureExpanded, "false");

  assert.equal(await viewToggle.getAttribute("data-view-mode"), "timeline");
  await viewToggle.click();
  assert.equal(await viewToggle.getAttribute("data-view-mode"), "grouped", "One action should switch to Category");
  await page.waitForTimeout(180);
  const groupedRecordRocker = await readRocker(viewToggle);
  assert.deepEqual(groupedRecordRocker.currentLabels, ["分类"], `The raised thumb should move to Category after one click: ${JSON.stringify(groupedRecordRocker)}`);
  assert.ok(
    Math.abs(groupedRecordRocker.thumbTop - initialRecordRocker.thumbTop) >= 8
      || Math.abs(groupedRecordRocker.thumbLeft - initialRecordRocker.thumbLeft) >= 8,
    `The record rocker thumb should visibly change position: ${JSON.stringify({ initialRecordRocker, groupedRecordRocker })}`
  );
  await assertVisible(page.getByRole("heading", { name: "学习", exact: true }));
  await viewToggle.click();
  assert.equal(await viewToggle.getAttribute("data-view-mode"), "timeline", "The same action should switch back to Time");
  await assertVisible(page.getByRole("heading", { name: "记录", exact: true }));

  await dateDisclosure.click();
  assert.equal(await dateDisclosure.getAttribute("aria-expanded"), "true");
  await assertVisible(page.locator(".calendar-view.picker-mode"));
  await page.keyboard.press("Escape");
  assert.equal(await dateDisclosure.getAttribute("aria-expanded"), "false");
  assert.equal(await dateDisclosure.evaluate((button) => document.activeElement === button), true, "Escape should return focus to the date disclosure");

  assert.equal(await workspaceToggle.getAttribute("data-workspace-mode"), "diary");
  await workspaceToggle.click();
  assert.equal(await workspaceToggle.getAttribute("data-workspace-mode"), "plan", "One action should switch from Diary to Plan");
  await page.waitForTimeout(180);
  const planWorkspaceRocker = await readRocker(workspaceToggle);
  assert.deepEqual(planWorkspaceRocker.currentLabels, ["计划"], `The raised thumb should move to Plan after one click: ${JSON.stringify(planWorkspaceRocker)}`);
  assert.ok(
    Math.abs(planWorkspaceRocker.thumbTop - initialWorkspaceRocker.thumbTop) >= 8
      || Math.abs(planWorkspaceRocker.thumbLeft - initialWorkspaceRocker.thumbLeft) >= 8,
    `The workspace rocker thumb should visibly change position: ${JSON.stringify({ initialWorkspaceRocker, planWorkspaceRocker })}`
  );
  assert.equal(await page.locator('[data-edge-rail-item="record-view"]').count(), 0, "Plan should not expose a record-view rail toggle");
  assert.deepEqual(
    await page.locator(".home-edge-rail-tools > button").evaluateAll((buttons) => buttons.map((button) => button.dataset.edgeRailItem)),
    ["search", "settings"],
    "Plan should keep only Search and Settings in the upper tool stack"
  );
  assert.equal(await page.locator('.action-dock [data-edge-rail-item="workspace"]').count(), 1, "Plan should keep the lower workspace rocker");
  assert.equal(await page.locator(".record-action-row, .export-fab, [data-edge-rail-item=record]").count(), 0, "Plan should hide Diary-only export and record actions");
  await assertVisible(dateDisclosure, "Plan should keep the same primary date disclosure");
  await workspaceToggle.click();
  assert.equal(await workspaceToggle.getAttribute("data-workspace-mode"), "diary", "The same action should switch back to Diary");
  await assertVisible(viewToggle);

  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const englishRecordRocker = await readRocker(viewToggle);
  const englishWorkspaceRocker = await readRocker(workspaceToggle);
  assert.deepEqual(englishRecordRocker.labels, ["Time", "Category"], `English record modes should both remain visible: ${JSON.stringify(englishRecordRocker)}`);
  assert.deepEqual(englishWorkspaceRocker.labels, ["Diary", "Plan"], `English workspace modes should both remain visible: ${JSON.stringify(englishWorkspaceRocker)}`);
  assert.equal(await page.locator(".export-fab-label").textContent(), "Export today", "English export copy should name the same-day scope");
  assert.equal(englishRecordRocker.labelsUntruncated, true, `English record labels should not ellipsize: ${JSON.stringify(englishRecordRocker)}`);
  assert.equal(englishWorkspaceRocker.labelsUntruncated, true, `English workspace labels should not ellipsize: ${JSON.stringify(englishWorkspaceRocker)}`);
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "zh-CN"));
  await page.reload({ waitUntil: "domcontentloaded" });

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px date-led header`);
    await assertMinTouchTarget(dateDisclosure, `${viewport.width}px date disclosure`);
    await assertMinTouchTarget(viewToggle, `${viewport.width}px record-view toggle`);
    await assertMinTouchTarget(workspaceToggle, `${viewport.width}px workspace toggle`);
    await assertMinTouchTarget(page.locator(".export-fab"), `${viewport.width}px same-day export`);
    await assertMinTouchTarget(page.locator('[data-edge-rail-item="record"]'), `${viewport.width}px record action`);
    const quickActionGeometry = await page.locator(".action-dock").evaluate((dock) => {
      const workspace = dock.querySelector('[data-edge-rail-item="workspace"]').getBoundingClientRect();
      const exportAction = dock.querySelector(".export-fab").getBoundingClientRect();
      const record = dock.querySelector('[data-edge-rail-item="record"]').getBoundingClientRect();
      return {
        workspaceInsideViewport: workspace.left >= -1 && workspace.right <= innerWidth + 1 && workspace.top >= -1 && workspace.bottom <= innerHeight + 1,
        rowInsideViewport: exportAction.left >= -1 && record.right <= innerWidth + 1 && exportAction.top >= -1 && record.bottom <= innerHeight + 1,
        exportBeforeRecord: exportAction.right <= record.left + 1,
        rowCenterDelta: Math.abs((exportAction.top + exportAction.height / 2) - (record.top + record.height / 2))
      };
    });
    assert.equal(quickActionGeometry.workspaceInsideViewport, true, `${viewport.width}px workspace rocker should remain visible: ${JSON.stringify(quickActionGeometry)}`);
    assert.equal(quickActionGeometry.rowInsideViewport, true, `${viewport.width}px Diary actions should remain visible: ${JSON.stringify(quickActionGeometry)}`);
    assert.equal(quickActionGeometry.exportBeforeRecord, true, `${viewport.width}px export should remain left of record: ${JSON.stringify(quickActionGeometry)}`);
    assert.ok(quickActionGeometry.rowCenterDelta <= 1, `${viewport.width}px export and record should remain horizontally aligned: ${JSON.stringify(quickActionGeometry)}`);
    if (viewport.width <= 426) {
      const geometry = await page.locator(".home-diary-workspace").evaluate((workspace) => {
        const stream = workspace.querySelector(":scope > .home-record-stream");
        const slot = document.querySelector('[data-agent-surface="diary"]');
        const fixed = workspace.querySelector(":scope > .fixed-records");
        const helper = slot.querySelector(".organize-helper");
        const appearance = helper.querySelector(".organize-helper-appearance");
        const figure = helper.querySelector(".organize-helper-figure");
        const traveler = slot.querySelector(".diary-agent-traveler");
        const binding = document.querySelector(".home-edge-rail-brush");
        const textNodes = [...workspace.querySelectorAll(".entry-content")];
        const textRects = textNodes.map((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getBoundingClientRect();
        });
        const contentProtectedNodes = [...workspace.querySelectorAll(".fixed-inline-control input, .agent-review-panel")];
        const railProtectedNodes = [...document.querySelectorAll(".home-edge-rail-tools > button, .domain-directory-node")];
        const box = (element) => element.getBoundingClientRect();
        const overlaps = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const figureBox = box(figure);
        const visibleBox = box(appearance);
        const bindingBox = box(binding);
        const slotBox = box(slot);
        const helperBox = box(helper);
        const directoryBoxes = [...document.querySelectorAll(".domain-directory-node > span")]
          .map((element) => {
            const rect = box(element);
            const backgroundColor = getComputedStyle(element).backgroundColor;
            return {
              rect,
              masksAgent: element.closest("li")?.classList.contains("has-domain-insights")
                && backgroundColor !== "transparent"
                && backgroundColor !== "rgba(0, 0, 0, 0)"
            };
          })
          .sort((left, right) => left.rect.top - right.rect.top);
        return {
          directShellChild: slot.parentElement === document.querySelector("main.app-shell"),
          slotHeight: slotBox.height,
          slotPosition: getComputedStyle(slot).position,
          helperPosition: getComputedStyle(helper).position,
          helperWidth: helperBox.width,
          helperHeight: helperBox.height,
          viewportContained: helperBox.top >= -1 && helperBox.bottom <= innerHeight + 1 && helperBox.left >= -1 && helperBox.right <= innerWidth + 1,
          placement: slot.dataset.agentPlacement,
          motionMode: slot.dataset.agentMotionMode,
          travelerAnimationName: getComputedStyle(traveler).animationName,
          travelerAnimationDuration: Number.parseFloat(getComputedStyle(traveler).animationDuration),
          flowGap: fixed ? box(fixed).top - box(stream).bottom : null,
          fixedTopRule: fixed ? getComputedStyle(fixed).backgroundImage : "none",
          textOverlap: textRects.reduce((sum, rect) => sum + overlaps(helperBox, rect), 0),
          protectedOverlap: contentProtectedNodes.reduce((sum, element) => sum + overlaps(helperBox, box(element)), 0),
          helperBox: { left: helperBox.left, right: helperBox.right, top: helperBox.top, bottom: helperBox.bottom },
          protectedBoxes: contentProtectedNodes.map((element) => {
            const rect = box(element);
            return {
              selector: element.matches("input") ? "fixed-inline-control input" : "agent-review-panel",
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom
            };
          }),
          directoryLabelOverlap: directoryBoxes.reduce((sum, item) => sum + (item.masksAgent ? 0 : overlaps(visibleBox, item.rect)), 0),
          maskedDirectoryLabelOverlap: directoryBoxes.reduce((sum, item) => sum + (item.masksAgent ? overlaps(visibleBox, item.rect) : 0), 0),
          visibleBox: { left: visibleBox.left, right: visibleBox.right, top: visibleBox.top, bottom: visibleBox.bottom },
          directoryBoxes: directoryBoxes.map((item) => ({ left: item.rect.left, right: item.rect.right, top: item.rect.top, bottom: item.rect.bottom, masksAgent: item.masksAgent })),
          railTargetsTopmost: railProtectedNodes.every((element) => {
            const rect = box(element);
            if (rect.bottom <= 0 || rect.top >= innerHeight) return true;
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            return element === hit || element.contains(hit);
          }),
          spineDelta: Math.abs((visibleBox.right - 5) - (bindingBox.left + bindingBox.width / 2)),
          visualCenterInsideButton: figureBox.left + figureBox.width / 2 >= helperBox.left - 1
            && figureBox.left + figureBox.width / 2 <= helperBox.right + 1
            && figureBox.top + figureBox.height / 2 >= helperBox.top - 1
            && figureBox.top + figureBox.height / 2 <= helperBox.bottom + 1,
          directoryGap: directoryBoxes.length > 1
            ? Math.min(...directoryBoxes.slice(1).map((item, index) => item.rect.top - directoryBoxes[index].rect.bottom))
            : null
        };
      });
      assert.equal(geometry.directShellChild, true, `${viewport.width}px Agent should mount once at the application shell: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.slotHeight >= 80, `${viewport.width}px Agent mount should expose a viewport-safe travel track without contributing document flow: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.slotPosition, "fixed", `${viewport.width}px Agent should stay fixed to the viewport while the diary scrolls: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.helperPosition, "absolute", `${viewport.width}px the character target should move inside its fixed track: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.helperWidth >= 43.9 && geometry.helperHeight >= 79.5 && geometry.visualCenterInsideButton, `${viewport.width}px art and accessible hit target should travel together: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.viewportContained, true, `${viewport.width}px Agent should remain wholly visible in the viewport: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.placement, "viewport-spine", `${viewport.width}px should expose the viewport-spine placement contract: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.motionMode, "animated", `${viewport.width}px mobile Diary should enable the restrained patrol: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.travelerAnimationName, "diary-agent-spine-patrol", `${viewport.width}px should use the spine patrol keyframes: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.travelerAnimationDuration >= 27.9, `${viewport.width}px idle patrol should remain deliberately slow: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.flowGap === null || (geometry.flowGap >= 8 && geometry.flowGap <= 48), `${viewport.width}px ordinary and fixed records should keep one section rhythm without an Agent spacer: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.fixedTopRule, "none", `${viewport.width}px the final record rule should be the only horizontal boundary before fixed records: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.textOverlap <= 1, `${viewport.width}px Agent artwork should not cover authored text: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.protectedOverlap <= 1, `${viewport.width}px Agent target should not intercept fields or annotations: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.directoryLabelOverlap <= 1, `${viewport.width}px Agent artwork should sit beside ordinary directory text; an active insights label may mask it with opaque paper: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.railTargetsTopmost, true, `${viewport.width}px directory labels and rail tools should remain clickable above the travelling Agent: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.spineDelta <= 2, `${viewport.width}px Agent grip should resolve onto the one binding axis: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.directoryGap === null || geometry.directoryGap >= 12, `${viewport.width}px right-rail directory labels should remain separately readable: ${JSON.stringify(geometry)}`);
    }
  }

  await page.setViewportSize({ width: 320, height: 844 });
  await dateDisclosure.click();
  const narrowCalendarClearance = await page.locator(".calendar-view.picker-mode").evaluate((picker) => {
    const lastUpperTool = document.querySelector('[data-edge-rail-item="record-view"]').getBoundingClientRect();
    const days = [...picker.querySelectorAll(".calendar-day")].map((day) => day.getBoundingClientRect());
    return {
      lastUpperToolBottom: lastUpperTool.bottom,
      firstDateTop: Math.min(...days.map((day) => day.top))
    };
  });
  assert.ok(narrowCalendarClearance.firstDateTop >= narrowCalendarClearance.lastUpperToolBottom + 3, `The 320px month grid should clear the complete taller rocker stack: ${JSON.stringify(narrowCalendarClearance)}`);
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await viewToggle.click();
  await page.waitForTimeout(180);
  await page.evaluate(() => document.activeElement?.blur());
  await page.locator(".action-dock").screenshot({ path: join(outputDir, "ln-076-lower-workspace-export-record-390.png") });
  await page.screenshot({ path: join(outputDir, "ln-076-rail-rockers-category-diary-viewport-390.png"), fullPage: false });
  await viewToggle.click();
  await page.waitForTimeout(180);
  await page.screenshot({ path: join(outputDir, "ln-076-date-rail-agent-collapsed-viewport-390.png"), fullPage: false });
  await page.screenshot({ path: join(outputDir, "ln-076-date-rail-agent-collapsed-390.png"), fullPage: true });
  await dateDisclosure.click();
  const expandedGeometry = await page.locator(".home-diary-workspace").evaluate((workspace) => {
    const slot = document.querySelector('[data-agent-surface="diary"]');
    const appearance = slot.querySelector(".organize-helper-appearance");
    const traveler = slot.querySelector(".diary-agent-traveler");
    const box = (element) => element.getBoundingClientRect();
    const overlaps = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const appearanceBox = box(appearance);
    const dayBoxes = [...workspace.querySelectorAll(".calendar-day")].map(box);
    return {
      motionMode: slot.dataset.agentMotionMode,
      calendarOpen: slot.dataset.agentCalendarOpen,
      travelerAnimation: getComputedStyle(traveler).animationName,
      dayOverlap: Math.max(0, ...dayBoxes.map((dayBox) => overlaps(dayBox, appearanceBox)))
    };
  });
  assert.equal(expandedGeometry.calendarOpen, "true", `Expanded month should expose the Agent calendar state: ${JSON.stringify(expandedGeometry)}`);
  assert.equal(expandedGeometry.motionMode, "still", `Expanded month should pause the Agent in a compact spine pose: ${JSON.stringify(expandedGeometry)}`);
  assert.equal(expandedGeometry.travelerAnimation, "none", `Expanded month should stop vertical patrol: ${JSON.stringify(expandedGeometry)}`);
  assert.ok(expandedGeometry.dayOverlap <= 1, `Agent artwork should not enter any calendar day target: ${JSON.stringify(expandedGeometry)}`);
  await page.screenshot({ path: join(outputDir, "ln-076-date-rail-agent-expanded-viewport-390.png"), fullPage: false });
  await page.screenshot({ path: join(outputDir, "ln-076-date-rail-agent-expanded-390.png"), fullPage: true });
  await page.keyboard.press("Escape");
});

test("LN-076 return-to-today action preserves date context and modes", async (page) => {
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "zh-CN"));
  await page.reload({ waitUntil: "domcontentloaded" });

  const dateDisclosure = page.locator(".home-date-title .date-context-disclosure");
  const returnToToday = page.locator("[data-home-return-today]");
  const workspaceToggle = page.locator('[data-edge-rail-item="workspace"]');
  const viewToggle = page.locator('[data-edge-rail-item="record-view"]');
  const todayLabel = await page.locator(".home-date-title").getAttribute("aria-label");
  const yesterday = shiftDate(testDate, -1);
  const payloadBefore = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));

  assert.equal(await returnToToday.count(), 0, "Today should not render a redundant return action");
  await viewToggle.click();
  assert.equal(await viewToggle.getAttribute("data-view-mode"), "grouped", "The regression should begin in Category view");
  await dateDisclosure.click();
  await page.locator(`[data-calendar-date="${yesterday}"]`).click();
  await assertVisible(returnToToday, "Another selected date should expose one return-to-today action");
  assert.equal(await returnToToday.textContent(), "今天", "The visible Chinese action should remain concise");
  assert.equal(await returnToToday.getAttribute("aria-label"), "返回今天", "The Chinese accessible name should describe the result");
  assert.equal(await dateDisclosure.getAttribute("aria-expanded"), "true", "Selecting another day should keep the picker open before return");
  await dateDisclosure.focus();
  await page.keyboard.press("Tab");
  assert.equal(await returnToToday.evaluate((button) => document.activeElement === button), true, "Today should follow the date disclosure in keyboard order");
  const returnFocus = await returnToToday.evaluate((button) => ({
    outlineStyle: getComputedStyle(button).outlineStyle,
    outlineWidth: Number.parseFloat(getComputedStyle(button).outlineWidth)
  }));
  assert.notEqual(returnFocus.outlineStyle, "none", `The Today action should expose keyboard focus: ${JSON.stringify(returnFocus)}`);
  assert.ok(returnFocus.outlineWidth >= 1.99, `The Today focus treatment should remain visible: ${JSON.stringify(returnFocus)}`);

  await workspaceToggle.click();
  assert.equal(await workspaceToggle.getAttribute("data-workspace-mode"), "plan", "The action should also be available in Plan");
  await assertVisible(returnToToday, "Plan should keep the same off-today recovery action");

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px return-to-today header`);
    await assertMinTouchTarget(returnToToday, `${viewport.width}px return-to-today action`);
    const geometry = await page.locator(".topbar").evaluate((header) => {
      const disclosure = header.querySelector(".date-context-disclosure").getBoundingClientRect();
      const action = header.querySelector("[data-home-return-today]").getBoundingClientRect();
      const tools = header.querySelector(".top-actions").getBoundingClientRect();
      const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left))
        * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
      return {
        actionInsideViewport: action.left >= -1 && action.right <= innerWidth + 1,
        disclosureOverlap: overlap(action, disclosure),
        toolOverlap: overlap(action, tools)
      };
    });
    assert.equal(geometry.actionInsideViewport, true, `${viewport.width}px Today should remain inside the viewport: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.disclosureOverlap <= 1, `${viewport.width}px Today should not cover the date disclosure: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.toolOverlap <= 1, `${viewport.width}px Today should not cover the upper rail tools: ${JSON.stringify(geometry)}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(outputDir, "ln-076-return-to-today-zh-390.png"), fullPage: false });
  await returnToToday.click();
  await assertHidden(page.locator(".calendar-view.picker-mode"), "Returning to today should close an open picker");
  assert.equal(await returnToToday.count(), 0, "The recovery action should remove itself after returning to today");
  assert.equal(await page.locator(".home-date-title").getAttribute("aria-label"), todayLabel, "One action should restore local today");
  assert.equal(await dateDisclosure.evaluate((button) => document.activeElement === button), true, "The disappearing action should return focus to the stable date disclosure");
  assert.equal(await workspaceToggle.getAttribute("data-workspace-mode"), "plan", "Returning to today should preserve Plan");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), payloadBefore, "Returning to today must not change the account payload");

  await workspaceToggle.click();
  assert.equal(await workspaceToggle.getAttribute("data-workspace-mode"), "diary");
  assert.equal(await viewToggle.getAttribute("data-view-mode"), "grouped", "Returning to today should preserve Category view while Plan is active");

  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const englishTodayLabel = await page.locator(".home-date-title").getAttribute("aria-label");
  assert.equal(await returnToToday.count(), 0, "The English home should also omit the action on today");
  await dateDisclosure.click();
  await page.locator(`[data-calendar-date="${yesterday}"]`).click();
  await assertVisible(returnToToday);
  assert.equal(await returnToToday.textContent(), "Today");
  assert.equal(await returnToToday.getAttribute("aria-label"), "Return to today");
  await returnToToday.click();
  assert.equal(await returnToToday.count(), 0);
  assert.equal(await page.locator(".home-date-title").getAttribute("aria-label"), englishTodayLabel);
});

test("LN-076 viewport-spine Agent stays visible, slow, and non-writing across Diary states", async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(({ date }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    const periodicTemplateIds = new Set(state.templates.filter((template) => template.recordType === "periodic").map((template) => template.id));
    state.entries = state.entries.filter((entry) => entry.date !== date || periodicTemplateIds.has(entry.templateId));
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "zh-CN");
  }, { date: testDate });
  await page.reload({ waitUntil: "domcontentloaded" });

  const agentSurface = page.locator('[data-agent-surface="diary"]');
  const agentButton = agentSurface.locator(".organize-helper");
  await assertVisible(agentButton, "An empty Diary date should retain the viewport companion");
  assert.equal(await agentSurface.getAttribute("data-agent-empty-date"), "true");
  assert.equal(await agentSurface.locator("[data-agent-idle-hint]").count(), 0, "An empty date must not promise a diary analysis that cannot run");
  const payloadBefore = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await agentButton.click();
  await assertVisible(page.getByRole("status").filter({ hasText: "今天还没有日记，我还不知道该看什么。" }));
  assert.equal(await page.locator(".agent-review-panel, .agent-review-complete").count(), 0, "Empty feedback should not create a review session");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), payloadBefore, "Empty feedback must leave the account payload byte-for-byte unchanged");
  await page.keyboard.press("Escape");
  await assertHidden(page.locator(".diary-agent-empty-note"), "Escape should dismiss the temporary margin note");
  await page.evaluate(() => document.activeElement?.blur());

  await setWorkspaceMode(page, "plan");
  await assertHidden(agentSurface, "Plan should hide the Diary companion");
  await setWorkspaceMode(page, "diary");
  await assertVisible(agentSurface, "Returning to Diary should restore the companion");
  await page.locator(".home-search-button").click();
  await assertHidden(agentSurface, "Search should hide the Diary companion");
  await page.keyboard.press("Escape");
  await assertVisible(agentSurface, "Closing Search should restore the companion");
  await page.locator(".home-settings-button").click();
  await assertHidden(agentSurface, "Settings should hide the Diary companion");
  await page.keyboard.press("Escape");
  await assertVisible(agentSurface, "Closing Settings should restore the companion");
  await page.getByRole("button", { name: "新增记录" }).click();
  await assertHidden(agentSurface, "The record editor should hide the Diary companion");
  await page.locator(".surface.composer").getByRole("button", { name: "关闭" }).click();
  await assertVisible(agentSurface, "Closing the editor should restore the companion");

  await page.evaluate(({ date }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    const template = state.templates.find((item) => item.recordType !== "periodic");
    const categoryId = template.categoryId || state.categories[0]?.id || "daily";
    state.entries = state.entries.filter((entry) => !entry.id.startsWith("ln-076-agent-scroll-"));
    for (let index = 0; index < 28; index += 1) {
      state.entries.push({
        id: `ln-076-agent-scroll-${index}`,
        date,
        time: `${String(8 + Math.floor(index / 6)).padStart(2, "0")}:${String((index % 6) * 10).padStart(2, "0")}`,
        content: `贴脊巡游验证记录 ${index + 1}：保持角色在长页面滚动时可见。`,
        categoryId,
        templateId: template.id,
        tags: [],
        fieldValues: {},
        attachments: [],
        createdAt: index + 1
      });
    }
    window.localStorage.setItem(key, JSON.stringify(state));
  }, { date: testDate });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

  const idleHint = page.locator("[data-agent-idle-hint]");
  await assertVisible(idleHint, "A populated idle Diary should show the quiet tap-to-analyze hint");
  assert.equal(await idleHint.textContent(), "拍一拍，\n分析日记", "The visible Agent hint should use the compact owner-approved copy");

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 600, height: 900 },
    { width: 700, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(120);
    const stageTops = [];
    for (const position of [0, .5, 1]) {
      await page.evaluate((ratio) => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * ratio, behavior: "instant" }), position);
      await page.waitForTimeout(80);
      const metrics = await page.locator('[data-agent-surface="diary"]').evaluate((stage) => {
        const button = stage.querySelector(".organize-helper");
        const traveler = stage.querySelector(".diary-agent-traveler");
        const figure = stage.querySelector(".organize-helper-figure");
        const stageBox = stage.getBoundingClientRect();
        const buttonBox = button.getBoundingClientRect();
        const figureBox = figure.getBoundingClientRect();
        const hint = stage.querySelector("[data-agent-idle-hint]");
        const hintBox = hint?.getBoundingClientRect();
        const binding = document.querySelector(".home-edge-rail-brush");
        const bindingBox = binding.getBoundingClientRect();
        const entryTextRects = [...document.querySelectorAll(".entry-content")].flatMap((entry) => {
          const range = document.createRange();
          range.selectNodeContents(entry);
          return [...range.getClientRects()];
        });
        const controls = [...document.querySelectorAll(".home-edge-rail-tools > button, .domain-directory-node, .action-dock button")];
        const directoryLabels = [...document.querySelectorAll(".domain-directory-node > span")].map((label) => {
          const rect = label.getBoundingClientRect();
          const backgroundColor = getComputedStyle(label).backgroundColor;
          return {
            rect,
            masksAgent: label.closest("li")?.classList.contains("has-domain-insights")
              && backgroundColor !== "transparent"
              && backgroundColor !== "rgba(0, 0, 0, 0)"
          };
        });
        const overlaps = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return {
          stageTop: stageBox.top,
          stagePosition: getComputedStyle(stage).position,
          buttonWidth: buttonBox.width,
          buttonHeight: buttonBox.height,
          buttonInsideViewport: buttonBox.left >= -1 && buttonBox.right <= innerWidth + 1 && buttonBox.top >= -1 && buttonBox.bottom <= innerHeight + 1,
          hintBelowFigure: Boolean(hintBox) && hintBox.top >= figureBox.bottom - 1,
          hintRightOfSpine: Boolean(hintBox) && hintBox.left >= bindingBox.right - 1,
          hintInsideViewport: Boolean(hintBox) && hintBox.left >= -1 && hintBox.right <= innerWidth + 1 && hintBox.top >= -1 && hintBox.bottom <= innerHeight + 1,
          hintWidth: hintBox?.width ?? null,
          hintTextOverlap: hintBox ? entryTextRects.reduce((sum, rect) => sum + overlaps(hintBox, rect), 0) : null,
          motionMode: stage.dataset.agentMotionMode,
          animationName: getComputedStyle(traveler).animationName,
          animationDuration: Number.parseFloat(getComputedStyle(traveler).animationDuration),
          asset: figure.getAttribute("src"),
          railCount: document.querySelectorAll(".home-edge-rail-brush").length,
          directoryLabelOverlap: directoryLabels.reduce((sum, item) => sum + (item.masksAgent ? 0 : overlaps(figureBox, item.rect)), 0),
          maskedDirectoryLabelOverlap: directoryLabels.reduce((sum, item) => sum + (item.masksAgent ? overlaps(figureBox, item.rect) : 0), 0),
          controlsRemainTopmost: controls.every((control) => {
            const rect = control.getBoundingClientRect();
            if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return true;
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            return control === hit || control.contains(hit);
          })
        };
      });
      stageTops.push(metrics.stageTop);
      assert.equal(metrics.stagePosition, "fixed", `${viewport.width}px Agent track should remain viewport-fixed at scroll ${position}: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.buttonWidth >= 43.9 && metrics.buttonHeight >= 79.5 && metrics.buttonInsideViewport, `${viewport.width}px Agent and its accessible target should remain visible at scroll ${position}: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.hintBelowFigure, true, `${viewport.width}px idle hint should sit below the Agent artwork: ${JSON.stringify(metrics)}`);
      if (viewport.width <= 700) {
        assert.equal(metrics.hintRightOfSpine, true, `${viewport.width}px idle hint should sit in the gutter to the right of the spine: ${JSON.stringify(metrics)}`);
      }
      assert.equal(metrics.hintInsideViewport, true, `${viewport.width}px idle hint should remain inside the protected viewport track: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.hintWidth <= 52.5, `${viewport.width}px idle hint should use a compact rail-width box: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.hintTextOverlap <= 1, `${viewport.width}px idle hint should not overlap authored record text: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.railCount, 1, `${viewport.width}px should retain one book-spine rail: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.directoryLabelOverlap <= 1, `${viewport.width}px travelling art should remain beside ordinary directory text or behind the opaque active label at scroll ${position}: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.controlsRemainTopmost, true, `${viewport.width}px right-side controls should stay clickable above the Agent: ${JSON.stringify(metrics)}`);
      if (viewport.width <= 700) {
        assert.equal(metrics.motionMode, "animated", `${viewport.width}px should enable the mobile patrol: ${JSON.stringify(metrics)}`);
        assert.equal(metrics.animationName, "diary-agent-spine-patrol", `${viewport.width}px should use the spine patrol: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.animationDuration >= 27.9, `${viewport.width}px idle movement should take at least 28 seconds one-way: ${JSON.stringify(metrics)}`);
        assert.equal(metrics.asset, "/ui/diary/agent-spine-spirit-idle-motion.png", `${viewport.width}px should use the source-faithful motion asset: ${JSON.stringify(metrics)}`);
      } else {
        assert.equal(metrics.motionMode, "still", `${viewport.width}px desktop should use a quiet fixed pose: ${JSON.stringify(metrics)}`);
        assert.equal(metrics.animationName, "none", `${viewport.width}px desktop should not patrol: ${JSON.stringify(metrics)}`);
        assert.equal(metrics.asset, "/ui/diary/agent-spine-spirit-idle-still.png", `${viewport.width}px desktop should use the source-faithful still asset: ${JSON.stringify(metrics)}`);
      }
    }
    assert.ok(Math.max(...stageTops) - Math.min(...stageTops) <= 1, `${viewport.width}px document scroll must not move the fixed Agent track: ${JSON.stringify(stageTops)}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "打开月历" }).click();
  const calendarAgent = await page.locator('[data-agent-surface="diary"]').evaluate((stage) => {
    const art = stage.querySelector(".organize-helper-appearance").getBoundingClientRect();
    const overlaps = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const days = [...document.querySelectorAll(".calendar-day")].map((day) => day.getBoundingClientRect());
    return {
      motionMode: stage.dataset.agentMotionMode,
      calendarOpen: stage.dataset.agentCalendarOpen,
      selectorMatches: stage.matches('.diary-agent-viewport[data-agent-calendar-open="true"]')
        && stage.querySelector(".organize-helper")?.matches(".organize-helper[data-agent-status]"),
      animationName: getComputedStyle(stage.querySelector(".diary-agent-traveler")).animationName,
      transform: getComputedStyle(stage.querySelector(".organize-helper-appearance")).transform,
      art: { left: art.left, right: art.right, top: art.top, bottom: art.bottom, width: art.width, height: art.height },
      dayOverlap: Math.max(0, ...days.map((day) => overlaps(art, day)))
    };
  });
  assert.equal(calendarAgent.motionMode, "still", `Calendar should freeze the companion: ${JSON.stringify(calendarAgent)}`);
  assert.equal(calendarAgent.animationName, "none", `Calendar should pause track movement: ${JSON.stringify(calendarAgent)}`);
  assert.ok(calendarAgent.dayOverlap <= 1, `Calendar should keep the compact companion outside all date targets: ${JSON.stringify(calendarAgent)}`);
  assert.equal(await page.locator("[data-agent-idle-hint]").count(), 0, "Expanded Calendar should hide the idle hint from date targets");
  await page.screenshot({ path: join(outputDir, "ln-076-agent-rework8-calendar-390.png"), fullPage: false });
  await page.getByRole("button", { name: "收起月历" }).click();
});

test("LN-076 category chapters compact the hierarchy and use one boundary rule", async (page) => {
  await page.evaluate(({ date }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.entries.push({
      id: "ln-076-category-chapter-entry",
      date,
      time: "11:45",
      content: "学习了blender",
      categoryId: "study",
      tags: [],
      templateId: "learn",
      fieldValues: {},
      attachments: [],
      createdAt: 1
    });
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "zh-CN");
  }, { date: testDate });
  await page.reload({ waitUntil: "domcontentloaded" });
  await setRecordView(page, "grouped");

  const healthDomain = page.locator(".record-domain", { has: page.getByRole("heading", { name: "健康", exact: true }) });
  const chapterLine = healthDomain.locator("[data-domain-chapter-line]");
  await assertVisible(chapterLine);
  await assertVisible(chapterLine.getByRole("heading", { name: "健康", exact: true }));
  await assertVisible(chapterLine.getByRole("heading", { name: "身体指标", exact: true }));
  const chapterProgress = chapterLine.locator("[data-category-progress]");
  assert.equal(await chapterProgress.textContent(), "0/5", "The first category progress should stay in the compact chapter line");
  assert.equal(await chapterProgress.getAttribute("aria-label"), "已完成0/5", "Compact progress should preserve its accessible label");

  const healthCategories = healthDomain.locator(":scope > .record-category");
  assert.ok(await healthCategories.count() > 1, "The fixture should retain a later Health category");
  await assertVisible(healthCategories.nth(1).locator(".record-category-header").getByRole("heading", { name: "作息与恢复", exact: true }));

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 932 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(60);
    await assertNoHorizontalOverflow(page, `${viewport.width}px compact Category chapters`);
    const geometry = await page.locator(".grouped-view").evaluate((groupedView) => {
      const domains = [...groupedView.querySelectorAll(":scope > .record-domain")];
      const firstDomain = domains[0];
      const nextDomain = firstDomain?.nextElementSibling;
      const chapter = firstDomain?.querySelector("[data-domain-chapter-line]");
      const domainHeading = chapter?.querySelector("h2");
      const categoryHeading = chapter?.querySelector("h3");
      const firstCategory = firstDomain?.querySelector(":scope > .record-category");
      const lastCategory = firstDomain?.querySelector(":scope > .record-category:last-of-type");
      const lastRow = lastCategory?.querySelector(".fixed-records-list > :last-child.fixed-entry, .fixed-records-list > :last-child .fixed-entry, .record-group-list > :last-child.group-entry");
      const nextHeading = nextDomain?.querySelector(".record-domain-header h2");
      const box = (element) => element?.getBoundingClientRect() || null;
      const chapterBox = box(chapter);
      const domainBox = box(domainHeading);
      const categoryBox = box(categoryHeading);
      const lastRowBox = box(lastRow);
      const nextHeadingBox = box(nextHeading);
      return {
        domainCount: domains.length,
        distinctHeadingElements: Boolean(domainHeading && categoryHeading && domainHeading !== categoryHeading),
        chapterWidth: chapterBox?.width || 0,
        chapterScrollWidth: chapter?.scrollWidth || 0,
        headingBaselineDelta: domainBox && categoryBox ? Math.abs(domainBox.bottom - categoryBox.bottom) : null,
        firstCategoryLabelledBy: firstCategory?.getAttribute("aria-labelledby") || null,
        firstCategoryHeadingId: categoryHeading?.id || null,
        laterCategoryHeadingVisible: Boolean(firstDomain?.querySelector(":scope > .record-category:nth-of-type(2) .record-category-header h3")),
        lastRowRule: lastRow ? getComputedStyle(lastRow).backgroundImage : "",
        nextDomainRule: nextDomain ? getComputedStyle(nextDomain).backgroundImage : "",
        boundaryGap: lastRowBox && nextHeadingBox ? nextHeadingBox.top - lastRowBox.bottom : null,
        inputHeights: [...groupedView.querySelectorAll(".fixed-records-embedded input")].map((input) => box(input)?.height || 0)
      };
    });
    assert.ok(geometry.domainCount >= 2, `Category evidence should include an adjacent domain: ${JSON.stringify({ viewport, geometry })}`);
    assert.equal(geometry.distinctHeadingElements, true, `Domain and first category should remain distinct headings: ${JSON.stringify({ viewport, geometry })}`);
    assert.equal(geometry.firstCategoryLabelledBy, geometry.firstCategoryHeadingId, `The first category section should keep its heading relationship: ${JSON.stringify({ viewport, geometry })}`);
    assert.equal(geometry.laterCategoryHeadingVisible, true, `Later categories should retain explicit headings: ${JSON.stringify({ viewport, geometry })}`);
    assert.ok(geometry.chapterScrollWidth <= geometry.chapterWidth + 1, `The compact chapter line should wrap without overflow: ${JSON.stringify({ viewport, geometry })}`);
    if (viewport.width >= 390) assert.ok(geometry.headingBaselineDelta <= 8, `Domain and first category should share one editorial line: ${JSON.stringify({ viewport, geometry })}`);
    assert.match(geometry.lastRowRule, /record-rule-handdrawn/, `The final row may own the single weak boundary rule: ${JSON.stringify({ viewport, geometry })}`);
    assert.equal(geometry.nextDomainRule, "none", `The next domain should not draw a second equal-weight rule: ${JSON.stringify({ viewport, geometry })}`);
    assert.ok(geometry.boundaryGap >= 24 && geometry.boundaryGap <= 40, `One section rhythm should separate the final row and next chapter: ${JSON.stringify({ viewport, geometry })}`);
    assert.ok(geometry.inputHeights.every((height) => height >= 43.99), `Periodic inputs should retain 44px targets: ${JSON.stringify({ viewport, geometry })}`);
    await page.screenshot({ path: join(outputDir, `ln-076-category-chapter-${viewport.width}.png`), fullPage: true });
  }
});

test("legacy periodic backup: edit, validate, clear, refresh, and round trip", async (page) => {
  const currentLegacyBackup = {
    ...legacyPeriodicBackup,
    entries: legacyPeriodicBackup.entries.map((entry) => ({ ...entry, date: testDate }))
  };
  await openHomeSettings(page);
  await openSettingsPanel(page, "Restore");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({
    name: "legacy-periodic-free-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(currentLegacyBackup))
  });
  await assertVisible(page.locator(".toast", { hasText: "Backup restored" }));
  await leaveSettings(page);
  await page.waitForURL(baseURL + "/");

  const morning = page.getByPlaceholder("Legacy morning value");
  await assertVisible(morning);
  assert.equal(await morning.inputValue(), "67.2kg");

  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    window.__restoreSetItem = () => { Storage.prototype.setItem = originalSetItem; };
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "log-note:data:v1") throw new Error("E2E quota failure");
      return originalSetItem.call(this, key, value);
    };
  });
  await morning.fill("67.3kg");
  await morning.press("Enter");
  await assertVisible(page.getByRole("status").getByText(/Could not save local data/));
  assert.equal(await page.getByRole("status").getByText("Record updated").count(), 0);
  await page.evaluate(() => window.__restoreSetItem());
  await morning.press("Enter");
  await assertVisible(page.getByRole("status").getByText("Record updated"));
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.getByPlaceholder("Legacy morning value").inputValue(), "67.3kg");

  await page.getByPlaceholder("Legacy morning value").fill("67.6kg");
  await page.getByPlaceholder("Legacy morning value").press("Enter");
  await assertVisible(page.getByRole("status").getByText("Record updated"));

  const journal = page.locator(".fixed-entry-block", { hasText: "Legacy journal" });
  await journal.locator(".fixed-entry-expand").click();
  const journalInput = journal.locator("textarea");
  assert.equal(await journalInput.inputValue(), "Original free wording; keep punctuation = exactly.");
  await journalInput.fill("Edited free wording = still verbatim.");
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    window.__restoreSetItem = () => { Storage.prototype.setItem = originalSetItem; };
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "log-note:data:v1") throw new Error("E2E quota failure");
      return originalSetItem.call(this, key, value);
    };
  });
  await journal.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.getByRole("status").getByText(/Could not save local data/));
  assert.equal(await journal.locator(".fixed-inline-form").isVisible(), true);
  assert.equal(await journalInput.inputValue(), "Edited free wording = still verbatim.");
  await page.evaluate(() => window.__restoreSetItem());
  await journal.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.getByRole("status").getByText("Record updated"));

  const required = page.locator(".fixed-entry-block", { hasText: "Hydration check" });
  await required.locator(".fixed-entry-expand").click();
  await required.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.getByRole("status").getByText("Complete Amount"));
  assert.equal(await required.locator(".fixed-inline-form").isVisible(), true);
  await required.getByPlaceholder("Water amount").fill("1200ml");
  await required.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.getByRole("status").getByText("Saved"));

  const review = page.locator(".fixed-entry-block", { hasText: "Legacy review" });
  await review.locator(".fixed-entry-expand").click();
  const reviewInput = review.locator("textarea");
  assert.equal(await reviewInput.inputValue(), "Original paragraph that cannot be reconstructed from current fields.");
  await reviewInput.fill("");
  await review.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.getByRole("status").getByText("Empty record deleted"));

  await page.getByPlaceholder("Legacy morning value").fill("");
  await page.getByPlaceholder("Legacy morning value").press("Enter");
  await assertVisible(page.getByRole("status").getByText("Empty record deleted"));
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.getByPlaceholder("Legacy morning value").inputValue(), "");
  await assertVisible(page.locator(".fixed-entry-block", { hasText: "Edited free wording = still verbatim." }));
  assert.equal(await page.locator(".fixed-entry-block", { hasText: "Legacy review" }).getByText("Fill in", { exact: true }).count(), 1);

  await openHomeSettings(page);
  await openSettingsPanel(page, "Download");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Text backup" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let backupText = "";
  for await (const chunk of stream) backupText += chunk;
  const exported = JSON.parse(backupText);
  assert.equal(exported.templates.find((item) => item.id === "morning-weight").inputMode, "free");
  assert.equal(exported.templates.find((item) => item.id === "legacy-review").inputMode, "structured");
  assert.equal(exported.entries.find((item) => item.templateId === "legacy-journal").content, "Edited free wording = still verbatim.");
  assert.equal(exported.entries.some((item) => item.templateId === "morning-weight"), false);
  assert.equal(exported.entries.some((item) => item.templateId === "legacy-review"), false);

  await openSettingsPanel(page, "Restore");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({ name: "round-trip.json", mimeType: "application/json", buffer: Buffer.from(backupText) });
  await assertVisible(page.locator(".toast", { hasText: "Backup restored" }));
  await leaveSettings(page);
  await page.waitForURL(baseURL + "/");
  await assertVisible(page.locator(".fixed-entry-block", { hasText: "Edited free wording = still verbatim." }));
  assert.equal(await page.getByPlaceholder("Legacy morning value").inputValue(), "");
});

test("periodic value deletion: failed local persistence keeps the editor and stored record", async (page) => {
  await page.goto(`${baseURL}/?newTemplate=morning-weight&date=${testDate}`, { waitUntil: "domcontentloaded" });
  let composer = page.getByRole("dialog", { name: "New record" });
  await assertVisible(composer);
  await composer.getByLabel("Value").fill("66.8kg");
  await composer.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.getByRole("status").getByText("Saved"));

  const entryId = await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem("log-note:data:v1"));
    return state.entries.find((entry) => entry.templateId === "morning-weight" && entry.content.endsWith("=66.8kg"))?.id;
  });
  assert.ok(entryId, "The periodic value should be persisted before testing deletion failure");
  await page.goto(`${baseURL}/?entry=${encodeURIComponent(entryId)}`, { waitUntil: "domcontentloaded" });
  composer = page.getByRole("dialog", { name: "Edit record" });
  await assertVisible(composer);
  await composer.getByLabel("Value").fill("");
  const storedBeforeFailure = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    window.__restoreSetItem = () => { Storage.prototype.setItem = originalSetItem; };
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "log-note:data:v1") throw new Error("E2E quota failure");
      return originalSetItem.call(this, key, value);
    };
  });
  await composer.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.getByRole("status").getByText(/Could not save local data/));
  assert.equal(await composer.count(), 1, "A failed deletion must keep the editor open for retry");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), storedBeforeFailure, "A failed deletion must not change persisted state");
  await page.evaluate(() => window.__restoreSetItem());
  await composer.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.getByRole("status").getByText("Empty record deleted"));
  assert.equal(await page.evaluate((id) => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.some((entry) => entry.id === id), entryId), false);
});

test("record setup: template ordering and the single structure-export workspace", async (page) => {
  const recordSetup = await openRecordSetup(page);
  assert.equal(new URL(page.url()).hash, "#record-setup");
  assert.equal(await recordSetup.locator(".template-manager-embedded").count(), 1, "Settings should mount one embedded structure editor");
  assert.equal(await recordSetup.locator(".management-header, main").count(), 0, "Embedded setup must not add a second page shell");

  const metrics = page.locator(".category-branch", {
    has: page.locator(".category-row", { hasText: /^Body metrics/ })
  });
  await assertVisible(metrics);
  await assertVisible(metrics.locator(".template-row").first().getByText("Morning weight", { exact: true }));
  const templateHierarchy = await metrics.evaluate((branch) => {
    const domainTitle = branch.closest(".domain-section").querySelector(".domain-row b");
    const categoryTitle = branch.querySelector(".category-row .row-main span");
    const templateTitle = branch.querySelector(".template-row b");
    const categoryList = branch.closest(".category-list");
    const categoryRow = branch.querySelector(".category-row").getBoundingClientRect();
    const templateRows = [...branch.querySelectorAll(".template-row")];
    const nextCategory = branch.nextElementSibling;
    return {
      domain: Number.parseFloat(getComputedStyle(domainTitle).fontSize),
      category: Number.parseFloat(getComputedStyle(categoryTitle).fontSize),
      template: Number.parseFloat(getComputedStyle(templateTitle).fontSize),
      treeBorderLeft: getComputedStyle(categoryList).borderLeftWidth,
      headingToFirstTemplate: templateRows[0].getBoundingClientRect().top - categoryRow.bottom,
      lastTemplateToNextCategory: nextCategory ? nextCategory.querySelector(".category-row").getBoundingClientRect().top - templateRows.at(-1).getBoundingClientRect().bottom : null
    };
  });
  ln058Evidence.structure = {
    headingToFirstTemplate: templateHierarchy.headingToFirstTemplate,
    lastTemplateToNextCategory: templateHierarchy.lastTemplateToNextCategory
  };
  assert.ok(templateHierarchy.domain > templateHierarchy.category && templateHierarchy.category > templateHierarchy.template, `Template setup should read domain, category, then template: ${JSON.stringify(templateHierarchy)}`);
  assert.equal(templateHierarchy.treeBorderLeft, "1px", "Template setup should keep the semantic hierarchy line");
  assert.ok(templateHierarchy.headingToFirstTemplate >= 0 && templateHierarchy.headingToFirstTemplate <= 4, `A category should stay attached to its first template: ${JSON.stringify(templateHierarchy)}`);
  assert.ok(templateHierarchy.lastTemplateToNextCategory >= 8 && templateHierarchy.lastTemplateToNextCategory <= 12, `Sibling template groups should separate more than category-owned content: ${JSON.stringify(templateHierarchy)}`);
  const morning = metrics.locator(".template-row", { hasText: "Morning weight" });
  await morning.locator("summary").click();
  await morning.getByRole("button", { name: "Move down" }).click();
  await assertVisible(metrics.locator(".template-row").first().getByText("Evening weight", { exact: true }));

  assert.equal(await page.getByRole("dialog", { name: "Export records" }).count(), 0, "Record setup should not render the duplicate export drawer");
  assert.equal(await page.getByRole("button", { name: "Download all" }).count(), 0, "Record setup should not duplicate record downloads");
  assert.equal(await page.getByRole("button", { name: "Text backup" }).count(), 0, "Record setup should not duplicate backup downloads");
  await page.screenshot({ path: join(outputDir, "ln-032-template-entry-390.png"), fullPage: true });
  await page.screenshot({ path: join(outputDir, "ln-058-structure-390.png"), fullPage: true });
  await page.goto(`${baseURL}/settings#structure`, { waitUntil: "domcontentloaded" });
  const structureSection = page.locator("#structure");
  await assertVisible(structureSection.getByRole("heading", { name: "Structure" }));
  assert.equal(await page.locator('.settings-nav a[href="#export"]').getAttribute("aria-current"), "page", "The legacy structure deep link should select Download");
  await assertVisible(page.getByRole("heading", { name: "Save files", exact: true }));
  const anchorPosition = await structureSection.evaluate((element) => ({ top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, viewportHeight: window.innerHeight, scrollY: window.scrollY }));
  assert.ok(anchorPosition.top >= 0 && anchorPosition.top < anchorPosition.viewportHeight - 44, `Structure deep links should reveal the structure group without a second navigation step: ${JSON.stringify(anchorPosition)}`);
  assert.ok(anchorPosition.scrollY >= 0, `Structure deep links should preserve a valid scroll position: ${JSON.stringify(anchorPosition)}`);
  ln032Evidence.templateEntry = { duplicateDrawerCount: 0, duplicateMarkdownCount: 0, duplicateBackupCount: 0, href: "/settings#structure", anchorPosition };
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download current structure" }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "log-note-structure.json");

  await page.goto(`${baseURL}/templates`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`${baseURL}/settings#record-setup`);
  await assertVisible(page.locator("#record-setup .template-manager-embedded"));
  await page.goto(`${baseURL}/templates?focus=periodic`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`${baseURL}/settings?focus=periodic#record-setup`);
  await assertVisible(page.getByText("Adjust order, timing, input, or whether an item appears on the record page."));
});

test("fixed records: adjust entry pauses and restores home visibility", async (page) => {
  await page.goto(baseURL + "/");
  const fixedSection = page.locator(".fixed-records");
  await fixedSection.getByRole("link", { name: "Adjust" }).click();
  await page.waitForURL(baseURL + "/settings?focus=periodic#record-setup");
  await assertVisible(page.locator("#record-setup .template-manager-embedded"));
  await assertVisible(page.getByText("Adjust order, timing, input, or whether an item appears on the record page."));

  const morning = page.locator(".template-row", { hasText: "Morning weight" });
  await morning.locator(".row-main").click();
  const toggle = page.getByRole("checkbox", { name: "Show on record page" });
  await toggle.uncheck();
  await page.getByRole("dialog").getByRole("button").first().click();
  await leaveSettings(page);
  await assertHidden(page.getByText("Morning weight", { exact: true }));

  await fixedSection.getByRole("link", { name: "Adjust" }).click();
  await page.locator(".template-row", { hasText: "Morning weight" }).locator(".row-main").click();
  await page.getByRole("checkbox", { name: "Show on record page" }).check();
  await page.getByRole("dialog").getByRole("button").first().click();
  await leaveSettings(page);
  await assertVisible(page.getByText("Morning weight", { exact: true }));
});

test("mobile controls: setup and composer actions keep 44px targets", async (page) => {
  const viewports = [
    { width: 320, height: 500 },
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 1280, height: 720 }
  ];

  for (const viewport of viewports) {
    const label = `${viewport.width}x${viewport.height}`;
    await page.setViewportSize(viewport);
    await openRecordSetup(page, { periodic: true });
    const morning = page.locator(".template-row", { hasText: "Morning weight" });
    await morning.locator("summary").click();
    await assertMinTouchTarget(morning.getByRole("button", { name: "Move up" }), `${label} move up`);
    await assertMinTouchTarget(morning.getByRole("button", { name: "Move down" }), `${label} move down`);
    await assertMinTouchTarget(morning.locator(".item-menu-popover select"), `${label} move-to category`);
    await morning.locator("summary").click();

    await morning.locator(".row-main").click();
    const dialog = page.getByRole("dialog");
    const close = dialog.getByRole("button", { name: "Close" });
    await assertMinTouchTarget(close, `${label} template editor close`);
    const modeButtons = dialog.locator(".template-mode-switch button");
    for (let index = 0; index < await modeButtons.count(); index += 1) {
      await assertMinTouchTarget(modeButtons.nth(index), `${label} template mode ${index + 1}`);
    }
    await dialog.locator(".structure-sheet-body").evaluate((body) => { body.scrollTop = body.scrollHeight; });
    await assertVisible(close, `${label} sticky template header should remain reachable`);
    await close.click();
    await assertNoHorizontalOverflow(page, `${label} record setup`);

    await page.goto(baseURL + "/", { waitUntil: "domcontentloaded" });
    const homeControls = page.locator(".topbar .icon-button:visible, .home-date-title .date-context-disclosure");
    for (let index = 0; index < await homeControls.count(); index += 1) {
      await assertMinTouchTarget(homeControls.nth(index), `${label} home control ${index + 1}`);
    }
    await page.getByRole("button", { name: "Add record" }).click();
    const composer = page.locator(".surface.composer");
    await assertMinTouchTarget(composer.getByRole("button", { name: "Close" }), `${label} composer close`);
    await assertMinTouchTarget(composer.getByRole("button", { name: "Done" }), `${label} composer done`);
    await assertNoHorizontalOverflow(page, `${label} composer`);
    await composer.getByRole("button", { name: "Close" }).click();
  }
});

test("record setup: failed persistence does not create unsaved structure in the UI", async (page) => {
  await openRecordSetup(page);
  const domains = page.locator(".domain-section");
  const domainCount = await domains.count();
  const storedBeforeFailure = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    window.__restoreSetItem = () => { Storage.prototype.setItem = originalSetItem; };
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "log-note:data:v1") throw new Error("E2E structure quota failure");
      return originalSetItem.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "New domain" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Could not save local data" }));
  assert.equal(await domains.count(), domainCount, "Failed structure writes must not update the rendered hierarchy");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), storedBeforeFailure);
  await page.evaluate(() => window.__restoreSetItem());
});

test("local image attachment: save, refresh, portable restore, missing fallback, and fit", async (page) => {
  const content = "Offline image attachment record";
  await page.getByRole("button", { name: "Add record" }).click();
  const composer = page.locator(".surface.composer");
  await composer.locator(".writing-area textarea").fill(content);
  await composer.getByRole("button", { name: "More" }).click();
  const imageInput = composer.locator('input[type="file"][accept*="image/jpeg"]');
  await imageInput.setInputFiles(join(process.cwd(), "public/icon-192.png"));
  await assertVisible(page.locator(".toast", { hasText: "Image kept locally" }));
  const preview = composer.locator(".composer-attachment-item img");
  await assertVisible(preview);
  assert.match(await preview.getAttribute("src"), /^blob:/);
  const templateSelect = composer.getByLabel("Choose how to record");
  await templateSelect.selectOption("learn");
  await assertVisible(page.locator(".toast", { hasText: "Remove the image before choosing guided fields or a single value" }));
  assert.equal(await templateSelect.inputValue(), "quick", "An image draft must remain owned by a free-text template");
  await assertVisible(preview, "Blocking an unsupported template switch must keep the image manageable");
  const attachmentTypography = await composer.locator(".composer-attachments").evaluate((section) => {
    const size = (selector) => Number.parseFloat(getComputedStyle(section.querySelector(selector)).fontSize);
    const headingBox = section.querySelector(".composer-attachments-heading").getBoundingClientRect();
    const itemBox = section.querySelector(".composer-attachment-item").getBoundingClientRect();
    const filenameBox = section.querySelector(".composer-attachment-copy strong").getBoundingClientRect();
    const metadataBox = section.querySelector(".composer-attachment-copy small").getBoundingClientRect();
    return {
      heading: size(".composer-attachments-heading > span"),
      action: size(".attachment-picker-button"),
      filename: size(".composer-attachment-copy strong"),
      metadata: size(".composer-attachment-copy small"),
      headingToItem: itemBox.top - headingBox.bottom,
      filenameToMetadata: metadataBox.top - filenameBox.bottom
    };
  });
  ln058Evidence.attachment = {
    headingToItem: attachmentTypography.headingToItem,
    filenameToMetadata: attachmentTypography.filenameToMetadata
  };
  assert.ok(attachmentTypography.heading >= 14 && attachmentTypography.action >= 14, `Attachment labels and actions should remain readable: ${JSON.stringify(attachmentTypography)}`);
  assert.ok(attachmentTypography.filename >= 14 && attachmentTypography.metadata >= 12, `Attachment content should follow label then metadata hierarchy: ${JSON.stringify(attachmentTypography)}`);
  assert.ok(attachmentTypography.filename > attachmentTypography.metadata, `Attachment filename should lead its metadata: ${JSON.stringify(attachmentTypography)}`);
  assert.ok(attachmentTypography.headingToItem >= 11 && attachmentTypography.headingToItem <= 13, `Attachment rows should follow their heading by one cluster rhythm: ${JSON.stringify(attachmentTypography)}`);
  assert.ok(attachmentTypography.filenameToMetadata >= 3 && attachmentTypography.filenameToMetadata <= 5, `Attachment metadata should remain paired with its filename: ${JSON.stringify(attachmentTypography)}`);
  await assertMinTouchTarget(composer.getByRole("button", { name: /Remove icon-192\.png/ }), "Remove local image");
  await composer.getByRole("button", { name: "Done" }).click();

  let entry = page.locator(".timeline .entry", { hasText: content });
  await assertVisible(entry.locator("img"));
  assert.match(await entry.locator("img").getAttribute("src"), /^blob:/);
  const storedPayload = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  assert.equal(storedPayload.includes("data:image"), false, "Binary image data must not enter localStorage");
  assert.match(storedPayload, /attachment-/);
  await page.reload({ waitUntil: "domcontentloaded" });
  entry = page.locator(".timeline .entry", { hasText: content });
  await assertVisible(entry.locator("img"), "IndexedDB image should survive refresh");

  for (const [width, height] of [[320, 844], [390, 844], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await assertNoHorizontalOverflow(page, `${width}px image attachment timeline`);
    await assertVisible(entry.locator("img"));
    await page.screenshot({ path: join(outputDir, `ln-042-attachment-${width}.png`), fullPage: true });
    if (width === 390) await page.screenshot({ path: join(outputDir, "ln-058-attachment-390.png"), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await setRecordView(page, "grouped");
  await assertVisible(page.locator(".group-entry", { hasText: content }).locator("img"));

  await openHomeSettings(page);
  await openSettingsPanel(page, "Download");
  const portable = await downloadBuffer(page, () => page.getByRole("button", { name: "Complete backup" }).click());
  assert.match(portable.filename, /^log-note-portable-\d{4}-\d{2}-\d{2}\.lnbackup$/);
  assert.ok(portable.buffer.length > 1000, "Portable backup should contain binary image bytes");
  const jsonText = await downloadText(page, () => page.getByRole("button", { name: "Text backup" }).click());
  assert.equal(jsonText.includes("data:image"), false);
  assert.equal(JSON.parse(jsonText).entries.find((item) => item.content === content).attachments.length, 1);

  await page.evaluate(async () => {
    window.localStorage.clear();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase("log-note-attachments");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("attachment database delete blocked"));
    });
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.getByText(content, { exact: true }).count(), 0);
  await openHomeSettings(page);
  await openSettingsPanel(page, "Restore");

  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    window.__restoreAttachmentSetItem = () => { Storage.prototype.setItem = originalSetItem; };
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "log-note:data:v1") throw new Error("E2E portable restore quota failure");
      return originalSetItem.call(this, key, value);
    };
  });
  page.once("dialog", (dialog) => {
    assert.match(dialog.message(), /all Log Note data.*records, plans, structure, templates, Markdown settings, and images/i, "Portable restore confirmation should name the full replacement scope");
    dialog.accept();
  });
  await page.locator('input[type="file"][accept*=".lnbackup"]').setInputFiles({ name: portable.filename, mimeType: "application/vnd.log-note.backup", buffer: portable.buffer });
  await assertVisible(page.locator(".toast", { hasText: "Portable backup is invalid or incomplete" }));
  const failedRestoreBlobCount = await page.evaluate(async () => new Promise((resolve, reject) => {
    const open = indexedDB.open("log-note-attachments", 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const request = database.transaction("images", "readonly").objectStore("images").count();
      request.onsuccess = () => { database.close(); resolve(request.result); };
      request.onerror = () => reject(request.error);
    };
  }));
  assert.equal(failedRestoreBlobCount, 0, "Failed state persistence should roll back newly imported image Blobs");
  await page.evaluate(() => window.__restoreAttachmentSetItem());

  const replacementBytes = await page.evaluate(async () => new Promise((resolve, reject) => {
    const open = indexedDB.open("log-note-attachments", 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const transaction = database.transaction("images", "readwrite");
      const blob = new Blob([new Uint8Array(5 * 1024 * 1024)], { type: "image/png" });
      for (let index = 0; index < 10; index += 1) {
        transaction.objectStore("images").put({ id: `old-${index}`, ownerId: "e2e-user", kind: "image", storage: "indexeddb", mediaType: "image/png", bytes: blob.size, name: `old-${index}.png`, alt: "old image", createdAt: index, blob });
      }
      transaction.oncomplete = () => { database.close(); resolve(blob.size * 10); };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
  assert.equal(replacementBytes, 50 * 1024 * 1024, "Replacement setup should fill the existing attachment allowance");

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][accept*=".lnbackup"]').setInputFiles({ name: portable.filename, mimeType: "application/vnd.log-note.backup", buffer: portable.buffer });
  await assertVisible(page.locator(".toast", { hasText: "Records and images restored" }));
  const replacementBlobCount = await page.evaluate(async () => new Promise((resolve, reject) => {
    const open = indexedDB.open("log-note-attachments", 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const request = database.transaction("images", "readonly").objectStore("images").count();
      request.onsuccess = () => { database.close(); resolve(request.result); };
      request.onerror = () => reject(request.error);
    };
  }));
  assert.equal(replacementBlobCount, 1, "Portable restore should replace old blobs instead of counting them against the final 50 MiB set");
  await leaveSettings(page);
  await page.waitForURL(baseURL + "/");
  entry = page.locator(".timeline .entry", { hasText: content });
  await assertVisible(entry.locator("img"), "Portable restore should restore the image under a fresh local ID");

  await openHomeSettings(page);
  await openSettingsPanel(page, "Restore");
  const corrupted = Buffer.from(portable.buffer);
  corrupted[corrupted.length - 1] ^= 255;
  await page.locator('input[type="file"][accept*=".lnbackup"]').setInputFiles({ name: "broken.lnbackup", mimeType: "application/vnd.log-note.backup", buffer: corrupted });
  await assertVisible(page.locator(".toast", { hasText: "Portable backup is invalid or incomplete" }));
  await leaveSettings(page);
  await assertVisible(page.locator(".timeline .entry", { hasText: content }).locator("img"), "Invalid restore must leave current data unchanged");

  const attachmentId = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.find((item) => item.content === "Offline image attachment record").attachments[0].id);
  await page.evaluate(async (id) => {
    await new Promise((resolve, reject) => {
      const open = indexedDB.open("log-note-attachments", 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const database = open.result;
        const transaction = database.transaction("images", "readwrite");
        transaction.objectStore("images").delete(id);
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, attachmentId);
  await page.reload({ waitUntil: "domcontentloaded" });
  entry = page.locator(".timeline .entry", { hasText: content });
  await assertVisible(entry.getByText("Image unavailable on this device"), "Missing image should become a safe placeholder");
  await entry.locator("[data-entry-content-action]").click();
  assert.equal(await page.locator("[data-inline-record-editor] .writing-area textarea").inputValue(), content, "Missing image must not alter note text");
});


test("settings: failed recovery keeps the original damaged payload protected", async (page) => {
  const damagedPayload = "{damaged-local-json";
  const replacement = {
    version: 4,
    structureSchemaVersion: 2,
    seedVersion: 3,
    domains: [{ id: "recovery-domain", name: "Recovery", order: 0 }],
    categories: [{ id: "recovery-category", domainId: "recovery-domain", name: "Recovered", order: 0 }],
    templates: [{ id: "recovery-template", name: "Recovered note", categoryId: "recovery-category", order: 0, recordType: "linear", schedule: null, inputMode: "free", tags: [], prompt: "", skeleton: "", fields: [] }],
    markdownSettings: { layout: "timeline", domainHeading: "## {{domain}}", categoryHeading: "### {{category}}", entryLine: "{{content}}", allDayHeading: "# {{date}}", daySeparator: "---" },
    entries: [{ id: "recovery-entry", date: testDate, time: "09:00", content: "Recovered after retry", categoryId: "recovery-category", tags: [], templateId: "recovery-template", fieldValues: {}, attachments: [], createdAt: 1 }],
    planBlocks: []
  };
  await page.evaluate((payload) => window.localStorage.setItem("log-note:data:v1", payload), damagedPayload);
  await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("heading", { name: "Settings" }));
  await assertVisible(page.getByRole("alert").filter({ hasText: "Local data needs recovery" }));
  await page.getByRole("link", { name: "Open recovery" }).click();
  await assertVisible(page.getByRole("heading", { name: "Import backup", exact: true }));
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Import backup", "Recovery shortcut should move focus to the visible mobile title");
  const rawPayload = await downloadText(page, () => page.getByRole("button", { name: /Download untouched local payload/ }).click());
  assert.equal(rawPayload, damagedPayload, "Recovery download should preserve the unreadable payload byte for byte");
  const jsonInput = page.locator('input[type="file"][accept*=".json"]');
  await jsonInput.setInputFiles({ name: "too-large.json", mimeType: "application/json", buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 32) });
  await assertVisible(page.locator(".toast", { hasText: "Choose a JSON backup no larger than 10 MB" }));
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), damagedPayload);
  await openSettingsPanel(page, "Download");
  await page.getByText("Download format", { exact: true }).click();
  const recordLine = page.getByLabel("Record line");
  assert.equal(await recordLine.isEnabled(), false, "Markdown editing should remain disabled while local data needs recovery");
  assert.equal(await page.getByRole("button", { name: /Download today/ }).isEnabled(), false, "Temporary defaults must not be exportable as real records");
  await openSettingsPanel(page, "Record setup");
  await assertVisible(page.locator("#record-setup .record-setup-protected"));
  assert.equal(await page.locator("#record-setup .template-manager, #record-setup .domain-list").count(), 0, "Recovery mode must not mount or clean up the structure editor");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), damagedPayload, "Opening protected Record setup must leave the damaged payload byte-identical");
  await openSettingsPanel(page, "Restore");
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    window.__restoreSetItem = () => { Storage.prototype.setItem = originalSetItem; };
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "log-note:data:v1") throw new Error("E2E recovery quota failure");
      return originalSetItem.call(this, key, value);
    };
  });
  page.once("dialog", (dialog) => dialog.accept());
  await jsonInput.setInputFiles({ name: "recovery.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(replacement)) });
  await assertVisible(page.locator(".toast", { hasText: "Could not restore backup" }));
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), damagedPayload, "A failed recovery write must preserve the damaged payload byte for byte");

  await page.evaluate(() => window.__restoreSetItem());
  page.once("dialog", (dialog) => dialog.accept());
  await jsonInput.setInputFiles({ name: "recovery.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(replacement)) });
  await assertVisible(page.locator(".toast", { hasText: "Backup restored" }));
  assert.equal(await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries[0].content), "Recovered after retry");
  await openSettingsPanel(page, "Download");
  await page.getByText("Download format", { exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll("input")].some((input) => input.closest("label")?.textContent?.includes("Record line") && !input.disabled));
  assert.equal(await page.getByLabel("Record line").isEnabled(), true, "Successful recovery should restore settings editing");

  await page.addInitScript(() => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(key) {
      if (key === "log-note:data:v1") throw new Error("E2E storage read denied");
      return originalGetItem.call(this, key);
    };
  });
  await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("alert").filter({ hasText: "Local data needs recovery" }));
  await page.getByRole("link", { name: "Open recovery" }).click();
  await assertVisible(page.getByText(/before the original value could be retrieved/));
  assert.equal(await page.getByRole("button", { name: /Download untouched local payload/ }).count(), 0, "A storage read failure must not offer a fabricated raw payload download");
});

test("diary Agent: wake, ask, chat, enrich, classify, undo, and stay in page", async (page) => {
  await page.evaluate((date) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    const template = state.templates.find((item) => item.recordType !== "periodic");
    const periodicTemplateIds = new Set(state.templates.filter((item) => item.recordType === "periodic").map((item) => item.id));
    state.entries = state.entries.filter((entry) => entry.date !== date || periodicTemplateIds.has(entry.templateId));
    const base = { date, categoryId: "daily", templateId: template.id, fieldValues: {}, attachments: [], tags: [], createdAt: Date.now() };
    state.entries.push(
      { ...base, id: "agent-question", time: "09:37", content: "学习交易市场复盘" },
      { ...base, id: "agent-category", time: "09:09", content: "市场复盘完成" },
      { ...base, id: "agent-question-two", time: "08:30", content: "早起弄好了" }
    );
    window.localStorage.setItem(key, JSON.stringify(state));
  }, testDate);
  await page.reload({ waitUntil: "domcontentloaded" });

  const railBefore = await page.locator(".home-edge-rail-brush").boundingBox();
  const agent = page.getByRole("button", { name: "Tap to review" });
  await assertVisible(agent);
  await assertMinTouchTarget(agent, "Diary Agent activation");
  await assertHidden(page.locator(".agent-wake-copy"), "Mobile should leave the writing plane clear of idle Agent copy");
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "zh-CN"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 390, height: 844 });
  await assertVisible(page.locator("[data-agent-idle-hint]"), "Chinese Diary should render the owner-approved idle hint before visual capture");
  await assertHidden(page.locator(".agent-wake-copy"), "Chinese mobile should also keep the idle Agent copy off the writing plane");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: join(outputDir, "ln-074-agent-idle-390.png"), fullPage: false });
  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 390, height: 844 });
  await agent.click();
  assert.equal(await page.locator("[data-agent-idle-hint]").count(), 0, "Starting analysis should remove the idle invitation");

  await assertVisible(page.locator('.home-agent-summary[data-agent-status="scanning"]'));
  const scanningAppearance = page.locator('.organize-helper-appearance[data-agent-appearance-state="scanning"]');
  await assertVisible(scanningAppearance);
  assert.equal(await scanningAppearance.getAttribute("data-agent-static-asset"), "/ui/diary/agent-spine-spirit-scanning-still.png", "Scanning should retain its source-faithful local pose");
  assert.equal(await scanningAppearance.getAttribute("data-agent-motion-asset"), "/ui/diary/agent-spine-spirit-scanning-motion.png", "Scanning should register a transparent local motion asset");
  assert.equal(await page.locator(".organize-helper-figure").getAttribute("src"), "/ui/diary/agent-spine-spirit-scanning-still.png", "Pointer focus should temporarily freeze scanning on its still pose");
  const scanningStageBox = await page.locator('[data-agent-surface="diary"]').boundingBox();
  assert.ok(scanningStageBox?.height >= 80, "Scanning should use a fixed viewport track without adding document-flow space");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: join(outputDir, "ln-074-agent-scanning-390.png"), fullPage: false });

  const panel = page.locator(".agent-review-panel");
  await assertVisible(panel);
  const reviewingAppearance = page.locator('.organize-helper-appearance[data-agent-appearance-state="reviewing"]');
  await assertVisible(reviewingAppearance);
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(80);
  assert.equal(await page.locator('[data-agent-surface="diary"]').getAttribute("data-agent-motion-mode"), "animated", "Reviewing should resume its restrained patrol after interaction focus leaves the Agent");
  assert.equal(await page.locator(".organize-helper-figure").getAttribute("src"), "/ui/diary/agent-spine-spirit-reviewing-motion.png", "Reviewing should keep a distinct source-faithful motion pose visible");
  const reviewingStage = await page.evaluate(() => {
    const overlapArea = (first, second) => Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left))
      * Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
    const stageElement = document.querySelector(".organize-helper-slot");
    const stage = stageElement?.getBoundingClientRect();
    const figure = document.querySelector(".organize-helper-figure")?.getBoundingClientRect();
    const lastEntry = [...document.querySelectorAll(".timeline-list > .entry")].at(-1)?.getBoundingClientRect();
    const fixedRecords = document.querySelector(".home-diary-workspace > .fixed-records")?.getBoundingClientRect();
    const textContent = [...document.querySelectorAll(".entry-content, .agent-review-prompt, .agent-review-messages p, .fixed-entry-label")]
      .map((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return range.getBoundingClientRect();
      });
    const protectedContent = [
      ...textContent,
      ...[...document.querySelectorAll(".agent-review-panel button, .fixed-inline-control input")]
        .map((node) => node.getBoundingClientRect())
    ];
    const railTargets = [...document.querySelectorAll(".home-edge-rail-tools > button, .domain-directory-node, .action-dock button")];
    const helper = document.querySelector(".organize-helper")?.getBoundingClientRect();
    return {
      stageHeight: stage?.height ?? null,
      stagePosition: stageElement ? getComputedStyle(stageElement).position : null,
      stageTop: stage?.top ?? null,
      stageBottom: stage?.bottom ?? null,
      lastEntryBottom: lastEntry?.bottom ?? null,
      fixedTop: fixedRecords?.top ?? null,
      figureContained: Boolean(stage && figure && figure.left >= -1 && figure.right <= window.innerWidth + 1 && figure.top >= -1 && figure.bottom <= window.innerHeight + 1),
      protectedOverlap: helper ? Math.max(0, ...protectedContent.map((box) => overlapArea(helper, box))) : null,
      railTargetsTopmost: railTargets.every((node) => {
        const box = node.getBoundingClientRect();
        if (box.bottom <= 0 || box.top >= innerHeight) return true;
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return node === hit || node.contains(hit);
      }),
      helperWidth: helper?.width ?? null,
      helperHeight: helper?.height ?? null
    };
  });
  assert.ok(reviewingStage.stageHeight >= 80, `Reviewing should keep the persistent Agent on its fixed viewport track: ${JSON.stringify(reviewingStage)}`);
  assert.equal(reviewingStage.stagePosition, "fixed", `Reviewing Agent should remain independent of document flow: ${JSON.stringify(reviewingStage)}`);
  assert.equal(reviewingStage.figureContained, true, `Reviewing artwork should stay attached to the visible binding gutter: ${JSON.stringify(reviewingStage)}`);
  assert.ok(reviewingStage.protectedOverlap <= 1, `Reviewing target should not intercept records, annotations, or fixed fields: ${JSON.stringify(reviewingStage)}`);
  assert.equal(reviewingStage.railTargetsTopmost, true, `Reviewing should keep rail controls clickable above the character: ${JSON.stringify(reviewingStage)}`);
  assert.ok(reviewingStage.helperWidth >= 43.9 && reviewingStage.helperHeight >= 43.9, `The persistent Agent control should keep a 44px target within subpixel tolerance: ${JSON.stringify(reviewingStage)}`);
  const compactComposition = await page.evaluate(() => {
    const topbar = document.querySelector(".topbar")?.getBoundingClientRect();
    const agentSummary = document.querySelector(".home-agent-summary")?.getBoundingClientRect();
    const timelineHeader = document.querySelector(".timeline-header")?.getBoundingClientRect();
    const activeRow = document.querySelector('.entry[aria-current="step"]')?.getBoundingClientRect();
    const entryContent = document.querySelector('.entry[aria-current="step"] .entry-content')?.getBoundingClientRect();
    const prompt = document.querySelector(".agent-review-prompt")?.getBoundingClientRect();
    const panel = document.querySelector(".agent-review-panel")?.getBoundingClientRect();
    const timelineEntries = [...document.querySelectorAll(".timeline-list > .entry")];
    const lastEntry = timelineEntries.at(-1)?.getBoundingClientRect();
    const fixedRecords = document.querySelector(".home-diary-workspace > .fixed-records")?.getBoundingClientRect();
    const fixedHeader = document.querySelector(".home-diary-workspace > .fixed-records .fixed-records-header-tools-only")?.getBoundingClientRect();
    const firstFixedEntry = document.querySelector(".home-diary-workspace > .fixed-records .fixed-entry")?.getBoundingClientRect();
    const ordinaryRows = [...document.querySelectorAll('.timeline-list > .entry:not([aria-current="step"])')].map((entry) => entry.getBoundingClientRect());
    const rail = document.querySelector(".home-edge-rail-brush")?.getBoundingClientRect();
    const helperSlot = document.querySelector(".organize-helper-slot")?.getBoundingClientRect();
    const utilityIcons = [...document.querySelectorAll(".home-edge-rail-icon")];
    const exportIcon = document.querySelector(".export-rail-icon");
    const exportLabel = document.querySelector(".export-fab-label");
    return {
      headerGap: topbar && timelineHeader ? timelineHeader.top - topbar.bottom : null,
      summaryToTimelineGap: agentSummary && timelineHeader ? timelineHeader.top - agentSummary.bottom : null,
      activeRowHeight: activeRow?.height ?? null,
      sourceGutter: activeRow && entryContent ? entryContent.left - activeRow.left : null,
      ordinaryRowHeights: ordinaryRows.map((row) => row.height),
      fixedRecordsGap: lastEntry && fixedRecords ? fixedRecords.top - lastEntry.bottom : null,
      fixedHeaderHeight: fixedHeader?.height ?? null,
      fixedHeaderToFirstRow: fixedHeader && firstFixedEntry ? firstFixedEntry.top - fixedHeader.top : null,
      firstFixedRowHeight: firstFixedEntry?.height ?? null,
      promptOffset: entryContent && prompt ? prompt.left - entryContent.left : null,
      panelRailClearance: panel && rail ? rail.left - panel.right : null,
      helperSlotHeight: helperSlot?.height ?? null,
      utilityLabelCount: document.querySelectorAll(".home-edge-rail-label").length,
      utilityIconCount: utilityIcons.filter((icon) => getComputedStyle(icon).display !== "none").length,
      exportLabelCount: document.querySelectorAll(".export-fab-label").length,
      exportLabelText: exportLabel?.textContent.trim() || "",
      exportIconVisible: exportIcon ? getComputedStyle(exportIcon).display !== "none" : false,
      exportLabelVisible: exportLabel ? getComputedStyle(exportLabel).display !== "none" : false
    };
  });
  assert.ok(compactComposition.headerGap !== null && compactComposition.headerGap >= 0 && compactComposition.headerGap <= 16.5, `390px active review should keep the closed date context attached to the review surface: ${JSON.stringify(compactComposition)}`);
  assert.ok(compactComposition.summaryToTimelineGap !== null && compactComposition.summaryToTimelineGap <= 18.5, `390px Agent summary should stay visually attached to the record section instead of leaving a blank header band: ${JSON.stringify(compactComposition)}`);
  assert.ok(compactComposition.activeRowHeight !== null && compactComposition.activeRowHeight <= 52.5, `390px one-line active source row should not retain the generic 72px record height: ${JSON.stringify(compactComposition)}`);
  assert.ok(compactComposition.sourceGutter !== null && compactComposition.sourceGutter <= 52.5, `390px time and source columns should not reserve an oversized empty left gutter: ${JSON.stringify(compactComposition)}`);
  assert.ok(compactComposition.ordinaryRowHeights.length > 0 && compactComposition.ordinaryRowHeights.every((height) => height <= 56.5), `390px one-line ordinary records should use a compact readable row instead of the generic 72px height: ${JSON.stringify(compactComposition)}`);
  assert.ok(
    compactComposition.fixedRecordsGap !== null
      && compactComposition.helperSlotHeight !== null
      && compactComposition.fixedRecordsGap >= 11.5
      && compactComposition.fixedRecordsGap <= 48,
    `390px fixed records should keep one compact section rhythm while the Agent lives in the viewport layer: ${JSON.stringify(compactComposition)}`
  );
  assert.ok(compactComposition.fixedHeaderHeight !== null && compactComposition.fixedHeaderHeight <= 28.5, `390px fixed-record tools should not reserve a standalone 44px visual row: ${JSON.stringify(compactComposition)}`);
  assert.ok(compactComposition.fixedHeaderToFirstRow !== null && compactComposition.fixedHeaderToFirstRow <= 28.5, `390px fixed-record tools should stay attached to the first field group: ${JSON.stringify(compactComposition)}`);
  assert.ok(compactComposition.firstFixedRowHeight !== null && compactComposition.firstFixedRowHeight <= 56.5, `390px fixed-record fields should use the same compact row rhythm as ordinary records: ${JSON.stringify(compactComposition)}`);
  assert.ok(compactComposition.promptOffset !== null && Math.abs(compactComposition.promptOffset) <= 1, `Agent annotation copy should align to the source record text, not merely its body container: ${JSON.stringify(compactComposition)}`);
  assert.ok(compactComposition.panelRailClearance !== null && compactComposition.panelRailClearance >= 7.5, `Agent annotation should stay clear of the right rail: ${JSON.stringify(compactComposition)}`);
  assert.ok(compactComposition.helperSlotHeight !== null && compactComposition.helperSlotHeight >= 80, `An active row review should keep the Agent on its viewport-safe track: ${JSON.stringify(compactComposition)}`);
  assert.equal(compactComposition.utilityLabelCount, 0, `390px utilities should not expose visible text labels: ${JSON.stringify(compactComposition)}`);
  assert.equal(compactComposition.utilityIconCount, 2, `390px Search and Settings should remain the two icon-only controls: ${JSON.stringify(compactComposition)}`);
  assert.equal(compactComposition.exportLabelCount, 1, `Mobile export should expose one visible scope label: ${JSON.stringify(compactComposition)}`);
  assert.equal(compactComposition.exportLabelText, "Export today", `English mobile export should name today's diary: ${JSON.stringify(compactComposition)}`);
  assert.equal(compactComposition.exportLabelVisible, true, `Mobile export label should remain visible: ${JSON.stringify(compactComposition)}`);
  assert.equal(compactComposition.exportIconVisible, true, `Mobile export should expose a recognizable download icon: ${JSON.stringify(compactComposition)}`);
  const initialPanelMetrics = await panel.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const prompt = element.querySelector(".agent-review-prompt").getBoundingClientRect();
    return { height: box.height, width: box.width, promptWidth: prompt.width };
  });
  assert.ok(initialPanelMetrics.height <= 330, `390px Agent review should read as a compact vertical annotation: ${JSON.stringify(initialPanelMetrics)}`);
  assert.ok(initialPanelMetrics.promptWidth >= 230, `390px Agent prompt should have enough scan width to avoid fragmented wrapping: ${JSON.stringify(initialPanelMetrics)}`);
  const reviewTypeHierarchy = await panel.evaluate((element) => {
    const sourceStyle = getComputedStyle(document.querySelector('.entry[aria-current="step"] .entry-content'));
    const promptStyle = getComputedStyle(element.querySelector(".agent-review-prompt"));
    const reply = element.querySelector(".agent-review-reply textarea");
    const replyStyle = getComputedStyle(reply);
    const placeholderStyle = getComputedStyle(reply, "::placeholder");
    const actionStyle = getComputedStyle(element.querySelector(".agent-review-actions button"));
    const roleStyle = getComputedStyle(element.querySelector(".agent-review-role"));
    return {
      sourceSize: Number.parseFloat(sourceStyle.fontSize),
      promptSize: Number.parseFloat(promptStyle.fontSize),
      replySize: Number.parseFloat(replyStyle.fontSize),
      placeholderSize: Number.parseFloat(placeholderStyle.fontSize),
      actionSize: Number.parseFloat(actionStyle.fontSize),
      sourceColor: sourceStyle.color,
      promptColor: promptStyle.color,
      sourceFamily: sourceStyle.fontFamily,
      promptFamily: promptStyle.fontFamily,
      placeholderColor: placeholderStyle.color,
      roleSize: Number.parseFloat(roleStyle.fontSize),
      roleFamily: roleStyle.fontFamily
    };
  });
  assert.ok(reviewTypeHierarchy.sourceSize - reviewTypeHierarchy.promptSize >= 1.5, `The source record should remain visibly stronger than the Agent question: ${JSON.stringify(reviewTypeHierarchy)}`);
  assert.ok(reviewTypeHierarchy.promptSize > reviewTypeHierarchy.placeholderSize, `The Agent question should be typographically stronger than the reply hint: ${JSON.stringify(reviewTypeHierarchy)}`);
  assert.ok(reviewTypeHierarchy.promptSize > reviewTypeHierarchy.actionSize && reviewTypeHierarchy.actionSize >= reviewTypeHierarchy.placeholderSize, `Action labels and reply hints should both recede below the Agent question, with the placeholder allowed to be quietest: ${JSON.stringify(reviewTypeHierarchy)}`);
  assert.ok(reviewTypeHierarchy.replySize >= 16, `The actual reply input should remain at least 16px to avoid mobile focus zoom: ${JSON.stringify(reviewTypeHierarchy)}`);
  assert.notEqual(reviewTypeHierarchy.placeholderColor, reviewTypeHierarchy.promptColor, `The reply hint should use a quieter ink than the Agent question: ${JSON.stringify(reviewTypeHierarchy)}`);
  assert.notEqual(reviewTypeHierarchy.promptColor, reviewTypeHierarchy.sourceColor, `The Agent question should use a distinct supporting ink instead of matching the source record: ${JSON.stringify(reviewTypeHierarchy)}`);
  assert.equal(reviewTypeHierarchy.promptFamily, reviewTypeHierarchy.sourceFamily, `The Agent question should stay in the page's coherent Sans reading system instead of introducing a competing editorial voice: ${JSON.stringify(reviewTypeHierarchy)}`);
  assert.ok(reviewTypeHierarchy.roleSize <= reviewTypeHierarchy.actionSize && reviewTypeHierarchy.roleFamily !== reviewTypeHierarchy.promptFamily, `A compact mono Agent label should identify the secondary role without enlarging the explanatory copy: ${JSON.stringify(reviewTypeHierarchy)}`);
  await page.screenshot({ path: join(outputDir, "ln-074-agent-question-390.png"), fullPage: false });
  assert.equal(await panel.getAttribute("data-agent-kind"), "question");
  assert.equal(page.url(), `${baseURL}/`, "Agent review should stay on the diary route");
  assert.equal(await page.locator('.entry[aria-current="step"][data-entry-id="agent-question"]').count(), 1);
  assert.equal(await page.locator(".diary-agent-traveler").count(), 1, "Active Diary review should keep the viewport-resident companion visible");
  const activeRowFocusLoop = await page.locator('.entry[aria-current="step"]').evaluate((element) => {
    const pseudo = getComputedStyle(element, "::after");
    return { opacity: pseudo.opacity, clipPath: pseudo.clipPath };
  });
  assert.equal(Number(activeRowFocusLoop.opacity), 0, `Agent activity should remain distinct from the full-row keyboard focus loop: ${JSON.stringify(activeRowFocusLoop)}`);
  const activeSourceCue = await page.locator('.entry[aria-current="step"] .entry-content').evaluate((element) => {
    const pseudo = getComputedStyle(element, "::after");
    return { content: pseudo.content, width: pseudo.width, borderBottomStyle: pseudo.borderBottomStyle };
  });
  assert.ok(activeSourceCue.content === "none" || activeSourceCue.content === '""' && Number.parseFloat(activeSourceCue.width) === 0, `The source record should not use a dashed or long blue underline: ${JSON.stringify(activeSourceCue)}`);
  const activeRowRule = await page.locator('.entry[aria-current="step"]').evaluate((element) => getComputedStyle(element).backgroundImage);
  assert.equal(activeRowRule, "none", `The row-local Agent annotation should replace the active row divider instead of drawing a second line: ${activeRowRule}`);
  const fixedRecordsRuleDuringReview = await page.locator(".home-diary-workspace > .fixed-records").evaluate((element) => getComputedStyle(element).backgroundImage);
  assert.equal(fixedRecordsRuleDuringReview, "none", `The fixed-record section should not draw a second nearby hand-drawn divider while the Agent annotation owns the boundary: ${fixedRecordsRuleDuringReview}`);
  const questionActionLayout = await panel.locator('.agent-review-actions[data-agent-action-kind="question"]').evaluate((element) => {
    const groupStyle = getComputedStyle(element);
    const reply = element.closest(".agent-review-panel").querySelector(".agent-review-reply");
    const textarea = reply.querySelector("textarea");
    const actions = [...element.querySelectorAll("button")].map((button) => ({
      box: button.getBoundingClientRect(),
      backgroundColor: getComputedStyle(button).backgroundColor,
      borderRadius: Number.parseFloat(getComputedStyle(button).borderTopLeftRadius)
    }));
    return {
      heights: actions.map(({ box }) => box.height),
      groupBorderWidth: Number.parseFloat(groupStyle.borderTopWidth),
      groupBorderRadius: Number.parseFloat(groupStyle.borderTopLeftRadius),
      buttonBorderRadii: actions.map(({ borderRadius }) => borderRadius),
      groupBox: element.getBoundingClientRect(),
      replyBox: reply.getBoundingClientRect(),
      textareaWidth: textarea.getBoundingClientRect().width,
      actionBoxes: actions.map(({ box }) => ({ left: box.left, right: box.right, width: box.width })),
      conversationRight: element.closest(".agent-review-panel").querySelector(".agent-review-conversation").getBoundingClientRect().right
    };
  });
  assert.ok(questionActionLayout.heights.every((height) => height >= 43.99), `Mobile question actions should retain 44px targets: ${JSON.stringify(questionActionLayout)}`);
  assert.equal(questionActionLayout.groupBorderWidth, 0, `Mobile Agent actions should avoid a competing segmented-control boundary: ${JSON.stringify(questionActionLayout)}`);
  assert.equal(questionActionLayout.groupBorderRadius, 0, `The quiet text-action row should not read as a rounded card: ${JSON.stringify(questionActionLayout)}`);
  assert.ok(questionActionLayout.buttonBorderRadii.every((radius) => radius === 0), `Individual actions should not read as separate rounded blocks: ${JSON.stringify(questionActionLayout)}`);
  assert.ok(questionActionLayout.actionBoxes.every(({ width }) => width < questionActionLayout.groupBox.width), `Each text action should stay compact instead of filling the annotation width: ${JSON.stringify(questionActionLayout)}`);
  assert.ok(questionActionLayout.textareaWidth >= 220, `The reply field should preserve a useful 390px writing width instead of yielding the row to actions: ${JSON.stringify(questionActionLayout)}`);
  assert.ok(questionActionLayout.groupBox.top >= questionActionLayout.replyBox.bottom - 0.5 && questionActionLayout.groupBox.top - questionActionLayout.replyBox.bottom <= 4.5, `A lone unresolved action should sit directly below the full-width reply field: ${JSON.stringify(questionActionLayout)}`);
  assert.ok(Math.abs(questionActionLayout.actionBoxes.at(-1).right - questionActionLayout.conversationRight) <= 1, `The quiet action row should terminate on the annotation's right edge: ${JSON.stringify(questionActionLayout)}`);
  assert.equal(await panel.getByRole("button", { name: "Append to original" }).count(), 0, "Unanswered questions should not show unavailable persistence actions");
  assert.equal(await panel.getByRole("button", { name: "Save as new record" }).count(), 0, "Unanswered questions should stay conversational instead of showing disabled form choices");
  assert.equal(await panel.getByRole("button", { name: "Keep original" }).count(), 1, "An unanswered question should retain one quiet skip action");
  assert.equal(await panel.getByRole("button", { name: "Send", exact: true }).count(), 0, "An empty reply should not show a detached disabled Send action");
  const stopProgressSpacing = await panel.evaluate((element) => {
    const stopElement = element.querySelector(".agent-review-stop");
    const stop = stopElement?.getBoundingClientRect();
    const progress = element.querySelector(".agent-review-progress")?.getBoundingClientRect();
    const icon = stopElement?.querySelector(".agent-review-stop-icon")?.getBoundingClientRect();
    const stopStyle = stopElement ? getComputedStyle(stopElement) : null;
    const promptStyle = getComputedStyle(element.querySelector(".agent-review-prompt"));
    return stop && progress && icon && stopStyle ? {
      progressRight: progress.right,
      stopLeft: stop.left,
      gap: stop.left - progress.right,
      targetWidth: stop.width,
      targetHeight: stop.height,
      iconWidth: icon.width,
      iconHeight: icon.height,
      opacity: Number.parseFloat(stopStyle.opacity),
      color: stopStyle.color,
      promptRightPadding: Number.parseFloat(promptStyle.paddingRight)
    } : null;
  });
  assert.ok(stopProgressSpacing && stopProgressSpacing.gap >= 0, `Progress should precede the right-aligned close icon without overlap: ${JSON.stringify(stopProgressSpacing)}`);
  assert.ok(stopProgressSpacing.targetWidth >= 43.99 && stopProgressSpacing.targetHeight >= 43.99, `The close control should retain a 44px target: ${JSON.stringify(stopProgressSpacing)}`);
  assert.ok(stopProgressSpacing.iconWidth >= 27.5 && stopProgressSpacing.iconHeight >= 27.5 && stopProgressSpacing.opacity >= 0.85, `The close affordance should be visibly discoverable inside its target: ${JSON.stringify(stopProgressSpacing)}`);
  assert.ok(stopProgressSpacing.promptRightPadding >= 39.5, `Prompt copy should reserve space for the visible close affordance instead of running underneath it: ${JSON.stringify(stopProgressSpacing)}`);
  const initialReplyChrome = await panel.locator(".agent-review-reply textarea").evaluate((element) => {
    const style = getComputedStyle(element);
    const panelStyle = getComputedStyle(element.closest(".agent-review-panel"));
    return { borderBottomWidth: style.borderBottomWidth, panelBackgroundImage: panelStyle.backgroundImage };
  });
  assert.equal(initialReplyChrome.borderBottomWidth, "0px", `The natural margin reply should not use a long input underline: ${JSON.stringify(initialReplyChrome)}`);
  assert.equal(initialReplyChrome.panelBackgroundImage, "none", `The annotation should end in whitespace rather than another long divider: ${JSON.stringify(initialReplyChrome)}`);
  const annotationAccent = await panel.locator(".agent-review-conversation").evaluate((element) => {
    const pseudo = getComputedStyle(element, "::before");
    return {
      width: Number.parseFloat(pseudo.width),
      height: Number.parseFloat(pseudo.height),
      borderBottomWidth: Number.parseFloat(pseudo.borderBottomWidth)
    };
  });
  assert.ok(annotationAccent.width <= 3 && annotationAccent.height >= 20 && annotationAccent.height <= 28 && annotationAccent.borderBottomWidth === 0, `The annotation should use one short source marker instead of a decorative bracket: ${JSON.stringify(annotationAccent)}`);
  const railDuring = await page.locator(".home-edge-rail-brush").boundingBox();
  assert.ok(Math.abs(railBefore.x - railDuring.x) <= 1 && Math.abs(railBefore.width - railDuring.width) <= 1, `Agent review should not move the right rail: ${JSON.stringify({ railBefore, railDuring })}`);

  const beforeClassification = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.find((entry) => entry.id === "agent-question"));
  await panel.locator("textarea").fill("主要是市场交易复盘");
  await panel.getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".agent-review-panel")?.dataset.agentReplyOutcome === "category");
  assert.equal(await panel.getAttribute("data-agent-kind"), "category", "A classification answer should converge into the existing category confirmation state");
  assert.equal(await panel.locator("textarea").count(), 0, "A terminal category outcome should close the reply field");
  await assertVisible(panel.getByText("交易 / 市场", { exact: true }));
  await page.screenshot({ path: join(outputDir, "ln-074-agent-classification-resolved-390.png"), fullPage: false });
  let stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.deepEqual(
    stored.entries.find((entry) => entry.id === "agent-question"),
    beforeClassification,
    "Answering a classification question must not write before Apply category"
  );
  await panel.getByRole("button", { name: "Apply category" }).click();
  await assertVisible(page.locator('.entry[aria-current="step"][data-entry-id="agent-category"]'));
  stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(stored.entries.find((entry) => entry.id === "agent-question").categoryId, "trading");
  await panel.getByRole("button", { name: "Undo category" }).click();
  stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(stored.entries.find((entry) => entry.id === "agent-question").categoryId, "daily");

  assert.equal(await panel.getAttribute("data-agent-kind"), "category");
  assert.equal(await panel.locator(".agent-review-prompt").textContent(), "File this note in the suggested category?");
  await assertVisible(panel.getByText("交易 / 市场", { exact: true }));
  assert.equal(await panel.getByText("交易 / 市场", { exact: true }).count(), 1, "The category path should appear once as the scannable result, not repeat in the question");
  const categoryActionLayout = await panel.locator('.agent-review-actions[data-agent-action-kind="category"]').evaluate((element) => {
    const actions = [...element.querySelectorAll("button")].slice(0, 2).map((button) => button.getBoundingClientRect());
    const panel = element.closest(".agent-review-panel");
    const conversation = panel.querySelector(".agent-review-conversation");
    const prompt = panel.querySelector(".agent-review-prompt").getBoundingClientRect();
    const category = panel.querySelector(".agent-review-category").getBoundingClientRect();
    const actionBox = element.getBoundingClientRect();
    const nextEntryBox = panel.nextElementSibling?.matches?.(".entry") ? panel.nextElementSibling.getBoundingClientRect() : null;
    const stopBox = panel.querySelector(".agent-review-stop").getBoundingClientRect();
    const conversationBox = conversation.getBoundingClientRect();
    const accentStyle = getComputedStyle(conversation, "::before");
    const actionButtons = [...element.querySelectorAll("button")].map((button) => button.getBoundingClientRect());
    return {
      first: actions[0] && { top: actions[0].top, bottom: actions[0].bottom, height: actions[0].height },
      second: actions[1] && { top: actions[1].top, bottom: actions[1].bottom, height: actions[1].height },
      groupBorderWidth: getComputedStyle(element).borderTopWidth,
      promptSize: Number.parseFloat(getComputedStyle(panel.querySelector(".agent-review-prompt")).fontSize),
      categorySize: Number.parseFloat(getComputedStyle(panel.querySelector(".agent-review-category")).fontSize),
      promptLeft: prompt.left,
      categoryLeft: category.left,
      categoryGap: category.top - prompt.bottom,
      categoryToActionsGap: actionBox.top - category.bottom,
      replyCount: panel.querySelectorAll(".agent-review-reply").length,
      actionsToNextEntryGap: nextEntryBox ? nextEntryBox.top - actionBox.bottom : null,
      actionsLeft: actionBox.left,
      actionsRight: actionBox.right,
      conversationRight: conversationBox.right,
      firstActionLeft: actionButtons[0]?.left ?? null,
      lastActionRight: actionButtons.at(-1)?.right ?? null,
      stopCenter: stopBox.left + stopBox.width / 2,
      progressRight: panel.querySelector(".agent-review-progress").getBoundingClientRect().right,
      markerWidth: Number.parseFloat(accentStyle.width)
    };
  });
  assert.ok(categoryActionLayout.promptSize > categoryActionLayout.categorySize, `The Agent question should remain stronger than its category result: ${JSON.stringify(categoryActionLayout)}`);
  assert.ok(Math.abs(categoryActionLayout.categoryLeft - categoryActionLayout.promptLeft) <= 1, `Question and category result should share one reading axis: ${JSON.stringify(categoryActionLayout)}`);
  assert.ok(categoryActionLayout.categoryGap >= 5.5 && categoryActionLayout.categoryGap <= 6.5, `Question and category result should use one clear 6px paired gap: ${JSON.stringify(categoryActionLayout)}`);
  assert.equal(categoryActionLayout.replyCount, 0, `A terminal category result should close the reply field: ${JSON.stringify(categoryActionLayout)}`);
  assert.ok(categoryActionLayout.categoryToActionsGap >= -0.5 && categoryActionLayout.categoryToActionsGap <= 8.5, `Category actions should stay attached directly to the terminal result: ${JSON.stringify(categoryActionLayout)}`);
  assert.ok(categoryActionLayout.actionsToNextEntryGap !== null && categoryActionLayout.actionsToNextEntryGap >= 7.5 && categoryActionLayout.actionsToNextEntryGap <= 14.5, `The annotation should end with one small-group gap before the next record: ${JSON.stringify(categoryActionLayout)}`);
  assert.ok(categoryActionLayout.firstActionLeft > categoryActionLayout.promptLeft, `Resolution actions should recede to the right instead of forming a second full-width content block: ${JSON.stringify(categoryActionLayout)}`);
  assert.ok(Math.abs(categoryActionLayout.lastActionRight - categoryActionLayout.conversationRight) <= 1, `The action row should terminate on the annotation right edge: ${JSON.stringify(categoryActionLayout)}`);
  assert.ok(categoryActionLayout.stopCenter > categoryActionLayout.progressRight && categoryActionLayout.markerWidth <= 3, `The close icon should live on the right while the left edge remains a minimal source marker: ${JSON.stringify(categoryActionLayout)}`);
  assert.ok(categoryActionLayout.first?.height >= 43.99 && categoryActionLayout.second?.height >= 43.99, `Mobile category actions should retain 44px targets: ${JSON.stringify(categoryActionLayout)}`);
  assert.ok(Math.abs(categoryActionLayout.second.top - categoryActionLayout.first.top) <= 0.5, `Mobile category actions should share one compact horizontal group: ${JSON.stringify(categoryActionLayout)}`);
  assert.equal(categoryActionLayout.groupBorderWidth, "0px", `Mobile category actions should not introduce a full-width outer boundary: ${JSON.stringify(categoryActionLayout)}`);
  await page.screenshot({ path: join(outputDir, "ln-074-agent-category-390.png"), fullPage: false });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.waitForTimeout(250);
  await assertNoHorizontalOverflow(page, "320px Agent category review");
  const narrowCategoryLayout = await panel.evaluate((element) => {
    const category = element.querySelector(".agent-review-category").getBoundingClientRect();
    const actions = element.querySelector(".agent-review-actions").getBoundingClientRect();
    const buttons = [...element.querySelectorAll(".agent-review-actions button")].map((button) => button.getBoundingClientRect());
    return {
      replyCount: element.querySelectorAll(".agent-review-reply").length,
      gap: actions.top - category.bottom,
      actionRows: new Set(buttons.map((box) => Math.round(box.top))).size,
      actionRight: actions.right,
      panelRight: element.getBoundingClientRect().right
    };
  });
  assert.equal(narrowCategoryLayout.replyCount, 0, `320px terminal category review should not retain an inert reply field: ${JSON.stringify(narrowCategoryLayout)}`);
  assert.ok(narrowCategoryLayout.gap >= -0.5 && narrowCategoryLayout.gap <= 8.5, `320px category actions should stay attached below the result: ${JSON.stringify(narrowCategoryLayout)}`);
  assert.equal(narrowCategoryLayout.actionRows, 1, `320px category actions should remain one horizontal pair: ${JSON.stringify(narrowCategoryLayout)}`);
  assert.ok(Math.abs(narrowCategoryLayout.actionRight - narrowCategoryLayout.panelRight) <= 1, `320px category actions should remain right-aligned inside the annotation: ${JSON.stringify(narrowCategoryLayout)}`);
  await page.screenshot({ path: join(outputDir, "ln-074-agent-category-320.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await panel.getByRole("button", { name: "Apply category" }).click();
  stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(stored.entries.find((entry) => entry.id === "agent-category").categoryId, "trading");
  assert.equal(stored.entries.find((entry) => entry.id === "agent-category").content, "市场复盘完成");
  await panel.getByRole("button", { name: "Undo category" }).click();
  stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(stored.entries.find((entry) => entry.id === "agent-category").categoryId, "daily");

  const detail = "做的是番茄鸡蛋面，十分钟完成。";
  await panel.locator("textarea").fill(detail);
  await panel.getByRole("button", { name: "Send", exact: true }).click();
  await assertVisible(panel.getByRole("button", { name: "Append to original" }));
  assert.equal(await panel.locator("textarea").count(), 0, "A terminal append proposal should close the reply field");
  const resolvedQuestionActions = await panel.locator('.agent-review-actions[data-agent-action-kind="question"]').evaluate((element) => {
    const actions = [...element.querySelectorAll("button")].map((button) => ({
      box: button.getBoundingClientRect(),
      borderTopWidth: getComputedStyle(button).borderTopWidth,
      borderRadius: getComputedStyle(button).borderTopLeftRadius
    }));
    return {
      count: actions.length,
      heights: actions.map(({ box }) => box.height),
      rowCount: new Set(actions.map(({ box }) => Math.round(box.top))).size,
      borderRadii: actions.map(({ borderRadius }) => borderRadius),
      groupBorderWidth: getComputedStyle(element).borderTopWidth
    };
  });
  assert.equal(resolvedQuestionActions.count, 3, `A proposed detail should reveal the three explicit resolution actions: ${JSON.stringify(resolvedQuestionActions)}`);
  assert.equal(resolvedQuestionActions.rowCount, 1, `Resolved 390px question actions should use one compact row: ${JSON.stringify(resolvedQuestionActions)}`);
  assert.ok(resolvedQuestionActions.heights.every((height) => height >= 43.99), `Resolved question actions should retain 44px targets: ${JSON.stringify(resolvedQuestionActions)}`);
  assert.equal(resolvedQuestionActions.groupBorderWidth, "0px", `Resolved actions should remain a quiet text-action row without a visible group boundary: ${JSON.stringify(resolvedQuestionActions)}`);
  assert.ok(resolvedQuestionActions.borderRadii.every((radius) => radius === "0px"), `Resolved actions should not become separate rounded button blocks: ${JSON.stringify(resolvedQuestionActions)}`);
  await page.screenshot({ path: join(outputDir, "ln-074-agent-question-resolved-390.png"), fullPage: false });
  assert.equal((await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.find((entry) => entry.id === "agent-question-two").content)), "早起弄好了", "Conversation alone must not write the note");
  await panel.getByRole("button", { name: "Append to original" }).click();
  await assertVisible(page.locator(".agent-review-complete"));
  await assertVisible(page.locator('.organize-helper-appearance[data-agent-appearance-state="complete"]'));
  assert.equal(await page.locator(".organize-helper-figure").getAttribute("src"), "/ui/diary/agent-spine-spirit-complete-motion.png", "Complete should settle into its source-faithful local motion pose");
  assert.ok((await page.locator('[data-agent-surface="diary"]').boundingBox())?.height >= 80, "Complete should keep the persistent Agent on its fixed viewport track");
  await page.screenshot({ path: join(outputDir, "ln-074-agent-complete-390.png"), fullPage: false });
  stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(stored.entries.find((entry) => entry.id === "agent-question-two").content, `早起弄好了\n\n${detail}`);

  await page.locator(".agent-review-complete").getByRole("button", { name: "Review again" }).click();
  await assertVisible(panel);
  await panel.getByRole("button", { name: "Keep original" }).click();
  await assertVisible(page.locator('.entry[aria-current="step"][data-entry-id="agent-category"]'));
  await panel.getByRole("button", { name: "Keep original" }).click();
  await assertVisible(page.locator('.entry[aria-current="step"][data-entry-id="agent-question-two"]'));
  await panel.locator("textarea").fill("开盘后高低位方向快速拉开。");
  await panel.getByRole("button", { name: "Send", exact: true }).click();
  await assertVisible(panel.getByRole("button", { name: "Save as new record" }));
  const countBeforeNew = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.length);
  await panel.getByRole("button", { name: "Save as new record" }).click();
  const countAfterNew = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.length);
  assert.equal(countAfterNew, countBeforeNew + 1, "New record should add one normal entry");
  await assertVisible(page.locator(".agent-review-complete"));
  await page.locator(".agent-review-complete").getByRole("button", { name: "Review again" }).click();
  await assertVisible(page.locator('.entry[aria-current="step"], .group-entry[aria-current="step"]'));

  for (const width of [320, 390, 426, 600, 671, 700, 768, 1280]) {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
    await page.waitForTimeout(500);
    await assertNoHorizontalOverflow(page, `${width}px Agent diary review`);
    const activeRow = page.locator('.entry[aria-current="step"], .group-entry[aria-current="step"]');
    await assertVisible(activeRow, `${width}px Agent review should keep its source row visible`);
    assert.equal(await page.locator(".diary-agent-traveler").count(), 1, `${width}px active Diary review should retain the viewport companion`);
    if (width <= 426) {
      await assertVisible(page.locator('.organize-helper-appearance[data-agent-appearance-state="reviewing"]'), `${width}px should keep the reviewing line spirit visible`);
      const responsiveStage = await page.evaluate(() => {
        const stageElement = document.querySelector(".organize-helper-slot");
        const stage = stageElement?.getBoundingClientRect();
        const figure = document.querySelector(".organize-helper-figure")?.getBoundingClientRect();
        const controls = [...document.querySelectorAll(".home-edge-rail-tools > button, .domain-directory-node, .action-dock button")];
        return {
          stageHeight: stage?.height ?? null,
          stagePosition: stageElement ? getComputedStyle(stageElement).position : null,
          contained: Boolean(stage && figure && figure.left >= -1 && figure.right <= innerWidth + 1 && figure.top >= -1 && figure.bottom <= innerHeight + 1),
          controlsTopmost: controls.every((node) => {
            const box = node.getBoundingClientRect();
            if (box.bottom <= 0 || box.top >= innerHeight) return true;
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return node === hit || node.contains(hit);
          })
        };
      });
      assert.ok(responsiveStage.stageHeight >= 80, `${width}px should keep the persistent Agent on its viewport-safe track: ${JSON.stringify(responsiveStage)}`);
      assert.equal(responsiveStage.stagePosition, "fixed", `${width}px Agent track should remain viewport-fixed: ${JSON.stringify(responsiveStage)}`);
      assert.equal(responsiveStage.contained, true, `${width}px reviewing Agent should stay attached to its binding gutter: ${JSON.stringify(responsiveStage)}`);
      assert.equal(responsiveStage.controlsTopmost, true, `${width}px reviewing Agent should keep right-rail and action controls clickable: ${JSON.stringify(responsiveStage)}`);
    }
    if (width <= 390) {
      const collision = await page.evaluate(() => {
        const panel = document.querySelector(".agent-review-panel");
        const dock = document.querySelector(".action-dock");
        const actions = [...document.querySelectorAll(".agent-review-panel .agent-review-actions button")];
        if (!panel || !dock || !actions.length) return { missing: true };
        const dockBox = dock.getBoundingClientRect();
        const panelBox = panel.getBoundingClientRect();
        return {
          missing: false,
          panelBottom: panelBox.bottom,
          dockTop: dockBox.top,
          hiddenActions: actions.filter((action) => {
            const box = action.getBoundingClientRect();
            return box.top < 0 || box.bottom > window.innerHeight || box.bottom > dockBox.top - 8;
          }).map((action) => action.textContent.trim())
        };
      });
      assert.equal(collision.missing, false, `${width}px Agent review should expose its panel and dock`);
      assert.deepEqual(collision.hiddenActions, [], `${width}px Agent actions should remain visible above the fixed action dock: ${JSON.stringify(collision)}`);
    }
    if (width === 390 || width === 1280) {
      await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      await page.screenshot({ path: join(outputDir, `ln-074-agent-review-${width}.png`), fullPage: false });
    }
  }

  await page.getByRole("button", { name: "Open calendar" }).click();
  await assertHidden(panel, "Opening Calendar should cancel the active Agent session");
  await page.getByRole("button", { name: "Close calendar" }).click();

  await agent.click();
  await assertVisible(panel);
  await page.locator(".home-search-button").click();
  await assertHidden(panel, "Opening Search should cancel the active Agent session");
  await page.keyboard.press("Escape");

  await agent.click();
  await assertVisible(panel);
  await page.locator(".home-settings-button").click();
  await assertHidden(panel, "Opening Settings should cancel the active Agent session");
  await page.keyboard.press("Escape");

  await agent.click();
  await assertVisible(panel);
  await setWorkspaceMode(page, "plan");
  await assertHidden(panel, "Entering Plan should cancel the active Agent session");
  await setWorkspaceMode(page, "diary");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await agent.click();
  await assertVisible(panel);
  assert.equal(await panel.locator(".agent-review-conversation").evaluate((node) => Number.parseFloat(getComputedStyle(node).transitionDuration) <= 0.001), true, "Reduced motion should make the local annotation transition immediate");
  const reducedAgent = await page.locator('[data-agent-surface="diary"]').evaluate((node) => ({
    animationName: getComputedStyle(node.querySelector(".diary-agent-traveler")).animationName,
    animationDuration: Number.parseFloat(getComputedStyle(node.querySelector(".diary-agent-traveler")).animationDuration),
    visibility: getComputedStyle(node).visibility,
    state: node.dataset.agentStatus,
    motionMode: node.dataset.agentMotionMode,
    asset: node.querySelector(".organize-helper-figure")?.getAttribute("src") || null
  }));
  assert.equal(reducedAgent.visibility, "visible", `Reduced motion should keep the reviewing Agent visible: ${JSON.stringify(reducedAgent)}`);
  assert.equal(reducedAgent.state, "reviewing", `Reduced motion should preserve the visible Agent session state: ${JSON.stringify(reducedAgent)}`);
  assert.equal(reducedAgent.motionMode, "still", `Reduced motion should select the static appearance path: ${JSON.stringify(reducedAgent)}`);
  assert.equal(reducedAgent.asset, "/ui/diary/agent-spine-spirit-reviewing-still.png", `Reduced motion should avoid the animated sprite: ${JSON.stringify(reducedAgent)}`);
  assert.equal(reducedAgent.animationName, "none", `Reduced motion should freeze Agent stage travel: ${JSON.stringify(reducedAgent)}`);
  assert.ok(reducedAgent.animationDuration <= .001, `Reduced motion should remove Agent animation timing: ${JSON.stringify(reducedAgent)}`);
  await panel.getByRole("button", { name: "Stop review" }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const beforeUnresolved = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.find((entry) => entry.id === "agent-question"));
  await agent.click();
  await assertVisible(panel);
  for (let attempt = 0; attempt < 4 && await page.locator('.entry[aria-current="step"][data-entry-id="agent-question"]').count() === 0; attempt += 1) {
    await panel.getByRole("button", { name: "Keep original" }).click();
  }
  await assertVisible(page.locator('.entry[aria-current="step"][data-entry-id="agent-question"]'));
  await panel.locator("textarea").fill("I am not sure yet");
  await panel.getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".agent-review-panel")?.dataset.agentReplyOutcome === "ask");
  assert.equal(await panel.locator("textarea").count(), 1, "The first unresolved answer may keep one final targeted question open");
  await panel.locator("textarea").fill("Still not sure");
  await panel.getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".agent-review-panel")?.dataset.agentReplyOutcome === "none");
  assert.equal(await panel.locator("textarea").count(), 0, "The second unresolved answer must terminate the reply field");
  assert.equal(await panel.getByRole("button", { name: "Keep original" }).count(), 1, "A no-change outcome should leave one safe resolution");
  assert.equal(await panel.getByRole("button", { name: "Append to original" }).count(), 0);
  assert.equal(await panel.getByRole("button", { name: "Apply category" }).count(), 0);
  await page.screenshot({ path: join(outputDir, "ln-074-agent-no-change-390.png"), fullPage: false });
  const afterUnresolved = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")).entries.find((entry) => entry.id === "agent-question"));
  assert.deepEqual(afterUnresolved, beforeUnresolved, "Two unresolved answers must leave the record byte-for-byte unchanged");
  await panel.getByRole("button", { name: "Stop review" }).click();

  await page.evaluate(() => window.localStorage.setItem("log-note:locale", "zh-CN"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".organize-helper").click();
  await assertVisible(page.locator(".agent-review-panel"));
  await page.waitForTimeout(500);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: join(outputDir, "ln-074-agent-review-zh-390.png"), fullPage: false });
});

test("smart organize: review one day by time, then file categories, undo, and preserve raw text", async (page) => {
  const previousDate = shiftDate(testDate, -1);
  const seeded = await page.evaluate(({ date, previousDate }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    const template = state.templates.find((item) => item.recordType !== "periodic");
    const categoryId = "daily";
    const base = { date, time: "10:00", categoryId, templateId: template.id, fieldValues: {}, attachments: [], createdAt: Date.now() };
    const entries = [
      { ...base, id: "organize-study-a", time: "08:10", content: "完成课程学习并整理读书笔记", tags: ["保留标签"] },
      { ...base, id: "organize-study-b", time: "13:20", content: "复习文章知识并输出学习总结", tags: [] },
      { ...base, id: "organize-market", time: "20:10", content: "市场分化，准备调整投资仓位", tags: ["手工"] },
      { ...base, id: "organize-low", time: "", content: "傍晚沿河散步", tags: [] },
      { ...base, id: "organize-previous", date: previousDate, time: "18:00", content: "前一天的独立记录", tags: [] },
      { ...base, id: "organize-history-study", date: "2026-01-01", content: "课程文章与学习复盘", categoryId: "study", tags: [] },
      { ...base, id: "organize-history-market", date: "2026-01-01", content: "市场交易与投资复盘", categoryId: "trading", tags: [] }
    ];
    state.entries = [...state.entries, ...entries];
    window.localStorage.setItem(key, JSON.stringify(state));
    return {
      originals: Object.fromEntries(entries.slice(0, 4).map((entry) => [entry.id, {
        content: entry.content,
        categoryId: entry.categoryId,
        tags: entry.tags,
        templateId: entry.templateId,
        attachments: entry.attachments
      }]))
    };
  }, { date: testDate, previousDate });
  await page.reload({ waitUntil: "domcontentloaded" });

  const organizeEntry = page.locator(".organize-helper");
  await assertVisible(organizeEntry);
  await assertMinTouchTarget(organizeEntry, "Agent helper illustration");
  assert.equal(await organizeEntry.getAttribute("type"), "button", "The Agent should wake the current page without a separate organizer route");
  assert.equal(await organizeEntry.getAttribute("data-date"), testDate, "The Agent should carry the selected day in its session state");
  assert.equal(await organizeEntry.locator("img").count(), 1, "The helper should use one self-contained generated appearance asset");
  assert.equal(await organizeEntry.locator("img").getAttribute("src"), "/ui/diary/agent-spine-spirit-idle-motion.png", "The helper should resolve the source-faithful animated idle appearance");
  assert.equal(await page.locator(".grouped-view-toolbar").count(), 0, "Category content should no longer own a separate organize toolbar");
  await setRecordView(page, "grouped");
  await assertVisible(organizeEntry, "Agent should remain visible in Category view");
  await setWorkspaceMode(page, "plan");
  await assertHidden(organizeEntry, "Plan mode should not show the diary organizer");
  await setWorkspaceMode(page, "diary");
  await setRecordView(page, "timeline");
  await assertVisible(organizeEntry, "Agent should remain visible in Time view");

  const emptyDate = shiftDate(testDate, -2);
  await page.getByRole("button", { name: "Open calendar" }).click();
  await page.locator(`[data-calendar-date="${emptyDate}"]`).click();
  await page.getByRole("button", { name: "Close calendar" }).click();
  await assertVisible(organizeEntry, "A day without ordinary records should keep the companion visible");
  assert.equal(await page.locator('[data-agent-surface="diary"]').getAttribute("data-agent-empty-date"), "true", "An empty Diary date should expose the no-record state");
  const emptyPayloadBefore = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await organizeEntry.click();
  await assertVisible(page.getByRole("status").filter({ hasText: "There is no diary entry on this day, so I do not know what to look at." }));
  assert.equal(await page.locator(".agent-review-panel").count(), 0, "Empty-date feedback should not start review");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), emptyPayloadBefore, "Empty-date feedback must not write records or derived data");
  await organizeEntry.click();
  await assertHidden(page.locator(".diary-agent-empty-note"), "A second click should dismiss the temporary margin note");
  await page.getByRole("button", { name: "Open calendar" }).click();
  await page.locator(`[data-calendar-date="${testDate}"]`).click();
  await page.getByRole("button", { name: "Close calendar" }).click();
  await assertVisible(organizeEntry);
  await organizeEntry.click();
  await assertVisible(page.locator(".agent-review-panel, .agent-review-complete"));
  assert.equal(page.url(), `${baseURL}/`, "Waking the dated Agent should keep the current diary route");
  assert.equal(await page.locator('.entry[aria-current="step"], .group-entry[aria-current="step"]').count(), 1, "The in-page Agent should identify exactly one source record");
  assert.equal(await page.locator(".diary-agent-traveler").count(), 1, "The dated Diary Agent should keep the viewport companion beside its annotation");
  await page.getByRole("button", { name: "Stop review" }).first().click();
  await assertHidden(page.locator(".agent-review-panel, .agent-review-complete"));
  await page.goto(`${baseURL}/organize?date=${testDate}`);
  await assertVisible(page.getByRole("heading", { name: "Smart organize" }));
  assert.equal(await page.getByRole("link", { name: "Back to records" }).count(), 1);
  const organizeSelectionHierarchy = await page.locator(".organize-selection").evaluate((selection) => {
    const dateContext = selection.querySelector(".organize-date-context");
    const dateTrigger = selection.querySelector(".date-context-disclosure").getBoundingClientRect();
    const listHeading = selection.querySelector(".organize-list-heading").getBoundingClientRect();
    const dateStyle = getComputedStyle(dateContext);
    const listStyle = getComputedStyle(selection.querySelector(".organize-list-heading"));
    return {
      dateToListHeading: listHeading.top - dateTrigger.bottom,
      dateDividerWidth: dateStyle.borderBottomWidth,
      listDividerWidth: listStyle.borderBottomWidth
    };
  });
  ln058Evidence.organize = { hierarchy: organizeSelectionHierarchy };
  assert.equal(await page.getByRole("heading", { name: "Choose a day", exact: true }).count(), 0, "The date disclosure should not repeat an obvious choose-date heading");
  assert.ok(organizeSelectionHierarchy.dateToListHeading >= 23 && organizeSelectionHierarchy.dateToListHeading <= 25, `The major date-to-record boundary should use section whitespace: ${JSON.stringify(organizeSelectionHierarchy)}`);
  assert.equal(organizeSelectionHierarchy.dateDividerWidth, "0px", `The major date boundary should not duplicate the list hairline: ${JSON.stringify(organizeSelectionHierarchy)}`);
  assert.equal(organizeSelectionHierarchy.listDividerWidth, "1px", `The record heading should keep its list-specific hairline: ${JSON.stringify(organizeSelectionHierarchy)}`);
  assert.equal(await page.locator(".organize-analysis-header .eyebrow").count(), 0, "Smart organize should not repeat local-processing labels above clear section headings");
  assert.equal(await page.getByText("Choose one day to organize. Record text remains unchanged.", { exact: true }).count(), 0, "The date heading should not be followed by an obvious explanation");
  assert.equal(await page.getByText("All ordinary records from that day will be checked against your existing categories. Low-confidence records stay unchanged.", { exact: true }).count(), 0, "The ready state should not repeat the organize behavior");
  const taskTabs = page.getByRole("tablist", { name: "Organization task" });
  await assertVisible(taskTabs);
  assert.equal(await taskTabs.getByRole("tab", { name: "Timeline review" }).getAttribute("aria-selected"), "true", "Timeline review should be the default daily task");
  assert.equal(await taskTabs.getByRole("tab", { name: "Category filing" }).getAttribute("aria-selected"), "false");

  const dateTrigger = page.locator(".organize-date-title .date-context-disclosure");
  assert.equal(await page.locator('.organize-selection input[type="date"]').count(), 0, "Smart organize should reuse the app calendar instead of a native date field");
  assert.equal(await dateTrigger.getAttribute("aria-expanded"), "false", "Smart organize should default to today with the calendar collapsed");
  assert.equal(await page.locator(".organize-date-title .date-context-date").textContent(), await page.locator(".home-date-title .date-context-date").count() ? await page.locator(".home-date-title .date-context-date").textContent() : new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(new Date(`${testDate}T12:00:00`)), "The shared date trigger should show the selected day");
  assert.equal(await page.locator(".organize-scope").count(), 0, "Cross-date scope presets should be removed");
  assert.equal(await page.locator('.organize-selection input[type="checkbox"]').count(), 0, "The day preview should not be a multi-select list");
  assert.equal(await page.getByRole("button", { name: "Select all" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Invert" }).count(), 0);
  assert.equal(await page.getByRole("textbox", { name: "Search selected range" }).count(), 0);
  await assertVisible(page.getByText("Records for this day (4)", { exact: true }));
  await dateTrigger.click();
  const organizeCalendar = page.locator(".organize-calendar");
  await assertVisible(organizeCalendar);
  await organizeCalendar.locator(`[data-calendar-date="${previousDate}"]`).click();
  assert.equal(await dateTrigger.getAttribute("aria-expanded"), "false", "Choosing a day should collapse the organize calendar and reveal the day records");
  await assertVisible(page.getByText("Records for this day (1)", { exact: true }));
  await assertVisible(page.getByText("前一天的独立记录", { exact: true }));
  assert.equal(await page.getByText("完成项目报告和产品评审", { exact: true }).count(), 0, "Changing the date should replace the day preview");
  await dateTrigger.click();
  await organizeCalendar.locator(`[data-calendar-date="${testDate}"]`).click();
  await assertVisible(page.getByText("Records for this day (4)", { exact: true }));

  await dateTrigger.click();

  for (const width of [320, 390, 600, 671, 768, 1280]) {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
    await assertNoHorizontalOverflow(page, `${width}px smart organize day selection`);
    if (width === 320 || width === 390) {
      await assertMinTouchTarget(dateTrigger, `${width}px shared organize date trigger`);
      await assertMinTouchTarget(organizeCalendar.locator(`[data-calendar-date="${testDate}"]`), `${width}px organize calendar day`);
      await assertMinTouchTarget(page.getByRole("button", { name: "Review 4 records" }), `${width}px organize day action`);
    }
    await page.screenshot({ path: join(outputDir, `ln-068-organize-day-select-${width}.png`), fullPage: false });
  }

  await page.keyboard.press("Escape");
  assert.equal(await dateTrigger.getAttribute("aria-expanded"), "false", "Escape should collapse the shared organize calendar");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Review 4 records" }).click();
  await assertVisible(page.getByRole("heading", { name: "Reviewing the day's timeline" }));
  await dateTrigger.click();
  await organizeCalendar.locator(`[data-calendar-date="${previousDate}"]`).click();
  assert.equal(await page.locator(".organize-workspace.phase-select").count(), 1, "Changing the selected day should cancel and clear the old timeline review");
  assert.equal(await page.locator(".daily-review-results").count(), 0, "A cancelled day must not receive the previous review result");
  await dateTrigger.click();
  await organizeCalendar.locator(`[data-calendar-date="${testDate}"]`).click();
  await assertVisible(page.getByText("Records for this day (4)", { exact: true }));

  const beforeReview = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await page.getByRole("button", { name: "Review 4 records" }).click();
  await assertVisible(page.getByText("AI summary is unavailable. These records are shown only in local chronological order.", { exact: true }));
  const reviewSourceOrder = await page.locator(".daily-review-sources > li > span").allTextContents();
  assert.deepEqual(reviewSourceOrder, [
    "完成课程学习并整理读书笔记",
    "复习文章知识并输出学习总结",
    "市场分化，准备调整投资仓位",
    "傍晚沿河散步"
  ], "Local fallback should preserve every source record in chronological order and place missing time last");
  assert.equal(await page.locator(".daily-review-summary").count(), 0, "Local fallback must not present source concatenation as an AI summary");
  assert.equal(await page.getByText("Time not recorded", { exact: true }).count() >= 1, true, "Missing-time records should remain explicitly unplaced");
  assert.equal(await page.locator(".organize-apply-all, .organize-apply-group").count(), 0, "Timeline review must remain read-only");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), beforeReview, "Timeline review must not persist derived text or alter raw records");

  for (const width of [320, 390, 600, 671, 768, 1280]) {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
    await assertNoHorizontalOverflow(page, `${width}px daily timeline review`);
    const sourceRows = await page.locator(".daily-review-sources > li").evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().width));
    assert.ok(sourceRows.every((rowWidth) => rowWidth > 0 && rowWidth <= width), `${width}px source records should fit the review surface: ${JSON.stringify(sourceRows)}`);
    await page.screenshot({ path: join(outputDir, `ln-074-daily-timeline-${width}.png`), fullPage: false });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await taskTabs.getByRole("tab", { name: "Category filing" }).click();
  assert.equal(await taskTabs.getByRole("tab", { name: "Category filing" }).getAttribute("aria-selected"), "true");
  await page.getByRole("button", { name: "Organize 4 records" }).click();
  await assertVisible(page.locator(".organize-suggestion", { hasText: "学习 / 学习记录" }));
  await assertVisible(page.locator(".organize-suggestion", { hasText: "交易 / 市场" }));
  assert.equal(await page.locator(".organize-suggestion .organize-category").filter({ hasText: /^#/ }).count(), 0, "Category suggestions should not be rendered as tags");
  await assertVisible(page.getByText(/records remain unchanged/));
  const suggestionSpacing = await page.locator(".organize-suggestion").first().evaluate((suggestion) => {
    const header = suggestion.querySelector("header").getBoundingClientRect();
    const description = suggestion.querySelector(":scope > p").getBoundingClientRect();
    const list = suggestion.querySelector("ul").getBoundingClientRect();
    return {
      headerToDescription: description.top - header.bottom,
      descriptionToList: list.top - description.bottom
    };
  });
  ln058Evidence.organize.suggestion = suggestionSpacing;
  assert.ok(suggestionSpacing.headerToDescription >= 7 && suggestionSpacing.headerToDescription <= 9, `Suggestion explanation should stay with its heading: ${JSON.stringify(suggestionSpacing)}`);
  assert.ok(suggestionSpacing.descriptionToList >= 11 && suggestionSpacing.descriptionToList <= 13, `Suggestion evidence should start after one cluster rhythm: ${JSON.stringify(suggestionSpacing)}`);

  for (const width of [320, 390, 600, 671, 701, 768, 1280]) {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
    await assertNoHorizontalOverflow(page, `${width}px smart organize review`);
    const layout = await page.evaluate(() => ({
      selectionVisible: getComputedStyle(document.querySelector(".organize-selection")).display !== "none",
      analysisVisible: getComputedStyle(document.querySelector(".organize-analysis")).display !== "none",
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    }));
    assert.equal(layout.analysisVisible, true, `${width}px should show the active analysis stage: ${JSON.stringify(layout)}`);
    assert.equal(layout.selectionVisible, width > 720, `${width}px should ${width > 720 ? "keep the desktop selection pane" : "use a single mobile stage"}: ${JSON.stringify(layout)}`);
    if (width === 320 || width === 390) {
      const actionBoxes = await page.locator(".organize-suggestion header button, .organize-suggestion li button").evaluateAll((buttons) => buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return { width: box.width, height: box.height, label: button.getAttribute("aria-label") || button.textContent.trim() };
      }));
      assert.ok(actionBoxes.length > 0, `${width}px should render suggestion review actions`);
      assert.ok(actionBoxes.every((box) => box.width >= 43.99 && box.height >= 43.99), `${width}px suggestion actions should keep 44px targets: ${JSON.stringify(actionBoxes)}`);
    }
    await page.screenshot({ path: join(outputDir, `ln-068-organize-day-review-${width}.png`), fullPage: false });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  const studyGroup = page.locator(".organize-suggestion", { hasText: "学习 / 学习记录" });
  await studyGroup.getByRole("button", { name: "Remove record from this suggestion" }).first().click();
  await studyGroup.getByRole("button", { name: "Move to 学习 / 学习记录" }).click();
  let stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  const studyCategories = stored.entries.filter((entry) => ["organize-study-a", "organize-study-b"].includes(entry.id)).map((entry) => entry.categoryId === "study");
  assert.equal(studyCategories.filter(Boolean).length, 1, "Removing one suggestion should keep that record in its original category");
  await page.getByRole("button", { name: "Undo last apply" }).click();
  stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(stored.entries.filter((entry) => entry.id.startsWith("organize-study-")).some((entry) => entry.categoryId === "study"), false);

  await page.getByRole("button", { name: "Recalculate" }).click();
  await assertVisible(page.getByRole("button", { name: "Apply all remaining suggestions" }));
  await page.getByRole("button", { name: "Apply all remaining suggestions" }).click();
  stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(stored.entries.find((entry) => entry.id === "organize-study-a").categoryId, "study");
  assert.equal(stored.entries.find((entry) => entry.id === "organize-study-b").categoryId, "study");
  assert.equal(stored.entries.find((entry) => entry.id === "organize-market").categoryId, "trading");
  assert.deepEqual(stored.entries.find((entry) => entry.id === "organize-study-a").tags, ["保留标签"]);
  assert.deepEqual(stored.entries.find((entry) => entry.id === "organize-market").tags, ["手工"]);
  assert.deepEqual(stored.entries.find((entry) => entry.id === "organize-low").tags, []);
  assert.equal(stored.entries.find((entry) => entry.id === "organize-low").categoryId, "daily");
  for (const [entryId, original] of Object.entries(seeded.originals)) {
    const entry = stored.entries.find((item) => item.id === entryId);
    assert.equal(entry.content, original.content, `Smart organize must preserve raw content for ${entryId}`);
    assert.deepEqual(entry.tags, original.tags, `Smart organize must preserve tags for ${entryId}`);
    assert.equal(entry.templateId, original.templateId, `Smart organize must preserve the template for ${entryId}`);
    assert.deepEqual(entry.attachments, original.attachments, `Smart organize must preserve attachments for ${entryId}`);
  }
  await page.getByRole("button", { name: "Undo last apply" }).click();

  await page.reload({ waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("heading", { name: "Smart organize" }));
  await page.getByRole("link", { name: "Back to records" }).click();
  await page.waitForURL(baseURL + "/");
  await assertVisible(page.getByRole("button", { name: "Add record" }), "Quick record should remain available after leaving smart organize");
});

test("settings: restore JSON and export Markdown", async (page) => {
  const restorePayload = {
    version: 2,
    structureSchemaVersion: 2,
    seedVersion: 3,
    domains: [{ id: "restored-domain", name: "Restored", order: 0 }],
    categories: [{ id: "restored-category", domainId: "restored-domain", name: "Imported", order: 0 }],
    templates: [{ id: "restored-template", name: "Imported note", categoryId: "restored-category", order: 0, recordType: "linear", schedule: null, inputMode: "free", tags: [], prompt: "", skeleton: "", fields: [] }],
    markdownSettings: { layout: "grouped", domainHeading: "## {{domain}}", categoryHeading: "### {{category}}", entryLine: "- {{time}}{{content}}{{tags}}", allDayHeading: "# {{date}}", daySeparator: "---" },
    entries: [{ id: "restored-entry", date: testDate, time: "09:00", content: "Restored E2E entry", categoryId: "restored-category", tags: [], templateId: "restored-template", fieldValues: {}, createdAt: 1 }]
  };

  await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("heading", { name: "Settings", exact: true }));
  assert.equal(await page.locator(".settings-page [role=dialog]").count(), 0, "Settings should be a page, not a dialog");
  assert.equal(await page.getByRole("heading", { name: "Settings", exact: true }).count(), 1, "Mobile settings should show one Settings title");
  assert.equal(await page.locator(".settings-mobile-menu").getByRole("link").count(), 6, "Mobile settings should expose Record setup as a sixth task");
  assert.deepEqual(await page.locator(".settings-mobile-menu b").allTextContents(), ["General", "Account", "Download", "Restore", "Images", "Record setup"]);
  assert.equal(await page.getByText("Choose a section", { exact: true }).count(), 0);
  assert.equal(await page.locator(".settings-sidebar").evaluate((sidebar) => getComputedStyle(sidebar).display), "none", "Mobile settings should hide the desktop rail");
  await page.waitForTimeout(220);
  for (const viewport of [{ width: 320, height: 844 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px mobile settings index`);
    const mobileRows = await page.locator(".settings-mobile-menu a").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
    assert.ok(mobileRows.every((height) => height >= 67.99), `${viewport.width}px mobile settings rows should remain thumb-friendly: ${JSON.stringify(mobileRows)}`);
    await page.screenshot({ path: join(outputDir, `ln-064-settings-mobile-index-${viewport.width}.png`), fullPage: false });
  }
  const recordSetupIndexLink = page.getByRole("link", { name: "Record setup", exact: true });
  await recordSetupIndexLink.click();
  await assertVisible(page.locator("#record-setup .template-manager-embedded"));
  assert.equal(new URL(page.url()).hash, "#record-setup");
  await page.getByRole("link", { name: "Back to settings" }).click();
  assert.equal(new URL(page.url()).hash, "", "Returning from Record setup should clear the detail hash");
  assert.equal(await recordSetupIndexLink.evaluate((link) => document.activeElement === link), true, "Returning from Record setup should restore focus to the sixth settings row");
  await openSettingsPanel(page, "General");
  await assertVisible(page.getByRole("heading", { name: "Language and access", exact: true }));
  await page.getByRole("button", { name: "简体中文" }).click();
  await assertVisible(page.getByRole("heading", { name: "语言与入口", exact: true }));
  assert.equal(await page.locator(".settings-panel-heading span", { hasText: /^常规$/ }).count(), 1, "General should appear only as the section marker, not repeat as the panel title");
  assert.equal(await page.getByText("记录保存在哪里", { exact: true }).count(), 0);
  assert.equal(await page.getByText("选择设置", { exact: true }).count(), 0);
  assert.equal(await page.getByText("只改变界面，不会翻译或改写记录。", { exact: true }).count(), 0, "Language controls should not explain an obvious effect");
  assert.equal(await page.getByText("从手机桌面直接打开，离线时也可使用。", { exact: true }).count(), 0, "Home Screen access should not repeat effect and instruction copy");
  await assertVisible(page.getByRole("heading", { name: "手机主屏幕" }));
  await assertVisible(page.getByText("浏览器分享菜单 → 添加到主屏幕。", { exact: true }));
  const generalDividers = await page.evaluate(() => {
    const list = document.querySelector(".settings-preference-list");
    const rows = [...list.querySelectorAll(".settings-preference-row")];
    return {
      listTop: getComputedStyle(list).borderTopWidth,
      rowTops: rows.map((row) => getComputedStyle(row).borderTopWidth),
      rowBottoms: rows.map((row) => getComputedStyle(row).borderBottomWidth)
    };
  });
  assert.deepEqual(generalDividers, { listTop: "0px", rowTops: ["0px", "1px"], rowBottoms: ["0px", "0px"] }, `General should keep only the divider between sibling settings: ${JSON.stringify(generalDividers)}`);
  await page.screenshot({ path: join(outputDir, "ln-064-settings-general-copy-zh-390.png"), fullPage: false });
  await page.getByRole("button", { name: "English" }).click();
  await assertVisible(page.getByRole("heading", { name: "Language and access", exact: true }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(50);
  assert.equal(await page.locator(".settings-nav").getByRole("link").count(), 6, "Desktop settings should expose the same six task-based sections");
  assert.equal(await page.getByRole("link", { name: "General", exact: true }).getAttribute("aria-current"), "page");
  assert.equal(await page.getByRole("heading", { name: "Save files", exact: true }).count(), 0, "Only the selected settings panel should render");
  const settingsHierarchy = await page.evaluate(() => {
    const pageTitle = document.querySelector(".management-title h1");
    const section = document.querySelector(".settings-section");
    const sectionHeading = section.querySelector(".settings-panel-heading");
    const sectionEyebrow = sectionHeading.querySelector(":scope > span");
    const sectionTitle = sectionHeading.querySelector("h2");
    const sectionContent = sectionHeading.nextElementSibling;
    const actionTitle = document.querySelector(".settings-preference-row h3");
    const sectionBox = section.getBoundingClientRect();
    const eyebrowBox = sectionEyebrow.getBoundingClientRect();
    const titleBox = sectionTitle.getBoundingClientRect();
    const contentBox = sectionContent.getBoundingClientRect();
    return {
      page: Number.parseFloat(getComputedStyle(pageTitle).fontSize),
      section: Number.parseFloat(getComputedStyle(sectionTitle).fontSize),
      action: Number.parseFloat(getComputedStyle(actionTitle).fontSize),
      titleToContent: contentBox.top - titleBox.bottom,
      sectionEyebrowInset: eyebrowBox.top - sectionBox.top,
      sectionTitleInset: titleBox.top - sectionBox.top
    };
  });
  ln058Evidence.settings = {
    titleToContent: settingsHierarchy.titleToContent,
    sectionEyebrowInset: settingsHierarchy.sectionEyebrowInset,
    sectionTitleInset: settingsHierarchy.sectionTitleInset
  };
  assert.ok(settingsHierarchy.page >= 26 && settingsHierarchy.section >= 26, `Settings identity and active panel should remain legible: ${JSON.stringify(settingsHierarchy)}`);
  assert.ok(settingsHierarchy.section - settingsHierarchy.action >= 4, `Settings section titles should lead actions: ${JSON.stringify(settingsHierarchy)}`);
  assert.ok(settingsHierarchy.titleToContent >= 23 && settingsHierarchy.titleToContent <= 25, `Settings content should follow the section title with one clear region gap: ${JSON.stringify(settingsHierarchy)}`);
  assert.ok(settingsHierarchy.sectionEyebrowInset >= 0 && settingsHierarchy.sectionEyebrowInset <= 1, `Settings panels should begin at the eyebrow without a redundant card inset: ${JSON.stringify(settingsHierarchy)}`);
  const languageTargets = await page.locator(".language-choice button").evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  assert.ok(languageTargets.every((button) => button.width >= 43.99 && button.height >= 43.99), `Language controls should keep 44px targets: ${JSON.stringify(languageTargets)}`);
  const installAction = page.locator(".settings-install-button");
  if (await installAction.count()) await assertMinTouchTarget(installAction, "Install app setting");
  await openSettingsPanel(page, "Account");
  await assertVisible(page.getByRole("heading", { name: "Sign in and sync", exact: true }));
  await assertVisible(page.getByText("E2E Writer", { exact: true }));
  await assertVisible(page.locator("#account").getByText("e2e@log-note.local", { exact: true }));
  await assertVisible(page.getByText("Test session", { exact: true }));
  await assertMinTouchTarget(page.getByRole("button", { name: "Sign out on this browser" }), "Account sign-out action");
  assert.equal(await page.getByText("Continue without an account", { exact: true }).count(), 0, "Signed-in settings must not advertise an anonymous usage path");
  const recordPayloadBeforeAccount = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertVisible(page.getByText("E2E Writer", { exact: true }), "Account identity should survive refresh in the authenticated test session");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), recordPayloadBeforeAccount, "Opening and refreshing account settings must not alter Log Note data");
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${viewport.width}px authenticated account settings`);
    await page.screenshot({ path: join(outputDir, `ln-067-account-password-${viewport.width}.png`), fullPage: false });
  }
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), recordPayloadBeforeAccount, "Viewing account sync status must not alter record data");
  await page.setViewportSize({ width: 1280, height: 900 });
  await openSettingsPanel(page, "Download");
  await assertVisible(page.getByRole("heading", { name: "Save files", exact: true }));
  await assertVisible(page.getByRole("heading", { name: "Records", exact: true }));
  await assertVisible(page.getByRole("heading", { name: "Backup", exact: true }));
  await assertVisible(page.getByRole("heading", { name: "Structure", exact: true }));
  await assertVisible(page.getByText(/This browser · \d+ records · \d+ images/));
  const downloadGroups = page.locator(".markdown-output > .settings-action-group");
  assert.equal(await downloadGroups.count(), 3, "Download should retain three primary user-task groups");
  const downloadHierarchy = await page.locator(".markdown-output").evaluate((panel) => {
    const groups = [...panel.querySelectorAll(":scope > .settings-action-group")];
    const recordGroup = groups[0];
    const backupGroup = groups[1];
    const format = panel.querySelector(".markdown-format-details");
    const recordActionTitle = recordGroup.querySelector(".settings-action-list b");
    const formatTitle = format.querySelector("summary b");
    const formatSummaryText = format.querySelector("summary > span");
    const recordActionText = recordGroup.querySelector(".settings-action-list button > span");
    const backupTitle = backupGroup.querySelector(".settings-group-heading h3");
    const backupMeta = backupGroup.querySelector(".settings-group-meta");
    const recommended = backupGroup.querySelector("em");
    const completeTitle = backupGroup.querySelector("button b");
    const box = (element) => element.getBoundingClientRect();
    const groupBoxes = groups.map(box);
    return {
      formatInsideRecords: format.closest(".settings-action-group") === recordGroup,
      groupTitleSizes: groups.map((group) => Number.parseFloat(getComputedStyle(group.querySelector(".settings-group-heading h3")).fontSize)),
      groupDescriptionSizes: groups.map((group) => Number.parseFloat(getComputedStyle(group.querySelector(".settings-group-heading p")).fontSize)),
      groupGaps: groupBoxes.slice(1).map((current, index) => current.top - groupBoxes[index].bottom),
      actionTitleSize: Number.parseFloat(getComputedStyle(recordActionTitle).fontSize),
      formatTitleSize: Number.parseFloat(getComputedStyle(formatTitle).fontSize),
      formatIndentDelta: box(formatSummaryText).left - box(recordActionText).left,
      backupTitleSize: Number.parseFloat(getComputedStyle(backupTitle).fontSize),
      backupMetaSize: Number.parseFloat(getComputedStyle(backupMeta).fontSize),
      backupMetaColor: getComputedStyle(backupMeta).color,
      backupTitleColor: getComputedStyle(backupTitle).color,
      recommendedSize: Number.parseFloat(getComputedStyle(recommended).fontSize),
      recommendedGap: box(recommended).left - box(completeTitle).right,
      recommendedCenterDelta: Math.abs((box(recommended).top + box(recommended).height / 2) - (box(completeTitle).top + box(completeTitle).height / 2))
    };
  });
  assert.equal(downloadHierarchy.formatInsideRecords, true, `Download format should remain subordinate to record downloads: ${JSON.stringify(downloadHierarchy)}`);
  assert.ok(downloadHierarchy.groupTitleSizes.every((size) => size === 18), `Download group headings should use the small-title role: ${JSON.stringify(downloadHierarchy)}`);
  assert.ok(downloadHierarchy.groupDescriptionSizes.every((size) => size === 14), `Download group descriptions should use supporting-text sizing: ${JSON.stringify(downloadHierarchy)}`);
  assert.ok(downloadHierarchy.groupGaps.every((gap) => gap >= 31 && gap <= 33), `Primary download groups should use one region rhythm: ${JSON.stringify(downloadHierarchy)}`);
  assert.ok(downloadHierarchy.actionTitleSize > downloadHierarchy.formatTitleSize, `Download format should remain quieter than record actions: ${JSON.stringify(downloadHierarchy)}`);
  assert.ok(Math.abs(downloadHierarchy.formatIndentDelta) <= 1, `Download format should align with its owning record-action text: ${JSON.stringify(downloadHierarchy)}`);
  assert.equal(downloadHierarchy.backupMetaSize, 12, `Browser backup status should use metadata sizing: ${JSON.stringify(downloadHierarchy)}`);
  assert.notEqual(downloadHierarchy.backupMetaColor, downloadHierarchy.backupTitleColor, `Browser backup status should remain weaker than the Backup title: ${JSON.stringify(downloadHierarchy)}`);
  assert.ok(downloadHierarchy.recommendedSize <= 12, `Recommended should remain a compact auxiliary label: ${JSON.stringify(downloadHierarchy)}`);
  assert.ok(downloadHierarchy.recommendedGap >= 3 && downloadHierarchy.recommendedGap <= 9, `Recommended should stay attached to Complete backup: ${JSON.stringify(downloadHierarchy)}`);
  assert.ok(downloadHierarchy.recommendedCenterDelta <= 2, `Recommended should share the Complete backup title line: ${JSON.stringify(downloadHierarchy)}`);
  const downloadListDividers = await page.locator(".markdown-output .settings-action-list").evaluateAll((lists) => lists.map((list) => {
    const buttons = [...list.querySelectorAll(":scope > button")];
    return {
      listTop: getComputedStyle(list).borderTopWidth,
      firstTop: getComputedStyle(buttons[0]).borderTopWidth,
      lastBottom: getComputedStyle(buttons.at(-1)).borderBottomWidth,
      siblingTops: buttons.slice(1).map((button) => getComputedStyle(button).borderTopWidth)
    };
  }));
  assert.ok(downloadListDividers.every((list) => list.listTop === "0px" && list.firstTop === "0px" && list.lastBottom === "0px"), `Download lists should not draw unowned outer dividers: ${JSON.stringify(downloadListDividers)}`);
  assert.ok(downloadListDividers.every((list) => list.siblingTops.every((width) => width === "1px")), `Download lists should divide only adjacent actions: ${JSON.stringify(downloadListDividers)}`);
  const backupActions = await page.locator(".settings-action-group").nth(1).getByRole("button").allTextContents();
  assert.match(backupActions[0], /Complete backup.*Recommended/s, "Complete backup should be the recommended first backup action");
  assert.match(backupActions[1], /Text backup.*no images/s, "Text backup should clearly exclude images");
  const fileKinds = await page.locator(".markdown-output .settings-action-list button[data-file-kind]").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-file-kind")));
  assert.deepEqual(fileKinds, ["MD", "ALL", "FULL", "JSON", "MAP", "NEW"], `Download actions should expose distinct file-kind markers instead of repeating one generic icon: ${JSON.stringify(fileKinds)}`);
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 600, height: 900 },
    { width: 671, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(220);
    await assertNoHorizontalOverflow(page, `${viewport.width}px download structure`);
    const summary = page.locator(".markdown-format-details > summary");
    await assertMinTouchTarget(summary, `${viewport.width}px download format disclosure`);
    const actionHeights = await page.locator(".markdown-output .settings-action-list button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    assert.ok(actionHeights.every((height) => height >= 43.99), `${viewport.width}px download actions should keep 44px targets: ${JSON.stringify(actionHeights)}`);
    await page.screenshot({ path: join(outputDir, `ln-065-download-structure-${viewport.width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await openSettingsPanel(page, "Restore");
  await assertVisible(page.getByRole("heading", { name: "Import backup", exact: true }));
  assert.equal(await page.getByRole("link", { name: "Restore", exact: true }).getAttribute("aria-current"), "page");
  await assertVisible(page.getByRole("heading", { name: "Import diary Markdown", exact: true }));
  await assertVisible(page.getByRole("heading", { name: "Replace from backup", exact: true }));
  await assertVisible(page.getByText(/Invalid files leave current data unchanged/));
  await assertVisible(page.getByText("Current data will be replaced", { exact: true }));
  await openSettingsPanel(page, "Images");
  await assertVisible(page.getByRole("heading", { name: "Image storage", exact: true }));
  assert.equal(await page.getByRole("link", { name: "Images", exact: true }).getAttribute("aria-current"), "page");
  await openSettingsPanel(page, "Record setup");
  await assertVisible(page.getByRole("heading", { name: "Edit structure", exact: true }));
  const settingsPanelLabels = await page.evaluate(() => [...document.querySelectorAll(".settings-panel-heading")].map((heading) => ({
    marker: heading.querySelector(":scope > span")?.textContent?.trim(),
    title: heading.querySelector("h2")?.textContent?.trim()
  })));
  assert.ok(settingsPanelLabels.every(({ marker, title }) => marker && title && marker !== title), `Settings panel markers should not repeat their detail titles: ${JSON.stringify(settingsPanelLabels)}`);
  await openSettingsPanel(page, "Restore");
  const diaryMarkdown = "09:15 Imported diary line\n10:30 Second imported line\n> - 08:28 Example only\n";
  const diaryInput = page.locator('input[type="file"][accept*=".md"]');
  await diaryInput.setInputFiles({ name: "2026_08_17.md", mimeType: "text/markdown", buffer: Buffer.from(diaryMarkdown) });
  await assertVisible(page.getByText("2 new records from 1 files are ready. 0 existing or duplicate records will be skipped.", { exact: true }));
  await page.getByRole("button", { name: "Add 2 records", exact: true }).click();
  await assertVisible(page.locator(".toast", { hasText: "Added 2 diary records" }));
  const importedDiarySnapshot = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.deepEqual(importedDiarySnapshot.entries.filter((entry) => entry.date === "2026-08-17").map((entry) => ({
    time: entry.time,
    content: entry.content,
    templateId: entry.templateId,
    tags: entry.tags
  })), [
    { time: "09:15", content: "Imported diary line", templateId: "quick", tags: [] },
    { time: "10:30", content: "Second imported line", templateId: "quick", tags: [] }
  ], "Diary Markdown should merge as ordinary untagged quick records without importing examples");
  await diaryInput.setInputFiles({ name: "2026_08_17.md", mimeType: "text/markdown", buffer: Buffer.from(diaryMarkdown) });
  await page.waitForTimeout(100);
  const repeatedDiarySnapshot = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(repeatedDiarySnapshot.entries.filter((entry) => entry.date === "2026-08-17").length, 2, "Repeating the same diary import should be idempotent");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({ name: "log-note-e2e-restore.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(restorePayload)) });
  await assertVisible(page.locator(".toast", { hasText: "Backup restored" }));
  await leaveSettings(page);
  await page.waitForURL(baseURL + "/");
  await assertVisible(page.getByText("Restored E2E entry", { exact: true }));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  await openSettingsPanel(page, "Download");
  await page.getByText("Download format", { exact: true }).click();
  const entryLine = page.getByLabel("Record line");
  await entryLine.fill("ENTRY {{content}}");
  await assertVisible(page.locator(".markdown-preview", { hasText: "ENTRY Restored E2E entry" }));
  assert.equal(await entryLine.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)), 16);
  const settingsActions = await page.locator(".settings-action-list button").evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  assert.ok(settingsActions.every((button) => button.width >= 44 && button.height >= 44), `Settings actions should keep 44px targets: ${JSON.stringify(settingsActions)}`);
  assert.equal(await page.locator(".settings-action-list .action-icon, .settings-action-list [data-icon=chevronRight]").count(), 0, "Settings downloads should not use the old icon blocks or trailing chevrons");
  await openSettingsPanel(page, "General");
  await page.getByRole("button", { name: "简体中文" }).click();
  await openSettingsPanel(page, "下载");
  await page.waitForTimeout(220);
  await assertVisible(page.getByText(/当前浏览器 · \d+ 条记录 · \d+ 张图片/));
  await assertNoHorizontalOverflow(page, "390px Chinese download structure");
  await page.screenshot({ path: join(outputDir, "ln-065-download-structure-zh-390.png"), fullPage: true });
  await openSettingsPanel(page, "常规");
  await page.getByRole("button", { name: "English" }).click();
  await openSettingsPanel(page, "General");
  const settingsViewports = [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 600, height: 900 },
    { width: 671, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ];
  for (const viewport of settingsViewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${viewport.width}px settings workspace`);
    const navMetrics = await page.evaluate(() => {
      const sidebar = document.querySelector(".settings-sidebar");
      const mobileIndex = document.querySelector(".settings-mobile-index");
      const panel = document.querySelector(".settings-panel-column");
      const header = document.querySelector(".settings-page .management-header");
      const nav = document.querySelector(".settings-nav");
      const linkBoxes = [...nav.querySelectorAll("a")].map((link) => link.getBoundingClientRect());
      return {
        sidebarDisplay: getComputedStyle(sidebar).display,
        mobileIndexDisplay: getComputedStyle(mobileIndex).display,
        panelDisplay: getComputedStyle(panel).display,
        navDisplay: getComputedStyle(nav).display,
        minLinkHeight: Math.min(...linkBoxes.map((box) => box.height)),
        headerHeight: header.getBoundingClientRect().height,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth
      };
    });
    assert.equal(navMetrics.documentWidth, navMetrics.viewportWidth, `${viewport.width}px settings page should not overflow: ${JSON.stringify(navMetrics)}`);
    if (viewport.width <= 760) {
      assert.equal(navMetrics.sidebarDisplay, "none", `${viewport.width}px should hide the desktop settings rail: ${JSON.stringify(navMetrics)}`);
      assert.equal(navMetrics.mobileIndexDisplay, "none", `${viewport.width}px detail should replace, not stack below, the mobile settings index: ${JSON.stringify(navMetrics)}`);
      assert.equal(navMetrics.panelDisplay, "block", `${viewport.width}px should show one mobile detail panel: ${JSON.stringify(navMetrics)}`);
      assert.ok(navMetrics.headerHeight <= 57, `${viewport.width}px should use a compact mobile toolbar: ${JSON.stringify(navMetrics)}`);
      await assertVisible(page.getByRole("link", { name: "Back to settings" }));
    } else {
      assert.notEqual(navMetrics.sidebarDisplay, "none", `${viewport.width}px should show the desktop settings rail: ${JSON.stringify(navMetrics)}`);
      assert.equal(navMetrics.navDisplay, "grid", `${viewport.width}px should use the desktop settings rail: ${JSON.stringify(navMetrics)}`);
      assert.ok(navMetrics.minLinkHeight >= 43.99, `${viewport.width}px desktop settings navigation should keep 44px targets: ${JSON.stringify(navMetrics)}`);
    }
    await page.screenshot({ path: join(outputDir, `ln-064-settings-general-${viewport.width}.png`), fullPage: false });
  }
  ln032Evidence.settings = { entryLineFontSize: 16, actionMetrics: settingsActions, noLegacyIconBlocks: true, viewports: settingsViewports.map((viewport) => viewport.width) };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(50);
  await page.getByRole("link", { name: "Back to settings" }).click();
  await assertVisible(page.getByRole("heading", { name: "Settings", exact: true }));
  assert.equal(new URL(page.url()).hash, "", "Returning to the mobile settings index should clear the detail hash");
  await openSettingsPanel(page, "Restore");
  await page.waitForTimeout(220);
  await page.screenshot({ path: join(outputDir, "ln-064-settings-backup-390.png"), fullPage: false });
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({ name: "broken-backup.json", mimeType: "application/json", buffer: Buffer.from("{not-json") });
  await assertVisible(page.locator(".toast", { hasText: "Could not restore backup" }));
  await leaveSettings(page);
  await page.waitForURL(baseURL + "/");
  await assertVisible(page.getByText("Restored E2E entry", { exact: true }));

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Today Markdown" }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^\d{4}_\d{2}_\d{2}\.md$/);
  const stream = await download.createReadStream();
  let markdown = "";
  for await (const chunk of stream) markdown += chunk;
  assert.match(markdown, /ENTRY Restored E2E entry/);
});

test("domain insights: the current rail domain opens a local one-glance 30-day review", async (page) => {
  const insightDates = [shiftDate(testDate, -14), shiftDate(testDate, -6), testDate];
  await page.evaluate(({ dates }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.domains = [
      ...state.domains.filter((domain) => domain.id !== "finance-empty-domain"),
      { id: "finance-empty-domain", name: "Finance VeryLongUnbrokenDomainNameThatMustWrapSafely", order: 999 }
    ];
    state.entries = [
      ...state.entries.filter((entry) => entry.categoryId !== "trading"
        && !["daily-insight", "trade-reason", "trade-result", "trade-risk", "insight-unresolved"].includes(entry.id)),
      { id: "daily-insight", date: dates[0], time: "08:00", content: "A quiet daily note", categoryId: "daily", tags: [], templateId: "quick", fieldValues: {}, attachments: [], createdAt: 1 },
      { id: "trade-reason", date: dates[0], time: "09:00", content: "Because rates changed, I recorded the decision rationale.", categoryId: "trading", tags: [], templateId: "market", fieldValues: {}, attachments: [], createdAt: 2 },
      { id: "trade-result", date: dates[1], time: "15:00", content: "Reviewed the outcome after close.", categoryId: "trading", tags: [], templateId: "market", fieldValues: {}, attachments: [], createdAt: 3 },
      { id: "trade-risk", date: dates[2], time: "10:00", content: `The risk boundary is to exit if the thesis is invalidated. ${"UnbrokenEvidenceText".repeat(12)}`, categoryId: "trading", tags: [], templateId: "market", fieldValues: {}, attachments: [], createdAt: 4 },
      { id: "insight-unresolved", date: dates[2], time: "11:00", content: "A record from a removed category", categoryId: "removed-category", tags: [], templateId: null, fieldValues: {}, attachments: [], createdAt: 5 }
    ];
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "en");
  }, { dates: insightDates });
  await page.reload({ waitUntil: "domcontentloaded" });
  await setRecordView(page, "grouped");

  const insightEntry = page.locator(".domain-directory-insights-link");
  await assertVisible(insightEntry, "The current domain should expose one separate insights action");
  assert.equal(await insightEntry.count(), 1, "Only the current domain should expose the contextual insights action");
  await assertMinTouchTarget(insightEntry, "Current-domain insights action");
  const initialCurrentDomainId = await page.locator('.domain-directory-node[aria-current="location"]').getAttribute("data-domain-id");
  assert.equal(await insightEntry.getAttribute("data-domain-id"), initialCurrentDomainId, "The adjacent action should follow whichever domain is currently aligned");
  assert.equal(new URL(await insightEntry.getAttribute("href"), baseURL).pathname, "/insights");

  const tradingMark = page.locator('.domain-directory-node[data-domain-id="trading-domain"]');
  await tradingMark.click();
  await page.waitForTimeout(700);
  await page.waitForFunction(() => {
    const link = document.querySelector(".domain-directory-insights-link");
    return link?.dataset.domainId === "trading-domain"
      && new URL(link.href).searchParams.get("domain") === "trading-domain";
  });
  assert.equal(await tradingMark.getAttribute("aria-current"), "location", "The original domain mark must remain the scroll control");
  assert.equal(await insightEntry.getAttribute("data-domain-id"), "trading-domain", "The single insights action should move with the current domain");
  assert.equal(new URL(await insightEntry.getAttribute("href"), baseURL).searchParams.get("domain"), "trading-domain");
  const railStack = await page.evaluate(() => {
    const action = document.querySelector(".domain-directory-insights-link").getBoundingClientRect();
    const currentNode = document.querySelector('.domain-directory-node[aria-current="location"]');
    const node = currentNode.getBoundingClientRect();
    const markArtwork = currentNode.querySelector("img").getBoundingClientRect();
    const label = currentNode.querySelector("span").getBoundingClientRect();
    const spine = document.querySelector(".home-edge-rail-brush").getBoundingClientRect();
    const agentTarget = document.querySelector(".diary-agent-viewport .organize-helper").getBoundingClientRect();
    const overlapArea = (first, second) => Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left))
      * Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
    const centerX = (rect) => rect.left + rect.width / 2;
    const stackLeft = Math.min(node.left, action.left);
    return {
      actionTop: action.top,
      actionRight: action.right,
      actionWidth: action.width,
      actionHeight: action.height,
      nodeBottom: node.bottom,
      nodeWidth: node.width,
      nodeHeight: node.height,
      targetOverlap: overlapArea(action, node),
      labelLeft: label.left,
      spineRight: spine.right,
      labelActionCenterDelta: Math.abs(centerX(label) - centerX(action)),
      nodeActionCenterDelta: Math.abs(centerX(node) - centerX(action)),
      nodeLabelCenterDelta: Math.abs(centerX(node) - centerX(label)),
      markSpineCenterDelta: Math.abs((markArtwork.left + markArtwork.width / 2) - (spine.left + spine.width / 2)),
      labelMarkArtworkOverlap: overlapArea(label, markArtwork),
      agentTargetOverlap: overlapArea(agentTarget, node) + overlapArea(agentTarget, action),
      agentTargetClearance: stackLeft - agentTarget.right,
      agentFocusClearance: stackLeft - agentTarget.right - 4,
      labelBackgroundColor: getComputedStyle(currentNode.querySelector("span")).backgroundColor,
      viewportWidth: window.innerWidth
    };
  });
  assert.ok(Math.abs(railStack.nodeWidth - 44) <= .5 && Math.abs(railStack.nodeHeight - 44) <= .5, `The active domain must use one real 44px target: ${JSON.stringify(railStack)}`);
  assert.ok(Math.abs(railStack.actionWidth - 44) <= .5 && Math.abs(railStack.actionHeight - 44) <= .5, `The insights action must use one real 44px target: ${JSON.stringify(railStack)}`);
  assert.equal(railStack.targetOverlap, 0, `The insights target and domain scroll target must not overlap: ${JSON.stringify(railStack)}`);
  assert.ok(railStack.actionTop - railStack.nodeBottom >= 4, `The vertically stacked targets should keep at least 4px clearance: ${JSON.stringify(railStack)}`);
  assert.ok(railStack.labelLeft >= railStack.spineRight + 4, `The active domain label should stay in the right rail instead of occupying the reading surface: ${JSON.stringify(railStack)}`);
  assert.ok(railStack.labelActionCenterDelta <= 1, `The active domain label and its insights action should form one vertical column: ${JSON.stringify(railStack)}`);
  assert.ok(railStack.nodeActionCenterDelta <= 1 && railStack.nodeLabelCenterDelta <= 1, `The real domain target, its visible label, and the insights target should share one center axis: ${JSON.stringify(railStack)}`);
  assert.ok(railStack.markSpineCenterDelta <= 1.5, `The active domain mark should remain aligned to the notebook spine: ${JSON.stringify(railStack)}`);
  assert.ok(railStack.actionRight <= railStack.viewportWidth + .5, `The vertically stacked insights action must remain inside the viewport: ${JSON.stringify(railStack)}`);
  assert.ok(railStack.labelMarkArtworkOverlap <= 1, `The active domain label and its directory mark must remain visually separate: ${JSON.stringify(railStack)}`);
  assert.equal(railStack.agentTargetOverlap, 0, `The Diary Agent target must not overlap either stacked control: ${JSON.stringify(railStack)}`);
  assert.ok(railStack.agentTargetClearance >= 8, `The Diary Agent target should leave enough room for its 4px focus treatment plus 4px visible clearance: ${JSON.stringify(railStack)}`);
  assert.ok(railStack.agentFocusClearance >= 4, `The Diary Agent focus treatment must stay clear of the stacked column: ${JSON.stringify(railStack)}`);
  assert.equal(railStack.labelBackgroundColor, "rgba(0, 0, 0, 0)", `The active label must not hide an Agent collision with an opaque paper mask: ${JSON.stringify(railStack)}`);

  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const narrowRailStack = await page.evaluate(() => {
    const node = document.querySelector('.domain-directory-node[aria-current="location"]').getBoundingClientRect();
    const label = document.querySelector('.domain-directory-node[aria-current="location"] span').getBoundingClientRect();
    const action = document.querySelector(".domain-directory-insights-link").getBoundingClientRect();
    const agent = document.querySelector(".diary-agent-viewport .organize-helper").getBoundingClientRect();
    const centerX = (rect) => rect.left + rect.width / 2;
    return {
      nodeWidth: node.width,
      nodeHeight: node.height,
      actionWidth: action.width,
      actionHeight: action.height,
      targetCenterDelta: Math.abs(centerX(node) - centerX(action)),
      visibleCenterDelta: Math.abs(centerX(label) - centerX(action)),
      agentTargetClearance: Math.min(node.left, action.left) - agent.right,
      agentFocusClearance: Math.min(node.left, action.left) - agent.right - 4,
      actionRight: action.right,
      viewportWidth: innerWidth
    };
  });
  assert.ok(Math.abs(narrowRailStack.nodeWidth - 44) <= .5 && Math.abs(narrowRailStack.nodeHeight - 44) <= .5, `320px should keep the real domain target at 44px: ${JSON.stringify(narrowRailStack)}`);
  assert.ok(Math.abs(narrowRailStack.actionWidth - 44) <= .5 && Math.abs(narrowRailStack.actionHeight - 44) <= .5, `320px should keep the insights target at 44px: ${JSON.stringify(narrowRailStack)}`);
  assert.ok(narrowRailStack.targetCenterDelta <= 1 && narrowRailStack.visibleCenterDelta <= 1, `320px should keep both real targets and visible contents on one axis: ${JSON.stringify(narrowRailStack)}`);
  assert.ok(narrowRailStack.agentTargetClearance >= 8 && narrowRailStack.agentFocusClearance >= 4, `320px should keep the Agent target and focus treatment outside the insights column: ${JSON.stringify(narrowRailStack)}`);
  assert.ok(narrowRailStack.actionRight <= narrowRailStack.viewportWidth + .5, `320px should keep the stacked column inside the viewport: ${JSON.stringify(narrowRailStack)}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const sourceBefore = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  const analysisRequests = [];
  const analysisOrigin = new URL(baseURL).origin;
  const observeAnalysisRequest = (request) => {
    const url = new URL(request.url());
    if (url.origin !== analysisOrigin || url.pathname === "/api" || url.pathname.startsWith("/api/")) analysisRequests.push(request.url());
  };
  page.on("request", observeAnalysisRequest);
  await insightEntry.click();
  await page.waitForURL(/\/insights\?domain=trading-domain$/);
  await assertVisible(page.locator("[data-insights-page]"));
  await assertVisible(page.getByRole("heading", { name: "Domain insights", exact: true }));
  assert.equal(await page.locator("[data-insights-page]").getAttribute("data-insights-state"), "ready");
  assert.equal(await page.locator('[data-insights-domain-id="trading-domain"]').getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator("[data-insights-page]").getAttribute("data-selected-total"), "3");
  assert.equal(await page.locator("[data-insights-metric]").count(), 0, "Permanent record, active-day, and subtype metric bands should be absent");
  assert.equal(await page.locator(".insights-primary-metrics, .insights-split").count(), 0, "The default surface should not duplicate top-level totals");
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-phase"), "idle", "AI review must stay secondary and idle until explicitly opened");
  assert.equal(await page.locator("[data-weekly-disclosure], [data-weekly-result]").count(), 0, "The default review should not expose AI disclosure or generated copy");

  const insightsBack = page.getByRole("link", { name: "Back to records", exact: true });
  await insightsBack.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const backFocus = await insightsBack.evaluate((link) => ({
    active: document.activeElement === link,
    visible: link.matches(":focus-visible"),
    outlineWidth: Number.parseFloat(getComputedStyle(link).outlineWidth)
  }));
  assert.equal(backFocus.active, true, `Keyboard focus should return to the review exit: ${JSON.stringify(backFocus)}`);
  assert.equal(backFocus.visible, true, `The review exit should expose :focus-visible: ${JSON.stringify(backFocus)}`);
  assert.ok(backFocus.outlineWidth >= 2, `The review exit should keep a visible focus ring: ${JSON.stringify(backFocus)}`);
  await page.keyboard.press("Tab");
  const firstDomainFocus = await page.locator(".insights-domain-nav button").first().evaluate((button) => ({
    active: document.activeElement === button,
    visible: button.matches(":focus-visible"),
    outlineWidth: Number.parseFloat(getComputedStyle(button).outlineWidth)
  }));
  assert.equal(firstDomainFocus.active, true, `Domain selection should follow the exit in keyboard order: ${JSON.stringify(firstDomainFocus)}`);
  assert.equal(firstDomainFocus.visible, true, `Domain selection should expose :focus-visible: ${JSON.stringify(firstDomainFocus)}`);
  assert.ok(firstDomainFocus.outlineWidth >= 2, `Domain selection should keep a visible focus ring: ${JSON.stringify(firstDomainFocus)}`);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const insightsReducedMotion = await page.locator("[data-insights-page]").evaluate((root) => ({
    returnTransition: Number.parseFloat(getComputedStyle(root.querySelector(".management-header .icon-button")).transitionDuration),
    domainTransition: Number.parseFloat(getComputedStyle(root.querySelector(".insights-domain-nav button")).transitionDuration),
    chartAnimation: Number.parseFloat(getComputedStyle(root.querySelector(".insights-trend-chart canvas")).animationDuration)
  }));
  assert.equal(Object.values(insightsReducedMotion).every((duration) => duration <= .001), true, `Reduced motion should remove review animation: ${JSON.stringify(insightsReducedMotion)}`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const chart = page.locator('[data-chart-kind="line"]');
  const chartCanvas = chart.locator("[data-chart-canvas]");
  await assertVisible(chart);
  assert.equal(await chartCanvas.getAttribute("data-point-count"), "30");
  assert.match(await chart.getAttribute("aria-label"), /Trading.*30 days/i);
  assert.ok((await page.locator("[data-chart-summary]").textContent()).trim(), "The Canvas chart must expose an equivalent text summary");
  assert.equal(await page.locator('[data-chart-detail]').count(), 0, "Daily subtype facts should stay hidden until the chart is selected");
  const chartBox = await chartCanvas.boundingBox();
  assert.ok(chartBox, "The line chart should have measurable pointer geometry");
  await chartCanvas.click({ position: { x: chartBox.width - 9, y: Math.round(chartBox.height / 2) } });
  await assertVisible(page.locator('[data-chart-detail][data-date="' + testDate + '"]'));
  assert.match(await page.locator("[data-chart-detail] p").first().textContent(), /1 record.*day/i);
  assert.match(await page.locator("[data-chart-detail] p").nth(1).textContent(), /Ordinary \d+ · Periodic \d+ · 3 active days/i);
  assert.equal(await page.locator(".insights-chart-live").getAttribute("aria-live"), "polite");
  await chartCanvas.click({ position: { x: chartBox.width - 9, y: Math.round(chartBox.height / 2) } });
  assert.equal(await page.locator("[data-chart-detail]").count(), 0, "Selecting the same date twice should close its detail");

  await chart.focus();
  await page.keyboard.press("Enter");
  assert.equal(await chart.getAttribute("data-selected-index"), "29", "Enter should open the latest active date");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await chart.getAttribute("data-selected-index"), "28", "ArrowLeft should move exactly one calendar day");
  await page.keyboard.press("Home");
  assert.equal(await chart.getAttribute("data-selected-index"), "0", "Home should select the first calendar date");
  await page.keyboard.press("End");
  assert.equal(await chart.getAttribute("data-selected-index"), "29", "End should select the last calendar date");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("[data-chart-detail]").count(), 0, "Escape should close the selected-day detail");
  await page.keyboard.press("Space");
  assert.equal(await chart.getAttribute("data-selected-index"), "29", "Space should reopen the latest active date");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".insights-reflection").count(), 0, "The one-glance review should not repeat a generic reflection block");
  assert.equal(await page.locator("[data-insights-source]").count(), 0, "The default review should not expose a record index or excerpts");
  assert.equal(await page.locator("[data-investment-coverage]").count(), 0, "The compact review should not restore a permanent investment metric band");
  await assertVisible(page.locator("[data-investment-boundary]"), "Investment review must keep its non-advice boundary visible");
  assert.match(await page.locator("[data-investment-boundary]").textContent(), /not investment advice/i);
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), sourceBefore, "Opening insights must not persist derived text or mutate source records");
  await page.waitForTimeout(80);
  page.off("request", observeAnalysisRequest);
  assert.deepEqual(analysisRequests, [], `Domain insights must not make analysis API or external requests: ${JSON.stringify(analysisRequests)}`);

  const fallbackDomainId = await page.locator(".insights-domain-nav button").evaluateAll((buttons) => buttons
    .find((button) => Number(button.querySelector("small")?.textContent || 0) > 0)?.dataset.insightsDomainId);
  assert.ok(fallbackDomainId, "The fixture should expose at least one domain with recent records for query fallback");
  await page.goto(`${baseURL}/insights?domain=removed-domain`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction((domainId) => document.querySelector(`[data-insights-domain-id="${CSS.escape(domainId)}"]`)?.getAttribute("aria-pressed") === "true", fallbackDomainId);
  assert.equal(await page.locator(`[data-insights-domain-id="${fallbackDomainId}"]`).getAttribute("aria-pressed"), "true", "An unknown query domain should fall back to the first domain with recent records");

  await page.locator('[data-insights-domain-id="finance-empty-domain"]').click();
  assert.equal(await page.locator("[data-insights-page]").getAttribute("data-insights-state"), "empty", "An investment-like domain with no recent records must stay usable");
  assert.equal(await page.locator("[data-insights-page]").getAttribute("data-selected-total"), "0");
  assert.equal(await page.locator('[data-chart-kind="line"]').getAttribute("data-chart-empty"), "true");
  await assertVisible(page.locator("[data-chart-empty-label]"));
  await page.locator('[data-chart-kind="line"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("[data-chart-detail]").count(), 0, "An empty line must not fabricate an actionable date detail");
  assert.equal(await page.locator("[data-investment-coverage]").count(), 0, "The empty investment state should not add duplicate coverage metrics");
  assert.match(await page.locator("[data-investment-boundary]").textContent(), /not investment advice/i);
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-phase"), "empty");
  await assertVisible(page.locator("[data-weekly-empty]"));
  assert.equal(await page.locator("[data-weekly-start]").count(), 0, "A zero-record domain must never expose a request action");
  await page.setViewportSize({ width: 320, height: 844 });
  const longCopyOverflow = await page.evaluate(() => [...document.querySelectorAll(".insights-report-heading h2, .insights-report-kicker, .insights-domain-nav button")]
    .filter((node) => node.scrollWidth > node.clientWidth + 1)
    .map((node) => ({ className: node.className, text: node.textContent })));
  assert.deepEqual(longCopyOverflow, [], `Long domain names and compact facts must wrap inside the 320px paper: ${JSON.stringify(longCopyOverflow)}`);
  await page.locator('[data-insights-domain-id="trading-domain"]').click();

  const oneGlanceFixture = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await page.evaluate(() => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.domains = state.domains.filter((domain) => domain.id !== "finance-empty-domain");
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "zh-CN");
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/insights?domain=health-domain`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator("[data-insights-page]").getAttribute("data-selected-total"), "6");
  assert.equal(await page.locator("[data-chart-canvas]").getAttribute("data-active-days"), "1");
  assert.match(await page.locator("[data-chart-summary]").textContent(), /6 条|: 6/i);
  await page.screenshot({ path: join(outputDir, "ln-010-domain-insights-health-390.png"), fullPage: false });
  await page.evaluate((source) => {
    window.localStorage.setItem("log-note:data:v1", source);
    window.localStorage.setItem("log-note:locale", "en");
  }, oneGlanceFixture);
  await page.goto(`${baseURL}/insights?domain=trading-domain`, { waitUntil: "domcontentloaded" });

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(60);
    await assertNoHorizontalOverflow(page, `${viewport.width}px domain insights`);
    for (const control of await page.locator("[data-insights-control]").all()) {
      await assertMinTouchTarget(control, `${viewport.width}px insights control`);
    }
    for (const control of await page.locator(".insights-weekly button").all()) {
      await assertMinTouchTarget(control, `${viewport.width}px weekly summary control`);
    }
    const requiredContentVisible = await page.evaluate(() => [...document.querySelectorAll("[data-insights-required]")].every((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.left >= -0.5 && box.right <= window.innerWidth + 0.5 && box.width > 0 && box.height > 0 && style.overflowX !== "scroll";
    }));
    assert.equal(requiredContentVisible, true, `${viewport.width}px required insight labels should remain visible and unclipped`);
    const overflowingCopy = await page.evaluate(() => [...document.querySelectorAll(".insights-report-heading h2, .insights-report-kicker, .insights-domain-nav button, .insights-weekly")]
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      .map((node) => ({ className: node.className, text: node.textContent })));
    assert.deepEqual(overflowingCopy, [], `${viewport.width}px long domain and compact facts should wrap without intrinsic overflow: ${JSON.stringify(overflowingCopy)}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(outputDir, "ln-010-domain-insights-390.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: join(outputDir, "ln-010-domain-insights-1280.png"), fullPage: true });
  await page.getByRole("link", { name: "Back to records", exact: true }).click();
  await page.waitForURL(baseURL + "/");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), sourceBefore, "Returning from insights must preserve the source payload byte-for-byte");

  await page.evaluate(({ source, date }) => {
    const state = JSON.parse(source);
    state.entries = [
      ...state.entries.filter((entry) => !entry.id.startsWith("insights-visual-")),
      { id: "insights-visual-1", date, time: "21:09", content: "回家后简单记录一下今天的安排。", categoryId: "daily", tags: [], templateId: null, fieldValues: {}, attachments: [], createdAt: 10_001 },
      { id: "insights-visual-2", date, time: "19:16", content: "晚饭后整理了今天的观察。", categoryId: "daily", tags: [], templateId: null, fieldValues: {}, attachments: [], createdAt: 10_002 },
      { id: "insights-visual-3", date, time: "16:02", content: "把重要的判断依据记下来，之后再回来核对。", categoryId: "daily", tags: [], templateId: null, fieldValues: {}, attachments: [], createdAt: 10_003 }
    ];
    window.localStorage.setItem("log-note:data:v1", JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "zh-CN");
  }, { source: sourceBefore, date: testDate });
  await page.setViewportSize({ width: 390, height: 689 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await setRecordView(page, "grouped");
  await page.locator('.domain-directory-node[data-domain-id="daily-domain"]').click();
  await page.waitForTimeout(700);
  await assertVisible(page.locator('.domain-directory-insights-link[data-domain-id="daily-domain"]'));
  await page.screenshot({ path: join(outputDir, "ln-010-domain-insights-entry-390.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.evaluate(({ source, date }) => {
    const state = JSON.parse(source);
    state.entries = Array.from({ length: 5_000 }, (_, index) => ({
      id: `insights-performance-${index}`,
      date,
      time: "09:00",
      content: index % 3 === 0 ? "Because of the rationale, review the outcome and risk boundary." : "Bounded local review source.",
      categoryId: "trading",
      tags: [],
      templateId: null,
      fieldValues: {},
      attachments: [],
      createdAt: index
    }));
    window.localStorage.setItem("log-note:data:v1", JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "en");
  }, { source: sourceBefore, date: testDate });
  await page.goto(`${baseURL}/insights?domain=trading-domain`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-insights-page]")?.dataset.selectedTotal === "5000"
    && Number(document.querySelector("[data-insights-page]")?.dataset.renderMs) > 0);
  const performanceEvidence = await page.locator("[data-insights-page]").evaluate((root) => ({
    modelMs: Number(root.dataset.modelMs),
    renderMs: Number(root.dataset.renderMs)
  }));
  assert.ok(performanceEvidence.modelMs <= 1_000, `5,000-record local derivation should stay within 1s: ${JSON.stringify(performanceEvidence)}`);
  assert.ok(performanceEvidence.renderMs <= 1_000, `5,000-record derivation plus first review render should stay within 1s: ${JSON.stringify(performanceEvidence)}`);

  await page.evaluate(() => window.localStorage.setItem("log-note:data:v1", "{broken-insights-payload"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-insights-page]")?.dataset.insightsState === "recovery");
  await assertVisible(page.getByRole("heading", { name: "Review paused", exact: true }), "Recovery protection must pause derived analysis instead of using temporary defaults");
});

test("calendar and diary review is local-first, human-approved, opaque, and transient", async (page) => {
  await page.evaluate((date) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    const categoryId = state.categories[0].id;
    state.entries = [
      ...state.entries.filter((entry) => !String(entry.id).startsWith("calendar-review-")),
      { id: "calendar-review-real-record", date, time: "10:40", content: "Finished synthetic project review", categoryId, templateId: "quick", tags: ["private"], attachments: [], fieldValues: { private: "drop" } },
      { id: "calendar-review-walk", date, time: "18:00", content: "Evening walk", categoryId, templateId: "quick", tags: [], attachments: [], fieldValues: {} }
    ];
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "en");
    window.localStorage.setItem("log-note:google-calendar:user:e2e-user:v1", JSON.stringify({
      version: 1, calendarId: "primary", lastSyncedAt: "2026-09-04T00:00:00.000Z",
      timedEvents: [
        { id: `google:primary:private-review:${date}`, date, title: "Synthetic project review", startTime: "10:00", endTime: "11:00", source: "google", flexibility: "fixed", htmlLink: "https://private.example", externalRef: { provider: "google", calendarId: "primary", eventId: "private-review", etag: "secret" } },
        { id: `google:primary:private-sync:${date}`, date, title: "Synthetic design sync", startTime: "10:30", endTime: "11:30", source: "google", flexibility: "fixed" }
      ],
      allDayEvents: [{ id: `google-all-day:private-release:${date}`, date, title: "Synthetic release day", source: "google", allDay: true, htmlLink: "https://private.example" }]
    }));
  }, testDate);
  const requests = [];
  await page.route("**/api/organize/day-review", async (route) => {
    const body = route.request().postDataJSON(); requests.push(body);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: body.schemaVersion, requestId: body.requestId, targetDate: body.targetDate, sourceFingerprint: body.sourceFingerprint, overview: "One Calendar item has no matching diary record.", suggestions: [{ kind: "calendar-unrecorded", title: "Review the design sync", summary: "Consider whether this event needs a short reflection.", sourceIds: ["event-003"] }], providerId: "e2e", generatedAt: 1 }) });
  });
  await page.goto(`${baseURL}/insights`, { waitUntil: "domcontentloaded" });
  const review = page.locator("[data-calendar-diary-review]");
  await assertVisible(review);
  assert.match(await review.locator(".insights-today-facts").textContent(), /3events.*2diary entries.*1events matched/);
  assert.equal(await review.locator('[data-calendar-review-issue="calendar-overlap"]').count(), 1);
  const sourceBefore = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await review.locator("[data-calendar-review-open]").click();
  await assertVisible(review.locator("[data-calendar-review-disclosure]"));
  assert.equal(requests.length, 0, "opening disclosure must not send Calendar or diary content");
  assert.match(await review.locator("[data-calendar-review-disclosure]").textContent(), /Human approval required/i);
  assert.match(await review.locator("[data-calendar-review-disclosure]").textContent(), /Google tokens.*real IDs.*locations.*attendees/i);
  await review.locator("[data-calendar-review-cancel]").click();
  assert.equal(await review.locator("[data-calendar-review-open]").evaluate((button) => document.activeElement === button), true);
  await review.locator("[data-calendar-review-open]").click();
  await review.locator("[data-calendar-review-approve]").evaluate((button) => { button.click(); button.click(); });
  await assertVisible(review.locator("[data-calendar-review-result]"));
  assert.equal(requests.length, 1, "one human approval must make one request despite repeated activation");
  const body = requests[0];
  assert.deepEqual(Object.keys(body).sort(), ["entries", "events", "locale", "requestId", "schemaVersion", "sourceFingerprint", "targetDate"]);
  assert.ok(body.events.every((event) => /^event-\d{3}$/.test(event.id)));
  assert.ok(body.entries.every((entry) => /^entry-\d{3}$/.test(entry.id)));
  for (const forbidden of ["private-review", "private-sync", "calendar-review-real-record", "htmlLink", "externalRef", "tags", "attachments", "fieldValues", "accountId", "calendarId"]) assert.equal(JSON.stringify(body).includes(forbidden), false, `${forbidden} must not leave the browser`);
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), sourceBefore);
  assert.equal(await review.locator("textarea, [data-apply], [data-save]").count(), 0);
  for (const viewport of [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 426, height: 923 }, { width: 768, height: 900 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport); await assertNoHorizontalOverflow(page, `${viewport.width}px Calendar/diary review`);
    for (const control of await review.locator("button").all()) await assertMinTouchTarget(control, `${viewport.width}px Calendar/diary review control`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(outputDir, "ln-081-calendar-diary-review-390.png"), fullPage: false });
  const requestCount = requests.length;
  await page.evaluate(() => window.localStorage.removeItem("log-note:google-calendar:user:e2e-user:v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertVisible(page.locator("[data-calendar-review-empty]"));
  assert.equal(await page.locator("[data-calendar-review-open], [data-calendar-review-approve]").count(), 0);
  assert.equal(requests.length, requestCount, "missing Calendar cache must remain request-free");
});

test("domain insights: current-domain daily summary is local-first, confirmed once, bounded, and transient", async (page) => {
  const fixture = await page.evaluate((date) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    const periodicTemplate = state.templates.find((item) => item.recordType === "periodic");
    const category = state.categories.find((item) => item.id === periodicTemplate?.categoryId) || state.categories[0];
    const domain = state.domains.find((item) => item.id === category.domainId) || state.domains[0];
    const investmentDomain = state.domains.find((item) => /trading|investment|投资|交易/i.test(item.name))
      || state.domains.find((item) => item.id !== domain.id);
    const investmentCategory = state.categories.find((item) => item.domainId === investmentDomain?.id);
    const ordinary = Array.from({ length: 81 }, (_, index) => ({
      id: `daily-e2e-${String(index).padStart(3, "0")}`,
      date,
      time: `${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}`,
      content: `Finished bounded note ${index}.`,
      categoryId: category.id,
      templateId: "quick",
      tags: ["private"],
      attachments: [],
      fieldValues: { private: "must not leave" }
    }));
    state.entries = [
      ...ordinary,
      { id: "daily-e2e-periodic", date, time: "08:00", content: "Sleep check-in.", categoryId: category.id, templateId: state.templates.find((item) => item.recordType === "periodic")?.id || null, tags: [], attachments: [], fieldValues: {} },
      { id: "daily-e2e-other-date", date: "2020-01-01", time: "10:00", content: "Outside date.", categoryId: category.id, templateId: "quick", tags: [], attachments: [], fieldValues: {} },
      { id: "daily-e2e-investment", date, time: "11:00", content: "Recorded a market observation without advice.", categoryId: investmentCategory?.id || "missing", templateId: "quick", tags: [], attachments: [], fieldValues: {} }
    ];
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "en");
    return { domainId: domain.id, domainName: domain.name, investmentDomainId: investmentDomain?.id || "" };
  }, testDate);
  await page.reload({ waitUntil: "domcontentloaded" });
  const requests = [];
  let responseMode = "success";
  let releaseDelayed = null;
  const routePattern = "**/api/organize/domain-daily-summary";
  const dailyHandler = async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    requests.push({ body, headers: await request.allHeaders() });
    if (responseMode === "delayed") await new Promise((resolve) => { releaseDelayed = resolve; });
    try {
      if (["unsafe", "rate-limited", "unconfigured", "timeout"].includes(responseMode)) {
        const failure = {
          unsafe: [502, "AI_DOMAIN_DAILY_SUMMARY_UNSAFE"],
          "rate-limited": [429, "AI_REQUEST_RATE_LIMITED"],
          unconfigured: [503, "AI_NOT_CONFIGURED"],
          timeout: [504, "AI_TIMEOUT"]
        }[responseMode];
        await route.fulfill({ status: failure[0], contentType: "application/json", body: JSON.stringify({ error: { code: failure[1], message: "unavailable" } }) });
        return;
      }
      const ids = body.entries.slice(0, 2).map((entry) => entry.id);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "private, no-store" },
        body: JSON.stringify(responseMode === "invalid"
          ? { overview: "Invalid unsupported response.", overviewEntryIds: ["outside-request"], themes: [], providerId: "test", generatedAt: 1 }
          : { overview: "Today included bounded notes and a sleep check-in.", overviewEntryIds: ids, themes: [{ title: "Recorded activity", summary: "The selected notes contain bounded factual entries.", entryIds: [ids[0]] }], providerId: "test", generatedAt: 1 })
      });
    } catch {
      // Stop, scope changes, and page exit may end the intercepted request before fixture release.
    }
  };
  await page.route(routePattern, dailyHandler);
  await page.goto(`${baseURL}/insights?domain=${fixture.domainId}`, { waitUntil: "domcontentloaded" });
  await assertVisible(page.locator("[data-daily-summary]"));
  const daily = page.locator("[data-daily-summary]");
  assert.equal(await daily.getAttribute("data-daily-total"), "82");
  assert.equal(await daily.getAttribute("data-daily-sent"), "80");
  assert.equal(await daily.getAttribute("data-daily-phase"), "idle");
  assert.equal(await page.locator("[data-daily-open]").count(), 1);
  const visibleDomainName = (await page.locator(".insights-report-kicker h2").textContent()).trim();
  assert.ok((await daily.evaluate((node) => node.compareDocumentPosition(document.querySelector("[data-weekly-summary]")) & Node.DOCUMENT_POSITION_FOLLOWING)) !== 0, "Daily section must precede weekly summary");
  assert.match(await daily.locator(".insights-daily-facts").textContent(), /Today 82.*Ordinary 81.*Periodic 1/);
  await assertMinTouchTarget(page.locator("[data-daily-open]"), "daily summary action");

  const sourceBefore = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  await page.locator("[data-daily-open]").click();
  await assertVisible(page.locator("[data-daily-disclosure]"));
  await page.waitForFunction(() => document.activeElement?.matches("[data-daily-start]"));
  assert.equal(requests.length, 0, "Opening daily disclosure must not send a request");
  assert.match(await page.locator("[data-daily-disclosure]").textContent(), new RegExp(visibleDomainName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(await page.locator("[data-daily-truncated]").textContent(), /80.*82.*2/);
  assert.match(await page.locator("[data-daily-disclosure]").textContent(), /selected record texts leave this browser/i);
  assert.match(await page.locator("[data-daily-disclosure]").textContent(), /not saved, exported, backed up/i);
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px daily disclosure`);
    for (const control of await daily.locator("button").all()) await assertMinTouchTarget(control, `${viewport.width}px daily disclosure control`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-daily-cancel]").click();
  assert.equal(await daily.getAttribute("data-daily-phase"), "idle");
  assert.equal(await page.locator("[data-daily-open]").evaluate((button) => document.activeElement === button), true, "Cancel should return focus to the daily action");
  assert.equal(requests.length, 0, "Canceling daily disclosure must remain request-free");
  await page.locator("[data-daily-open]").tap();
  const requestPromise = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/organize/domain-daily-summary");
  await page.locator("[data-daily-start]").evaluate((button) => { button.click(); button.click(); });
  const sentRequest = await requestPromise;
  await assertVisible(page.locator("[data-daily-result]"));
  assert.equal(requests.length, 1, "One explicit confirmation must make one request");
  assert.equal(await page.locator("[data-daily-reanalyze]").evaluate((button) => document.activeElement === button), true, "Success should move focus to re-analysis");
  const body = sentRequest.postDataJSON();
  assert.deepEqual(Object.keys(body).sort(), ["date", "domainName", "entries", "locale"]);
  assert.equal(body.entries.length, 80);
  assert.equal(body.entries[0].id, "daily-e2e-periodic");
  assert.equal(body.entries.some((entry) => ["daily-e2e-other-date", "daily-e2e-investment"].includes(entry.id)), false);
  assert.ok(body.entries.every((entry) => Object.keys(entry).sort().join(",") === "content,date,id,sourceType,time"));
  for (const forbidden of ["private", "attachments", "tags", "fieldValues", "account", "categoryId", "templateId"]) assert.equal(JSON.stringify(body).includes(forbidden), false, `${forbidden} must not leave the browser`);
  assert.match(requests[0].headers.authorization, /^Bearer e2e-domain-review-token$/);
  assert.equal(await page.locator("[data-daily-result] [data-daily-theme]").count(), 1);
  assert.equal((await page.locator("body").innerText()).includes("daily-e2e-periodic"), false);
  assert.equal(await daily.locator("textarea").count(), 0, "Daily summary must not introduce chat");
  assert.equal(await daily.locator("[data-daily-result] button:not([data-daily-reanalyze])").count(), 0, "Daily result must not expose write actions");
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-phase"), "idle", "Daily success must not reuse weekly state");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), sourceBefore);
  await page.screenshot({ path: join(outputDir, "ln-079-domain-daily-summary-390.png"), fullPage: false });
  await page.setViewportSize({ width: 1280, height: 900 });
  await assertNoHorizontalOverflow(page, "1280px daily result");
  await page.screenshot({ path: join(outputDir, "ln-079-domain-daily-summary-1280.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-daily-reanalyze]").click();
  assert.equal(await page.locator("[data-daily-disclosure]").count(), 1);
  assert.equal(requests.length, 1, "Re-analysis must require confirmation");
  await page.locator("[data-daily-cancel]").click();

  responseMode = "delayed";
  releaseDelayed = null;
  await page.locator("[data-daily-open]").click();
  const delayedRequest = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/organize/domain-daily-summary");
  await page.locator("[data-daily-start]").click();
  await delayedRequest;
  await assertVisible(page.locator("[data-daily-loading]"));
  assert.equal(await page.locator("[data-daily-stop]").evaluate((button) => document.activeElement === button), true, "Loading should move focus to Stop");
  await page.locator("[data-daily-stop]").click();
  assert.equal(await daily.getAttribute("data-daily-phase"), "idle");
  for (let attempt = 0; !releaseDelayed && attempt < 20; attempt += 1) await page.waitForTimeout(10);
  assert.equal(typeof releaseDelayed, "function", "Delayed daily response should be pending before release");
  releaseDelayed();
  await page.waitForTimeout(100);
  assert.equal(await daily.locator("[data-daily-result], [data-daily-unavailable]").count(), 0, "Stop must block a late daily result");

  for (const [mode, failure] of [["unsafe", "unsafe"], ["invalid", "invalid-response"], ["rate-limited", "rate-limited"], ["unconfigured", "unconfigured"], ["timeout", "timeout"]]) {
    responseMode = mode;
    await page.locator("[data-daily-open]").click();
    await page.locator("[data-daily-start]").click();
    await assertVisible(page.locator(`[data-daily-unavailable][data-failure="${failure}"]`));
    assert.equal(await page.locator("[data-daily-retry]").evaluate((button) => document.activeElement === button), true, `${mode} should move focus to Retry`);
    const beforeRetry = requests.length;
    await page.locator("[data-daily-retry]").click();
    await assertVisible(page.locator("[data-daily-disclosure]"));
    assert.equal(requests.length, beforeRetry, `${mode} retry must require confirmation`);
    await page.locator("[data-daily-cancel]").click();
  }

  await page.unroute(routePattern, dailyHandler);
  await page.context().setOffline(true);
  await page.locator("[data-daily-open]").click();
  await page.locator("[data-daily-start]").click();
  await assertVisible(page.locator('[data-daily-unavailable][data-failure="offline"]'));
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), sourceBefore);
  await page.context().setOffline(false);
  await page.locator("[data-daily-retry]").click();
  await page.locator("[data-daily-cancel]").click();
  await page.route(routePattern, dailyHandler);

  responseMode = "delayed";
  releaseDelayed = null;
  await page.locator("[data-daily-open]").click();
  const switchingRequest = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/organize/domain-daily-summary");
  await page.locator("[data-daily-start]").click();
  await switchingRequest;
  await page.locator(`[data-insights-domain-id="${fixture.investmentDomainId}"]`).click();
  assert.equal(await page.locator("[data-daily-result]").count(), 0, "Switching domain must clear the old daily result");
  for (let attempt = 0; !releaseDelayed && attempt < 20; attempt += 1) await page.waitForTimeout(10);
  releaseDelayed?.();
  await page.waitForTimeout(100);
  assert.equal(await page.locator("[data-daily-result]").count(), 0, "A late response must not cross the domain boundary");

  responseMode = "unsafe";
  await assertVisible(page.locator("[data-investment-boundary]"));
  await page.locator("[data-daily-open]").click();
  await page.locator("[data-daily-start]").click();
  await assertVisible(page.locator('[data-daily-unavailable][data-failure="unsafe"]'));
  assert.equal(await page.locator("[data-daily-result], [data-daily-theme]").count(), 0, "Unsafe investment output must be rejected in full");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), sourceBefore);

  await page.locator(`[data-insights-domain-id="${fixture.domainId}"]`).click();
  responseMode = "delayed";
  releaseDelayed = null;
  await page.locator("[data-daily-open]").click();
  const leavingRequest = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/organize/domain-daily-summary");
  await page.locator("[data-daily-start]").click();
  await leavingRequest;
  await page.getByRole("link", { name: "Back to records", exact: true }).click();
  await page.waitForURL(baseURL + "/");
  for (let attempt = 0; !releaseDelayed && attempt < 20; attempt += 1) await page.waitForTimeout(10);
  releaseDelayed?.();
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), sourceBefore, "Leaving during a daily request must preserve records byte-for-byte");

  const requestCountBeforeEmpty = requests.length;
  await page.evaluate(() => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.entries = [];
    window.localStorage.setItem(key, JSON.stringify(state));
  });
  await page.goto(`${baseURL}/insights?domain=${fixture.domainId}`, { waitUntil: "domcontentloaded" });
  await assertVisible(page.locator("[data-daily-empty]"));
  assert.equal(await page.locator("[data-daily-open], [data-daily-start]").count(), 0, "An empty daily scope must expose no request action");
  assert.equal(requests.length, requestCountBeforeEmpty, "An empty daily scope must remain request-free");
});

test("domain insights: seven-day AI summary requires confirmation and remains transient", async (page) => {
  await page.evaluate(({ date, outsideDate }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    const weeklyEntries = Array.from({ length: 85 }, (_, index) => ({
      id: `weekly-${String(index).padStart(3, "0")}`,
      date,
      time: `${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}`,
      content: `合成健康记录 ${index}`,
      categoryId: "health-rest",
      tags: ["不应发送"],
      templateId: index % 2 === 0 ? "sleep" : "rest",
      fieldValues: { private: "不应发送" },
      attachments: [],
      createdAt: index
    }));
    state.entries = [
      ...weeklyEntries,
      { id: "weekly-other", date, time: "23:10", content: "其他领域", categoryId: "daily", tags: [], templateId: "quick", fieldValues: {}, attachments: [], createdAt: 100 },
      { id: "weekly-unassigned", date, time: "23:11", content: "未归属", categoryId: "removed-category", tags: [], templateId: null, fieldValues: {}, attachments: [], createdAt: 101 },
      { id: "weekly-outside", date: outsideDate, time: "23:12", content: "窗口之外", categoryId: "health-rest", tags: [], templateId: "rest", fieldValues: {}, attachments: [], createdAt: 102 }
    ];
    window.localStorage.setItem(key, JSON.stringify(state));
    window.localStorage.setItem("log-note:locale", "zh-CN");
  }, { date: testDate, outsideDate: shiftDate(testDate, -7) });

  const sourceBefore = await page.evaluate(() => window.localStorage.getItem("log-note:data:v1"));
  const captured = [];
  let responseMode = "success";
  let releaseDelayed = null;
  const routePattern = "**/api/organize/domain-review";
  const domainReviewHandler = async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    captured.push({ body, headers: await request.allHeaders() });
    if (responseMode === "delayed") {
      await new Promise((resolve) => { releaseDelayed = resolve; });
    }
    try {
      if (responseMode === "unsafe") {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "AI_DOMAIN_REVIEW_UNSAFE", message: "unsafe" } })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "private, no-store" },
        body: JSON.stringify({
          overview: "记录集中在同一个活跃日。内容包含睡眠与恢复片段。",
          themes: [{
            title: "作息片段",
            summary: "记录反复提到睡眠与恢复。",
            entryIds: body.entries.slice(0, 2).map((entry) => entry.id)
          }],
          providerId: "deepseek:e2e",
          generatedAt: 1
        })
      });
    } catch {
      // A stopped or navigated-away request can be gone before the delayed fixture is released.
    }
  };
  await page.route(routePattern, domainReviewHandler);
  await page.goto(`${baseURL}/insights?domain=health-domain`, { waitUntil: "domcontentloaded" });
  await assertVisible(page.locator("[data-weekly-summary]"));
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-phase"), "idle");
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-total"), "85");
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-sent"), "80");

  const open = page.locator("[data-weekly-open]");
  await assertMinTouchTarget(open, "Weekly AI summary action");
  await open.click();
  await assertVisible(page.locator("[data-weekly-disclosure]"));
  await page.waitForFunction(() => document.activeElement?.matches("[data-weekly-start]"));
  await page.waitForTimeout(80);
  assert.equal(captured.length, 0, "Opening the disclosure must not send a request");
  assert.match(await page.locator("[data-weekly-disclosure]").textContent(), /健康/);
  assert.match(await page.locator("[data-weekly-disclosure]").textContent(), /普通 42 · 周期 43/);
  assert.match(await page.locator("[data-weekly-truncated]").textContent(), /85.*80.*5/);
  assert.match(await page.locator("[data-weekly-disclosure]").textContent(), /AI 服务/);
  assert.match(await page.locator("[data-weekly-disclosure]").textContent(), /不保存.*不会改写记录/);

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 426, height: 923 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px weekly disclosure`);
    for (const control of await page.locator(".insights-weekly button").all()) {
      await assertMinTouchTarget(control, `${viewport.width}px weekly disclosure control`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-weekly-cancel]").click();
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-phase"), "idle");
  assert.equal(await open.evaluate((button) => document.activeElement === button), true, "Cancel should return focus to the secondary action");
  assert.equal(captured.length, 0, "Canceling disclosure must not send a request");

  await open.click();
  assert.equal(captured.length, 0, "Reopening disclosure must still be request-free");
  const firstRequest = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/organize/domain-review");
  await page.locator("[data-weekly-start]").click();
  await firstRequest;
  await assertVisible(page.locator("[data-weekly-result]"));
  assert.equal(await page.locator("[data-weekly-reanalyze]").evaluate((button) => document.activeElement === button), true, "A completed summary should move focus to re-analysis");
  assert.equal(captured.length, 1, "One confirmation should create exactly one bounded request");
  assert.deepEqual(Object.keys(captured[0].body).sort(), ["domainName", "entries", "locale", "windowEnd", "windowStart"]);
  assert.equal(captured[0].body.entries.length, 80);
  assert.equal(captured[0].body.entries[0].id, "weekly-084");
  assert.equal(captured[0].body.entries.some((entry) => ["weekly-other", "weekly-unassigned", "weekly-outside"].includes(entry.id)), false);
  assert.ok(captured[0].body.entries.every((entry) => Object.keys(entry).sort().join(",") === "content,date,id,sourceType,time"));
  assert.equal(JSON.stringify(captured[0].body).includes("attachments"), false);
  assert.equal(JSON.stringify(captured[0].body).includes("tags"), false);
  assert.equal(JSON.stringify(captured[0].body).includes("fieldValues"), false);
  assert.equal(JSON.stringify(captured[0].body).includes("account"), false);
  assert.match(captured[0].headers.authorization, /^Bearer e2e-domain-review-token$/);
  await assertVisible(page.getByText("样本有限", { exact: true }));
  assert.match(await page.locator("[data-weekly-result]").textContent(), /记录集中在同一个活跃日/);
  assert.equal(await page.locator("[data-weekly-theme]").count(), 1);
  const visiblePageText = await page.locator("body").innerText();
  assert.equal(visiblePageText.includes("weekly-084"), false, "Provider source IDs must never become a visible record index");
  assert.equal(visiblePageText.includes("合成健康记录"), false, "Provider source excerpts must never be rendered");
  assert.equal(await page.locator("[data-weekly-summary] textarea").count(), 0, "A weekly summary must not introduce chat");
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), sourceBefore, "A successful summary must remain session-only and leave records byte-identical");
  await page.screenshot({ path: join(outputDir, "ln-074-domain-weekly-summary-390.png"), fullPage: false });

  await page.locator("[data-weekly-reanalyze]").click();
  await assertVisible(page.locator("[data-weekly-disclosure]"));
  assert.equal(captured.length, 1, "Re-analysis must return to confirmation without sending");
  await page.locator("[data-weekly-cancel]").click();

  responseMode = "delayed";
  releaseDelayed = null;
  await open.click();
  const delayedRequest = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/organize/domain-review");
  await page.locator("[data-weekly-start]").click();
  await delayedRequest;
  await assertVisible(page.locator("[data-weekly-loading]"));
  assert.equal(await page.locator("[data-weekly-stop]").evaluate((button) => document.activeElement === button), true, "Loading should move focus to Stop");
  await page.locator("[data-weekly-stop]").click();
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-phase"), "idle");
  for (let attempt = 0; !releaseDelayed && attempt < 20; attempt += 1) await page.waitForTimeout(10);
  assert.equal(typeof releaseDelayed, "function", "The delayed response fixture should be pending before release");
  releaseDelayed();
  await page.waitForTimeout(100);
  assert.equal(await page.locator("[data-weekly-result], [data-weekly-unavailable]").count(), 0, "Stop must prevent a late result from appearing");

  responseMode = "unsafe";
  await open.click();
  await page.locator("[data-weekly-start]").click();
  await assertVisible(page.locator('[data-weekly-unavailable][data-failure="unsafe"]'));
  assert.equal(await page.locator("[data-weekly-retry]").evaluate((button) => document.activeElement === button), true, "A failed summary should move focus to Retry");
  assert.match(await page.locator("[data-weekly-unavailable]").textContent(), /安全检查/);
  const requestsBeforeRetry = captured.length;
  await page.locator("[data-weekly-retry]").click();
  await assertVisible(page.locator("[data-weekly-disclosure]"));
  assert.equal(captured.length, requestsBeforeRetry, "Retry must require confirmation before another request");
  await page.locator("[data-weekly-cancel]").click();

  await page.unroute(routePattern, domainReviewHandler);
  await page.context().setOffline(true);
  await open.click();
  await page.locator("[data-weekly-start]").click();
  await assertVisible(page.locator('[data-weekly-unavailable][data-failure="offline"]'));
  await page.context().setOffline(false);
  await page.route(routePattern, domainReviewHandler);
  await page.locator("[data-weekly-retry]").click();
  await page.locator("[data-weekly-cancel]").click();

  responseMode = "success";
  await open.click();
  await page.locator("[data-weekly-start]").click();
  await assertVisible(page.locator("[data-weekly-result]"));
  await page.locator('[data-insights-domain-id="trading-domain"]').click();
  assert.equal(await page.locator("[data-weekly-result]").count(), 0, "Switching domain must clear the previous result");
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-phase"), "empty");
  await page.locator('[data-insights-domain-id="health-domain"]').click();
  assert.equal(await page.locator("[data-weekly-summary]").getAttribute("data-weekly-phase"), "idle");

  responseMode = "delayed";
  releaseDelayed = null;
  await open.click();
  const leavingRequest = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/organize/domain-review");
  await page.locator("[data-weekly-start]").click();
  await leavingRequest;
  await page.getByRole("link", { name: "返回记录", exact: true }).click();
  await page.waitForURL(baseURL + "/");
  for (let attempt = 0; !releaseDelayed && attempt < 20; attempt += 1) await page.waitForTimeout(10);
  releaseDelayed?.();
  assert.equal(await page.evaluate(() => window.localStorage.getItem("log-note:data:v1")), sourceBefore, "Leaving during analysis must not write a result or alter records");
});

console.log(`Starting local app at ${baseURL}`);
const selectedTests = tests.filter(({ name }) => !testFilter || name.includes(testFilter));
if (testFilter && selectedTests.length === 0) {
  throw new Error(`E2E_TEST_FILTER matched no scenarios: ${testFilter}`);
}
await rm(outputDir, { recursive: true, force: true });
if (ownsNextDistDir) await rm(nextDistDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const server = spawnServerProcess("npx", ["next", "dev", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    NEXT_DIST_DIR: nextDistDir,
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_LOG_NOTE_E2E_AUTH: "1",
    NEXT_PUBLIC_CALENDAR_AI_TRANSFER_ENABLED: "1",
    CALENDAR_AI_TRANSFER_ENABLED: "1",
    NEXT_PUBLIC_LOG_NOTE_AUTH_MODE: authMode,
    NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID: googleCalendarUnavailableOnly ? "" : "e2e.apps.googleusercontent.com"
  }
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk; });
server.stderr.on("data", (chunk) => { serverLog += chunk; });

const results = [];
try {
  await waitForServer(server);
  console.log(`Launching ${executablePath || "Playwright Chromium"}`);
  const browser = await chromium.launch({ executablePath, timeout: 30_000, headless: true });
  try {
    for (const current of selectedTests) {
      const slug = fileSlug(current.name);
      console.log(`Running: ${current.name}`);
      const context = await browser.newContext(device);
      const page = await context.newPage();
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      try {
        await resetLocalData(page);
        await current.run(page);
        results.push({ name: current.name, status: "passed" });
        console.log(`✓ ${current.name}`);
      } catch (error) {
        const screenshot = join(outputDir, `${slug}.png`);
        const trace = join(outputDir, `${slug}.zip`);
        await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
        await context.tracing.stop({ path: trace }).catch(() => {});
        results.push({ name: current.name, status: "failed", error: error.stack || error.message, screenshot, trace });
        console.error(`✗ ${current.name}: ${error.stack || error.message}`);
      } finally {
        await context.tracing.stop().catch(() => {});
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  await stopServerProcess(server);
  await writeFile(join(outputDir, "results.json"), JSON.stringify({ baseURL, executablePath: executablePath || "Playwright default", nextDistDir, results, serverLog }, null, 2));
  await writeFile(join(outputDir, "ln-032-visual-evidence.json"), JSON.stringify(ln032Evidence, null, 2));
  await writeFile(join(outputDir, "ln-058-spacing-evidence.json"), JSON.stringify(ln058Evidence, null, 2));
  if (ownsNextDistDir) await rm(nextDistDir, { recursive: true, force: true });
}

const failed = results.filter((result) => result.status === "failed");
console.log(`\nE2E: ${results.length - failed.length}/${results.length} scenarios passed.`);
if (failed.length) process.exitCode = 1;
