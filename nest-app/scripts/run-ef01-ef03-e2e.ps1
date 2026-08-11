param(
  [Parameter(Mandatory=$true)]
  [string]$WorkflowRunId
)

$body = @{
  workflowRunId = $WorkflowRunId
} | ConvertTo-Json

Write-Host "Run EF-01"
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/internal/worker/run-next" `
  -ContentType "application/json; charset=utf-8" `
  -Body $body |
ConvertTo-Json -Depth 10

Write-Host "Run EF-02"
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/internal/worker/run-next" `
  -ContentType "application/json; charset=utf-8" `
  -Body $body |
ConvertTo-Json -Depth 10

Write-Host "Run EF-03"
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/internal/worker/run-next" `
  -ContentType "application/json; charset=utf-8" `
  -Body $body |
ConvertTo-Json -Depth 10
