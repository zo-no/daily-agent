# LN-076 Rework 12 Design QA — 下移工作区拨杆与明确今日日记导出

## Source, implementation, and normalized state

- Product-owner marked source: `/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-207ce309-c80d-4dc4-9133-e9d7c00cb2c5.png` (`694×1508` physical pixels; its CSS viewport and DPR are not embedded).
- Current 390×844 CSS-pixel implementation at DPR 2: `/Users/kual/Desktop/log-note/output/playwright/ln-076-date-rail-agent-collapsed-viewport-390.png` (`780×1688` physical pixels).
- Focused lower-action evidence: `/Users/kual/Desktop/log-note/output/playwright/ln-076-lower-workspace-export-record-390.png` (`460×268` physical pixels).
- Same-input comparison: `/Users/kual/Desktop/log-note/output/ln-076-rework12/reference-implementation-comparison-390.png` (`1388×1508`). The source stays at native size; the implementation is proportionally reduced to `694px` wide and padded by `6px` at the bottom. Neither side is stretched.
- State: Chinese Diary, September 1, collapsed calendar, Time view, one ordinary Blender note, fixed records, idle Agent, and the lower quick actions visible.

## Findings

No remaining P0, P1, or P2 visual, interaction, accessibility, or data blocker remains in this rework.

- The upper mobile stack now contains only Search, Settings, and Time/Category in Diary; Plan keeps only Search and Settings. The sole Diary/Plan rocker sits in the lower quick dock in both modes.
- Diary places the visible `导出今日日记` action to the left of the existing blue record stamp on one horizontal center line. The label remains one line, both targets are at least `44px`, and Plan hides both Diary-only actions while retaining add-plan.
- Moving one rocker out of the upper stack allows the domain directory to begin `24px` after the remaining complete upper stack instead of preserving the old four-control reserve.
- The first full mobile run found one P2 at `320px`: a transient saved toast crossed the center of the newly widened export action during Agent review. The home toast now sits above the lower dock and ignores pointer input; the focused Agent journey and the final full browser run confirm all right-rail and quick actions remain topmost.
- The existing mode callbacks, current-selected-date Markdown export, record and plan writes, Agent behavior, account ownership, offline cache, synchronization, backup, and payload schemas are unchanged.

## Comparison history and evidence

1. The marked source explicitly moved Diary/Plan from the upper stack to the lower record-action area and added the small `导出今日日记` label beside the blue stamp.
2. The focused regression first failed because one upper workspace rocker still existed. After the markup, CSS, and i18n move, the LN-076 header journey, full rail journey, date picker, day plan, and Diary Agent focused journeys each passed.
3. The source and current implementation were inspected together in the normalized comparison. The relevant date, Time view, ordinary record, fixed fields, lower rocker, export label, and record stamp are visible in both halves.
4. Final isolated validation passed: design specification `11/11`, unit tests `233/233`, browser scenarios `34/34`, PWA production build/installability/authenticated offline cache/persistence/controlled update, and `git diff --check`.

## Final result

passed

---

# LN-076 mobile single-line row gap follow-up

## Source, implementation, and normalized state

- Product-owner source: `/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-bfe4a47f-e9f0-40d2-99df-2d349eb99e2a.png` (`880×1646`).
- Current 390×844 implementation: `/Users/kual/Desktop/log-note/output/playwright/ln-076-row-gap-390.png`.
- Same-height comparison: `/Users/kual/Desktop/log-note/output/playwright/ln-076-row-gap-comparison.png` (`842×844`), with the source on the left and implementation on the right. The source was proportionally reduced to `844px` high; neither side was stretched.
- State: Chinese Diary, one ordinary single-line record, idle Agent, and fixed records below it.

## Findings

No remaining P0, P1, or P2 visual, interaction, accessibility, or data blocker remains in this spacing follow-up.

- The mobile ordinary-record minimum height is `56px` instead of `72px`. At 390px, the rendered row is `56.9px` high and the text-to-rule gap is `13px`, down from the old `28.1px` gap.
- Long text still grows naturally to `134.7px` without clipping. The complete row remains the real button hit target, and the document has no horizontal overflow.
- Typography, copy, colors, the generated hand-drawn divider asset, Agent placement, fixed-record geometry, callbacks, stored data, synchronization, and desktop layout are unchanged.

## Iteration and evidence

1. The product-owner screenshot identified the empty band between `学习了 blender` and its divider as the visible defect.
2. A geometry regression first failed against the old `72px` row with a `28.1px` text-to-rule gap. The CSS change reduced only the mobile ordinary-record minimum height; the same regression then passed at `56.9px` and `13px`.
3. The in-app browser verified quick-record save, the compact single-line row, multi-line growth, full-row hit testing, and zero horizontal overflow at 390×844. The source and implementation were then inspected together in the normalized comparison.
4. The final `npm run check` exits 0: design specification 11/11, unit tests 223/223, mobile browser scenarios 34/34, PWA production build/installability/authenticated offline cache/persistence/controlled update, production build, and `git diff --check` all pass.

## Final result

passed

---

# LN-074 Rework 16 Design QA — 二次确认的最近 7 天 AI 周总结

## Source, implementation, and normalized state

- Product-owner annotated metric/line source:
  `/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-90b4956c-4962-4ee4-8fe1-e2fc8ef3d6a6.png`
- Product-owner compact-selector source:
  `/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-04eb47f7-a6b5-4de8-889c-692661a1e31a.png`
- Current 390×844 successful summary:
  `/Users/kual/Desktop/log-note/output/playwright/ln-074-weekly-summary-final/ln-074-domain-weekly-summary-390.png`
- Same-viewport before/after comparison:
  `/Users/kual/Desktop/log-note/output/playwright/ln-074-weekly-summary-final/ln-074-reference-implementation-comparison-390.png`
- State: Chinese `健康`, 85 current-domain records on one active day, newest 80 sent after explicit
  confirmation, fixed limited-sample marker, two-sentence overview, one theme, no source index.

## Findings

No remaining P0, P1, or P2 visual, interaction, accessibility, privacy, or safety blocker remains in
the scoped feature.

- The page now reads as compact domain selector → selected domain/window → short evidence state →
  truthful line → one ruled optional AI action. Permanent totals, ordinary/periodic bands, record
  index, excerpts, dashboard cards, gradients, and thick shadows are absent.
- The first AI activation is disclosure-only and names domain, seven local dates, subtype totals,
  newest-80 truncation, remote text transfer, and session-only/no-rewrite behavior. Start and Cancel
  are separate 44px controls; Cancel/Stop return focus to the secondary action.
- Success contains one bounded Serif overview and ruled title/one-sentence themes. Re-analysis
  returns to disclosure and sends nothing; there is no provider ID, source ID, excerpt, chat input,
  follow-up, persistence control, or fabricated local fallback.
- The selected domain heading uses ink while blue remains reserved for selection, chart, focus, and
  actions. Meaningful muted/status copy uses the approved darker paper contrast; the 320px theme gap
  remains on the 4px spacing base.
- At 320/390/426/768/1280px, actions remain at least 44px, long copy stays contained, the selector
  owns horizontal scrolling, and the document has no horizontal overflow. Reduced motion removes
  nonessential transitions.
- Invalid local time, late response-body timeout, forged/duplicate IDs, overlong output, diagnosis,
  causal claims, scoring, advice, and common Chinese/English investment actions/forecasts are
  rejected before display. Domain/account/locale/page changes invalidate transient results.

## Iteration and evidence

1. The owner removed duplicate metric bands, selected a straight line, tightened the top rhythm, and
   requested one current-domain seven-day AI synthesis without chat.
2. Spec Kit separated the local `LN-010 Phase 1` line from the confirmed, removable
   `LN-074 Rework 16` remote boundary.
3. Focused model/route/provider tests pass; focused Playwright passes the two-step request, exact
   whitelist, 80-record bound, abort/stale/error paths, five widths, 44px controls, focus, and zero
   writes. The independent local-line scenario also remains green.
4. PWA production validation keeps `/insights` and the local line available offline while the remote
   action fails honestly. Design specification validation passes 11/11.
5. The final integrated `npm run check` exits 0: design specification 11/11, unit tests 202/202,
   mobile browser scenarios 31/31, PWA production build/installability/authenticated offline
   cache/persistence/controlled update, and `git diff --check` all pass.
6. The normalized comparison confirms that the current page removes the source design's repeated
   totals and index while preserving paper, hairlines, blue ink, Serif/Mono hierarchy, and a readable
   one-glance result.

## Final result

passed (including the final integrated repository-wide gate)

---

# LN-010 Phase 1 Design QA — 紧凑领域折线与按需日期详情

## Source, implementation, and normalized state

- Product-owner source capture:
  `/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-433288a2-7418-44d9-a6d1-3bbb776f5236.png`
- Current implementation capture:
  `/Users/kual/Desktop/log-note/output/playwright/ln-010-interactive-line-final/ln-010-domain-insights-health-390.png`
- Same-input comparison:
  `/Users/kual/Desktop/log-note/output/playwright/ln-010-interactive-line-final/ln-010-reference-implementation-comparison-390.png`
- Full responsive evidence:
  `/Users/kual/Desktop/log-note/output/playwright/ln-010-interactive-line-final/ln-010-domain-insights-390.png`
  and `ln-010-domain-insights-1280.png` in the same directory.
- State: Chinese `健康` domain, six records on one active date, 30-day line, selected-day detail
  closed. The source was captured at `386×838 CSS px` / `772×1676` physical pixels; it was
  normalized to the implementation's `390×844 CSS px` / `780×1688` physical pixels at density 2
  only for the side-by-side input. The implementation image itself was not stretched.

## Findings

No remaining P0, P1, or P2 visual difference blocks the selected product direction.

- The old permanent record/active-day band, ordinary/periodic band, repeated three-date caption,
  week comparison, record index, and generic reflection copy are absent. The domain-tab count is
  the only persistent total.
- The reading order is compact and stable: page title → left-aligned domain tabs → `健康 · 最近30天`
  → one short evidence state → one truthful straight line. Mobile tab-to-heading spacing is 20px;
  desktop is 24px.
- A single active day now forms one real zero→peak→zero polyline rather than a vertical point stack.
  Two weak horizontal guides, one zero line, and only start/middle/end dates keep the plot legible.
- Pointer/touch selection and the single keyboard focus reveal an exact two-line daily detail.
  Repeat selection or Escape closes it; arrows/Home/End move by calendar day. The detail is DOM text
  in a polite live region, not 30 hidden buttons.
- Empty investment and ordinary domains keep a neutral zero line/no-record state. Investment
  domains retain only the fixed non-advice boundary without coverage, a prompt, or sources.
- At 320/390/426/768/1280px, the document has no horizontal overflow, controls remain at least
  44px, long labels remain inside the self-scrolling tab strip, focus is visible, and reduced motion
  removes nonessential transitions.

## Iteration history

1. The user rejected the text-heavy source layout and then identified repeated metrics, a false
   point-stack rhythm, and oversized top spacing.
2. Spec Kit separated the local interactive line (`LN-010 Phase 1`) from future remote AI and added
   the per-day subtype invariant plus single-focus interaction contract.
3. New unit tests failed on missing `ordinaryCount/periodicCount`; the model was extended and all 12
   focused analytics tests passed.
4. The Canvas was redrawn as a straight 30-point line, permanent bands were removed, and focused
   Playwright verified pointer, keyboard, Escape, empty investment, five widths, payload immutability,
   and 5,000-record performance: 1/1 scenario passed.
5. The source and final implementation were normalized into one comparison input and inspected
   together. No additional layout correction was required before the optional AI section is added.

## Final result

passed

---

# LN-076 Rework 3 Design QA — 常驻多状态 Agent 活动区

## 对照目标与范围

- 产品负责人批注态缺失截图：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-b3410cbd-b56e-449f-9148-4544b9588647.png`
- 产品负责人活动区标注截图：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-0f91d803-6acd-4505-918a-eedebb26c12c.png`
- 当前闲置实现：`/Users/kual/Desktop/log-note/output/ln-076-agent-stage-book/ln-076-responsive-home-390.png`
- 当前审查实现：`/Users/kual/Desktop/log-note/output/ln-076-agent-stage-diary/ln-074-agent-review-zh-390.png`
- 四图同输入对照：`/Users/kual/Desktop/log-note/output/ln-076-agent-stage/ln-076-agent-comparison-390.png`
- 其余状态证据：`ln-074-agent-scanning-390.png`、`ln-074-agent-complete-390.png`，位于同一 Diary 专项输出目录。

对照图按 `390×844 CSS px` 统一归一化：左上是用户指出的 reviewing 缺失，右上是当前 reviewing 常驻；左下是用户框定的闲置活动区，右下是当前 idle 书脊姿态。实现截图由 Chromium 在 `deviceScaleFactor: 2` 下捕获。

## Findings

没有剩余可执行的 P0、P1 或 P2 差异。

- 常驻性：旧实现进入具体问题后隐藏 Agent 并把槽压为 `0`；当前 `idle/scanning/reviewing/complete` 四态均使用同一挂载点和独立本地姿态，reviewing 与 complete 仍可见。
- 活动区：普通记录末尾到固定记录起点的纸面区与右侧书脊现在由 `.organize-helper-slot` 明确拥有。移动端 reviewing 高度为 `152px`，普通记录到活动区、活动区到固定台账的边界可测，不再是无法解释的空带。
- 状态动作：idle 从装订边探头；scanning 使用横向伸展形态并在专属区内往返；reviewing 使用思考姿态停在纸面右半区；complete 用抱住装订线的收束姿态回到边缘。`prefers-reduced-motion` 取消运行中动画并保留各态确定落点。
- 内容与控件避让：首次 reviewing 浏览器图暴露一个 P2——姿态右缘压入固定 Diary/Plan 操作带。修正后移动端 resting X 位移为约 `-108px`，320/390/426px 自动几何证明对记录、行内批注、固定字段、领域目录、顶部工具及底部 Diary/Plan/导出/新增操作的重叠不超过 `1px²`。
- 图像质量：三张 ImageGen 原始输出虽视觉显示棋盘格，却实际为 RGB 烘焙背景。没有直接接入；按近白背景提取真实 alpha、裁切有效线稿并归一化为 `320×200`、`240×200`、`160×416` RGBA PNG。每张小于 `100KB`，无白底、黑底、光晕、文字、符号或额外角色。
- 视觉层级：全部姿态沿用低对比石墨灰，不增加卡片、阴影、第二强调色或左侧说明。reviewing 位于纸面右半区但不抢过 `16px` 原始记录正文；complete 与完成文案分工清楚。
- 架构边界：形象注册表只解析本地 `role → state → asset`，未知角色/状态仍回退到默认 idle。按钮、Agent 行为、写入确认、账号、离线、同步、备份、导出与 Plan Agent 没有新增形象字段或行为分支。

## Comparison History

1. Rework 2 视觉验收通过了 idle 书脊探头，但产品负责人随后用真实 reviewing 截图证明两个遗漏：Agent 在批注激活时消失，且大段纸面与书脊没有成为活动范围。本轮将 LN-076 从验证中退回进行中，没有创建重复板项。
2. 测试先行准确失败于缺少 `reviewing` 状态及三张状态资源；四态注册表与 RGBA 资源接入后，`tests/agent-appearance.test.mjs` 3/3 通过。
3. 首轮 Diary 浏览器回归准确发现旧断言仍要求 active gap 只有 `12–16px`；契约改为“`152px` 活动区 + `12px` 区块间距”后通过。
4. 同轮视觉检查发现 reviewing 与 Diary/Plan 固定操作带相撞；姿态左移并把操作带、目录和右轨纳入保护集合后，专项复测 1/1 通过。
5. Book-page 专项 1/1 通过：idle 仍从装订线探头，320/390/426/768/1280px 无横向溢出，活动区不覆盖普通或固定记录。

## Implementation Checklist

- [x] `idle/scanning/reviewing/complete` 四态各自使用本地透明 PNG。
- [x] reviewing 与 complete 不再隐藏；active activity stage 不再折叠。
- [x] 320/390/426px 活动区、内容和右侧操作避让有自动几何断言。
- [x] 44px 入口、可访问名称、未知状态回退与数据/备份隔离保持不变。
- [x] reduced-motion 取消 Agent 运行中动画并保留确定姿态。
- [x] 产品负责人参考与实现状态已放入同一对照输入并完成目视检查。
- [x] 设计规范 11/11、形象单测 3/3、Diary Agent 专项 1/1、book-page 专项 1/1 通过。
- [x] 完整 `npm run check` 退出 0：设计规范 11/11、单测 170/170、浏览器 25/25、PWA production build/installability/authenticated offline/persistence/update、生产构建与 `git diff --check` 全部通过。

## Open Questions

- 无阻断问题。未来开放自定义形象仍需单独决定来源审核、隐私、离线缓存、跨设备同步与备份兼容；本轮只保留可替换注册表，不暴露选择器或持久化字段。

## Follow-up Polish

- 无必须跟进的 P3。若真实使用后希望 Agent 更活泼，应优先调整现有四态的速度与落点，不扩大活动区、不增加自动写入，也不把形象变成全局浮层。

## LN-076 Rework 4 Design QA — 分类章节与单一道分隔

### 对照目标与范围

- 产品负责人 390px 标注源图：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-e5a4a176-ba4a-4b99-b1bd-689edb8e4aa4.png`
- 同状态实现图：`/Users/kual/Desktop/log-note/output/ln-076-category-chapters/ln-076-category-chapter-390.png`
- 同输入并排对照：`/Users/kual/Desktop/log-note/output/ln-076-category-chapters/ln-076-category-chapter-comparison-390.png`
- 响应式实现图：同目录下 `320 / 390 / 426 / 768 / 1280` 五档截图。

源图与实现图在并排输入中统一为 `768×1684px` 可见区域；左侧保留用户红框，右侧是修正后相同中文分类状态。测试数据包含“健康 / 身体指标”“作息与恢复”和“学习 / 学习记录”，因此同时覆盖首分类、后续分类和相邻领域边界。

### Findings

没有剩余可执行的 P0、P1 或 P2 差异。

- P2（已修正）标题像后台分组：旧版把 `健康` 和 `身体指标 0/5` 堆为两个宽松区块。当前仍保留独立 `h2` / `h3`，但以 `29px Serif 领域 / 17px Sans 分类 / 12px Mono 进度` 组成同一条章节线；领域仍为主视觉，分类和进度保持可辨识但不争抢。
- P2（已修正）重复横线：旧版“睡眠”末行分隔后，下一领域前又出现一条等权横线。当前只保留“睡眠”所属行的末端手绘线，再以约一个区块节奏进入“学习”，不再制造无内容空带。
- 后续分类：`作息与恢复 0/1` 继续作为明确的次级标题，不因首分类紧凑化而被吞并或误归属。
- 阅读轴：指标、值和普通记录继续沿用原开放纸面栅格；没有新增卡片、圆角、阴影、颜色或装饰资产。`健康 → 身体指标 → 晨重/值` 和 `学习 → 学习记录 → 记录` 的语义顺序与视觉顺序一致。
- 交互与响应：周期输入仍为真实原地输入且命中高度不少于 `44px`；320/390/426/768/1280px 无横向溢出，长章节线允许安全换行；右轨目录、Agent、日记/计划和记录印章轴未改。
- 数据边界：实现只调整分类视图 DOM 分组与 CSS。领域、分类、排序、记录、周期填写回调、时间视图、账号、离线、同步、备份和导出均未改变。

### Comparison History

1. 旧实现准确复现了用户指出的两个问题：双层大标题占据过重，且睡眠末行与学习领域起点之间出现两条手绘线。
2. 新增浏览器回归先在旧 DOM 上失败于缺少 `data-domain-chapter-line`，证明用例能够拦截未实现状态。
3. 首轮实现后，旧层级回归暴露两处过时假设：分类必须比指标大至少 2px、下一领域间距从首分类末行计算。断言改为检验真实层级（字号 + 字重）并从领域最后一行计算边界；实现本身未为通过测试而增加空白。
4. 修正后两条定向回归各 1/1 通过；同屏对照显示标题压缩与重复横线消除均直接回应红框问题。

### Implementation Checklist

- [x] 领域与首分类保持独立标题语义，并组合为紧凑章节线。
- [x] 后续分类和周期进度继续明确显示。
- [x] 相邻领域之间只有上一末行的一道可解释分隔。
- [x] 320/390/426/768/1280px 无横向溢出，周期输入不少于 44px。
- [x] 用户源图与实现图已放入同一并排输入并完成目视检查。
- [x] 定向新增回归与既有分类层级回归均为 1/1 通过。
- [x] 完整 `npm run check` 退出 0：设计规范 11/11、单测 170/170、浏览器 26/26、PWA production build/installability/authenticated offline/persistence/update、生产构建与 `git diff --check` 全部通过。

### Open Questions

- 无阻断问题。分类名称异常长时沿用自然换行；若真实内容证明一行过密，应只调整章节线换行阈值，不恢复堆叠式双标题或重复边界。

### Follow-up Polish

- 无必须跟进的 P3。本轮刻意不改字段行、右轨或 Agent，避免把局部排版反馈扩成另一轮视觉重做。

final result: passed

## LN-074 Rework 17 Design QA — Plan Agent 被动常驻

### Evidence

- 仅 Google 日程，390px：`output/playwright/ln-074-plan-agent-persistent/google-only-390.png`。
- 空计划，320px：`output/playwright/ln-074-plan-agent-persistent/empty-320.png`。

### Findings

没有剩余可执行的 P0、P1 或 P2 差异。

- Agent 在空计划、仅 Google 日程和有本地计划三种 Plan 状态中都保持可见。
- 无可编辑本地计划时，角色不可交互，只显示一行 `12px` 弱提示“编写计划后和我聊聊吧”；页面不渲染唤醒按钮，也不发起 `/api/organize/agent` 请求或写入计划。
- 320px 中文提示不换行，页面无横向溢出；角色与文字不遮挡新增按钮、右轨或计划块。390px 仅 Google 日程继续显示只读事件。
- 有本地计划时，既有“检查这一天的计划”、扫描、对话和显式更新流程保持不变。
- 聚焦 Plan Agent E2E 为 `1/1`；完整 `npm run check` 退出 0：设计规范 `11/11`、单测 `202/202`、移动浏览器 `31/31`、PWA 与 `git diff --check` 全部通过。

### Open Questions

- 无实现阻断。产品负责人仍需查看 320/390px 截图并确认被动文案与角色的视觉权重。

final result: passed

## LN-076 Rework 8 Idle Hint Follow-up — “拍一拍，分析日记”

### Findings

没有剩余可执行的 P0、P1 或 P2 差异。

- 有记录日的 idle 态在角色正下方显示两行 `12px` 弱墨提示；中文经 sigo 收缩为“拍一拍，分析日记”，英文同步收为 “Tap to review”，可访问名称与可见动作一致。
- 提示盒由 `80px` 收到 `52px`，并向书脊外侧收拢 `2px`；`320/390/426/600/700/768/1280px` 几何回归要求提示与记录字形重叠不超过 `1px²`，不再侵占记录区。
- 提示与角色共用 traveler，但不扩大真实按钮、不占文档流。移动安全高度从角色的 `80px` 扩为含提示的 `116px`，巡游距离同步扣减，因此提示在最低点也不会进入导出/新增区。
- 空白日不显示分析邀请；月历展开、scanning、reviewing 和 complete 也立即隐藏，避免承诺不可执行动作或与分析反馈竞争。
- 390px 视觉证据为 `output/playwright/ln-074-agent-idle-390.png`。提示弱于 `16px` 原文、没有卡片边界，完整落在正文线尾之外并贴近角色与书脊。
- 聚焦 Agent 场景 2/2 通过；完整 `npm run check` 通过设计规范 `11/11`、单测 `203/203`、浏览器 `31/31`、PWA production build/installability/authenticated offline cache/persistence/controlled update、生产构建与 `git diff --check`。

### Open Questions

- 本轮只确认 idle 提示；T073 的四态 live 动效与 14 天长期偏好仍由产品负责人观察，不由这张静态截图替代。

final result: passed

## LN-076 Rework 5 Design QA — 日期主标题、统一右轨与零流高 Agent

### 对照目标与归一化

- 展开态产品负责人标注源图：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-af98e9d0-1c4c-49b0-a75c-d6ea2a661b1a.png`（`924×1720px`，包含实现画布与标注）。
- 收起态产品负责人局部源图：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-f664723c-bc00-4482-adb8-c88e7ea591ac.png`（`794×704px`，聚焦 Agent 与双横线）。
- 实现收起态：`/Users/kual/Desktop/log-note/output/playwright/ln-076-date-rail-agent-collapsed-viewport-390.png`（`780×1688px`，`390×844 CSS px`，`deviceScaleFactor: 2`）。
- 实现展开态：`/Users/kual/Desktop/log-note/output/playwright/ln-076-date-rail-agent-expanded-viewport-390.png`（`780×1688px`，`390×844 CSS px`，`deviceScaleFactor: 2`）。
- 同输入对照：`/Users/kual/Desktop/log-note/output/ln-076-date-rail-agent/comparison-390.png`（`1660×998px`，四个 `390×844 CSS px` 面板）。

源图不是一套无标注的同尺寸设计稿：展开图带画布边缘，收起图本身是局部裁切。因此本次把源图按可见工作区宽度归一到 `390px` 并保持顶部对齐，用于判断用户明确标注的结构关系；字号像素不做伪精确比较。两个实现状态均由相同 Chromium、同一中文数据、同一 `390×844` 视窗和 `2x` 密度捕获。四联图中的展开源图与收起局部源图同时承担重点区域证据，因此无需另造放大裁切。

### Findings

没有剩余可执行的 P0、P1 或 P2 差异。

- 字体与层级：日期恢复为左侧最大 Serif 身份，星期为次级弱色 Sans；“时间/分类”和“日记/计划”缩为右轨中的单按钮标记，不再与日期争抢页面标题。`记录` 与正文、时间 Mono 的既有层级未改。
- 间距与布局：Agent 挂载点为 `0px` 高并位于完整日期上下文之后；收起态不再留出独立空白舞台，展开态先完整结束月格再出现 Agent。最后一条普通记录拥有唯一水平过渡线，固定记录区不再补画第二条线。
- 右轨与响应：日记为“搜索 → 时间/分类 → 日记/计划 → 设置”，计划为“搜索 → 日记/计划 → 设置”；每项至少 `44px`，底部无重复工作区切换。目录标签布局使用至少 `12px` 间距。`390–700px` 月格以横向间隙避开工具；`<390px` 不透明月历把内部顶距扩到完整四工具列之后。
- Agent 图像质量与状态：继续使用真实本地透明石墨 PNG，不使用 CSS 图形、内联 SVG、emoji 或占位形象。`idle/scanning/reviewing/complete` 各有独立姿态；idle/complete 的内置竖线在 `2px` 内并入唯一书脊。扫描/审查的画面可变化，但真实 `44px` 热区保持静止，避免移动按钮造成无法停止。
- 色彩与材质：纸张、主墨、弱墨和书写蓝继续映射既有 token；没有新卡片、渐变、第二强调色、厚边框或悬浮阴影。右轨图标仍属于同一手绘资源家族。
- 文案与可达性：日期标题直接承担“打开/关闭月历”，Escape 回焦同一标题；两个单按钮通过可访问名称和 `current → next` 意义表达切换，不依赖颜色。日记、计划、搜索、设置、快速新增与导出语义未改变。

### Comparison History

1. 初始标注源图确认三个 P1/P2 问题：Agent 固定在展开月历内、角色竖线与书脊形成双线、日记/计划脱离搜索与设置；局部源图还确认普通/固定交界有双横线。
2. 第一轮实现把 Agent 改成日期后的零高度挂载，并统一上方工具轨；自动几何证明月历、正文、字段、目录和工具无重叠，但完整回归暴露旧测试仍要求第二条横线与屏幕外缘 Agent，测试契约已按当前设计事实收敛。
3. Agent 全状态回归发现一个真实 P1：`reviewing` 动画移动了按钮本体，Playwright 与用户都可能追不上“停止”热区。修正为状态只改变画面、真实按钮固定；Diary Agent 与 Smart Organize 专项随后各 `1/1` 通过。
4. 日期专项发现一个 P2：320–389px 的第四个顶部工具使 Settings 覆盖第一行月格。窄屏不透明月历内部顶距改为 `84px`，随后 `320/360/361/389/390/426/600/671/700/768/1280` 日期/计划专项通过。
5. 修正后的四联同输入对照显示：展开月历中不再出现 Agent，收起态书脊只有一根光学轴，普通/固定之间只有一道横线，工作区切换已进入上方右轨。聚焦 LN-076、book-page、首页右轨、日期、Diary Agent 和 Smart Organize 回归均通过。

### Implementation Checklist

- [x] 左侧日期/星期是唯一月历触发器，右轨无独立 Calendar。
- [x] 日记和计划均使用一个上方工作区切换按钮，底部无重复控件。
- [x] Time/Category 与 Diary/Plan 均一击切换并保留 `44px` 目标。
- [x] Agent 零流高、跟随完整日期上下文、四态常驻且真实点击区不移动。
- [x] 角色内部竖线并入唯一书脊；普通/固定边界只保留一道横线。
- [x] 320–1280px 无横向溢出；窄屏月历清除四项工具碰撞。
- [x] 源图与实现已放入同一比较输入并完成字体、间距、色彩、图像、图标、文案、状态、响应与可达性检查。

### Open Questions

- 无阻断问题。用户源图是标注后的当前实现而非无标注高保真稿，因此本轮以结构关系、交互归属和实际碰撞为验收真相，不把标注框、裁切边缘或源图缩放差异当作视觉目标。

### Follow-up Polish

- P3：若长期使用后仍觉得右侧目录文字密度高，可只调整目录自动锚定的视觉间距；不得恢复底部日记/计划、第二书脊或 Agent 空白舞台。

final result: passed

## LN-076 Rework 7 Design QA — 记录编辑器的书写优先层级

### 对照目标与归一化

- 产品负责人原始截图：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-142f74da-f4ba-4318-8482-ff7b41c0e7eb.png`。
- 实现收起态：`/Users/kual/Desktop/log-note/output/playwright/ln-076-composer-rework7/ln-076-composer-rework7-closed-zh-390.png`。
- 实现展开态：`/Users/kual/Desktop/log-note/output/playwright/ln-076-composer-rework7/ln-076-composer-rework7-expanded-zh-390.png`。
- 实现危险操作态：`/Users/kual/Desktop/log-note/output/playwright/ln-076-composer-rework7/ln-076-composer-rework7-danger-zh-390.png`。
- 响应式证据：同目录下 `320 / 390 / 426 / 768 / 1280` 五档截图与 `ln-076-composer-rework7-evidence.json`。

原始截图为约 `390px` CSS 宽度的移动端展开态；实现图统一使用 Chromium、`390×844 CSS px` 与 `deviceScaleFactor: 2` 捕获，并保留相同的中文正文和编辑上下文。审查重点是用户指出的记录 UI：书写面是否仍为主任务，以及次级信息、附件和删除是否形成可理解的层级。

### Findings

没有剩余可执行的 P0、P1 或 P2 差异。

- 书写层级：关闭“更多”时正文继续占据主要纸面；展开时移动端书写面压缩为 `184–236px` 的稳定工作区，不再让大段空白把日期、分类、附件和完成动作推到视窗之外，也没有增加保存步骤。
- 信息结构：展开面依次为“日期/时间/分类/标签 → 图片 → 删除记录”。元数据保留紧凑表单，附件以独立边界承接，删除落在末端危险区，不再与常规编辑字段混成一个长表单。
- 窄屏适配：首轮 320px 图暴露原生时间输入右侧被裁切；`≤350px` 后日期和时间改为单列，320/390/426/768/1280px 均无内部或页面横向溢出，所有可操作控件高度至少 `44px`。
- 状态与可达性：“更多”暴露稳定的 `aria-controls` 目标并用 `aria-expanded` 表示开合；详情节点在折叠时仍存在且为 `hidden`。键盘焦点使用纸张左侧 `3px` 蓝色页边标记，不以整块硬质蓝框破坏纸页质感。
- 视觉语言：继续使用既有纸张、墨色、弱墨和书写蓝 token；顶部栏采用不透明纸面避免正文滚动穿透。没有新增卡片、阴影、渐变、装饰图形或第二强调色。
- 动效与数据边界：展开/收起尊重 `prefers-reduced-motion`。正文、日期、时间、分类、标签、图片、保存、删除确认、账号隔离、离线同步及备份字段与回调均未改，中文原文逐字保存。

### Comparison History

1. 新增浏览器回归先准确失败于“更多”缺少 `aria-expanded`，证明旧展开态没有可编程状态。
2. 首轮结构和样式实现后，320px 截图及内部几何断言发现原生时间控件溢出约 `26.8px`；日期/时间在超窄屏堆叠后，五档响应式证据均为零溢出。
3. 首轮键盘图发现 textarea 出现整块硬质蓝色焦点矩形；焦点改为书页左侧页边标记后，真实 Tab 导航与 `2px` 可见焦点契约通过。
4. 语义复核发现折叠态 `aria-controls` 指向的节点未挂载；详情区改为稳定挂载并使用 `hidden` 后，折叠与展开状态均通过。
5. 最终独立视觉与代码复核确认：书写优先、危险区隔离、附件边界、桌面双列和 320px 单列均无阻断或高优先级问题。

### Implementation Checklist

- [x] 收起态保持快速记录的一步打开、输入后一步完成，不新增必填项。
- [x] 展开态保留至少 `184px` 书写面，并将次级信息放在清晰的详情层。
- [x] 元数据、附件和删除按信息风险顺序分区，删除仍需既有确认。
- [x] 320/390/426/768/1280px 无横向溢出，交互控件不少于 `44px`。
- [x] “更多”的名称、展开状态、控制目标、键盘焦点和 reduced-motion 均有自动断言。
- [x] 新增编辑器专项、线性新增/搜索/编辑/删除、Markdown 与图片附件回归通过。
- [x] 单元测试 `180/180`、设计规范 `11/11`、独立 PWA production build/installability/authenticated offline/persistence/update 通过。
- [ ] 共享完整门禁尚未全绿：本轮完整移动浏览器为 `23/29`，6 项失败均属于并行中的 Agent、首页右轨、日期布局或 Domain Insights 契约；LN-076 Rework 7 保持 Returned/进行中，不据此标记 Accepted。

### Open Questions

- 无编辑器范围内的阻断问题。仍建议产品负责人直接查看 390px 中文展开态；若后续真实长文证明 `236px` 过紧，应只调整展开态书写高度上限，不恢复整页长表单。

### Follow-up Polish

- 无必须跟进的 P3。本轮不引入模板、自动改写、云端图片迁移或新的记录字段，避免把局部编辑体验扩成产品范围变化。

final result: passed (LN-076 Rework 7 scoped design review; shared repository gate pending unrelated active work)

## LN-010 Phase 1 Design QA — 本地领域趋势与轻量复盘

> Historical pre-rework baseline. The current compact line and fixed investment boundary are
> documented in the leading LN-010/LN-074 sections; references below to visible sources, coverage,
> or a prompt are superseded and are not claims about the current UI.

### 对照目标与归一化

- 产品负责人 390px 标注源图：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-d3b4db10-b129-4ace-ad28-b7dd0db25647.png`（`918×1378px`）。
- Codex 内置浏览器生产态首页：`/Users/kual/Desktop/log-note/output/playwright/ln-010-design-qa-final/ln-010-iab-home-entry-production-390.jpg`（`390×689 CSS px`）。
- 同视窗并排对照：`/Users/kual/Desktop/log-note/output/playwright/ln-010-design-qa-final/ln-010-home-reference-comparison-390.png`（`780×689px`；左为源图工作区、右为实现）。
- Codex 内置浏览器生产态复盘页：`/Users/kual/Desktop/log-note/output/playwright/ln-010-design-qa-final/ln-010-iab-insights-production-390.jpg`。
- 完整移动/桌面复盘证据：`/Users/kual/Desktop/log-note/output/playwright/ln-010-domain-insights-focused/ln-010-domain-insights-390.png` 与 `ln-010-domain-insights-1280.png`。

源图把可见应用工作区 `780×1378px` 等比归一为 `390×689 CSS px`；实现由同尺寸内置浏览器生产构建捕获。源图右轨红框表达“当前领域旁增加入口”，不是需要复制的红色视觉资产。实现保留一根书脊轴和原目录语义，并把独立复盘入口做成真实 `44×44px` 目标。

### Findings

没有剩余可执行的 P0、P1 或 P2 视觉、交互或可达性差异。

- 字体与层级：复盘页沿用 Log Note 的 Serif 页面身份、Sans 正文与 Mono 日期/计数。页面顺序稳定为“日期范围 → 领域 → 领域选择 → 记录节律 → 趋势图 → 一条观察 → 投资记录复盘（适用时）→ 近期依据”，没有卡片墙或多重同级大标题。
- 间距与布局：首页仍以记录为主任务。移动端仅当前领域出现一个独立入口，领域滚动按钮与入口各自为 `44×44px`，水平间隔 `4px` 且命中区零重叠；普通目录节点、活动节点与书脊中心一致。320/390/426/768/1280px 均无横向溢出，长中英文领域名和来源摘录可安全换行。
- 色彩与材质：纸张、主墨、弱墨和书写蓝完全复用现有 token；折线只用一处书写蓝并同时提供方向文字和文本摘要，不依赖颜色传达状态。没有新增渐变、厚边框、浮层阴影或第二强调色。
- 图像与图标：首页入口使用真实本地透明手绘资源 `public/ui/diary/rail-insights.png`，与既有目录节点、焦点笔触和书脊素材同属低对比纸笔语言；没有 emoji、CSS 图形、内联 SVG 或占位框。源图把当前标签和待加控件都放在轴线右侧，但两个完整 44px 目标会重叠；实现将活动标签置于轴线左侧、入口置于右侧，保留一眼可见的邻近关系与完整触控安全。
- 文案与内容：中文/英文均直接说明 30 天范围、证据门槛和来源。证据不足时显示“暂不判断方向”；投资类领域只统计决策理由、结果回看与风险边界的记录覆盖，并始终显示“这里只复盘记录内容，不构成投资建议”，不生成买卖、标的、价格、时机、仓位或收益判断。
- 状态与交互：当前领域变化会移动唯一入口；点击进入带领域参数的 `/insights`，返回仍到记录页。空、证据不足、可判断、未知 query 回退、空投资领域、损坏本地数据保护、键盘焦点、reduced-motion、来源精确回链和直接离线路由均有自动覆盖。Canvas 具有 `role=img`、本地化 `aria-label` 和可见等价摘要。
- 隐私与性能：页面只读当前账号本地状态，不发送分析 API/外部请求、不持久化派生文本、不改原始 payload。5,000 条记录的模型计算与首屏渲染都严格在 1 秒预算内；生产内置浏览器实测当前样本 `model 0.80ms / render 5.50ms`。

### Comparison History

1. 首轮静态审查发现空投资领域仍会解引用 `null`，已改为稳定的三项零覆盖结构并补单元/浏览器回归。
2. 首轮右轨实现把活动标签、节点和复盘入口挤在同一列；最终收敛为两个零重叠的 44px 目标、4px 间隔和同一书脊轴。完整首页右轨与 LN-076 Agent 几何回归均通过。
3. 长领域名、长来源和单字符领域按钮分别暴露换行与最小宽度风险；标题、导航、摘录均允许断词，全部复盘控件在五档视窗都达到 44px。
4. 性能回归最初把整次开发导航误算进首屏渲染；计时边界改为“派生开始到首次效果”后仍保留严格 1 秒标准，5,000 条合成记录通过。
5. 最终同输入对照确认入口仍紧邻当前领域、书脊和记录正文没有被新增控件打断。内置浏览器在新标签页加载生产 `/insights?domain=trading-domain`，控制台为零日志/零错误，真实中文不足证据态、投资边界、来源回链和 44px 控件均可见。

### Implementation Checklist

- [x] 当前领域旁只有一个独立复盘入口，不增加快速记录步骤。
- [x] 30 天记录数、活跃日、普通/周期拆分、折线与来源逐项可核对。
- [x] 空/不足/可判断/损坏恢复状态均保持可用且不夸大结论。
- [x] 投资复盘只评估记录覆盖并持续显示非投资建议边界。
- [x] 320/390/426/768/1280px、长字符串、44px、键盘与 reduced-motion 通过。
- [x] 当前账号本地只读、零分析网络请求、原始 payload 逐字不变、PWA 直达离线通过。
- [x] 设计规范 `11/11`、单元测试 `182/182`、浏览器 `30/30`、PWA production build/installability/authenticated offline cache/persistence/controlled update、生产构建和 `git diff --check` 全部通过。
- [x] 源图、首页生产截图、复盘生产截图与同视窗比较输入已完成目视检查。

### Open Questions

- 无设计或实现阻断。看板要求的 14 天真实使用、至少两次主动打开及“至少一条来源可追溯提示有用且不误导”仍是产品验收观察项，不由合成数据或自动化替代。

### Follow-up Polish

- Phase 1 刻意不加入远程 AI、行情、持久化洞察、实验或自动建议。只有 14 天真实使用证明本地只读复盘有用后，才按 LN-010 Phase 2 与 LN-007/008/009 的架构、隐私和数据模型闸门继续。

final result: passed

## LN-076 Rework 8 Design QA — 旧形象、单书脊与慢速常驻巡游

### 对照目标与归一化

- 产品负责人旧形象与活动范围参考：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-843c0956-2e4c-4fba-b336-071b52d026fb.png`。
- 最终 390px 实现：`/Users/kual/Desktop/log-note/output/playwright/ln-076-agent-rework8-directory-proof/ln-076-date-rail-agent-collapsed-viewport-390.png`。
- 月历紧凑姿态：`/Users/kual/Desktop/log-note/output/playwright/ln-076-agent-rework8-final2/ln-076-agent-rework8-calendar-390.png`。
- 同输入并排对照：`/Users/kual/Desktop/log-note/output/playwright/ln-076-agent-rework8/comparison-390.png`。

参考图和实现图均归一为 `390×844 CSS px`。本轮不把红色标注框、旧的内容流空白舞台或素材自带竖线当成视觉目标；只对照旧角色的石墨轮廓、头部方向、抓握关系、书页材质与右侧活动范围。实现证据由 Chromium 在 `deviceScaleFactor: 2` 下捕获。

### Findings

没有剩余可执行的 P0、P1 或 P2 差异。

- 形象延续：四态静态与动效素材直接从旧 `idle / scanning / reviewing / complete` 像素姿态归一化而来，没有替换为新的通用卡通形象；角色仍是旧版细线、探头和抓握手势。
- 单书脊：新素材只含角色，不再携带贯穿画布的竖线；手部接触点与页面唯一 `.home-edge-rail-brush` 轴误差不超过 `2px`，截图和 DOM 均只有一根书脊。
- 慢速爬行：移动端使用带停顿的分段抓握节奏，`idle 28s / scanning 20s / reviewing 32s / complete 30s` 均按单程计算；不再使用连续快速漂移。桌面端、月历、焦点、按住、后台和 reduced motion 为静止姿态。
- 常驻范围：Agent 位于应用壳固定层，320/390/426/600/700px 的顶部、中部、底部滚动均留在视口；768/1280px 保持安静探头，不参与文档流，也不制造普通记录与固定记录之间的空白舞台或第二横线。
- 目录关系：独立验收曾在 426px 捕获活动目录文字与 Agent 画布相交。最终方案不移动节点或抓握轴：普通目录文字只向页边留出 `2px`，带洞察入口的活动文字使用同色不透明纸面层保持在 Agent 上方可读；新增几何断言覆盖全部宽度和长页滚动。整条右轨锚点、洞察入口及 44px 目标仍通过原回归。
- 状态与数据：空白日点击只显示 4.5 秒临时批注，Escape、二次点击、日期/页面切换均关闭，全程零 review 请求和零数据写入；Plan、搜索、设置与编辑器隐藏，返回 Diary 恢复。
- 离线与可替换边界：四态均注册本地 `staticAsset / motionAsset / intrinsicSize / motionMode`，保留 legacy `asset`；8 个新素材进入 Service Worker v14 预缓存，未知外观安全回退，不新增字段、依赖或网络请求。

### Comparison History

1. 初始实现已完成应用壳固定层，但第一轮素材偏离旧形象且移动节奏过快；随后改为直接复用旧角色像素并将巡游改成抓握—停顿—挪动。
2. 同图对照确认角色重新贴住唯一书脊、页面左侧空间不再被 Agent 舞台占用，且日期、记录、固定字段和右轨仍属于同一书页系统。
3. 独立验收发现活动目录在 426px 的特殊左置文字；新增真实矩形碰撞覆盖后，先尝试的纵向扩展会破坏目录锚点，已撤销。最终用节点不动、文字分层解决，首页整轨、日期页、长页巡游和 Domain Insights 专项均重新通过。
4. 最终隔离 `npm run check` 退出 0：设计规范 `11/11`、单测 `182/182`、移动浏览器 `30/30`、PWA production build/installability/authenticated offline cache/persistence/controlled update、生产构建与 `git diff --check` 全绿。

### Implementation Checklist

- [x] 沿用旧 Agent 线条形象，四态素材均无自带书脊线。
- [x] 320–700px 慢速贴脊巡游，768/1280px 静止，滚动时始终在视口。
- [x] 月历、焦点、按住、后台和 reduced motion 均暂停且不丢失姿态。
- [x] 空白日批注完整关闭，无分析请求、记录写入、计划写入或备份变化。
- [x] Diary 全日期显示；Plan、搜索、设置与编辑器隐藏。
- [x] 真实目标不少于 `44px`，艺术图、目录文字、工具、导出、新增、正文和输入无不可读碰撞。
- [x] 用户参考与实现已放入同一比较输入并完成字体、间距、材质、形象、轴线、状态、响应和可达性检查。
- [x] 完整质量门禁和独立只读验收均通过。

### Open Questions

- 无发布阻断问题。`SC-005` 的 14 天长期偏好仍属于产品观察，自动化不能代替；若持续运动造成分心或耗电，应直接退回当前同姿态静止模式，不改变审查和数据边界。

### Follow-up Polish

- P3：`home-timeline.css` 中 Rework 5 的旧行内 Agent 规则仍由后置 Rework 8 选择器覆盖。它不影响当前门禁，但下一次单独清理样式时可按实际使用面拆分，避免未来级联误触；不得在本轮扩大范围删除 Plan/旧审查仍可能复用的规则。

final result: passed

### Rework 8 Motion Follow-up — 上下爬行、眼神与思考动作

- 视觉对照与逐帧证据：`output/playwright/ln-076-agent-rework8-motion/reference-and-motion-frames-390.png`；独立六帧表分别为 `agent-idle-frames.png`、`agent-scanning-frames.png`、`agent-reviewing-thinking-frames.png`、`agent-complete-frames.png`。
- 四态继续沿用旧版石墨线条精灵。idle 使用抓握、向上伸手、身体跟进和落稳；scanning 使用探头、拉伸和收回；reviewing 保留托腮思考轮廓并让头部与视线轻移；complete 使用盘卷、伸展、重新抓握和落稳。眼睛只移动约 `1–2px`，局部循环分别为 `3s / 2.4s / 4s / 3s`，不会形成快速眨动。
- 局部 APNG 与外层轨道解耦：外层继续保持 `28s / 20s / 32s / 30s` 单程慢速巡游，角色本身在同一抓握点完成局部姿势变化；焦点、按住、后台状态冻结当前位置，月历和 reduced motion 使用确定静态姿势。
- 所有注册静态/动效资源均为 `128×128` RGBA；动效各 6 帧、无限循环且小于 `100KB`。idle 与 complete 的贯穿竖线已从逐帧像素中移除，新增 PNG 解码回归要求任何连续 8px 窗口的纵向墨迹覆盖小于 `65%`，由页面 `.home-edge-rail-brush` 独占书脊。
- 本轮静态门禁：`npm run design:check` 通过 `11/11`，`npm test` 通过 `182/182`，`git diff --check` 通过；独立只读复核无 blocker/P1/P2，并确认 T070–T072 可关闭。
- 当前内置浏览器曾停留在开发服务器未启动时的错误页；服务器恢复后自动 reload 被浏览器 URL 安全策略拒绝。因此 T073 仍保留为未完成：等待产品负责人在当前 390px 预览手动刷新后完成 live 四态速度/贴脊/眼神检查，再运行需要浏览器的完整门禁。本条证据边界不推翻上方已通过的 Rework 8 基础布局验收，也不冒充本轮 live 动效已验收。

## LN-010 Phase 1 Rework — 真实目标、Agent 焦点与右列共轴

### 对照目标与归一化

- 产品负责人否决态：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-aadb8e4a-66db-4752-be16-f18f5d08bd9d.png`（`942×522px`）。
- 最终 390px 中文空闲态：`/Users/kual/Desktop/log-note/output/playwright/ln-010-domain-stack-corrected-zh-idle-390.png`。
- 最终 390px 中文 Agent 焦点态：`/Users/kual/Desktop/log-note/output/playwright/ln-010-domain-stack-corrected-zh-agent-focus-390.png`。
- 否决态与最终焦点局部对照：`/Users/kual/Desktop/log-note/output/playwright/ln-010-domain-stack-rejected-vs-corrected-focus.png`。

否决态是裁剪且缩放过的实时页面，不具备完整视口尺寸。对照因此只归一书脊、Agent 焦点和当前领域入口的共同局部，不冒充全屏像素匹配；最终全屏状态按 `390×844 CSS px` 独立检查，并以 320px 自动化覆盖最窄布局。

### Findings

没有剩余可执行的 P0、P1 或 P2 差异。

- P1（已修正）真实目标未对齐：否决实现的领域按钮为 `62×44px`，虽然文字和复盘图标中心同为 `x=368px`，领域目标中心仍左偏 `9px`。最终两个按钮均为 `44×44px`，目标盒、竖排文字和图标共同以 `x=368px` 为轴。
- P1（已修正）Agent 焦点侵入：最终 Agent 目标为 `44×80px`，右缘 `x=338px`；右列目标左缘 `x=346px`，目标间隔 `8px`，双方各自 4px 焦点处理后仍保留 `4px` 可见间隔。Agent 的 `80×80px` 原图和书脊抓握点没有缩小或改画。
- 书脊关系：领域小节点继续以 `x=334px` 对齐唯一书脊；节点图允许从右列按钮向左伸出，不再用增宽真实按钮来容纳装饰。
- 材质与可读性：活动领域背景为透明，不使用不透明纸面遮盖 Agent 碰撞；既有纸张、石墨、蓝墨、字体、文案和本地图标均未替换。
- 状态与交互：内置浏览器实测复盘入口打开 `/insights?domain=health-domain`，返回后入口恢复；稳定预览 console error/warn 均为空。领域按钮仍只滚动，复盘入口仍只跳转。

### Comparison History

1. 旧的 `ln-010-domain-insights-stack-*` 证据只测了内部文字和图标，错误地将 `62px` 真实目标及不透明遮罩判为通过；该证据和对应结论已撤销。
2. 新回归首次准确失败于领域按钮宽 `62px`、目标中心差 `9px`、Agent 目标净空 `-19px`、焦点净空 `-23px`。
3. 首轮把领域按钮改为 `44px` 并横移 Agent 后，320px `book-page ritual` 又捕获 Agent 与记录内容 `155.4375px²` 重叠；最终仅把 Agent 真实目标收为 `44px`，保持 `80px` 图像不变。
4. 最终 Domain Insights 专项 `1/1`、320px book-page 专项 `1/1`；完整 `npm run check` 退出 `0`，且 390px 空闲/焦点截图和否决态局部对照均已目视检查。

### Implementation Checklist

- [x] 两个真实操作目标和可见内容均为同一右列中心轴，且都是精确 `44×44px`。
- [x] 领域节点独立保持书脊轴；当前领域不占左侧阅读面，也不靠背景遮挡碰撞。
- [x] Agent 真实目标与右列分离，320/390px 下目标、焦点、角色图和记录内容均无碰撞。
- [x] 390px 中文空闲态、Agent 焦点态和否决前后局部对照已实际打开检查。
- [x] 复盘跳转、返回、空控制台、字体、颜色、文案、图标、reduced motion 与既有数据边界无回归。
- [x] 最终 `npm run check` 退出 `0`：设计规范 `11/11`、单测 `203/203`、移动浏览器 `31/31`、PWA production build/installability/authenticated offline cache/persistence/controlled update、生产构建与 `git diff --check` 全部通过。

### Open Questions

- 代码与自动化 QA 无剩余阻断；产品负责人对 390px 真实焦点间距的视觉验收仍待完成，因此本项只 Returned，不标 Accepted。LN-010 原有 14 天真实使用观察也不由本次局部回归代替。

### Follow-up Polish

- 无剩余 P3。本次不扩大到复盘页内容、Agent 动效、图标资产或其他右轨控件。

final result: passed

## LN-010 / LN-076 Follow-up — 有无复盘入口同轴与固定横线断开

### 结论与证据

本轮修正两个可见边界：领域目录不再因“有无复盘入口”左右跳动，固定记录手绘横线不再伸入 Agent 安全区。390px 证据分别为 `output/playwright/rail-axis-final/ln-075-unified-rail-390.png` 与 `output/playwright/rule-gap-final/ln-061-fixed-scope-tags-390.png`；320/426/600/700px 及 768/1280px 也由同一组响应式场景覆盖。

### Findings

- P1（已修正）目录多轴：320px 失败基线中，顶部工具、活动领域、普通领域真实目标与普通文字中心分别为 `292 / 298 / 264 / 280px`。最终所有领域真实目标、可见文字、顶部工具、拨杆与复盘入口统一到距右边 `28px` 的操作轴；领域小节点继续位于距右边 `56px` 的书脊轴。
- P1（已修正）Agent 净空：390px 下 Agent 真实目标右缘为 `x=331px`，目录目标左缘为 `x=340px`，保留 `9px` 目标净空和焦点后的至少 `4px` 可见间隔；角色原图与书脊抓握点未移动。
- P2（已修正）固定横线连入角色：移动端固定行的 3px 手绘背景线改为左对齐，并在行右缘前 `24px` 结束。426px 共享门禁进一步捕获 Agent 目标与固定输入 `3px × 6.7px` 的隐形相交，移动输入右缘因此再收 `4px`；输入高度、内容、焦点、记录数据、回调和桌面布局不变。

### Verification

- [x] `home reference UI`：`1/1`，覆盖 320/390/426/600/671/700/768/1280px 的目录真实目标、文字、操作轴、书脊节点和横向溢出。
- [x] `domain insights`：`2/2`，复盘进入、7 天确认式总结与会话期边界无回归。
- [x] `LN-076 viewport-spine Agent`：`1/1`，四态常驻、零写入和目标安全间距无回归。
- [x] `home hierarchy`：`1/1`，移动端横线在 Agent 安全区前断开，固定记录顺序和快速记录入口不变。
- [x] 完整 `npm run check` 退出 `0`：设计规范 `11/11`、单测 `206/206`、移动浏览器 `31/31`、PWA production build/installability/authenticated offline cache/persistence/controlled update、生产构建与 `git diff --check` 全部通过。

### Remaining boundary

代码和专项自动化已无已知阻断；LN-010 的 14 天复盘效用、LN-076 的 live 动效偏好仍是人工观察项，本轮几何修正不替代它们。

final result: passed
