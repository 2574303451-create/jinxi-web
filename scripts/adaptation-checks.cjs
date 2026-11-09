const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {sourceProof}=require('./integration-checks.cjs'),{cleanEnv}=require('./run-clean.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/phase4-adaptation');fs.mkdirSync(out,{recursive:true});
function run(name,args){const startedAtUtc=new Date().toISOString(),stamp=startedAtUtc.replace(/[:.]/g,'-'),proof=sourceProof(),r=spawnSync(process.execPath,args,{cwd:root,env:cleanEnv(),encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:12*1024*1024});
 const log=name+'-'+stamp+'.log',text=((r.stdout||'')+(r.stderr||'')).replace(/^.*Failing row contains.*$/gm,'[synthetic database row detail redacted]');fs.writeFileSync(path.join(out,log),text);
 const count=k=>{const m=[...text.matchAll(new RegExp('(?:#|ℹ) '+k+' (\\d+)','g'))];return m.length?Number(m.at(-1)[1]):null;};
 const entry={name,command:[process.execPath,...args],startedAtUtc,completedAtUtc:new Date().toISOString(),exitCode:r.status,errorType:r.error?.code||null,sourceSha256:proof.sha256,log,...Object.fromEntries(['tests','pass','fail','skipped','cancelled'].map(k=>[k,count(k)]))};const file=path.join(out,'test-runs.json'),list=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[];list.push(entry);fs.writeFileSync(file,JSON.stringify(list,null,2)+'\n');fs.writeFileSync(path.join(out,'source-'+stamp+'.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({name,exitCode:entry.exitCode,pass:entry.pass,fail:entry.fail,log}));return entry;}
if(require.main===module){const args=process.argv.slice(2),opts={};for(let i=1;i<args.length;i+=2)opts[args[i]]=args[i+1];const pg=['--pg-bin',opts['--pg-bin']],ssl=['--openssl',opts['--openssl']],pw=['--playwright-module',opts['--playwright-module']];
 for(const group of (args[0]||'').split(',')){let cmd;
  if(group==='unit')cmd=['--test','tests/adaptation-policy.test.cjs','tests/adaptation-session.test.cjs','tests/history-compat.test.cjs'];
  else if(group==='base-unit')cmd=['--test','tests/integration-local-session.test.cjs','tests/integration-local-boundary.test.cjs'];
  else if(group==='pg')cmd=['tests/adaptation-postgres.test.cjs',...pg,...ssl];
  else if(group==='browser')cmd=['tests/adaptation-browser.cjs',...pg,...ssl,...pw];
  else if(group==='base-browser')cmd=['tests/integration-local-browser.cjs',...pg,...ssl,...pw];
  else if(group==='base-https')cmd=['tests/integration-local-https.test.cjs',...pg,...ssl];
  else if(group==='export')cmd=['--test','tests/integration-local-export.test.cjs','tests/adaptation-export.test.cjs'];
  else if(['api','security','typecheck','lint','build'].includes(group))cmd=['scripts/run-clean.cjs','run',({api:'test:api',security:'test:security'})[group]||group];
  else if(group==='readonly')cmd=['scripts/test-disposable-postgres.cjs',...pg];
  else if(group==='regressions'){
   const suites=[['member','member-local-postgres.test.cjs',ssl],['community','community-local-postgres.test.cjs',[]],['community-review','community-local-review-postgres.test.cjs',[]],['attendance','attendance-local-postgres.test.cjs',[]],['attendance-review','attendance-local-review-postgres.test.cjs',[]],['points','points-local-postgres.test.cjs',[]],['points-review','points-local-review-postgres.test.cjs',[]],['points-invariants','points-local-invariants-postgres.test.cjs',[]],['operations','operations-local-postgres.test.cjs',[]],['operations-review','operations-local-review-postgres.test.cjs',[]]];
   for(const[name,file,extra]of suites){const proofFile=path.join(root,'artifacts/phase3-member/local-database-proof.json'),before=fs.readFileSync(proofFile);let result;try{result=run(name,['tests/'+file,...pg,...extra]);}finally{if(name==='member')fs.writeFileSync(proofFile,before);}if(result.exitCode!==0){process.exitCode=1;break;}}if(process.exitCode)break;continue;
  }else throw Error('UNKNOWN_ADAPTATION_CHECK');
  if(run(group,cmd).exitCode!==0){process.exitCode=1;break;}
 }
}
module.exports={run};
