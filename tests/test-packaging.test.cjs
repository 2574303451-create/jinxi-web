const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {pathToFileURL}=require('node:url');
const {fixture}=require('./support/test-resource.cjs');
const root=path.resolve(__dirname,'..'),cli=createRequire(require.resolve('netlify-cli/package.json'));
async function unpack(zipFile,target){
 const yauzl=cli('yauzl');
 await new Promise((resolve,reject)=>{yauzl.open(zipFile,{lazyEntries:true},(err,zip)=>{
  if(err)return reject(err);
  zip.on('error',reject);zip.on('end',resolve);
  zip.on('entry',entry=>{
   const dest=path.resolve(target,entry.fileName);
   if(!dest.startsWith(target+path.sep))return reject(Error('Unexpected archive path'));
   if(entry.fileName.endsWith('/')){fs.mkdirSync(dest,{recursive:true});zip.readEntry();return;}
   zip.openReadStream(entry,(error,stream)=>{if(error)return reject(error);const chunks=[];stream.on('data',x=>chunks.push(x));stream.on('error',reject);stream.on('end',()=>{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,Buffer.concat(chunks));zip.readEntry();});});
  });zip.readEntry();
 });});
}
test('installed Netlify bundler ships binding and generated proof at working runtime paths',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jinxi-f03-package-')),src=path.join(temp,'netlify/functions'),f=fixture();
 fs.cpSync(path.join(root,'netlify/functions'),src,{recursive:true});
 fs.symlinkSync(path.join(root,'node_modules'),path.join(temp,'node_modules'),process.platform==='win32'?'junction':'dir');
 fs.copyFileSync(path.join(root,'package.json'),path.join(temp,'package.json'));
 fs.writeFileSync(path.join(src,'_shared/test-resource-binding.json'),JSON.stringify(f.resources.binding));
 fs.mkdirSync(path.join(src,'_generated'),{recursive:true});fs.writeFileSync(path.join(src,'_generated/test-deploy.json'),JSON.stringify(f.resources.deploy));
 const {zipFunction}=await import(pathToFileURL(cli.resolve('@netlify/zip-it-and-ship-it')).href);
 const result=await zipFunction(path.join(src,'messages.js'),path.join(temp,'zips'),{basePath:temp,repositoryRoot:temp,config:{'*':{nodeBundler:'zisi',includedFiles:['netlify/functions/_shared/test-resource-binding.json','netlify/functions/_generated/test-deploy.json']}}});
 assert(result?.path);const extract=path.join(temp,'extracted');fs.mkdirSync(extract);await unpack(result.path,extract);
 const candidates=[];
 function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(item.name==='node_modules')continue;const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else if(item.name==='test-resource.js')candidates.push(p);}}
 walk(extract);assert.equal(candidates.length,1);
 const resource=createRequire(candidates[0])(candidates[0]);const loaded=resource.loadResources();
 assert.equal(loaded.binding.siteId,f.resources.binding.siteId);assert.equal(loaded.deploy.context,'production');
 const functionPath=path.join(path.dirname(candidates[0]),'../messages.js'),load=createRequire(functionPath),module={exports:{}};let connections=0;
 vm.runInNewContext(fs.readFileSync(functionPath,'utf8'),{module,exports:module.exports,require:n=>n==='@neondatabase/serverless'?{neon:()=>{connections++;throw Error('Synthetic transport stop')}}:load(n),process:{env:f.env},console:{log(){},error(){}},AbortSignal,Buffer,URL},{filename:functionPath});
 const reply=await module.exports.handler({httpMethod:'GET'});assert.equal(connections,1);assert.equal(reply.statusCode,503);
});
