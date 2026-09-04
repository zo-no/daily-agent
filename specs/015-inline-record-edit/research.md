# Research: Inline Record Editing

## Decision 1: Reuse one editor form with two presentations

- **Decision**: Keep the current record editor logic as one component and add an inline presentation for existing records; new records keep the current modal presentation.
- **Rationale**: The existing editor already owns Markdown, structured fields, Hero improvement, details, attachments, delete, validation, and explicit save. Reusing it avoids divergent behavior.
- **Alternatives considered**: A text-only `contentEditable` row loses structured and attachment behavior. A second full inline editor duplicates validation and persistence. Converting new-record creation is outside scope.

## Decision 2: Split the row into semantic time and content controls

- **Decision**: Preserve the row container and Agent anchor but replace its single whole-row button with sibling time and content buttons.
- **Rationale**: Time and content now have distinct actions, and an inline form cannot be nested in the existing button.
- **Alternatives considered**: Coordinate detection on one button is inaccessible. An always-visible edit icon adds permanent clutter.

## Decision 3: Use a non-modal, time-only anchored surface

- **Decision**: Open one small non-modal dialog from the time control, with a local time input, explicit Done/Cancel, Escape/outside dismissal, and trigger-focus restoration.
- **Rationale**: This matches the requested fine-tuning flow without hiding the record or invoking the complete editor.
- **Alternatives considered**: Immediate native-picker save is inconsistent and silently writes. A viewport-wide sheet recreates the interruption.

## Decision 4: Keep explicit record completion and attachment staging

- **Decision**: Text/details save only through Done; blur, outside activation, Escape, and context changes discard rather than save.
- **Rationale**: Multiline blur is ambiguous, and attachment cleanup already depends on an explicit finalize/discard boundary.
- **Alternatives considered**: Autosave risks accidental writes. Per-field saves fragment one record edit into multiple revisions.

## Decision 5: Preserve the canonical local-first write path

- **Decision**: Full row edits continue through `saveEntry`; time-only edits use one narrow immutable merge before `commitData`.
- **Rationale**: This preserves account ownership, offline behavior, revision safety, and ordering while making the time-only invariant testable.
- **Alternatives considered**: A new storage hook, route, or schema field is unnecessary and conflicts with the architecture.
