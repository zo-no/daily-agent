# Quickstart: LN-084 Agent MCP/Skill 桥接

本指南用于 LN-084 候选实现的本地验证。当前工作树已有 MCP schema、stdio/loopback queue、路由和浏览器控制器核心；合成 E2E 账号上的真实 Codex/Claude CLI 发现与确认闭环已有脱敏证据，但真实生产账号、双账号生命周期、云端 CAS 和完整安全验收仍开放，因此本指南不代表 LN-084 已 Accepted。

## Prerequisites

- Node.js 22.13 或更高版本。
- 一个已登录的本地 Log Note 浏览器窗口（建议使用 `http://127.0.0.1:3100`）。
- 仅用于测试的账号和合成记录/计划；不要把真实私密记录写入测试日志、fixture 或截图。
- MCP 客户端（Codex 或 Claude）支持 stdio server 配置。

项目级 Skill 位于 `.agents/skills/log-note-agent/SKILL.md`；Codex 打开该项目时会从该路径发现它。
创建特定的新线程不是 MCP 注册或日常使用的前置条件；线程只用于可选的任务分工。

## Start Log Note

```bash
cd /Users/kual/Desktop/log-note
nvm use
npm run dev
```

在设置中的 Agent Bridge 面板创建一次性配对，保持已登录标签页打开。把显示的短期配对 secret
仅粘贴到本机 MCP 配置，不要提交到 Git 或写入仓库文件。

本地 MCP 进程直接启动命令如下；配对 token 只在当前终端环境中提供：

```bash
export LOG_NOTE_BRIDGE_URL=http://127.0.0.1:3100
export LOG_NOTE_PAIRING_TOKEN='<paste-locally-and-do-not-commit>'
npm run log-note:mcp
```

## Configure the local MCP server

实现完成后，客户端配置应等价于：

```json
{
  "mcpServers": {
    "log-note": {
      "command": "node",
      "args": ["/Users/kual/Desktop/log-note/scripts/log-note-mcp.mjs"],
      "env": {
        "LOG_NOTE_BRIDGE_URL": "http://127.0.0.1:3100",
        "LOG_NOTE_PAIRING_TOKEN": "<paste-locally-and-do-not-commit>"
      }
    }
  }
}
```

### Codex CLI

当前本机的 Codex CLI 提供 `codex mcp add`，配置文件为 `~/.codex/config.toml`。在已启动
Log Note 且已生成配对令牌后，可以用环境变量代入一次性令牌：

```bash
export LOG_NOTE_BRIDGE_URL=http://127.0.0.1:3100
export LOG_NOTE_PAIRING_TOKEN='<paste-locally-and-do-not-commit>'
codex mcp add log-note \
  --env LOG_NOTE_BRIDGE_URL="$LOG_NOTE_BRIDGE_URL" \
  --env LOG_NOTE_PAIRING_TOKEN="$LOG_NOTE_PAIRING_TOKEN" \
  -- node /Users/kual/Desktop/log-note/scripts/log-note-mcp.mjs
codex mcp list
```

`codex mcp add` 会把这两个环境变量写入 Codex 的本地配置；配对令牌有时限，使用结束后应在
Log Note 设置中撤销配对，并按需执行 `codex mcp remove log-note`。不要把令牌复制到 Git、
提示词、截图或共享终端日志中。

### Claude Code

Claude Code 可以通过 `claude mcp add` 注册同一个 stdio server。使用 `--scope user` 会写入
用户级 Claude Code 配置；如果只想让当前项目可见，可改为 `--scope local`：

```bash
export LOG_NOTE_BRIDGE_URL=http://127.0.0.1:3100
export LOG_NOTE_PAIRING_TOKEN='<paste-locally-and-do-not-commit>'
claude mcp add --scope user log-note \
  -e LOG_NOTE_BRIDGE_URL="$LOG_NOTE_BRIDGE_URL" \
  -e LOG_NOTE_PAIRING_TOKEN="$LOG_NOTE_PAIRING_TOKEN" \
  -- node /Users/kual/Desktop/log-note/scripts/log-note-mcp.mjs
claude mcp list
```

Claude Desktop 的 macOS 配置文件通常位于
`/Users/kual/Library/Application Support/Claude/claude_desktop_config.json`；桌面客户端是否
自动重载配置、是否需要重启和具体显示位置，仍需在真实客户端验收时记录，不能用 CLI 结果代替。

## Protocol smoke test

按以下顺序运行，任何一步失败都不能继续调用 `commit_change`：

1. MCP handshake/discovery：确认 resources 和 tools 只包含 LN-084 的白名单。
2. `list_plans`、`list_records`、`lognote://categories`：确认当前账号、日期范围、revision、fingerprint 和截断标记正确。
3. `propose_plan_change` 或 `propose_record_change`：确认响应包含 before/after、TTL、目标、fingerprint、expected revision 和 `preview-required`，浏览器状态与备份字节不变。
4. 在客户端明确确认具体差异后调用 `commit_change`：确认只修改一个目标，返回 `applied=true`、新 revision 和 read-back。
5. 重复相同 commit：确认返回同一结果或 `alreadyApplied`，不创建第二个目标。
6. 修改目标或制造 revision 变化后再次 commit：确认返回 stale/conflict，原状态不被覆盖。

## Failure and boundary checks

- 使用账号 B 的配对 token 读取/提交账号 A 的 ID：必须拒绝。
- 关闭浏览器标签页、撤销配对、退出登录或切换账号：旧请求必须失效。
- 断网后读取：只能返回当前本地快照并标记 offline；写入不能声称云端已保存。
- 目标为 Google 来源计划：提案和提交都必须拒绝。
- 请求包含未知字段、超限日期范围、超长正文、附件 Blob 或 Google token：整个请求拒绝且零写入。
- 导出 JSON/Markdown、恢复旧备份、普通手工记录和计划编辑：结果与启用桥接前一致。

## Evidence to record

- handshake/discovery 原始响应（删除 token、正文和账号标识）。
- 读取、提案、确认、读回、stale 和重复提交的脱敏日志。
- 双账号隔离、撤销、离线和浏览器关闭的测试结果。
- 至少一次真实 Codex 或 Claude 客户端成功调用的截图/记录，以及当前版本和配对方式。
- `npm run check` 完整输出；真实客户端、真实账号和部署证据必须单独标记，不得由本地测试代替。

## Sanitized local smoke evidence (2026-09-05)

Using the `ln084` Playwright session against `http://127.0.0.1:3100` with the synthetic `E2E
Writer` account, the browser created a local pairing and displayed the secondary Agent Bridge
panel. A custom stdio MCP harness (not Codex or Claude) then completed the following bounded flow:

- MCP `initialize` returned server `log-note-agent-bridge` with seven allowlisted tools.
- `lognote://categories` returned six existing categories; a one-day `list_records` returned zero
  records with revision `0` and a stable fingerprint.
- `propose_record_change(create)` returned a single-target `preview-required` proposal. The browser
  displayed the exact date, time, content, and existing category diff without changing state.
- After clicking the browser's explicit “Confirm change”, `commit_change` returned
  `applied: true` with a bounded read-back object. The synthetic record was then deleted through a
  second proposal/confirmation/commit flow, and a fresh read returned zero records.
- Revoking the pairing from the browser made the previously valid token return HTTP `401` with
  `PAIRING_UNAVAILABLE`; the browser panel returned to “Not paired”.
- The installed Codex CLI (`codex-cli 0.145.0`) accepted the stdio registration through
  `codex mcp add` in a temporary `CODEX_HOME`, and `codex mcp list` reported `log-note` as enabled
  with both environment values redacted. The temporary configuration was removed after the check.

This evidence contains no pairing token, account identifier, or private record. It proves the local
browser/loopback path only. It does not prove real Codex/Claude discovery, a production account's
model-run tool invocation, a production account's cloud revision behavior, or background operation
while the browser is closed. The E2E auth mode does not write to Supabase, so the observed revision
remains a local synthetic value.

## Real Codex CLI evidence (2026-09-05)

Using a separate E2E-auth development server on `http://127.0.0.1:3110` and a synthetic `E2E
Writer` browser account, the installed Codex CLI `0.145.0` completed the shipped stdio MCP flow.
The MCP server was supplied through per-invocation `-c` overrides; no user configuration file or
pairing secret was committed.

- Codex discovered `log-note` and called `list_plans` for `2026-09-05`, receiving an empty bounded
  snapshot with `revision: 0`.
- Codex called `propose_plan_change(create)` for one synthetic time block. The browser displayed the
  exact before/after diff; an explicit browser “Confirm change” changed the proposal to `confirmed`,
  while no other state changed.
- Codex then called `commit_change` with the proposal ID, target, fingerprint, expected revision and
  `confirmation: "confirmed"`; the response contained `applied: true` and a normalized plan read-back.
  A second Codex `list_plans` call returned the plan.
- Codex repeated the same read → proposal → browser confirmation → commit → read-back journey for
  one record using the existing `daily` category. The read-back preserved the synthetic content
  exactly and returned `categoryId: "daily"`.
- Both synthetic objects were deleted through separate proposal/confirmation/commit flows, and
  follow-up Codex reads returned empty plan and record snapshots. The browser pairing was then
  revoked and the panel returned to “Not paired”; the local server and browser session were stopped.

All observed commits returned `syncPending: true` and used the E2E local-auth path; this is evidence
of real Codex MCP discovery, browser confirmation, local commit and read-back, not of Supabase cloud
persistence. No pairing secret, account identifier or private record was recorded. Claude Code,
production-account CAS/revision behavior, dual-account lifecycle, Google OAuth and background
operation while the browser is closed remain open evidence.

## Real Claude Code read-only evidence (2026-09-05)

Using the same local E2E-auth server on `http://127.0.0.1:3110` and a synthetic `E2E Writer`
browser account, Claude Code `2.1.206` was started with an ephemeral `--mcp-config` containing the
local stdio server and pairing token. Claude discovered `log-note` and successfully called
`list_plans` for `2026-09-05` and `list_records` for `2026-09-05`; both returned zero items. The
prompt explicitly forbade proposal and commit tools, and the run made no writes.

This proves Claude Code CLI MCP discovery and bounded read-only invocation. It does not prove
Claude write confirmation, production-account CAS/revision behavior, dual-account lifecycle,
Google OAuth or background operation while the browser is closed. The pairing token was supplied
only through the ephemeral process configuration and was not written to the repository or a
persistent Claude configuration.

## Real Claude Code proposal and commit evidence (2026-09-05)

Using a fresh short-lived pairing on the same local E2E-auth server and synthetic account, Claude
Code created one local plan proposal (`2026-09-05`, `13:15–14:15`, title `Claude confirmed plan`).
The browser displayed the exact before/after preview and the operator clicked “Confirm change”.
The first resumed commit was rejected as `STALE_FINGERPRINT` because Claude did not preserve one
binding value byte-for-byte; no data changed. After being instructed to reuse the original
proposal fields exactly, the same confirmed proposal committed successfully with `applied: true`
and a normalized plan read-back. Claude then proposed deletion of that exact plan, the browser
confirmed it, and a resumed `commit_change` returned `applied: true` with `{ deleted: true }`.

The pairing was revoked after cleanup. This proves the real Claude Code CLI proposal, explicit
browser confirmation, safe stale rejection, commit, read-back and delete loop on the local
browser-owned path. It does not prove production Supabase CAS/cloud persistence, dual-account
lifecycle or Google OAuth. The test used no real user records and no persistent client token.

The same session then completed the record path with a synthetic `2026-09-05 15:00` record using
the existing `daily` category. Claude proposed it, the browser confirmed it, and `commit_change`
returned `applied: true` with the exact content `Claude synthetic record` and `categoryId: daily`.
Claude proposed and committed deletion through the same confirmation flow, returning a deleted
read-back. No synthetic record remained after pairing revocation.

## Browser confirmation regression

The mobile browser suite also exercises the shipped external bridge path with the synthetic E2E
account. The scenario creates a pairing from Settings, calls the loopback bridge to read plans,
records, and categories, creates one plan proposal and one record proposal, verifies that the
payload is unchanged before confirmation, confirms both in the browser, commits them through the
queue, verifies the returned read-back, deletes both targets, and revokes the pairing. A request
made with the revoked token is rejected as `PAIRING_UNAVAILABLE`. This is browser/loopback evidence
only; it does not prove production Supabase CAS, Google OAuth, or operation while the browser is
closed.
