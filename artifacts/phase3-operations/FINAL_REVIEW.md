# 第三阶段检查点5本地合成业务验收

实际工作树E:/Recovery/.jinxi-research/phase3-operations/worktree；分支codex/jinxi-phase3-operations-local；origin https://github.com/2574303451-create/jinxi-web.git。最终完整提交SHA通过本文件所属收尾提交的git rev-parse HEAD和最终答复读取，不在同一提交写自引用SHA。

## A. 实际运行的功能

- 公告：可信UUID管理员/审核员创建与维护服务器草稿、提交、非最后编辑者审核发布、撤回后修订、失效排除、软删除；服务器时间、乐观版本、不可改写修订、本人幂等回执和必要拒绝审计。公开只读不会返回私有归属元数据，本机输入不代表正式发布。
- 赞助：沿用姓名/时间契约的合成感谢列表，上海时间YYYY-MM-DD HH:mm、稳定排序/分页、空/错误状态；可信管理员创建、编辑、隐藏/恢复、软删除及审计。同名独立记录，不认领成员、不含金额/支付/财务结算。
- 组队：稳定UUID创建、自动批准加入、本人退出、队长本人描述管理、一人一队、人数含队长、容量和并发末位控制；独立成员事实/无身份人数投影与来源审计，不把人数当在线。
- 媒体：严格本机合成引用，服务器sanitize-html和浏览器DOMPurify过滤公告，合法/不可信/故意失效引用；视频显式点击才请求并播放，失败可以显式重试，无外部跳转/上传。
- 独立HTTPS演示/operations复用原身份会话和公开失效标记；账号切换清除私有输入与列表、丢弃最后旧回包、本人原nonce显式重试，管理员降为审核员不能使用缓存的管理员能力。

## B. 保持待验的功能

没有权威心跳，在线人数明确不可用。队长转让/解散、战绩/等级战力核验、任务奖励/游戏数据源、语音/即时通信、真实媒体上传与云对象存储没有可信完整契约，未新增此类功能。正式网站的本机公告编辑器仍是本机草稿，不宣称已接入新后端。FAQ/公告弹窗UI-DEFER-001/002保持第四阶段待办。

## C. 代码来源与文件

继承链：F03/F05 d43ee24cfde1277eedabc8c8856de697b702dc0f → 身份35ae9a676813249ae2beff9845251eb57a72855c → 社区f8175c4d22fc8b83c556a7dad943f1960ed1780e → 签到891f2356cdbc4e8cb9fb88b74d7c045171c3b94e → 积分9fde7fec87fc145cb51638114fe4eb2de1717b39 → 公告业务25d6938a6bf42603ecad88428c970c11e5519c21 → 429交互与测试隔离43abd7bdd7f4aa5582e4f1d2cf6c4b6eb237f627 → 本地收尾。每个祖先均实际git merge-base --is-ancestor返回0；远程积分HEAD实际读取仍9fde，远程新分支不存在。

修改仅operations-local目录、scripts/operations-local.cjs、operations-local命名的新测试、package.json/package-lock.json/eslint.config.mjs、必要交接及本目录验收材料。新增模块及README/验收规格，完整文件及SHA256见final-scan.json；原四模块、正式UI、旧Functions、工作流、Netlify及TEST脚本无差异。新增锁定sanitize-html2.18.1，独立node_modules安装；原锁定依赖版本0变更，凭据只在临时本机目录。

## D. 实际命令与结果

完整命令在operations-local/README.md；PG回归逐条命令、起止时间和真实退出码在pg-regressions.json。下面是Node报告数量（包括父测试，不将各套件重复累计成业务数量）：

| 验证 | 真实结果/证据 |
|---|---|
| 新业务PostgreSQL | 10/10；operations-regression.log。检查实际草稿状态、审核、公开排除、修订数、历史不可访问、UUID隔离、9并发争1空位、旧四模块同库共存与原账本不变 |
| 故障/撤权/锁/期限专项PostgreSQL | 11/11；review-expanded-green.log。账号/会话/业务锁等待期间变化、真实退出/改密、末尾降权/过期、真实SQL错误后快照相等和原请求安全重试 |
| 新HTTPS | 1/1完整链路；https-green.log。真实TLS/安全Cookie/CSRF/Origin/Host/私有权限、状态流转、媒体206/404/416、旧云写路由404及退出/改密 |
| 边界/富文本/页面事件 | 18/18；unit-final.log。内容过滤与实际请求次数、actor/nonce、切号/延迟/降权/429清理，不只HTTP状态 |
| Edge综合浏览器 | browser/2026-11-08T09-25-05-964Z/results.json passed=true；公告、赞助、丢失响应、队伍、真实视频播放/失败、无广播最终旧回包、闲置切号、降权、首次改密和锁定；1440/1024/768/390/320全通过，无横向溢出、错误、外部请求或CSP违规。已目视320和1440截图 |
| Edge真实429专项 | rate-browser-green.log及rate-browser-result.json，实际RATE_LIMITED→私有清理→仅恢复指定合成限流桶→首次改密仍403，业务回执0 |
| 原身份/社区 | 身份18/18（含真实HTTPS）；社区13/13+专项4/4；对应*-regression.log |
| 原签到/积分 | 签到14/14+专项4/4；积分11/11+专项9/9+不变量4/4；对应*-regression.log |
| 原只读TEST模型 | 46/46；readonly-final.log。全新loopback55435，不访问云端 |
| 旧公开API/全部安全/原视频 | API14/14、安全138/138、视频6/6；api-final/security-final/video-final.log，无跳过 |
| 工程 | 原始tsc --noEmit --incremental false、ESLint、Build均退出0；typecheck-first/lint-final/build-first.log。Build为原正式静态导出，未集成本机业务页面 |

## E. 审查与失败记录

INDEPENDENT_REVIEW.md逐项记载真实200越权私有元数据、降权缓存/延迟草稿、拒绝审计回滚的RED与修复GREEN。主体25d6938经过Standards/Spec两路独立只读审查，均0阻断；17个纯测试各自独立通过。

后续运行代码只有429错误文案分支，其他增量为就绪等待、独立限流夹具与文档/测试。主代理复核并实际复测；两路补审因工具使用额度不可用未执行，不把它们报告为独立通过。该最终小增量的第二次独立复核是覆盖限制，无已知未修复安全阻断。限流规则、原账号及会话未放宽；限流测试hits=0被原CHECK拒绝，已改合法值1并保留失败证据；没有删除或跳过原断言。

## F. 兼容及保护

原身份/社区/签到/积分源文件字节不变，真实合成回归全部通过；同库调用原四模块后，新增业务不改变原签到事实、unsettled事件、积分账户/流水或旧合成历史。成员登录仍只有原身份系统；新角色不能读密码、角色写入、积分、签到事实、旧历史或授予权限，等待锁后与提交前重验。

本轮没有生产/TEST API、数据库、角色、环境变量或部署写操作，没有push/PR/merge；不修改main、原18PR、生产Neon、pr17-validation或云端writer。已有Netlify锁定/冻结和连接保护代码均保持原样，未重复操作云端基础设施。Git祖先/差异/敏感模式扫描见final-scan.json，旧云写入口仍由既有安全测试验证冻结。GitHub本轮只读记录的是积分基准[实际Actions](https://github.com/2574303451-create/jinxi-web/actions/runs/42450993005)，SHA9fde，completed/success，实际job/step都success，见base-ci-jobs.json；它不覆盖尚未推送的本轮代码、专用本机PG/HTTPS/浏览器，不冒称本轮远程CI通过。

## G. 历史与真实服务限制

旧公告作者字符串、赞助姓名及localStorage队伍不能证明UUID关系。本轮只用新临时数据库内合成旧样本保留原语义，未读取/复制/认领真实历史；未来须核实映射、时区、发布/审核制度、赞助来源及媒体权限。合成admin/reviewer、非最后编辑者审核、容量包含队长等不能直接套用历史。在线、真实媒体、旧数据兼容及正式集成留第四阶段受控验收。500ms标记检查受浏览器调度影响，不能保证后台页面已经显示的文字被即时远程擦除；重新读写和旧回包受实际服务端/页面核验保护。全局互斥/全量快照分页需正式容量验收。

## H. 收尾判断

已有明确契约的业务在本机实际运行，自动测试通过，主体独立审查通过，无已知安全阻断。可以准备申请同名独立审核分支安全推送；最终429小增量独立补审的覆盖限制须随候选一起审核，不能隐藏。当前仅本地提交，未经授权不推送、部署或合并；下一动作仅为审核并授权安全推送。第三阶段本地业务进入收尾，本轮停止，不提前执行第四阶段集成/UI/历史迁移。

收尾提交后再次ls-remote时，默认schannel与临时-c http.sslBackend=openssl均因TLS握手/EOF失败，未读到新的远端状态；没有修改全局Git设置或关闭证书校验。此前本轮实际读取的积分远端9fde、无operations分支及Actions成功记录仍是最近可取得证据，不能冒称收尾复读成功。安全推送前必须恢复远端读取、补核当时的远端与发布门禁，并携带上述小增量独立补审保留项；目前不作无保留的推送就绪声明。本轮没有push。
