# Design Standards Project Instructions

## Read order

```text
if (任务涉及视觉或交互实现) {
  READ ../DESIGN.md
  READ index.md
  READ 快速路由命中的正式规范
} else if (任务是新增或修改规范) {
  READ index.md
  READ 指南/设计规范编写指南.md
  READ 模板/Design 规范模板.md
}
```

## Source of truth

- `../DESIGN.md`：产品级设计原则和 token。
- `规范/`：正式、可验收的专项规则。
- `index.md`：路由、阅读顺序和优先级。
- `指南/` 与 `模板/`：规范写作方法，不覆盖正式规则。
- `调研/`：证据和候选实践，不是正式规则。

## Edit boundaries

- 保留用户已经确认的视觉方向、交互语义、例外和阈值。
- 一条正式规则只保留一个主要维护入口。
- 页面规范引用组件和交互规范，不复制完整正文。
- 修改正式规范后运行 `npm run design:check`。
