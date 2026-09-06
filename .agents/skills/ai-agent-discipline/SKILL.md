---
name: ai-agent-discipline
description: 🛡️ Log Note 本地编码纪律 Skill，基于 SkillHub ai-agent-discipline 二次改造。每次代码任务先复用并替换既有主路径，再新增缺失逻辑；防止范围蔓延、平行实现、过度重构、无休止重规划和递归重试。适用于 bugfix、feature、重构和 code review 修复。

metadata:
  skillhub.creator: "sunchaofei"
  skillhub.updater: "sunchaofei"
  skillhub.version: "V1"
  skillhub.source: "FRIDAY Skillhub"
  skillhub.skill_id: "3958"
  project.fork: "log-note"
  project.policy: "replace-before-add"
---

# AI Agent 纪律约束套件

这是基于 SkillHub `ai-agent-discipline`（ID 3958）的 Log Note 本地 fork。保留原版的范围控制、计划锁定、最小改动和失败熔断，并增加“替换优先、唯一主路径、删除台账和变更指标”。

本 Skill 不是“少写几行”的格式偏好，而是要求每次迭代都先判断旧实现是否仍然成立。只有无法在既有主路径上完成需求时，才允许新增实现。

## 解决的核心问题

| 失控行为 | 典型症状 | 后果 |
|---------|---------|------|
| 范围蔓延 | "顺手"改了不相关的代码 | diff 膨胀、引入新 bug |
| 过度重构 | 重命名、提取函数、调整结构 | 偏离任务目标 |
| 无休止重规划 | 反复"让我重新想想" | 消耗 token 不产出代码 |
| 递归重试 | 用几乎相同的方式反复修同一个 bug | 越改越烂、链式错误 |

## 本地强制规则

每次读取或写入代码前，必须完成以下判断：

1. 找到当前行为的 canonical path（唯一主实现路径）。
2. 先列出可复用、可替换和应删除的旧代码，再决定新增内容。
3. 同一行为默认只保留一条活跃实现路径；并行实现必须有兼容原因、移除条件和测试。
4. 新文件、public export、状态写入者和持久化路径默认不得增加。
5. 用语义差异而不是格式行数评估改动；新增语义必须说明为什么不能通过替换或复用完成。

这些规则与项目 `AGENTS.md`、`ARCHITECTURE.md`、`product.md` 和活动 spec 共同生效；发生冲突时以项目明确约束和用户当前要求为准。

## 套件结构

**1 个 Rule（始终生效）**：核心纪律红线，`alwaysApply: true`，每次读写文件时自动注入，轻量不占上下文。

**6 个参考 Skill（按需加载）**：详细战术指导，包含决策树、变更契约、指标、反模式识别和口诀，需要时才加载。

## 使用方式

项目 `AGENTS.md` 要求每次编码任务读取本文件。根据任务加载对应参考：

| 任务 | 必读参考 |
| --- | --- |
| 所有代码任务 | `discipline.md`、`change-contract.md`、`change-metrics.md` |
| Bugfix | 上述文件 + `scope-guard.md`、`failure-circuit-breaker.md` |
| Feature 开发 | 上述文件 + `scope-guard.md`、`plan-lock.md` |
| 重构 | 上述文件 + `scope-guard.md`、`plan-lock.md`、`failure-circuit-breaker.md` |
| Code Review 修复 | 上述文件 + `scope-guard.md`、`minimal-change.md` |

参考文件只补充当前任务需要的细节，不得代替项目产品、架构和测试事实源。

## 推荐搭配

| 任务类型 | 推荐加载 |
|---------|---------|
| Bugfix | scope-guard + failure-circuit-breaker |
| Feature 开发 | scope-guard + plan-lock + minimal-change |
| 重构 | plan-lock + failure-circuit-breaker |
| Code Review 修复 | scope-guard + minimal-change |

## 各 Skill 详情

- **scope-guard**（范围锁定）：见 [references/scope-guard.md](references/scope-guard.md)
- **minimal-change**（最小改动）：见 [references/minimal-change.md](references/minimal-change.md)
- **plan-lock**（计划锁定）：见 [references/plan-lock.md](references/plan-lock.md)
- **failure-circuit-breaker**（失败熔断）：见 [references/failure-circuit-breaker.md](references/failure-circuit-breaker.md)
- **discipline rule**（纪律红线）：见 [references/discipline.md](references/discipline.md)
- **change-contract**（变更契约）：见 [references/change-contract.md](references/change-contract.md)
- **change-metrics**（变更指标）：见 [references/change-metrics.md](references/change-metrics.md)
