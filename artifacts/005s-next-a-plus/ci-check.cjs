// Controlled, disposable CI sources. No .env files, credentials or database access.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),scratch='E:/Recovery/.jinxi-research/005s-next-ci',runtime=path.join(process.env.TEMP,'jinxi-005s-next-runtime/node-v20.20.2-win-x64'),node=path.join(runtime,'node.exe'),npm=path.join(runtime,'node_modules/npm/bin/npm-cli.js');
fs.mkdirSync(scratch,{recursive:true});
const config=path.join(scratch,'isolated.npmrc');fs.writeFileSync(config,'registry=https://registry.npmjs.org/\naudit=false\nfund=false\n');
const env={}; for(const k of ['SystemRoot','WINDIR','ComSpec','PATHEXT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[k])env[k]=process.env[k];
Object.assign(env,{PATH:runtime+';'+process.env.PATH,NODE_ENV:'production',CI:'1',NEXT_TELEMETRY_DISABLED:'1',NPM_CONFIG_USERCONFIG:config,NPM_CONFIG_CACHE:path.join(scratch,'npm-cache')});
const results=[];
const save=()=>fs.writeFileSync(path.join(__dirname,'ci-results.json'),JSON.stringify({runtime:spawnSync(node,['--version'],{encoding:'utf8'}).stdout.trim(),npm:spawnSync(node,[npm,'--version'],{encoding:'utf8'}).stdout.trim(),environment:'Windows isolated Node20/npm10; not a Netlify Linux build',results},null,2));
function run(name,exe,args,cwd,extra={}){const t=Date.now(),r=spawnSync(exe,args,{cwd,env:{...env,...extra},encoding:'utf8',timeout:240000,maxBuffer:32*1024*1024});fs.writeFileSync(path.join(__dirname,'ci-'+name+'.txt'),(r.stdout||'')+(r.stderr||'')+(r.error?'\n'+r.error.message:''));const row={name,exit:r.status,ms:Date.now()-t,error:r.error?.message};results.push(row);save();console.log(JSON.stringify(row));return r}
const full=path.join(scratch,'full');
if(!fs.existsSync(full)) {if(run('clone-full','git',['clone','--quiet','--no-hardlinks','--single-branch','--branch','codex/jinxi-005s-next-a-plus',root,full],scratch).status!==0)process.exit(1);}
for(const file of ['scripts/generate-guild-summary.cjs','config/guild-archive-source.json','components/home/guild-hero.tsx','styles/guild-theme.css'])fs.copyFileSync(path.join(root,file),path.join(full,file));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const lockBefore=hash(path.join(full,'package-lock.json'));
// First reproduce the exact current Netlify command with NODE_ENV=production.
if(run('npm-ci-production',node,[npm,'ci'],full).status!==0)process.exitCode=1;
run('build-production-dependencies',node,[npm,'run','build'],full);
// Build tools are devDependencies; explicitly include them for the controlled build.
if(run('npm-ci-include-dev',node,[npm,'ci','--include=dev'],full).status!==0)process.exit(1);
run('build-with-dev-tools',node,[npm,'run','build'],full);
const fullOutput=hash(path.join(full,'lib/guild-home-facts.json'));
for(const mode of ['shallow','no-git']) {
 const dir=path.join(scratch,mode);fs.mkdirSync(path.join(dir,'config'),{recursive:true});fs.mkdirSync(path.join(dir,'lib'),{recursive:true});fs.mkdirSync(path.join(dir,'scripts'),{recursive:true});
 for(const file of ['scripts/generate-guild-summary.cjs','config/guild-archive-source.json','config/guild-terminal.config.json'])fs.copyFileSync(path.join(root,file),path.join(dir,file));
 fs.mkdirSync(path.join(dir,'node_modules'),{recursive:true});
 const ts=path.join(dir,'node_modules/typescript');if(!fs.existsSync(ts))fs.symlinkSync(path.join(full,'node_modules/typescript'),ts,'junction');
 if(mode==='shallow') {
  // A genuine depth-one Git repository with a newer synthetic commit timestamp.
  const bare=path.join(scratch,'seed');fs.mkdirSync(bare,{recursive:true});
  run('seed-init','git',['init','--quiet'],bare);fs.mkdirSync(path.join(bare,'config'),{recursive:true});fs.copyFileSync(path.join(root,'config/guild-terminal.config.json'),path.join(bare,'config/guild-terminal.config.json'));
  run('seed-add','git',['add','config/guild-terminal.config.json'],bare);
  run('seed-commit','git',['-c','user.name=Isolated CI','-c','user.email=ci@example.invalid','commit','--allow-empty','--quiet','-m','Synthetic clone boundary, not archive modification'],bare,{GIT_AUTHOR_DATE:'2026-11-05T00:00:00Z',GIT_COMMITTER_DATE:'2026-11-05T00:00:00Z'});
  const clone=path.join(scratch,'depth-one');if(!fs.existsSync(clone))run('clone-depth-one','git',['clone','--quiet','--depth','1','file:///'+bare.replaceAll('\\','/'),clone],scratch);
  fs.cpSync(path.join(clone,'.git'),path.join(dir,'.git'),{recursive:true});
 }
 const old=path.join(dir,'scripts/old-summary.cjs');fs.writeFileSync(old,spawnSync('git',['show','04ca4ef972636ef7ac8169d80db2dbf4af9d8b00:scripts/generate-guild-summary.cjs'],{cwd:root,encoding:'utf8'}).stdout);
 run(mode+'-old-generator',node,[old],dir);
 if(fs.existsSync(path.join(dir,'lib/guild-home-facts.json')))results.push({name:mode+'-old-date',value:JSON.parse(fs.readFileSync(path.join(dir,'lib/guild-home-facts.json'))).sourceUpdatedAt});
 run(mode+'-new-generator',node,['scripts/generate-guild-summary.cjs'],dir);
 const first=hash(path.join(dir,'lib/guild-home-facts.json'));run(mode+'-repeat',node,['scripts/generate-guild-summary.cjs'],dir);
 results.push({name:mode+'-deterministic',sameAsFull:first===fullOutput,repeatStable:first===hash(path.join(dir,'lib/guild-home-facts.json'))});save();
 if(mode==='no-git') {
  const metadata=fs.readFileSync(path.join(dir,'config/guild-archive-source.json'));
  fs.writeFileSync(path.join(dir,'config/guild-archive-source.json'),JSON.stringify({sourceFile:'config/guild-terminal.config.json',sourceRevision:'invalid',sourceUpdatedAt:'2026-03-01T21:50:37+08:00'}));
  run('stale-provenance-fail-closed',node,['scripts/generate-guild-summary.cjs'],dir);
  fs.writeFileSync(path.join(dir,'config/guild-archive-source.json'),metadata);
  // No Git executable is a distinct source-archive scenario.
  run('git-executable-unavailable',node,['scripts/generate-guild-summary.cjs'],dir,{PATH:runtime});
 }
}
results.push({name:'package-lock-preserved',passed:lockBefore===hash(path.join(full,'package-lock.json')),sha256:lockBefore});save();
