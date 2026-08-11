-- GEEF / EEF Entertainment Factory v0.5
-- 02.개발 > 02-01-03 EF-00 실제 실행 스모크 테스트
-- Release: FINAL v1.0.0 (2026-08-06)
-- Prerequisites:
--   1) GEEF_02-01-01_supabase_core.sql
--   2) GEEF_02-01-02_ef00_execution_control.sql FINAL v1.0.0
-- Purpose: create an isolated TEST content and verify the complete EF-00 path.
-- Data policy: smoke-test rows are intentionally preserved as execution history.

do $$
declare
  v_content public.geef_contents;
  v_request public.geef_execution_requests;
  v_attempt public.geef_execution_attempts;
  v_module_run public.geef_module_runs;
  v_finished_module public.geef_module_runs;
  v_completed_request public.geef_execution_requests;
  v_workflow_status public.geef_run_status;
  v_content_status public.geef_content_status;
  v_history_count integer;
  v_request_key text;
  v_worker_id constant text := 'GEEF_SQL_SMOKE_WORKER';
begin
  -- 0. Fail early if either prerequisite is missing or incomplete.
  if to_regprocedure('public.geef_create_content(text,date,public.geef_run_mode,jsonb)') is null
     or to_regprocedure('public.geef_request_execution(text,text,text,text,text,smallint,jsonb,timestamptz)') is null
     or to_regprocedure('public.geef_claim_execution(text,integer)') is null
     or to_regprocedure('public.geef_heartbeat_execution(uuid,integer)') is null
     or to_regprocedure('public.geef_complete_execution(uuid,boolean,jsonb,text,text)') is null then
    raise exception 'GEEF 02-01-01 or 02-01-02 prerequisite is incomplete';
  end if;

  -- 1. Create an isolated TEST content. The issuer selects the next daily sequence.
  v_content := public.geef_create_content(
    'GEEF_ENTERTAINMENT_FACTORY'::text,
    current_date::date,
    'TEST'::public.geef_run_mode,
    jsonb_build_object(
      'source', 'GEEF_02-01-03_ef00_smoke_test',
      'executed_at', now()
    )
  );

  v_request_key := 'SMOKE:EF00:' || v_content.content_id;

  -- 2. Submit an EF-00-only idempotent execution request.
  v_request := public.geef_request_execution(
    v_content.content_id,
    v_request_key,
    'EF-00',
    'EF-00',
    'MANUAL_SMOKE_TEST',
    100::smallint,
    jsonb_build_object('source', 'supabase-sql-editor', 'test_scope', 'EF-00'),
    now()
  );

  if v_request.status <> 'QUEUED' then
    raise exception 'Request status assertion failed: expected QUEUED, got %', v_request.status;
  end if;

  -- 3. Claim the queued request. Claim also creates its workflow/module queue.
  v_attempt := public.geef_claim_execution(v_worker_id, 900);

  if v_attempt.id is null or v_attempt.request_id <> v_request.id
     or v_attempt.status <> 'RUNNING' then
    raise exception 'Claim assertion failed for request %', v_request.id;
  end if;

  -- 4. Renew the worker lease once.
  v_attempt := public.geef_heartbeat_execution(v_attempt.lease_token, 900);

  -- 5. Find and begin the EF-00 module created by the claim.
  select mr.* into v_module_run
  from public.geef_module_runs mr
  join public.geef_modules m on m.id = mr.module_id
  where mr.workflow_run_id = v_request.workflow_run_id
    and m.module_code = 'EF-00';

  -- v_request was returned before claim; refresh the workflow id written by claim.
  if not found then
    select r.* into v_request
    from public.geef_execution_requests r
    where r.id = v_attempt.request_id;

    select mr.* into v_module_run
    from public.geef_module_runs mr
    join public.geef_modules m on m.id = mr.module_id
    where mr.workflow_run_id = v_request.workflow_run_id
      and m.module_code = 'EF-00';
  end if;

  if not found then
    raise exception 'EF-00 module queue was not created for request %', v_request.id;
  end if;

  v_module_run := public.geef_begin_module(
    v_module_run.id,
    'SQL-SMOKE-' || v_attempt.id::text
  );

  if v_module_run.status <> 'RUNNING' then
    raise exception 'Module begin assertion failed: got %', v_module_run.status;
  end if;

  -- 6. Finish EF-00 successfully; this rolls up workflow/content state.
  v_finished_module := public.geef_finish_module(
    v_module_run.id,
    true,
    jsonb_build_object(
      'smoke_test', 'passed',
      'module_code', 'EF-00',
      'worker_id', v_worker_id
    ),
    null,
    null
  );

  -- 7. Complete the execution-control request with the same successful outcome.
  v_completed_request := public.geef_complete_execution(
    v_attempt.lease_token,
    true,
    jsonb_build_object(
      'smoke_test', 'passed',
      'content_id', v_content.content_id,
      'workflow_run_id', v_request.workflow_run_id
    ),
    null,
    null
  );

  -- 8. Final cross-table assertions.
  select w.status into v_workflow_status
  from public.geef_workflow_runs w
  where w.id = v_request.workflow_run_id;

  select c.status into v_content_status
  from public.geef_contents c
  where c.id = v_content.id;

  select count(*) into v_history_count
  from public.geef_execution_status_history h
  where h.request_id = v_request.id;

  if v_finished_module.status <> 'SUCCEEDED'
     or v_completed_request.status <> 'SUCCEEDED'
     or v_workflow_status <> 'SUCCEEDED'
     or v_content_status <> 'PLANNED'
     or v_history_count < 3 then
    raise exception
      'Final assertion failed: module=%, request=%, workflow=%, content=%, history=%',
      v_finished_module.status, v_completed_request.status,
      v_workflow_status, v_content_status, v_history_count;
  end if;

  raise notice 'GEEF EF-00 SMOKE TEST PASSED | content_id=% | request_id=% | workflow_run_id=% | lease_token=%',
    v_content.content_id, v_request.id, v_request.workflow_run_id, v_attempt.lease_token;
end
$$;

-- Result 1: latest smoke-test control state (must be SUCCEEDED).
select *
from public.geef_execution_control_v
where request_key like 'SMOKE:EF00:%'
order by created_at desc
limit 1;

-- Result 2: EF-00 module state (must be SUCCEEDED).
select q.*
from public.geef_execution_queue_v q
join public.geef_execution_control_v c
  on c.workflow_run_id = q.workflow_run_id
where c.request_key like 'SMOKE:EF00:%'
order by c.created_at desc, q.sequence_no
limit 1;

-- Result 3: immutable request history (REQUESTED -> CLAIMED -> COMPLETED).
select
  h.event_code,
  h.from_status,
  h.to_status,
  h.actor,
  h.created_at,
  h.details
from public.geef_execution_status_history h
join public.geef_execution_requests r on r.id = h.request_id
where r.request_key = (
  select request_key
  from public.geef_execution_control_v
  where request_key like 'SMOKE:EF00:%'
  order by created_at desc
  limit 1
)
order by h.created_at, h.id;
