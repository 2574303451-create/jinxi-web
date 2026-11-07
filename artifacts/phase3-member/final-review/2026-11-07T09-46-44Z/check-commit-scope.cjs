const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../../../..');process.chdir(root);
const allowed=[
 'CODEX_HANDOFF.md','member-local/README.md','member-local/demo.js','package.json',
 'tests/member-local-ui.test.cjs','tests/member-local-recovery-browser.cjs',
 'artifacts/handoff/2026-11-07T09-00-53Z/',
 'artifacts/phase3-member/browser/2026-11-07T09-36-56-716Z/',
 'artifacts/phase3-member/browser/2026-11-07T09-59-51-544Z/',
 'artifacts/phase3-member/restore-race/',
 'artifacts/phase3-member/final-review/2026-11-07T09-46-44Z/'
];
const split=x=>x.trim()?x.trim().split(/\r?\n/):[];
const files=[...new Set([...split(cp.execFileSync('git',['diff','--name-only'],{encoding:'utf8'})),...split(cp.execFileSync('git',['diff','--cached','--name-only'],{encoding:'utf8'})),...split(cp.execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}))])].sort();
const outOfScope=files.filter(f=>!allowed.some(p=>p.endsWith('/')?f.startsWith(p):f===p));
const patterns=[
 ['credentialDsn',/postgres(?:ql)?:\/\/[^\s"'<>]+:[^\s"'<>]+@/],
 ['providerPassword',/\bnpg_[A-Za-z0-9]{16,}\b/],
 ['privateKey',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['githubToken',/\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})\b/],
 ['netlifyToken',/\bnfp_[A-Za-z0-9]{25,}\b/]
];
const matches=[];let bytes=0;
for(const f of files){const b=fs.readFileSync(f);bytes+=b.length;if(b.includes(0))continue;const text=b.toString('utf8');for(const [kind,re]of patterns)if(re.test(text))matches.push({file:f,kind});}
const report={checkedAtUtc:new Date().toISOString(),candidateFiles:files.length,candidateBytes:bytes,outOfScope,sensitivePatternMatches:matches,files,scope:'Identity fix, regressions, acceptance evidence, necessary handoff only; no env/runtime/node_modules/tool binaries'};
fs.writeFileSync(path.join(__dirname,'commit-scope-check.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({candidateFiles:files.length,candidateBytes:bytes,outOfScope,sensitivePatternMatches:matches}));
if(outOfScope.length||matches.length)process.exitCode=1;

