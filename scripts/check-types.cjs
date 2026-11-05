const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const result=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--noEmit','--incremental','false'],{encoding:'utf8',maxBuffer:8e6});
const raw=(result.stdout||'')+(result.stderr||''),diagnostics=text=>text.replace(/\r\n/g,'\n').split(/(?=^[^\n]+\(\d+,\d+\): error TS\d+:)/m).map(block=>{const m=block.match(/^(.+)\(\d+,\d+\): error (TS\d+): ([\s\S]*)/);return m?{file:m[1],code:m[2],message:m[3].trim()}:null}).filter(Boolean);
const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'../config/typescript-baseline.json'))),actual=diagnostics(raw),known=expected.diagnostics.map(x=>JSON.stringify(x)),added=[];
for(const item of actual){const i=known.indexOf(JSON.stringify(item));if(i<0)added.push(item);else known.splice(i,1)}
const errorHeaders=(raw.match(/error TS\d+:/g)||[]).length;
const report={compilerExit:result.status,baseline:expected.diagnostics.length,current:actual.length,unparsedDiagnosticHeaders:errorHeaders-actual.length,added,resolved:known.map(x=>JSON.parse(x)),rawCompilerPassed:result.status===0,ratchetPassed:!result.error&&errorHeaders===actual.length&&(result.status===0&&actual.length===0||result.status===2&&actual.length>0)&&added.length===0};
if(process.env.JINXI_CHECK_OUTPUT){fs.mkdirSync(process.env.JINXI_CHECK_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.JINXI_CHECK_OUTPUT,'typescript.txt'),raw);fs.writeFileSync(path.join(process.env.JINXI_CHECK_OUTPUT,'typescript-report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));if(actual.length)console.log('Compiler remains RED with historical diagnostics; ratchet only forbids new diagnostics.');
if(!report.ratchetPassed){console.error(raw);process.exitCode=1}
