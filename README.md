# MENTORA

Learn. Focus. Understand. Evolve.

MENTORA is a local-first AI learning and productivity workspace for students. It combines document extraction, source-cited retrieval, an optional Ollama tutor, interactive educational simulations, privacy-first focus monitoring, study analytics, and a personal library.

## Status

- `npm test`: 23/23 passing
- `npm run verify`: passing
- Real Chrome E2E and Axe accessibility checks: passing
- Hardware verification: pending physical webcam/microphone testing
- Live cloud verification: blocked until services and credentials are configured
- Windows installer verification: blocked by packaging resource/layout issues

MENTORA is not yet declared production-ready. See [FINAL_PROJECT_REPORT.md](docs/FINAL_PROJECT_REPORT.md), [E2E_TEST_REPORT.md](docs/E2E_TEST_REPORT.md), and [WINDOWS_RELEASE_REPORT.md](docs/WINDOWS_RELEASE_REPORT.md).

## Features

- Secure bearer sessions, scrypt password hashing, restart persistence, and ownership isolation.
- PDF, DOCX, PPTX, TXT, and Markdown extraction with page/slide/paragraph/table provenance.
- Local retrieval with source citations and optional Ollama generation.
- Ten deterministic educational animations with real controls and explanations.
- Explicit-consent camera/microphone focus-monitor foundation with live diagnostics.
- Persistent warning preferences, study analytics, streaks, and unknown-time handling.
- Personal library uploads, search, downloads, nested folders, metadata, quotas, and deletion.
- Offline-safe environment/weather and local sync contracts.

## Quick start

Requirements: Node.js 22+.

```powershell
npm install
npm test
npm start
```

Open <http://localhost:4173>. On Windows, `START_MENTORA.bat` starts the local server. `npm run desktop:dev` exercises the Electron shell. `npm run package:win` prepares the NSIS installer, but installer verification is still pending.

## Configuration and privacy

Copy `.env.example` to `.env`; never commit credentials. Local operation does not require cloud services or an AI provider. Camera and microphone access is opt-in; raw media is not uploaded or persisted. Face detection is limited to the browser's optional `FaceDetector` API. Eye activity, head pose, phone detection, and true away-from-desk estimation are not implemented.

## Documentation

- [Implementation roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [Requirements traceability](docs/REQUIREMENTS_TRACEABILITY.md)
- [Test results](docs/TEST_RESULTS.md)
- [Security audit](docs/SECURITY_AUDIT.md)
- [Focus Monitor report](docs/FOCUS_MONITOR_IMPLEMENTATION_REPORT.md)
- [Hardware verification](docs/HARDWARE_VERIFICATION_REPORT.md)
- [Cloud verification](docs/CLOUD_VERIFICATION_REPORT.md)
- [Windows release report](docs/WINDOWS_RELEASE_REPORT.md)

## Collaboration

This repository is maintained as a direct project repository. No Codex collaborator, bot account, pull request, or external agent access is added by this setup.
