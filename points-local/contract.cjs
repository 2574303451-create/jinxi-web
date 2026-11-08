class PointsError extends Error{constructor(status,code){super(code);this.status=status;this.code=code;}}
const fail=(status,code)=>{throw new PointsError(status,code);};
function uuid(value){if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value))fail(400,'INVALID_IDENTIFIER');return value.toLowerCase();}
function integer(value,min=1,max=1000000){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)fail(400,'INVALID_INTEGER');return value;}
function fields(body,allowed){if(Object.keys(body).some(k=>!['op','requestId',...allowed].includes(k)))fail(403,'CLIENT_AUTHORITY_REJECTED');}
function instant(value){if(typeof value!=='string'||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)fail(400,'INVALID_INSTANT');return value;}
function readOptions(query){
 const view=query.view||'self',allowed=view==='board'?['view','metric','limit','cursor']:['view','limit','beforeLedger','beforeOrders'];if(Object.keys(query).some(k=>!allowed.includes(k)))fail(403,'CLIENT_AUTHORITY_REJECTED');if(!['self','board','admin'].includes(view))fail(400,'INVALID_VIEW');
 let limit=20;if(query.limit!==undefined){if(typeof query.limit!=='string'||!/^\d{1,2}$/.test(query.limit)||Number(query.limit)<1||Number(query.limit)>50)fail(400,'INVALID_LIMIT');limit=Number(query.limit);}
 for(const key of ['beforeLedger','beforeOrders'])if(query[key]!==undefined&&(typeof query[key]!=='string'||!/^\d{1,13}$/.test(query[key])||BigInt(query[key])<1n||BigInt(query[key])>9000000000000n))fail(400,'INVALID_CURSOR');
 const metric=query.metric||'earned';if(!['earned','balance'].includes(metric))fail(400,'INVALID_METRIC');if(query.cursor!==undefined&&(typeof query.cursor!=='string'||!/^[A-Za-z0-9_-]{1,512}$/.test(query.cursor)))fail(400,'INVALID_CURSOR');
 return {...query,view,limit,metric};
}
module.exports={PointsError,fail,uuid,integer,fields,instant,readOptions};
