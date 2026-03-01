-- Announcement module schema
-- Run once if you want to pre-create tables manually.

CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  content_html TEXT NOT NULL,
  author VARCHAR(80) NOT NULL DEFAULT '执手',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
ON announcements (created_at DESC);
