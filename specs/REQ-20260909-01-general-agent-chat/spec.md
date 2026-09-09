# Feature Specification: 通用 Agent 聊天模式

**Requirement**: `REQ-20260909-01`
**Feature Directory**: `REQ-20260909-01-general-agent-chat`
**Created**: 2026-09-09
**Status**: Draft
**Input**: User description: 在首页底部位置切换聊天模式或速记模式，默认速记；通用 Agent 可以调用已有 tool 或 skill，其他内容先保留。

## User Scenarios & Testing

### User Story 1 - 在底部输入栏切换模式并聊天 (Priority: P1)

用户打开首页后默认看到速记输入。点击同一操作区的模式按钮可以切换到聊天；输入消息并发送后，消息和 Agent 回复出现在聊天区域。

**Why this priority**: 直接满足用户希望随时聊天且不影响快速记录的核心需求。

**Independent Test**: 清空会话后打开首页，确认默认速记；切换聊天并发送消息，确认用户消息、回复和错误状态可见，切回速记后原有保存链路仍可用。

**Acceptance Scenarios**:

1. **Given** 首页已打开，**When** 用户查看底部输入栏，**Then** 默认处于速记模式且可按原步骤保存记录。
2. **Given** 聊天模式已打开，**When** 用户发送消息，**Then** 消息与 Agent 回复出现在聊天区，且没有记录被自动保存。
3. **Given** AI 不可用或请求失败，**When** 用户发送消息，**Then** 显示可理解的错误，已有记录保持不变。

### Edge Cases

- 空消息、超长消息、未知请求字段和非用户结尾的消息被拒绝。
- 未登录或离线时聊天请求失败，速记继续保持本地可用。
- 用户切换账号或模式时，聊天只保留页面会话内容，不进入账号数据和备份。
- 320–1280px 宽度、键盘和 44px 触控目标均可使用。

## Product Admission

### Core-Loop Contribution

改善快速记录入口旁的“随时整理或询问”能力，同时保留快速记录的首要任务。

### User Evidence

用户明确提出需要通用 Agent，并指定在现有底部入口切换；当前没有额外使用量证据。

### Default Interface and Recording Cost

默认仍为速记；切换是可逆的一次点击，速记保存步骤不增加。

### Offline, Account, Privacy, Reversibility, and Backup

聊天消息与回复仅存在页面会话；服务端只接收有界消息并使用当前账号鉴权。聊天失败不写入记录，离线仍可速记；移除聊天入口不会影响已有数据、备份或导出。

### Verification and Removability

覆盖契约、鉴权、零写入和首页切换的 Node 回归，运行设计检查、类型检查、构建和移动端回归。移除聊天组件、路由和 Agent 适配器即可回滚。

### Exit Condition

若聊天导致记录步骤增加、离线速记回归、隐私边界无法证明，或连续观察期使用率低于产品负责人设定阈值，则保持入口隔离或移除。

### Admission Decision

- **Score**: `14/20`
- **Decision**: `isolated experiment`
- **Red-line check**: 不改变 raw notes、commitData、账号缓存、同步、备份或离线速记。

## Requirements

### Functional Requirements

- **FR-001**: 系统 MUST 在首页底部同一输入区提供聊天/速记切换，默认速记。
- **FR-002**: 聊天 MUST 展示页面内消息和 Agent 回复，失败时给出可理解错误且零记录写入。
- **FR-003**: 通用 Agent MUST 通过既有 Mastra 执行边界调用已批准的预览 Tool，不能直接访问账号数据或写入记录。

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.

## Success Criteria

- **SC-001**: 首页首次打开时速记模式可直接输入，切换聊天不超过一次点击。
- **SC-002**: 合法聊天请求在页面显示用户消息和回复；失败请求不改变记录数据。
- **SC-003**: 相关 Node 回归、`npm run design:check`、类型检查和生产构建通过。

## Scope Boundaries

### In Scope

- 首页底部模式切换、聊天展示、同源鉴权路由、通用 Agent 和已有预览 Tool 接线。

### Out of Scope

- 新增持久化聊天历史、自动改写记录、独立 MCP transport、Skill 市场、生产部署和真实用户长期效果判断。

## Assumptions and Dependencies

- 使用当前登录会话；AI 未配置时只展示稳定错误。
- 需要产品负责人后续确认真实账号、移动视觉和观察期证据。

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001 / SC-001 | `REQ-20260909-01 general Agent chat` 移动 E2E：默认速记、同页切换、共享 Composer | 当前 feature spec |
| FR-002 / SC-002 | `tests/ai-general-chat.test.mjs` 与同一移动 E2E 的成功/失败零写入场景 | 当前 feature spec |
| FR-003 / SC-003 | `tests/ai-general-chat.test.mjs`、结构回归、类型检查和生产构建 | 当前 feature spec |
