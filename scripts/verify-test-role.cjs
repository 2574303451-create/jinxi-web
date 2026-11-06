// Offline proof verification only. Does not load environment/database secrets.
const fs=require('node:fs');
const {sql}=require('../artifacts/b2-a-5/test-role-evidence.cjs');
const {validateBinding}=require('../netlify/functions/_shared/test-resource');
const {validateProof,fingerprint}=require('../netlify/functions/_shared/function-security');
function verify(proof,binding){
 validateBinding(binding);
 validateProof({mode:'public-read',resourceEnvironment:'synthetic-test',policy:{classification:'synthetic-test',environmentId:binding.environmentId,role:binding.readerRole,fingerprint:binding.fingerprint}},proof);
}
if(require.main===module){
 const [mode,file,binding]=process.argv.slice(2);
 try{
  if(mode==='--sql'&&!file)process.stdout.write(sql());
  else if(mode==='--fingerprint'&&/^\d+$/.test(file||'')&&/^\d+$/.test(binding||''))console.log(fingerprint(file,binding,'neondb'));
  else if(mode==='--verify'&&file&&binding){verify(JSON.parse(fs.readFileSync(file,'utf8')),JSON.parse(fs.readFileSync(binding,'utf8')));console.log('TEST database identity and direct role permissions verified; platform and transitive evidence remain separate.');}
  else throw Error('ARGUMENTS_REQUIRED');
 }catch{console.error('TEST role proof rejected or unavailable.');process.exitCode=1;}
}
module.exports={verify};
