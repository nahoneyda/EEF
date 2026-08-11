import json

import app as worker


class FakeResponse:
    ok = True
    status_code = 200
    text = "ok"

    def json(self):
        lyrics = {
            "title_ko": "다시 걷는 아침",
            "title_en": "Morning Again",
            "concept": "새로운 시작",
            "hook_line": "오늘 다시 걸어가",
            "lyrics": {
                name: f"{name} 가사"
                for name in worker.LYRIC_SECTION_NAMES
            },
            "lyric_keywords": ["시작", "희망", "위로"],
            "language": "ko",
        }
        return {
            "modelVersion": "gemini-3.5-flash-lite",
            "candidates": [{
                "content": {
                    "parts": [{"text": json.dumps(lyrics)}]
                }
            }],
            "usageMetadata": {"totalTokenCount": 123},
        }


def test_model_registry_defaults(monkeypatch):
    for name in (
        "GEMINI_LYRICS_MODEL_TEST",
        "GEMINI_LYRICS_MODEL_PRODUCTION",
        "LYRIA_MODEL_TEST",
        "LYRIA_MODEL_PRODUCTION",
    ):
        monkeypatch.delenv(name, raising=False)

    assert worker.google_model_registry("TEST")["lyrics"] == (
        "gemini-3.5-flash-lite"
    )
    assert worker.google_model_registry("PRODUCTION")["lyrics"] == (
        "gemini-3.5-flash"
    )
    assert worker.google_model_registry("TEST")["music"] == (
        "lyria-3-clip-preview"
    )
    assert worker.google_model_registry("PRODUCTION")["music"] == (
        "lyria-3-pro-preview"
    )


def test_generate_lyrics_uses_gemini(monkeypatch):
    captured = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return FakeResponse()

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(worker.requests, "post", fake_post)

    result, info = worker.generate_lyrics(
        {"context_status": "READY", "language": "ko"},
        run_mode="TEST",
    )

    assert "gemini-3.5-flash-lite:generateContent" in captured["url"]
    assert captured["headers"]["x-goog-api-key"] == "test-key"
    assert captured["json"]["generationConfig"]["responseMimeType"] == (
        "application/json"
    )
    assert result["language"] == "ko"
    assert info["provider"] == "google"
    worker.validate_lyrics_result(result)


def test_health_exposes_google_model_plan():
    response = worker.app.test_client().get("/health")
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["ai_provider"] == "google"
    assert payload["models"]["TEST"]["music"] == "lyria-3-clip-preview"
