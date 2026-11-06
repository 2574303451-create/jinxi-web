const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
test('paused daily reward never invents points or claimed status after local progress',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]??null,get length(){return data.size}};
 const module={exports:{}},source=ts.transpileModule(fs.readFileSync('services/daily-task-service.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:n=>n==="../lib/user-utils"?{getUserId:()=>"synthetic-ui-member"}:require(n),window:{localStorage:storage},localStorage:storage,Date,Math,fetch:async()=>({ok:false,status:401})});
 const service=module.exports,task=service.getAllTasks()[0],before=service.getTaskStats().totalPoints;service.updateTaskProgress(task.id,task.target);assert.equal(service.getTaskStats().totalPoints,before);assert.equal(service.claimReward(task.id),false);assert.notEqual(service.getAllTasks().find(x=>x.id===task.id).status,'claimed');
});
