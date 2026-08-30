# Research: In-page Agent Plan Review

## Decision 1: Extend the existing endpoint with a review target

- **Decision**: Keep `mode` for analyze/reply and add `reviewTarget: "diary" | "plan"`.
- **Rationale**: Authentication, origin, size, rate, timeout, and provider behavior remain centralized,
  while Diary and Plan keep separate schemas and allowlists.
- **Alternatives considered**: A second route duplicates security code; overloading `entries` with plan
  fields makes output validation and privacy review ambiguous.

## Decision 2: Use minute integers at the AI boundary

- **Decision**: Convert local `HH:mm` values to `startMinute`/`endMinute` for requests and proposals.
- **Rationale**: Finite integer range/order checks are simpler and prevent locale/string ambiguity.
- **Alternatives considered**: Sending `HH:mm` mirrors storage but makes generated output validation less direct.

## Decision 3: Google events are context without identity

- **Decision**: Send only bounded title and start/end minutes for selected-day Google conflicts.
- **Rationale**: The model can explain an overlap without receiving an executable calendar/event ID,
  access token, description, attendees, location, or external reference.
- **Alternatives considered**: Sending IDs and rejecting them later creates an unnecessary mutation surface.

## Decision 4: Deterministic fallback is intentionally narrow

- **Decision**: Detect interval overlap and vague titles locally; do not synthesize missing-time items.
- **Rationale**: `normalizePlanBlock` requires valid times, so untimed local plans cannot currently exist.
  A dormant contract kind is safer than inventing a hidden or invalid state.
- **Alternatives considered**: Treating pre-06:00 plans as “missing time” changes product semantics without evidence.

## Decision 5: Keep one issue per local plan

- **Decision**: Normalize at most one active item per local plan, prioritizing overlap over vague title.
- **Rationale**: The user asked for a scan that moves to concrete plans; repeated annotations on one block
  feel noisy and make review progress hard to understand.
- **Alternatives considered**: Multiple issues per block increase completeness but create repetitive UI.

## Decision 6: Align a compact overlay instead of inserting flow content in the hour grid

- **Decision**: CalendarView reports active block geometry and renders a cardless annotation overlay
  within the Plan shell, with the existing illustrated traveler aligned to that block.
- **Rationale**: Plan blocks are absolutely positioned; inserting content into document flow would either
  distort time geometry or cover unrelated plans. The overlay can be clamped around fixed rails and actions.
- **Alternatives considered**: A bottom sheet loses row identity; a modal interrupts Plan; a large floating card obscures the grid.

## Decision 7: Proposal preview precedes the single update action

- **Decision**: After a reply produces a valid proposal, show concise before/after title/time text and one
  “update plan” action plus “keep original”.
- **Rationale**: It preserves explicit consent without adding a menu of field-specific buttons.
- **Alternatives considered**: Separate title/time buttons are visually heavy; immediate application violates invariants.
