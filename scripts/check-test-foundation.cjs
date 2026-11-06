const fs=require('node:fs'),path=require('node:path'),{spawnSync,execFileSync}=require('node:child_process');
const {cleanEnv}=require('./run-clean.cjs');
function run(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--pg-bin'||!path.isAbsolute(args[1]))throw Error('EXPLICIT_LOCAL_POSTGRES_BIN_REQUIRED');
 const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/f03-f05');fs.mkdirSync(out,{recursive:true});
 const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
 const report={baseline:'be9513f37251d08661a3f6c1d5240ed059c59f2e',testedGitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),workingTree:'verify source diff separately; evidence files may be untracked',node:process.version,npm:execFileSync(process.execPath,[npm,'--version'],{env:cleanEnv(),encoding:'utf8'}).trim(),platform:process.platform,databaseTransport:'new loopback-only disposable cluster; cloud targets are not accepted by this runner',networkTelemetry:'not collected; scope is not a measured cloud connection counter',cloudAcceptance:'not run; pending authorization and evidence',checks:[]};
 const checks=[['typecheck',[npm,'run','typecheck']],['lint',[npm,'run','lint']],['unit-api-security',[npm,'test']],['disposable-postgres',['scripts/test-disposable-postgres.cjs',...args]],['static-build',[npm,'run','build']]];
 for(const [name,argv]of checks){
  const started=Date.now(),r=spawnSync(process.execPath,argv,{cwd:root,env:cleanEnv(),encoding:'utf8',timeout:300000,windowsHide:true});
  const raw=(r.stdout||'')+(r.stderr||'');
  const text=raw.replace(/pbkdf2_sha256\$\d+\$[a-f0-9]+\$[a-f0-9]+/gi,'[redacted-synthetic-hash]');
  const file=name+'.log';fs.writeFileSync(path.join(out,file),text);
  report.checks.push({name,command:['node',...argv.map(x=>x===npm?'npm-cli.js':x)].join(' '),exitCode:r.status,elapsedMs:Date.now()-started,testCounts:[...text.matchAll(/ℹ tests (\d+)/g)].map(x=>Number(x[1])),log:file});
  console.log(name+': exit '+r.status);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
  if(r.status!==0){process.exitCode=1;return;}
 }
}
if(require.main===module)try{run()}catch{console.error('Local acceptance runner unavailable; no cloud operation attempted.');process.exitCode=1}
