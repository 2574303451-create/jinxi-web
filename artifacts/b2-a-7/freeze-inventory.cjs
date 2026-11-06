// Git object metadata only. Never opens environment files, exports or secrets.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'github-freeze.json'),'utf8'));
const {main,reviewedHead}=snapshot;
const git=(args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:20000000});
const candidateHead=process.argv[2] || reviewedHead;
if(!/^[a-f0-9]{40}$/.test(candidateHead))throw Error('Use a complete candidate SHA');
if(cp.spawnSync('git',['merge-base','--is-ancestor',reviewedHead,candidateHead],{cwd:root}).status!==0){
 throw Error('Candidate must preserve the reviewed ancestor');
}
const category=file=>file.startsWith('artifacts/')?'evidence':
 file.startsWith('.github/')||file==='netlify.toml'||file==='package.json'||file==='package-lock.json'?'engineering':
 /\.(md|txt)$/i.test(file)?'documentation':
 /\.(sql)$/i.test(file)?'database-draft':
 file.startsWith('public/')?'public-asset':
 /^(app|components|hooks|lib|services|styles|types|utils|data|netlify)\//.test(file)?'application':
 file.startsWith('tests/')?'tests':'tooling';
const raw=git(['diff','--raw','--no-abbrev','--no-renames','-z',main,candidateHead]).split('\0');
const files=[];
for(let i=0;i<raw.length&&raw[i];i+=2){
 const [oldMode,newMode,oldObject,newObject,status]=raw[i].slice(1).split(' ');
 const file=raw[i+1];files.push({file,status,oldMode,newMode,oldObject,newObject,category:category(file)});
}
const tree=git(['ls-tree','-rz','--name-only',candidateHead]).split('\0').filter(Boolean);
const names=new Map();
for(const file of tree){const key=file.toLowerCase(),xs=names.get(key)||[];xs.push(file);names.set(key,xs);}
const collisions=[...names.values()].filter(xs=>xs.length>1);
const sensitive=tree.filter(file=>/(^|\/)\.env(?:\.|$)|(^|\/)\.netlify\/|(^|\/)(?:id_rsa|id_ed25519)|(?:private.?key|tls-key)\.pem$|password_dispatch|accounts_for_import\.csv$|scripts\/output\//i.test(file));
const merge=cp.spawnSync('git',['merge-tree','--write-tree',main,candidateHead],{cwd:root,encoding:'utf8',maxBuffer:2000000});
const candidateTree=git(['rev-parse',candidateHead+'^{tree}']).trim();
const mergeBase=git(['merge-base',main,candidateHead]).trim();
const unresolved=git(['ls-files','-u']).trim();
const markers=cp.spawnSync('git',['grep','-l','-E','^(<<<<<<< |>>>>>>> )',candidateHead,'--','app','components','hooks','lib','services','styles','types','netlify','scripts'],{cwd:root,encoding:'utf8'});
const codeMarkers=markers.status===1?[]:markers.stdout.trim().split('\n').filter(Boolean);
if(markers.status!==0&&markers.status!==1)throw Error('Cannot scan source merge markers');
const counts={};
for(const file of files)counts[file.category]=(counts[file.category]||0)+1;
const output={capturedAt:new Date().toISOString(),main,reviewedHead,candidateHead,candidateTree,mergeBase,
 mainIsAncestor:mergeBase===main,mergeTreeExit:merge.status,
 mergeTreeMatchesCandidate:merge.status===0&&merge.stdout.trim()===candidateTree,
 unresolvedIndex:!!unresolved,caseCollisions:collisions,codeMergeMarkers:codeMarkers,
 sensitiveTrackedPaths:sensitive,symlinksOrSubmodules:files.filter(file=>['120000','160000'].includes(file.newMode)).map(file=>file.file),
 counts,files};
if(process.argv[3]){
 fs.writeFileSync(path.resolve(process.argv[3]),JSON.stringify(output,null,2)+'\n',{flag:'wx'});
}else fs.writeFileSync(path.join(__dirname,'main-diff.json'),JSON.stringify(output,null,2)+'\n');
const lines=['# 集成冻结记录','',
 'main '+main+' → 审核基线 '+reviewedHead+' → A7 代码候选 '+candidateHead+'。候选保留现有线性历史。',
 '',
 '| PR | 变更 | base SHA | HEAD SHA | 新增提交 | 变更文件 |',
 '| --- | --- | --- | --- | ---: | ---: |',
 ...snapshot.rows.map(row=>'| #'+row.number+' | '+row.title.replaceAll('|','\\|')+' | '+row.baseSha+' | '+row.headSha+' | '+row.commits.length+' | '+row.changed.length+' |'),
 '',
 '~~~mermaid','flowchart LR',
 ...snapshot.rows.map((row,i)=>(i?'p'+snapshot.rows[i-1].number:'start["冻结起点"]')+' --> p'+row.number+'["#'+row.number+' · '+row.headSha.slice(0,8)+'"]'),
 '~~~',
 '',
 'main 是已审核候选的祖先，Git dry merge 的树与候选树相同。未创建 merge commit，未修改 main。源代码、配置与数据草案分别核对，证据和截图没有被用来掩盖业务冲突。',
 '',
 '| 差异分类 | 文件数 |','| --- | ---: |',
 ...Object.entries(counts).map(([key,value])=>'| '+key+' | '+value+' |'),
 '',
 '每个 PR 的标题、完整提交列表和相邻变更路径见 github-freeze.json。代码候选与 main 的全部对象 ID、模式和路径见 main-diff.json。树 ID 也绑定二进制和证据文件。交付提交可用此脚本指定完整 SHA 和独立输出路径再次生成总表。',
 '',
 '代码集成、云TEST验收、真实数据迁移、最终发布分别审批。建议保留原PR与其完整提交，新候选只承接相邻的审核增量。main 后续若变化，重新冻结并在候选副本检查冲突，完成回归后再提交审核。',
];
if(!process.argv[3])fs.writeFileSync(path.join(__dirname,'INTEGRATION.md'),lines.join('\n')+'\n');
const checks={mainIsAncestor:output.mainIsAncestor,mergeTreeMatchesCandidate:output.mergeTreeMatchesCandidate,
 unresolvedIndex:output.unresolvedIndex,caseCollisions:collisions.length,codeMergeMarkers:codeMarkers.length,
 sensitivePaths:sensitive.length,symlinks:output.symlinksOrSubmodules.length,changedFiles:files.length,counts};
console.log(JSON.stringify(checks));
if(!output.mainIsAncestor||!output.mergeTreeMatchesCandidate||unresolved||collisions.length||codeMarkers.length||sensitive.length||output.symlinksOrSubmodules.length)process.exitCode=1;
