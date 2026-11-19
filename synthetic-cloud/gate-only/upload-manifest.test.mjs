import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

test('pilot staging preserves both internal Edge upload entries with zero public files',async()=>{
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const cli=process.env.JINXI_PILOT_CLI_ROOT || path.join(root,'node_modules/netlify-cli');
  const version=JSON.parse(fs.readFileSync(path.join(cli,'package.json'))).version;
  assert.equal(version,process.env.JINXI_PILOT_CLI_ROOT?'23.15.1':'23.2.1');
  const load=file=>import(pathToFileURL(path.join(cli,'dist/utils/deploy',file)));
  const {default:collect}=await load('hash-files.js');
  const mod=await load(version==='23.2.1'?'../../lib/edge-functions/deploy.js':'process-files.js');
  const {deployFileNormalizer}=mod, getEdgeFunctionsDistPathIfExists=mod.getEdgeFunctionsDistPathIfExists??mod.getDistPathIfExists;
  const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const {dir}=JSON.parse(execFileSync(process.execPath,[path.join(root,'synthetic-cloud/gate-only/manual-stage.mjs'),sha,
    new Date(Date.now()+60000).toISOString()],{cwd:root,encoding:'utf8'}));
  assert.equal(path.dirname(dir),tmpdir());
  assert.match(path.basename(dir),/^jinxi-pilot-[a-zA-Z0-9]+$/);
  try {
    const pub=path.join(dir,'public'),dist=path.join(dir,'.netlify','edge-functions-dist');
    assert.deepEqual(fs.readdirSync(pub),['empty']);
    assert.deepEqual(fs.readdirSync(path.join(pub,'empty')),[]);
    assert.deepEqual(fs.readdirSync(path.join(dir,'functions')),[]);
    fs.mkdirSync(dist,{recursive:true});
    // Exercise the real collector, not the compiler. These are synthetic output bytes.
    const expected={};
    for(const [name,content] of [['manifest.json','{}'],['sample.eszip','offline fixture']]){
      fs.writeFileSync(path.join(dist,name),content);
      expected['.netlify/internal/edge-functions/'+name]=createHash('sha1').update(content).digest('hex');
    }
    const {files}=await collect({directories:[pub,await getEdgeFunctionsDistPathIfExists(dir)],
      filter:p=>p===pub||!path.basename(p).startsWith('.'),normalizer:deployFileNormalizer.bind(null,dir),
      concurrentHash:4,statusCb:()=>{}});
    assert.deepEqual({...files},expected);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
