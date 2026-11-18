import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const git = (...args) => execFileSync('git',['--no-replace-objects',...args],{cwd:root});
const [sha, utc] = process.argv.slice(2);
const deadline = Date.parse(utc);
if (!/^[a-f0-9]{40}$/.test(sha) || git('rev-parse','HEAD').toString().trim() !== sha ||
    git('status','--porcelain','--untracked-files=all').length || !(deadline > Date.now() && deadline <= Date.now()+86400000))
  throw Error('PILOT_INPUT_REJECTED');
git('merge-base','--is-ancestor','6bb92684c7aecc125890dc97c8899383184d4c73',sha);
const dir = mkdtempSync(join(tmpdir(),'jinxi-pilot-'));
for (const folder of ['public','functions','edge','lib','lib/gate-only']) mkdirSync(join(dir,folder));
const files = {};
function put(name, bytes) {
  writeFileSync(join(dir,name),bytes,{flag:'wx'});
  files[name]=createHash('sha256').update(bytes).digest('hex');
}
for (const [src,dst] of [['access.mjs','lib/access.mjs'],['gate-only/manual-runtime.mjs','lib/gate-only/manual-runtime.mjs'],
  ['gate-only/manual.toml','netlify.toml']]) put(dst,git('show',sha+':synthetic-cloud/'+src));
put('edge/access.js', "import { manualProbe } from '../lib/gate-only/manual-runtime.mjs';\n"+
  "export const config={path:'/*',onError:'fail'};\nexport default manualProbe("+JSON.stringify(sha)+','+deadline+');\n');
console.log(JSON.stringify({dir,sha,deadline,files})); // hashes of local files, never of the final CDN bundle
