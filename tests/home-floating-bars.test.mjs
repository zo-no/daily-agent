import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("home mobile chrome uses floating bars without an Agent content inset", () => {
  const header = readProjectFile("src/app/_components/home/home-header.js");
  const headerStyles = readProjectFile("src/app/_components/home/home-header.css");
  const timelineStyles = readProjectFile("src/app/_components/home/home-timeline.css");
  const calendarStyles = readProjectFile("src/app/_components/home-calendar.css");

  assert.match(header, /className="top-actions home-edge-rail-tools home-top-action-bar" data-top-action-bar/);
  assert.match(headerStyles, /\.home-top-action-bar::before\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?pointer-events:\s*none;/);
  assert.match(timelineStyles, /\.action-dock\s*\{[\s\S]*?left:\s*50%;[\s\S]*?border:\s*1px solid[\s\S]*?background:/);
  assert.match(timelineStyles, /\.app-shell\.has-agent-review:not\(\.is-day-plan\):not\(\.has-category-rail\) \.home-record-stream\s*\{[\s\S]*?padding-right:\s*0;/);
  assert.match(calendarStyles, /\.shared-date-context\.is-calendar-open\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?top:\s*var\(--home-floating-calendar-top\)/);
  assert.match(calendarStyles, /width:\s*max\(316px,\s*calc\(100vw\s*-\s*4px\)\)/);
});
