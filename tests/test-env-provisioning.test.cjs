const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertSite, makeVariable, provision } = require('../scripts/configure-test-reader-env.cjs');
const ConnectionParameters = require('pg/lib/connection-parameters');
const binding = require('../netlify/functions/_shared/test-resource-binding.json');
const fixtureSite = () => ({ id:binding.siteId,account_id:'689e1405e8627000726e883c',name:'jinxi-web-test',plugins:[],
  build_settings:{repo_path:'2574303451-create/jinxi-web',repo_branch:'codex/jinxi-f03-f05-test-foundation',
    allowed_branches:['codex/jinxi-f03-f05-test-foundation'],stop_builds:true,skip_prs:true,env:{DEPRECATED:'placeholder'}} });
const fixturePassword = 'SyntheticOnly-For-Local-Unit-Checks:Ab7!@/%';

test('credential goes only to the approved reader URL and production secret context', () => {
  const variable = makeVariable(fixturePassword,binding);
  const url = new URL(variable.values[0].value);
  assert.equal(url.hostname,binding.hosts[0]);
  assert.equal(url.username,'jinxi_test_reader');
  assert.equal(decodeURIComponent(url.password),fixturePassword);
  assert.equal(new ConnectionParameters(variable.values[0].value).password,fixturePassword);
  assert.equal(url.searchParams.get('sslmode'),'require');
  assert.equal(url.searchParams.get('channel_binding'),'require');
  assert.equal(variable.key,'JINXI_TEST_READ_DATABASE_URL');
  assert.equal(variable.is_secret,true);
  assert.deepEqual(variable.scopes,['builds','functions','runtime']);
  assert.equal(variable.values[0].context,'production');
});

test('wrong site, active builds, previews or inherited legacy names reject before private input', async () => {
  const mutations = [site=>{site.id='613b5b7c-45b1-494f-9328-dd0625a57963';},
    site=>{site.account_id='other';},site=>{site.build_settings.stop_builds=false;},
    site=>{site.build_settings.skip_prs=false;},site=>{site.build_settings.env.DATABASE_URL='fixture';},
    site=>{site.build_settings.allowed_branches.push('main');}];
  for (const mutate of mutations) {
    const site=fixtureSite();mutate(site);
    await assert.rejects(provision(site,binding,()=>{throw Error('Must reject before prompt');},()=>{throw Error('Must reject before submission');}),/TEST_SITE_SETTINGS_REJECTED/);
  }
});

test('successful configuration returns a non-secret receipt without reflecting API values', async () => {
  let submissions=0;
  const result=await provision(fixtureSite(),binding,async()=>fixturePassword,async variable=>{
    submissions++;
    return {...variable,values:[{context:'production',value:'fixture server response private'}]};
  });
  assert.equal(submissions,1);
  assert.equal(result.siteId,binding.siteId);
  assert(!JSON.stringify(result).includes(fixturePassword));
  assert(!JSON.stringify(result).includes('fixture server response private'));
  assert(!JSON.stringify(result).includes('postgresql:'));
});

test('a mismatched API response is rejected and no private input is accepted as a connection argument', async () => {
  assert.throws(()=>makeVariable('postgresql://fixture.invalid',binding),/TEST_READER_PASSWORD_FORMAT_REJECTED/);
  await assert.rejects(provision(fixtureSite(),binding,async()=>fixturePassword,async()=>({key:'OTHER'})),/TEST_ENV_RESULT_UNCONFIRMED/);
  assertSite(fixtureSite(),binding);
});
