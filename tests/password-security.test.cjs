const {test}=require('node:test');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
test('password hashing is bounded, async and salted; malformed records never bypass verification',async()=>{
 const original=crypto.pbkdf2,calls=[];
 crypto.pbkdf2=(password,salt,iterations,length,digest,callback)=>{calls.push(iterations);return original(password,salt,iterations,length,digest,callback);};
 try{
  delete require.cache[require.resolve('../netlify/functions/_shared/password')];
  const p=require('../netlify/functions/_shared/password'),password=crypto.randomBytes(18).toString('base64url')+'A9!';
  const a=await p.hashPassword(password),b=await p.hashPassword(password);
  assert(a!==b,'Salts must differ');assert(await p.verifyPassword(password,a));assert.equal(await p.verifyPassword('incorrect',a),false);
  for(const bad of [null,'plaintext','pbkdf2_sha256$9999999999$'+'a'.repeat(32)+'$'+'0'.repeat(64),'pbkdf2_sha256$0$'+'a'.repeat(32)+'$'+'0'.repeat(64)])assert.equal(await p.verifyPassword(password,bad),false);
  // Synthetic encoding matching the old importer; never reads a member hash.
  const salt=crypto.randomBytes(16).toString('hex');
  const legacy=await new Promise((resolve,reject)=>{original(password,salt,200000,32,'sha256',(error,value)=>error?reject(error):resolve(value));});
  assert(await p.verifyPassword(password,['pbkdf2_sha256','200000',salt,legacy.toString('hex')].join('$')));
  assert.deepEqual(calls.slice(-2),[200000,400000]);assert(calls.every(n=>Number.isInteger(n)&&n>0&&n<=600000));
  assert(p.acceptablePassword(password));assert.equal(p.acceptablePassword('short1!'),false);
 }finally{crypto.pbkdf2=original;}
});
