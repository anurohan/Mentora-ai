# MENTORA Focus Monitor implementation report

| Capability | Status | Evidence |
|---|---|---|
| Webcam permission request | IMPLEMENTED | `getUserMedia({video:true})` runs only from explicit Enable camera action. |
| Actual webcam stream access | IMPLEMENTED / HARDWARE BLOCKED | Stream is assigned to `video.srcObject`; Windows inventory found an OK USB UVC webcam, but no interactive capture test was run. |
| Live frames | IMPLEMENTED | Video readiness and playback quality/FPS are sampled. |
| Face detection | IMPLEMENTED / LIMITED | Optional browser `FaceDetector` processes live video locally; no MediaPipe/OpenCV model is bundled. |
| Eye activity | NOT_STARTED | No eye landmark/blink/closure model. |
| Head pose | NOT_STARTED | No pose estimator. |
| Away-from-desk | IN_PROGRESS | Visibility changes estimate away-from-window only. |
| Phone detection | NOT_STARTED | No object-detection model. |
| Local processing | IMPLEMENTED | Face and microphone RMS processing are local; raw media is not uploaded or persisted. |
| Continuous explicit-session operation | IMPLEMENTED / NOT HARDWARE-VERIFIED | Monitoring timers require an active study session and explicit streams. |

The Focus Monitor now exposes camera status, permission, face model availability, face status, FPS, and last error. Physical permission, capture, disconnection, and recovery remain unverified.
