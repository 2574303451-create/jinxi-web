-- REVIEW DRAFT ONLY. Public/production member structures have NOT been verified.
-- The unconditional guard must remain until a separate authorized migration review.
BEGIN;
DO $$ BEGIN RAISE EXCEPTION 'DRAFT_NOT_APPROVED: inspect authorized TEST metadata and obtain explicit migration approval'; END $$;

-- BEGIN REVIEWABLE DDL
-- __APPROVED_SCHEMA__ is deliberately not a real schema. The rehearsal harness
-- substitutes only b2_lab after validating the authorized synthetic instance.
-- Assumptions: accounts.id bigint PK; profiles.member_id uuid UNIQUE; trusted
-- accounts.employee_no -> profiles.employee_no is complete and one-to-one.
CREATE TABLE __APPROVED_SCHEMA__.member_account_security_v2 (
  account_id bigint PRIMARY KEY REFERENCES __APPROVED_SCHEMA__.guild_member_accounts(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL UNIQUE REFERENCES __APPROVED_SCHEMA__.guild_member_profiles(member_id) ON DELETE RESTRICT,
  auth_version bigint NOT NULL DEFAULT 1 CHECK(auth_version > 0),
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE __APPROVED_SCHEMA__.member_sessions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id bigint NOT NULL REFERENCES __APPROVED_SCHEMA__.member_account_security_v2(account_id) ON DELETE RESTRICT,
  token_hash bytea NOT NULL UNIQUE CHECK(octet_length(token_hash)=32),
  csrf_hash bytea NOT NULL CHECK(octet_length(csrf_hash)=32),
  csrf_key_id text NOT NULL CHECK(csrf_key_id ~ '^[a-zA-Z0-9_-]{1,32}$'),
  auth_version bigint NOT NULL CHECK(auth_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK(expires_at > created_at),
  CHECK(idle_expires_at > created_at AND idle_expires_at <= expires_at)
);
CREATE INDEX member_sessions_v2_account ON __APPROVED_SCHEMA__.member_sessions_v2(account_id) WHERE revoked_at IS NULL;
CREATE INDEX member_sessions_v2_expiry ON __APPROVED_SCHEMA__.member_sessions_v2(expires_at);
CREATE INDEX member_sessions_v2_idle_expiry ON __APPROVED_SCHEMA__.member_sessions_v2(idle_expires_at);
CREATE TABLE __APPROVED_SCHEMA__.member_session_limits_v2 (
  bucket_hash text PRIMARY KEY CHECK(bucket_hash ~ '^[a-f0-9]{64}$'),
  hits integer NOT NULL CHECK(hits > 0),
  resets_at timestamptz NOT NULL
);
CREATE INDEX member_session_limits_v2_expiry ON __APPROVED_SCHEMA__.member_session_limits_v2(resets_at);
REVOKE ALL ON __APPROVED_SCHEMA__.member_account_security_v2,__APPROVED_SCHEMA__.member_sessions_v2,__APPROVED_SCHEMA__.member_session_limits_v2 FROM PUBLIC;
-- END REVIEWABLE DDL

-- No sample members, passwords, production grants, automatic backfill or triggers.
-- Backfill requires a reviewed exact account/profile mapping, never nickname matching.
-- Password/lock/deactivation revocation and least-privilege grants require a
-- separate migration based on actual authorized TEST columns and role topology.
ROLLBACK;
