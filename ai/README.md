# JARVIS Own AI (Gemini-free)

JARVIS now uses an OpenAI-compatible endpoint for its cloud model. The backend does not call Gemini.

## Cloud model server

Use a machine with enough RAM/VRAM to host an open-weight model. A practical starter model is Qwen 2.5 3B through Ollama. A GPU VM is recommended for responsive answers; the current Render Free web service is only the API gateway and is not suitable for hosting the model itself.

1. Provision a separate VM/server with Ollama installed.
2. Pull a model, for example: `ollama pull qwen2.5:3b`.
3. Enable Ollama's OpenAI-compatible API and put it behind HTTPS with authentication (reverse proxy/API gateway). Do not expose an unauthenticated Ollama port to the public internet.
4. In Render → jarvis-mark-vii-api → Environment, set:
   - `AI_BASE_URL`: HTTPS base URL ending in `/v1` (or the full `/v1/chat/completions` URL)
   - `AI_MODEL`: exact model name served by that endpoint, e.g. `qwen2.5:3b`
   - `AI_API_KEY`: the API key configured on your HTTPS gateway, if required
5. Redeploy Render and check `/api/health`. It should report `modelConfigured: true`.

The backend expects the OpenAI Chat Completions response format. Compatible servers include Ollama's OpenAI-compatible API, vLLM, and llama.cpp server.

## Hybrid / offline status

The Android app continues to use the device's speech recognition and speech synthesis when available. A true offline language model is **not yet installed** in the APK; `/api/health` reports this as `offlineModel: "not-installed"`. Adding a phone-side model requires selecting a quantized model that fits the exact device RAM/storage and integrating a supported Android inference runtime. Do not claim offline LLM operation until that model is installed and tested.

## Security

Keep the model server behind HTTPS and authentication. Never put `AI_API_KEY` in the Android app or commit it to GitHub. Only configure secrets in the Render environment.
