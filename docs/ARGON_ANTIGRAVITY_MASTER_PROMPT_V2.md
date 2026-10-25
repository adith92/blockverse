# 🌈 BLOCKVERSE V2: ARGON × CHATGPT HANDOFF & ONE-SHOT MASTER PROMPT

> **Repo:** `https://github.com/adith92/blockverse` (PRIVATE)  
> **Integration branch:** `feature/v2-unified-cengkareng-argon`  
> **Target:** one unified browser game, offline solo + online WebSocket multiplayer, detailed Jakarta/Cengkareng-inspired open world, mobile-first optimization.  
> **Owner's workflow authorization:** This collaboration is **for this occasion only**. For any new future coordination, ask the owner rather than assuming ongoing standing permission.

## 🧭 CRITICAL: SPLIT ROLES WITHOUT OVERWRITING EACH OTHER

### ✅ ChatGPT, implementation owner for this round

1. Protected live Render deployment: **do not edit `main`, merge a PR, or modify the live Render services without owner permission**.
2. Create integration branch + draft PR and submit a working implementation.
3. Build **125 verifiable, original GLB models** under `public/assets/3d/jakarta/<category>/<name>.glb`; commit the model-generator script and manifest.
4. Implement `src/world/cengkareng.js`, 12 fictionalized explorable districts, miniature map and district fast-travel menu, lazy asset placement.
5. Unify app: one Node process serves static Vite frontend, `/healthz`, and WebSocket `/ws` using same origin; retain offline solo mode.
6. Make initial touch UI improvements and adaptive render resolution; maintain existing Obby, Builder, Hub, Coin Dash.
7. Add automated GLB manifest checks, world/documentation assertions and unified HTTP+WS tests.
8. Write Render single-service blueprint, technical documentation, and *this* handoff.

### 🎨 Gemini Argon in Google Antigravity, visual/environment and UX implementation owner

1. **Read the actual branch at HEAD before editing.** Review and run tests rather than starting from a blank template.
2. Improve the existing 125 distinct GLB assets into appealing, richly detailed, coherent 3D models using a **high-quality original stylized Jakarta/Indonesia visual art direction**. Avoid copyrighted brand signage. Focus on architectural detail, edges, roofs, doors, shopfronts, shading, textures, vegetation, small props and credible streetscapes. No 2D billboards pretending to be 3D models.
3. If generating textures or PBR maps, use appropriately licensed original materials; prefer 512/1024 texture atlases and GLB embedded compressed textures. Keep low-end phone support. Document triangle counts, dimensions, download budget and material atlas details.
4. Improve **actual playable scenes** rather than only concept screenshots; world layout should feel dense and walkable with quests, wayfinding, alleys, public spaces, bridges and room for exploration. Add physical collisions to buildings and props where appropriate, without trapping players.
5. Build a proper content pipeline for authoritative real OpenStreetMap geographic input, **optional and separate from the fictional gameplay map**: collect permitted roads/landcover/water only, note date, extract source, bounding box, attribution (`© OpenStreetMap contributors`), ODbL/share-alike obligations, avoid exposing sensitive residential details. Do not claim an OSM-derived precise map without actual downloaded data and license compliance.
6. Optimize tablet/mobile interactions with real-device touch tests, camera and joystick ergonomics, safe areas, memory budgets, LOD mesh variants, transparent user-friendly graphics settings. Add capability checks and screenshots demonstrating device testing.
7. Keep all existing gameplay, test pass rate, privacy protections, child-safe quick chat and original IP.
8. Create assets and commits in **your own branch** `feature/argon-v2-art-ux` created from `feature/v2-unified-cengkareng-argon`, and submit a PR targeting the integration branch. Coordinate via PR description/checklist, not by editing protected ChatGPT-owned work concurrently.

### 🔐 File ownership protocol

| File paths | Default owner | Argon policy |
|---|---|---|
| `server/`, `tests/`, `.github/workflows/`, `render.yaml`, `src/schema.mjs` | ChatGPT | Review and propose diff only; request review before changing |
| `src/world/cengkareng.js`, `src/game.js` | ChatGPT baseline | Propose focused integration patch; do not replace entire files |
| `public/assets/3d/jakarta/`, `scripts/generate_v2_assets.py` | ChatGPT baseline / Argon polish | Change only on Argon branch; preserve 125-model manifest and maintain reproducibility |
| `src/mobile.css`, `index.html` | Shared | Add focused UI enhancements, avoid restructuring unrelated controls |
| `docs/argon/`, `docs/visual/` | Argon | Full edit authority; add real-device screenshots and asset render previews |
| `README.md`, `docs/ARGON_ANTIGRAVITY_MASTER_PROMPT_V2.md` | ChatGPT handoff | Update documentation without removing acknowledgements or status caveats |

## 1. Source of truth and absolute constraints

- Existing GitHub repo `adith92/blockverse` is PRIVATE, **not a new project**.
- Integration branch contains code and generated assets from ChatGPT. **DO NOT overwrite that work, create a second standalone `index.html`, or start from scratch.**
- Existing Render legacy deployments `blockverse-3d` and `blockverse-multiplayer` on `main` remain untouched; migration to one public service requires separate owner approval.
- There must ultimately be exactly **one Render public service** for the upgraded build, serving `/` and `/ws` on the same origin. Keep `render.yaml` as the declarative, reviewable staging plan. Do not deploy or change services without approval.
- All creation must be real file operations and verifiable output. No imaginary assets, fake checkmarks, hardcoded success outputs, or passing tests that assert `true`.
- **No copying Roblox assets, architecture, logos, avatars, sounds, copyrighted commercial shop signage, or other third-party content.**
- Do not read/provision secrets into browser `VITE_` variables. Never commit `.env` secrets.
- Child-safety: permit ONLY predefined non-free-text emotes, no unrestricted player uploads/scripting, and no public release without moderation/privacy review.

## 2. Existing ChatGPT implementation: verify before editing

Open and inspect, in order:

1. `README.md`, `docs/V2_RELEASE_HANDOFF.md`, `docs/ARGON_ANTIGRAVITY_MASTER_PROMPT_V2.md`
2. `public/assets/3d/jakarta/manifest.json` and `scripts/generate_v2_assets.py`
3. `src/world/cengkareng.js`
4. `src/game.js` and `src/mobile.css`
5. `server/server.mjs`, `server/validation.mjs`, and `server/tests/`
6. `render.yaml`, `.github/workflows/ci.yml`, and `package.json`

Run:

```bash
npm install
npm --prefix server install
npm run test:unit
npm run build
npm --prefix server test
# test one service locally (frontend and /ws share PORT):
npm run dev:unified
# GET /healthz and GET / should both return success.
```

Never claim complete until CLI tests, browser screen, and real two-device multiplayer verification pass. Existing unit test passing is not substitute for real-device testing.

## 3. Hard deliverables for the Argon branch

### 3.1 Professional game visuals

The starting set is **125 original GLB meshes** across seven categories:

| Category | Count | Art direction |
|---|---:|---|
| Buildings | 25 | Indonesian roofs, shutters, shopfronts, balconies, drainage, public buildings |
| Infrastructure | 15 | roads, canals, bridges, paving, sidewalks, crossings, flyovers |
| Nature | 15 | tropical trees, shrubs, palms, flowers, trees & city park foliage |
| Street props | 20 | lamps, power lines, stalls, signs, garbage bins, flags, benches |
| Vehicles | 10 | angkot, transit vehicles, motorcycle, scooter, bicycle, cars |
| Gameplay | 15 | checkpoint crystals, portals, platforms, quest pedestals, race arches |
| Interior props | 25 | market/shop fittings, chairs, school/cafe furniture, roof details |
| **Total** | **125** | 125 GLB files, validated asset manifest |

The existing procedurally generated meshes are **baseline models, not final high-fidelity art**. Upgrade silhouette, architectural specificity, color story, surface detail, scale, PBR appearance, and ambient set dressing. Optimize aggressively for mobile. Maintain `manifest.json` fields or adapt validation with explicit tests. Every asset in the manifest must exist and import with `GLTFLoader`. Every uploaded asset must be a real mesh (GLB/glTF), not a renamed image.

### 3.2 Cengkareng exploration world

Baseline 12 districts already exist: Kapuk Raya Gateway; Ruko Boulevard; Pasar & Kuliner; Kali Apuran Walk; Kampung Ceria; Fajar Baru; Cengkareng Plaza; Transit Jakarta Barat; Sekolah & Lapangan; Taman Kota; Rooftop Explorer; Daan Mogot Gateway. Current coordinate layout is a **fictionalized stylization**, NOT a geographically precise road reconstruction.

Grounding reference: [Cengkareng Timur official kelurahan profile](https://barat.jakarta.go.id/kelurahan/cengkareng-timur): neighborhood boundaries are Kapuk Raya, Pedongkelan Raya, Daan Mogot and Outer Ring Road; locality includes Apuran canal context. Do not copy street-by-street without actual properly licensed geodata. For any real-world GIS conversion, document source URLs, date, licensing, scale and how paths were simplified; keep a clear in-game notice that it is not for navigation.

Argon tasks:
- Make the twelve districts richly distinct with continuous walkability and recognizable urban / kampung / canal / market / school styles.
- Add an easily legible waypoint/quest route, fast travel accessible on mobile and tablet, optional landmark hints and collectibles.
- Preserve stable spawn positions (no player spawning inside geometry).
- Use a performant district streaming system; do not load 125 unique assets into GPU concurrently on a mid-range phone unless measured.
- Avoid runaway textures, drawcalls, overdraw, geometry duplication; preserve frustum culling and distant LOD.
- Document real collision masks and how they interact with existing Swept-AABB physics.

### 3.3 Mobile UX

Acceptable tested devices: Android Chrome (~360×800), tablet landscape (~1024×768), desktop (~1440×900), one actual touch-capable device. Use browser/device emulation for preliminary work and real devices for release validation.

- Touch joystick fixed lower-left; action buttons lower-right; touch camera orbit on viewport; pinch-to-zoom optional.
- Buttons at least 44 CSS pixels; preserve safe areas on notched devices and no accidental tap-through overlays.
- Tablet allows viewport controls without blocking inventory, minimap or modal.
- No browser scroll while actively dragging gameplay canvas; menu content remains scrollable and accessible.
- Use reduced-motion, keyboard and readable contrast support.
- Implement dynamic resolution for phone targets, graphics quality presets, GPU memory cap and LOD.
- Performance targets *aspirational until measured*: low-end Android 30 FPS, mid-range tablet 45-60 FPS, desktop 60 FPS. Capture real hardware measurements in `docs/visual/PERFORMANCE_REPORT.md`.

### 3.4 Multiplayer+solo

- `/ws` uses same public hostname as `/`, TLS automatically from Render.
- A room supports up to 16 players, validated peer movement, allowlisted quick emotes, and disconnect awareness.
- Offline solo remains playable on websocket failure; reconnect may rejoin but must never duplicate avatar peers.
- Preserve original obby, builder and rewards behavior. **Do not claim currency is server authoritative; it is still DEMO.**
- Test two separate browser devices, and local multi-tab, plus 17th client rejected.
- Pay attention to V1 backend's limitations: persistent world sync, physics authority, anti-cheat and real-account identity remain incomplete; raise issues rather than promise fully production-secure public multiplayer.

## 4. Mandatory quality gates

- `npm run test:unit` passes, including **GLB magic/header checks for all 125 models**.
- `npm run build` succeeds, generated GLB URLs are actually present under `dist/assets/3d/jakarta/`.
- `npm --prefix server test` succeeds including unified same-origin HTTP / WebSocket and the 16-client room test.
- Health endpoint returns HTTP 200; frontend index returns 200; missing GLB returns HTTP 404; `/ws` works when valid.
- No broken mobile click targets/invalid renderer states; check console for JS errors.
- At least one screenshot for 4 zones and for mobile/tablet; these must be **real renders**, not illustrations claimed to be gameplay.
- Keep OSM attribution & child safety compliance if OSM data is actually imported.
- Check performance: visibly dense world AND bounded CPU/GPU. Log worst-case drawcalls, geometry count, textures and FPS.
- All risk items documented openly in README, no fabricated 10/10 production claim.

## 5. Output and Git handoff

1. Create your branch `feature/argon-v2-art-ux` FROM `feature/v2-unified-cengkareng-argon`.
2. Commit real changes, created GLB assets, texture atlases, reproducible source scripts and screen captures.
3. Run test/build and attach concise logs.
4. Open a PR `Argon: polish world art and mobile UX` targeting `feature/v2-unified-cengkareng-argon`, NOT main. Do not merge it automatically.
5. PR description must include changes, exact asset count, screenshots, model triangle budgets, verified tests, licensing, bugs, known limitations and a checklist of missing requirements.
6. Use the GitHub repo as the shared synchronization point, **not two separate divergent ZIP archives**.
7. Never modify existing Render services or enable costly plans without the owner's specific approval.
8. End your reply with a compact handoff for ChatGPT: branch name, PR URL, commit SHA, tests, files, blockers, decisions needed from owner.

## 6. What Argon MUST NOT do

- Do not rewrite all 2,900+ lines of `src/game.js` in one shot; use additive modules/targeted edits.
- Do not attempt to generate 125 placeholder boxes and call them detailed production assets.
- Do not replace `README.md` with empty marketing prose; maintain working controls and deployment instructions.
- Do not invent accurate GPS locations, road geometry, or unlicensed Google Maps data.
- Do not delete any V1 world or alter saved gameplay JSON schema without a migration.
- Do not merge into `main`, create public release, publish live services, or create any billable Render services.

**EXECUTION DIRECTIVE:** Start by inspecting actual GitHub source, identifying risks, running baseline tests and reviewing 125 assets. Then modify code/assets in your own branch, show real test results and a reviewable PR. Do not stop at a vague architecture plan. This is a one-shot implementation handoff for this occasion only.
