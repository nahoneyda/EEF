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
  id,
  content_id,
  content_uuid,
  workflow_run_id,
  module_run_id,
  genre,
  subgenre,
  bpm,
  musical_key,
  time_signature,
  target_duration_sec,
  energy,
  valence,
  danceability,
  mood,
  instrumentation,
  vocal_spec,
  arrangement,
  production_style,
  generation_constraints,
  status,
  source_module,
  model_provider,
  model_name,
  prompt_version,
  updated_at
from public.content_music_specs
where workflow_run_id = 'WORKFLOW_RUN_ID';
