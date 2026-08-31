# Implementation Plan: 静态资源缓存优先

**Board Item**: `[LN-036 Phase 2]` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

已访问过的不可变应用构建资源在网络可用时也直接复用当前离线壳中的副本，减少重复下载；首次访问仍从网络取得并填充缓存。只改变 Service Worker 对同源版本化构建资源的选择顺序，继续绕过 API、认证回调、RSC 和所有账号内容。通过新离线壳版本使旧策略与旧构建资源一次性失效，移除该分支即可回退。

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: 无新增依赖；复用浏览器 Service Worker、Cache Storage、Node 内建测试运行器和现有 Playwright
**Storage and Ownership**: 仅公共、版本化的应用构建资源进入通用离线壳；账号文字仍留在账号隔离 localStorage，附件仍留在按账号命名空间隔离的 IndexedDB，云端文档不变
**Testing**: Node 测试以受控 Service Worker 环境证明命中不触网；Playwright 生产 PWA 回归保持离线、私密响应边界和更新清理
**Target Platforms**: authenticated mobile-first browsers and desktop responsive layouts
**Performance Goals**: 对已缓存的版本化构建资源，在线重复访问 0 次资源网络请求；不增加首页控件、记录步骤或后台网络任务
**Constraints**: local-first、账号隔离、revision 安全、离线可用、备份兼容；缓存不得包含私密或账号派生响应
**Scale/Scope**: 一个同源 Service Worker、一个注册版本常量、一个 PWA 生产回归和一个受控单元测试；不涉及任何记录数量或数据载荷

## Source-of-Truth and Readiness Check

- [x] The board item exists and its intended outcome, dependencies, permissions, acceptance, and
      verification method are clear.
- [x] `product.md` contains the durable offline/PWA and product-admission criteria; this changes no
      user-facing product contract, data boundary, or product scope.
- [x] Visual or interaction work is not in scope; no visual contract changes.
- [x] The current dirty working tree was inspected and the write set avoids unrelated user changes.
- [x] No second writer owns overlapping files or state in this task's declared write set.

## Constitution Check

*GATE: Must pass before implementation design and be re-checked after the design is complete.*

- [x] Core recording steps and the home page's primary job are preserved or improved.
- [x] Authenticated offline use, account ownership, and stale-revision safety are preserved.
- [x] Raw notes are not silently rewritten; all changes are explicit and reversible.
- [x] Privacy, network payloads, credentials, backups, restore, and removal are fully specified.
- [x] Tests are mandatory and cover the acceptance scenarios and relevant failure paths.
- [x] The change is the smallest independently testable vertical slice with no speculative breadth.
- [x] Implementation does not require unauthorized commit, push, publish, deploy, deletion, reset,
      history rewrite, OKR change, or worktree merge.

## Existing System Investigation

### Relevant Code and Contracts

- `public/sw.js`: 预缓存页面壳和本地资产，在线请求目前使用 `fetchAndCache`，仅在网络失败时回退到缓存；已显式排除 API、认证回调和 RSC。
- `src/app/service-worker-registration.js`: 注册带版本参数的 Service Worker；版本变化控制浏览器更新和旧缓存清理。
- `e2e/run-pwa.mjs`: 生产构建中验证安装、已认证离线记录、应用壳、静态脚本、API/RSC/认证缓存边界和受控更新。
- `src/app/log-note-data-provider.js`: 账号隔离 localStorage、本地先写、云端 CAS 同步；不在本项写集。
- `product.md` §“Account-owned offline boundary and recovery”：确认账号数据、图片和云端文档的边界，要求已认证设备保持离线可用。

### Reuse and Compatibility Decisions

复用同一缓存命名规则、应用壳清单、RSC/API/认证排除逻辑和版本升级清理。仅将版本化构建路径改为缓存优先；页面导航和其他静态资源保留当前网络优先、失败回退，以避免将动态或潜在账号相关页面响应当作不可变资源。存储键、附件索引、Supabase RPC、备份格式和 URL 兼容重定向均不变。

## Proposed Design

### Data and Control Flow

1. Service Worker 收到 GET 请求，先保留跨域、API、认证回调和 RSC 的早退出。
2. 若请求是同源、版本化应用构建路径的脚本、样式、字体或媒体，先从当前版本离线壳查找；命中立即返回，不触网；未命中才请求网络，成功后写入同一壳。
3. 页面导航与其余静态资源继续网络优先；网络失败后复用既有离线壳后备，以维持目前的更新和离线行为。
4. 新 Service Worker 激活时保留当前壳、删除旧壳；升级版本常量，确保既有用户切换策略时不复用旧构建资源。
5. 账号记录读取、localStorage 写入、IndexedDB 图片、云端 reconcile 和 CAS 保存完全不经过该新增分支。

### Trust and Privacy Boundaries

无新增服务、网络端点、字段、认证、凭证、日志或遥测。通用离线壳只接收同源公开应用构建资源；匹配前仍排除所有 `/api` 路径、认证回调和 RSC。账号记录、计划、设置、图片 Blob、token 与 Supabase/Google 响应不进入该壳。离线时已缓存构建资源可读，未缓存资源按原有资源失败语义返回失败。

### UI and Interaction Contract *(when applicable)*

无 UI、导航、焦点、触摸、布局或动画变更。未缓存的离线构建资源维持资源失败而非页面 HTML 的错误边界。

## Project Structure and Write Set

```text
public/sw.js                                      # 缓存选择策略与版本
src/app/service-worker-registration.js            # 默认注册版本
tests/service-worker.test.mjs                     # 新受控 Service Worker 单元回归
e2e/run-pwa.mjs                                   # 版本断言与生产 PWA 证据
specs/009-static-cache-priority/                  # 本项规格、计划、测试指引和任务

Explicit exclusions:
src/app/log-note-data-provider.js
src/lib/storage-state.mjs
src/lib/account-sync.mjs
src/app/cloud-document-client.js
src/app/auth/**
src/app/api/**
product.md
PROJECT_BOARD.md
所有既有 `output/`、设计、领域复盘和 Agent 变更
```

**Integration Order**: 单写者先建立失败的 Service Worker 单元契约，再改策略与版本，再更新 PWA 版本断言，最后运行定向和完整门禁。

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract tests: `tests/service-worker.test.mjs` 模拟缓存命中、缓存未命中回填、API/RSC/认证绕过以及离线未命中失败；命中测试须在实现前失败。
- Browser/mobile tests: 无交互改动；现有 `e2e/run-mobile.mjs` 作为完整门禁的一部分。
- PWA/offline/account tests: `e2e/run-pwa.mjs` 保持生产构建、静态资源离线读取、未缓存脚本不回退 HTML、API/RSC/认证不缓存、账号本地持久化和版本清理；更新版本断言。
- Design validation: `npm run design:check` 继续执行以守住完整门禁，即使本项没有视觉改动。
- Full gate: `npm run check`

### Real-Environment or Manual Evidence

不声称新的真实账号、跨设备、OAuth 或部署证据。LN-036 中真实账号、首次云端创建、双设备 revision 冲突与双账号 RLS 的既有人工验收仍保持待验证，本项不会替代它们。

### Acceptance Evidence Handoff

返回单元测试、`npm run test:pwa`、`npm run check` 和 `git diff --check` 的结果；记录 v15 升级、缓存命中无网络、离线资源边界和现有真实会话待验项。由控制者独立核对后才更新 `PROJECT_BOARD.md` 状态。

## Rollback, Removal, and Migration

移除构建资源的缓存优先分支并再次提升离线壳版本即可恢复网络优先策略。没有数据迁移、持久化格式变更或账号缓存清理；所有当前数据与备份保持原样。

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 构建资源缓存优先分支 | 已缓存的不可变资源在线仍先触网，无法提高实际命中率 | 将全部页面改缓存优先可能缓存动态或账号相关响应，风险不被接受 |
