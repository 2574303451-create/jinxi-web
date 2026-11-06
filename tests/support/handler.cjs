const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  { createRequire } = require("node:module");
const {fingerprint}=require('../../netlify/functions/_shared/function-security');
const proof={environment_id:'contract-only',classification:'synthetic-local',cluster_id:'contract-cluster',database_oid:'1',database_name:'contract-db',role:'contract-reader',default_read_only:'on',rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,rolbypassrls:false,role_memberships:false,database_create:false,schema_create:false,owns_objects:false,writes_outside_scope:false,reads_outside_scope:false,unsafe_definer_access:false};
function contractEnvironment(){return {JINXI_RUNTIME_CONTEXT:'local',JINXI_LOCAL_READ_DATABASE_URL:'postgresql://contract-reader@127.0.0.1:55433/jinxi_005s_b1_test',JINXI_LOCAL_READ_POLICY:JSON.stringify({context:'local',classification:proof.classification,environmentId:proof.environment_id,role:proof.role,fingerprint:fingerprint(proof.cluster_id,proof.database_oid,proof.database_name)})};}
// B1 data-contract tests substitute transport plus environment proof only. They do
// not claim to test the guard. environment-postgres.test.cjs executes the real
// proof/role boundary with explicit env; product handler and data SQL stay real.
function loadHandler(file, factory, options={}) {
  const absolute = path.resolve(__dirname, "../../netlify/functions", file),
    actualRequire = createRequire(absolute),
    module = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(absolute, "utf8"),
    {
      module,
      exports: module.exports,
      require: (name) =>
        name === "@neondatabase/serverless"
          ? { neon: options.env?factory:()=>{const actual=factory();return {...actual,transaction:async(fn,opts)=>{const tx={query:(text,values=[])=>({text,values})},queries=typeof fn==='function'?fn(tx):fn;if(queries.some(q=>q.text.startsWith('/* jinxi database identity')))return [[{set_config:'3000'}],[proof]];return actual.transaction(fn,opts)}}} }
          : actualRequire(name),
      process: { env: options.env||contractEnvironment() },
      console: { error: () => {}, log: () => {} },
      AbortSignal,
    },
    { filename: absolute },
  );
  return module.exports.handler;
}
module.exports = { loadHandler,contractEnvironment };
