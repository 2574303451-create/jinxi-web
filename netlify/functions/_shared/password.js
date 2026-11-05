const crypto=require('node:crypto'),{promisify}=require('node:util');
const derive=promisify(crypto.pbkdf2),ITERATIONS=600000;
async function hashPassword(value){const salt=crypto.randomBytes(16).toString('hex'),digest=await derive(value,salt,ITERATIONS,32,'sha256');return `pbkdf2_sha256$${ITERATIONS}$${salt}$${digest.toString('hex')}`;}
async function verifyPassword(value,encoded){
 const match=typeof encoded==='string'&&/^pbkdf2_sha256\$(\d+)\$([a-f0-9]{32})\$([a-f0-9]{64})$/i.exec(encoded),count=match?Number(match[1]):0,valid=Number.isSafeInteger(count)&&count>=100000&&count<=ITERATIONS;
 const work=valid?count:ITERATIONS,salt=valid?match[2]:'0'.repeat(32),actual=await derive(value,salt,work,32,'sha256');
 if(work<ITERATIONS)await derive(value,'bounded-verification-padding',ITERATIONS-work,32,'sha256');
 return !!valid&&crypto.timingSafeEqual(actual,Buffer.from(match[3],'hex'));
}
function acceptablePassword(value){return typeof value==='string'&&value.length>=12&&value.length<=128&&/[A-Za-z]/.test(value)&&/\d/.test(value)&&/[^A-Za-z0-9]/.test(value);}
module.exports={hashPassword,verifyPassword,acceptablePassword,ITERATIONS};
