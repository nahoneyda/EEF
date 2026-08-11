begin;

alter table public.project_composition_packages
  add column if not exists content_uuid uuid,
  add column if not exists workflow_run_id uuid,
  add column if not exists module_run_id uuid,
  add column if not exists package_version text not null default 'v1.0';

update public.project_composition_packages p
set content_uuid = x.content_uuid
from (
  select project_id, min(id) as content_uuid
  from public.geef_contents
  group by project_id
  having count(*) = 1
) x
where p.project_id = x.project_id
  and p.content_uuid is null;

alter table public.project_composition_packages
  drop constraint if exists project_composition_packages_project_id_unique_v2;

alter table public.project_composition_packages
  drop constraint if exists uq_project_composition_packages_content_version;

alter table public.project_composition_packages
  add constraint uq_project_composition_packages_content_version
  unique (content_uuid, package_version);

create index if not exists idx_project_composition_packages_workflow_run
  on public.project_composition_packages(workflow_run_id);

create index if not exists idx_project_composition_packages_module_run
  on public.project_composition_packages(module_run_id);

create index if not exists idx_project_composition_packages_content
  on public.project_composition_packages(content_uuid);

commit;
