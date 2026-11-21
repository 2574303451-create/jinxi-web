const { createHash } = require('node:crypto');
const { fingerprint } = require('../../netlify/functions/_shared/function-security');
const { roles } = require('../../service-adapter/resource.cjs');
const { DATABASE, REVISION, checkDatabase, exactKeys, resourceKeys } = require('../binding.cjs');

const owners = Object.keys(roles).map(name => 'jinxi_' + name + '_owner');
const appRoles = Object.values(roles);
const namespaces = [
  'b2_lab', 'jinxi_guard', 'business_disabled', 'community_lab', 'attendance_lab', 'attendance_legacy',
  'points_lab', 'points_legacy', 'operations_lab', 'operations_legacy',
];

const METADATA = `
  SELECT current_database() AS database, session_user AS initializer, current_user AS actor,
    (SELECT system_identifier::text FROM pg_catalog.pg_control_system()) AS cluster_id,
    d.oid::text AS database_oid, pg_get_userbyid(d.datdba) AS owner,
    current_setting('server_version_num')::int AS version, host(inet_server_addr()) AS address,
    inet_server_port() AS port, (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls,
    r.rolsuper AS superuser, r.rolcreaterole AS create_role,
    (SELECT array_agg(datname::text ORDER BY datname) FROM pg_database WHERE NOT datistemplate) AS databases
  FROM pg_database d JOIN pg_roles r ON r.rolname=session_user WHERE d.datname=current_database()
`;

function checkTarget(target) {
  if (!exactKeys(target, [...resourceKeys, 'initializer']) ||
      !/^[a-z][a-z0-9_]{0,62}$/.test(target.initializer || '') ||
      [...owners, ...appRoles].includes(target.initializer)) throw Error('SYNTHETIC_DATABASE_TARGET_REJECTED');
  checkDatabase(target);
}

async function targetIdentity(client, target) {
  const { rows: [meta] } = await client.query(METADATA);
  if (!meta || meta.database !== DATABASE || meta.initializer !== target.initializer ||
      meta.actor !== target.initializer || meta.owner !== target.initializer ||
      meta.superuser !== false || meta.create_role !== true || meta.tls !== true || meta.port !== 5432 ||
      !Number.isInteger(meta.version) || meta.version < 170000 || meta.version >= 180000 || !target.serverAddresses.includes(meta.address) ||
      !meta.databases.includes(DATABASE) || meta.databases.some(name => ![DATABASE, 'postgres'].includes(name))) {
    throw Error('SYNTHETIC_DATABASE_TARGET_REJECTED');
  }
  return meta;
}

async function inspectTarget(client, target) {
  checkTarget({ ...target, fingerprint: target.fingerprint ?? '0'.repeat(64) });
  return targetIdentity(client, target);
}

async function verifyTarget(client, target) {
  checkTarget(target);
  const meta = await targetIdentity(client, target);
  if (fingerprint(meta.cluster_id, meta.database_oid, meta.database) !== target.fingerprint) {
    throw Error('SYNTHETIC_DATABASE_TARGET_REJECTED');
  }
  return meta;
}

// Platform-specific default privileges must never affect the creators below.
// Known Neon public templates belong to cloud_admin and are left intact.
async function verifyInventory(client, initialized = false) {
  const { rows: [state] } = await client.query(`
    SELECT EXISTS(SELECT 1 FROM pg_namespace
           WHERE left(nspname,3)<>'pg_' AND nspname NOT IN('public','information_schema') AND NOT(nspname=ANY($1::text[]))) OR
      EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace) OR
      EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace) OR
      EXISTS(SELECT 1 FROM pg_type WHERE typnamespace='public'::regnamespace) OR
      EXISTS(SELECT 1 FROM pg_extension WHERE extname<>'plpgsql') OR
      EXISTS(SELECT 1 FROM pg_foreign_server) OR EXISTS(SELECT 1 FROM pg_event_trigger) OR
      EXISTS(SELECT 1 FROM pg_publication) OR
      EXISTS(SELECT 1 FROM pg_subscription WHERE subdbid=(SELECT oid FROM pg_database WHERE datname=current_database())) OR
      EXISTS(SELECT 1 FROM pg_roles WHERE left(rolname,6)='jinxi_' AND rolname<>session_user AND NOT(rolname=ANY($2::text[]))) OR
      EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()
        AND (backend_type='client backend' OR backend_type IS NULL))
        AS occupied,
      EXISTS(SELECT 1 FROM pg_default_acl d
        WHERE pg_get_userbyid(d.defaclrole)<>'cloud_admin'
          OR d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname=session_user)
          OR d.defaclnamespace<>'public'::regnamespace
          OR d.defaclobjtype NOT IN('r','S')
          OR (SELECT array_agg(
                (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee)::text END)
                ||':'||a.privilege_type||':'||a.is_grantable::text
                ORDER BY a.privilege_type COLLATE "C",a.grantee,a.is_grantable) FROM aclexplode(d.defaclacl) a)
            IS DISTINCT FROM CASE d.defaclobjtype WHEN 'r' THEN ARRAY[
              'neon_superuser:DELETE:true','neon_superuser:INSERT:true','neon_superuser:MAINTAIN:true',
              'neon_superuser:REFERENCES:true','neon_superuser:SELECT:true','neon_superuser:TRIGGER:true',
              'neon_superuser:TRUNCATE:true','neon_superuser:UPDATE:true']
            ELSE ARRAY['neon_superuser:SELECT:true','neon_superuser:UPDATE:true','neon_superuser:USAGE:true'] END
      ) AS unsafe_defaults
  `, [initialized ? namespaces : [], initialized ? [...owners, ...appRoles] : []]);
  if (state.occupied !== false || state.unsafe_defaults !== false) throw Error('SYNTHETIC_DATABASE_NOT_EMPTY');
}

// Use names and definitions, not OIDs or data, so this is reproducible on
// separate PG17 clusters. Privileges and ownership are also checked below.
const STRUCTURE = `
  WITH scope AS (SELECT oid,nspname FROM pg_namespace WHERE nspname=ANY($1::text[])),
  relations AS (SELECT c.*,s.nspname FROM pg_class c JOIN scope s ON s.oid=c.relnamespace),
  initializer AS (SELECT proowner AS oid FROM pg_proc WHERE oid='jinxi_guard.environment_identity()'::regprocedure),
  expected_roles AS (SELECT oid,rolname FROM pg_roles WHERE rolname=ANY($2::text[])),
  acl_objects AS (
    SELECT 'schema' AS kind,nspname AS name,COALESCE(nspacl,acldefault('n',nspowner)) AS acl
      FROM pg_namespace WHERE oid IN(SELECT oid FROM scope) OR nspname='public'
    UNION ALL SELECT 'database',datname,COALESCE(datacl,acldefault('d',datdba)) FROM pg_database WHERE datname=current_database()
    UNION ALL SELECT 'relation',nspname||'.'||relname,
      COALESCE(relacl,acldefault(CASE WHEN relkind='S' THEN 's'::"char" ELSE 'r'::"char" END,relowner))
      FROM relations WHERE relkind IN('r','S','v','p','f','m')
    UNION ALL SELECT 'column',r.nspname||'.'||r.relname||'.'||a.attname,a.attacl
      FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid WHERE a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
    UNION ALL SELECT 'function',s.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
      COALESCE(p.proacl,acldefault('f',p.proowner)) FROM pg_proc p JOIN scope s ON s.oid=p.pronamespace
  ),
  definitions AS (
    SELECT 'schema' AS kind,nspname AS name,pg_get_userbyid(nspowner) AS definition
      FROM pg_namespace WHERE oid IN(SELECT oid FROM scope)
    UNION ALL SELECT 'relation',nspname||'.'||relname,
      jsonb_build_array(relkind,pg_get_userbyid(relowner),relrowsecurity,relforcerowsecurity)::text FROM relations
    UNION ALL SELECT 'column',r.nspname||'.'||r.relname||'.'||a.attname,
      jsonb_build_array(a.attnum,format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,
        pg_get_expr(d.adbin,d.adrelid))::text FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid
      LEFT JOIN pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum WHERE a.attnum>0 AND NOT a.attisdropped
    UNION ALL SELECT 'constraint',r.nspname||'.'||r.relname||'.'||c.conname,
      jsonb_build_array(c.convalidated,pg_get_constraintdef(c.oid))::text
      FROM pg_constraint c JOIN relations r ON r.oid=c.conrelid
    UNION ALL SELECT 'index',r.nspname||'.'||r.relname,
      jsonb_build_array(i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid))::text
      FROM pg_index i JOIN relations r ON r.oid=i.indexrelid
    UNION ALL SELECT 'trigger',r.nspname||'.'||r.relname||'.'||t.tgname,
      jsonb_build_array(t.tgenabled,pg_get_triggerdef(t.oid))::text
      FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid WHERE NOT t.tgisinternal
    UNION ALL SELECT 'policy',r.nspname||'.'||r.relname||'.'||p.polname,
      jsonb_build_array(p.polcmd,p.polpermissive,(SELECT array_agg(CASE WHEN id=0 THEN 'PUBLIC'
        ELSE pg_get_userbyid(id) END ORDER BY id) FROM unnest(p.polroles) id),
        pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))::text
      FROM pg_policy p JOIN relations r ON r.oid=p.polrelid
    UNION ALL SELECT 'function',s.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
      jsonb_build_array(CASE WHEN s.nspname='jinxi_guard' AND p.proname='environment_identity'
        THEN '<initializer>' ELSE pg_get_userbyid(p.proowner) END,p.prokind,
        CASE WHEN p.prokind<>'a' THEN pg_get_functiondef(p.oid) END)::text
      FROM pg_proc p JOIN scope s ON s.oid=p.pronamespace
    UNION ALL SELECT 'type',s.nspname||'.'||t.typname,
      jsonb_build_array(t.typtype,t.typcategory,pg_get_userbyid(t.typowner),format_type(t.typbasetype,t.typtypmod),
        t.typnotnull,t.typdefault)::text FROM pg_type t JOIN scope s ON s.oid=t.typnamespace
    UNION ALL SELECT 'namespace-object',s.nspname||'.'||o.name,o.kind
      FROM scope s JOIN (
        SELECT oprnamespace AS ns,oprname AS name,'operator' AS kind FROM pg_operator
        UNION ALL SELECT collnamespace,collname,'collation' FROM pg_collation
        UNION ALL SELECT connamespace,conname,'conversion' FROM pg_conversion
        UNION ALL SELECT opcnamespace,opcname,'operator-class' FROM pg_opclass
        UNION ALL SELECT opfnamespace,opfname,'operator-family' FROM pg_opfamily
        UNION ALL SELECT stxnamespace,stxname,'statistics' FROM pg_statistic_ext
        UNION ALL SELECT cfgnamespace,cfgname,'text-search-config' FROM pg_ts_config
        UNION ALL SELECT dictnamespace,dictname,'text-search-dictionary' FROM pg_ts_dict
        UNION ALL SELECT prsnamespace,prsname,'text-search-parser' FROM pg_ts_parser
        UNION ALL SELECT tmplnamespace,tmplname,'text-search-template' FROM pg_ts_template
      ) o ON o.ns=s.oid
    UNION ALL SELECT 'role-settings',r.rolname,to_jsonb(d.setconfig)::text
      FROM pg_db_role_setting d JOIN expected_roles r ON r.oid=d.setrole
      WHERE d.setdatabase=0 OR d.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database())
    UNION ALL SELECT 'database-settings',current_database(),to_jsonb(d.setconfig)::text
      FROM pg_db_role_setting d
      WHERE d.setrole=0 AND d.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database())
    UNION ALL SELECT 'acl:'||o.kind,o.name,jsonb_build_array(
      CASE WHEN a.grantor=i.oid THEN '<initializer>' ELSE pg_get_userbyid(a.grantor) END,
      CASE WHEN a.grantee=0 THEN 'PUBLIC' WHEN a.grantee=i.oid THEN '<initializer>' ELSE pg_get_userbyid(a.grantee) END,
      a.privilege_type,a.is_grantable)::text
      FROM acl_objects o CROSS JOIN LATERAL aclexplode(o.acl) a CROSS JOIN initializer i
  )
  SELECT kind,name,definition FROM definitions ORDER BY kind COLLATE "C",name COLLATE "C",definition COLLATE "C"
`;

async function schemaFingerprint(client) {
  await client.query("SET LOCAL search_path=pg_catalog");
  const { rows } = await client.query(STRUCTURE, [namespaces, [...owners, ...appRoles]]);
  if (rows.filter(row => row.kind === 'schema').length !== namespaces.length) throw Error('SYNTHETIC_SCHEMA_MISSING');
  return createHash('sha256').update(REVISION + '\n' + JSON.stringify(rows)).digest('hex');
}

async function roleState(client, enabled) {
  const { rows } = await client.query(`
    WITH initializer AS (SELECT proowner AS oid FROM pg_proc WHERE oid='jinxi_guard.environment_identity()'::regprocedure),
    owner_proof AS (
      SELECT count(*)::int AS valid_owners FROM pg_roles o
      WHERE o.rolname=ANY($2::text[]) AND NOT (o.rolcanlogin OR o.rolinherit OR o.rolsuper OR o.rolcreatedb
        OR o.rolcreaterole OR o.rolreplication OR o.rolbypassrls
        OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=o.oid
          OR roleid=o.oid AND member<>(SELECT oid FROM initializer)))
    )
    SELECT rolname AS name,rolcanlogin AS login,rolconnlimit AS connection_limit,
      rolinherit OR rolsuper OR rolcreatedb OR rolcreaterole
      OR rolreplication OR rolbypassrls OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid
        OR roleid=r.oid AND member<>(SELECT oid FROM initializer))
      OR has_database_privilege(r.oid,current_database(),'CREATE,TEMP')
      OR EXISTS(SELECT 1 FROM pg_namespace n WHERE left(nspname,3)<>'pg_' AND has_schema_privilege(r.oid,n.oid,'CREATE'))
      OR EXISTS(SELECT 1 FROM pg_class WHERE relowner=r.oid)
      OR EXISTS(SELECT 1 FROM pg_proc WHERE proowner=r.oid) AS unsafe,
      has_database_privilege(r.oid,current_database(),'CONNECT') AS connect,
      EXISTS(SELECT 1 FROM pg_database d WHERE d.datallowconn AND d.datname<>current_database()
        AND has_database_privilege(r.oid,d.oid,'CONNECT')) AS other_database,
      valid_owners
    FROM pg_roles r CROSS JOIN owner_proof WHERE rolname=ANY($1::text[]) ORDER BY rolname
  `, [appRoles, owners]);
  if (rows.length !== appRoles.length || rows.some(row =>
    row.login !== enabled || row.unsafe !== false || row.connect !== true || row.other_database !== false ||
    row.valid_owners !== owners.length ||
    (enabled && row.connection_limit !== 4))) throw Error('SYNTHETIC_ROLE_STATE_REJECTED');
  return rows.map(row => row.name);
}

async function verifySchema(client, approval, module) {
  const { rows: [identity] } = await client.query(`
    SELECT i.*,current_user AS role,session_user AS session_role,host(inet_server_addr()) AS address,
      inet_server_port() AS port,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls,
      current_setting('session_replication_role') AS trigger_mode
    FROM jinxi_guard.environment_identity() i
  `);
  if (!identity || !roles[module] || identity.role !== roles[module] || identity.session_role !== roles[module] ||
      identity.database_name !== approval.database || identity.environment_id !== approval.environmentId ||
      identity.classification !== 'synthetic-test' || identity.tls !== true || identity.port !== 5432 ||
      identity.trigger_mode !== 'origin' ||
      !approval.serverAddresses.includes(identity.address) ||
      fingerprint(identity.cluster_id,identity.database_oid,identity.database_name) !== approval.fingerprint) {
    throw Error('SYNTHETIC_DATABASE_IDENTITY_MISMATCH');
  }
  if (await schemaFingerprint(client) !== approval.schemaFingerprint) throw Error('SYNTHETIC_SCHEMA_FINGERPRINT_MISMATCH');
  await roleState(client, true);
}

module.exports = { namespaces, owners, appRoles, checkTarget, inspectTarget, verifyTarget, verifyInventory, schemaFingerprint, roleState, verifySchema };
