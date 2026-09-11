# 仓库基线与分支拆分方案

## 结论

本轮以 `origin/master` 为唯一基线。`.specify` 组织调整（含全局 Constitution 与 overrides）随 `REQ-20260911-01` 承载一次，其他业务需求按 Spec 一一对应创建 `feature/req-YYYYMMDD-NN-short-description` 分支。半成品同步代码和迁移暂不进入任何已确认需求分支。

## 基线快照

- 记录时间：2026-09-11。
- 缓存基线：`origin/master` = `9f02936ba3d9ac683d2b342c8a9f1e32f8d0dfa7`。
- 对齐结果：本地 `master` 已指向该 SHA，并跟踪 `origin/master`。
- 远端新鲜度：本轮 `git fetch origin master` 已成功，`origin/master` 当前 SHA 已通过远端刷新确认；推送前仍需按提交规范重新复核远端分支。
- 工作树保全：原工作树保留在 detached `7d46cec`，安全引用为 `refs/codex/master-before-origin-sync`；完整 tracked patch、未跟踪文件清单和压缩包位于 `/private/tmp/log-note-preserve-20260911-latest-1789115308/`。

## 分支映射

| 分支 | Spec | 当前承载范围 | 依赖和边界 |
| --- | --- | --- | --- |
| `feature/req-20260911-01-core-record-sync-review` | `REQ-20260911-01` | 核心同步第一阶段方案、研究、契约，以及 `.specify` 组织调整 | 不修改云端同步语义；先完成 owner review，再生成实现 tasks |
| `feature/req-20260906-03-okr-progress-review` | `REQ-20260906-03` | Goals 页面、工作区入口、目标日期标记 | 与 Inline Chat 共享首页文件，必须按代码块拆分并补齐写集 |
| `feature/req-20260910-01-codex-inline-chat` | `REQ-20260910-01` | Inline Chat Header、Dock、Workspace、CSS 和测试 | origin 基线已撤回旧包，恢复时按当前 Spec 重新纳入，不直接重放旧提交 |
| `feature/req-20260905-01-agent-mcp-bridge` | `REQ-20260905-01` | MCP 传输、配对、只读查询和桥接 | 不承载计划/记录写入语义 |
| `feature/req-20260905-02-agent-plan-record-authoring` | `REQ-20260905-02` | 计划/记录提案、确认和回读 | 依赖 084 的传输与配对，不重复建设 |

`REQ-20260909-01` 的通用 Agent 工具注册扩展、`domain-insights` 工具和 Mastra Studio 变更暂未完成需求归属，保持待分配；同步 Provider、`account-sync`、outbox/CAS 测试和 Supabase migration 同样保持隔离。

## `.specify` 承载规则

本需求承载以下组织文件：

- `.specify/memory/constitution.md`
- `.specify/scripts/bash/check-prerequisites.sh`
- `.specify/scripts/bash/common.sh`
- `.specify/scripts/bash/setup-tasks.sh`
- `.specify/templates/overrides/**`
- `.specify/templates/plan-template.md`
- `.specify/templates/spec-template.md`
- `.specify/templates/tasks-template.md`
- `specs/README.md`

这些文件与核心同步 Spec 一起评审和交付，不另建 `INFRA` 分支；后续需求分支从确认后的共同基线继承，不重复复制。`.specify/memory/` 中除 `constitution.md` 外的文件仍属于全局治理源，不在本次写集内。

## 共享文件拆分

`home-page.js`、`home-header.js`、`home-header.css`、`i18n.mjs` 等文件同时包含 Goals 和 Inline Chat 变更，不能按整文件复制。迁移时先按 hunk 建立归属清单，再分别验证：

- Goals：工作区菜单、Goals 状态、日历目标区间、Goals 样式和页面入口。
- Inline Chat：聊天按钮、聊天状态、Composer/Workspace、聊天样式和文案。

## 同步半成品隔离

当前 `src/lib/account-sync.mjs`、Provider 增量拉取、云文档/恢复测试和三份 Supabase migration 不属于本轮方案写集。它们保留在原工作树的保全包中，待第一阶段产品决策完成、重新生成实现 `tasks.md` 后，再由新的实现任务认领。

## 验证

完成分支整理后必须重新检查：

1. `git rev-parse master` 与 `git rev-parse origin/master` 相同。
2. `git branch -vv` 显示 `master` 跟踪 `origin/master`。
3. 每个需求分支名称与对应 `spec.md` 的 Requirement/Feature Branch 一致。
4. 核心同步分支只包含 Spec Kit/文档和已确认的本地分层写集；同步半成品不出现在该分支。
5. 推送前重新 fetch，并以实际远端 SHA 复核本快照。
