# Research: 账号绑定的 Agent MCP/Skill 桥接

**Requirement**: `REQ-20260905-01`
**Date**: 2026-09-05

## Decision 1: 采用本地配对桥接，浏览器继续拥有产品状态

**Decision**: 第一阶段由 stdio MCP server 转发到已登录 Log Note 浏览器标签页；浏览器侧读取当前账号本地快照并执行现有 `commitData`，MCP server 不直接读写 Supabase。

**Rationale**:

- `LogNoteDataProvider.commitData()` 已经实现本地先写、账号作用域和延迟 CAS 同步；复用它最符合项目 Constitution。
- 浏览器持有图片引用、会话 generation 和离线状态，外部进程不需要接触 localStorage、IndexedDB 或 token。
- 远程 CAS 会新增外部写入后的本地缓存刷新、撤销、离线冲突和服务端 OAuth 边界，超出 LN-084 的最小垂直切片。

**Alternatives considered**:

- 远程 MCP 直接携带用户 OAuth 访问云文档：暂不采用；需要独立的 OAuth、RLS、外部写入唤醒和多设备一致性规格。
- MCP 直接使用 Supabase service key：拒绝；违反账号隔离和密钥边界。
- 通过 Mastra Tool 代替 MCP：拒绝；Mastra Tool 是执行适配器，不是外部 MCP transport。

## Decision 2: 采用请求队列 + 浏览器泵，而不是让 Route Handler 访问浏览器状态

**Decision**: 本地 bridge route 只保存短生命周期、内存中的 pending request/result；浏览器在用户打开“Agent Bridge”设置面板并完成配对后轮询领取请求，使用当前 Provider 状态执行，再回传结果。

**Rationale**:

- Next.js 服务端无法直接读取浏览器 localStorage，也不能调用 React Provider 的 `commitData`。
- 浏览器泵让所有产品数据变更仍然经过现有客户端拥有者和 `commitData`，同时能让 Codex/Claude 使用标准 MCP stdio transport。
- 队列只用于瞬态传输，提案、确认、pairing secret 和请求正文不进入 Supabase、备份或 Service Worker。

**Alternatives considered**:

- 浏览器扩展或 CDP 自动化：需要额外安装、权限和跨浏览器适配，暂不作为第一实现。
- 长连接 WebSocket：在当前部署与 PWA 生命周期下增加重连和代理复杂度；短轮询足以验证协议。

## Decision 3: Proposal-first、单目标、显式确认、一次提交

**Decision**: 每个 change proposal 只针对一个 plan 或 record 目标，操作为 `create`、`update` 或 `delete`；提案必须包含目标快照指纹和账号 revision，确认时重新读取并只提交一次。

**Rationale**:

- 单目标让差异预览、stale 检查、失败零写入和读回证据可独立测试。
- 现有 AI contract 已采用 schema version、request ID、source fingerprint 和 `preview-required`，外部 Agent 应复用相同安全语义。
- 批量原子修改会扩大冲突、回滚和用户确认成本，留到后续独立任务。

**Alternatives considered**:

- 允许 MCP 直接发送完整状态替换：拒绝；容易覆盖其他设备和破坏原始数据。
- 无确认的单步写工具：拒绝；无法证明用户明确同意具体差异。

## Decision 4: 第一阶段只读字段明确排除附件和 Google 私有字段

**Decision**: 记录可返回正文、日期、时间、分类 ID/名称和必要结构字段；附件只返回“存在/数量”摘要或完全省略，不返回 Blob、URL 或文件内容；计划只返回标题、日期、起止时间、来源、灵活性和受管关联摘要。

**Rationale**: 外部 Agent 的核心价值是读写文字计划和记录。附件和 Google 私有字段会扩大隐私、体积和授权边界，且不是本项必须条件。

## Decision 5: 记录继续使用时间点

**Decision**: LN-084 不增加记录 `endTime` 或跨日区间持久化；API 和 Skill 使用“时间点记录”表述。若后续真实使用证明时间段是必要能力，另立 schema、导出、编辑器和迁移规格。

**Rationale**: 当前 `entries`、备份、Markdown、排序和编辑器都以 `time` 为规范字段；直接引入区间会扩大变更面并改变产品语义。

## Decision 6: 安全预算与生命周期

**Decision**:

- pairing secret 只在内存保存，默认 30 分钟无活动过期，用户可随时撤销。
- 单次读取最多 50 条记录、30 个计划、7 个自然日；单条正文最多 10,000 Unicode 字符，总响应最多 256 KiB。
- 单次提案 TTL 为 5 分钟；同一 request ID/proposal ID 的重复提交必须返回同一结果或 `already-applied`。
- bridge 只监听 loopback 地址；生产公开域名不暴露未认证 MCP endpoint。

**Rationale**: 这些上限使资源、队列和提案不会成为隐蔽的大规模数据导出或重复写入通道，并可在测试中明确验证。

## Open evidence

- 真实 Codex/Claude 客户端是否能按目标配置完成 MCP handshake 和资源发现。
- 浏览器泵在关闭标签页、多标签页、刷新、账号切换和离线时的真实行为。
- 具体 MCP SDK 版本、启动命令和目标平台的配置格式；实现阶段按锁定依赖和客户端实测记录。
- 真实账号下的外部 Agent 内容质量、确认成本和 14 天复用率。
