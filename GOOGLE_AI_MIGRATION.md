# GEEF Google AI model configuration

## Model policy

| Work | TEST | PRODUCTION |
|---|---|---|
| EF-02 lyrics | `gemini-3.5-flash-lite` | `gemini-3.5-flash` |
| EF-03 music | `lyria-3-clip-preview` | `lyria-3-pro-preview` |
| Image asset | `gemini-3.1-flash-lite-image` | `gemini-3-pro-image` |
| Video asset | `veo-3.1-lite-generate-preview` | `veo-3.1-generate-preview` |

Every model ID is controlled by an environment variable. A model lifecycle
change therefore requires configuration deployment, not a source-code edit.

## Deploy EF-02

1. Replace the worker `app.py` with this package's `app.py`.
2. Set `GEMINI_API_KEY` in Render or Secret Manager. Never commit the key.
3. Remove the obsolete `OPENAI_API_KEY` and `OPENAI_LYRICS_MODEL` settings.
4. Set `EF02_PROMPT_VERSION=EF-LYRICS-GOOGLE-V2`.
5. Deploy, then check `/health`. It must report `ai_provider: google`.
6. Create a new EF-02 workflow/module run. Do not reuse a FAILED module run.

## Access checks

Gemini text access does not prove Lyria or Veo preview access. Before EF-03 or
video implementation, make one low-cost TEST request with the configured model
and record a clear `MODEL_ACCESS_DENIED` failure when the project lacks access.
