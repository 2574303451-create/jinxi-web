const {test}=require('node:test'),assert=require('node:assert/strict'),{html}=require('../operations-local/html.cjs'),policy=require('../operations-local/media-policy.cjs');
test('server rich text preserves ordinary formatting and local images but removes active or foreign content',()=>{
 const output=html('<h2>合成标题</h2><p><strong>加粗</strong><img src="/fixtures/operations-cover.svg" alt="合成"><img src="https://attacker.invalid/pixel"><a href="/operations">本页</a><a href="javascript:evil()" onclick="evil()">禁止</a><script>evil()</script><style>body{display:none}</style><iframe srcdoc="<script>evil()</script>"></iframe></p>');
 assert(output.includes('<h2>'));assert(output.includes('<strong>'));assert(output.includes('/fixtures/operations-cover.svg'));assert(output.includes('href="/operations"'));assert(!/<(?:script|style|iframe)\b|\s(?:on\w+|srcdoc|style)\s*=|(?:src|href)="(?:javascript:|https:)/i.test(output));
});
test('namespace, raw-text, clobbering and deep malformed fragments remain inert or explicitly rejected',()=>{
 for(const vector of ['<svg><textarea><img src=x onerror=evil()></textarea></svg>','<math><mtext><table><mglyph><style><!--</style><img src=x onerror=evil()>','<noscript><img src=x onerror=evil()></noscript>','<form id=private><input name=member></form>','<iframe>'.repeat(300)+'tail']){
  let result;try{result=html('<p>安全合成正文</p>'+vector);}catch(e){assert.equal(e.status,400);continue;}assert(!/<(?:svg|math|script|style|iframe|form|input)\b|\s(?:on\w+|srcdoc|id|name)\s*=/i.test(result));assert(result.length<=20000);
 }
 assert.throws(()=>html('<script>onlyUnsafe()</script>'),e=>e.status===400);assert.throws(()=>html('x'.repeat(20001)),e=>e.status===400);
});
test('only explicit synthetic media references are accepted; URL validity never proves availability',()=>{
 for(const bad of ['javascript:1','data:image/svg+xml;base64,PHN2Zz4=','blob:local','//example.invalid/x','https://user:pass@example.invalid/x','/../1.png','/fixtures/%2e%2e/1.png','/fixtures/operations-cover.svg?redirect=evil','https://127.0.0.1:3069/fixtures/operations-cover.svg'])for(const type of ['image','video'])assert.equal(policy.reference(bad,type),false,bad);
 assert.equal(policy.reference('/fixtures/operations-cover.svg','image'),true);assert.equal(policy.reference('/fixtures/operations-motion.mp4','video'),true);assert.equal(policy.reference('/fixtures/operations-missing.mp4','video'),true);assert.equal(policy.reference('/fixtures/operations-motion.mp4','image'),false);
});
