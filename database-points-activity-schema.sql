-- Points activity system schema and functions
-- Target: PostgreSQL (Neon)

-- =========================================================
-- 0) Preconditions: keep legacy checkin tables available
-- =========================================================
CREATE TABLE IF NOT EXISTS checkin_records (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  checkin_date DATE NOT NULL,
  checkin_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reward_points INTEGER NOT NULL DEFAULT 1,
  is_continuous BOOLEAN NOT NULL DEFAULT FALSE,
  continuous_days INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS user_checkin_stats (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  continuous_checkins INTEGER NOT NULL DEFAULT 0,
  max_continuous INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  first_checkin_date DATE,
  this_month_checkins INTEGER NOT NULL DEFAULT 0,
  this_year_checkins INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkin_records_user_date
ON checkin_records(user_id, checkin_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_checkin_stats_points
ON user_checkin_stats(total_points DESC);

-- Ensure ON CONFLICT (user_id, checkin_date) can be inferred on legacy tables.
DO $$
DECLARE
  v_is_unique BOOLEAN;
BEGIN
  SELECT i.indisunique
  INTO v_is_unique
  FROM pg_class idx
  JOIN pg_index i
    ON i.indexrelid = idx.oid
  JOIN pg_class tbl
    ON tbl.oid = i.indrelid
  JOIN pg_namespace n
    ON n.oid = tbl.relnamespace
  WHERE n.nspname = 'public'
    AND tbl.relname = 'checkin_records'
    AND idx.relname = 'idx_checkin_records_user_date'
  LIMIT 1;

  IF v_is_unique IS NULL THEN
    CREATE UNIQUE INDEX idx_checkin_records_user_date
      ON checkin_records(user_id, checkin_date);
  ELSIF v_is_unique = FALSE THEN
    DROP INDEX idx_checkin_records_user_date;
    CREATE UNIQUE INDEX idx_checkin_records_user_date
      ON checkin_records(user_id, checkin_date);
  END IF;
END;
$$;

-- =========================================================
-- 1) Points core tables
-- =========================================================
CREATE TABLE IF NOT EXISTS point_account (
  user_id TEXT PRIMARY KEY,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned BIGINT NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent BIGINT NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS point_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  biz_id TEXT NOT NULL UNIQUE,
  scene TEXT NOT NULL,
  event_type TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  direction SMALLINT NOT NULL CHECK (direction IN (1, 2)), -- 1=earn,2=spend
  point_delta BIGINT NOT NULL CHECK (point_delta > 0),
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  ext_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_ledger_user_created
ON point_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_ledger_event_created
ON point_ledger(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_ledger_rule_created
ON point_ledger(rule_code, created_at DESC);

CREATE TABLE IF NOT EXISTS point_rule (
  id BIGSERIAL PRIMARY KEY,
  rule_code TEXT NOT NULL,
  scene TEXT NOT NULL,
  event_type TEXT NOT NULL,
  point_delta INTEGER NOT NULL CHECK (point_delta > 0),
  daily_cap INTEGER NOT NULL DEFAULT 0 CHECK (daily_cap >= 0),
  total_cap INTEGER NOT NULL DEFAULT 0 CHECK (total_cap >= 0),
  cooldown_sec INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_sec >= 0),
  start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'inactive')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  ext_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rule_code, version)
);

CREATE INDEX IF NOT EXISTS idx_point_rule_lookup
ON point_rule(scene, event_type, status, start_at DESC, version DESC);

CREATE TABLE IF NOT EXISTS point_redeem_order (
  id BIGSERIAL PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  item_code TEXT NOT NULL,
  point_cost BIGINT NOT NULL CHECK (point_cost > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  ext_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_redeem_order_user_created
ON point_redeem_order(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS risk_event_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  biz_id TEXT NOT NULL,
  risk_code TEXT NOT NULL,
  risk_level SMALLINT NOT NULL DEFAULT 1,
  decision TEXT NOT NULL CHECK (decision IN ('pass', 'review', 'reject')),
  detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_event_user_created
ON risk_event_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_event_biz
ON risk_event_log(biz_id);

-- =========================================================
-- 2) Shared timestamp trigger
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_point_account_updated_at ON point_account;
CREATE TRIGGER trg_point_account_updated_at
BEFORE UPDATE ON point_account
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_point_rule_updated_at ON point_rule;
CREATE TRIGGER trg_point_rule_updated_at
BEFORE UPDATE ON point_rule
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_point_redeem_order_updated_at ON point_redeem_order;
CREATE TRIGGER trg_point_redeem_order_updated_at
BEFORE UPDATE ON point_redeem_order
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- =========================================================
-- 3) Seed rules (idempotent)
-- =========================================================
INSERT INTO point_rule (
  rule_code, scene, event_type, point_delta, daily_cap, total_cap, cooldown_sec, status, version, ext_json
) VALUES
  ('daily.checkin.base', 'daily_behavior', 'checkin', 1, 10, 0, 3, 'active', 1, '{"desc":"Base check-in reward"}'::jsonb),
  ('daily.topic.participate', 'daily_behavior', 'topic_participate', 2, 20, 0, 30, 'active', 1, '{"desc":"Participate in topic/activity"}'::jsonb),
  ('contribution.content.adopted', 'contribution', 'content_adopted', 30, 120, 0, 60, 'active', 1, '{"desc":"Content gets adopted"}'::jsonb),
  ('growth.weekly.goal', 'growth', 'weekly_goal_reached', 40, 40, 0, 3600, 'active', 1, '{"desc":"Weekly goal reached"}'::jsonb),
  ('special.admin.grant', 'special', 'admin_grant', 10, 0, 0, 0, 'active', 1, '{"desc":"Manual grant via admin approval"}'::jsonb)
ON CONFLICT (rule_code, version) DO UPDATE
SET
  scene = EXCLUDED.scene,
  event_type = EXCLUDED.event_type,
  point_delta = EXCLUDED.point_delta,
  daily_cap = EXCLUDED.daily_cap,
  total_cap = EXCLUDED.total_cap,
  cooldown_sec = EXCLUDED.cooldown_sec,
  status = EXCLUDED.status,
  ext_json = EXCLUDED.ext_json,
  updated_at = NOW();

-- =========================================================
-- 4) Helpers
-- =========================================================
CREATE OR REPLACE FUNCTION point_log_risk(
  p_user_id TEXT,
  p_biz_id TEXT,
  p_risk_code TEXT,
  p_risk_level SMALLINT,
  p_decision TEXT,
  p_detail JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
  INSERT INTO risk_event_log(user_id, biz_id, risk_code, risk_level, decision, detail_json)
  VALUES (p_user_id, p_biz_id, p_risk_code, p_risk_level, p_decision, COALESCE(p_detail, '{}'::jsonb));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION point_ensure_account(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO point_account(user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 5) Award points (earn)
-- =========================================================
CREATE OR REPLACE FUNCTION point_award(
  p_user_id TEXT,
  p_scene TEXT,
  p_event_type TEXT,
  p_biz_id TEXT,
  p_requested_delta INTEGER DEFAULT NULL,
  p_ext_json JSONB DEFAULT '{}'::jsonb,
  p_device_id TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_existing point_ledger%ROWTYPE;
  v_rule point_rule%ROWTYPE;
  v_delta INTEGER;
  v_rule_code TEXT;
  v_today_earned BIGINT := 0;
  v_total_earned BIGINT := 0;
  v_last_award_at TIMESTAMPTZ;
  v_account point_account%ROWTYPE;
  v_before BIGINT;
  v_after BIGINT;
BEGIN
  IF COALESCE(TRIM(p_user_id), '') = '' THEN
    RETURN json_build_object('success', false, 'message', 'user_id is required', 'error_code', 'BAD_REQUEST');
  END IF;
  IF COALESCE(TRIM(p_scene), '') = '' OR COALESCE(TRIM(p_event_type), '') = '' THEN
    RETURN json_build_object('success', false, 'message', 'scene and event_type are required', 'error_code', 'BAD_REQUEST');
  END IF;
  IF COALESCE(TRIM(p_biz_id), '') = '' THEN
    RETURN json_build_object('success', false, 'message', 'biz_id is required', 'error_code', 'BAD_REQUEST');
  END IF;

  SELECT * INTO v_existing
  FROM point_ledger
  WHERE biz_id = p_biz_id
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'already_processed', true,
      'message', 'duplicate biz_id ignored',
      'biz_id', p_biz_id,
      'reward_points', v_existing.point_delta,
      'balance_before', v_existing.balance_before,
      'balance_after', v_existing.balance_after,
      'rule_code', v_existing.rule_code,
      'risk_decision', 'pass'
    );
  END IF;

  SELECT * INTO v_rule
  FROM point_rule
  WHERE scene = p_scene
    AND event_type = p_event_type
    AND status = 'active'
    AND start_at <= v_now
    AND (end_at IS NULL OR end_at > v_now)
  ORDER BY version DESC, id DESC
  LIMIT 1;

  IF FOUND THEN
    v_delta := COALESCE(NULLIF(p_requested_delta, 0), v_rule.point_delta);
    v_rule_code := v_rule.rule_code;
  ELSE
    v_delta := COALESCE(NULLIF(p_requested_delta, 0), 0);
    v_rule_code := CONCAT(p_scene, '.', p_event_type, '.manual');
  END IF;

  IF v_delta <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'invalid point_delta', 'error_code', 'BAD_REQUEST');
  END IF;

  IF FOUND AND v_rule.cooldown_sec > 0 THEN
    SELECT MAX(created_at) INTO v_last_award_at
    FROM point_ledger
    WHERE user_id = p_user_id
      AND scene = p_scene
      AND event_type = p_event_type
      AND direction = 1;

    IF v_last_award_at IS NOT NULL
      AND v_last_award_at > (v_now - make_interval(secs => v_rule.cooldown_sec)) THEN
      PERFORM point_log_risk(
        p_user_id,
        p_biz_id,
        'cooldown_hit',
        2,
        'reject',
        jsonb_build_object(
          'scene', p_scene,
          'event_type', p_event_type,
          'cooldown_sec', v_rule.cooldown_sec,
          'last_award_at', v_last_award_at,
          'device_id', p_device_id,
          'ip', p_ip
        )
      );
      RETURN json_build_object(
        'success', false,
        'message', 'cooldown not reached',
        'error_code', 'COOLDOWN',
        'risk_decision', 'reject'
      );
    END IF;
  END IF;

  IF FOUND AND v_rule.daily_cap > 0 THEN
    SELECT COALESCE(SUM(point_delta), 0) INTO v_today_earned
    FROM point_ledger
    WHERE user_id = p_user_id
      AND rule_code = v_rule_code
      AND direction = 1
      AND created_at::date = CURRENT_DATE;

    IF (v_today_earned + v_delta) > v_rule.daily_cap THEN
      PERFORM point_log_risk(
        p_user_id,
        p_biz_id,
        'daily_cap_reached',
        1,
        'reject',
        jsonb_build_object(
          'rule_code', v_rule_code,
          'today_earned', v_today_earned,
          'request_delta', v_delta,
          'daily_cap', v_rule.daily_cap
        )
      );
      RETURN json_build_object(
        'success', false,
        'message', 'daily cap reached',
        'error_code', 'DAILY_CAP',
        'risk_decision', 'reject'
      );
    END IF;
  END IF;

  IF FOUND AND v_rule.total_cap > 0 THEN
    SELECT COALESCE(SUM(point_delta), 0) INTO v_total_earned
    FROM point_ledger
    WHERE user_id = p_user_id
      AND rule_code = v_rule_code
      AND direction = 1;

    IF (v_total_earned + v_delta) > v_rule.total_cap THEN
      PERFORM point_log_risk(
        p_user_id,
        p_biz_id,
        'total_cap_reached',
        1,
        'reject',
        jsonb_build_object(
          'rule_code', v_rule_code,
          'total_earned', v_total_earned,
          'request_delta', v_delta,
          'total_cap', v_rule.total_cap
        )
      );
      RETURN json_build_object(
        'success', false,
        'message', 'total cap reached',
        'error_code', 'TOTAL_CAP',
        'risk_decision', 'reject'
      );
    END IF;
  END IF;

  PERFORM point_ensure_account(p_user_id);

  SELECT * INTO v_account
  FROM point_account
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_before := v_account.balance;
  v_after := v_before + v_delta;

  BEGIN
    INSERT INTO point_ledger (
      user_id, biz_id, scene, event_type, rule_code, direction, point_delta,
      balance_before, balance_after, ext_json
    ) VALUES (
      p_user_id, p_biz_id, p_scene, p_event_type, v_rule_code, 1, v_delta,
      v_before, v_after, COALESCE(p_ext_json, '{}'::jsonb)
    );
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM point_ledger
    WHERE biz_id = p_biz_id
    LIMIT 1;

    RETURN json_build_object(
      'success', true,
      'already_processed', true,
      'message', 'duplicate biz_id ignored',
      'biz_id', p_biz_id,
      'reward_points', v_existing.point_delta,
      'balance_before', v_existing.balance_before,
      'balance_after', v_existing.balance_after,
      'rule_code', v_existing.rule_code,
      'risk_decision', 'pass'
    );
  END;

  UPDATE point_account
  SET
    balance = v_after,
    total_earned = total_earned + v_delta
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'already_processed', false,
    'message', 'points awarded',
    'biz_id', p_biz_id,
    'reward_points', v_delta,
    'balance_before', v_before,
    'balance_after', v_after,
    'rule_code', v_rule_code,
    'risk_decision', 'pass'
  );
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 6) Spend points (consume)
-- =========================================================
CREATE OR REPLACE FUNCTION point_spend(
  p_user_id TEXT,
  p_scene TEXT,
  p_event_type TEXT,
  p_biz_id TEXT,
  p_point_cost INTEGER,
  p_ext_json JSONB DEFAULT '{}'::jsonb
) RETURNS JSON AS $$
DECLARE
  v_existing point_ledger%ROWTYPE;
  v_account point_account%ROWTYPE;
  v_before BIGINT;
  v_after BIGINT;
  v_rule_code TEXT := CONCAT(p_scene, '.', p_event_type, '.consume');
BEGIN
  IF COALESCE(TRIM(p_user_id), '') = '' THEN
    RETURN json_build_object('success', false, 'message', 'user_id is required', 'error_code', 'BAD_REQUEST');
  END IF;
  IF COALESCE(TRIM(p_biz_id), '') = '' THEN
    RETURN json_build_object('success', false, 'message', 'biz_id is required', 'error_code', 'BAD_REQUEST');
  END IF;
  IF p_point_cost IS NULL OR p_point_cost <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'point_cost must be > 0', 'error_code', 'BAD_REQUEST');
  END IF;

  SELECT * INTO v_existing
  FROM point_ledger
  WHERE biz_id = p_biz_id
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'already_processed', true,
      'message', 'duplicate biz_id ignored',
      'biz_id', p_biz_id,
      'cost_points', v_existing.point_delta,
      'balance_before', v_existing.balance_before,
      'balance_after', v_existing.balance_after
    );
  END IF;

  PERFORM point_ensure_account(p_user_id);

  SELECT * INTO v_account
  FROM point_account
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_before := v_account.balance;
  IF v_before < p_point_cost THEN
    PERFORM point_log_risk(
      p_user_id,
      p_biz_id,
      'insufficient_balance',
      1,
      'reject',
      jsonb_build_object(
        'balance', v_before,
        'cost', p_point_cost,
        'scene', p_scene,
        'event_type', p_event_type
      )
    );
    RETURN json_build_object(
      'success', false,
      'message', 'insufficient balance',
      'error_code', 'INSUFFICIENT_BALANCE',
      'balance', v_before
    );
  END IF;

  v_after := v_before - p_point_cost;

  BEGIN
    INSERT INTO point_ledger (
      user_id, biz_id, scene, event_type, rule_code, direction, point_delta,
      balance_before, balance_after, ext_json
    ) VALUES (
      p_user_id, p_biz_id, p_scene, p_event_type, v_rule_code, 2, p_point_cost,
      v_before, v_after, COALESCE(p_ext_json, '{}'::jsonb)
    );
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM point_ledger
    WHERE biz_id = p_biz_id
    LIMIT 1;
    RETURN json_build_object(
      'success', true,
      'already_processed', true,
      'message', 'duplicate biz_id ignored',
      'biz_id', p_biz_id,
      'cost_points', v_existing.point_delta,
      'balance_before', v_existing.balance_before,
      'balance_after', v_existing.balance_after
    );
  END;

  UPDATE point_account
  SET
    balance = v_after,
    total_spent = total_spent + p_point_cost
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'already_processed', false,
    'message', 'points spent',
    'biz_id', p_biz_id,
    'cost_points', p_point_cost,
    'balance_before', v_before,
    'balance_after', v_after
  );
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 7) Redeem helper
-- =========================================================
CREATE OR REPLACE FUNCTION point_create_redeem_order(
  p_user_id TEXT,
  p_item_code TEXT,
  p_point_cost INTEGER,
  p_order_no TEXT DEFAULT NULL,
  p_ext_json JSONB DEFAULT '{}'::jsonb
) RETURNS JSON AS $$
DECLARE
  v_order_no TEXT := COALESCE(NULLIF(TRIM(p_order_no), ''), CONCAT('redeem:', p_user_id, ':', EXTRACT(EPOCH FROM clock_timestamp())::BIGINT));
  v_spend_result JSON;
BEGIN
  IF COALESCE(TRIM(p_user_id), '') = '' THEN
    RETURN json_build_object('success', false, 'message', 'user_id is required', 'error_code', 'BAD_REQUEST');
  END IF;
  IF COALESCE(TRIM(p_item_code), '') = '' THEN
    RETURN json_build_object('success', false, 'message', 'item_code is required', 'error_code', 'BAD_REQUEST');
  END IF;
  IF p_point_cost IS NULL OR p_point_cost <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'point_cost must be > 0', 'error_code', 'BAD_REQUEST');
  END IF;

  v_spend_result := point_spend(
    p_user_id,
    'redeem',
    'item_exchange',
    v_order_no,
    p_point_cost,
    jsonb_build_object('item_code', p_item_code, 'ext', COALESCE(p_ext_json, '{}'::jsonb))
  );

  IF COALESCE((v_spend_result ->> 'success')::BOOLEAN, FALSE) = FALSE THEN
    RETURN v_spend_result;
  END IF;

  INSERT INTO point_redeem_order(order_no, user_id, item_code, point_cost, status, ext_json)
  VALUES (v_order_no, p_user_id, p_item_code, p_point_cost, 'success', COALESCE(p_ext_json, '{}'::jsonb))
  ON CONFLICT (order_no) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'message', 'redeem order created',
    'order_no', v_order_no,
    'item_code', p_item_code,
    'point_cost', p_point_cost,
    'balance_after', (v_spend_result ->> 'balance_after')::BIGINT
  );
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 8) Checkin integration
-- =========================================================
CREATE OR REPLACE FUNCTION perform_checkin_v2(
  p_user_id TEXT,
  p_user_name TEXT,
  p_biz_id TEXT DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_existing_record checkin_records%ROWTYPE;
  v_user_stats user_checkin_stats%ROWTYPE;
  v_new_continuous INTEGER := 1;
  v_reward_points INTEGER := 1;
  v_effective_biz_id TEXT := COALESCE(NULLIF(TRIM(p_biz_id), ''), CONCAT('checkin:', p_user_id, ':', v_today::TEXT));
  v_award_result JSON;
BEGIN
  -- 1) strict duplicate guard for same date
  SELECT * INTO v_existing_record
  FROM checkin_records
  WHERE user_id = p_user_id
    AND checkin_date = v_today
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'today already checked in',
      'already_checked', true,
      'reward_points', v_existing_record.reward_points,
      'continuous_days', v_existing_record.continuous_days
    );
  END IF;

  -- 2) lock/create stats row
  SELECT * INTO v_user_stats
  FROM user_checkin_stats
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO user_checkin_stats(
      user_id, user_name, total_checkins, continuous_checkins, max_continuous,
      total_points, last_checkin_date, first_checkin_date, this_month_checkins, this_year_checkins
    ) VALUES (
      p_user_id, p_user_name, 0, 0, 0,
      0, NULL, v_today, 0, 0
    )
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_user_stats
    FROM user_checkin_stats
    WHERE user_id = p_user_id
    FOR UPDATE;
  END IF;

  -- 2.1) double-check after row lock to avoid concurrent duplicate awards
  IF v_user_stats.last_checkin_date = v_today THEN
    SELECT * INTO v_existing_record
    FROM checkin_records
    WHERE user_id = p_user_id
      AND checkin_date = v_today
    ORDER BY id DESC
    LIMIT 1;

    RETURN json_build_object(
      'success', false,
      'message', 'today already checked in',
      'already_checked', true,
      'reward_points', COALESCE(v_existing_record.reward_points, 0),
      'continuous_days', COALESCE(v_existing_record.continuous_days, v_user_stats.continuous_checkins),
      'biz_id', v_effective_biz_id
    );
  END IF;

  -- 3) streak and reward calculation
  IF v_user_stats.last_checkin_date = v_yesterday THEN
    v_new_continuous := v_user_stats.continuous_checkins + 1;
  ELSE
    v_new_continuous := 1;
  END IF;

  IF v_new_continuous >= 7 THEN
    v_reward_points := 3;
  ELSIF v_new_continuous >= 3 THEN
    v_reward_points := 2;
  ELSE
    v_reward_points := 1;
  END IF;

  -- 4) award via points ledger (idempotent by biz_id)
  v_award_result := point_award(
    p_user_id,
    'daily_behavior',
    'checkin',
    v_effective_biz_id,
    v_reward_points,
    jsonb_build_object(
      'checkin_date', v_today,
      'continuous_days', v_new_continuous,
      'device_id', p_device_id,
      'ip', p_ip
    ),
    p_device_id,
    p_ip
  );

  IF COALESCE((v_award_result ->> 'success')::BOOLEAN, FALSE) = FALSE THEN
    RETURN json_build_object(
      'success', false,
      'message', COALESCE(v_award_result ->> 'message', 'checkin failed'),
      'already_checked', false,
      'risk_decision', v_award_result ->> 'risk_decision',
      'error_code', v_award_result ->> 'error_code'
    );
  END IF;

  IF COALESCE((v_award_result ->> 'already_processed')::BOOLEAN, FALSE) = TRUE THEN
    RETURN json_build_object(
      'success', false,
      'message', 'today already checked in',
      'already_checked', true,
      'reward_points', v_reward_points,
      'continuous_days', v_new_continuous,
      'biz_id', v_effective_biz_id
    );
  END IF;

  -- 5) write checkin tables
  INSERT INTO checkin_records(
    user_id, user_name, checkin_date, reward_points, is_continuous, continuous_days
  ) VALUES (
    p_user_id, p_user_name, v_today, v_reward_points, (v_new_continuous > 1), v_new_continuous
  )
  ON CONFLICT (user_id, checkin_date) DO NOTHING;

  UPDATE user_checkin_stats
  SET
    user_name = p_user_name,
    total_checkins = total_checkins + 1,
    continuous_checkins = v_new_continuous,
    max_continuous = GREATEST(max_continuous, v_new_continuous),
    total_points = total_points + v_reward_points,
    last_checkin_date = v_today,
    this_month_checkins = CASE
      WHEN last_checkin_date IS NOT NULL
       AND EXTRACT(MONTH FROM last_checkin_date) = EXTRACT(MONTH FROM v_today)
       AND EXTRACT(YEAR FROM last_checkin_date) = EXTRACT(YEAR FROM v_today)
      THEN this_month_checkins + 1
      ELSE 1
    END,
    this_year_checkins = CASE
      WHEN last_checkin_date IS NOT NULL
       AND EXTRACT(YEAR FROM last_checkin_date) = EXTRACT(YEAR FROM v_today)
      THEN this_year_checkins + 1
      ELSE 1
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'checkin success',
    'already_checked', false,
    'reward_points', v_reward_points,
    'continuous_days', v_new_continuous,
    'biz_id', v_effective_biz_id,
    'current_balance', (v_award_result ->> 'balance_after')::BIGINT,
    'risk_decision', COALESCE(v_award_result ->> 'risk_decision', 'pass')
  );
END;
$$ LANGUAGE plpgsql;

-- backward compatible signature
CREATE OR REPLACE FUNCTION perform_checkin(
  p_user_id TEXT,
  p_user_name TEXT
) RETURNS JSON AS $$
BEGIN
  RETURN perform_checkin_v2(p_user_id, p_user_name, NULL, NULL, NULL);
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 9) Minimal verification view
-- =========================================================
CREATE OR REPLACE VIEW point_user_summary AS
SELECT
  pa.user_id,
  COALESCE(p.nickname, p.display_name, pa.user_id) AS user_name,
  pa.balance,
  pa.total_earned,
  pa.total_spent,
  pa.updated_at
FROM point_account pa
LEFT JOIN guild_member_accounts a
  ON a.login_account = pa.user_id
LEFT JOIN guild_member_profiles p
  ON p.employee_no = a.employee_no;
