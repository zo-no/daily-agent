---
status: active-mvp
created_at: 2026-08-11
updated_at: 2026-08-13
---

# Log Note product brief

## Product premise

Log Note is a quiet personal-recording tool. Its first job is to make recording an event, observation, or recurring check easy enough to sustain every day. The product deliberately stops before analysis: useful AI feedback, recommendations, health interpretation, synchronization, and accounts are not part of the current mainline.

The present MVP is local-first and mobile-first. It is designed to be personally useful now while preserving a clean, periodic structure that can later support higher-level review or AI-assisted interpretation without retroactively reorganizing raw notes.

## Primary user and critical scenario

The primary user for the current stage is **the author using Log Note for their own daily records**. This is a deliberate narrow starting point, not a claim that the eventual product can serve only one person. Broader positioning requires evidence from sustained personal use before the mainline is generalized.

The critical scenario is:

> While something is still fresh, the author records it on a phone with minimal decisions; later, they can find, correct, remove, read, back up, and restore that record without an account or dependable network connection.

The mainline therefore optimizes this sequence before adding breadth:

```text
quick record → browse → search → edit/delete → backup/restore → offline use
```

Templates and periodic structure support this scenario when useful, but they must remain optional for an ordinary quick record. Analysis, recommendations, synchronization, social use, and generalized task management are not part of the critical scenario.

## Current-stage goal

The current stage is **MVP closure, reliable demonstration, and proof of sustained personal usefulness**. The goal is not to maximize features or time spent in the app. It is to prove that the author can depend on the core loop long enough to accumulate records that remain retrievable and portable.

This stage succeeds when all of the following are true:

1. The core loop can be demonstrated repeatedly on a mobile viewport without data loss, an account, an API key, or a live network dependency.
2. The author completes a 14-day personal-use run with enough active recording days to evaluate real friction rather than a one-session demo.
3. At least one prior record is demonstrably useful later: the author can retrieve it when needed and judge that keeping it changed a later decision, recollection, review, or action.
4. Full JSON backup/restore, readable Markdown export, offline recording, and version migration remain reliable as the product changes.

## Success metrics

### North-star metric: consecutive useful recording weeks

The single north-star metric is **consecutive useful recording weeks**.

A seven-day period qualifies as a useful recording week only when:

- the author creates at least one genuine personal record on at least **5 distinct days**; and
- by the end of the period, the author can retrieve at least one earlier record within **60 seconds** and identify a concrete use for it, such as correcting memory, continuing work, reviewing a pattern, or informing a decision.

The metric counts consecutive qualifying weeks, not total records. Ten entries on one day do not outperform five low-friction active days, and adding fields or features cannot improve the metric by itself. Until in-product private measurement exists, active days come from the exported record dates and the usefulness/retrieval check is recorded manually in the validation notes.

### Metrics measurable in the current mainline

| Metric | Definition | Current-stage target |
| --- | --- | --- |
| Reliable demonstration | A mobile run completes quick record, browse, search, edit, delete, full backup, confirmed restore, refresh persistence, and offline record/refresh without an unexpected error or lost current data. | Two complete consecutive runs pass; the automated quality gate remains green. |
| Recording continuity | Distinct days containing at least one genuine author-created record, excluding bundled seed/demo data. | At least 10 of 14 days, with no unexplained gap longer than 2 consecutive days. |
| Quick-record friction | Actions required to open the ordinary composer and save after typing. | At most 1 action to open and 1 further action to save; no new required classification or field. |
| Retrieval usefulness | A sampled prior record is found and the author states the concrete later use it served. | At least 1 useful retrieval per qualifying week, found within 60 seconds. |
| Data portability and recovery | A full backup is exported, validated, restored, and exported again without losing entries or structure; Markdown remains readable. | 100% pass for the release candidate and every storage-schema change. |
| Offline reliability | After an initial online load, core pages open offline and a new offline record survives refresh. | 100% pass in the PWA regression for the release candidate. |

Record count, screen time, number of templates, and number of shipped features are diagnostic facts only. They are not success metrics because they can reward friction, clutter, or compulsive use.

### Metrics unlocked only by later feedback-loop work

These metrics are definitions for future evaluation, not authorization to add AI to the current mainline. They remain locked until the AI/local-first boundary, derived-data model, and explicit user controls have passed the separate product, architecture, and privacy reviews required by LN-007 and LN-008.

| Future metric | Definition | Earliest measurement condition |
| --- | --- | --- |
| Observation accuracy | Observations the author rates as accurate and supported by the cited source records, divided by all rated observations. “Plausible but unsupported” does not count as accurate. | Derived observations cite sources, never change raw notes, and can be corrected, deleted, and recomputed. |
| Suggestion execution rate | Accepted suggestions that the author actually completes as specified, divided by accepted suggestions whose execution window has ended. Declined suggestions are reported separately and do not lower execution quality. | Suggestions are optional, explain their evidence and cost, and create no action without explicit acceptance. |
| Experiment completion rate | Created 3–7 day experiments that reach a recorded before/after review, divided by experiments whose planned end date has passed. | The intervention, target variable, execution, result, and abandonment reason are distinct, recoverable data. |
| Experiment effectiveness rate | Completed experiments the author judges to have improved the target outcome without unacceptable cost or side effects, divided by completed experiments with a result judgment. | At least one target outcome and one cost/side-effect check are captured before the result is evaluated. |

No target percentage should be treated as a product claim until there are at least 10 rated observations or 5 completed experiments. Early samples are learning evidence, not proof of effectiveness.

## Feature admission and exit policy

Every proposed capability must first state the user behavior it improves in the core loop, the evidence for the problem, its default interface cost, its offline/privacy/recovery behavior, its verification method, and how it can be disabled or removed.

Score each dimension from 0 to 2 before implementation:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Core-loop contribution | Unrelated | Indirect support | Directly improves a core-loop behavior |
| User evidence | Assumption only | Repeated qualitative pain | Observed personal-use failure or measurable friction |
| Expected frequency | Rare | Weekly | Daily or part of most recordings |
| Default interface cost | Adds permanent primary-screen complexity | Lives on a secondary surface | Adds no default exposure or replaces existing complexity |
| Recording friction | Adds a required decision or step | Leaves the ordinary path unchanged | Removes a decision or step |
| Local-first fit | Requires network/account | Has a complete offline fallback | Works fully offline with local data authoritative |
| Privacy and reversibility | Opaque, destructive, or externally transmitted by default | Recoverable with explicit controls | Local by default, traceable, reversible, and export-compatible |
| Performance and maintenance | Persistent background or broad coupling | Bounded cost | Near-zero idle cost and a narrow module boundary |
| Verifiability | Subjective only | Repeatable manual check | Clear automated regression plus user outcome check |
| Removability | Entangled with raw records or core navigation | Removable through migration | Off by default, isolated, or removable without changing raw notes |

- **16–20:** eligible for a mainline candidate, subject to all quality and privacy gates.
- **12–15:** experiment only; keep it off by default or in an isolated worktree/module.
- **0–11:** reject for the current stage or retain only as a research note.

Regardless of score, a feature is rejected from the mainline if it silently rewrites raw records, makes the core loop depend on a network/account/API key, sends personal data away without explicit reviewed consent, adds a required step to ordinary recording, breaks old backup recovery, or regresses the existing quality gate.

Admission is temporary, not permanent. Before release, every new capability must name a 14- or 30-day evidence window and an exit condition. It returns to isolation or is removed when it is unused, fails its promised user outcome, increases quick-record steps, adds unexplained primary-screen controls, causes a material performance or reliability regression, or creates continuing maintenance cost disproportionate to its measured value. Removing a capability must preserve raw notes and supported backups.

## The model: domain, category, template

The product has three independently managed layers:

```text
Domain → Category → Template → Template fields
```

- A **domain** is a broad area of life, such as Daily, Health, Learning, or Trading.
- A **category** belongs to exactly one domain and is the record’s organizational home.
- A **template** belongs to exactly one category and defines how a record is captured: its input mode, default tags, prompt, fields, and—when applicable—schedule.
- Template **fields** are an ordered array. That same order drives the entry form, composed content, and Markdown output.

Domains, categories, and templates are separate concepts; categories are not encoded as `parent · child` names. Their hierarchy and sibling order are maintained in versioned JSON and in the Record setup UI.

## Recording modes

### Linear records

Linear records capture something that happened or was noticed at a time. They appear in the compact timeline and can be reviewed in a grouped-by-domain view. A free-text template is the lowest-friction default, while structured templates can collect text, long text, a number, an option, a rating, and required values.

### Periodic records

Periodic records capture a recurring check rather than another timeline event. A periodic template has one of three cadences:

- **Time point** — expected at a given local time, for example morning weight.
- **Daily** — one check associated with a day.
- **Weekly** — one check associated with a weekday.

They are displayed in their own section and ordered by the template’s configured order. This distinction keeps recurring health or rhythm checks legible today and gives later review systems a reliable periodic signal.

## Current user flow

1. On the record page, tap `+` to create a note with the current date and time.
2. Keep the default quick template for an immediate note, or select a relevant template.
3. Save, then edit or delete the entry from the timeline when needed.
4. Use Record setup to manage domains/categories or to define templates and their fields.
5. Reorder the structure with an accessible drag handle, keyboard drag, or move controls. Moving a template to another category updates historical entries to that category; moving a category to another domain changes its domain through the category relationship.
6. Export Markdown for reading/archiving, or export complete JSON before a device/browser change.

The record page defaults to English and can switch to Simplified Chinese. Interface language changes never rewrite or translate user-recorded content.

## Initial data

For demonstration and regression coverage, a first-run state includes **14 non-empty records** from `2026_08_11.md`. Their stored content and source-line metadata are retained exactly. The source file itself is not changed. Empty lines and incomplete fixed values (for example a weight with only the unit) are not seeded.

## Export contract

- Current-day and all-date Markdown are reading/archiving exports.
- A full JSON backup contains the complete versioned state: domains, categories, templates, Markdown settings, and entries. It is the supported restore artifact.
- Structure JSON contains only domains, categories, templates, and Markdown settings. A general structure JSON example is provided for customizing the model outside the UI.
- Markdown formatting is user-configurable: grouped hierarchy or flat timeline, headings, entry line, date heading, and date separator.

## Local-first boundary and recovery

The MVP uses browser `localStorage`, not a database. Data is tied to the browser profile and origin: clearing browser data, using a private window, switching browser/profile, or changing host/port can make it unavailable. Users should regularly export a full JSON backup.

If local data is malformed or cannot be migrated, the app retains the original payload and blocks automatic writes instead of replacing it with default data. A user-confirmed restore of valid JSON can resume persistence. An explicit reset capability exists in the data layer for a future confirmed reset surface; defaults are never written merely because loading failed.

## Future decisions still open

The current primary user and mainline boundary are decided above. The product is intentionally not yet positioned beyond a personal, local-first recording tool. These later expansion decisions still require product-owner input and evidence from sustained use:

1. Should future value center on personal reflection, health rhythm review, trading/work learning, or a broader life log?
2. What evidence would justify expanding from the author to a defined group with shared recording needs?
3. If AI is later approved, should its first tested role summarize, ask follow-up questions, detect patterns, or propose behavioral adjustments?
4. Should multi-device sync and accounts remain optional after local export/import proves the workflow, or eventually become a separate prerequisite for broader use?
