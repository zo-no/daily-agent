# 核心记录同步研究索引

本目录收纳该 feature 的现状调研、阶段方案和数据结构优化研究。研究内容已经超过单个
`research.md` 的维护范围，因此按主题拆分；本 README 是唯一研究入口。

面向产品 review 的结论稿位于 feature 根目录的
[data-layer-optimization-report.md](../data-layer-optimization-report.md)；本目录保留可追溯的代码事实和方案依据。

## 阅读顺序

1. [同步范围与当前实现](./sync-scope-and-current-state.md)：确认四阶段边界、当前本地与云端结构，以及需要产品负责人决策的总问题。
2. [第一阶段：本地数据同步与恢复](./phase1-local-data-recovery.md)：聚焦本地保存、恢复、损坏保护和第一阶段验收。
3. [核心数据结构与分层优化](./data-layer-optimization.md)：对齐 `AccountDataPayload`、本地保存封套、云端文档和增量实体的边界。

## 研究约束

- 本目录的文档用于 review 和形成 spec 输入，不替代 `spec.md`、`PROJECT_BOARD.md`、`product.md` 或 `ARCHITECTURE.md`。
- 第一阶段只讨论本地数据同步与恢复；云端内容仅作为后续结构对齐约束。
- 研究结论未经过产品负责人确认前，不进入 tasks 或代码实现；`plan.md` 可以记录带明确 review gate 的候选方案，但不能把它们标记为已批准。
- 后续新增研究主题应直接放入本目录，并在本索引登记；不要重新创建根目录 `research.md`。Spec Kit 的 plan 通过后，`plan.md`、`data-model.md`、`contracts/` 和 `quickstart.md` 仍位于 feature 根目录，不移入 research。
