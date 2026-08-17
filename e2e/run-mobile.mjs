/**
 * @fileoverview Runs mobile-first browser regressions for Log Note's core local recording flows.
 */

import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { spawnServerProcess, stopServerProcess } from "./process-lifecycle.mjs";

const port = Number(process.env.E2E_PORT || (30_000 + (process.pid % 20_000)));
const baseURL = `http://127.0.0.1:${port}`;
const testDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());
const outputDir = process.env.E2E_OUTPUT_DIR ? resolve(process.env.E2E_OUTPUT_DIR) : join(process.cwd(), "output/playwright");
const ownsNextDistDir = !process.env.NEXT_DIST_DIR;
const nextDistDir = process.env.NEXT_DIST_DIR || `.next-e2e-mobile-${process.pid}`;
const legacyPeriodicBackup = JSON.parse(await readFile(fileURLToPath(new URL("../tests/fixtures/legacy-periodic-free-backup.json", import.meta.url)), "utf8"));
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
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
    if (server.exitCode !== null) throw new Error(`Next development server exited early with code ${server.exitCode}`);
    try {
      const response = await fetch(baseURL);
      if (response.ok && /\bReady in\b/.test(serverLog)) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (server.exitCode !== null) throw new Error(`Next development server exited early with code ${server.exitCode}`);
        return;
      }
    } catch {
      // The server is still compiling; retry shortly.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseURL}`);
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
  if (await backToSettings.count()) await backToSettings.click();
  await page.getByRole("link", { name: "Back to records" }).click();
}

async function openSettingsPanel(page, name) {
  const current = new URL(page.url());
  if (current.pathname === "/settings" && current.hash) {
    await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  }
  const panelLink = page.getByRole("link", { name, exact: true });
  await panelLink.waitFor({ state: "visible" });
  await panelLink.click();
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

test("home hierarchy: fixed records follow the day's content without weakening quick record", async (page) => {
  const fixedRecords = page.locator(".fixed-records");
  const emptyTimeline = page.locator(".timeline-empty");
  const addRecord = page.getByRole("button", { name: "Add record" });
  await assertVisible(fixedRecords);
  await assertVisible(fixedRecords.getByText("0/6", { exact: true }));
  await assertVisible(fixedRecords.getByLabel("0 completed, 6 remaining"));
  assert.equal(await fixedRecords.getByText("Type values here; open forms expand in place.", { exact: true }).count(), 0, "Fixed record controls should explain their interaction directly");
  assert.equal(await fixedRecords.getByText("6 remaining", { exact: true }).count(), 0, "The visible ratio should not repeat the remaining count");
  await assertVisible(emptyTimeline);
  const mobileFixedBox = await fixedRecords.boundingBox();
  const mobileEmptyBox = await emptyTimeline.boundingBox();
  assert.ok(mobileFixedBox && mobileFixedBox.y < 844);
  assert.ok(mobileEmptyBox && mobileFixedBox.y > mobileEmptyBox.y);
  await assertVisible(addRecord);
  await assertFixedInputControls(page, "390px empty home", true);
  await page.setViewportSize({ width: 320, height: 844 });
  await assertFixedInputControls(page, "320px empty home", true);
  for (const width of [600, 671, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await assertFixedInputControls(page, `${width}px compact home`, false);
    const compactLayout = await page.locator("main").evaluate(() => {
      const title = document.querySelector(".date-context-disclosure");
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
    assert.ok(compactLayout.titleFontSize >= 18 && compactLayout.titleFontSize <= 22, `${width}px should use the shared compact selected-date scale: ${JSON.stringify(compactLayout)}`);
    assert.ok(compactLayout.fixedWidth <= 621, `${width}px fixed records should remain one readable cluster: ${JSON.stringify(compactLayout)}`);
    assert.ok(compactLayout.rowWidth <= 561, `${width}px fixed rows should not stretch across the viewport: ${JSON.stringify(compactLayout)}`);
    assert.ok(compactLayout.controlWidth <= 321, `${width}px fixed values should keep a compact value column: ${JSON.stringify(compactLayout)}`);
    assert.equal(compactLayout.scrollWidth, compactLayout.viewportWidth, `${width}px compact home should not overflow: ${JSON.stringify(compactLayout)}`);
    await page.screenshot({ path: join(outputDir, `ln-052-compact-home-${width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  const desktopFixedBox = await fixedRecords.boundingBox();
  const desktopTimelineBox = await page.locator(".timeline").boundingBox();
  assert.ok(desktopFixedBox && desktopFixedBox.y < 720);
  assert.ok(desktopTimelineBox && desktopFixedBox.y > desktopTimelineBox.y);
  await assertFixedInputControls(page, "1280px empty home", false);
  await addQuickRecord(page, "Hierarchy regression record");
  const timelineEntry = page.locator(".timeline .entry", { hasText: "Hierarchy regression record" });
  await assertVisible(timelineEntry);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileEntryBox = await timelineEntry.boundingBox();
  const mobileFixedWithEntryBox = await fixedRecords.boundingBox();
  assert.ok(mobileEntryBox && mobileFixedWithEntryBox && mobileFixedWithEntryBox.y > mobileEntryBox.y);
  const [timelineAlignment, fixedScopeBox, fixedLabelBox] = await Promise.all([
    timelineEntry.evaluate((entry) => {
      const time = entry.querySelector("time");
      const meta = entry.querySelector(".entry-meta");
      const timeBox = time.getBoundingClientRect();
      const metaBox = meta.getBoundingClientRect();
      return {
        timeTextTop: timeBox.top + Number.parseFloat(getComputedStyle(time).paddingTop),
        metaTop: metaBox.top,
        timeX: timeBox.x,
        metaX: metaBox.x
      };
    }),
    fixedRecords.locator(".fixed-entry-scope").first().boundingBox(),
    fixedRecords.locator(".fixed-entry-label").first().boundingBox()
  ]);
  assert.ok(
    Math.abs(timelineAlignment.timeTextTop - timelineAlignment.metaTop) <= 1,
    `Timeline time and metadata should align: ${JSON.stringify(timelineAlignment)}`
  );
  assert.ok(
    fixedScopeBox && fixedLabelBox
      && Math.abs((timelineAlignment.metaX - timelineAlignment.timeX) - (fixedLabelBox.x - fixedScopeBox.x)) <= 1,
    `Timeline and fixed-record columns should share the same rhythm: ${JSON.stringify({ timelineAlignment, fixedScopeBox, fixedLabelBox })}`
  );
  const scopeTagHierarchy = await fixedRecords.locator(".fixed-entry").first().evaluate((row) => {
    const scope = row.querySelector(".fixed-entry-scope");
    const label = row.querySelector(".fixed-entry-label");
    const scopeStyle = getComputedStyle(scope);
    const labelStyle = getComputedStyle(label);
    const scopeBox = scope.getBoundingClientRect();
    return {
      scopeFontSize: Number.parseFloat(scopeStyle.fontSize),
      scopeFontWeight: Number.parseInt(scopeStyle.fontWeight, 10),
      scopeColor: scopeStyle.color,
      scopeBackground: scopeStyle.backgroundColor,
      scopeHeight: scopeBox.height,
      labelFontSize: Number.parseFloat(labelStyle.fontSize),
      labelColor: labelStyle.color
    };
  });
  assert.equal(scopeTagHierarchy.scopeFontSize, 12, `Fixed-record scope should use the auxiliary-information size: ${JSON.stringify(scopeTagHierarchy)}`);
  assert.ok(scopeTagHierarchy.scopeFontWeight <= 500, `Fixed-record scope should remain quieter than a heading: ${JSON.stringify(scopeTagHierarchy)}`);
  assert.ok(scopeTagHierarchy.labelFontSize - scopeTagHierarchy.scopeFontSize >= 4, `Record names should lead their scope tags: ${JSON.stringify(scopeTagHierarchy)}`);
  assert.notEqual(scopeTagHierarchy.scopeColor, scopeTagHierarchy.labelColor, `Scope tags should use a weaker color than record names: ${JSON.stringify(scopeTagHierarchy)}`);
  assert.notEqual(scopeTagHierarchy.scopeBackground, "rgba(0, 0, 0, 0)", `Scope tags should retain a subtle tag surface: ${JSON.stringify(scopeTagHierarchy)}`);
  assert.ok(scopeTagHierarchy.scopeHeight <= 24, `Scope tags should stay compact inside the 48px row: ${JSON.stringify(scopeTagHierarchy)}`);
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 600, height: 900 },
    { width: 671, height: 900 },
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
      const countBox = count.getBoundingClientRect();
      const actionBox = action.getBoundingClientRect();
      return {
        headerHeight: headerBox.height,
        titleFontSize: Number.parseFloat(titleStyle.fontSize),
        titleColor: titleStyle.color,
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
    assert.equal(headerHierarchy.countFontSize, 12, `Fixed-record progress should use metadata sizing: ${JSON.stringify(headerHierarchy)}`);
    assert.ok(headerHierarchy.countFontWeight <= 500, `Fixed-record progress should remain visually quiet: ${JSON.stringify(headerHierarchy)}`);
    assert.equal(headerHierarchy.actionFontSize, 14, `Fixed-record adjust should remain a secondary action label: ${JSON.stringify(headerHierarchy)}`);
    assert.ok(headerHierarchy.actionFontWeight <= 500, `Fixed-record adjust should not compete with the section title: ${JSON.stringify(headerHierarchy)}`);
    assert.ok(headerHierarchy.titleFontSize - headerHierarchy.countFontSize >= 10, `The section title should lead the progress metadata: ${JSON.stringify(headerHierarchy)}`);
    assert.notEqual(headerHierarchy.countColor, headerHierarchy.titleColor, `Progress metadata should use a weaker color than the section title: ${JSON.stringify(headerHierarchy)}`);
    assert.notEqual(headerHierarchy.actionColor, headerHierarchy.titleColor, `Adjust should use a weaker color than the section title: ${JSON.stringify(headerHierarchy)}`);
    assert.ok(headerHierarchy.centerDelta <= 1, `Progress and adjust should share one baseline cluster: ${JSON.stringify(headerHierarchy)}`);
    assert.equal(headerHierarchy.countBeforeAction, true, `Progress should precede the related adjust action: ${JSON.stringify(headerHierarchy)}`);
    await fixedRecords.locator(".fixed-records-header h2").evaluate((title) => {
      title.tabIndex = -1;
      title.focus();
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
    await page.screenshot({ path: join(outputDir, `ln-061-fixed-scope-tags-${viewport.width}.png`), fullPage: true });
    await page.screenshot({ path: join(outputDir, `ln-062-fixed-header-tools-${viewport.width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await addRecord.click();
  await assertVisible(page.locator(".surface.composer"));
  await assertNoHorizontalOverflow(page, "390px populated home");
});

test("home switches: record views stay above content and diary/plan stays with contextual actions", async (page) => {
  const language = page.locator(".language-toggle");
  const recordViewSwitch = page.locator(".record-view-switch");
  const workspaceSwitch = page.locator(".workspace-mode-switch");
  const timeView = recordViewSwitch.getByRole("button", { name: "Time", exact: true });
  const categoryView = recordViewSwitch.getByRole("button", { name: "Category", exact: true });
  const organizeEntry = recordViewSwitch.getByRole("link", { name: "Organize", exact: true });
  const diaryView = workspaceSwitch.getByRole("button", { name: "Diary", exact: true });
  const planView = workspaceSwitch.getByRole("button", { name: "Plan", exact: true });

  await assertVisible(organizeEntry, "Organize should stay beside both record views");
  assert.equal(await timeView.getAttribute("aria-pressed"), "true");
  assert.equal(await categoryView.getAttribute("aria-pressed"), "false");
  await categoryView.click();
  await assertVisible(organizeEntry, "Switching to Category should not move or hide Organize");
  assert.equal(await categoryView.getAttribute("aria-pressed"), "true");
  assert.equal(await timeView.getAttribute("aria-pressed"), "false");
  await categoryView.evaluate((button) => button.focus());
  assert.equal(await categoryView.evaluate((button) => document.activeElement === button), true, "View controls should accept keyboard focus");
  await timeView.click();

  await language.evaluate((button) => button.focus());
  assert.equal(await language.evaluate((button) => document.activeElement === button), true, "Language control should accept keyboard focus");
  await language.click();
  await assertVisible(page.getByRole("button", { name: "English" }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("button", { name: "English" }), "Language choice should persist after reload");
  await page.getByRole("button", { name: "English" }).click();

  for (const viewport of [
    { width: 320, height: 844, name: "ln-056-floating-switch-320.png" },
    { width: 390, height: 844, name: "ln-056-floating-switch-390.png" },
    { width: 600, height: 900, name: "ln-056-floating-switch-600.png" },
    { width: 671, height: 900, name: "ln-056-floating-switch-671.png" },
    { width: 768, height: 900, name: "ln-056-floating-switch-768.png" },
    { width: 1280, height: 720, name: "ln-056-floating-switch-1280.png" }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px topbar`);
    await assertMinTouchTarget(language, `${viewport.width}px language control`);
    await assertMinTouchTarget(timeView, `${viewport.width}px time view`);
    await assertMinTouchTarget(categoryView, `${viewport.width}px category view`);
    await assertMinTouchTarget(organizeEntry, `${viewport.width}px organize entry`);
    await assertMinTouchTarget(diaryView, `${viewport.width}px diary workspace`);
    await assertMinTouchTarget(planView, `${viewport.width}px plan workspace`);
    for (const control of [
      page.getByRole("button", { name: "Search" }),
      page.getByRole("link", { name: "Record setup" }),
      page.getByRole("link", { name: "Settings" })
    ]) await assertMinTouchTarget(control, `${viewport.width}px adjacent topbar action`);

    const layout = await page.evaluate(() => {
      const header = document.querySelector(".topbar");
      const languageControl = header.querySelector(".language-toggle");
      const recordSwitch = document.querySelector(".record-view-switch");
      const organizeEntry = recordSwitch.querySelector(".record-view-organize-link");
      const switchControl = document.querySelector(".action-dock .workspace-mode-switch");
      const recordActions = document.querySelector(".record-action-row");
      const stream = document.querySelector(".timeline, .grouped-view");
      const active = switchControl.querySelector('[aria-pressed="true"]');
      const inactive = switchControl.querySelector('[aria-pressed="false"]');
      const box = (element) => element.getBoundingClientRect();
      const headerBox = box(header);
      const languageBox = box(languageControl);
      const switchBox = box(switchControl);
      const actionBox = box(recordActions);
      const recordSwitchBox = box(recordSwitch);
      const organizeEntryBox = box(organizeEntry);
      const streamBox = box(stream);
      const activeStyle = getComputedStyle(active);
      const inactiveStyle = getComputedStyle(inactive);
      return {
        topbarHasSwitch: Boolean(header.querySelector(".view-switch")),
        languageInsideTopbar: languageBox.top >= headerBox.top && languageBox.bottom <= headerBox.bottom,
        recordSwitchAboveContent: recordSwitchBox.bottom <= streamBox.top + 1,
        organizeInsideRecordSwitch: organizeEntryBox.top >= recordSwitchBox.top && organizeEntryBox.bottom <= recordSwitchBox.bottom,
        organizeRightInset: recordSwitchBox.right - organizeEntryBox.right,
        switchAboveActions: switchBox.bottom <= actionBox.top,
        switchRightAligned: Math.abs(switchBox.right - actionBox.right) <= 1,
        switchInsideViewport: switchBox.left >= 0 && switchBox.right <= window.innerWidth && switchBox.top >= 0 && switchBox.bottom <= window.innerHeight,
        topbarHeight: headerBox.height,
        switchRadius: Number.parseFloat(getComputedStyle(switchControl).borderRadius),
        switchBorder: getComputedStyle(switchControl).borderTopWidth,
        activeBackground: activeStyle.backgroundColor,
        inactiveBackground: inactiveStyle.backgroundColor
      };
    });
    assert.equal(layout.topbarHasSwitch, false, `Workspace navigation should leave the topbar: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.languageInsideTopbar, true, `Language should stay inside the topbar: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.recordSwitchAboveContent, true, `Time/category should lead the diary content: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.organizeInsideRecordSwitch, true, `Organize should remain the fixed right action in the record navigation row: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.organizeRightInset >= 0 && layout.organizeRightInset <= 20, `Organize should align with the record navigation content edge: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.switchAboveActions, true, `Diary/plan should sit above record actions: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.switchRightAligned, true, `Diary/plan should align with the primary action edge: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.switchInsideViewport, true, `The floating workspace switch should stay fully visible: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.switchRadius >= 20, `Workspace switch should use a pill silhouette: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.switchBorder, "1px", `Workspace switch should keep a thin border: ${JSON.stringify({ viewport, layout })}`);
    assert.notEqual(layout.activeBackground, layout.inactiveBackground, `Active workspace should remain visually distinct: ${JSON.stringify({ viewport, layout })}`);
    await page.screenshot({ path: join(outputDir, viewport.name), fullPage: true });
  }
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
  const calendarTrigger = page.locator(".date-context-disclosure");
  const sharedDateContext = page.locator(".shared-date-context");
  let lastSwipeReleaseMs = 0;
  const swipeFullPage = async (deltaX, screenshotName = "", surfaceSelector = ".home-workspace", holdBeforeRelease = 0, previewDeltaX = deltaX * 0.78) => {
    const shell = page.locator(".app-shell");
    const surface = page.locator(surfaceSelector);
    const box = await surface.boundingBox();
    assert.ok(box, "The visible workspace should expose a full-page swipe surface");
    const startX = box.x + box.width * 0.54;
    const startY = box.y + Math.min(Math.max(72, box.height * 0.28), 260);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + previewDeltaX, startY, { steps: 5 });
    await page.waitForTimeout(40);
    const dragState = await shell.evaluate((element) => {
      const transform = (selector) => getComputedStyle(document.querySelector(selector)).transform;
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
        disclosureIconTransform: transform(".date-context-disclosure-icon"),
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
      assert.equal(dragState.disclosureIconTransform, "none", `Reduced motion should not displace the collapsed date disclosure icon: ${JSON.stringify(dragState)}`);
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
    const weekday = document.querySelector(".date-context-weekday");
    const dateRect = date.getBoundingClientRect();
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
      gap: weekdayRect.left - dateRect.right
    };
  });
  assert.equal(diaryDateHierarchy.dateText, "August 15");
  assert.equal(diaryDateHierarchy.weekdayText, "Saturday");
  assert.ok(diaryDateHierarchy.dateFontSize - diaryDateHierarchy.weekdayFontSize >= 4, `The weekday should be visibly smaller than the diary date: ${JSON.stringify(diaryDateHierarchy)}`);
  assert.notEqual(diaryDateHierarchy.dateColor, diaryDateHierarchy.weekdayColor, `The weekday should use a quieter color than the diary date: ${JSON.stringify(diaryDateHierarchy)}`);
  assert.ok(diaryDateHierarchy.gap >= 8 && diaryDateHierarchy.gap <= 16, `Date and weekday should be related but not fused into one text level: ${JSON.stringify(diaryDateHierarchy)}`);

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 600, height: 900 },
    { width: 671, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 720 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px responsive date identity`);
    const responsiveHeader = await page.evaluate(() => {
      const header = document.querySelector(".topbar");
      const brand = header.querySelector(".brand");
      const dateTitle = header.querySelector(".date-context-title");
      const dateText = header.querySelector(".date-context-date");
      const datePrimary = header.querySelector(".date-context-primary");
      const box = (element) => element.getBoundingClientRect();
      const headerBox = box(header);
      const brandBox = box(brand);
      const titleBox = box(dateTitle);
      const primaryBox = box(datePrimary);
      return {
        brandDisplay: getComputedStyle(brand).display,
        brandBox,
        headerBox,
        titleBox,
        primaryBox,
        dateFullyVisible: dateText.scrollWidth <= dateText.clientWidth + 1,
        dateInsideHeader: titleBox.top >= headerBox.top && titleBox.bottom <= headerBox.bottom,
        lowerDateCount: document.querySelectorAll(".home-workspace .date-context-title").length,
        visibleToolCount: [...header.querySelectorAll(".language-toggle, .top-actions .icon-button")]
          .filter((element) => {
            const rect = box(element);
            return rect.width > 0 && rect.height > 0;
          }).length
      };
    });
    assert.equal(responsiveHeader.dateInsideHeader, true, `The one date identity should live inside the app header: ${JSON.stringify({ viewport, responsiveHeader })}`);
    assert.equal(responsiveHeader.lowerDateCount, 0, `The workspace should not repeat the mobile date title: ${JSON.stringify({ viewport, responsiveHeader })}`);
    assert.equal(responsiveHeader.visibleToolCount, 4, `Language, search, setup and settings should remain visible: ${JSON.stringify({ viewport, responsiveHeader })}`);
    assert.equal(responsiveHeader.dateFullyVisible, true, `The diary date should not be clipped by mobile tools: ${JSON.stringify({ viewport, responsiveHeader })}`);
    if (viewport.width <= 700) {
      assert.equal(responsiveHeader.brandDisplay, "none", `Mobile should replace the Log Note brand with the current date: ${JSON.stringify({ viewport, responsiveHeader })}`);
      assert.ok(responsiveHeader.titleBox.top < responsiveHeader.headerBox.top + 66, `Mobile date should occupy the former brand row: ${JSON.stringify({ viewport, responsiveHeader })}`);
      assert.ok(responsiveHeader.headerBox.height <= (viewport.width === 320 ? 111 : 67), `Removing the arrow row should keep the mobile header compact: ${JSON.stringify({ viewport, responsiveHeader })}`);
    } else {
      assert.notEqual(responsiveHeader.brandDisplay, "none", `Desktop should retain the Log Note brand: ${JSON.stringify({ viewport, responsiveHeader })}`);
      assert.ok(responsiveHeader.titleBox.top >= responsiveHeader.brandBox.bottom, `Desktop should retain a separate date row below the brand: ${JSON.stringify({ viewport, responsiveHeader })}`);
    }
    await page.screenshot({ path: join(outputDir, `ln-057-rework9-mobile-date-header-${viewport.width}.png`), fullPage: false });
    await page.screenshot({ path: join(outputDir, `ln-057-rework10-diary-plan-no-arrows-${viewport.width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator(".calendar-view.picker-mode").count(), 0, "Collapsed date context should not leave an empty month panel");
  const collapsedLayout = await page.evaluate(() => {
    const navigation = document.querySelector(".date-context-navigation").getBoundingClientRect();
    const modeSwitch = document.querySelector(".content-mode-switch").getBoundingClientRect();
    return { navigationBottom: navigation.bottom, switchTop: modeSwitch.top };
  });
  assert.ok(collapsedLayout.navigationBottom <= collapsedLayout.switchTop + 1, `The fused date navigator should lead directly to the lower-workspace switch: ${JSON.stringify(collapsedLayout)}`);
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
  await assertVisible(page.getByRole("region", { name: "Timeline view" }));
  assert.equal(await page.locator(".view-switch").getByRole("button", { name: "Month", exact: true }).count(), 0, "The home view switch should not repeat the calendar entry");
  await assertVisible(page.getByRole("button", { name: "Time", exact: true }));
  await assertVisible(page.getByRole("button", { name: "Category", exact: true }));

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
  await assertVisible(page.getByRole("region", { name: "Timeline view" }));
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "true", "Choosing a day should keep the month context expanded");
  assert.equal(await calendar.locator(".calendar-day-context").count(), 0, "The picker should not add a second day-summary decision");
  assert.equal(await calendar.getByRole("button", { name: "Plan this day" }).count(), 0, "The picker should not repeat the day-plan decision");
  assert.equal(await calendar.getByRole("button", { name: "Diary" }).count(), 0, "The picker should update the diary directly");
  await assertVisible(page.getByRole("heading", { name: /Wednesday, August 12/ }));

  await calendarTrigger.press("Escape");
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "false", "Escape should collapse the month panel");
  assert.equal(await page.locator(".calendar-view.picker-mode").count(), 0, "Escape should remove the collapsed month panel from layout");
  assert.equal(await calendarTrigger.evaluate((element) => document.activeElement === element), true, "Escape should restore focus to the fused date navigator");
  await calendarTrigger.click();
  await assertVisible(calendar);

  const activeMonth = calendar.locator('[data-calendar-month="2026-08"]');
  assert.equal(await activeMonth.getAttribute("aria-current"), "true");
  await calendar.locator('[data-calendar-month="2026-09"]').click();
  await assertVisible(calendar.getByRole("grid", { name: "September 2026" }));
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
  const julyDay = calendar.locator('[data-calendar-date="2026-07-12"]');
  assert.equal(await julyDay.evaluate((element) => document.activeElement === element), true, "PageUp should move one month and keep the day focused");
  await julyDay.press("PageDown");
  await assertVisible(calendar.getByRole("grid", { name: "August 2026" }));

  await page.getByRole("button", { name: "简体中文" }).click();
  assert.match(await calendar.locator(".calendar-weekdays [role=columnheader]").first().textContent(), /一/, "Chinese calendar should begin on Monday");
  assert.equal(await page.locator(".date-context-date").textContent(), "8月12日", "Chinese should keep the date as the primary diary title");
  assert.match(await page.locator(".date-context-weekday").textContent(), /^星期/, "Chinese should keep the weekday as subordinate context");
  await assertVisible(page.getByRole("button", { name: "日记", exact: true }));
  await assertVisible(page.getByRole("button", { name: "计划", exact: true }));
  await swipeFullPage(-86, "ln-063-date-card-complete-zh-390.png", ".calendar-grid");
  await swipeFullPage(86, "", ".calendar-grid");
  assert.equal(await page.locator(".date-context-date").textContent(), "8月12日", "Chinese month swipes should return to the original selected date");
  await page.getByRole("button", { name: "English" }).click();
  assert.match(await calendar.locator(".calendar-weekdays [role=columnheader]").first().textContent(), /Sun/, "English calendar should begin on Sunday");
  await assertVisible(page.getByRole("button", { name: "Diary", exact: true }));
  await assertVisible(page.getByRole("button", { name: "Plan", exact: true }));
  await page.evaluate(() => document.activeElement?.blur());

  for (const viewport of [
    { width: 320, height: 844, name: "ln-057-expanded-context-320.png" },
    { width: 390, height: 844, name: "ln-057-expanded-context-390.png" },
    { width: 600, height: 900, name: "ln-057-expanded-context-600.png" },
    { width: 671, height: 900, name: "ln-057-expanded-context-671.png" },
    { width: 768, height: 900, name: "ln-057-expanded-context-768.png" },
    { width: 1280, height: 720, name: "ln-057-expanded-context-1280.png" }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px in-context date picker`);
    await assertMinTouchTarget(calendar.locator('[data-calendar-month="2026-08"]'), `${viewport.width}px month track`);
    await assertMinTouchTarget(calendar.locator('[data-calendar-date="2026-08-12"]'), `${viewport.width}px selected calendar day`);
    await assertMinTouchTarget(calendarTrigger, `${viewport.width}px date disclosure`);
    await assertMinTouchTarget(page.getByRole("button", { name: "Plan", exact: true }), `${viewport.width}px plan entry`);
    await assertMinTouchTarget(page.getByRole("button", { name: "Diary", exact: true }), `${viewport.width}px diary entry`);
    const monthLayout = await page.evaluate(() => {
      const navigation = document.querySelector(".date-context-navigation").getBoundingClientRect();
      const picker = document.querySelector(".calendar-view.picker-mode").getBoundingClientRect();
      const grid = document.querySelector(".calendar-grid").getBoundingClientRect();
      const track = document.querySelector(".calendar-month-track").getBoundingClientRect();
      const modeSwitch = document.querySelector(".content-mode-switch").getBoundingClientRect();
      const timeline = document.querySelector(".timeline").getBoundingClientRect();
      return {
        navigationBottom: navigation.bottom,
        pickerTop: picker.top,
        gridBottom: grid.bottom,
        trackTop: track.top,
        trackBottom: track.bottom,
        switchTop: modeSwitch.top,
        switchBottom: modeSwitch.bottom,
        timelineTop: timeline.top,
        viewportHeight: window.innerHeight
      };
    });
    assert.ok(monthLayout.navigationBottom <= monthLayout.pickerTop + 1, `${viewport.width}px month picker should expand below the fused date navigator: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.gridBottom <= monthLayout.trackTop + 1, `${viewport.width}px month track should follow the grid: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.trackBottom <= monthLayout.switchTop + 1, `${viewport.width}px lower-workspace switch should follow the expanded month panel without a duplicate date row: ${JSON.stringify(monthLayout)}`);
    assert.ok(monthLayout.switchBottom <= monthLayout.timelineTop + 1, `${viewport.width}px lower-workspace switch should remain above the current records: ${JSON.stringify(monthLayout)}`);
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
  await seedDay.click();
  await assertVisible(page.getByText("出发上班。", { exact: true }));
  await sharedDateContext.evaluate((element) => { element.dataset.sharedProbe = "preserved"; });
  await page.getByRole("button", { name: "Category", exact: true }).click();
  await assertVisible(page.getByRole("region", { name: "Category view" }));
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await assertVisible(page.getByRole("grid", { name: "Day plan time grid" }));
  assert.equal(await page.locator(".record-view-switch").count(), 0, "Day plan should hide record-only time/category navigation");
  assert.equal(await page.locator(".workspace-mode-switch").count(), 1, "Day plan should keep the diary/plan workspace switch reachable");
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
    await assertMinTouchTarget(page.getByRole("button", { name: "Diary", exact: true }), `${viewport.width}px plan diary entry`);
    await assertMinTouchTarget(page.getByRole("button", { name: "Plan", exact: true }), `${viewport.width}px active plan entry`);
    const stackedLayout = await page.evaluate(() => {
      const picker = document.querySelector(".calendar-view.picker-mode").getBoundingClientRect();
      const track = document.querySelector(".calendar-month-track").getBoundingClientRect();
      const navigation = document.querySelector(".date-context-navigation").getBoundingClientRect();
      const workspaceSwitch = document.querySelector(".workspace-mode-switch").getBoundingClientRect();
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
        dayGridTop: dayGrid.top,
        dayGridHeight: dayGrid.height,
        addPlanTop: addPlan.top,
        addPlanBottom: addPlan.bottom,
        addPlanRight: addPlan.right,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth
      };
    });
    assert.ok(stackedLayout.pickerLeft >= -0.5 && stackedLayout.pickerRight <= stackedLayout.viewportWidth + 0.5, `${viewport.width}px upper picker should remain fully visible: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.navigationBottom <= stackedLayout.pickerTop + 1, `${viewport.width}px month panel should follow the fused date navigator in day plan: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.trackBottom <= stackedLayout.dayGridTop + 1, `${viewport.width}px plan canvas should follow the month panel without a record-only tab row: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.dayGridHeight >= (viewport.width === 390 ? 216 : 120), `${viewport.width}px lower day-plan workspace should remain usable below the expanded picker: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.addPlanTop >= stackedLayout.dayGridTop && stackedLayout.addPlanBottom <= stackedLayout.viewportHeight, `${viewport.width}px add-plan action should remain inside the visible day-plan viewport: ${JSON.stringify(stackedLayout)}`);
    assert.ok(stackedLayout.workspaceSwitchBottom <= stackedLayout.addPlanTop && Math.abs(stackedLayout.workspaceSwitchRight - stackedLayout.addPlanRight) <= 2, `${viewport.width}px diary/plan switch should sit above and align with the plan action: ${JSON.stringify(stackedLayout)}`);
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
  await page.getByRole("button", { name: "Diary", exact: true }).click();
  await assertVisible(page.getByRole("region", { name: "Category view" }), "Returning to Diary should restore the prior record view");
  await assertVisible(page.locator(".calendar-view.picker-mode"), "Returning to records should preserve the upper date picker");
  assert.equal(await sharedDateContext.getAttribute("data-shared-probe"), "preserved", "Returning to records should keep the same upper DOM");
  assert.equal(await calendarTrigger.getAttribute("aria-expanded"), "true", "Returning to records should not reset the upper date context");
  await assertVisible(page.getByRole("heading", { name: /Wednesday, August 12/ }));
  assert.equal(await page.getByText("出发上班。", { exact: true }).count(), 0, "Returning from day plan should keep the selected date instead of resetting it");
  assert.equal(await page.getByRole("button", { name: "Category", exact: true }).getAttribute("aria-pressed"), "true");
});

test("day plan: create, edit, persist, and delete a local time block", async (page) => {
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  const calendar = page.locator(".calendar-view.day-mode");
  await assertVisible(calendar.getByRole("grid", { name: "Day plan time grid" }));
  assert.equal(await page.getByRole("button", { name: "Add record" }).count(), 0, "Day plan should not show the global add-record action");
  assert.equal(await page.locator(".export-fab").count(), 0, "Day plan should not show record export actions");
  assert.equal(await page.locator(".record-view-switch").count(), 0, "Day plan should not show the record-only time/category switch");
  assert.equal(await page.locator(".workspace-mode-switch").count(), 1, "Day plan should retain the diary/plan workspace switch");
  assert.equal(await calendar.getByRole("button", { name: "Add plan block" }).count(), 1, "Day plan should expose one contextual add-plan action");
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
    { width: 1280, height: 720, name: "ln-047-google-day-plan-1280.png" }
  ]) {
    await page.setViewportSize(viewport);
    await calendar.locator(".day-plan-scroll").evaluate((element) => { element.scrollTop = 7 * 72 - 18; });
    await assertNoHorizontalOverflow(page, `${viewport.width}px day plan`);
    await assertMinTouchTarget(calendar.getByRole("button", { name: "Add plan block" }), `${viewport.width}px add plan`);
    await assertMinTouchTarget(page.getByRole("button", { name: "Diary", exact: true }), `${viewport.width}px diary workspace switch`);
    await assertMinTouchTarget(page.getByRole("button", { name: "Plan", exact: true }), `${viewport.width}px plan workspace switch`);
    const layout = await page.evaluate(() => {
      const topbar = document.querySelector(".topbar");
      const workspace = document.querySelector(".home-workspace");
      const calendarView = document.querySelector(".calendar-view.day-mode");
      const scroll = document.querySelector(".day-plan-scroll");
      const addPlan = document.querySelector(".day-plan-add");
      const box = (element) => element.getBoundingClientRect();
      return {
        viewportHeight: window.innerHeight,
        pageScrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
        topbar: box(topbar),
        workspace: box(workspace),
        calendar: box(calendarView),
        addPlan: box(addPlan),
        actionDockCount: document.querySelectorAll(".action-dock").length,
        workspaceSwitchCount: document.querySelectorAll(".workspace-mode-switch").length,
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
    assert.equal(layout.actionDockCount, 1, `Day plan should keep one contextual action dock for workspace navigation: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.workspaceSwitchCount, 1, `Day plan should keep the diary/plan switch: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.recordActionRowCount, 0, `Day plan should remove diary-only export and add actions: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.gridClientHeight > 0 && layout.gridScrollHeight > layout.gridClientHeight, `The time grid should own vertical scrolling: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.gridScrollTop > 0, `The time grid should scroll independently without moving the page: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(await page.locator(".export-fab").count(), 0, "Record export should stay hidden inside day plan");
    await page.screenshot({ path: join(outputDir, viewport.name), fullPage: false });
    if (viewport.width !== 320) await page.screenshot({ path: join(outputDir, `ln-060-day-plan-no-record-switch-${viewport.width}.png`), fullPage: false });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Diary", exact: true }).click();
  await assertVisible(page.getByRole("region", { name: "Timeline view" }));
  const addRecord = page.getByRole("button", { name: "Add record" });
  await assertVisible(addRecord, "Leaving day plan should restore the home quick-record action");
  await assertVisible(page.locator(".export-fab"), "Leaving day plan should restore the record export action");
  await addRecord.click();
  const recordDialog = page.getByRole("dialog", { name: "New record" });
  await assertVisible(recordDialog);
  await recordDialog.locator(".writing-area textarea").fill("Quick record after day plan");
  await recordDialog.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".timeline .entry", { hasText: "Quick record after day plan" }), "Quick record should still save after leaving day plan");
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  block = page.locator(".calendar-view .plan-block", { hasText: "Optimize promotion report" });
  await block.click();
  editor = page.getByRole("dialog", { name: "Edit plan" });
  await editor.getByLabel("Plan").fill("Optimize weekly report");
  await editor.getByRole("button", { name: "Done" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Plan updated" }));

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  block = page.locator(".calendar-view .plan-block", { hasText: "Optimize weekly report" });
  await assertVisible(block, "Local plan should survive refresh");
  await block.click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("dialog", { name: "Edit plan" }).getByRole("button", { name: "Delete plan" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Plan deleted" }));
  assert.equal(await page.locator(".calendar-view .plan-block").count(), 0);
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

  await page.getByRole("button", { name: "Plan", exact: true }).click();
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

  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
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

test("linear record: add, search, edit, and delete", async (page) => {
  await assertVisible(page.getByRole("button", { name: "简体中文" }));
  await page.getByRole("button", { name: "简体中文" }).click();
  await assertVisible(page.getByRole("button", { name: "新增记录" }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("button", { name: "新增记录" }));
  await page.getByRole("button", { name: "English" }).click();
  await assertVisible(page.getByRole("button", { name: "Add record" }));

  const content = "E2E mobile record";
  await addQuickRecord(page, content);
  await assertVisible(page.locator(".timeline .entry", { hasText: content }));

  await page.locator(".mobile-search").click();
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
  await page.getByRole("button", { name: "Close" }).focus();
  await page.keyboard.press("n");
  assert.equal(await page.getByRole("dialog", { name: "Edit record" }).count(), 1, "New-record shortcut should not replace an active edit draft");
  assert.equal(await page.locator(".writing-area textarea").inputValue(), `${content} edited`, "Blocked shortcuts must preserve unsaved text");
  await page.getByRole("button", { name: "Done" }).click();
  const edited = page.locator(".timeline .entry", { hasText: `${content} edited` });
  await assertVisible(edited);

  await edited.click();
  await page.getByRole("button", { name: "More" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete record" }).click();
  await assertVisible(page.locator(".toast", { hasText: "Record deleted" }));
  assert.equal(await page.locator(".timeline .entry", { hasText: `${content} edited` }).count(), 0);
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

  await page.getByRole("button", { name: "Category", exact: true }).click();
  const categoryEntry = page.locator(".group-entry", { hasText: "标题🙂" });
  await assertVisible(categoryEntry.locator(".markdown-heading.level-1"));
  await assertVisible(categoryEntry.locator("strong", { hasText: "粗体" }));

  await page.locator(".mobile-search").click();
  const searchSurface = page.locator(".search-surface");
  await searchSurface.locator("input").fill("**粗体**");
  const searchResult = searchSurface.locator(".search-result", { hasText: "标题🙂" });
  await assertVisible(searchResult);
  await assertVisible(searchResult.locator("strong", { hasText: "粗体" }));
  assert.equal(await searchResult.locator("img, a, script").count(), 0);
  await searchSurface.getByRole("button", { name: "Close" }).click();

  await page.getByRole("link", { name: "Settings" }).click();
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
  await page.getByRole("button", { name: "Category", exact: true }).click();

  const learning = page.locator(".record-domain", { hasText: "Learning" }).locator(".record-category", { hasText: "Learning log" });
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
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
  await openSettingsPanel(page, "Download");
  const allMarkdown = await downloadText(page, () => page.getByRole("button", { name: "Download all" }).click());
  assert.match(allMarkdown, /## Learning\s+### Learning log[\s\S]*Focus score=8/);
  assert.doesNotMatch(allMarkdown, /## Health[\s\S]*Focus score=8/);

  await leaveSettings(page);
  await page.getByRole("button", { name: "Category", exact: true }).click();
  const currentLearning = page.locator(".record-domain", { hasText: "Learning" }).locator(".record-category", { hasText: "Learning log" });
  const currentFocus = currentLearning.getByPlaceholder("Score from 1 to 10");
  const learningProgress = currentLearning.locator(".record-category-header .record-heading-cluster > span");
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
  assert.equal(await currentLearning.locator(".record-category-header .record-heading-cluster > span").count(), 0, "Ordinary record categories should not repeat record counts in their headings");
  const healthProgress = page.locator(".record-domain", { hasText: "Health" }).locator(".record-category-header .record-heading-cluster > span");
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
  }, { date: testDate });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "简体中文" }).click();
  await page.getByRole("button", { name: "分类", exact: true }).click();

  const healthDomain = page.locator(".record-domain", { has: page.getByRole("heading", { name: "健康", exact: true }) });
  const bodyMetrics = healthDomain.locator(".record-category", { has: page.getByRole("heading", { name: "身体指标", exact: true }) });
  const eveningMetric = bodyMetrics.locator(".fixed-entry", { hasText: "晚重" });
  const eveningLabel = eveningMetric.locator(".fixed-entry-label");
  const eveningInput = eveningMetric.locator("input");
  await assertVisible(eveningInput);
  await assertMinTouchTarget(eveningInput, "390px embedded periodic value input");
  await eveningInput.fill("123");
  await eveningInput.press("Enter");

  const hierarchy = await healthDomain.evaluate((domain) => {
    const domainTitle = domain.querySelector(".record-domain-header h2");
    const domainCount = domain.querySelector(".record-domain-header .record-heading-cluster > span");
    const category = domain.querySelector(".record-category");
    const categoryTitle = category.querySelector(".record-category-header h3");
    const categoryCount = category.querySelector(".record-category-header .record-heading-cluster > span");
    const metricLabel = category.querySelector(".fixed-entry-label");
    const metricInput = category.querySelector(".fixed-inline-control input");
    const metricRow = metricLabel.closest(".fixed-entry");
    const nextCategory = category.nextElementSibling;
    const nextCategoryProgress = nextCategory?.querySelector(".record-category-header .record-heading-cluster > span");
    const lastMetricRow = category.querySelector(".fixed-entry:last-child") || category.querySelector(".fixed-entry-block:last-child .fixed-entry");
    const categories = [...domain.querySelectorAll(":scope > .record-category")];
    const lastDomainRows = [...(categories.at(-1)?.querySelectorAll(".fixed-entry,.group-entry") || [])];
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
    const nextCategoryBox = nextCategory ? box(nextCategory.querySelector(".record-category-header h3")) : null;
    const lastMetricRowBox = lastMetricRow ? box(lastMetricRow) : null;
    const domainElementBox = box(domain);
    const lastDomainRowBox = lastDomainRows.length ? box(lastDomainRows.at(-1)) : null;
    const nextDomainBox = nextDomain ? box(nextDomain) : null;
    const nextDomainTitleBox = nextDomain ? box(nextDomain.querySelector(".record-domain-header h2")) : null;
    return {
      fontSizes: {
        domain: Number.parseFloat(style(domainTitle).fontSize),
        category: Number.parseFloat(style(categoryTitle).fontSize),
        metric: Number.parseFloat(style(metricLabel).fontSize),
        value: Number.parseFloat(style(metricInput).fontSize)
      },
      x: { domain: domainBox.x, category: categoryBox.x, metric: metricBox.x, value: inputBox.x },
      domainHasCount: Boolean(domainCount),
      categoryCount: categoryCount.textContent,
      categoryProgressLabel: categoryCount.getAttribute("aria-label"),
      nextCategoryProgress: nextCategoryProgress?.textContent || null,
      nextCategoryProgressLabel: nextCategoryProgress?.getAttribute("aria-label") || null,
      countGaps: {
        category: categoryCountBox.x - categoryBox.right
      },
      spacing: {
        domainToCategory: categoryBox.top - domainBox.bottom,
        categoryToFirstItem: metricRowBox.top - categoryBox.bottom,
        metricToValue: inputBox.x - metricBox.right,
        nextCategory: nextCategoryBox && lastMetricRowBox ? nextCategoryBox.top - lastMetricRowBox.bottom : null,
        contentToDomainDivider: lastDomainRowBox ? domainElementBox.bottom - lastDomainRowBox.bottom : null,
        nextDomainTitleInset: nextDomainBox && nextDomainTitleBox ? nextDomainTitleBox.top - nextDomainBox.top : null
      },
      nextDomainName: nextDomain?.querySelector(".record-domain-header h2")?.textContent || null,
      categoryBorderLeft: style(category).borderLeftWidth
    };
  });
  ln058Evidence.category = hierarchy.spacing;
  assert.ok(hierarchy.fontSizes.domain >= 24, `Domain title should lead the hierarchy: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.fontSizes.domain - hierarchy.fontSizes.category >= 6, `Domain should be visibly larger than category: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.fontSizes.category - hierarchy.fontSizes.metric >= 2, `Category should be visibly larger than metric: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.x.category - hierarchy.x.domain >= 12, `Category should indent from domain: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.x.metric - hierarchy.x.category >= 12, `Metric should indent from category: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.x.value > hierarchy.x.metric, `Value should follow the metric from left to right: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.domainHasCount, false, `Domain headings should not present imported categories as record data: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.categoryCount, "1/5", `Periodic categories should show completed templates over visible templates: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.categoryProgressLabel, "已完成1/5", `Periodic progress should expose an accessible label: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.nextCategoryProgress, "0/1", `Unfilled periodic categories should retain the denominator: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.nextCategoryProgressLabel, "已完成0/1", `Zero-completion progress should expose an accessible label: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.countGaps.category >= 0 && hierarchy.countGaps.category <= 8, `Category count should stay beside its title: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.domainToCategory >= 8 && hierarchy.spacing.domainToCategory <= 16, `Domain and category should use one compact hierarchy step: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.categoryToFirstItem >= 0 && hierarchy.spacing.categoryToFirstItem <= 8, `Category and its first item should remain visually grouped: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.metricToValue >= 24 && hierarchy.spacing.metricToValue <= 220, `Metric and value should form one readable row without a dead middle: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.nextCategory === null || (hierarchy.spacing.nextCategory >= 16 && hierarchy.spacing.nextCategory <= 20), `Adjacent categories should separate by one deliberate rhythm: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.nextDomainName, "学习", `The spacing fixture should expose the next domain: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.contentToDomainDivider >= 24 && hierarchy.spacing.contentToDomainDivider <= 32, `Content should leave one section rhythm before the domain divider: ${JSON.stringify(hierarchy)}`);
  assert.ok(hierarchy.spacing.nextDomainTitleInset >= 24 && hierarchy.spacing.nextDomainTitleInset <= 32, `The next domain title should start one section rhythm after its divider: ${JSON.stringify(hierarchy)}`);
  assert.equal(hierarchy.categoryBorderLeft, "0px", "Category reading groups should not use a decorative vertical line");

  await page.locator(".toast").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  await healthDomain.getByRole("heading", { name: "健康", exact: true }).click();
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

  for (const viewport of [
    { width: 320, height: 844, name: "ln-041-category-hierarchy-320.png" },
    { width: 390, height: 844, name: "ln-041-category-hierarchy-390.png" },
    { width: 1280, height: 720, name: "ln-041-category-hierarchy-1280.png" }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px category hierarchy`);
    const layout = await page.locator(".home-workspace").evaluate((workspace, viewportWidth) => {
      const dayTitleControl = document.querySelector(".date-context-disclosure");
      const dayTitle = dayTitleControl.querySelector(".date-context-date");
      const viewSwitch = document.querySelector(".workspace-mode-switch");
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
        titleControlHeight: box(dayTitleControl).height,
        topbarHasSwitch: Boolean(topbar.querySelector(".view-switch")),
        switchAboveActions: switchBox.bottom <= actionBox.top,
        switchRightAligned: Math.abs(switchBox.right - actionBox.right) <= 1,
        groupedWidth: box(groupedView).width,
        rowBorders: rows.map((row) => getComputedStyle(row).borderBottomWidth),
        inputSpread: inputXs.length ? Math.max(...inputXs) - Math.min(...inputXs) : 0
      };
    }, viewport.width);
    assert.ok(layout.titleHeight <= layout.titleLineHeight + 1, `Date title should remain on one line: ${JSON.stringify({ viewport, layout })}`);
    assert.ok(layout.titleControlHeight >= 43.99, `The fused date title should remain a 44px touch target: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.topbarHasSwitch, false, `Diary and plan should leave the topbar: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.switchAboveActions, true, `Diary and plan should float above record actions: ${JSON.stringify({ viewport, layout })}`);
    assert.equal(layout.switchRightAligned, true, `The floating workspace switch should align with the primary action: ${JSON.stringify({ viewport, layout })}`);
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
    { width: 600, height: 900 },
    { width: 671, height: 900 },
    { width: 768, height: 900 },
    { width: 1280, height: 720 }
  ]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${viewport.width}px LN-058 proximity evidence`);
    await page.screenshot({ path: join(outputDir, `ln-058-proximity-${viewport.width}.png`), fullPage: true });
  }
});

test("legacy periodic backup: edit, validate, clear, refresh, and round trip", async (page) => {
  const currentLegacyBackup = {
    ...legacyPeriodicBackup,
    entries: legacyPeriodicBackup.entries.map((entry) => ({ ...entry, date: testDate }))
  };
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
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

  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
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
  await page.getByRole("link", { name: "Record setup" }).click();
  await assertVisible(page.getByRole("heading", { name: "Record setup" }));

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
  const exportLink = page.getByRole("link", { name: "Export options" });
  assert.equal(await exportLink.getAttribute("href"), "/settings#structure");
  await page.screenshot({ path: join(outputDir, "ln-032-template-entry-390.png"), fullPage: true });
  await page.screenshot({ path: join(outputDir, "ln-058-structure-390.png"), fullPage: true });
  await exportLink.click();
  await page.waitForURL(`${baseURL}/settings#structure`);
  const structureSection = page.locator("#structure");
  await assertVisible(structureSection.getByRole("heading", { name: "Record structure" }));
  assert.equal(await page.locator('.settings-nav a[href="#export"]').getAttribute("aria-current"), "page", "The legacy structure deep link should select Download");
  await assertVisible(page.getByRole("heading", { name: "Download", exact: true }));
  const anchorPosition = await structureSection.evaluate((element) => ({ top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, viewportHeight: window.innerHeight, scrollY: window.scrollY }));
  assert.ok(anchorPosition.top >= 0 && anchorPosition.top < anchorPosition.viewportHeight - 44, `Structure deep links should reveal the structure group without a second navigation step: ${JSON.stringify(anchorPosition)}`);
  assert.ok(anchorPosition.scrollY >= 0, `Structure deep links should preserve a valid scroll position: ${JSON.stringify(anchorPosition)}`);
  ln032Evidence.templateEntry = { duplicateDrawerCount: 0, duplicateMarkdownCount: 0, duplicateBackupCount: 0, href: "/settings#structure", anchorPosition };
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download current structure" }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "log-note-structure.json");
});

test("fixed records: adjust entry pauses and restores home visibility", async (page) => {
  await page.goto(baseURL + "/");
  const fixedSection = page.locator(".fixed-records");
  await fixedSection.getByRole("link", { name: "Adjust" }).click();
  await page.waitForURL(baseURL + "/templates?focus=periodic");
  await assertVisible(page.getByText("Adjust order, timing, input, or whether an item appears on the record page."));

  const morning = page.locator(".template-row", { hasText: "Morning weight" });
  await morning.locator(".row-main").click();
  const toggle = page.getByRole("checkbox", { name: "Show on record page" });
  await toggle.uncheck();
  await page.getByRole("dialog").getByRole("button").first().click();
  await page.getByRole("link", { name: "Back to records" }).click();
  await assertHidden(page.getByText("Morning weight", { exact: true }));

  await fixedSection.getByRole("link", { name: "Adjust" }).click();
  await page.locator(".template-row", { hasText: "Morning weight" }).locator(".row-main").click();
  await page.getByRole("checkbox", { name: "Show on record page" }).check();
  await page.getByRole("dialog").getByRole("button").first().click();
  await page.getByRole("link", { name: "Back to records" }).click();
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
    await page.goto(baseURL + "/templates?focus=periodic", { waitUntil: "domcontentloaded" });
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
    const homeControls = page.locator(".language-toggle, .record-view-switch button, .workspace-mode-switch button, .topbar .icon-button:visible");
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
  await page.getByRole("link", { name: "Record setup" }).click();
  await assertVisible(page.getByRole("heading", { name: "Record setup" }));
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
  await page.getByRole("button", { name: "Category", exact: true }).click();
  await assertVisible(page.locator(".group-entry", { hasText: content }).locator("img"));

  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
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

  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
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
  await entry.click();
  assert.equal(await composer.locator(".writing-area textarea").inputValue(), content, "Missing image must not alter note text");
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
  await assertVisible(page.getByRole("heading", { name: "Restore", exact: true }));
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Restore", "Recovery shortcut should move focus to the visible mobile title");
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

test("smart organize: choose one day, analyze all its records, apply, undo, and preserve raw text", async (page) => {
  const previousDate = shiftDate(testDate, -1);
  const seeded = await page.evaluate(({ date, previousDate }) => {
    const key = "log-note:data:v1";
    const state = JSON.parse(window.localStorage.getItem(key));
    const template = state.templates.find((item) => item.recordType !== "periodic");
    const categoryId = template.categoryId;
    const base = { date, time: "10:00", categoryId, templateId: template.id, fieldValues: {}, attachments: [], createdAt: Date.now() };
    const entries = [
      { ...base, id: "organize-work-a", content: "完成项目报告和产品评审", tags: [] },
      { ...base, id: "organize-work-b", time: "10:10", content: "整理今日待办并推进工作项目", tags: [] },
      { ...base, id: "organize-market", time: "10:20", content: "市场分化，准备调整投资仓位", tags: [] },
      { ...base, id: "organize-low", time: "10:30", content: "傍晚沿河散步", tags: [] },
      { ...base, id: "organize-previous", date: previousDate, time: "18:00", content: "前一天的独立记录", tags: [] },
      { ...base, id: "organize-history-work", date: "2026-01-01", content: "项目报告评审与工作复盘", tags: ["工作"] },
      { ...base, id: "organize-history-market", date: "2026-01-01", content: "市场交易与投资复盘", tags: ["交易"] }
    ];
    state.entries = [...state.entries, ...entries];
    window.localStorage.setItem(key, JSON.stringify(state));
    return { contents: Object.fromEntries(entries.slice(0, 4).map((entry) => [entry.id, entry.content])), categoryId };
  }, { date: testDate, previousDate });
  await page.reload({ waitUntil: "domcontentloaded" });

  const recordViewSwitch = page.locator(".record-view-switch");
  const organizeEntry = recordViewSwitch.getByRole("link", { name: "Organize", exact: true });
  await assertVisible(organizeEntry);
  const organizeEntryMetrics = await recordViewSwitch.evaluate((switchRow) => {
    const switchBox = switchRow.getBoundingClientRect();
    const link = switchRow.querySelector(".record-view-organize-link");
    const linkBox = link.getBoundingClientRect();
    const visualBox = link.querySelector("span").getBoundingClientRect();
    const switchStyle = getComputedStyle(switchRow);
    return {
      switchHeight: switchBox.height,
      linkWidth: linkBox.width,
      linkHeight: linkBox.height,
      visualHeight: visualBox.height,
      rightInset: switchBox.right - linkBox.right,
      borderBottomWidth: switchStyle.borderBottomWidth,
      visibleText: link.innerText.trim()
    };
  });
  assert.ok(organizeEntryMetrics.switchHeight <= 52, `The record navigation should stay compact with Organize inside it: ${JSON.stringify(organizeEntryMetrics)}`);
  assert.ok(organizeEntryMetrics.linkWidth <= 132, `The smart-organize action should size to its label instead of filling the row: ${JSON.stringify(organizeEntryMetrics)}`);
  assert.ok(organizeEntryMetrics.linkHeight >= 43.99, `The compact smart-organize action should keep a 44px target: ${JSON.stringify(organizeEntryMetrics)}`);
  assert.ok(organizeEntryMetrics.visualHeight <= 34.01, `The visible button should stay smaller than its touch target: ${JSON.stringify(organizeEntryMetrics)}`);
  assert.ok(organizeEntryMetrics.rightInset >= 0 && organizeEntryMetrics.rightInset <= 20, `Organize should use the empty right edge of the record navigation: ${JSON.stringify(organizeEntryMetrics)}`);
  assert.equal(organizeEntryMetrics.borderBottomWidth, "1px", `Organize should share the record navigation divider instead of creating another row: ${JSON.stringify(organizeEntryMetrics)}`);
  assert.equal(organizeEntryMetrics.visibleText, "Organize", "The fixed entry should contain only the action label");
  assert.equal(await page.locator(".grouped-view-toolbar").count(), 0, "Category content should no longer own a separate organize toolbar");
  await page.getByRole("button", { name: "Category", exact: true }).click();
  await assertVisible(organizeEntry, "Organize should remain visible in Category view");
  await page.getByRole("button", { name: "Time", exact: true }).click();
  await assertVisible(organizeEntry, "Organize should remain visible in Time view");
  await organizeEntry.click();
  await page.waitForURL(`${baseURL}/organize`);
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
  assert.equal(await page.getByText("All ordinary records from that day will be checked against your existing tags. Low-confidence records stay unchanged.", { exact: true }).count(), 0, "The ready state should not repeat the organize behavior");

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
      await assertMinTouchTarget(page.getByRole("button", { name: "Organize 4 records" }), `${width}px organize day action`);
    }
    await page.screenshot({ path: join(outputDir, `ln-068-organize-day-select-${width}.png`), fullPage: false });
  }

  await page.keyboard.press("Escape");
  assert.equal(await dateTrigger.getAttribute("aria-expanded"), "false", "Escape should collapse the shared organize calendar");

  await page.getByRole("button", { name: "Organize 4 records" }).click();
  await assertVisible(page.locator(".organize-suggestion", { hasText: "#工作" }));
  await assertVisible(page.locator(".organize-suggestion", { hasText: "#交易" }));
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
  const workGroup = page.locator(".organize-suggestion", { hasText: "#工作" });
  await workGroup.getByRole("button", { name: "Remove record from this suggestion" }).first().click();
  await workGroup.getByRole("button", { name: "Apply #工作" }).click();
  let stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  const workTags = stored.entries.filter((entry) => ["organize-work-a", "organize-work-b"].includes(entry.id)).map((entry) => entry.tags.includes("工作"));
  assert.equal(workTags.filter(Boolean).length, 1, "Removing one suggestion should keep that record unchanged");
  await page.getByRole("button", { name: "Undo last apply" }).click();
  stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(stored.entries.filter((entry) => entry.id.startsWith("organize-work-")).some((entry) => entry.tags.includes("工作")), false);

  await page.getByRole("button", { name: "Recalculate" }).click();
  await assertVisible(page.getByRole("button", { name: "Apply all remaining suggestions" }));
  await page.getByRole("button", { name: "Apply all remaining suggestions" }).click();
  stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("log-note:data:v1")));
  assert.equal(stored.entries.find((entry) => entry.id === "organize-work-a").tags.includes("工作"), true);
  assert.equal(stored.entries.find((entry) => entry.id === "organize-work-b").tags.includes("工作"), true);
  assert.equal(stored.entries.find((entry) => entry.id === "organize-market").tags.includes("交易"), true);
  assert.deepEqual(stored.entries.find((entry) => entry.id === "organize-low").tags, []);
  for (const [entryId, content] of Object.entries(seeded.contents)) {
    const entry = stored.entries.find((item) => item.id === entryId);
    assert.equal(entry.content, content, `Smart organize must preserve raw content for ${entryId}`);
    assert.equal(entry.categoryId, seeded.categoryId, `Tag suggestions must not silently move ${entryId} to another category`);
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

  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
  await assertVisible(page.getByRole("heading", { name: "Settings", exact: true }));
  assert.equal(await page.locator(".settings-page [role=dialog]").count(), 0, "Settings should be a page, not a dialog");
  assert.equal(await page.getByRole("heading", { name: "Settings", exact: true }).count(), 1, "Mobile settings should show one Settings title");
  assert.equal(await page.locator(".settings-mobile-menu").getByRole("link").count(), 5, "Mobile settings should expose the optional account task beside the four local-data tasks");
  assert.deepEqual(await page.locator(".settings-mobile-menu b").allTextContents(), ["General", "Account", "Download", "Restore", "Images"]);
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
  await openSettingsPanel(page, "General");
  await assertVisible(page.getByRole("heading", { name: "General", exact: true }));
  await page.getByRole("button", { name: "简体中文" }).click();
  await assertVisible(page.getByRole("heading", { name: "常规", exact: true }));
  assert.equal(await page.getByText("记录保存在哪里", { exact: true }).count(), 0);
  assert.equal(await page.getByText("选择设置", { exact: true }).count(), 0);
  assert.equal(await page.getByText("只改变界面，不会翻译或改写记录。", { exact: true }).count(), 0, "Language controls should not explain an obvious effect");
  assert.equal(await page.getByText("从手机桌面直接打开，离线时也可使用。", { exact: true }).count(), 0, "Home Screen access should not repeat effect and instruction copy");
  await assertVisible(page.getByRole("heading", { name: "添加到手机主屏幕" }));
  await assertVisible(page.getByText("打开浏览器的分享菜单，然后选择“添加到主屏幕”。", { exact: true }));
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
  await assertVisible(page.getByRole("heading", { name: "General", exact: true }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(50);
  assert.equal(await page.locator(".settings-nav").getByRole("link").count(), 5, "Desktop settings should retain the same five task-based sections");
  assert.equal(await page.getByRole("link", { name: "General", exact: true }).getAttribute("aria-current"), "page");
  assert.equal(await page.getByRole("heading", { name: "Download", exact: true }).count(), 0, "Only the selected settings panel should render");
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
  await assertVisible(page.getByRole("heading", { name: "Account", exact: true }));
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
  await assertVisible(page.getByRole("heading", { name: "Download", exact: true }));
  await assertVisible(page.getByRole("heading", { name: "Records", exact: true }));
  await assertVisible(page.getByRole("heading", { name: "Backup", exact: true }));
  await assertVisible(page.getByRole("heading", { name: "Record structure", exact: true }));
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
  assert.match(backupActions[1], /Text backup.*no image files/s, "Text backup should clearly exclude image files");
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
  await assertVisible(page.getByRole("heading", { name: "Restore", exact: true }));
  assert.equal(await page.getByRole("link", { name: "Restore", exact: true }).getAttribute("aria-current"), "page");
  await assertVisible(page.getByText(/Invalid files leave current data unchanged/));
  await assertVisible(page.getByText("Current data will be replaced", { exact: true }));
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({ name: "log-note-e2e-restore.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(restorePayload)) });
  await assertVisible(page.locator(".toast", { hasText: "Backup restored" }));
  await leaveSettings(page);
  await page.waitForURL(baseURL + "/");
  await assertVisible(page.getByText("Restored E2E entry", { exact: true }));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
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

console.log(`Starting local app at ${baseURL}`);
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
    NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID: "e2e.apps.googleusercontent.com"
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
    for (const current of tests) {
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
        results.push({ name: current.name, status: "failed", error: error.message, screenshot, trace });
        console.error(`✗ ${current.name}: ${error.message}`);
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
