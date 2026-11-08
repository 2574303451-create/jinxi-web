-- Fresh loopback synthetic extension only. Never a production/TEST migration.
BEGIN;
DO $$ BEGIN
 IF current_database() IS DISTINCT FROM 'jinxi_member_local' OR host(inet_server_addr()) IS DISTINCT FROM '127.0.0.1'
 OR inet_server_port() IS DISTINCT FROM 55436 OR current_user IS DISTINCT FROM 'jinxi_member_admin'
 OR current_setting('points.local_approval',true) IS DISTINCT FROM 'checkpoint4-synthetic-v1'
 OR NOT EXISTS(SELECT 1 FROM jinxi_guard.environment_registration WHERE classification='synthetic-local')
 OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN('points_lab','points_legacy'))
 THEN RAISE EXCEPTION 'POINTS_FRESH_LOCAL_REQUIRED'; END IF;
END $$;
CREATE ROLE jinxi_points_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE jinxi_points_app NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE jinxi_member_local TO jinxi_points_app;
GRANT USAGE ON SCHEMA b2_lab,attendance_lab,community_lab TO jinxi_points_owner;
GRANT REFERENCES(member_id) ON b2_lab.member_account_security_v2 TO jinxi_points_owner;
GRANT REFERENCES(event_id) ON attendance_lab.reward_events TO jinxi_points_owner;
CREATE SCHEMA points_lab AUTHORIZATION jinxi_points_owner;
CREATE SCHEMA points_legacy AUTHORIZATION jinxi_points_owner;
SET LOCAL ROLE jinxi_points_owner;
CREATE FUNCTION points_lab.actor() RETURNS uuid LANGUAGE sql STABLE SET search_path=pg_catalog AS $$ SELECT nullif(current_setting('points.actor',true),'')::uuid $$;
CREATE FUNCTION points_lab.staff() RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM community_lab.member_roles WHERE member_id=points_lab.actor() AND role='admin') $$;
CREATE TABLE points_lab.mutex(id smallint PRIMARY KEY CHECK(id=1),touched boolean NOT NULL DEFAULT false);
INSERT INTO points_lab.mutex(id) VALUES(1);
CREATE TABLE points_lab.rules(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text NOT NULL CHECK(code ~ '^SYNTHETIC[.][a-z0-9_.-]{1,48}$'),version integer NOT NULL CHECK(version BETWEEN 1 AND 1000000),
 day1 integer NOT NULL CHECK(day1 BETWEEN 1 AND 1000000),day3 integer NOT NULL CHECK(day3 BETWEEN 1 AND 1000000),day7 integer NOT NULL CHECK(day7 BETWEEN 1 AND 1000000),
 daily_cap bigint NOT NULL CHECK(daily_cap BETWEEN 1 AND 9000000000000),total_cap bigint NOT NULL CHECK(total_cap BETWEEN 1 AND 9000000000000),
 starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),status text NOT NULL CHECK(status IN('draft','enabled','disabled')),
 created_at timestamptz NOT NULL DEFAULT statement_timestamp(),UNIQUE(code,version)
);
CREATE TABLE points_lab.catalogue(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(name) BETWEEN 1 AND 60 AND name !~ '[<>[:cntrl:]]'),
 unit_cost integer NOT NULL CHECK(unit_cost BETWEEN 1 AND 1000000),stock_total integer NOT NULL CHECK(stock_total BETWEEN 1 AND 1000000),
 available integer NOT NULL CHECK(available BETWEEN 0 AND stock_total),per_member_limit integer NOT NULL CHECK(per_member_limit BETWEEN 1 AND 1000000),
 min_earned bigint NOT NULL DEFAULT 0 CHECK(min_earned BETWEEN 0 AND 9000000000000),starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),status text NOT NULL CHECK(status IN('enabled','disabled'))
);
CREATE TABLE points_lab.accounts(
 member_id uuid PRIMARY KEY REFERENCES b2_lab.member_account_security_v2(member_id),public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 balance bigint NOT NULL DEFAULT 0 CHECK(balance BETWEEN 0 AND 9000000000000),earned bigint NOT NULL DEFAULT 0 CHECK(earned BETWEEN 0 AND 9000000000000),
 spent bigint NOT NULL DEFAULT 0 CHECK(spent BETWEEN 0 AND 9000000000000),refunds bigint NOT NULL DEFAULT 0 CHECK(refunds BETWEEN 0 AND spent),
 reversed bigint NOT NULL DEFAULT 0 CHECK(reversed BETWEEN 0 AND earned),entries bigint NOT NULL DEFAULT 0 CHECK(entries>=0),listed boolean NOT NULL DEFAULT false,
 CHECK(balance=earned+refunds-spent-reversed)
);
CREATE TABLE points_lab.orders(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),member_id uuid NOT NULL REFERENCES points_lab.accounts(member_id),item_id uuid NOT NULL REFERENCES points_lab.catalogue(id),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 5),unit_cost integer NOT NULL CHECK(unit_cost BETWEEN 1 AND 1000000),cost bigint NOT NULL CHECK(cost=quantity::bigint*unit_cost),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','fulfilled','failed','cancelled')),charge_id uuid UNIQUE,created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
CREATE TABLE points_lab.ledger(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),member_id uuid NOT NULL REFERENCES points_lab.accounts(member_id),entry_no bigint NOT NULL CHECK(entry_no>0),
 kind text NOT NULL CHECK(kind IN('award','redeem','refund','reversal')),biz_id text NOT NULL UNIQUE,
 direction smallint NOT NULL CHECK(direction IN(1,2)),point_delta bigint NOT NULL CHECK(point_delta BETWEEN 1 AND 9000000000000),
 before_balance bigint NOT NULL CHECK(before_balance>=0),after_balance bigint NOT NULL CHECK(after_balance BETWEEN 0 AND 9000000000000),
 event_id uuid REFERENCES attendance_lab.reward_events(event_id),rule_id uuid REFERENCES points_lab.rules(id),order_id uuid REFERENCES points_lab.orders(id) DEFERRABLE INITIALLY DEFERRED,
 origin_id uuid UNIQUE REFERENCES points_lab.ledger(id),created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
 UNIQUE(member_id,entry_no),UNIQUE(kind,event_id),UNIQUE(kind,order_id),
 CHECK(after_balance=before_balance+CASE WHEN direction=1 THEN point_delta ELSE -point_delta END),
 CHECK(kind='award' AND direction=1 AND event_id IS NOT NULL AND rule_id IS NOT NULL AND order_id IS NULL AND origin_id IS NULL
 OR kind='redeem' AND direction=2 AND order_id IS NOT NULL AND event_id IS NULL AND rule_id IS NULL AND origin_id IS NULL
 OR kind='refund' AND direction=1 AND order_id IS NOT NULL AND event_id IS NULL AND rule_id IS NULL AND origin_id IS NOT NULL
 OR kind='reversal' AND direction=2 AND event_id IS NOT NULL AND rule_id IS NOT NULL AND order_id IS NULL AND origin_id IS NOT NULL)
);
ALTER TABLE points_lab.orders ADD FOREIGN KEY(charge_id) REFERENCES points_lab.ledger(id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE points_lab.settlements(
 event_id uuid PRIMARY KEY REFERENCES attendance_lab.reward_events(event_id),member_id uuid NOT NULL REFERENCES points_lab.accounts(member_id),rule_id uuid NOT NULL REFERENCES points_lab.rules(id),
 rule_code text NOT NULL,rule_version integer NOT NULL,amount bigint NOT NULL CHECK(amount BETWEEN 1 AND 1000000),business_date date NOT NULL,streak integer NOT NULL CHECK(streak>0),
 ledger_id uuid NOT NULL UNIQUE REFERENCES points_lab.ledger(id) DEFERRABLE INITIALLY DEFERRED,settled_at timestamptz NOT NULL DEFAULT attendance_lab.business_now()
);
CREATE TABLE points_lab.inventory(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES points_lab.orders(id),item_id uuid NOT NULL REFERENCES points_lab.catalogue(id),
 kind text NOT NULL CHECK(kind IN('reserve','release')),quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 5),UNIQUE(order_id,kind)
);
CREATE TABLE points_lab.ranking(member_id uuid PRIMARY KEY REFERENCES points_lab.accounts(member_id),public_id uuid NOT NULL UNIQUE,net_earned bigint NOT NULL,balance bigint NOT NULL,listed boolean NOT NULL);
CREATE TABLE points_lab.requests(actor_id uuid NOT NULL,request_id uuid NOT NULL,request_hash bytea NOT NULL CHECK(octet_length(request_hash)=32),response jsonb NOT NULL CHECK(octet_length(response::text)<=16384),created_at timestamptz NOT NULL DEFAULT statement_timestamp(),PRIMARY KEY(actor_id,request_id));
CREATE TABLE points_lab.audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,request_id uuid NOT NULL,code text NOT NULL CHECK(length(code) BETWEEN 1 AND 64),event_id uuid,created_at timestamptz NOT NULL DEFAULT statement_timestamp());
-- Old-shaped synthetic examples are never a source of new ownership or balances.
CREATE TABLE points_legacy.point_account(user_id text PRIMARY KEY,balance bigint,total_earned bigint,total_spent bigint);
CREATE TABLE points_legacy.point_ledger(id integer PRIMARY KEY,user_id text,biz_id text UNIQUE,direction smallint CHECK(direction IN(1,2)),point_delta bigint CHECK(point_delta>0));
CREATE TABLE points_legacy.point_rule(rule_code text,version integer,point_delta integer,status text,start_at timestamptz,end_at timestamptz);
CREATE TABLE points_legacy.point_redeem_order(order_no text PRIMARY KEY,user_id text,item_code text,point_cost bigint,status text);
RESET ROLE;
-- New owner needs only reads for invoker trigger definitions; no inherited role is widened.
GRANT SELECT ON community_lab.member_roles TO jinxi_points_owner;
GRANT SELECT ON attendance_lab.records,attendance_lab.reward_events TO jinxi_points_owner;
GRANT EXECUTE ON FUNCTION attendance_lab.business_now() TO jinxi_points_owner;
SET LOCAL ROLE jinxi_points_owner;
