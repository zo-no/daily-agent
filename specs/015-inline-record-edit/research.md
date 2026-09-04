# Research: Inline Record Editing

## Decision 1: Reuse one editor form with owner-selected presentations

- **Decision**: Keep the current record editor logic as one component. New records and stored-time activation use its complete dialog presentation; only a Diary Agent `enrich-detail` follow-up uses its detailed inline presentation.
- **Rationale**: The existing editor already owns Markdown, structured fields, Hero improvement, details, attachments, delete, validation, and explicit save. Reusing it avoids divergent behavior.
- **Alternatives considered**: A text-only `contentEditable` row loses structured and attachment behavior. A second full inline editor duplicates validation and persistence. Converting new-record creation is outside scope.

## Decision 2: Split the row into semantic time and content controls without a pencil

- **Decision**: Preserve the row container and Agent anchor with sibling time and content buttons. Free-text content directly activates the compact textarea; the separate pencil is removed.
- **Rationale**: Time and content now have distinct actions, and the redundant icon consumed space without adding capability.
- **Alternatives considered**: Coordinate detection on one button is inaccessible. Keeping the edit icon conflicts with the owner's explicit removal.

## Decision 3: Stored time opens the complete edit dialog

- **Decision**: Open the canonical complete `RecordComposer` dialog from the stored-record time target.
- **Rationale**: The owner explicitly corrected “浮层” to mean the complete writing surface, not a narrow time-only popover.
- **Alternatives considered**: The implemented time-only popover is the rejected interpretation. A second full form would duplicate the canonical composer.

## Decision 4: Bind the detailed inline editor to Agent follow-up

- **Decision**: A Diary Agent `enrich-detail` item mounts the detailed inline composer with its question visible. Done saves the user-edited record and advances; Cancel discards staged changes, keeps the original, and advances.
- **Rationale**: This gives the former large inline surface one clear owner and lets the author correct the source directly without a second AI proposal round trip.
- **Alternatives considered**: Keeping the compact Agent reply box separates the answer from the source record. Letting ordinary content open the large editor contradicts the requested direct input.

## Decision 5: Preserve the canonical local-first write paths

- **Decision**: Complete dialog and Agent-linked edits continue through `saveEntry`; direct free-text blur-save keeps the existing content-only `commitData` patch. The obsolete time-only merge is removed.
- **Rationale**: This preserves account ownership, offline behavior, revision safety, attachment staging, and ordering without adding a persistence boundary.
- **Alternatives considered**: A new storage hook, route, schema field, or Agent mutation path is unnecessary and conflicts with the architecture.

## Decision 6: Make quick creation a quiet inline input

- **Decision**: Replace the standalone stream add button with one aligned time-and-input row. The time ticks
  once per second while idle, freezes when the input gains focus, and refreshes to now when activated.
- **Rationale**: The owner explicitly rejected the visual weight of a separate action and supplied the compact
  row as the desired interaction. The row preserves context and removes one surface-opening step.
- **Alternatives considered**: Keeping the button remains too intrusive. Focusing a full composer adds a
  surface transition. Saving on every keystroke would create unnecessary revisions and accidental partial notes.

## Decision 7: Add seconds without migrating legacy records

- **Decision**: New quick-add timestamps use `HH:mm:ss`; validation accepts both `HH:mm` and `HH:mm:ss`, and
  the existing time input opts into one-second steps.
- **Rationale**: Record precision is now explicitly second-level, but rewriting old records would change
  historical data with no user benefit. The stored field remains a string and the record schema is unchanged.
- **Alternatives considered**: Global conversion of existing times invents `:00`; changing all `localTime`
  callers broadens behavior beyond the requested quick-add path.
