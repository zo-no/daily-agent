# 核心数据结构与分层优化研究

**项目**：O1-KR4｜Log Note MVP（黑客松）
**本轮范围**：第一阶段的本地数据契约和恢复边界；云端只做结构对齐
**状态**：Draft，供产品负责人 review；不授权业务代码、依赖或数据库修改

## 结论先行

当前 `src/lib` 的问题不是目录名称本身，而是同一批文件同时承载业务模型、旧数据迁移、本地存储、云端协议和 Provider 编排。继续往里面添加同步逻辑会让“本地保存成功”“云端保存成功”“冲突已解决”变成难以区分的状态。

建议采用四个边界：

1. **共享契约**归 `src/shared/contracts/`，使用纯 TypeScript，供当前项目内前后端读取；只有出现真实的第二个消费者时，才考虑提取为 package。
2. **领域模型**归 `src/domain/account-data/`，负责数据结构、迁移、归一化和业务不变量，不接触运行端。
3. **应用用例**归 `src/application/account-data/`，负责加载、保存和恢复，通过端口使用运行端适配器。
4. **运行端实现**分别放在 `src/infrastructure/local/`、`src/infrastructure/cloud-sync/` 和 `src/app/`；它们不能反向把平台细节放进契约或领域模型。客户端 Store 如果有证据需要，只能作为前端组合层接入社区库，不是新的持久化层。

`src/lib` 的旧核心入口不作为永久兼容层。迁移期间可以短暂保留兼容转发，但结构测试要禁止新增引用；所有调用方迁移并通过回归后删除旧文件。旧数据格式的兼容仍需保留，但应落在契约内的显式迁移规则中，不能以旧模块继续存活代替数据兼容。

## 1. 当前代码事实

当前主要责任和调用关系如下：

| 现有位置 | 当前责任 | 目标处理 |
|---|---|---|
| [`src/lib/data.mjs`](/Users/kual/Desktop/log-note/src/lib/data.mjs:1) | `LocalState`、默认数据、版本迁移、归一化、导入导出和 Markdown | 拆为业务契约与独立导出适配；完成迁移后删除旧入口 |
| [`src/lib/storage-state.mjs`](/Users/kual/Desktop/log-note/src/lib/storage-state.mjs:1) | localStorage 读写、解析失败和恢复保护 | 浏览器适配与恢复用例分开 |
| [`src/lib/account-sync.mjs`](/Users/kual/Desktop/log-note/src/lib/account-sync.mjs:1) | 账号 key、同步元数据、增量状态、指纹、附件合并和 reconcile | 拆为账号本地标识、同步协议和 Supabase 适配 |
| [`src/lib/cloud-document.mjs`](/Users/kual/Desktop/log-note/src/lib/cloud-document.mjs:1) | 云文档 payload、错误和归一化 | 保留纯转换，移出 `lib` |
| [`src/lib/incremental-sync.mjs`](/Users/kual/Desktop/log-note/src/lib/incremental-sync.mjs:1) | record/plan mutation、差异、合并和冲突规则 | 后续进入 `sync-protocol`，不进入第一阶段实现 |
| [`src/app/_providers/log-note-data-provider.js`](/Users/kual/Desktop/log-note/src/app/_providers/log-note-data-provider.js:1) | 账号生命周期、内存数据、`commitData`、恢复和同步编排 | 继续作为编排层，逐步移除 JSON、RPC 和协议细节 |

当前还存在公开的 `replaceData`（设置页备份导入/恢复调用）。它不是普通记录编辑入口，但确实会直接持久化整份状态；第一阶段必须决定把它收敛为受控恢复命令，还是让 `commitData` 支持显式的整包替换语义。不能把它遗漏后宣称只有一个写入者。

普通记录编辑的 canonical path 仍然是：

```text
页面动作
  → LogNoteDataProvider.commitData
  → 本地恢复用例
  → 浏览器存储适配器
  → 写成功后更新内存投影
```

备份导入/恢复是另一种用户意图，当前走 `replaceData`；它必须在实现计划中与 `commitData` 收敛，最终由同一个受控本地持久化边界完成写入。

初始化是：

```text
账号 identity
  → 账号作用域 key
  → 浏览器存储读取
  → 封套/旧裸 payload 校验
  → contract.restoreState
  → Provider 或客户端 Store hydrated
```

云端不参加第一阶段的成功条件。

## 2. 业务契约与运行时边界

### 2.1 业务契约只表达用户数据

建议的纯 TypeScript 入口：

```text
src/shared/contracts/
├── account-data.ts           # AccountDataPayload 聚合与共享实体类型
└── index.ts                  # 唯一窄公共入口

src/domain/account-data/
├── defaults.ts               # 默认结构和模板
├── seed.ts                   # 日常种子数据
├── normalize.ts              # 领域归一化和校验
├── migrate.ts                # 旧版本数据迁移
└── index.ts                  # 领域层窄入口
```

`account-state.ts` 的聚合结构保持当前业务形状：

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

`structure` 不再作为新公共名称。它表达的内容被拆成 `taxonomy`、`record-template` 和 `presentation-settings`；账号认证、同步状态、设备信息和 UI 状态不进入这些文件。

契约允许依赖基础类型、Zod 等纯校验库和纯函数，但禁止依赖 `window`、React、Next.js、Supabase SDK、网络、Mastra、密钥、localStorage、IndexedDB 和 Provider。

### 2.2 本地保存封套只表达本地可靠性

封套属于本地恢复用例，而不是业务 payload：

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

`localRevision` 是本地保存序号，不能冒充云端 revision；`operationId` 只识别一次本地保存操作；`checksum` 只用于发现损坏。现有裸 `LocalState` 必须可读，是否首次读取后升级为封套由第一阶段 review 决定。

### 2.3 云端结构只做对齐，不倒灌本地

现有云端结构可以按下面方式对齐：

| 云端结构 | 承载内容 | 第一阶段关系 |
|---|---|---|
| `log_note_documents.payload` | 完整 `AccountDataPayload` | 只验证字段同形，不读写 |
| `log_note_documents.revision` | 云端文档版本 | 不写入本地封套 |
| `log_note_document_revisions` | 云端快照历史 | 后续历史阶段 |
| `log_note_record_items` / `log_note_plan_items` | 单实体增量状态 | 后续同步阶段 |
| `log_note_sync_changes` | 服务端变更流 | 后续同步阶段 |

Supabase SQL 不能直接 import TypeScript，因此数据库约束仍是 SQL；以契约/SQL 对齐测试检查字段、版本和 nullable 边界，不把 SQL 表行映射塞进业务实体。

## 3. 客户端 Store 的边界

Store 不是本项目自研的一套状态库，而是对社区库的客户端接入层。当前推荐候选是 **Redux Toolkit + React-Redux**：Redux 官方的 Next.js App Router 指南要求按请求创建 Store、只让客户端组件与 Store 交互，并建议只将全局共享的可变状态放入 Redux；Redux Toolkit 是官方推荐工具集。

这不是第一阶段默认必须安装的依赖。先记录 Provider 的订阅范围、无关重渲染和异步状态跳转；只有证据表明 Context 已成为核心链路的可复现问题，并且 ADR 通过，才引入社区库。Zustand 等其他社区库可以在 ADR 中比较，但不能通过自研 Store 规避依赖决策。

Store 的具体目录待 ADR 决定，不能在第一阶段预先建立 `_stores` 约定。Store 不得保存认证 token、Supabase client、数据库行、RPC 参数、附件 Blob、AI proposal、页面草稿、弹窗、选中日期或 `AbortController`。所有业务写入仍由 `commitData` 发起，持久化成功后再把结果投影到 Store。

## 4. 目标依赖图

```text
页面 / 编辑器
        ↓
LogNoteDataProvider（账号与编排）
        ↓
application/account-data ───────── infrastructure/local
        ↓                                  ↓
domain/account-data + shared/contracts  localStorage / IndexedDB

未来云端路径：
application/account-data ───────── infrastructure/cloud-sync ───── Supabase SQL/RLS
```

依赖方向必须保持：

- `shared/contracts` 不依赖任何运行端。
- `domain/account-data` 只依赖 `shared/contracts` 和纯函数/校验库。
- `application/account-data` 依赖领域层和抽象端口，不依赖浏览器 API 或 Supabase SDK。
- `infrastructure/local` 实现本地端口，不定义业务字段。
- `infrastructure/cloud-sync` 负责云端表、RPC、RLS 约束和行映射，不被契约反向依赖。
- `app/_providers` 负责装配和唯一写入口，不定义 Entry 字段或 SQL 参数。
- Store 只投影客户端状态，不成为新的业务写入者。

## 5. 迁移顺序与删除条件

### M0：锁定运行时与依赖账本

项目要求 Node `>=22.13.0`，当前 shell 曾报告 Node 18；在迁移 TypeScript 前必须明确 Node 22 的测试执行方式，不能把 `.mjs` 直接改名为 `.ts` 后依赖 Node 18 运行。先统计旧入口调用方、公共导出、状态写入者和测试覆盖，不改业务行为。

### M1：建立纯 TypeScript 契约

从 `data.mjs` 识别并迁移业务模型、版本常量、归一化和纯校验；新增 `src/shared/contracts/` 和 `src/domain/account-data/` 的窄入口。测试锁定旧备份、旧版本迁移、字段归一化和云端 payload 形状。旧入口只允许短期转发，不再接受新调用方。

### M2：拆出本地恢复用例

把“空 key、有效 payload、封套、损坏、恢复保护、导入替换”放入 `application/account-data`；把 localStorage/IndexedDB 访问放入 `infrastructure/local`。Provider 仍拥有 `commitData`，但不再直接解析 JSON 或分类存储异常。

### M3：Store ADR 与有限试点（可选）

只有当订阅/异步证据达到 ADR 门槛，才使用 Redux Toolkit 或 ADR 选定的社区库，先迁移 lifecycle 和 data 投影；页面草稿、AI 状态和局部筛选不迁移。若门槛不满足，保持 Provider + hooks，不为了目录整齐新增 Store。

### M4：云端边界迁移（后续阶段）

把 `cloud-document`、`incremental-sync` 和 Supabase client 分别迁入同步协议与基础设施；不在第一阶段决定完整快照与增量流谁是唯一主路径，也不实现冲突合并。

### M5：删除旧 `src/lib` 核心入口

满足以下条件才删除：所有生产调用方和测试已迁移；结构测试禁止旧路径引用；本地恢复、备份、附件引用和云端 payload 回归通过；无未使用公共导出；`npm run check` 通过。未满足时只能记录阻塞原因，不能把兼容入口升级为永久层。

## 6. 变更契约与指标

| 项目 | 本轮方案 |
|---|---|
| Canonical path | 普通编辑：`commitData → application/account-data → infrastructure/local`；恢复命令需与其收敛 |
| 复用 | 现有 `commitData`、`normalizeState/restoreState`、账号 key、附件 owner 和备份格式 |
| 替换/删除 | `data.mjs` 等旧核心入口逐步替换；审计并收敛 `replaceData`；完成迁移后删除，不保留未审计的第二条写路径 |
| 新增 | 纯 TS contract、本地恢复端口/结果类型、必要的结构测试；Store 依 ADR 决定 |
| 不变量 | 本地先写、账号隔离、原始正文不改、附件不进云端、备份兼容、无云端覆盖本地 |
| 验证 | 类型检查、Node 聚焦回归、恢复/E2E、`npm run check`；Store 试点另加订阅和生命周期证据 |

目标指标是：平行行为路径 `0`；状态写入者不增加；公共 API 默认不增加；范围内被替换的旧逻辑删除率 `100%`；相关回归 `100%` 通过。

## 7. 本轮 review 决策

请先确认以下事项，确认后才能从 `plan.md` 进入 `tasks.md`：

1. 是否采用 `src/shared/contracts/` 作为当前项目内共享业务契约唯一归属，并统一使用 TypeScript？（已确认）
2. 是否接受 `taxonomy / record-template / presentation-settings / account-state`，不再新增 `structure` 公共入口？
3. 是否接受 `domain` 表示业务模型、`application` 表示用例、`src/infrastructure` 表示运行端适配，Store 仅作为后续可选前端组合层？（已确认）
4. 是否同意 Store 只使用社区库，并以 Redux Toolkit + React-Redux 作为首选候选，先做 ADR 和证据再安装？
5. 是否同意 `src/lib` 核心入口按 M5 删除，而不是永久保留兼容层？
6. 第一阶段是否先限定为单页面/单上下文的本地保存、刷新、重启和备份恢复，不纳入多标签页实时同步？
7. 是否同意把当前 `replaceData` 定义为受控恢复命令，并与 `commitData` 共享唯一持久化边界？
