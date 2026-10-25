# BlockVerse V2 — Argon Architecture, Collision Masks, 2-Tier LOD & Cross-Platform Gamepad

## 1. 125 Original Procedural GLB Pipeline & Texture Atlas (`scripts/generate_v2_assets.py`)

All 125 `.glb` assets under [`public/assets/3d/jakarta/`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/public/assets/3d/jakarta/manifest.json) are generated deterministically (`seed = 20260420`) with a pure-Python glTF 2.0 binary compiler ([`scripts/generate_v2_assets.py`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/scripts/generate_v2_assets.py)) requiring zero external third-party Python dependencies.

- **Single-Drawcall Mesh Consolidation**: Every `.glb` asset consolidates all sub-parts into a single mesh primitive with `POSITION`, `NORMAL`, `TEXCOORD_0`, and `COLOR_0` attributes, reducing GPU draw calls to **1 draw call per asset** (down from 6–10 separate nodes/draw calls per model in alpha).
- **Embedded & Master Detail Atlas**:
  - Each `.glb` embeds a compact `128×128` 4-quadrant procedural surface detail PNG texture (Roof Tile / Genteng, Brick / Concrete Grid, Foliage / Bark, Asphalt / Paver) combined multiplicatively with vertex colors (`COLOR_0`) and baked vertical Ambient Occlusion (AO).
  - A standalone `512×512` master atlas is also emitted at [`public/assets/3d/jakarta/atlas_jakarta_v2.png`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/public/assets/3d/jakarta/atlas_jakarta_v2.png).
- **Category Breakdown (125 Assets Total, `43,568` Triangles, `4.11 MiB`)**:
  - `buildings` (25): Ruko 2–3 lantai, Warung Makan, Indomaret-style Minimarket, Puskesmas, SDN Sekolah, Masjid Lingkungan, Rumah Betawi, Gudang Logistik, Pos RW, Bengkel Motor, Apotek, Laundry Kiloan, Kost 3 Lantai, Kopi Tiam, Salon, Toko Bangunan, dsb.
  - `infrastructure` (15): Jalan Aspal, Jembatan Kanal Kali Apuran, JPO Penyeberangan, Gapura Kampung Ceria, Tanggul Kanal, Lampu PJU Surya, Pagar Beton, Paving Gang, Halte Mikrotrans, dsb.
  - `nature` (15): Pohon Trembesi, Ketapang Kencana, Palem Raja, Bambu Kuning, Mangga, Pisang, Bougainvillea Planter, Taman Rumput, Batu Kali, dsb.
  - `street_props` (20): Gerobak Bakso, Gerobak Gorengan, Tenda Pecel Lele, Kursi Plastik Warung, Tiang Listrik, Kotak Pos, Rambu Lalu Lintas, Tong Sampah Pilah, Banner UMKM, dsb.
  - `vehicles` (10): Bajaj Biru, Mikrotrans JakLingko, Motor Ojol, Sepeda Anak, Gerobak Sampah, Mobil Box UMKM, Mobil Keluarga, Skuter Listrik, dsb.
  - `gameplay` (15): Portal Hub, Checkpoint Totem, Koin Emas, Bintang Langit, Jump Pad, Speed Pad, Quest Beacon, Winner Podium, Finish Arch, dsb.
  - `interiors` (25): Meja Kasir, Rak Minimarket, Etalase Kaca, Kursi Kelas, Papan Tulis, Mesin Kopi, Sofa Tamu, Dipan Kost, Lemari Pakaian, Kulkas Minuman, dsb.

---

## 2. Swept-AABB Collision Masks, Walkable Bridges & Rooftop Parkour (`src/world/cengkareng.js`)

In [`CengkarengExploration`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/src/world/cengkareng.js), static visuals and physical gameplay colliders are decoupled for predictable 60 FPS physics:

1. **Building & Infrastructure Colliders (`this.staticColliders` & `this.placementColliders`)**:
   - Every placed building registers an axis-aligned bounding box (`minX, maxX, minY, maxY, minZ, maxZ`) slightly inset (`footprint * 0.85`) so players cannot walk through walls while avoiding snagging on decorative eaves/awnings.
   - Canal embankments (`canalX = 355`) register concrete wall colliders with openings at the three avenue crossings.
   - Three **Walkable Canal Bridges** (`z = -248`, `52`, `352` across Kali Apuran at `x = 355`) register multi-segment elevated deck colliders (`y = 0.62`, `isRamp: true`), approach ramps (`y = 0.32`), and side safety railings (`y = 1.25`) so players can walk seamlessly over the canal.
   - **Rooftop Explorer Parkour Stairs** (`cx = 150, cz = 300`) register ascending step platforms (`y = 0.7` to `8.2`) leading to an elevated Sky Deck (`y = 8.4`) with a high-value Sky Beacon.
2. **Spatial Filtering (`getActiveColliders(playerPos, radius = 42)`)**:
   - On each physics tick in [`src/game.js`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/src/game.js), only colliders within `42m` radius of the player are evaluated by `resolvePlayerBoxCollisions`, keeping physics CPU time `< 0.15 ms` per frame.

---

## 3. 2-Tier Distance LOD & Mobile Thermal Budgeting

[`CengkarengExploration.update(playerPos, now)`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/src/world/cengkareng.js) runs a distance-based visibility and low-poly proxy pass every `220ms`:

| Tier | Distance Threshold | Behavior |
| :--- | :--- | :--- |
| **Tier 0 (Near LOD)** | `dist <= 135m` | Full GLB mesh streamed & visible (up to `QUALITY_ASSET_CAP`: `98` High, `76` Medium, `48` Low). |
| **Tier 1 (Mid/Far Proxy LOD)** | `135m < dist <= 265m` | Shared-geometry low-poly silhouette proxy (`this.lodGroup`) rendered for buildings, nature, and vehicles while full GLB clones are unloaded from the active scene graph. |
| **Tier 2 (Far Cull)** | `dist > 265m` | Both full GLB and proxy mesh hidden, eliminating vertex transform and fragment overhead. |

---

## 4. Optional OpenStreetMap (ODbL) Corridor Overlay (`scripts/fetch_osm_cengkareng.py`)

- **Pipeline Script**: [`scripts/fetch_osm_cengkareng.py`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/scripts/fetch_osm_cengkareng.py) queries the public Overpass API for the Cengkareng Timur bounding box (`[-6.158, 106.720, -6.135, 106.746]`), extracts only public `highway`, `waterway`, and `leisure=park` polylines, strips all residential/personal tags (`addr:*`, `name` on private houses, `operator`, `phone`), projects coordinates into local meters relative to `(-6.1465, 106.7330)`, and simplifies geometry via Ramer-Douglas-Peucker (`tolerance = 2.5m`).
- **Generated Data**: [`public/assets/geo/cengkareng_osm_overlay.json`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/public/assets/geo/cengkareng_osm_overlay.json) (120 road segments, 22 waterway segments, 6 park polygons).
- **In-Game Toggle & Attribution**: Players can toggle the **🌐 Koridor OSM** button (`#bv-osm-toggle`, calling `explorer.toggleOsmReferenceLayer()`) in the Cengkareng HUD panel. When active, 3D corridor ribbons render in `this.osmGroup` and the mandatory `© OpenStreetMap contributors (ODbL 1.0)` attribution notice is displayed in `#bv-osm-attribution`.

---

## 5. Cross-Platform Gamepad Subsystem (`src/input/gamepad.js`)

[`GamepadController`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/src/input/gamepad.js) provides unified W3C Standard Gamepad (`mapping: "standard"`) and fallback DirectInput support across **Android**, **macOS**, **Windows**, and **iOS/iPadOS** browsers:

| Platform & Browser | Supported Controllers | Technical Implementation Details |
| :--- | :--- | :--- |
| **Android** (Chrome, Edge, Samsung Internet, Firefox) | Xbox Wireless, DualSense, DualShock 4, 8BitDo, Gamesir, Razer Kishi | Handles standard mapping + fallback DirectInput `axes[6]`/`axes[7]` hat-switch D-Pad on Android Bluetooth HID drivers; auto-hides `#touch-controls` while gamepad input is active and restores them on touch. |
| **macOS** (Safari, Chrome, Firefox, Arc) | DualSense, DualShock 4, Xbox Series X\|S, Switch Pro, MFi | Automatic controller family detection (`PlayStation` vs `Xbox` vs `Switch`/`MFi`) with dynamic HUD glyph labels (`Cross/X` vs `A`). |
| **Windows** (Chrome, Edge, Firefox) | Xbox XInput (`045e`), DualSense/DS4, DirectInput USB/BT | Radial deadzone filtering (`0.14` default, user-adjustable `5%–35%` in Settings), `x^1.35` precision response curve, and `vibrationActuator.playEffect("dual-rumble")` haptics. |
| **iOS / iPadOS** (Safari 16+, WebKit browsers) | MFi, Xbox Bluetooth, DualSense, DualShock 4, Switch Pro, Backbone One | Continuous per-frame `navigator.getGamepads()` polling in `requestAnimationFrame` so controllers woken mid-session on iOS Safari are detected immediately even when `gamepadconnected` is delayed until first button press. |
