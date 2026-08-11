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
join public.geef_modules m on m.id = mr.module_id
where mr.workflow_run_id = 'WORKFLOW_RUN_ID'
  and m.module_code = 'EF-05';

select
  id,
  content_uuid,
  workflow_run_id,
  module_run_id,
  package_version,
  workflow_version,
  module,
  module_version,
  project_id,
  project_code,
  provider,
  provider_model,
  title_ko,
  title_en,
  language,
  style_prompt,
  lyrics_prompt,
  negative_prompt,
  generation_parameters,
  arrangement_plan,
  quality_requirements,
  package_status,
  generation_model,
  prompt_version,
  provider_prompt,
  output_audio_format,
  updated_at
from public.project_composition_packages
where workflow_run_id = 'WORKFLOW_RUN_ID';
