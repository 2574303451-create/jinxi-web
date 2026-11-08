const crypto=require('node:crypto'),{fail,uuid}=require('./contract.cjs');
async function board(c,query){
 const rows=(await c.query('SELECT public_id,net_earned,balance FROM points_lab.ranking WHERE listed AND points_lab.eligible(member_id) ORDER BY public_id')).rows;
 const revision=crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),column=query.metric==='balance'?'balance':'net_earned';
 const sorted=rows.filter(r=>BigInt(r[column])>0n).sort((a,b)=>BigInt(a[column])===BigInt(b[column])?(a.public_id<b.public_id?-1:a.public_id>b.public_id?1:0):(BigInt(a[column])>BigInt(b[column])?-1:1));let start=0;
 if(query.cursor){
  let cursor;try{cursor=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8'));}catch{fail(400,'INVALID_CURSOR');}
  if(!cursor||typeof cursor!=='object'||Array.isArray(cursor)||Object.keys(cursor).some(k=>!['v','metric','revision','score','id'].includes(k))||cursor.v!==1||cursor.metric!==query.metric||typeof cursor.score!=='string'||!/^\d{1,13}$/.test(cursor.score))fail(400,'INVALID_CURSOR');uuid(cursor.id);
  if(cursor.revision!==revision)fail(409,'RANK_CHANGED');const at=sorted.findIndex(r=>r.public_id===cursor.id&&r[column]===cursor.score);if(at<0)fail(400,'INVALID_CURSOR');start=at+1;
 }
 const page=sorted.slice(start,start+query.limit),last=page.at(-1),nextCursor=start+page.length<sorted.length&&last?Buffer.from(JSON.stringify({v:1,metric:query.metric,revision,score:last[column],id:last.public_id})).toString('base64url'):null;
 return {metric:query.metric,revision,entries:page.map((r,i)=>({position:start+i+1,publicId:r.public_id,label:'合成成员 '+r.public_id.slice(0,8),score:r[column]})),nextCursor};
}
module.exports={board};
