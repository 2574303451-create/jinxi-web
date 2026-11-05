const { test } = require('node:test'), assert = require('node:assert/strict'), ts = require('typescript');
require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(require('node:fs').readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {readGuide} = require('../services/guide-service.ts');
test('legacy full detail normalizes malformed comments/media at the actual read boundary', async()=>{
 const previous=global.fetch;
 try {
  global.fetch=async()=>new Response(JSON.stringify({strategy:{id:'2',title:'隔离边界样本',author:null,createdAt:'2026-10-02T00:00:00Z',updatedAt:'2026-10-02T00:00:00Z',likes:[],favorites:[],comments:[null,42,{id:'legacy',content:'缺字段的历史评论'},{id:'good',userId:'synthetic',userName:'历史署名',timestamp:'2026-10-01T00:00:00Z',content:'完整评论'}],mediaFiles:[null,42,'video',{type:'video',url:'/guides-media/one.mp4'},{type:'image',url:{invalid:true},title:{invalid:true}}]}}),{status:200,headers:{'Content-Type':'application/json'}});
  const detail=await readGuide('2');
  assert.equal(detail.author,'匿名署名');
  assert.equal(detail.comments.length,2);
  assert.equal(detail.comments[0].userName,'匿名署名');
  assert(Number.isNaN(detail.comments[0].timestamp.getTime()),'Missing time must not be invented');
  assert.equal(detail.comments[1].userName,'历史署名');
  assert.equal(detail.comments[1].timestamp.toISOString(),'2026-10-01T00:00:00.000Z');
  assert.equal(detail.mediaFiles.length,5,'Keep bad entries as explicit unavailable placeholders');
  assert(detail.mediaFiles.every(m=>m&&typeof m.id==='string'&&typeof m.url==='string'&&typeof m.title==='string'));
  assert.equal(detail.mediaFiles[0].url,'');
  assert.equal(detail.mediaFiles[3].type,'video');
  assert.equal(detail.mediaFiles[3].url,'/guides-media/one.mp4');
  assert.equal(detail.mediaFiles[4].url,'');
 }finally{global.fetch=previous}
});
