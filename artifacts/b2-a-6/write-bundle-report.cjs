const fs=require('node:fs'),path=require('node:path');
const report=require('./chunk-inventory.json');
const performance=require('./performance-pr14-pr15-a6.json');
const first=stage=>performance.samples.find(row=>row.stage===stage&&!row.mobile&&row.cache==='cold');
const asset=(stage,marker)=>first(stage).assets.find(row=>row.type==='script'&&row.path.includes(marker));
const pairs=[
 ['Next 内置 React DOM','/fd9d1056-','/4bd1b696-'],
 ['Next 客户端路由 / RSC / segment cache','/117-','/794-'],
 ['main-app 入口','/main-app-','/main-app-'],
 ['Webpack 加载器','/webpack-','/webpack-'],
 ['共享 UI / Motion / 图标 / 样式合并','/493-','/928-'],
 ['留言展示与 Modal 共用组件','/962-','/913-'],
 ['首页业务入口','/app/page-','/app/page-'],
];
const rows=pairs.map(([name,a,b])=>{
 const before=asset('pr14',a),after=asset('pr15',b);
 if(!before||!after)throw Error('Frozen chunk missing');
 return{name,before,after};
});
const sum=(stage,key)=>rows.reduce((n,row)=>n+row[stage][key],0);
const extra=(stage,key)=>first(stage)[key==='raw'?'decodedJs':'jsGzip']-sum(stage==='pr14'?'before':'after',key);
const lines=[
 '# 首屏 JavaScript 增量与完整 chunk 清单',
 '',
 'PR14 与 PR15 冻结产物实际下载的 gzip JS 为 182556B 和 228546B，增加 45990B。以下按实际下载的文件配对，gzip 按每个文件单独计算。HTTP 头部另见 Performance 记录。',
 '',
 '| 来源 | PR14 原始 B | PR15 原始 B | PR14 gzip B | PR15 gzip B | gzip 增量 B |',
 '| --- | ---: | ---: | ---: | ---: | ---: |',
 ...rows.map(row=>'| '+row.name+' | '+row.before.raw+' | '+row.after.raw+' | '+row.before.gzip+' | '+row.after.gzip+' | '+(row.after.gzip-row.before.gzip)+' |'),
 '| 同行时光的两份延迟脚本合计 | '+extra('pr14','raw')+' | '+extra('pr15','raw')+' | '+extra('pr14','gzip')+' | '+extra('pr15','gzip')+' | '+(extra('pr15','gzip')-extra('pr14','gzip'))+' |',
 '| 实际首屏合计 | '+first('pr14').decodedJs+' | '+first('pr15').decodedJs+' | 182556 | 228546 | 45990 |',
 '',
 '两份主要框架块增加 10315 + 35635 = 45950B，约占总增量 99.9%。其他文件净增 40B。React DOM 来自 Next 内置 compiled/react-dom，不能把该块直接当成外部 react-dom 包文件的增量。Next 路由块里新增或扩展的模块包括 segment-cache/cache、scheduler、render-tree、optimistic-routes 和 RSC client。',
 '',
 '一次性、无第三方依赖的 Webpack stats 探针仅放在独立副本中。原始模块 ID 会随构建根路径改变，因此报告用唯一工厂指纹及显式标注的剩余工厂拓扑匹配。对未匹配模块保留空白。JSON 中的 buildSourceBytes 是原模块源码估计，压缩后的单文件 bytes/gzip 才是可相加的下载单位。 [详细模块归属](chunk-inventory.json)',
 '',
 '首屏未请求完整攻略阅读器、头像编辑器、会话实验或公告清理器。未下载视频。Vaul、Recharts 和 Radix Dialog scaffold 未进入应用入口；已实际使用的 Modal 是 native dialog。Polyfills 出现在 HTML 的 nomodule 标签，本次现代 Edge 没有请求。',
 '',
 '曾将 Toast/Spinner 改用同版本 Framer Motion 的 m/LazyMotion/domAnimation。首屏从 228546 增至 232848B。FAQ 的既有异步 Accordion 仍请求完整 motion 功能，新增共享块破坏了原来的复用。该试验已撤回，保留原动效。 [撤回前重复样本](rejected-motion/performance.json)',
 '',
 '最终候选只保留环境声明、静态预览、身份提示和公告指针修复。框架的路由、RSC、React DOM 和安全检查继续按框架方式打包。',
 '',
 '本机复现先将两个完整审核 SHA 分别 checkout 到 E:/Recovery/.jinxi-research/b2-a-6/chunks/pr14 与 pr15。已有目录先核对，避免覆盖。以 Node24.22.2 在两份副本分别 npm ci --include=dev；从主验收工作树运行 node artifacts/b2-a-6/prepare-stats.cjs，只给两份专用副本插入 Webpack 原生stats回调，然后分别 npm run build。node artifacts/b2-a-6/analyze-chunks.cjs 对冻结产物作归属，node artifacts/b2-a-6/write-bundle-report.cjs 生成本表。变更机器目录时同步 variants.cjs 与 scratch。产品 next.config 没有stats探针。',
];
for(const inventory of report.inventories){
 const observed=new Set(first(inventory.stage).assets.map(row=>row.path));
 lines.push('', '## '+inventory.stage+' 完整导出资产', '',
  '| 文件 | 原始 B | gzip B | 归属依赖 | 首页阶段 |',
  '| --- | ---: | ---: | --- | --- |');
 for(const file of inventory.files){
  const deps=Object.keys(file.dependenciesByBuildSourceBytes);
  const origin=file.url.includes('/polyfills-')?'Next nomodule polyfills':
   file.url.includes('/webpack-')?'Webpack runtime':deps.length?deps.join(', '):file.url.endsWith('.css')?'CSS':'未映射 / 生成代码';
  lines.push('| '+file.url+' | '+file.raw+' | '+file.gzip+' | '+origin+' | '+
   (observed.has(file.url)?'实际请求':file.declaredInHome?'HTML 声明，Edge 未请求':'其他路由或按需')+' |');
 }
}
fs.writeFileSync(path.join(__dirname,'BUNDLE.md'),lines.join('\n')+'\n');
