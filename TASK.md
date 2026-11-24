# MENTORA Master Task

Source plan: the complete product brief supplied in the read-only attachment `Pasted text #1.txt`.

## Execution contract

- Build in phases; every phase must have tests and documentation evidence.
- Keep local-first functionality and cloud adapters configurable.
- Never claim a requirement is verified without a passing automated test.
- Keep camera, microphone, files, and user data explicitly permissioned and isolated.
- Treat monitoring outputs as estimated signals, never as facts.

## Phase checklist

- [x] Phase 0: environment audit and risk register
- [x] Phase 1: architecture, database design, folder structure, requirement IDs
- [~] Phase 2: authentication, profiles, database, navigation, dashboard (local foundation implemented; production hardening remains)
- [ ] Phase 3: syllabus intelligence and contextual tutor
- [ ] Phase 4: structured animation engine and five verified demos
- [ ] Phase 5: privacy-first focus monitor
- [ ] Phase 6: warnings and event logging
- [ ] Phase 7: history, calendar, analytics, exports
- [ ] Phase 8: personal library and document retrieval
- [ ] Phase 9: adaptive themes and Explore/Focus modes
- [ ] Phase 10: optional cloud sync
- [ ] Phase 11: final verification and release packaging

## Implemented local slice

- `public/` contains the responsive MENTORA interface with Dashboard, My Learning, AI Tutor, Focus Monitor, Study Journey, My Library, Analytics, and Settings views.
- `src/server.ts` provides local JSON persistence, account registration/login, syllabus topics, study session start/stop, library metadata, and tutor responses.
- `START_MENTORA.bat` builds, starts the local server, and opens the app in the default browser.

This is a working local foundation, not a claim that every advanced AI, computer-vision, cloud-sync, and Electron requirement is verified yet.

## Current acceptance gate

Phase 1 is complete when the documents in `docs/` exist, the initial traceability matrix is populated, the TypeScript build passes, and implementation risks/limitations are explicitly documented. Subsequent phases may only move a requirement to `VERIFIED` after its test passes.

