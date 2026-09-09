import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("cloud bootstrap failures keep the local-first home usable", () => {
  const provider = readProjectFile("src/app/_providers/log-note-data-provider.js");
  assert.doesNotMatch(provider, /loadBlocked/);
  assert.match(provider, /if \(!localExists\) \{[\s\S]*persistLocal\(localState, true\);[\s\S]*setHydrated\(true\);/);
});

test("day plan exposes a non-blocking remote sync status", () => {
  const homePage = readProjectFile("src/app/_components/home/home-page.js");
  const calendarView = readProjectFile("src/app/_components/calendar-view.js");
  const i18n = readProjectFile("src/lib/i18n.mjs");
  assert.match(homePage, /const \{ data, commitData, hydrated, sync \} = useLogNoteData/);
  assert.match(homePage, /cloudSyncStatus=\{sync\.status\}/);
  assert.match(calendarView, /\["load-error", "offline", "retrying", "error", "setup-required"\]/);
  assert.match(calendarView, /home\.cloudSyncUnavailable/);
  assert.match(i18n, /"home\.cloudSyncUnavailable": "无法同步远端"/);
});

test("authentication gates cloud sync without gating the workspace", () => {
  const authProvider = readProjectFile("src/app/_providers/auth-provider.js");
  const appProviders = readProjectFile("src/app/_providers/app-providers.js");
  const dataProvider = readProjectFile("src/app/_providers/log-note-data-provider.js");
  assert.match(authProvider, /export function AuthGate\(\{ children \}\) \{[\s\S]*return children;/);
  assert.match(appProviders, /<LogNoteDataProvider>[\s\S]*<AuthGate>\{children\}<\/AuthGate>/);
  assert.match(dataProvider, /const anonymous = !identity\?\.id;/);
  assert.match(dataProvider, /const scopedKey = anonymous \|\| testAuthEnabled \? STORAGE_KEY : accountDataStorageKey\(identity\.id\);/);
  assert.match(dataProvider, /if \(!identity\?\.id\) \{[\s\S]*status: "local-only"/);
  assert.match(dataProvider, /sync\.guestPrompt/);
});
