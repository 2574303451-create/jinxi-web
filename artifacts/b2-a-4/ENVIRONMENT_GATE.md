# B · 实际环境隔离审查与阻断

基线PR12/483495a；本轮只授权本机合成PG。没有Netlify/Neon/S3控制面连接器、被批准的真实成员TEST连接或生产操作授权。没有读取.env、Netlify登录文件、生产数据库/存储密钥，也未调用实际站点环境变量API或env:list。**当前仍不能证明云预览与生产资源隔离。**

## 环境、资源及角色矩阵

| 环境 | 数据库/角色要求 | 存储要求 | 当前证据/访问策略 |
| --- | --- | --- | --- |
| production | 经批准实际项目/cluster/DB指纹；public reader限4个公开内容表；正式session角色另审，不能复用owner/superuser | 独立生产bucket/访问主体及最小对象权限 | 实际资源、ACL、scope、继承、备份未知；未连接；实验会话固定拒绝 |
| deploy-preview | 独立合成TEST实例/凭据；同URL、角色名差异不能证明隔离；TEST principal在PROD无权限 | 独立TEST bucket和只能访问该bucket的凭据 | 控制面/真实ACL未知；缺证明不得批准，旧写全部关闭 |
| branch-deploy | 与preview相同；核分支特定覆盖和shared来源 | 不得继承site-wide生产store权限 | 同上，不能拿branch名字当证明 |
| local | 仅127.0.0.1:55433/jinxi_005s_b1_test；实际cluster/system/db指纹；reader和session独立SQL角色 | 现有头像为本机IndexedDB，公告草稿为本机storage；没有云上传 | 真实PG通过；b2_lab仅合成账号，保护canary不是生产 |

本机owner为NOLOGIN；运行角色无super/createDB/createRole/replication/bypassRLS/membership、永久schema CREATE或对象/函数所有权。reader默认只读，只允许public.strategies/messages/announcements/guild_sponsorship_entries；session限定b2_lab，台账只SELECT/INSERT，其他必要会话/钱包/限流SELECT/INSERT/UPDATE，无DELETE。实际证明含表/列读取、可写表/列/视图/外表、序列、危险SECURITY DEFINER和函数所有权，不能仅看role名字。

TEMP系统命名空间和平台扩展仍需真实TEST独立清查；当前元数据证明不是对任意扩展、网络路径或被攻陷服务器的完整证明。应用分支若拿到生产密钥，可绕过本仓库guard直接连接，因此继承审计不能被代码开关取代。JINXI_CLOUD_ISOLATION_APPROVAL只是配置门槛，不是隔离证书。

## 不获取值的审查办法与当前缺口

官方公开环境变量GET和CLI会先取回values；CLI隐藏表格不等于未读值。未发现可保证纯key/context/scope/shared来源的官方投影合同，见OFFICIAL_RESEARCH.md。因此本轮没有调用后jq过滤、也没有借浏览器遮罩声称未读取值。

由具备权限的管理员提供以下**不含值**的审核记录；若平台无法保证纯元数据，应先由平台支持确认方法，或由已获明确授权的管理员完成值隔离后仅交付元数据：

1. site/account/deploy ID、配置版本、计划类型；每个变量的key、context、Functions/build/runtime scope、shared/分支覆盖来源、更新时间及变更责任人。禁止提供value、连接串或token截图。
2. 确认DATABASE_URL、生产DB/storage凭据未配置在all-context/preview/dev/shared；检查分支覆盖、旧部署保留配置、build插件、集成及自动注入变量。环境差异名不得作为唯一证据。
3. 分别批准TEST资源ID和预期DB真实指纹；由资源管理员提供角色属性、memberships、schema/table/column/view/sequence/function ACL及RLS/默认权限，确认无owner或Neon高权默认角色。别名、pooler域名或复制branch不构成物理/权限隔离。
4. TEST与PROD主体/凭据独立；审查连接网络、TLS、角色复用及有效权限。未来经明确授权后才能在真实TEST做正向测试；PROD拒绝证据用管理员ACL/IAM模拟或特别批准的非写入鉴权核验，**不通过生产DML证明**。
5. 存储主体到独立bucket/对象前缀的有效授权；测试不能list/read/write/delete生产对象。Netlify Blobs site-wide跨部署共享，deploy store生命周期也不等于长期隔离；当前没有创建/读取任何实际云store。
6. CSP相关snippet injection、prerender/扩展、代理/CDN是否改写HTML和响应头。不能因skip_processing=true就宣称所有变换关闭。

全部记录应含日期、实际资源ID、配置修订与审核结论，不含凭据。撤销旧泄露风险凭据及轮换由管理员另行批准操作；本轮未撤销或修改实际云配置。

## 本轮执行范围

仍统一审查14个Functions：13旧入口保持既定关闭/只读策略，新增session-lab所有云context拒绝。本轮实际PG误授权与失败记录、元数据及全入口负例随PR交付；不把同库canary描述为真实PROD拒绝。数据库/存储资源全部云记录保持“未核验”，不是“已通过”。回滚不得重开旧越权接口。
