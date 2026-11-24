# MENTORA Windows release report

Status: **PREPARATION ONLY / NOT VERIFIED**.

The current release is a Node/browser local application launched by [START_MENTORA.bat](../START_MENTORA.bat). Build and local startup checks pass, but no Electron/desktop shell, signed installer, uninstaller, clean-install test, secure IPC boundary, or crash-recovery package is configured.

`npm run package:win` first exposed a missing application manifest, which was corrected with a dedicated `desktop/package.json`. The subsequent build reached NSIS preparation but failed with `ENOSPC` while copying the full development `node_modules` tree into package resources. An earlier generated unpacked `MENTORA.exe` was launched and exited with code 1 without listening on port 4173. No installer was successfully installed, launched, or uninstalled.

The installer remains a release blocker. The next packaging fix is to package only production runtime dependencies (or bundle the server) instead of the full development `node_modules`, free generated packaging artifacts, rebuild the NSIS artifact, and test clean install/launch/uninstall.
