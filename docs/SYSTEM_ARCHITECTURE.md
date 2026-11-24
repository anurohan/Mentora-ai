# System Architecture

## Boundaries

The planned application uses a React/Next.js TypeScript renderer inside a hardened Electron shell, a Python/FastAPI service boundary for document processing, AI, computer vision, and synchronization, and SQLite for local persistence. PostgreSQL and object storage are optional cloud adapters.

```text
Electron shell -> TypeScript UI -> API client -> FastAPI services
                                     |-> Auth/profile
                                     |-> Learning/RAG
                                     |-> Animation specs
                                     |-> Focus signals
                                     |-> Analytics/history
                                     |-> Library/sync
FastAPI -> SQLite/local files (default) or PostgreSQL/object storage (configured cloud)
AI adapters -> Ollama (local) or configured provider
CV adapters -> local OpenCV/MediaPipe/approved detectors; no raw recording by default
```

## Security boundaries

- Renderer has no direct filesystem or Node access.
- Electron uses context isolation and a narrow preload API.
- API handlers enforce authenticated ownership on every user resource.
- Files are stored outside the web root with validated names and quotas.
- Camera and microphone are opt-in, visibly indicated, pausable, and locally processed.
- AI-generated animation output is data validated against a schema and rendered by trusted templates.

## Delivery strategy

The current repository starts with a TypeScript verification entry point and documentation. UI/backend packages will be added at the phase where their contracts are defined, avoiding premature dependencies and uncontrolled scaffolding.
