// Offline webpack stats come from disposable copies. No plugin is added to
// product configuration. Compare each frozen emitted factory to the copy.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const vm=require('node:vm');
const variants=require('./variants.cjs');
const scratch='E:/Recovery/.jinxi-research/b2-a-6/chunks';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const canonical=fn=>hash(fn.toString().replace(/\b\d+(?:\.\d+)?\b/g,'0'));
const normalized=name=>(name||'generated').replaceAll('\\','/').replace(/^.*?node_modules\//,'node_modules/').replace(/^\.\//,'');
function factories(code){
 const captured=[],self={webpackChunk_N_E:{push:entry=>captured.push(entry)}};
 try{vm.runInNewContext(code,{self},{timeout:500});}catch{return [];}
 return captured.flatMap(entry=>Object.entries(entry[1]||{}).filter(([,value])=>typeof value==='function'));
}
function leaves(module){
 if(module.modules?.length)return module.modules.flatMap(leaves);
 if(module.children?.length)return module.children.flatMap(leaves);
 return module.name?[{name:normalized(module.name),buildSourceBytes:module.size||0}]:[];
}
function dependency(name){
 const match=name.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
 return match?match[1]:'application';
}
function walk(folder){
 return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(folder,entry.name);
  return entry.isDirectory()?walk(file):/\.(?:js|css)$/.test(file)?[file]:[];
 });
}
const inventories=[];
for(const stage of ['pr14','pr15']){
 const stats=JSON.parse(fs.readFileSync(path.join(scratch,stage,'client-stats.json'),'utf8'));
 const root=path.join(scratch,stage,'out/_next');
 const moduleById=new Map();
 function index(module){
  if(module.id!==null&&module.id!==undefined)moduleById.set(String(module.id),module);
  for(const child of module.modules||module.children||[])index(child);
 }
 for(const module of stats.modules)index(module);
 const signatures=new Map(), rebuiltChunks=[];
 for(const chunk of stats.chunks){
  for(const file of chunk.files.filter(file=>file.endsWith('.js')&&!file.includes('webpack-'))){
   const rebuiltCode=fs.readFileSync(path.join(root,file),'utf8'),rebuiltFactories=factories(rebuiltCode);
   rebuiltChunks.push({file,raw:Buffer.byteLength(rebuiltCode),count:rebuiltFactories.length,
     modules:rebuiltFactories.map(([id])=>moduleById.get(id)).filter(Boolean)});
   for(const [id,fn] of rebuiltFactories){
    const found=moduleById.get(id);
    if(found){
     const key=canonical(fn),list=signatures.get(key)||[];
     list.push({module:found,statsChunk:file});
     signatures.set(key,list);
    }
   }
  }
 }
 const site=variants[stage].site,html=fs.readFileSync(path.join(site,'index.html'),'utf8');
 const declared=new Set([...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match=>match[1]));
 const all=walk(path.join(site,'_next')).map(file=>{
  const content=fs.readFileSync(file),url='/'+path.relative(site,file).replaceAll('\\','/');
  const modules=[],unmatched=[],frozenFactories=factories(content.toString('utf8'));
  if(file.endsWith('.js')&&!/polyfills-|webpack-/.test(file)){
   for(const [id,fn] of frozenFactories){
    const options=signatures.get(canonical(fn))||[];
    const names=new Set(options.map(item=>normalized(item.module.name)));
    if(names.size===1)modules.push({frozenModuleId:id,name:[...names][0],mapping:'unique factory fingerprint',members:leaves(options[0].module)});
    else unmatched.push(id);
   }
   if(unmatched.length===1){
    const assigned=new Set(modules.map(module=>module.name));
    const ranked=rebuiltChunks.filter(chunk=>chunk.count===frozenFactories.length)
      .map(chunk=>({...chunk,overlap:chunk.modules.filter(module=>assigned.has(normalized(module.name))).length,
        distance:Math.abs(chunk.raw-content.length)}))
      .sort((a,b)=>b.overlap-a.overlap||a.distance-b.distance);
    const best=ranked[0],other=ranked[1];
    if(best&&(best.overlap>2||frozenFactories.length===1&&best.distance<32)&&
      (!other||best.overlap>other.overlap||best.distance<other.distance)){
      const remaining=best.modules.filter(module=>!assigned.has(normalized(module.name)));
      if(remaining.length===1)modules.push({frozenModuleId:unmatched.pop(),name:normalized(remaining[0].name),
        mapping:'remaining factory in uniquely matched rebuilt chunk topology',members:leaves(remaining[0])});
    }
   }
  }
  const deps={};
  for(const module of modules)for(const leaf of module.members){
   const key=dependency(leaf.name);deps[key]=(deps[key]||0)+leaf.buildSourceBytes;
  }
  return {url,raw:content.length,gzip:zlib.gzipSync(content).length,sha256:hash(content),
   declaredInHome:declared.has(url),matchedFactories:modules.length,unmatchedFactories:unmatched.length,
   dependenciesByBuildSourceBytes:deps,modules};
 });
 inventories.push({stage,files:all});
}
fs.writeFileSync(path.join(__dirname,'chunk-inventory.json'),JSON.stringify({
 method:'All frozen emitted JS/CSS bytes and per-file gzip. Disposable webpack stats retain nested modules. Emitted factory fingerprints normalize numeric literals to ignore deterministic module IDs. A single remaining factory may be assigned from a uniquely matching rebuilt chunk topology, labelled separately. Others remain unassigned. Dependency sizes are original build-source estimates, not gzip shares. Compression is not additive across modules. No product plugin or source map.',
 inventories,
},null,2)+'\n');
for(const inventory of inventories){
 console.log(inventory.stage,inventory.files.length,'assets',
  inventory.files.filter(file=>file.declaredInHome).map(file=>({file:file.url.split('/').slice(-2).join('/'),raw:file.raw,gzip:file.gzip,
   matched:file.matchedFactories,unmatched:file.unmatchedFactories,deps:file.dependenciesByBuildSourceBytes})));
}
