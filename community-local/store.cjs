const {fail,uuid,payload,text,media}=require('./policy.cjs');
async function role(c){return (await c.query('SELECT role FROM community_lab.member_roles WHERE member_id=community_lab.actor()')).rows[0]?.role||'member';}
async function project(c,r){
 const base={id:r.id,content:r.payload.content,category:r.payload.category,status:r.status,version:r.version,isPinned:r.is_pinned,ownership:r.legacy?'unverified-legacy':'verified'};
 const replies=r.status==='published'?(await c.query('SELECT id,author_id,author_label,content,created_at FROM community_lab.replies WHERE item_id=$1 AND NOT deleted ORDER BY created_at LIMIT 100',[r.id])).rows:[];
 const reactions=r.status==='published'?(await c.query('SELECT type,count(*)::int AS count FROM community_lab.reactions WHERE item_id=$1 AND active GROUP BY type',[r.id])).rows:[];
 if(r.kind==='message')return {...base,name:r.author_label,timestamp:r.created_at,color:/^#[a-f0-9]{6}$/i.test(r.payload.color||'')?r.payload.color:'#2360f5',imageUrl:r.payload.imageUrl==='/fixtures/community-cover.jpg'?r.payload.imageUrl:null,replies:replies.map(x=>({id:x.id,name:x.author_label,content:x.content,color:'#2360f5',timestamp:x.created_at})),reactions:reactions.filter(x=>x.type!=='favorite').map(x=>({...x,users:[]}))};
 const safeMedia=[];for(const candidate of Array.isArray(r.payload.mediaFiles)?r.payload.mediaFiles:[]){try{safeMedia.push(media([candidate])[0]);}catch{/* Unsafe legacy references are omitted from the projection, never rewritten. */}}
 return {...base,title:r.payload.title,author:r.author_label,difficulty:r.payload.difficulty,tags:Array.isArray(r.payload.tags)?r.payload.tags:[],imageUrl:r.payload.imageUrl==='/fixtures/community-cover.jpg'?r.payload.imageUrl:undefined,mediaFiles:safeMedia,likes:[],favorites:[],likeCount:reactions.find(x=>x.type==='like')?.count||0,favoriteCount:reactions.find(x=>x.type==='favorite')?.count||0,comments:replies.map(x=>({id:x.id,userId:x.author_id,userName:x.author_label,content:x.content,timestamp:x.created_at})),viewCount:0,createdAt:r.created_at,updatedAt:r.updated_at};
}
async function mutate(c,body,member){
 const actor=member.member.id,staff=await role(c);
 let item;
 if(['reply.create','reply.delete','reaction.set'].includes(body.op)){
  if(!uuid(body.id))fail(400,'INVALID_ID');
  await c.query('SELECT pg_advisory_xact_lock_shared(hashtextextended($1,73))',[body.id]);
  item=(await c.query('SELECT * FROM community_lab.items WHERE id=$1',[body.id])).rows[0];
  if(!item||item.status!=='published')fail(404,'NOT_FOUND');
  if(item.legacy)fail(403,'LEGACY_OWNERSHIP_UNVERIFIED');
  // A shared logical content lock also works for members denied UPDATE by RLS.
  let replyId;
  if(body.op==='reply.create'){
   replyId=(await c.query('INSERT INTO community_lab.replies(item_id,author_id,author_label,content) VALUES($1,$2,$3,$4) RETURNING id',[item.id,actor,member.member.displayName,text(body.content,1000)])).rows[0].id;
  }else if(body.op==='reply.delete'){
   if(!uuid(body.replyId))fail(400,'INVALID_ID');
   const reply=(await c.query('SELECT id,author_id,deleted FROM community_lab.replies WHERE id=$1 AND item_id=$2',[body.replyId,item.id])).rows[0];
   if(!reply)fail(404,'NOT_FOUND');if(reply.author_id!==actor&&staff!=='admin')fail(403,'NOT_OWNER');
   await c.query('UPDATE community_lab.replies SET deleted=true WHERE id=$1',[reply.id]);replyId=reply.id;
  }else{
   if(!['like','love','laugh','favorite','👍','❤️','😂'].includes(body.type)||body.type==='favorite'&&item.kind!=='guide'||typeof body.active!=='boolean')fail(400,'INVALID_REACTION');
   await c.query('INSERT INTO community_lab.reactions(item_id,member_id,type,active) VALUES($1,$2,$3,$4) ON CONFLICT(item_id,member_id,type) DO UPDATE SET active=EXCLUDED.active',[item.id,actor,body.type,body.active]);
  }
  await c.query('INSERT INTO community_lab.audit(actor_id,operation,item_id) VALUES($1,$2,$3)',[actor,body.op,item.id]);
  return {item:await project(c,item),...(replyId?{replyId}:{}),...(body.op==='reaction.set'?{active:body.active}:{})};
 }
 if(body.op==='message.create'||body.op==='guide.create'){
  const kind=body.op==='message.create'?'message':'guide';
  item=(await c.query('INSERT INTO community_lab.items(kind,owner_id,author_label,payload,status) VALUES($1,$2,$3,$4,$5) RETURNING *',[kind,actor,member.member.displayName,payload(body,kind),kind==='message'?'submitted':'draft'])).rows[0];
 }else{
  if(!uuid(body.id)||!Number.isInteger(body.version)||body.version<1)fail(400,'ITEM_VERSION_REQUIRED');
  const existing=(await c.query('SELECT * FROM community_lab.items WHERE id=$1',[body.id])).rows[0];if(!existing)fail(404,'NOT_FOUND');
  if(existing.legacy)fail(403,'LEGACY_OWNERSHIP_UNVERIFIED');
  if(body.op==='item.review'){if(!['reviewer','admin'].includes(staff)||existing.owner_id===actor)fail(403,'REVIEWER_REQUIRED');}
  else if(body.op==='item.pin'){if(staff!=='admin')fail(403,'ADMIN_REQUIRED');}
  else if(existing.owner_id!==actor&&!(body.op==='item.delete'&&staff==='admin'))fail(403,'NOT_OWNER');
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,73))',[body.id]);
  item=(await c.query('SELECT * FROM community_lab.items WHERE id=$1 FOR UPDATE',[body.id])).rows[0];if(!item)fail(404,'NOT_FOUND');
  if(item.version!==body.version)fail(409,'VERSION_CONFLICT');
  let data=item.payload,status=item.status,pinned=item.is_pinned;
  if(body.op==='item.edit'){
   if(['deleted','archived'].includes(status))fail(409,'CONTENT_CLOSED');
   data=payload(body,item.kind);status=item.kind==='guide'?'draft':'submitted';pinned=false;
  }else if(body.op==='item.submit'){
   if(item.kind!=='guide'||!['draft','rejected'].includes(status))fail(409,'SUBMIT_STATE_CONFLICT');status='submitted';pinned=false;
  }else if(body.op==='item.archive'){
   if(['deleted','archived'].includes(status))fail(409,'CONTENT_CLOSED');status='archived';pinned=false;
  }else if(body.op==='item.review'){
   if(status!=='submitted'||!['approve','reject'].includes(body.decision))fail(409,'REVIEW_STATE_CONFLICT');
   status=body.decision==='approve'?'published':'rejected';pinned=false;
  }else if(body.op==='item.pin'){
   if(status!=='published'||typeof body.pinned!=='boolean')fail(409,'PIN_STATE_CONFLICT');pinned=body.pinned;
  }else if(body.op==='item.delete'){
   if(status==='deleted')fail(409,'CONTENT_CLOSED');status='deleted';pinned=false;
  }else fail(400,'OPERATION_NOT_ENABLED');
  item=(await c.query('UPDATE community_lab.items SET payload=$2,status=$3,is_pinned=$4,version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING *',[item.id,data,status,pinned])).rows[0];
 }
 await c.query('INSERT INTO community_lab.audit(actor_id,operation,item_id) VALUES($1,$2,$3)',[actor,body.op,item.id]);
 return {item:await project(c,item)};
}
module.exports={role,project,mutate};
