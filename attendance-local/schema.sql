-- New disposable LOCAL extension only; never a production/TEST migration.
BEGIN;
DO $$ BEGIN
 IF current_database() IS DISTINCT FROM 'jinxi_member_local' OR host(inet_server_addr()) IS DISTINCT FROM '127.0.0.1'
 OR inet_server_port() IS DISTINCT FROM 55436 OR current_user IS DISTINCT FROM 'jinxi_member_admin'
 OR current_setting('attendance.local_approval',true) IS DISTINCT FROM 'checkpoint3-synthetic-v1'
 OR NOT EXISTS(SELECT 1 FROM jinxi_guard.environment_registration WHERE classification='synthetic-local')
 OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN('attendance_lab','attendance_legacy'))
 THEN RAISE EXCEPTION 'ATTENDANCE_FRESH_LOCAL_REQUIRED'; END IF;
END $$;
CREATE ROLE jinxi_attendance_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE jinxi_attendance_app NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE jinxi_member_local TO jinxi_attendance_app;
GRANT USAGE ON SCHEMA b2_lab TO jinxi_attendance_owner;
GRANT REFERENCES(member_id) ON b2_lab.member_account_security_v2 TO jinxi_attendance_owner;
CREATE SCHEMA attendance_lab AUTHORIZATION jinxi_attendance_owner;
CREATE SCHEMA attendance_legacy AUTHORIZATION jinxi_attendance_owner;
SET LOCAL ROLE jinxi_attendance_owner;
CREATE TABLE attendance_lab.clock(
 id smallint PRIMARY KEY CHECK(id=1),business_zone text NOT NULL CHECK(business_zone='Asia/Shanghai'),synthetic_now timestamptz
);
INSERT INTO attendance_lab.clock VALUES(1,'Asia/Shanghai',NULL);
CREATE FUNCTION attendance_lab.actor() RETURNS uuid LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT nullif(current_setting('attendance.actor',true),'')::uuid $$;
CREATE FUNCTION attendance_lab.business_now() RETURNS timestamptz LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT COALESCE(synthetic_now,statement_timestamp()) FROM attendance_lab.clock WHERE id=1 AND business_zone='Asia/Shanghai' $$;
CREATE TABLE attendance_lab.records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),member_id uuid NOT NULL REFERENCES b2_lab.member_account_security_v2(member_id),
 signed_at timestamptz NOT NULL DEFAULT attendance_lab.business_now(),
 business_date date GENERATED ALWAYS AS ((signed_at AT TIME ZONE 'Asia/Shanghai')::date) STORED,
 business_zone text NOT NULL DEFAULT 'Asia/Shanghai' CHECK(business_zone='Asia/Shanghai'),
 created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
 UNIQUE(member_id,business_date),UNIQUE(id,member_id),CHECK(business_date BETWEEN DATE '1900-01-01' AND DATE '2199-12-31')
);
CREATE TABLE attendance_lab.reward_events(
 event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),record_id uuid NOT NULL UNIQUE,member_id uuid NOT NULL,
 event_type text NOT NULL DEFAULT 'attendance.recorded.v1' CHECK(event_type='attendance.recorded.v1'),
 version integer NOT NULL DEFAULT 1 CHECK(version=1),settlement_state text NOT NULL DEFAULT 'unsettled' CHECK(settlement_state='unsettled'),
 created_at timestamptz NOT NULL DEFAULT statement_timestamp(),FOREIGN KEY(record_id,member_id) REFERENCES attendance_lab.records(id,member_id)
);
CREATE TABLE attendance_lab.requests(
 member_id uuid NOT NULL,request_id uuid NOT NULL,record_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
 PRIMARY KEY(member_id,request_id),FOREIGN KEY(record_id,member_id) REFERENCES attendance_lab.records(id,member_id)
);
ALTER TABLE attendance_lab.records ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_read ON attendance_lab.records FOR SELECT USING(member_id=attendance_lab.actor());
CREATE POLICY attendance_insert ON attendance_lab.records FOR INSERT WITH CHECK(member_id=attendance_lab.actor());
ALTER TABLE attendance_lab.reward_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_read ON attendance_lab.reward_events FOR SELECT USING(member_id=attendance_lab.actor());
CREATE POLICY event_insert ON attendance_lab.reward_events FOR INSERT WITH CHECK(member_id=attendance_lab.actor());
ALTER TABLE attendance_lab.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY request_read ON attendance_lab.requests FOR SELECT USING(member_id=attendance_lab.actor());
CREATE POLICY request_insert ON attendance_lab.requests FOR INSERT WITH CHECK(member_id=attendance_lab.actor());
-- Unowned old-shaped examples, isolated from trusted facts and runtime access.
CREATE TABLE attendance_legacy.checkin_records(id integer PRIMARY KEY,user_id text NOT NULL,user_name text NOT NULL,checkin_date date NOT NULL,checkin_time timestamptz NOT NULL,reward_points integer NOT NULL,is_continuous boolean NOT NULL,continuous_days integer NOT NULL);
CREATE TABLE attendance_legacy.point_account(user_id text PRIMARY KEY,balance bigint NOT NULL,total_earned bigint NOT NULL,total_spent bigint NOT NULL);
CREATE TABLE attendance_legacy.point_ledger(id integer PRIMARY KEY,user_id text NOT NULL,biz_id text UNIQUE NOT NULL,point_delta bigint NOT NULL);
REVOKE ALL ON SCHEMA attendance_lab,attendance_legacy FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA attendance_lab,attendance_legacy FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA attendance_lab FROM PUBLIC;
RESET ROLE;
GRANT USAGE ON SCHEMA attendance_lab,b2_lab,jinxi_guard TO jinxi_attendance_app;
GRANT EXECUTE ON FUNCTION jinxi_guard.environment_identity(),attendance_lab.actor(),attendance_lab.business_now() TO jinxi_attendance_app;
GRANT SELECT(id,employee_no,is_locked,force_reset_password) ON b2_lab.guild_member_accounts TO jinxi_attendance_app;
GRANT UPDATE(last_login_at) ON b2_lab.guild_member_accounts TO jinxi_attendance_app;
GRANT SELECT(employee_no,nickname,is_active) ON b2_lab.guild_member_profiles TO jinxi_attendance_app;
GRANT SELECT(account_id,member_id,auth_version,disabled_at) ON b2_lab.member_account_security_v2 TO jinxi_attendance_app;
GRANT SELECT(account_id,token_hash,csrf_hash,csrf_key_id,auth_version,expires_at,idle_expires_at,revoked_at,last_seen_at) ON b2_lab.member_sessions_v2 TO jinxi_attendance_app;
GRANT UPDATE(last_seen_at) ON b2_lab.member_sessions_v2 TO jinxi_attendance_app;
GRANT SELECT ON attendance_lab.clock,attendance_lab.records,attendance_lab.reward_events,attendance_lab.requests TO jinxi_attendance_app;
GRANT INSERT(member_id) ON attendance_lab.records TO jinxi_attendance_app;
GRANT INSERT(record_id,member_id) ON attendance_lab.reward_events TO jinxi_attendance_app;
GRANT INSERT(member_id,request_id,record_id) ON attendance_lab.requests TO jinxi_attendance_app;
ALTER ROLE jinxi_attendance_app SET statement_timeout='3s';
ALTER ROLE jinxi_attendance_app SET idle_in_transaction_session_timeout='5s';
ALTER ROLE jinxi_attendance_app SET DateStyle='ISO, YMD';
COMMIT;
