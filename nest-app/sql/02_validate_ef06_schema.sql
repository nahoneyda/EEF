select table_name,ordinal_position,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name in ('project_audio_jobs','project_audio_generations')
order by table_name,ordinal_position;

select tablename,indexname,indexdef
from pg_indexes
where schemaname='public' and tablename in ('project_audio_jobs','project_audio_generations')
order by tablename,indexname;
