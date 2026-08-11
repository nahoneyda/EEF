-- =========================================================
-- EF-10 Image Set 저장 RPC
--
-- 동작:
--   1) 입력 p_artifacts(jsonb 배열)의 각 이미지 아티팩트를 geef_artifacts 에 INSERT
--      - 같은 (content_uuid, module_run_id) 이전 아티팩트는 is_current=false 로 내림
--   2) geef_generation_versions 에 generation_type='IMAGE_SET' 매니페스트 1행 저장
--      (EF-08/09 의 검증된 저장 패턴을 그대로 사용 - 42702 회피)
--   3) 반환: generation_id / version_no / is_current / created_at + 저장된 artifact_id 배열
--
-- p_artifact_kind:
--   geef_artifacts.artifact_kind 는 USER-DEFINED enum 이므로,
--   실제 허용값(EF10_00_preflight.sql 쿼리1 결과)을 호출부에서 넘긴다.
--   (예: 'IMAGE' 또는 'SCENE_IMAGE' 등)
--
-- p_artifacts 각 원소 형식:
--   {
--     "shot_id": "S01-C01",
--     "artifact_name": "S01-C01",
--     "storage_bucket": "ai-image",
--     "storage_path": "geef/.../ef10/S01-C01.png",
--     "public_url": "https://...",   (nullable)
--     "mime_type": "image/png",
--     "size_bytes": 12345,
--     "checksum_sha256": "....",     (nullable)
--     "metadata": { ... }            (nullable, jsonb object)
--   }
-- =========================================================

CREATE OR REPLACE FUNCTION public.geef_save_image_set(
  p_content_uuid uuid,
  p_module_run_id uuid,
  p_provider text,
  p_model_name text,
  p_artifact_kind text,
  p_artifacts jsonb,
  p_prompt_text text,
  p_prompt_hash text,
  p_parameters jsonb,
  p_result_payload jsonb
)
RETURNS TABLE(
  generation_id uuid,
  version_no integer,
  is_current boolean,
  created_at timestamp with time zone,
  artifact_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_generation_type constant text := 'IMAGE_SET';
  v_generation_id uuid;
  v_version_no integer;
  v_created_at timestamptz;
  v_artifact_ids uuid[] := array[]::uuid[];
  v_artifact jsonb;
  v_new_artifact_id uuid;
begin
  if p_content_uuid is null then
    raise exception using errcode = '22004', message = 'p_content_uuid is required';
  end if;

  if p_module_run_id is null then
    raise exception using errcode = '22004', message = 'p_module_run_id is required';
  end if;

  if p_result_payload is null or p_result_payload = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'p_result_payload must not be empty';
  end if;

  if p_artifacts is null or jsonb_typeof(p_artifacts) <> 'array' then
    raise exception using errcode = '22023', message = 'p_artifacts must be a jsonb array';
  end if;

  if nullif(btrim(p_artifact_kind), '') is null then
    raise exception using errcode = '22004', message = 'p_artifact_kind is required';
  end if;

  if not exists (
    select 1 from public.geef_contents c where c.id = p_content_uuid
  ) then
    raise exception using errcode = '23503',
      message = format('Content not found: %s', p_content_uuid);
  end if;

  if not exists (
    select 1
    from public.geef_module_runs mr
    join public.geef_modules m on m.id = mr.module_id
    where mr.id = p_module_run_id
      and m.module_code = 'EF-10'
  ) then
    raise exception using errcode = '23503',
      message = format('EF-10 module run not found: %s', p_module_run_id);
  end if;

  -- 같은 콘텐츠의 IMAGE_SET 저장을 직렬화
  perform pg_advisory_xact_lock(
    hashtextextended(p_content_uuid::text || ':' || v_generation_type, 0)
  );

  -- 1) 이 module_run 의 이전 이미지 아티팩트를 is_current=false 로 내림
  update public.geef_artifacts as a
  set is_current = false
  where a.content_uuid = p_content_uuid
    and a.module_run_id = p_module_run_id
    and a.is_current = true;

  -- 각 이미지 아티팩트 INSERT
  for v_artifact in
    select * from jsonb_array_elements(p_artifacts)
  loop
    insert into public.geef_artifacts (
      content_uuid,
      module_run_id,
      artifact_kind,
      artifact_name,
      storage_bucket,
      storage_path,
      public_url,
      mime_type,
      size_bytes,
      checksum_sha256,
      metadata,
      is_current
    )
    values (
      p_content_uuid,
      p_module_run_id,
      p_artifact_kind::public.geef_artifact_kind,
      coalesce(nullif(v_artifact->>'artifact_name', ''), v_artifact->>'shot_id'),
      nullif(v_artifact->>'storage_bucket', ''),
      nullif(v_artifact->>'storage_path', ''),
      nullif(v_artifact->>'public_url', ''),
      nullif(v_artifact->>'mime_type', ''),
      nullif(v_artifact->>'size_bytes', '')::bigint,
      nullif(v_artifact->>'checksum_sha256', ''),
      coalesce(
        case
          when jsonb_typeof(v_artifact->'metadata') = 'object'
          then v_artifact->'metadata'
          else '{}'::jsonb
        end,
        '{}'::jsonb
      ),
      true
    )
    returning geef_artifacts.id into v_new_artifact_id;

    v_artifact_ids := array_append(v_artifact_ids, v_new_artifact_id);
  end loop;

  -- 2) IMAGE_SET 매니페스트를 geef_generation_versions 에 저장
  select coalesce(max(gv.version_no), 0) + 1
    into v_version_no
  from public.geef_generation_versions gv
  where gv.content_uuid = p_content_uuid
    and gv.generation_type = v_generation_type;

  update public.geef_generation_versions as gv
  set is_current = false
  where gv.content_uuid = p_content_uuid
    and gv.generation_type = v_generation_type
    and gv.is_current = true;

  insert into public.geef_generation_versions (
    content_uuid,
    module_run_id,
    generation_type,
    version_no,
    provider,
    model_name,
    prompt_text,
    prompt_hash,
    parameters,
    result_payload,
    is_current
  )
  values (
    p_content_uuid,
    p_module_run_id,
    v_generation_type,
    v_version_no,
    nullif(btrim(p_provider), ''),
    nullif(btrim(p_model_name), ''),
    nullif(p_prompt_text, ''),
    nullif(btrim(p_prompt_hash), ''),
    coalesce(p_parameters, '{}'::jsonb),
    p_result_payload,
    true
  )
  returning geef_generation_versions.id into v_generation_id;

  select gv.created_at
    into v_created_at
  from public.geef_generation_versions gv
  where gv.id = v_generation_id;

  return query
  select v_generation_id, v_version_no, true, v_created_at, v_artifact_ids;
end;
$function$;
