# Data Model: Google Calendar 近实时变化同步

## Canonical product entities

### Local plan

继续使用现有 `planBlocks`：`id`、`date`、`startTime`、`endTime`、`title`、`source`、`flexibility` 和已有 `externalRef`。只有 `source=local` 的计划可被同步写入 Google；`source=google` 的计划只读。

### Managed event reference

保留最小外部引用：

```text
externalRef:
  provider: "google-calendar"
  calendarId: "primary"
  eventId: string
  etag: string
```

`eventId` 是关联身份，`etag` 是最近一次已知版本。最近观察时间和远端删除时间只存在于独立的同步 metadata/cache 中，不扩展主计划引用或备份 schema。

### Read-only Google event

日历缓存中的普通事件只包含显示和排序所需的最小字段：事件 ID、开始/结束、标题摘要、全天/跨日、取消/删除状态、日历来源和最近观察时间。不得把完整 Google payload、attendees、描述、会议链接、令牌或私有账户字段复制到主文档、备份或日志。

### Calendar sync metadata

按当前账号和 `calendarId` 隔离的版本化 metadata：

```text
googleCalendarSync:
  version: 1
  provider: "google-calendar"
  calendarId: "primary"
  mode: "browser-poll" | "server-push" | "server-poll"
  syncToken?: opaque string
  lastSyncedAt?: ISO-8601
  lastAttemptAt?: ISO-8601
  nextRetryAt?: ISO-8601
  status: disconnected | syncing | synced | dirty | offline | error | conflict | revoked | rebuilding
  issue?: bounded error code
  authorizationGeneration: string
  channel?:
    id: string
    resourceId: string
    expiration: ISO-8601
    createdAt: ISO-8601
  pendingChanges?: bounded change summaries
  conflicts?: bounded conflict summaries
```

Metadata 不含 access token、refresh token、client secret、webhook secret、完整事件对象或记录正文。字段允许缺省；未知版本只能被忽略或重建，不能覆盖主数据。

### Sync conflict

```text
conflict:
  planId: string
  eventId: string
  localFingerprint: string
  remoteEtag?: string
  kind: etag-mismatch | remote-deleted | orphaned | duplicate
  detectedAt: ISO-8601
  resolution: pending | keep-local | keep-google | manual
```

冲突摘要只用于恢复工作面。`resolution` 由用户选择；同步器不得默认选择一方并覆盖另一方。

## Validation and state rules

- `syncToken` 只可用于相同账号、日历、授权 generation 和同步上下文；账号切换或撤权立即失效。
- Google `410 Gone`、游标过期或 channel 失效时，状态进入 `rebuilding`，执行有界重建，再保存新游标。
- 事件更新必须使用已知 `eventId` 和 etag/precondition；etag 不匹配进入 `conflict`，不得直接覆盖。
- `showDeleted=true` 的 tombstone 可移除普通缓存事件；受管事件 tombstone 只标记本地计划 `remote-deleted`，不自动删除计划。
- 受管事件的创建、更新、删除必须由对应当前账号的 local plan 触发；普通事件、跨账号 ID 和未知 managed marker 均拒绝写入。
- 轮询和 push 共用同一 reconciliation；通知重复、乱序和迟到只允许触发幂等增量读取。
- 删除、撤权、离线和冲突状态不得删除本地计划、记录、主文档、JSON/Markdown/附件备份。
- Calendar cache 和 metadata 不进入 Service Worker 静态缓存或主数据备份；断网期间仅使用已有缓存并标注时间。
