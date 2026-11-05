# 公开读取与管理验证修复

## 本轮实际修复

`_shared/strategy-read.js`是唯一公开读取路径。无status或status=published均由服务端绑定published；full/summary/search/category/sort/page全部含状态条件。ID读取固定`id=$1 AND status='published' LIMIT 1`。显式all/draft/archived返回403，草稿/归档ID404，伪造role/password参数不授予权限。没有新增匿名管理草稿读取路径。未来管理读取应为单独服务端授权接口。

`_shared/admin-password.js`只在调用时读取受控环境ADMIN_PASSWORD，没有源码fallback。缺失、空白、无效输入拒绝；哈希后timingSafeEqual比较，失败均401和“管理验证失败”。两个actions在建立数据库客户端/执行SQL之前检查pin/delete。密码只从写请求JSON body读取，GET405，不把密码放URL。JSON格式错误400；外层异常用通用500，不回传配置内容。

## 兼容性

仓库当前攻略页和旧strategy-wall-service默认不传status，摘要/完整DTO及原管理POST body兼容。显式status=published继续可用。过去匿名status=all/draft/archived的行为**有意收紧为403**，不再作为兼容能力恢复。仓库内不存在依赖匿名草稿列表的用户界面；外部历史调用方未获盘点，升级说明必须告知其改用公开列表，管理草稿待安全接口。未修改作者、评论、点赞或历史记录。

只有环境已明确配置ADMIN_PASSWORD时管理员操作才恢复；若旧站一直依赖公开默认值，现会安全拒绝，不能以备用默认密码“修复”。这不是完整会话认证：仍是共享管理口令，暴力尝试限制/轮换/审计/CSRF和会话边界需后续实施。

## 实测

- [postgres-results.json](postgres-results.json)：原生PostgreSQL真实执行readStrategies及actual strategies.handler GET；34公开+1草稿+1归档，full/summary/搜索/ID/伪管理参数均无草稿泄漏，旧完整DTO保留。
- [admin-results.json](admin-results.json)：18例，攻略/留言×pin/delete×缺配置/空配置/错密码/正确随机测试密码16例，外加两种GET拒绝。无效验证零SQL/零数据库工厂调用；合法管理操作真实更新/删除本机合成记录。密码仅进受控VM process.env，不进入报告或仓库。
- `node --check`四个修改JS文件通过。浏览器帖子/评论提交仅本机合成接口，不能证明Neon生产写入。

## 未解决与下一阶段顺序

1. 先建立服务端可验证会话、失效/轮换、CSRF和限流；localStorage不是凭证。当前署名/匿名userId/点赞身份仍可自报，不认定认证成员。
2. **独立P0积分任务**：在任何真实成员身份写能力上线前，将积分/兑换/签到相关授权绑定服务器身份，服务器计算分数与价格，增加事务/审计/重放约束。此处未改points或数据库，不能宣称解决。
3. 新认证留言/回复/攻略只从服务器member ID绑定身份；历史记录不能凭昵称认领头像。保留匿名路径并明确标识。
4. 随后批准隔离测试结构与对象存储，实施服务端验证/重编码/频率/缓存/替换失败保护，最后才考虑生产迁移。profile-lab不得成为真实资料系统。
5. 既有匿名写接口缺少完整限流与防滥用；actions仍可能接受自报ID，旧回复序列化/并发、跨状态POST和旧自动浏览量endpoint风险未在本轮重构。新阅读器没有自动view POST，但旧endpoint仍在，必须在后续安全任务治理。

没有生产数据库、生产口令、真实用户资料或服务器会话测试；不把本地VM的受控口令测试描述成线上登录安全认证。
