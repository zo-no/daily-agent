---
status: accepted
date: 2026-09-01
decision-makers:
  - project-owner
---

# Next.js App Router 优先于完整 FSD 分层

## Context and Problem Statement

Log Note 使用 Next.js App Router。项目需要降低 `src/app` 中大型页面和相邻模块的阅读成本，同时不能让 Feature-Sliced Design（FSD）的目录名称覆盖 Next.js 对 `page.js`、`layout.js`、`route.js` 和路由段的运行时语义。代码结构应以哪套规则为第一约束？

## Decision Drivers

- 路由结构必须符合 [Next.js App Router](https://nextjs.org/docs/app) 和其[项目结构约定](https://nextjs.org/docs/app/getting-started/project-structure)。
- 开发者和 Agent 应能从文件位置判断路由入口、私有实现与共享入口。
- 目录迁移不能创建第二套路由系统、改变 URL 或丢失模板编辑、离线、同步和备份能力。
- 当前工作树包含大量独立改动，架构演进必须增量完成。

## Considered Options

- 在 `src` 下完整复制 FSD 的 app/pages/widgets/features/entities/shared 层级。
- 所有文件继续平铺在 `src/app`。
- 保留 App Router 为骨架，在其内部采用功能共置、私有目录、最小公开入口和单向依赖。

## Decision Outcome

Chosen option: “保留 App Router 为骨架，在其内部采用功能共置、私有目录、最小公开入口和单向依赖”，because 它同时保留框架语义和模块可读性，不引入竞争路由或一次性重写。

具体规则是：

- Next.js 特殊文件始终留在 `src/app`。
- 路由或工作面私有 UI 放在相邻 `_components/`，通过 `index.js` 暴露最小入口。
- 多个 app 工作面共享的 React UI 放在 `src/app/_components/`。
- UI 无关规则放在 `src/lib`；`src/lib` 不导入 `src/app`。
- 只有业务切片能够脱离 App Router 独立运行时，才考虑 `src/features/<feature>`。

### Consequences

- Good, because 路由位置继续与 Next.js 官方约定一致。
- Good, because 功能可以在被修改时逐步收拢，不需要一次性搬迁整个仓库。
- Bad, because 项目不会拥有教科书式完整 FSD 目录，读者需要理解这是一种选择性采用。
- Neutral, because `src/app/page.js` 和较宽的 `src/lib` 仍需按真实改动逐步拆分。

### Confirmation

- `tests/project-structure.test.mjs` 检查不存在 `src/pages`，并禁止 `src/lib` 反向导入 `src/app`。
- 结构回归检查 `/templates` 只保留兼容路由，模板设置实现归属 Settings，共享记录 UI 使用公开入口。
- 目录调整后运行聚焦结构测试和完整 `npm run check`。

## More Information

- [`ARCHITECTURE.md` 第 2、5、8 章](../../ARCHITECTURE.md)
