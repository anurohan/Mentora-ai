# Failed and missing tests

| ID | Check | Result | Exact observation | Required action |
|---|---|---|---|---|
| TEST-001 | `npm test` | PASS | 5 isolated security/library tests pass | Expand into full API/browser coverage |
| TEST-002 | `npm run lint` | MISSING | npm reported `Missing script: "lint"` | Add lint configuration and CI command |
| SEC-001 | Anonymous state access | PASS | Automated test receives 401 | Keep regression test |
| SEC-002 | Cross-user isolation | PASS | Automated state/library isolation test passes | Add coverage for every future resource |
| SEC-003 | Authentication tamper resistance | PASS | `x-user-id` removed from auth path; bearer IDOR test passes | Add expiry/rotation tests |
| SEC-004 | Resource mutation ownership | PASS | Stop/activity/library ownership tests pass | Add update-route coverage |
| SEC-005 | Password storage | PASS | New account hash begins `scrypt$`; legacy migration tested by code path | Add explicit legacy fixture test |
| TEST-003 | Full E2E/database/CV/cloud suites | MISSING | No test files or runner configuration | Add focused suites before release claims |
