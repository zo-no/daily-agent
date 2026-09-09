# Research: 通用 Agent 聊天 UI 方案

## 调研范围

本次比较首页连续聊天所需的消息流、Composer、工具调用、附件、审批和运行时适配能力，重点检查是否会破坏 Log Note 的账号隔离、本地优先、瞬态会话和零写入边界。

## 方案比较

### assistant-ui

- 提供 React Thread、Viewport、Messages、Composer 等可组合 primitives，并把线程、流和工具状态交给 runtime 管理。
- 官方首页明确支持 AI SDK、LangGraph、LangChain、Mastra 和自定义后端适配；项目采用 MIT License。
- 官方安装文档支持通过 CLI 初始化，也支持只安装 React 包并复制需要的组件源码。
- 优点是聊天交互成熟，后续可自然扩展流式输出、工具状态、审批、附件和分支。
- 风险是引入新的 runtime 与依赖；如果直接接入 Cloud 或默认持久化，会越过 Log Note 的会话边界。

来源：

- https://www.assistant-ui.com/
- https://www.assistant-ui.com/docs/installation

### Vercel AI SDK UI

- 官方定位是 framework-agnostic 的 UI 状态工具，`useChat` 负责消息、输入、加载和错误状态，支持 React、Vue、Svelte、Angular 等。
- 优点是与流式后端协议衔接直接，适合已有 AI SDK transport 的项目。
- 它主要提供状态 hooks，不提供 assistant-ui 同等范围的现成 Thread/Composer 视觉 primitives，因此页面结构仍需自己维护。

来源：https://ai-sdk.dev/docs/ai-sdk-ui/overview

### 当前项目自有 primitives

- 当前已经有 `HomeActionDock`、React 页面状态和 Mastra/DeepSeek 服务边界。
- 复用它们可以保持速记与聊天共用底部位置，不增加依赖和第二套状态所有者。
- 缺少的是聊天消息流的自动贴底、思考态、可组合消息结构和后续工具展示能力。

## 决策

当前阶段采用“自有底部 Composer + assistant-ui 风格的本地 Thread/Message primitives”作为过渡实现：

1. 保持聊天在首页工作区内，不创建新页面。
2. 保持聊天状态属于页面会话，不接入 Cloud、Zustand 或持久化线程。
3. 继续通过现有 Route → capability server → Mastra → DeepSeek 边界调用 Agent。
4. 先补齐消息流自动贴底、思考态、错误态和移动端布局。
5. 当产品确认需要流式输出、工具审批或附件时，再以 adapter 方式引入 assistant-ui primitives，并保持当前 API 与数据边界不变。

## 排除条件

- 不新增聊天历史持久化。
- 不让 UI 直接访问 Mastra、DeepSeek 或 `commitData`。
- 不为了引入框架重做首页状态或速记路径。
