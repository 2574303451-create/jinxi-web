-- Synthetic-only fixtures. No usable password, password hash or session token.
-- Every account starts with a non-hash marker. Local tests provision random
-- ephemeral credentials in memory; cloud sessions remain disabled.
BEGIN;
SET LOCAL statement_timeout='5000ms';
DO $guard$
DECLARE r record; n bigint; obj record;
BEGIN
  SELECT * INTO STRICT r FROM jinxi_guard.environment_registration WHERE id=1;
  IF current_database()<>'neondb' OR r.classification<>'synthetic-test' OR r.seed_version<>0
    OR r.initializer<>session_user OR session_user<>current_user
    OR current_setting('jinxi_test.approval',true) IS DISTINCT FROM 'synthetic-test-v1'
    OR current_setting('jinxi_test.environment_id',true) IS DISTINCT FROM r.environment_id::text
    OR current_setting('jinxi_test.expected_cluster_id',true) IS DISTINCT FROM r.cluster_id
    OR current_setting('jinxi_test.expected_database_oid',true) IS DISTINCT FROM r.database_oid
    OR current_setting('jinxi_test.project_id',true) IS DISTINCT FROM r.project_id
    OR current_setting('jinxi_test.branch_id',true) IS DISTINCT FROM r.branch_id
    OR current_setting('jinxi_test.endpoint_id',true) IS DISTINCT FROM r.endpoint_id
    OR r.cluster_id<>(SELECT system_identifier::text FROM pg_control_system())
    OR r.database_oid<>(SELECT oid::text FROM pg_database WHERE datname=current_database())
    THEN RAISE EXCEPTION 'TEST_SEED_TARGET_OR_VERSION_REJECTED'; END IF;
  FOR obj IN SELECT nspname,relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','b2_lab') AND c.relkind='r' LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I',obj.nspname,obj.relname) INTO n;
    IF n<>0 THEN RAISE EXCEPTION 'TEST_SEED_REQUIRES_EMPTY_OWNED_TABLES'; END IF;
  END LOOP;
END $guard$;
INSERT INTO b2_lab.guild_member_profiles(employee_no,member_id,display_name,nickname,is_active,source) VALUES
 ('B2-LAB-TEST-A','00000000-0000-4000-8000-000000000001','合成伙伴甲','合成同昵称',true,'synthetic-b2-lab'),
 ('B2-LAB-TEST-B','00000000-0000-4000-8000-000000000002','合成伙伴乙','合成同昵称',true,'synthetic-b2-lab'),
 ('B2-LAB-TEST-LOCKED','00000000-0000-4000-8000-000000000003','合成锁定账号','合成锁定伙伴',true,'synthetic-b2-lab'),
 ('B2-LAB-TEST-INACTIVE','00000000-0000-4000-8000-000000000004','合成停用账号','合成停用伙伴',false,'synthetic-b2-lab');
INSERT INTO b2_lab.guild_member_accounts(id,employee_no,login_account,is_locked,created_at) VALUES
 (1,'B2-LAB-TEST-A','b2-lab-a',false,'2026-11-01T00:00:00Z'),
 (2,'B2-LAB-TEST-B','b2-lab-b',false,'2026-11-01T00:00:00Z'),
 (3,'B2-LAB-TEST-LOCKED','b2-lab-locked',true,'2026-11-01T00:00:00Z'),
 (4,'B2-LAB-TEST-INACTIVE','b2-lab-inactive',false,'2026-11-01T00:00:00Z');
INSERT INTO b2_lab.point_rule VALUES('lab.checkin',10,true);
INSERT INTO b2_lab.point_catalog VALUES('lab-paper-token',7,true);
INSERT INTO b2_lab.point_account VALUES
 ('00000000-0000-4000-8000-000000000001',3,10,7),
 ('00000000-0000-4000-8000-000000000002',0,0,0);
INSERT INTO b2_lab.point_ledger(member_id,biz_key,kind,item_code,amount,balance_after,created_at) VALUES
 ('00000000-0000-4000-8000-000000000001','fixture.checkin:2026-11-01','checkin',NULL,10,10,'2026-11-01T00:00:00Z'),
 ('00000000-0000-4000-8000-000000000001','fixture.redeem:paper-token','redeem','lab-paper-token',7,3,'2026-11-01T00:01:00Z');
INSERT INTO b2_lab.checkin_records VALUES('00000000-0000-4000-8000-000000000001','2026-11-01','2026-11-01T00:00:00Z');
INSERT INTO public.messages VALUES
 (101,'【合成游客】','【TEST 合成留言】游客署名不是认证身份。','闲聊','#2360f5','[]',
  '[{"id":"synthetic-reply-1","name":"【合成回复】","content":"仅用于隔离验收。","timestamp":"2026-11-01T00:01:00Z"}]',false,NULL,'2026-11-01T00:00:00Z'),
 (102,'【合成伙伴甲】','【TEST 合成留言】不关联真实成员。','攻略','#2360f5','[]','[]',true,NULL,'2026-11-01T01:00:00Z');
INSERT INTO public.announcements VALUES(101,'【TEST 合成公告】','<p>本页为隔离合成数据，账号及内容均非生产。</p><img src="/placeholder.jpg" alt="合成图片占位">','合成管理员','2026-11-01T00:00:00Z','2026-11-01T00:00:00Z');
INSERT INTO public.guild_sponsorship_entries VALUES(101,'【TEST 合成赞助记录】','2026-11-01T00:00:00Z','2026-11-01T00:00:00Z');
INSERT INTO public.strategies(id,title,content,author,category,is_pinned,image_url,media_files,status,created_at,updated_at) VALUES
 (101,'【TEST】最新合成文字攻略','仅用于测试 latest 筛选。','合成作者','PVE',false,NULL,'[]','published','2026-11-05T00:00:00Z','2026-11-05T00:00:00Z'),
 (102,'【TEST】视频附件与失败回退','附件为故意不可播放的本站测试路径；合法 URL 不代表实际可播放。','合成作者','PVE',false,NULL,
  '[{"id":"synthetic-video","type":"video","url":"/test-fixtures/intentionally-missing.mp4","thumbnail":"/placeholder.jpg","playbackMode":"native"}]','published','2026-11-04T00:00:00Z','2026-11-04T00:00:00Z'),
 (103,'【TEST】置顶合成攻略','仅用于测试 pinned 筛选。','合成作者','其他',true,'/placeholder.jpg','[]','published','2026-11-03T00:00:00Z','2026-11-03T00:00:00Z'),
 (104,'【TEST】不可公开的合成草稿','公开列表和统计必须排除。','合成作者','其他',false,NULL,'[{"type":"video","url":"/test-fixtures/hidden.mp4"}]','draft','2026-11-06T00:00:00Z','2026-11-06T00:00:00Z'),
 (105,'【TEST】历史 null 附件','仅用于读取兼容测试。','合成作者','其他',false,NULL,'null','published','2026-11-02T00:00:00Z','2026-11-02T00:00:00Z');
UPDATE jinxi_guard.environment_registration SET seed_version=1 WHERE id=1;
COMMIT;
