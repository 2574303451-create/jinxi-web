const {fail,uuid,integer,instant,fields}=require('./contract.cjs');
async function mutateRule(c,ctx,body){
 if(!ctx.admin)fail(403,'ADMIN_REQUIRED');ctx.requiredAdmin=true;
 if(body.op==='rule.create'){
  fields(body,['code','version','rewards','dailyCap','totalCap','startsAt','endsAt','status']);if(typeof body.code!=='string'||!/^SYNTHETIC\.[a-z0-9_.-]{1,48}$/.test(body.code)||!Array.isArray(body.rewards)||body.rewards.length!==3)fail(400,'INVALID_RULE');
  const version=integer(body.version),rewards=body.rewards.map(n=>integer(n)),daily=integer(body.dailyCap,1,9000000000000),total=integer(body.totalCap,1,9000000000000),start=instant(body.startsAt),end=instant(body.endsAt);
  if(Date.parse(start)>=Date.parse(end)||!['draft','enabled','disabled'].includes(body.status))fail(400,'INVALID_RULE');
  const next=(await c.query('SELECT COALESCE(max(version),0)+1 AS n FROM points_lab.rules WHERE code=$1',[body.code])).rows[0].n;if(version!==next)fail(409,'RULE_VERSION_CONFLICT');
  const row=(await c.query('INSERT INTO points_lab.rules(code,version,day1,day3,day7,daily_cap,total_cap,starts_at,ends_at,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',[body.code,version,...rewards,String(daily),String(total),start,end,body.status])).rows[0];return {ruleId:row.id,outcome:'rule_created'};
 }
 fields(body,['ruleId','status']);const ruleId=uuid(body.ruleId);if(!['draft','enabled','disabled'].includes(body.status))fail(400,'INVALID_RULE_STATUS');
 const row=(await c.query('UPDATE points_lab.rules SET status=$2 WHERE id=$1 RETURNING id',[ruleId,body.status])).rows[0];if(!row)fail(404,'RULE_NOT_FOUND');return {ruleId,status:body.status,outcome:'rule_status_set'};
}
module.exports={mutateRule};
