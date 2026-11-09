# 默认关闭的独立TEST服务适配

基于42722d5的五组处理器；这里没有新业务、第二套登录、签到事实或积分账本。所有文件均在Netlify Functions扫描目录和正式app/public之外，没有可部署的新入口、重写规则或公开启用标志。approval.disabled.json默认enabled=false，默认构造在连接数据库前拒绝；本轮不改现有生产、TEST、云环境变量或角色。

## 调用与资源门禁

`cloud.cjs`提供Netlify Fetch Request/Response桥接、显式`/.netlify/functions/jinxi-service/{member|community|attendance|points|operations}`路由和流式64KiB上限。未来包装器须从Netlify提供的Context传入ip、site与deploy，不接受请求头自行声明客户端身份或站点；这是[Netlify Functions官方API](https://docs.netlify.com/build/functions/api/)的Context接口，context.user并不替代本项目成员会话。

构造器要求经代码审查批准的独立manifest与专用服务端secrets对象，精确绑定站点UUID、HTTPS origin、提交SHA、授权有效期、Neon endpoint、数据库名、环境UUID、数据库物理指纹及预期服务地址。SITE_ID/CONTEXT/COMMIT_REF/JINXI_SERVICE_APPROVAL必须吻合；旧生产站及当前只读TEST的siteId/host/environmentId/fingerprint被排除，Preview/branch/local上下文、继承DSN/管理员密码也不能放行。复制客户端标志或拼出settings普通对象不会取得服务端注册能力。

每个角色使用独立pg连接与`ssl.rejectUnauthorized=true`，不使用DSN、SET ROLE或管理员连接。启动前以只读事务分别运行五组原权限验证；每次业务请求仍再验证同一资源/精确列权限、RLS、约束触发器和当前会话，失败回滚/关闭连接，响应不返回连接详情。原本机settings仍严格限制127.0.0.1:55436与https://127.0.0.1:3069，没有通过通用开关放宽本地模式。

`handlers.cjs`由本机网关和未来云桥共同使用：仅一个member handler，其他四组使用它核验身份；资源适配只更换经核实的目标地址/分类，原SQL权限矩阵及业务事务不变。没有启用任何现有旧Netlify写函数。

## 最小权限矩阵（没有在云端应用）

| 服务角色 | 允许 | 继续禁止 |
| --- | --- | --- |
| jinxi_member_session | 账号必要读取、密码指定列更新；会话/限流必要列写入 | 任意身份映射、档案改写、业务账本、其他schema写入 |
| jinxi_community_app | 可信会话必要列、本人/公开RLS内容、回执/审计及限定状态列 | 原历史认领、角色授予、其他业务写入、DELETE/TRUNCATE/DDL |
| jinxi_attendance_app | 本人事实、事件和请求关联；仅受控INSERT列 | 客户端日期/连续天数/金额、事实UPDATE/DELETE、积分账本 |
| jinxi_points_app | 受限账户、流水、规则、结算、订单及库存；仅读签到事实 | 改签到、改历史流水、绕过来源/余额/退款触发器、身份DDL |
| jinxi_operations_app | 公告/感谢/组队及审计；原staff/admin和队长约束 | 普通成员管理发布、角色授予、历史改写、身份/积分写入 |

所有服务角色无SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS、无角色继承/对象所有权/数据库TEMP和越界读写；逐列授权仍以各模块proof/schema为依据。所有者/迁移人员与服务LOGIN隔离，初始NOLOGIN；本轮仅原新建本机合成工厂按既有方式启用临时角色，未改变任何云端writer。

## 未来必须单独批准并验收

需要独立合成站点/数据库的准确身份与成本批准、受控schema建立、synthetic-test身份登记、五个最小角色及TLS连通验收、专用密钥注入与轮换、显式包装器/同源静态构建接入、精确提交批准和仍有效的发布门禁。原SQL包含本机专用保护及synthetic-local登记，**不能直接复制到Neon执行**；云schema建立须另行审查，当前构造器会拒绝未满足schema契约的目标。

本轮测试证明默认拒绝、路由契约、TLS参数/错误净化、本机同处理器真实PG与HTTPS；没有连接实际Neon或Netlify来证明云端启动成功。真实Context、endpoint服务器地址、证书、云角色与schema指纹仍是后续强制验收，不能从本机测试推定已通过。

未来启用须独立授权调整manifest和包装器；启用失败应保持旧站与只读TEST不变。回滚首先关闭新服务门禁/撤销新环境服务LOGIN并回到原批准静态版本，保留回执与审计用于对账，不删除或补算历史交易。本轮没有执行这些操作。
