import json
import logging
import os
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request


# ============================================================
# 환경변수 로드
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(
    BASE_DIR / ".env",
    override=True,
)


# ============================================================
# 로깅 설정
# ============================================================

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(message)s",
)

logger = logging.getLogger("geef-worker")


# ============================================================
# Flask 애플리케이션
# ============================================================

app = Flask(__name__)


# ============================================================
# 공통 유틸리티
# ============================================================

def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name, str(default))

    return value.strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def first_row(value: Any) -> Any:
    """
    Supabase RPC가 단일 행을 배열로 반환하는 경우
    첫 번째 행만 반환합니다.
    """

    if isinstance(value, list):
        return value[0] if value else None

    return value


def get_content_id(job: dict[str, Any]) -> str | None:
    input_payload = job.get("input_payload") or {}

    return (
        job.get("content_id")
        or input_payload.get("content_id")
    )


# ============================================================
# Supabase REST/RPC 클라이언트
# ============================================================

class SupabaseClient:
    def __init__(self) -> None:
        self.url = os.getenv(
            "SUPABASE_URL",
            "",
        ).rstrip("/")

        self.key = os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY",
            "",
        )

        self.timeout = int(
            os.getenv(
                "HTTP_TIMEOUT_SECONDS",
                "30",
            )
        )

    def configured(self) -> bool:
        return bool(
            self.url
            and self.key
        )

    def rpc(
        self,
        function_name: str,
        payload: dict[str, Any],
    ) -> Any:
        if not self.configured():
            raise RuntimeError(
                "SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY are required"
            )

        response = requests.post(
            f"{self.url}/rest/v1/rpc/{function_name}",
            headers={
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=payload,
            timeout=self.timeout,
        )

        if not response.ok:
            raise RuntimeError(
                f"RPC {function_name} failed "
                f"({response.status_code}): "
                f"{response.text[:1000]}"
            )

        if (
            response.status_code == 204
            or not response.text.strip()
        ):
            return None

        return response.json()

    def select(
        self,
        table_name: str,
        params: dict[str, Any],
    ) -> list[dict[str, Any]]:
        if not self.configured():
            raise RuntimeError(
                "SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY are required"
            )

        response = requests.get(
            f"{self.url}/rest/v1/{table_name}",
            headers={
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Accept": "application/json",
            },
            params=params,
            timeout=self.timeout,
        )

        if not response.ok:
            raise RuntimeError(
                f"SELECT {table_name} failed "
                f"({response.status_code}): "
                f"{response.text[:1000]}"
            )

        value = response.json()

        if not isinstance(value, list):
            raise RuntimeError(
                f"SELECT {table_name} returned "
                "a non-list response"
            )

        return value

    def upsert(
        self,
        table_name: str,
        payload: dict[str, Any],
        on_conflict: str,
    ) -> Any:
        if not self.configured():
            raise RuntimeError(
                "SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY are required"
            )

        response = requests.post(
            f"{self.url}/rest/v1/{table_name}",
            headers={
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Prefer": (
                    "resolution=merge-duplicates,"
                    "return=representation"
                ),
            },
            params={
                "on_conflict": on_conflict,
            },
            json=payload,
            timeout=self.timeout,
        )

        if not response.ok:
            raise RuntimeError(
                f"UPSERT {table_name} failed "
                f"({response.status_code}): "
                f"{response.text[:1000]}"
            )

        if (
            response.status_code == 204
            or not response.text.strip()
        ):
            return None

        return first_row(response.json())


supabase = SupabaseClient()


# ============================================================
# EF-01 Context 생성
# ============================================================

def build_context(
    job: dict[str, Any],
) -> dict[str, Any]:
    source = (
        job.get("context")
        or job.get("input_payload")
        or {}
    )

    return {
        "language": source.get(
            "language",
            "ko",
        ),
        "genre": source.get(
            "genre",
            "Korean Ballad",
        ),
        "theme": source.get(
            "theme",
            source.get(
                "title",
                "새로운 시작과 따뜻한 위로",
            ),
        ),
        "mood": source.get(
            "mood",
            [
                "따뜻함",
                "희망",
                "위로",
            ],
        ),
        "target_audience": source.get(
            "target_audience",
            "한국의 중장년층",
        ),
        "vocal_style": source.get(
            "vocal_style",
            "warm and emotional",
        ),
        "target_duration_seconds": int(
            source.get(
                "target_duration_seconds",
                210,
            )
        ),
        "tempo_bpm": int(
            source.get(
                "tempo_bpm",
                76,
            )
        ),
        "instrument_style": source.get(
            "instrument_style",
            "acoustic guitar, piano, soft strings",
        ),
        "arrangement_style": source.get(
            "arrangement_style",
            "verse-pre-chorus-bridge-final",
        ),
        "mix_style": source.get(
            "mix_style",
            "warm, clear vocal, natural dynamics",
        ),
        "master_style": source.get(
            "master_style",
            "streaming-ready balanced master",
        ),
        "musical_key": source.get(
            "musical_key",
            "G Major",
        ),
        "time_signature": source.get(
            "time_signature",
            "4/4",
        ),
        "video_style": source.get(
            "video_style",
            "cinematic Korean daily-life storytelling",
        ),
        "aspect_ratio": source.get(
            "aspect_ratio",
            "16:9",
        ),
        "context_status": "READY",
    }


# ============================================================
# 모듈 상태 전환
# ============================================================

def begin_module(
    module_run_id: str,
) -> Any:
    execution_id = os.getenv(
        "WORKER_ID",
        "geef-local-worker",
    )

    result = supabase.rpc(
        os.getenv(
            "RPC_BEGIN_MODULE",
            "geef_begin_module",
        ),
        {
            "p_module_run_id": module_run_id,
            "p_make_execution_id": execution_id,
        },
    )

    return first_row(result)

def finish_module(
    module_run_id: str,
    success: bool,
    output_payload: dict[str, Any],
    error_code: str | None = None,
    error_message: str | None = None,
) -> Any:
    result = supabase.rpc(
        os.getenv(
            "RPC_FINISH_MODULE",
            "geef_finish_module",
        ),
        {
            "p_module_run_id": module_run_id,
            "p_succeeded": success,
            "p_output_payload": output_payload,
            "p_error_code": error_code,
            "p_error_message": error_message,
        },
    )

    return first_row(result)


# ============================================================
# EF-01 실행
# ============================================================

def run_ef01(
    job: dict[str, Any],
) -> dict[str, Any]:
    required_fields = [
        "content_uuid",
        "workflow_run_id",
        "module_run_id",
    ]

    missing_fields = [
        field
        for field in required_fields
        if not job.get(field)
    ]

    if missing_fields:
        raise ValueError(
            "Missing required fields: "
            + ", ".join(missing_fields)
        )

    context = build_context(job)

    # DRY RUN에서는 DB와 module_run 상태를 변경하지 않습니다.
    if env_bool("DRY_RUN", True):
        return {
            "dry_run": True,
            "module_code": "EF-01",
            "context": context,
        }

    module_run_id = job["module_run_id"]
    content_id = get_content_id(job)

    module_started = False

    try:
        # QUEUED → RUNNING
        started_module = begin_module(
            module_run_id,
        )

        module_started = True

        logger.info(
            "EF-01 module started: "
            "module_run_id=%s content_id=%s",
            module_run_id,
            content_id,
        )

        # Project Context 저장
        saved_context_result = supabase.rpc(
            os.getenv(
                "RPC_SAVE_CONTEXT",
                "geef_save_project_context",
            ),
            {
                "p_content_uuid": job["content_uuid"],
                "p_workflow_run_id": job["workflow_run_id"],
                "p_module_run_id": module_run_id,
                "p_context": context,
            },
        )

        saved_context = first_row(
            saved_context_result
        )

        output_payload = {
            "module_code": "EF-01",
            "content_id": content_id,
            "content_uuid": job["content_uuid"],
            "workflow_run_id": job["workflow_run_id"],
            "module_run_id": module_run_id,
            "context_status": "READY",
            "saved_context": saved_context,
        }

        # RUNNING → SUCCEEDED
        finished_module = finish_module(
            module_run_id=module_run_id,
            success=True,
            output_payload=output_payload,
            error_code=None,
            error_message=None,
        )

        logger.info(
            "EF-01 module succeeded: "
            "module_run_id=%s content_id=%s",
            module_run_id,
            content_id,
        )

        return {
            "dry_run": False,
            "module_code": "EF-01",
            "context_status": "READY",
            "saved_context": saved_context,
            "module_started": started_module,
            "module_finished": finished_module,
        }

    except Exception as exc:
        logger.exception(
            "EF-01 execution failed: "
            "module_run_id=%s content_id=%s",
            module_run_id,
            content_id,
        )

        # begin_module 성공 이후의 오류만 FAILED로 전환합니다.
        if module_started:
            try:
                finish_module(
                    module_run_id=module_run_id,
                    success=False,
                    output_payload={
                        "module_code": "EF-01",
                        "content_id": content_id,
                        "content_uuid": job.get(
                            "content_uuid"
                        ),
                        "workflow_run_id": job.get(
                            "workflow_run_id"
                        ),
                        "module_run_id": module_run_id,
                        "context_status": "FAILED",
                    },
                    error_code="EF01_EXECUTION_FAILED",
                    error_message=str(exc)[:2000],
                )

                logger.info(
                    "EF-01 module marked as FAILED: "
                    "module_run_id=%s",
                    module_run_id,
                )

            except Exception:
                logger.exception(
                    "Failed to mark EF-01 as FAILED: "
                    "module_run_id=%s",
                    module_run_id,
                )

        raise


# ============================================================
# EF-02 Lyrics 생성
# ============================================================

LYRIC_SECTION_NAMES = (
    "verse_1",
    "pre_chorus_1",
    "chorus_1",
    "verse_2",
    "pre_chorus_2",
    "chorus_2",
    "bridge",
    "final_chorus",
    "outro",
)


def get_ef01_context(
    content_uuid: str,
) -> dict[str, Any]:
    rows = supabase.select(
        "geef_project_contexts",
        {
            "select": "*",
            "content_uuid": f"eq.{content_uuid}",
            "limit": "1",
        },
    )

    row = first_row(rows)

    if not row:
        raise RuntimeError(
            "EF-01 context was not found for "
            f"content_uuid={content_uuid}"
        )

    context = (
        row.get("context")
        or row.get("project_context")
        or row.get("context_payload")
    )

    if not isinstance(context, dict):
        raise RuntimeError(
            "EF-01 context is not a JSON object for "
            f"content_uuid={content_uuid}"
        )

    context_status = (
        row.get("context_status")
        or context.get("context_status")
    )

    if context_status != "READY":
        raise RuntimeError(
            "EF-01 context is not READY for "
            f"content_uuid={content_uuid}: "
            f"{context_status}"
        )

    return context


def get_content_metadata(
    content_uuid: str,
) -> dict[str, Any]:
    content_rows = supabase.select(
        "geef_contents",
        {
            "select": "id,content_id,project_id",
            "id": f"eq.{content_uuid}",
            "limit": "1",
        },
    )

    content = first_row(content_rows)

    if not content:
        raise RuntimeError(
            "Content was not found: "
            f"content_uuid={content_uuid}"
        )

    project_rows = supabase.select(
        "geef_projects",
        {
            "select": "id,project_code,project_name",
            "id": f"eq.{content['project_id']}",
            "limit": "1",
        },
    )

    project = first_row(project_rows)

    if not project:
        raise RuntimeError(
            "GEEF project was not found: "
            f"project_id={content['project_id']}"
        )

    return {
        **content,
        "project_code": project["project_code"],
        "project_name": project.get("project_name"),
    }


def lyrics_json_schema() -> dict[str, Any]:
    lyric_properties = {
        name: {
            "type": "string",
        }
        for name in LYRIC_SECTION_NAMES
    }

    return {
        "type": "object",
        "properties": {
            "title_ko": {
                "type": "string",
            },
            "title_en": {
                "type": "string",
            },
            "concept": {
                "type": "string",
            },
            "hook_line": {
                "type": "string",
            },
            "lyrics": {
                "type": "object",
                "properties": lyric_properties,
                "required": list(LYRIC_SECTION_NAMES),
                "additionalProperties": False,
            },
            "lyric_keywords": {
                "type": "array",
                "items": {
                    "type": "string",
                },
            },
            "language": {
                "type": "string",
                "enum": ["ko"],
            },
        },
        "required": [
            "title_ko",
            "title_en",
            "concept",
            "hook_line",
            "lyrics",
            "lyric_keywords",
            "language",
        ],
        "additionalProperties": False,
    }


def build_lyrics_prompt(
    context: dict[str, Any],
) -> str:
    return (
        "다음 EF-01 프로젝트 컨텍스트를 바탕으로 완전히 새로운 "
        "한국어 대중가요 가사를 작성하세요. 특정 가수, 작사가, "
        "기존 곡의 문체·가사·후렴을 모방하거나 인용하지 마세요. "
        "대상 청중이 자연스럽게 공감할 수 있는 쉬운 한국어를 쓰고, "
        "각 절은 서로 다른 장면으로 전개하되 하나의 감정선을 "
        "유지하세요. 후렴에는 기억하기 쉬운 핵심 문장을 넣고, "
        "요청된 곡 길이에 맞는 충분한 분량으로 작성하세요. "
        "가사 본문에는 섹션명이나 설명을 넣지 마세요.\n\n"
        "EF-01 컨텍스트:\n"
        + json.dumps(
            context,
            ensure_ascii=False,
            indent=2,
        )
    )


def extract_openai_output_text(
    response_payload: dict[str, Any],
) -> str:
    if response_payload.get("status") == "incomplete":
        reason = (
            response_payload.get("incomplete_details")
            or {}
        ).get("reason")
        raise RuntimeError(
            "OpenAI response was incomplete: "
            f"{reason or 'unknown reason'}"
        )

    for item in response_payload.get("output") or []:
        if item.get("type") != "message":
            continue

        for content in item.get("content") or []:
            if content.get("type") == "refusal":
                raise RuntimeError(
                    "OpenAI refused lyrics generation: "
                    f"{content.get('refusal', '')[:500]}"
                )

            if content.get("type") == "output_text":
                output_text = content.get("text")

                if output_text:
                    return output_text

    raise RuntimeError(
        "OpenAI response did not contain output_text"
    )


def generate_lyrics(
    context: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    api_key = os.getenv("OPENAI_API_KEY", "")

    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is required for EF-02"
        )

    model = os.getenv(
        "OPENAI_LYRICS_MODEL",
        "gpt-5.4-mini",
    )

    response = requests.post(
        "https://api.openai.com/v1/responses",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "input": [
                {
                    "role": "developer",
                    "content": (
                        "당신은 한국 대중음악 전문 작사가입니다. "
                        "사용자가 제공한 컨텍스트를 정확히 따르고, "
                        "정의된 JSON 스키마에 맞는 결과만 생성합니다."
                    ),
                },
                {
                    "role": "user",
                    "content": build_lyrics_prompt(context),
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "ef02_lyrics",
                    "strict": True,
                    "schema": lyrics_json_schema(),
                },
            },
            "max_output_tokens": int(
                os.getenv(
                    "OPENAI_LYRICS_MAX_OUTPUT_TOKENS",
                    "6000",
                )
            ),
        },
        timeout=int(
            os.getenv(
                "OPENAI_TIMEOUT_SECONDS",
                "180",
            )
        ),
    )

    if not response.ok:
        raise RuntimeError(
            "OpenAI Responses API failed "
            f"({response.status_code}): "
            f"{response.text[:1000]}"
        )

    response_payload = response.json()
    output_text = extract_openai_output_text(
        response_payload
    )

    try:
        lyrics_result = json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "OpenAI output was not valid JSON"
        ) from exc

    return lyrics_result, {
        "response_id": response_payload.get("id"),
        "model": response_payload.get("model") or model,
        "usage": response_payload.get("usage") or {},
    }


def validate_lyrics_result(
    value: dict[str, Any],
) -> None:
    if not isinstance(value, dict):
        raise ValueError(
            "Lyrics result must be a JSON object"
        )

    for field in (
        "title_ko",
        "concept",
        "hook_line",
    ):
        if not str(value.get(field) or "").strip():
            raise ValueError(
                f"Lyrics result field is empty: {field}"
            )

    lyrics = value.get("lyrics")

    if not isinstance(lyrics, dict):
        raise ValueError(
            "Lyrics result lyrics must be an object"
        )

    for section_name in LYRIC_SECTION_NAMES:
        if not str(
            lyrics.get(section_name) or ""
        ).strip():
            raise ValueError(
                "Lyrics section is empty: "
                f"{section_name}"
            )

    keywords = value.get("lyric_keywords")

    if (
        not isinstance(keywords, list)
        or not keywords
    ):
        raise ValueError(
            "lyric_keywords must be a non-empty array"
        )


def save_geef_project_lyrics(
    job: dict[str, Any],
    metadata: dict[str, Any],
    context: dict[str, Any],
    lyrics_result: dict[str, Any],
    generation_info: dict[str, Any],
) -> Any:
    payload = {
        "project_id": metadata["project_id"],
        "content_uuid": metadata["id"],
        "content_id": metadata["content_id"],
        "project_code": metadata["project_code"],
        "title_ko": lyrics_result["title_ko"],
        "title_en": lyrics_result.get("title_en"),
        "concept": lyrics_result["concept"],
        "hook_line": lyrics_result["hook_line"],
        "lyrics": lyrics_result["lyrics"],
        "lyric_keywords": lyrics_result[
            "lyric_keywords"
        ],
        "language": lyrics_result.get(
            "language",
            context.get("language", "ko"),
        ),
        "lyrics_status": "READY",
        "generation_model": generation_info.get(
            "model"
        ),
        "prompt_version": os.getenv(
            "EF02_PROMPT_VERSION",
            "EF-LYRICS-V1",
        ),
        "workflow_run_id": job["workflow_run_id"],
        "module_run_id": job["module_run_id"],
        "source_payload": {
            "ef01_context": context,
            "openai": generation_info,
        },
        "updated_at": (
            time.strftime(
                "%Y-%m-%dT%H:%M:%SZ",
                time.gmtime(),
            )
        ),
    }

    return supabase.upsert(
        "geef_project_lyrics",
        payload,
        on_conflict="content_uuid",
    )


def run_ef02(
    job: dict[str, Any],
) -> dict[str, Any]:
    required_fields = [
        "content_uuid",
        "workflow_run_id",
        "module_run_id",
    ]

    missing_fields = [
        field
        for field in required_fields
        if not job.get(field)
    ]

    if missing_fields:
        raise ValueError(
            "Missing required fields: "
            + ", ".join(missing_fields)
        )

    if env_bool("DRY_RUN", True):
        return {
            "dry_run": True,
            "module_code": "EF-02",
            "message": (
                "Lyrics generation and database writes "
                "were skipped"
            ),
        }

    module_run_id = job["module_run_id"]
    content_id = get_content_id(job)
    module_started = False

    try:
        started_module = begin_module(module_run_id)
        module_started = True

        logger.info(
            "EF-02 module started: "
            "module_run_id=%s content_id=%s",
            module_run_id,
            content_id,
        )

        context = get_ef01_context(
            job["content_uuid"]
        )
        metadata = get_content_metadata(
            job["content_uuid"]
        )

        if (
            content_id
            and content_id != metadata["content_id"]
        ):
            raise ValueError(
                "content_id does not match content_uuid: "
                f"{content_id} != {metadata['content_id']}"
            )

        lyrics_result, generation_info = (
            generate_lyrics(context)
        )
        validate_lyrics_result(lyrics_result)

        saved_lyrics = save_geef_project_lyrics(
            job=job,
            metadata=metadata,
            context=context,
            lyrics_result=lyrics_result,
            generation_info=generation_info,
        )

        output_payload = {
            "module_code": "EF-02",
            "content_id": metadata["content_id"],
            "content_uuid": metadata["id"],
            "workflow_run_id": job["workflow_run_id"],
            "module_run_id": module_run_id,
            "lyrics_status": "READY",
            "title_ko": lyrics_result["title_ko"],
            "generation_model": generation_info.get(
                "model"
            ),
            "saved_lyrics_id": (
                saved_lyrics.get("id")
                if isinstance(saved_lyrics, dict)
                else None
            ),
        }

        finished_module = finish_module(
            module_run_id=module_run_id,
            success=True,
            output_payload=output_payload,
            error_code=None,
            error_message=None,
        )

        logger.info(
            "EF-02 module succeeded: "
            "module_run_id=%s content_id=%s",
            module_run_id,
            metadata["content_id"],
        )

        return {
            "dry_run": False,
            **output_payload,
            "saved_lyrics": saved_lyrics,
            "module_started": started_module,
            "module_finished": finished_module,
        }

    except Exception as exc:
        logger.exception(
            "EF-02 execution failed: "
            "module_run_id=%s content_id=%s",
            module_run_id,
            content_id,
        )

        if module_started:
            try:
                finish_module(
                    module_run_id=module_run_id,
                    success=False,
                    output_payload={
                        "module_code": "EF-02",
                        "content_id": content_id,
                        "content_uuid": job.get(
                            "content_uuid"
                        ),
                        "workflow_run_id": job.get(
                            "workflow_run_id"
                        ),
                        "module_run_id": module_run_id,
                        "lyrics_status": "FAILED",
                    },
                    error_code="EF02_EXECUTION_FAILED",
                    error_message=str(exc)[:2000],
                )

                logger.info(
                    "EF-02 module marked as FAILED: "
                    "module_run_id=%s",
                    module_run_id,
                )

            except Exception:
                logger.exception(
                    "Failed to mark EF-02 as FAILED: "
                    "module_run_id=%s",
                    module_run_id,
                )

        raise


# ============================================================
# 다음 실행 모듈 조회
# ============================================================

def get_next_module(
    workflow_run_id: str,
) -> dict[str, Any]:
    result = supabase.rpc(
        os.getenv(
            "RPC_GET_NEXT_MODULE",
            "geef_get_next_queued_module",
        ),
        {
            "p_workflow_run_id": workflow_run_id,
        },
    )

    next_module = first_row(result)

    if not next_module:
        return {
            "found": False,
            "workflow_run_id": workflow_run_id,
        }

    return next_module


# ============================================================
# Health API
# ============================================================

@app.get("/")
@app.get("/health")
def health():
    return jsonify(
        {
            "ok": True,
            "service": "geef-cloud-run-worker",
            "dry_run": env_bool(
                "DRY_RUN",
                True,
            ),
            "supabase_configured": (
                supabase.configured()
            ),
            "supported_modules": [
                "EF-00",
                "EF-01",
                "EF-02",
            ],
        }
    )


# ============================================================
# Next Module API
# ============================================================

@app.post("/next-module")
def next_module():
    body = request.get_json(
        silent=True,
    ) or {}

    workflow_run_id = body.get(
        "workflow_run_id"
    )

    if not workflow_run_id:
        return jsonify(
            {
                "ok": False,
                "error": (
                    "workflow_run_id is required"
                ),
            }
        ), 400

    try:
        result = get_next_module(
            workflow_run_id
        )

        return jsonify(
            {
                "ok": True,
                "next_module": result,
            }
        )

    except Exception as exc:
        logger.exception(
            "next-module failed: "
            "workflow_run_id=%s",
            workflow_run_id,
        )

        return jsonify(
            {
                "ok": False,
                "error": str(exc),
            }
        ), 500


# ============================================================
# Execute API
# ============================================================

@app.post("/execute")
def execute():
    request_started = time.perf_counter()

    body = request.get_json(
        silent=True,
    ) or {}

    module_code = body.get(
        "module_code",
        "EF-01",
    )

    try:
        if module_code == "EF-00":
            result = {
                "dry_run": env_bool(
                    "DRY_RUN",
                    True,
                ),
                "module_code": "EF-00",
                "message": (
                    "Project Control accepted"
                ),
            }

        elif module_code == "EF-01":
            result = run_ef01(body)

        elif module_code == "EF-02":
            result = run_ef02(body)

        else:
            return jsonify(
                {
                    "ok": False,
                    "error": (
                        f"Unsupported module: "
                        f"{module_code}"
                    ),
                }
            ), 400

        result["duration_ms"] = round(
            (
                time.perf_counter()
                - request_started
            )
            * 1000
        )

        return jsonify(
            {
                "ok": True,
                "result": result,
            }
        )

    except ValueError as exc:
        duration_ms = round(
            (
                time.perf_counter()
                - request_started
            )
            * 1000
        )

        return jsonify(
            {
                "ok": False,
                "module_code": module_code,
                "duration_ms": duration_ms,
                "error": str(exc),
            }
        ), 400

    except Exception as exc:
        duration_ms = round(
            (
                time.perf_counter()
                - request_started
            )
            * 1000
        )

        logger.exception(
            "execution failed: module_code=%s",
            module_code,
        )

        return jsonify(
            {
                "ok": False,
                "module_code": module_code,
                "duration_ms": duration_ms,
                "error": str(exc),
            }
        ), 500


# ============================================================
# 로컬 실행
# ============================================================

if __name__ == "__main__":
    port = int(
        os.getenv(
            "PORT",
            "8080",
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
    )