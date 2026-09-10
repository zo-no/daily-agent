# Feature Specification: Codex 风格内联聊天第二期

**Requirement**: `REQ-20260910-01`
**Status**: Draft / 方案设计
**Legacy Board Item**: 第一阶段 `REQ-20260909-01-general-agent-chat`

## 目标

把首页聊天收敛为 Codex 风格的内联工作面：速记与聊天使用同一个输入框和同一条底部 Composer；仅切换前导/尾部按钮、placeholder 和发送语义。聊天消息以透明、可展开/收起的小窗悬浮在 Composer 上方，不创建新页面，也不改变快速记录步骤。

## 现状判断

第一阶段已完成代码接线与基础契约：`HomePage`、`HomeActionDock`、`HomeChatWorkspace`、`/api/assistant/chat` 和通用 Agent 均已存在；聚焦 `tests/ai-general-chat.test.mjs` 为 4/4。第一阶段任务 T007（完整 `npm run check`、移动端证据）仍未完成，因此保持 Returned，第二期只能进入设计，不得宣称第一期 Accepted。

## 用户场景与验收

### US1：同一 Composer 切换模式

- 默认进入速记，输入框直接可用，按原路径保存。
- 点击模式按钮后输入框原地切换为聊天；尺寸、位置、圆角、键盘行为保持一致。
- 切回速记不清空未发送草稿，除非用户主动关闭或切换账号。

### US2：透明可收起聊天窗

- 发送后在 Composer 上方显示单一透明摘要条，包含“最近一条”、消息数和展开/收起按钮。
- 展开后显示消息列表、思考态和错误态；收起后只保留摘要条，不遮挡记录正文和底部 Composer。
- 新消息到达时若用户位于底部则自动贴底；用户上滑阅读时不得强制抢滚动。

### US3：小屏与无障碍

- 320、390、430、700、1280px 均无横向溢出；窗口最大高度受视口限制。
- 所有模式切换、展开/收起、发送控件触控区域至少 44px。
- `aria-expanded`、`aria-live`、键盘 Enter/Shift+Enter 语义稳定；减少动效时不依赖动画传达状态。

## 边界与不变量

- 聊天状态仍属于页面会话，不进入 `commitData`、localStorage、备份或 Supabase。
- 继续复用现有鉴权、请求 schema、Mastra/DeepSeek 边界和零写入约束。
- 不新增聊天页面、全局 store、持久化线程、MCP transport、附件或流式协议。
- 离线/未登录时聊天显示稳定错误，速记仍可本地使用。

## 退出条件

若 Composer 切换增加记录步骤、聊天窗遮挡记录/操作、移动端出现滚动或焦点回归，或第一阶段门禁未补齐，则保持第二期 Draft，不实施。

