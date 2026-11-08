CREATE FUNCTION points_lab.eligible(who uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM b2_lab.member_account_security_v2 s JOIN b2_lab.guild_member_accounts a ON a.id=s.account_id JOIN b2_lab.guild_member_profiles p USING(employee_no)
 WHERE s.member_id=who AND s.disabled_at IS NULL AND NOT a.is_locked AND NOT a.force_reset_password AND p.is_active) $$;
CREATE FUNCTION points_lab.immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'POINTS_IMMUTABLE' USING ERRCODE='23514'; END $$;
CREATE FUNCTION points_lab.guard_rule() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NOT points_lab.staff() THEN RAISE EXCEPTION 'POINTS_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.code,NEW.version,NEW.day1,NEW.day3,NEW.day7,NEW.daily_cap,NEW.total_cap,NEW.starts_at,NEW.ends_at,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.id,OLD.code,OLD.version,OLD.day1,OLD.day3,OLD.day7,OLD.daily_cap,OLD.total_cap,OLD.starts_at,OLD.ends_at,OLD.created_at) THEN RAISE EXCEPTION 'POINTS_NEW_RULE_VERSION_REQUIRED' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' AND NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM points_lab.rules WHERE code=NEW.code) THEN RAISE EXCEPTION 'POINTS_RULE_VERSION_SEQUENCE' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER rule_guard BEFORE INSERT OR UPDATE ON points_lab.rules FOR EACH ROW EXECUTE FUNCTION points_lab.guard_rule();
CREATE FUNCTION points_lab.guard_catalogue() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' AND (NOT points_lab.staff() OR NEW.available<>NEW.stock_total) THEN RAISE EXCEPTION 'POINTS_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.name,NEW.unit_cost,NEW.stock_total,NEW.per_member_limit,NEW.min_earned,NEW.starts_at,NEW.ends_at) IS DISTINCT FROM ROW(OLD.id,OLD.name,OLD.unit_cost,OLD.stock_total,OLD.per_member_limit,OLD.min_earned,OLD.starts_at,OLD.ends_at) THEN RAISE EXCEPTION 'POINTS_CATALOGUE_IMMUTABLE' USING ERRCODE='23514'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT points_lab.staff() THEN RAISE EXCEPTION 'POINTS_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER catalogue_guard BEFORE INSERT OR UPDATE ON points_lab.catalogue FOR EACH ROW EXECUTE FUNCTION points_lab.guard_catalogue();
CREATE FUNCTION points_lab.assert_account(who uuid) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE a points_lab.accounts%ROWTYPE; e bigint; s bigint; f bigint; r bigint; n bigint;
BEGIN
 SELECT * INTO a FROM points_lab.accounts WHERE member_id=who;
 SELECT COALESCE(sum(point_delta) FILTER(WHERE kind='award'),0),COALESCE(sum(point_delta) FILTER(WHERE kind='redeem'),0),COALESCE(sum(point_delta) FILTER(WHERE kind='refund'),0),COALESCE(sum(point_delta) FILTER(WHERE kind='reversal'),0),count(*) INTO e,s,f,r,n FROM points_lab.ledger WHERE member_id=who;
 IF a.member_id IS NULL THEN IF n<>0 THEN RAISE EXCEPTION 'POINTS_ACCOUNT_MISSING' USING ERRCODE='23514'; END IF; RETURN; END IF;
 IF ROW(a.earned,a.spent,a.refunds,a.reversed,a.entries,a.balance) IS DISTINCT FROM ROW(e,s,f,r,n,e+f-s-r)
 OR EXISTS(SELECT 1 FROM(SELECT entry_no,before_balance,after_balance,row_number() OVER(ORDER BY entry_no) AS seq,lag(after_balance,1,0::bigint) OVER(ORDER BY entry_no) AS prior FROM points_lab.ledger WHERE member_id=who)x WHERE entry_no<>seq OR before_balance<>prior)
 OR a.balance<>COALESCE((SELECT after_balance FROM points_lab.ledger WHERE member_id=who ORDER BY entry_no DESC LIMIT 1),0)
 THEN RAISE EXCEPTION 'POINTS_ACCOUNT_LEDGER_MISMATCH' USING ERRCODE='23514'; END IF;
END $$;
CREATE FUNCTION points_lab.account_check() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN PERFORM points_lab.assert_account(NEW.member_id); RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER account_consistent AFTER INSERT OR UPDATE ON points_lab.accounts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION points_lab.account_check();
CREATE CONSTRAINT TRIGGER ledger_account_consistent AFTER INSERT ON points_lab.ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION points_lab.account_check();
CREATE FUNCTION points_lab.sync_ranking() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.public_id IS DISTINCT FROM OLD.public_id THEN RAISE EXCEPTION 'POINTS_PUBLIC_ID_IMMUTABLE' USING ERRCODE='23514'; END IF;
 INSERT INTO points_lab.ranking(member_id,public_id,net_earned,balance,listed) VALUES(NEW.member_id,NEW.public_id,NEW.earned-NEW.reversed,NEW.balance,NEW.listed)
 ON CONFLICT(member_id) DO UPDATE SET net_earned=EXCLUDED.net_earned,balance=EXCLUDED.balance,listed=EXCLUDED.listed; RETURN NEW;
END $$;
CREATE TRIGGER account_ranking AFTER INSERT OR UPDATE ON points_lab.accounts FOR EACH ROW EXECUTE FUNCTION points_lab.sync_ranking();
CREATE FUNCTION points_lab.guard_ranking() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM points_lab.accounts a WHERE a.member_id=NEW.member_id AND a.public_id=NEW.public_id AND a.earned-a.reversed=NEW.net_earned AND a.balance=NEW.balance AND a.listed=NEW.listed) THEN RAISE EXCEPTION 'POINTS_RANKING_MISMATCH' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER ranking_guard BEFORE INSERT OR UPDATE ON points_lab.ranking FOR EACH ROW EXECUTE FUNCTION points_lab.guard_ranking();
CREATE FUNCTION points_lab.check_settlement() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE rule points_lab.rules%ROWTYPE; fact attendance_lab.records%ROWTYPE; streak integer; daily bigint; total bigint; live timestamptz:=attendance_lab.business_now();
BEGIN
 SELECT r.* INTO fact FROM attendance_lab.reward_events e JOIN attendance_lab.records r ON r.id=e.record_id AND r.member_id=e.member_id WHERE e.event_id=NEW.event_id AND e.member_id=NEW.member_id AND e.event_type='attendance.recorded.v1' AND e.version=1 AND e.settlement_state='unsettled';
 SELECT * INTO rule FROM points_lab.rules WHERE id=NEW.rule_id;
 IF fact.id IS NULL OR rule.id IS NULL OR rule.status<>'enabled' OR live<rule.starts_at OR live>=rule.ends_at OR fact.signed_at<rule.starts_at OR fact.signed_at>=rule.ends_at THEN RAISE EXCEPTION 'POINTS_RULE_NOT_ACTIVE' USING ERRCODE='23514'; END IF;
 IF (SELECT count(*) FROM points_lab.rules WHERE status='enabled' AND starts_at<=live AND ends_at>live AND starts_at<=fact.signed_at AND ends_at>fact.signed_at)<>1 THEN RAISE EXCEPTION 'POINTS_RULE_CONFLICT' USING ERRCODE='23514'; END IF;
 WITH dates AS(SELECT business_date,business_date-row_number() OVER(ORDER BY business_date)::int AS run FROM attendance_lab.records WHERE member_id=NEW.member_id AND business_date<=fact.business_date),numbered AS(SELECT business_date,row_number() OVER(PARTITION BY run ORDER BY business_date)::int AS n FROM dates) SELECT n INTO streak FROM numbered WHERE business_date=fact.business_date;
 IF NEW.business_date<>fact.business_date OR NEW.streak<>streak OR NEW.rule_code<>rule.code OR NEW.rule_version<>rule.version OR NEW.amount<>(CASE WHEN streak>=7 THEN rule.day7 WHEN streak>=3 THEN rule.day3 ELSE rule.day1 END) THEN RAISE EXCEPTION 'POINTS_REWARD_SOURCE_MISMATCH' USING ERRCODE='23514'; END IF;
 SELECT COALESCE(sum(amount) FILTER(WHERE business_date=NEW.business_date),0),COALESCE(sum(amount),0) INTO daily,total FROM points_lab.settlements WHERE member_id=NEW.member_id AND rule_code=rule.code;
 IF daily>rule.daily_cap OR total>rule.total_cap THEN RAISE EXCEPTION 'POINTS_CAP_EXCEEDED' USING ERRCODE='23514'; END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER settlement_source AFTER INSERT ON points_lab.settlements DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION points_lab.check_settlement();
CREATE FUNCTION points_lab.check_ledger() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE origin points_lab.ledger%ROWTYPE; order_row points_lab.orders%ROWTYPE;
BEGIN
 IF NEW.kind='award' THEN
  IF NEW.biz_id<>'award:'||NEW.event_id::text OR NOT EXISTS(SELECT 1 FROM points_lab.settlements s WHERE s.event_id=NEW.event_id AND s.member_id=NEW.member_id AND s.rule_id=NEW.rule_id AND s.ledger_id=NEW.id AND s.amount=NEW.point_delta) THEN RAISE EXCEPTION 'POINTS_AWARD_SOURCE_REQUIRED' USING ERRCODE='23514'; END IF;
 ELSIF NEW.kind='redeem' THEN
  SELECT * INTO order_row FROM points_lab.orders WHERE id=NEW.order_id;
  IF order_row.id IS NULL OR order_row.charge_id<>NEW.id OR order_row.member_id<>NEW.member_id OR order_row.cost<>NEW.point_delta OR NEW.biz_id<>'redeem:'||NEW.order_id::text THEN RAISE EXCEPTION 'POINTS_ORDER_SOURCE_REQUIRED' USING ERRCODE='23514'; END IF;
 ELSE
  SELECT * INTO origin FROM points_lab.ledger WHERE id=NEW.origin_id;
  IF origin.id IS NULL OR origin.member_id<>NEW.member_id OR origin.point_delta<>NEW.point_delta THEN RAISE EXCEPTION 'POINTS_ORIGINAL_ENTRY_REQUIRED' USING ERRCODE='23514'; END IF;
  IF NEW.kind='refund' THEN
   IF origin.kind<>'redeem' OR origin.order_id<>NEW.order_id OR NEW.biz_id<>'refund:'||NEW.order_id::text OR NOT EXISTS(SELECT 1 FROM points_lab.orders WHERE id=NEW.order_id AND status IN('cancelled','failed')) THEN RAISE EXCEPTION 'POINTS_REFUND_SOURCE_REQUIRED' USING ERRCODE='23514'; END IF;
  ELSIF origin.kind<>'award' OR origin.event_id<>NEW.event_id OR origin.rule_id<>NEW.rule_id OR NEW.biz_id<>'reversal:'||NEW.origin_id::text OR NOT points_lab.staff() THEN RAISE EXCEPTION 'POINTS_REVERSAL_REJECTED' USING ERRCODE='23514'; END IF;
 END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER ledger_source AFTER INSERT ON points_lab.ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION points_lab.check_ledger();
CREATE FUNCTION points_lab.guard_order() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE item points_lab.catalogue%ROWTYPE; live timestamptz:=attendance_lab.business_now(); used bigint;
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT * INTO item FROM points_lab.catalogue WHERE id=NEW.item_id;
  SELECT COALESCE(sum(quantity),0) INTO used FROM points_lab.orders WHERE member_id=NEW.member_id AND item_id=NEW.item_id AND status IN('pending','fulfilled');
  IF NEW.member_id<>points_lab.actor() OR item.id IS NULL OR item.status<>'enabled' OR live<item.starts_at OR live>=item.ends_at OR NEW.unit_cost<>item.unit_cost OR NEW.status<>'pending' OR used+NEW.quantity>item.per_member_limit
  OR NOT EXISTS(SELECT 1 FROM points_lab.accounts WHERE member_id=NEW.member_id AND earned-reversed>=item.min_earned) THEN RAISE EXCEPTION 'POINTS_ORDER_CONDITION_REJECTED' USING ERRCODE='23514'; END IF;
 ELSE
  IF ROW(NEW.id,NEW.member_id,NEW.item_id,NEW.quantity,NEW.unit_cost,NEW.cost,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.member_id,OLD.item_id,OLD.quantity,OLD.unit_cost,OLD.cost,OLD.created_at) OR OLD.charge_id IS NOT NULL AND NEW.charge_id IS DISTINCT FROM OLD.charge_id THEN RAISE EXCEPTION 'POINTS_ORDER_IMMUTABLE' USING ERRCODE='23514'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND (OLD.status<>'pending' OR NOT(NEW.status='cancelled' AND (NEW.member_id=points_lab.actor() OR points_lab.staff()) OR NEW.status IN('failed','fulfilled') AND points_lab.staff())) THEN RAISE EXCEPTION 'POINTS_ORDER_STATE_REJECTED' USING ERRCODE='42501'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER order_guard BEFORE INSERT OR UPDATE ON points_lab.orders FOR EACH ROW EXECUTE FUNCTION points_lab.guard_order();
CREATE FUNCTION points_lab.check_order() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE o points_lab.orders%ROWTYPE; closed boolean;
BEGIN
 SELECT * INTO o FROM points_lab.orders WHERE id=NEW.id; closed:=o.status IN('cancelled','failed');
 IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM points_lab.catalogue c WHERE c.id=o.item_id AND c.status='enabled' AND c.starts_at<=attendance_lab.business_now() AND c.ends_at>attendance_lab.business_now()) THEN RAISE EXCEPTION 'POINTS_ITEM_EXPIRED' USING ERRCODE='23514'; END IF;
 IF (SELECT COALESCE(sum(quantity),0) FROM points_lab.orders WHERE member_id=o.member_id AND item_id=o.item_id AND status IN('pending','fulfilled'))>(SELECT per_member_limit FROM points_lab.catalogue WHERE id=o.item_id) THEN RAISE EXCEPTION 'POINTS_ITEM_MEMBER_LIMIT' USING ERRCODE='23514'; END IF;
 IF o.charge_id IS NULL OR NOT EXISTS(SELECT 1 FROM points_lab.ledger WHERE id=o.charge_id AND kind='redeem' AND member_id=o.member_id AND order_id=o.id AND point_delta=o.cost)
 OR NOT EXISTS(SELECT 1 FROM points_lab.inventory WHERE order_id=o.id AND kind='reserve' AND item_id=o.item_id AND quantity=o.quantity)
 OR closed IS DISTINCT FROM EXISTS(SELECT 1 FROM points_lab.ledger WHERE kind='refund' AND origin_id=o.charge_id AND point_delta=o.cost AND member_id=o.member_id AND order_id=o.id)
 OR closed IS DISTINCT FROM EXISTS(SELECT 1 FROM points_lab.inventory WHERE order_id=o.id AND kind='release' AND item_id=o.item_id AND quantity=o.quantity)
 THEN RAISE EXCEPTION 'POINTS_ORDER_INCONSISTENT' USING ERRCODE='23514'; END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER order_consistent AFTER INSERT OR UPDATE ON points_lab.orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION points_lab.check_order();
CREATE FUNCTION points_lab.check_inventory() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM points_lab.orders o WHERE o.id=NEW.order_id AND o.item_id=NEW.item_id AND o.quantity=NEW.quantity AND (NEW.kind='reserve' OR o.status IN('failed','cancelled'))) THEN RAISE EXCEPTION 'POINTS_STOCK_SOURCE_REQUIRED' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER inventory_guard BEFORE INSERT ON points_lab.inventory FOR EACH ROW EXECUTE FUNCTION points_lab.check_inventory();
CREATE FUNCTION points_lab.check_stock() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE remaining bigint; actual integer;
BEGIN
 SELECT stock_total-COALESCE((SELECT sum(CASE WHEN kind='reserve' THEN quantity ELSE -quantity END) FROM points_lab.inventory WHERE item_id=c.id),0),available INTO remaining,actual FROM points_lab.catalogue c WHERE id=NEW.id;
 IF remaining<>actual THEN RAISE EXCEPTION 'POINTS_STOCK_MISMATCH' USING ERRCODE='23514'; END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER stock_consistent AFTER INSERT OR UPDATE ON points_lab.catalogue DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION points_lab.check_stock();
CREATE FUNCTION points_lab.check_stock_after_movement() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM points_lab.catalogue c WHERE c.id=NEW.item_id AND c.available=c.stock_total-COALESCE((SELECT sum(CASE WHEN kind='reserve' THEN quantity ELSE -quantity END) FROM points_lab.inventory WHERE item_id=c.id),0)) THEN RAISE EXCEPTION 'POINTS_STOCK_MISMATCH' USING ERRCODE='23514'; END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER movement_stock_consistent AFTER INSERT ON points_lab.inventory DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION points_lab.check_stock_after_movement();
CREATE TRIGGER ledger_immutable BEFORE UPDATE OR DELETE ON points_lab.ledger FOR EACH ROW EXECUTE FUNCTION points_lab.immutable();
CREATE TRIGGER settlement_immutable BEFORE UPDATE OR DELETE ON points_lab.settlements FOR EACH ROW EXECUTE FUNCTION points_lab.immutable();
CREATE TRIGGER inventory_immutable BEFORE UPDATE OR DELETE ON points_lab.inventory FOR EACH ROW EXECUTE FUNCTION points_lab.immutable();
CREATE TRIGGER request_immutable BEFORE UPDATE OR DELETE ON points_lab.requests FOR EACH ROW EXECUTE FUNCTION points_lab.immutable();
ALTER TABLE points_lab.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_own ON points_lab.accounts FOR ALL USING(member_id=points_lab.actor() OR points_lab.staff()) WITH CHECK(member_id=points_lab.actor() OR points_lab.staff());
ALTER TABLE points_lab.ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_read ON points_lab.ledger FOR SELECT USING(member_id=points_lab.actor() OR points_lab.staff());
CREATE POLICY ledger_insert ON points_lab.ledger FOR INSERT WITH CHECK(member_id=points_lab.actor() OR points_lab.staff());
ALTER TABLE points_lab.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_read_update ON points_lab.orders FOR ALL USING(member_id=points_lab.actor() OR points_lab.staff()) WITH CHECK(member_id=points_lab.actor() OR points_lab.staff());
ALTER TABLE points_lab.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY settlement_read ON points_lab.settlements FOR SELECT USING(member_id=points_lab.actor() OR points_lab.staff());
CREATE POLICY settlement_create ON points_lab.settlements FOR INSERT WITH CHECK(member_id=points_lab.actor());
ALTER TABLE points_lab.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY request_actor ON points_lab.requests FOR ALL USING(actor_id=points_lab.actor()) WITH CHECK(actor_id=points_lab.actor());
ALTER TABLE points_lab.audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON points_lab.audit FOR SELECT USING(actor_id=points_lab.actor() OR points_lab.staff());
CREATE POLICY audit_create ON points_lab.audit FOR INSERT WITH CHECK(actor_id=points_lab.actor());
ALTER TABLE points_lab.ranking ENABLE ROW LEVEL SECURITY;
CREATE POLICY ranking_read ON points_lab.ranking FOR SELECT USING(member_id=points_lab.actor() OR points_lab.staff() OR listed AND points_lab.eligible(member_id));
CREATE POLICY ranking_write ON points_lab.ranking FOR ALL USING(member_id=points_lab.actor() OR points_lab.staff()) WITH CHECK(member_id=points_lab.actor() OR points_lab.staff());
ALTER TABLE points_lab.inventory ENABLE ROW LEVEL SECURITY;
-- Aggregate stock evidence contains no member ID or account information, and is never exposed by the API.
CREATE POLICY inventory_read ON points_lab.inventory FOR SELECT USING(true);
CREATE POLICY inventory_insert ON points_lab.inventory FOR INSERT WITH CHECK(EXISTS(SELECT 1 FROM points_lab.orders o WHERE o.id=order_id AND (o.member_id=points_lab.actor() OR points_lab.staff())));
REVOKE ALL ON SCHEMA points_lab,points_legacy FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA points_lab,points_legacy FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA points_lab FROM PUBLIC;
RESET ROLE;
GRANT USAGE ON SCHEMA points_lab,b2_lab,attendance_lab,community_lab,jinxi_guard TO jinxi_points_app;
GRANT EXECUTE ON FUNCTION jinxi_guard.environment_identity(),attendance_lab.actor(),attendance_lab.business_now() TO jinxi_points_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA points_lab TO jinxi_points_app;
GRANT SELECT(id,employee_no,is_locked,force_reset_password) ON b2_lab.guild_member_accounts TO jinxi_points_app;
GRANT UPDATE(last_login_at) ON b2_lab.guild_member_accounts TO jinxi_points_app;
GRANT SELECT(employee_no,nickname,is_active) ON b2_lab.guild_member_profiles TO jinxi_points_app;
GRANT SELECT(account_id,member_id,auth_version,disabled_at) ON b2_lab.member_account_security_v2 TO jinxi_points_app;
GRANT SELECT(account_id,token_hash,csrf_hash,csrf_key_id,auth_version,expires_at,idle_expires_at,revoked_at,last_seen_at) ON b2_lab.member_sessions_v2 TO jinxi_points_app;
GRANT UPDATE(last_seen_at) ON b2_lab.member_sessions_v2 TO jinxi_points_app;
GRANT SELECT ON community_lab.member_roles,attendance_lab.clock,attendance_lab.records,attendance_lab.reward_events TO jinxi_points_app;
GRANT SELECT ON ALL TABLES IN SCHEMA points_lab TO jinxi_points_app;
GRANT UPDATE(touched) ON points_lab.mutex TO jinxi_points_app;
GRANT INSERT(code,version,day1,day3,day7,daily_cap,total_cap,starts_at,ends_at,status) ON points_lab.rules TO jinxi_points_app;
GRANT UPDATE(status) ON points_lab.rules TO jinxi_points_app;
GRANT INSERT(name,unit_cost,stock_total,available,per_member_limit,min_earned,starts_at,ends_at,status) ON points_lab.catalogue TO jinxi_points_app;
GRANT UPDATE(available,status) ON points_lab.catalogue TO jinxi_points_app;
GRANT INSERT(member_id) ON points_lab.accounts TO jinxi_points_app;
GRANT UPDATE(balance,earned,spent,refunds,reversed,entries,listed) ON points_lab.accounts TO jinxi_points_app;
GRANT INSERT(member_id,item_id,quantity,unit_cost,cost) ON points_lab.orders TO jinxi_points_app;
GRANT UPDATE(status,charge_id) ON points_lab.orders TO jinxi_points_app;
GRANT INSERT(member_id,entry_no,kind,biz_id,direction,point_delta,before_balance,after_balance,event_id,rule_id,order_id,origin_id) ON points_lab.ledger TO jinxi_points_app;
GRANT INSERT(event_id,member_id,rule_id,rule_code,rule_version,amount,business_date,streak,ledger_id) ON points_lab.settlements TO jinxi_points_app;
GRANT INSERT(order_id,item_id,kind,quantity) ON points_lab.inventory TO jinxi_points_app;
GRANT INSERT(member_id,public_id,net_earned,balance,listed) ON points_lab.ranking TO jinxi_points_app;
GRANT UPDATE(net_earned,balance,listed) ON points_lab.ranking TO jinxi_points_app;
GRANT INSERT(actor_id,request_id,request_hash,response) ON points_lab.requests TO jinxi_points_app;
GRANT INSERT(actor_id,request_id,code,event_id) ON points_lab.audit TO jinxi_points_app;
ALTER ROLE jinxi_points_app SET statement_timeout='3s';
ALTER ROLE jinxi_points_app SET idle_in_transaction_session_timeout='5s';
ALTER ROLE jinxi_points_app SET DateStyle='ISO, YMD';
COMMIT;
