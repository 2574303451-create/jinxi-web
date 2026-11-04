-- Guild member profile + account schema
-- Compatible with existing checkin tables:
-- - checkin_records
-- - user_checkin_stats

-- 1) Member profile table (employee id + archive identity + display names)
CREATE TABLE IF NOT EXISTS guild_member_profiles (
  employee_no TEXT PRIMARY KEY,
  archive_member_id TEXT,
  display_name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  join_date DATE,
  member_role TEXT NOT NULL DEFAULT 'member',
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'archive',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Account table (1 employee -> 1 login account)
CREATE TABLE IF NOT EXISTS guild_member_accounts (
  id BIGSERIAL PRIMARY KEY,
  employee_no TEXT NOT NULL UNIQUE REFERENCES guild_member_profiles(employee_no)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  login_account TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  hash_algorithm TEXT NOT NULL DEFAULT 'pbkdf2_sha256',
  force_reset_password BOOLEAN NOT NULL DEFAULT TRUE,
  password_updated_at TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guild_member_profiles_nickname
ON guild_member_profiles(nickname);

CREATE INDEX IF NOT EXISTS idx_guild_member_accounts_locked
ON guild_member_accounts(is_locked);

-- 3) Generic trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guild_member_profiles_updated_at ON guild_member_profiles;
CREATE TRIGGER trg_guild_member_profiles_updated_at
BEFORE UPDATE ON guild_member_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_guild_member_accounts_updated_at ON guild_member_accounts;
CREATE TRIGGER trg_guild_member_accounts_updated_at
BEFORE UPDATE ON guild_member_accounts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- 4) Optional helper view for operations
CREATE OR REPLACE VIEW guild_member_account_view AS
SELECT
  a.id AS account_id,
  p.employee_no,
  p.archive_member_id,
  p.display_name,
  p.nickname,
  p.join_date,
  p.member_role,
  p.badges,
  a.login_account,
  a.force_reset_password,
  a.is_locked,
  a.last_login_at,
  a.created_at AS account_created_at,
  a.updated_at AS account_updated_at
FROM guild_member_accounts a
JOIN guild_member_profiles p
  ON p.employee_no = a.employee_no;
