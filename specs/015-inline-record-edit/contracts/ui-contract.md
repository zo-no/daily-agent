# UI Contract: Inline Record Editing

## Ordinary row in reading mode

- The open-paper row, `data-entry-id`, Markdown output, tags, attachments, separator, and Agent anchor remain.
- Leading time and record content are separate keyboard/touch controls with distinct accessible names.
- Content activation opens no modal or backdrop. Time activation never activates the content editor.

## Ordinary row in editing mode

- Exactly one row replaces its rendered content with the canonical free-text or structured editor form.
- Neighboring records and the current date remain visible; the editor uses the row's writing width.
- Done is the only persistence action. Cancel and Escape discard and restore focus.
- More reveals the existing template/format, date, category, tags, attachment, and delete capabilities in the same row; time is edited only from the row's leading time surface.
- Starting the edit stops active Diary Agent review before the form mounts.

## Time fine-tuning surface

- The surface is non-modal, visually anchored to the time control, and contains one time input plus Done and Cancel.
- The surface stays within the viewport writing plane, does not cover the current record text or right rail, and uses a solid paper background above the page texture.
- Valid Done changes only time. Invalid, Cancel, Escape, outside activation, target/context replacement, or persistence failure changes nothing.
- Focus moves into the time input on open and returns to the same time control on close.

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
- DOM and keyboard order are time, content, inline editor actions/details. Escape closes only the current edit surface.
- 320/390/426/768/1280 pixels have no horizontal overflow, right-rail interception, or action-dock overlap.
- Reduced motion removes expansion travel without hiding the final open/focus state.

## Preserved boundaries

- New-record modal, periodic fixed-record inline controls, Plan editor, Search, settings, Diary/Plan Agent behavior, Hero request protocol, record schema, local-first sync, attachments, export, restore, and backup formats remain unchanged.
