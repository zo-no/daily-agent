# Log Note Design System

> Log Note should be quiet enough that recording feels effortless, and rigorous enough that years of records remain understandable to people and future AI systems.

## Product context

- **Product:** an account-owned, offline-capable personal recording app for linear notes and periodic daily records.
- **Primary task:** capture a record with the fewest possible decisions.
- **Secondary task:** maintain a dependable Domain → Category → Template structure.
- **Default language:** English, with complete Simplified Chinese UI support.

## Visual thesis

A precise recording instrument with the warmth of paper and the restraint of serious software. Typography, alignment and fine dividers express hierarchy; decoration does not.

## Tokens

| Role | Token | Value |
| --- | --- | --- |
| Page surface | `--paper` | `#F7F4ED` |
| Raised surface | `--paper-raised` | `#FFFDF8` |
| Primary ink | `--ink` | `#171712` |
| Secondary ink | `--muted` | `#6F6B61` |
| Divider | `--line` | `#D8D2C6` |
| Primary action | `--accent` | `#1F52FF` |

- UI and body: Instrument Sans.
- Editorial headings: Instrument Serif.
- Time, order and numeric values: IBM Plex Mono with tabular numbers.
- Type scale: display `36–52px`, page/domain title `28px`, section title `22px`, category heading `18px`, body/content `16px`, UI label `14px`, metadata/count `12px`.
- Reading hierarchy follows content structure: page/date → domain → category → record or metric → value/supporting text. A child label or value must not visually overpower its parent category.
- Read-only hierarchy uses size, weight, whitespace and progressive indentation. Decorative vertical connector lines are not used on the record page.
- Spacing uses a 4px base. Prefer 4, 8, 12, 16, 24 and 32px.
- Proximity follows one repeated reading rhythm: paired details use `4px`, headings sit `8px` from their own content, sibling groups separate by `16px`, sections by `24px`, and major regions by `32px`. A child must always sit closer to its own heading than to the next sibling heading.
- Radius is functional: 5–7px for controls, larger radii only for floating actions or bottom sheets.

## Semantic type and proximity hierarchy / 字体与亲密性层级

| 语义层级 | 字体与字号 | 字重 | 颜色 | 行高 | 标题/信息 → 所属内容 | 同级相邻组 | 跨区 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 大标题（展示、页面、领域） | Instrument Serif；`28px`，首屏展示可用 `36–52px` | `400` | `--ink` | `1.2` | `12px` · `--space-cluster` | `32px` · `--space-region` | `32px` · `--space-region` |
| 中标题（区块） | Instrument Serif；`22px` | `400` | `--ink` | `1.2` | `8px` · `--space-related` | `24px` · `--space-section` | `32px` · `--space-region` |
| 小标题（分类、表单分组） | Instrument Sans；`18px` | `600` | `--ink` | `1.35` | `4–8px` · `--space-paired/related` | `16–20px` · `--space-group` + optional `--space-paired` | `24–32px` · `--space-section/region` |
| 正文与记录内容 | Instrument Sans；`16px` | `400`，强调为 `600` | `--ink` | `1.55` | 配对信息 `4px` | 段落或字段组 `12–16px` | `24px` · `--space-section` |
| 辅助信息（标签、计数、时间） | Instrument Sans `14px`；时间/数值用 IBM Plex Mono `12px` | `500–600` | `--muted`；弱提示可用 `--faint` | `1.45–1.55` | 紧贴所属信息 `4px` | `8–12px` | `16–24px` |

Typography contrast establishes importance; proximity establishes ownership. A child label, description, count or value must be visually weaker than its parent and closer to that parent than to the previous or next group. When a spacing value and this ownership rule conflict, preserve ownership first while keeping the 4px base and 44px interactive targets.

## Interaction rules

- Recording remains the shortest path and must not expose structure maintenance by default.
- Structure management uses explicit drag handles, not whole-row dragging.
- Pointer and keyboard dragging are never the only controls; every sortable row provides Move up, Move down and, where relevant, Move to… actions.
- Hover and control transitions use 140–180ms. Drag lift and drop use 180–240ms.
- Periodic records use rhythm/cadence and value styling; linear records use a compact timeline.
- Empty hierarchy groups are valid drop targets and show one quiet instructional line.

## Source of truth

Detailed rules, writing guidance and research are routed from [设计规范/index.md](设计规范/index.md). When code and this document disagree, fix the code or record an explicit product decision before changing this document.

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-12 | Quiet and rigorous direction | Reduce recording friction without weakening long-term structure. |
| 2026-08-12 | Local font packages | Offline and CI builds must not depend on Google Fonts. |
| 2026-08-12 | dnd-kit plus menu fallback | Support pointer, touch and keyboard use without making drag the only path. |
| 2026-08-14 | Semantic type hierarchy | Users scan top-to-bottom and left-to-right; domain and category context must be understood before individual records or values. |
| 2026-08-14 | Local images live behind record details | Preserve the shortest quick-record path while allowing an optional offline attachment without permanent toolbar chrome. |
| 2026-08-15 | Month overview becomes a collapsible diary-date context | Improve browse → retrieval with one selected-date disclosure shared by Diary and Plan. The month/day is the dominant diary heading; the weekday follows with smaller Sans type, muted color and a related-but-distinct gap. The heading never repeats a month title or displays activity statistics. Horizontal swipes move by day while collapsed and by month while expanded, keep vertical scrolling native and provide restrained directional follow/settle motion. The visible previous/next component is removed as redundant; opening the seven-column grid, selecting a day or nearby month, and keyboard grid navigation remain explicit non-swipe paths. Expanded state preserves the same heading DOM with no repeated toolbar, arrow group or confirmation action. |
| 2026-08-15 | Date navigation uses a restrained direction shadow and offset date plate | A horizontal gesture may begin across the visible home workspace rather than only on the date label, while the app bar, paper, date, content and contextual actions remain completely grounded. After horizontal intent locks, a full-viewport linear shadow provides direction, but its visible dark band resolves within `min(44vw, 420px)`: a rightward drag is darkest at the left edge and fades to transparency toward the right; a leftward drag mirrors the gradient. One compact warm-graphite rounded date plate displays the complete localized target year, month and day with a restrained `150ms` fade/scale-in. It keeps a stable vertical anchor and sits a capped `12vw` step toward the gesture direction instead of occupying the viewport center; it never follows the finger, adds arrows, or moves the page. At or below the strict `20%` final-distance threshold the shadow and plate fade out and the date does not change; above it both quickly clear as the existing previous/next day or month state updates. Vertical scrolling stays native, interactive dialogs/fields and the nearby-month track keep their own gestures, and reduced-motion mode makes the change effectively immediate. |
| 2026-08-15 | Mobile app identity is the current diary date | On 320–700px, the one shared date disclosure occupies the app-bar identity position and replaces the visible `Log Note` brand block; the workspace must not render a second date heading. Weekday remains visibly subordinate. Removing the previous/next row lets 341–700px return to a single app-bar row; at 320px the date and utility tools may use two compact rows to protect legibility and 44px targets. Language, search, structure and settings remain available. At 701px and above, the brand remains in the first row and the identical date DOM remains in the second row. |
| 2026-08-15 | Diary and Plan share one upper control stack | The hierarchy is app bar → fused date navigator → optional month picker → Diary-only `Time / Category` tabs → active lower surface. The lower-right `Diary / Plan` switch is the workspace control and remains reachable in both modes. Entering or leaving Plan changes only the last layer and never swaps, compresses or duplicates the upper controls; it preserves the selected record view. The plan FAB remains contextual, diary-only export/new-record actions stay hidden in Plan, and sync, reminders, Agent execution and generalized calendar modes remain out of scope. |
| 2026-08-14 | Category metadata distinguishes records from progress | Ordinary record categories omit redundant entry counts; categories with visible periodic templates show completed/total progress, including zero-completion states. |
| 2026-08-14 | 600–800px uses a compact workspace layout | Medium-width desktop and tablet windows keep the single-row topbar, a 36px date title and bounded record/value columns instead of inheriting the stretched phone layout; 320/390 mobile and 1280 desktop remain distinct regression targets. |
| 2026-08-15 | Smart organize is an isolated confirmation workspace | The shared record-navigation row exposes one fixed compact secondary action beside Time / Category, so the entry does not appear or disappear when views change. It stays sized to its label without an explanatory block, extra divider or full-width module. Desktop uses a quiet selection/suggestion split; mobile shows selection, local analysis, and confirmation as separate stages. Existing tags, evidence, confidence, explicit apply and undo are visible; raw text, quick recording, accounts, remote AI and background analysis stay untouched. |
| 2026-08-15 | Time/category switching belongs only to record surfaces | Direct product-owner feedback prioritizes one-handed reach and a quieter topbar without mixing workspace navigation into the date header. The underlined `Time / Category` tabs sit below the shared date context in Diary; the lower-right `Diary / Plan` pill owns workspace navigation, keeps 44px targets and keyboard state, and remains above the plan FAB when planning. |
| 2026-08-15 | Proximity uses semantic spacing roles | Apply the 4px base as a readable hierarchy rather than uniform whitespace: content stays closest to its heading, sibling groups receive one clear step, and major regions receive the largest step. This rhythm is shared by records, forms, settings, structure management and smart organize without adding cards or decorative dividers. |
| 2026-08-15 | Settings follows user tasks and proximity | Keep one stable settings index and one active work panel, but name and group it by what the user is trying to do rather than by implementation objects. The five top-level tasks are General, Account, Download, Restore, and Images. Account is a quiet optional identity surface; all file-producing actions—readable records, download format, complete/text backups, current structure, and starter example—belong to Download with clear internal groups; Restore is isolated because it imports and replaces data. Mobile shows one “Settings” title and five index rows whose secondary line is a status or distinct action, not a repeated description. Desktop uses the same five labels in a quiet sticky rail. The browser-only data boundary appears once beside backup download and once where image behavior requires it; abstract headings such as “where records are saved,” “local use,” or “stored on this device” are not repeated. Old section hashes remain compatible. |
| 2026-08-15 | Routine settings do not explain the obvious | A familiar control label and its current state are sufficient when the effect is self-evident. General does not explain what changing the interface language does, and Home Screen access shows one actionable instruction rather than separate effect and instruction copy. Dividers express a boundary only between sibling settings: no leading rule before the first item and no trailing rule after the last item. |
| 2026-08-16 | Account gate owns entry; local cache owns responsiveness | Email/password is the primary domestic-network path and Google is an alternative. The same continuous-paper login surface replaces every app route until Supabase confirms an account; the form uses familiar labels, a restrained sign-in/register segmented control, masked passwords and 44px+ actions. After login, the workspace stays visually focused on recording: changes save to an account-scoped local cache first and synchronize automatically in the background. Settings shows one quiet sync status rather than manual save controls. Revision conflicts surface as a restrained global warning and offer explicit cloud/local choices; no last-write-wins. Images remain local, account-scoped, and clearly excluded from cloud saving. A previously authenticated device keeps the full workspace offline. |
| 2026-08-17 | Google Calendar stays an explicit secondary planning connection | Account settings owns connection, last-sync status and the one primary sync action; the home page gains no permanent calendar control. Log Note local plans remain editable and may create marked events in the Google primary calendar. Existing Google events reuse the day-plan geometry but carry a restrained source label and remain read-only; all-day events use a separate compact row instead of a false midnight block. Access failure never changes local plans, and Google access tokens never enter Log Note data, backups or cloud documents. |
| 2026-08-17 | Smart organize is scoped by one shared diary date | Smart organize reuses the home workspace's diary-style date disclosure and open month-grid kernel instead of a browser-native date field, while leaving home-only swipe and Diary/Plan behavior isolated. The disclosure itself is the familiar selection affordance, so the workspace does not repeat an obvious “Choose a day” heading. It defaults to today; selecting a day in organize collapses the month grid so the chosen day's records immediately regain the working area, while nearby-month navigation may remain open. Major separation between date context and records uses section whitespace; the hairline below the record heading is reserved for the list boundary, so two different relationships are not expressed by identical rules. The left pane previews every ordinary record from that day as continuous reading content rather than a checkbox batch; cross-date presets, search, selected counts, select-all/invert and whole-day manual assignment remain removed. Desktop retains a quiet date-preview/suggestion split, while mobile keeps date → analysis → confirmation stages. Suggestions remain explicit, reversible, and unable to rewrite raw text or save automatically; the original tag-only result semantics are superseded by the 2026-08-18 category decision below. |
| 2026-08-17 | Remote AI changes the engine, not the organizer interface | The existing single explicit organize action may call a server-side DeepSeek classifier and visibly falls back to local rules when unavailable. No provider badge, explanation block, chat surface, additional confirmation step or permanent AI control is added. Suggestions keep the existing confidence, review, apply and undo geometry; the original tag-only constraint is superseded by the 2026-08-18 category decision below. |
| 2026-08-18 | Diary Markdown import is a quiet merge before destructive restore | Settings → Restore separates the reversible-feeling “add dated notes” task from “replace from backup.” The merge action appears first as a normal secondary file action, while the existing rust-tinted warning remains attached only to replacement. Import uses filename dates, preserves note text and time, skips exact duplicates, adds no cards or home control, and exposes no source-specific parsing options in the main interface. |
| 2026-08-18 | Smart organize files records into existing domain/category paths | This supersedes the earlier existing-tag-only constraint. The user expects “organization” to change where a record belongs, not to append `#tags`. Each suggestion therefore names one existing `Domain / Category`, and explicit apply changes only `entry.categoryId`; the parent domain is derived from that category. AI and local fallback cannot create structure or tags, cannot choose more than one category per record, and cannot change content, tags, template, attachments, date, or time. Low-confidence and already-correct records stay where they are; removal, ignore, recalculate, apply, and undo remain explicit. |
