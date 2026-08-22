# Research: Left-Workspace Tools

## Decision 1: Reuse SettingsPage with an embedded mode

- **Decision**: Add a small presentation/navigation mode to the existing SettingsPage instead of copying its six panels.
- **Rationale**: The component already owns local-first actions, recovery, account, calendar, export, and structure behavior. Reuse keeps the direct route and embedded layer behavior aligned.
- **Alternatives considered**: A new settings dialog would duplicate hundreds of lines and risk divergent backup or account behavior.

## Decision 2: Use the home left workspace as the tool boundary

- **Decision**: Mount Search and embedded Settings inside an opaque paper workspace constrained to the left of the binding axis; keep the diary mounted beneath it.
- **Rationale**: This directly follows the user's marked screenshot, preserves the right-side composition and underlying layout anchors, and avoids turning a page tool into a full-screen modal.
- **Alternatives considered**: `DialogSurface` was implemented first but rejected by the user because it replaced the whole page and changed the right side.

## Decision 3: Keep standalone route hashes

- **Decision**: Embedded panel selection is local state; `/settings` continues to read and write compatible hashes.
- **Rationale**: Home context should not mutate its URL, while existing deep links remain a supported compatibility surface.
- **Alternatives considered**: Removing hashes would break existing links and browser regression coverage.

## Decision 4: Do not trap focus inside in-page tools

- **Decision**: Keep the persistent rail and bottom actions in the normal keyboard order while Search or Settings is active; Home owns Escape and focus restoration.
- **Rationale**: The right side is intentionally unchanged and remains part of the current page, so a modal focus trap would contradict the visual and interaction model.
- **Alternatives considered**: Retaining modal focus trapping would make visible right-side controls unreachable.
