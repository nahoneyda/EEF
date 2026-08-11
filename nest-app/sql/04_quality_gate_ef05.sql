-- Replace WORKFLOW_RUN_ID
select
  package_status,
  module,
  provider,
  provider_model,
  generation_parameters ->> 'durationSec' as duration_sec,
  quality_requirements ->> 'preserveHook' as preserve_hook,
  quality_requirements ->> 'preserveLyrics' as preserve_lyrics,
  quality_requirements -> 'trace' ->> 'ef02_hook_line' as canonical_hook,
  output_audio_format
from public.project_composition_packages
where workflow_run_id = 'WORKFLOW_RUN_ID';
