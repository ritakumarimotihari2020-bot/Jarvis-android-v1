# Run your own JARVIS AI (Gemini-free)

This repository now includes a self-hosted stack: JARVIS API + Ollama + Qwen 2.5 3B. The model weights are downloaded to your server's persistent Docker volume. Requests go to that model; no Gemini API key is used for chat.

## Requirements

- A Linux VPS/server you control.
- Recommended: 8 GB RAM minimum for this small 3B model; 16 GB+ is more comfortable. A supported NVIDIA GPU improves speed but is not mandatory.
- Docker Engine and Docker Compose plugin.
- A domain name and HTTPS reverse proxy (Caddy/Nginx/Traefik) before exposing JARVIS to the internet.

## Deploy

1. Clone this repository onto your VPS.
2. In the repository directory run: `docker compose -f docker-compose.own-ai.yml up -d --build`.
3. First startup downloads Qwen 2.5 3B and may take several minutes; check with `docker compose -f docker-compose.own-ai.yml logs -f model-init`.
4. Check `http://SERVER-IP:3000/api/health`. It should show `modelConfigured: true` once running.
5. Put the JARVIS port behind HTTPS and authentication/access controls. Do not expose Ollama's port 11434. Restrict public access to the JARVIS service.

## Android APK

Set the GitHub Actions repository variable/secret used by the Android workflow, `JARVIS_API_BASE_URL`, to the HTTPS URL of your self-hosted JARVIS server, then rebuild the APK. The APK uses that server URL. Never put model secrets in the APK.

## Existing Render service

The current Render Free service cannot host Ollama/Qwen itself. The `render.yaml` AI_BASE_URL setting is intentionally a required secret placeholder; it must point to a separately hosted, authenticated OpenAI-compatible model server if you keep the API on Render. Easiest fully self-controlled deployment is to run the included Docker Compose stack together on your own VPS and point the APK to it.

## Offline Android model

The APK currently does not contain a local LLM. A true offline model needs a compatible Android inference runtime, a quantized model selected for the phone's RAM/chipset, and a separate tested integration. Do not assume the cloud model works offline.
