---
status: accepted
date: 2026-09-01
decision-makers:
  - project-owner
---

# 使用 arc42、C4 与 MADR 补充 Spec Kit

## Context and Problem Statement

Log Note 已使用 Spec Kit 0.16.5 管理一次变更的规格、计划和任务，也使用 `AGENTS.md` 指导编码 Agent。原有架构说明同时承担系统现状、操作规则、AI 写入协议和验证流程，缺少统一的上下文、部署和决策理由结构。项目需要采用社区知识架构，同时避免引入第二套规格驱动开发流程。

## Decision Drivers

- 项目负责人要求采用社区已有架构，不自行发明知识库分类。
- 人和 Agent 需要稳定区分产品、系统现状、决策理由、变更规格与任务状态。
- 已有 11 个 Spec Kit 功能包和项目 Constitution 不能因文档重组失效。
- 知识结构必须适合小型仓库，允许精简维护。
- Next.js App Router 仍是代码结构第一约束。

## Considered Options

- 继续维护自定义单体架构说明。
- 只使用 Spec Kit 承担当前架构和历史理由。
- 将现有 Spec Kit 迁移到 OpenSpec。
- 保留 Spec Kit，并用精简 arc42 描述当前架构、C4 描述关键视图、MADR 保存重要决定。

## Decision Outcome

Chosen option: “保留 Spec Kit，并用精简 arc42、C4 和 MADR 分别管理当前架构、关键视图和重要决定”，because 这些社区标准职责互补，并能在不迁移现有规格的情况下消除真源混用。

责任边界如下：

- `AGENTS.md`：Agent 操作、权限、读取和完成规则。
- `product.md`：长期产品行为。
- `ARCHITECTURE.md`：按 arc42 组织的当前系统技术基线，其中嵌入必要的 C4 上下文图和容器图。
- `docs/decisions/`：MADR 决策日志。
- `specs/<feature>/`：Spec Kit Living Spec；`spec.md` 是当前变更契约，`plan.md` 和 `tasks.md` 是派生材料。
- `PROJECT_BOARD.md`：优先级、依赖、任务状态和验收证据。

### Consequences

- Good, because 新参与者可以先判断问题类型，再读取唯一真源。
- Good, because 架构现状、变更契约和历史理由不再相互替代。
- Good, because 保留现有 Spec Kit 包，不产生 OpenSpec 与 Spec Kit 双轨。
- Bad, because 架构变化除了代码外，可能还需要同步 arc42 章节或新增 ADR。
- Neutral, because arc42 的十二章保留固定顺序，但只填写当前有维护价值的内容；C4 目前只维护系统上下文和容器两级。

### Confirmation

- `tests/project-structure.test.mjs` 检查 arc42 十二章、C4 视图、MADR 索引、Constitution 真源关系和 AI 写入安全锚点。
- `.specify/memory/constitution.md` 明确 Living Spec 与决策理由的归属。
- 文档架构修改运行聚焦结构测试和完整 `npm run check`。

## More Information

- [arc42 官方文档](https://docs.arc42.org/home/)
- [C4 模型官方文档](https://c4model.com/diagrams)
- [MADR 4.0](https://adr.github.io/madr/)
- [Spec Kit Persistence Models](https://github.github.com/spec-kit/concepts/spec-persistence.html)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
