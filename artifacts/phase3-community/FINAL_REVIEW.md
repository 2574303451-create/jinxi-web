# 第三阶段检查点2：本机合成留言与攻略交付

日期：2026-11-07。结论：本地合成业务实现及测试完成，候选仅在独立本地分支保存；没有推送、PR、部署、云端数据库或平台设置变更。不能把本地通过称为云端业务恢复。

## 版本与范围

- 实际工作树：`E:/Recovery/.jinxi-research/phase3-community/worktree`，分支`codex/jinxi-phase3-community-local`。
- 创建及开发基线：`35ae9a676813249ae2beff9845251eb57a72855c`，继承身份修复`6f71de9eec8093e3d139b3201fe4249c6b0e52ff`和F03/F05基线`d43ee24cfde1277eedabc8c8856de697b702dc0f`。最终本地SHA以本文件所属提交及最终答复为准。
- 原身份工作树仍位于`E:/Recovery/.jinxi-research/phase3-member/worktree`；本轮没有在原目录开发。`E:/Recovery/jinxi-web`仍是旧PR14工作树。旧`E:/Recovery/jinxi-research/takeover-20261107-092150/`交接核验目录不是本轮源码根目录。
- 上轮身份[GitHub Actions运行](https://github.com/2574303451-create/jinxi-web/actions/runs/42363078349)经本轮只读API重新读取：SHA为35ae9a676813249ae2beff9845251eb57a72855c，状态completed/success，原始选取字段在[identity-baseline-ci.json](identity-baseline-ci.json)。这不是本轮业务代码的远程CI结果。本轮原生`git ls-remote`遇到schannel TLS握手失败；没有因此修改Git安全或远程配置。
- 修改限于`community-local/`、四个`tests/community-local-*`测试文件、`scripts/community-local.cjs`、package测试命令、ESLint新增目录以及必要交接/证据。未改应用依赖或lock。
- 主站app/components/hooks/lib/services/types/styles/public、member-local、Netlify Functions、test-environment、.github、netlify.toml、UI_AUDIT相对基线无内容差异。构建生成的guild-home-facts只有换行噪声，核对Git blob一致后已清除工作区噪声，无事实变更。

## 实际业务

留言由已验证会话取得稳定成员UUID，创建后待审核；本人查看/修订/归档/软删除，独立审核后公开。普通成员可以回复和明确设置/取消互动；本人或受信任管理员可删除回复。置顶及删除他人业务内容仅管理员可操作。

攻略保留原分类、难度、封面和mediaFiles字段契约，新增本地草稿→提交→审核/退回生命周期；公开后修订会撤下并重审。作者关联来自服务器会话，不接受author/userId/isAdmin/旧管理员口令授权。媒体只用两条固定本机合成引用，未上传云存储、未证明实际媒体播放能力。

所有写入验证Origin、CSRF及有效会话，在账号/会话锁内再次核验过期、撤销、锁定、停用、认证版本和首次改密。审核角色由本地可信UUID授权表提供，普通profile角色不赋权；审核员/管理员均不能自审。RLS、列授权和触发器提供纵深约束，运行角色不能DDL、TEMP、读取密码hash或给自己授角色。事务上下文community.actor是应用完成认证后设置的上下文，不能宣称数据库独立验证身份，亦不能抵御运行连接凭据失窃后伪造上下文。

写操作同成员+requestId+请求摘要幂等；同号不同内容409；显式version并发修订只接受一个。请求回执、内容及审计同一事务，故障整体回滚。互动是active设值而非toggle；唯一键避免重复累加。评论与撤下通过共享/独占逻辑锁串行化。公开只读published；历史无可信归属样本owner=NULL、legacy=true，对所有角色保持只读，不按昵称认领。

## 真实验证

工具：Node24.22.2/npm11.19.1、PostgreSQL17.11、Playwright1.64.1及本机Edge。完整可复现PowerShell命令在[community-local/README](../../community-local/README.md)。所有业务库由原freshDatabase新建SCRAM回环临时集群（55436），没有真实成员或Neon连接。测试结束关闭服务器及集群，不删除真实数据。

| 验证 | 实际结果 | 证据 |
| --- | --- | --- |
| 新业务真实PostgreSQL | 12组业务/授权场景，Node含父测试计13/13，0跳过 | [postgres-final.log](postgres-final.log) |
| 真实HTTPS | 1组多断言通过；正常Cookie、Origin/CSRF、游客/伪造拒绝、跨成员回复、旧入口404、Host/CSP、退出拒绝 | [https-final.log](https-final.log) |
| 真实浏览器完整流程 | 留言创建/审核/回复/越权拒绝；攻略草稿/提交/审核/公开读取通过 | [最终results.json](browser/2026-11-07T11-41-49-884Z/results.json) |
| 响应丢失/重试/切号 | 服务器成功后故意丢响应，原号重试只有1行；B不能重放A请求，草稿保留；回A重试成功 | 同上 |
| 私有页面清理 | A载入本人编辑内容→实际退出→B实际登录；旧私有列表与绑定编辑字段清除 | 同上 |
| XSS/页面状态/宽度 | 历史恶意HTML只按文本展示，脚本执行false、注入节点0、pageErrors/CSP违规/外站请求均0；1440/1024/768/390/320无横向溢出，键盘focus为3px | 同上及五张截图；人工查看320/1440 |
| 原公开只读/TEST权限模型真实PG回归 | 46/46，包含公开API、ACL攻击、冻结及回滚，不连接云端 | [public-read-regression.log](public-read-regression.log) |
| 原API/安全测试 | API14/14、安全86/86（含新增边界3项） | [unit-final.log](unit-final.log) |
| TypeScript | 原始tsc --noEmit --incremental false，exit0 | [typecheck-final.log](typecheck-final.log) |
| ESLint | 新目录纳入检查，未关闭规则；exit0 | [lint-final.log](lint-final.log) |
| Build | Next16.4.5静态导出exit0，CSP7页面/8hash；Browserslist数据库陈旧提示保留，未改依赖 | [build.log](build.log) |

PG场景明确覆盖同昵称不同UUID不能共享所有权；游客/首次改密/锁定/停用/退出/绝对和空闲过期均拒绝；身份查询成功后再发生退出、锁定或过期仍拒绝且不写回执；普通成员不能审核/置顶；数据库直接运行角色不能自审或改他人正文；留言/攻略回复、收藏及点赞；重复和并发修改；审核审计故障回滚；授权漂移关闭；所有角色不能改历史内容及互动行。没有删除断言或降低权限以通过测试。

本轮代码未推送，没有本轮远程CI。真实业务PG/HTTPS/浏览器不在现有GitHub Actions覆盖范围；现有CI会覆盖新增三项边界单测，不能据此声称远程全面验证。

## 失败原因及修复记录

早期RED阶段缺少模块或操作尚未实现的失败（tracer/messages/guides/interactions/https-before）原样保留。随后实际失败及处理：

1. 首个真实写入503：ACL枚举把索引当作表；缩小到实际关系类型，并保留完整列权限证明，不放宽授权。见tracer-first/probe/after。
2. 并发撤下测试失败：FOR SHARE对无UPDATE授权成员与RLS组合出现42501；改为交互共享、内容变更独占的事务级逻辑锁。测试在实际锁点同步后仍保留“撤下必须等待”的断言。见concurrency-first、concurrency-synchronized、security-probe、security-after-lock-fix及最终PG。
3. 直接角色可以伪造audit.actor：新增audit插入RLS检查。没有让运行角色读取审计或写角色表。见security-first及最终PG。
4. 独立审查发现数据库未阻止审核员自审/改他人payload、legacy互动仍能写：增加真实负向测试，review-before-confirmed确认失败；补触发器和API/RLS/UI拒绝后review-after及最终PG通过。最终扩展到留言/攻略和三种角色，并直接SQL证实历史回复/互动INSERT被拒。
5. 早期浏览器等待错误：审核点击后未等待POST实际完成就断言公开状态、历史恶意样本未等待新增行，导致超时/错误目标断言；改为等待真实成功响应和对应id，不削弱原断言。原失败results保留。
6. 真正页面隔离问题：退出后旧私有列表残留，随后发现编辑框仍留服务器载入的私有文字；分别在browser-privacy-before及browser-editor-before真实复现。reload/setIdentity清列表，独立editorFromServer标记清绑定字段（不依赖可能被清空的editing指针），自行输入草稿保留；最终浏览器用相同断言通过。

review-before.log为空，是中断尝试，不作为通过证据。开发时临时诊断仅打印错误码，已从最终代码删除；失败日志保留但无密码/Cookie值。最终受测文件指纹、范围及敏感信息模式检查另见同目录JSON记录。

## Standards

独立标准轴复核：未发现剩余可确认标准违反项。原数据库自审缺口、legacy互动及页面私有列表问题均已修复；AGENTS要求的原始tsc、必要回归和提交前范围核对执行。community.actor可信边界已准确说明；不夸大本地试验为生产保证。

## Spec

独立需求轴复核：未发现剩余可确认范围偏离或阻断项。最后的服务器编辑字段残留已通过独立标记修复，代码/内存复核闭环，根代理最终实际浏览器也已通过。原设计、身份实现、云端只读隔离、UI-DEFER-001/002保持原样。

双轴最终剩余发现：Standards0、Spec0。本地合成验证范围内未发现尚未修复的安全缺陷；这不是生产渗透测试或迁移验收。

## 兼容、限制与下一动作

原成员身份模块逐字保留，新的业务连接另用最小权限角色；原公开Functions和旧写入冻结守卫未改。旧生产Published锁定、Deploy Previews关闭、合成只读TEST发布和构建冻结沿用此前验收状态；本轮没有调用任何更改这些状态的接口。原18PR、main、pr17-validation、TEST部署分支均未修改。此处是范围/操作约束核对，不冒称本轮重新审计平台实时设置。

本地DTO兼容读取字段，但新的状态、稳定UUID和规范化子表不是旧前端服务的直接替换；主站仍未接入新业务。真实历史归属、JSONB子项迁移、审核角色授予流程、云端身份资源与媒体存储仍需另行审核和授权。未确认归属继续只读；不能直接将此带合成初始化的schema运行于真实库。未确认请求只在内存保留，关闭/刷新页面后的恢复不属于本检查点。

回滚：停止本机演示服务，继续使用未修改的原身份工作树/35ae9a6。没有云端资源或真实数据需要回滚，不执行reset --hard、生产SQL或部署。

下一步唯一动作：审阅本地候选提交及上述证据，决定是否允许进入独立远程代码审核；本轮没有请求或执行推送、部署、迁移、合并。完成后停止。
