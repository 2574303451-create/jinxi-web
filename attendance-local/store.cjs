class AttendanceError extends Error{constructor(status,code){super(code);this.status=status;this.code=code;}}
const fail=(status,code)=>{throw new AttendanceError(status,code);};
function options(query){
 const value={limit:30,month:null,before:null};
 if(query.month!==undefined){if(typeof query.month!=='string'||!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(query.month))fail(400,'INVALID_PERIOD');value.month=query.month;}
 if(query.before!==undefined){if(typeof query.before!=='string'||!/^(19|20|21)\d{2}-\d\d-\d\d$/.test(query.before)||!Number.isFinite(Date.parse(query.before+'T00:00:00.000Z'))||new Date(query.before+'T00:00:00.000Z').toISOString().slice(0,10)!==query.before)fail(400,'INVALID_CURSOR');value.before=query.before;}
 if(query.limit!==undefined){if(typeof query.limit!=='string'||!/^\d{1,3}$/.test(query.limit)||Number(query.limit)<1||Number(query.limit)>100)fail(400,'INVALID_LIMIT');value.limit=Number(query.limit);}
 return value;
}
const STREAKS=`WITH sequenced AS (SELECT r.*,business_date-row_number() OVER(ORDER BY business_date)::int AS run_key FROM attendance_lab.records r WHERE member_id=$1),
 numbered AS (SELECT *,row_number() OVER(PARTITION BY run_key ORDER BY business_date)::int AS continuous FROM sequenced)`;
async function moment(c){
 const r=(await c.query("SELECT attendance_lab.business_now() AS at,(attendance_lab.business_now() AT TIME ZONE 'Asia/Shanghai')::date::text AS today")).rows[0];
 if(!r?.at||!Number.isFinite(new Date(r.at).getTime())||!/^\d{4}-\d\d-\d\d$/.test(r.today))fail(503,'ATTENDANCE_UNAVAILABLE');return r;
}
async function healthy(c,actor,today){
 const r=(await c.query('SELECT EXISTS(SELECT 1 FROM attendance_lab.records r WHERE member_id=$1 AND (business_date>$2::date OR NOT EXISTS(SELECT 1 FROM attendance_lab.reward_events e WHERE e.record_id=r.id AND e.member_id=r.member_id))) AS bad',[actor,today])).rows[0];
 if(r.bad)fail(503,'ATTENDANCE_UNAVAILABLE');
}
async function state(c,actor,m,query={}){
 await healthy(c,actor,m.today);
 const month=query.month||m.today.slice(0,7),limit=query.limit||30;
 const stats=(await c.query(STREAKS+` SELECT count(*)::int AS total_days,COALESCE(max(continuous),0) AS longest_streak,
 COALESCE((SELECT continuous FROM numbered WHERE business_date IN($2::date,$2::date-1) ORDER BY business_date DESC LIMIT 1),0) AS current_streak,
 COALESCE(bool_or(business_date=$2::date),false) AS has_today,min(business_date)::text AS first_date,max(business_date)::text AS last_date,
 count(*) FILTER(WHERE to_char(business_date,'YYYY-MM')=$3)::int AS month_days,
 COALESCE(jsonb_agg(business_date::text ORDER BY business_date) FILTER(WHERE to_char(business_date,'YYYY-MM')=$3),'[]'::jsonb) AS month_dates FROM numbered`,[actor,m.today,month])).rows[0];
 const all=(await c.query(STREAKS+` SELECT n.id,n.business_date::text AS day,n.signed_at,n.created_at,n.continuous,e.event_id
 FROM numbered n JOIN attendance_lab.reward_events e ON e.record_id=n.id AND e.member_id=n.member_id
 WHERE ($2::date IS NULL OR n.business_date<$2::date) ORDER BY n.business_date DESC LIMIT $3`,[actor,query.before||null,limit+1])).rows;
 const records=all.slice(0,limit);
 return {memberId:actor,today:m.today,businessTimeZone:'Asia/Shanghai',hasCheckedToday:stats.has_today,rewardStatus:'unsettled',rewardPoints:null,
 stats:{totalDays:stats.total_days,currentStreak:stats.current_streak,longestStreak:stats.longest_streak,firstDate:stats.first_date,lastDate:stats.last_date,month,monthDays:stats.month_days,monthDates:stats.month_dates},
 history:records.map(r=>({id:r.id,businessDate:r.day,signedAt:r.signed_at,createdAt:r.created_at,continuousDays:r.continuous,isContinuous:r.continuous>1,rewardEventId:r.event_id,rewardStatus:'unsettled',rewardPoints:null})),nextBefore:all.length>limit?records.at(-1).day:null};
}
async function checkin(c,actor,requestId){
 const prior=(await c.query('SELECT r.business_date::text AS day,q.record_id FROM attendance_lab.requests q JOIN attendance_lab.records r ON r.id=q.record_id AND r.member_id=q.member_id WHERE q.member_id=$1 AND q.request_id=$2',[actor,requestId])).rows[0];
 if(prior){const m=await moment(c);return {...await state(c,actor,m),checkedDate:prior.day,recordId:prior.record_id,outcome:'replayed'};}
 const r=(await c.query(`WITH instant AS MATERIALIZED (SELECT attendance_lab.business_now() AS at),
 current_day AS (SELECT at,(at AT TIME ZONE 'Asia/Shanghai')::date AS today FROM instant),
 inserted AS (INSERT INTO attendance_lab.records(member_id) SELECT $1 FROM current_day WHERE NOT EXISTS(SELECT 1 FROM attendance_lab.records WHERE member_id=$1 AND business_date>current_day.today) ON CONFLICT(member_id,business_date) DO NOTHING RETURNING id,business_date),
 chosen AS (SELECT id,business_date,true AS created FROM inserted UNION ALL SELECT r.id,r.business_date,false FROM attendance_lab.records r,current_day d WHERE r.member_id=$1 AND r.business_date=d.today AND NOT EXISTS(SELECT 1 FROM inserted))
 SELECT d.at,d.today::text AS today,x.id,x.business_date::text AS day,x.created FROM current_day d LEFT JOIN chosen x ON true`,[actor])).rows[0];
 if(!r?.id)fail(503,'ATTENDANCE_UNAVAILABLE');
 if(r.created)await c.query('INSERT INTO attendance_lab.reward_events(record_id,member_id) VALUES($1,$2)',[r.id,actor]);
 await c.query('INSERT INTO attendance_lab.requests(member_id,request_id,record_id) VALUES($1,$2,$3)',[actor,requestId,r.id]);
 return {...await state(c,actor,r),checkedDate:r.day,recordId:r.id,outcome:r.created?'checked':'already_checked'};
}
module.exports={AttendanceError,fail,options,moment,state,checkin};
