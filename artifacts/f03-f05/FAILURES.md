# 保留的开发失败与修正

1. 最初纯内存连接故障用例得到 undefined 而非 503：测试处理器没有真正调用懒连接，因而根本未触发故障。修正为先调用 requestDatabase().query，再断言业务计数为 0 和响应无凭据；没有改变服务端的 503 条件。
2. 首轮 PG 37 项报告（35 pass / 2 fail，包含失败父项）：统计接口被错误附带 summary/feed/limit 查询参数，按契约返回 400。完整输出见 [postgres-first.log](failures/postgres-first.log)。修正调用方仅向 strategies 传筛选，统计接口保持拒绝所有参数。
3. Windows 下真实打包测试首次 import 使用 E: 绝对路径，ESM loader 报 ERR_UNSUPPORTED_ESM_URL_SCHEME。使用 node:url 的 pathToFileURL 导入已安装包；未改变任何打包或运行时断言。
4. 首次完整检查在 ESLint 退出 1：[lint-first.log](failures/lint-first.log)。ZIP 读取 Promise executor 的箭头隐式返回触发 no-promise-executor-return；改为无返回值的块函数，没有关闭规则。

最终结果见 results.json 和最终日志。上述失败保留，不把早期失败计为最终通过，也不把合成测试说成云端验收。
