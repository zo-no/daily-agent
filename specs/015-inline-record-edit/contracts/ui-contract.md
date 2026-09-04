# UI Contract: Inline Record Editing

## Ordinary row in reading mode

- The open-paper row, `data-entry-id`, Markdown output, tags, attachments, separator, and Agent anchor remain.
- Leading time and record content are separate keyboard/touch controls with distinct accessible names.
- Free-text content activation replaces only that content cell with the compact textarea; no pencil, modal,
  backdrop, or detailed editor appears. Structured content uses the complete-dialog fallback.
- Stored-time activation opens the canonical complete record dialog and never mounts the detailed row editor.

## Direct free-text editing mode

- Exactly one row replaces its rendered free-text content with the compact textarea.
- The initial replacement preserves the reading row/body height, text start axis, and following-row position.
  The row may grow only after the author enters content that requires additional lines.
- Valid changed text saves on blur. Escape writes nothing and restores focus to the record text target.
- Empty or failed saves retain a correction-ready input without overwriting valid stored content.
- Starting the edit stops active Diary Agent review before the input mounts.

## Complete dialog from stored time

- The canonical `RecordComposer` mounts in its existing modal `DialogSurface`, prefilled with the selected record.
- Content, supported structured fields, date, time, category, tags, attachments, Hero improvement, and confirmed delete retain their current behavior.
- Done delegates to the existing complete save. Close, Escape, confirmed discard, target/context replacement,
  or failed persistence changes nothing.
- The rejected time-only popover is absent.

## Agent-linked detailed editor

- Only an active Diary Agent `enrich-detail` item mounts the canonical inline `RecordComposer` in its source row.
- The Agent question remains visibly and accessibly attached above the form.
- Done saves the author-edited complete record once and advances to the next review item.
- Cancel discards staged changes, keeps the original record, and advances; stop/stale/context replacement discards without writing.
- `clarify-category`, category, and Plan Agent items keep their existing compact review controls.

## Inline quick-add row

- One compact row follows a populated idle ordinary-record stream: a leading `HH:mm:ss` button and one
  adjacent single-line input. It replaces the standalone “add here” button and opens no modal.
- The time updates once per second while the input is unfocused, freezes on focus, and refreshes to the
  current second when activated. Clock ticks are not announced as live updates.
- Non-empty blur or Enter creates exactly one ordinary record through the canonical local-first boundary.
  Empty blur and Escape write nothing; failed persistence keeps the draft editable.
- The lower record stamp remains the path to the complete new-record composer and Hero improvement flow.

## Accessibility and responsive behavior

- No button contains another button, form, link, input, select, or textarea.
- Affected interactive targets are at least 44 by 44 pixels with visible focus and localized names.
- DOM and keyboard order are time, content, then the active direct/dialog/Agent-linked controls. Escape closes only the current edit surface.
- 320/390/426/768/1280 pixels have no horizontal overflow, right-rail interception, or action-dock overlap.
- Reduced motion removes expansion travel without hiding the final open/focus state.

## Preserved boundaries

- New-record modal, periodic fixed-record inline controls, Plan editor, Search, settings, Diary Agent
  classification flow, Plan Agent behavior, Hero request protocol, record schema, local-first sync,
  attachments, export, restore, and backup formats remain unchanged.
