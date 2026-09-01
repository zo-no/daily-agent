# Requirement Quality Checklist: GitHub to Personal Tencent CVM

**Board Item**: LN-037
**Created**: 2026-08-31
**Purpose**: Review the revised public delivery requirements, not claim a live deployment

## Trigger and dependency boundary

- [x] CHK-T01 Is CatPaw explicitly retained while its private package graph is excluded from the
  GitHub root install and lockfile? [Scope, Spec FR-015]
- [x] CHK-T02 Are pull-request/non-main behavior and the exact successful-main-push deployment
  condition independently testable? [Trigger, Spec FR-016–FR-017]
- [x] CHK-T03 Are obsolete quality runs cancellable while production activation is serialized and
  non-cancelling? [Concurrency, Contract Source and trigger]

## Artifact and configuration

- [x] CHK-T04 Does the requirement distinguish build-time public browser values, runtime server-only
  values, and SSH material without requesting any value in source or evidence? [Security, FR-021]
- [x] CHK-T05 Is build-once behavior measurable through a standalone artifact and an explicit ban on
  CVM install/build steps? [Reproducibility, FR-018 and SC-011]
- [x] CHK-T06 Are exact revision metadata, public/static assets, checksum, and prohibited artifact
  contents defined? [Completeness, Deployment contract Build artifact]

## Activation and recovery

- [x] CHK-T07 Are accepted incoming path, revision, checksum, archive safety, and required-file checks
  explicit before activation? [Security, FR-019]
- [x] CHK-T08 Are new-directory extraction, immutable release identity, atomic symlink switching,
  restricted runtime, and loopback-only port behavior explicit? [Operations, FR-019]
- [x] CHK-T09 Does failed readiness restore the exact prior target and return failure without deleting
  releases or running migrations? [Recovery, FR-020]
- [x] CHK-T10 Are first-release failure, existing-release redeploy, two concurrent pushes, and absent
  GitHub/server configuration covered as edge cases? [Coverage, Spec Edge Cases]

## Evidence and scope

- [x] CHK-T11 Is local contract evidence separated from the later real GitHub run and controlled
  rollback rehearsal? [Evidence, Tasks T050–T052]
- [x] CHK-T12 Are DNS, ICP, certificate issuance, public announcement, CatPaw deployment, Nginx edits,
  database migration, and release cleanup kept outside routine CI/CD? [Boundaries, Spec Scope]

## Review result

All twelve requirement-quality checks are satisfied. These markers validate the written contract;
they do not prove GitHub secrets, CVM bootstrap, a live `main` deployment, or rollback rehearsal.
