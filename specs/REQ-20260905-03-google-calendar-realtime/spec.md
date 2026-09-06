# Feature Specification: Google Calendar 近实时变化同步

**Requirement**: `REQ-20260905-03`
**Legacy Board Item**: `LN-086`
**Feature Directory**: `REQ-20260905-03-google-calendar-realtime`
**Created**: 2026-09-05
**Status**: Draft
**Input**: User request to keep Log Note plans and Google Calendar changes synchronized with a near-real-time experience.

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real Google accounts, OAuth, deployment,
and background-delivery claims require separate redacted manual evidence.

### User Story 1 - 日历变化及时进入 Log Note (Priority: P1)

用户授权 Google Calendar 后，可以在 Log Note 看到授权日历中的事件变化。受管事件与本地计划保持关联，普通 Google 事件只作为只读上下文显示。系统使用可续接的增量变化，不要求每次都重新下载整个时间窗。

**Why this priority**: 这是“实时同步”最小可用价值，直接改善计划浏览和安排调整，不改变快速记录。

**Independent Test**: 使用合成 Calendar 响应模拟新增、更新、删除、重复、乱序、过期游标和分页；验证有界时间窗、事件 ID、etag、删除 tombstone、缓存状态和计划来源语义。

**Acceptance Scenarios**:

1. **Given** 当前账号已有同步游标，**When** Google 日历发生新增、更新或删除，**Then** 变化在可接受延迟内进入当前账号缓存，重复或乱序通知不会造成重复计划或错误覆盖。
2. **Given** 游标失效或远端返回完整重建信号，**When** 系统继续同步，**Then** 清除失效游标、重建有界窗口并记录可观察的恢复状态，不删除本地计划。
3. **Given** 当前页面不可见、网络中断或未获得长期后台授权，**When** 近实时后台条件不满足，**Then** 系统退回有界轮询或网络恢复立即同步，并在界面明确上次同步时间、延迟和错误状态。

### User Story 2 - Log Note 计划可靠地同步为受管事件 (Priority: P1)

用户在 Log Note 创建、修改或删除本地计划后，对应的 Google 受管事件在可接受延迟内创建、更新或删除。一个本地计划始终绑定同一个受管事件，不因重复同步产生重复事件。

**Why this priority**: 保留现有“本地计划可同步到 Google”的价值，同时为远端变化处理建立稳定身份和版本基础。

**Independent Test**: 对本地计划执行新增、改标题、改时间、删除和重复同步；验证 `logNoteManaged`/`logNotePlanId` 关联、event ID 稳定、etag 更新、删除范围和离线恢复。

**Acceptance Scenarios**:

1. **Given** 一个本地计划没有受管事件，**When** 同步成功，**Then** 创建一个带有 Log Note 私有标记的事件，并把最小关联引用读回本地计划。
2. **Given** 一个本地计划已有受管事件，**When** 标题或时间改变，**Then** 更新同一 event ID，而不是创建第二个事件。
3. **Given** 用户删除本地计划，**When** 同步成功，**Then** 只删除对应的受管事件；普通 Google 事件和其他账号事件不受影响。
4. **Given** 用户离线编辑计划，**When** 网络恢复，**Then** 先获取远端增量变化，再按冲突规则处理待同步变更；同步失败不会阻塞本地计划继续使用。

### User Story 3 - 冲突、撤权和账号切换可恢复 (Priority: P1)

当 Google 侧修改或删除 Log Note 管理的事件、授权被撤销、账号切换或同步任务过期时，系统保留事实和本地计划，不静默覆盖或跨账号写入，并向用户提供可理解的下一步。

**Why this priority**: 日历是外部可变系统；没有冲突和生命周期安全，所谓实时同步会造成计划丢失或账号数据泄露。

**Independent Test**: 模拟 etag 变化、受管事件远端删除、401/403/invalid_grant、旧 channel 回调、账号 A→B 切换和同步并发；验证冲突/撤权/失效状态及零跨账号写入。

**Acceptance Scenarios**:

1. **Given** Google 用户修改了受管事件且 etag 已变化，**When** Log Note 尝试更新，**Then** 系统标记冲突并保留本地与远端事实，不静默覆盖；用户可明确选择“保留本地并重新创建”“采用 Google”或“手工处理”。
2. **Given** Google 删除了受管事件，**When** 增量同步收到 tombstone，**Then** 本地计划保留并显示“远端事件已删除”的待处理状态，不自动删除计划。
3. **Given** 授权被撤销或失效，**When** 同步失败，**Then** 清除令牌和日历缓存/监听状态，但不删除本地计划、记录或 Supabase 文档；页面显示“授权已撤销”而不是泛化网络错误。
4. **Given** 账号 A 的异步任务或旧回调晚于账号切换到 B 才返回，**When** 任务尝试写缓存，**Then** 结果被丢弃，账号 B 的计划、记录和日历缓存不发生污染。

### Edge Cases

- 空日历、分页、全天事件、跨日事件、时区变化、取消事件、重复事件和孤儿受管事件。
- 重复、乱序、迟到、过期或伪造的通知；`410 Gone`、无效 sync token、etag 冲突和请求超时。
- 页面隐藏、浏览器关闭、网络恢复、快速连续编辑、并发同步和服务重启。
- OAuth 拒绝、弹窗关闭、origin 不匹配、API 未启用、管理员策略拒绝和授权撤销。
- 账号切换、登出、缓存损坏、旧 sync metadata、备份恢复以及普通 Google 事件与本地计划重叠。
- Calendar 派生数据不得在未批准的情况下进入远程 AI、日志、备份或 Service Worker。

## Product Admission *(mandatory)*

### Core-Loop Contribution

直接改善“浏览”和“编辑计划”：用户在 Log Note 或 Google Calendar 任一侧调整时间安排后，可以在另一侧及时看到变化，同时不增加普通记录的必填字段或保存步骤。

### User Evidence

产品负责人明确要求“Google 日历和我们这个产品实时同步”。现有 LN-067 已支持浏览器内存 token、时间窗读取和受管事件双向同步，但没有增量游标、删除 tombstone、etag 冲突和后台变化通知，无法证明近实时语义。

### Default Interface and Recording Cost

同步设置和状态位于 Settings/计划工作面的次级区域，默认不增加首页控件、弹窗或快速记录决策。连接后显示上次同步时间、同步方式、延迟、冲突和撤权状态；页面不可见或部署不支持后台 push 时，降级为有界轮询。

### Offline, Account, Privacy, Reversibility, and Backup

本地计划、记录和已有日历缓存继续按账号隔离保存并可离线使用；离线时本地计划可编辑，Calendar 变更标记待同步，联网后先增量读取再处理写入。普通 Google 事件只读；仅 Log Note 管理的本地计划可写 Google 受管事件。访问令牌、refresh token、channel secret 和完整 Google 事件不得进入主文档、备份、日志、Service Worker 或其他账号命名空间。撤权不删除本地计划/记录；移除同步能力不需要迁移主数据。

### Verification and Removability

自动化覆盖 syncToken/etag/tombstone、分页、去重、冲突、撤权、账号切换、离线恢复和重复写入；浏览器回归覆盖本地计划→Google、Google 事件→本地缓存、普通事件只读和状态文案。真实 OAuth、真实日历和部署 webhook/worker 另行记录。同步实现应保持在 Calendar capability 和独立 metadata 中，关闭或移除后本地计划、记录、备份和 Markdown 导出仍可用。

### Exit Condition

若目标部署无法安全保存长期授权凭据、无法提供可靠的同步执行能力，或 14 天观察中冲突/撤权状态不可理解、同步延迟不优于手动刷新、发生一次跨账号写入或误删普通事件，则保持为页面可见轮询实验或关闭 push，不进入主流程。

### Admission Decision

- **Score**: `17/20` using the rubric in `product.md`
- **Decision**: `mainline candidate`，首版以 syncToken 增量轮询为可独立验收基线；push/webhook 是部署条件满足后的增强路径。
- **Red-line check**: 不删除本地核心数据；不把普通 Google 事件变成计划；不暴露令牌；不改变记录 schema；不阻塞离线快速记录；不绕过账号隔离和 revision/CAS。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在当前账号授权范围内读取 Google Calendar 的有界事件窗口，并在有可用游标时只获取自上次同步后的增量变化。
- **FR-002**: 系统 MUST 以 Google event ID、etag 和同步游标识别事件版本，处理分页、重复、乱序、取消和删除 tombstone，不因通知重放产生重复数据。
- **FR-003**: 系统 MUST 将普通 Google 事件作为只读数据；只有带有 Log Note 管理标记且对应当前账号本地计划的事件才允许创建、更新或删除。
- **FR-004**: 系统 MUST 将本地计划的创建、修改和删除同步到对应的受管事件，并保持稳定的一对一关联；同步重试不得创建重复事件。
- **FR-005**: 系统 MUST 在受管事件 etag 已变化时拒绝静默覆盖，记录可理解的冲突状态，并保留本地与远端事实供用户明确选择“保留本地并重新创建”“采用 Google”或“手工处理”。
- **FR-006**: 系统 MUST 在受管事件被 Google 删除时保留本地计划，标记远端删除待处理状态，并提供恢复/重新创建或采用远端结果的明确路径。
- **FR-007**: 系统 MUST 在同步游标失效、channel 过期或通知不可用时执行有界重建或轮询兜底；推送通知只触发重新读取，不得被当作完整事件事实。
- **FR-008**: 系统 MUST 对页面可见、页面隐藏、离线、网络恢复、浏览器关闭和服务重启分别给出同步方式、延迟或错误状态；不得声称未验证的后台实时。
- **FR-009**: 系统 MUST 绑定每个同步任务的账号、授权 generation、日历、游标和 channel 状态；账号切换、登出、撤权或旧任务回调不得写入新账号。
- **FR-010**: 系统 MUST 在 401/403、invalid_grant、用户断开和管理员撤权时清除令牌和日历同步状态，但不得删除本地计划、记录或云文档。
- **FR-011**: 系统 MUST 将同步 metadata 与主记录/计划语义隔离；令牌、密钥、完整事件对象和同步内部状态不得进入 JSON/Markdown/附件备份、日志或 Service Worker。
- **FR-012**: 系统 MUST 在 Calendar 同步不可用时保留手工计划编辑、记录快速记录、浏览、搜索、编辑、删除和离线使用。

### Invariants and Non-Regression Requirements

- **NR-001**: 普通 Google 事件永远不会自动转为 Log Note 计划或记录。
- **NR-002**: 本地计划与记录继续由当前账号的本地优先、revision/CAS 路径拥有；Calendar 同步不得成为第二套主数据存储。
- **NR-003**: 现有 `entries`、计划核心字段、JSON/Markdown/附件备份和 Service Worker 行为保持兼容。
- **NR-004**: 账号切换、撤权、冲突和离线恢复不得跨账号泄露、误删或静默覆盖数据。
- **NR-005**: 现有质量门禁和移动端交互/无障碍契约保持通过。

### Key Entities *(include only when data is involved)*

- **Managed Calendar Event**：由 Log Note 本地计划创建并带有私有管理标记的 Google 事件；可被同步写入。
- **Read-only Calendar Event**：Google 日历中的普通事件；只读展示和缓存，不进入 Log Note 主计划。
- **Calendar Sync Metadata**：当前账号的同步方式、游标、etag、最后同步、错误、重试和 channel 生命周期状态；不含令牌或完整事件正文。
- **Sync Conflict**：本地计划与受管 Google 事件版本不一致或远端删除时的待处理事实；保留双方最小摘要和用户选择状态。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在页面可见、已授权且网络正常时，至少 95% 的 Google 日历增量变化在 120 秒内反映到当前账号的只读缓存或冲突状态；无可用增量条件时明确显示降级方式。
- **SC-002**: 本地计划的创建、标题/时间修改和删除在 95% 的正常网络尝试中于 5 秒内反映到对应受管事件，且重复同步不会产生重复事件。
- **SC-003**: 100% 的重复/乱序/过期通知、失效游标、etag 冲突、撤权、账号切换和离线恢复场景都不造成跨账号写入、普通事件误删或本地计划静默丢失。
- **SC-004**: 真实测试账号完成本地计划→Google、Google 普通事件只读、受管事件远端修改/删除、撤权和账号切换的脱敏验收旅程；push 只有在部署条件和证据齐全时才可宣称。
- **SC-005**: 关闭 Calendar 同步后，快速记录、浏览、搜索、编辑/删除、离线使用、JSON 恢复和 Markdown 导出保持原有行为。

## Scope Boundaries *(mandatory)*

### In Scope

- 基于增量游标的 Google Calendar 变化读取、分页、去重、删除 tombstone 和缓存状态。
- Log Note 管理计划与 Google 受管事件的一对一同步、etag 冲突、撤权、离线恢复和账号隔离。
- 页面可见轮询兜底，以及在安全 OAuth、HTTPS、worker/queue 条件满足时的 push channel/webhook 契约。
- Settings/计划工作面的同步方式、上次同步、延迟、冲突、撤权和重试状态；自动化、浏览器和真实 OAuth 验证。

### Out of Scope

- Agent MCP/Skill、计划/记录 authoring actions（LN-084/LN-085）。
- 修改 `entries` 或为记录增加 `endTime`/区间语义。
- 普通 Google 事件写入、自动合并重叠事件、自动生成记录或计划。
- 未获批准的服务端 refresh token、service-role 绕过、第二套业务数据库、通用日历管理、提醒和共享日历平台。
- 首页快速记录重做、备份主格式迁移、真实外部账号操作和未满足条件的生产 webhook 发布。

## Assumptions and Dependencies

- 首版以浏览器可见期间的 `syncToken` 增量轮询作为可独立验收的“近实时”基线；页面恢复前台、网络恢复和手动刷新触发立即同步。
- 服务端 push/webhook 只有在目标部署提供公网 HTTPS、可靠快速响应、受控 worker/queue、channel 续期和安全长期授权凭据后才可启用。
- Google Calendar API、OAuth origin、scope、测试用户、部署域名和 Google Limited Use 合规证据必须由真实环境单独确认。
- 冲突默认不自动选择一方；首版恢复动作固定为“保留本地并重新创建”“采用 Google”或“手工处理”，UI 文案可在设计验收中微调但不得改变语义。
- Calendar 派生数据在 LN-067 的远程 AI 合规阻塞关闭前不得发送到通用远程模型。

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001～FR-004 / Stories 1-2 | Calendar model/provider contract tests、浏览器计划同步回归、重复/分页/离线测试 | 增量变化与受管事件同步 |
| FR-005～FR-007 / Story 3 | etag 冲突、tombstone、410 重建、重复/乱序通知和 recovery tests | 冲突、删除、通知生命周期 |
| FR-008～FR-012 / Story 3 | OAuth 状态、账号切换、撤权、缓存隔离、备份与手工离线回归 | 账号安全、离线和隐私 |
| SC-001～SC-003 | 延迟/去重/零误写自动化证据与状态截图 | 近实时与安全门禁 |
| SC-004～SC-005 | 脱敏真实 OAuth/部署记录、旧功能回归、关闭/移除检查 | 真实环境与可移除性 |
