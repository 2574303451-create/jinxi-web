-- Non-secret approval metadata. Copy privately, fill from reviewed preflight,
-- and execute in the SAME session before 01/02/03/04. Defaults cannot authorize.
-- This is not authorization to run against any remote resource.
SELECT set_config('jinxi_test.approval','PENDING',false),
  set_config('jinxi_test.project_id','PENDING',false),
  set_config('jinxi_test.branch_id','PENDING',false),
  set_config('jinxi_test.endpoint_id','PENDING',false),
  set_config('jinxi_test.expected_cluster_id','PENDING',false),
  set_config('jinxi_test.expected_database_oid','PENDING',false),
  set_config('jinxi_test.environment_id','PENDING',false);
