-- =========================================================
-- EF-11 Video Generation 개발 전 DB 사전 점검
-- =========================================================

-- 1) artifact_kind enum 허용값 (VIDEO 계열이 있는지 확인)
--    EF-10 이미지는 어떤 kind 로 저장했는지도 같이 확인됨.
select e.enumlabel as artifact_kind_value, e.enumsortorder
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname = (
  select udt_name
  from information_schema.columns
  where table_schema='public' and table_name='geef_artifacts' and column_name='artifact_kind'
)
order by e.enumsortorder;

-- 2) EF-10 IMAGE_SET (EF-11 입력) 존재 확인
select id as generation_id, content_uuid, version_no, is_current,
       (result_payload ->> 'succeeded_shots')::int as image_count
from public.geef_generation_versions
where generation_type = 'IMAGE_SET' and is_current = true
order by created_at desc
limit 5;

-- 3) EF-10 이미지 아티팩트 (public_url 이 EF-11 image-to-video 입력이 됨)
select a.id as artifact_id, a.artifact_name, a.storage_bucket, a.storage_path,
       a.public_url, a.mime_type, a.is_current
from public.geef_artifacts a
where a.content_uuid = '392355fb-4861-4d7d-9120-637726e5a367'
  and a.is_current = true
order by a.created_at;

-- 4) generation_type 현황
select generation_type, count(*) rows, max(created_at) latest
from public.geef_generation_versions
group by generation_type order by generation_type;

-- 5) Storage 버킷 목록 (영상 저장 버킷 확인/결정)
select id, name, public from storage.buckets order by created_at;
