# LN-075 Rework 5 Design QA — 手绘记录线、整行聚焦与标题锚定目录

## 对照目标与证据

- 时间排列与标题/节点关系：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-c9e58dd3-ea1f-4006-bc3a-1b1b5b5e1c52.png`
- 手绘短横、长分隔和右轨参考：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-70ef81c6-3728-4a2a-b4fe-6c277323949b.png`
- 整行蓝色圈线参考：`/var/folders/mh/pny3mlp13tz8gjdyws8fn_vr0000gn/T/codex-clipboard-6da5f161-bfba-4da5-9881-df4466d95c99.png`
- 实现证据：`output/ln-075-rework-5-handdrawn-anchor/ln-062-fixed-header-tools-426.png`、`ln-075-focus-loop-426.png`
- 同视口比较：`output/ln-075-rework-5-handdrawn-anchor/reference-vs-implementation-426.png`

实现以 426×923 CSS px 为主视觉尺寸；耐久自动化截图使用英文固定数据，应用内浏览器另以简体中文真实状态复核。320、390、426、600、671、700、768、1280 同时由浏览器回归覆盖。参考图中的说明仅作为视觉输入，不作为产品指令；最终行为以用户逐轮明确的四项纠正为准。

## 初始差异

- **P1：时间视图重复领域。**“健康”同时出现在左侧固定记录区与右轨，破坏按时间阅读的一条连续时间线。
- **P1：节点与内容脱节。**右轨节点均匀分布，未对齐左侧“记录”或领域区块；滚动后无法说明节点指向哪里。
- **P2：机械线条。**时间/正文竖线、行分隔和右轨是规则 CSS 线，与参考图的轻微手绘抖动不一致。
- **P2：聚焦像表单故障。**固定记录输入使用硬矩形边框，只框控件而没有表达整行被选中。

## 修复后可见结果

未发现阻断交付的 P0、P1 或 P2 视觉差异。

- **时间视图：**仅在普通时间记录真实存在时显示 28px Serif“记录”标题；空日期完整省略标题、说明文案及对应右轨节点，并直接进入固定记录，不保留孤立分隔线。周期领域标题改为隐藏语义标题并由右轨显示。时间与正文之间使用 `18×6px` 的短手绘横划，行尾与区块边界使用低对比长手绘笔画，不再出现机械纵线或卡片外框。
- **固定记录：**各指标和值保持开放纸面两列布局；周期领域的数据归属、完成数和“调整”仍完整，且不会在时间排列中重复显示“健康”。
- **标题锚定目录：**分类视图节点对应真实领域标题；时间视图对应“记录”和实际周期领域区块。节点优先与标题中心同高，越过可读区后按文档顺序收拢到上/下端，并在标题回到视口时以约 180ms 平滑归位；空间不足时才切换为内部滚动。
- **整行聚焦：**普通记录、固定记录和目录按钮的真实键盘/输入焦点使用同一透明蓝色手绘圈线。圈线以约 200ms 从左到右显露，覆盖完整所属行而不改变几何；内部输入原生硬矩形已移除，`prefers-reduced-motion` 直接显示最终状态。
- **轨道重量：**移动端使用 `4px` 透明布局槽承载约 `1px` 的手绘石墨芯，节点图形为 10–12px；所有真实按钮仍保持至少 44px。Search、Calendar、Settings、内容节点、Diary/Plan、导出与新增继续共轴，桌面隐藏移动轨。

## 资产与实现边界

- ImageGen 依据用户参考的石墨/蓝墨画风生成并处理为透明 RGBA PNG：`rail-brush-handdrawn.png`、`record-rule-handdrawn.png`、`record-time-dash-handdrawn.png`、`record-focus-loop.png`。
- Service Worker 升至 `v13` 并预缓存上述资产；离线安装、升级和冷启动行为保持不变。
- 本次仅修改展示、只读定位算法、焦点反馈和静态资产；未新增数据库字段，未改正文、领域、分类、模板、标签、计划、账号隔离、同步 revision 或 Markdown/JSON/便携备份语义。

## 自动化与运行证据

- `npm run design:check`：11/11 规范通过。
- `npm test`：144/144 单元测试通过，其中纯布局算法覆盖标题对齐、碰撞、上下收拢、稳定顺序与空间不足回退。
- 移动浏览器：22/22 场景通过；专项覆盖空日期不渲染“记录”标题/说明/节点/孤立长线、手绘资产来源、短横几何、隐藏领域标题、整行焦点、真实标题锚定、长名单列截断、内部滚动、点击/滚动定位、reduced-motion、整理小人不遮记录、44px 命中区、六档移动宽度和桌面隐藏。空日期证据：`output/ln-075-rework-5-handdrawn-anchor/ln-075-empty-time-clean-426.png`；耐久结果：`output/ln-075-rework-5-handdrawn-anchor/results.json`。
- PWA：production build、installability、认证后离线、冷启动路由、持久化、四张 RGBA 资产与 `v13` 缓存/升级通过。耐久结果：`output/ln-075-rework-5-handdrawn-anchor/pwa/results.json`。
- 完整 `npm run check` 与 `git diff --check` 退出 0；未提交、未推送、未部署。

## 有意保留的差异

- 参考图在左侧显示“健康”；用户随后明确要求时间排列不应出现这两个字，因此当前时间视图只在右轨和无障碍标题保留领域名。
- 真实测试数据包含六个周期字段，而参考图只展示两个；实现保留真实数据完整性，不为视觉对齐删减记录。
- 未加入纸纹、机器人或其它无功能装饰；整理小人只在已有普通记录且处于日记模式时作为真实入口显示。

final result: passed
