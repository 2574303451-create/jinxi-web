const {fail,uuid,fields,integer,text,instant}=require('./contract.cjs'),{html}=require('./html.cjs');
function displayTime(value){const parts=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(value)),p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;}
function item(row,privateView=false){
 const common={id:row.id,kind:row.kind,version:row.version,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at,source:row.legacy?'unverified-synthetic-history':'synthetic-local',legacy:row.legacy};
 const content=row.kind==='announcement'?{title:row.payload.title,contentHtml:html(row.payload.contentHtml),author:'合成授权发布',publishedAt:row.published_at,expiresAt:row.expires_at,effectiveStatus:row.effective_status||row.status}:{sponsor:row.payload.sponsor,sponsorTime:row.occurred_at,time:displayTime(row.occurred_at)};
 return {...common,...content,...(privateView?{ownerId:row.owner_id,lastEditor:row.last_editor}:{})};
}
async function mutate(c,ctx,body){
 const [kind,action]=body.op.split('.');if(!['announcement','sponsor'].includes(kind))fail(400,'OPERATION_NOT_ENABLED');if(kind==='sponsor'&&!ctx.admin||kind==='announcement'&&!ctx.staff)fail(403,'STAFF_REQUIRED');ctx.requiredRole=kind==='sponsor'?'admin':'staff';
 if(action==='create'){
  let row;
  if(kind==='announcement'){fields(body,['title','contentHtml','expiresAt']);const payload={title:text(body.title,120),contentHtml:html(body.contentHtml)},expires=instant(body.expiresAt??null,true);row=(await c.query("INSERT INTO operations_lab.documents(kind,owner_id,payload,status,expires_at) VALUES('announcement',$1,$2,'draft',$3) RETURNING *",[ctx.actor,payload,expires])).rows[0];}
  else{fields(body,['sponsor','sponsorTime']);const payload={sponsor:text(body.sponsor,80)},at=instant(body.sponsorTime);row=(await c.query("INSERT INTO operations_lab.documents(kind,owner_id,payload,status,occurred_at) VALUES('sponsor',$1,$2,'visible',$3) RETURNING *",[ctx.actor,payload,at])).rows[0];}
  return {item:item(row,true),outcome:'created'};
 }
 const id=uuid(body.id),version=integer(body.version);await c.query('SELECT id FROM operations_lab.documents WHERE id=$1 FOR UPDATE',[id]);const old=(await c.query('SELECT * FROM operations_lab.documents WHERE id=$1 AND kind=$2',[id,kind])).rows[0];if(!old||old.legacy)fail(403,'ITEM_NOT_AVAILABLE');if(old.version!==version)fail(409,'VERSION_CONFLICT');if(old.status==='deleted')fail(409,'ITEM_CLOSED');
 if(kind==='announcement'&&['edit','submit','withdraw'].includes(action)&&old.owner_id!==ctx.actor){if(!ctx.admin)fail(403,'AUTHOR_REQUIRED');ctx.requiredRole='admin';}
 let query,values;
 if(action==='edit'){
  if(kind==='announcement'){fields(body,['id','version','title','contentHtml','expiresAt']);if(old.owner_id!==ctx.actor&&!ctx.admin)fail(403,'AUTHOR_REQUIRED');if(!['draft','withdrawn'].includes(old.status))fail(409,'DRAFT_REQUIRED');const payload={title:text(body.title,120),contentHtml:html(body.contentHtml)},expires=instant(body.expiresAt??null,true);query="UPDATE operations_lab.documents SET payload=$2,expires_at=$3,status='draft',version=version+1 WHERE id=$1 RETURNING *";values=[id,payload,expires];}
  else{fields(body,['id','version','sponsor','sponsorTime']);const payload={sponsor:text(body.sponsor,80)},at=instant(body.sponsorTime);query='UPDATE operations_lab.documents SET payload=$2,occurred_at=$3,version=version+1 WHERE id=$1 RETURNING *';values=[id,payload,at];}
 }else{
  fields(body,['id','version']);const transitions=kind==='announcement'?{submit:['draft','submitted'],publish:['submitted','published'],withdraw:[['submitted','published'],'withdrawn'],delete:[['draft','submitted','published','withdrawn'],'deleted']}:{hide:['visible','hidden'],show:['hidden','visible'],delete:[['visible','hidden'],'deleted']},transition=transitions[action];if(!transition)fail(400,'OPERATION_NOT_ENABLED');const [from,to]=transition;if(!(Array.isArray(from)?from:[from]).includes(old.status))fail(409,'STATE_CONFLICT');
  if(['submit','withdraw'].includes(action)&&old.owner_id!==ctx.actor&&!ctx.admin)fail(403,'AUTHOR_REQUIRED');if(action==='publish'){if(old.last_editor===ctx.actor)fail(403,'SELF_REVIEW_REQUIRED');const live=(await c.query('SELECT attendance_lab.business_now() AS now')).rows[0].now;if(old.expires_at&&old.expires_at<=live)fail(409,'ANNOUNCEMENT_EXPIRED');}if(action==='delete'){if(!ctx.admin)fail(403,'ADMIN_REQUIRED');ctx.requiredRole='admin';}
  query='UPDATE operations_lab.documents SET status=$2,version=version+1 WHERE id=$1 RETURNING *';values=[id,to];
 }
 const row=(await c.query(query,values)).rows[0];return {item:item(row,true),outcome:'updated'};
}
module.exports={item,mutate};
