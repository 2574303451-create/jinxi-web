-- Guild sponsorship appreciation list table
-- Target: PostgreSQL (Neon)

CREATE TABLE IF NOT EXISTS guild_sponsorship_entries (
  id BIGSERIAL PRIMARY KEY,
  sponsor_name TEXT NOT NULL,
  sponsor_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guild_sponsorship_entries_time
ON guild_sponsorship_entries (sponsor_time DESC, id DESC);
