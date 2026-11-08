const fs=require('node:fs'),path=require('node:path'),{freshPoints}=require('../points-local/database.cjs'),{servePoints}=require('../points-local/server.cjs');
async function start(){
 const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--pg-bin'||args[2]!=='--openssl')throw Error('EXPLICIT_LOCAL_TOOLS_REQUIRED');const db=await freshPoints(args[1]);let server;
 try{fs.writeFileSync(path.join(db.folder,'points-accounts.private.json'),JSON.stringify(Object.values(db.accounts).map(({kind,account,password})=>({kind,account,password})),null,2),{flag:'wx',mode:0o600});server=await servePoints(db,args[3]);console.log('Local synthetic points: https://127.0.0.1:3069/points');console.log('Private synthetic credentials file: '+path.join(db.folder,'points-accounts.private.json'));await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});}
 finally{await server?.close();await db.stop();}
}
if(require.main===module)start().catch(()=>{console.error('LOCAL_POINTS_UNAVAILABLE');process.exitCode=1;});
