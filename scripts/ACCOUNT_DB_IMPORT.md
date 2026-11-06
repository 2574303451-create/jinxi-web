# Account Import to Database

> Historical reference. The importer overwrites existing security state. Keep it blocked and use the approved [incremental migration plan](../artifacts/b2-a-8/INCREMENTAL_MIGRATION.md) for future work.

The A7 integration freeze rejects this legacy entry before it reads input or connects. The commands below describe the historical importer. Real member intake needs an approved TEST candidate, verified table mappings, and a separate authorization record.

This guide wires generated guild accounts into your existing PostgreSQL database.

## 1. Prerequisites

1. `DATABASE_URL` is set in your shell.
2. You already generated account CSV from step 1:
   - `accounts_for_import.csv`
3. Node dependencies installed:

```bash
npm install
```

## 2. Create schema (once)

Run SQL file in Neon SQL Editor or any PostgreSQL client:

- `database-member-auth-schema.sql`

It creates:
- `guild_member_profiles` (employee_no + display_name + nickname + archive fields)
- `guild_member_accounts` (login_account + password_hash + force_reset_password)
- `guild_member_account_view` (helper view)

## 3. Import accounts

Basic import (uses archive mapping from `config/guild-terminal.config.json`):

```bash
node scripts/import_accounts_to_db.js --input scripts/output/accounts_for_import.csv
```

Import with manual profile override file:

```bash
node scripts/import_accounts_to_db.js \
  --input scripts/output/accounts_for_import.csv \
  --profile-map scripts/member_profile_map.csv
```

Import and also sync historical checkin names:

```bash
node scripts/import_accounts_to_db.js \
  --input scripts/output/accounts_for_import.csv \
  --sync-checkin-names
```

Validation only (no DB write):

```bash
node scripts/import_accounts_to_db.js \
  --input scripts/output/accounts_for_import.csv \
  --dry-run
```

## 4. Input file formats

### 4.1 Accounts input CSV
Headers supported:
- `employee_no` (required)
- `account` or `login_account` (required)
- `initial_password` (required if `password_hash` not present)
- `password_hash` (optional, if already hashed)
- `force_reset_password` (optional, defaults to true)

### 4.2 Profile override CSV (optional)
Use template: `scripts/member_profile_map_template.csv`

Supported columns:
- `employee_no` (required)
- `display_name`
- `nickname`
- `join_date` (`YYYY-MM-DD`)
- `member_role` (`founder` or `member`)
- `badges_json` (JSON array text, e.g. `["A","B"]`)
- `archive_member_id`

## 5. Recommended rollout

1. Run `--dry-run` first and check "Archive missing" count.
2. Fill missing profiles in `member_profile_map.csv`.
3. Run正式 import.
4. Require password reset on first login (already supported by `force_reset_password`).
