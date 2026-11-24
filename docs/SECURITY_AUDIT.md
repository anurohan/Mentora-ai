# MENTORA security and privacy audit

Audit date: 2026-11-24 (Asia/Calcutta)

## Resolved in the 2026-11-25 milestone

- Caller-controlled `x-user-id` authorization was replaced with server-side bearer sessions.
- Anonymous `/api/state` access and cross-user state/library exposure are covered by passing automated tests.
- Session stop, activity, library search/download/delete and logout are owner-checked and tested.
- New passwords use scrypt; legacy SHA-256 hashes migrate after successful login.

## Remaining high risk

## High

- No rate limiting, session expiry, recovery, CSRF strategy, audit trail, or security-header policy exists.
- Tokens are process-local and all users are logged out after a server restart.

## Medium

- JSON writes lack transactional locking and backup/restore.
- Base64 upload requests have limited content validation and no documented HTTP body limit.
- There is no durable encrypted session store or account recovery flow.
- No data deletion control exists beyond client-side CSV export.

## Positive controls

- Camera/microphone access is explicitly requested.
- Current browser code does not upload raw camera or microphone streams.
- Upload filenames are sanitized.
- `.env.example` contains no secrets.

Keep the application local-only until session-backed authorization, KDF migration, ownership enforcement, upload hardening, and automated security tests are implemented.

Release-candidate update: `npm audit --omit=dev` reports zero production dependency vulnerabilities. Development dependencies still require routine audit review; no secrets were exposed.
