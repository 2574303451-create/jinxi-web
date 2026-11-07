// Read-only metadata only. Never calls an env-value endpoint or a database.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../../..');
const output=path.join(__dirname,'resource-state.json');
async function get(url,headers={}){
  for(let attempt=0;attempt<2;attempt++){
    try{
      const r=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!r.ok)throw Object.assign(Error('READ_ONLY_METADATA_UNAVAILABLE'),{status:r.status});
      return await r.json();
    }catch(error){if(attempt===1)throw error;}
  }
}
async function main(){
 const record={checkedAtUtc:new Date().toISOString(),cloudWrites:0,environmentValueEndpoints:0,databaseConnections:0};
 try{
  const prs=await get('https://api.github.com/repos/2574303451-create/jinxi-web/pulls?state=all&per_page=100',{'User-Agent':'jinxi-local-identity-review','Accept':'application/vnd.github+json'});
  const expected=JSON.parse(fs.readFileSync(path.join(root,'artifacts/handoff/2026-11-07T09-00-53Z/pr-chain.json'),'utf8'));
  record.pullRequests=expected.map(old=>{
    const actual=prs.find(x=>x.number===old.number);
    return {number:old.number,present:!!actual,state:actual?.state,draft:actual?.draft,merged:!!actual?.merged_at,head:actual?.head.sha,base:actual?.base.sha,
     unchanged:!!actual&&actual.state===old.state&&actual.draft===old.draft&&!!actual.merged_at===old.merged&&actual.head.sha===old.head&&actual.base.sha===old.base};
  });
  record.additionalPullRequests=prs.filter(x=>x.number>18).map(x=>({number:x.number,state:x.state,draft:x.draft}));
 }catch(error){record.githubUnavailable={code:'READ_ONLY_METADATA_UNAVAILABLE',status:error.status||null};}
 try{
  const cli=path.dirname(require.resolve('netlify-cli/package.json',{paths:[root]}));
  const {default:BaseCommand}=await import(pathToFileURL(path.join(cli,'dist/commands/base-command.js')).href);
  const oldCwd=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'jinxi-review-metadata-'));
  let command;
  try{process.chdir(temp);command=new BaseCommand('api');command.setOptionValue('offline',true);command.setOptionValue('offlineEnv',true);await command.init(command);}
  finally{process.chdir(oldCwd);}
  const headers=command.netlify.api.defaultHeaders;
  const select=site=>({id:site.id,name:site.name,publishedDeployId:site.published_deploy?.id,publishedSha:site.published_deploy?.commit_ref,
   publishedLocked:site.published_deploy?.locked,stopBuilds:site.build_settings?.stop_builds,skipPrs:site.build_settings?.skip_prs,
   branch:site.build_settings?.repo_branch,allowedBranches:site.build_settings?.allowed_branches});
  record.testSite=select(await get('https://api.netlify.com/api/v1/sites/17885134-a57c-4589-83d3-39e30be9e0cf',headers));
  for(const [key,id]of [['testDeploy','6aeebe4ceae178c10e4199e8']]){
   const d=await get('https://api.netlify.com/api/v1/deploys/'+id,headers);
   record[key]={id:d.id,siteId:d.site_id,state:d.state,sha:d.commit_ref,branch:d.branch,context:d.context,locked:d.locked};
  }
  if(record.testSite.publishedDeployId==='6aeebe4ceae178c10e4199e8'&&record.testSite.publishedSha==='13de96d7531dde3222fdf513e711447a1df3e425'){
   record.testReadChecks=[];
   for(const route of ['/.netlify/functions/strategies?summary=1&feed=latest&limit=3','/.netlify/functions/guide-video-stats','/.netlify/functions/session-lab']){
    const r=await fetch('https://jinxi-web-test.netlify.app'+route,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
    const text=await r.text();let body;try{body=JSON.parse(text);}catch{}
    const row={route,status:r.status,setsCookie:r.headers.has('set-cookie')};
    if(route.includes('strategies')){row.syntheticPublishedOnly=Array.isArray(body?.strategies)&&body.strategies.length<=3&&body.strategies.every(x=>x.status==='published'&&x.title?.startsWith('【TEST】'));row.ids=body?.strategies?.map(x=>x.id);}
    if(route.endsWith('guide-video-stats'))row.syntheticCount=body?.count;
    record.testReadChecks.push(row);
   }
  }
  try{
   record.productionSite=select(await get('https://api.netlify.com/api/v1/sites/613b5b7c-45b1-494f-9328-dd0625a57963',headers));
   const d=await get('https://api.netlify.com/api/v1/deploys/69a92f4f7be620c834490be1',headers);
   record.productionDeploy={id:d.id,siteId:d.site_id,state:d.state,sha:d.commit_ref,branch:d.branch,context:d.context,locked:d.locked};
  }catch(error){record.productionUnavailable={code:'READ_ONLY_METADATA_UNAVAILABLE',status:error.status||null};}
 }catch(error){record.netlifyUnavailable={code:'READ_ONLY_METADATA_UNAVAILABLE',status:error.status||null};}
 fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify(record));
}
main().catch(()=>{console.error('READ_ONLY_RESOURCE_CHECK_FAILED');process.exitCode=1;});

