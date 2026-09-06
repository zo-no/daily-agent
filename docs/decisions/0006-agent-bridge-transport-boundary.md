---
status: proposed
date: 2026-09-05
decision-makers:
  - project-owner
---

# Agent MCP 桥接采用哪一种账号与浏览器边界

## Context and Problem Statement

Log Note 的文字记录、计划、账号会话和离线缓存由已登录浏览器拥有，现有
`commitData` 负责本地优先写入、revision/CAS 同步和读回验证。Codex 或 Claude 需要通过
MCP 读取当前账号的计划/记录，并在明确确认后修改它们；MCP 不能直接获得 Supabase service
key、浏览器存储、Google token 或完整账号文档。

因此需要确定 MCP 进程、Log Note 浏览器和账号云文档之间的长期边界，避免实现出第二套写入
路径或在账号切换、离线、刷新时把旧请求写入新账号。

## Decision Drivers

- 保留当前浏览器拥有的 local-first、离线、账号隔离和 `commitData`/CAS 链路。
- 在确认前保持零写入，确认后只执行一次原子变更并提供读回证据。
- 不暴露 service key、Google token、完整账号文档、图片 Blob 或其他账号数据。
- 让支持 stdio MCP 的 Codex/Claude 能发现资源和动作，同时保持桥接可撤销、可移除。
- 控制第一阶段的部署、刷新、断网、浏览器生命周期和多设备冲突复杂度。

## Considered Options

1. **本地配对桥接（推荐候选）**：MCP stdio 进程只访问 loopback bridge；已登录 Log Note
   浏览器通过短期 pairing secret 领取请求，读取当前本地快照，并在确认后调用现有
   `commitData`，再把规范化读回结果返回给 MCP。
2. **账号级远程 CAS 适配器**：MCP 使用用户 OAuth 直接访问同一账号的云文档，沿用严格
   schema、revision/CAS 和读回；浏览器通过 revision 变化重新同步外部写入。
3. **Supabase service-role 或独立数据库**：拒绝。该方案绕过用户账号边界、本地优先和现有
   同步链路，且会产生新的持久化真源。

## Decision Outcome

**Proposed option**: 采用“本地配对桥接”。最终状态仍为 `proposed`，待项目负责人在会话 0
确认后改为 `accepted`；若选择远程 CAS，应在本 ADR 中替换方案、补充 OAuth/RLS/缓存失效
证据，并同步修改 LN-084 的 spec、plan 和 tasks。

### Consequences

- Good, because 浏览器继续是账号状态拥有者，MCP 不需要接触 Supabase、localStorage、
  IndexedDB 或 Google token；确认后的写入天然复用 `commitData`、local-first 和 revision/CAS。
- Good, because pairing、request、proposal 和 confirmation 可以只在 loopback 内存和当前
  浏览器会话存在，撤销、账号切换、浏览器关闭和 TTL 失效都能统一处理。
- Bad, because Codex/Claude 使用时需要保持已登录浏览器会话和本地 bridge 可用；浏览器关闭
  或离线时只能返回清晰的不可写状态，不能声称云端已保存。
- Neutral, because 第一阶段必须限制为有界读取、单目标 proposal、显式确认和一次提交；后台
  MCP 服务、无界批量修改和远程公开 endpoint 不属于本决定。

### Confirmation

确认后必须由 `LN-084` 的协议、MCP handshake、浏览器配对、账号切换、离线、stale revision、
撤销、重复提交和读回回归验证；至少一次真实 Codex 或 Claude 客户端的发现、读取、提案、
确认、提交和读回证据必须单独记录。只读设计、Mastra Studio 或本地单测不能替代真实客户端
或真实账号证据。

## More Information

- [LN-084 specification](../../specs/REQ-20260905-01-agent-mcp-bridge/spec.md)
- [LN-084 implementation plan](../../specs/REQ-20260905-01-agent-mcp-bridge/plan.md)
- [LN-084 task list](../../specs/REQ-20260905-01-agent-mcp-bridge/tasks.md)
- [Agent 计划、记录与 Google Calendar 三能力拆解](../2026-09-05-Agent计划记录日历三能力拆解.md)
- [MADR decision log](README.md)
