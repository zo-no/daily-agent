# Research: Quick Record Bar

## Decision: Keep one quick-record writer

`saveInlineQuickRecord` already normalizes the quick category and calls `commitData`. Reusing it preserves local-first revision/CAS, offline behavior, account isolation, export, and backup compatibility.

## Decision: Use real today for quick records

The current quick row combines `selectedDate` with a live current time. That permits a historical-date/current-time combination. The accepted behavior switches to `localDate()` before rendering and saving, so the date and time belong to the same device-local day.

## Decision: Keep latest-first ordering

The existing model sorts by `time` descending, then `createdAt` descending. The input row is a separate fixed visual row above the list, so the reading order is explicit without changing stored records.

## Decision: Pointer-only long-press feedback

The 600 ms ring is transient UI. Keyboard Enter/Space use normal activation, and no voice capability is introduced in this requirement.

