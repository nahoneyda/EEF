-- =========================================================
-- FIX v2: geef_save_video_concept_version
--
-- 문제(누적):
--   RETURNS TABLE(generation_id, version_no, is_current, created_at) 의
--   출력 컬럼 version_no / is_current / created_at 가 geef_generation_versions
--   테이블 컬럼과 이름이 같아, 함수 본문에서 다음 두 지점이 모호(42702):
--     (1) update ... set is_current=false where is_current=true   → is_current
--     (2) insert ... returning id, created_at into ...             → created_at
--
-- 해결 방침:
--   * 반환 컬럼명(generation_id/version_no/is_current/created_at)은 그대로 유지
--     → NestJS repository(value.generation_id / version_no / is_current / created_at)
--       를 건드리지 않아도 됨.
--   * 본문에서 테이블을 항상 별칭으로 참조하여 모호성을 원천 제거.
--   * returning 절은 별칭을 못 쓰므로, 값을 변수로 받는 대신
--     insert 후 별도 select 로 created_at 을 명확히 조회(경쟁은 advisory lock 으로 이미 직렬화됨).
--
-- 로직/시그니처/반환 구조는 원본과 동일. 컬럼 참조 명확화만 수행.
-- =========================================================

CREATE OR REPLACE FUNCTION public.geef_save_video_concept_version(
  p_content_uuid uuid,
  p_module_run_id uuid,
  p_provider text,
  p_model_name text,
  p_prompt_text text,
  p_prompt_hash text,
  p_parameters jsonb,
  p_result_payload jsonb
)
RETURNS TABLE(generation_id uuid, version_no integer, is_current boolean, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_generation_type constant text := 'VIDEO_CONCEPT';
  v_generation_id uuid;
  v_version_no integer;
  v_created_at timestamptz;
begin
  if p_content_uuid is null then
    raise exception using errcode = '22004', message = 'p_content_uuid is required';
  end if;

  if p_module_run_id is null then
    raise exception using errcode = '22004', message = 'p_module_run_id is required';
  end if;

  if p_result_payload is null
     or p_result_payload = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'p_result_payload must not be empty';
  end if;

  if not exists (
    select 1
    from public.geef_contents c
    where c.id = p_content_uuid
  ) then
    raise exception using
      errcode = '23503',
      message = format('Content not found: %s', p_content_uuid);
  end if;

  if not exists (
    select 1
    from public.geef_module_runs mr
    join public.geef_modules m on m.id = mr.module_id
    where mr.id = p_module_run_id
      and m.module_code = 'EF-08'
  ) then
    raise exception using
      errcode = '23503',
      message = format('EF-08 module run not found: %s', p_module_run_id);
  end if;

  /*
   * 같은 콘텐츠의 VIDEO_CONCEPT 버전 저장을 직렬화합니다.
   * max(version_no) + 1 경쟁 조건과 is_current 충돌을 방지합니다.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_content_uuid::text || ':' || v_generation_type,
      0
    )
  );

  select coalesce(max(gv.version_no), 0) + 1
    into v_version_no
  from public.geef_generation_versions gv
  where gv.content_uuid = p_content_uuid
    and gv.generation_type = v_generation_type;

  -- (1) is_current 모호성 제거: 테이블 별칭 gv 로 한정
  update public.geef_generation_versions as gv
  set is_current = false
  where gv.content_uuid = p_content_uuid
    and gv.generation_type = v_generation_type
    and gv.is_current = true;

  -- INSERT 는 returning 대신 생성된 id 만 변수로 받고,
  -- created_at 은 별칭으로 명확히 재조회하여 (2) 모호성 제거.
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
  returning geef_generation_versions.id
    into v_generation_id;

  select gv.created_at
    into v_created_at
  from public.geef_generation_versions gv
  where gv.id = v_generation_id;

  return query
  select
    v_generation_id,
    v_version_no,
    true,
    v_created_at;
end;
$function$;
