// Original B1 assertions, new build with actual CSP. Evidence paths only move.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const name=process.argv[2],allowed=['browser-checks','avatar-frames','protected-components','lifecycle-checks','regression-checks','reader-checks','arrow-checks'];
if(!allowed.includes(name))throw Error('Unknown regression');
const file=path.resolve(__dirname,'../005s-b1/checkpoint2-recheck',name+'.cjs'),originalDir=path.dirname(file),out=path.join(__dirname,'protected',name);fs.mkdirSync(out,{recursive:true});
const redirect=file=>{const p=path.resolve(file);if(p.startsWith(out+path.sep))return p;if(p.startsWith(originalDir+path.sep))return path.join(out,path.relative(originalDir,p));throw Error('Unexpected evidence write');};
const scopedFs={...fs,writeFileSync(file,...args){const dest=redirect(file);fs.mkdirSync(path.dirname(dest),{recursive:true});return fs.writeFileSync(dest,...args);}};
const scopedPath={...path,join(...parts){return parts[0]===originalDir&&typeof parts[1]==='string'&&!parts[1].startsWith('.')?path.join(out,...parts.slice(1)):path.join(...parts);}};
let code=fs.readFileSync(file,'utf8').replaceAll('http://127.0.0.1:3044','http://127.0.0.1:3050').replaceAll('path.join(out,','path.join(evidenceOut,');
const output={exports:{}},requireFrom=createRequire(file);
new Function('require','module','exports','__dirname','__filename','evidenceOut',code)(n=>n==='fs'||n==='node:fs'?scopedFs:n==='path'||n==='node:path'?scopedPath:requireFrom(n),output,output.exports,originalDir,file,out);
