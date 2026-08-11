-- GEEF / EEF Entertainment Factory v0.5
-- 02.개발 > 02-01-04 Make.com EF-00 연동 개발
-- Release: FINAL v1.0.0 (2026-08-06)
-- Prerequisite: GEEF_02-01-02 FINAL v1.0.0 + PATCH v1.0.1
-- Purpose: return one Make-friendly JSON payload after an atomic claim.

begin;

create or replace function public.geef_make_claim_execution(
  p_worker_id text,
  p_lease_seconds integer default 900
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.geef_execution_attempts;
  v_request public.geef_execution_requests;
  v_content public.geef_contents;
  v_module_run public.geef_module_runs;
  v_module_code text;
begin
  v_attempt := public.geef_claim_execution(p_worker_id, p_lease_seconds);

  -- An empty queue is a normal polling result, not an exception.
  if v_attempt.id is null then
    return jsonb_build_object('claimed', false);
  end if;

  select r.* into strict v_request
  from public.geef_execution_requests r
  where r.id = v_attempt.request_id;

  select c.* into strict v_content
  from public.geef_contents c
  where c.id = v_request.content_uuid;

  select mr.*
    into v_module_run
  from public.geef_module_runs mr
  join public.geef_modules m on m.id = mr.module_id
  where mr.workflow_run_id = v_request.workflow_run_id
    and mr.status = 'QUEUED'
  order by mr.sequence_no
  limit 1;

  if v_module_run.id is null then
    raise exception 'Claimed request % has no queued module', v_request.id;
  end if;

  select m.module_code
    into strict v_module_code
  from public.geef_modules m
  where m.id = v_module_run.module_id;

  return jsonb_build_object(
    'claimed', true,
    'execution_request_id', v_request.id,
    'execution_attempt_id', v_attempt.id,
    'lease_token', v_attempt.lease_token,
    'lease_expires_at', v_attempt.lease_expires_at,
    'attempt_no', v_attempt.attempt_no,
    'worker_id', v_attempt.worker_id,
    'content_uuid', v_content.id,
    'content_id', v_content.content_id,
    'run_mode', v_request.run_mode,
    'workflow_run_id', v_request.workflow_run_id,
    'module_run_id', v_module_run.id,
    'module_code', v_module_code,
    'start_module_code', v_request.start_module_code,
    'end_module_code', v_request.end_module_code,
    'request_payload', v_request.request_payload
  );
end;
$$;

revoke all on function public.geef_make_claim_execution(text,integer)
  from public, anon, authenticated;
grant execute on function public.geef_make_claim_execution(text,integer)
  to service_role;

commit;

select jsonb_build_object(
  'release', 'FINAL v1.0.0',
  'make_claim_rpc_ok',
    to_regprocedure('public.geef_make_claim_execution(text,integer)') is not null
) as geef_02_01_04_installation;
