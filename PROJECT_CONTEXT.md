# Log Note 项目上下文

> 本文是项目的稳定导航与迭代契约，帮助开发者和 Agent 在开始工作前快速建立同一幅系统地图。
> 它不替代产品、任务、架构或功能规格真源；易变化的任务状态和验收数字以 `PROJECT_BOARD.md` 为准。

- 上下文版本：1.0
- 当前基线日期：2026-09-04
- 适用范围：产品迭代、代码修改、接口扩展、AI capability、架构迁移和质量验收
- 不包含：密钥、真实账号数据、部署凭证、未进入看板的产品承诺

核心结论：

1. 产品迭代必须先守住快速记录、账号隔离、离线、原始记录和备份兼容，再讨论功能扩张。
2. 代码按 `app → modules → shared / infrastructure` 组织；Mastra 只执行生成，不拥有鉴权、业务状态或写权限。
3. 每次只交付一个有 Change Contract、聚焦回归和完整门禁证据的垂直切片；测试通过、提交、部署和验收分别判断。

## 1. 所有迭代从项目真源而不是聊天记录开始

Log Note 是一个安静、账号归属、离线可用、移动优先的记录工具。当前最重要的产品循环是：

```text
快速记录 → 浏览 → 搜索 → 编辑/删除 → 备份/恢复 → 离线使用
```

任何新能力都应改善这个循环中的一个明确环节，而不是把 Log Note 扩展成通用任务平台、日历平台、社交产品或自治 Agent 平台。

开始工作时，按以下优先级解决冲突：

| 真源 | 回答的问题 | 不应承载的内容 |
| --- | --- | --- |
| `AGENTS.md` | 当前仓库允许怎样工作、验证和交付 | 产品需求和实时任务状态 |
| `PROJECT_BOARD.md` | 现在做什么、优先级、状态、验收证据 | 长期产品原则和代码细节 |
| `product.md` | 为什么做、产品边界、准入与退出条件 | 临时实现方案 |
| `ARCHITECTURE.md` | 系统当前怎样工作、模块边界与质量属性 | 单项任务进度 |
| `docs/decisions/` | 为什么选择这项长期架构决定 | 可从当前代码直接读出的细节 |
| `specs/<feature>/` | 一个既有 `LN-###` 的行为、计划、任务和契约 | 竞争性的第二份待办 |
| `DESIGN.md` 与页面规范 | 视觉、交互和响应式约束 | 服务端架构 |
| `PROJECT_CONTEXT.md` | 上述真源如何组成一套可执行框架 | 覆盖或改写任何真源 |

若文档与代码冲突，先记录双方证据并判断是实现偏差还是文档漂移，不得静默选择更方便的一方。

## 2. 产品和数据底线优先于功能扩张

1. 首页主要任务始终是快速记录；普通记录打开编辑器最多一步，输入后保存最多再一步。
2. 已认证设备断网后仍能记录、浏览、搜索、编辑和删除当前账号数据。
3. 每个账号拥有独立的本地文字缓存、图片命名空间和云端文档；账号切换不得复用前一账号数据。
4. 文字、计划、结构和设置本地先写，再通过 revision/CAS 自动同步；冲突时停写，不覆盖较新远端。
5. 原始记录不得被 AI、迁移或派生功能静默重写。
6. 图片 Blob 留在账号隔离的 IndexedDB 与便携备份中，不进入 Supabase 文字文档。
7. 完整 JSON 备份/恢复和可读 Markdown 导出必须向后兼容；损坏输入不能覆盖当前数据。
8. AI 输出是未受信任的瞬态候选，不是写入指令；失败、取消、过期和非法输出都必须零写入。
9. 新能力默认位于次级界面、关闭或隔离；不得无证据增加首页控件、必填字段或记录步骤。
10. 本地测试成功、Provider 调用成功、部署成功和产品验收是不同状态，必须分别给出证据。

## 3. 浏览器拥有用户状态，服务端只提供同步和有界 AI

```text
用户
  │
  ▼
Next.js App Router / React UI / PWA
  ├── 本地账号状态：localStorage
  ├── 本地图片：IndexedDB
  ├── Service Worker：版本化应用壳与离线资源
  ├── Supabase Auth：登录与 access token
  ├── Supabase 文档：账号级文字 JSON + revision/CAS
  ├── Google Calendar：浏览器显式授权、只读缓存
  └── 同源 Route Handler
        ├── Supabase access token 校验
        ├── capability schema、裁剪、限流与归一化
        └── Mastra → DeepSeek：一次有界结构化生成
```

运行时主要有三个数据所有者：

| 数据 | 所有者 | 持久化位置 | 规范写入口 |
| --- | --- | --- | --- |
| 记录、计划、领域、分类、模板、设置 | 当前 Supabase 账号 | 账号作用域 localStorage + Supabase 账号文档 | 浏览器 `commitData` |
| 图片附件 Blob | 当前 Supabase 账号 | 账号作用域 IndexedDB + 便携附件备份 | 图片存储适配器 |
| AI proposal/summary | 当前页面会话 | 默认不持久化 | 显式确认后才可能转为一次 `commitData` |

Supabase 是账号身份和云端文字文档边界。它不拥有浏览器内的编辑草稿、AI 会话或图片 Blob。Mastra 是生成执行框架，不是鉴权、业务状态、持久化或权限边界。

## 4. App Router 负责组装，capability 模块拥有业务

```text
src/
├── app/                 Next.js 路由、页面、React UI 和依赖组装
├── modules/             按业务能力组织的 model / client / server
├── shared/              跨业务且不含具体业务语义的纯协议与规则
├── infrastructure/      Supabase、DeepSeek、Mastra 等外部技术适配
├── mastra/              request-scoped Agent/Workflow 与 Studio 开发入口
└── lib/                 尚未按真实所有权迁移的旧代码兼容区
```

依赖方向固定为：

```text
app → modules → shared / infrastructure
                    infrastructure → shared / mastra adapter
```

具体规则：

- `src/app` 保留 Next.js 特殊文件、页面级状态编排和 React UI；Route Handler 只做依赖组装。
- `src/modules/<domain>/<capability>` 拥有业务 schema、归一化、用例和配套 `client/server`，不得依赖 `src/app` 或直接依赖 Mastra。
- `src/shared` 只收纳跨 capability 的无业务语义规则，不依赖 `app/modules/infrastructure/mastra`。
- `src/infrastructure` 适配外部服务，不依赖 `app` 或业务模块。
- `src/mastra` 只组合一次生成；不得拥有 Supabase 鉴权、业务 allowlist、用户确认、`commitData` 或应用持久化。
- `src/lib` 不再接收新的业务 capability。只在真实调用链被修改时逐项迁移，不做无验证的全量搬家。
- 小模块不为了形式建立空的 `domain/application/infrastructure` 目录；只有出现复杂用例或多实现时再细分。

### 前端状态所有权

当前没有独立的全局 store 库。已有边界是：

- `AuthProvider`：认证会话和账号 generation。
- `LogNoteDataProvider`：账号数据、本地持久化、云同步、revision 冲突和 `commitData`。
- 页面/工作面组件：筛选、弹层、草稿、pending、AI proposal 等瞬态交互状态。
- 纯 model：选择、归一化、合并和校验，不持有 React 状态。

只有当跨页面状态同步、Provider 重渲染或复杂异步状态机已经形成可测量问题时，才引入 store 库。引入前必须先写 ADR，明确哪些状态进入 store、哪些继续由服务端/Provider/URL/局部组件拥有，不能把所有状态统一塞入一个全局容器。

## 5. 页面和 HTTP 接口必须保持显式可查

### 页面入口

| 路径 | 责任 |
| --- | --- |
| `/` | 快速记录、时间/分类浏览、Diary/Plan 工作面 |
| `/organize` | 单日时间梳理与现有分类整理 |
| `/insights` | 本地领域趋势、日/周 AI 总结、日历与日记复盘 |
| `/settings` | 账号、同步、结构、备份恢复和 Google Calendar 设置 |
| `/auth/callback` | Supabase OAuth 回调 |
| `/about`、`/privacy`、`/terms` | 未登录可读的公共产品与政策页面 |
| `/templates` | 兼容旧链接，重定向到设置中的记录结构管理 |

### Route Handler

| 方法与路径 | 认证 | capability 所有者 | 结果与写入语义 |
| --- | --- | --- | --- |
| `GET /api/healthz` | 无账号认证 | `src/app/api/healthz` | 固定 readiness JSON；无业务读取和写入 |
| `GET /monitor/alive` | 无账号认证 | `src/app/monitor/alive` | 固定平台健康响应；无业务读取和写入 |
| `POST /api/reports/download` | 同源/有界 payload，不使用 Supabase bearer | 旧 `src/lib/report-route.mjs` | 根据调用方提供的状态生成下载内容；不读取账号缓存、不写入 |
| `POST /api/organize/agent` | Supabase bearer | `modules/assistant/review` | Diary/Plan 瞬态 proposal；确认前零写入 |
| `POST /api/organize/review` | Supabase bearer | `modules/organize/daily-review` | 单日时间线梳理；无效或失败时本地降级/零写入 |
| `POST /api/organize/analyze` | Supabase bearer | `modules/organize/classification` | 现有分类候选；只引用当前请求 allowlist |
| `POST /api/organize/day-review` | Supabase bearer | `modules/insights/calendar-diary-review` | 今日 Calendar/记录复盘建议；页面瞬态、零直接写入 |
| `POST /api/organize/domain-review` | Supabase bearer | `modules/insights/domain-review` | 当前领域七日总结；页面瞬态 |
| `POST /api/organize/domain-daily-summary` | Supabase bearer | `modules/insights/domain-daily-summary` | 当前领域今日总结；页面瞬态 |
| `POST /api/records/improve` | Supabase bearer | `modules/composer/content-improvement` | 普通草稿候选；使用候选只改内存草稿，仍需原保存动作 |

所有 AI Route Handler 都固定使用 Node.js runtime、`force-dynamic`、同源 JSON 边界、请求大小限制、进程内用户限流和 `private, no-store` 响应。浏览器不能直接调用 DeepSeek，也不能持有服务端 API key。

## 6. 鉴权只验证身份，`commitData` 与 CAS 决定写入

### 浏览器认证

```text
AuthProvider
  → infrastructure/auth/supabase-browser
  → Supabase Auth
  → session/access token + auth.uid()
  → 选择账号作用域 localStorage / IndexedDB / cloud document
```

首次使用必须有真实 Supabase 账号；已经认证过的设备可以使用隔离的本地缓存离线工作。`NEXT_PUBLIC_*` Supabase 配置是浏览器可公开配置，不得使用 service-role key。

### AI 接口认证

```text
浏览器取得当前 access token
  → Authorization: Bearer <token>
  → Route Handler
  → infrastructure/auth/supabase-access-token
  → Supabase auth.getUser(token)
  → capability server 获得已验证 user
```

服务端 verifier 只验证身份，不读取或写入账号文档。业务 handler 必须继续校验同源、JSON、schema、体积和限流，不能把“已登录”等同于“任意输入可信”。

### 数据保存

```text
用户动作
  → 生成一个完整的新账号状态
  → commitData
  → localStorage 立即持久化
  → UI 继续工作
  → debounce 云同步
  → Supabase CAS(expected revision)
  → 成功更新 revision；冲突则停写并要求显式选择
```

不得新增第二条直接写 Supabase、绕过 `commitData` 或忽略 revision 的业务保存路径。

## 7. AI 统一经 Mastra 执行，但不能直接写数据

| capability | 用户触发面 | API | 业务模块 | 输出如何生效 |
| --- | --- | --- | --- | --- |
| Diary/Plan review | 首页内 Diary/Plan Agent | `/api/organize/agent` | `assistant/review` | 预览、显式确认、复核陈旧性后一次 `commitData`；支持撤销 |
| 单日时间梳理 | `/organize` | `/api/organize/review` | `organize/daily-review` | 返回有界时间线；原始记录不变 |
| 现有分类整理 | `/organize` | `/api/organize/analyze` | `organize/classification` | 只能选择请求内已有分类；用户确认后应用 |
| 七日领域总结 | `/insights` | `/api/organize/domain-review` | `insights/domain-review` | 当前页面瞬态总结 |
| 今日领域总结 | `/insights` | `/api/organize/domain-daily-summary` | `insights/domain-daily-summary` | 当前页面瞬态总结 |
| Calendar/日记复盘 | `/insights` | `/api/organize/day-review` | `insights/calendar-diary-review` | 先展示本地事实并披露，明确批准后请求；页面瞬态 |
| 草稿内容优化 | 普通自由文本编辑器 Hero | `/api/records/improve` | `composer/content-improvement` | 显式使用后只替换未保存草稿，仍需 `Done` 保存 |
| 本地领域分析 | `/insights` | 无远程 API | `insights/analytics` | 从当前账号本地数据即时计算，不发送远端 |

远程 AI 的统一执行链：

```text
client allowlist
  → thin Route Handler
  → Supabase bearer verification
  → capability server schema / bounds / normalization
  → shared AI request and rate-limit rules
  → infrastructure AI adapter
  → request-scoped Mastra Agent/Workflow
  → DeepSeek structured output
  → capability model second validation
  → inert result returned to browser
```

共同约束：每次运行最多调用模型一次、自动重试为零、无工具、无 Agent memory、无应用持久化。账号、目标、请求和 fingerprint 变化会使旧结果失效。新增 capability 不得复制一套 DeepSeek 直连路径。

Mastra Studio 只用于 localhost 合成数据调试。目前注册：

- LN-079 当前领域今日总结；
- LN-081 Google Calendar 与今日记录复盘，其中批准步骤可以真实 suspend/resume。

Studio 不读取真实账号、缓存、Supabase 文档或 Google API，也不能作为产品 HTTP 入口或验收替代品。

## 8. 每次迭代只交付一个可验证垂直切片

### 8.1 普通功能

```text
确认一个现有 LN-### 看板项
  → 写清产品准入、退出条件和开放证据
  → Spec Kit 生成/更新 spec、plan、tasks
  → 声明 Change Contract
  → 选择现有 capability 或建立一个最小 capability
  → 实现一个可独立验证的垂直切片
  → 聚焦测试
  → npm run check
  → Returned
  → 独立验收与外部证据
  → Accepted
```

### 8.2 新增普通 API

1. 在 `src/modules/<domain>/<capability>/model.mjs` 定义纯输入、输出和归一化规则。
2. 在 `server.mjs` 处理 HTTP 以外的业务边界；严格拒绝未知字段和超限输入。
3. 只有确实跨 capability 时才把协议放入 `src/shared`。
4. 外部 SDK/Provider 放入 `src/infrastructure`。
5. `src/app/**/route.js` 只选择 runtime、鉴权、限流和 handler。
6. 增加 model、Route Handler、失败路径和结构依赖测试。
7. 若公开接口、长期质量属性或依赖方向改变，同步 `ARCHITECTURE.md`；有替代方案权衡时写 ADR。

### 8.3 新增 AI capability

在普通 API 步骤之外，还必须回答：

1. 为什么本地确定性规则不够。
2. 用户在请求前能看到哪些本地事实、发送字段、数量和长度上限。
3. 哪个动作构成明确确认，取消和离页如何中止。
4. 输入如何匿名化并绑定 `schemaVersion/requestId/target/fingerprint`。
5. 输出 schema、来源 ID allowlist、互斥约束和二次归一化是什么。
6. 结果是只读总结、内存草稿还是可确认 proposal；任何情况下都不得直接写数据。
7. 离线、未配置、超时、限流、非法输出和迟到响应如何零写入。
8. 如何移除 capability 且不影响现有数据、备份和手工路径。

实现时复用 `src/infrastructure/ai/deepseek-execution.mjs` 与 `src/mastra/index.mjs`，不要在业务模块内新增平行模型客户端。

### 8.4 从 `src/lib` 迁移旧模块

1. 先通过调用方、数据所有者和测试确定真实归属。
2. 一次只迁移一个完整调用链，不顺手改行为。
3. 纯业务规则进 `modules`，跨业务纯规则进 `shared`，外部适配进 `infrastructure`。
4. 更新唯一入口、测试和文档，删除旧路径，禁止保留重复实现。
5. 运行结构测试、该调用链聚焦回归和完整门禁。

## 9. 每次实现前先声明 Change Contract

```yaml
work_item: LN-### 或已有 TOOL-###
outcome: 一个用户可观察或架构可验证的结果
write_set:
  - 允许修改的文件或目录
exclusions:
  - 不处理的相邻能力和工作区原有改动
public_contracts:
  - 保持或新增的路由、schema、导出、备份或数据格式
invariants:
  - 账号隔离
  - 离线使用
  - 原始记录不静默改写
  - local-first + revision/CAS
  - 备份兼容
verification:
  - 聚焦单元/接口/浏览器回归
  - npm run check
open_evidence:
  - 本地自动化不能证明的真实账号、Provider、设备或部署事项
```

这个契约属于当前任务计划或回传，不再创建新的平行需求文档。

## 10. 自动化全绿仍不等于外部验收

验证按风险递增：

| 变更 | 最低聚焦验证 | 完整验证 |
| --- | --- | --- |
| 纯 model/schema | 对应 `tests/*.test.mjs` | `npm test`，必要时 `npm run check` |
| Route Handler/鉴权/AI | model + Route + failure-path 测试 | `npm run check` |
| 目录/公开入口/依赖 | `node --test tests/project-structure.test.mjs` | `npm run check` |
| React 交互/移动布局 | 对应 Playwright 场景 + `npm run design:check` | `npm run check` + 真实目标宽度人工复核 |
| PWA/缓存/同步/备份 | 专项 Node/浏览器回归 | `npm run check` + 必要真实账号/离线证据 |

`npm run check` 当前依次执行：

```text
设计规范校验
  → 全量 Node 测试
  → 移动端 Playwright
  → PWA production build / install / offline / persistence / update
  → git diff --check
```

状态含义：

- `Returned`：实现者已完成范围内工作并提供自动化证据。
- `Verify`：控制者正在按验收标准独立核对。
- `Accepted`：自动化、必要人工/真实环境证据和看板记录均成立。
- commit、push、PR、merge、deploy 都是独立动作，不由 `Returned` 或测试通过自动授权。

## 11. 技术债按真实调用链渐进收敛

1. 首页路由入口已收敛为薄 Server Component；`src/app/_components/home/home-page.js` 仍承担较多首页状态编排，应按完整调用链逐步提取，不应一次性重写。
2. `src/lib` 仍包含 records、sync、calendar、reporting 等旧模块；在相关功能变更时按所有权迁移。
3. 前端尚无独立 store；先用状态所有权和性能证据决定是否引入，不以“文件少”作为引入理由。
4. 报告下载仍由旧 `src/lib/report-route.mjs` 拥有，是后续接口分层的明确候选。
5. Mastra 要求 Node `>=22.13.0`，而内部发行仍有 Node 20 约束；运行时升级和独立验收前不能推断内部部署可用。
6. 真实邮箱/Google 登录、双账号 RLS、跨设备 revision 冲突、Provider 内容质量和真实部署必须继续作为外部证据单列。

技术债只描述当前限制，不自动获得优先级。是否实施仍由 `PROJECT_BOARD.md` 决定。

## 12. 按任务类型读取最小上下文

| 要做的事 | 首先阅读 |
| --- | --- |
| 理解当前优先级 | `PROJECT_BOARD.md` |
| 改产品行为 | `product.md` + 对应 `specs/<feature>/` |
| 改目录、依赖、Route 或 AI | `ARCHITECTURE.md` + `docs/decisions/` |
| 改首页/组件交互 | `DESIGN.md` + 页面规范 + 对应 E2E |
| 改记录/同步/账号 | `ARCHITECTURE.md` 6.1、8.4 + account/sync 测试 |
| 新增 AI | 本文第 7、8.3 节 + `ARCHITECTURE.md` 6.3、8.2 |
| 调试 Mastra | `AGENTS.md` Mastra Studio + `src/mastra/index.ts` |
| 准备返回或交付 | `AGENTS.md` Ready and done + `PROJECT_BOARD.md` 验收标准 |

## 13. Context 只在系统地图或迭代框架变化时更新

以下变化必须同步本文：

- 新增或移除顶层代码层、主要数据所有者或外部系统；
- 新增、移除或改变公开页面/API 的责任；
- 新增或移除运行时 AI capability；
- 改变鉴权、持久化、同步或质量门禁主链；
- 改变项目真源层级或标准迭代路径。

只改变任务状态、验收数字或下一步时更新 `PROJECT_BOARD.md`；改变产品承诺时更新 `product.md`；改变技术基线时更新 `ARCHITECTURE.md`；需要保留长期权衡理由时新增或替代 ADR。更新本文时只同步导航和框架，不复制这些真源的全部内容。
