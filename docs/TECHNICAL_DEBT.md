# MENTORA technical debt

## P0

- Add durable encrypted sessions, expiry/rotation coverage, recovery, and profile settings.
- Add ownership fields/checks to sessions, syllabi, library files, and activity events.
- Replace unsalted SHA-256 with a maintained password KDF and migration path.
- Add request limits, content sniffing, security headers, and safe errors.

## P1

- Introduce SQLite migrations or another transactional local store with backup/restore.
- Add document parsing, retrieval, and model-provider boundaries.
- Add persisted warning records and validated monitor thresholds.
- Add automated API, isolation, persistence/restart, and browser tests.

## P2/P3

- Implement calendar/period analytics, adaptive themes, cloud sync, 3D scenes, and desktop packaging.
- Add accessibility checks, reduced motion, data deletion, and complete settings.
