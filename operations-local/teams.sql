-- Appended to the same guarded fresh-local initialization transaction.
SET LOCAL ROLE jinxi_operations_owner;
CREATE TABLE operations_lab.teams(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),leader_id uuid NOT NULL REFERENCES b2_lab.member_account_security_v2(member_id),leader_slot uuid NOT NULL,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=8192 AND (jsonb_typeof(payload->'name')='string' AND length(payload->>'name') BETWEEN 1 AND 60) IS TRUE),
 max_members integer NOT NULL CHECK(max_members BETWEEN 1 AND 50),member_count integer NOT NULL DEFAULT 1 CHECK(member_count BETWEEN 1 AND max_members),
 version integer NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000),created_at timestamptz NOT NULL DEFAULT attendance_lab.business_now(),updated_at timestamptz NOT NULL DEFAULT attendance_lab.business_now()
);
CREATE TABLE operations_lab.team_members(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),team_id uuid NOT NULL REFERENCES operations_lab.teams(id),member_id uuid NOT NULL REFERENCES b2_lab.member_account_security_v2(member_id),
 role text NOT NULL CHECK(role IN('leader','member')),application_message text NOT NULL DEFAULT '' CHECK(length(application_message)<=300),joined_at timestamptz NOT NULL DEFAULT attendance_lab.business_now(),left_at timestamptz
);
CREATE UNIQUE INDEX one_current_team ON operations_lab.team_members(member_id) WHERE left_at IS NULL;
-- Counts use an identity-free projection; no cross-member SELECT privilege is needed on membership UUIDs.
CREATE TABLE operations_lab.team_slots(id uuid PRIMARY KEY REFERENCES operations_lab.team_members(id) DEFERRABLE INITIALLY DEFERRED,team_id uuid NOT NULL REFERENCES operations_lab.teams(id),active boolean NOT NULL);
ALTER TABLE operations_lab.teams ADD FOREIGN KEY(leader_slot) REFERENCES operations_lab.team_slots(id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE operations_lab.team_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,team_id uuid NOT NULL REFERENCES operations_lab.teams(id),member_row uuid REFERENCES operations_lab.team_members(id),
 op text NOT NULL CHECK(op IN('team.created','team.edited','member.joined','member.left')),team_version integer NOT NULL,data jsonb NOT NULL CHECK(octet_length(data::text)<=16384),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(team_id,op,team_version),UNIQUE(member_row,op)
);
CREATE FUNCTION operations_lab.guard_team() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE changed boolean; actual integer;
BEGIN
 IF operations_lab.actor() IS NULL THEN RAISE EXCEPTION 'OPERATIONS_MEMBER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.leader_id IS DISTINCT FROM operations_lab.actor() OR NEW.member_count<>1 OR NEW.version<>1 THEN RAISE EXCEPTION 'OPERATIONS_TEAM_CREATE_REJECTED' USING ERRCODE='42501'; END IF;NEW.created_at:=attendance_lab.business_now();NEW.updated_at:=NEW.created_at;RETURN NEW;
 END IF;
 IF ROW(NEW.id,NEW.leader_id,NEW.leader_slot,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.leader_id,OLD.leader_slot,OLD.created_at) OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'OPERATIONS_TEAM_IMMUTABLE' USING ERRCODE='23514'; END IF;
 changed:=NEW.payload IS DISTINCT FROM OLD.payload OR NEW.max_members<>OLD.max_members;
 SELECT count(*)::int INTO actual FROM operations_lab.team_slots WHERE team_id=NEW.id AND active;
 IF NEW.member_count<>actual OR changed AND OLD.leader_id IS DISTINCT FROM operations_lab.actor() OR NOT changed AND (NEW.member_count=OLD.member_count OR NOT EXISTS(SELECT 1 FROM operations_lab.team_members WHERE team_id=NEW.id AND member_id=operations_lab.actor())) THEN RAISE EXCEPTION 'OPERATIONS_TEAM_UPDATE_REJECTED' USING ERRCODE='42501'; END IF;
 NEW.updated_at:=attendance_lab.business_now();RETURN NEW;
END $$;
CREATE TRIGGER team_guard BEFORE INSERT OR UPDATE ON operations_lab.teams FOR EACH ROW EXECUTE FUNCTION operations_lab.guard_team();
CREATE FUNCTION operations_lab.guard_team_member() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE t operations_lab.teams%ROWTYPE;
BEGIN
 SELECT * INTO t FROM operations_lab.teams WHERE id=NEW.team_id FOR UPDATE;
 IF t.id IS NULL OR NEW.member_id IS DISTINCT FROM operations_lab.actor() THEN RAISE EXCEPTION 'OPERATIONS_MEMBERSHIP_REJECTED' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.left_at IS NOT NULL OR NEW.role='leader' AND (NEW.member_id<>t.leader_id OR NEW.id<>t.leader_slot)
  OR NEW.role='member' AND (NEW.member_id=t.leader_id OR t.member_count>=t.max_members) THEN RAISE EXCEPTION 'OPERATIONS_TEAM_FULL_OR_ROLE' USING ERRCODE='23514'; END IF;NEW.joined_at:=attendance_lab.business_now();
 ELSE
  IF ROW(NEW.id,NEW.team_id,NEW.member_id,NEW.role,NEW.application_message,NEW.joined_at) IS DISTINCT FROM ROW(OLD.id,OLD.team_id,OLD.member_id,OLD.role,OLD.application_message,OLD.joined_at) OR OLD.left_at IS NOT NULL OR OLD.role='leader' OR NEW.left_at IS NULL THEN RAISE EXCEPTION 'OPERATIONS_MEMBER_STATE_REJECTED' USING ERRCODE='42501'; END IF;NEW.left_at:=attendance_lab.business_now();
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER team_member_guard BEFORE INSERT OR UPDATE ON operations_lab.team_members FOR EACH ROW EXECUTE FUNCTION operations_lab.guard_team_member();
CREATE FUNCTION operations_lab.guard_team_slot() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.team_id) IS DISTINCT FROM ROW(OLD.id,OLD.team_id) OR NOT EXISTS(SELECT 1 FROM operations_lab.team_members m WHERE m.id=NEW.id AND m.team_id=NEW.team_id AND m.member_id=operations_lab.actor() AND NEW.active=(m.left_at IS NULL)) THEN RAISE EXCEPTION 'OPERATIONS_SLOT_SOURCE_REQUIRED' USING ERRCODE='23514'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER team_slot_guard BEFORE INSERT OR UPDATE ON operations_lab.team_slots FOR EACH ROW EXECUTE FUNCTION operations_lab.guard_team_slot();
CREATE FUNCTION operations_lab.assert_team(who uuid) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE t operations_lab.teams%ROWTYPE; actual integer;
BEGIN
 SELECT * INTO t FROM operations_lab.teams WHERE id=who;SELECT count(*)::int INTO actual FROM operations_lab.team_slots WHERE team_id=who AND active;
 IF t.id IS NULL OR actual<>t.member_count OR actual>t.max_members OR NOT EXISTS(SELECT 1 FROM operations_lab.team_slots WHERE id=t.leader_slot AND team_id=t.id AND active) THEN RAISE EXCEPTION 'OPERATIONS_TEAM_INCONSISTENT' USING ERRCODE='23514'; END IF;
END $$;
CREATE FUNCTION operations_lab.check_team() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN IF TG_TABLE_NAME='teams' THEN PERFORM operations_lab.assert_team(NEW.id);ELSE PERFORM operations_lab.assert_team(NEW.team_id);END IF;RETURN NULL;END $$;
CREATE CONSTRAINT TRIGGER team_consistent AFTER INSERT OR UPDATE ON operations_lab.teams DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION operations_lab.check_team();
CREATE CONSTRAINT TRIGGER team_slot_consistent AFTER INSERT OR UPDATE ON operations_lab.team_slots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION operations_lab.check_team();
CREATE FUNCTION operations_lab.guard_team_event() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.actor_id IS DISTINCT FROM operations_lab.actor() OR NOT EXISTS(SELECT 1 FROM operations_lab.teams t WHERE t.id=NEW.team_id AND t.version=NEW.team_version) THEN RAISE EXCEPTION 'OPERATIONS_EVENT_SOURCE_REQUIRED' USING ERRCODE='23514'; END IF;
 IF NEW.op IN('team.created','team.edited') THEN
  IF NEW.member_row IS NOT NULL OR NOT EXISTS(SELECT 1 FROM operations_lab.teams t WHERE t.id=NEW.team_id AND t.leader_id=NEW.actor_id AND NEW.data=to_jsonb(t) AND (NEW.op='team.created' AND t.version=1 OR NEW.op='team.edited' AND t.version>1)) THEN RAISE EXCEPTION 'OPERATIONS_TEAM_EVENT_REJECTED' USING ERRCODE='23514'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM operations_lab.team_members m WHERE m.id=NEW.member_row AND m.team_id=NEW.team_id AND m.member_id=NEW.actor_id AND NEW.data=to_jsonb(m) AND (NEW.op='member.joined' AND m.left_at IS NULL OR NEW.op='member.left' AND m.left_at IS NOT NULL)) THEN RAISE EXCEPTION 'OPERATIONS_MEMBER_EVENT_REJECTED' USING ERRCODE='23514'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER team_event_source BEFORE INSERT ON operations_lab.team_events FOR EACH ROW EXECUTE FUNCTION operations_lab.guard_team_event();
CREATE FUNCTION operations_lab.record_team() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.payload IS DISTINCT FROM OLD.payload OR NEW.max_members<>OLD.max_members THEN INSERT INTO operations_lab.team_events(actor_id,team_id,op,team_version,data) VALUES(operations_lab.actor(),NEW.id,CASE WHEN TG_OP='INSERT' THEN 'team.created' ELSE 'team.edited' END,NEW.version,to_jsonb(NEW));END IF;RETURN NEW;
END $$;
CREATE TRIGGER team_revision AFTER INSERT OR UPDATE ON operations_lab.teams FOR EACH ROW EXECUTE FUNCTION operations_lab.record_team();
CREATE FUNCTION operations_lab.sync_team_membership() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE n integer; v integer;
BEGIN
 INSERT INTO operations_lab.team_slots(id,team_id,active) VALUES(NEW.id,NEW.team_id,NEW.left_at IS NULL) ON CONFLICT(id) DO UPDATE SET active=EXCLUDED.active;
 SELECT count(*)::int INTO n FROM operations_lab.team_slots WHERE team_id=NEW.team_id AND active;
 UPDATE operations_lab.teams SET member_count=n,version=version+1 WHERE id=NEW.team_id AND member_count<>n;
 SELECT version INTO v FROM operations_lab.teams WHERE id=NEW.team_id;
 INSERT INTO operations_lab.team_events(actor_id,team_id,member_row,op,team_version,data) VALUES(operations_lab.actor(),NEW.team_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN 'member.joined' ELSE 'member.left' END,v,to_jsonb(NEW));RETURN NEW;
END $$;
CREATE TRIGGER membership_projection AFTER INSERT OR UPDATE ON operations_lab.team_members FOR EACH ROW EXECUTE FUNCTION operations_lab.sync_team_membership();
CREATE TRIGGER team_event_immutable BEFORE UPDATE OR DELETE ON operations_lab.team_events FOR EACH ROW EXECUTE FUNCTION operations_lab.immutable();
ALTER TABLE operations_lab.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_read ON operations_lab.teams FOR SELECT USING(true);
CREATE POLICY team_create ON operations_lab.teams FOR INSERT WITH CHECK(leader_id=operations_lab.actor());
CREATE POLICY team_update ON operations_lab.teams FOR UPDATE USING(operations_lab.actor() IS NOT NULL) WITH CHECK(operations_lab.actor() IS NOT NULL);
ALTER TABLE operations_lab.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_member_own ON operations_lab.team_members FOR ALL USING(member_id=operations_lab.actor()) WITH CHECK(member_id=operations_lab.actor());
ALTER TABLE operations_lab.team_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY slot_read ON operations_lab.team_slots FOR SELECT USING(true);
CREATE POLICY slot_write ON operations_lab.team_slots FOR ALL USING(EXISTS(SELECT 1 FROM operations_lab.team_members m WHERE m.id=team_slots.id AND m.member_id=operations_lab.actor())) WITH CHECK(EXISTS(SELECT 1 FROM operations_lab.team_members m WHERE m.id=team_slots.id AND m.member_id=operations_lab.actor()));
ALTER TABLE operations_lab.team_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_event_read ON operations_lab.team_events FOR SELECT USING(actor_id=operations_lab.actor() OR operations_lab.staff(true));
CREATE POLICY team_event_create ON operations_lab.team_events FOR INSERT WITH CHECK(actor_id=operations_lab.actor());
REVOKE ALL ON ALL TABLES IN SCHEMA operations_lab FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA operations_lab FROM PUBLIC;
RESET ROLE;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA operations_lab TO jinxi_operations_app;
GRANT SELECT ON operations_lab.teams,operations_lab.team_members,operations_lab.team_slots,operations_lab.team_events TO jinxi_operations_app;
GRANT INSERT(id,leader_id,leader_slot,payload,max_members) ON operations_lab.teams TO jinxi_operations_app;
GRANT UPDATE(payload,max_members,member_count,version) ON operations_lab.teams TO jinxi_operations_app;
GRANT INSERT(id,team_id,member_id,role,application_message) ON operations_lab.team_members TO jinxi_operations_app;
GRANT UPDATE(left_at) ON operations_lab.team_members TO jinxi_operations_app;
GRANT INSERT(id,team_id,active) ON operations_lab.team_slots TO jinxi_operations_app;
GRANT UPDATE(active) ON operations_lab.team_slots TO jinxi_operations_app;
GRANT INSERT(actor_id,team_id,member_row,op,team_version,data) ON operations_lab.team_events TO jinxi_operations_app;
COMMIT;
