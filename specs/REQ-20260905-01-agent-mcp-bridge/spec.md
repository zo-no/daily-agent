# Feature Specification: 账号绑定的 Agent MCP/Skill 桥接

**Requirement**: `REQ-20260905-01`
**Legacy Board Item**: `LN-084`
**Feature Directory**: `REQ-20260905-01-agent-mcp-bridge`
**Created**: 2026-09-05
**Status**: Draft
**Input**: User description: “让 Codex/Claude 能读取并在确认后修改 Log Note 的计划和记录，同时保持账号隔离、原始记录、离线和同步安全。”

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove the acceptance claim.

### User Story 1 - Agent 读取我的计划和记录 (Priority: P1)

用户在 Codex 或 Claude 中询问某天的计划、某个日期范围的记录或现有分类。Agent 先调用 Log Note 的受控读取能力，返回与当前账号、日期和范围一致的结果，并明确数据更新时间和是否存在截断。

**Why this priority**: 这是所有后续 Agent 编写能力的前置，也是用户要求“能够读我的计划、读我的记录”的最小可用价值。

**Independent Test**: 使用两个隔离账号和合成数据，分别读取计划、记录、分类；验证只返回当前账号、指定日期/范围内的有界字段，且第二个账号无法通过 ID 或参数读取第一个账号的数据。

**Acceptance Scenarios**:

1. **Given** 当前账号有 2026-09-05 的本地计划和记录，**When** Agent 请求该日期，**Then** 返回计划的日期、起止时间、标题、来源和记录的日期、时间、正文、分类等允许字段，并带有 schema 版本、revision 和来源指纹。
2. **Given** 请求日期范围超过上限、包含未知字段或目标属于其他账号，**When** Agent 读取，**Then** 整个请求被拒绝，不返回部分数据，不泄露账号存在性以外的敏感信息。
3. **Given** 当前设备离线但已经登录并有本地缓存，**When** Agent 读取，**Then** 读取结果来自当前账号的可用本地快照并标记离线/更新时间，不声称已获得最新云端状态。

### User Story 2 - Agent 提出并确认修改 (Priority: P1)

用户让 Agent 新增、修改或删除一个本地计划或记录。Agent 先返回可读的差异提案；用户明确确认后，系统重新核对目标、账号、版本和指纹，执行一次变更并读回结果。未确认的提案不能改变记录、计划、云文档或备份。

**Why this priority**: 这是“Agent 可以调用并且编写计划”和“真的可以帮忙编写记录”的共同安全闭环，必须统一而不能为计划、记录各造一套写入语义。

**Independent Test**: 对本地计划和普通记录分别执行 create/update/delete；在确认前检查状态、备份和同步队列均不变，在确认后检查只发生一次预期变更并可读回；再用 stale revision、错误指纹、过期提案和重复提交验证零写入或幂等结果。

**Acceptance Scenarios**:

1. **Given** Agent 已读取当前账号 revision=12 的本地计划，**When** Agent 提议将标题和时间改为新值，**Then** 返回包含目标、原值、新值、来源指纹、expected revision、过期时间和 `preview-required` 的提案，不写入任何数据。
2. **Given** 用户明确确认且 revision、目标和指纹仍匹配，**When** 系统提交提案，**Then** 只修改允许字段，返回规范化对象、实际 revision、实际指纹和 `applied=true`，并能在后续读取中看到同一结果。
3. **Given** 用户未确认、提案过期、目标已变化、revision 过期、分类不存在、计划来源为 Google 或请求被取消，**When** 系统尝试提交，**Then** 返回受控错误或 conflict，原记录、计划、备份和同步状态保持不变。
4. **Given** Agent 修改记录正文，**When** 用户确认，**Then** 变更只发生在用户明确选择的正文字段；系统不得因分类、计划或 Agent 推断而静默重写其他正文、标签、附件或结构字段。

### User Story 3 - 外部 Agent 不破坏 Log Note 的账户和离线边界 (Priority: P1)

用户切换账号、退出登录、刷新页面、关闭浏览器或暂时断网时，Agent 连接失效或降级为清晰的不可写状态；任何旧会话或迟到响应都不能把数据写入新账号，也不能绕过现有本地优先和 revision/CAS 链路。

**Why this priority**: 外部 Agent 带来新的调用边界，账号隔离、离线可用和原始记录保护是产品不可退让的前提。

**Independent Test**: 在配对撤销、账号切换、浏览器标签页关闭、网络断开和并发提交场景下，检查旧请求被拒绝或失效、当前账号数据不被污染、未确认提案不产生写入。

**Acceptance Scenarios**:

1. **Given** MCP 已与账号 A 的浏览器会话配对，**When** 用户退出并切换到账号 B，**Then** 账号 A 的配对、未完成提案和旧请求全部失效，账号 B 不能读取或提交账号 A 的目标。
2. **Given** 用户在已认证设备离线，**When** Agent 请求写入，**Then** 系统不声称云端已保存；若本地配对通道无法安全调用当前 `commitData`，写入被拒绝且现有离线手工记录能力不受影响。
3. **Given** 两个请求同时提交同一 revision，**When** 第一个成功、第二个迟到，**Then** 第二个得到 stale/conflict 结果，不覆盖第一个结果，也不进行未经确认的自动合并。

### Edge Cases

- 空计划、空记录、无分类、日期范围为空、单字段或总 payload 超限。
- 未知字段、非法日期/时间、重复请求 ID、重复提交、提案过期、错误 fingerprint、stale revision。
- Google 来源计划只读；普通 Google 事件和附件 Blob 不进入外部 Agent 的写入范围。
- 浏览器未打开、配对撤销、账号切换、网络中断、云端 revision 冲突和迟到响应。
- MCP 客户端断线或请求取消时，必须零写入；日志不得包含正文、token 或 service key。

## Product Admission *(mandatory)*

### Core-Loop Contribution

直接改善“浏览、搜索、编辑/删除”三个环节：用户可以用自然语言定位记录/计划并发起一次受控编辑，同时不改变首页快速记录的默认步骤。

### User Evidence

产品负责人明确提出要让 Codex/Claude 读取和修改 Log Note 的计划与记录，并将能力拆成 Agent 计划、Agent 记录和 Google Calendar 同步三项；现有 LN-081/082/083 只覆盖内部或页面内 Agent，不能替代外部 MCP 调用。

### Default Interface and Recording Cost

能力位于外部 Agent 的次级调用面，不在首页增加控件、弹窗或必填字段。普通快速记录仍保持原有“输入后一次保存”路径；外部 Agent 的写入额外增加一次可见提案确认，这是安全边界而不是日常手工记录的必经步骤。

### Offline, Account, Privacy, Reversibility, and Backup

MCP 只访问当前已配对账号的有界计划、记录和分类字段。token、service key、完整账号文档、图片 Blob、Google 私有字段和其他账号数据不得暴露。确认前零写入；确认后必须复用当前 `commitData`/revision-CAS 等价链路并读回。已认证设备的记录、计划、搜索、编辑和删除离线能力不受影响；失败、取消、过期和冲突不覆盖本地或云端状态。现有 JSON/Markdown/附件备份格式不增加 MCP 会话、提案或确认历史字段；移除桥接不需要迁移。

### Verification and Removability

自动化覆盖 MCP handshake/discovery、资源和工具 schema、账号隔离、范围/字段上限、提案零写入、确认后的 CRUD、stale/过期/重复提交、离线/撤销/账号切换和读回一致性；真实环境单独验证 Codex/Claude 发现、一次配对、真实登录账号和多标签页行为。实现应隔离在 Agent bridge/transport/Skill 模块，移除 transport、Skill、配置和测试不得触碰既有记录、计划、备份或云文档。

### Exit Condition

若无法在不暴露凭证和不绕过本地优先/CAS 的情况下完成配对，或 14 天观察内用户不复用 Agent 读写、确认成本明显高于手工编辑、发生一次跨账号/静默覆盖/备份回归，即保持在关闭的实验入口或移除，不进入首页主流程。

### Admission Decision

- **Score**: `18/20` using the rubric in `product.md`
- **Decision**: `mainline candidate`，但必须先通过账号、隐私、离线和真实客户端发现门槛
- **Red-line check**: 不静默改写原始记录；不新增普通记录步骤；不暴露未授权账号数据；不新增第二套存储；备份与离线能力保持兼容。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 提供版本化的只读资源和读取动作，使 Agent 能按单日或有界日期范围读取当前账号的计划、记录和已有分类。
- **FR-002**: 读取结果 MUST 只包含允许字段，并返回 schema 版本、当前 revision、来源 fingerprint、更新时间和截断/离线状态；不得返回 token、service key、图片 Blob、完整账号文档或其他账号数据。
- **FR-003**: 系统 MUST 对所有提案和提交绑定当前账号会话、request ID、目标、source fingerprint、expected revision 和 proposal TTL。
- **FR-004**: 系统 MUST 将计划和记录的新增、修改、删除拆成明确操作，并在确认前只返回可读差异提案，写策略固定为 `preview-required`。
- **FR-005**: 系统 MUST 在提交前重新读取并校验账号、目标存在性、Google 只读来源、已有分类 allowlist、字段范围、fingerprint、revision、TTL 和幂等键；任一失败则整次零写入。
- **FR-006**: 系统 MUST 在确认成功后只执行一次原子变更，并返回规范化结果、实际 revision、实际 fingerprint 和可验证的读回结果；不得在没有读回证据时声称已保存。
- **FR-007**: 系统 MUST 使重复提交幂等或明确返回 already-applied，不得重复创建记录或计划。
- **FR-008**: 系统 MUST 在账号切换、退出、配对撤销、浏览器会话失效、离线、请求取消、超时或迟到响应时拒绝或使旧操作失效，并保持现有手工离线记录能力。
- **FR-009**: Skill MUST 仅描述计划/记录语义、读→提案→确认→提交→读回流程和安全话术，不包含凭证、隐藏写入或绕过 MCP 的持久化逻辑。
- **FR-010**: 系统 MUST 提供 Codex 配置示例、Claude 调用说明、启动/配对/撤销/故障排查步骤，并明确当前能力仍需用户确认后才写入。

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.
- **NR-005**: Google-origin plans MUST remain read-only to the Agent bridge, and ordinary Google events MUST not become Log Note records or plans automatically.

### Key Entities *(include only when data is involved)*

- **Plan**：未来意图的时间块；本地计划可编辑，Google 来源计划只读；属于当前账号的 `planBlocks`。
- **Record**：已经发生或正在发生的事实；包含日期、时间、正文和一个已有分类；属于当前账号的 `entries`，原文受保护。
- **Read Snapshot**：一次有界读取返回的计划/记录/分类和 revision/fingerprint；只存在于当前请求上下文，不写入产品数据。
- **Change Proposal**：针对一个或一组明确目标的版本化差异；有 proposal ID、request ID、目标、原指纹、expected revision、TTL 和 preview-required 状态；确认或过期后失效。
- **Pairing Session**：MCP 与当前已登录浏览器会话的一次性授权关系；绑定账号和会话 generation，可主动撤销，不进入备份。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在有有效配对和本地数据的情况下，Agent 能在一次读取请求中返回指定日期的计划和记录，查询范围与总 payload 均受明确上限保护，结果无跨账号数据。
- **SC-002**: 所有确认前、过期、stale、取消、离线和未认证写入场景均保持零写入；确认成功的 CRUD 操作 100% 有实际读回结果和 revision 证据。
- **SC-003**: 普通快速记录的操作步骤、现有 JSON/Markdown/附件备份格式、已认证离线记录能力与 Google 只读边界在回归中保持不变。
- **SC-004**: 至少一次真实 Codex 或 Claude 客户端完成 handshake、读取计划/记录、提出变更、明确确认、提交并读回；真实账号、配对撤销和账号切换证据单独记录，未验证部分不得标记 Accepted。

## Scope Boundaries *(mandatory)*

### In Scope

- 一个账号绑定的 MCP transport/bridge 和配套语义 Skill。
- 有界读取计划、记录、分类；计划和记录的 proposal/confirm/commit/read-back 协议。
- 当前浏览器会话配对、撤销、失效、错误和离线状态。
- 版本化 schema、fingerprint、TTL、幂等、安全字段、Codex 配置示例、Claude 使用说明和聚焦回归。

### Out of Scope

- Google Calendar 近实时同步（LN-086）。
- 记录 `endTime` 或跨日区间的持久化 schema；第一阶段继续使用现有 `entries.date/time`。
- 自动生成记录、自动完成计划、自动创建分类、批量无界修改、通用 Agent memory、后台任务和定时提醒。
- 直接暴露 Supabase service key、直接写表、第二套数据库、图片 Blob、Google token 或完整账号文档。
- 首页 UI 重做、普通快速记录流程变化、备份格式迁移、真实部署发布和生产 OAuth 扩展。

## Assumptions and Dependencies

- 第一阶段采用本地配对：一个已登录的 Log Note 浏览器会话是本地状态拥有者，MCP 不能在没有受控浏览器通道时自行写云文档。
- 记录继续使用当前时间点 `time`；如需时间段，另立 schema、导出、编辑器和迁移规格。
- 具体 MCP SDK/transport 依赖、配对界面和配对 TTL 在实现计划中确定，但不得改变本规格的安全与写入语义。
- 需要真实 Codex/Claude 客户端、真实登录账号和至少一个已认证离线设备用于独立验收；本地测试不能替代这些证据。
- LN-084 必须先于 LN-085；LN-086 与本项独立，但不得把 Google 私有字段带入 MCP 资源。

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001～FR-002 / Story 1 | MCP handshake、resource/tool schema、双账号隔离和范围上限测试 | 有界读取与账号安全 |
| FR-003～FR-007 / Story 2 | proposal/confirm/commit 单测、stale/TTL/幂等回归、提交后 read-back | 预览、确认、原子提交 |
| FR-008 / Story 3 | 撤销、账号切换、离线、取消、迟到响应和备份回归 | 离线、隐私、可恢复 |
| FR-009～FR-010 | Skill 文档审查、Codex 配置示例、Claude 真实调用记录 | 外部 Agent 可发现、可使用 |
| SC-001～SC-004 | `npm run check`、真实客户端手工证据、未验证项登记 | 完整门禁与 Accepted 条件 |
