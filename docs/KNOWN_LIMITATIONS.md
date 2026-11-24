# Known Limitations and Risks

- The supplied GitHub repository had no commits, so this workspace starts from a clean foundation.
- Hardware telemetry was partially unavailable through the current shell; GPU, RAM, CPU detail, and disk values must be rechecked on the target laptop.
- Ollama is installed as a client but no running instance was detected; local AI remains configurable rather than assumed.
- Camera, microphone, OCR, CV models, and cloud services require explicit platform permissions and dependency validation on the target Windows machine.
- No feature is marked verified until its implementation and automated test exist.
- Cloud deployment is intentionally deferred until local data isolation and privacy tests pass.
# Current verified limitations

- PDF, DOCX, PPTX, TXT and Markdown extraction are implemented with provenance; scanned PDF/OCR are not yet implemented.
- The tutor has retrieval citations and an Ollama adapter, but real Ollama execution and conversation history require provider/runtime setup.
- Camera/microphone signals are browser permission controls plus optional FaceDetector; eye, pose, phone and noise models are absent.
- Sessions persist as hashed bearer records, but refresh rotation, recovery and device management are absent.
- No browser E2E, lint, cloud-sync, SQLite/PostgreSQL, Electron packaging or real hardware verification exists yet.
- Animation controls are software-tested; visual browser interaction and 3D rotation are not yet E2E verified.
- Analytics currently reports measured sessions and event counts; focus/break/distraction estimates remain explicitly unknown.
- Weather is live only when `MENTORA_WEATHER_PROVIDER_URL` is configured; festival resolution currently supports explicit overrides rather than a remote regional calendar.
- Sync is a local contract only; PostgreSQL/object storage credentials and real multi-device verification are unavailable.
- Existing legacy syllabus/library records without reliable ownership remain hidden rather than exposed.
