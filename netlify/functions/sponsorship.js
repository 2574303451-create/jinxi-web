const {neon}=require('@neondatabase/serverless');
const {withFunctionSecurity,requestDatabase}=require('./_shared/function-security');
function displayTime(value){const parts=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(value)),p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;}
exports.handler=withFunctionSecurity('sponsorship',neon,process.env,async event=>{
 const n=Number.parseInt(event.queryStringParameters?.limit||'50',10),limit=Number.isFinite(n)&&n>0?Math.min(n,200):50;
 const rows=await requestDatabase()`SELECT id,sponsor_name,sponsor_time,created_at FROM guild_sponsorship_entries ORDER BY sponsor_time DESC,id DESC LIMIT ${limit}`;
 return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({success:true,entries:rows.map(row=>({id:Number(row.id),sponsor:String(row.sponsor_name||''),time:displayTime(row.sponsor_time||row.created_at)}))})};
});
