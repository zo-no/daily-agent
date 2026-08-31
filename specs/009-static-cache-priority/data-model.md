# Data Model: 静态资源缓存优先

本项不创建、迁移或修改用户数据模型。

| Entity | Ownership | Lifecycle | Constraints |
| --- | --- | --- | --- |
| 版本化构建资源条目 | 公共离线壳 | 首次成功读取后写入；新壳激活时旧壳删除 | 仅同源构建路径；不含账号或私密数据 |
| 离线壳版本 | 应用发布 | 注册新版本后创建；激活时保留当前版本 | 与构建资源和 Service Worker 注册版本一致 |

账号 localStorage、IndexedDB Blob、Supabase 文档和备份不是本项实体，也不改变其字段、生命周期或所有权。
