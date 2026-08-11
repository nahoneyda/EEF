select *
from public.geef_start_workflow(
  p_content_id         => 'EF-ENT-20260807-001',
  p_start_module_code  => 'EF-04',
  p_end_module_code    => 'EF-04',
  p_triggered_by       => 'NEST_EF04_E2E',
  p_input_payload      => jsonb_build_object(
    'run_mode', 'TEST'
  ),
  p_parent_run_id      => null
);
