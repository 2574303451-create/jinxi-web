-- Read-only metadata only. Select jinxi-test / production / neondb in Neon first.
-- Project/branch/endpoint IDs require separate control-plane evidence: SQL cannot
-- authenticate those provider IDs. Never run on jinxi-web or pr17-validation.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5000ms';
SET LOCAL search_path = pg_catalog;
SELECT current_database() AS database_name, session_user AS initializer_role,
  (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS database_oid,
  (SELECT system_identifier::text FROM pg_control_system()) AS cluster_id,
  current_setting('server_version_num') AS server_version;
SELECT datname, pg_get_userbyid(datdba) AS owner, datallowconn
  FROM pg_database WHERE NOT datistemplate ORDER BY datname;
SELECT nspname, pg_get_userbyid(nspowner) AS owner,
  has_schema_privilege(current_user,oid,'USAGE') AS initializer_usage,
  has_schema_privilege(current_user,oid,'CREATE') AS initializer_create
  FROM pg_namespace WHERE left(nspname,3)<>'pg_' AND nspname<>'information_schema' ORDER BY nspname;
SELECT n.nspname AS schema_name,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' ORDER BY 1,2;
SELECT n.nspname AS schema_name,p.proname,p.prokind,p.prosecdef,
  pg_get_userbyid(p.proowner) AS owner,
  EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') AS extension_owned
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' ORDER BY 1,2;
SELECT n.nspname,c.relname,t.tgname,t.tgenabled,t.tgisinternal
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' ORDER BY 1,2,3;
SELECT e.extname,e.extversion,n.nspname AS schema_name,pg_get_userbyid(e.extowner) AS owner
  FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY 1;
SELECT n.nspname,t.typname,t.typtype,pg_get_userbyid(t.typowner) AS owner FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
  WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' ORDER BY 1,2;
SELECT pg_get_userbyid(d.defaclrole) AS owner,COALESCE(n.nspname,'all-schemas') AS schema_name,d.defaclobjtype,
  CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable
  FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace CROSS JOIN LATERAL aclexplode(d.defaclacl) a;
SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls
  FROM pg_roles ORDER BY rolname;
SELECT pg_get_userbyid(roleid) AS granted_role,pg_get_userbyid(member) AS member,admin_option
  FROM pg_auth_members ORDER BY 1,2;
SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
  a.privilege_type,a.is_grantable
  FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
  WHERE n.nspname='public' ORDER BY 1,2;
-- No foreign server options, user-mapping options, subscription connection
-- strings, function bodies, pg_authid, activity query text or row samples.
SELECT s.srvname,w.fdwname FROM pg_foreign_server s JOIN pg_foreign_data_wrapper w ON w.oid=s.srvfdw;
SELECT subname,subenabled,subdbid::text AS database_oid FROM pg_subscription
  WHERE subdbid=(SELECT oid FROM pg_database WHERE datname=current_database());
SELECT evtname,evtevent,evtenabled FROM pg_event_trigger;
SELECT pubname,puballtables,pubinsert,pubupdate,pubdelete,pubtruncate FROM pg_publication;
SELECT datname,usename,count(*)::int AS other_connections FROM pg_stat_activity
  WHERE pid<>pg_backend_pid() AND datname=current_database() GROUP BY datname,usename;
ROLLBACK;
