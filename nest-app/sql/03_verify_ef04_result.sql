-- Replace WORKFLOW_RUN_ID

select
  mr.id as module_run_id,
  m.module_code,
  mr.status,
  mr.duration_ms,
  mr.error_code,
  mr.error_message,
  mr.output_payload
from public.geef_module_runs mr
join public.geef_modules m
  on m.id = mr.module_id
where mr.workflow_run_id = 'WORKFLOW_RUN_ID'
order by mr.created_at;

select
  *
from public.project_composition_plans
where workflow_run_id = 'WORKFLOW_RUN_ID';
