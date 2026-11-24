# MENTORA Windows installation guide

Current status: development launch, not a packaged installer.

1. Install Node.js 22+ on Windows.
2. Open PowerShell in the project folder.
3. Run `npm install`.
4. Run `npm test`.
5. Run `START_MENTORA.bat` or `npm start`.
6. Open `http://localhost:4173`.

The future installer still needs an Electron/desktop shell, signed packaging, uninstaller, crash handling, and offline installation verification. Do not expose the development server to a public network.
