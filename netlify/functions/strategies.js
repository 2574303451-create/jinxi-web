const {neon}=require('@neondatabase/serverless');
const {readStrategies}=require('./_shared/strategy-read');
const {publicReadError}=require('./_shared/strategy-query');
const {withFunctionSecurity,requestDatabase}=require('./_shared/function-security');
exports.handler=withFunctionSecurity('strategies',neon,process.env,async event=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 try{const result=await readStrategies(requestDatabase(),event.queryStringParameters||{});return{statusCode:result.status,headers,body:JSON.stringify(result.body)}}
 catch(error){const result=publicReadError(error);return{statusCode:result.status,headers,body:JSON.stringify(result.body)}}
});
