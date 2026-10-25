# Changelog

## v1.2.0 — Multiplayer VPS & 3D Art Preview (staging candidate)

- Created standalone WebSocket multiplayer server with server-owned session IDs, room size 16, validation, preset chat and reconnect support.
- Added Docker/Caddy deployment templates for future VPS with HTTPS/WSS.
- Generated four original real glTF/GLB 3D environment prefabs and loaded them in the game through GLTFLoader.
- Added four rendered model previews and illustrated kid-friendly README.
- Added server validation unit suite, deployment guidance and production limitations.
- Not yet confirmed: live VPS deployment, end-to-end multiplayer across networks, anti-cheat, verified rewards, compliance for public child-directed release.

## v1.1.0 — Secure Migration Candidate

- Ported original Gemini Canvas project to Vite, created central validators, tightened Firestore rules and isolated offline rewards from cloud persistence.
