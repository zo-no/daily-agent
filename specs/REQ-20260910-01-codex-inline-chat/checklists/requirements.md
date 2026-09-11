# Requirements Quality Checklist: Codex 风格内联聊天第二期

**Requirement**: `REQ-20260910-01`
**Purpose**: Requirements-quality review（需求质量）
**Created**: 2026-09-10
**Feature**: [spec.md](./spec.md)

> `[x]` 表示评审者认为该要求清晰且充分，不代表实现或看板项已完成。

## User Outcome and Scope

- [x] CHK001 改进的核心闭环行为与支持性用户证据明确（内联聊天不替换工作区，产品负责人明确要求）
- [x] CHK002 每个 story 独立可用、可测试，并与相邻功能（速记、Plan、Diary Agent）有界
- [x] CHK003 默认 UI 暴露与记录步骤成本可测量（默认速记，切换一次 header 点击）
- [x] CHK004 假设、依赖、排除项与未决决策可见（第一阶段 T007 仍开放）

## Local-First, Account, and Data Safety

- [x] CHK005 账号归属、离线行为、stale revisions 与账号切换覆盖（聊天页面会话、零写入、账号切换清空）
- [x] CHK006 原文完整性、可逆性、备份/恢复/导出/旧数据行为覆盖
- [x] CHK007 网络/隐私边界写明精确数据、鉴权、密钥、限制、日志、降级与删除/重算行为

## Acceptance and Removal

- [x] CHK008 验收场景包含正常、空、非法、中断与失败行为
- [x] CHK009 自动化回归与真实环境/人工证据区分
- [x] CHK010 移除、回滚、迁移、退出条件与非采纳标准可测试
- [x] CHK011 需求映射到看板验收标准，不创建第二 backlog

## Notes

- 唯一未决项是第一阶段 `REQ-20260909-01` 的 T007（完整 `npm run check` 与移动证据）；本阶段实现完成前需一并补齐，否则不标 Returned/Accepted。
