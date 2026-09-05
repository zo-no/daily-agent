import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("domain summaries share one AI region and the report opens without duplicate top rules", () => {
  const page = readProjectFile("src/app/insights/insights-page.js");
  const calendarReview = readProjectFile("src/app/insights/daily-calendar-review.js");
  const styles = readProjectFile("src/app/insights/insights.css");

  const groupStart = page.indexOf('data-insights-ai-summary');
  const dailyStart = page.indexOf("<DailyDomainSummary", groupStart);
  const weeklyStart = page.indexOf("<WeeklySummary", groupStart);
  const groupEnd = page.indexOf("</section>", weeklyStart);

  assert.ok(groupStart >= 0, "The daily and seven-day actions should have one shared AI region");
  assert.ok(dailyStart > groupStart, "The current-day summary should stay first inside the AI region");
  assert.ok(weeklyStart > dailyStart, "The seven-day summary should follow the current-day summary");
  assert.ok(groupEnd > weeklyStart, "Both summary capabilities should be enclosed by the shared region");
  assert.match(
    page.slice(dailyStart, weeklyStart),
    /key=\{`\$\{accountId\}:\$\{selected\.domainId\}:\$\{locale\}:daily`\}/,
    "The current-day summary should keep an identity distinct from the weekly summary",
  );
  assert.match(
    page.slice(weeklyStart, groupEnd),
    /key=\{`\$\{accountId\}:\$\{selected\.domainId\}:\$\{locale\}:weekly`\}/,
    "The weekly summary should keep an identity distinct from the current-day summary",
  );
  assert.match(
    page.slice(groupStart, groupEnd),
    /insights\.calendarReviewScope/,
    "The aggregated region should carry the shared human-approval explanation",
  );
  assert.doesNotMatch(
    calendarReview,
    /<p>\{t\("insights\.calendarReviewScope"\)\}<\/p>/,
    "The shared AI explanation should no longer be stranded in the Calendar facts header",
  );

  assert.match(
    styles,
    /\.insights-page \.management-header\s*\{[^}]*border-bottom:\s*0;/s,
    "The Insights header should not draw the first empty horizontal rule",
  );
  assert.match(
    styles,
    /\.insights-today\s*\{[^}]*border-top:\s*0;/s,
    "The Calendar facts section should not draw the second empty horizontal rule",
  );
  assert.match(
    styles,
    /\.insights-ai-summary\s*\{[^}]*border-top:\s*1px solid var\(--line\);/s,
    "The two AI summaries should use one shared open-paper boundary",
  );
  assert.match(
    styles,
    /\.insights-ai-summary \.insights-daily,\s*\.insights-ai-summary \.insights-weekly\s*\{[^}]*border-top:\s*0;/s,
    "The child summaries should not recreate separate full-width boundaries",
  );
});

test("visible record counts name their scope and missing Calendar cache does not look like zero events", () => {
  const page = readProjectFile("src/app/insights/insights-page.js");
  const calendarReview = readProjectFile("src/app/insights/daily-calendar-review.js");
  const dailySummary = readProjectFile("src/app/insights/daily-domain-summary.js");
  const messages = readProjectFile("src/lib/i18n.mjs");

  assert.match(page, /lastSyncedAt:\s*calendarLastSyncedAt/, "Insights should receive the Calendar cache state, not infer it from a zero event list");
  assert.match(page, /insights\.domainCountScope/, "The permanent domain totals should visibly name their 30-day window");
  assert.match(page, /calendarLastSyncedAt=\{calendarLastSyncedAt\}/, "Calendar facts should receive the actual cache state");
  assert.match(
    dailySummary,
    /insights\.dailyCounts[^\n]*domain:\s*selection\.domainName/,
    "Today's AI fact line should name the selected domain",
  );
  assert.match(calendarReview, /const hasCalendarCache = Boolean\(calendarLastSyncedAt\)/, "Calendar review should distinguish missing cache from a cached zero-event day");
  assert.match(calendarReview, /!hasCalendarCache[^\n]*insights\.calendarReviewNoCache/, "Missing cache should render one explanatory diary fact instead of zero Calendar metrics");
  assert.match(calendarReview, /hasCalendarCache[^\n]*className="insights-today-facts"/, "Calendar metrics should render only when a real cache exists");
  assert.match(messages, /"insights\.calendarReviewNoCache"/, "The missing-cache explanation should be localized");
});

test("AI explanations stay on the left axis and summary actions read as controls", () => {
  const calendarReview = readProjectFile("src/app/insights/daily-calendar-review.js");
  const styles = readProjectFile("src/app/insights/insights.css");
  const messages = readProjectFile("src/lib/i18n.mjs");

  assert.match(
    styles,
    /\.insights-ai-summary-heading\s*\{[^}]*display:\s*grid;[^}]*justify-items:\s*start;/s,
    "The shared AI explanation should follow the same left reading axis as the section content",
  );
  assert.match(
    styles,
    /\.insights-ai-summary-heading > p\s*\{[^}]*margin:\s*0;[^}]*color:\s*var\(--instruction\);[^}]*font-size:\s*12px;[^}]*text-align:\s*left;/s,
    "Explanatory copy should use a smaller, quieter text treatment",
  );
  assert.match(
    calendarReview,
    /className="insights-today-empty-fact"[^\n]*insights\.calendarReviewDiaryFact/,
    "The known diary fact should be visually separable from the Calendar explanation",
  );
  assert.match(
    calendarReview,
    /className="insights-today-empty-note"[^\n]*insights\.calendarReviewNoCache/,
    "The missing-Calendar explanation should have its own helper-text treatment",
  );
  assert.match(messages, /"insights\.calendarReviewDiaryFact"/, "The local fact should be localized independently from the explanation");
  assert.match(
    styles,
    /\.insights-daily-action,\s*\.insights-weekly-action\s*\{[^}]*border:\s*1px solid var\(--accent\);[^}]*background:\s*var\(--paper-raised\);[^}]*cursor:\s*pointer;/s,
    "The two AI summary entry points should have a visible button surface",
  );
  assert.match(
    styles,
    /\.insights-daily-action:hover,\s*\.insights-weekly-action:hover/s,
    "The two AI summary entry points should expose a hover state",
  );
  assert.match(
    styles,
    /\.insights-daily-action:active,\s*\.insights-weekly-action:active/s,
    "The two AI summary entry points should expose a pressed state",
  );
});
