// Local evidence runner: explicit commands, clean environment, full exit codes and source hashes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {cleanEnv}=require('./run-clean.cjs');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'artifacts/phase4-integration'),env=cleanEnv();
fs.mkdirSync(directory,{recursive:true});
function sourceProof(){
 const r=spawnSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,env,encoding:'utf8'});if(r.status!==0)throw Error('SOURCE_MANIFEST_UNAVAILABLE');
 const files=[...new Set(r.stdout.trim().split(/\r?\n/))].filter(file=>!file.startsWith('artifacts/')&&!file.startsWith('docs/')&&!file.endsWith('.md')&&/\.(?:[cm]?[jt]sx?|sql|json|toml|css)$/.test(file)).sort().map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
 return {sha256:crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex'),files};
}
function run(name,args){
 const startedAtUtc=new Date().toISOString(),stamp=startedAtUtc.replace(/[:.]/g,'-'),proof=sourceProof(),file=name+'-'+stamp+'.log';
 const result=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:600000,maxBuffer:12*1024*1024,windowsHide:true});
 const log=(result.stdout||'')+(result.stderr||'');fs.writeFileSync(path.join(directory,file),log);
 const parse=label=>{const all=[...log.matchAll(new RegExp('(?:#|ℹ) '+label+' (\\d+)','g'))];return all.length?Number(all.at(-1)[1]):null;};
 const entry={name,command:[process.execPath,...args],startedAtUtc,completedAtUtc:new Date().toISOString(),exitCode:result.status,errorType:result.error?.code||null,sourceSha256:proof.sha256,log:file,tests:parse('tests'),pass:parse('pass'),fail:parse('fail'),skipped:parse('skipped'),cancelled:parse('cancelled')};
 const ledger=path.join(directory,'test-runs.json'),runs=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger)):[];runs.push(entry);fs.writeFileSync(ledger,JSON.stringify(runs,null,2)+'\n');fs.writeFileSync(path.join(directory,'source-'+stamp+'.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({name,exitCode:result.status,tests:entry.tests,pass:entry.pass,fail:entry.fail,log:file}));return entry;
}
if(require.main===module){
 const args=process.argv.slice(2),groups=args[0]?.split(',')||[],tools={};for(let i=1;i<args.length;i+=2)tools[args[i]]=args[i+1];
 const pg=['--pg-bin',tools['--pg-bin']],ssl=['--openssl',tools['--openssl']],browser=['--playwright-module',tools['--playwright-module']];
 for(const group of groups){
  let command;
  if(group==='unit')command=['--test','tests/integration-local-session.test.cjs','tests/integration-local-boundary.test.cjs'];
  else if(['api','security','typecheck','lint','build'].includes(group))command=['scripts/run-clean.cjs','run',({api:'test:api',security:'test:security'})[group]||group];
  else if(group==='https')command=['tests/integration-local-https.test.cjs',...pg,...ssl];
  else if(group==='browser')command=['tests/integration-local-browser.cjs',...pg,...ssl,...browser];
  else if(group==='readonly')command=['scripts/test-disposable-postgres.cjs',...pg];
  else if(group==='regressions'){
   const suites=[['member','member-local-postgres.test.cjs',[...pg,...ssl]],['community','community-local-postgres.test.cjs',pg],['community-review','community-local-review-postgres.test.cjs',pg],['attendance','attendance-local-postgres.test.cjs',pg],['attendance-review','attendance-local-review-postgres.test.cjs',pg],['points','points-local-postgres.test.cjs',pg],['points-review','points-local-review-postgres.test.cjs',pg],['points-invariants','points-local-invariants-postgres.test.cjs',pg],['operations','operations-local-postgres.test.cjs',pg],['operations-review','operations-local-review-postgres.test.cjs',pg]];
   for(const [name,file,parameters]of suites){
    const proofFile=path.join(root,'artifacts/phase3-member/local-database-proof.json'),original=fs.readFileSync(proofFile);let r;
    try{r=run(name,['tests/'+file,...parameters]);if(name==='member')fs.copyFileSync(proofFile,path.join(directory,'member-current-database-proof.json'));}finally{if(name==='member')fs.writeFileSync(proofFile,original);}
    if(r.exitCode!==0){process.exitCode=1;break;}
   }
   if(process.exitCode)break;continue;
  }else throw Error('UNKNOWN_LOCAL_CHECK');
  const r=run(group,command);if(r.exitCode!==0){process.exitCode=1;break;}
 }
}
module.exports={sourceProof};
