# MENTORA blockers

## Active blockers

| Blocker | Affected requirement | Reason | Independent work available |
|---|---|---|---|
| No configured AI provider | AI tutor, summaries, RAG | Ollama is not confirmed running and no cloud credential is configured | Build provider interface, local parser, unavailable-state UX |
| No camera/microphone test hardware in this execution | Eye, pose, phone, noise monitoring | Hardware permission and model behavior cannot be honestly verified here | Implement permission/state contracts and simulation tests |
| No cloud account/configuration | Cloud synchronization | No endpoint or credentials are available | Implement local queue/idempotency model and offline behavior |
| No production packaging toolchain | Windows release | Current app is a local Node server/browser shell | Harden startup, health checks, and packaging boundary |

These are capability blockers, not reasons to mark requirements verified. Work that does not depend on them remains executable.
