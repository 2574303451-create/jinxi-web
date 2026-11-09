// Offline synthetic JSON only. No DSN, database, apply, migration or network option.
const fs=require('node:fs'),{checkHistory}=require('../history-compat/check.cjs');
function read(file){if(fs.statSync(file).size>2*1024*1024)throw Error('SYNTHETIC_FILE_TOO_LARGE');return JSON.parse(fs.readFileSync(file,'utf8'));}
try{const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--synthetic'||args[2]!=='--bindings')throw Error('EXPECTED_SYNTHETIC_AND_BINDINGS_FILES');console.log(JSON.stringify(checkHistory(read(args[1]),read(args[3])),null,2));}catch{console.error('历史核验已拒绝：只接受独立的合成数据与合成可信映射文件，不接受数据库连接。');process.exitCode=1;}
