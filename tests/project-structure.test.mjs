import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const projectFile = (path) => new URL(`../${path}`, import.meta.url);
const readProjectFile = (path) => readFileSync(projectFile(path), "utf8");
const sourceFilesUnder = (directory) =>
  readdirSync(projectFile(directory), { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      return sourceFilesUnder(path);
    }

    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });

test("App Router keeps the legacy templates segment route-only", () => {
  const routeFiles = readdirSync(projectFile("src/app/templates")).filter((name) => !name.startsWith(".")).sort();
  assert.deepEqual(routeFiles, ["page.js"]);

  const legacyRoute = readProjectFile("src/app/templates/page.js");
  assert.match(legacyRoute, /redirect\(params\?\.focus === "periodic"/);
  assert.match(legacyRoute, /\/settings\?focus=periodic#record-setup/);
  assert.match(legacyRoute, /\/settings#record-setup/);
});

test("record setup is private to Settings and shared recording UI has a public entry", () => {
  const recordSetupEntry = "src/app/settings/_components/record-setup/index.js";
  const recordingEntry = "src/app/_components/recording/index.js";

  assert.equal(existsSync(projectFile(recordSetupEntry)), true);
  assert.equal(existsSync(projectFile(recordingEntry)), true);
  assert.match(readProjectFile(recordSetupEntry), /export \{ RecordSetupManager \}/);
  assert.match(readProjectFile(recordingEntry), /export \{ StructuredFields \}/);

  const settingsPage = readProjectFile("src/app/settings/settings-page.js");
  assert.match(settingsPage, /from "\.\/_components\/record-setup"/);
  assert.doesNotMatch(settingsPage, /templates\/template-page/);

  for (const path of ["src/app/record-composer.js", "src/app/fixed-records.js"]) {
    const source = readProjectFile(path);
    assert.match(source, /from "\.\/_components\/recording"/);
    assert.doesNotMatch(source, /templates\/structured-fields/);
  }
});

test("home and Settings preserve their style entry order after colocation", () => {
  const home = readProjectFile("src/app/page.js");
  const settingsRoute = readProjectFile("src/app/settings/page.js");

  assert.match(home, /import "\.\/_components\/home\/home-header\.css";/);
  assert.match(home, /import "\.\/_components\/home\/home-day-plan\.css";\nimport "\.\/_components\/home\/home-timeline\.css";\nimport "\.\/_components\/home\/home-fixed-records\.css";/);
  assert.match(home, /import "\.\/settings\/settings\.css";\nimport "\.\/settings\/_components\/record-setup\/record-setup\.css";/);
  assert.doesNotMatch(home, /settings-dialog\.css|templates\/templates\.css/);
  assert.match(settingsRoute, /import "\.\/settings\.css";\nimport "\.\/_components\/record-setup\/record-setup\.css";/);
  assert.doesNotMatch(settingsRoute, /settings-dialog\.css|templates\/templates\.css/);
});

test("home keeps the App Router entry thin and client orchestration private", () => {
  const route = readProjectFile("src/app/page.js");
  const homeEntry = readProjectFile("src/app/_components/home/index.js");
  const homePage = readProjectFile("src/app/_components/home/home-page.js");

  assert.doesNotMatch(route, /["']use client["']/);
  assert.match(route, /import \{ HomePage \} from "\.\/_components\/home"/);
  assert.match(route, /return <HomePage \/>/);
  assert.match(homeEntry, /export \{ HomePage \} from "\.\/home-page"/);
  assert.match(homePage, /^"use client";/);

  for (const name of [
    "agent-diary-review.js",
    "home-domain-rail.js",
    "home-header.js",
    "home-record-views.js",
    "use-draft-attachments.js",
    "use-home-agent.js",
    "use-home-date-swipe.js",
    "use-home-record-model.js",
  ]) {
    assert.equal(existsSync(projectFile(`src/app/_components/home/${name}`)), true);
    assert.equal(existsSync(projectFile(`src/app/${name}`)), false);
  }
});

test("AI-ready context stays discoverable and source dependencies remain one-way", () => {
  const agentInstructions = readProjectFile("AGENTS.md");
  const architecture = readProjectFile("ARCHITECTURE.md");

  assert.match(agentInstructions, /Read `ARCHITECTURE\.md` before generating code/);
  assert.match(agentInstructions, /Runtime AI output is an untrusted proposal/);
  assert.match(architecture, /### AI-ready 架构目标/);
  assert.match(architecture, /strict schema validation/);
  assert.match(architecture, /one atomic commitData/);
  assert.equal(existsSync(projectFile("src/pages")), false);

  const forbiddenAppDependency =
    /(?:from\s+|import\s*(?:\(\s*)?)["'](?:@\/app(?:\/|["'])|(?:\.\.\/)+app(?:\/|["']))/;

  for (const path of sourceFilesUnder("src/lib")) {
    assert.doesNotMatch(
      readProjectFile(path),
      forbiddenAppDependency,
      `${path} must not import src/app`,
    );
  }

  const forbiddenModuleDependency = /(?:from\s+|import\s*(?:\(\s*)?)["'](?:@\/app(?:\/|["'])|(?:\.\.\/)+app(?:\/|["']))/;
  for (const path of sourceFilesUnder("src/modules")) {
    assert.doesNotMatch(readProjectFile(path), forbiddenModuleDependency, `${path} must not import src/app`);
    assert.doesNotMatch(readProjectFile(path), /(?:@\/|(?:\.\.\/)+)mastra\//, `${path} must use the infrastructure AI port instead of Mastra directly`);
  }

  const forbiddenSharedDependency = /(?:from\s+|import\s*(?:\(\s*)?)["'](?:@\/(?:app|modules|infrastructure|mastra)(?:\/|["'])|(?:\.\.\/)+(?:app|modules|infrastructure|mastra)(?:\/|["']))/;
  for (const path of sourceFilesUnder("src/shared")) {
    assert.doesNotMatch(readProjectFile(path), forbiddenSharedDependency, `${path} must remain business- and framework-agnostic`);
  }

  const forbiddenInfrastructureDependency = /(?:from\s+|import\s*(?:\(\s*)?)["'](?:@\/(?:app|modules)(?:\/|["'])|(?:\.\.\/)+(?:app|modules)(?:\/|["']))/;
  for (const path of sourceFilesUnder("src/infrastructure")) {
    assert.doesNotMatch(readProjectFile(path), forbiddenInfrastructureDependency, `${path} must not depend on app or business modules`);
  }
});

test("architecture knowledge follows arc42, C4, MADR, and Living Spec boundaries", () => {
  const architecture = readProjectFile("ARCHITECTURE.md");
  const projectContext = readProjectFile("PROJECT_CONTEXT.md");
  const agents = readProjectFile("AGENTS.md");
  const constitution = readProjectFile(".specify/memory/constitution.md");
  const decisionIndex = readProjectFile("docs/decisions/README.md");
  const appRouterDecision = readProjectFile(
    "docs/decisions/0001-nextjs-app-router-before-fsd.md",
  );
  const knowledgeDecision = readProjectFile(
    "docs/decisions/0002-use-arc42-c4-madr-with-spec-kit.md",
  );
  const mastraDecision = readProjectFile(
    "docs/decisions/0003-embed-mastra-without-standalone-runtime.md",
  );

  const arc42Sections = [
    "1. 引言与目标",
    "2. 架构约束",
    "3. 上下文与范围",
    "4. 解决方案策略",
    "5. 构建块视图",
    "6. 运行时视图",
    "7. 部署视图",
    "8. 横切概念",
    "9. 架构决策",
    "10. 质量要求",
    "11. 风险与技术债",
    "12. 术语表",
  ];

  for (const section of arc42Sections) {
    assert.equal(
      architecture.includes(`## ${section}`),
      true,
      `ARCHITECTURE.md must keep arc42 section ${section}`,
    );
  }

  assert.equal((architecture.match(/```mermaid/g) ?? []).length, 2);
  assert.match(architecture, /C4 系统上下文/);
  assert.match(architecture, /C4 容器视图/);
  assert.match(architecture, /docs\/decisions\/0001-nextjs-app-router-before-fsd\.md/);
  assert.match(architecture, /docs\/decisions\/0002-use-arc42-c4-madr-with-spec-kit\.md/);
  assert.match(architecture, /docs\/decisions\/0003-embed-mastra-without-standalone-runtime\.md/);
  assert.match(architecture, /src\/mastra\//);
  assert.match(architecture, /不得接管鉴权、业务 schema、allowlist、确认、写入或撤销/);

  assert.match(decisionIndex, /MADR 4\.0/);
  assert.match(decisionIndex, /ADR-0001/);
  assert.match(decisionIndex, /ADR-0002/);
  assert.match(decisionIndex, /ADR-0003/);
  assert.match(appRouterDecision, /status: accepted/);
  assert.match(appRouterDecision, /App Router 为骨架/);
  assert.match(knowledgeDecision, /status: accepted/);
  assert.match(knowledgeDecision, /精简 arc42、C4 和 MADR/);
  assert.match(mastraDecision, /status: accepted/);
  assert.match(mastraDecision, /无工具、无 Agent 记忆、无应用持久化/);
  assert.match(mastraDecision, /内部 Plus\/Cargo\/CatPaw 仍固定 Node 20/);

  assert.match(constitution, /Version\*\*: 1\.1\.0/);
  assert.match(constitution, /`ARCHITECTURE\.md` is the current technical-baseline source/);
  assert.match(constitution, /Living Spec semantics/);
  assert.match(constitution, /Important implementation\s+rationale MUST move to an ADR/);

  assert.match(agents, /Read `PROJECT_CONTEXT\.md`/);
  assert.match(projectContext, /不替代产品、任务、架构或功能规格真源/);
  assert.match(projectContext, /app → modules → shared \/ infrastructure/);
  assert.match(projectContext, /POST \/api\/organize\/agent/);
  assert.match(projectContext, /Supabase bearer verification/);
  assert.match(projectContext, /request-scoped Mastra Agent\/Workflow/);
  assert.match(projectContext, /npm run check/);
});

test("DDD AI capabilities use one Mastra boundary with no superseded direct execution", () => {
  const sharedPaths = [
    "src/shared/ai/http-boundary.mjs",
    "src/shared/ai/remote-request.mjs",
    "src/shared/ai/rate-limit.mjs"
  ];
  const infrastructurePaths = [
    "src/infrastructure/ai/deepseek-execution.mjs",
    "src/infrastructure/ai/route-error.mjs"
  ];
  const routePaths = [
    "src/modules/assistant/review/server.mjs",
    "src/modules/organize/daily-review/server.mjs",
    "src/modules/organize/classification/server.mjs",
    "src/modules/insights/domain-review/server.mjs",
    "src/modules/composer/content-improvement/server.mjs",
    "src/modules/insights/domain-daily-summary/server.mjs",
    "src/modules/insights/calendar-diary-review/server.mjs"
  ];
  const routeSource = routePaths.map(readProjectFile).join("\n");
  const browserProviderPaths = [
    "src/modules/assistant/review/client.mjs",
    "src/modules/organize/daily-review/client.mjs",
    "src/modules/organize/classification/client.mjs",
    "src/modules/insights/domain-review/client.mjs",
    "src/modules/composer/content-improvement/client.mjs",
    "src/modules/insights/domain-daily-summary/client.mjs",
    "src/modules/insights/calendar-diary-review/client.mjs"
  ];
  const runtimeSource = readProjectFile("src/mastra/index.mjs");
  const modelBoundary = readProjectFile("src/infrastructure/ai/deepseek-execution.mjs");
  const routeBoundary = readProjectFile("src/shared/ai/http-boundary.mjs");
  const packageJson = JSON.parse(readProjectFile("package.json"));

  for (const path of [...sharedPaths, ...infrastructurePaths, ...routePaths, ...browserProviderPaths]) {
    assert.equal(existsSync(projectFile(path)), true, `${path} must stay in its DDD capability slice`);
  }
  for (const legacyPath of [
    "src/lib/ai-route-boundary.mjs",
    "src/lib/deepseek-model.mjs",
    "src/lib/deepseek-route-error.mjs",
    "src/lib/remote-ai-request.mjs",
    "src/lib/agent-review-route.mjs",
    "src/lib/daily-review-route.mjs",
    "src/lib/ai-classifier-route.mjs",
    "src/lib/domain-review-route.mjs",
    "src/lib/content-improvement-route.mjs",
    "src/lib/ai/shared/http-boundary.mjs",
    "src/lib/assistant/review/server.mjs",
    "src/lib/organize/classification/server.mjs",
    "src/lib/insights/domain-review/server.mjs",
    "src/lib/composer/content-improvement/server.mjs"
  ]) {
    assert.equal(existsSync(projectFile(legacyPath)), false, `${legacyPath} must not regain a flat duplicate`);
  }

  for (const capabilityId of [
    "diary-review",
    "plan-review",
    "daily-review",
    "category-classifier",
    "domain-review",
    "content-improvement",
    "domain-daily-summary",
    "calendar-diary-review"
  ]) {
    assert.match(routeSource, new RegExp(`\\b${capabilityId}\\b`));
  }
  assert.match(runtimeSource, /runStructuredProposal/);
  assert.match(modelBoundary, /mastra\/index\.mjs/);
  for (const path of routePaths) {
    const source = readProjectFile(path);
    assert.match(source, /deepseek-execution\.mjs/);
    assert.match(source, /route-error\.mjs/);
    assert.match(source, /runDeepSeekProposal/);
    assert.doesNotMatch(source, /mastra\/index\.mjs/);
  }
  for (const path of browserProviderPaths) {
    const source = readProjectFile(path);
    assert.match(source, /remote-request\.mjs/);
    assert.match(source, /postRemoteAiJson/);
  }
  assert.doesNotMatch(routeSource, /from ["']ai["']/);
  assert.doesNotMatch(routeSource, /\bgenerateText\b|\bOutput\.object\b|\/chat\/completions/);
  assert.doesNotMatch(routeBoundary, /mastra|deepseek-model|openai-compatible/i);
  assert.match(readProjectFile("src/shared/ai/rate-limit.mjs"), /createAiRateLimiter/);
  assert.doesNotMatch(readProjectFile("src/modules/organize/classification/server.mjs"), /createAiRateLimiter/);
  for (const path of ["src/modules/assistant/review/model.mjs", "src/modules/insights/domain-review/model.mjs"]) {
    assert.match(readProjectFile(path), /http-boundary\.mjs/);
    assert.doesNotMatch(readProjectFile(path), /organize\/classification\/server/);
  }
  assert.equal(Object.hasOwn(packageJson.dependencies ?? {}, "ai"), false);
  assert.equal(Object.hasOwn(packageJson.dependencies ?? {}, "@mastra/core"), true);
  assert.equal(Object.hasOwn(packageJson.dependencies ?? {}, "@ai-sdk/openai-compatible"), true);

  assert.equal(existsSync(projectFile("src/shared/auth/model.mjs")), true);
  assert.equal(existsSync(projectFile("src/infrastructure/auth/supabase-browser.js")), true);
  assert.equal(existsSync(projectFile("src/infrastructure/auth/supabase-access-token.mjs")), true);
  assert.equal(existsSync(projectFile("src/lib/auth-model.mjs")), false);
  assert.equal(existsSync(projectFile("src/app/supabase-browser.js")), false);
  for (const path of [
    "src/app/api/organize/agent/route.js",
    "src/app/api/organize/analyze/route.js",
    "src/app/api/organize/review/route.js",
    "src/app/api/organize/domain-review/route.js",
    "src/app/api/organize/domain-daily-summary/route.js",
    "src/app/api/organize/day-review/route.js",
    "src/app/api/records/improve/route.js"
  ]) {
    const source = readProjectFile(path);
    assert.match(source, /verifySupabaseAccessToken/);
    assert.doesNotMatch(source, /@supabase\/supabase-js|NEXT_PUBLIC_SUPABASE/);
  }

  const contentImprovementRoute = readProjectFile("src/app/api/records/improve/route.js");
  assert.match(contentImprovementRoute, /postContentImprovement/);
  assert.match(contentImprovementRoute, /createAiRateLimiter/);
  assert.doesNotMatch(contentImprovementRoute, /deepseek|mastra/i);

  const dailyRoute = readProjectFile("src/modules/insights/domain-daily-summary/server.mjs");
  const dailyPage = readProjectFile("src/app/insights/daily-domain-summary.js");
  assert.match(dailyRoute, /runDeepSeekProposal/);
  assert.match(dailyRoute, /capabilityId:\s*"domain-daily-summary"/);
  assert.match(dailyRoute, /retries:\s*0|runDeepSeekProposal/);
  assert.doesNotMatch(dailyRoute, /memory|persist|snapshot/i);
  assert.doesNotMatch(dailyPage, /localStorage|sessionStorage|commitData|fetch\(/);
  assert.match(readProjectFile("src/app/api/organize/domain-daily-summary/route.js"), /postDomainDailySummary/);

  const studioEntry = readProjectFile("src/mastra/index.ts");
  const studioDaily = readProjectFile("src/mastra/studio-domain-daily-summary.mjs");
  const studioCalendar = readProjectFile("src/mastra/studio-calendar-diary-review.mjs");
  assert.match(studioEntry, /domainDailySummaryStudioAgent/);
  assert.match(studioEntry, /domainDailySummaryStudioWorkflow/);
  assert.match(studioDaily, /domainDailySummaryInputSchema/);
  assert.match(studioDaily, /domainDailySummaryOutputSchema/);
  assert.match(studioDaily, /normalizeDomainDailySummaryOutput/);
  assert.doesNotMatch(studioDaily, /supabase|localStorage|sessionStorage|commitData|tools\s*:|memory\s*:|storage\s*:/i);
  assert.match(studioEntry, /calendarDiaryReviewStudioAgent/);
  assert.match(studioEntry, /calendarDiaryReviewStudioWorkflow/);
  assert.match(studioCalendar, /calendarDiaryReviewInputSchema/);
  assert.match(studioCalendar, /calendarDiaryReviewOutputSchema/);
  assert.match(studioCalendar, /normalizeCalendarDiaryReviewOutput/);
  assert.doesNotMatch(studioCalendar, /supabase|localStorage|sessionStorage|commitData|tools\s*:|memory\s*:|storage\s*:/i);
  assert.equal(packageJson.scripts?.studio, "mastra dev --dir src/mastra");
  assert.equal(packageJson.devDependencies?.mastra, "^1.27.2");
});
