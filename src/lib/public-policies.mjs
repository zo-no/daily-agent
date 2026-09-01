/**
 * @fileoverview Versioned, bilingual public identity, privacy, and terms content.
 *
 * Keep this module free of account state and browser APIs so policy rendering and
 * contract tests share one reviewable source of truth.
 */

export const PUBLIC_POLICY_SITE = Object.freeze({
  productName: "Log Note",
  supportEmail: "x2742160682@gmail.com",
  effectiveDate: "2026-09-01"
});

export const PUBLIC_POLICY_PATHS = Object.freeze(["/about", "/privacy", "/terms"]);
const PUBLIC_POLICY_PATH_SET = new Set(PUBLIC_POLICY_PATHS);

function section(id, heading, paragraphs = [], items = []) {
  return Object.freeze({ id, heading, paragraphs: Object.freeze(paragraphs), items: Object.freeze(items) });
}

function localized(en, zhCN) {
  return Object.freeze({ en, "zh-CN": zhCN });
}

const about = Object.freeze({
  slug: "about",
  path: "/about",
  title: Object.freeze({ en: "About Log Note", "zh-CN": "关于 Log Note" }),
  description: Object.freeze({
    en: "A quiet daily record for quick capture, clear retrieval, offline use, portable backups, and optional Google Calendar context.",
    "zh-CN": "一款安静的日常记录工具，支持快速记录、清晰找回、离线使用、便携备份与可选的 Google 日历上下文。"
  }),
  intro: Object.freeze({
    en: "Log Note is a quiet, account-owned notebook for quickly recording a day, reviewing it, and optionally planning beside your Google Calendar.",
    "zh-CN": "Log Note 是一款安静、归属于个人账号的记录工具，用于快速记下当天内容、回顾记录，并可选择结合 Google 日历安排计划。"
  }),
  marketing: Object.freeze({
    hero: Object.freeze({
      eyebrow: localized("A personal record of ordinary days", "为平常日子保留一份个人记录"),
      headline: localized("Keep the day. Keep it yours.", "把今天记下来，也把它留给自己。"),
      body: localized(
        "Important moments are easy to lose. Recording them should not turn life into a dashboard. Log Note keeps capture simple, retrieval clear, and ownership visible.",
        "重要的片段很容易丢失，但记录生活不该把生活变成仪表盘。Log Note 让记录保持简单，让找回、修改和带走记录始终清楚。"
      ),
      primaryAction: localized("Open Log Note", "打开 Log Note"),
      secondaryAction: localized("Read privacy", "查看隐私权政策")
    }),
    preview: Object.freeze({
      label: localized("Illustrative product preview", "产品示意"),
      date: localized("September 1 · Monday", "9月1日 · 星期一"),
      entries: Object.freeze([
        Object.freeze({ time: "08:10", text: localized("Walked before the city woke up.", "趁城市还没醒，先走了一段路。") }),
        Object.freeze({ time: "12:40", text: localized("A small decision worth remembering.", "记下了一个值得回头看的小决定。") }),
        Object.freeze({ time: "22:15", text: localized("Closed the day with one line.", "用一句话收好今天。") })
      ]),
      plans: Object.freeze([
        Object.freeze({ time: "09:30", title: localized("Focus block", "专注时间"), source: localized("Log Note plan", "Log Note 计划"), readOnly: false }),
        Object.freeze({ time: "14:00", title: localized("Design review", "设计评审"), source: localized("Google · read-only", "Google · 只读"), readOnly: true })
      ])
    }),
    coreLoop: Object.freeze({
      eyebrow: localized("The useful loop", "真正有用的闭环"),
      title: localized("One line now. A useful record later.", "现在写下一句，以后找回有用的一天。"),
      body: localized(
        "Capture first. Add structure only when it helps. Everything after that should make your own words easier to find, correct, remove, and keep.",
        "先记录，需要时再整理。之后的每一步，都应该让你更容易找回、更正、删除和保存自己的原话。"
      ),
      steps: Object.freeze([
        Object.freeze({ id: "record", label: localized("Quick record", "快速记录"), detail: localized("Open once, write, save.", "一次打开，写完就保存。") }),
        Object.freeze({ id: "browse", label: localized("Browse", "浏览"), detail: localized("Move through days without losing context.", "按日期回看，不丢失当天上下文。") }),
        Object.freeze({ id: "search", label: localized("Search", "搜索"), detail: localized("Find the line you need when it matters.", "需要的时候，找回那句话。") }),
        Object.freeze({ id: "control", label: localized("Edit or delete", "编辑或删除"), detail: localized("Correct the record or remove it explicitly.", "明确更正，也可以明确删除。") }),
        Object.freeze({ id: "backup", label: localized("Back up", "备份恢复"), detail: localized("Keep readable exports and complete backups.", "保留可读导出与完整备份。") }),
        Object.freeze({ id: "offline", label: localized("Use offline", "离线使用"), detail: localized("A previously signed-in device keeps the core loop available.", "已登录过的设备可继续使用核心记录能力。") })
      ])
    }),
    principles: Object.freeze({
      eyebrow: localized("Designed around ownership", "围绕记录归属设计"),
      title: localized("Your notes are the product—not your attention.", "产品的中心是你的记录，不是你的停留时长。"),
      items: Object.freeze([
        Object.freeze({ id: "local-first", title: localized("Local first", "本地优先"), body: localized("Text changes land in the current account's browser before cloud synchronization.", "文字变更先写入当前账号的浏览器，再进行云端同步。") }),
        Object.freeze({ id: "account-owned", title: localized("Account isolated", "账号隔离"), body: localized("Each account has its own browser cache and revisioned cloud document.", "每个账号拥有独立的浏览器缓存和带版本的云端文档。") }),
        Object.freeze({ id: "raw-notes", title: localized("Raw notes stay raw", "原文保持原文"), body: localized("AI never silently rewrites a note. Any applied change requires an explicit action.", "AI 不会静默改写记录；任何写入都需要明确操作。") }),
        Object.freeze({ id: "portable", title: localized("Portable by design", "随时可以带走"), body: localized("Export readable Markdown, complete JSON, or a portable backup that can include local images.", "可导出可读 Markdown、完整 JSON，或包含本地图片的便携备份。") })
      ])
    }),
    calendar: Object.freeze({
      eyebrow: localized("Optional Google Calendar", "可选的 Google 日历"),
      title: localized("Calendar context, only when you ask for it.", "需要日程上下文时，再连接日历。"),
      body: localized(
        "Connect from Account settings to see existing Google events as read-only context beside local plans. Log Note changes only events it marks as Log Note-managed. Disconnecting never blocks recording or local planning.",
        "你可以在账号设置中主动连接，把已有 Google 事件作为只读上下文显示在本地计划旁。Log Note 只会变更由自身标记为受管的事件；断开连接也不会影响记录和本地计划。"
      ),
      link: localized("See the complete data boundary", "查看完整数据边界")
    }),
    finalCta: Object.freeze({
      eyebrow: localized("Begin quietly", "安静地开始"),
      title: localized("Start with one line.", "从一句话开始。"),
      body: localized("Open Log Note, capture what matters, and let the structure wait until you need it.", "打开 Log Note，先记下重要的内容；结构可以等到真正需要时再出现。"),
      primaryAction: localized("Open Log Note", "打开 Log Note"),
      secondaryAction: localized("Review the terms", "查看服务条款")
    })
  }),
  sections: Object.freeze({
    en: Object.freeze([
      section("what-it-does", "A notebook first", [
        "Log Note keeps quick recording at the center. You can browse by day, search, edit or delete your records, organize them with your own structure, and export readable Markdown or complete backups.",
        "Text and structure save to the current account's browser first and then synchronize through its account-owned cloud document. Local images stay on that device unless you explicitly include them in a portable backup."
      ]),
      section("google-calendar", "Optional Google Calendar connection", [
        "If you choose Connect and sync in Account settings, Log Note requests the Google Calendar events permission. It reads schedule context from your primary Google Calendar and shows existing Google events as read-only beside your local plans.",
        "Log Note creates, updates, or deletes only Google events that it has marked as Log Note-managed. It does not modify or delete your pre-existing, unmarked Google events. The connection is optional; recording and local planning continue without it."
      ]),
      section("optional-ai", "Optional AI-assisted review", [
        "Some review and organization tools can send a bounded selection of record or plan text to the configured AI service after you start the action. Each surface explains its boundary before or while you use it. AI output does not silently rewrite raw notes; changes require an explicit user action."
      ]),
      section("project-contact", "Independent project and contact", [
        "Log Note is currently maintained as an independent personal project. The public application is evolving, so production availability and optional integrations may change.",
        `Questions about the application, privacy, data deletion, or these terms can be sent to ${PUBLIC_POLICY_SITE.supportEmail}.`
      ])
    ]),
    "zh-CN": Object.freeze([
      section("what-it-does", "先做好记录", [
        "Log Note 始终把快速记录放在中心。你可以按日期浏览、搜索、编辑或删除记录，使用自己的结构整理内容，并导出可读的 Markdown 或完整备份。",
        "文字与结构先保存到当前账号的浏览器，再通过该账号自己的云端文档同步。本地图片留在当前设备，除非你明确把它们加入便携备份。"
      ]),
      section("google-calendar", "可选的 Google 日历连接", [
        "当你在账号设置中主动选择“连接并同步”时，Log Note 会请求 Google 日历事件权限。它从你的 Google 主日历读取日程上下文，并把已有 Google 事件以只读方式显示在本地计划旁边。",
        "Log Note 只会创建、更新或删除由自身标记为“Log Note 管理”的 Google 事件，不会修改或删除你原本已有且没有该标记的 Google 事件。连接是可选的；不连接也可以继续记录和使用本地计划。"
      ]),
      section("optional-ai", "可选的 AI 辅助回顾", [
        "部分回顾和整理工具会在你主动开始操作后，把有明确上限的一部分记录或计划文字发送给当前配置的 AI 服务。每个入口会在使用前或使用时说明边界。AI 结果不会静默改写原始记录；任何写入都需要你的明确操作。"
      ]),
      section("project-contact", "独立项目与联系方式", [
        "Log Note 目前由个人作为独立项目维护。公开应用仍在演进，生产可用性和可选集成可能发生变化。",
        `有关应用、隐私、数据删除或本条款的问题，可以发送到 ${PUBLIC_POLICY_SITE.supportEmail}。`
      ])
    ])
  })
});

const privacy = Object.freeze({
  slug: "privacy",
  path: "/privacy",
  title: Object.freeze({ en: "Privacy Policy", "zh-CN": "隐私权政策" }),
  description: Object.freeze({
    en: "How Log Note accesses, uses, stores, shares, and lets you control account and Google Calendar data.",
    "zh-CN": "Log Note 如何访问、使用、存储和共享账号及 Google 日历数据，以及你可以如何控制这些数据。"
  }),
  intro: Object.freeze({
    en: "This policy describes the current public Log Note application. It is written to make the optional Google Calendar and AI data boundaries explicit before you use them.",
    "zh-CN": "本政策说明当前公开版 Log Note 的数据处理方式，并在你使用可选 Google 日历和 AI 功能前明确其数据边界。"
  }),
  sections: Object.freeze({
    en: Object.freeze([
      section("data-we-collect", "1. Information you provide and create", [
        "For authentication and account ownership, Log Note uses the account identifier and available profile fields supplied by the configured Supabase-compatible authentication service, such as email address, display name, initials, and sign-in provider. Log Note does not store your password in its note data.",
        "Your account-owned content may include records, plans, categories, domains, templates, settings, tags, timestamps, and references to local attachments or Log Note-managed calendar events. The application also keeps your language and installation preferences in browser storage.",
        "Images are stored in the current account's local browser database. They are not included in the normal text cloud document; they leave the device only when you explicitly create or restore a portable backup that contains them."
      ]),
      section("storage-and-sync", "2. Local-first storage and account cloud sync", [
        "Records, plans, structure, and settings are written to an account-scoped browser cache first. When online, a text-only versioned document is synchronized to the configured Supabase service under the authenticated account. Revision checks pause synchronization instead of silently overwriting a newer cloud version.",
        "Supabase processes authentication and the account-owned cloud document to provide sign-in, account isolation, synchronization, and recovery. Account data is not made public through these policy pages."
      ]),
      section("google-calendar", "3. Google Calendar data", [
        "Google Calendar access is optional and separate from signing in. When you select Connect and sync, Log Note requests https://www.googleapis.com/auth/calendar.events for your primary Google Calendar.",
        "For schedule context and conflict display, Log Note reads events from 30 days before through 91 days after the current day. Your pre-existing, unmarked Google events are read-only in Log Note.",
        "Log Note creates, updates, or deletes only Log Note-managed events carrying its private marker and plan identifier. A removed local plan can delete its corresponding marked event; Log Note does not modify or delete unmarked events.",
        "The Google access token stays in browser memory for the current page session and is not written to Log Note data, Supabase, backups, logs, or the Service Worker. A normalized event cache is stored in account-scoped browser localStorage and is excluded from the cloud document and backups.",
        "For Log Note-managed events, the provider name, calendar ID, event ID, and current etag/version reference may be stored with the local plan and synchronized in that account's text document on Supabase. This reference lets Log Note update the same managed event safely; it is not a copy of the full Google event."
      ]),
      section("optional-ai", "4. Optional AI features", [
        "When you deliberately start an AI-assisted organize, diary review, plan review, or domain summary, Log Note sends only the bounded fields needed for that selected task through an authenticated same-origin endpoint to the configured AI model provider, currently DeepSeek unless the deployment configures an approved compatible provider.",
        "Depending on the tool, this may include selected record or plan text, dates and times, existing category names, limited conflict context, and the messages you type in that review. When you deliberately start Plan review, the title and time of overlapping Google events may be included as read-only conflict context so the visible review can explain the overlap. Account identifiers, passwords, Google access tokens, and image files are not included in the AI prompt.",
        "AI results are validated and remain temporary unless you explicitly apply a proposed change or add content. Raw notes are never silently rewritten. The configured AI provider processes submitted text under its own service and privacy terms. DeepSeek's published privacy materials currently state that service input may be used to develop, improve, or train its technology and describe a training opt-out; Log Note does not control the provider's processing after transfer. Do not submit content you do not want processed by that provider."
      ]),
      section("use", "5. How information is used", [
        "Log Note uses the information above only to authenticate you, keep each account isolated, save and restore your requested content, render and search your notebook, provide exports, synchronize your explicitly connected Calendar plans, run optional user-requested AI tools, secure the service, diagnose failures, and respond to support or deletion requests.",
        "The application does not use Google user data to build advertising profiles or train a generalized model."
      ]),
      section("sharing-limited-use", "6. Sharing, sale, and Google Limited Use", [
        "Log Note does not sell Google user data or other personal content, does not use it for advertising, and does not transfer it for unrelated purposes. Data is disclosed only to processors needed for a feature you request: the configured Supabase service for authentication and account cloud sync, Google for sign-in or Calendar operations, the configured AI provider for an AI action you start, and infrastructure providers that deliver the application.",
        "For Plan review only, starting the visible AI review sends the bounded Google event title/time conflict context described above to the configured AI provider to return that review. Log Note itself does not use the context for advertising, credit decisions, surveillance, or model training, and other AI tools do not receive Google Calendar data. The provider's processing remains governed by its own terms as disclosed above.",
        "Information may also be disclosed when required by applicable law or to protect users or the service. A project transfer would use notice and appropriate safeguards; any transfer of Google user data that requires explicit prior consent under Google's Limited Use rules will not occur without that consent.",
        "Log Note is designed to use information received from Google APIs in accordance with the Google API Services User Data Policy, including the Limited Use requirements. Human access to Google user data is limited to security/support needs with consent, legal obligations, or aggregated operations permitted by that policy. The Google OAuth integration remains in test status: production publication must not enable the Calendar-to-AI transfer unless the configured provider's contract and settings prohibit generalized-model training and otherwise satisfy Limited Use, or Calendar-derived context is removed from the AI request."
      ]),
      section("retention-security", "7. Retention and security", [
        "Browser data remains until you delete it, clear site data, switch/remove the account cache through supported controls, or the browser removes storage. The account-owned cloud document remains until it is replaced or deleted through the service or a verified deletion request. Google access tokens expire or are cleared on disconnect; the local Google event cache is cleared on disconnect.",
        "Log Note uses HTTPS in production, provider authentication, account-scoped storage, database access controls, bounded requests, and revision checks. No method of storage or transmission is completely secure, so keep exports and portable backups protected and use a secure device/account."
      ]),
      section("controls-deletion", "8. Your choices, revocation, and deletion", [
        "You can use Log Note without connecting Google Calendar, disconnect Calendar in Account settings, and revoke Log Note access from your Google Account permissions. Disconnecting clears the in-memory token and the current account's local Google cache; it does not delete events already present in Google Calendar.",
        "You can export your records and backups, delete individual records or plans, clear browser site data, and stop using the service. To request deletion of the account-owned cloud document or ask a privacy question, email the support address below from the account email and include enough information to verify ownership. Do not send your password or access token.",
        "Some information may be retained where reasonably necessary for security, legal obligations, dispute resolution, or backup rotation, then removed or de-identified when no longer needed."
      ]),
      section("children-changes", "9. Children and policy changes", [
        "Log Note is not directed to children under the minimum digital-consent age applicable where they live. If you believe a child provided personal information without valid permission, contact us.",
        "Material policy changes will update the effective date and should be published before the related data behavior is released. Continued use after a change means the current policy applies to later processing, subject to any consent required by law or Google policy."
      ]),
      section("contact", "10. Contact", [
        `Log Note is currently an independent personal project. Privacy, access, correction, or deletion questions can be sent to ${PUBLIC_POLICY_SITE.supportEmail}.`
      ])
    ]),
    "zh-CN": Object.freeze([
      section("data-we-collect", "1. 你提供和创建的信息", [
        "为了完成认证和确认账号归属，Log Note 会使用当前配置的 Supabase 兼容认证服务提供的账号标识及可用资料字段，例如邮箱地址、显示名称、姓名缩写和登录提供方。Log Note 不会把你的密码存进笔记数据。",
        "账号内内容可能包括记录、计划、分类、领域、模板、设置、标签、时间信息，以及本地附件或 Log Note 管理的日历事件引用。应用也会在浏览器中保存语言和安装偏好。",
        "图片保存在当前账号的本地浏览器数据库中，不进入普通文字云端文档；只有当你明确创建或恢复包含图片的便携备份时，图片才会离开该本地存储边界。"
      ]),
      section("storage-and-sync", "2. 本地优先存储与账号云同步", [
        "记录、计划、结构和设置会先写入按账号隔离的浏览器缓存。联网时，去除图片的版本化文字文档会同步到当前配置的 Supabase 服务，并归属于已认证账号。修订版本检查会在云端已有更新时暂停同步，而不是静默覆盖。",
        "Supabase 为登录、账号隔离、同步和恢复处理认证信息与账号云端文档。这些公开政策页面不会把账号数据公开出来。"
      ]),
      section("google-calendar", "3. Google 日历数据", [
        "Google 日历访问是可选的，并与登录分开授权。当你选择“连接并同步”时，Log Note 会针对你的 Google 主日历请求 https://www.googleapis.com/auth/calendar.events 权限。",
        "为了展示日程上下文和时间冲突，Log Note 会读取当前日期过去 30 天至未来 91 天的事件。你原本已有、未带 Log Note 标记的 Google 事件在 Log Note 中始终只读。",
        "Log Note 只会创建、更新或删除带有私有标记和计划标识的“Log Note 管理”事件。删除本地计划时，只能删除与其对应且已标记的事件；未标记事件不会被修改或删除。",
        "Google access token 只保留在当前页面会话的浏览器内存中，不写入 Log Note 数据、Supabase、备份、日志或 Service Worker。规范化后的事件缓存按账号隔离保存在浏览器 localStorage 中，不进入云端文档或备份。",
        "对于 Log Note 管理的事件，提供方名称、日历 ID、事件 ID 以及当前 etag/版本引用可能与本地计划一起保存，并同步到该账号在 Supabase 的文字文档。该引用只用于安全更新同一受管事件，不是完整 Google 事件的副本。"
      ]),
      section("optional-ai", "4. 可选 AI 功能", [
        "当你主动开始 AI 辅助整理、日记回顾、计划回顾或领域总结时，Log Note 只会把完成该次任务所需、且有明确上限的字段，通过已认证的同源接口发送给当前配置的 AI 模型服务。默认部署当前使用 DeepSeek；部署方也可能配置经过批准的兼容提供方。",
        "根据不同工具，发送内容可能包括选中的记录或计划文字、日期和时间、已有分类名称、有限的冲突上下文，以及你在该次回顾中输入的消息。当你主动开始计划回顾时，发生重叠的 Google 事件标题和时间可能作为只读冲突上下文一并发送，用于在可见回顾中解释时间重叠。账号标识、密码、Google access token 和图片文件不会进入 AI 提示词。",
        "AI 结果会经过校验并默认只在当前会话中存在；只有你明确应用建议或新增内容时才会写入。原始记录不会被静默改写。当前配置的 AI 提供方会按其自己的服务和隐私条款处理提交文字。DeepSeek 当前公开的隐私材料说明，服务输入可能用于开发、改进或训练其技术，并说明了退出训练的权利；数据转移后，Log Note 无法控制提供方的处理。请不要提交你不希望该提供方处理的内容。"
      ]),
      section("use", "5. 信息用途", [
        "Log Note 仅将上述信息用于：认证、保持账号隔离、保存和恢复你要求保存的内容、呈现和搜索笔记、生成导出、同步你明确连接的日历计划、运行你主动请求的可选 AI 工具、保护服务、诊断故障，以及响应支持或删除请求。",
        "应用不会使用 Google 用户数据建立广告画像，也不会用它训练通用模型。"
      ]),
      section("sharing-limited-use", "6. 共享、出售与 Google 有限使用", [
        "Log Note 不会出售 Google 用户数据或其他个人内容，不会将其用于广告，也不会为无关目的转移这些数据。数据只会提供给完成你所请求功能所必需的处理方：用于认证和账号云同步的 Supabase 服务、用于登录或日历操作的 Google、用于你主动发起 AI 操作的当前 AI 提供方，以及用于交付应用的基础设施提供方。",
        "仅在计划回顾中，开始可见的 AI 回顾会把上文所述、有明确上限的 Google 事件标题/时间冲突上下文发送给当前 AI 提供方，用于返回该次回顾。Log Note 自身不会将这些内容用于广告、信贷判断、监控或模型训练；其他 AI 工具不会接收 Google 日历数据。提供方的处理仍受上文所述其自身条款约束。",
        "在适用法律要求或保护用户/服务安全时，也可能依法披露信息。项目转移会提供通知并采取适当保护措施；如 Google 有限使用规则要求对 Google 用户数据转移取得事先明确同意，则未经该同意不会转移。",
        "Log Note 的设计目标是按照 Google API Services User Data Policy（包括有限使用 Limited Use 要求）使用从 Google API 获得的信息。人工访问 Google 用户数据仅限于经同意的安全/支持需要、法律义务，或该政策允许的汇总运维场景。Google OAuth 接入当前仍是测试状态：在生产发布前，必须通过 AI 提供方合同和设置确认其禁止将这些数据用于通用模型训练并满足其他有限使用要求；否则必须从 AI 请求中移除 Google 日历派生上下文。"
      ]),
      section("retention-security", "7. 保留与安全", [
        "浏览器数据会保留到你主动删除、清除网站数据、通过支持的方式切换/移除账号缓存，或浏览器自行移除存储为止。账号云端文档会保留到被新版本替换、通过服务删除，或经核验的删除请求完成。Google access token 会过期或在断开时清除，本地 Google 事件缓存也会在断开时清除。",
        "Log Note 在生产环境使用 HTTPS、提供方认证、账号隔离存储、数据库访问控制、有限请求和版本检查。任何存储或传输方式都无法保证绝对安全，请妥善保护导出文件和便携备份，并使用安全的设备与账号。"
      ]),
      section("controls-deletion", "8. 你的选择、撤销与删除", [
        "你可以不连接 Google 日历使用 Log Note；可以在账号设置中断开日历，也可以在 Google 账号权限页面撤销 Log Note 的访问。断开会清除浏览器内存中的 token 和当前账号本地 Google 缓存，但不会删除 Google 日历中已经存在的事件。",
        "你可以导出记录和备份、删除单条记录或计划、清除浏览器网站数据并停止使用服务。如需删除账号云端文档或咨询隐私问题，请使用账号邮箱向下方支持地址发送请求，并提供足够信息用于核验所有权。请勿发送密码或 access token。",
        "出于安全、法律义务、争议处理或备份轮转的合理需要，部分信息可能暂时保留；不再需要时会删除或去标识化。"
      ]),
      section("children-changes", "9. 未成年人和政策变更", [
        "Log Note 不以低于其所在地最低数字同意年龄的未成年人为目标用户。如果你认为未成年人未经有效许可提供了个人信息，请联系我们。",
        "重大政策变化会更新生效日期，并应在相关数据行为发布前公开。变更后继续使用时，当前政策适用于之后的处理，但法律或 Google 政策要求另行同意的情况除外。"
      ]),
      section("contact", "10. 联系方式", [
        `Log Note 目前是独立个人项目。有关隐私、访问、更正或删除的问题，请发送到 ${PUBLIC_POLICY_SITE.supportEmail}。`
      ])
    ])
  })
});

const terms = Object.freeze({
  slug: "terms",
  path: "/terms",
  title: Object.freeze({ en: "Terms of Service", "zh-CN": "服务条款" }),
  description: Object.freeze({
    en: "The terms for using the independent Log Note project and its optional integrations.",
    "zh-CN": "使用独立项目 Log Note 及其可选集成时适用的条款。"
  }),
  intro: Object.freeze({
    en: "These terms form the current operating agreement for the public Log Note application. If you do not agree, do not use the service or connect an external account.",
    "zh-CN": "本条款构成当前公开版 Log Note 的使用约定。如果你不同意，请不要使用本服务或连接外部账号。"
  }),
  sections: Object.freeze({
    en: Object.freeze([
      section("agreement-and-eligibility", "1. Agreement and eligibility", [
        "Log Note is currently an independent personal project, not a represented company. By creating an account, accessing the authenticated application, or connecting an optional integration, you agree to these terms and the current Privacy Policy.",
        "You must be legally able to agree to these terms where you live. If you use Log Note for an organization, you represent that you are authorized to do so and remain responsible for that use."
      ]),
      section("accounts", "2. Accounts and security", [
        "Provide accurate account information, protect your credentials and devices, and promptly revoke access or contact support if you suspect unauthorized use. You are responsible for activity performed through your account to the extent permitted by applicable law.",
        "Do not share passwords or access tokens with Log Note support. Authentication may be provided by Supabase, Google, or another explicitly configured sign-in provider, whose separate terms also apply."
      ]),
      section("user-content", "3. Your content and permission to process it", [
        "You retain ownership of the records, plans, images, structures, and other content you create or import. You grant Log Note only the limited permission needed to store, synchronize, transform for export, and process that content to provide features you deliberately use.",
        "You are responsible for having the right to submit the content and for deciding whether sensitive information is appropriate for browser, cloud, Calendar, backup, or optional AI processing. Log Note does not claim ownership of your raw notes and will not silently rewrite them."
      ]),
      section("acceptable-use", "4. Acceptable use", [
        "Do not use Log Note to violate law or another person's rights; access another account without authorization; distribute malware; probe, overload, or bypass service protections; misuse Google or other provider data; or interfere with other users or infrastructure.",
        "Automated use must stay within documented product behavior and provider limits. You may not resell access or present the independent project as your own service without written permission."
      ]),
      section("backup", "5. Backups, exports, and destructive actions", [
        "Log Note provides Markdown, JSON, and portable backup tools, but you remain responsible for keeping suitable copies of important content and testing that your backup can be read. Browser storage, devices, networks, and third-party services can fail.",
        "Review deletion, restore, account switching, Calendar disconnection, and provider-revocation actions before confirming them. A restore may replace current Log Note data; disconnecting Calendar does not remove events already stored in Google Calendar."
      ]),
      section("third-party", "6. Third-party services", [
        "Optional features depend on services such as Supabase for authentication/cloud synchronization, Google for sign-in and Calendar, and the configured AI model provider for user-started review. Those services are independent, may process data under their own terms, and may change or become unavailable.",
        "Log Note is not endorsed by or responsible for Google, Supabase, DeepSeek, or other third-party services. You control whether to connect optional services and can revoke them through the relevant provider."
      ]),
      section("service-availability", "7. Changes and availability", [
        "The application is evolving. Features, limits, integrations, storage behavior, or availability may change, and experimental features may be removed. Reasonable efforts may be made to preserve supported backups and announce material data-boundary changes, but uninterrupted or error-free operation is not guaranteed.",
        "Maintenance, security incidents, provider failures, legal requirements, or project capacity may suspend part or all of the service. Do not rely on Log Note as the only copy or as an emergency, regulated, or safety-critical system."
      ]),
      section("disclaimers", "8. Disclaimers and limitation", [
        "Log Note and its AI-generated or derived output are productivity aids, not legal, medical, financial, investment, mental-health, or other professional advice. Verify important information and use qualified professionals when appropriate.",
        "To the extent permitted by applicable law, the service is provided “as is” and “as available,” without warranties of accuracy, fitness, non-infringement, data preservation, or continuous availability. To that same extent, the project maintainer is not liable for indirect, incidental, special, consequential, or lost-data damages arising from use or inability to use the service. Rights that cannot legally be waived remain unaffected."
      ]),
      section("termination", "9. Suspension and termination", [
        "You may stop using Log Note at any time, export or delete content through available controls, revoke connected providers, and request deletion of the account-owned cloud document. Local browser data may require clearing site data on each device.",
        "Access may be suspended or ended for material breach, abuse, security risk, legal requirement, provider shutdown, or discontinuation of the project. Where practical and safe, reasonable notice or an export opportunity may be provided. Provisions that by nature should survive termination, including ownership and disclaimers, continue to apply."
      ]),
      section("changes-contact", "10. Terms changes and contact", [
        "The effective date identifies this version. Material changes will be published on this page before or when they take effect. If a change requires fresh consent, Log Note will request it rather than relying only on continued use.",
        `Questions, account requests, or notices can be sent to ${PUBLIC_POLICY_SITE.supportEmail}. No specific governing jurisdiction or exclusive court is selected by this operational draft; mandatory rights and rules applicable to you remain in effect.`
      ])
    ]),
    "zh-CN": Object.freeze([
      section("agreement-and-eligibility", "1. 同意与使用资格", [
        "Log Note 目前是独立个人项目，并非其所代表的公司。创建账号、访问需登录的应用或连接可选集成，即表示你同意本条款和当前隐私权政策。",
        "你必须在所在地具备同意本条款的法律能力。如果代表组织使用 Log Note，你声明自己已获得相应授权，并对该使用负责。"
      ]),
      section("accounts", "2. 账号与安全", [
        "请提供准确的账号信息，保护登录凭据和设备；如怀疑未经授权的使用，应及时撤销访问或联系支持。在适用法律允许的范围内，你对通过自己账号发生的活动负责。",
        "不要向 Log Note 支持人员提供密码或 access token。认证可能由 Supabase、Google 或明确配置的其他登录提供方完成，这些提供方的独立条款同样适用。"
      ]),
      section("user-content", "3. 你的内容与处理许可", [
        "你保留对自己创建或导入的记录、计划、图片、结构及其他内容的所有权。你仅授予 Log Note 为提供你主动使用的功能而存储、同步、转换导出和处理这些内容所必需的有限许可。",
        "你应确保有权提交相应内容，并自行判断敏感信息是否适合进入浏览器、云端、日历、备份或可选 AI 处理。Log Note 不主张拥有你的原始记录，也不会静默改写它们。"
      ]),
      section("acceptable-use", "4. 可接受使用", [
        "不得使用 Log Note 违反法律或他人权利、未经授权访问他人账号、传播恶意软件、探测/过载/绕过服务保护、滥用 Google 或其他提供方数据，或干扰其他用户和基础设施。",
        "自动化使用必须遵守已说明的产品行为和提供方限制。未经书面许可，不得转售访问权限或把本独立项目冒充为你自己的服务。"
      ]),
      section("backup", "5. 备份、导出与破坏性操作", [
        "Log Note 提供 Markdown、JSON 和便携备份工具，但你仍需为重要内容保留适当副本，并确认备份可以读取。浏览器存储、设备、网络和第三方服务都可能发生故障。",
        "确认前请检查删除、恢复、账号切换、日历断开和提供方撤销操作。恢复可能替换当前 Log Note 数据；断开日历不会删除 Google 日历里已经存在的事件。"
      ]),
      section("third-party", "6. 第三方服务", [
        "可选功能依赖 Supabase（认证和云同步）、Google（登录和日历）以及当前配置的 AI 模型提供方（由用户主动开始的回顾）等服务。这些服务相互独立，会按自己的条款处理数据，也可能变更或不可用。",
        "Log Note 不代表 Google、Supabase、DeepSeek 或其他第三方，也不对其服务负责。你可以自行决定是否连接可选服务，并通过对应提供方撤销。"
      ]),
      section("service-availability", "7. 变更与可用性", [
        "应用仍在演进。功能、限制、集成、存储行为或可用性可能变化，实验功能也可能移除。项目会合理尽力保持受支持备份兼容，并说明重大数据边界变化，但不保证不中断或无错误运行。",
        "维护、安全事件、提供方故障、法律要求或项目维护能力可能导致部分或全部服务暂停。不要把 Log Note 当作唯一副本，也不要用于紧急、受监管或安全关键系统。"
      ]),
      section("disclaimers", "8. 免责声明与责任限制", [
        "Log Note 及其 AI 生成或派生结果是效率辅助工具，不构成法律、医疗、财务、投资、心理健康或其他专业建议。重要信息应自行核验，并在适当时咨询合格专业人士。",
        "在适用法律允许的范围内，本服务按“现状”和“可用状态”提供，不保证准确性、适用性、不侵权、数据永久保存或持续可用。在相同范围内，项目维护者不对因使用或无法使用服务产生的间接、附带、特殊、后果性或数据丢失损害负责。依法不能排除的权利不受影响。"
      ]),
      section("termination", "9. 暂停与终止", [
        "你可以随时停止使用 Log Note，通过现有控件导出或删除内容、撤销已连接的提供方，并请求删除账号云端文档。每台设备上的本地浏览器数据可能需要分别清除网站数据。",
        "如发生重大违约、滥用、安全风险、法律要求、提供方关闭或项目停止，访问可能被暂停或终止。在可行且安全时，项目会合理提供通知或导出机会。按性质应在终止后继续有效的所有权和免责声明等条款仍然有效。"
      ]),
      section("changes-contact", "10. 条款变更与联系", [
        "生效日期标识当前版本。重大变化会在生效前或生效时发布在本页。如果变化需要重新同意，Log Note 会明确请求，而不会只依赖继续使用。",
        `问题、账号请求或通知可以发送到 ${PUBLIC_POLICY_SITE.supportEmail}。本操作性草案不擅自指定具体管辖法律或专属法院；对你强制适用的权利和规则仍然有效。`
      ])
    ])
  })
});

export const PUBLIC_POLICY_DOCUMENTS = Object.freeze({ about, privacy, terms });

export function isPublicPolicyPath(pathname) {
  return PUBLIC_POLICY_PATH_SET.has(String(pathname || ""));
}

export function publicPolicyDocumentText(document, locale) {
  const safeLocale = locale === "zh-CN" ? "zh-CN" : "en";
  const sections = document?.sections?.[safeLocale] || [];
  return [
    document?.title?.[safeLocale],
    document?.description?.[safeLocale],
    document?.intro?.[safeLocale],
    ...sections.flatMap((item) => [item.heading, ...item.paragraphs, ...item.items])
  ].filter(Boolean).join("\n");
}
