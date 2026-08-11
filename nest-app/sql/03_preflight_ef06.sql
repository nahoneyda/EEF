select id,content_uuid,project_id,project_code,provider,provider_model,package_status,output_audio_format
from public.project_composition_packages
where content_uuid='392355fb-4861-4d7d-9120-637726e5a367'
order by updated_at desc limit 1;

select p.id as ef05_project_id,
       exists(select 1 from public.projects legacy where legacy.id=p.project_id) as exists_in_public_projects
from public.project_composition_packages p
where p.content_uuid='392355fb-4861-4d7d-9120-637726e5a367'
order by p.updated_at desc limit 1;

-- If exists_in_public_projects=false, STOP before EF-06.
-- The existing project_audio_generations FK points to public.projects(id).
