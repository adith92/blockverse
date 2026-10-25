# BlockVerse V2 — Visual Verification & WebGL Performance Report (Argon)

- **Captured On**: `2026-10-25`
- **Branch**: `feature/argon-v2-art-ux` (targeting `feature/v2-unified-cengkareng-argon`)
- **Runtime**: Unified Single-Origin Express/HTTP + WebSocket Server (`server/server.mjs`) serving production Vite bundle (`dist/`) + 125 procedural `.glb` assets (`public/assets/3d/jakarta/`).

---

## 1. 125 Procedural GLB Asset Pack & Texture Atlas Metrics

| Metric | Value | Notes |
| :--- | :--- | :--- |
| **Total Unique `.glb` Models** | `125` | 7 categories (`buildings`: 25, `infrastructure`: 15, `nature`: 15, `street_props`: 20, `vehicles`: 10, `gameplay`: 15, `interiors`: 25) |
| **Total Triangle Count (125 Assets)** | `43,568` triangles | Min `44` tris (`interiors/wall_clock.glb`), Max `1,188` tris, Avg `348.5` tris/model |
| **Total Disk Footprint** | `4.11 MiB` (`4,310,136` bytes) | Avg `33.7 KiB` per `.glb` (includes embedded `128×128` detail PNG atlas per model) |
| **Master Surface Detail Atlas** | `public/assets/3d/jakarta/atlas_jakarta_v2.png` | `512×512` 4-quadrant procedural texture (Genteng Roof Tile, Brick/Plaster Grid, Tropical Foliage, Asphalt/Paver) |
| **Draw Calls per `.glb` Model** | `1` draw call / model | Consolidated single-primitive mesh with `POSITION`, `NORMAL`, `TEXCOORD_0`, and `COLOR_0` + baked vertical AO |

---

## 2. Measured WebGL Telemetry Across Viewports & Districts

Measured in headless Chromium WebGL (`--enable-webgl --use-gl=angle`) via `window.__bvTelemetry` (`renderer.info.render` & `renderer.info.memory`):

| Viewport / District Scenario | Resolution | FPS | Draw Calls | Active Triangles | GPU Geometries | GPU Textures | Active Input Mode |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Desktop — Cengkareng Plaza (+ OSM Overlay)** | `1440×900` (`DPR 1`) | `60 FPS` | `532` | `14,684` | `510` | `36` | Keyboard/Mouse + DualSense Gamepad |
| **Desktop — Kali Apuran Walk & Canal Bridge** | `1440×900` (`DPR 1`) | `60 FPS` | `1,095` | `4,652` | `960` | `59` | Keyboard/Mouse + DualSense Gamepad |
| **Desktop — Rooftop Explorer (Elevated Deck)** | `1440×900` (`DPR 1`) | `60 FPS` | `869` | `12,580` | `1,213` | `102` | Keyboard/Mouse + DualSense Gamepad |
| **Tablet Landscape — Transit Jakarta Barat** | `1024×768` (`DPR 2`) | `60 FPS` | `425` | `14,784` | `1,224` | `113` | Multi-Touch Virtual Joystick + Pinch Zoom |
| **Mobile Android — Cengkareng Plaza** | `360×800` (`DPR 2`) | `60 FPS` | `208` | `9,060` | `1,224` | `113` | Multi-Touch Virtual Joystick + Adaptive DPR |

---

## 3. Single-Origin WebSocket & 16-Player Capacity Verification

Executed against the unified server (`server/server.mjs`):

1. **Health Check (`/healthz`)**: Returned `200 OK` (`{"ok":true,"service":"blockverse-multiplayer"}`).
2. **2-Client Move Broadcast**: Client 1 (`Explorer_1001`) joined `CENGKARENG-QA:cengkareng` and sent `player:move` (`[150.0, 2.0, 22.0]`); Client 2 (`Explorer_1002`) received `event: "player:move"` within `< 50ms`.
3. **17th-Client Room Capacity Enforcement**: Clients `Explorer_1001` through `Explorer_1016` filled `CENGKARENG-QA:cengkareng` (`16/16`). When `Explorer_1017` attempted `room:join`, the server immediately rejected the join with `{"event":"room:error","code":"room_full"}`.
4. **In-Browser Automated Verification Suite**: `14 / 14` internal schema, AuthZ, revision conflict, checkpoint order, and validator tests passed.

---

## 4. Cross-Platform Gamepad Verification (`src/input/gamepad.js`)

| Simulated Controller ID | Detected Profile | Action Glyph (`South`) | Analog + Deadzone Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| `Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b12)` | `Xbox Controller` | `A` | `moveX: 0.47, moveY: -0.76, jump: true` | PASS |
| `DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)` | `PlayStation DualSense/DS4` | `✕` | `moveX: 0, moveY: 0` | PASS |
| `MFi Extended Gamepad (iOS Safari)` | `Apple MFi / iOS Gamepad` | `A` | `moveX: 0, moveY: 0` | PASS |
| `Android Bluetooth Gamepad (Vendor: 18d1)` (DirectInput Hat Axes `6/7`) | `Gamepad` | `A/✕` | `moveX: -1, moveY: 1` (Hat Fallback) | PASS |

---

## 5. Captured Visual Verification Gallery

- **Asset Showcase (125 GLB Pack Preview)**: [`docs/visual/asset_showcase_125_preview.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/visual/asset_showcase_125_preview.png)
- **01 — Desktop Cengkareng Plaza + OSM Corridor Overlay (`1440×900`)**: [`docs/visual/screenshots/01_desktop_cengkareng_plaza_1440x900.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/visual/screenshots/01_desktop_cengkareng_plaza_1440x900.png)
- **02 — Desktop Kali Apuran Walk & Canal Bridge (`1440×900`)**: [`docs/visual/screenshots/02_desktop_kali_apuran_walk_1440x900.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/visual/screenshots/02_desktop_kali_apuran_walk_1440x900.png)
- **03 — Desktop Pasar & Kuliner (`1440×900`)**: [`docs/visual/screenshots/03_desktop_pasar_kuliner_1440x900.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/visual/screenshots/03_desktop_pasar_kuliner_1440x900.png)
- **04 — Desktop Kampung Ceria (`1440×900`)**: [`docs/visual/screenshots/04_desktop_kampung_ceria_1440x900.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/visual/screenshots/04_desktop_kampung_ceria_1440x900.png)
- **05 — Desktop Rooftop Explorer Parkour (`1440×900`)**: [`docs/visual/screenshots/05_desktop_rooftop_explorer_1440x900.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/visual/screenshots/05_desktop_rooftop_explorer_1440x900.png)
- **06 — Tablet Landscape Transit Jakarta Barat (`1024×768`)**: [`docs/visual/screenshots/06_tablet_landscape_cengkareng_1024x768.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/visual/screenshots/06_tablet_landscape_cengkareng_1024x768.png)
- **07 — Mobile Android Cengkareng Plaza (`360×800`)**: [`docs/visual/screenshots/07_mobile_android_cengkareng_360x800.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/visual/screenshots/07_mobile_android_cengkareng_360x800.png)
- **08 — Cross-Platform Gamepad Controls Modal (`1440×900`)**: [`docs/visual/screenshots/08_gamepad_controls_modal_1440x900.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/visual/screenshots/08_gamepad_controls_modal_1440x900.png)
