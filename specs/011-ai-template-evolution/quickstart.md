# Quickstart Validation: AI 模板生成与分类结构演进

本文件是实施后的验证/run guide，不是当前功能已实现的说明。所有示例必须使用合成账号、合成结构和合成记录；在 `LN-007/LN-009` 与真实数据评审完成前，不得把个人笔记放入 Dify。

## 1. 前置条件

- Node.js 22 与项目现有依赖已安装。
- 当前分支/工作树只包含获准的 LN-077 写范围；先记录 `git status --short`。
- 已发布三个 Dify 合成数据 workflow，且只包含输入、条件、模板/代码、一个模型与输出节点；没有 Log Note 工具、MCP、webhook 回写或产品凭证。
- server-only 环境按本地私密方式提供：

```text
DIFY_API_BASE_URL
DIFY_TEMPLATE_CREATE_APP_KEY
DIFY_TEMPLATE_REFINE_APP_KEY
DIFY_STRUCTURE_PROPOSE_APP_KEY
```

环境值不得进入仓库、截图、fixture、日志或本文件。

## 2. Contract 静态检查

```bash
jq empty specs/011-ai-template-evolution/contracts/template-proposal.schema.json
git diff --check -- specs/011-ai-template-evolution
```

Expected:

- JSON schema 解析成功。
- contract、spec、plan 和 data model 没有尾随空白或冲突标记。

## 3. 聚焦模型与 route 测试

实施后运行实际新增的聚焦文件；建议入口为：

```bash
node --test tests/template-proposal-model.test.mjs tests/template-proposal-route.test.mjs tests/template-workflow-provider.test.mjs
```

最低必须证明：

1. create 空输入由客户端本地结束，provider 调用次数为 0。
2. create 明确输入最多一个请求、一个完整模板，字段/标签/选项上限生效。
3. refine 只能表达 allowlist；任何 `categoryId/recordType/inputMode/schedule/delete/reorder/id/type/options` 越界使整份失败。
4. usage summary 只读取 templateId、有效日期和计数，不读取或序列化 content。
5. structure 对已有分类可承载样本不生成新结构；缺口样本最多一个三层包，evidence IDs 全部来自请求。
6. provider 只按 mode 选择三个固定 workflow；请求无法注入 base URL、workflow ID 或 app key。
7. Origin、Bearer、用户验证、64 KiB、限流、20 秒 timeout、no-store、上游错误脱敏生效。
8. 模型产生持久 ID、unknown fields、重复/超限/非法组合、错误证据或混合补丁时 100% 拒绝。

## 4. 浏览器场景

启动本地应用后使用 Playwright 合成 fixture 验证以下路径。入口必须沿现有 Settings → Record setup 和 Diary Agent，不新增首页主 CTA。

### Scenario A：零 Token 默认路径

1. 进入 Record setup → 新建模板 → 模板助手。
2. 不填写需求，选择继续。
3. 断言 `/api/organize/template-proposal` 请求数为 0。
4. 断言现有默认结构未重复、没有空模板、手动三个预设仍可用。

### Scenario B：一个完整模板

1. 在“健康 / 作息与恢复”下输入合成跑步需求。
2. 拦截并检查 request allowlist；响应一个有效 structured template。
3. 断言预览显示字段、理由和外发摘要，但 localStorage 与当前 state 未变化。
4. 拒绝一次，确认无写入；重新生成后确认一次，断言只新增一个模板。
5. 刷新、JSON 导出/恢复后模板仍可手动编辑。

### Scenario C：保守优化

1. 选择有合成使用统计的“学习”模板。
2. 响应一个合法文字/必填/新增一字段补丁，检查差异预览。
3. 未确认前 target 和 entries byte-identical；确认后只改变 allowlist。
4. 再响应一个同时改 prompt 与 recordType 的混合补丁，断言整份失败且 prompt 也不应用。

### Scenario D：Agent 新结构

1. 对可归入现有“日常 / 记录”的合成记录唤醒 Diary Agent，断言没有结构包。
2. 对明确的新主题合成记录主动要求整理，响应一个完整三层结构包。
3. 行内只显示结构缺口终态；打开完整预览后确认。
4. 断言一次 commit 创建 domain/category/template，原 entry content/categoryId/templateId 不变。
5. 修改结构后再确认旧 proposal，断言 stale 并零写入。

### Scenario E：取消、账号与离线

1. loading 时 Stop、切日期、切账号、离开页面，迟到响应不得显示。
2. 账号 B 不得看到账号 A proposal、usage summary 或新结构预览。
3. 离线打开 Record setup，默认和手动创建可用；AI 显示不可用且不伪造结果。
4. 模拟 localStorage 写入失败，预览保留并显示未保存；不得进入成功态或云同步。

## 5. 响应式与无障碍

至少验证：

```text
320 × 844
360 × 800
390 × 844
426 × 923
768 × 900
1280 × 720
```

检查：

- 移动端编辑器占满可用宽度且不覆盖右轨/Agent；桌面保持右侧检查器。
- 所有按钮和输入目标 ≥44px，真实文本输入 ≥16px。
- Tab 顺序、可见焦点、Escape/关闭焦点恢复、loading Stop 和 `aria-expanded` 正确。
- 长中文/英文名称、6 字段和 warnings 可滚动、无页面横向溢出。
- reduced motion 下没有非必要位移动画。
- Diary Agent proposal 仍弱于 16px 来源记录，不形成全局聊天或卡片墙。

视觉/交互修改后运行：

```bash
npm run design:check
```

## 6. PWA、备份与账号边界

使用项目现有 PWA runner 和合成账号：

1. 已认证在线加载后离线打开 `/settings#record-setup`。
2. 离线创建/编辑手工模板并刷新，确认本地持久化。
3. 在线确认一个 AI template，导出完整 JSON 与结构 JSON；恢复后对象与手工结构同形。
4. 用旧版本备份恢复，AI 未配置也能编辑所有结构。
5. 双设备 stale revision 只记录为真实环境待验，不用 stub 声称已证明。

```bash
npm run test:pwa
```

## 7. Dify 合成数据 PoC

每个 workflow 至少运行 20 组固定合成样本：有效 10、边界/恶意/无变化 10。记录以下脱敏指标，不记录 Prompt 或正文：

| Metric | Gate |
| --- | --- |
| schema valid rate | ≥95%；Log Note 本地校验仍须拒绝剩余无效结果 |
| prohibited patch acceptance | 0% |
| more than one proposal | 0% |
| median end-to-end latency | ≤8s，失败/取消单列 |
| calls per user action | ≤1 |
| real Log Note data | 0 条 |
| product write credentials/tools | 0 个 |

保存已发布 workflow alias/version、测试日期、模型 alias、成功/失败计数、Token 和费用汇总；不得保存 app key。

## 8. 完整门禁

聚焦场景全绿后才运行：

```bash
npm run check
```

Expected:

- design validation、全部 Node tests、移动浏览器、PWA、production build 和 `git diff --check` 全部退出 0。
- 没有未解释的既有回归；聚焦测试通过不能替代完整门禁。

## 9. 返回证据

在 `PROJECT_BOARD.md` 的 Returned/Verify 记录中提供：

- 源码 revision 与精确写文件清单；
- 聚焦/完整测试命令、退出码和数量；
- 响应式截图目录；
- Dify 合成 PoC workflow version 与脱敏指标；
- 备份/恢复、离线、账号切换结果；
- 仍待真实验证的 Dify 数据政策、真实账号/双设备 CAS 与 14 天采用率。

没有真实证据的项目必须标“待验证”，不能因为代码或 PoC 完成而写成 Accepted。
