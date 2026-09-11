# Data model: personal OKR period alignment

**Requirement**: `REQ-20260906-03`
**Status**: Design candidate; no schema migration or implementation authorization.

本轮优先复用当前账号文档中的 `goals`、`planBlocks` 和 `entries`。目标、计划和记录仍是事实来源；自动取数和 AI 结果都是从当前快照派生的瞬态对象。

## Existing Goal / Objective

继续使用 `src/lib/goal-model.mjs` 的兼容字段：

- `id`: 账号内稳定 ID。
- `content`: 用户写的目标状态/方向。
- `startDate`, `endDate`: 可选日期区间，包含边界日；缺失或反向时不是有效 OKR 周期。
- `status`: `active`、`paused`、`completed`。
- `keyResults`: 存量 KR 数组；本轮不要求新增动机、权重、负责人或频率字段。
- `recordIds` 及 KR 内 `recordIds`: 历史显式关联仍兼容，但不再作为自动检查的排他过滤器，也不在本轮提供关联编辑器。

允许目标没有 KR。创建界面可从 0–3 条开始；归一化不得静默删除旧数据里的额外条目。

## Existing Plan

继续使用当前 `planBlocks`：

- `id`, `date`, `title`, `startTime`, `endTime`, `source`, `goalId`, `priority` 等现有字段保持原义；`phase` 只存在于本次快照，按计划日期相对 `checkedAt` 派生。
- 仅 `source=local` 的计划进入本轮自动检查；Google 事件仍是只读外部上下文，不进入请求。
- `goalId` 是已有用户数据，不能要求用户为每个计划维护它；自动取数按日期范围，不按该字段排除。
- 计划的完成/存在状态不等同于目标进展。未来计划可说明意图，不能作为已执行证据。

## Existing Record

继续使用当前 `entries` 的原始 `id`, `date`, `time`, `content`, `createdAt` 和已有结构字段。业务日期有效、在目标周期内且不晚于检查时刻的记录可成为检查材料。周期外、未来、无效日期或无法安全裁剪的记录不发送，但原始数据保持不变。

## Period Snapshot（瞬态）

页面打开或点击前由本地确定性函数生成，不写入账号文档：

```ts
type PeriodSnapshot = {
  goalId: string;
  startDate: string;
  endDate: string;
  checkedAt: string;
  planCount: number;
  recordCount: number;
  plans: Array<{ id: string; date: string; title: string; startTime: string; endTime: string; phase: 'future' | 'elapsed' }>;
  records: Array<{ id: string; date: string; time: string; content: string }>;
  omitted: { plans: number; records: number; reason?: 'over-limit' | 'invalid-date' };
  fingerprint: string;
};
```

- 日期过滤为闭区间；`checkedAt` 决定未来记录边界。
- 周期超过 366 个自然日、计划超过 100 个或记录超过 200 个时，不静默取最近数据并声称全量检查。UI 必须显示边界状态；是否允许后续按时间均匀抽样另行决策。
- 每条记录发送前最多保留 360 个字符，整个请求遵守既有 256 KiB request body、20 秒服务端和 25 秒浏览器超时。
- 排序稳定使用 `date → time → createdAt → id`；计划按 `date → startTime → id`。fingerprint 覆盖 Goal/KR 内容、周期、checkedAt 的日期粒度、所有参与快照的字段、数量、语言和请求 ID。

## Alignment Review（瞬态）

```ts
type AlignmentReview = {
  schemaVersion: 'goal-alignment-v1';
  requestId: string;
  goalId: string;
  fingerprint: string;
  overall: 'toward' | 'activity-only' | 'drifting' | 'blocked' | 'insufficient';
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  scopes: Array<{
    scope: 'objective' | 'key-result';
    keyResultId?: string;
    status: 'toward' | 'activity-only' | 'drifting' | 'blocked' | 'insufficient';
    reason: string;
    sourceRefs: Array<{ type: 'plan' | 'record'; id: string; date: string }>;
  }>;
  gaps: string[];
  nextFocus?: string;
  coverage: { planCount: number; recordCount: number; omittedPlans: number; omittedRecords: number };
};
```

模型只能引用本次 request 的 source allowlist；`sourceRefs` 不能指向未发送的数据。`nextFocus` 只是只读建议，不能成为计划、记录或目标的写入指令。结果不进入备份、云文档、AI memory 或历史列表。

## State and compatibility

- 没有新增持久实体、数据库迁移、索引或 store。
- 取消、离页、账号切换、目标编辑、来源变化、fingerprint 变化和任何校验失败都会丢弃瞬态快照/结果。
- 未来若保存复盘或接受匹配，必须另立需求，并复用 `commitData`、revision/CAS 和显式确认；本轮不改变 `recordIds`。
- 旧 Goal、计划、记录、JSON 备份和 Markdown 导出继续可读；删除本能力不删除任何原始数据。
