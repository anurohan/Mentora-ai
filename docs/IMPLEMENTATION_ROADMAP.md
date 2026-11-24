# MENTORA implementation roadmap

Updated: 2026-11-25 (Asia/Calcutta)

## Completed in this milestone

- Server-backed bearer sessions with eight-hour expiry, persisted token hashes, and logout invalidation.
- Valid sessions survive a server restart without storing raw tokens.
- TXT/Markdown syllabus ingestion extracts owned source lines and is connected to the learning view.
- PDF/DOCX/PPTX extraction preserves page/slide/paragraph/table provenance and handles malformed/empty inputs.
- Owner-scoped extracted-document storage and deterministic local vector retrieval return real source citations.
- Tutor requests use retrieved context with an optional Ollama adapter and honest unavailable-provider responses.
- Ten deterministic animation definitions expose play/pause/step/back/reset/speed/zoom and explanation controls.
- Focus monitoring records explicit camera/mic-derived estimates, capability limitations, corrections and deletion.
- Analytics exposes persistent measured daily/subject history without classifying unknown time as distraction.
- scrypt password hashes for new accounts and legacy SHA-256 migration on successful login.
- Authenticated `/api/state`; anonymous requests are rejected.
- Owner scoping for sessions, syllabi, library records, and activity events.
- Ownership checks on session stop and activity creation.
- Request-size limits, input bounds, rate limiting for login/registration, and baseline security headers.
- Real login/register choice in the browser auth flow.
- Isolated Node security tests covering anonymous access, hashing, isolation, IDOR resistance, and logout.

## Next execution order

1. Add authenticated profile/settings persistence and backup/restore with tests.
2. Add library download/delete/search with strict owner checks and upload content validation.
3. Add OCR adapters behind explicit capability reporting.
4. Add conversation history, provider configuration UI, and retrieval evaluation.
5. Add adaptive environment themes and persisted warning records.
6. Add monitoring signal adapters only where local support and hardware tests exist.
7. Add adaptive themes, sync queue, cloud adapter, 3D templates, and Windows packaging.

Each step must add automated evidence before its traceability status is advanced.
