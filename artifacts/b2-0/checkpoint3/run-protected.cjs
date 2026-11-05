// Reuses the B1 assertions verbatim, redirects only base URL/evidence output.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const name=process.argv[2],allowed=['browser-checks','avatar-frames','protected-components','lifecycle-checks','regression-checks'];
if(!allowed.includes(name))throw Error('Unknown protected regression');
const file=path.resolve(__dirname,'../../005s-b1/checkpoint2-recheck',name+'.cjs'),out=path.join(__dirname,'protected',name);fs.mkdirSync(out,{recursive:true});
let code=fs.readFileSync(file,'utf8').replaceAll('http://127.0.0.1:3044','http://127.0.0.1:3049');
// Preserve relative fixture/module reads using the original __dirname, intercept
// writes only, so old committed evidence is never replaced by the new run.
const originalDir=path.dirname(file);
const redirect=file=>{const p=path.resolve(file);if(p.startsWith(out+path.sep))return p;if(p.startsWith(originalDir+path.sep))return path.join(out,path.relative(originalDir,p));throw Error('Unexpected evidence write path');};
const scopedFs={...fs,writeFileSync(file,...args){const dest=redirect(file);fs.mkdirSync(path.dirname(dest),{recursive:true});return fs.writeFileSync(dest,...args)}};
const scopedPath={...path,join(...parts){if(parts[0]===originalDir&&typeof parts[1]==='string'&&!parts[1].startsWith('.'))return path.join(out,...parts.slice(1));return path.join(...parts);}};
// Playwright screenshot paths also move under this run; assertions stay intact.
code=code.replaceAll('path.join(out,','path.join(evidenceOut,');
// Original scripts set their own out for data paths; evidenceOut is write-only.
const outputModule={exports:{}};
const requireFrom=createRequire(file);
new Function('require','module','exports','__dirname','__filename','evidenceOut',code)(n=>n==='node:fs'||n==='fs'?scopedFs:n==='node:path'||n==='path'?scopedPath:requireFrom(n),outputModule,outputModule.exports,path.dirname(file),file,out);
