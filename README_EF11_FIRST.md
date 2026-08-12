# EF-11 Video Generation — 압축 해제 안내

## 압축 위치
D:\myProject\EEF\ 에서 압축 해제 → 각 파일이 제자리로 들어갑니다.

## 파일 위치
```
D:\myProject\EEF\
├── nest-app\src\modules\ef11-video-generation\   (신규 모듈 전체)
├── nest-app\src\common\worker\
│   ├── executor.registry.ts   (★ 덮어쓰기 - EF11 추가)
│   └── worker.module.ts        (★ 덮어쓰기 - EF11 등록)
├── db\GEEF_EF11_save_video_set.sql   (신규 RPC)
└── scripts_ef11\   (preflight + E2E)
```
> 덮어쓰기 2개(registry, worker.module)는 EF-10 위에 EF-11 을 더한 것.
>  EF-10 번들을 적용한 상태라면 그대로 최신입니다.

## ★ 핵심: 기본은 MOCK 모드 (비용 0)
Veo 는 유료(클립당 약 $1~3, 무료 티어 없음)이고 image-to-video 지역 제한이 있습니다.
그래서 EF-11 은 기본적으로 **mock provider**(가짜 mp4)로 동작해 저장/DB/검증 파이프라인을
0원으로 먼저 확인하도록 설계했습니다. 실제 Veo 호출은 env 스위치로 켭니다.

## 적용 순서
1. scripts_ef11\EF11_00_preflight.sql 실행 → artifact_kind enum 값 확인
   (VIDEO 계열 값이 있으면 그걸 EF11_ARTIFACT_KIND 로. 없으면 기존 IMAGE 값 재사용도 가능)
2. db\GEEF_EF11_save_video_set.sql 실행 (Supabase)
3. Storage 버킷 준비 (기본 geef-videos, 없으면 생성)
4. .env 설정 (아래)
5. 재기동: node 종료 → dist 삭제 → npm run start
6. E2E:
   scripts_ef11\EF11_STEP1_create_workflow.sql (Supabase) → new id
   .\scripts_ef11\EF11_STEP2_run.ps1 -WorkflowRunId "<id>"
   scripts_ef11\EF11_STEP3_verify.sql (NEW_WORKFLOW_RUN_ID 치환)

## .env
```
# provider 모드: mock(기본, 비용0) | veo(실제 유료 호출)
EF11_PROVIDER_MODE=mock

# 아티팩트 kind (preflight 로 확인한 enum 값)
EF11_ARTIFACT_KIND=VIDEO

# 저장 버킷
EF11_VIDEO_BUCKET=geef-videos

# 병렬/타임아웃 (Veo 는 느림)
EF11_CONCURRENCY=2

# --- 아래는 EF11_PROVIDER_MODE=veo 일 때만 의미 있음 ---
EF11_VIDEO_MODEL_TEST=veo-3.1-generate-preview
EF11_VIDEO_MODEL_PRODUCTION=veo-3.1-generate-preview
EF11_POLL_INTERVAL_SECONDS=10
EF11_MAX_WAIT_SECONDS=600
```

## MOCK → 실제 Veo 전환
1) 파이프라인이 mock 으로 PASS 되는 것 확인
2) .env 에서 EF11_PROVIDER_MODE=veo 로 변경
3) EF11_VIDEO_MODEL_TEST 가 현재 유효한 Veo 모델인지 확인
   (2026-08 기준 veo-3.1-generate-preview. Veo 3.0/2.0 은 2026-06-30 종료)
4) 재기동 후 재실행 → 실제 mp4 가 생성/저장됨 (비용 발생)
주의: image-to-video 는 EEA/스위스/UK 미지원. KR 은 해당 없음(키/계정 기준 확인 권장).

## 설계 요약
- 입력: EF-09 STORYBOARD(shot 메타) + EF-10 IMAGE_SET(shot 이미지)
- 생성: shot 이미지 → image-to-video 클립 (mock 또는 Veo)
- 처리: 동시성 제한 병렬 + shot 단위 실패 격리
- 저장: Supabase Storage + geef_artifacts(클립당 1행) + geef_generation_versions(VIDEO_SET 매니페스트)
- 다음: EF-12 Video Editing 이 VIDEO_SET 클립들을 이어붙임

## 검증 상태 (개발 환경)
- tsc --noEmit : 0 error
- nest build   : success
- 전체 테스트   : 14/14 pass (회귀 없음)
