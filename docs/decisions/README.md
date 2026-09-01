# Log Note 架构决策日志

本目录使用 [MADR 4.0](https://adr.github.io/madr/) 记录影响系统结构、质量属性、重要依赖、外部接口或长期构建方式的决定。一个文件只回答一个问题，并保留被拒绝方案、后果和确认方式。

## 决策索引

| ID | 状态 | 决策 |
| --- | --- | --- |
| [ADR-0001](0001-nextjs-app-router-before-fsd.md) | accepted | Next.js App Router 优先于完整 FSD 分层 |
| [ADR-0002](0002-use-arc42-c4-madr-with-spec-kit.md) | accepted | 使用 arc42、C4 与 MADR 补充 Spec Kit |
| [ADR-0003](0003-embed-mastra-without-standalone-runtime.md) | accepted | 在 Next.js 服务内嵌 Mastra，不建设独立 Agent Runtime |

## 使用规则

1. 复制 [`adr-template.md`](adr-template.md)，按 `NNNN-title-with-dashes.md` 命名。
2. 新决定先使用 `proposed`；经项目负责人确认后改为 `accepted`。
3. 决定失效时保留原文件，将状态改为 `deprecated` 或 `superseded`，并链接替代 ADR。
4. ADR 保存“为什么”；`ARCHITECTURE.md` 保存“系统现在是什么”；功能要求、任务状态和验收证据仍分别留在 Spec Kit 包和 `PROJECT_BOARD.md`。
5. 不为普通重命名、临时实现细节或每个功能选择创建 ADR。

MADR 模板依据采用 MIT 或 CC0-1.0 双重许可的 MADR 4.0 结构做项目内精简，保留上下文、驱动因素、备选方案、结果、后果和确认方式。
