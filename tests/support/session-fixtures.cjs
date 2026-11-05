const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const b2=require('./b2-postgres.cjs'),{connect}=require('./postgres.cjs'),{hashPassword}=require('../../netlify/functions/_shared/password');
const accountFile=path.join(path.dirname(b2.runtimeFile),'synthetic-accounts.json');
async function seedSessionLab(){
 await b2.setup();const c=await connect('admin');
 try{
  await c.query('BEGIN');
  await c.query(`SET LOCAL ROLE jinxi_b2_owner;
   CREATE TABLE IF NOT EXISTS b2_lab.guild_member_profiles(employee_no text PRIMARY KEY CHECK(employee_no LIKE 'B2-LAB-%'),member_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),display_name text NOT NULL,nickname text NOT NULL,is_active bool NOT NULL DEFAULT true,lock_version int NOT NULL DEFAULT 0,source text NOT NULL CHECK(source='synthetic-b2-lab'));
   CREATE TABLE IF NOT EXISTS b2_lab.guild_member_accounts(id bigserial PRIMARY KEY,employee_no text NOT NULL UNIQUE REFERENCES b2_lab.guild_member_profiles(employee_no),login_account text UNIQUE NOT NULL CHECK(login_account IN('b2-lab-a','b2-lab-b')),password_hash text NOT NULL,hash_algorithm text NOT NULL DEFAULT 'pbkdf2_sha256',force_reset_password bool NOT NULL DEFAULT true,is_locked bool NOT NULL DEFAULT false,auth_version int NOT NULL DEFAULT 1,password_updated_at timestamptz,last_login_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
   CREATE TABLE IF NOT EXISTS b2_lab.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id bigint NOT NULL REFERENCES b2_lab.guild_member_accounts(id),token_hash char(64) UNIQUE NOT NULL,csrf_hash char(64) NOT NULL,auth_version int NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,idle_expires_at timestamptz NOT NULL,last_seen_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz);
   CREATE INDEX IF NOT EXISTS sessions_account_id ON b2_lab.sessions(account_id);
   CREATE TABLE IF NOT EXISTS b2_lab.rate_limits(bucket text PRIMARY KEY,hits int NOT NULL CHECK(hits>0),reset_at timestamptz NOT NULL);
   CREATE TABLE IF NOT EXISTS b2_lab.point_account(member_id uuid PRIMARY KEY REFERENCES b2_lab.guild_member_profiles(member_id),balance bigint NOT NULL DEFAULT 0 CHECK(balance>=0),total_earned bigint NOT NULL DEFAULT 0 CHECK(total_earned>=0),total_spent bigint NOT NULL DEFAULT 0 CHECK(total_spent>=0));
   CREATE TABLE IF NOT EXISTS b2_lab.point_rule(code text PRIMARY KEY,reward int NOT NULL CHECK(reward>0),active bool NOT NULL);
   CREATE TABLE IF NOT EXISTS b2_lab.point_catalog(code text PRIMARY KEY,price int NOT NULL CHECK(price>0),active bool NOT NULL);
   CREATE TABLE IF NOT EXISTS b2_lab.point_ledger(id bigserial PRIMARY KEY,member_id uuid NOT NULL REFERENCES b2_lab.guild_member_profiles(member_id),biz_key text NOT NULL,kind text NOT NULL CHECK(kind IN('checkin','redeem')),item_code text,amount bigint NOT NULL CHECK(amount>0),balance_after bigint NOT NULL CHECK(balance_after>=0),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(member_id,biz_key));
   TRUNCATE b2_lab.point_ledger,b2_lab.point_account,b2_lab.sessions,b2_lab.guild_member_accounts,b2_lab.guild_member_profiles,b2_lab.rate_limits RESTART IDENTITY;
   INSERT INTO b2_lab.point_rule VALUES('lab.checkin',10,true) ON CONFLICT(code) DO UPDATE SET reward=10,active=true;
   INSERT INTO b2_lab.point_catalog VALUES('lab-paper-token',7,true) ON CONFLICT(code) DO UPDATE SET price=7,active=true;
   GRANT SELECT ON b2_lab.guild_member_accounts,b2_lab.guild_member_profiles,b2_lab.point_rule,b2_lab.point_catalog TO jinxi_b2_session;
   GRANT UPDATE(lock_version) ON b2_lab.guild_member_profiles TO jinxi_b2_session;
   GRANT UPDATE(password_hash,hash_algorithm,force_reset_password,auth_version,password_updated_at,last_login_at) ON b2_lab.guild_member_accounts TO jinxi_b2_session;
   GRANT SELECT,INSERT,UPDATE,DELETE ON b2_lab.sessions,b2_lab.rate_limits,b2_lab.point_account,b2_lab.point_ledger TO jinxi_b2_session;
   GRANT USAGE ON SEQUENCE b2_lab.point_ledger_id_seq TO jinxi_b2_session;
   CREATE OR REPLACE FUNCTION b2_lab.revoke_account_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
    BEGIN IF (NEW.is_locked AND NOT OLD.is_locked) OR NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
     IF NEW.auth_version=OLD.auth_version THEN NEW.auth_version:=OLD.auth_version+1; END IF;
     UPDATE b2_lab.sessions SET revoked_at=now() WHERE account_id=NEW.id AND revoked_at IS NULL;
    END IF;RETURN NEW;END $f$;
   CREATE OR REPLACE FUNCTION b2_lab.revoke_profile_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
    BEGIN IF NOT NEW.is_active AND OLD.is_active THEN
     UPDATE b2_lab.guild_member_accounts SET auth_version=auth_version+1 WHERE employee_no=NEW.employee_no;
     UPDATE b2_lab.sessions SET revoked_at=now() WHERE account_id IN(SELECT id FROM b2_lab.guild_member_accounts WHERE employee_no=NEW.employee_no) AND revoked_at IS NULL;
    END IF;RETURN NEW;END $f$;
   REVOKE ALL ON FUNCTION b2_lab.revoke_account_state(),b2_lab.revoke_profile_state() FROM PUBLIC;
   DROP TRIGGER IF EXISTS revoke_account_state ON b2_lab.guild_member_accounts;
   CREATE TRIGGER revoke_account_state BEFORE UPDATE OF is_locked,password_hash ON b2_lab.guild_member_accounts FOR EACH ROW EXECUTE FUNCTION b2_lab.revoke_account_state();
   DROP TRIGGER IF EXISTS revoke_profile_state ON b2_lab.guild_member_profiles;
   CREATE TRIGGER revoke_profile_state AFTER UPDATE OF is_active ON b2_lab.guild_member_profiles FOR EACH ROW EXECUTE FUNCTION b2_lab.revoke_profile_state();`);
  const accounts=[];
  for(const [i,name]of [[1,'b2-lab-a'],[2,'b2-lab-b']]){const password=crypto.randomBytes(18).toString('base64url')+'A9!',hash=await hashPassword(password),employee='B2-LAB-'+i;const profile=(await c.query("INSERT INTO b2_lab.guild_member_profiles(employee_no,display_name,nickname,source) VALUES($1,$2,$2,'synthetic-b2-lab') RETURNING member_id",[employee,'合成伙伴'+(i===1?'A':'B')])).rows[0];await c.query('INSERT INTO b2_lab.guild_member_accounts(employee_no,login_account,password_hash,force_reset_password) VALUES($1,$2,$3,$4)',[employee,name,hash,i===1]);accounts.push({account:name,password,memberId:profile.member_id});}
  await c.query('COMMIT');fs.writeFileSync(accountFile,JSON.stringify(accounts),{mode:0o600});return accounts;
 }catch(e){await c.query('ROLLBACK');throw e}finally{await c.end()}
}
function accounts(){return JSON.parse(fs.readFileSync(accountFile))}
module.exports={seedSessionLab,accounts,accountFile};
