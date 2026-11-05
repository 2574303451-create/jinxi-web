const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
function handler(name,env,factory){const file=path.resolve(__dirname,'../../netlify/functions',name+'.js'),module={exports:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:n=>n==='@neondatabase/serverless'?{neon:factory}:createRequire(file)(n),process:{env},console:{log(){},error(){},warn(){}},AbortSignal,Buffer,URL},{filename:file});return module.exports.handler}
module.exports={handler};
