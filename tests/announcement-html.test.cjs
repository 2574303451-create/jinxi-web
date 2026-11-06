const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file){const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,module={exports:{}};vm.runInNewContext(output,{module,exports:module.exports,require,URL,Promise},{filename:file});return module.exports;}
test('announcement URL policy rejects active/ambiguous media and server path never returns raw HTML',async()=>{
 const html=load(path.join(__dirname,'../lib/announcement-html.ts'));
 for(const bad of ['javascript:1','java\tscript:1','data:image/svg+xml;base64,PHN2Zz4=','//remote.example/a','/\\remote.example','https://user:pass@example.com/a',' https://example.com/a','https:example.com/a'])assert.equal(html.safeAnnouncementUrl(bad,true),false,bad);
 for(const valid of ['/14.png','https://example.com/photo.webp','data:image/png;base64,aGVsbG8='])assert.equal(html.safeAnnouncementUrl(valid,true),true,valid);
 assert.equal(html.safeAnnouncementUrl('#section'),true);assert.equal(html.safeAnnouncementUrl('#section',true),false);
 await assert.rejects(html.loadAnnouncementSanitizer(),/unavailable/);
});
test('legacy Markdown sinks escape stored and preview HTML but retain ordinary formatting',()=>{
 const renderer=load(path.join(__dirname,'../services/strategy-wall-service.ts')).formatStrategyContent;
 const text=renderer('# 合成标题\n**加粗**\n<img src=x onerror="globalThis.__harmlessMarker=1">\n<svg><script>marker=1</script></svg>');
 assert(text.includes('<h1'));assert(text.includes('<strong'));assert(!/<(?:img|svg|script)\b/i.test(text));assert(text.includes('&lt;img'));assert(text.includes('合成标题'));
});
