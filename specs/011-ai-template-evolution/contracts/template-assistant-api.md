# Contract: Template Proposal API

**Endpoint**: `POST /api/organize/template-proposal`
**Runtime**: Node.js, dynamic, same-origin only
**Persistence**: none
**Response schema**: [template-proposal.schema.json](template-proposal.schema.json)

## 1. Request headers

| Header | Requirement |
| --- | --- |
| `Origin` | 必须匹配当前 Log Note origin；缺失/不匹配返回 403 |
| `Authorization` | `Bearer <Supabase access token>`；只用于服务端 `getUser`，不得转发 |
| `Content-Type` | 必须是 `application/json` |

Request body 累计读取上限 `64 KiB`。成功和错误均返回 `Cache-Control: private, no-store` 与 `X-Content-Type-Options: nosniff`。

## 2. Common request envelope

```json
{
  "schemaVersion": 1,
  "requestId": "proposal-opaque-id",
  "mode": "create",
  "locale": "zh-CN",
  "structureFingerprint": "sha256-hex",
  "input": {}
}
```

| Field | Rules |
| --- | --- |
| `schemaVersion` | literal `1` |
| `requestId` | 1–128 字符；只用于迟到响应匹配，不含账号标识 |
| `mode` | `create \| refine \| structure` |
| `locale` | `zh-CN \| en` |
| `structureFingerprint` | 64 位小写 hex；不是鉴权凭据 |
| `input` | 必须与 mode 对应的 strict object；未知字段拒绝 |

## 3. Create input

```json
{
  "userIntent": "我想记录每次跑步的距离、时长和感受",
  "suggestedCategoryRef": "health-rest",
  "structureSummary": {
    "domains": [{ "ref": "health-domain", "name": "健康" }],
    "categories": [{ "ref": "health-rest", "domainRef": "health-domain", "name": "作息与恢复" }],
    "templates": [{ "categoryRef": "health-rest", "name": "睡眠", "recordType": "periodic", "inputMode": "structured" }]
  }
}
```

- `userIntent`: trim 后 1–2000 字符。空输入不得调用该 endpoint，由浏览器走本地默认。
- `suggestedCategoryRef`: 必须来自 structureSummary；产品可以允许用户先选分类。
- summary 只含现有结构的名称、父子 ref 和必要类型，不含记录或模板字段详情。
- 上限：12 domains、64 categories、128 templates；超限由客户端确定性裁剪并标记，服务端再次限制。

## 4. Refine input

```json
{
  "userIntent": "让这个模板更容易填写",
  "targetTemplate": {
    "ref": "learn",
    "categoryRef": "study",
    "name": "学习",
    "recordType": "linear",
    "inputMode": "structured",
    "schedule": null,
    "prompt": "学了什么？",
    "tags": ["学习"],
    "fields": [
      {
        "ref": "topic",
        "label": "学习内容",
        "type": "text",
        "options": [],
        "placeholder": "学了什么？",
        "required": true
      }
    ]
  },
  "usageSummary": {
    "useCount": 12,
    "activeDays": 9,
    "lastUsedAt": "2026-08-31"
  }
}
```

- `userIntent` 可为空；为空表示“基于当前模板和统计检查是否需要小改”，不是默认模板路径。
- 只允许一个 target；fields 最多 6。
- usageSummary 不含 content、entry IDs、tags、附件或字段值。
- route 不接受整个 structureSummary；重复名称校验由浏览器用最新 state 完成。

## 5. Structure input

```json
{
  "userIntent": "这些记录似乎属于一个新的家庭装修领域",
  "selectedEntries": [
    {
      "id": "entry-1",
      "content": "比较了两种厨房台面材料……",
      "currentCategoryRef": "daily"
    }
  ],
  "structureSummary": {
    "domains": [{ "ref": "daily-domain", "name": "日常" }],
    "categories": [{ "ref": "daily", "domainRef": "daily-domain", "name": "记录" }],
    "templates": [{ "categoryRef": "daily", "name": "随手记", "recordType": "linear", "inputMode": "free" }]
  }
}
```

- 1–12 个用户主动选择的普通记录；`content` 每条 1–1000 Unicode 字符。
- entry ID 只用于响应证据白名单；不得显示为可点击远程索引或由 Dify 持久化。
- 不接受日期、时间、tags、templateId、附件、图片、计划或账号字段。
- Dify workflow 必须先判断 existing structure 是否足够；足够时返回 `no-change` 或已有分类结果给现有 Agent 路径，不能创建同义结构。

## 6. Success response

```json
{
  "schemaVersion": 1,
  "requestId": "proposal-opaque-id",
  "mode": "create",
  "structureFingerprint": "sha256-hex",
  "outcome": "proposal",
  "reason": "根据跑步记录需求生成一个结构化模板。",
  "warnings": [],
  "proposal": {}
}
```

- `proposal` 必须符合 mode 对应定义；完整 schema 见 JSON 文件。
- `no-change` 时 `proposal` 为 null，reason 说明现有模板/结构为何已足够。
- `requestId`、`mode`、fingerprint 由 Log Note server 从已验证 request 包装；不得取信 Dify echo。
- Dify 原始 run ID、Prompt、usage 和原始错误不返回浏览器。

## 7. Error response

```json
{
  "error": {
    "code": "AI_TEMPLATE_PROPOSAL_INVALID",
    "message": "Template proposal is unavailable."
  }
}
```

| HTTP | Stable code examples | Meaning |
| --- | --- | --- |
| 400 | `AI_REQUEST_INVALID`, `AI_JSON_REQUIRED` | envelope/JSON/content-type invalid |
| 401 | `AI_AUTH_REQUIRED` | missing or invalid account token |
| 403 | `AI_ORIGIN_INVALID` | cross-origin request |
| 413 | `AI_REQUEST_TOO_LARGE` | body >64 KiB |
| 422 | `AI_TEMPLATE_INPUT_INVALID`, `AI_TEMPLATE_PROPOSAL_INVALID`, `AI_TEMPLATE_STALE` | mode input/output or business invariant invalid |
| 429 | `AI_RATE_LIMITED` | account-scoped rate limit |
| 502 | `AI_PROVIDER_INVALID_RESPONSE`, `AI_PROVIDER_FAILED` | Dify/model failure |
| 503 | `AI_TEMPLATE_UNAVAILABLE`, `AI_CONFIG_INVALID` | provider/workflow not configured |
| 504 | `AI_TIMEOUT` | 20-second server timeout |

Messages are short and localized by client code. Response must not expose upstream URLs, keys, Prompt, stack trace or raw model text.

## 8. Dify adapter contract

Server-only configuration names are proposed, not committed values:

```text
DIFY_API_BASE_URL
DIFY_TEMPLATE_CREATE_APP_KEY
DIFY_TEMPLATE_REFINE_APP_KEY
DIFY_STRUCTURE_PROPOSE_APP_KEY
```

Adapter rules:

1. Only HTTPS, except explicit localhost development.
2. Map mode to one allowlisted app key; request cannot supply workflow ID or base URL.
3. Use blocking mode, 20-second AbortSignal, one request, zero automatic model retry.
4. Send an opaque Dify `user` value unrelated to account ID, or omit it if API permits; never send auth user ID/email.
5. Accept only expected output variable `proposal`; strict-parse JSON and reject trailing text/unknown fields.
6. Log only local request ID, mode, workflow alias/version, duration, request/response bytes and result code. Do not log inputs or proposal text.
7. Dify workflows expose no Log Note tools, callbacks, MCP server or Supabase credentials.

## 9. Rate and cancellation contract

- Default proposed limit: 6 requests per authenticated account per 10 minutes, with create/refine/structure sharing the bucket.
- Browser timeout: 25 seconds; server timeout: 20 seconds.
- Client abort is best-effort upstream cancellation. Regardless of upstream completion, request generation and structure fingerprint prevent late render/application.
- The service never retries a generation automatically. User retry requires a new explicit action and a new request ID.
