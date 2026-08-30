# Data Model: In-page Agent Plan Review

No persisted entity or schema is added. All entities below are transient request/UI values.

## PlanReviewSession

| Field | Type | Rules |
| --- | --- | --- |
| status | `idle \| scanning \| reviewing \| complete` | UI lifecycle only |
| date | ISO local date | Must equal current selected date |
| items | `PlanReviewItem[]` | Maximum 24; local plan IDs only |
| activeIndex | non-negative integer | Points to one item or completion |
| messages | `AgentMessage[]` | Maximum 8 bounded messages |
| proposal | `PlanUpdateProposal \| null` | Never executable without confirmation |
| replying | boolean | Disables duplicate send |
| fallbackReason | bounded string | Transient diagnostic state, not logged/persisted |

### State transitions

```text
idle → scanning → reviewing → complete → idle
          ↘ complete
scanning/reviewing/complete → idle on canceling context change
```

## LocalPlanReviewInput

| Field | Type | Validation |
| --- | --- | --- |
| id | bounded string | Unique, selected-day local plan allowlist |
| title | bounded string | Non-empty after trim |
| startMinute | integer | `0 <= value < 1440` |
| endMinute | integer | `0 < value <= 1440`, greater than start |

## ReadOnlyConflictContext

| Field | Type | Validation |
| --- | --- | --- |
| title | bounded string | No description/location/attendee content |
| startMinute | integer | Same-day interval |
| endMinute | integer | Greater than start |

This entity has no ID and cannot be referenced as an update target.

## PlanReviewItem

| Field | Type | Rules |
| --- | --- | --- |
| id | generated bounded string | Transient |
| planId | string | Must be in local selected-day allowlist |
| kind | `plan-question \| plan-overlap \| plan-time` | `plan-time` reserved for valid time-placement findings |
| prompt | bounded string | Concrete question/explanation, max 280 chars |
| proposal | `PlanUpdateProposal \| null` | Optional and revalidated |

Only one normalized item may target a local plan. Local fallback prioritizes `plan-overlap`, then
`plan-question`. Current persisted plans always have valid times, so fallback does not create `plan-time`.

## PlanUpdateProposal

| Field | Type | Rules |
| --- | --- | --- |
| planId | string | Must equal active local plan ID |
| title | string, optional | Trimmed, non-empty, max 240; omit when unchanged |
| startMinute | integer, optional | Must be paired with endMinute |
| endMinute | integer, optional | Must be paired with startMinute and ordered |

At least one changed allowlisted field is required. Date, source, ID, flexibility, external references,
created/updated timestamps, and Google fields cannot appear in the normalized proposal.

## AgentMessage

| Field | Type | Rules |
| --- | --- | --- |
| role | `user \| assistant` | Other roles dropped |
| content | string | Non-empty, bounded to 500 chars |

Messages and proposals are discarded on date/mode/tool/editor/navigation/account change and reload.
