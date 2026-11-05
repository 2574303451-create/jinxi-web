const {connect}=require('./postgres.cjs');
async function seedPublic(){
 const c=await connect('admin');try{
  for(const name of ['messages','announcements','guild_sponsorship_entries']){const old=await c.query('SELECT pg_get_userbyid(relowner) AS owner FROM pg_class WHERE oid=to_regclass($1)',['public.'+name]);if(old.rowCount&&old.rows[0].owner!=='jinxi_b2_owner')throw Error('Refusing existing non-B2 fixture table '+name)}
  await c.query(`CREATE TABLE IF NOT EXISTS public.messages(id int PRIMARY KEY,name text,content text,category text,color text,reactions jsonb,replies jsonb,is_pinned bool,image_url text,created_at timestamptz);
   CREATE TABLE IF NOT EXISTS public.announcements(id int PRIMARY KEY,title text,content_html text,author text,created_at timestamptz,updated_at timestamptz);
   CREATE TABLE IF NOT EXISTS public.guild_sponsorship_entries(id int PRIMARY KEY,sponsor_name text,sponsor_time timestamptz,created_at timestamptz);
   ALTER TABLE public.messages OWNER TO jinxi_b2_owner;ALTER TABLE public.announcements OWNER TO jinxi_b2_owner;ALTER TABLE public.guild_sponsorship_entries OWNER TO jinxi_b2_owner;
   GRANT SELECT ON public.messages,public.announcements,public.guild_sponsorship_entries TO jinxi_b2_reader;
   TRUNCATE public.messages,public.announcements,public.guild_sponsorship_entries;`);
  for(let i=1;i<=12;i++)await c.query("INSERT INTO messages VALUES($1,$2,$3,'闲聊','#2360f5','[]','[]',false,NULL,'2026-11-05T00:00:00Z')",[9100+i,'合成伙伴'+i,'【本机合成留言】安全基础回归样本'+i]);
  await c.query("INSERT INTO announcements VALUES(9101,'【本机合成公告】','<p>仅供隔离测试，无真实成员内容。</p>','合成公告作者','2026-11-05T00:00:00Z','2026-11-05T00:00:00Z');INSERT INTO guild_sponsorship_entries VALUES(9101,'合成赞助样本','2026-11-05T00:00:00Z','2026-11-05T00:00:00Z')");
 }finally{await c.end()}
}
module.exports={seedPublic};
