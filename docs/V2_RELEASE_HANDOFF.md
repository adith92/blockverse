# BLOCKVERSE V2 Alpha Implementation & Release Handoff

Status: **development branch, NOT production-ready and NOT deployed to the existing Render game.**

## ChatGPT delivered here

- Unity of client and server: Node handles `/healthz`, `/ws`, and built Vite static frontend under one hostname; `npm run dev:unified` is the manual local smoke test.
- Single-player still runs on failed/unavailable WebSocket; browser chooses same-origin `wss://.../ws` in deployed production builds by default. During Vite local development it uses existing local/offline sync.
- 125 procedurally generated **actual glTF 2.0 binary files**, with geometry and vertex materials, across seven categories, reproducibly generated using `scripts/generate_v2_assets.py` and catalogued at `public/assets/3d/jakarta/manifest.json`.
- New fictionally arranged, explorable **12-district Cengkareng-inspired open world**: a navigable walking surface, street grid, illustrated canal, district signage, mini-map, district fast travel and distance-limited loading for decorative models.
- Responsive touch look, emote, safe-area HUD styling, portable graphics settings and mobile dynamic render-resolution baseline.
- Automated asset quality assertions and single-host HTTP/WebSocket integration test.

## Limits, important truths

- **This is not a true OSM-derived geospatial street map.** Terrain and placement are fictionalized. A geographic import requires real licensed input, attribution, proper coordinates and independent legal review.
- GLB meshes are hand-authored via geometry scripts and real 3D, but **stylized procedural baseline, not AAA highly detailed sculpting**. Argon owns final high-quality art pass.
- Multiplayer handles real rooms / player transforms / emotes; server does NOT validate physics, economy, rankings or world building with game-authoritative simulation. Child-safe public production needs moderation and privacy checks.
- Mobile 30/45/60 FPS targets are not yet measured on real mobile hardware.
- Existing Render v1 is NOT changed; the `render.yaml` new service config should be reviewed by the owner before deployment.
- Source in new branch may be checked by GitHub CI; an accepted CI build does not replace human/browser acceptance.

## Quick start

```sh
npm install
npm --prefix server install
npm run test:unit
npm --prefix server test
npm run build
# one app on localhost:3001 (unless PORT provided)
ALLOWED_ORIGINS=http://localhost:3001 npm run dev:unified
```

Point mobile/browser clients to the same URL after Render deploy; no separate standalone frontend and multiplayer service needed. Free Render services may sleep during inactivity.

## Indonesia/Jakarta geographic basis

- [Official Cengkareng Timur profile](https://barat.jakarta.go.id/kelurahan/cengkareng-timur) identifies Kapuk Raya, Jalan Pedongkelan Raya, Daan Mogot, Jakarta Outer Ring Road and Kali Apuran, which inspired **zone naming only**.
- [OSM copyright/ODbL](https://www.openstreetmap.org/copyright/en) applies only once real OSM datasets are imported. Do not present fictional district paths as surveyed maps.

## Future handoff

Use [Argon master prompt](ARGON_ANTIGRAVITY_MASTER_PROMPT_V2.md). Argon should work from the feature integration branch, create a separate art branch and PR, and improve geometry, textures, locations, mobile real-device performance and physical collisions. **No ongoing permission beyond this round.**
