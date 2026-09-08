import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Calendar client keeps incremental requests bounded and conditional", async () => {
  const source = await readProjectFile("src/app/_providers/google-calendar-client.js");
  assert.match(source, /listGoogleEventsIncremental[\s\S]*showDeleted:\s*["']true["']/);
  assert.match(source, /listGoogleEventsInRangeWithSyncToken[\s\S]*timeMin[\s\S]*timeMax[\s\S]*showDeleted:\s*["']true["']/);
  assert.match(source, /updateGoogleEvent\([\s\S]*If-Match/);
  assert.match(source, /deleteGoogleEvent\([\s\S]*If-Match/);
  assert.match(source, /status === 410[\s\S]*sync-token-expired/);
  assert.match(source, /status === 412[\s\S]*etag-mismatch/);
});

test("Calendar provider reuses the current cursor and guards lifecycle changes", async () => {
  const source = await readProjectFile("src/app/_providers/google-calendar-provider.js");
  assert.match(source, /const cacheRef = useRef\(cache\)/);
  assert.match(source, /const syncCache = cacheRef\.current/);
  assert.match(source, /listGoogleEventsIncremental\(token, syncCache\.syncToken\)/);
  assert.match(source, /error\?\.code !== "sync-token-expired"/);
  assert.match(source, /setStatus\("rebuilding"\)/);
  assert.match(source, /error\?\.code === "etag-mismatch"/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.match(source, /window\.addEventListener\("online"/);
  assert.match(source, /setInterval\(\(\) =>/);
  assert.match(source, /identityRef\.current === syncUserId/);
  assert.match(source, /managedIssueForPair/);
  assert.match(source, /reconciliation\.missingPairs/);
  assert.match(source, /reconciliation\.conflictPairs/);
  assert.match(source, /keepLocalManagedPlan/);
  assert.match(source, /adoptGoogleManagedPlan/);
});

test("Calendar settings expose explicit managed-event recovery choices", async () => {
  const source = await readProjectFile("src/app/settings/settings-page.js");
  assert.match(source, /googleCalendar\.managedIssues/);
  assert.match(source, /googleCalendarKeepLocal/);
  assert.match(source, /googleCalendarUseGoogle/);
  assert.match(source, /data-google-calendar-managed-issues/);
});
