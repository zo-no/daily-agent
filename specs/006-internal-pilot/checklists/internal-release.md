# Internal Release Checklist: Meituan Internal Log Note

**Board Item**: LN-037
**Purpose**: Formal reviewer gate for identity, data ownership, access control, configuration,
operations, and recovery requirement quality
**Created**: 2026-08-29
**Feature**: [spec.md](../spec.md)

> [x] means a reviewer found the requirement clear and sufficient. It does not mean the
> implementation or board item is complete.

## User Outcome and Scope

- [x] CHK001 Is normal internal use defined as company sign-in plus the complete account-owned core
  loop, rather than process reachability alone? [Completeness, Spec §User Stories 1–2]
- [x] CHK002 Is the internal distribution boundary clearly separated from the later public release
  and existing external-user data migration? [Consistency, Spec §Scope Boundaries]
- [x] CHK003 Are the one-action composer and one-action post-typing save invariants explicit for the
  signed-in internal distribution? [Measurability, Spec §Default Interface and Recording Cost]
- [x] CHK004 Are synthetic-data acceptance and the separate approval needed for real personal notes
  stated without implying that internal hosting alone approves data use? [Clarity, Spec §Offline,
  Account, Privacy, Reversibility, and Backup]

## Identity and Account Ownership

- [x] CHK005 Is Meituan sign-in specified as the only visible internal entry while the default/public
  distribution remains separately defined? [Consistency, Spec §FR-002]
- [x] CHK006 Is the stable owner requirement defined across repeat sessions and devices, including
  explicit rejection of guessed, shared, email-based, or coerced identifiers? [Completeness,
  Spec §FR-003 and FR-006]
- [x] CHK007 Are denied access, malformed callback, identity-provider outage, and incompatible
  identity results each assigned a safe account-gate outcome? [Coverage, Spec §User Story 1]
- [x] CHK008 Is the evidence needed to distinguish standard UUID ownership from claim-only identity
  complete without requiring tokens or claim values in artifacts? [Clarity, Spec §FR-003 and FR-006]
- [x] CHK009 Are the roles of user.id, MIS, employee number, email, and display metadata unambiguous
  for storage ownership versus presentation? [Ambiguity, Spec §Key Entities]

## Internal Data Boundary, RLS, and CAS

- [x] CHK010 Does the spec define which authentication and synchronized-text traffic must stay inside
  the approved Meituan boundary and explicitly exclude the public Supabase project? [Completeness,
  Spec §FR-004]
- [x] CHK011 Are bidirectional two-identity read/write isolation requirements measurable and linked
  to both cloud rows and local/attachment namespaces? [Measurability, Spec §SC-002]
- [x] CHK012 Are first save, retry/idempotency, two-device use, stale revision pause, and explicit
  recovery all covered as required revision semantics? [Coverage, Spec §FR-005 and SC-003]
- [x] CHK013 Is the incompatible-identity branch defined as a planning stop rather than permission to
  weaken RLS, remove foreign keys, or use a shared account? [Security, Spec §FR-006]
- [x] CHK014 Are existing external records, empty-workspace schema setup, synthetic acceptance data,
  and prohibited personal-data migration distinguished consistently? [Consistency, Spec §NR-005 and
  Scope Boundaries]

## Configuration, Secrets, and Disabled Paths

- [x] CHK015 Are browser-public configuration, privileged SSO/database credentials, and prohibited
  client-readable values classified clearly enough for source and control-plane review? [Clarity,
  Spec §FR-007]
- [x] CHK016 Are repository, deployment metadata, screenshots, build logs, service logs, and evidence
  all covered by the same no-credential/no-identifier boundary? [Completeness, Spec §FR-007 and
  FR-011]
- [x] CHK017 Are Google sign-in, Google Calendar, and remote AI exclusion requirements consistent
  across account entry, settings, runtime configuration, and acceptance? [Consistency, Spec §FR-002
  and FR-012]
- [x] CHK018 Is the callback requirement exact about origin registration, safe failure, and the point
  at which sign-in may be declared working? [Clarity, Spec §FR-008]

## Operations, Evidence, and Recovery

- [x] CHK019 Are process readiness and end-to-end usability explicitly separated so a fixed health
  response cannot be used as SSO/RLS/CAS proof? [Clarity, Spec §FR-010]
- [x] CHK020 Are first-deploy failure, later-candidate failure, known-good selection, and the 15-minute
  recovery outcome defined without assuming an unobserved platform control? [Recovery, Spec §FR-013
  and SC-007]
- [x] CHK021 Are real-environment requirements complete for two identities, two devices,
  offline/reconnect, report download, log review, source traceability, and rollback? [Completeness,
  Spec §Evidence Mapping]
- [x] CHK022 Is every stop condition connected to a safe unavailable or known-good state, with no
  silent schema/data migration or raw-note rewrite? [Coverage, Spec §Exit Condition]

## Notes

- Leave an item unchecked until the reviewer has assessed the written requirements.
- This checklist evaluates requirement quality, not implementation behavior.
- The implementation workflow must not modify reviewer-owned checkbox markers.
- Controller review on 2026-08-29 found all 22 requirement-quality checks satisfied after the board,
  product premise, and stable owner versus display-metadata wording were reconciled.
