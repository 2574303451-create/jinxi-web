const fs=require('node:fs');
const path=require('node:path');
const {freshDatabase}=require('../member-local/database.cjs');
const {serve}=require('../member-local/server.cjs');
async function start(){
  const args=process.argv.slice(2);
  if(args.length!==4||args[0]!=='--pg-bin'||args[2]!=='--openssl')throw Error('EXPLICIT_LOCAL_TOOL_PATHS_REQUIRED');
  const database=await freshDatabase(args[1]);let http;
  try{
    const accounts=await database.seed();
    fs.writeFileSync(path.join(database.folder,'synthetic-accounts.private.json'),JSON.stringify(accounts.map(({kind,account,password})=>({kind,account,password})),null,2),{flag:'wx',mode:0o600});
    http=await serve(database,args[3]);
    console.log('Local synthetic member checkpoint: https://127.0.0.1:3069');
    console.log('Private synthetic-only credentials: '+path.join(database.folder,'synthetic-accounts.private.json'));
    console.log('No cloud connection. Ctrl+C stops this separate database and server.');
    await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
  }finally{await http?.close();await database.stop();}
}
if(require.main===module)start().catch(()=>{console.error('LOCAL_MEMBER_CHECKPOINT_UNAVAILABLE');process.exitCode=1;});
