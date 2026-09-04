---
status: accepted
date: 2026-09-01
decision-makers:
  - project-owner
---

# 在 Next.js 服务内嵌 Mastra，不建设独立 Agent Runtime

## Context and Problem Statement

Log Note 已有 Diary/Plan 分析与回复、单日时间梳理、现有分类整理和七日领域总结，但服务端执行分散在 Diary 专用 Mastra、项目直接 AI SDK 调用和手写 DeepSeek HTTP 三条路径。项目负责人希望采用社区维护的 Agent/Workflow 框架统一现有远程 AI，减少自建 Runtime；同时不希望新增独立部署、网络协议、持久记忆或通用工具平台。Mastra 应作为应用依赖直接嵌入，还是演变为独立 Agent 服务？

## Decision Drivers

- 保持现有 `/api/organize/agent`、`/review`、`/analyze`、`/domain-review` 请求、响应、页面、本地降级和显式确认行为不变。
- 使用社区维护的 Agent 与 Workflow 结构，不复制通用执行引擎。
- 框架不得获得记录写权限，也不得绕过分类 allowlist、两次回答上限和互斥终态。
- 在只有一个已确认消费者时，避免第二个部署、认证层、网络跳数和业务协议。
- 结构必须可替换：移除框架后不迁移数据、不改变 UI，也不影响离线手工路径。
- 上游 Node 与依赖安全要求必须成为显式发行闸门，不能由本机偶然通过代替。

## Considered Options

- 继续保留项目直接 AI SDK、Diary 专用 Mastra 和手写 DeepSeek HTTP 三条执行路径。
- 在现有 Next.js 服务内嵌 Mastra Agent 与 Workflow。
- 部署独立 Mastra Runtime，供 Log Note 和未来业务页通过 HTTP 调用。
- 接入 Dify/LangGraph 等外部工作流平台并建立新的远端协议。

## Decision Outcome

Chosen option: “在现有 Next.js 服务内嵌 Mastra Agent 与 Workflow”，because 它提供所需的社区编排结构，同时不提前建设第二个服务或放大模型权限。

责任边界如下：

- `src/mastra/` 只组合固定 capability 的无工具、无 Agent 记忆、无应用持久化 Agent 和瞬态 Workflow。一次运行最多执行一次结构化模型调用，零自动重试，再调用由项目注入的归一化函数；Workflow snapshot 明确关闭。
- `src/infrastructure/ai/deepseek-execution.mjs` 是唯一 Provider construction boundary，统一 HTTPS/local-test URL、服务端 secret、model ID、20 秒 timeout 和解析前 512 KiB response bound。
- 七个 capability 的 `src/modules/**/server.mjs` 继续拥有鉴权后的输入裁剪、业务 schema 和对应 normalizer；通用请求约束和限流留在 `src/shared/ai/`，Provider 与公开错误转换留在 `src/infrastructure/ai/`，模型执行只委托给 Mastra。
- 各 capability 就近的 `model.mjs` 继续拥有各自 ID allowlist、候选/排序/来源限制、两次回答上限、互斥结果和总结安全边界。框架输出始终是不可信提案。
- React 页面继续拥有瞬态会话、显式确认、`commitData` 与撤销。展示、回答和生成均不写入。
- 不启用 Mastra tools、Agent memory、应用持久存储、suspend/resume、后台 runner、独立 server 或跨业务 Runtime API；Mastra 自带的进程内默认 store 不承载业务状态。第二个真实消费者出现后，再根据复用证据单独评估服务化。
- `@mastra/core` 精确锁定为 `1.63.2`。Mastra 声明 Node.js `>=22.13.0`；公开腾讯路径满足，内部 Plus/Cargo/CatPaw 发行契约已升级为 Node 22，并在 Cargo 启动时拒绝低于 22.13 的实际运行时。

### Consequences

- Good, because Agent/Workflow 的框架代码集中在 `src/mastra/`，业务策略和写权限仍留在项目层。
- Good, because 公共 API、浏览器 Provider、五类用户能力、离线降级、存储和备份均不变化。
- Good, because 项目不再直接依赖顶层 `ai`，也不再维护手写 `/chat/completions` 解析或 Diary 专用执行分支。
- Good, because 替换通用 Mastra adapter 与 Provider adapter 即可回滚执行机制，不需要数据迁移。
- Bad, because Mastra 增加生产依赖并要求 Node `>=22.13.0`，内部平台若未按 manifest 提供 Node 22.13 以上版本会直接阻止启动。
- Bad, because npm 官方审计当前对 Mastra 的 provider-utils v5 兼容别名报告同一个 `GHSA-866g-f22w-33x8` 下的 2 个 Low finding；没有可直接替换的 3.x 修复版，部署前需升级上游图或显式接受风险。
- Neutral, because manifest 声明和启动校验只能约束发行，平台实际版本仍需从构建日志与运行健康证据确认。

### Confirmation

- `tests/agent-review-runtime.test.mjs` 证明五个 capability 已注册、每次只调用一次模型、Abort 不重试、输入先验证且框架结果仍经过项目归一化。
- `tests/deepseek-model.test.mjs` 证明 Provider 配置、Abort 与声明/流式 512 KiB response bound；四个 `tests/ai-*-route.test.mjs` 证明五类能力都走 Mastra 并保留原限流、非法输出和公开错误码。
- Node 22.22.0 下运行完整单测、production build 和 PWA 回归；完整质量门禁与外部证据状态记录在 `PROJECT_BOARD.md`。
- 合入或部署前必须关闭 `specs/012-mastra-ai-consolidation/` 与板上记录的平台 Node 22 实发、依赖审计和真实模型质量开放项。

## More Information

- [Mastra Node.js 22.13.0 minimum](https://mastra.ai/blog/changelog-2026-01-20)
- [GHSA-866g-f22w-33x8](https://github.com/advisories/GHSA-866g-f22w-33x8)
- [`specs/003-agent-diary-review/`](../../specs/003-agent-diary-review/)
- [`specs/012-mastra-ai-consolidation/`](../../specs/012-mastra-ai-consolidation/)
- [`ARCHITECTURE.md` 第 5、6、8、11 章](../../ARCHITECTURE.md)
