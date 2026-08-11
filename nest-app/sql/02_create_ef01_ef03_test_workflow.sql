select *
from public.geef_start_workflow(
  p_content_id         => 'EF-ENT-20260807-001',
  p_start_module_code  => 'EF-01',
  p_end_module_code    => 'EF-03',
  p_triggered_by       => 'NEST_EF01_EF03_E2E',
  p_input_payload      => jsonb_build_object(
    'language', 'ko',
    'genre', 'Korean Ballad',
    'theme', '다시 피어나는 길',
    'mood', jsonb_build_array('따뜻함','희망','위로'),
    'target_audience', '한국의 중장년층',
    'target_duration_seconds', 210,
    'tempo_bpm', 76,
    'musical_key', 'G Major',
    'time_signature', '4/4'
  ),
  p_parent_run_id      => null
);
