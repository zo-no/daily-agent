# 本地数据保存与恢复契约

**Requirement**: `REQ-20260911-01`
**阶段**：Phase 1，仅浏览器本地
**状态**：提案，未进入实现

## 1. 责任边界

```text
页面/编辑器
  → Provider.commitData（普通编辑）
  → application/account-data command
  → infrastructure/local adapter
```

备份导入/恢复当前由 `replaceData` 触发。它必须被改造成受控恢复命令，并与普通编辑共享同一个持久化边界；在此之前不能把“所有写入只有 `commitData`”当成已实现事实。

- `shared/contracts`：前后端共用的 payload 类型和版本契约。
- `domain/account-data`：校验、归一化、旧数据迁移和领域不变量。
- `application/account-data`：恢复用例、保存结果和原子替换决策。
- `infrastructure/local`：localStorage/IndexedDB 的读写，不定义业务字段。
- Provider/Store：编排和投影，不直接解析存储格式或调用云端。

## 2. 读取契约

输入：账号作用域和抽象 `StorageAdapter`。
输出：`HydrationState` 与可读的 `AccountDataPayload`，或 `recovery-needed` 及原始证据。

| 情况 | 结果 | 是否允许自动写入 |
|---|---|---|
| key 不存在 | `new` + 初始状态 | 允许创建首个本地保存点 |
| 裸旧 payload 有效 | `ready` + 归一化状态 | 由迁移策略决定，不强制升级 |
| 封套和 payload 有效 | `ready` + 封套元数据 | 允许普通编辑 |
| JSON/封套/checksum/结构无效 | `recovery-needed` + 原始 payload | 禁止覆盖原 key |
| 账号 scope 不匹配 | `recovery-needed` | 禁止读取或写回该 scope |

读取失败时可以提供临时初始状态用于恢复界面渲染，但该状态不得自动写入原 key，也不得被标记为用户数据。

## 3. 普通保存契约

输入：当前已恢复的 `AccountDataPayload` 或 updater。
输出：`LocalSaveResult`。

```text
commitData
  1. 读取当前已恢复状态
  2. 生成 next payload
  3. normalize/validate
  4. 生成 localRevision、operationId、checksum
  5. adapter.write
  6. 只有 write 成功才更新内存/Store 投影
```

`failed` 和 `blocked` 都不能把 next payload 标为已保存；写入失败时保留上一个有效保存点和错误证据。第一阶段没有网络等待或云端回调。

## 4. 恢复/导入契约

恢复是显式用户动作：

```text
导入文件
  → 读取为临时值
  → 解析/版本迁移/normalize/ID 校验/附件引用校验
  → 展示待替换摘要
  → 用户确认
  → 受控整包写入
  → 成功后清除 recovery-needed 并生成新 localRevision
```

任何解析、校验或写入失败都返回 `rejected`，保留当前有效状态、原始导入文件和失败原因；不得先清空当前 key。恢复是否保留有限旧快照、恢复后是否可撤销，属于第四阶段历史能力，本阶段只锁定接口可扩展性。

## 5. 账号隔离契约

- 认证账号使用 `log-note:data:user:<userId>:v1` 的作用域规则；匿名 scope 保持既有兼容 key。
- Store、localStorage、IndexedDB attachment owner 和恢复证据必须使用同一个账号 generation。
- 账号切换先停止上一个 scope 的写入/定时器，再装载新 scope；迟到的保存结果不得写回新账号。
- 本阶段不把账号 token 写入 payload、封套或错误日志。

## 6. 兼容和删除契约

- 兼容对象是旧数据格式，不是旧模块路径。
- `src/lib/data.mjs`、`storage-state.mjs` 等旧入口只可在迁移期转发，禁止新增调用方。
- 结构测试记录每个旧入口的剩余引用；引用为零且回归通过后删除文件。
- 删除旧入口不得删除旧备份解析、附件引用迁移或 payload 版本兼容规则。

## 7. 验收场景

1. 新建、编辑、删除后刷新和重启，读回最近有效保存点。
2. `setItem` 抛错或配额不足，内存和上一个保存点不被误报/破坏。
3. JSON 损坏、封套 checksum 错误、重复 ID、非法字段进入恢复保护。
4. 损坏导入被拒绝且当前数据不变；有效导入一次性替换并可读回。
5. 账号 A/B/匿名互换，文字 key、附件 owner 和迟到回调不串号。
6. 所有普通写入经过 `commitData`；恢复写入经过同一受控持久化边界；没有未审计的 `replaceData` 平行路径。
