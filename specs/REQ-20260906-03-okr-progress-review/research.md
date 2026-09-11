# Research: personal OKR and period alignment

**Research date**: 2026-09-11
**Scope**: public product documentation and community discussions about OKR tools, personal goal
tracking, journaling, and goal-to-record alignment. Community posts are directional anecdotes, not
usage statistics; external product pages describe positioning, not independent effectiveness.

## Market observations

| Pattern | Evidence | Product implication |
| --- | --- | --- |
| Enterprise OKR products combine objectives, measurable KRs, alignment maps, check-ins, status views and administration. | [Perdoo](https://www.perdoo.com/products/okr-software), [Betterworks](https://www.betterworks.com/product/okr-software), [Lattice goals](https://lattice.com/platform/goals) | Reuse Objective/KR as the meaning of a goal; omit cascades, approvals, owners, performance and mandatory check-ins for a personal tool. |
| Work-management products connect goals to projects/tasks and roll up activity. | [Asana Goals](https://asana.com/features/goals-reporting/goals), [Linear Initiatives](https://linear.app/docs/initiatives), [ClickUp Goals](https://clickup.com/features/goals) | A plan is an attempted path; plan volume or completion must stay separate from outcome evidence. |
| Full OKR cycles make setting, alignment, follow-up and review explicit. | [Feishu OKR](https://www.feishu.cn/hc/zh-CN/articles/958877750496/), [Feishu OKR launch](https://okr.feishu.cn/blog/okr-launch) | Use one deliberate review action, not a recurring enterprise ritual. |
| Personal products combine journals with AI review or automatic goal mapping. | [Faro](https://www.hellofaro.app/en), [Mirror](https://askmirror.app/), [DecompAI](https://www.decompai.app/), [Align](https://www.align-journal.com/) | Preserve raw notes, make the automatic scope visible, cite sources and keep AI read-only. |
| A goal feature can be retired when setup/review is more work than the habit it supports. | [Todoist Goals retirement](https://lp-regional-test.todoist.com/help/todoist/product-updates/goals-beta-retired-VKe2PuGn5) | The Goal surface must stay secondary and removable; measure review burden before broadening it. |

## Community signals

- An anecdotal practitioner discussion describes weekly check-ins as the part that breaks when users are
  busy and asks for shorter or bulk updates: [Reddit, OKR practitioners](https://www.reddit.com/r/prodmgmt/comments/1pry7qi/okr_practitioners_what_actually_breaks_okrs_in/).
- A personal-OKR discussion mentions metric fatigue and the risk that a planner or journal is simpler
  than another goal system: [Hacker News](https://news.ycombinator.com/item?id=25613187).
- A meta-analysis of goal-progress monitoring reported a pooled effect around d=0.40; this supports
  testing lightweight feedback but does not validate a particular UI or AI method:
  [Goal progress monitoring meta-analysis](https://eprints.whiterose.ac.uk/id/eprint/91437/).

## Decisions for this feature

1. **OKR is the semantic backbone, not the full solution.** Objective/KR express destination and
   progress standard; the missing capability is a period-scoped comparison of local plans and records.
2. **Capture remains independent.** No goal picker or tag is added to quick record. The Goal detail
   automatically derives its period snapshot from the current account.
3. **One visible review action.** The scope and provider are disclosed before the single “检查目标对齐”
   action. No manual source selection or multi-step association confirmation is in the first slice.
4. **Progress, activity and evidence coverage stay separate.** A completed plan is not a completed
   outcome; missing records are not proof of drift.
5. **AI is an explainable, read-only experiment.** The response cites source IDs, reports uncertainty,
   cannot write, and is discarded when the snapshot is stale.
6. **Work and life share one personal Goal list.** No enterprise or separate work/life space is added.

## Open decisions and evidence

- Confirm whether a goal may omit KR and still request a check; current recommendation: yes, return a
  qualitative/insufficient result rather than blocking setup.
- Confirm whether a period longer than the existing 366-day and 100/200/360 payload bounds should be
  unsupported or later use a transparent sampling mode; current recommendation: safe unsupported state,
  never silent sampling.
- Confirm provider retention/logging and the actual non-sensitive quality/latency evidence.
- Confirm whether a result should offer a single next-focus suggestion or remain descriptive only.
- Confirm board admission and the owner discussion required by the core-chain gate.

These are design dependencies, not implementation claims. No community source is treated as approval or
as evidence that an AI review will be correct for this product.
