-- Checkin activity extension schema (optional, future phase)
-- This script adds configurable rules and makeup capacity, and does not break existing logic.

CREATE TABLE IF NOT EXISTS checkin_reward_rules (
  id BIGSERIAL PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  day_threshold INTEGER NOT NULL CHECK (day_threshold >= 1),
  reward_points INTEGER NOT NULL CHECK (reward_points >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkin_makeup_cards (
  user_id TEXT PRIMARY KEY,
  card_balance INTEGER NOT NULL DEFAULT 0 CHECK (card_balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkin_makeup_records (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_date DATE NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('card', 'points')),
  cost_value INTEGER NOT NULL CHECK (cost_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_date)
);

CREATE INDEX IF NOT EXISTS idx_checkin_makeup_records_user_date
ON checkin_makeup_records(user_id, target_date DESC);

-- Default reward tiers (can be adjusted in operations backend)
INSERT INTO checkin_reward_rules (rule_name, day_threshold, reward_points)
VALUES
  ('daily_base_1', 1, 1),
  ('streak_3_plus', 3, 2),
  ('streak_7_plus', 7, 3)
ON CONFLICT (rule_name) DO UPDATE
SET day_threshold = EXCLUDED.day_threshold,
    reward_points = EXCLUDED.reward_points,
    is_active = TRUE,
    updated_at = NOW();
