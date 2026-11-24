# MENTORA development log

## 2026-11-25 — Security foundation

Implemented in `src/server.ts`, `public/app.js`, `package.json`, and `tests/security.test.mjs`:

- Replaced caller-controlled `x-user-id` authorization with bearer tokens held server-side in memory.
- Added token expiry, logout invalidation, anonymous API denial, and login/register rate limiting.
- Added scrypt password storage and automatic migration from the existing legacy SHA-256 format after a valid login.
- Added owner IDs and authorization checks for newly created records; legacy records without reliable ownership remain hidden.
- Added bounded request parsing and baseline response security headers.
- Connected the browser sign-in flow to both login and registration endpoints.

Evidence:

- `npm run build`: PASS.
- `npm test`: PASS, 4 tests, 0 failures.
- TypeScript problems for `src/server.ts`: none.

Known limitation: persisted sessions are currently bearer-token hashes without refresh rotation, recovery, or device management. Those controls remain required before multi-device/cloud deployment.

## 2026-11-25 — Durable sessions and TXT syllabus ingestion

- Persisted only hashed bearer-session records so valid sessions survive server restarts.
- Added a real TXT/Markdown syllabus upload endpoint that extracts source lines without inventing content.
- Connected the browser learning view to the TXT/Markdown extractor.
- Expanded the isolated suite to 7 passing tests.

## 2026-11-25 — Multi-format extraction, citations, retrieval, and tutor adapter

- Added PDF extraction with page provenance using `pdf-parse`.
- Added DOCX paragraph/heading/table extraction and PPTX slide extraction using validated ZIP/XML parsing.
- Persisted owner-scoped extracted documents and source segments; deletion removes associated extraction data.
- Added deterministic local vector indexing/retrieval with source citations and ownership isolation.
- Added optional Ollama generation with retrieval context and an honest unavailable-provider fallback.
- Added parser fixtures and retrieval/tutor tests; total suite now passes 12 tests.

## 2026-11-25 — Animation, focus foundation, and analytics

- Added ten deterministic animation definitions with validated state transitions and browser controls.
- Added explicit focus signal capability disclosure, local microphone RMS estimates, activity correction, and history deletion APIs.
- Added measured analytics for daily/subject totals, streaks, and away events; unknown time remains unknown.
- Expanded the automated suite to 16 passing tests.

## 2026-11-25 — E2E and release integration

- Added real Playwright/Chrome browser coverage with temporary isolated server data.
- Fixed script loading so enhancement modules execute without `document.write` side effects.
- Fixed anonymous state loading and favicon 404s discovered by console-error capture.
- Browser journey now covers TXT/PDF/DOCX/PPTX uploads, tutor fallback/citations, animation controls, focus lifecycle, warning persistence, analytics, and logout.
- Full suite now passes 22/22 tests; Windows packaging, hardware, live cloud, and extended browser verification remain open.
