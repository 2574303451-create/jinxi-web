const {test}=require('node:test'),assert=require('node:assert/strict');
const {connect,adapter}=require('./support/postgres.cjs');
const {readStrategies}=require('../netlify/functions/_shared/strategy-read');
test('actual PG: thumbnail-only video cover is real, safe and lower priority than images',async()=>{
 const admin=await connect('admin'),reader=await connect();
 const cases=[
  [80,null,[{type:'video',url:'/guides-media/thumbnail-only.mp4',thumbnail:'/14.png'}],'/14.png'],
  [81,null,[{type:'video',url:'/guides-media/thumbnail-only.mp4',thumbnail:'javascript:alert(1)'}],null],
  [82,'/bg.png',[{type:'video',url:'/guides-media/thumbnail-only.mp4',thumbnail:'/14.png'}],'/bg.png'],
  [83,null,[{type:'video',url:'/guides-media/thumbnail-only.mp4',thumbnail:'/14.png'},{type:'image',url:'/13.png'}],'/13.png'],
 ];
 try{
  const existing=await admin.query('SELECT id FROM strategies WHERE id BETWEEN 80 AND 83');assert.equal(existing.rowCount,0,'Dedicated fixture IDs must be free');
  for(const [id,cover,media]of cases)await admin.query("INSERT INTO strategies(id,title,content,author,category,status,image_url,media_files,created_at) VALUES($1::int,'thumbnail-only-isolated-'||($1::int)::text,'隔离缩略图样本','隔离署名','PVE','published',$2,$3::jsonb,NOW())",[id,cover,JSON.stringify(media)]);
  const result=await readStrategies(adapter(reader),{summary:'1',search:'thumbnail-only-isolated',limit:'12'});
  for(const [id,,,expected]of cases){const row=result.body.strategies.find(x=>x.id===String(id));assert.equal(row.imageUrl,expected,String(id));assert.equal(row.videoCount,1);assert.equal('mediaFiles'in row,false)}
 }finally{await admin.query("DELETE FROM strategies WHERE id BETWEEN 80 AND 83 AND title LIKE 'thumbnail-only-isolated-%'");await reader.end();await admin.end()}
});
