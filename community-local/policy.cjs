class CommunityError extends Error{constructor(status,code){super(code);this.status=status;this.code=code;}}
const fail=(status,code)=>{throw new CommunityError(status,code);};
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
function text(value,max,empty=false){
 if(typeof value!=='string'||value.length>max||(!empty&&!value.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)||/<\s*\/?\s*[a-z!]/i.test(value))fail(400,'INVALID_TEXT');
 return value.trim();
}
const categories=['PVP','PVE','新手向/老玩家回归','装备','战力系统','副本','活动','其他'];
const fixtures={image:['/fixtures/community-cover.jpg'],video:['/fixtures/community-demo.mp4']};
function mediaUrl(value,type){if(typeof value!=='string'||!fixtures[type]?.includes(value))fail(400,'UNTRUSTED_MEDIA');return value;}
function media(value){
 if(!Array.isArray(value)||value.length>10)fail(400,'INVALID_MEDIA');
 return value.map(m=>{
  if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).some(k=>!['id','type','url','thumbnail','title','description','duration','size','uploadedAt','playbackMode'].includes(k)))fail(400,'INVALID_MEDIA');
  const result={id:text(m.id,64),type:m.type,url:mediaUrl(m.url,m.type),title:text(m.title,100)};
  if(m.thumbnail!==undefined)result.thumbnail=mediaUrl(m.thumbnail,'image');
  if(m.description!==undefined)result.description=text(m.description,500,true);
  if(m.duration!==undefined){if(m.type!=='video'||!/^\d{1,3}:[0-5]\d$/.test(m.duration))fail(400,'INVALID_MEDIA');result.duration=m.duration;}
  if(m.size!==undefined){if(!Number.isSafeInteger(m.size)||m.size<0||m.size>52428800)fail(400,'INVALID_MEDIA');result.size=m.size;}
  if(m.uploadedAt!==undefined){if(typeof m.uploadedAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(m.uploadedAt)||!Number.isFinite(Date.parse(m.uploadedAt)))fail(400,'INVALID_MEDIA');result.uploadedAt=m.uploadedAt;}
  if(m.playbackMode!==undefined){if(m.type!=='video'||!['embed','external'].includes(m.playbackMode))fail(400,'INVALID_MEDIA');result.playbackMode=m.playbackMode;}
  return result;
 });
}
function payload(body,kind){
 const result={content:text(body.content,kind==='message'?1000:10000),category:kind==='message'?text(body.category??'闲聊',30):body.category};
 if(kind==='message'){if(!/^#[a-f0-9]{6}$/i.test(body.color??'#2360f5'))fail(400,'INVALID_COLOR');result.color=body.color??'#2360f5';}
 else{
  if(!categories.includes(body.category)||!Number.isInteger(body.difficulty)||body.difficulty<1||body.difficulty>5||!Array.isArray(body.tags)||body.tags.length>10)fail(400,'INVALID_GUIDE');
  result.title=text(body.title,100);result.difficulty=body.difficulty;result.tags=body.tags.map(t=>text(t,20));result.mediaFiles=media(body.mediaFiles??[]);
 }
 if(body.imageUrl!==undefined&&body.imageUrl!==null&&body.imageUrl!=='')result.imageUrl=mediaUrl(body.imageUrl,'image');
 if(Buffer.byteLength(JSON.stringify(result))>32768)fail(400,'CONTENT_PAYLOAD_TOO_LARGE');
 return result;
}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
module.exports={CommunityError,fail,uuid,text,payload,media,canonical,fixtures};
