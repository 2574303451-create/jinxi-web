-- After future approval, select only the NEW synthetic project's direct endpoint,
-- initializer and jinxi_synthetic_write_v1 database. Inspect metadata, not rows.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5s';
SET LOCAL search_path=pg_catalog;
SELECT current_database() AS database, session_user AS initializer,
  pg_get_userbyid(d.datdba) AS owner, d.oid::text AS database_oid,
  (SELECT system_identifier::text FROM pg_control_system()) AS cluster_id,
  host(inet_server_addr()) AS server_address, inet_server_port() AS server_port,
  current_setting('server_version_num') AS postgres_version,
  (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls
FROM pg_database d WHERE d.datname=current_database();
SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname;
ROLLBACK;
