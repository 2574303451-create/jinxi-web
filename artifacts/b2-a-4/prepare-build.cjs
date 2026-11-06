// Copies reviewed source only. Never copies .env, node_modules, .git or test credentials.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),target='E:/Recovery/.jinxi-research/b2-a-4/source';
if(fs.existsSync(target)&&(!process.argv.includes('--refresh')||!fs.existsSync(path.join(__dirname,'build-source-manifest.json'))))throw Error('Build target already exists; inspect instead of replacing');
const rootFiles=['netlify.toml','package.json','package-lock.json','next.config.mjs','tsconfig.json','tailwind.config.ts','tailwind.config.js','postcss.config.mjs','postcss.config.js','eslint.config.mjs'];
rootFiles.push('database-b2-member-session-draft.sql');
const roots=['app','components','config','data','hooks','lib','netlify','public','services','styles','types','utils','tests','scripts'];
const files=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split(String.fromCharCode(0)).filter(p=>p&&(roots.includes(p.split('/')[0])||rootFiles.includes(p)));
const manifest=[];
for(const file of files){if(file.split('/').some(x=>x.startsWith('.env'))||/scripts\/output\//.test(file))throw Error('Private source path rejected');const bytes=fs.readFileSync(path.join(root,file)),out=path.join(target,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,bytes);manifest.push({file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
fs.writeFileSync(path.join(__dirname,'build-source-manifest.json'),JSON.stringify({base:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),source:'A-4 source snapshot before commit. Hashes bind Windows checkout bytes used as build inputs.',target,files:manifest},null,2));console.log(JSON.stringify({files:manifest.length,target}));
