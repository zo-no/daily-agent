# Data Model: AI 模板生成与分类结构演进

**Board Item**: `LN-077`
**Principle**: AI 只产生临时 proposal；确认后的对象继续使用既有 Domain / Category / Template 模型

## 1. 持久化结论

首期 **不新增持久化实体、schema version、数据库表或长期记忆**。

- `TemplateProposal`、`TemplatePatchProposal`、`StructurePackageProposal`、请求状态和运行元数据只存在当前页面会话。
- `TemplateUsageSummary` 每次从当前账号本地 entries 重算，不写入账号文档、Supabase、备份或导出。
- 用户确认后只创建/修改现有 `domain`、`category`、`template` 对象；与手工结构完全同形。
- 不保存 `aiGenerated`、Dify run ID、Prompt、Token、接受/拒绝历史或原始模型响应。

## 2. 现有持久化实体

### Domain

| Field | Type | Validation | Ownership |
| --- | --- | --- | --- |
| `id` | string | 产品本地生成，账号内唯一；模型不得提供 | 当前账号文档 |
| `name` | string | trim 后 1–80 字符，不能与现有领域规范化重名 | 当前账号文档 |
| `order` | integer | 产品按同级末尾生成 | 当前账号文档 |

### Category

| Field | Type | Validation | Ownership |
| --- | --- | --- | --- |
| `id` | string | 产品本地生成，账号内唯一 | 当前账号文档 |
| `domainId` | string | 必须引用当前账号现有或同一原子操作中新建的领域 | 当前账号文档 |
| `name` | string | trim 后 1–80 字符，同一领域内不得规范化重名 | 当前账号文档 |
| `order` | integer | 产品按父领域同级末尾生成 | 当前账号文档 |

### Template

| Field | Type | Validation | Ownership |
| --- | --- | --- | --- |
| `id` | string | 产品本地生成，账号内唯一 | 当前账号文档 |
| `categoryId` | string | 必须引用当前账号现有或同一原子操作中新建的分类 | 当前账号文档 |
| `name` | string | trim 后 1–80 字符，同一分类内不得规范化重名 | 当前账号文档 |
| `order` | integer | 产品按父分类同级末尾生成 | 当前账号文档 |
| `recordType` | enum | `linear \| periodic` | 当前账号文档 |
| `inputMode` | enum | `free \| structured \| value` | 当前账号文档 |
| `schedule` | object/null | linear 必须为 null；periodic 必须是有效 cadence | 当前账号文档 |
| `tags` | string[] | 最多 3 个，trim、去 `#`、去重、每项 1–32 字符 | 当前账号文档 |
| `prompt` | string | 最多 280 字符 | 当前账号文档 |
| `skeleton` | string | 首期 proposal 固定为空；不由模型生成 | 当前账号文档 |
| `fields` | TemplateField[] | 最多 6 个；仅 structured 使用 | 当前账号文档 |

### TemplateField

| Field | Type | Validation | Ownership |
| --- | --- | --- | --- |
| `id` | string | 新字段由产品本地生成；既有字段 ID 不可由优化提案改变 | 当前账号文档 |
| `label` | string | 1–60 字符 | 当前账号文档 |
| `type` | enum | `text \| textarea \| number \| select \| rating` | 当前账号文档 |
| `options` | string[] | select 最多 6 个去重选项；其他类型为空 | 当前账号文档 |
| `placeholder` | string | 最多 120 字符 | 当前账号文档 |
| `required` | boolean | 明确布尔值 | 当前账号文档 |

## 3. 会话期实体

### ProposalContext（仅浏览器）

| Field | Type | Meaning |
| --- | --- | --- |
| `requestId` | string | 浏览器生成的一次请求 ID；不进入账号文档 |
| `accountGeneration` | number/string | 当前已认证账号上下文的本地 generation；不得发送给 Dify |
| `mode` | enum | `create \| refine \| structure` |
| `targetTemplateId` | string/null | refine 的目标；create/structure 为 null |
| `structureFingerprint` | string | 对参与判断的规范化结构做稳定 hash |
| `createdAt` | ISO datetime | UI 过期与调试；不持久化 |
| `status` | enum | 见状态机 |

**Validation**:

- 任何 `accountGeneration`、`mode`、target 或 fingerprint 变化都使 context stale。
- Dify 不能返回或覆盖这些字段；同源服务端只回显已经验证的 request/fingerprint 包装值。

### TemplateUsageSummary（本地派生）

| Field | Type | Validation |
| --- | --- | --- |
| `templateId` | string | 必须等于 refine 目标 |
| `useCount` | integer | 当前账号中 `entry.templateId` 匹配的记录数，≥0 |
| `activeDays` | integer | 有匹配记录的唯一有效本地日期数，≥0 且 ≤useCount |
| `lastUsedAt` | date/null | 最新有效记录日期；无使用为 null |
| `sampleWindow` | object | 可选统计窗口起止日期，只描述统计范围 |

**Forbidden**: content、tags、附件、图片、字段值、entry ID 列表、其他账号记录。旧记录缺失 `templateId` 时可以按既有确定性映射计入；无法可靠映射则忽略，不能猜测。

### TemplateDraft

创建与结构包共用的无持久 ID 模板草案。

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `suggestedCategoryRef` | string/null | create only | 必须来自请求中的现有分类 ref；结构包为 null |
| `name` | string | yes | 1–80 |
| `recordType` | enum | yes | linear/periodic |
| `inputMode` | enum | yes | free/structured/value |
| `prompt` | string | yes | 1–280 |
| `tags` | string[] | yes | 0–3 |
| `schedule` | object/null | yes | 与 recordType 自洽 |
| `fields` | NewFieldDraft[] | yes | structured 为 1–6；free/value 为 0 |

`value` 首期必须是 periodic 且没有 fields；`structured` 至少一个字段；`free` 没有 fields。违反组合规则整份失败，不做自动修补。

### NewFieldDraft

与 `TemplateField` 相同但没有 `id`。确认时由产品生成 ID。模型返回 `id` 属于 unknown field，整份失败。

### TemplatePatchProposal

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `targetTemplateRef` | string | yes | 必须等于请求中的目标 ref |
| `name` | string/null | yes | null 表示不改；非空 1–80 |
| `prompt` | string/null | yes | null 表示不改；非空 ≤280 |
| `tags` | string[]/null | yes | null 表示不改；非空 ≤3 |
| `fieldUpdates` | FieldUpdate[] | yes | 每个既有 fieldRef 最多一次 |
| `addField` | NewFieldDraft/null | yes | 最多一个；只有目标 inputMode=structured 时允许 |
| `reason` | string | yes | 1–280，必须基于已提供状态/统计 |

#### FieldUpdate

| Field | Type | Rules |
| --- | --- | --- |
| `fieldRef` | string | 必须匹配目标模板一个既有字段 |
| `label` | string/null | null 不改，非空 1–60 |
| `placeholder` | string/null | null 不改，非空 ≤120 |
| `required` | boolean/null | null 不改 |

**Not representable by schema**: categoryId、recordType、inputMode、schedule、field type/options/id/order、delete。外部响应出现这些字段时因 strict schema 整份失败。

### StructurePackageProposal

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `domainDraft.name` | string | yes | 1–80，不与现有领域规范化重名 |
| `categoryDraft.name` | string | yes | 1–80，不与目标新领域内候选重复 |
| `templateDraft` | TemplateDraft | yes | `suggestedCategoryRef` 必须为 null |
| `gapReason` | string | yes | 1–280，说明现有结构为何不足 |
| `evidenceEntryIds` | string[] | yes | 1–12，去重，全部来自请求 selectedEntries |

任何领域/分类近义重复命中本地确定性检查时整份失败并提示优先复用现有结构；不允许模型建议自动合并旧结构。

### ProposalEnvelope（同源 API → 浏览器）

| Field | Type | Meaning |
| --- | --- | --- |
| `schemaVersion` | literal `1` | Log Note proposal contract version |
| `requestId` | string | 服务端验证后回显 |
| `mode` | enum | create/refine/structure |
| `structureFingerprint` | string | 服务端验证后回显，不取信模型 |
| `outcome` | enum | `proposal \| no-change` |
| `reason` | string | 简短可见解释 |
| `warnings` | string[] | 最多 3 项、每项 ≤160 |
| `proposal` | union/null | 与 mode 对应；no-change 时 null |

平台原始 response、usage、run ID 和 Prompt 不进入 envelope。服务端可以在不含正文的运行日志中记录 mode、耗时、字节、状态和 provider result code。

## 4. 结构指纹

### Input

- create: 规范化 domains/categories/templates 的 ID、父 ID、名称、recordType、inputMode、字段 ID/label/type/order；不含 entries。
- refine: create 集合 + 目标模板完整可编辑结构。
- structure: create 集合 + selected entry IDs/currentCategoryId；不含正文。

### Canonicalization

1. 按稳定 ID 排序对象和字段。
2. trim 文本，但不翻译、不改变大小写内容。
3. 使用显式 key 顺序序列化。
4. 计算浏览器可重复的 SHA-256（或已有等价稳定 hash）。

确认前用最新 state 重算；不同即 stale。fingerprint 不是鉴权凭据，也不替代 Supabase CAS revision。

## 5. 状态机

```text
idle
  ├─ empty create input ──> local-default ──> idle
  └─ valid remote input ──> requesting
                              ├─ valid proposal ──> preview
                              │                      ├─ reject ──> idle
                              │                      ├─ stale ──> stale ──> idle
                              │                      └─ confirm ──> applying
                              │                                         ├─ success ──> applied ──> idle
                              │                                         └─ local write fail ──> preview
                              ├─ no-change ──> no-change ──> idle
                              ├─ stop/context change ──> aborted ──> idle
                              └─ invalid/offline/timeout ──> unavailable ──> idle
```

`requesting`、`preview`、`stale`、`unavailable` 在账号/路由/模式切换时必须清空。只有 `applying → applied` 可以写持久状态。

## 6. 应用规则

### create

1. 重算 fingerprint。
2. 校验目标现有分类仍存在且名称不重复。
3. 本地生成 template/field IDs 和 order。
4. 一次 `commitData` append 一个 template。

### refine

1. 重算 fingerprint并确认 target 仍存在。
2. 从最新 target 再执行 patch allowlist，而不是用生成时完整对象覆盖。
3. 既有 field ID/order/type/options 保留；新字段生成一个新 ID 并追加末尾。
4. 一次 `commitData` 更新一个 template。

### structure

1. 重算 fingerprint、证据记录存在性和重复结构检查。
2. 生成 domain/category/template/field IDs 及各级末尾 order。
3. 一次 `commitData` 同时 append 三层对象。
4. entries 完全不在更新对象中；确认成功后只提供“前往结构管理”或以后另行调整记录的入口。

所有模式 localStorage 写入失败都返回 false/失败状态，不显示成功，也不触发模型重试。后续云同步冲突走现有 CAS 冲突 UI。
