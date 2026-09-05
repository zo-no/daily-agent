# Data Model: Inline Record Editing

No persisted entity or schema changes.

## Existing stored record

Fields remain `id`, `date`, `time`, `content`, `categoryId`, `tags`, `templateId`, `fieldValues`, `attachments`, and `createdAt`. `time` accepts legacy `HH:mm` and new `HH:mm:ss`; no old value is rewritten. Account ownership, local cache, cloud document, exports, and backups remain unchanged.

## Transient quick-add draft

- **Owner**: Home Diary stream for one selected date/view/account context.
- **Fields**: Proposed `HH:mm:ss`, one-line content, and focused/saving state.
- **Clock**: Ticks once per second while unfocused; freezes on focus; time activation refreshes to now.
- **Transitions**: `idle → focused → saved → idle`, `focused → cancelled → idle`, or `focused → failed → focused`.
- **Write invariant**: Non-empty blur or Enter creates exactly one ordinary record through `commitData`.
- **Invalidation**: Date, view, account, Calendar, Plan, tool, Agent, or source-context replacement.

## Transient complete dialog draft

- **Owner**: Home page session, exactly one existing record selected from its leading time or structured-content fallback.
- **Initial state**: A copy of the selected stored record plus existing editor-only derived fields.
- **Editable state**: Content or canonical structured fields, optional details, and staged attachments.
- **Presentation**: Canonical `RecordComposer` inside `DialogSurface`.
- **Transitions**: `reading → dialog editing → saved → reading` or `reading → dialog editing → discarded → reading`.
- **Persistence**: None until explicit Done delegates to the existing record save.
- **Invalidation**: Record target, date, view, tool surface, account, or source-record replacement.

## Transient Agent-linked row draft

- **Owner**: One active Diary Agent `enrich-detail` item and its existing source record.
- **Fields**: Canonical record draft plus the active Agent item identifier and visible question.
- **Presentation**: Canonical `RecordComposer` inline in the source row.
- **Transitions**: `question → editing → Done/save → next review item`, `question → editing → Cancel/keep original → next review item`, or `question → stale/stop → discarded`.
- **Write invariant**: Only the author's explicit Done may persist; no AI proposal mutates the record.
- **Persistence**: None until Done delegates to the existing complete-record save.

## Mutual exclusion

At most one compact content draft, complete dialog draft, or Agent-linked row draft is active. Opening another target first resolves the active state through the zero-write discard guard. Periodic fixed-record draft state remains independently owned by the existing fixed-record component.
