begin;
alter table public.project_audio_jobs
  add column if not exists content_uuid uuid,
  add column if not exists workflow_run_id uuid,
  add column if not exists module_run_id uuid,
  add column if not exists composition_package_id uuid;

alter table public.project_audio_generations
  add column if not exists content_uuid uuid,
  add column if not exists workflow_run_id uuid,
  add column if not exists module_run_id uuid;

drop index if exists public.project_audio_jobs_active_unique;

create unique index if not exists project_audio_jobs_active_content_unique
on public.project_audio_jobs(content_uuid,job_type)
where job_status=any(array['QUEUED'::text,'PROCESSING'::text,'GENERATED'::text,'UPLOADING'::text,'RETRY'::text]);

create index if not exists idx_audio_jobs_content_uuid on public.project_audio_jobs(content_uuid);
create index if not exists idx_audio_jobs_workflow_run on public.project_audio_jobs(workflow_run_id);
create index if not exists idx_audio_jobs_module_run on public.project_audio_jobs(module_run_id);
create index if not exists idx_audio_generations_content_uuid on public.project_audio_generations(content_uuid);
create index if not exists idx_audio_generations_workflow_run on public.project_audio_generations(workflow_run_id);
create index if not exists idx_audio_generations_module_run on public.project_audio_generations(module_run_id);
commit;
