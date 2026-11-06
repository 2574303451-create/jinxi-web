-- Read-only invariants; returns counts/status, never accounts, hashes or tokens.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
DO $verify$
DECLARE r record; actual_objects oid[]; actual_columns text;
BEGIN
  SELECT * INTO STRICT r FROM jinxi_guard.environment_registration WHERE id=1;
  IF current_database()<>'neondb' OR r.classification<>'synthetic-test' OR r.seed_version<>1
    OR current_setting('jinxi_test.environment_id',true) IS DISTINCT FROM r.environment_id::text
    OR r.cluster_id<>(SELECT system_identifier::text FROM pg_control_system())
    OR r.database_oid<>(SELECT oid::text FROM pg_database WHERE datname=current_database())
    THEN RAISE EXCEPTION 'TEST_VERIFICATION_TARGET_REJECTED'; END IF;
  SELECT array_agg(c.oid ORDER BY c.oid) INTO actual_objects FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','b2_lab','jinxi_guard');
  SELECT md5(string_agg(a.attrelid||':'||a.attnum||':'||a.attname||':'||a.atttypid||':'||a.attnotnull,',' ORDER BY a.attrelid,a.attnum)) INTO actual_columns FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','b2_lab','jinxi_guard') AND a.attnum>0 AND NOT a.attisdropped;
  IF actual_objects IS DISTINCT FROM r.created_objects OR actual_columns IS DISTINCT FROM r.columns_signature THEN
    RAISE EXCEPTION 'TEST_VERIFICATION_STRUCTURE_CHANGED'; END IF;
  IF (SELECT count(*) FROM b2_lab.guild_member_accounts)<>4
    OR (SELECT count(*) FROM b2_lab.guild_member_profiles)<>4
    OR EXISTS(SELECT 1 FROM b2_lab.guild_member_accounts a FULL JOIN b2_lab.guild_member_profiles p USING(employee_no) WHERE a.id IS NULL OR p.member_id IS NULL OR p.source<>'synthetic-b2-lab')
    OR (SELECT count(*) FROM b2_lab.guild_member_accounts WHERE is_locked)<>1
    OR (SELECT count(*) FROM b2_lab.guild_member_profiles WHERE NOT is_active)<>1
    OR EXISTS(SELECT 1 FROM b2_lab.point_account a WHERE a.balance<>a.total_earned-a.total_spent OR a.balance<0)
    OR EXISTS(SELECT 1 FROM b2_lab.point_account a WHERE a.balance<>(SELECT COALESCE(sum(CASE WHEN kind='checkin' THEN amount ELSE -amount END),0) FROM b2_lab.point_ledger l WHERE l.member_id=a.member_id))
    OR (SELECT count(*) FROM b2_lab.point_ledger)<>2
    OR (SELECT count(*) FROM b2_lab.checkin_records)<>1
    OR (SELECT count(*) FROM public.strategies WHERE status='published')<>4
    OR (SELECT count(*) FROM public.strategies WHERE status='draft')<>1
    OR EXISTS(SELECT 1 FROM public.strategies WHERE title NOT LIKE '【TEST】%')
    OR (SELECT count(*) FROM b2_lab.sessions)<>0
    THEN RAISE EXCEPTION 'SYNTHETIC_FIXTURE_INVARIANT_FAILED'; END IF;
END $verify$;
SELECT 'synthetic-test-v1' AS fixture,(SELECT count(*) FROM public.strategies) AS strategies,
  (SELECT count(*) FROM public.messages) AS messages,(SELECT count(*) FROM b2_lab.guild_member_accounts) AS synthetic_accounts,
  (SELECT count(*) FROM b2_lab.sessions) AS cloud_sessions;
ROLLBACK;
