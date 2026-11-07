// Replay the unchanged five-width script, redirecting only its missing TEMP tool import.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),Module=require('node:module');
const args=process.argv.slice(2);
assert(args.length===6&&args[0]==='--pg-bin'&&args[2]==='--openssl'&&args[4]==='--playwright-module');
for(const index of [1,3,5])assert(path.isAbsolute(args[index]));
const root=path.resolve(__dirname,'../../../..'),script=path.join(root,'artifacts/phase3-member/browser.cjs');
const original=Module._load,oldTool='C:/Users/lilei/AppData/Local/Temp/jinxi-browser-tools/node_modules/playwright';
fs.writeFileSync(path.join(__dirname,'five-width-replay-source.json'),JSON.stringify({script:'artifacts/phase3-member/browser.cjs',sha256:crypto.createHash('sha256').update(fs.readFileSync(script,'utf8').replace(/\r\n/g,'\n')).digest('hex'),onlyReplacement:{from:oldTool,to:args[5]},arguments:args.slice(0,4),assertionsChanged:false},null,2)+'\n');
Module._load=function(request,parent,isMain){return original.call(this,request===oldTool?args[5]:request,parent,isMain);};
process.argv=[process.execPath,script,...args.slice(0,4)];
require(script);

