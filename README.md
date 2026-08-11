# GEEF Cloud Run Worker — EF-00 / EF-01

VS Code에서 바로 열어 실행할 수 있는 Python/Flask 기반 Cloud Run 프로젝트입니다.

## 1. Windows에서 압축 풀기

1. ZIP 파일을 `D:\myProject\geef-cloud-run-worker`에 풉니다.
2. VS Code에서 **파일 → 폴더 열기**로 해당 폴더를 엽니다.
3. VS Code 터미널을 열고 아래 명령을 실행합니다.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

PowerShell 실행 정책 오류가 나면 현재 터미널에서만 다음을 먼저 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## 2. 환경변수 설정

`.env`를 열어 아래 두 값을 실제 Supabase 값으로 교체합니다.

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
DRY_RUN=true
```

서비스 역할 키는 GitHub에 올리거나 채팅에 붙여넣지 마세요. `.gitignore`와 `.dockerignore`가 `.env`를 제외합니다.

## 3. 로컬 실행

```powershell
python app.py
```

브라우저에서 `http://localhost:8080/health`를 열어 `ok: true`를 확인합니다.

## 4. EF-01 안전 테스트

처음에는 반드시 `DRY_RUN=true`를 유지합니다.

```powershell
$body = @{
  module_code = "EF-01"
  content_uuid = "6af808cc-ae4f-4c9f-aca2-9147c2066a6c"
  workflow_run_id = "3857f0bd-4836-46ca-871f-2c158ddfa194"
  module_run_id = "150d0d74-000c-4507-bc16-7fb36c77be1a"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://localhost:8080/execute `
  -ContentType "application/json" `
  -Body $body
```

위 UUID는 연결 점검 예시입니다. 실제 DB 저장 테스트는 새 `EF-00 → EF-01` 워크플로에서 생성된 EF-01 `module_run_id`로 해야 합니다.

## 5. Cloud Run 배포

Google Cloud CLI 로그인과 프로젝트 선택 후 실행합니다.

```powershell
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud run deploy geef-cloud-run-worker `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --set-env-vars "DRY_RUN=true,SUPABASE_URL=https://YOUR_PROJECT.supabase.co" `
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest"
```

`--allow-unauthenticated`는 초기 점검 편의를 위한 값입니다. 운영 전에는 인증 방식(Cloud Scheduler OIDC 또는 IAM)을 확정한 뒤 제거하는 것을 권장합니다.

## 현재 포함된 기능

- `GET /health`: 서비스와 환경설정 상태 확인
- `POST /next-module`: `geef_get_next_queued_module()` 호출
- `POST /execute`: EF-00 접수 및 EF-01 Context 생성/저장
- `geef_save_project_context()` 연동
- VS Code 실행/디버그 설정
- Docker/Cloud Run 설정

## 중요한 현재 범위

기존 Cloud Run의 실행 요청 Claim·모듈 시작·완료 RPC 정의가 제공되지 않았으므로, 이 프로젝트는 해당 상태 변경을 임의로 구현하지 않았습니다. `app.py`에서 EF-01 Context 저장과 다음 모듈 조회는 바로 사용할 수 있으며, 기존 RPC 정의가 확보되면 Claim → 시작 → 완료 → 전체 종료 흐름을 연결하면 됩니다.
