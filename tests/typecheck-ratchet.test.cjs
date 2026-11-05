const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const baseline=require('../config/typescript-baseline.json'),script=fs.readFileSync(path.join(__dirname,'../scripts/check-types.cjs'),'utf8');
const diagnostic=x=>`${x.file}(1,1): error ${x.code}: ${x.message}\n`;
function run(stdout,status=2,error){const process={execPath:'node',env:{},exitCode:0},logs=[];const fakeRequire=name=>name==='node:child_process'?{spawnSync:()=>({stdout,status,error})}:require(name);fakeRequire.resolve=require.resolve;vm.runInNewContext(script,{require:fakeRequire,__dirname:path.join(__dirname,'../scripts'),process,console:{log:x=>logs.push(x),error(){}}});return{exit:process.exitCode,report:JSON.parse(logs[0])};}
test('CI ratchet exposes historical red and rejects new/global errors or compiler failure',()=>{
 const original=baseline.diagnostics.map(diagnostic).join('');
 const known=run(original);assert.equal(known.exit,0);assert.equal(known.report.rawCompilerPassed,false);assert.equal(known.report.current,28);
 assert.equal(run(original+"new-file.ts(4,2): error TS2322: New failure\n").exit,1);
 assert.equal(run('error TS5058: Missing project path\n'+original).exit,1);
 assert.equal(run('compiler crashed',null,Error('spawn failed')).exit,1);
 assert.equal(run(original,0).exit,1);
 assert.equal(run('',0).report.rawCompilerPassed,true);
});
