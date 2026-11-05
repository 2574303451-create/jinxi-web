const {neon}=require('@neondatabase/serverless');
const {withFunctionSecurity,requestDatabase}=require('./_shared/function-security');
const array=value=>{if(Array.isArray(value))return value;if(typeof value==='string')try{const a=JSON.parse(value);return Array.isArray(a)?a:[]}catch{}return[]};
exports.handler=withFunctionSecurity('messages',neon,process.env,async()=>{
 const rows=await requestDatabase()`SELECT id,name,content,category,color,reactions,replies,is_pinned,image_url,created_at FROM messages ORDER BY is_pinned DESC,created_at DESC LIMIT 100`;
 return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify(rows.map(row=>({id:String(row.id),name:row.name||'匿名',content:row.content,timestamp:row.created_at,color:row.color||'#3b82f6',category:row.category||'闲聊',isPinned:row.is_pinned===true,imageUrl:row.image_url,reactions:array(row.reactions).filter(x=>x&&typeof x==='object').map(x=>({...x,users:[]})),replies:array(row.replies)})))};
});
