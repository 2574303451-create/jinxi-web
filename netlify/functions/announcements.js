const {neon}=require('@neondatabase/serverless');
const {withFunctionSecurity,requestDatabase}=require('./_shared/function-security');
exports.handler=withFunctionSecurity('announcements',neon,process.env,async()=>{
 const rows=await requestDatabase()`SELECT id,title,content_html,author,created_at,updated_at FROM announcements ORDER BY created_at DESC LIMIT 100`;
 return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify(rows.map(row=>({id:Number(row.id),title:row.title,contentHtml:row.content_html,author:row.author,createdAt:row.created_at,updatedAt:row.updated_at})))};
});
