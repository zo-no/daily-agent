# Data Model: Quick Record Bar

No new persisted entity or field is introduced.

## Existing record contract

The quick action continues to create the existing record shape with `date`, `time`, `content`, `categoryId`, `templateId`, `fieldValues`, `attachments`, `tags`, and `createdAt`. The quick path supplies today's date, current second-precision time, plain text content, the existing quick category, and the existing quick template.

## Transient UI state

- `quickRecordOpen`: whether the top input is expanded for the current page context.
- `quickRecordFocusToken`: a monotonic focus request used after switching to today/Time.
- `longPressProgress`: pointer-only progress value; never persisted.

