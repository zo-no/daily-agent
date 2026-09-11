# Research: Goal Loop — market patterns and product boundary

**Research date**: 2026-09-11
**Scope**: Public product documentation and community discussions about OKR tools, personal goal
tracking, journaling, and goal-to-record alignment. Community posts are directional anecdotes, not
usage statistics.

## Market observations

| Pattern | Evidence | Product implication |
| --- | --- | --- |
| Enterprise OKR products combine objectives, measurable KRs, alignment maps, KPIs, check-ins, and risk/status views. | [Perdoo OKR software](https://www.perdoo.com/products/okr-software), [Perdoo alignment guidance](https://support.perdoo.com/en/articles/5391069-aligning-okrs), [Betterworks OKR software](https://www.betterworks.com/product/okr-software), [Lattice goals](https://lattice.com/platform/goals) | Keep O/KR as the semantic backbone, but omit cascades, approvals, and reporting overhead from a personal journal. |
| Work-management products link goals to projects, tasks, portfolios, or initiatives and roll up status. | [Asana Goals](https://asana.com/features/goals-reporting/goals), [Linear Initiatives](https://linear.app/docs/initiatives), [ClickUp Goals](https://clickup.com/features/goals) | Treat a plan as an attempted path and keep plan activity separate from outcome progress. |
| Full OKR cycles make setting, alignment, follow-up, and review visible. | [Feishu OKR dashboard](https://www.feishu.cn/hc/zh-CN/articles/958877750496/), [Feishu OKR launch](https://okr.feishu.cn/blog/okr-launch) | Use a light review cadence, not mandatory check-ins or enterprise administration. |
| Personal products combine journals with AI review, source selection, on-device processing, or automatic goal mapping. | [Faro](https://www.hellofaro.app/en), [Mirror](https://askmirror.app/), [DecompAI](https://www.decompai.app/), [Align](https://www.align-journal.com/) | Preserve raw notes, make source scope visible, and let AI propose relationships rather than silently storing them. |
| A goal feature can be removed when it fails the simplicity test. | [Todoist Goals retirement](https://lp-regional-test.todoist.com/help/todoist/product-updates/goals-beta-retired-VKe2PuGn5) | Goal setup and review must fit the existing recording habit and remain removable. |

## Community and research signals

- In an anecdotal practitioner discussion, weekly check-ins were repeatedly described as the part
  that breaks when users are busy; participants asked for short or bulk updates.
  [Reddit, OKR practitioners](https://www.reddit.com/r/prodmgmt/comments/1pry7qi/okr_practitioners_what_actually_breaks_okrs_in/)
- Personal OKR discussions mention metric fatigue, the need for flexibility, and the risk that a
  planner or journal is simpler than another goal system.
  [Hacker News, personal OKR](https://news.ycombinator.com/item?id=25613187)
- A 138-study meta-analysis found that monitoring interventions improved goal attainment with a
  pooled effect of approximately d=0.40. The product inference is that feedback is useful, but a
  complex maintenance ritual is not required.
  [Goal progress monitoring meta-analysis](https://eprints.whiterose.ac.uk/id/eprint/91437/)
- A preregistered AI-authored-goals preprint reported lower ownership and short-term action for
  AI-authored goals than self-authored goals. It is not peer reviewed, so this is a design signal,
  not a product effectiveness claim.
  [AI-authored goals preprint](https://arxiv.org/abs/2605.12344)

## Design decisions

### Decision 1: Use OKR semantics inside a broader Goal Loop

**Decision**: Keep Objective/Goal and Key Result/Success Signal, then add Plan, Evidence Record, and
Alignment Review as distinct concepts.

**Rationale**: The user goal is an outcome rather than an action. KR makes “progress” explicit;
Plan explains the attempted path; existing records remain the factual source; Review explains the
relationship.

**Alternatives considered**: A task-first system was rejected because it makes actions look like
outcomes. A full enterprise OKR system was rejected because it adds hierarchy, check-in, and
administrative cost. A free-form goal note was rejected because it does not define what evidence
would count.

### Decision 2: Keep capture independent from alignment

**Decision**: Goal selection is optional after capture or from a plan/goal detail surface. The quick
record path gains no picker, check-in, streak, or network dependency.

**Rationale**: This preserves Log Note's core loop and allows users to record facts even when they do
not yet know which outcome they support.

**Alternatives considered**: Mandatory goal selection at capture was rejected because it would add
friction and encourage false associations.

### Decision 3: Separate progress, evidence coverage, and plan activity

**Decision**: Show these as separate facts. Numeric progress is shown only for valid numeric signals;
qualitative signals use status and evidence coverage. A completed plan never proves a completed outcome.

**Rationale**: Activity volume is not the same as movement toward an outcome, and missing records are
not proof of no progress.

**Alternatives considered**: One composite score was rejected because it hides uncertainty and
creates false precision.

### Decision 4: AI proposes explainable candidates

**Decision**: The AI may classify a source as toward, stalled, drifting, blocked, or insufficient and
may propose an evidence association. Every assertion must cite selected records by source reference;
the user explicitly accepts or rejects it.

**Rationale**: This keeps AI useful for synthesis while preserving user ownership, raw-note integrity,
and reversible writes.

**Alternatives considered**: Background analysis, automatic completion, and autonomous task creation
were rejected because they expand data scope and create an unreviewed writer.

### Decision 5: Stage long-term automation behind a 14-day pilot

**Decision**: First prove a local Goal Loop with manual review. Only after two pilot outcomes have
evidence and the review burden stays under two minutes should background or on-device automation be
considered.

**Rationale**: The primary unknown is adoption and usefulness, not model sophistication.

**Alternatives considered**: Launching continuous AI monitoring first was rejected because it would
make privacy, cost, and notification policy decisions before the basic loop is understood.

## Open owner decisions

1. Confirm the default active-outcome cap and whether work/personal outcomes share one list.
2. Confirm whether horizons are custom-only in the first slice or include annual/quarterly presets.
3. Confirm whether a record may be accepted for multiple outcomes/signals.
4. Confirm AI provider, source retention, and manual review cadence.
5. Confirm lifecycle names and the user's ability to override an AI direction label.

These decisions are intentionally recorded as dependencies rather than silently chosen as product
truth. The implementation gate remains pending until the owner discusses them.
