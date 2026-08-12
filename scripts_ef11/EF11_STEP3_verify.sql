-- =========================================================
-- EF-11 결과 검증
-- Replace NEW_WORKFLOW_RUN_ID
-- content_uuid = 392355fb-4861-4d7d-9120-637726e5a367
-- =========================================================

-- 1) EF-11 module_run 상태
select mr.id as module_run_id, mr.status, mr.error_code, mr.error_message, mr.finished_at
from public.geef_module_runs mr
join public.geef_modules m on m.id = mr.module_id
where mr.workflow_run_id = 'NEW_WORKFLOW_RUN_ID' and m.module_code = 'EF-11';

-- 2) VIDEO_SET 매니페스트 요약
select
  gv.id as generation_id, gv.module_run_id, gv.version_no, gv.is_current,
  (gv.result_payload ->> 'schema_version')      as schema_version,
  (gv.result_payload ->> 'provider')            as provider,
  (gv.result_payload ->> 'succeeded_shots')::int as succeeded_shots,
  (gv.result_payload ->> 'failed_shots')::int    as failed_shots,
  (gv.result_payload ->> 'total_duration_sec')::numeric as total_duration_sec
from public.geef_generation_versions gv
where gv.content_uuid = '392355fb-4861-4d7d-9120-637726e5a367'
  and gv.generation_type = 'VIDEO_SET' and gv.is_current = true;

-- 3) 저장된 영상 아티팩트 (is_current)
select a.id as artifact_id, a.artifact_name, a.storage_bucket, a.storage_path,
       a.public_url, a.mime_type, a.size_bytes
from public.geef_artifacts a
where a.content_uuid = '392355fb-4861-4d7d-9120-637726e5a367'
  and a.is_current = true
  and a.module_run_id = (
    select mr.id from public.geef_module_runs mr
    join public.geef_modules m on m.id = mr.module_id
    where mr.workflow_run_id = 'NEW_WORKFLOW_RUN_ID' and m.module_code = 'EF-11'
  )
order by a.created_at;

-- 4) 종합 PASS/FAIL (스칼라 서브쿼리)
select
  case
    when (
      select mr.status from public.geef_module_runs mr
      join public.geef_modules m on m.id = mr.module_id
      where mr.workflow_run_id = 'NEW_WORKFLOW_RUN_ID' and m.module_code = 'EF-11'
    ) = 'SUCCEEDED'
    and (
      select (gv.result_payload ->> 'schema_version')
      from public.geef_generation_versions gv
      where gv.content_uuid = '392355fb-4861-4d7d-9120-637726e5a367'
        and gv.generation_type = 'VIDEO_SET' and gv.is_current = true
      order by gv.version_no desc limit 1
    ) = 'EF-11-V1'
    and (
      select count(*) from public.geef_artifacts a
      where a.content_uuid = '392355fb-4861-4d7d-9120-637726e5a367'
        and a.is_current = true
        and a.module_run_id = (
          select gv.module_run_id from public.geef_generation_versions gv
          where gv.content_uuid = '392355fb-4861-4d7d-9120-637726e5a367'
            and gv.generation_type = 'VIDEO_SET' and gv.is_current = true
          order by gv.version_no desc limit 1
        )
    ) = (
      select (gv.result_payload ->> 'succeeded_shots')::int
      from public.geef_generation_versions gv
      where gv.content_uuid = '392355fb-4861-4d7d-9120-637726e5a367'
        and gv.generation_type = 'VIDEO_SET' and gv.is_current = true
      order by gv.version_no desc limit 1
    )
    then 'PASS ✅' else 'FAIL ❌'
  end as ef11_verdict;
