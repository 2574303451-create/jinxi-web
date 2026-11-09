// Server-only capabilities. No request parameter or frontend flag registers one.
const binding=require('../netlify/functions/_shared/test-resource-binding.json');
const {PROTECTED_SITE_ID,FORBIDDEN_KEYS}=require('../netlify/functions/_shared/test-resource');
const registered=new WeakMap();
const roles=Object.freeze({member:'jinxi_member_session',community:'jinxi_community_app',attendance:'jinxi_attendance_app',points:'jinxi_points_app',operations:'jinxi_operations_app'});
function denied(){throw Error('APPROVED_TEST_RESOURCE_REQUIRED');}
function approve(approval,env,secrets){
 if(!approval||approval.enabled!==true||approval.version!==1||approval.classification!=='synthetic-test'||env.NETLIFY!=='true'||env.CONTEXT!=='production'||env.SITE_ID!==approval.siteId||env.COMMIT_REF!==approval.commit||env.JINXI_SERVICE_APPROVAL!==approval.commit)denied();
 if(!/^[a-f0-9-]{36}$/.test(approval.siteId||'')||[binding.siteId,PROTECTED_SITE_ID,'jinxi-web','jinxi-web-test'].includes(approval.siteId)||!/^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(approval.origin||'')||['https://jinxi-web.netlify.app','https://jinxi-web-test.netlify.app'].includes(approval.origin))denied();
 if(!/^[a-f0-9]{40}$/.test(approval.commit||'')||!Number.isFinite(Date.parse(approval.expiresAt))||Date.parse(approval.expiresAt)<=Date.now()||!/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(approval.host||'')||binding.hosts.includes(approval.host)||approval.port!==5432||!/^[a-z][a-z0-9_]{0,62}$/.test(approval.database||'')||['postgres','template0','template1'].includes(approval.database))denied();
 if(!/^[a-f0-9-]{36}$/.test(approval.environmentId||'')||approval.environmentId===binding.environmentId||!/^[a-f0-9]{64}$/.test(approval.fingerprint||'')||approval.fingerprint===binding.fingerprint||!Array.isArray(approval.serverAddresses)||!approval.serverAddresses.length||approval.serverAddresses.some(x=>typeof x!=='string'||!require('node:net').isIP(x)))denied();
 if(!secrets||![secrets.csrfKey,secrets.rateKey].every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v))||Object.keys(roles).some(k=>typeof secrets[k]!=='string'||secrets[k].length<24))denied();
 if(Object.keys(env).some(k=>FORBIDDEN_KEYS.includes(k)||/^JINXI_(PRODUCTION|PREVIEW|LOCAL|SESSION)_|^NEXT_PUBLIC_.*(?:SECRET|PASSWORD|TOKEN|DATABASE)/.test(k)))denied();
 const value=Object.freeze({kind:'jinxi-approved-test-v1',host:approval.host,port:approval.port,database:approval.database,user:roles.member,password:secrets.member,origin:approval.origin,environmentId:approval.environmentId,fingerprint:approval.fingerprint,csrfKey:secrets.csrfKey,rateKey:secrets.rateKey});
 registered.set(value,{approval:Object.freeze({...approval,serverAddresses:Object.freeze([...approval.serverAddresses])}),env:Object.freeze({...env})});return value;
}
function approved(value,env){const r=registered.get(value);if(!r)return false;if(env.SITE_ID!==r.approval.siteId||env.CONTEXT!=='production'||env.NETLIFY!=='true'||env.COMMIT_REF!==r.approval.commit||env.JINXI_SERVICE_APPROVAL!==r.approval.commit||Date.parse(r.approval.expiresAt)<=Date.now())denied();return true;}
function policy(settings,module){const r=registered.get(settings);return {classification:r?'synthetic-test':'synthetic-local',environmentId:settings.environmentId,fingerprint:settings.fingerprint,role:roles[module]};}
function addressMatches(settings,row){const r=registered.get(settings);return row.port===(r?settings.port:55436)&&(r?r.approval.serverAddresses.includes(row.host):row.host==='127.0.0.1');}
function databaseName(settings){return registered.has(settings)?settings.database:'jinxi_member_local';}
module.exports={approve,approved,policy,addressMatches,databaseName,roles};
