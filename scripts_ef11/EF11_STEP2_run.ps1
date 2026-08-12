param([string]$WorkflowRunId = "")
if ([string]::IsNullOrWhiteSpace($WorkflowRunId)) {
  Write-Error "WorkflowRunId 를 지정하세요. 예: .\EF11_STEP2_run.ps1 -WorkflowRunId ""...uuid..."""
  exit 1
}
$body = @{ workflowRunId = $WorkflowRunId } | ConvertTo-Json
Write-Host "==> Run EF-11 on local NestJS worker (workflowRunId=$WorkflowRunId)"
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/internal/worker/run-next" `
  -ContentType "application/json; charset=utf-8" `
  -Body $body |
ConvertTo-Json -Depth 40
