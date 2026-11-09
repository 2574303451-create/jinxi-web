// Only pseudonymous operation metadata. Never payloads, credentials, CSRF or results.
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const modules=['community','attendance','points','operations'];
const TTL=7*86400000,CONFIRMED_TTL=30*86400000,MAX=512;
function valid(row){return row&&Object.keys(row).every(k=>['v','key','actor','module','op','digest','id','createdAt','expiresAt','state'].includes(k))&&row.v===1&&uuid(row.actor)&&uuid(row.id)&&modules.includes(row.module)&&/^[a-z]+(?:\.[a-z]+)*$/.test(row.op||'')&&/^[a-f0-9]{64}$/.test(row.digest||'')&&row.key===row.actor+':'+row.module+':'+row.digest&&['pending','unknown','confirmed','rejected'].includes(row.state)&&Number.isSafeInteger(row.createdAt)&&row.expiresAt===row.createdAt+TTL;}
function unavailable(){const e=Error('RECOVERY_STORAGE_UNAVAILABLE');e.code=e.message;return e;}
function createJournal({indexedDB=globalThis.indexedDB,clock=()=>Date.now(),name='jinxi-operation-receipts-v1'}={}){
 let opened;
 async function database(){
  if(!indexedDB)throw unavailable();
  if(!opened)opened=new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('intents',{keyPath:'key'});r.onerror=()=>{opened=null;reject(unavailable());};r.onblocked=()=>{opened=null;reject(unavailable());};r.onsuccess=()=>{const db=r.result;db.onversionchange=()=>{db.close();opened=null;};resolve(db);};});
  return opened;
 }
 async function transaction(mode,action){
  const db=await database();return new Promise((resolve,reject)=>{let result,failed=false;const tx=db.transaction('intents',mode),store=tx.objectStore('intents');tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(unavailable());
   try{action(store,v=>{result=v;},()=>{failed=true;tx.abort();});}catch{if(!failed)tx.abort();}
  });
 }
 return {
  claim:input=>transaction('readwrite',(store,done,abort)=>{
   const now=clock(),row={v:1,...input,key:input.actor+':'+input.module+':'+input.digest,createdAt:now,expiresAt:now+TTL,state:'pending'};if(!valid(row))return abort();
   const get=store.get(row.key);get.onsuccess=()=>{if(get.result){if(!valid(get.result))return abort();done({...get.result,fresh:false});return;}
    const count=store.count();count.onsuccess=()=>{if(count.result>=MAX)return abort();store.add(row);done({...row,fresh:true});};};
  }),
  mark:(key,id,state)=>transaction('readwrite',(store,done,abort)=>{
   if(!['unknown','confirmed','rejected'].includes(state))return abort();const get=store.get(key);get.onsuccess=()=>{const row=get.result;if(!valid(row)||row.id!==id)return abort();if(row.state!=='confirmed'&&!(row.state==='unknown'&&state==='rejected')){row.state=state;store.put(row);}done(row);};
  }),
  list:actor=>transaction('readonly',(store,done,abort)=>{
   if(!uuid(actor))return abort();const get=store.getAll();get.onsuccess=()=>{if(get.result.length>MAX||get.result.some(r=>!valid(r)))return abort();done(get.result.filter(r=>r.actor===actor).map(r=>({...r,expired:clock()>r.expiresAt})));};
  }),
  forget:(key,id)=>transaction('readwrite',(store,done,abort)=>{const get=store.get(key);get.onsuccess=()=>{const row=get.result;if(!valid(row)||row.id!==id||row.state!=='confirmed')return abort();store.delete(key);done(true);};}),
  close:async()=>{const db=opened&&await opened;db?.close();opened=null;},
 };
}
module.exports={createJournal,TTL,CONFIRMED_TTL,valid};
