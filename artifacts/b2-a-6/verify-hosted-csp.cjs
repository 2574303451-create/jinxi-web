// Offline verification of operator-provided HTTP evidence. No networking.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [manifestFile,evidenceFile]=process.argv.slice(2);
function main(){
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 const evidence=JSON.parse(fs.readFileSync(evidenceFile,'utf8'));
 assert(['deploy-preview','branch-deploy'].includes(evidence.context));
 assert(/^[a-f0-9]{40}$/.test(evidence.sha||''));
 assert(typeof evidence.deploymentId==='string'&&evidence.deploymentId);
 const paths=['/','/guides/','/profile-lab/','/session-lab/'];
 const header=(headers,name)=>{
  const values=Object.entries(headers).filter(([key])=>key.toLowerCase()===name).flatMap(([,value])=>value);
  assert.equal(values.length,1,'Expected exactly one '+name);
  return values[0];
 };
 for(const route of paths){
  const capture=evidence.responses.find(row=>row.path===route);
  assert(capture&&capture.status===200,'Missing successful route '+route);
  assert.equal(header(capture.headers,'content-security-policy'),manifest.policy,route);
  assert.equal(header(capture.headers,'x-content-type-options'),'nosniff',route);
  const html=fs.readFileSync(path.resolve(path.dirname(evidenceFile),capture.htmlFile),'utf8');
  let hashes=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
   if(/\bsrc\s*=/i.test(match[1])||!match[2])continue;
   const hash=crypto.createHash('sha256').update(match[2].replace(/\r\n?/g,'\n')).digest('base64');
   assert(manifest.policy.includes("'sha256-"+hash+"'"),route+' modified inline script');
   hashes++;
  }
  assert(hashes>0,route+' hydration scripts absent');
 }
 console.log('Four supplied HTTP/HTML captures match the expected generated CSP. Resource isolation and cloud approval require separate evidence.');
}
try{main();}catch(error){console.error('HOSTED_CSP_EVIDENCE_REJECTED: '+error.message);process.exitCode=1;}
