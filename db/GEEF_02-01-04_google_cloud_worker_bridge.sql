-- GEEF / EEF Entertainment Factory v0.5
-- 02.개발 > 02-01-04 Google Cloud EF-00 Worker 연동 개발
-- Release: FINAL v1.0.0 (2026-08-06)
-- Prerequisite: GEEF_02-01-04_make_ef00_bridge.sql
-- Purpose: provider-neutral alias for Cloud Run and future workers.

begin;

create or replace function public.geef_worker_claim_execution(
  p_worker_id text,
  p_lease_seconds integer default 900
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.geef_make_claim_execution(p_worker_id, p_lease_seconds);
$$;

revoke all on function public.geef_worker_claim_execution(text, integer)
  from public, anon, authenticated;
grant execute on function public.geef_worker_claim_execution(text, integer)
  to service_role;

commit;

select jsonb_build_object(
  'release', 'FINAL v1.0.0',
  'worker_claim_rpc_ok',
    to_regprocedure('public.geef_worker_claim_execution(text,integer)') is not null
) as geef_02_01_04_google_bridge_installation;
