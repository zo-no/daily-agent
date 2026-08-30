# Data Model: Book-page Ritual

## Persistent entities

No persistent entity, field, relationship, schema, storage key, revision payload, or backup member is
added or changed by LN-076.

## Existing view states used by presentation

| State | Existing source | Presentation responsibility | Persistence impact |
| --- | --- | --- | --- |
| Diary view (`timeline` / `grouped`) | Existing home state | Select editorial title and record layout | None |
| Workspace (`Diary` / `Plan`) | Existing home state | Preserve title, rail, and action compatibility | None |
| Calendar/Search/Settings open | Existing home state | Preserve tool replacement and focus behavior | None |
| Agent `idle` / `scanning` / `reviewing` / `complete` | Existing session state | Select one viewport-resident pose and patrol rhythm while keeping authored notes primary | None |
| Agent motion mode / empty note / document visibility | Ephemeral browser presentation state | Pause traversal, tuck for calendar, and show the no-write empty-date note | Never serialized |
| Composer closed/open/details | Existing draft/session state | Apply continuous page-leaf material and existing focus contract | Draft behavior unchanged |
| Reduced motion | Browser preference | Remove non-essential transition timing | None |

## Non-persistent appearance definition

Rework 8 extends the presentation definition, not the product data model. Its bounded contract is:

| Field | Meaning | Persistence impact |
| --- | --- | --- |
| Stable appearance ID | Internal key used by the presentation resolver | Never serialized |
| `staticAsset` | Character-only still image for each supported state | Service-worker asset only |
| `motionAsset` | Character-only local frame animation for each supported state | Service-worker asset only |
| `intrinsicSize` | Source frame width/height used by presentation geometry | CSS/renderer only |
| `motionMode` | Resolved `animated` or `still` rendering mode | Ephemeral presentation only |
| Legacy `asset` | Compatibility alias for the resolved `staticAsset` | None |
| Presentation class | Geometry/art-direction hook scoped to the appearance | CSS only |
| Default fallback | Returned for an unknown or missing internal ID | None |
| Viewport spine track | Fixed safe segment between upper tools and lower actions | DOM/CSS only |

Agent session status remains the existing source of truth. The definition does not own behavior,
copy, accessible naming, activation, analysis, replies, writes, or completion.

## Validation invariants

- Presentation state must never be serialized into account data or backups.
- No style or local asset may depend on note content, account identifier, token, or network response.
- Raw note text and existing view/action state transitions remain controlled by their current code.
- Appearance IDs, definitions, and visual states must not enter account state, cloud documents,
  exports, backups, logs, or user preferences in this release.
