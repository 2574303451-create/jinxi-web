-- Explicit object removal only, never CASCADE/DROP OWNED/TRUNCATE. Requires
-- identical registration, initializer, object OIDs and column/public ACL state.
BEGIN;
SET LOCAL statement_timeout='10000ms';
SET LOCAL lock_timeout='2000ms';
DO $guard$
DECLARE r record; actual_objects oid[]; actual_columns text;
BEGIN
  SELECT * INTO STRICT r FROM jinxi_guard.environment_registration WHERE id=1;
  IF current_database()<>'neondb' OR r.classification<>'synthetic-test'
    OR session_user<>current_user OR r.initializer<>session_user
    OR current_setting('jinxi_test.approval',true) IS DISTINCT FROM 'synthetic-test-v1'
    OR current_setting('jinxi_test.environment_id',true) IS DISTINCT FROM r.environment_id::text
    OR current_setting('jinxi_test.expected_cluster_id',true) IS DISTINCT FROM r.cluster_id
    OR current_setting('jinxi_test.expected_database_oid',true) IS DISTINCT FROM r.database_oid
    OR current_setting('jinxi_test.project_id',true) IS DISTINCT FROM r.project_id
    OR current_setting('jinxi_test.branch_id',true) IS DISTINCT FROM r.branch_id
    OR current_setting('jinxi_test.endpoint_id',true) IS DISTINCT FROM r.endpoint_id
    OR r.cluster_id<>(SELECT system_identifier::text FROM pg_control_system())
    OR r.database_oid<>(SELECT oid::text FROM pg_database WHERE datname=current_database())
    THEN RAISE EXCEPTION 'TEST_ROLLBACK_TARGET_REJECTED'; END IF;
  SELECT array_agg(c.oid ORDER BY c.oid) INTO actual_objects FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','b2_lab','jinxi_guard');
  SELECT md5(string_agg(a.attrelid||':'||a.attnum||':'||a.attname||':'||a.atttypid||':'||a.attnotnull,',' ORDER BY a.attrelid,a.attnum)) INTO actual_columns FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','b2_lab','jinxi_guard') AND a.attnum>0 AND NOT a.attisdropped;
  IF actual_objects IS DISTINCT FROM r.created_objects OR actual_columns IS DISTINCT FROM r.columns_signature
    OR (SELECT nspacl::text FROM pg_namespace WHERE nspname='public') IS DISTINCT FROM r.expected_public_acl
    OR (SELECT datacl::text FROM pg_database WHERE datname=current_database()) IS DISTINCT FROM r.expected_database_acl
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','b2_lab','jinxi_guard') AND c.relkind IN('r','S') AND c.relowner<>'jinxi_test_owner'::regrole)
    OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN('public','b2_lab','jinxi_guard'))<>1
    THEN RAISE EXCEPTION 'TEST_OBJECTS_CHANGED_REVIEW_BEFORE_ROLLBACK'; END IF;
  PERFORM set_config('jinxi_test.restore_public_create',r.public_create_was_allowed::text,true);
  PERFORM set_config('jinxi_test.restore_public_connect',r.public_connect_was_allowed::text,true);
  PERFORM set_config('jinxi_test.restore_public_temp',r.public_temp_was_allowed::text,true);
END $guard$;
ALTER ROLE jinxi_test_reader NOLOGIN;
ALTER ROLE jinxi_test_writer NOLOGIN;
DROP TABLE b2_lab.checkin_records,b2_lab.point_ledger,b2_lab.point_account,b2_lab.sessions,b2_lab.rate_limits;
DROP TABLE b2_lab.point_rule,b2_lab.point_catalog,b2_lab.guild_member_accounts;
DROP TABLE b2_lab.guild_member_profiles;
DROP TABLE public.strategies,public.messages,public.announcements,public.guild_sponsorship_entries;
DROP FUNCTION jinxi_guard.environment_identity();
DROP TABLE jinxi_guard.environment_registration;
DROP SCHEMA b2_lab;
DROP SCHEMA jinxi_guard;
REVOKE CONNECT ON DATABASE neondb FROM jinxi_test_reader;
REVOKE USAGE ON SCHEMA public FROM jinxi_test_reader;
REVOKE USAGE,CREATE ON SCHEMA public FROM jinxi_test_owner;
DO $restore$ BEGIN
  IF current_setting('jinxi_test.restore_public_create')::bool THEN GRANT CREATE ON SCHEMA public TO PUBLIC; END IF;
  IF current_setting('jinxi_test.restore_public_connect')::bool THEN GRANT CONNECT ON DATABASE neondb TO PUBLIC; END IF;
  IF current_setting('jinxi_test.restore_public_temp')::bool THEN GRANT TEMPORARY ON DATABASE neondb TO PUBLIC; END IF;
END $restore$;
-- DROP ROLE is dependency-checked across this cluster; an unexpected external
-- dependency aborts the entire transaction, preserving all fixture objects.
DROP ROLE jinxi_test_reader;
DROP ROLE jinxi_test_writer;
DROP ROLE jinxi_test_owner;
COMMIT;
