import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { postReportDownload } from "../src/lib/report-route.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repositoryRoot, ".catpaw", "catpaw_deploy.yaml");
const plusManifestPath = path.join(repositoryRoot, "manifest.yaml");
const healthRoutePath = path.join(repositoryRoot, "src", "app", "api", "healthz", "route.js");

test("Plus AutoDeploy installs the Node runtime that exposes npm", async () => {
  const manifest = await readFile(plusManifestPath, "utf8");
  const autodeploy = manifest.split(/\nautodeploy:\s*\n/)[1];

  assert.ok(autodeploy, "manifest must define an autodeploy section");
  assert.match(autodeploy, /^\s{2}tools:\s*\n\s{4}mt_node:\s*["']?20["']?\s*$/m);
  assert.doesNotMatch(autodeploy, /^\s{4}dp-nodejs:/m);
  assert.match(autodeploy, /^\s{2}run:\s*npm run start\s*$/m);
});

test("CatPaw manifest exactly matches the reviewed non-secret CloudNative contract", async () => {
  const manifest = await readFile(manifestPath, "utf8");
  assert.equal(manifest, `type: cloudnative
node: 20

cmd:
  - npm ci
  - npm run build

target:
  - ./

runCmd:
  - npm start

ports:
  - 3100
`);

  assert.match(manifest, /^type:\s*cloudnative\s*$/m);
  assert.match(manifest, /^node:\s*20\s*$/m);
  assert.match(manifest, /^cmd:\s*\n\s*- npm ci\s*\n\s*- npm run build\s*$/m);
  assert.match(manifest, /^target:\s*\n\s*- \.\/\s*$/m);
  assert.match(manifest, /^runCmd:\s*\n\s*- npm start\s*$/m);
  assert.match(manifest, /^ports:\s*\n\s*- 3100\s*$/m);
  assert.doesNotMatch(manifest, /\b(?:env|environment|secret|vault|token|key)\s*:/i);
  assert.doesNotMatch(manifest, /(?:DEEPSEEK|SUPABASE|NEXT_PUBLIC|AUTHORIZATION|BEARER)/i);

  const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(packageJson.scripts.start, "next start -p 3100");
});

test("process readiness is fixed, dependency-free, private, and non-identifying", async () => {
  const source = await readFile(healthRoutePath, "utf8");
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|supabase|console\.|authorization|cookie/i);

  const route = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  assert.equal(route.runtime, "nodejs");
  assert.equal(route.dynamic, "force-dynamic");

  const response = route.GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^application\/json\b/i);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await response.json(), { status: "ok", service: "log-note" });
});

test("repository guardrails document the Hackathon-led AIBase/SSO boundary and remote-AI stop condition", async () => {
  const gitignore = await readFile(path.join(repositoryRoot, ".gitignore"), "utf8");
  for (const pattern of [
    "private/",
    "research/",
    "/review-*",
    "output/promo/",
    "output/rail-hierarchy-evidence/",
    "output/catpaw-*/"
  ]) {
    assert.ok(gitignore.split("\n").includes(pattern), `missing protective ignore pattern: ${pattern}`);
  }

  const runbook = await readFile(path.join(repositoryRoot, "ops", "catpaw-internal-pilot.md"), "utf8");
  assert.match(runbook, /2761294276/);
  assert.match(runbook, /Hackathon[\s\S]*CatPaw/i);
  assert.match(runbook, /AIBase/i);
  assert.match(runbook, /meituan_sso/i);
  assert.match(runbook, /stable UUID|UUID owner/i);
  assert.match(runbook, /auth\.users/);
  assert.match(runbook, /two (?:employee )?(?:identities|accounts)|two-identity/i);
  assert.match(runbook, /synthetic non-sensitive/i);
  assert.match(runbook, /Leave these unset[\s\S]*DEEPSEEK_API_KEY/);
  assert.match(runbook, /clean clone/i);
  assert.match(runbook, /Stop immediately/i);
  assert.doesNotMatch(runbook, /dedicated email\/password|external Supabase/i);
  assert.doesNotMatch(runbook, /(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]{12,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})/i);

  const envExample = await readFile(path.join(repositoryRoot, ".env.example"), "utf8");
  assert.match(envExample, /^NEXT_PUBLIC_LOG_NOTE_AUTH_MODE=standard$/m);
  assert.match(envExample, /Meituan-internal[\s\S]*meituan-sso/i);
  assert.match(envExample, /AIBase/i);
  assert.doesNotMatch(envExample, /^(?:SUPABASE_SERVICE_ROLE_KEY|SSO_CLIENT_SECRET|MEITUAN_SSO_SECRET)=/m);
});

test("report API smoke helper validates a synthetic download without logging its body", async () => {
  const smokePath = path.join(repositoryRoot, "scripts", "verify-report-api.mjs");
  const smoke = await import(`${pathToFileURL(smokePath).href}?test=${Date.now()}`);
  const fetchImpl = (url, options) => postReportDownload(new Request(url, options));

  const result = await smoke.verifyReportApi("http://127.0.0.1:3100", { fetchImpl });
  assert.equal(result.status, 200);
  assert.equal(result.filename, "log-note-2026-08-10.md");
  assert.ok(result.bytes > 0);
  assert.deepEqual(Object.keys(result).sort(), ["bytes", "filename", "status"]);

  await assert.rejects(
    () => smoke.verifyReportApi("http://example.com", { fetchImpl }),
    /HTTPS or loopback HTTP/
  );
});
