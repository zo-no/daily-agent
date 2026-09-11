# Feature Specification: Codex 风格内联聊天第二期

**Requirement**: `REQ-20260910-01`
**Feature Branch**: `feature/req-20260910-01-codex-inline-chat`
**Feature Directory**: `REQ-20260910-01-codex-inline-chat`
**Created**: 2026-09-10
**Status**: Draft
**Input**: 用户描述：把首页聊天收敛为 Codex 风格的内联工作面，速记与聊天使用同一个输入框和同一条底部 Composer，仅切换常驻模式按钮、placeholder 和发送语义；聊天消息以透明、可展开/收起的小窗悬浮在 Composer 上方。

<!-- 历史包保留一个 Legacy Board Item 映射；不再新增第二个主标识。 -->

> `PROJECT_BOARD.md` 仍是优先级、依赖、任务状态、验收与证据的唯一来源；本 spec 只细化一个看板项，不能验收它。

## 现状判断

第一阶段 `REQ-20260909-01-general-agent-chat` 已完成代码接线与基础契约：`HomePage`、`HomeActionDock`、`HomeChatWorkspace`、`/api/assistant/chat` 与通用 Agent 均已存在；聚焦 `tests/ai-general-chat.test.mjs` 为 4/4。第一阶段任务 T007（完整 `npm run check`、移动端证据）仍未完成，因此保持 Returned；第二期只能进入设计，不得宣称第一阶段 Accepted。

第二期已确认的设计决策：聊天模式切换按钮放在首页 **header 常驻工具区**（`ChatModeRailToggle`），不放在底部 Composer 前导 slot——这是产品负责人「常驻按钮应放到不会被影响的位置」的明确要求；底部 `HomeActionDock` 只保留共享 Composer（快速记录与聊天共用的同一条输入框），其前导 slot 承载「完整记录 / 新增计划」按钮。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 同一 Composer 切换模式 (Priority: P1)

用户默认进入速记，输入框直接可用并按原路径保存。点击 header 上的聊天模式按钮后，输入框原地切换为聊天；尺寸、位置、圆角、键盘行为保持一致。切回速记不清空未发送草稿，除非用户主动关闭或切换账号。

**Why this priority**: 满足「随时聊天且不影响快速记录」的核心诉求，且是其余交互（聊天窗、小屏）的前提。

**Independent Test**: 打开首页确认默认速记；点击 header 聊天按钮并发送消息，确认用户消息与回复可见、无记录被自动保存；切回速记确认原保存链路仍可用且草稿不丢。

**Acceptance Scenarios**:

1. **Given** 首页已打开，**When** 用户查看 header 工具区，**Then** 聊天按钮存在且默认 `aria-pressed=false`，底部 Composer 处于速记态。
2. **Given** 已点击聊天按钮，**When** 用户在 Composer 输入并发送，**Then** 消息与 Agent 回复出现在上方聊天窗，且没有任何记录被自动保存。
3. **Given** 聊天模式中，**When** 用户切回速记，**Then** 输入框语义切换回速记，未发送草稿与既有消息保持不变。

### User Story 2 - 透明可收起聊天窗 (Priority: P1)

发送后在 Composer 上方显示单一透明摘要条，包含标题、消息数和展开/收起按钮。展开后显示消息列表、思考态和错误态；收起后只保留摘要条，不遮挡记录正文和底部 Composer。新消息到达时若用户位于底部则自动贴底，用户上滑阅读时不得强制抢滚动。

**Why this priority**: 这是「内联工作面」区别于「新页面聊天」的关键，直接决定是否打扰记录主链路。

**Independent Test**: 发送消息后确认摘要条出现并可展开/收起；展开后消息、思考态、错误态可见；收起后记录正文与 Composer 不被遮挡。

**Acceptance Scenarios**:

1. **Given** 已发送消息，**When** 用户查看 Composer 上方，**Then** 出现单一摘要条并显示消息数。
2. **Given** 摘要条存在，**When** 用户点击展开/收起，**Then** 聊天面板展开/收起且 `aria-expanded` 同步。
3. **Given** 有新消息且用户位于底部，**When** 消息到达，**Then** 视图自动贴底；若用户已上滑阅读则不强制抢滚动。

### User Story 3 - 小屏与无障碍 (Priority: P1)

320、390、430、700、1280px 均无横向溢出；聊天窗最大高度受视口限制。所有模式切换、展开/收起、发送控件触控区域至少 44px。`aria-pressed`、`aria-expanded`、`aria-live`、键盘 Enter/Shift+Enter 语义稳定；减少动效时不依赖动画传达状态。

**Why this priority**: 移动端优先是项目宪法基线，无障碍是可验收质量门禁的一部分。

**Independent Test**: 各目标宽度下验证聊天窗无横向溢出、触控目标不小于 44px、键盘与无障碍属性稳定，reduced-motion 下状态仍可读。

**Acceptance Scenarios**:

1. **Given** 320/390/430/700/1280px 宽度，**When** 打开聊天窗，**Then** 无横向溢出且窗口最大高度受视口限制。
2. **Given** 键盘用户聚焦到模式按钮/展开按钮/发送按钮，**When** 按 Enter/Space，**Then** 行为与点击一致，Shift+Enter 不触发发送。

### Edge Cases

- 空消息、超长消息、未知请求字段和重复发送被拒绝或忽略。
- 未登录或离线时聊天请求失败，速记继续保持本地可用。
- 用户切换账号时聊天清空为页面会话初始态，不进入账号数据和备份。
- 请求进行中切换模式、离页或再次发送时，迟到响应不得污染当前会话。
- reduced-motion 下动画禁用但状态仍通过 `aria-pressed` / `aria-expanded` 传达。

## Product Admission *(mandatory)*

### Core-Loop Contribution

改善 `quick record → browse` 环节旁的「随时整理或询问」能力：聊天与速记共享同一条 Composer，不新增页面或记录步骤，保持快速记录的首要任务。

### User Evidence

用户明确提出需要通用 Agent 并希望采用 Codex 风格内联交互（不替换整个工作区的气泡墙）；暂无使用量证据，属 isolated experiment。

### Default Interface and Recording Cost

默认仍为速记，快速记录保存步骤不增加；聊天切换是 header 上一次可逆点击。新增常驻 header 聊天按钮与底部共享 Composer 的聊天态 placeholder/发送语义。

### Offline, Account, Privacy, Reversibility, and Backup

聊天消息与回复仅存于页面会话，不进入 `commitData`、localStorage、Supabase 或备份；服务端只接收有界消息并使用当前账号鉴权。聊天失败零写入，离线仍可速记；移除聊天入口不影响已有数据、备份或导出。

### Verification and Removability

覆盖契约、鉴权、零写入、header 切换与聊天窗的 Node/移动回归；运行 `npm run design:check`、类型检查、构建与移动端视觉证据。回滚只需移除 header 聊天按钮、聊天窗与相关样式/i18n/测试断言。

### Exit Condition

若聊天导致记录步骤增加、离线速记回归、聊天窗遮挡记录或操作、移动端出现滚动/焦点回归，或第一阶段门禁未补齐，则保持第二期 Draft 或移除入口。

### Admission Decision

- **Score**: `14/20`
- **Decision**: `isolated experiment`
- **Red-line check**: 不改变 raw notes、`commitData`、账号缓存、同步、备份或离线速记。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在首页 header 常驻工具区提供聊天/速记切换按钮（`ChatModeRailToggle`），默认速记态。
- **FR-002**: 系统 MUST 让底部 `HomeActionDock` 的单一 Composer 在速记与聊天间复用，仅切换 placeholder、`aria-label` 和发送语义。
- **FR-003**: 系统 MUST 在 Composer 上方展示透明、可展开/收起的聊天窗，含摘要条、消息列表、思考态与错误态。
- **FR-004**: 系统 MUST 在聊天发送后零记录写入，失败时给出可理解错误。
- **FR-005**: 系统 MUST 让聊天窗在用户位于底部时自动贴底，用户上滑阅读时不强制抢滚动。

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.

### Key Entities *(include only when data is involved)*

- **页面会话聊天消息**：仅存在于当前页面 React 状态的角色/内容序列，账号切换时清空，不持久化。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 首页首次打开时速记模式可直接输入，切换聊天不超过一次 header 点击。
- **SC-002**: 合法聊天请求在页面显示用户消息与回复；失败请求不改变记录数据。
- **SC-003**: 相关 Node 回归、`npm run design:check`、类型检查和生产构建通过。
- **SC-004**: 320/390/430/700/1280px 下聊天窗无横向溢出，所有聊天控件触控目标不小于 44px。

## Scope Boundaries *(mandatory)*

### In Scope

- header 常驻聊天切换按钮、底部共享 Composer 聊天态、透明可收起聊天窗、同源鉴权路由、通用 Agent 与既有预览 Tool 接线。

### Out of Scope

- 新增持久化聊天历史、自动改写记录、独立 MCP transport、Skill 市场、附件、流式协议、生产部署和真实用户长期效果判断。

## Assumptions and Dependencies

- 使用当前登录会话；AI 未配置时只展示稳定错误。
- 依赖第一阶段 `REQ-20260909-01` 的 chat model/server 与通用 Agent，不重复建设。
- 需要产品负责人后续确认真实账号、移动视觉和观察期证据。

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001 / SC-001 | header 聊天按钮与默认速记的移动 E2E | 当前 feature spec |
| FR-002 / FR-003 | `tests/home-floating-bars.test.mjs`（header 有 `ChatModeRailToggle`，dock 无底部模式控件） | 当前 feature spec |
| FR-004 / SC-002 | `tests/ai-general-chat.test.mjs` 成功/失败零写入场景 | 第一阶段 spec |
| FR-005 / SC-004 | 聊天窗贴底/上滑不抢滚动 + 各宽度无溢出的移动 E2E | 当前 feature spec |
