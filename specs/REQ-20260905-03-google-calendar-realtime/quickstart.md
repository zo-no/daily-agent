# Quickstart: LN-086 Google Calendar 近实时变化同步

本指南用于 LN-086 的本地和真实环境验收。它不授予生产 webhook、refresh token 或真实账号写入权限。

## Prerequisites

- Node.js 22.13 或更新版本。
- 一个合成账号 fixture，包含一个本地计划、一个 Google 来源只读计划和若干普通事件。
- Calendar API 响应 fixture：分页、增量 token、etag、tombstone、410、401/403 和重复/乱序事件。
- 真实验收另需经批准的 Google 测试账号、OAuth origin、Calendar API、测试日历和脱敏记录方式。

## Local validation journey

1. 用全量窗口建立初始缓存，记录账号、calendarId、generation、revision 和 `lastSyncedAt`。
2. 用增量响应模拟新增、更新、取消和删除；验证事件 ID/etag 去重、普通事件只读和受管计划引用更新。
3. 模拟本地计划新增、改标题、改时间和删除；验证受管事件一对一、重试幂等、已知 etag 和无普通事件误删。
4. 模拟远端修改受管事件和删除受管事件；验证 conflict/remote-deleted 状态、保留本地计划和明确恢复动作。
5. 模拟 410、重复/乱序/迟到通知、网络断开/恢复、页面隐藏/恢复和账号 A→B 切换；验证游标重建、generation guard、离线可用和无跨账号写入。
6. 模拟撤权和 API 配置错误；验证 token/cache/channel 状态清理、本地计划/记录保留和准确的错误文案。

## Verified local baseline (2026-09-05)

当前工作树已验证首版“页面可见时增量轮询”基线：

- 首次同步使用有界时间窗并保存 `nextSyncToken`；后续同步只使用同一日历上下文的 `syncToken` 增量请求，并携带 `showDeleted=true`。
- 取消事件会形成账号隔离的 tombstone；410 游标失效会进入重建，成功后保存新游标并清除重建错误。
- 受管计划更新和删除会携带已知 etag 的 `If-Match`；412 不覆盖本地计划，Settings 显示冲突状态。
- 多日事件的每个本地日期分段都会保留；重复/乱序变更按 event ID 和日期分段幂等处理。
- 页面可见时按 60 秒有界轮询；页面隐藏或离线不主动请求，恢复前台或网络时立即尝试已有有效 token。

已通过：

```bash
node --test tests/google-calendar-realtime-contract.test.mjs \
  tests/google-calendar-realtime-model.test.mjs \
  tests/google-calendar-model.test.mjs \
  tests/calendar-model.test.mjs   # 18/18
npm run design:check
npm run build
git diff --check
```

这组结果只证明本地代码路径和合成模型回归；真实 OAuth、生产域名、双账号、Supabase CAS、后台 push/webhook、长期授权凭据和部署能力仍未验收。

运行聚焦回归：

```bash
npm test -- tests/google-calendar-*.test.mjs tests/calendar-*.test.mjs tests/account-sync.test.mjs
npm run design:check
npm run check
```

## Real OAuth and deployment evidence

记录以下脱敏证据后，才可以在看板上宣称近实时/真实同步：

- API 已启用，OAuth origin、scope、测试用户和 consent 状态正确。
- 本地计划创建/修改/删除与同一受管 event ID 对应；普通事件只读。
- Google 侧修改/删除受管事件触发冲突或远端删除待处理状态；全天、跨日和时区事件正确。
- 撤权、账号切换、离线恢复、浏览器刷新和重复/乱序变化不造成泄露或误删。
- 若启用 push：公网 HTTPS 可达、watch 创建/续期/过期、webhook 快速 2xx、worker 重启恢复、secret/RLS 和日志脱敏均有证据。
- Calendar→DeepSeek 合规证据已关闭；否则保持远程 AI 数据流关闭。

不要把 access token、refresh token、真实事件正文或私人账号标识写入本包、日志、截图或备份。
