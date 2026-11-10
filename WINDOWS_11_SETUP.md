# JARVIS on Windows 11 (HP Laptop)

This guide runs the existing JARVIS web/desktop interface on Windows 11. It does not replace the Android app and does not install a model or connect Kaggle automatically.

## 1. Install prerequisites

Install:
- Git for Windows: https://git-scm.com/download/win
- Node.js 22 LTS (includes npm): https://nodejs.org/en/download

After installation, open **PowerShell** and verify:

```powershell
git --version
node --version
npm --version
```

Node 22 LTS is recommended for this Vite 8 / TypeScript project.

## 2. Download the JARVIS project

In PowerShell:

```powershell
cd $HOME\Documents
git clone https://github.com/ritakumarimotihari2020-bot/Jarvis-android-v1.git
cd Jarvis-android-v1
```

If the folder already exists, use `cd $HOME\Documents\Jarvis-android-v1` and run `git pull` only if you want the latest main-branch changes.

## 3. Install packages and start JARVIS

```powershell
npm install
npm run dev
```

Keep this PowerShell window open. Open the local URL printed by the server (normally http://localhost:3000) in Microsoft Edge or Chrome.

To stop the development server, return to PowerShell and press **Ctrl+C**.

## 4. Verify the project

In a second PowerShell window, from the project folder:

```powershell
npm run lint
npm run build
```

## 5. About the AI model and Kaggle

The Windows app and the AI model are separate parts:
- Running the interface on the HP laptop does not mean the Kaggle GPUs are connected.
- The Kaggle notebook session is temporary. A secure, authenticated HTTPS inference/API endpoint is required before this laptop app or the Android APK can use the Kaggle-hosted model.
- Do not expose Ollama port 11434 or a notebook port directly to the public internet.
- Do not put API keys, Kaggle credentials, or other secrets in frontend files, Git commits, or the Android APK.

The repository's `docker-compose.own-ai.yml` is intended for a Linux server/VPS with Docker Compose, not a direct Windows Kaggle bridge. For Windows local development, use the steps above first.

## Troubleshooting

- **'node' or 'npm' is not recognized:** close and reopen PowerShell after installing Node.js; if still missing, reinstall Node.js 22 LTS and enable PATH.
- **'git' is not recognized:** install Git for Windows, then reopen PowerShell.
- **Port already in use:** stop the older JARVIS process or use the port reported by the server.
- **AI says model/server unavailable:** the UI may be running while the configured model endpoint is not. Check the backend/model endpoint separately; do not assume Kaggle is connected.
