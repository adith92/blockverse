# BLOCKVERSE V2 Roadmap Implementation and Release Status

Date: 2026-10-25. Feature branch: `feature/roadmap-v2-school-mobile-release`.

## Implemented and CI-testable
- **12 district + hub NPCs** (13 total), fixed educational personas with privacy notices and phone-friendly proximity controls.
- **NPC voice-synced 3D mouth and head gestures** only when an actual WAV audio playback is active; no prerecorded voice or live child voice claimed.
- **10 curated server-graded educational quizzes**, short 3-choice questions across mathematics, Indonesian literacy, science, geography, local culture, environment, ethics, art, road safety and logic. The client never receives answer keys. Session quiz IDs expire and cannot be used twice.
- **Learning feedback** and non-spendable, in-memory badges only. No children's personally identifiable data, achievements or voices are saved to cloud.
- **Mobile HUD**: collapsed map default on <=700px displays, safe-area controls and hidden developer HUD.
- **One-origin server APIs** `/api/npc/catalog`, `/api/npc/talk`, `/api/npc/speech/:id`, `/api/quiz/start`, `/api/quiz/answer`, plus `/ws` multiplayer; VPS LLM and Piper voice opt-in only.
- **Context7**: Three.js r186 disposal and geometry patterns; Ollama structured chat output supported but not enabled for children's open-ended requests.

## Remaining launch blockers and future roadmap phases
- *Not implemented*: microphone speech recognition. Requires explicit guardian consent, privacy-by-design, local ASR and safeguarding.
- *Not implemented*: robust independent moderation model, human safety review, parental controls, age assurance, report/appeal workflow; freeform LLM questions remain **OFF**.
- *Not implemented*: full server-authoritative physics and persistent anti-cheat economy; multiplayer remains basic room relay.
- *Not implemented*: production childlike Indonesian synthetic TTS model. Piper adapter exists but no verified youthful Indonesian ONNX voice has been deployed.
- *Not implemented*: actual device performance profiling on low-end Android/iPad, realistic lip-sync visemes or face blendshapes. Mouth animation is an approximation linked to currentTime only.
- *Not implemented*: private school/co-op multiplayer quests and cloud progress, OSM turn-by-turn streets.
- *Pending*: code coverage, dependency lockfile generation, automated browser screenshots, pen test, production child content review.

## Merge and release gates
1. CI for every branch: test-and-build, VPS multiplayer, Firestore, and new quiz tests **PASS**.
2. Separate staging Render service must be live, `GET /healthz`, `GET /api/npc/catalog`, game assets and quiz start/answer must return expected responses.
3. Do not enable `NPC_LLM_ENABLED`, `NPC_FREEFORM_ENABLED`, `NPC_TTS_ENABLED` in public staging until models + guardrails ready.
4. No remove or modify existing public Render live services during staging.
5. Only merge into main once replacement URL / routing is agreed or old static URL will lose NPC dynamic endpoints.
6. Delete merged feature branches only **after** GitHub confirms merged and merge commit is verified in destination.
