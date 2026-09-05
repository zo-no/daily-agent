---
status: accepted
date: 2026-09-04
decision-makers:
  - project-owner
---

# 只批准待确认的今日工作 Agent Tool

## Context and Problem Statement

项目负责人希望 Log Note 自身 Agent runtime 与未来 Codex 集成都能复用一个“总结今天做了什么”的
能力，并明确要求先实现一个由 `@mastra/core` `Agent` 类创建的代理对象，以及放在独立目录中的
Tool。现有 ADR-0003 刻意让所有生产 request-scoped Agent 保持无工具，以防框架获得业务数据或写入
权限。因此需要决定：为了验证 Agent + Tool 组合，应把什么能力开放给 Tool，以及哪些能力继续关闭？

## Decision Drivers

- 满足负责人对真实 Mastra `Agent` 对象、`createTool` 和清晰目录边界的要求。
- 让未来 Log Note 页面确认适配器和 MCP 适配器复用同一业务契约，不复制摘要格式与校验。
- 保持账号隔离、本地先写、revision/CAS、原始记录、备份和显式确认不变。
- 不让 Studio、Agent 或 Tool 读取浏览器状态、Codex 历史、文件、Supabase 或私密记录。
- 不把“注册了 Mastra Tool”误报成“Codex 已能调用”或“记录已经写入”。
- 继续让现有生产远程 AI Agent 保持无工具、无记忆、无持久快照和零自动重试。

## Considered Options

- 给现有通用 `createStructuredProposalAgent` 增加 Tool，让所有 capability 自动获得它。
- 在 Tool 中直接写 Supabase 或建立新的服务端记录 API。
- 只把全部实现写在 Mastra Tool 文件中，等 MCP 需要时再复制。
- 建立框架无关候选核心，只为一个专用 Agent 注册一个 preview-only Tool，并只在 localhost Studio
  暴露合成输入调试面。
- 本次同时建设 MCP server、Codex 配置、页面确认和实际写入。

## Decision Outcome

Chosen option: “建立框架无关候选核心，只为一个专用 Agent 注册一个 preview-only Tool”，because
它实现了负责人要求的两个代码单元，同时没有提前扩大读取、写入、认证和部署边界。

责任边界如下：

- `src/modules/agent-bridge/daily-log/` 定义严格版本化输入/输出 schema，并只把调用方显式提供的
  有界工作项整理为确定性的 `date/time/content` 普通记录候选。它不依赖 Mastra、App Router、
  浏览器、网络或存储。
- `src/mastra/tools/daily-log/` 使用 `createTool` 和当前 `execute(inputData, context)` 契约适配共享
  核心；只读取执行上下文中的取消信号。
- `src/mastra/agents/daily-log/` 使用 `new Agent` 创建专用对象，只按 Tool ID 注册这一项 Tool，
  不配置 memory、storage、workflow snapshot 或自动重试。
- Tool 输出永远带 `writePolicy: "preview-required"`，没有完整 Log Note entry ID、category、template、
  account、revision 或已保存状态，也不得调用 `commitData`。
- `src/mastra/index.ts` 仅在 localhost Studio 注册这一 Agent 和独立 Tool，Studio 输入必须是合成
  数据。生产 `src/mastra/index.mjs` 以及现有 capability 不注册该 Tool。
- Log Note 页面确认/写入、MCP server、Codex host 配置、远程 HTTP/OAuth、任务历史读取和部署均不
  属于 LN-082。后续适配器必须重新完成产品、架构、隐私和确认/陈旧性决策。

## Consequences

- Mastra “工具默认关闭”从绝对表述变为默认策略；唯一当前例外具有明确板项、专用 Agent、严格
  schema、零读取/零写入和 Studio-only 注册。
- Tool 可在没有 Provider key 时独立执行；Agent 真正生成与调用 Tool 仍依赖 Studio 的模型配置。
- 未来 MCP 可以直接复用共享核心，但不能把 Mastra 注册当成 MCP transport，也不能跳过 Codex 配置。
- 未来产品写入必须增加页面预览、显式确认、账号/目标/request/fingerprint 重读、一次原子
  `commitData` 和读回验证；本决定没有批准第二条持久化路径。
- 移除共享模块、Tool、Agent、Studio 注册与测试不需要迁移或清理任何记录。

## Confirmation

- 聚焦测试必须证明严格输入/输出、确定性、限制、取消、Agent 仅一个 Tool、无 memory、Studio
  可发现，以及既有生产 Agent 仍无工具。
- `ARCHITECTURE.md` 必须同时保留生产 tool-free 默认和 LN-082 例外，不得用一方覆盖另一方。
- 完整 `npm run check` 和 `git diff --check` 必须执行；脏工作树中的无关失败单独记录。
- 未实现页面确认、MCP/Codex、Provider 实测、部署和 14 天复用时，板项只能 Returned，不能 Accepted。
