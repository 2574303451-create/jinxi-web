-- Fresh disposable LOCAL database only. Never a production/cloud migration.
BEGIN;
DO $$ BEGIN
 IF current_database() IS DISTINCT FROM 'jinxi_member_local' OR host(inet_server_addr()) IS DISTINCT FROM '127.0.0.1' OR inet_server_port() IS DISTINCT FROM 55436
 OR current_user IS DISTINCT FROM 'jinxi_member_admin' OR current_setting('jinxi_member.local_approval',true) IS DISTINCT FROM 'fresh-synthetic-v1'
 OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN('b2_lab','jinxi_guard','business_disabled'))
 THEN RAISE EXCEPTION 'LOCAL_FRESH_TARGET_REQUIRED'; END IF;
END $$;
CREATE ROLE jinxi_member_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE jinxi_member_session NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE jinxi_member_local FROM PUBLIC;
GRANT CONNECT ON DATABASE jinxi_member_local TO jinxi_member_session;
CREATE SCHEMA b2_lab AUTHORIZATION jinxi_member_owner;
CREATE SCHEMA jinxi_guard AUTHORIZATION jinxi_member_owner;
CREATE SCHEMA business_disabled AUTHORIZATION jinxi_member_owner;
SET LOCAL ROLE jinxi_member_owner;
-- Legacy column/PK/FK shapes retained; no nickname-based identity mapping.
CREATE TABLE b2_lab.guild_member_profiles (
 employee_no text PRIMARY KEY,archive_member_id text,display_name text NOT NULL,nickname text NOT NULL,
 join_date date,member_role text NOT NULL DEFAULT 'member',badges jsonb NOT NULL DEFAULT '[]',
 source text NOT NULL DEFAULT 'archive',is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE b2_lab.guild_member_accounts (
 id bigserial PRIMARY KEY,employee_no text NOT NULL UNIQUE REFERENCES b2_lab.guild_member_profiles(employee_no) ON UPDATE CASCADE ON DELETE RESTRICT,
 login_account text NOT NULL UNIQUE,password_hash text NOT NULL,hash_algorithm text NOT NULL DEFAULT 'pbkdf2_sha256',
 force_reset_password boolean NOT NULL DEFAULT true,password_updated_at timestamptz,is_locked boolean NOT NULL DEFAULT false,
 last_login_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
-- Additive identity map: old profiles have employee_no, not an assumed UUID.
CREATE TABLE b2_lab.member_account_security_v2 (
 account_id bigint PRIMARY KEY REFERENCES b2_lab.guild_member_accounts(id) ON DELETE RESTRICT,
 member_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),auth_version bigint NOT NULL DEFAULT 1 CHECK(auth_version>0),
 disabled_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE b2_lab.member_sessions_v2 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id bigint NOT NULL REFERENCES b2_lab.member_account_security_v2(account_id) ON DELETE RESTRICT,
 token_hash bytea NOT NULL UNIQUE CHECK(octet_length(token_hash)=32),csrf_hash bytea NOT NULL CHECK(octet_length(csrf_hash)=32),
 csrf_key_id text NOT NULL CHECK(csrf_key_id='local-v1'),auth_version bigint NOT NULL CHECK(auth_version>0),
 created_at timestamptz NOT NULL DEFAULT now(),last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,idle_expires_at timestamptz NOT NULL,revoked_at timestamptz,
 CHECK(expires_at>created_at),CHECK(idle_expires_at>created_at AND idle_expires_at<=expires_at)
);
CREATE INDEX member_sessions_account_live ON b2_lab.member_sessions_v2(account_id) WHERE revoked_at IS NULL;
CREATE INDEX member_sessions_expiry ON b2_lab.member_sessions_v2(expires_at);
CREATE INDEX member_sessions_idle_expiry ON b2_lab.member_sessions_v2(idle_expires_at);
CREATE TABLE b2_lab.member_session_limits_v2 (
 bucket_hash text PRIMARY KEY CHECK(bucket_hash ~ '^[a-f0-9]{64}$'),hits integer NOT NULL CHECK(hits>0),resets_at timestamptz NOT NULL
);
CREATE INDEX member_session_limits_expiry ON b2_lab.member_session_limits_v2(resets_at);
CREATE TABLE business_disabled.points(id integer PRIMARY KEY,balance bigint NOT NULL);
INSERT INTO business_disabled.points VALUES(1,314);
CREATE TABLE jinxi_guard.environment_registration(id smallint PRIMARY KEY CHECK(id=1),environment_id uuid NOT NULL,classification text NOT NULL CHECK(classification='synthetic-local'));
CREATE FUNCTION b2_lab.revoke_account_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF (NEW.is_locked AND NOT OLD.is_locked) OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
 OR NEW.employee_no IS DISTINCT FROM OLD.employee_no OR NEW.login_account IS DISTINCT FROM OLD.login_account THEN
  UPDATE b2_lab.member_account_security_v2 SET auth_version=auth_version+1 WHERE account_id=NEW.id;
  UPDATE b2_lab.member_sessions_v2 SET revoked_at=now() WHERE account_id=NEW.id AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER revoke_account_state BEFORE UPDATE OF is_locked,password_hash,employee_no,login_account ON b2_lab.guild_member_accounts FOR EACH ROW EXECUTE FUNCTION b2_lab.revoke_account_state();
CREATE FUNCTION b2_lab.revoke_profile_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.is_active AND NOT NEW.is_active THEN
  -- Same lock order as requests; prevents state changes from resurrecting sessions.
  PERFORM 1 FROM b2_lab.guild_member_accounts WHERE employee_no=NEW.employee_no FOR UPDATE;
  UPDATE b2_lab.member_account_security_v2 SET auth_version=auth_version+1 WHERE account_id IN(SELECT id FROM b2_lab.guild_member_accounts WHERE employee_no=NEW.employee_no);
  UPDATE b2_lab.member_sessions_v2 SET revoked_at=now() WHERE account_id IN(SELECT id FROM b2_lab.guild_member_accounts WHERE employee_no=NEW.employee_no) AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER revoke_profile_state AFTER UPDATE OF is_active ON b2_lab.guild_member_profiles FOR EACH ROW EXECUTE FUNCTION b2_lab.revoke_profile_state();
CREATE FUNCTION b2_lab.protect_member_map() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.account_id IS DISTINCT FROM OLD.account_id OR NEW.member_id IS DISTINCT FROM OLD.member_id THEN RAISE EXCEPTION 'MEMBER_MAPPING_IMMUTABLE'; END IF;
 IF NEW.disabled_at IS NOT NULL AND OLD.disabled_at IS NULL THEN
  NEW.auth_version:=OLD.auth_version+1;
  UPDATE b2_lab.member_sessions_v2 SET revoked_at=now() WHERE account_id=NEW.account_id AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_member_map BEFORE UPDATE ON b2_lab.member_account_security_v2 FOR EACH ROW EXECUTE FUNCTION b2_lab.protect_member_map();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA b2_lab FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA b2_lab,jinxi_guard,business_disabled FROM PUBLIC;
RESET ROLE;
-- Only this metadata function uses the initializer's pg_control_system privilege.
CREATE FUNCTION jinxi_guard.environment_identity() RETURNS TABLE(environment_id text,classification text,cluster_id text,database_oid text,database_name text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT r.environment_id::text,r.classification,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),
 (SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()),current_database()::text FROM jinxi_guard.environment_registration r WHERE id=1
$$;
REVOKE ALL ON FUNCTION jinxi_guard.environment_identity() FROM PUBLIC;
GRANT USAGE ON SCHEMA b2_lab,jinxi_guard TO jinxi_member_session;
GRANT EXECUTE ON FUNCTION jinxi_guard.environment_identity() TO jinxi_member_session;
GRANT SELECT ON ALL TABLES IN SCHEMA b2_lab TO jinxi_member_session;
GRANT UPDATE(password_hash,hash_algorithm,force_reset_password,password_updated_at,last_login_at,updated_at) ON b2_lab.guild_member_accounts TO jinxi_member_session;
GRANT INSERT ON b2_lab.member_sessions_v2,b2_lab.member_session_limits_v2 TO jinxi_member_session;
GRANT UPDATE(last_seen_at,idle_expires_at,revoked_at) ON b2_lab.member_sessions_v2 TO jinxi_member_session;
GRANT UPDATE(hits,resets_at) ON b2_lab.member_session_limits_v2 TO jinxi_member_session;
ALTER ROLE jinxi_member_session SET statement_timeout='3s';
ALTER ROLE jinxi_member_session SET idle_in_transaction_session_timeout='5s';
COMMIT;
