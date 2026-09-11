# 核心数据结构与分层优化评审稿

**Requirement**：`REQ-20260911-01`
**Legacy Board Item**：`LN-013`（本地数据保护，作为第一阶段的结构治理映射）
**阶段**：步骤一已实现；本报告只记录已验证的结构迁移，不代表后续本地保存、云端冲突或历史方案已完成

> 本报告是第一阶段的结构实现记录和后续决策清单。项目级分层、社区 Store、单一持久化写入、
> 旧入口迁移和核心链路讨论门禁以 `.specify/memory/constitution.md` 及 Spec Kit overrides 为
> 唯一规范来源；本报告不重复建立一套全局规则。

## 结论先行

这次不把所有数据继续平铺到 `src/lib`，也不建立一个自研的前端 Store。当前项目不提前引入
`packages` 或 monorepo；可复用目标是目录职责、依赖方向和迁移方法。推荐的目标是：

- 用 `src/shared/contracts/` 保存当前项目内前后端可读取的纯 TypeScript 契约；只有出现真实的第二个消费者时，才考虑提取为 package。
- 用 `src/domain/account-data/` 表达数据模型、迁移和业务不变量。
- 用 `src/application/account-data/` 表达保存、加载和恢复用例，不直接依赖浏览器或 Supabase。
- 用 `src/infrastructure/local/` 和 `src/infrastructure/cloud-sync/` 分别承载运行端适配；第一阶段只整理边界，不启用云端链路。
- Store 仍是可选的前端组合层；只有 ADR 和测量证据通过后，才接入 Redux Toolkit + React-Redux 等社区库。
- 把 `src/lib` 的核心入口作为迁移对象，所有调用方迁移、回归通过后删除，不做永久兼容层。

第一阶段步骤一已完成结构整理：本地读写和云端适配都有清晰入口，云端运行语义未改变；云端现有结构只用于字段与版本对齐。
本地封套、历史、多标签页和冲突处理仍不在本轮实现。

## 1. 为什么要拆层

现在的 `src/lib/data.mjs` 既是业务模型，又处理默认数据、旧版本迁移、归一化、导入导出和 Markdown；`account-sync.mjs` 又把账号 key、同步元数据、增量流、指纹、附件和云文档 reconcile 放在一起。Provider 还同时处理 React 状态、本地读写、云端调用和冲突状态。

这样的结构有两个直接风险：

1. 本地恢复和云端同步会共享隐式状态，无法证明“本地已保存”是否独立成立。
2. 前后端共用时容易把 `window`、React、Supabase SDK 或 RPC 参数带进所谓的共享模型。

拆层的目的不是增加目录，而是让每个状态只有一个所有者，调用链可以独立测试和替换。

## 2. 目标目录

```text
src/
├── shared/
│   └── contracts/                     # 当前项目内前后端共用的纯 TypeScript 契约
├── domain/
│   └── account-data/                  # 数据模型、默认数据、迁移、归一化
├── application/
│   └── account-data/                 # 保存、加载、恢复用例和端口
├── infrastructure/
│   ├── local/                         # localStorage、IndexedDB 适配
│   └── cloud-sync/                    # Supabase/云端同步适配
├── app/
│   └── _providers/                    # 账号与功能编排
├── features/                          # 页面功能
└── lib/                               # 迁移期间暂存，最终删除核心入口
```

`src/shared/contracts` 只承载当前项目内确实需要被前后端共同读取的契约，不承载 React、浏览器 API、Supabase SDK 或页面状态。这里的“可复用”首先指结构和边界可被其他项目参考；只有出现真实的第二个消费者时，才把稳定契约提取为独立 package。这个选择与 [Next.js 官方目录组织建议](https://nextjs.org/docs/app/getting-started/project-structure)一致：框架允许把非路由代码放在 `app` 外，并不要求把所有代码放进一个全局目录。

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

1. **现状与基础整理（已完成）**：统计旧入口、公共导出、状态写入者和外部依赖，并将核心调用方迁移到明确层级；共享契约已转换为 TypeScript，行为保持不变。
2. **数据流和流程图**：基于迁移后的真实代码，绘制启动恢复、普通保存、备份恢复和异常恢复流程。
3. **本地保存优化**：在流程图和职责边界经 review 后，再决定封套、校验、历史和恢复策略。
4. **Store ADR（可选）**：有可复现的 Context 订阅或异步状态问题才接入社区库。
5. **云端边界迁移**：后续再整理云端同步协议与 Supabase adapter，不在第一阶段改变云端运行链路。
6. **删除旧入口（部分完成）**：已删除 App 内的 `cloud-document-client.js`；其余 MJS 兼容源因 Node-only 调用方和当前运行器无法直接加载 TS 暂留，删除条件见本报告第 7 节。

## 7. 已验证的迁移结果

- App 页面、Provider 和设置工作面已改用 `domain/account-data`、`application/account-data`、
  `infrastructure/local` 和 `infrastructure/cloud-sync` 窄入口。
- `AccountDataPayload` 已从泛化记录提升为可读的实体契约，包含 Domain、Category、Template、
  AccountEntry、PlanBlock、Goal、MarkdownSettings、CloudDocument、SyncChange 和 SyncMutation。
- `commitData` 与 `replaceData` 仍通过 `persistLocal → saveLocalAccountData → browserStorage.save`；
  本地写入先于云端同步，未增加持久化写入者。
- 结构回归禁止 `src/app` 新增旧核心入口引用，并检查 shared/domain/application/infrastructure 的依赖方向。
- 旧 MJS 兼容源的删除条件：Node 测试/Agent Bridge 可直接加载编译后的 TS 或统一运行时入口，
  对应调用方全部迁移，聚焦回归和完整质量门禁通过。

本轮未实现：LocalSnapshotEnvelope、checksum、有限历史、多标签页策略、云端覆盖、冲突合并、云端历史和 Store。

兼容只针对旧数据格式，不针对旧模块永久保留。每个临时转发入口必须同时记录删除条件。

## 6. Review 需要确认的决策

1. 业务契约是否采用 `src/shared/contracts/` 并统一改用 TypeScript？（已确认）
2. 是否接受 `taxonomy / record-template / presentation-settings / account-state`，不再新增含糊的 `structure` 入口？（已确认）
3. 是否接受 `domain` 表示业务模型、`application` 表示用例、`infrastructure` 表示运行端适配，Store 仅作为可选的前端组合层？（已确认）
4. 是否同意只使用社区 Store，并把 Redux Toolkit + React-Redux 作为首选候选，先做 ADR/证据再安装？
5. 是否同意按迁移完成条件删除 `src/lib` 核心入口，而不是永久保留兼容层？
6. 第一阶段是否先限定为单页面/单上下文的本地保存、刷新、重启和备份恢复，不纳入多标签页实时同步？

详细代码事实和边界证据见 [research/data-layer-optimization.md](./research/data-layer-optimization.md)；第一阶段行为与验收见 [research/phase1-local-data-recovery.md](./research/phase1-local-data-recovery.md)。
