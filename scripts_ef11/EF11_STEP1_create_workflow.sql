-- EF-11 단독 검증용 새 워크플로 생성
-- content_id = EF-ENT-20260807-001 (EF-09 STORYBOARD + EF-10 IMAGE_SET is_current 필요)
select
  id as new_workflow_run_id, content_uuid, run_no, status,
  start_module_code, end_module_code
from public.geef_start_workflow(
  p_content_id         => 'EF-ENT-20260807-001',
  p_start_module_code  => 'EF-11',
  p_end_module_code    => 'EF-11',
  p_triggered_by       => 'NEST_EF11_E2E',
  p_input_payload      => jsonb_build_object('run_mode', 'TEST'),
  p_parent_run_id      => null
);
