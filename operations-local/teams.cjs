const crypto=require('node:crypto'),{fail,uuid,text,integer,fields,canonical}=require('./contract.cjs');
function payload(body){const icon=text(body.icon,8),color=body.color;if(!['⭐','🌙','🔥','🎯','🛡️'].includes(icon)||typeof color!=='string'||!/^#[a-f0-9]{6}$/i.test(color))fail(400,'INVALID_TEAM_STYLE');return {name:text(body.name,60),icon,color,slogan:text(body.slogan,160,true),description:text(body.description,1000,true),requirements:text(body.requirements,300,true)};}
function item(row,ctx,membership){return {id:row.id,kind:'team',status:'active',version:row.version,name:row.payload.name,icon:row.payload.icon,color:row.payload.color,slogan:row.payload.slogan,description:row.payload.description,requirements:row.payload.requirements,maxMembers:row.max_members,memberCount:row.member_count,createdAt:row.created_at,updatedAt:row.updated_at,...(ctx?{myRole:membership?.role||null,applicationMessage:membership?.application_message||'',applicationStatus:membership?'approved':null,...(ctx.actor===row.leader_id?{ownerId:ctx.actor}:{})}:{}),source:'synthetic-local'};}
const inputFields=['name','icon','color','slogan','description','requirements','maxMembers'];
async function mutate(c,ctx,body){
 const action=body.op.split('.')[1];let id,row,membership;
 if(action==='create'){
  fields(body,inputFields);const value=payload(body),max=integer(body.maxMembers,1,50);if((await c.query('SELECT id FROM operations_lab.team_members WHERE member_id=$1 AND left_at IS NULL',[ctx.actor])).rowCount)fail(409,'ALREADY_IN_TEAM');
  id=crypto.randomUUID();const slot=crypto.randomUUID();await c.query('INSERT INTO operations_lab.teams(id,leader_id,leader_slot,payload,max_members) VALUES($1,$2,$3,$4,$5)',[id,ctx.actor,slot,value,max]);membership=(await c.query("INSERT INTO operations_lab.team_members(id,team_id,member_id,role) VALUES($1,$2,$3,'leader') RETURNING *",[slot,id,ctx.actor])).rows[0];
 }else{
  id=uuid(body.id);await c.query('SELECT id FROM operations_lab.teams WHERE id=$1 FOR UPDATE',[id]);row=(await c.query('SELECT * FROM operations_lab.teams WHERE id=$1',[id])).rows[0];if(!row)fail(404,'TEAM_NOT_AVAILABLE');
  membership=(await c.query('SELECT * FROM operations_lab.team_members WHERE team_id=$1 AND member_id=$2 AND left_at IS NULL',[id,ctx.actor])).rows[0];
  if(action==='join'){
   fields(body,['id','message']);const message=text(body.message??'',300,true);if((await c.query('SELECT id FROM operations_lab.team_members WHERE member_id=$1 AND left_at IS NULL',[ctx.actor])).rowCount)fail(409,'ALREADY_IN_TEAM');if(row.member_count>=row.max_members)fail(409,'TEAM_FULL');membership=(await c.query("INSERT INTO operations_lab.team_members(team_id,member_id,role,application_message) VALUES($1,$2,'member',$3) RETURNING *",[id,ctx.actor,message])).rows[0];
  }else if(action==='leave'){
   fields(body,['id']);if(!membership)fail(403,'MEMBERSHIP_NOT_AVAILABLE');if(membership.role==='leader')fail(409,'LEADER_TRANSFER_UNDEFINED');await c.query('UPDATE operations_lab.team_members SET left_at=attendance_lab.business_now() WHERE id=$1',[membership.id]);membership=null;
  }else if(action==='edit'){
   fields(body,['id','version',...inputFields]);if(row.leader_id!==ctx.actor)fail(403,'LEADER_REQUIRED');if(row.version!==integer(body.version))fail(409,'VERSION_CONFLICT');const value=payload(body),max=integer(body.maxMembers,1,50);if(max<row.member_count)fail(409,'TEAM_CAPACITY_CONFLICT');
   if(max!==row.max_members||JSON.stringify(canonical(value))!==JSON.stringify(canonical(row.payload)))await c.query('UPDATE operations_lab.teams SET payload=$2,max_members=$3,version=version+1 WHERE id=$1',[id,value,max]);
  }else fail(400,'OPERATION_NOT_ENABLED');
 }
 row=(await c.query('SELECT * FROM operations_lab.teams WHERE id=$1',[id])).rows[0];return {item:item(row,ctx,membership),outcome:action==='leave'?'left':action==='join'?'joined':action==='create'?'created':'updated'};
}
async function state(c,ctx,query){const privateView=query.view==='private',membership=privateView?(await c.query('SELECT * FROM operations_lab.team_members WHERE member_id=$1 AND left_at IS NULL',[ctx.actor])).rows[0]:null;const rows=(await c.query('SELECT * FROM operations_lab.teams WHERE $1::boolean OR id=$2::uuid ORDER BY created_at DESC,id DESC',[!privateView,membership?.team_id||null])).rows;return rows.map(row=>item(row,privateView?ctx:null,membership));}
module.exports={mutate,state,item};
