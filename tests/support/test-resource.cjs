const crypto = require('node:crypto');
const { fingerprint } = require('../../netlify/functions/_shared/function-security');
const { digest } = require('../../netlify/functions/_shared/test-resource');
function fixture() {
  const binding = {version:1,status:'approved',classification:'synthetic-test',siteId:'00000000-0000-4000-8000-000000000123',
    projectId:'project-synthetic-unit',branchId:'br-synthetic-unit',endpointId:'ep-synthetic-unit',databaseName:'neondb',
    hosts:['ep-synthetic-unit.invalid'],port:'5432',readerRole:'jinxi_test_reader',environmentId:crypto.randomUUID(),
    fingerprint:fingerprint('unit-cluster','42','neondb'),allowedContexts:['production','deploy-preview','branch-deploy']};
  const deploy={version:1,siteId:binding.siteId,context:'production',commit:'a'.repeat(40),bindingDigest:digest(binding)};
  const url=new URL('postgresql://ep-synthetic-unit.invalid/neondb?sslmode=require');url.username=binding.readerRole;url.password=crypto.randomBytes(18).toString('hex');
  const env={SITE_ID:binding.siteId,JINXI_RESOURCE_ENVIRONMENT:'synthetic-test',JINXI_RUNTIME_CONTEXT:'production',JINXI_CLOUD_ISOLATION_APPROVAL:'approved',JINXI_TEST_READ_DATABASE_URL:url.toString()};
  const proof={environment_id:binding.environmentId,classification:'synthetic-test',role:binding.readerRole,session_role:binding.readerRole,database_temp:false,cluster_id:'unit-cluster',database_oid:'42',database_name:'neondb',default_read_only:'on'};
  for(const k of ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls','role_memberships','database_create','schema_create','owns_objects','writes_outside_scope','reads_outside_scope','unsafe_definer_access'])proof[k]=false;
  return {env,resources:{binding,deploy},proof};
}
module.exports={fixture};
