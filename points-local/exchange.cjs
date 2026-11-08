const {fail,uuid,integer,fields,instant}=require('./contract.cjs');
const money=require('./store.cjs');
async function move(c,itemId,orderId,kind,quantity){
 await c.query('INSERT INTO points_lab.inventory(order_id,item_id,kind,quantity) VALUES($1,$2,$3,$4)',[orderId,itemId,kind,quantity]);
 await c.query('UPDATE points_lab.catalogue SET available=available+$2 WHERE id=$1',[itemId,kind==='reserve'?-quantity:quantity]);
}
async function redeem(c,ctx,body){
 fields(body,['itemId','quantity']);const itemId=uuid(body.itemId),quantity=integer(body.quantity,1,5);await money.ensure(c,ctx.actor);await money.reconcile(c,ctx.actor);
 await c.query('SELECT id FROM points_lab.catalogue WHERE id=$1 FOR UPDATE',[itemId]);
 const item=(await c.query('SELECT *,starts_at<=attendance_lab.business_now() AND ends_at>attendance_lab.business_now() AS live FROM points_lab.catalogue WHERE id=$1',[itemId])).rows[0];if(!item||item.status!=='enabled'||!item.live)fail(409,'ITEM_NOT_AVAILABLE');if(item.available<quantity)fail(409,'STOCK_LIMIT');
 const used=(await c.query("SELECT COALESCE(sum(quantity),0)::int AS n FROM points_lab.orders WHERE member_id=$1 AND item_id=$2 AND status IN('pending','fulfilled')",[ctx.actor,itemId])).rows[0].n;if(used+quantity>item.per_member_limit)fail(409,'MEMBER_LIMIT');
 const account=(await c.query('SELECT earned-reversed AS net,balance FROM points_lab.accounts WHERE member_id=$1',[ctx.actor])).rows[0];if(BigInt(account.net)<BigInt(item.min_earned))fail(409,'ITEM_CONDITION');const cost=(BigInt(item.unit_cost)*BigInt(quantity)).toString();if(BigInt(account.balance)<BigInt(cost))fail(409,'INSUFFICIENT_BALANCE');
 const order=(await c.query('INSERT INTO points_lab.orders(member_id,item_id,quantity,unit_cost,cost) VALUES($1,$2,$3,$4,$5) RETURNING id',[ctx.actor,itemId,quantity,item.unit_cost,cost])).rows[0];
 const charge=await money.post(c,ctx.actor,'redeem',cost,{bizId:'redeem:'+order.id,orderId:order.id});await c.query('UPDATE points_lab.orders SET charge_id=$2 WHERE id=$1',[order.id,charge]);await move(c,itemId,order.id,'reserve',quantity);return {orderId:order.id,ledgerId:charge,amount:cost,status:'pending',outcome:'redeemed'};
}
async function processOrder(c,ctx,body){
 fields(body,body.op==='order.cancel'?['orderId']:['orderId','status']);const id=uuid(body.orderId),own=body.op==='order.cancel';if(!own&&!ctx.admin)fail(403,'ADMIN_REQUIRED');if(!own)ctx.requiredAdmin=true;
 const target=own?'cancelled':body.status;if(!['cancelled','failed','fulfilled'].includes(target)||!own&&target==='cancelled')fail(400,'INVALID_ORDER_STATUS');
 await c.query('SELECT id FROM points_lab.orders WHERE id=$1 FOR UPDATE',[id]);const order=(await c.query('SELECT * FROM points_lab.orders WHERE id=$1',[id])).rows[0];if(!order||own&&order.member_id!==ctx.actor)fail(403,'ORDER_NOT_AVAILABLE');
 if(order.status!=='pending'){if(order.status!==target)fail(409,'ORDER_CLOSED');return {orderId:id,status:order.status,amount:order.cost,outcome:'already_processed'};}
 await money.reconcile(c,order.member_id);await c.query('UPDATE points_lab.orders SET status=$2 WHERE id=$1',[id,target]);let ledgerId=order.charge_id;
 if(target!=='fulfilled'){
  ledgerId=await money.post(c,order.member_id,'refund',order.cost,{bizId:'refund:'+id,orderId:id,originId:order.charge_id});await move(c,order.item_id,id,'release',order.quantity);
 }
 return {orderId:id,status:target,ledgerId,amount:order.cost,outcome:'order_processed'};
}
async function reverse(c,ctx,body){
 if(!ctx.admin)fail(403,'ADMIN_REQUIRED');ctx.requiredAdmin=true;fields(body,['ledgerId']);const id=uuid(body.ledgerId),original=(await c.query('SELECT * FROM points_lab.ledger WHERE id=$1',[id])).rows[0];if(!original||original.kind!=='award')fail(409,'REVERSAL_NOT_AVAILABLE');
 const prior=(await c.query("SELECT id FROM points_lab.ledger WHERE origin_id=$1 AND kind='reversal'",[id])).rows[0];if(prior)return {ledgerId:prior.id,originId:id,amount:original.point_delta,outcome:'already_reversed'};
 const ledgerId=await money.post(c,original.member_id,'reversal',original.point_delta,{bizId:'reversal:'+id,originId:id,eventId:original.event_id,ruleId:original.rule_id});return {ledgerId,originId:id,amount:original.point_delta,outcome:'reversed'};
}
async function catalogue(c,ctx,body){
 if(!ctx.admin)fail(403,'ADMIN_REQUIRED');ctx.requiredAdmin=true;
 if(body.op==='catalogue.status'){
  fields(body,['itemId','status']);const id=uuid(body.itemId);if(!['enabled','disabled'].includes(body.status))fail(400,'INVALID_ITEM_STATUS');const row=(await c.query('UPDATE points_lab.catalogue SET status=$2 WHERE id=$1 RETURNING id',[id,body.status])).rows[0];if(!row)fail(404,'ITEM_NOT_FOUND');return {itemId:id,status:body.status,outcome:'item_status_set'};
 }
 fields(body,['name','unitCost','stock','perMemberLimit','minEarned','startsAt','endsAt','status']);if(typeof body.name!=='string')fail(400,'INVALID_NAME');const name=body.name.normalize('NFC').trim();if(name.length<1||name.length>60||/[<>\u0000-\u001f\u007f]/.test(name))fail(400,'INVALID_NAME');
 const cost=integer(body.unitCost),stock=integer(body.stock),perMember=integer(body.perMemberLimit),min=integer(body.minEarned,0,9000000000000),start=instant(body.startsAt),end=instant(body.endsAt);if(Date.parse(start)>=Date.parse(end)||!['enabled','disabled'].includes(body.status))fail(400,'INVALID_ITEM');
 const row=(await c.query('INSERT INTO points_lab.catalogue(name,unit_cost,stock_total,available,per_member_limit,min_earned,starts_at,ends_at,status) VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8) RETURNING id',[name,cost,stock,perMember,String(min),start,end,body.status])).rows[0];return {itemId:row.id,outcome:'item_created'};
}
module.exports={redeem,processOrder,reverse,catalogue};
