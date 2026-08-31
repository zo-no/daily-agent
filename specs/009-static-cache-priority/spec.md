# Feature Specification: 静态资源缓存优先

**Board Item**: `[LN-036 Phase 2]`
**Feature Directory**: `[009-static-cache-priority]`
**Created**: 2026-08-31
**Status**: Draft
**Input**: User description: "如何优化代码提高缓存率；可以优化一下吧"

> `PROJECT_BOARD.md` remains the only source for priority, dependencies, task state, acceptance,
> and evidence. This feature specification refines one board item and cannot accept it.

## User Scenarios & Testing *(mandatory)*

Automated regression is mandatory for every implemented story. Real-environment or manual evidence
MUST be added when automation cannot prove the acceptance claim.

### User Story 1 - 重复打开时快速取得应用资源 (Priority: P1)

作为已安装或曾使用过 Log Note 的用户，我在网络可用时再次打开应用或切换页面时，浏览器优先复用已验证的不可变应用资源，减少不必要的重复下载，同时继续取得当前页面内容。

**Why this priority**: 它直接改善离线使用前的日常打开和浏览，不增加任何界面、步骤或数据处理，是最小且可独立验证的缓存率优化。

**Independent Test**: 在受控离线壳回归中预先取得一个应用构建资源；网络仍可用时再次请求它，证明直接复用既有副本且没有再次访问网络；生产 PWA 回归继续证明离线时可读取同一类资源。

**Acceptance Scenarios**:

1. **Given** 已缓存的不可变应用构建资源，**When** 用户在网络可用时再次打开或访问它，**Then** 浏览器直接使用已缓存副本，不重新发起该资源的网络请求。
2. **Given** 尚未缓存的不可变应用构建资源且网络可用，**When** 用户首次访问它，**Then** 用户取得有效资源，随后离线时可以读取同一副本。
3. **Given** 接口响应、认证回调、服务端组件数据或账号相关内容，**When** 用户访问这些内容，**Then** 它们不进入离线壳的通用缓存。

---

### Edge Cases

- 缓存中没有目标构建资源且网络不可用时，资源必须正常失败，绝不能返回首页 HTML 或无关内容。
- 新版本发布后，旧版本离线壳必须被清理，避免使用上个构建的资源。
- 账号切换、离线记录、同步冲突、图片 Blob、备份、恢复与导出行为必须保持原样。

## Product Admission *(mandatory)*

### Core-Loop Contribution

改善 `browse → offline use`：已访问过的应用在重复打开、路由切换和网络波动时更快获得应用资源，从而更可靠地进入本地记录界面。

### User Evidence

产品负责人明确提出“优化代码提高缓存率”。现有策略在线时总是先请求网络，已缓存资源仅在网络失败时使用，无法在正常重复访问中形成缓存命中。

### Default Interface and Recording Cost

没有新增控件、页面、提示、字段或模态框。快速记录仍保持打开一次、输入后保存一次的既有路径。

### Offline, Account, Privacy, Reversibility, and Backup

本项只复用公开的、不可变的应用资源；不缓存任何接口、认证、账号数据、记录、计划、图片 Blob、令牌或远程 AI 内容。账号本地缓存、同步、原文、JSON/Markdown/便携附件备份及恢复格式均不变。移除该资源策略并发布新离线壳即可回退，无需迁移数据。

### Verification and Removability

受控离线壳回归覆盖在线重复访问的缓存命中与首次访问回填；生产 PWA 回归覆盖离线读取、未缓存资源的安全失败、接口/RSC/认证不缓存和版本升级清理。完整质量门禁仍为必需项。策略集中在离线壳模块，可独立移除。

### Exit Condition

如果在线重复访问仍出现网络请求、任一账号或私密响应进入通用缓存、新版本可能使用旧资源、离线打开退化，或质量门禁失败，则撤回该策略并保持既有网络优先行为。

### Admission Decision

- **Score**: `18/20` using the rubric in `product.md`
- **Decision**: `mainline candidate`
- **Red-line check**: 不改变原文、不破坏已认证设备离线使用、不跨越已批准的账号边界、不增加记录步骤，且保持备份兼容。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在网络可用时优先复用已缓存的不可变应用构建资源，不为已命中的同一资源额外请求网络。
- **FR-002**: 系统 MUST 在首次成功取得不可变应用构建资源后，使其可在同一离线壳版本内离线读取。
- **FR-003**: 系统 MUST 不把接口、认证回调、服务端组件数据、账号数据、记录、计划、附件、令牌或其他私密响应写入通用离线缓存。
- **FR-004**: 系统 MUST 在资源缺失且网络不可用时返回资源失败，而不是以页面或其他内容替代资源响应。
- **FR-005**: 系统 MUST 在应用版本更新时移除旧离线壳资源，避免新版本引用旧构建资源。

### Invariants and Non-Regression Requirements

- **NR-001**: Raw note content MUST remain unchanged unless the user explicitly edits it.
- **NR-002**: Previously authenticated offline use and account isolation MUST not regress.
- **NR-003**: Supported backup, restore, export, and old-data behavior MUST remain compatible.
- **NR-004**: The existing quality gate MUST remain green.

### Key Entities *(include only when data is involved)*

- **不可变应用构建资源**: 与当前应用版本绑定、无账号内容的脚本、样式、字体或构建媒体；随离线壳版本创建并在后续版本激活后由旧版本清理。
- **通用离线壳**: 同域名下仅保存公开应用页面和静态资源的浏览器缓存；不承担账号数据或网络接口的存储职责。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 对已缓存的不可变应用构建资源，受控自动化回归中 100% 的在线重复访问不发生该资源的网络请求。
- **SC-002**: 对一次成功获取的不可变应用构建资源，生产 PWA 回归中在线首访和离线复访均能返回原始资源类型与内容。
- **SC-003**: 生产 PWA 回归中 100% 保持接口、认证回调和服务端组件数据不进入通用离线缓存，且版本升级后不保留上一离线壳。
- **SC-004**: `npm run check` 和 `git diff --check` 均以退出码 0 完成。

## Scope Boundaries *(mandatory)*

### In Scope

- 仅调整不可变应用构建资源的重复访问缓存策略。
- 增加受控离线壳回归证明在线命中，并保持生产 PWA 对既有安全边界的验证。
- 发布新的离线壳版本以隔离旧策略与新策略。

### Out of Scope

- 缓存接口、认证、RSC、账号数据、Supabase 文档、远程 AI 或 Google Calendar 响应。
- 修改记录持久化、同步、冲突处理、IndexedDB 附件、备份、恢复或界面。
- 引入第三方缓存依赖、遥测、缓存命中上报或通用缓存平台。

## Assumptions and Dependencies

- 应用构建资源具有版本化路径，可在页面或离线壳中被唯一识别。
- 现有生产 PWA 回归可观察缓存内容、离线读取和版本清理；受控离线壳回归可精确观察网络请求；真实账号/跨设备验收仍沿用 LN-036 的既有待验项。
- 当前主工作区写入由本次任务独占；所有已有未提交变更均不在本项写集内。

## Evidence Mapping

| Requirement / Scenario | Planned Evidence | Board Acceptance Link |
| --- | --- | --- |
| FR-001, SC-001 | 受控离线壳回归记录在线重复访问不触网 | LN-036 已认证离线缓存不退化 |
| FR-002, FR-004, SC-002 | PWA 首访回填与离线资源类型/失败边界 | LN-036 PWA 与离线可用 |
| FR-003, SC-003 | PWA 证明 API、RSC、认证回调无缓存匹配 | LN-036 账号与隐私边界 |
| FR-005 | PWA 版本更新后旧缓存不存在 | LN-036 PWA 受控更新 |
| NR-001--NR-004, SC-004 | 完整质量门禁和 diff 检查 | LN-036 非回归要求 |
