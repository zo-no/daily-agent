# Implementation Plan: 通用 Agent 聊天模式

## Technical Context

复用首页 `HomeActionDock`、`HomePage` 与既有 Mastra/DeepSeek 适配边界。新增 chat model/server、同源 Route Handler、通用 Agent 工厂和页面会话状态；聊天不调用 `commitData`。

## Constitution Check

保留速记默认入口、离线记录、本地优先、原文和备份兼容；聊天请求有界且仅当前会话。

## Project Structure

- `src/modules/assistant/chat/`：请求/回复 schema 与 server boundary
- `src/infrastructure/ai/general-chat-execution.mjs`：外部 AI 适配
- `src/mastra/agents/general/`：通用 Agent 与既有预览 Tool
- `src/app/api/assistant/chat/route.js`：薄路由
- `src/app/_components/home/`：首页交互

## Verification

`node --test tests/ai-general-chat.test.mjs tests/project-structure.test.mjs`; `npm run design:check`; `npm run typecheck`; `npm run build`; `npm test`; `git diff --check`。
