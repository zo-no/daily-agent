# Data Model: 账号绑定的 Agent MCP/Skill 桥接

**Requirement**: `REQ-20260905-01`

## Existing product entities

### Plan

由当前账号 `planBlocks` 拥有的未来时间块。MCP 只允许针对 `source=local` 的计划提出变更；`source=google` 的计划为只读上下文。

| 字段 | 规则 |
| --- | --- |
| `id` | 规范化后非空、长度有界、账号内唯一 |
| `date` | 合法 `YYYY-MM-DD` |
| `startTime` / `endTime` | 合法 `HH:mm`，结束晚于开始 |
| `title` | 非空，最多 240 字符 |
| `source` | `local` 或 `google`；Agent 只能写 `local` |
| `flexibility` | `fixed`、`movable`、`resizable` |
| `externalRef` | 只读关联摘要；MCP 不接受 Google token 或完整事件对象 |

### Record

由当前账号 `entries` 拥有的已经发生或正在发生的事实。第一阶段保留现有时间点 `time`，不增加 `endTime`。

| 字段 | 规则 |
| --- | --- |
| `id` | 规范化后非空、长度有界、账号内唯一 |
| `date` | 合法日期；读取必须在请求范围内 |
| `time` | 现有 `HH:mm`/秒级兼容语义，可为空；不改名为 `startTime` |
| `content` | 原始正文，非空限制和长度限制沿用现有数据规则；不得静默重写 |
| `categoryId` | 必须引用当前结构中已有分类 |
| `templateId` / `fieldValues` / `tags` | 仅在提案明确包含且通过现有规范化时保留 |
| `attachments` | MCP 读写均不携带 Blob、URL 或文件内容；确认写入不得改变附件引用 |

## MCP transient entities

### PairingSession

不进入产品持久化的短期授权关系。

| 字段 | 规则 |
| --- | --- |
| `sessionId` | 服务端生成，随机且不可预测 |
| `secret` | 仅内存保存；只通过用户主动复制/粘贴交给本地 MCP 进程 |
| `accountId` | 由已认证浏览器会话绑定，调用方不可指定 |
| `generation` | 绑定当前登录/页面 generation；账号切换、登出、刷新或撤销立即失效 |
| `createdAt` / `lastSeenAt` / `expiresAt` | 默认 30 分钟无活动过期，可主动撤销 |
| `status` | `active`、`revoked`、`expired`、`browser-unavailable` |

### ReadSnapshot

一次受控读取的结果，不写入账号数据。

| 字段 | 规则 |
| --- | --- |
| `schemaVersion` | 当前协议版本 `1` |
| `revision` | 读取时账号文档 revision |
| `fingerprint` | 对返回的规范化目标/集合做稳定哈希 |
| `data` | 允许字段的计划、记录或分类 |
| `truncated` | 超过条数/体积上限时为 `true` |
| `offline` | 来自本地缓存且无法证明云端新鲜度时为 `true` |
| `updatedAt` | 当前本地/云文档可见更新时间 |

### ChangeProposal

当前页面/bridge 内存中的待确认差异，不进入备份、Supabase 或 Service Worker。

```json
{
  "schemaVersion": 1,
  "proposalId": "proposal_xxx",
  "requestId": "request_xxx",
  "target": { "kind": "plan", "id": "plan_xxx" },
  "operation": "update",
  "sourceFingerprint": "v1:...",
  "expectedRevision": 12,
  "before": { "title": "原计划" },
  "after": { "title": "新计划" },
  "expiresAt": "2026-09-05T12:00:00.000Z",
  "writePolicy": "preview-required"
}
```

规则：

- `proposalId`、`requestId`、`expiresAt` 由 bridge 生成或校验，不接受调用方伪造可执行提案。
- 一个 proposal 只允许一个目标和一个操作；批量原子修改不属于 LN-084。
- `before` 是提交时用于展示和重新校验的规范化快照；更新/删除必须完整绑定目标，创建绑定空目标和当前集合指纹。
- `after` 只能包含该目标允许字段；未知字段、跨域字段、Google 只读字段或附件数据整份拒绝。
- 提交时重新读取当前账号状态；revision、目标指纹、账号 generation 或分类 allowlist 不匹配则零写入。
- 成功提交后 proposal 进入 `applied`，重复提交返回同一结果或 `already-applied`。

## State transitions

```text
PairingSession: active → revoked | expired | browser-unavailable
ReadSnapshot:   returned → stale (when revision/fingerprint changes)
Proposal:       proposed → confirmed → applied
                         ↘ cancelled | expired | rejected | conflict
```

任何非 `applied` 终态都不得改变 `entries`、`planBlocks`、备份或云文档。

## Serialization and compatibility

- MCP 会话、读取快照、proposal 和 confirmation token 不加入现有状态 JSON。
- `entries`、`planBlocks`、Markdown 导出和附件备份继续由现有 `normalizeState`/`restoreState` 处理。
- 旧备份缺少 MCP 临时对象或 `planBlocks` 时仍按现有兼容逻辑恢复；无效输入不得覆盖当前状态。
