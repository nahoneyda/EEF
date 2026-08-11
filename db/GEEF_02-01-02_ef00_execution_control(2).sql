-- GEEF / EEF Entertainment Factory v0.5
-- 02.개발 > 02-01-02 EF-00 실행 제어 개발
-- Release: FINAL v1.0.0 (2026-08-06)
-- Prerequisite: GEEF_02-01-01_supabase_core.sql
-- Policy: additive migration; execution history is append-only.
-- Scope: EF-00 request, claim, heartbeat, completion, retry, stale recovery,
--        workflow/module queue control, audit history, RLS and service-role API.

begin;

-- Fail early when the prerequisite migration was not installed.
do $$
begin
  if to_regclass('public.geef_contents') is null
     or to_regclass('public.geef_workflow_runs') is null
     or to_regclass('public.geef_module_runs') is null then
    raise exception
      'GEEF_02-01-01_supabase_core.sql must be installed before this migration';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 0. EF-00 execution-control ledger (append-only attempts and events)
-- ---------------------------------------------------------------------------
create table if not exists public.geef_execution_requests (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique,
  content_uuid uuid not null references public.geef_contents(id) on delete cascade,
  start_module_code text not null default 'EF-00',
  end_module_code text not null default 'EF-17',
  run_mode public.geef_run_mode not null,
  status public.geef_run_status not null default 'QUEUED',
  priority smallint not null default 100,
  requested_by text not null default 'SYSTEM',
  request_payload jsonb not null default '{}'::jsonb,
  workflow_run_id uuid references public.geef_workflow_runs(id) on delete set null,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint geef_execution_requests_range_ck check (
    start_module_code ~ '^EF-(0[0-9]|1[0-7])$'
    and end_module_code ~ '^EF-(0[0-9]|1[0-7])$'
  ),
  constraint geef_execution_requests_priority_ck check (priority between 0 and 999)
);

create table if not exists public.geef_execution_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.geef_execution_requests(id) on delete cascade,
  attempt_no smallint not null,
  status public.geef_run_status not null default 'RUNNING',
  worker_id text not null,
  lease_token uuid not null default gen_random_uuid(),
  claimed_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  lease_expires_at timestamptz not null,
  finished_at timestamptz,
  error_code text,
  error_message text,
  output_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(request_id, attempt_no),
  unique(lease_token),
  constraint geef_execution_attempts_no_ck check (attempt_no > 0)
);

create table if not exists public.geef_execution_status_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.geef_execution_requests(id) on delete cascade,
  attempt_id uuid references public.geef_execution_attempts(id) on delete set null,
  from_status public.geef_run_status,
  to_status public.geef_run_status not null,
  event_code text not null,
  actor text not null default 'SYSTEM',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists geef_execution_requests_queue_ix
  on public.geef_execution_requests(priority, available_at, created_at)
  where status = 'QUEUED';
create index if not exists geef_execution_attempts_lease_ix
  on public.geef_execution_attempts(status, lease_expires_at)
  where status = 'RUNNING';
create index if not exists geef_execution_history_request_ix
  on public.geef_execution_status_history(request_id, created_at desc);

-- Only one active EF-00 request is permitted for a content item.
create unique index if not exists geef_execution_requests_one_active_uq
  on public.geef_execution_requests(content_uuid)
  where status in ('QUEUED', 'RUNNING');

drop trigger if exists geef_execution_requests_updated_at_trg
  on public.geef_execution_requests;
create trigger geef_execution_requests_updated_at_trg
before update on public.geef_execution_requests
for each row execute function public.geef_set_updated_at();

-- ---------------------------------------------------------------------------
-- 1. Start one workflow and enqueue the selected EF module range
-- ---------------------------------------------------------------------------
create or replace function public.geef_start_workflow(
  p_content_id text,
  p_start_module_code text default 'EF-00',
  p_end_module_code text default 'EF-17',
  p_triggered_by text default 'MANUAL',
  p_input_payload jsonb default '{}'::jsonb,
  p_parent_run_id uuid default null
)
returns public.geef_workflow_runs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content public.geef_contents;
  v_project public.geef_projects;
  v_start_sequence smallint;
  v_end_sequence smallint;
  v_run_no integer;
  v_workflow public.geef_workflow_runs;
  v_module_count integer;
begin
  select c.* into v_content
  from public.geef_contents c
  where c.content_id = p_content_id
  for update;

  if not found then
    raise exception 'GEEF content not found: %', p_content_id;
  end if;

  if v_content.status in ('PUBLISHED', 'CANCELLED') then
    raise exception 'Content % cannot start from status %', p_content_id, v_content.status;
  end if;

  select p.* into v_project
  from public.geef_projects p
  where p.id = v_content.project_id and p.is_active;

  if not found then
    raise exception 'Active project not found for content: %', p_content_id;
  end if;

  select m.sequence_no into v_start_sequence
  from public.geef_modules m
  where m.project_id = v_content.project_id
    and m.module_code = p_start_module_code
    and m.is_active;

  if not found then
    raise exception 'Active start module not found: %', p_start_module_code;
  end if;

  select m.sequence_no into v_end_sequence
  from public.geef_modules m
  where m.project_id = v_content.project_id
    and m.module_code = p_end_module_code
    and m.is_active;

  if not found then
    raise exception 'Active end module not found: %', p_end_module_code;
  end if;

  if v_start_sequence > v_end_sequence then
    raise exception 'Invalid module range: % must precede %',
      p_start_module_code, p_end_module_code;
  end if;

  if p_parent_run_id is not null and not exists (
    select 1 from public.geef_workflow_runs w
    where w.id = p_parent_run_id and w.content_uuid = v_content.id
  ) then
    raise exception 'Parent workflow does not belong to content: %', p_content_id;
  end if;

  if exists (
    select 1 from public.geef_workflow_runs w
    where w.content_uuid = v_content.id
      and w.status in ('QUEUED', 'RUNNING')
  ) then
    raise exception 'Content % already has an active workflow', p_content_id;
  end if;

  select coalesce(max(w.run_no), 0) + 1 into v_run_no
  from public.geef_workflow_runs w
  where w.content_uuid = v_content.id;

  insert into public.geef_workflow_runs(
    content_uuid, run_no, run_mode, status,
    start_module_code, end_module_code, parent_run_id,
    triggered_by, input_payload
  ) values (
    v_content.id, v_run_no, v_content.run_mode, 'QUEUED',
    p_start_module_code, p_end_module_code, p_parent_run_id,
    coalesce(nullif(trim(p_triggered_by), ''), 'MANUAL'),
    coalesce(p_input_payload, '{}'::jsonb)
  ) returning * into v_workflow;

  insert into public.geef_module_runs(
    workflow_run_id, module_id, attempt_no, status, idempotency_key,
    input_payload
  )
  select
    v_workflow.id,
    m.id,
    1,
    'QUEUED',
    p_content_id || ':RUN-' || v_run_no || ':' || m.module_code || ':ATTEMPT-1',
    jsonb_build_object(
      'content_id', p_content_id,
      'run_no', v_run_no,
      'run_mode', v_content.run_mode,
      'module_code', m.module_code,
      'timezone', v_project.timezone
    ) || coalesce(p_input_payload, '{}'::jsonb)
  from public.geef_modules m
  where m.project_id = v_content.project_id
    and m.is_active
    and m.sequence_no between v_start_sequence and v_end_sequence
  order by m.sequence_no;

  get diagnostics v_module_count = row_count;
  if v_module_count = 0 then
    raise exception 'No active modules found in selected range';
  end if;

  update public.geef_contents
  set status = 'IN_PRODUCTION',
      current_module_code = p_start_module_code,
      error_summary = null
  where id = v_content.id;

  return v_workflow;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Mark a queued module as running
-- ---------------------------------------------------------------------------
create or replace function public.geef_begin_module(
  p_module_run_id uuid,
  p_make_execution_id text default null
)
returns public.geef_module_runs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_module_run public.geef_module_runs;
  v_module_code text;
  v_content_uuid uuid;
begin
  select mr.* into v_module_run
  from public.geef_module_runs mr
  where mr.id = p_module_run_id
  for update;

  if not found then
    raise exception 'Module run not found: %', p_module_run_id;
  end if;

  if v_module_run.status <> 'QUEUED' then
    raise exception 'Module run % is %, expected QUEUED',
      p_module_run_id, v_module_run.status;
  end if;

  select m.module_code, w.content_uuid
    into v_module_code, v_content_uuid
  from public.geef_modules m
  join public.geef_workflow_runs w on w.id = v_module_run.workflow_run_id
  where m.id = v_module_run.module_id;

  update public.geef_module_runs
  set status = 'RUNNING',
      make_execution_id = coalesce(p_make_execution_id, make_execution_id),
      started_at = coalesce(started_at, now()),
      error_code = null,
      error_message = null
  where id = p_module_run_id
  returning * into v_module_run;

  update public.geef_workflow_runs
  set status = 'RUNNING',
      started_at = coalesce(started_at, now())
  where id = v_module_run.workflow_run_id
    and status = 'QUEUED';

  update public.geef_contents
  set status = 'IN_PRODUCTION', current_module_code = v_module_code
  where id = v_content_uuid;

  return v_module_run;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Finish a module and roll up workflow/content status
-- ---------------------------------------------------------------------------
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
  set status = case when p_succeeded then 'SUCCEEDED' else 'FAILED' end,
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
    set status = case when v_failed_count = 0 then 'SUCCEEDED' else 'PARTIAL_FAILURE' end,
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

-- ---------------------------------------------------------------------------
-- 4. Create a new workflow from a failed module (history is preserved)
-- ---------------------------------------------------------------------------
create or replace function public.geef_retry_failed_module(
  p_failed_module_run_id uuid,
  p_triggered_by text default 'MANUAL_RETRY',
  p_input_payload jsonb default '{}'::jsonb
)
returns public.geef_workflow_runs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_failed public.geef_module_runs;
  v_content_id text;
  v_module_code text;
  v_parent_run_id uuid;
  v_retry_count integer;
  v_retry_limit integer;
begin
  -- A composite row variable cannot share a multi-item INTO target list.
  -- Load the module-run row first, then load its scalar retry limit separately.
  select mr.*
    into v_failed
  from public.geef_module_runs mr
  where mr.id = p_failed_module_run_id;

  if not found then
    raise exception 'Failed module run not found: %', p_failed_module_run_id;
  end if;

  if v_failed.status <> 'FAILED' then
    raise exception 'Module run % is %, expected FAILED',
      p_failed_module_run_id, v_failed.status;
  end if;

  select m.retry_limit
    into v_retry_limit
  from public.geef_modules m
  where m.id = v_failed.module_id;

  if not found then
    raise exception 'Module definition not found for module run: %',
      p_failed_module_run_id;
  end if;

  select c.content_id, m.module_code, coalesce(w.parent_run_id, w.id)
    into v_content_id, v_module_code, v_parent_run_id
  from public.geef_workflow_runs w
  join public.geef_contents c on c.id = w.content_uuid
  join public.geef_modules m on m.id = v_failed.module_id
  where w.id = v_failed.workflow_run_id;

  select count(*) into v_retry_count
  from public.geef_workflow_runs w
  where w.parent_run_id = v_parent_run_id
    and w.start_module_code = v_module_code;

  if v_retry_count >= v_retry_limit then
    raise exception 'Retry limit % reached for module %', v_retry_limit, v_module_code;
  end if;

  return public.geef_start_workflow(
    v_content_id,
    v_module_code,
    'EF-17',
    p_triggered_by,
    jsonb_build_object(
      'retry_of_module_run_id', p_failed_module_run_id,
      'retry_number', v_retry_count + 1
    ) || coalesce(p_input_payload, '{}'::jsonb),
    v_parent_run_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Read model for Make.com / admin monitoring
-- ---------------------------------------------------------------------------
create or replace view public.geef_execution_queue_v as
select
  c.content_id,
  c.target_date,
  c.run_mode,
  c.status as content_status,
  w.id as workflow_run_id,
  w.run_no,
  w.status as workflow_status,
  w.correlation_id,
  m.module_code,
  m.module_name,
  m.sequence_no,
  mr.id as module_run_id,
  mr.attempt_no,
  mr.status as module_status,
  mr.idempotency_key,
  mr.started_at,
  mr.finished_at,
  mr.error_code,
  mr.error_message
from public.geef_contents c
join public.geef_workflow_runs w on w.content_uuid = c.id
join public.geef_module_runs mr on mr.workflow_run_id = w.id
join public.geef_modules m on m.id = mr.module_id;

grant select on public.geef_execution_queue_v to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Submit an idempotent EF-00 execution request
-- ---------------------------------------------------------------------------
create or replace function public.geef_request_execution(
  p_content_id text,
  p_request_key text,
  p_start_module_code text default 'EF-00',
  p_end_module_code text default 'EF-17',
  p_requested_by text default 'SYSTEM',
  p_priority smallint default 100,
  p_request_payload jsonb default '{}'::jsonb,
  p_available_at timestamptz default now()
)
returns public.geef_execution_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content public.geef_contents;
  v_request public.geef_execution_requests;
  v_start_sequence smallint;
  v_end_sequence smallint;
begin
  if nullif(btrim(p_request_key), '') is null then
    raise exception 'request_key must not be empty';
  end if;

  select c.* into v_content
  from public.geef_contents c
  where c.content_id = p_content_id
  for update;

  if not found then
    raise exception 'GEEF content not found: %', p_content_id;
  end if;

  if v_content.status in ('PUBLISHED', 'CANCELLED') then
    raise exception 'Content % cannot accept an execution request from status %',
      p_content_id, v_content.status;
  end if;

  select m.sequence_no into v_start_sequence
  from public.geef_modules m
  where m.project_id = v_content.project_id
    and m.module_code = p_start_module_code
    and m.is_active;
  if not found then
    raise exception 'Active start module not found: %', p_start_module_code;
  end if;

  select m.sequence_no into v_end_sequence
  from public.geef_modules m
  where m.project_id = v_content.project_id
    and m.module_code = p_end_module_code
    and m.is_active;
  if not found then
    raise exception 'Active end module not found: %', p_end_module_code;
  end if;

  if v_start_sequence > v_end_sequence then
    raise exception 'Invalid module range: % must precede %',
      p_start_module_code, p_end_module_code;
  end if;

  perform pg_advisory_xact_lock(hashtext('GEEF:EF-00:' || p_content_id));

  select r.* into v_request
  from public.geef_execution_requests r
  where r.request_key = p_request_key;
  if found then
    if v_request.content_uuid <> v_content.id
       or v_request.start_module_code <> p_start_module_code
       or v_request.end_module_code <> p_end_module_code then
      raise exception 'request_key % is already used with different parameters',
        p_request_key;
    end if;
    return v_request;
  end if;

  insert into public.geef_execution_requests(
    request_key, content_uuid, start_module_code, end_module_code,
    run_mode, priority, requested_by, request_payload, available_at
  ) values (
    p_request_key, v_content.id, p_start_module_code, p_end_module_code,
    v_content.run_mode, p_priority,
    coalesce(nullif(btrim(p_requested_by), ''), 'SYSTEM'),
    coalesce(p_request_payload, '{}'::jsonb), coalesce(p_available_at, now())
  ) returning * into v_request;

  insert into public.geef_execution_status_history(
    request_id, from_status, to_status, event_code, actor, details
  ) values (
    v_request.id, null, 'QUEUED', 'REQUESTED', v_request.requested_by,
    jsonb_build_object(
      'content_id', p_content_id,
      'start_module_code', p_start_module_code,
      'end_module_code', p_end_module_code
    )
  );

  return v_request;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Atomically claim the next request and create its workflow/attempt
-- ---------------------------------------------------------------------------
create or replace function public.geef_claim_execution(
  p_worker_id text,
  p_lease_seconds integer default 900
)
returns public.geef_execution_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.geef_execution_requests;
  v_attempt public.geef_execution_attempts;
  v_attempt_no smallint;
  v_content_id text;
  v_workflow public.geef_workflow_runs;
begin
  if nullif(btrim(p_worker_id), '') is null then
    raise exception 'worker_id must not be empty';
  end if;
  if p_lease_seconds < 30 or p_lease_seconds > 86400 then
    raise exception 'lease_seconds must be between 30 and 86400';
  end if;

  select r.* into v_request
  from public.geef_execution_requests r
  where r.status = 'QUEUED'
    and r.available_at <= now()
  order by r.priority asc, r.available_at asc, r.created_at asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  select c.content_id into v_content_id
  from public.geef_contents c
  where c.id = v_request.content_uuid;

  v_workflow := public.geef_start_workflow(
    v_content_id,
    v_request.start_module_code,
    v_request.end_module_code,
    'EF-00:' || p_worker_id,
    v_request.request_payload || jsonb_build_object('execution_request_id', v_request.id),
    null
  );

  select (coalesce(max(a.attempt_no), 0) + 1)::smallint into v_attempt_no
  from public.geef_execution_attempts a
  where a.request_id = v_request.id;

  insert into public.geef_execution_attempts(
    request_id, attempt_no, worker_id, lease_expires_at
  ) values (
    v_request.id, v_attempt_no, p_worker_id,
    now() + make_interval(secs => p_lease_seconds)
  ) returning * into v_attempt;

  update public.geef_execution_requests
  set status = 'RUNNING', workflow_run_id = v_workflow.id,
      started_at = coalesce(started_at, now()), error_code = null, error_message = null
  where id = v_request.id;

  insert into public.geef_execution_status_history(
    request_id, attempt_id, from_status, to_status, event_code, actor, details
  ) values (
    v_request.id, v_attempt.id, 'QUEUED', 'RUNNING', 'CLAIMED', p_worker_id,
    jsonb_build_object('workflow_run_id', v_workflow.id,
                       'lease_expires_at', v_attempt.lease_expires_at)
  );

  return v_attempt;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Renew a running attempt lease
-- ---------------------------------------------------------------------------
create or replace function public.geef_heartbeat_execution(
  p_lease_token uuid,
  p_lease_seconds integer default 900
)
returns public.geef_execution_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.geef_execution_attempts;
begin
  if p_lease_seconds < 30 or p_lease_seconds > 86400 then
    raise exception 'lease_seconds must be between 30 and 86400';
  end if;

  update public.geef_execution_attempts
  set heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds)
  where lease_token = p_lease_token
    and status = 'RUNNING'
    and lease_expires_at > now()
  returning * into v_attempt;

  if not found then
    raise exception 'Active execution lease not found or already expired';
  end if;
  return v_attempt;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Complete one claimed EF-00 request
-- ---------------------------------------------------------------------------
create or replace function public.geef_complete_execution(
  p_lease_token uuid,
  p_succeeded boolean,
  p_output_payload jsonb default '{}'::jsonb,
  p_error_code text default null,
  p_error_message text default null
)
returns public.geef_execution_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.geef_execution_attempts;
  v_request public.geef_execution_requests;
  v_to_status public.geef_run_status;
begin
  select a.* into v_attempt
  from public.geef_execution_attempts a
  where a.lease_token = p_lease_token
  for update;

  if not found or v_attempt.status <> 'RUNNING' then
    raise exception 'Running execution attempt not found for lease token';
  end if;

  v_to_status := case
    when p_succeeded then 'SUCCEEDED'::public.geef_run_status
    else 'FAILED'::public.geef_run_status
  end;

  update public.geef_execution_attempts
  set status = v_to_status, finished_at = now(),
      output_payload = coalesce(p_output_payload, '{}'::jsonb),
      error_code = case when p_succeeded then null else coalesce(p_error_code, 'EF00_FAILED') end,
      error_message = case when p_succeeded then null else coalesce(p_error_message, 'EF-00 execution failed') end
  where id = v_attempt.id;

  update public.geef_execution_requests
  set status = v_to_status, finished_at = now(),
      error_code = case when p_succeeded then null else coalesce(p_error_code, 'EF00_FAILED') end,
      error_message = case when p_succeeded then null else coalesce(p_error_message, 'EF-00 execution failed') end
  where id = v_attempt.request_id
  returning * into v_request;

  insert into public.geef_execution_status_history(
    request_id, attempt_id, from_status, to_status, event_code, actor, details
  ) values (
    v_request.id, v_attempt.id, 'RUNNING', v_to_status,
    case when p_succeeded then 'COMPLETED' else 'FAILED' end,
    v_attempt.worker_id,
    coalesce(p_output_payload, '{}'::jsonb)
  );

  return v_request;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Recover expired leases; retry or permanently fail the request
-- ---------------------------------------------------------------------------
create or replace function public.geef_recover_stale_executions(
  p_max_attempts smallint default 3,
  p_retry_delay_seconds integer default 60
)
returns table(request_id uuid, action_taken text, attempt_no smallint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.geef_execution_attempts;
  v_new_status public.geef_run_status;
begin
  if p_max_attempts < 1 or p_max_attempts > 10 then
    raise exception 'max_attempts must be between 1 and 10';
  end if;
  if p_retry_delay_seconds < 0 or p_retry_delay_seconds > 86400 then
    raise exception 'retry_delay_seconds must be between 0 and 86400';
  end if;

  for v_attempt in
    select a.*
    from public.geef_execution_attempts a
    where a.status = 'RUNNING'
      and a.lease_expires_at <= now()
    order by a.lease_expires_at
    for update skip locked
  loop
    v_new_status := case
      when v_attempt.attempt_no < p_max_attempts
        then 'QUEUED'::public.geef_run_status
      else 'FAILED'::public.geef_run_status
    end;

    update public.geef_execution_attempts
    set status = 'FAILED', finished_at = now(),
        error_code = 'STALE_LEASE',
        error_message = 'Worker heartbeat lease expired'
    where id = v_attempt.id;

    -- Close the workflow before a retry clears request.workflow_run_id.
    update public.geef_workflow_runs
    set status = 'FAILED', finished_at = now(),
        error_code = 'STALE_LEASE', error_message = 'EF-00 worker lease expired'
    where id = (select r.workflow_run_id
                from public.geef_execution_requests r
                where r.id = v_attempt.request_id)
      and status in ('QUEUED', 'RUNNING');

    update public.geef_execution_requests
    set status = v_new_status,
        available_at = case when v_new_status = 'QUEUED'
          then now() + make_interval(secs => p_retry_delay_seconds)
          else available_at end,
        finished_at = case when v_new_status = 'FAILED' then now() else null end,
        workflow_run_id = case when v_new_status = 'QUEUED' then null else workflow_run_id end,
        error_code = case when v_new_status = 'FAILED' then 'STALE_LEASE' else null end,
        error_message = case when v_new_status = 'FAILED'
          then 'Maximum execution attempts exhausted after stale lease' else null end
    where id = v_attempt.request_id;

    insert into public.geef_execution_status_history(
      request_id, attempt_id, from_status, to_status, event_code, actor, details
    ) values (
      v_attempt.request_id, v_attempt.id, 'RUNNING', v_new_status,
      case when v_new_status = 'QUEUED' then 'STALE_REQUEUED' else 'STALE_FAILED' end,
      'STALE_RECOVERY', jsonb_build_object('expired_attempt_no', v_attempt.attempt_no)
    );

    request_id := v_attempt.request_id;
    action_taken := case when v_new_status = 'QUEUED' then 'REQUEUED' else 'FAILED' end;
    attempt_no := v_attempt.attempt_no;
    return next;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Monitoring view, RLS, API privileges
-- ---------------------------------------------------------------------------
create or replace view public.geef_execution_control_v as
select
  r.id as execution_request_id,
  r.request_key,
  c.content_id,
  r.run_mode,
  r.start_module_code,
  r.end_module_code,
  r.status,
  r.priority,
  r.requested_by,
  r.workflow_run_id,
  a.id as latest_attempt_id,
  a.attempt_no as latest_attempt_no,
  a.worker_id,
  a.heartbeat_at,
  a.lease_expires_at,
  r.error_code,
  r.error_message,
  r.created_at,
  r.started_at,
  r.finished_at
from public.geef_execution_requests r
join public.geef_contents c on c.id = r.content_uuid
left join lateral (
  select ea.*
  from public.geef_execution_attempts ea
  where ea.request_id = r.id
  order by ea.attempt_no desc
  limit 1
) a on true;

alter table public.geef_execution_requests enable row level security;
alter table public.geef_execution_attempts enable row level security;
alter table public.geef_execution_status_history enable row level security;

drop policy if exists geef_execution_requests_authenticated_read
  on public.geef_execution_requests;
create policy geef_execution_requests_authenticated_read
  on public.geef_execution_requests for select to authenticated using (true);
drop policy if exists geef_execution_attempts_authenticated_read
  on public.geef_execution_attempts;
create policy geef_execution_attempts_authenticated_read
  on public.geef_execution_attempts for select to authenticated using (true);
drop policy if exists geef_execution_history_authenticated_read
  on public.geef_execution_status_history;
create policy geef_execution_history_authenticated_read
  on public.geef_execution_status_history for select to authenticated using (true);

grant select on public.geef_execution_control_v to authenticated;
grant select on public.geef_execution_requests,
  public.geef_execution_attempts,
  public.geef_execution_status_history to authenticated;

create or replace function public.geef_verify_ef00_installation()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'release', 'FINAL v1.0.0',
    'tables_ok',
      to_regclass('public.geef_execution_requests') is not null
      and to_regclass('public.geef_execution_attempts') is not null
      and to_regclass('public.geef_execution_status_history') is not null,
    'start_workflow_ok',
      to_regprocedure('public.geef_start_workflow(text,text,text,text,jsonb,uuid)') is not null,
    'request_execution_ok',
      to_regprocedure('public.geef_request_execution(text,text,text,text,text,smallint,jsonb,timestamptz)') is not null,
    'claim_execution_ok',
      to_regprocedure('public.geef_claim_execution(text,integer)') is not null,
    'heartbeat_ok',
      to_regprocedure('public.geef_heartbeat_execution(uuid,integer)') is not null,
    'completion_ok',
      to_regprocedure('public.geef_complete_execution(uuid,boolean,jsonb,text,text)') is not null,
    'stale_recovery_ok',
      to_regprocedure('public.geef_recover_stale_executions(smallint,integer)') is not null
  );
$$;

revoke all on function public.geef_request_execution(
  text,text,text,text,text,smallint,jsonb,timestamptz) from public, anon, authenticated;
revoke all on function public.geef_claim_execution(text,integer)
  from public, anon, authenticated;
revoke all on function public.geef_heartbeat_execution(uuid,integer)
  from public, anon, authenticated;
revoke all on function public.geef_complete_execution(uuid,boolean,jsonb,text,text)
  from public, anon, authenticated;
revoke all on function public.geef_recover_stale_executions(smallint,integer)
  from public, anon, authenticated;

grant execute on function public.geef_request_execution(
  text,text,text,text,text,smallint,jsonb,timestamptz) to service_role;
grant execute on function public.geef_claim_execution(text,integer) to service_role;
grant execute on function public.geef_heartbeat_execution(uuid,integer) to service_role;
grant execute on function public.geef_complete_execution(uuid,boolean,jsonb,text,text)
  to service_role;
grant execute on function public.geef_recover_stale_executions(smallint,integer)
  to service_role;
grant execute on function public.geef_verify_ef00_installation() to authenticated;

commit;

-- Installation verification (run after the migration):
-- select public.geef_verify_ef00_installation();

-- ---------------------------------------------------------------------------
-- Smoke test (run each block manually after this migration)
-- ---------------------------------------------------------------------------
-- A. Verify the final installation (every *_ok value must be true)
-- select public.geef_verify_ef00_installation();
--
-- B. Submit an idempotent EF-00-only request (service role/backend)
-- select * from public.geef_request_execution(
--   'EF-ENT-20260806-001'::text,
--   'SMOKE:EF-ENT-20260806-001:EF-00:1'::text,
--   'EF-00'::text,
--   'EF-00'::text,
--   'MANUAL_SMOKE_TEST'::text,
--   100::smallint,
--   '{"source":"supabase-sql-editor"}'::jsonb,
--   now()
-- );
--
-- C. Inspect request state
-- select * from public.geef_execution_control_v
-- where content_id = 'EF-ENT-20260806-001';
