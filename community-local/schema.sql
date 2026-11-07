-- Checkpoint 2: new LOCAL synthetic extension only. Not a cloud migration.
BEGIN;
DO $$ BEGIN
 IF current_database() IS DISTINCT FROM 'jinxi_member_local' OR host(inet_server_addr()) IS DISTINCT FROM '127.0.0.1'
 OR inet_server_port() IS DISTINCT FROM 55436 OR current_user IS DISTINCT FROM 'jinxi_member_admin'
 OR current_setting('community.local_approval',true) IS DISTINCT FROM 'checkpoint2-synthetic-v1'
 OR NOT EXISTS(SELECT 1 FROM jinxi_guard.environment_registration WHERE classification='synthetic-local')
 OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='community_lab')
 THEN RAISE EXCEPTION 'COMMUNITY_FRESH_LOCAL_REQUIRED'; END IF;
END $$;
CREATE ROLE jinxi_community_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE jinxi_community_app NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE jinxi_member_local TO jinxi_community_app;
GRANT USAGE ON SCHEMA b2_lab TO jinxi_community_owner;
GRANT REFERENCES(member_id) ON b2_lab.member_account_security_v2 TO jinxi_community_owner;
CREATE SCHEMA community_lab AUTHORIZATION jinxi_community_owner;
SET LOCAL ROLE jinxi_community_owner;
CREATE TABLE community_lab.member_roles(member_id uuid PRIMARY KEY REFERENCES b2_lab.member_account_security_v2(member_id),role text NOT NULL CHECK(role IN('reviewer','admin')));
CREATE TABLE community_lab.items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL CHECK(kind IN('message','guide')),
 owner_id uuid REFERENCES b2_lab.member_account_security_v2(member_id),author_label text NOT NULL,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=32768),
 status text NOT NULL CHECK(status IN('draft','submitted','published','rejected','archived','deleted')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),is_pinned boolean NOT NULL DEFAULT false,
 legacy boolean NOT NULL DEFAULT false CHECK(legacy=(owner_id IS NULL)),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(NOT is_pinned OR status='published')
);
CREATE INDEX community_public_items ON community_lab.items(kind,is_pinned DESC,created_at DESC) WHERE status='published';
CREATE INDEX community_owner_items ON community_lab.items(owner_id,created_at DESC);
CREATE TABLE community_lab.replies(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),item_id uuid NOT NULL REFERENCES community_lab.items(id),
 author_id uuid NOT NULL REFERENCES b2_lab.member_account_security_v2(member_id),author_label text NOT NULL,
 content text NOT NULL CHECK(length(content) BETWEEN 1 AND 1000),deleted boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_replies_item ON community_lab.replies(item_id,created_at);
CREATE TABLE community_lab.reactions(
 item_id uuid NOT NULL REFERENCES community_lab.items(id),member_id uuid NOT NULL REFERENCES b2_lab.member_account_security_v2(member_id),
 type text NOT NULL CHECK(type IN('like','love','laugh','favorite','👍','❤️','😂')),active boolean NOT NULL,PRIMARY KEY(item_id,member_id,type)
);
CREATE TABLE community_lab.requests(
 member_id uuid NOT NULL REFERENCES b2_lab.member_account_security_v2(member_id),request_id uuid NOT NULL,
 request_hash bytea NOT NULL CHECK(octet_length(request_hash)=32),response jsonb,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(member_id,request_id)
);
CREATE TABLE community_lab.rate_limits(member_id uuid PRIMARY KEY,hits integer NOT NULL CHECK(hits>0),resets_at timestamptz NOT NULL);
CREATE TABLE community_lab.audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,operation text NOT NULL,item_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION community_lab.actor() RETURNS uuid LANGUAGE sql STABLE SET search_path=pg_catalog AS $$ SELECT nullif(current_setting('community.actor',true),'')::uuid $$;
CREATE FUNCTION community_lab.staff(admin_only boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM community_lab.member_roles WHERE member_id=community_lab.actor() AND (NOT admin_only OR role='admin')) $$;
CREATE FUNCTION community_lab.protect_item() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE mine boolean:=OLD.owner_id=community_lab.actor(); reviewer boolean:=community_lab.staff(false); administrator boolean:=community_lab.staff(true);
BEGIN
 IF OLD.legacy OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.author_label IS DISTINCT FROM OLD.author_label OR NEW.legacy IS DISTINCT FROM OLD.legacy THEN RAISE EXCEPTION 'IMMUTABLE_OWNERSHIP'; END IF;
 IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'VERSION_MUST_ADVANCE'; END IF;
 IF OLD.status='deleted' THEN RAISE EXCEPTION 'CONTENT_CLOSED'; END IF;
 IF NEW.payload IS DISTINCT FROM OLD.payload AND (NOT mine OR OLD.status='archived' OR NEW.status<>CASE WHEN OLD.kind='guide' THEN 'draft' ELSE 'submitted' END OR NEW.is_pinned) THEN RAISE EXCEPTION 'AUTHOR_REVISION_REQUIRED'; END IF;
 IF NEW.status='published' AND OLD.status<>'published' AND (mine OR NOT reviewer OR OLD.status<>'submitted') THEN RAISE EXCEPTION 'INDEPENDENT_REVIEW_REQUIRED'; END IF;
 IF NOT mine THEN
  IF NEW.payload IS DISTINCT FROM OLD.payload OR NOT (
   reviewer AND OLD.status='submitted' AND NEW.status IN('published','rejected') AND NOT NEW.is_pinned
   OR administrator AND NEW.status='deleted' AND NOT NEW.is_pinned
   OR administrator AND OLD.status='published' AND NEW.status='published'
  ) THEN RAISE EXCEPTION 'STAFF_OPERATION_REJECTED'; END IF;
 ELSIF NEW.status IS DISTINCT FROM OLD.status AND NOT (
  NEW.status IN('archived','deleted') OR OLD.status<>'archived' AND (
   OLD.kind='message' AND NEW.status='submitted'
   OR OLD.kind='guide' AND NEW.status='draft'
   OR OLD.kind='guide' AND OLD.status IN('draft','rejected') AND NEW.status='submitted'
  )
 ) THEN RAISE EXCEPTION 'AUTHOR_STATE_REJECTED'; END IF;
 IF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned AND NEW.status='published' AND NOT administrator THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER community_immutable BEFORE UPDATE ON community_lab.items FOR EACH ROW EXECUTE FUNCTION community_lab.protect_item();
ALTER TABLE community_lab.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY item_read ON community_lab.items FOR SELECT USING(status='published' OR owner_id=community_lab.actor() OR community_lab.staff(true) OR (status IN('submitted','rejected') AND community_lab.staff(false)));
CREATE POLICY item_create ON community_lab.items FOR INSERT WITH CHECK(NOT legacy AND owner_id=community_lab.actor() AND (kind='message' AND status='submitted' OR kind='guide' AND status='draft'));
CREATE POLICY item_update ON community_lab.items FOR UPDATE USING(NOT legacy AND (owner_id=community_lab.actor() OR community_lab.staff(false))) WITH CHECK(NOT legacy AND (owner_id=community_lab.actor() OR community_lab.staff(false)));
ALTER TABLE community_lab.replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY reply_read ON community_lab.replies FOR SELECT USING(EXISTS(SELECT 1 FROM community_lab.items i WHERE i.id=item_id AND i.status='published'));
CREATE POLICY reply_create ON community_lab.replies FOR INSERT WITH CHECK(author_id=community_lab.actor() AND EXISTS(SELECT 1 FROM community_lab.items i WHERE i.id=item_id AND i.status='published' AND NOT i.legacy));
CREATE POLICY reply_update ON community_lab.replies FOR UPDATE USING((author_id=community_lab.actor() OR community_lab.staff(true)) AND EXISTS(SELECT 1 FROM community_lab.items i WHERE i.id=item_id AND i.status='published' AND NOT i.legacy)) WITH CHECK((author_id=community_lab.actor() OR community_lab.staff(true)) AND EXISTS(SELECT 1 FROM community_lab.items i WHERE i.id=item_id AND i.status='published' AND NOT i.legacy));
ALTER TABLE community_lab.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY reaction_read ON community_lab.reactions FOR SELECT USING(EXISTS(SELECT 1 FROM community_lab.items i WHERE i.id=item_id AND i.status='published'));
CREATE POLICY reaction_create ON community_lab.reactions FOR INSERT WITH CHECK(member_id=community_lab.actor() AND EXISTS(SELECT 1 FROM community_lab.items i WHERE i.id=item_id AND i.status='published' AND NOT i.legacy));
CREATE POLICY reaction_update ON community_lab.reactions FOR UPDATE USING(member_id=community_lab.actor() AND EXISTS(SELECT 1 FROM community_lab.items i WHERE i.id=item_id AND i.status='published' AND NOT i.legacy)) WITH CHECK(member_id=community_lab.actor() AND EXISTS(SELECT 1 FROM community_lab.items i WHERE i.id=item_id AND i.status='published' AND NOT i.legacy));
ALTER TABLE community_lab.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY request_own ON community_lab.requests FOR ALL USING(member_id=community_lab.actor()) WITH CHECK(member_id=community_lab.actor());
ALTER TABLE community_lab.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY limits_own ON community_lab.rate_limits FOR ALL USING(member_id=community_lab.actor()) WITH CHECK(member_id=community_lab.actor());
ALTER TABLE community_lab.audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_actor ON community_lab.audit FOR INSERT WITH CHECK(actor_id=community_lab.actor());
REVOKE ALL ON ALL TABLES IN SCHEMA community_lab FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA community_lab FROM PUBLIC;
RESET ROLE;
GRANT USAGE ON SCHEMA community_lab,b2_lab,jinxi_guard TO jinxi_community_app;
GRANT EXECUTE ON FUNCTION jinxi_guard.environment_identity() TO jinxi_community_app;
GRANT EXECUTE ON FUNCTION community_lab.actor(),community_lab.staff(boolean) TO jinxi_community_app;
GRANT SELECT(id,employee_no,is_locked,force_reset_password) ON b2_lab.guild_member_accounts TO jinxi_community_app;
GRANT UPDATE(last_login_at) ON b2_lab.guild_member_accounts TO jinxi_community_app;
GRANT SELECT(employee_no,nickname,is_active) ON b2_lab.guild_member_profiles TO jinxi_community_app;
GRANT SELECT(account_id,member_id,auth_version,disabled_at) ON b2_lab.member_account_security_v2 TO jinxi_community_app;
GRANT SELECT(account_id,token_hash,csrf_hash,csrf_key_id,auth_version,expires_at,idle_expires_at,revoked_at,last_seen_at) ON b2_lab.member_sessions_v2 TO jinxi_community_app;
GRANT UPDATE(last_seen_at) ON b2_lab.member_sessions_v2 TO jinxi_community_app;
GRANT SELECT ON community_lab.items,community_lab.replies,community_lab.reactions,community_lab.requests,community_lab.rate_limits,community_lab.member_roles TO jinxi_community_app;
GRANT INSERT ON community_lab.items,community_lab.replies,community_lab.reactions,community_lab.requests,community_lab.rate_limits,community_lab.audit TO jinxi_community_app;
GRANT UPDATE(payload,status,version,is_pinned,updated_at) ON community_lab.items TO jinxi_community_app;
GRANT UPDATE(deleted) ON community_lab.replies TO jinxi_community_app;
GRANT UPDATE(active) ON community_lab.reactions TO jinxi_community_app;
GRANT UPDATE(response) ON community_lab.requests TO jinxi_community_app;
GRANT UPDATE(hits,resets_at) ON community_lab.rate_limits TO jinxi_community_app;
ALTER ROLE jinxi_community_app SET statement_timeout='3s';
ALTER ROLE jinxi_community_app SET idle_in_transaction_session_timeout='5s';
COMMIT;
