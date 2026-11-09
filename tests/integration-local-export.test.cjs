// Run AFTER the real production static build, not against the development renderer.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'out');
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(directory,e.name)):[path.join(directory,e.name)]);}
test('production static pages contain no integrated writable route, local API, renderer or credentials',()=>{
 assert(fs.existsSync(path.join(out,'index.html')),'must run the real production build first');
 assert.equal(fs.existsSync(path.join(out,'api')),false);assert.equal(fs.existsSync(path.join(out,'integration-local')),false);
 let checked=0;for(const file of files(out).filter(f=>/\.(html|js|json|txt|css)$/.test(f))){
  const value=fs.readFileSync(file,'utf8');
  assert(!/127\.0\.0\.1:30(?:69|70)|localhost:30(?:69|70)|\/api\/(?:member|community|attendance|points|operations)|integration-accounts\.private|JINXI_INTEGRATION_RENDERER|LOCAL_DEV_RENDERER_ONLY|__Host-jinxi_points_epoch|jinxi-local-integration/.test(value),path.relative(out,file));checked++;
 }
 assert(checked>10,'actual HTML and bundled client assets must be inspected');
 const html=fs.readFileSync(path.join(out,'index.html'),'utf8');assert(!html.includes('本地合成集成预览'));assert(!html.includes('登录合成账号'));
});
test('the original frozen login and public website routes remain in the production export',()=>{
 const html=fs.readFileSync(path.join(out,'index.html'),'utf8');assert(html.includes('今夕公会'));assert(fs.existsSync(path.join(out,'guides/index.html')));
 const source=fs.readFileSync(path.join(root,'app/page.tsx'),'utf8');assert(source.includes('const LEGACY_MEMBER_AUTH_READY = false'));assert(source.includes('!LEGACY_MEMBER_AUTH_READY'));
});
