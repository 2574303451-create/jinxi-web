const el=id=>document.getElementById(id);
let member=null,busy=false,pending=null,editing=null,editorFromServer=false,generation=0;
const statusName={draft:'草稿',submitted:'待审核',published:'已公开',rejected:'已退回',archived:'已归档',deleted:'已删除'};
function notice(text,error=false){el('notice').textContent=text;el('notice').setAttribute('role',error?'alert':'status');}
async function request(url,options={}){
 const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...options}),data=await r.json();
 if(!r.ok){const e=Error(data.code||'REQUEST_REJECTED');e.status=r.status;throw e;}
 return data;
}
function controls(){
 for(const b of document.querySelectorAll('button'))b.disabled=busy;
 el('compose').querySelector('button[type=submit]').disabled=busy||!member||member.needsPasswordChange||!!pending;
 el('retry').hidden=!pending;el('cancel').hidden=!pending;
 el('session').textContent=member?member.member.displayName+(member.needsPasswordChange?' · 需要先改密':' · 已由服务器核验'):'游客 · 仅公开读取';
}
async function identity(){
 try{return await request('/api/member?op=me');}catch(e){if(e.status===401)return null;throw e;}
}
function setIdentity(current){
 if(member?.member.id!==current?.member.id){
  if(editorFromServer)clearEditor();
  el('items').replaceChildren();editing=null;
  el('editing').textContent='作者来自当前服务器会话，不填写昵称或成员ID。';
 }
 member=current;controls();
}
function clearEditor(){
 for(const id of ['body','title','tags'])el(id).value='';
 el('category').value='PVE';el('difficulty').value='2';el('fixture-media').checked=false;editorFromServer=false;
}
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function action(label,kind,body,holder){const b=node('button',label);b.type='button';b.dataset.action=kind;b.disabled=!member||!!pending;b.addEventListener('click',()=>void operate(body));holder.append(b);return b;}
function render(items){
 const list=el('items');list.replaceChildren();
 if(!items.length){list.append(node('p','当前范围没有内容。'));return;}
 for(const item of items){
  const card=node('article');card.dataset.id=item.id;
  card.append(node('h3',item.title||'合成留言'),node('p',item.author||item.name,'metadata'),node('p',(statusName[item.status]||item.status)+' · 版本 '+item.version+' · '+(item.ownership==='verified'?'可信成员归属':'待核实历史归属（只读）'),'metadata'),node('p',item.content,'body'));
  if(item.imageUrl==='/fixtures/community-cover.jpg')card.append(node('p','封面：固定本机合成图片引用','metadata'));
  for(const media of item.mediaFiles||[])card.append(node('p','本机引用：'+media.title+' · '+media.type,'metadata'));
  const buttons=node('div',undefined,'actions item-actions');
  if(item.ownership==='verified'){
   const edit=node('button','修订');edit.type='button';edit.disabled=!member||!!pending;edit.addEventListener('click',()=>{editing=item;editorFromServer=true;el('body').value=item.content;el('title').value=item.title||'';el('tags').value=(item.tags||[]).join(',');el('category').value=item.category;el('difficulty').value=String(item.difficulty||2);el('editing').textContent='修订版本 '+item.version+'；发布后修订将重新审核。';el('body').focus();});buttons.append(edit);
   for(const [label,kind,op,extra]of [['提交审核','submit','item.submit',{}],['审核通过','approve','item.review',{decision:'approve'}],['退回','reject','item.review',{decision:'reject'}],['置顶','pin','item.pin',{pinned:true}],['取消置顶','unpin','item.pin',{pinned:false}],['归档','archive','item.archive',{}],['删除','delete','item.delete',{}]]){
    if(kind==='submit'&&!(item.title&&['draft','rejected'].includes(item.status)))continue;
    action(label,kind,{op,id:item.id,version:item.version,...extra},buttons);
   }
  }
  if(item.status==='published'&&item.ownership==='verified'){
   for(const [label,type,active]of [['点赞','like',true],['取消点赞','like',false],...(item.title?[['收藏','favorite',true],['取消收藏','favorite',false]]:[])])action(label,'reaction',{op:'reaction.set',id:item.id,type,active},buttons);
   const likes=item.likeCount??item.reactions?.find(r=>r.type==='like')?.count??0;card.append(node('p','点赞 '+likes+(item.title?' · 收藏 '+item.favoriteCount:''),'metadata'));
   for(const reply of item.comments||item.replies||[]){
    const box=node('div',undefined,'reply');box.append(node('p',reply.userName||reply.name),node('p',reply.content,'reply-text'));action('删除此回复','delete-reply',{op:'reply.delete',id:item.id,replyId:reply.id},box);card.append(box);
   }
   const form=node('form'),input=node('textarea'),label=node('label','合成回复 / 评论');input.maxLength=1000;input.required=true;input.id='reply-'+item.id;label.htmlFor=input.id;
   const submit=node('button','发布回复');submit.type='submit';submit.dataset.action='reply';submit.disabled=!member||!!pending;
   form.append(label,input,submit);form.addEventListener('submit',event=>{event.preventDefault();void operate({op:'reply.create',id:item.id,content:input.value});});card.append(form);
  }
  card.append(buttons);list.append(card);
 }
}
async function reload(){
 if(busy)return;
 const ticket=++generation;el('loading').hidden=false;el('items').replaceChildren();
 try{
  const current=await identity();if(ticket!==generation)return;setIdentity(current);
  const data=await request('/api/community?'+new URLSearchParams({kind:el('kind').value,scope:el('scope').value}));
  if(ticket===generation)render(data.items);
 }catch(e){if(ticket===generation){el('items').replaceChildren();notice(e instanceof TypeError?'网络不可用；正文保留，可重新读取。':'读取被拒绝：'+e.message,true);}}
 finally{if(ticket===generation)el('loading').hidden=true;}
}
async function operate(body,retry=false){
 if(busy)return;
 if(pending&&!retry){notice('原请求结果尚未确认，请先重试原请求。',true);return;}
 busy=true;generation++;el('loading').hidden=true;controls();
 let submitted=false;
 try{
  setIdentity(await identity());if(!member||member.needsPasswordChange)throw Object.assign(Error('SIGN_IN_REQUIRED'),{status:401});
  if(retry&&pending.memberId!==member.member.id)throw Object.assign(Error('ACCOUNT_CHANGED_REQUEST_NOT_REPLAYED'),{status:403});
  if(!retry)pending={memberId:member.member.id,body:{...body,requestId:crypto.randomUUID()}};
  submitted=true;
  const result=await request('/api/community',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':member.csrfToken},body:JSON.stringify(pending.body)});
  pending=null;editing=null;el('editing').textContent='作者来自当前服务器会话，不填写昵称或成员ID。';
  notice('操作成功：'+(statusName[result.item?.status]||'已保存'));
  if(body.op.endsWith('.create')&&body.op!=='reply.create'){el('scope').value='mine';el('body').value='';}
 }catch(e){
  if(submitted&&!(e instanceof TypeError)&&e.status<500)pending=null;
  notice(e instanceof TypeError?'网络中断，结果待确认；请重试原请求。':'操作被拒绝：'+e.message,true);
 }finally{busy=false;controls();await reload();}
}
el('compose').addEventListener('submit',event=>{
 event.preventDefault();
 const kind=el('kind').value,data={content:el('body').value};
 if(kind==='guide'){
  Object.assign(data,{title:el('title').value,category:el('category').value,difficulty:Number(el('difficulty').value),tags:el('tags').value.split(',').map(s=>s.trim()).filter(Boolean),mediaFiles:[]});
  if(el('fixture-media').checked){data.imageUrl='/fixtures/community-cover.jpg';data.mediaFiles=[{id:'synthetic-video',type:'video',url:'/fixtures/community-demo.mp4',thumbnail:'/fixtures/community-cover.jpg',title:'本机合成视频引用',playbackMode:'embed'}];}
 }else Object.assign(data,{category:'闲聊',color:'#2360f5'});
 void operate({op:editing?'item.edit':kind+'.create',...(editing?{id:editing.id,version:editing.version}:{}),...data});
});
el('retry').addEventListener('click',()=>{if(pending)void operate(pending.body,true);});
el('cancel').addEventListener('click',()=>{if(busy)return;pending=null;controls();notice('已停止重试。服务器已完成的操作不会因此撤销。');});
el('new').addEventListener('click',()=>{if(editorFromServer)clearEditor();editing=null;el('editing').textContent='作者来自当前服务器会话，不填写昵称或成员ID。';});
el('kind').addEventListener('change',()=>{editing=null;el('guide-fields').hidden=el('kind').value!=='guide';el('body').maxLength=el('kind').value==='guide'?10000:1000;void reload();});
el('scope').addEventListener('change',()=>void reload());el('reload').addEventListener('click',()=>void reload());
window.addEventListener('focus',()=>void reload());
controls();void reload();
