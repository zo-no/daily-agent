# Research: Google Calendar 近实时变化同步

**Requirement**: `REQ-20260905-03` | **Date**: 2026-09-05

## Decision 1: 先以 syncToken 增量轮询作为首版基线

**Decision**: 首版必须能在没有常驻 worker、长期 refresh token 或公网 webhook 的情况下独立验收：页面可见时使用 `syncToken` 增量拉取，前台恢复、网络恢复和手动刷新立即触发；隐藏页面降低频率或暂停。

**Rationale**: 当前 LN-067 只有内存 access token 和全量时间窗读取。增量游标能处理删除、降低请求量，并且不扩大 OAuth/部署边界。它也能作为未来 push 的事实同步层。

**Alternatives considered**: 继续全量窗口轮询会漏掉远端删除且请求成本随窗口增长；直接做 webhook 需要安全长期授权、公网 HTTPS、worker/queue 和 channel 续期，当前证据不足。

**API constraint**: Google 的增量请求必须沿用首次同步的查询形状，不能在带 `syncToken` 时随意叠加 `timeMin`、`timeMax`、`orderBy`、`q` 或其他不兼容过滤。实现应把“有界”定义为缓存/展示/返回范围，并在同步层保留受控的变更游标；不得把一个新的时间窗误当成同一游标的增量流。

## Decision 2: Push/webhook 是条件增强，不是首版接受前提

**Decision**: 只有目标部署明确支持公网 HTTPS、快速 2xx webhook、可靠队列/worker、channel 续期和受保护 refresh token 后，才启用 `events.watch`。通知只表示“可能有变化”，实际内容始终由 `syncToken` 再读取。

**Rationale**: Google push 通知不保证包含完整事件 payload；把通知当事实会造成乱序、丢失和伪造风险。共享 reconciliation 使轮询和 push 的行为一致。

**Alternatives considered**: 浏览器长连接或把 token 放 localStorage 无法覆盖浏览器关闭、撤权和 token 安全要求；自建无认证 webhook 会新增高风险入口。

## Decision 3: 使用 event ID + etag，冲突不采用静默 last-write-wins

**Decision**: 受管事件更新携带已知 etag 或等价的 precondition；etag 变化时标记冲突，保留本地计划和远端事件事实，由用户选择“保留本地并重新创建”“采用 Google”或“手工处理”。Google 删除受管事件时保留本地计划并标记远端删除。

**Rationale**: 计划是用户的意图，不能因为外部日历变化而静默覆盖或删除；event ID 是稳定身份，标题/时间猜测不能替代关联标记。

**Alternatives considered**: 直接覆盖会丢失用户在另一侧的修改；自动删除本地计划不可逆且违反本地优先；按标题和时间合并会误认普通事件。

## Decision 4: 同步 metadata 与主数据隔离

**Decision**: `syncToken`、channel、状态、重试和冲突摘要放在独立的账号隔离 metadata 中；主 `planBlocks` 只保留兼容的最小 `externalRef`，不存令牌、完整事件或内部 channel secret。

**Rationale**: Calendar 是外部次级上下文，不能污染记录/计划备份，也不能让撤权或 metadata 损坏覆盖当前账号主 payload。

**Alternatives considered**: 把所有事件复制进主文档会放大隐私、备份和迁移面；只保留 `lastSyncedAt` 无法恢复游标、识别冲突或观测失败。

## Decision 5: Calendar 派生数据暂不进入远程 AI

**Decision**: LN-067 的 Calendar→DeepSeek Limited Use 合规证据关闭前，禁止把 Calendar 派生数据发送到通用远程模型。

**Rationale**: 近实时同步增加数据新鲜度，不改变已批准的数据出境边界；同步验收不能替代合规批准。

## Open Evidence

- 目标部署是否具备安全 refresh token 存储、常驻 worker/queue、公网 HTTPS 和定时 channel 续期。
- Google API、OAuth origin、scope、测试用户、真实账号和生产域名证据。
- 冲突 UI 的最终产品选择：保留本地、采用 Google 或手工处理的动作文案。
- Calendar sync metadata 采用账号文档旁路还是独立 RLS 表；不得在决策前写入主文档。
- 主日历是否继续固定 `primary`；当前规格不扩展用户可选日历。
