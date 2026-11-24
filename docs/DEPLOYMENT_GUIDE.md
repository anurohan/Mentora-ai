# MENTORA deployment guide

## Local development

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Run `npm test`.
4. Run `npm start`.
5. Open `http://localhost:4173`.

The application is currently intended for local use only. Do not expose port 4173 publicly: tokens are process-local, cloud sync is not implemented, and browser E2E/release hardening is incomplete.

## Data

Local records are stored under `data/`, which is ignored by Git. Back up that directory before experiments. Existing records without reliable ownership are intentionally hidden after the security hardening migration.
