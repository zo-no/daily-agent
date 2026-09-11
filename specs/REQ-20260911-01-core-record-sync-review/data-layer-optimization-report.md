# 核心数据结构与分层优化评审稿

**Requirement**：`REQ-20260911-01`
**Legacy Board Item**：`LN-013`（本地数据保护，作为第一阶段的结构治理映射）
**阶段**：方案 review；不授权代码、依赖、数据库或看板修改

> 本报告是第一阶段的具体结构提案和待确认决策清单。项目级分层、社区 Store、单一持久化写入、
> 旧入口迁移和核心链路讨论门禁以 `.specify/memory/constitution.md` 及 Spec Kit overrides 为
> 唯一规范来源；本报告不重复建立一套全局规则。

## 结论先行

这次不把所有数据继续平铺到 `src/lib`，也不建立一个自研的前端 Store。推荐的目标是：

- 用纯 TypeScript 定义一份前后端可读取的 Log Note 业务契约。
- 用 `src/modules/log-note-data/` 表达业务归属，不把它当成前端或后端目录。
- 用 `src/app/_stores/log-note/` 作为客户端 Store 接入层；只有 ADR 和测量证据通过后，才接入 Redux Toolkit + React-Redux 等社区库。
- 用 `src/infrastructure/browser/` 和 `src/infrastructure/supabase/` 分别承载运行端读写。
- 把 `src/lib` 的核心入口作为迁移对象，所有调用方迁移、回归通过后删除，不做永久兼容层。

第一阶段只做本地保存、读取、损坏保护和备份恢复；云端现有结构只用来提前对齐字段与版本，不在本轮参与运行链路。

## 1. 为什么要拆层

现在的 `src/lib/data.mjs` 既是业务模型，又处理默认数据、旧版本迁移、归一化、导入导出和 Markdown；`account-sync.mjs` 又把账号 key、同步元数据、增量流、指纹、附件和云文档 reconcile 放在一起。Provider 还同时处理 React 状态、本地读写、云端调用和冲突状态。

这样的结构有两个直接风险：

1. 本地恢复和云端同步会共享隐式状态，无法证明“本地已保存”是否独立成立。
2. 前后端共用时容易把 `window`、React、Supabase SDK 或 RPC 参数带进所谓的共享模型。

拆层的目的不是增加目录，而是让每个状态只有一个所有者，调用链可以独立测试和替换。

## 2. 目标目录

```text
src/
├── modules/
│   └── log-note-data/                 # 业务归属，不代表运行端
│       ├── contract/                  # 纯 TypeScript，前后端可读
│       │   ├── account-state.ts
│       │   ├── entry.ts
│       │   ├── taxonomy.ts
│       │   ├── record-template.ts
│       │   ├── presentation-settings.ts
│       │   ├── plan-block.ts
│       │   ├── goal.ts
│       │   └── index.ts
│       ├── local-recovery/            # 恢复用例和抽象存储端口
│       └── sync-protocol/             # 后续阶段的纯同步规则
├── app/
│   ├── _providers/                    # 账号与功能编排
│   └── _stores/log-note/              # 客户端社区 Store 接入层（可选）
├── infrastructure/
│   ├── browser/                       # localStorage、IndexedDB
│   └── supabase/                      # 表、RPC、行映射、RLS 边界
└── lib/                               # 迁移期间暂存，最终删除核心入口
```

`src/shared` 暂不承载 Log Note 业务模型。只有确认某个封套、校验或序列化规则被多个业务无语义复用时，才提升到 `shared`，避免把业务模型伪装成通用工具。这个选择与 [Next.js 官方目录组织建议](https://nextjs.org/docs/app/getting-started/project-structure)一致：框架允许把非路由代码放在 `app` 外，并不要求把所有代码放进一个全局目录。

## 3. 数据结构命名

### 3.1 业务 payload

```text
AccountDataPayload
├── version
├── structureSchemaVersion
├── seedVersion
├── domains[]
├── categories[]
├── templates[]
├── markdownSettings
├── entries[]
├── planBlocks[]
└── goals[]
```

这是现有 `LocalState` 的兼容形状，第一阶段不改记录字段。`structure` 不再作为新入口，拆成：

其中 `structureSchemaVersion` 是已落盘的历史字段名，为备份和云端兼容暂时保留；它不代表继续保留名为 `structure` 的代码模块。

| 名称 | 负责内容 | 明确不负责 |
|---|---|---|
| `taxonomy.ts` | `Domain`、`Category`、归属和排序 | 设置、同步 |
| `record-template.ts` | `RecordTemplate`、字段、输入模式、周期规则 | Markdown 展示 |
| `presentation-settings.ts` | `MarkdownSettings` 和导出/展示偏好 | 认证、云端状态 |
| `account-state.ts` | `AccountDataPayload` 聚合、版本和恢复输入 | 浏览器、React、Supabase |

### 3.2 本地封套

```text
LocalSnapshotEnvelope
├── envelopeVersion
├── accountScope
├── localRevision
├── savedAt
├── operationId
├── checksum
└── payload: AccountDataPayload
```

封套元数据不进入云端 `payload`。`localRevision` 只表示本地保存序号，`operationId` 只表示一次本地操作，二者都不能冒充云端 revision 或账号幂等键。旧的裸 `LocalState` 必须可读，兼容规则归入契约迁移。

### 3.3 云端对齐

| 云端结构 | 对齐内容 | 本轮处理 |
|---|---|---|
| `log_note_documents.payload` | `AccountDataPayload` | 只做字段/版本对齐 |
| `log_note_documents.revision` | 云端文档版本 | 与 `localRevision` 分离 |
| `log_note_document_revisions` | 云端快照历史 | 第四阶段 |
| `log_note_record_items` / `log_note_plan_items` | 单实体增量状态 | 第二、三阶段 |
| `log_note_sync_changes` | 云端变更流 | 第二、三阶段 |

数据库仍使用 SQL 自己的约束；通过 contract/SQL 对齐测试防止字段漂移，不能让 SQL 表行进入前端业务实体。

## 4. Store 方案

Store 是前端的内存投影层，不是第二条写入路径。第一阶段先观察当前 Provider 的重渲染和异步状态证据；如果证据达到门槛，才通过 ADR 选择社区库。

推荐首选候选是 **Redux Toolkit + React-Redux**：它提供类型化 slice、纯 reducer、selector 和可追踪 action，且有 [Next.js App Router Store 指南](https://redux.js.org/usage/nextjs) 与 [Redux Toolkit 官方概览](https://redux.js.org/redux-toolkit/overview)。代价是依赖、Provider 和客户端初始化规则，因此不能仅因 Provider 文件较长就安装。Zustand 等方案可在 ADR 中比较，但不能自研替代品。

Store 只允许承载：

- 当前账号的 `AccountDataPayload` 内存投影；
- `loading / hydrated / recovery-needed` 等可观察生命周期；
- 用户可见的本地保存状态。

Store 不承载认证 token、Supabase client、RPC 参数、附件 Blob、AI proposal、页面草稿、弹窗、日期选择或 `AbortController`。所有写入仍走 `commitData`，本地写入成功后才 dispatch 投影更新。

## 5. 迁移顺序

1. **运行时与调用账本**：锁定 Node 22 的 TypeScript 测试方式，统计旧入口、公共导出和状态写入者。
2. **纯契约迁移**：新增 `src/modules/log-note-data/contract/`，拆分类型、schema、归一化和迁移，行为保持不变。
3. **本地恢复拆分**：恢复判断进入 `local-recovery`，浏览器读写进入 `infrastructure/browser`，Provider 保留 `commitData` 编排。
4. **Store ADR（可选）**：有可复现的 Context 订阅或异步状态问题才接入社区库。
5. **云端边界迁移**：后续再拆 `sync-protocol` 与 Supabase adapter，不在第一阶段决定快照/增量主路径。
6. **删除旧入口**：所有调用方迁移、结构测试禁止旧引用、聚焦回归和 `npm run check` 通过后，删除 `src/lib` 核心文件。

兼容只针对旧数据格式，不针对旧模块永久保留。每个临时转发入口必须同时记录删除条件。

## 6. Review 需要确认的决策

1. 业务契约是否采用 `src/modules/log-note-data/contract/` 并统一改用 TypeScript？
2. 是否接受 `taxonomy / record-template / presentation-settings / account-state`，不再新增含糊的 `structure` 入口？
3. 是否接受 `modules` 表示业务归属、`app/_stores` 表示前端 Store、`infrastructure` 表示运行端适配？
4. 是否同意只使用社区 Store，并把 Redux Toolkit + React-Redux 作为首选候选，先做 ADR/证据再安装？
5. 是否同意按迁移完成条件删除 `src/lib` 核心入口，而不是永久保留兼容层？
6. 第一阶段是否先限定为单页面/单上下文的本地保存、刷新、重启和备份恢复，不纳入多标签页实时同步？

详细代码事实和边界证据见 [research/data-layer-optimization.md](./research/data-layer-optimization.md)；第一阶段行为与验收见 [research/phase1-local-data-recovery.md](./research/phase1-local-data-recovery.md)。
