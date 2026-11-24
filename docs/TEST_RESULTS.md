# MENTORA test results

Updated: 2026-11-25 (Asia/Calcutta)

| Command/suite | Result | Evidence |
|---|---|---|
| `npm run build` | PASS | TypeScript compilation succeeds |
| `npm run verify` | PASS | Foundation verification succeeds |
| `npm run audit` | PASS | Runtime capability audit succeeds |
| `npm test` | PASS | 23 tests: auth, hashing, restart persistence, isolation, library, extraction, retrieval, tutor, animation transitions, activity correction/deletion, analytics, environment/weather, warning preferences, folders, sync queue, real browser journey, and accessibility scan |
| `npm run lint` | MISSING | No lint script configured |
| Browser E2E | PASS | 2 real Chrome tests: core journey plus Axe accessibility scan |
| Accessibility scan | PASS | Zero serious/critical dashboard violations |
| Windows packaging | FAIL/BLOCKED | Dedicated manifest added; NSIS build reaches packaging but fails `ENOSPC` copying full development dependencies; no installer verification |
| CV hardware verification | BLOCKED | No honest camera/mic model test fixture or hardware run |
| Cloud sync verification | BLOCKED | No configured cloud endpoint |

No requirement is marked `VERIFIED` solely from these tests; end-to-end product workflows still require browser coverage.
