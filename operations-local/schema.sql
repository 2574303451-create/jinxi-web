-- Fresh local synthetic extension, never a production/TEST migration.
BEGIN;
DO $$ BEGIN
 IF current_database() IS DISTINCT FROM 'jinxi_member_local' OR host(inet_server_addr()) IS DISTINCT FROM '127.0.0.1' OR inet_server_port() IS DISTINCT FROM 55436
 OR current_user IS DISTINCT FROM 'jinxi_member_admin' OR current_setting('operations.local_approval',true) IS DISTINCT FROM 'checkpoint5-synthetic-v1'
 OR NOT EXISTS(SELECT 1 FROM jinxi_guard.environment_registration WHERE classification='synthetic-local')
 OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN('operations_lab','operations_legacy')) THEN RAISE EXCEPTION 'OPERATIONS_FRESH_LOCAL_REQUIRED'; END IF;
END $$;
CREATE ROLE jinxi_operations_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE jinxi_operations_app NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE jinxi_member_local TO jinxi_operations_app;
GRANT USAGE ON SCHEMA b2_lab,community_lab,attendance_lab TO jinxi_operations_owner;
GRANT REFERENCES(member_id) ON b2_lab.member_account_security_v2 TO jinxi_operations_owner;
GRANT SELECT ON community_lab.member_roles,attendance_lab.clock TO jinxi_operations_owner;
GRANT EXECUTE ON FUNCTION attendance_lab.business_now() TO jinxi_operations_owner;
CREATE SCHEMA operations_lab AUTHORIZATION jinxi_operations_owner;
CREATE SCHEMA operations_legacy AUTHORIZATION jinxi_operations_owner;
SET LOCAL ROLE jinxi_operations_owner;
CREATE FUNCTION operations_lab.actor() RETURNS uuid LANGUAGE sql STABLE SET search_path=pg_catalog AS $$ SELECT nullif(current_setting('operations.actor',true),'')::uuid $$;
CREATE FUNCTION operations_lab.staff(admin_only boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM community_lab.member_roles WHERE member_id=operations_lab.actor() AND (NOT admin_only OR role='admin')) $$;
CREATE TABLE operations_lab.mutex(id smallint PRIMARY KEY CHECK(id=1),touched boolean NOT NULL DEFAULT false);
INSERT INTO operations_lab.mutex(id) VALUES(1);
CREATE TABLE operations_lab.documents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL CHECK(kind IN('announcement','sponsor')),
 owner_id uuid REFERENCES b2_lab.member_account_security_v2(member_id),last_editor uuid REFERENCES b2_lab.member_account_security_v2(member_id),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=32768),
 status text NOT NULL,version integer NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000),legacy boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT attendance_lab.business_now(),updated_at timestamptz NOT NULL DEFAULT attendance_lab.business_now(),published_at timestamptz,expires_at timestamptz,occurred_at timestamptz,
 CHECK(legacy AND owner_id IS NULL AND last_editor IS NULL OR NOT legacy AND owner_id IS NOT NULL AND last_editor IS NOT NULL),
 CHECK((kind='announcement' AND status IN('draft','submitted','published','withdrawn','deleted') AND jsonb_typeof(payload->'title')='string' AND length(payload->>'title') BETWEEN 1 AND 120 AND jsonb_typeof(payload->'contentHtml')='string' AND length(payload->>'contentHtml') BETWEEN 1 AND 20000 AND occurred_at IS NULL
 OR kind='sponsor' AND status IN('visible','hidden','deleted') AND jsonb_typeof(payload->'sponsor')='string' AND length(payload->>'sponsor') BETWEEN 1 AND 80 AND occurred_at IS NOT NULL AND expires_at IS NULL AND published_at IS NULL) IS TRUE)
);
CREATE TABLE operations_lab.revisions(kind text NOT NULL,item_id uuid NOT NULL REFERENCES operations_lab.documents(id),version integer NOT NULL,actor_id uuid NOT NULL,data jsonb NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(kind,item_id,version));
CREATE TABLE operations_lab.requests(actor_id uuid NOT NULL,request_id uuid NOT NULL,request_hash bytea NOT NULL CHECK(octet_length(request_hash)=32),required_role text NOT NULL DEFAULT 'member' CHECK(required_role IN('member','staff','admin')),response jsonb NOT NULL CHECK(octet_length(response::text)<=65536),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(actor_id,request_id));
CREATE TABLE operations_lab.audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,request_id uuid NOT NULL,code text NOT NULL CHECK(length(code) BETWEEN 1 AND 64),created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE operations_legacy.announcements(id integer PRIMARY KEY,title text,content_html text,author text,created_at timestamptz,updated_at timestamptz);
CREATE TABLE operations_legacy.guild_sponsorship_entries(id integer PRIMARY KEY,sponsor_name text,sponsor_time timestamptz,created_at timestamptz);
CREATE FUNCTION operations_lab.immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'OPERATIONS_IMMUTABLE' USING ERRCODE='23514'; END $$;
CREATE FUNCTION operations_lab.guard_document() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE actor uuid:=operations_lab.actor(); editing boolean; administrator boolean:=operations_lab.staff(true); authorized boolean;
BEGIN
 IF TG_OP='INSERT' AND NEW.legacy AND session_user='jinxi_member_admin' AND current_setting('operations.bootstrap',true)='synthetic-history-v1' THEN RETURN NEW; END IF;
 IF NEW.kind='sponsor' THEN authorized:=administrator; ELSE authorized:=operations_lab.staff(false); END IF;
 IF NOT authorized OR actor IS NULL THEN RAISE EXCEPTION 'OPERATIONS_STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.legacy OR NEW.owner_id IS DISTINCT FROM actor OR NEW.version<>1 OR NEW.status<>(CASE WHEN NEW.kind='announcement' THEN 'draft' ELSE 'visible' END) THEN RAISE EXCEPTION 'OPERATIONS_CREATE_REJECTED' USING ERRCODE='42501'; END IF;
  NEW.last_editor:=actor; NEW.created_at:=attendance_lab.business_now();NEW.updated_at:=NEW.created_at;NEW.published_at:=NULL;RETURN NEW;
 END IF;
 IF OLD.legacy OR OLD.status='deleted' OR ROW(NEW.id,NEW.kind,NEW.owner_id,NEW.legacy,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.kind,OLD.owner_id,OLD.legacy,OLD.created_at) OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'OPERATIONS_OWNERSHIP_OR_VERSION' USING ERRCODE='23514'; END IF;
 NEW.last_editor:=OLD.last_editor;NEW.published_at:=OLD.published_at;NEW.updated_at:=attendance_lab.business_now();
 IF NEW.kind='announcement' THEN
  editing:=NEW.payload IS DISTINCT FROM OLD.payload OR NEW.expires_at IS DISTINCT FROM OLD.expires_at;
  IF editing OR NEW.status='draft' AND OLD.status IN('draft','withdrawn') THEN
   IF NOT (OLD.owner_id=actor OR administrator) OR OLD.status NOT IN('draft','withdrawn') OR NEW.status<>'draft' THEN RAISE EXCEPTION 'OPERATIONS_DRAFT_REQUIRED' USING ERRCODE='42501'; END IF;NEW.last_editor:=actor;
  ELSIF OLD.status='draft' AND NEW.status='submitted' THEN
   IF NOT(OLD.owner_id=actor OR administrator) THEN RAISE EXCEPTION 'OPERATIONS_AUTHOR_REQUIRED' USING ERRCODE='42501'; END IF;
  ELSIF OLD.status='submitted' AND NEW.status='published' THEN
   IF OLD.last_editor=actor OR NEW.expires_at IS NOT NULL AND NEW.expires_at<=attendance_lab.business_now() THEN RAISE EXCEPTION 'OPERATIONS_INDEPENDENT_REVIEW_REQUIRED' USING ERRCODE='42501'; END IF;NEW.published_at:=attendance_lab.business_now();
  ELSIF NEW.status='withdrawn' AND OLD.status IN('submitted','published') AND (OLD.owner_id=actor OR administrator) THEN NULL;
  ELSIF NEW.status='deleted' AND administrator THEN NULL;
  ELSE RAISE EXCEPTION 'OPERATIONS_STATE_REJECTED' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW.status NOT IN('visible','hidden','deleted') THEN RAISE EXCEPTION 'OPERATIONS_STATE_REJECTED' USING ERRCODE='23514'; END IF;NEW.last_editor:=actor;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER document_guard BEFORE INSERT OR UPDATE ON operations_lab.documents FOR EACH ROW EXECUTE FUNCTION operations_lab.guard_document();
CREATE FUNCTION operations_lab.record_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NOT NEW.legacy THEN INSERT INTO operations_lab.revisions(kind,item_id,version,actor_id,data) VALUES(NEW.kind,NEW.id,NEW.version,operations_lab.actor(),to_jsonb(NEW)); END IF;RETURN NEW;
END $$;
CREATE TRIGGER document_revision AFTER INSERT OR UPDATE ON operations_lab.documents FOR EACH ROW EXECUTE FUNCTION operations_lab.record_revision();
CREATE FUNCTION operations_lab.guard_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.actor_id IS DISTINCT FROM operations_lab.actor() OR NOT EXISTS(SELECT 1 FROM operations_lab.documents d WHERE d.id=NEW.item_id AND d.kind=NEW.kind AND d.version=NEW.version AND NOT d.legacy AND NEW.data=to_jsonb(d)) THEN RAISE EXCEPTION 'OPERATIONS_REVISION_SOURCE_REQUIRED' USING ERRCODE='23514'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER revision_source BEFORE INSERT ON operations_lab.revisions FOR EACH ROW EXECUTE FUNCTION operations_lab.guard_revision();
CREATE TRIGGER revision_immutable BEFORE UPDATE OR DELETE ON operations_lab.revisions FOR EACH ROW EXECUTE FUNCTION operations_lab.immutable();
CREATE TRIGGER request_immutable BEFORE UPDATE OR DELETE ON operations_lab.requests FOR EACH ROW EXECUTE FUNCTION operations_lab.immutable();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON operations_lab.audit FOR EACH ROW EXECUTE FUNCTION operations_lab.immutable();
ALTER TABLE operations_lab.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_read ON operations_lab.documents FOR SELECT USING(
 kind='announcement' AND status='published' AND published_at<=attendance_lab.business_now() AND (expires_at IS NULL OR expires_at>attendance_lab.business_now())
 OR kind='sponsor' AND status='visible'
 OR operations_lab.staff(true) OR kind='announcement' AND operations_lab.staff(false) AND (owner_id=operations_lab.actor() OR status='submitted')
);
CREATE POLICY document_create ON operations_lab.documents FOR INSERT WITH CHECK(NOT legacy AND owner_id=operations_lab.actor() AND (kind='announcement' AND operations_lab.staff(false) OR kind='sponsor' AND operations_lab.staff(true)));
CREATE POLICY document_update ON operations_lab.documents FOR UPDATE USING(NOT legacy AND (kind='announcement' AND operations_lab.staff(false) OR kind='sponsor' AND operations_lab.staff(true))) WITH CHECK(NOT legacy AND (kind='announcement' AND operations_lab.staff(false) OR kind='sponsor' AND operations_lab.staff(true)));
ALTER TABLE operations_lab.revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY revision_read ON operations_lab.revisions FOR SELECT USING(operations_lab.staff(true) OR actor_id=operations_lab.actor());
CREATE POLICY revision_create ON operations_lab.revisions FOR INSERT WITH CHECK(actor_id=operations_lab.actor());
ALTER TABLE operations_lab.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY request_own ON operations_lab.requests FOR ALL USING(actor_id=operations_lab.actor()) WITH CHECK(actor_id=operations_lab.actor());
ALTER TABLE operations_lab.audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_own ON operations_lab.audit FOR SELECT USING(actor_id=operations_lab.actor() OR operations_lab.staff(true));
CREATE POLICY audit_create ON operations_lab.audit FOR INSERT WITH CHECK(actor_id=operations_lab.actor());
REVOKE ALL ON SCHEMA operations_lab,operations_legacy FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA operations_lab,operations_legacy FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA operations_lab FROM PUBLIC;
RESET ROLE;
GRANT USAGE ON SCHEMA operations_lab,b2_lab,community_lab,attendance_lab,jinxi_guard TO jinxi_operations_app;
GRANT EXECUTE ON FUNCTION jinxi_guard.environment_identity(),attendance_lab.business_now() TO jinxi_operations_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA operations_lab TO jinxi_operations_app;
GRANT SELECT(id,employee_no,is_locked,force_reset_password) ON b2_lab.guild_member_accounts TO jinxi_operations_app;
GRANT UPDATE(last_login_at) ON b2_lab.guild_member_accounts TO jinxi_operations_app;
GRANT SELECT(employee_no,nickname,is_active) ON b2_lab.guild_member_profiles TO jinxi_operations_app;
GRANT SELECT(account_id,member_id,auth_version,disabled_at) ON b2_lab.member_account_security_v2 TO jinxi_operations_app;
GRANT SELECT(account_id,token_hash,csrf_hash,csrf_key_id,auth_version,expires_at,idle_expires_at,revoked_at,last_seen_at) ON b2_lab.member_sessions_v2 TO jinxi_operations_app;
GRANT UPDATE(last_seen_at) ON b2_lab.member_sessions_v2 TO jinxi_operations_app;
GRANT SELECT ON community_lab.member_roles,attendance_lab.clock TO jinxi_operations_app;
GRANT SELECT ON ALL TABLES IN SCHEMA operations_lab TO jinxi_operations_app;
GRANT UPDATE(touched) ON operations_lab.mutex TO jinxi_operations_app;
GRANT INSERT(kind,owner_id,last_editor,payload,status,expires_at,occurred_at) ON operations_lab.documents TO jinxi_operations_app;
GRANT UPDATE(payload,status,version,expires_at,occurred_at) ON operations_lab.documents TO jinxi_operations_app;
GRANT INSERT(kind,item_id,version,actor_id,data) ON operations_lab.revisions TO jinxi_operations_app;
GRANT INSERT(actor_id,request_id,request_hash,required_role,response) ON operations_lab.requests TO jinxi_operations_app;
GRANT INSERT(actor_id,request_id,code) ON operations_lab.audit TO jinxi_operations_app;
ALTER ROLE jinxi_operations_app SET statement_timeout='3s';
ALTER ROLE jinxi_operations_app SET idle_in_transaction_session_timeout='5s';
ALTER ROLE jinxi_operations_app SET DateStyle='ISO, YMD';
COMMIT;
