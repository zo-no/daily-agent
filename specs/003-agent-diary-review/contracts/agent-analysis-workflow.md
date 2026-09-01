# Contract: Diary Agent Analysis Workflow

**Board Item**: `LN-074`
**Scope**: selected-day, transient, existing-category-only Diary review

## Initial analysis input

The existing authenticated request remains limited to the selected date, locale, ordinary records (`id`, `time`, `content`, current category ID), and bounded existing categories (`id`, domain name, category name). No account identifier, tag, attachment, template, plan, other date, or complete document is added.

## Initial item contract

Every record produces at most one item:

| Kind | Required fields | Meaning |
| --- | --- | --- |
| `category` | record ID, generic prompt, one existing non-current category ID | Evidence supports a direct filing proposal. |
| `question` / `clarify-category` | record ID, targeted prompt, two or three existing non-current candidate IDs | The answer is needed to choose one filing destination. |
| `question` / `enrich-detail` | record ID, targeted prompt, no candidate IDs | One concrete fact would materially improve the note. |

A record without one of these decision-worthy outcomes produces no item; the initial scan does not emit filler comments.

Unknown records/categories, duplicate record items, already-current categories, invalid goals, and malformed candidate sets are discarded or reduced to a non-executable detail question.

## Reply contract

One reply returns exactly one normalized outcome:

| Outcome | Optional payload | UI state | Persistent effect |
| --- | --- | --- | --- |
| `ask` | next targeted question in `reply` | reply field remains until the two-answer cap | none |
| `append` | faithful `proposedAppend` | Append / New record / Keep original | none until explicit action |
| `category` | one allowlisted non-current candidate category ID | category path + Apply category / Keep original | none until explicit action |
| `none` | explanation in `reply` | Keep original only | none |

If append and category are both present, the category is unknown/non-candidate/already-current, required payload is empty, or the second user answer still requests another question, normalization returns `none`.

## State flow

```text
idle → scanning → [category confirmation | clarification | no item]
clarification → ask (maximum two user answers)
clarification → append confirmation | category confirmation | no change
confirmation/no change → explicit action or keep → next item → complete
any active state → stop/date/tool/Plan/account/unmount → idle
```

Only existing append, new-record, and category handlers may persist. Classification changes only `categoryId` and retains undo. All workflow fields and messages disappear with the session and never enter synchronization, export, backup, or Service Worker storage.
