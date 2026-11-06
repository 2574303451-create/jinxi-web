-- Additive only; one fresh, explicitly approved neondb. No credentials or hashes.
BEGIN;
SET LOCAL statement_timeout='10000ms';
SET LOCAL lock_timeout='2000ms';
SET LOCAL search_path=pg_catalog;
DO $guard$
DECLARE actual_cluster text; actual_oid text;
BEGIN
  SELECT system_identifier::text INTO actual_cluster FROM pg_control_system();
  SELECT oid::text INTO actual_oid FROM pg_database WHERE datname=current_database();
  IF current_database()<>'neondb' OR session_user<>current_user
    OR current_setting('jinxi_test.approval',true) IS DISTINCT FROM 'synthetic-test-v1'
    OR current_setting('jinxi_test.expected_cluster_id',true) IS DISTINCT FROM actual_cluster
    OR current_setting('jinxi_test.expected_database_oid',true) IS DISTINCT FROM actual_oid
    OR COALESCE(current_setting('jinxi_test.environment_id',true),'') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    OR EXISTS(SELECT 1 FROM unnest(ARRAY['project_id','branch_id','endpoint_id']) k
      WHERE COALESCE(current_setting('jinxi_test.'||k,true),'') !~ '^[a-zA-Z0-9_-]{3,100}$'
         OR current_setting('jinxi_test.'||k,true)='PENDING')
    THEN RAISE EXCEPTION 'TEST_INITIALIZATION_TARGET_UNAPPROVED'; END IF;
  IF EXISTS(SELECT 1 FROM pg_namespace WHERE left(nspname,3)<>'pg_' AND nspname NOT IN('public','information_schema'))
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema')
    OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema')
    OR EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema')
    OR EXISTS(SELECT 1 FROM pg_default_acl)
    OR EXISTS(SELECT 1 FROM pg_publication)
    OR EXISTS(SELECT 1 FROM pg_extension WHERE extname<>'plpgsql')
    OR EXISTS(SELECT 1 FROM pg_foreign_server)
    OR EXISTS(SELECT 1 FROM pg_event_trigger)
    OR EXISTS(SELECT 1 FROM pg_database WHERE NOT datistemplate AND datname NOT IN('neondb','postgres'))
    OR EXISTS(SELECT 1 FROM pg_subscription WHERE subdbid=(SELECT oid FROM pg_database WHERE datname=current_database()))
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('jinxi_test_owner','jinxi_test_reader','jinxi_test_writer'))
    OR EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend')
    THEN RAISE EXCEPTION 'TEST_NOT_EMPTY_OR_ALREADY_INITIALIZED'; END IF;
END $guard$;

-- These roles deliberately cannot log in until separately approved credential
-- provisioning. The future writer receives NO business grants in this phase.
CREATE ROLE jinxi_test_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE jinxi_test_reader NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE jinxi_test_writer NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE jinxi_test_reader SET default_transaction_read_only=on;
ALTER ROLE jinxi_test_reader SET search_path=pg_catalog,public;
CREATE SCHEMA jinxi_guard AUTHORIZATION jinxi_test_owner;
CREATE SCHEMA b2_lab AUTHORIZATION jinxi_test_owner;
CREATE TABLE jinxi_guard.environment_registration(
  id smallint PRIMARY KEY CHECK(id=1), environment_id uuid NOT NULL,
  classification text NOT NULL CHECK(classification='synthetic-test'),
  project_id text NOT NULL,branch_id text NOT NULL,endpoint_id text NOT NULL,
  cluster_id text NOT NULL,database_oid text NOT NULL,database_name text NOT NULL,
  initializer name NOT NULL,public_create_was_allowed bool NOT NULL,
  public_connect_was_allowed bool NOT NULL,public_temp_was_allowed bool NOT NULL,
  expected_public_acl text,expected_database_acl text,created_objects oid[],columns_signature text,
  seed_version int NOT NULL DEFAULT 0 CHECK(seed_version IN(0,1))
);
INSERT INTO jinxi_guard.environment_registration
SELECT 1,current_setting('jinxi_test.environment_id')::uuid,'synthetic-test',
  current_setting('jinxi_test.project_id'),current_setting('jinxi_test.branch_id'),current_setting('jinxi_test.endpoint_id'),
  current_setting('jinxi_test.expected_cluster_id'),current_setting('jinxi_test.expected_database_oid'),current_database(),session_user,
  EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
    WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='CREATE'),
  EXISTS(SELECT 1 FROM pg_database d CROSS JOIN LATERAL aclexplode(COALESCE(d.datacl,acldefault('d',d.datdba))) a WHERE d.datname=current_database() AND a.grantee=0 AND a.privilege_type='CONNECT'),
  EXISTS(SELECT 1 FROM pg_database d CROSS JOIN LATERAL aclexplode(COALESCE(d.datacl,acldefault('d',d.datdba))) a WHERE d.datname=current_database() AND a.grantee=0 AND a.privilege_type='TEMPORARY'),
  NULL,NULL,NULL,NULL,0;
ALTER TABLE jinxi_guard.environment_registration OWNER TO jinxi_test_owner;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CONNECT,TEMPORARY ON DATABASE neondb FROM PUBLIC;

CREATE TABLE public.strategies(
  id bigint PRIMARY KEY,title text NOT NULL,content text NOT NULL,author text NOT NULL,
  category text NOT NULL DEFAULT 'PVE',difficulty int NOT NULL DEFAULT 1 CHECK(difficulty BETWEEN 1 AND 5),
  tags text[] DEFAULT '{}',likes jsonb DEFAULT '[]',favorites jsonb DEFAULT '[]',comments jsonb DEFAULT '[]',
  is_pinned bool NOT NULL DEFAULT false,image_url text,media_files jsonb DEFAULT '[]',view_count int NOT NULL DEFAULT 0 CHECK(view_count>=0),
  status text NOT NULL CHECK(status IN('published','draft','archived')),created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL
);
CREATE INDEX strategies_status_created ON public.strategies(status,created_at DESC);
CREATE INDEX strategies_pinned_created ON public.strategies(is_pinned DESC,created_at DESC);
CREATE TABLE public.messages(
  id bigint PRIMARY KEY,name text NOT NULL,content text NOT NULL,category text,color text,
  reactions jsonb NOT NULL DEFAULT '[]',replies jsonb NOT NULL DEFAULT '[]',is_pinned bool NOT NULL DEFAULT false,
  image_url text,created_at timestamptz NOT NULL
);
CREATE TABLE public.announcements(id bigint PRIMARY KEY,title text NOT NULL,content_html text NOT NULL,author text NOT NULL,created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL);
CREATE TABLE public.guild_sponsorship_entries(id bigint PRIMARY KEY,sponsor_name text NOT NULL,sponsor_time timestamptz NOT NULL,created_at timestamptz NOT NULL);
CREATE TABLE b2_lab.guild_member_profiles(
  employee_no text PRIMARY KEY CHECK(employee_no LIKE 'B2-LAB-%'),member_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,nickname text NOT NULL,is_active bool NOT NULL DEFAULT true,
  lock_version int NOT NULL DEFAULT 0,source text NOT NULL CHECK(source='synthetic-b2-lab')
);
CREATE TABLE b2_lab.guild_member_accounts(
  id bigint PRIMARY KEY,employee_no text NOT NULL UNIQUE REFERENCES b2_lab.guild_member_profiles(employee_no),
  login_account text NOT NULL UNIQUE CHECK(login_account LIKE 'b2-lab-%'),
  password_hash text NOT NULL DEFAULT 'disabled:synthetic-fixture',hash_algorithm text NOT NULL DEFAULT 'pbkdf2_sha256',
  force_reset_password bool NOT NULL DEFAULT true,is_locked bool NOT NULL DEFAULT false,
  auth_version int NOT NULL DEFAULT 1 CHECK(auth_version>0),password_updated_at timestamptz,last_login_at timestamptz,created_at timestamptz NOT NULL
);
CREATE TABLE b2_lab.sessions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id bigint NOT NULL REFERENCES b2_lab.guild_member_accounts(id),
  token_hash char(64) NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{64}$'),csrf_hash char(64) NOT NULL CHECK(csrf_hash ~ '^[a-f0-9]{64}$'),
  auth_version int NOT NULL CHECK(auth_version>0),created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,last_seen_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz,
  CHECK(expires_at>created_at AND idle_expires_at<=expires_at AND idle_expires_at>created_at)
);
CREATE INDEX sessions_account_id ON b2_lab.sessions(account_id);
CREATE TABLE b2_lab.rate_limits(bucket text PRIMARY KEY,hits int NOT NULL CHECK(hits>0),reset_at timestamptz NOT NULL);
CREATE TABLE b2_lab.point_account(member_id uuid PRIMARY KEY REFERENCES b2_lab.guild_member_profiles(member_id),balance bigint NOT NULL CHECK(balance>=0),total_earned bigint NOT NULL CHECK(total_earned>=0),total_spent bigint NOT NULL CHECK(total_spent>=0),CHECK(balance=total_earned-total_spent));
CREATE TABLE b2_lab.point_rule(code text PRIMARY KEY,reward int NOT NULL CHECK(reward>0),active bool NOT NULL);
CREATE TABLE b2_lab.point_catalog(code text PRIMARY KEY,price int NOT NULL CHECK(price>0),active bool NOT NULL);
CREATE TABLE b2_lab.point_ledger(id bigserial PRIMARY KEY,member_id uuid NOT NULL REFERENCES b2_lab.guild_member_profiles(member_id),biz_key text NOT NULL,kind text NOT NULL CHECK(kind IN('checkin','redeem')),item_code text REFERENCES b2_lab.point_catalog(code),amount bigint NOT NULL CHECK(amount>0),balance_after bigint NOT NULL CHECK(balance_after>=0),created_at timestamptz NOT NULL,UNIQUE(member_id,biz_key));
CREATE TABLE b2_lab.checkin_records(member_id uuid NOT NULL REFERENCES b2_lab.guild_member_profiles(member_id),checkin_day date NOT NULL,created_at timestamptz NOT NULL,PRIMARY KEY(member_id,checkin_day));

DO $owners$
DECLARE obj record;
BEGIN
  FOR obj IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','b2_lab') AND c.relkind='r' LOOP
    EXECUTE format('ALTER TABLE %I.%I OWNER TO jinxi_test_owner',obj.nspname,obj.relname);
  END LOOP;
END $owners$;
-- Fixed, parameter-free identity function; initializer owns it so the reader
-- needs no monitoring/admin membership or direct pg_control_system privilege.
CREATE FUNCTION jinxi_guard.environment_identity()
RETURNS TABLE(environment_id text,classification text,cluster_id text,database_oid text,database_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $identity$
  SELECT e.environment_id::text,e.classification,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),
    (SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()),current_database()::text
  FROM jinxi_guard.environment_registration e WHERE e.id=1
$identity$;
REVOKE ALL ON SCHEMA jinxi_guard,b2_lab FROM PUBLIC;
REVOKE ALL ON FUNCTION jinxi_guard.environment_identity() FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public,b2_lab,jinxi_guard FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public,b2_lab FROM PUBLIC;
GRANT CONNECT ON DATABASE neondb TO jinxi_test_reader;
GRANT USAGE ON SCHEMA public,jinxi_guard TO jinxi_test_reader;
GRANT SELECT ON public.strategies,public.messages,public.announcements,public.guild_sponsorship_entries TO jinxi_test_reader;
GRANT EXECUTE ON FUNCTION jinxi_guard.environment_identity() TO jinxi_test_reader;
UPDATE jinxi_guard.environment_registration SET
  expected_public_acl=(SELECT nspacl::text FROM pg_namespace WHERE nspname='public'),
  expected_database_acl=(SELECT datacl::text FROM pg_database WHERE datname=current_database()),
  created_objects=(SELECT array_agg(c.oid ORDER BY c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','b2_lab','jinxi_guard')),
  columns_signature=(SELECT md5(string_agg(a.attrelid||':'||a.attnum||':'||a.attname||':'||a.atttypid||':'||a.attnotnull,',' ORDER BY a.attrelid,a.attnum)) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','b2_lab','jinxi_guard') AND a.attnum>0 AND NOT a.attisdropped);
COMMIT;
