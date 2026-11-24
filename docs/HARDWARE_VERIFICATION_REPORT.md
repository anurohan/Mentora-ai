# MENTORA hardware verification report

Status: **BLOCKED / NOT VERIFIED**.

Windows read-only inventory found an `OK` USB2.0 HD UVC webcam and an `OK` Realtek Microphone Array endpoint. The browser E2E suite verifies explicit focus lifecycle controls and unavailable-provider UI; automated tests cover activity persistence, correction, deletion, and local microphone-analysis contracts. No interactive permission grant/denial, capture, disconnection, or recovery run was performed, so physical hardware verification remains unverified.

Manual laptop procedure: run `npm start`, open Focus Monitor, click Enable camera and Enable microphone, accept each Windows/browser prompt, confirm visible indicators and local estimates, disable/re-enable each device, deny each permission once, then stop the study session and confirm events in the local history. Do not upload raw media.
