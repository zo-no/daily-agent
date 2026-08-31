# Cache Safety Checklist: 静态资源缓存优先

**Board Item**: `[LN-036 Phase 2]`
**Purpose**: 审查缓存策略需求的隐私、安全、更新与离线边界是否足以指导实现和验收
**Created**: 2026-08-31
**Feature**: [spec.md](../spec.md)

> `[x]` means a reviewer found the requirement clear and sufficient. It does not mean the
> implementation or board item is complete.

## User Outcome and Scope

- [ ] CHK001 是否明确限定“重复访问”适用的资源类别，并排除动态页面和账号数据？ [Completeness, Spec §Scope Boundaries]
- [ ] CHK002 是否将“提高缓存率”具体化为已缓存资源在线重复访问不触网的可测结果？ [Clarity, Spec §SC-001]
- [ ] CHK003 是否明确说明没有新增默认界面、记录决策或后台网络任务？ [Completeness, Spec §Default Interface and Recording Cost]

## Local-First, Account, and Data Safety

- [ ] CHK004 是否分别定义了账号本地数据、附件和公共应用资源的所有权及互不进入对方存储边界？ [Consistency, Spec §Offline, Account, Privacy, Reversibility, and Backup]
- [ ] CHK005 是否对 API、认证、RSC、令牌、记录、计划及附件的缓存排除要求逐一明确？ [Completeness, Spec §FR-003]
- [ ] CHK006 是否规定缓存未命中且离线时不得返回 HTML 或任何无关替代内容？ [Clarity, Spec §FR-004]
- [ ] CHK007 是否说明本项不改变原文、同步冲突、备份、恢复或旧数据语义？ [Consistency, Spec §NR-001--NR-003]

## Acceptance and Removal

- [ ] CHK008 是否为在线命中、首次回填、离线复访、私密响应排除与版本更新分别规定验收场景？ [Coverage, Spec §User Scenarios & Testing]
- [ ] CHK009 是否区分自动化可证明的缓存行为与仍待真实会话验证的 LN-036 账号/跨设备事项？ [Completeness, Spec §Assumptions and Dependencies]
- [ ] CHK010 是否给出不迁移用户数据的明确撤回步骤和触发条件？ [Clarity, Spec §Verification and Removability; §Exit Condition]
- [ ] CHK011 是否把所有可构建的成功标准映射到具体回归证据，而不把尚未观察的结果宣称为已验收？ [Traceability, Spec §Evidence Mapping]

## Notes

- 生成给代码审查者使用，深度为标准发布前要求审查，重点为缓存边界和版本正确性。
- 本清单评估需求质量；实现验证另由 `tests/service-worker.test.mjs`、`e2e/run-pwa.mjs` 和完整门禁承担。
