# Data Model: Inline Record Editing

No persisted entity or schema changes.

## Existing stored record

Fields remain `id`, `date`, `time`, `content`, `categoryId`, `tags`, `templateId`, `fieldValues`, `attachments`, and `createdAt`. Account ownership, local cache, cloud document, exports, and backups remain unchanged.

## Transient row draft

- **Owner**: Home page session, exactly one existing record.
- **Initial state**: A copy of the selected stored record plus existing editor-only derived fields.
- **Editable state**: Content or canonical structured fields, optional details, and staged attachments.
- **Transitions**: `reading → editing → saved → reading` or `reading → editing → discarded → reading`.
- **Persistence**: None until explicit Done delegates to the existing record save.
- **Invalidation**: Record target, date, view, tool surface, account, or source-record replacement.

## Transient time draft

- **Owner**: Home page session, exactly one existing record and time trigger.
- **Fields**: `entryId`, original source signature, proposed `HH:mm` value.
- **Transitions**: `closed → open → saved → closed` or `closed → open → dismissed → closed`.
- **Validation**: Complete local 24-hour `HH:mm`; missing or invalid values cannot persist.
- **Write invariant**: A successful transition changes only the stored record's `time` field.
- **Persistence**: None until explicit Done.

## Mutual exclusion

At most one transient row draft or time draft is active. Opening another target first resolves the active state through the zero-write discard guard. Periodic fixed-record draft state remains independently owned by the existing fixed-record component.
