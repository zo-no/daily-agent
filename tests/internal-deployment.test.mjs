import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { postReportDownload } from "../src/lib/report-route.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repositoryRoot, ".catpaw", "catpaw_deploy.yaml");
const plusManifestPath = path.join(repositoryRoot, "manifest.yaml");
const cargoStartPath = path.join(repositoryRoot, "ops", "start-cargo.sh");
const cargoRegistrationPath = path.join(repositoryRoot, "ops", "register-cargo-service.cjs");
const isolatedCargoRegistrationPath = path.join(repositoryRoot, "ops", "catpaw", "register-cargo-service.cjs");
const healthRoutePath = path.join(repositoryRoot, "src", "app", "api", "healthz", "route.js");
const octoHealthRoutePath = path.join(repositoryRoot, "src", "app", "monitor", "alive", "route.js");
const require = createRequire(import.meta.url);

test("Plus uses the manifest-provisioned supported Node 22 tool for build and Cargo runtime", async () => {
  const manifest = await readFile(plusManifestPath, "utf8");
  const build = manifest.split(/\nbuild:\s*\n/)[1]?.split(/\nautodeploy:\s*\n/)[0];
  const autodeploy = manifest.split(/\nautodeploy:\s*\n/)[1];

  assert.ok(build, "manifest must define a build section");
  assert.ok(autodeploy, "manifest must define an autodeploy section");
  assert.doesNotMatch(manifest, /^common:/m);
  assert.match(build, /^\s{2}os:\s*centos7\s*$/m);
  assert.match(build, /^\s{4}node:\s*["']?22["']?\s*$/m);
  assert.match(build, /^\s{6}- npm ci --no-audit --no-fund\s*$/m);
  assert.match(build, /^\s{6}- npm ci --prefix ops\/catpaw --no-audit --no-fund\s*$/m);
  assert.doesNotMatch(build, /dp-nodejs|mkdir -p runtime|command -v node/);
  assert.match(build, /^\s{6}- \.\/\.next\s*$/m);
  assert.match(autodeploy, /^\s{2}hulkos:\s*centos7\s*$/m);
  assert.match(autodeploy, /^\s{4}node:\s*["']?22["']?\s*$/m);
  assert.match(autodeploy, /^\s{2}run:\s*\.\/ops\/start-cargo\.sh\s*$/m);

  const cargoStart = await readFile(cargoStartPath, "utf8");
  assert.match(cargoStart, /^#!\/usr\/bin\/env bash\n/);
  assert.match(cargoStart, /^set -euo pipefail$/m);
  assert.match(cargoStart, /^node_bin="\$\(command -v node\)"$/m);
  assert.match(cargoStart, /major < 22 \|\| \(major === 22 && minor < 13\)/);
  assert.match(cargoStart, /^"\$node_bin" \.\/ops\/register-cargo-service\.cjs$/m);
  assert.match(
    cargoStart,
    /^exec "\$node_bin" \.\/node_modules\/next\/dist\/bin\/next start -H 0\.0\.0\.0 -p 3100$/m
  );
  const cargoCommands = cargoStart.split("\n").filter((line) => line && !line.startsWith("#")).join("\n");
  assert.doesNotMatch(cargoCommands, /\bnpm\b|(?:^|\s)(?:source|nohup)(?:\s|$)|&\s*$/m);
  assert.ok(
    cargoStart.indexOf("./ops/register-cargo-service.cjs") < cargoStart.indexOf("./node_modules/next/"),
    "OCTO registration must finish before Next.js starts"
  );
});

test("Cargo registers the exact AppKey and port with a bounded, redacted startup contract", async () => {
  const entrySource = await readFile(cargoRegistrationPath, "utf8");
  const source = await readFile(isolatedCargoRegistrationPath, "utf8");
  assert.match(entrySource, /\.\/catpaw\/register-cargo-service\.cjs/);
  assert.match(source, /require\("@mtfe\/hlb"\)/);
  assert.match(source, /com\.sankuai\.hackathon\.ai2026\.clockwork/);
  assert.match(source, /port:\s*3100/);
  assert.match(source, /DEFAULT_TIMEOUT_MS\s*=\s*10_000/);
  assert.doesNotMatch(source, /console\.|process\.env|authorization|bearer|token|secret|password/i);

  const { DEFAULT_TIMEOUT_MS, SERVICE, registerCargoService, waitForWorker } = require(cargoRegistrationPath);
  assert.equal(DEFAULT_TIMEOUT_MS, 10_000);
  assert.deepEqual(SERVICE, {
    appkey: "com.sankuai.hackathon.ai2026.clockwork",
    port: 3100
  });

  let observedService;
  await registerCargoService(async (service) => {
    observedService = service;
  });
  assert.equal(observedService, SERVICE);

  await assert.rejects(() => registerCargoService(null), /must be a function/);

  const successfulWorker = new EventEmitter();
  successfulWorker.kill = () => assert.fail("successful worker must not be killed");
  const success = waitForWorker(successfulWorker, 50);
  successfulWorker.emit("exit", 0);
  await success;

  const failedWorker = new EventEmitter();
  failedWorker.kill = () => assert.fail("failed worker must not wait for the watchdog");
  const failure = waitForWorker(failedWorker, 50);
  failedWorker.emit("exit", 1);
  await assert.rejects(() => failure, /worker failed/);

  const brokenWorker = new EventEmitter();
  brokenWorker.kill = () => assert.fail("broken worker must not wait for the watchdog");
  const broken = waitForWorker(brokenWorker, 50);
  brokenWorker.emit("error", new Error("synthetic spawn failure"));
  await assert.rejects(() => broken, /worker failed/);

  const blockedWorker = new EventEmitter();
  const killSignals = [];
  blockedWorker.kill = (signal) => killSignals.push(signal);
  await assert.rejects(() => waitForWorker(blockedWorker, 5), /timed out/);
  assert.deepEqual(killSignals, ["SIGKILL"]);
});

test("CatPaw manifest exactly matches the reviewed non-secret CloudNative contract", async () => {
  const manifest = await readFile(manifestPath, "utf8");
  assert.equal(manifest, `type: cloudnative
node: 22

cmd:
  - npm ci --no-audit --no-fund
  - npm ci --prefix ops/catpaw --no-audit --no-fund
  - npm run build

target:
  - ./

runCmd:
  - npm start

ports:
  - 3100
`);

  assert.match(manifest, /^type:\s*cloudnative\s*$/m);
  assert.match(manifest, /^node:\s*22\s*$/m);
  assert.match(manifest, /^cmd:\s*\n\s*- npm ci --no-audit --no-fund\s*\n\s*- npm ci --prefix ops\/catpaw --no-audit --no-fund\s*\n\s*- npm run build\s*$/m);
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

test("OCTO health readiness is fixed, private, and non-identifying", async () => {
  const source = await readFile(octoHealthRoutePath, "utf8");
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|supabase|console\.|authorization|cookie/i);

  const route = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  assert.equal(route.runtime, "nodejs");
  assert.equal(route.dynamic, "force-dynamic");

  const response = route.GET();
  assert.equal(response.status, 200);
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
