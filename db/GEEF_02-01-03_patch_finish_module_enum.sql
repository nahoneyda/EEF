-- GEEF / EEF Entertainment Factory v0.5
-- 02-01-03 hotfix: geef_finish_module enum CASE cast
-- Release: PATCH v1.0.1 (2026-08-06)
-- Safe to run repeatedly after GEEF_02-01-02 FINAL v1.0.0.

begin;

create or replace function public.geef_finish_module(
  p_module_run_id uuid,
  p_succeeded boolean,
  p_output_payload jsonb default '{}'::jsonb,
  p_error_code text default null,
  p_error_message text default null
)
returns public.geef_module_runs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_module_run public.geef_module_runs;
  v_content_uuid uuid;
  v_next_module_code text;
  v_end_module_code text;
  v_failed_count integer;
  v_open_count integer;
begin
  select mr.* into v_module_run
  from public.geef_module_runs mr
  where mr.id = p_module_run_id
  for update;

  if not found then
    raise exception 'Module run not found: %', p_module_run_id;
  end if;

  if v_module_run.status <> 'RUNNING' then
    raise exception 'Module run % is %, expected RUNNING',
      p_module_run_id, v_module_run.status;
  end if;

  update public.geef_module_runs
  set status = case
        when p_succeeded then 'SUCCEEDED'::public.geef_run_status
        else 'FAILED'::public.geef_run_status
      end,
      finished_at = now(),
      duration_ms = greatest(
        0,
        floor(extract(epoch from (now() - coalesce(started_at, now()))) * 1000)::integer
      ),
      output_payload = coalesce(p_output_payload, '{}'::jsonb),
      error_code = case when p_succeeded then null else coalesce(p_error_code, 'MODULE_FAILED') end,
      error_message = case when p_succeeded then null else coalesce(p_error_message, 'Module execution failed') end
  where id = p_module_run_id
  returning * into v_module_run;

  select w.content_uuid, w.end_module_code into v_content_uuid, v_end_module_code
  from public.geef_workflow_runs w
  where w.id = v_module_run.workflow_run_id;

  select count(*) filter (where mr.status = 'FAILED'),
         count(*) filter (where mr.status in ('QUEUED', 'RUNNING'))
    into v_failed_count, v_open_count
  from public.geef_module_runs mr
  where mr.workflow_run_id = v_module_run.workflow_run_id;

  if not p_succeeded then
    update public.geef_module_runs
    set status = 'SKIPPED',
        finished_at = now(),
        error_code = 'UPSTREAM_FAILED',
        error_message = 'Skipped because an upstream module failed'
    where workflow_run_id = v_module_run.workflow_run_id
      and status = 'QUEUED';

    update public.geef_workflow_runs
    set status = 'FAILED', finished_at = now(),
        error_code = coalesce(p_error_code, 'MODULE_FAILED'),
        error_message = coalesce(p_error_message, 'Module execution failed')
    where id = v_module_run.workflow_run_id;

    update public.geef_contents
    set status = 'FAILED', error_summary = coalesce(p_error_message, 'Module execution failed')
    where id = v_content_uuid;
  elsif v_open_count = 0 then
    update public.geef_workflow_runs
    set status = case
          when v_failed_count = 0 then 'SUCCEEDED'::public.geef_run_status
          else 'PARTIAL_FAILURE'::public.geef_run_status
        end,
        finished_at = now(),
        error_code = null,
        error_message = null
    where id = v_module_run.workflow_run_id;

    update public.geef_contents
    set status = case
          when v_failed_count > 0 then 'FAILED'::public.geef_content_status
          when v_end_module_code = 'EF-17' then 'CANDIDATE'::public.geef_content_status
          else 'PLANNED'::public.geef_content_status
        end,
        current_module_code = null,
        error_summary = case when v_failed_count = 0 then null else error_summary end
    where id = v_content_uuid;
  else
    select m.module_code into v_next_module_code
    from public.geef_module_runs mr
    join public.geef_modules m on m.id = mr.module_id
    where mr.workflow_run_id = v_module_run.workflow_run_id
      and mr.status = 'QUEUED'
    order by m.sequence_no
    limit 1;

    update public.geef_contents
    set current_module_code = v_next_module_code
    where id = v_content_uuid;
  end if;

  return v_module_run;
end;
$$;

commit;

-- Installation check: the function definition must contain enum casts.
select
  position('SUCCEEDED''::public.geef_run_status' in pg_get_functiondef(
    'public.geef_finish_module(uuid,boolean,jsonb,text,text)'::regprocedure
  )) > 0 as finish_module_enum_cast_ok;
