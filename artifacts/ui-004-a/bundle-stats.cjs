const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const stage=process.argv[2]||'after';
const root=path.resolve(process.argv[3]||(stage==='before'?'../jinxi-ui-004-baseline/out':'out'));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)])}
const assets=files(path.join(root,'_next/static')).filter(file=>/\.(js|css)$/.test(file)).map(file=>{const data=fs.readFileSync(file);return {file:path.relative(root,file).replaceAll('\\','/'),bytes:data.length,gzip:zlib.gzipSync(data).length,type:path.extname(file).slice(1)}});
const totals=Object.fromEntries(['js','css'].map(type=>[type,{files:assets.filter(a=>a.type===type).length,bytes:assets.filter(a=>a.type===type).reduce((sum,a)=>sum+a.bytes,0),gzip:assets.filter(a=>a.type===type).reduce((sum,a)=>sum+a.gzip,0)}]));
fs.writeFileSync(path.join(__dirname,`bundle-${stage}.json`),JSON.stringify({root,scope:'All emitted static JS/CSS, not the network first-load metric; gzip computed per file.',totals,assets},null,2));console.log(JSON.stringify(totals));
