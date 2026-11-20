const {fail,uuid,payload,text,media}=require('./policy.cjs');
async function role(c){return (await c.query('SELECT role FROM community_lab.member_roles WHERE member_id=community_lab.actor()')).rows[0]?.role||'member';}
const managementFilter = {
 mine: 'owner_id = $2',
 review: "status = 'submitted' AND owner_id <> $2",
 'published-admin': "status = 'published' AND NOT legacy",
};
async function managementPage(c, { kind, scope, memberId, anchorId, limit }) {
 const { rows } = await c.query(`
  WITH eligible AS NOT MATERIALIZED (
   SELECT * FROM community_lab.items WHERE kind = $1 AND $2::uuid = community_lab.actor() AND ${managementFilter[scope]}
  ), anchor AS (
   SELECT id, created_at FROM eligible WHERE id = $3::uuid
  )
  SELECT page.*, ($3::uuid IS NULL OR anchor.id IS NOT NULL) AS cursor_valid
  FROM (VALUES (1)) AS request(present)
  LEFT JOIN anchor ON true
  LEFT JOIN LATERAL (
   SELECT * FROM eligible
   WHERE $3::uuid IS NULL OR (eligible.created_at, eligible.id) < (anchor.created_at, anchor.id)
   ORDER BY created_at DESC, id DESC LIMIT $4
  ) AS page ON true
  ORDER BY page.created_at DESC, page.id DESC
 `, [kind, memberId, anchorId, limit + 1]);
 if (!rows[0].cursor_valid) fail(409, 'PAGE_CHANGED');
 return {
  rows: rows[0].id ? rows.slice(0, limit) : [],
  nextCursor: rows.length > limit ? `${scope}.${kind}.${rows[limit - 1].id}` : null,
 };
}
function publishedSummary(row) {
 const { title, content } = row.payload;
 return {id:row.id, version:row.version, isPinned:row.is_pinned, title:typeof title === 'string' ? title : undefined,
  content:typeof content === 'string' ? content.slice(0,160) : '', name:row.author_label};
}
const needsStaff = (op, item, actor) => op === 'item.review' || op === 'item.pin' ||
 (op === 'item.delete' && item.owner_id !== actor);
function requireItemAuthority(op, item, actor, staff) {
 if (op === 'item.review') {
  if (!['reviewer','admin'].includes(staff) || item.owner_id === actor) fail(403,'REVIEWER_REQUIRED');
 } else if (op === 'item.pin') {
  if (staff !== 'admin') fail(403,'ADMIN_REQUIRED');
 } else if (item.owner_id !== actor && !(op === 'item.delete' && staff === 'admin')) fail(403,'NOT_OWNER');
}
async function project(c,r,{includeMyReactions=false,includeReply=null}={}){
 const base={id:r.id,content:r.payload.content,category:r.payload.category,status:r.status,version:r.version,isPinned:r.is_pinned,ownership:r.legacy?'unverified-legacy':'verified'};
 const replies=r.status==='published'?(await c.query(`
  SELECT * FROM (
   SELECT id,author_label,content,created_at FROM community_lab.replies WHERE item_id=$1 AND NOT deleted
   ORDER BY (id=$2::uuid) DESC NULLS LAST,created_at,id LIMIT 100
  ) AS visible ORDER BY created_at,id
 `,[r.id,includeReply])).rows:[];
 const myReaction=includeMyReactions?',bool_or(member_id=community_lab.actor()) AS mine':'';
 const reactions=r.status==='published'?(await c.query('SELECT type,count(*)::int AS count'+myReaction+' FROM community_lab.reactions WHERE item_id=$1 AND active GROUP BY type',[r.id])).rows:[];
 if(r.kind==='message')return {...base,name:r.author_label,timestamp:r.created_at,color:/^#[a-f0-9]{6}$/i.test(r.payload.color||'')?r.payload.color:'#2360f5',imageUrl:r.payload.imageUrl==='/fixtures/community-cover.jpg'?r.payload.imageUrl:null,replies:replies.map(x=>({id:x.id,name:x.author_label,content:x.content,color:'#2360f5',timestamp:x.created_at})),reactions:reactions.filter(x=>x.type!=='favorite').map(x=>({...x,users:[]}))};
 const safeMedia=[];for(const candidate of Array.isArray(r.payload.mediaFiles)?r.payload.mediaFiles:[]){try{safeMedia.push(media([candidate])[0]);}catch{/* Unsafe legacy references are omitted from the projection, never rewritten. */}}
 const like=reactions.find(x=>x.type==='like'),favorite=reactions.find(x=>x.type==='favorite');
 return {...base,title:r.payload.title,author:r.author_label,difficulty:r.payload.difficulty,tags:Array.isArray(r.payload.tags)?r.payload.tags:[],imageUrl:r.payload.imageUrl==='/fixtures/community-cover.jpg'?r.payload.imageUrl:undefined,mediaFiles:safeMedia,likes:[],favorites:[],likeCount:like?.count||0,favoriteCount:favorite?.count||0,
  ...(includeMyReactions?{viewerReactions:{like:like?.mine===true,favorite:favorite?.mine===true}}:{}),
  comments:replies.map(x=>({id:x.id,userId:'',userName:x.author_label,content:x.content,timestamp:x.created_at})),viewCount:0,createdAt:r.created_at,updatedAt:r.updated_at};
}
const interaction = op => ['reply.create','reply.delete','reaction.set'].includes(op);
async function replay(c,body,actor,previous) {
 // Creation receipts are owned by the verified actor and contain no public interactions.
 if (body.op === 'message.create' || body.op === 'guide.create') return previous;

 await c.query('SELECT pg_advisory_xact_lock_shared(hashtextextended($1,73))',[body.id.toLowerCase()]);
 const checkRole = async () => {
  const staff = await role(c);
  if (body.op === 'item.review' && !['reviewer','admin'].includes(staff)) fail(403,'REVIEWER_REQUIRED');
  if (body.op === 'item.pin' && staff !== 'admin') fail(403,'ADMIN_REQUIRED');
  return staff;
 };
 const restricted = body.op === 'item.review' || body.op === 'item.pin';
 const staff = restricted ? await checkRole() : 'member';
 const { rows:[item] } = await c.query('SELECT * FROM community_lab.items WHERE id=$1',[body.id]);
 if (!item || item.legacy) fail(404,'NOT_FOUND');
 if ((interaction(body.op) || body.op === 'item.pin') && item.status !== 'published') fail(404,'NOT_FOUND');
 if (body.op === 'item.review') {
  if (!['submitted','published','rejected'].includes(item.status)) fail(404,'NOT_FOUND');
  if (item.status === 'rejected' && item.version !== previous.item?.version) fail(404,'NOT_FOUND');
 }
 if (!interaction(body.op)) {
  const access = body.op === 'item.delete' && item.owner_id !== actor ? await role(c) : staff;
  requireItemAuthority(body.op,item,actor,access);
 }
 let includeReply=null,adminDeletion=body.op==='item.delete' && item.owner_id!==actor;
 if (body.op === 'reply.create' || body.op === 'reply.delete') {
  const { rows:[reply] } = await c.query('SELECT author_id,deleted FROM community_lab.replies WHERE id=$1 AND item_id=$2',[previous.replyId,item.id]);
  if (body.op === 'reply.create') {
   if (!reply || reply.author_id !== actor || reply.deleted) fail(409,'REPLY_NOT_AVAILABLE');
   includeReply=previous.replyId;
  } else {
   if (!reply) fail(404,'NOT_FOUND');
   adminDeletion=reply.author_id!==actor;
  }
 }
 const current=await project(c,item,{includeReply});
 if (includeReply) {
  const replies = item.kind === 'message' ? current.replies : current.comments;
  if (!replies.some(reply => reply.id === includeReply)) fail(409,'REPLY_NOT_AVAILABLE');
 }
 if (restricted) await checkRole();
 if (adminDeletion && await role(c) !== 'admin') fail(403,'ADMIN_REQUIRED');
 return {...previous,item:current};
}
async function mutate(c,body,member){
 const actor=member.member.id,staff=await role(c);
 let item;
 if(interaction(body.op)){
  if(!uuid(body.id))fail(400,'INVALID_ID');
  await c.query('SELECT pg_advisory_xact_lock_shared(hashtextextended($1,73))',[body.id.toLowerCase()]);
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
  return {item:await project(c,item,{includeReply:body.op==='reply.create'?replyId:null}),...(replyId?{replyId}:{}),...(body.op==='reaction.set'?{active:body.active}:{})};
 }
 if(body.op==='message.create'||body.op==='guide.create'){
  const kind=body.op==='message.create'?'message':'guide';
  item=(await c.query('INSERT INTO community_lab.items(kind,owner_id,author_label,payload,status) VALUES($1,$2,$3,$4,$5) RETURNING *',[kind,actor,member.member.displayName,payload(body,kind),kind==='message'?'submitted':'draft'])).rows[0];
 }else{
  if(!uuid(body.id)||!Number.isInteger(body.version)||body.version<1)fail(400,'ITEM_VERSION_REQUIRED');
  const existing=(await c.query('SELECT * FROM community_lab.items WHERE id=$1',[body.id])).rows[0];if(!existing)fail(404,'NOT_FOUND');
  if(existing.legacy)fail(403,'LEGACY_OWNERSHIP_UNVERIFIED');
  requireItemAuthority(body.op,existing,actor,staff);
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,73))',[body.id.toLowerCase()]);
  item=(await c.query('SELECT * FROM community_lab.items WHERE id=$1 FOR UPDATE',[body.id])).rows[0];if(!item)fail(404,'NOT_FOUND');
  if (needsStaff(body.op,item,actor)) requireItemAuthority(body.op,item,actor,await role(c));
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
module.exports={role,project,mutate,replay,managementPage,publishedSummary};
