# Phase 0 Research: 成熟工作流与 Agent 架构选型

**Feature**: `LN-077 AI 模板生成与分类结构演进`
**Verified**: 2026-09-01
**Status**: Proposed decision; 真实记录接入仍受 `LN-007/LN-009` 约束

## 结论

首期选择 **Dify Workflow** 做隔离 PoC，但不使用可自主循环的 Dify Agent，也不给 Dify 任何 Log Note 写工具。三个产品模式分别对应三个受版本控制的工作流：

1. `template-create-v1`：一个完整模板草案；
2. `template-refine-v1`：一个保守模板补丁；
3. `structure-propose-v1`：一个领域 + 分类 + 模板结构包。

Log Note 自己只保留无法外包的产品责任：账号鉴权、数据裁剪、结构指纹、schema 校验、差异预览、显式确认、本地先写与 CAS 同步。这样满足“使用成熟平台、不自行搭通用 Agent”的目标，也避免把核心数据权限交给平台。

Phase 0 只用合成数据验证 Dify Cloud；真实笔记在完成隐私评审前保持关闭。若真实数据必须进入用户自控基础设施，再评估 Dify 自部署；不能把“支持自部署”误认为“零运维”。

## 研究问题 1：这个需求需要 Agent 还是 Workflow？

### Decision

使用有固定分支、固定输入、固定输出的 **Workflow**，不使用 ReAct、自主规划、多 Agent handoff 或工具循环。

### Rationale

- 三种任务都有确定的起点和终点，最多一次模型生成；结果只能是受约束提案。
- “是否空输入”“是否有现有模板”“是否允许新增结构”可以用条件节点和本地规则决定，不需要模型自主选工具。
- Dify 官方示例已经覆盖用户输入、参数抽取、IF/ELSE、结构化输出、模板节点、测试和发布；官方也明确建议把确定性格式工作放在零 Token 的模板节点，而不是让模型重复完成。[Dify Workflow quick start](https://docs.dify.ai/en/guides/application-orchestrate/creating-an-application)
- Agent 循环会增加不可预测调用次数、Token、迟到/重试状态和写权限管理，但当前需求没有对应收益。

### Alternatives considered

- **Dify Agent**：适合工具选择和开放式推理，本需求不需要；首期拒绝。
- **直接单次模型调用**：技术上最简单，现有 Vercel AI SDK 已能做到，但 Prompt、分支和运行观测仍要在仓库中维护，不完全符合用户希望采用成熟平台工作流的诉求。

## 研究问题 2：为什么首选 Dify Workflow？

### Decision

用 Dify 托管工作流定义、模型配置、结构化输出和运行日志；Log Note 通过服务端窄适配器调用已发布工作流。

### Rationale

- Dify 是面向 AI 应用的低代码工作流平台，支持条件分支、模型节点、结构化输出、测试与发布，能把 Prompt/模型/分支调整从产品代码中解耦。[Dify Workflow quick start](https://docs.dify.ai/en/guides/application-orchestrate/creating-an-application)
- Dify 的工作流接口支持 blocking/streaming 调用，说明它能作为应用后端工作流被程序化触发，而不是只能使用内置聊天页面。[Dify App workflow interface](https://docs.dify.ai/en/develop-plugin/features-and-specs/advanced-development/reverse-invocation-app)
- 官方仓库同时提供 Cloud、VPC/企业和 Docker Compose 自部署路径，便于先快速 PoC、再按数据边界选择部署方式。[Dify official repository](https://github.com/langgenius/dify)
- Log Note 不需要开发 Dify 插件。普通 HTTPS 调用足以完成“输入 → 结构化提案”，减少新依赖和平台耦合。

### Risks and controls

- **第三方数据边界**：Dify Cloud 会成为模型之外的额外处理方。Phase 0 禁止真实笔记；真实启用前必须核对存储、日志、保留、区域和删除政策。
- **自部署运维**：官方 Docker Compose 包含 API、worker、数据库/缓存等服务，不是一个轻量 npm 包；只有数据控制收益明确时才承担。[Dify Docker deployment](https://github.com/langgenius/dify/blob/main/docker/README.md)
- **平台锁定**：产品内部只依赖统一 proposal schema；Dify 的 workflow ID、API key、错误格式和调用协议封装在一个 provider 中。
- **工作流被误用为写端**：禁止向 Dify 暴露 Supabase、`commitData`、MCP 写工具或 webhook 回写；平台只能返回提案。

## 研究问题 3：为什么不首选 LangGraph？

### Decision

本期不引入 LangGraph。若未来出现需要跨分钟/小时暂停恢复、持久检查点、多阶段人工审批或真正长期状态的 Agent，再重新评估。

### Rationale

- LangGraph 官方将其定位为低层 Agent orchestration runtime，强调 durable execution、streaming、human-in-the-loop 和 persistence；这些能力适合长时、有状态 Agent，但也意味着我们仍需自己编写节点、状态和部署代码。[LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)
- 官方持久化层通过 checkpoint 支持恢复、记忆、时间旅行和容错；当前提案在一个页面会话内生成并由 Log Note 自己确认，不需要外部 checkpoint。[LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- LangGraph 的 human-in-the-loop 能暂停并审批工具调用，但本产品更安全的边界是“平台根本没有写工具”，确认后由现有产品代码写入。[LangChain human-in-the-loop](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)

### Alternatives considered

- **LangGraph + LangSmith**：能力最强、控制最细，但首期会变成自建编排后端，偏离用户目标。
- **LangSmith Fleet/其他无代码层**：可以后续单独比较，但本期没有比 Dify 更直接的必要性证据。

## 研究问题 4：为什么不首选 OpenAI Agents SDK？

### Decision

本期不把 OpenAI Agents SDK 作为编排层。Dify 工作流内部可按部署选择模型提供方，Log Note 的 proposal contract 不绑定 OpenAI。

### Rationale

- OpenAI 官方将 Agents SDK 明确描述为 **code-first**；应用服务器仍拥有部署、工具实现、状态存储和审批决策，SDK负责 agent loop。[OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents)
- SDK 的 sessions、tracing、guardrails、handoffs 和 resumable approvals 对多步工具 Agent 很成熟，但当前单次结构化提案没有工具循环；引入 SDK 仍需自行搭建服务端状态和集成代码。
- 若未来需求升级为多个专业 Agent、重复工具调用或可恢复审批，Agents SDK 是比自行编写循环更好的候选；当前阶段属于过度能力。

### Alternatives considered

- **Responses API / Structured Outputs**：适合单次定制功能，但 Prompt 和工作流仍由 Log Note 代码管理。
- **Agents SDK**：适合代码优先的有界事务 Agent，保留为第二阶段候选，不是本期低代码工作流首选。

## 研究问题 5：Cloud 还是自部署？

### Decision

- **Phase 0**：Dify Cloud + 合成数据，目标是验证 workflow 版本、schema 可靠性、运行日志、延迟和费用。
- **真实数据试验**：默认关闭。只有在 `LN-007/LN-009` 完成、外发披露获批，并确认 Dify 与底层模型的数据政策后才选择部署。
- **若必须自控数据平面**：在独立基础设施任务中评估 Dify 自部署，不与 Log Note 应用容器绑在同一发布单元，也不在本功能实现中顺带搭建。

### Rationale

Cloud 最快验证用户价值，自部署提供更强控制但增加多个持久服务、升级和备份责任。先用假数据验证“工作流是否值得”，能避免在需求价值尚未证明时提前承担平台运维。

### Alternatives considered

- 一开始自部署：数据控制更强，但产品价值和资源成本都未验证。
- 直接让浏览器调用 Dify：会泄露平台 key、绕开同源鉴权与限流，明确拒绝。

## 研究问题 6：如何控制 Token 和调用次数？

### Decision

- 空输入、本地默认、重复结构和明显无变化在调用模型前结束。
- 三种模式各一次请求、一次结构化输出、零工具循环；失败不自动重试模型。
- 创建/优化输入不发送历史正文；Agent 结构提案最多发送用户主动选择的 12 条记录，每条最多 1000 个 Unicode 字符。
- 输出上限：1 个模板、最多 6 字段、3 标签、每字段 6 选项；结构模式最多 1 个三层结构包。
- 固定工作流说明和 JSON schema 保持稳定，动态内容置后，以便底层模型利用 Prompt cache（若提供方支持）。

### Rationale

Token 最有效的优化不是压缩一句 Prompt，而是让本地规则拦截不需要模型的路径，并禁止 Agent 自主循环。Dify 官方示例也把确定性格式交给模板节点以避免模型消耗。[Dify Workflow quick start](https://docs.dify.ai/en/guides/application-orchestrate/creating-an-application)

## 推荐架构边界

```text
结构管理页 / Diary Agent
        │  本地选择模式、计算统计、裁剪输入
        ▼
同源 POST /api/organize/template-proposal
        │  Origin + Bearer + rate limit + size/timeout
        ▼
WorkflowAdapter
        │  mode → 已发布 Dify Workflow；server-only key
        ▼
Dify Workflow（无 Log Note 工具、无写权限）
        │  structured proposal only
        ▼
Zod/schema 校验 → 浏览器结构指纹校验 → 差异预览
        │
        └── 用户显式确认 → commitData → 本地先写 → revision-checked sync
```

## 平台比较

| 候选 | 成熟度与现成能力 | 本项目仍需自建 | 当前适配度 | 决策 |
| --- | --- | --- | --- | --- |
| Dify Workflow | 低代码分支、模型节点、结构化输出、测试、发布、运行日志、Cloud/自部署 | 窄 API 适配、产品 schema、确认与本地写 | 高 | Phase 0 首选 |
| LangGraph | durable execution、checkpoint、HITL、memory、streaming | 节点图、状态、部署、存储、UI 与产品接入 | 中低 | 长时 Agent 再评估 |
| OpenAI Agents SDK | agent loop、sessions、handoff、guardrails、tracing、审批 | code-first 服务端、工具、状态、产品 UI | 中低 | 多工具 Agent 再评估 |
| 现有 AI SDK 直连 | 已在仓库、Zod、单次结构化输出、最少依赖 | Prompt/分支/版本/观测均在代码 | 中 | Dify 故障时的替代方案，不作为首选 |

## 实施前必须满足的外部决策

1. `LN-007/LN-009` 完成，明确真实记录可以发送到哪个 Dify 部署与哪个模型提供方。
2. 产品负责人明确批准更新 `product.md`、`DESIGN.md` 与“记录与结构管理页面规范”中“Agent 不得创建结构”的现有规则；本研究文档本身不覆盖该真源。
3. Phase 0 合成数据 PoC 达到 schema 有效率、延迟与费用阈值后，才讨论真实账号灰度。
4. 若选择自部署，另立基础设施任务，明确升级、备份、日志、密钥轮换、健康检查和回滚，不把这些责任藏在 LN-077 内。
