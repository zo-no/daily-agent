import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  collectNextStaticAssetPaths,
  validateRuntimeDistDir,
} from "../ops/verify-tencent-release.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

test("public root install is independent from CatPaw's private npm graph", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const packageLock = await read("package-lock.json");
  const catpawPackage = JSON.parse(await read("ops/catpaw/package.json"));
  const catpawLock = await read("ops/catpaw/package-lock.json");

  assert.equal(packageJson.dependencies?.["@mtfe/hlb"], undefined);
  assert.doesNotMatch(packageLock, /@mtfe\/hlb|r\.npm\.sankuai\.com/i);
  assert.equal(catpawPackage.private, true);
  assert.equal(catpawPackage.dependencies?.["@mtfe/hlb"], "1.0.0");
  assert.match(catpawLock, /@mtfe\/hlb/);
  assert.match(catpawLock, /r\.npm\.sankuai\.com/i);

  const registrationEntry = await read("ops/register-cargo-service.cjs");
  const isolatedRegistration = await read("ops/catpaw/register-cargo-service.cjs");
  assert.match(registrationEntry, /\.\/catpaw\/register-cargo-service\.cjs/);
  assert.match(isolatedRegistration, /require\("@mtfe\/hlb"\)/);

  for (const manifestPath of ["manifest.yaml", ".catpaw/catpaw_deploy.yaml"]) {
    const manifest = await read(manifestPath);
    assert.match(manifest, /npm ci --prefix ops\/catpaw --no-audit --no-fund/);
  }
});

test("GitHub quality and Tencent deploy jobs have separate safe concurrency", async () => {
  const workflow = await read(".github/workflows/quality.yml");

  assert.match(workflow, /^permissions:\s*\n\s+contents:\s+read$/m);
  assert.match(workflow, /^\s{2}source-diff:\s*[\s\S]*?fetch-depth:\s+2[\s\S]*?git diff --check HEAD\^ HEAD/m);
  assert.match(workflow, /^\s{2}check:\s*\n\s+needs:\s+source-diff/m);
  assert.match(workflow, /^\s{2}check:\s*[\s\S]*?concurrency:\s*\n\s+group:\s+quality-/m);
  assert.match(workflow, /cancel-in-progress:\s+true/);
  assert.match(workflow, /E2E_OUTPUT_DIR:\s+\/tmp\/log-note-e2e/);
  assert.doesNotMatch(workflow, /E2E_OUTPUT_DIR:\s+\$\{\{ runner\.temp \}\}/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);

  assert.match(workflow, /^\s{2}deploy-tencent:\s*$/m);
  assert.match(workflow, /needs:\s+check/);
  assert.match(workflow, /^\s{2}deploy-tencent:\s*[\s\S]*?timeout-minutes:\s+30/m);
  assert.match(workflow, /github\.event_name == 'push'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/master'/);
  assert.match(workflow, /environment:\s*\n\s+name:\s+production/);
  assert.match(workflow, /group:\s+tencent-production/);
  assert.match(workflow, /cancel-in-progress:\s+false/);
  assert.match(workflow, /actions\/checkout@v7/);
  assert.match(workflow, /actions\/setup-node@v7[\s\S]*node-version:\s+22/);
  assert.match(workflow, /package-manager-cache:\s+false/);
  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(workflow, /node \.\/ops\/verify-tencent-release\.mjs "\$artifact" "\$GITHUB_SHA"/);
  assert.ok(
    workflow.indexOf("verify-tencent-release.mjs") < workflow.indexOf("sha256sum \"$artifact\""),
    "the final archive must be served and checked before its checksum is retained"
  );
  assert.match(workflow, /TENCENT_SSH_KNOWN_HOSTS/);
  assert.match(workflow, /port_number >= 1 && port_number <= 65535/);
  assert.match(workflow, /ConnectTimeout=15/);
  assert.match(workflow, /sudo -n \/usr\/local\/sbin\/log-note-deploy/);
  assert.doesNotMatch(workflow, /ssh-keyscan|@mtfe\/hlb|r\.npm\.sankuai\.com|catpaw_deploy/);
});

test("Tencent release builder packages standalone output with exact revision metadata", async () => {
  const nextConfig = await read("next.config.mjs");
  const buildScript = await read("ops/build-tencent-release.sh");

  assert.match(nextConfig, /output:\s*["']standalone["']/);
  assert.match(buildScript, /^#!\/usr\/bin\/env bash\n/);
  assert.match(buildScript, /^set -euo pipefail$/m);
  assert.match(buildScript, /NEXT_DIST_DIR=.*npm run build/);
  assert.match(buildScript, /\/standalone/);
  assert.match(buildScript, /\/static/);
  assert.match(buildScript, /\/public/);
  assert.match(buildScript, /release\.json/);
  assert.match(buildScript, /sourceRevision/);
  assert.match(buildScript, /runtimeDistDir/);
  assert.match(buildScript, /\$stage_dir\/\$runtime_dist_dir\/static/);
  assert.match(buildScript, /tar --create --gzip/);
  assert.match(buildScript, /find .* -name '\.env\*' -exec rm -f/);
  assert.match(buildScript, /node_modules\/@mtfe/);
  assert.doesNotMatch(buildScript, /cp [^\n]*(?:ops\/catpaw|\.env)/);
});

test("Tencent host contract validates immutable input and rolls back without release deletion", async () => {
  const deployPath = path.join(repositoryRoot, "ops", "deploy-tencent-release.sh");
  const deployScript = await read("ops/deploy-tencent-release.sh");
  const launcher = await read("ops/start-tencent-server.sh");
  const service = await read("ops/systemd/log-note.service");
  const sudoers = await read("ops/sudoers/log-note-deploy");

  assert.match(deployScript, /^#!\/usr\/bin\/env bash\n/);
  assert.match(deployScript, /^set -euo pipefail$/m);
  assert.match(deployScript, /deploy_root=\/opt\/log-note/);
  assert.match(deployScript, /expected_artifact=.*\/incoming\/log-note-/);
  assert.match(deployScript, /sha256sum/);
  assert.match(deployScript, /tar --list --gzip/);
  assert.match(deployScript, /release\.json/);
  assert.match(deployScript, /sourceRevision/);
  assert.match(deployScript, /runtimeDistDir/);
  assert.match(deployScript, /\$candidate\/\$runtime_dist_dir\/static/);
  assert.doesNotMatch(deployScript, /\$candidate\/\.next\/static/);
  assert.match(deployScript, /\.artifact-sha256/);
  assert.match(deployScript, /chown -R root:/);
  assert.match(deployScript, /flock/);
  assert.match(deployScript, /current\.next/);
  assert.match(deployScript, /mv --no-target-directory/);
  assert.match(deployScript, /find .* -type l -print -quit/);
  assert.match(deployScript, /systemctl restart log-note && wait_for_health/);
  assert.match(deployScript, /127\.0\.0\.1:3100\/api\/healthz/);
  assert.match(deployScript, /previous_target/);
  assert.doesNotMatch(deployScript, /npm (?:ci|install)|next build|git (?:pull|clone)|rm -rf .*releases|find .*releases.*-delete|nginx|catpaw/i);

  assert.match(launcher, /^#!\/usr\/bin\/env bash\n/);
  assert.match(launcher, /if \[\[ -f server\.js \]\]/);
  assert.match(launcher, /node_modules\/next\/dist\/bin\/next/);
  assert.match(launcher, /start -H/);
  assert.doesNotMatch(launcher, /npm (?:ci|install)|next build|git (?:pull|clone)|rm -rf|catpaw/i);

  assert.match(service, /^User=lognote$/m);
  assert.match(service, /^Environment=HOSTNAME=127\.0\.0\.1$/m);
  assert.match(service, /^Environment=PORT=3100$/m);
  assert.match(service, /^EnvironmentFile=-\/opt\/log-note\/shared\/\.env\.production$/m);
  assert.match(service, /^ExecStart=\/usr\/local\/sbin\/log-note-start$/m);
  assert.doesNotMatch(service, /node_modules\/next|0\.0\.0\.0/);

  assert.match(sudoers, /^lognote-deploy ALL=\(root\) NOPASSWD: \/usr\/local\/sbin\/log-note-deploy$/m);
  assert.doesNotMatch(sudoers, /ALL\s*$/m);

  await assert.rejects(
    execFileAsync("bash", [deployPath, "/tmp/untrusted.tar.gz", "0".repeat(64), "a".repeat(40)]),
    /unexpected incoming artifact path/
  );
});

test("Tencent archive verifier binds homepage assets to the runtime dist directory", () => {
  const revision = "a".repeat(40);
  const runtimeDistDir = ".next-tencent-aaaaaaaaaaaa-1234";

  assert.equal(validateRuntimeDistDir(runtimeDistDir, revision), runtimeDistDir);
  assert.throws(
    () => validateRuntimeDistDir(".next", revision),
    /runtimeDistDir does not match/
  );
  assert.throws(
    () => validateRuntimeDistDir("../.next-tencent-aaaaaaaaaaaa-1234", revision),
    /runtimeDistDir does not match/
  );

  const assets = collectNextStaticAssetPaths(`
    <link rel="stylesheet" href="/_next/static/css/app.css?v=1" />
    <script src="/_next/static/chunks/app.js"></script>
    <script src="/not-a-next-asset.js"></script>
  `);
  assert.deepEqual(assets, [
    "/_next/static/css/app.css?v=1",
    "/_next/static/chunks/app.js",
  ]);
});

test("operations guide separates one-time bootstrap from routine deployment", async () => {
  const guide = await read("ops/tencent-github-deployment.md");
  assert.match(guide, /GitHub.*production environment/is);
  assert.match(guide, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(guide, /TENCENT_SSH_KNOWN_HOSTS/);
  assert.match(guide, /dedicated|restricted/i);
  assert.match(guide, /one-time|一次性/i);
  assert.match(guide, /rollback|回滚/i);
  assert.match(guide, /does not delete|不删除/i);
  assert.match(guide, /CatPaw.*separate|CatPaw.*隔离/is);
});
