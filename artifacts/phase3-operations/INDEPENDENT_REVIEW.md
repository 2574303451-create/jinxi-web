# 检查点5独立代码审查与修复证据

固定基准9fde7fec87fc145cb51638114fe4eb2de1717b39，双路独立审查候选25d6938a6bf42603ecad88428c970c11e5519c21。遵循review技能的Standards与Spec两路，审查者均只读、不占用PG/HTTPS端口；各自实际重跑边界/HTML/页面事件17/17，无跳过。

## Standards（独立审查原结论）

0项明确标准违反，0项新增安全阻断。核对了统一身份、账号/会话/锁后及提交前重验、回执所需权限、本机资源指纹、列授权/RLS/固定搜索路径/来源触发器、事务、HTML/本机媒体、正式UI/原模块/旧Functions/部署门禁未改、历史不认领与在线不伪造。HTTPS、浏览器及继承回归由主代理提供实际证据，不能由静态审查代替。

## Spec（独立审查原结论）

0项阻断性规格缺陷，0项未经请求的扩张。公告状态/独立审核、赞助姓名时间、组队既有自动加入规则、本人管理、角色重验、延迟回包、在线/媒体与历史待验边界均符合本轮规格。没有改原模块、旧Functions、正式UI或门禁。结论不代表云端业务恢复。

## 实际发现、RED与最小修复

| 真实问题 | RED证据 | 修复及GREEN |
|---|---|---|
| 普通成员以private视图读取已公开公告时，DTO附带作者UUID | sponsor-and-private-red.log，实际200/foreignOwnerExposed=true | store在私有管理读前要求当前staff/admin，sponsor仅admin；sponsor-and-private-green.log及最终operations-regression.log，实际403且无他人UUID |
| admin降为reviewer后重用旧管理员协助编辑回执，或管理读/覆盖编辑末尾降权，仍可能返回/提交他人草稿 | capability-red.log，前三个断言200而非403 | requests.required_role记录实际能力；跨作者编辑要求admin；管理读保留最初所需admin；提交前重新验证实际角色。capability-green.log及review-expanded-green.log，403、无他人私稿、完整快照回滚 |
| 普通成员初始权限拒绝时，错误地保留要求staff导致拒绝审计随最终403整体回滚 | capability-red.log，审计0而非1 | 初始角色校验通过后才设请求所需角色；普通成员拒绝保存本人拒绝审计且无业务内容。审计不承诺覆盖会话失效/末尾撤权导致整体回滚的请求 |
| 综合浏览器首次改密场景出现通用失败提示；独立首次改密探针正常，原IP限流可产生相同429路径 | browser前两次results.json失败；probe-first.log独立通过 | 不改限流规则，独立场景重置合成限流夹具；增加429清楚提示、实际应用完成等待及定向真实429测试。browser第三次全链路/五宽度通过；rate-browser-green.log单独记录真实429与首次改密拒绝 |

未完成的功能RED（新模块缺失、赞助/组队尚未实现）保留tracer-red、teams-red等日志，不能称为旧系统回退。以下为测试本身的问题，未放宽业务防护：伪造权限字段按原契约应403，初写400已改为同时断言403及CLIENT_AUTHORITY_REJECTED；HTTPS测试把团队返回item误写team已更正；运行器误把Git LF与工作树CRLF逐字节比较已改为先git diff确认原文件干净、保存并恢复原工作树字节；限流夹具hits=0违反既有hits>0，改合法值1，保留rate-browser-first记录。

## 最终增量审查范围说明

43abd7bdd7f4aa5582e4f1d2cf6c4b6eb237f627相对双路审查候选，运行代码仅多一条429错误文字分支；其他是文档、浏览器就绪/限流夹具分离和定向测试。服务端、SQL、权限、事务及身份代码字节不变。该增量由主代理逐项复核、重新执行实际浏览器/安全/ESLint；测试夹具0→1也由主代理核对schema hits>0。两路补审请求均因工具使用额度不可用而未执行，不能计为独立通过。主体独立审查结果不被外推为该增量的第二次独立审查；这是审查覆盖限制，无已知未修复安全阻断。
