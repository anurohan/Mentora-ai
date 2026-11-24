# MENTORA next development plan

## P0 — critical

| Task | Why | Dependencies | Acceptance criteria | Complexity |
|---|---|---|---|---|
| P0-001 Secure identity | Prevent impersonation/data exposure | Session design | Tampered IDs fail; expiry/revocation tested | High |
| P0-002 Ownership enforcement | Protect student records/files | User/resource migration | Two-user tests prove no cross-user reads/writes | High |
| P0-003 Password KDF | Reduce credential compromise risk | Account migration | New accounts use Argon2id/scrypt/bcrypt | Medium |
| P0-004 QA/security gate | Prevent regressions | Test runner | API/isolation/upload/restart/security checks run | Medium |

## P1 — essential

- Add PDF/DOCX/PPTX ingestion and durable topic/content extraction.
- Add an Ollama/provider abstraction and grounded tutor retrieval.
- Build a permission-aware local CV pipeline with supported-device limits.
- Persist warning records, configurable sounds, and validated signal thresholds.
- Add calendar, daily summaries, and reliable report generation.

## P2/P3

- Add adaptive weather/festival/season themes with offline fallback.
- Add idempotent cloud sync, conflicts, and offline queueing.
- Add 3D scenes, Electron packaging, and Android-compatible boundaries.

The next implementation phase should be P0-001 through P0-004 as one security-and-test milestone. Feature expansion before that would compound the current data-isolation risk.
