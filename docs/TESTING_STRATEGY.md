# Testing Strategy

Each phase adds focused tests before integration. TypeScript build checks the foundation. Later phases will add Python unit/API/database tests, frontend component tests, Electron end-to-end tests, security isolation tests, offline restart tests, and cloud sync conflict tests. Test output is evidence; it is never replaced with hardcoded success values.

The release gate is `npm run verify`, followed by the backend test command and a manual smoke test of the packaged Windows app.
