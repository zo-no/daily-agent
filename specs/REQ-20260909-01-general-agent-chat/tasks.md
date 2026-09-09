# Tasks: 通用 Agent 聊天模式

- [x] T001 [P] 建立聊天输入输出契约于 `src/modules/assistant/chat/model.mjs`
- [x] T002 [P] 建立鉴权、限流和零写入 Route 于 `src/modules/assistant/chat/server.mjs` 与 `src/app/api/assistant/chat/route.js`
- [x] T003 [P] 接入通用 Mastra Agent 和既有预览 Tool 于 `src/mastra/agents/general/index.mjs` 与 `src/infrastructure/ai/general-chat-execution.mjs`
- [x] T004 [US1] 在 `HomePage`、`HomeActionDock` 和 `HomeChatWorkspace` 接入模式切换与页面会话消息
- [x] T005 [US1] 增加中英文文案和响应式样式于 `src/lib/i18n.mjs` 与 `src/app/_components/home/home-timeline.css`
- [x] T006 [US1] 编写契约、鉴权和零写入回归于 `tests/ai-general-chat.test.mjs`
- [ ] T007 运行设计、Node、类型、构建和 diff 检查；记录移动端质量门禁中的开放回归证据

## Dependencies

T001–T003 可并行；T004–T005 依赖 T001；T006 依赖 T002；T007 依赖全部实现。

## MVP

T001–T006：底部切换、聊天回复和零写入边界。
