# Log Note 第一阶段报告与优化方案：本地数据同步和恢复

**项目**：O1-KR4｜Log Note MVP（黑客松）
**阶段**：第一阶段，仅本地，不涉及云端读写
**报告目的**：请产品负责人 review 当前本地链路、数据结构和优化方向，并作为 Spec Kit plan 的 Phase 0 输入。
**报告状态**：Draft；本报告不授权业务代码、数据库或云端迁移修改。

## 一、结论先行

第一阶段不应该重新设计记录模型，而应该先把现有 `LocalState` 固定为本地唯一事实源，补齐“保存点、恢复点、损坏保护和验证证据”。当前代码已经具备账号隔离、统一 `commitData`、状态归一化和损坏缓存保护，但本地数据仍以单份 JSON 为主，缺少明确的本地版本边界、可回退保存点和跨上下文同步契约。优化应先围绕这条现有主路径做增强，避免提前引入云端合并逻辑。

推荐第一阶段的目标是：用户每次明确保存后，本地数据都能在刷新、重启、异常退出和恢复操作后回到一个可解释的有效版本；本地损坏或恢复失败时，系统保留证据、不覆盖当前数据；账号切换不串数据；后续云端可以直接复用同一份状态 payload。

## 二、当前本地代码与调用链

当前链路由四个既有模块组成：`src/lib/data.mjs` 负责状态模型、归一化和迁移；`src/lib/storage-state.mjs` 负责读取与写入保护；`src/app/_providers/log-note-data-provider.js` 负责账号作用域、React 状态和 `commitData` 编排；`src/lib/attachment-store.mjs` 负责账号隔离的附件 Blob。它们是迁移基线，不是目标目录。设置页备份导入还通过 Provider 暴露的 `replaceData` 直接替换整份状态，这个第二写入者需要在第一阶段收敛。调用链如下：

```text
页面/编辑器动作
  → LogNoteDataProvider.commitData(updater)
  → persistLocal(nextData)
  → persistStoredState(window.localStorage, scopedKey, nextData)
  → dataRef / React data 更新
  → 页面继续工作
```

初始化链路如下：

```text
Auth identity
  → 选择 localStorage key
  → loadStoredState
  → JSON.parse + restoreState
  → hydrated
  → 页面读取 LocalState
```

当前 key 规则已经按账号隔离：

| 场景 | 当前 key | 说明 |
|---|---|---|
| 未登录 | `log-note:data:v1` | 兼容旧的匿名本地数据 |
| 已登录 | `log-note:data:user:<userId>:v1` | 每个账号独立数据 |
| 附件 | 账号作用域 IndexedDB | 不进入文字 JSON |

当前恢复保护也已经存在：空 key 允许创建初始状态；有效 JSON 经过 `restoreState` 后使用；读取、解析或归一化失败则进入 `recovery-needed`，暂时禁止编辑和自动覆盖，并可下载原始 payload 或导入已知备份。

## 三、本地数据结构：第一阶段应固定什么

第一阶段的 canonical payload 继续使用现有 `LocalState`，在 TypeScript 契约中命名为 `AccountDataPayload`，不另建 `SyncState` 或“本地记录副本”。结构如下：

```text
AccountDataPayload（当前序列化形状仍兼容 LocalState）
├── version: number
├── structureSchemaVersion: number
├── seedVersion: number
├── domains[]
├── categories[]
├── templates[]
├── markdownSettings
├── entries[]
├── planBlocks[]
└── goals[]
```

`entries[]` 是核心记录实体，当前归一化字段为：

```text
Entry
├── id
├── date / time
├── content                  ← 原始正文，不能被恢复流程改写
├── categoryId / templateId
├── tags[]
├── fieldValues{}
├── attachments[]            ← 仅本地附件引用
├── source / sourceLine
└── createdAt
```

未来云端已经按文字 payload 保存，因此第一阶段应遵守一个对齐原则：**本地 payload 的业务字段与云端 `payload` 保持同形；本地版本、保存时间、校验和、恢复原因等元数据放在 payload 外部。** 这样云端第二阶段可以保存 `AccountDataPayload`，不会因为第一阶段加了本地恢复信息而改变业务数据结构。

建议未来可扩展的本地保存封套如下，当前只作为设计约束，不立即实现：

```text
LocalSnapshotEnvelope
├── envelopeVersion
├── accountScope             ← 与 storage key 一致，不作为业务字段
├── localRevision            ← 本地保存序号
├── savedAt
├── operationId              ← 一次本地提交的幂等标识
├── payload                  ← 完整、可被 contract.restoreState 读取的 AccountDataPayload
└── checksum                 ← 校验 payload 是否被破坏
```

这里的 `localRevision` 只表示本地保存序号，不能冒充云端 revision；`operationId` 只用于本地恢复/重试的识别，不能直接当作账号幂等键。若最终采用封套，需要兼容读取当前直接存储的旧 `LocalState`，不能要求用户迁移后才能打开应用。旧数据兼容放在 TypeScript 契约的显式迁移规则中，不靠永久保留 `src/lib` 入口。

## 四、当前实现的优点与缺口

当前普通记录编辑已经收敛到 `commitData`；账号 key 不同，避免账号切换直接复用数据；`normalizeState / restoreState` 统一处理版本迁移和字段校验；本地读取失败时禁止用临时默认状态覆盖原始内容。备份导入/恢复仍有 `replaceData` 这一条整包替换路径，必须审计并与同一个本地持久化边界收敛。这些能力应保留，不应通过新 store 或新写入入口替换。

当前缺口集中在“本地可靠性证据”而不是记录模型：

1. 当前主数据是单份 localStorage JSON，保存成功后没有可供用户选择的本地历史保存点。
2. `recovery-needed` 能阻止覆盖，但恢复决策、恢复前快照和恢复后的验证结果还没有形成明确的数据契约。
3. `persistStoredState` 使用单次 `setItem`，对浏览器配额、写入失败和进程中断有错误返回，但没有独立的写前备份或校验版本。
4. 当前代码没有形成同一账号多标签页/多窗口的本地同步产品契约；是否支持需要产品先定范围。
5. 现有 `storageErrorCount` 可以触发提示，但缺少“哪一次本地保存失败、当前数据是否仍是上一个有效保存点”的用户可见语义。
6. 云端历史已有自己的 revision 结构，本地若直接复用云端 revision，会把两个版本域混为一谈。

## 五、优化方案：只增强本地主路径

### 方案原则

优化只围绕现有 `commitData → persistLocal → loadStoredState` 做增强。新能力必须先替换或补强当前保护点，不能创建第二个业务写入口；本地历史和云端历史使用不同版本命名空间；附件继续由本地附件存储负责；第一阶段不读取、不写入、不依赖云端。客户端状态库若有必要，只能采用社区库，并且不负责持久化。

### 建议的最小优化包

**第一步：固定本地保存契约。** 明确一次本地保存的结果至少包括 `saved / blocked / failed` 三类，并规定 `saved` 后才更新内存状态；写入失败时保留上一个有效状态和错误证据。这里不改变页面的记录动作，只让保存结果可验证。

**第二步：增加本地保存序号和校验元数据。** 在不改变 `AccountDataPayload` payload 的前提下，引入可向后兼容的 `LocalSnapshotEnvelope`。每次 `commitData` 生成新的本地序号和操作标识；读取时先验证封套和 payload，再交给契约中的 `restoreState`。旧的裸 `LocalState` 首次读取后可以被兼容识别，是否立即升级写回需要另行确认。

**第三步：增加恢复前保护点。** 在替换本地数据前，先保留当前有效快照或原始损坏 payload；恢复失败时回到原状态。导入备份必须先完整解析、归一化、校验 ID 和结构，再一次性替换；失败不能清空当前数据。

**第四步：定义本地历史的最小边界。** 即使第四阶段才开放历史 UI，第一阶段也应决定是否保存最近若干个本地快照，以及恢复是否生成新的本地版本。我的建议是：第一阶段先保存有限数量的本地快照，暂不做复杂历史页面；恢复动作生成新版本，旧版本只读保留，避免“恢复”本身再次覆盖证据。

**第五步：补齐聚焦回归。** 测试必须围绕真实链路验证：创建/编辑/删除、刷新/重启、写入失败、缓存损坏、备份导入失败、成功恢复、账号切换、附件引用保留，以及（若纳入范围）多标签页事件顺序。第一阶段不以云端测试代替本地证据。Store 试点另测 action 顺序和订阅范围，不改变保存路径。

## 六、第一阶段建议的状态机

```text
未初始化
  → 读取中
  → 新数据 / 已恢复 / 恢复保护

已恢复
  → 本地已保存
  → 本地保存失败（保留上次有效版本）
  → 恢复处理中
  → 恢复成功（生成新本地版本）
  → 恢复失败（回到原版本并保留证据）
```

用户界面至少要让用户区分：当前数据可用、当前数据正在恢复、最近一次本地保存失败、当前处于恢复保护。`local-only` 是未来云端状态，不应在第一阶段被当成本地保存失败。

## 七、第一阶段验收标准

- 用户保存记录后，刷新和重启均能读回最近一次有效本地状态。
- 模拟 localStorage 写入失败时，当前内存数据不冒充已保存，且上一次有效保存点不被破坏。
- 模拟 JSON 损坏、结构缺失、重复 ID 和非法字段时，应用进入恢复保护，不自动写入临时默认数据。
- 导入损坏或不兼容备份时，当前数据保持不变；导入有效备份后一次性恢复并可读回。
- 账号 A、账号 B 和匿名 scope 的本地 key、附件 owner 和恢复记录互不复用。
- 本地 payload 的业务字段与未来云端 `payload` 同形；本地封套元数据不进入业务 payload。
- 普通业务写入仍只有 `commitData`；备份导入/恢复的 `replaceData` 已完成审计并与同一受控持久化边界收敛，不保留未审计的平行写入者。
- 相关回归测试通过，`npm run check` 通过；若增加交互，补充 `npm run design:check` 和移动端验证。

## 八、需要你先决定的事项

本阶段不需要你现在决定云端主路径，但有四个本地决策会影响后续对齐：

1. **本地同步范围**：第一阶段是否包括同一浏览器多标签页/多窗口之间的实时同步？如果不包括，先限定为单页面的保存、刷新、重启和备份恢复。
2. **本地历史时点**：是否同意第一阶段先保存有限快照，但把历史 UI 放到第四阶段？
3. **本地保存封套**：是否接受“业务 payload 保持现状，版本/校验元数据放在外封套”的方向？
4. **整体恢复边界**：是否确认 `domains / categories / templates / markdownSettings / entries / planBlocks / goals` 必须作为一个整体恢复，不支持只恢复某一类数据？

## 九、下一步

本报告已作为第一阶段 Spec Kit 规格和 plan 的输入；当前仍处于 review。你确认上述本地决策以及数据结构/分层研究中的目录决策后，才生成 `tasks.md` 并讨论代码变更。任何触及 `commitData`、`loadStoredState`、`persistStoredState`、账号 key、附件 owner、契约、Store 或本地历史的后续修改，都会先提交讨论材料，得到确认后再实现。
