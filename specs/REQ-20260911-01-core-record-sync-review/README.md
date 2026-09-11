# REQ-20260911-01 核心记录同步链路梳理与治理

这是本需求包的阅读入口。它只覆盖第一阶段的步骤一：在保持行为和数据格式不变的前提下，整理本地数据、领域、应用、本地基础设施和云端适配的职责边界，并建立 TypeScript 业务契约。

## 推荐阅读顺序

1. [spec.md](./spec.md)：当前需求、阶段边界、核心链路变更契约和已确认澄清。
2. [data-layer-optimization-report.md](./data-layer-optimization-report.md)：面向 review 的结论与目录方案。
3. [plan.md](./plan.md)：步骤一的技术设计、写集、验证和当前治理门禁。
4. [tasks.md](./tasks.md)：唯一可执行任务清单；任务完成不等于看板 Accepted。
5. [research/README.md](./research/README.md)、[data-model.md](./data-model.md)、[contracts/local-data-contract.md](./contracts/local-data-contract.md)、[quickstart.md](./quickstart.md)：研究、数据结构、契约和验证细节。
6. [phases/P01/README.md](./phases/P01/README.md)：业务阶段 P01 的范围和退出证据。

## 阶段地图

| 业务阶段 | 规划阶段 | 当前切片 | 状态 |
| --- | --- | --- | --- |
| `P01` 本地数据保护结构治理 | `S3 / I1` | 步骤一：目录、职责和 TypeScript 契约迁移 | Step 1 Ready，源码执行受治理与写入归属门禁约束 |

步骤二的数据流和流程图、步骤三的本地封套/历史/恢复语义、多标签页策略和 Store ADR 不在当前 tasks 中；它们必须在新的 review 轮次通过核心链路门禁后再进入任务。

## 真源与验收

`PROJECT_BOARD.md` 是优先级、状态、依赖和验收证据唯一真源；`spec.md` 是本包需求契约，`plan.md` 和 `tasks.md` 是派生执行材料。实现必须经过总控独立复核，不能仅凭任务勾选或本地静态检查标记 Accepted。
