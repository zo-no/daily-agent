# P01 本地数据保护结构治理

**Planning stage**: `S3 / I1`
**Requirement**: `REQ-20260911-01`
**Legacy Board Item**: `LN-013`

## 本阶段目标

把当前平铺在 `src/lib` 的核心数据、恢复和同步职责整理到可搜索的层级，并用 TypeScript 固化 `AccountDataPayload`。本阶段只做行为保持的目录迁移、职责拆分、引用更新和回归，不改变本地序列化格式、云端 RPC/表/CAS/合并语义或产品交互。

## 当前迭代 I1

- `src/shared/contracts`：当前项目内共享的纯 TypeScript 业务契约。
- `src/domain/account-data`：归一化、校验、版本迁移和领域不变量。
- `src/application/account-data`：保存、加载和受保护恢复用例及端口。
- `src/infrastructure/local`：localStorage/IndexedDB 运行适配。
- `src/infrastructure/cloud-sync`：现有云文档和增量适配的结构归属，不新增网络行为。
- `src/app/_providers/log-note-data-provider.js`：继续拥有 React 生命周期和 `commitData` 编排。

步骤二、步骤三的细节只记录在根 `spec.md`、`plan.md` 和研究材料中；本文件不创建第二份任务清单或验收清单。

## 退出证据

完成本阶段后，必须提供结构依赖回归、旧数据/备份回归、账号隔离与恢复失败保护证据、TypeScript 检查、`npm run check` 结果、旧 `src/lib` 入口删除或保留理由，以及当前工作区未验证项。总控独立对照 `PROJECT_BOARD.md` 的 `LN-013` 验收标准后，才可进入下一阶段讨论。
