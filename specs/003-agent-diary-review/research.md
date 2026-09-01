# Research: In-page Agent Diary Review

## Decision 1: Session-only state

- **Decision**: Review items and conversation remain in Home memory and are cleared on date/mode/page changes.
- **Rationale**: Delivers the requested interaction without bypassing LN-007/008 persisted-observation prerequisites.
- **Alternative rejected**: Saving chat or observations would require a new account-owned derived-data model and backup contract.

## Decision 2: Explicit four-way resolution

- **Decision**: Each item offers append, new record, keep original, or existing-category apply as applicable.
- **Rationale**: Matches the reference interaction and protects raw-note trust.
- **Alternative rejected**: Automatic rewriting or classification violates the Constitution and product invariant.

## Decision 3: Separate bounded Agent contract

- **Decision**: Add an Agent-specific structured contract while reusing LN-069 authentication, limits, origin validation, and server-only key.
- **Rationale**: Existing chronology output cannot express row questions; classifier output cannot express conversation.
- **Alternative rejected**: Expanding either existing schema would weaken their narrower guarantees.

## Decision 4: Keep `/organize` compatible

- **Decision**: Home's primary Agent path becomes in-page; `/organize` remains a compatible direct/fallback workspace.
- **Rationale**: Avoids breaking old links and preserves a reversible rollback path.

## Decision 5: Let proximity carry the active-row relationship

- **Decision**: Keep the idle wake illustration, but remove the active Diary traveller and dashed source underline. Attach the annotation directly after the source row, use `aria-current`, and retain only a short local accent.
- **Rationale**: The latest 390px evidence shows that the child, underline, tall bracket, and separate action blocks compete with the note instead of clarifying ownership.
- **Alternatives considered**: Moving or shrinking the child still consumes the narrow reading edge; replacing the dashed line with a long solid line keeps the rejected underline metaphor; plain text actions lose affordance. One segmented 44px action group preserves clarity with less fragmentation.

## Decision 6: Separate placeholder scale from mobile input scale

- **Decision**: Keep the actual reply textarea at 16px, but style its placeholder as 13px faint text; use a 15px prompt, 14px category result, and 13px regular-weight actions with a much weaker primary tint.
- **Rationale**: The marked screenshot shows the reply hint and action chrome competing with the question. A separate placeholder pseudo-style restores hierarchy without triggering iOS focus zoom or reducing 44px targets.
- **Alternative rejected**: Shrinking the whole textarea below 16px would risk browser zoom; removing action emphasis entirely would weaken affordance; changing layout or copy would exceed the visual-only correction.

## Decision 7: Use two repeated axes inside the annotation

- **Decision**: Align prompt, category, reply text, and actions to the record-reading axis; align stop, corner accent, and reply accent to one gutter center. Keep the action group's right edge on the conversation edge and use a 4px prompt/category gap.
- **Rationale**: The marked screenshot exposed unrelated offsets: reply text was 20px right of the other content, the stop center was 14px right of the corner accent, and the reply accent sat on the content axis. Repetition of two axes makes the annotation read as one unit.
- **Alternative rejected**: Centering each element independently preserves visual drift; moving all text into the gutter would break source-record alignment; changing component structure is unnecessary for a CSS-solvable geometry issue.

## Decision 8: Let the source record dominate and use proximity instead of empty bands

- **Decision**: Measure the annotation against `.entry-content`, keep the source record at 16px full ink, reduce Diary annotation display text to 14px question / 13px category and actions / 12px placeholder, and compress the reply/action/next-record transitions to 4px / 12–16px.
- **Rationale**: The latest marked screenshot showed that passing the container-axis test still left the annotation visibly offset, too close to body-copy scale, and surrounded by unrelated blank space. The real text edge plus the existing 4px spacing system makes the source/annotation relationship legible without another border or card.
- **Alternative rejected**: Keeping the 15px ink question preserves competition with the record; aligning to `.entry-body` encodes container padding rather than what users see; reducing 44px controls would trade accessibility for density; changing the right rail or Plan Agent exceeds the correction.

## Decision 9: Give Agent prose an actual annotation type role

- **Decision**: Render the Diary Agent question as 14px muted Instrument Serif / Songti fallback, keep records as 16px full-ink Instrument Sans, reduce action labels to 12px, and move the annotation gutter 10px closer while halving its reserved top band.
- **Rationale**: The earlier 16px-versus-14px Sans adjustment was technically measurable but still read as two paragraphs of the same kind. Typeface role, ink, scale, and proximity now change together, so the distinction survives normal scanning rather than only computed-style inspection.
- **Alternative rejected**: Further one-pixel sizing changes remain invisible; adding a card, badge, or “Agent” heading creates more chrome; shrinking touch targets or input text would harm mobile usability.

## Decision 10: Treat density as a page/module geometry problem, not a font-size problem

- **Decision**: Apply the SkillHub three-layer idea at the relevant levels only: preserve the page skeleton/right rail, tighten the timeline and Agent module geometry, and leave component typography intact. Use one compact `42px + 10px` reading grid, 56px ordinary/fixed rows, a shared reply/category-action row, and a 28px fixed-tool visual slot backed by a 44px target.
- **Evidence**: SkillHub search surfaced `aidesign-spec-context`, which separates page skeleton, module layout, and component detail instead of mixing all corrections into typography. Nielsen Norman Group's [“Proximity Principle in Visual Design”](https://www.nngroup.com/articles/gestalt-proximity/) states that nearby elements are perceived as related and that varying whitespace should unite or separate meaningful groups. W3C [WCAG 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) says controls need sufficient target size or spacing and notes that active target area can increase without increasing visible target size.
- **Rationale**: The remaining marked gaps came from structural bands—centered header content, generic 72px rows, a second 44px category-action row, and a fixed-tool header—not from oversized text. Correcting those bands produces a visible density change while preserving hierarchy and accessibility.
- **Alternative rejected**: Further shrinking explanation text would damage hierarchy; reducing target boxes below project requirements would harm accessibility; moving the right-side icons or redesigning Plan Agent would exceed the screenshot correction.

## Decision 11: Protect writing width before compressing action rows

- **Decision**: Supersede the Rework 11 same-row requirement for one or two unresolved actions. Keep the reply textarea at the annotation width, then place the actions in one compact right-aligned row immediately below it. Give the 44px close target a visible 28px inner surface and reserve prompt space around it.
- **Evidence**: The product owner's marked Rework 11 screenshot showed the Chinese placeholder wrapping into three lines because two absolute-positioned actions removed about 140px from the reply field. Mobile usability guidance treats target size and writing space as simultaneous constraints; meeting one while making the other impractical is not a successful compact layout.
- **Rationale**: Typing is the primary interaction in the conversation. A real 44px action row consumes vertical space honestly, while permanent horizontal compression damages every reply before the user types. Keeping the row borderless and attached within 0–4px prevents it from returning as a detached button band.
- **Alternative rejected**: Shorter labels would not help Chinese input width; shrinking actions violates the project's 44px contract; keeping actions overlaid on the textarea risks overlap; moving them to the right rail mixes row-local resolution with page utilities.

## Decision 12: Embed Mastra, do not build or deploy another Runtime

- **Decision**: Use `@mastra/core` directly inside the existing Next.js Node process. A Mastra Agent performs the model call and a Mastra Workflow makes generation and project-owned normalization explicit. React remains the session orchestrator; Mastra Memory, tools, persistent suspend/resume, and standalone server stay disabled.
- **Rationale**: The user explicitly chose a maintained framework instead of a self-built Agent Runtime. Direct integration provides the Agent/workflow composition boundary now without adding another deployment, network hop, authentication layer, or business-facing protocol. The existing pure normalization functions continue to enforce Log Note's stricter safety rules after framework execution.
- **Alternatives considered**: Keeping the direct AI SDK call avoids one dependency but retains hand-written orchestration; Dify would add an external workflow deployment and is reserved for `LN-077`; a standalone Mastra service is premature before a second business consumer; enabling memory/tools would expand data and authority beyond this feature.
- **Compatibility evidence**: The [Mastra changelog](https://mastra.ai/blog/changelog-2026-01-20) records the Node.js `>=22.13.0` minimum; the installed package accepts Zod 4 plus AI SDK v6 models. The public Tencent release path already uses Node 22, and the project already uses Zod 4 plus an OpenAI-compatible AI SDK provider. The separate Plus/Cargo/CatPaw path is still contractually fixed to Node 20; a local Node 20 focused test and production build happen to pass with the exact `1.63.2` pin, but that does not make the unsupported runtime a release guarantee. Rework 19 therefore cannot be merged/deployed to that path until its runtime is explicitly upgraded or the deployment is intentionally isolated.

## Decision 13: Ask only questions with decision value

- **Decision**: Initial analysis first checks for one strong existing-category match. It asks `clarify-category` only when two or three candidates remain plausible, asks `enrich-detail` only when one concrete fact would materially improve later retrieval, and otherwise emits no item.
- **Rationale**: Generic questions increase review burden and make the Agent feel performative. A question is justified only when its answer changes filing or produces a faithful, user-controlled detail.
- **Alternative rejected**: Asking every short note for more context maximizes activity rather than usefulness; always classifying the first match hides ambiguity and reduces trust.

## Decision 14: One reply, one safe outcome

- **Decision**: Normalize each reply to exactly one of `ask`, `append`, `category`, or `none`. Category output is restricted to the question's candidate IDs and the current existing-category allowlist; simultaneous append/category output is rejected. Two unresolved user answers force `none`.
- **Rationale**: One visible decision at a time preserves the existing explicit confirmation model and prevents the model from bundling content and structure mutations.
- **Alternative rejected**: Showing append and category proposals together adds cognitive load and ambiguous partial-apply behavior; unlimited questioning creates an unbounded chat loop.

## Decision 15: Record the Mastra transitive audit finding; do not force an internal override

- **Decision**: Keep the official `@mastra/core@1.63.2` graph intact and record the current npm audit result instead of overriding an internal AI SDK compatibility alias. Production acceptance must recheck the upstream graph.
- **Evidence**: npm's official audit endpoint reports one Low finding, [`GHSA-866g-f22w-33x8`](https://github.com/advisories/GHSA-866g-f22w-33x8), against Mastra's `@ai-sdk/provider-utils-v5` alias (`3.0.30`). The advisory concerns unbounded JSON response reads; Vercel later merged a [bounded-read fix](https://github.com/vercel/ai/pull/16374) into newer AI SDK lines, but no patched provider-utils 3.x release is available for Mastra's exact alias. Log Note's active OpenAI-compatible provider uses provider-utils 4, while the v5 alias is Mastra's multi-version compatibility dependency; the route also requires an authenticated same-origin account, rate-limits requests, permits one model call, caps output tokens, and enforces a hard timeout. These controls reduce exposure but do not make the dependency audit clean.
- **Rationale**: There is no patched provider-utils 3.x version exposed for Mastra's exact dependency, and substituting a different major inside framework internals would create an unreviewed compatibility fork. The finding affects availability at Low severity rather than note confidentiality/integrity, but it remains explicit release evidence rather than being hidden.
- **Follow-up**: Track a Mastra release that removes or upgrades the v5 compatibility dependency, or perform a separately authorized dependency-risk acceptance before deployment. Do not run `npm audit fix --force` for this rework.
