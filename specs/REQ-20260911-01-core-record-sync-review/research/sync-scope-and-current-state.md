# Log Note 核心记录与同步链路 Review 方案

**项目**：O1-KR4｜Log Note MVP（黑客松）
**报告目的**：让产品负责人先确认“本地数据是什么、云端结构如何对齐、四阶段如何推进”，再决定是否进入实现计划。
**当前状态**：只读梳理完成；本报告和规格均为 Draft，不授权代码、数据库或迁移修改。

## 一、先给结论：同步要按四个阶段推进

同步不作为一次性大功能交付。建议先把本地数据做成稳定、可恢复的事实源，再逐步增加云端副本、冲突合并和双端历史。这样第一阶段即使完全不连接云端，也能独立验证“记录不丢、恢复正确、账号不串”；后续云端能力只能增加保护和回溯，不能破坏本地优先行为。

四阶段顺序如下：

1. **本地数据同步与恢复**：设备本地的状态、缓存、备份、恢复和异常保护。
2. **云端保存本地**：把本地状态保存为云端副本；云端读取不能静默覆盖当前本地。
3. **云端保存冲突合并**：多个设备产生不同版本时，保留双方并形成可检查的合并结果。
4. **合并后的双端历史**：本地可回溯、可撤销，云端可查看、可恢复，且两种历史来源清楚可区分。

本次 review 的重点不是选某个实现方案，而是先确认数据边界和阶段验收条件。

## 二、当前代码事实：本地已经有一套完整状态模型

当前本地业务状态由 `src/lib/data.mjs` 的 `createInitialState / normalizeState / restoreState` 维护。它不是单纯的记录数组，而是一个可迁移、可校验、可恢复的账号状态：

```text
LocalState
├── version: 5
├── structureSchemaVersion: 2
├── seedVersion
├── domains[]
├── categories[]
├── templates[]
├── markdownSettings
├── entries[]          ← 普通记录与周期记录
├── planBlocks[]       ← 计划
└── goals[]
```

关键数据项如下：

| 数据 | 主要字段 | 当前用途 | 第一阶段判断 |
|---|---|---|---|
| `domains` | `id / name / order` | 领域层级 | 必须纳入本地恢复 |
| `categories` | `id / domainId / name / order` | 分类层级 | 必须纳入本地恢复 |
| `templates` | `id / categoryId / recordType / inputMode / fields / schedule` | 记录结构 | 必须纳入本地恢复 |
| `markdownSettings` | 布局、标题和导出模板 | 展示与导出设置 | 必须纳入本地恢复 |
| `entries` | `id / date / time / content / categoryId / tags / templateId / fieldValues / attachments / source / createdAt` | 原始记录 | 必须保证正文和字段完整 |
| `planBlocks` | 计划时间、标题、来源、灵活性、外部引用 | 计划数据 | 先作为本地状态的一部分保留 |
| `goals` | 目标模型字段 | 目标数据 | 先作为本地状态的一部分保留 |

`normalizeState` 会做旧版本迁移、字段归一化、ID 唯一性校验和默认结构补齐；`restoreState` 还会补充每日种子数据。第一阶段不应重新定义一套“同步专用记录格式”，否则会产生第二个事实源。

## 三、本地持久化现状：账号隔离已经存在，但恢复契约需要单独确认

`LogNoteDataProvider` 根据认证账号选择本地 key：

```text
未登录：       log-note:data:v1
已登录账号：   log-note:data:user:<userId>:v1
同步元数据：   log-note:sync:user:<userId>:v1
记录流状态：   log-note:sync-stream:user:<userId>:record:v1
计划流状态：   log-note:sync-stream:user:<userId>:plan:v1
```

写入主路径是：

```text
用户动作
  → commitData(updater)
  → persistStoredState(localStorage, account-scoped key)
  → 更新 React 数据状态
  → 后续才触发云端相关流程
```

设置页备份导入当前还通过 `replaceData` 直接整包写入；它不是普通编辑命令，但属于第二个本地状态写入者，第一阶段必须把它收敛到同一个受控持久化边界。

本地存储层 `src/lib/storage-state.mjs` 已区分三种情况：

- 没有 key：视为新账号，可以写入初始状态；
- 有效 JSON：恢复并归一化后继续使用；
- 读取或解析失败：进入 `recovery-needed`，禁止自动覆盖损坏内容。

因此第一阶段需要确认的是恢复产品行为，而不是先增加云端逻辑：损坏缓存是否允许用户导出原始内容、是否提供“恢复到最近版本”、导入备份失败时是否保持当前状态、应用异常退出后以哪一个保存点为准。

## 四、云端现状：存在两种结构，需要提前对齐而不是马上合并

当前云端有两套并行结构，它们的职责不同。

### 1. 完整文档快照

`log_note_documents` 保存每个账号的一份完整文字状态：

```text
log_note_documents
├── user_id                       ← 账号主键
├── payload: jsonb                ← LocalState 的文字版
├── data_version
├── structure_schema_version
├── revision                      ← 文档版本
├── device_id
├── last_operation_id             ← 幂等写入标识
└── updated_at
```

`log_note_document_revisions` 保存历史快照，目前数据库函数会保留最近 30 个 revision。快照边界会移除 `entries[].attachments` 中的图片引用，图片 Blob 不进入云端文字文档。

### 2. 记录/计划增量流

`log_note_record_items`、`log_note_plan_items` 保存按实体拆分的当前值；`log_note_sync_changes` 保存变更日志：

```text
log_note_record_items / log_note_plan_items
├── user_id
├── entity_id
├── payload: jsonb | null
├── item_version
├── last_server_seq
├── deleted_at
└── updated_at

log_note_sync_changes
├── server_seq                      ← 全局递增游标
├── user_id
├── entity_type: record | plan
├── entity_id
├── operation: upsert | delete
├── payload: jsonb | null
├── item_version
├── operation_id
├── device_id
└── created_at
```

客户端 `src/lib/incremental-sync.mjs` 已具备三方合并基础：`base / local / remote`、字段级比较、删除墓碑、outbox、cursor、item version 和冲突集合。当前架构注释说明：增量表只拥有记录与计划文字，旧的完整文档仍兼容结构和设置。

**需要产品负责人确认的事实判断**：第二阶段的云端副本，是继续以完整文档快照作为唯一对齐对象，还是把记录/计划增量流作为未来主路径、完整文档只承担结构和兼容职责。这个选择会影响后续历史、恢复和迁移成本，因此在第三阶段前必须定下来。

## 五、四阶段的报告式验收方案

### 阶段一：本地数据同步与恢复

**目标**是证明本地状态自身可靠。验收只依赖浏览器本地环境，不调用云端。需要覆盖保存、刷新、重启、异常中断、缓存损坏、备份导入/导出、账号切换和附件引用。阶段完成标准是：用户明确保存后的记录在这些场景下都能恢复，损坏输入不能覆盖当前可用状态；普通编辑与备份恢复不能存在未审计的平行持久化路径。

本阶段的关键决策是“本地历史是否现在就建立”。如果第四阶段要求本地可回溯，第一阶段至少需要保留可扩展的本地版本边界；但是否马上展示历史 UI，可以留到第四阶段。

### 阶段二：云端保存本地

**目标**是把本地状态保存成可恢复副本，不改变本地事实源。验收重点是：本地保存先成功；云端上传失败可重试；首次云端读取失败与云端为空严格区分；旧云端版本不得静默覆盖本地；用户能看到本地保存和云端保存两个状态。

这一阶段不解决多设备自动合并，也不允许为了“云端看起来最新”而牺牲本地当前工作。

### 阶段三：云端保存冲突合并

**目标**是保护并发修改。验收重点是：版本不匹配时拒绝覆盖；冲突双方内容可查看；合并结果绑定双方版本；远端在确认期间再次变化时，旧决策失效；删除与编辑冲突也保留证据。自动合并只适用于可证明安全的字段，无法证明时必须停下来让用户选择。

### 阶段四：合并后的本地与云端回溯

**目标**是让“覆盖”变成可逆操作。本地历史需要支持查看、撤销和恢复；云端历史需要支持按版本查看和恢复。两者必须标明来源、版本、时间和恢复结果，不能把本地草稿、已上传快照、冲突版本混成一条不可解释的时间线。

需要单独确认历史保留策略：本地保留数量、云端保留数量、是否允许删除历史、恢复历史是否生成新版本，以及附件在历史恢复时如何处理。

## 六、当前代码 review 的重点与风险

当前最需要 review 的不是新增功能，而是两条同步路径的权威关系：`LogNoteDataProvider` 同时编排 legacy 完整文档同步和 record/plan 增量 stream。增量路径成功后还会尽力刷新 legacy revision；这说明系统目前处于过渡状态，不能把“测试通过”直接解释成两套结构已经完成一致性收敛。

第二个风险是第一阶段的本地恢复契约还没有被单独定义。现在已经有 `recovery-needed` 和禁止覆盖逻辑，但用户可见的恢复选择、历史保存点和损坏数据处理方式需要产品确认后才能作为核心链路标准。

第三个风险是云端历史已经存在“最近 30 个完整 revision”的数据库行为，但这不等于第四阶段的产品历史契约。保留数量、恢复动作和本地附件关联都仍属于待决策项。

## 七、请你先 review 的决策点

为了控制阅读和讨论成本，建议本总览只确认以下 5 个高层问题；TypeScript 契约、Store、旧 `src/lib` 删除和 `replaceData` 收敛的细分决策见 [data-layer-optimization-report.md](../data-layer-optimization-report.md)。

1. **阶段一是否包含同一浏览器的多标签页同步？** 如果包含，需要把它列为本地同步；如果不包含，阶段一先限定为单页面、刷新/重启和备份恢复。
2. **本地历史从阶段一开始保存，还是阶段四才建立？** 我的建议是阶段一先保留可扩展版本边界，阶段四再开放历史 UI。
3. **`planBlocks` 与 `goals` 是否和记录一起纳入本地恢复？** 当前代码的事实源是完整 `LocalState`，建议先整体恢复，避免局部恢复造成结构不一致。
4. **云端结构的对齐方向是什么？** 选择“完整文档为主、增量流逐步迁移”，或选择“记录/计划增量流为主、完整文档保留结构兼容”。
5. **第四阶段的历史是否允许用户删除？** 删除历史会影响恢复能力，建议先只允许查看和恢复，不开放删除。

## 八、下一步建议

本包已先为阶段一补充 Spec Kit 的 `plan.md`、`data-model.md`、本地契约和 quickstart；你确认决策点后再生成 `tasks.md`，不会自动进入云端实现。以后任何涉及 `commitData`、`replaceData`、本地存储 key、恢复逻辑、云端 payload、revision/CAS、增量 outbox 或历史版本的修改，先提交讨论材料，得到你的确认后再进入实现。
