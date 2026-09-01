# Implementation Plan: AI 模板生成与分类结构演进

**Board Item**: `LN-077` | **Date**: 2026-09-01 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> `ARCHITECTURE.md`, and `PROJECT_BOARD.md` remain authoritative for governance, product truth,
> technical boundaries, and task state.

## Summary

在不增加普通记录步骤的前提下，为结构管理提供一个成熟工作流驱动的模板助手：空输入继续走零请求的本地默认结构；明确需求只生成一个完整模板；已有模板只接收保守小补丁；Diary Agent 在现有分类确实不足时最多提出一个三层结构包。

编排层首选 Dify Workflow，而不是自主 Agent。Log Note 只通过一个同源、鉴权、限流的 provider 适配器发送白名单输入；Dify 无数据库、本地存储或写工具，只返回统一 schema 的临时提案。产品代码负责二次校验、结构指纹、差异预览和确认后的 `commitData`，因此平台可以替换或关闭，既有结构与备份不依赖 Dify。

实施按 `Phase 0 合成数据 PoC → Phase 1 创建 → Phase 2 保守优化 → Phase 3 Agent 新结构` 分段。Phase 3 在 `product.md`、`DESIGN.md` 和正式页面规范中仍与“Agent 不得创建结构”冲突，必须在产品负责人另行批准真源更新后才可进入代码。

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: 复用原生 `fetch`、`zod ^4.4.3`、`ai ^6.0.257`、`@supabase/supabase-js ^2.57.4`；Dify 通过 HTTPS API 接入，不增加平台 SDK。若 Dify PoC 失败，现有 AI SDK 仍是单次结构化生成的替代 provider
**Storage and Ownership**: 提案、运行状态和使用统计仅存在当前页面会话；确认后仍写入当前账号隔离的版本化 JSON 文档并自动 CAS 同步到 Supabase。图片继续只在账号隔离 IndexedDB；不新增 AI 表、向量库、长期记忆或 `aiGenerated` 字段
**Testing**: Node test runner, Playwright mobile E2E, PWA production checks, design validation
**Target Platforms**: authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: 本地默认路径无网络且在一次事件循环内完成；无后台/空闲调用；每次动作最多一次工作流请求；服务端 20 秒、客户端 25 秒硬超时；隔离观察中成功请求中位可感知延迟不超过 8 秒；请求和响应各不超过 64 KiB
**Constraints**: local-first, account isolated, revision safe, offline capable, backup compatible
**Scale/Scope**: 一次一个模板或一个三层结构包；模板最多 6 字段/3 标签/每字段 6 选项；Agent 只发送用户主动选择的最多 12 条普通记录、每条最多 1000 字符；结构摘要只含名称、父子关系和必要类型；320/360/361/389/390/426/600/671/700/768/1280px 需保持现有结构页与 Diary Agent 几何

## Source-of-Truth and Readiness Check

- [x] The board item exists and its intended outcome, dependencies, permissions, acceptance, and
      verification method are clear.
- [ ] `product.md` contains or will receive the durable product-admission decision when behavior or
      scope changes.
- [x] Visual or interaction work has read `DESIGN.md`、`docs/设计规范/AGENTS.md`、设计 Index 及结构管理/编辑抽屉正式规范。
- [x] The current dirty working tree was inspected and the write set avoids unrelated user changes.
- [x] No second writer owns overlapping files or state.
- [x] `ARCHITECTURE.md` defines the AI-ready context, proposal, validation, confirmation, and
      revision-safe write boundaries that this plan must preserve.

**Readiness note**: 本轮只获准编写文档。`product.md` 当前仍把新结构排除在现有 Agent 外，正式页面规范也写明不得创建领域/分类；所以 LN-077 保持“待规划 / isolated experiment”，实施权限和真源更新尚未获得。

## Constitution Check

*GATE: Must pass before implementation design and be re-checked after the design is complete.*

- [x] Core recording steps and the home page's primary job are preserved or improved.
- [x] Authenticated offline use, account ownership, and stale-revision safety are preserved.
- [x] Raw notes are not silently rewritten; all changes are explicit and reversible.
- [x] Privacy, network payloads, credentials, backups, restore, and removal are fully specified.
- [x] Tests are mandatory and cover the acceptance scenarios and relevant failure paths.
- [x] The change is phased into independently testable vertical slices; no generalized Agent platform is introduced.
- [x] Implementation does not require unauthorized commit, push, publish, deploy, deletion, reset,
      history rewrite, OKR change, or worktree merge.

**Gate result**: 设计本身符合 Constitution；代码实施仍由 Source-of-Truth Readiness 的产品真源更新和 `LN-007/LN-009` 依赖阻塞。

## Existing System Investigation

### Relevant Code and Contracts

- `src/lib/default-data.mjs` 定义当前 4 个领域、6 个分类和 11 个本地模板；`src/lib/data.mjs#createInitialState` 在新状态创建时立即克隆这些默认值，所以当前并不存在必须联网才能使用的“零模板”账户。
- `src/app/settings/_components/record-setup/record-setup-manager.js` 已有领域/分类/模板创建、三个本地模板预设、复制、字段编辑、排序和删除，所有写入通过 `useLogNoteData().commitData`。
- `src/app/settings/_components/record-setup/record-setup-screen.js` 与 `record-setup.css` 已实现桌面右侧编辑面板和移动结构编辑表面；正式规范要求桌面右抽屉、移动全宽，并保持名称→归属→记录行为→输入结构→默认值→删除的阅读顺序。
- `src/app/agent-diary-review.js` 是 Diary Agent 当前在页审查入口；`src/lib/agent-review-route.mjs`、`src/app/api/organize/agent/route.js` 已实现同源服务端边界、Bearer 用户验证、限流、大小/超时、Zod 输出和取消语义。
- `src/lib/classifier-provider.mjs` 及现有 provider 模块证明第三方模型可封装在 server-only provider 中；新的 Dify 适配不得侵入客户端或数据模型。
- `specs/003-agent-diary-review/spec.md`、`product.md` 与 `docs/设计规范/规范/页面/记录与结构管理页面规范.md` 当前把 Agent 限定为已有分类；LN-077 Phase 3 是明确的边界扩展，而不是现有行为已具备的描述。
- `src/lib/data.mjs` 的 entry 保留 `templateId`，因此可以本地派生模板使用次数、活跃天数和最近使用日期，无需发送正文或新增持久化统计。
- 当前 JSON schema、Markdown 导出、结构导出、账号隔离缓存和 Supabase 文档已经支持任意普通 domain/category/template 对象；确认后的 AI 结构可与手工结构同形，无需数据迁移。

### Reuse and Compatibility Decisions

- 复用现有 `commitData` 本地先写、账号隔离和 revision-checked sync；Dify 不参与写入。
- 复用现有模板对象、字段类型、周期对象、`makeId` 和顺序生成；模型只生成无 ID 草案。
- 复用现有 API 的 same-origin、Bearer、Supabase `getUser`、账号级限流、Abort、超时、`private/no-store` 和统一错误码模式。
- 复用结构管理页现有编辑面板：桌面在右侧，移动占满宽度。AI 入口是编辑上下文内的次级动作，不新增首页入口或首次登录模态。
- 复用 Diary Agent 行内批注和显式确认语义；Phase 3 只增加一种终态 proposal，不增加全局聊天、后台任务或新的角色运动。
- 旧数据、旧备份和手工创建结构保持原样。已确认的 AI 结构只是普通结构对象；关闭 provider 后仍能记录、编辑、导出、恢复和离线使用。
- 不在首期保存接受/拒绝历史或长期偏好；“记忆”来自当前模板本身和可重算的非正文统计。

## Proposed Design

### Data and Control Flow

#### A. 本地默认分支（零 Token）

1. 作者主动进入模板创建助手。
2. 客户端 trim 用户描述；空输入直接显示/沿用内置默认结构，不访问同源 API。
3. 已存在默认结构时不再创建重复“随手记”；作者可返回手动模板预设。

#### B. 远程提案分支

1. 客户端根据入口固定 `mode=create|refine|structure`，计算当前结构的稳定指纹，裁剪白名单输入。
2. `POST /api/organize/template-proposal` 验证 Origin、JSON、Bearer、用户、大小、模式和限流。
3. `WorkflowAdapter` 按 mode 选择一个 server-only Dify workflow app key；不把 Log Note token 或账号 ID 转发给 Dify。
4. Dify Workflow 先走条件/模板节点，再执行至多一个模型节点，返回 JSON proposal；不配置任何 Log Note 工具、MCP 或 webhook 写入。
5. 同源 route 用 Zod/JSON Schema 重新验证平台响应，拒绝未知字段、超限、混合允许/禁止 patch、无效证据和平台错误。
6. 客户端确认请求 ID、账号 generation、mode、目标对象和结构指纹仍匹配，再渲染差异预览；否则标为 stale。
7. 作者拒绝只清空会话；作者确认后，客户端重新读取当前 state 并再次校验指纹。
8. `create` 创建一个普通 template；`refine` 只更新目标模板 allowlist；`structure` 在一次 `commitData` 中生成领域/分类/模板 ID 与顺序。随后沿现有本地先写、debounce 和 CAS 同步。

#### C. 取消、失败和恢复

- Stop、离页、账号/模式/目标切换或后续请求 abort 当前 fetch，并递增本地 request generation；迟到响应失效。
- 网络、平台、模型、schema、重复、stale 或写入失败都不进行部分应用。模板编辑和 Diary Agent 原能力继续可用。
- localStorage 写入失败沿用 `commitData` 失败语义，预览保持可见并提示未保存；不把未持久化状态描述为成功。
- Supabase CAS 冲突沿用现有全局冲突处理；AI 不重试、不重新生成、不覆盖较新云端状态。

### Trust and Privacy Boundaries

| 边界 | 接收数据 | 明确禁止 | 认证/密钥 | 校验与日志 |
| --- | --- | --- | --- | --- |
| 浏览器 → Log Note API | `mode`、语言、用户要求、结构指纹及该模式白名单 | 密码、图片 Blob、完整备份、其他账号数据 | 浏览器现有 Supabase access token 仅用于 Bearer | Origin、body ≤64 KiB、Zod、账号限流；私密内容不进应用日志 |
| Log Note API → Dify | create: 用户要求+结构名称摘要；refine: 一个模板+非正文统计；structure: 最多12条选中记录的 id/≤1000字正文+结构摘要 | Log Note access token、auth user ID/email、Supabase key、附件/图片/计划、完整文档、未选记录 | `DIFY_*_APP_KEY` 和 base URL 只在服务端环境变量 | HTTPS；20s timeout；blocking JSON；provider 日志只记录 requestId/mode/耗时/状态/字节，不记正文 |
| Dify → 模型提供方 | Dify 工作流内同一受限变量 | 写工具、产品凭证、账号标识 | 由 Dify workspace 管理模型 key | 固定 schema、输出上限、无 Agent 循环；真实数据前核对 Dify/模型保留政策 |
| API → 浏览器 | 统一 proposal 或稳定错误码 | 原始上游错误、Prompt、平台 key、运行日志 | 已完成用户鉴权 | Zod + unknown field reject；`Cache-Control: private, no-store` |
| 浏览器确认 → 本地数据 | 已校验的 draft/patch | 模型生成 ID、自动 record move、raw note rewrite | 当前账号本地上下文 | 指纹二次校验、原子 `commitData`、CAS sync |

离线时只保留本地默认和手动编辑，不模拟 AI。Phase 0 Dify Cloud 仅用合成数据；真实记录启用是独立批准事项。

### UI and Interaction Contract *(when applicable)*

- 入口一：Settings → Record setup 的模板树。创建助手是“新建模板”后的次级选项；已有模板优化动作只在其右侧编辑面板中出现。
- 桌面复用右侧检查器；移动复用全宽编辑抽屉。生成表单、数据披露、loading/Stop、diff、确认/拒绝按现有编辑阅读顺序插入，不建立新的卡片墙或聊天页。
- 空输入直接显示本地默认/手动起点，不展示虚假“AI 生成完成”。远程失败保留手动三预设。
- 入口二：Diary Agent 已激活的记录行批注。若模型判断 existing category 足够，沿用原分类终态；只有结构缺口才显示一个弱于来源记录的“提出新结构”终态，完整预览转到 Record setup 检查器，确认后仍不搬记录。
- 首次登录、首页加载和普通 composer 不显示模板助手，不增加永久控件或必填字段。
- 所有真实动作 ≥44px，textarea ≥16px，焦点清晰，Escape/关闭恢复原焦点；loading 可 Stop；reduced motion 取消非必要过渡。
- 自动化覆盖 320/360/361/389/390/426/600/671/700/768/1280px，重点检查移动全宽抽屉、右轨/Agent 不碰撞、长中英文、无横向溢出和预览可滚动。

## Project Structure and Write Set

```text
本轮文档写入：
PROJECT_BOARD.md
.specify/feature.json
specs/011-ai-template-evolution/**
docs/2026-09-01-LN-077-AI模板与分类结构Agent接入方案.md

实施前获准后可能写入：
product.md
DESIGN.md
docs/设计规范/规范/页面/记录与结构管理页面规范.md
src/lib/template-proposal-model.mjs
src/lib/template-proposal-route.mjs
src/lib/template-workflow-provider.mjs
src/app/api/organize/template-proposal/route.js
src/app/settings/_components/record-setup/template-assistant-panel.js
src/app/settings/_components/record-setup/record-setup-manager.js
src/app/settings/_components/record-setup/record-setup-screen.js
src/app/settings/_components/record-setup/record-setup.css
src/app/agent-diary-review.js
src/app/i18n*.js（以实际翻译真源为准）
tests/template-proposal-*.test.mjs
e2e/run-mobile.mjs

明确排除：
src/lib/data.mjs 的 schema version 与迁移（首期无需）
Supabase migrations/RLS/RPC
public/sw.js（没有新离线资产时）
现有记录正文、图片、计划、备份格式
Dify 部署仓库/Compose、线上 workflow 发布与真实密钥
任何无关脏文件
```

**Integration Order**: 单写者串行执行。先批准并更新产品/设计真源，再实现纯模型与 contract/provider，随后 API route，再接结构页 create/refine，最后单独接 Diary Agent structure 模式；每一阶段通过聚焦回归后才进入下一阶段。Dify workflow 发布/部署属于外部状态，必须先在合成数据工作区验证版本并记录 ID，不能与未验证的产品写入同时切换。

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract tests: 默认零请求分支；结构 fingerprint 稳定性；usage summary 不读/不泄漏正文；create/refine/structure schema；字段/标签/选项上限；patch allowlist 与混合越界整份拒绝；重复名称；证据 ID；模型不得生成持久 ID；stale/late generation；provider timeout/error/no-store/64 KiB；Dify 映射只选择三个 allowlisted workflow
- Browser/mobile tests: 空输入 0 请求、明确输入 1 请求/1提案、手动降级、优化 preview/reject/apply、越界响应、stale、Stop、账号切换、Agent existing-category 优先、结构包预览/确认但原记录不变；上述场景覆盖关键宽度并生成合成截图
- PWA/offline/account tests: 已认证离线打开 Record setup、默认/手动路径可用且远程入口明确不可用；账号切换清空 proposal；AI 创建结构 JSON/完整备份往返；旧备份恢复后结构可编辑；CAS 冲突不自动覆盖
- Design validation: 更新正式规范后运行 `npm run design:check`；核对桌面右检查器、移动全宽抽屉、Diary Agent 行内层级、44px、焦点、reduced motion 和无横向溢出
- Full gate: `npm run check`

### Real-Environment or Manual Evidence

- Dify Cloud 合成数据 PoC：三个 workflow 的已发布版本、运行记录、schema 有效率、错误率、输入/输出 Token、端到端延迟与单次费用。
- 真实数据启用前：Dify 部署方式、区域、运行日志/保留/删除、workspace 权限、模型提供方政策和密钥轮换的书面核对。
- 真实账号同设备：确认后本地先写、同步状态、刷新读回；另一账号不能看到 proposal 或结构。
- 真实双设备：结构指纹过期和 Supabase stale revision 不覆盖；此证据不能由 stub 替代。
- 14 天隔离观察：进入次数、确认/拒绝、非法提案、正常成功延迟、费用、是否第二次使用，以及新结构提案是否多数其实可以复用现有分类。

### Acceptance Evidence Handoff

每个阶段返回：聚焦 Node 测试计数、浏览器场景计数、PWA/设计/完整门禁结果、`git diff --check`、五档以上截图目录、合成 Dify workflow 版本与脱敏运行摘要、备份往返结果、源码 revision、未完成的真实平台/双设备/14 天检查。`PROJECT_BOARD.md` 只在控制者独立核验后记录 Returned/Verify/Accepted；PoC 成功不等于真实数据或 Phase 3 获批。

## Rollback, Removal, and Migration

- 环境中未配置 Dify app key 时远程入口显示不可用，本地默认和手动模板功能完整；单一 feature flag 可关闭全部 LN-077 入口。
- 删除 API route、provider、proposal model 和 UI 入口即可移除生成能力，无数据库/本地 schema migration，无派生数据清理。
- 已确认结构与手工结构同形，移除 AI 后继续正常编辑、记录、同步、导出和恢复；不自动删除它们。
- 若 Phase 3 造成同义结构，只能由用户在现有手动结构管理中处理；回滚不得自动合并、搬记录或删除父子结构。
- Dify workflow 回滚使用上一已发布版本/禁用对应 app key；Log Note provider 只接受兼容 schema version，版本不兼容直接失败关闭。

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 一个 Dify provider 适配器 | 隔离平台协议、密钥、错误与 workflow 版本，满足成熟平台诉求 | 浏览器直连泄露 key；把 Dify 格式散落到 UI 会形成锁定 |
| 三个独立 workflow | 三种模式输入、风险和 rollout 不同，可单独关闭/评估 | 一个自由 Agent 难以限制调用次数和输出权限 |
| Proposal schema + 二次 Zod 校验 | 外部平台结果不能直接变成产品写入 | 只靠 Prompt 不能保证字段、限制和兼容性 |
| 结构 fingerprint | 生成与确认之间可能发生本地/跨设备修改 | 仅凭 target ID 会把旧补丁应用到新结构 |
| 本地 usage summary | 提供最小“过去使用”依据且不发原文 | 发送完整历史增加隐私、Token 和长期记忆复杂度 |
| Phase 3 产品真源更新闸门 | 当前正式规则明确禁止 Agent 创建结构 | 直接实现会让 spec、product、DESIGN 与代码互相冲突 |

## Post-Design Constitution Check

- [x] 远程平台无写工具，确认后才走现有本地优先写入。
- [x] 默认/离线/未配置均保留完整手动模板和普通记录主链路。
- [x] 原文、记录分类、备份 schema、账号隔离和 CAS 不因提案自动改变。
- [x] 每个 phase 可独立测试、关闭和移除，未引入通用 Agent 或长期记忆。
- [x] 真实数据、外部发布和产品真源修改均明确保留为后续授权闸门。
