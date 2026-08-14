import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const port = Number(process.env.E2E_PORT || 3141);
const baseURL = `http://127.0.0.1:${port}`;
const testDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());
const outputDir = join(process.cwd(), "output/playwright");
const legacyPeriodicBackup = JSON.parse(await readFile(fileURLToPath(new URL("../tests/fixtures/legacy-periodic-free-backup.json", import.meta.url)), "utf8"));
const cachedChromium = join(homedir(), "Library/Caches/ms-playwright/chromium_headless_shell-1169/chrome-mac/headless_shell");
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || (existsSync(cachedChromium) ? cachedChromium : undefined);
const device = {
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2
};

const tests = [];
const ln032Evidence = {};
function test(name, run) { tests.push({ name, run }); }

function fileSlug(name) {
  return name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");
}

async function waitForServer(server) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next development server exited early with code ${server.exitCode}`);
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // The server is still compiling; retry shortly.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseURL}`);
}

async function assertVisible(locator, message) {
  await locator.waitFor({ state: "visible", timeout: 10_000 });
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
  assert.ok(box && box.width >= 44 && box.height >= 44, `${label} should be at least 44px: ${JSON.stringify(box)}`);
}

async function downloadText(page, action) {
  const downloadPromise = page.waitForEvent("download");
  await action();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let content = "";
  for await (const chunk of stream) content += chunk;
  return content;
}

async function assertFixedInputTouchTargets(page, viewportLabel, expectedMobileSizing) {
  const metrics = await page.locator(".fixed-inline-control").evaluateAll((controls) => controls.map((control) => {
    const input = control.querySelector("input");
    const button = control.querySelector("button");
    const buttonBox = button?.getBoundingClientRect();
    return {
      inputFontSize: Number.parseFloat(input ? getComputedStyle(input).fontSize : "0"),
      buttonWidth: buttonBox?.width || 0,
      buttonHeight: buttonBox?.height || 0
    };
  }));
  assert.ok(metrics.length > 0, `${viewportLabel} should render fixed value controls`);
  if (expectedMobileSizing) {
    for (const metric of metrics) {
      assert.ok(metric.inputFontSize >= 16, `${viewportLabel} fixed input should use at least 16px text: ${JSON.stringify(metric)}`);
      assert.ok(metric.buttonWidth >= 44 && metric.buttonHeight >= 44, `${viewportLabel} save button should have a 44px touch target: ${JSON.stringify(metric)}`);
    }
  }
  await assertNoHorizontalOverflow(page, viewportLabel);
}

test("home hierarchy: fixed records follow the day's content without weakening quick record", async (page) => {
  const fixedRecords = page.locator(".fixed-records");
  const emptyTimeline = page.locator(".timeline-empty");
  const addRecord = page.getByRole("button", { name: "Add record" });
  await assertVisible(fixedRecords);
  await assertVisible(fixedRecords.getByText("0/6", { exact: true }));
  await assertVisible(fixedRecords.getByText("6 remaining", { exact: true }));
  await assertVisible(emptyTimeline);
  const mobileFixedBox = await fixedRecords.boundingBox();
  const mobileEmptyBox = await emptyTimeline.boundingBox();
  assert.ok(mobileFixedBox && mobileFixedBox.y < 844);
  assert.ok(mobileEmptyBox && mobileFixedBox.y > mobileEmptyBox.y);
  await assertVisible(addRecord);
  await assertFixedInputTouchTargets(page, "390px empty home", true);
  await page.setViewportSize({ width: 320, height: 844 });
  await assertFixedInputTouchTargets(page, "320px empty home", true);
  await page.setViewportSize({ width: 1280, height: 720 });
  const desktopFixedBox = await fixedRecords.boundingBox();
  const desktopTimelineBox = await page.locator(".timeline").boundingBox();
  assert.ok(desktopFixedBox && desktopFixedBox.y < 720);
  assert.ok(desktopTimelineBox && desktopFixedBox.y > desktopTimelineBox.y);
  await assertFixedInputTouchTargets(page, "1280px empty home", false);
  await addQuickRecord(page, "Hierarchy regression record");
  const timelineEntry = page.locator(".timeline .entry", { hasText: "Hierarchy regression record" });
  await assertVisible(timelineEntry);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileEntryBox = await timelineEntry.boundingBox();
  const mobileFixedWithEntryBox = await fixedRecords.boundingBox();
  assert.ok(mobileEntryBox && mobileFixedWithEntryBox && mobileFixedWithEntryBox.y > mobileEntryBox.y);
  await addRecord.click();
  await assertVisible(page.locator(".surface.composer"));
  await assertNoHorizontalOverflow(page, "390px populated home");
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
  await result.click();

  await page.locator(".writing-area textarea").fill(`${content} edited`);
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
  const backupText = await downloadText(page, () => page.getByRole("button", { name: "Export full JSON backup" }).click());
  const backup = JSON.parse(backupText);
  assert.equal(backup.entries.find((entry) => entry.content.includes("标题🙂"))?.content, savedContent, "Backup should preserve raw Markdown exactly");
  const markdown = await downloadText(page, () => page.getByRole("button", { name: "Export Today Markdown" }).click());
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
  await morningInput.fill("70.1kg");
  await morningInput.press("Enter");
  const periodic = page.locator(".fixed-records");
  await assertVisible(periodic);
  await assertVisible(periodic.getByText("Morning weight", { exact: true }));
  assert.equal(await morningInput.inputValue(), "70.1kg");

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
  const allMarkdown = await downloadText(page, () => page.getByRole("button", { name: "Export all Markdown" }).click());
  assert.match(allMarkdown, /## Learning\s+### Learning log[\s\S]*Focus score=8/);
  assert.doesNotMatch(allMarkdown, /## Health[\s\S]*Focus score=8/);

  await page.getByRole("link", { name: "Back to records" }).click();
  await page.getByRole("button", { name: "Category", exact: true }).click();
  const currentLearning = page.locator(".record-domain", { hasText: "Learning" }).locator(".record-category", { hasText: "Learning log" });
  const currentFocus = currentLearning.getByPlaceholder("Score from 1 to 10");
  await currentFocus.fill("");
  await currentFocus.press("Enter");
  await assertVisible(page.getByRole("status").getByText("Empty record deleted"));
  assert.equal(await currentLearning.getByPlaceholder("Score from 1 to 10").count(), 0);
  const healthFocus = page.locator(".record-domain", { hasText: "Health" }).getByPlaceholder("Score from 1 to 10");
  await assertVisible(healthFocus);
  assert.equal(await healthFocus.inputValue(), "");

  await page.setViewportSize({ width: 320, height: 844 });
  await assertNoHorizontalOverflow(page, "320px category view");
  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page, "390px category view");
  await page.screenshot({ path: join(outputDir, "ln-033-category-390.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await assertNoHorizontalOverflow(page, "1280px category view");
});

test("legacy periodic backup: edit, validate, clear, refresh, and round trip", async (page) => {
  const currentLegacyBackup = {
    ...legacyPeriodicBackup,
    entries: legacyPeriodicBackup.entries.map((entry) => ({ ...entry, date: testDate }))
  };
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: "legacy-periodic-free-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(currentLegacyBackup))
  });
  await assertVisible(page.locator(".toast", { hasText: "Backup restored" }));
  await page.getByRole("link", { name: "Back to records" }).click();
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
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export full JSON backup" }).click();
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

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({ name: "round-trip.json", mimeType: "application/json", buffer: Buffer.from(backupText) });
  await assertVisible(page.locator(".toast", { hasText: "Backup restored" }));
  await page.getByRole("link", { name: "Back to records" }).click();
  await page.waitForURL(baseURL + "/");
  await assertVisible(page.locator(".fixed-entry-block", { hasText: "Edited free wording = still verbatim." }));
  assert.equal(await page.getByPlaceholder("Legacy morning value").inputValue(), "");
});

test("record setup: template ordering and the single structure-export workspace", async (page) => {
  await page.getByRole("link", { name: "Record setup" }).click();
  await assertVisible(page.getByRole("heading", { name: "Record setup" }));

  const metrics = page.locator(".category-branch", {
    has: page.locator(".category-row", { hasText: /^Body metrics/ })
  });
  await assertVisible(metrics);
  await assertVisible(metrics.locator(".template-row").first().getByText("Morning weight", { exact: true }));
  const morning = metrics.locator(".template-row", { hasText: "Morning weight" });
  await morning.locator("summary").click();
  await morning.getByRole("button", { name: "Move down" }).click();
  await assertVisible(metrics.locator(".template-row").first().getByText("Evening weight", { exact: true }));

  assert.equal(await page.getByRole("dialog", { name: "Export records" }).count(), 0, "Record setup should not render the duplicate export drawer");
  assert.equal(await page.getByRole("button", { name: "Export all Markdown" }).count(), 0, "Record setup should not duplicate Markdown downloads");
  assert.equal(await page.getByRole("button", { name: "Export full JSON backup" }).count(), 0, "Record setup should not duplicate backup downloads");
  const exportLink = page.getByRole("link", { name: "Export options" });
  assert.equal(await exportLink.getAttribute("href"), "/settings#structure");
  await page.screenshot({ path: join(outputDir, "ln-032-template-entry-390.png"), fullPage: true });
  await exportLink.click();
  await page.waitForURL(`${baseURL}/settings#structure`);
  const structureSection = page.locator("#structure");
  await assertVisible(structureSection.getByRole("heading", { name: "Record structure & starter example" }));
  const anchorPosition = await structureSection.evaluate((element) => ({ top: element.getBoundingClientRect().top, scrollY: window.scrollY, scrollMarginTop: getComputedStyle(element).scrollMarginTop }));
  assert.ok(anchorPosition.top >= 0 && anchorPosition.top < 420, `Structure anchor heading should remain visible in the first viewport: ${JSON.stringify(anchorPosition)}`);
  assert.ok(anchorPosition.scrollY > 0, `Structure anchor should scroll the page: ${JSON.stringify(anchorPosition)}`);
  assert.ok(Number.parseFloat(anchorPosition.scrollMarginTop) > 0, `Structure anchor should reserve scroll space: ${JSON.stringify(anchorPosition)}`);
  ln032Evidence.templateEntry = { duplicateDrawerCount: 0, duplicateMarkdownCount: 0, duplicateBackupCount: 0, href: "/settings#structure", anchorPosition };
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export structure JSON" }).click();
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
    await page.getByRole("button", { name: "Add record" }).click();
    const composer = page.locator(".surface.composer");
    await assertMinTouchTarget(composer.getByRole("button", { name: "Close" }), `${label} composer close`);
    await assertMinTouchTarget(composer.getByRole("button", { name: "Done" }), `${label} composer done`);
    await assertNoHorizontalOverflow(page, `${label} composer`);
    await composer.getByRole("button", { name: "Close" }).click();
  }
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
  await assertVisible(page.getByRole("heading", { name: "Markdown output" }));
  await assertVisible(page.getByRole("heading", { name: "Backup & restore" }));
  await assertVisible(page.getByRole("heading", { name: "Record structure & starter example" }));
  await assertVisible(page.getByText(/Invalid files leave current data unchanged/));
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({ name: "log-note-e2e-restore.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(restorePayload)) });
  await assertVisible(page.locator(".toast", { hasText: "Backup restored" }));
  await page.getByRole("link", { name: "Back to records" }).click();
  await page.waitForURL(baseURL + "/");
  await assertVisible(page.getByText("Restored E2E entry", { exact: true }));

  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL(`${baseURL}/settings`);
  const entryLine = page.getByLabel("Record line");
  await entryLine.fill("ENTRY {{content}}");
  await assertVisible(page.locator(".markdown-preview", { hasText: "ENTRY Restored E2E entry" }));
  assert.equal(await entryLine.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)), 16);
  const settingsActions = await page.locator(".export-actions button, .compact-actions button").evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  assert.ok(settingsActions.every((button) => button.width >= 44 && button.height >= 44), `Settings actions should keep 44px targets: ${JSON.stringify(settingsActions)}`);
  assert.equal(await page.locator(".settings-page .action-icon, .settings-page [data-icon=chevronRight]").count(), 0, "Settings downloads should not use the old icon blocks or trailing chevrons");
  await assertNoHorizontalOverflow(page, "390px settings workspace");
  await page.screenshot({ path: join(outputDir, "ln-032-settings-390.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 844 });
  await assertNoHorizontalOverflow(page, "320px settings workspace");
  await page.screenshot({ path: join(outputDir, "ln-032-settings-320.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await assertNoHorizontalOverflow(page, "1280px settings workspace");
  await page.screenshot({ path: join(outputDir, "ln-032-settings-1280.png"), fullPage: true });
  ln032Evidence.settings = { entryLineFontSize: 16, actionMetrics: settingsActions, noLegacyIconBlocks: true, viewports: [320, 390, 1280] };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('input[type="file"]').setInputFiles({ name: "broken-backup.json", mimeType: "application/json", buffer: Buffer.from("{not-json") });
  await assertVisible(page.locator(".toast", { hasText: "Could not restore backup" }));
  await page.getByRole("link", { name: "Back to records" }).click();
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
await mkdir(outputDir, { recursive: true });
const server = spawn("npx", ["next", "dev", "-p", String(port)], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }
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
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000))
  ]);
  await writeFile(join(outputDir, "results.json"), JSON.stringify({ baseURL, executablePath: executablePath || "Playwright default", results, serverLog }, null, 2));
  await writeFile(join(outputDir, "ln-032-visual-evidence.json"), JSON.stringify(ln032Evidence, null, 2));
}

const failed = results.filter((result) => result.status === "failed");
console.log(`\nE2E: ${results.length - failed.length}/${results.length} scenarios passed.`);
if (failed.length) process.exitCode = 1;
