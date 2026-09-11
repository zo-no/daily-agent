# 第一阶段方案验证 Quickstart

本文件描述第一阶段步骤一代码迁移后的验证入口。当前已完成目录/职责迁移和行为保持回归；本地封套、历史和多标签页仍属于后续步骤。

## 1. 前置条件

- 使用项目要求的 Node `>=22.13.0`；当前 shell 若仍为 Node 18，先切换运行时。
- 不需要 Supabase 凭证或网络；测试应能在离线环境运行。
- 保留现有工作树脏改动，不使用 reset、stash 或 clean。

## 2. 方案阶段检查

```bash
git status --short
git diff --check
.specify/scripts/bash/setup-plan.sh --json
```

确认 `spec.md`、`research/README.md`、研究主题和本 `plan.md` 的 Requirement/Legacy Board Item 一致；确认没有根目录 `research.md`。

## 3. 实现后的聚焦回归

步骤一已验证：

```text
shared/contracts/ + domain/account-data/
  - `AccountDataPayload` 的领域、分类、模板、记录、计划、目标和 Markdown 设置类型
  - 旧裸 LocalState 迁移（继续由兼容 MJS 运行时覆盖）
  - 重复 ID、非法结构、附件引用的既有回归

application/account-data/ + infrastructure/local/
  - new / ready / recovery-needed
  - setItem 失败和上一个保存点保留
  - 损坏导入拒绝、有效导入一次性替换的现有语义
  - 账号 scope 与 generation 隔离
  - `commitData` 与 `replaceData` 的现有持久化边界

新的 TS 入口位于 `src/shared/contracts`、`src/domain/account-data`、
`src/application/account-data`、`src/infrastructure/local` 和
`src/infrastructure/cloud-sync`。Node-only 测试和 Agent Bridge 暂时保留旧 MJS 兼容源，
结构测试禁止 App 与新增分层增加新的旧入口引用。

步骤三才讨论和验收 `LocalSnapshotEnvelope`、checksum、有限历史和多标签页并发；本切片不得提前实现或把它们当成已验证行为。

browser/PWA/
  - 保存后刷新/重启读回
  - 离线记录不等待网络
  - 若新增恢复状态 UI：320/390/768/1280px、键盘和触控回归
```

## 4. 质量门禁

```bash
npm run typecheck
npm test
npm run check
```

只有发生状态面板或恢复交互变更时才补：

```bash
npm run design:check
npm run test:e2e
```

Node 18 加载不了未编译的 TypeScript 不是业务失败证据；必须先按计划锁定 Node 22 的测试执行方式，再解释失败。

## 5. 返回证据格式

实现者返回以下信息，供总控独立验收：

```text
Requirement / Legacy Board Item
变更文件与明确排除项
普通编辑和恢复的 canonical path
状态写入者：变更前 → 变更后
旧 src/lib 引用：迁移前 → 迁移后，删除条件
聚焦测试命令与结果
完整 npm run check 结果
未验证的凭证、生产、跨设备或 owner 决策
```

`tasks.md` 完成不等于 Accepted；必须对照 spec、Constitution、`LN-013` 和实际证据复核。
