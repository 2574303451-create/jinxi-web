// Demonstrate the offline checker against loopback captures and a tampered
// copy. Synthetic deployment labels are explicit and never authorize TEST.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {a6}=require('./variants.cjs');
async function main(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jinxi-a6-http-'));
 const responses=[];
 for(const [index,route] of ['/','/guides/','/profile-lab/','/session-lab/'].entries()){
  const reply=await fetch(a6.origin+route);
  const htmlFile='route-'+index+'.html';
  fs.writeFileSync(path.join(temp,htmlFile),await reply.text());
  responses.push({path:route,status:reply.status,htmlFile,headers:{
   'content-security-policy':reply.headers.get('content-security-policy'),
   'x-content-type-options':reply.headers.get('x-content-type-options'),
  }});
 }
 const file=path.join(temp,'evidence.json');
 const evidence={scope:'Local synthetic checker exercise only',context:'deploy-preview',
  deploymentId:'LOCAL-SYNTHETIC-NO-CLOUD-APPROVAL',
  sha:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),responses};
 const run=()=>cp.spawnSync(process.execPath,[path.join(__dirname,'verify-hosted-csp.cjs'),path.join(a6.site,'csp-manifest.json'),file],{encoding:'utf8',windowsHide:true});
 fs.writeFileSync(file,JSON.stringify(evidence));assert.equal(run().status,0);
 const baseline='inline '+responses[0].htmlFile;
 fs.appendFileSync(path.join(temp,responses[0].htmlFile),'<script>globalThis.harmlessAuditMarker=1</script>');
 const reject=run();assert.equal(reject.status,1);
 assert(reject.stderr.includes('modified inline script'));
 fs.writeFileSync(path.join(__dirname,'header-checker-results.json'),JSON.stringify({
  scope:'Authorized local static export only; synthetic context metadata, no hosted acceptance',
  routes:responses.map(row=>row.path),originalExit:0,tamperedExit:1,
  tampered:baseline,recordedHeaders:['Content-Security-Policy','X-Content-Type-Options'],
 },null,2)+'\n');
 console.log('Local original captures accepted; an added script rejected.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
