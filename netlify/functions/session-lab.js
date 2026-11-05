const {Client}=require('pg');
const {createSessionLabHandler}=require('./_shared/session-lab');
exports.handler=createSessionLabHandler({env:process.env,connect:async config=>{const c=new Client({connectionString:config.url,connectionTimeoutMillis:2000,application_name:'jinxi-local-synthetic-session-lab'});await c.connect();return c;}});
