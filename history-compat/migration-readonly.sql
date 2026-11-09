-- Planning template ONLY. Does not migrate, update roles, create accounts or issue points.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
-- A future authorized operator must separately verify resource/roles/ownership,
-- retain a snapshot, approve a reviewed mapping manifest, and define rollback.
-- No automatic inference from nickname, browser IDs, balances or old reward rules.
SELECT 'NO_MIGRATION_AUTHORIZATION; REVIEW_MAPPING_AND_RECONCILIATION_FIRST' AS blocked;
ROLLBACK;
