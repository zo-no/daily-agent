import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("home mobile chrome uses floating bars without an Agent content inset", () => {
  const header = readProjectFile("src/app/_components/home/home-header.js");
  const headerStyles = readProjectFile("src/app/_components/home/home-header.css");
  const timelineStyles = readProjectFile("src/app/_components/home/home-timeline.css");
  const calendarStyles = readProjectFile("src/app/_components/home-calendar.css");
  const dock = readProjectFile("src/app/_components/home/home-action-dock.js");
  const page = readProjectFile("src/app/_components/home/home-page.js");
  const recordViews = readProjectFile("src/app/_components/home/home-record-views.js");

  assert.match(header, /className="top-actions home-edge-rail-tools home-top-action-bar" data-top-action-bar/);
  assert.match(headerStyles, /\.home-top-action-bar::before\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?pointer-events:\s*none;/);
  assert.match(timelineStyles, /\.action-dock\s*\{[\s\S]*?left:\s*50%;[\s\S]*?border:\s*1px solid[\s\S]*?background:/);
  assert.match(timelineStyles, /\.app-shell\.has-agent-review:not\(\.is-day-plan\):not\(\.has-category-rail\) \.home-record-stream\s*\{[\s\S]*?padding-right:\s*0;/);
  assert.match(timelineStyles, /\.app-shell\.has-category-rail\.has-agent-review \.home-record-stream\s*\{[\s\S]*?padding-right:\s*0;/);
  assert.match(timelineStyles, /\.domain-directory-scroll\[data-overflow="true"\]\s*\{[\s\S]*?overflow-y:\s*auto;[\s\S]*?pointer-events:\s*auto;/);
  assert.match(timelineStyles, /\.domain-directory-node\s*\{[\s\S]*?min-height:\s*44px;/);
  assert.match(calendarStyles, /\.shared-date-context\.is-calendar-open\s*\{[\s\S]*?position:\s*relative;[\s\S]*?margin:\s*8px/);
  assert.match(calendarStyles, /width:\s*min\(420px,\s*calc\(100vw\s*-\s*64px\)\)/);
  assert.match(calendarStyles, /@media \(max-width: 389px\)[\s\S]*?width:\s*max\(312px,\s*calc\(100vw\s*-\s*52px\)\)/);
  assert.match(dock, /data-bottom-composer/);
  assert.match(dock, /data-persistent-quick-record-input/);
  assert.match(dock, /localTimeWithSeconds/);
  assert.match(page, /saveQuickRecord=\{saveTodayQuickRecord\}/);
  assert.match(dock, /data-floating-action-cluster[\s\S]*data-edge-rail-item="export"[\s\S]*data-bottom-mode-controls/);
  assert.match(dock, /data-bottom-mode-controls/);
  assert.match(dock, /WorkspaceModeRailToggle[\s\S]*RecordViewRailToggle/);
  assert.doesNotMatch(header, /<WorkspaceModeRailToggle[\s\S]*<\/div>/);
  assert.match(recordViews, /const datePicker = calendarOpen \?/);
  assert.match(recordViews, /onDaySelect=\{async \(nextDate\) => \{[\s\S]*?onCalendarOpenChange\(false\);/);
  assert.match(recordViews, /className=\{`shared-date-context\$\{calendarOpen \? " is-calendar-open" : ""\}`\}/);
});
