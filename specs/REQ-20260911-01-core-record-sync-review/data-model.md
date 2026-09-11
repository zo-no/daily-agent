# 第一阶段数据模型与契约草案

**Requirement**: `REQ-20260911-01`
**Scope**: 本地保存/恢复的数据边界；云端结构只做对齐
**Status**: Draft；`AccountDataPayload` 为步骤一实现契约，`LocalSnapshotEnvelope`、恢复状态细节和云端类型是后续步骤的对齐草案，不在步骤一落地

## 1. 模型分层

```text
AccountDataPayload                 # 业务数据，前后端可读
        │
        ├── LocalSnapshotEnvelope  # 本地保存元数据，浏览器使用
        ├── CloudDocumentEnvelope  # 云端版本元数据，后续阶段
        └── SyncMutation            # 增量协议，后续阶段
```

三种封套不能互相冒充版本来源：`localRevision` 只属于本地，云端 `revision` 只属于云端，`itemVersion/serverSeq/cursor` 只属于增量协议。

## 2. 业务数据模型

以下类型是目标 TypeScript 形状；字段语义沿用当前 `src/lib` 的归一化结果，第一阶段不改变业务字段。`structureSchemaVersion` 是历史序列化字段，为备份/云端兼容保留；代码目录不再使用含糊的 `structure` 模块名。

```ts
type DataVersion = number;
type SchemaVersion = number;
type EntityId = string;
type DateString = string;       // YYYY-MM-DD
type TimeString = string;       // HH:mm

interface AccountDataPayload {
  version: DataVersion;
  structureSchemaVersion: SchemaVersion;
  seedVersion: number;
  domains: Domain[];
  categories: Category[];
  templates: RecordTemplate[];
  markdownSettings: PresentationSettings;
  entries: Entry[];
  planBlocks: PlanBlock[];
  goals: Goal[];
}

interface Domain {
  id: EntityId;
  name: string;
  order: number;
}

interface Category {
  id: EntityId;
  domainId: EntityId;
  name: string;
  order: number;
}

interface RecordTemplate {
  id: EntityId;
  name: string;
  categoryId: EntityId;
  order: number;
  recordType: "linear" | "periodic";
  schedule: Schedule | null;
  homeVisible: boolean;
  inputMode: "free" | "structured" | "value";
  tags: string[];
  prompt: string;
  skeleton: string;
  fields: TemplateField[];
}

interface Schedule {
  cadence: "timepoint" | "daily" | "weekly";
  time?: TimeString;
  weekday?: number; // 0..6
}

interface TemplateField {
  id: EntityId;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "rating";
  options: string[];
  placeholder: string;
  required: boolean;
}

interface Entry {
  id: EntityId;
  date: DateString;
  time: string;
  content: string;                  // 原始正文，恢复不可改写
  categoryId: EntityId;
  templateId: EntityId | null;
  tags: string[];
  fieldValues: Record<string, unknown>;
  attachments: AttachmentRef[];     // 只有本地引用，不含 Blob
  source: string | null;
  sourceLine: string | null;
  createdAt: number;
}

interface AttachmentRef {
  id: EntityId;
  kind: "image";
  storage: "indexeddb";
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  bytes: number;
  name: string;
  alt: string;
  createdAt: number;
}

interface PresentationSettings {
  layout: "timeline" | "grouped";
  domainHeading: string;
  categoryHeading: string;
  entryLine: string;
  allDayHeading: string;
  daySeparator: string;
}
```

计划与目标继续复用当前模型，但归属清晰：`plan-block.ts` 负责 `PlanBlock` 和外部日历引用；`goal.ts` 负责 `Goal`、`KeyResult` 和记录关联。它们都是 payload 的业务成员，不是同步元数据。

## 3. 本地保存模型（步骤三对齐草案，步骤一不实现）

```ts
interface LocalSnapshotEnvelope {
  envelopeVersion: number;
  accountScope: string;
  localRevision: number;
  savedAt: string;
  operationId: string;
  checksum: string;
  payload: AccountDataPayload;
}
```

读取兼容两种输入：

1. 当前裸 `LocalState` JSON：先按旧格式识别，再通过 `restoreState` 归一化。
2. `LocalSnapshotEnvelope`：先检查封套版本、账号 scope、序号和 checksum，再校验 payload。

写入失败不能更新“已保存”的状态；恢复/导入失败不能替换当前有效快照。是否保存有限历史快照、是否首次读取后自动升级封套，仍是 review 决策。

## 4. 恢复状态模型（步骤三对齐草案，步骤一只保持现有结果）

```ts
type HydrationState =
  | { status: "loading" }
  | { status: "new"; canPersist: true }
  | { status: "ready"; canPersist: true; localRevision?: number }
  | { status: "recovery-needed"; canPersist: false; rawPayload: string | null; errorCode: string };

type LocalSaveResult =
  | { status: "saved"; localRevision: number; operationId: string }
  | { status: "blocked"; reason: "recovery-needed" | "not-hydrated" }
  | { status: "failed"; errorCode: string; preservedRevision: number | null };

type RestoreResult =
  | { status: "restored"; state: AccountDataPayload; localRevision: number }
  | { status: "rejected"; reason: string; preservedState: AccountDataPayload };
```

这些类型属于本地恢复用例；`sync.status`、云端 revision 和冲突集合不进入 `AccountDataPayload`。

## 5. Store 投影模型（后续 ADR 候选，步骤一不实现）

Store 不是持久化模型，只投影已确认的客户端状态：

```ts
interface LogNoteClientState {
  data: AccountDataPayload;
  hydration: HydrationState;
  localSave: LocalSaveResult | null;
  recovery: { rawPayload: string; errorCode: string } | null;
}
```

Store 通过社区库（首选候选 Redux Toolkit + React-Redux）管理 reducer/selector；它不持有 token、Supabase client、Blob、页面草稿或云端行，也不直接调用 storage adapter。若 ADR 判定当前 Provider 已足够，则不创建该投影层。

## 6. 关系与校验

- `Category.domainId` 必须引用一个 `Domain.id`。
- `RecordTemplate.categoryId` 必须引用一个 `Category.id`。
- `Entry.categoryId` 必须引用现有分类；`templateId` 为空或引用现有模板。
- 所有 payload 实体 ID 在各自集合内唯一；目标实现继续拒绝重复 ID。
- `Entry.content` 按原文保存；归一化只清理结构和类型，不生成替代正文。
- `AttachmentRef` 只允许 IndexedDB 引用；Blob 不进入 payload 云同步。
- `PlanBlock` 的时间范围、`Goal` 的日期范围和外部引用继续由各自模型校验。
- `checksum` 只覆盖约定序列化后的 payload，不覆盖账号 token、Store 状态或云端元数据。

## 7. 云端对齐映射

| TypeScript 模型 | 云端位置 | 约束 |
|---|---|---|
| `AccountDataPayload` | `log_note_documents.payload` | 字段同形，运行时元数据不倒灌 |
| `LocalSnapshotEnvelope` | 不上传 | 浏览器本地专用 |
| `CloudDocumentEnvelope` | `log_note_documents` + revisions | 后续阶段，使用云端 `revision` |
| `Entry` / `PlanBlock` | record/plan items 的 payload | 后续增量阶段，item version 独立 |
| `SyncMutation` | `log_note_sync_changes` | 后续协议，SQL 自有约束 |

SQL 与 TypeScript 通过字段/版本/nullable 对齐测试验证；不要求数据库直接加载 TS。

## 8. 后续云端类型（本阶段只锁定形状）

这些类型不是第一阶段的运行输入，也不能进入客户端 Store；它们用于提前对齐现有云端表和后续 plan。

```ts
interface CloudDocumentEnvelope {
  userId: string;
  revision: number;
  updatedAt: string;
  deviceId: string;
  payload: AccountDataPayload;
}

interface SyncMutation {
  kind: "record" | "plan";
  entityId: EntityId;
  operation: "upsert" | "delete";
  baseVersion: number | null;
  payload: Entry | PlanBlock | null;
  operationId: string;
  deviceId: string;
  clientAt: string;
}
```

`CloudDocumentEnvelope.revision` 对应 `log_note_documents.revision`；`SyncMutation` 的服务端版本、游标、墓碑和冲突集合由增量协议另行管理，不修改 `Entry` 或 `PlanBlock` 字段。
