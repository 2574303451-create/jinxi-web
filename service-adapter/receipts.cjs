// Run only INSIDE the existing handler's verified, locked, finally re-authorized transaction.
const tables={community:['community_lab.requests','member_id'],attendance:['attendance_lab.requests','member_id'],points:['points_lab.requests','actor_id'],operations:['operations_lab.requests','actor_id']};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
function recoveryQuery(query){return Object.hasOwn(query,'receipt')&&Object.keys(query).length===1&&uuid(query.receipt);}
async function receipt(c,module,actor,id){
 const [table,column]=tables[module];const row=(await c.query('SELECT request_id FROM '+table+' WHERE '+column+'=$1 AND request_id=$2'+(module==='community'?' AND response IS NOT NULL':''),[actor,id])).rows[0];
 // Absence is never proof of failure: another transaction may still be in flight.
 return {memberId:actor,receipt:{requestId:id,state:row?'committed':'unresolved'}};
}
module.exports={recoveryQuery,receipt};
