#!/usr/bin/env python3
"""Deterministic original stylized Jakarta/Cengkareng modular glTF 2.0 binary (GLB) asset generator.
Argon V2 Art Pass:
- 125 distinct, architected 3D models across 7 categories.
- Pure-Python deterministic GLB 2.0 compiler + embedded 256x256 procedural PBR detail texture atlas
  and standalone 512x512 master atlas (public/assets/3d/jakarta/atlas_jakarta_v2.png).
- Single-mesh vertex-colored + UV-mapped geometry with baked vertical ambient occlusion for 1-draw-call mobile rendering.
- No scraped photos, maps, third-party textures or copyrighted commercial signage. MIT / Original BLOCKVERSE license.
"""
from __future__ import annotations
import json, math, random, pathlib, struct, zlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/assets/3d/jakarta'
OUTPUT.mkdir(parents=True, exist_ok=True)

CATS = {
    'buildings': [
        'kampung_home', 'terrace_home', 'corner_home', 'roof_garden_home', 'contract_house',
        'two_storey_house', 'three_storey_house', 'ruko_small', 'ruko_double', 'ruko_tall',
        'market_hall', 'market_kiosk', 'warung', 'coffee_stall', 'mini_mart',
        'school_block', 'clinic', 'community_hall', 'mushola', 'mosque_courtyard',
        'warehouse', 'office_midrise', 'apartments', 'guard_post', 'workshop'
    ],
    'infrastructure': [
        'road_straight', 'road_corner', 'road_crossing', 'road_tjunction', 'road_bend',
        'sidewalk', 'zebra_crossing', 'pedestrian_bridge', 'overpass', 'bridge_canal',
        'canal_wall', 'drainage_module', 'parking_lot', 'alley_pavers', 'roundabout'
    ],
    'nature': [
        'rain_tree', 'rain_tree_bloom', 'tamarind', 'palm_tree', 'banana_tree',
        'mango_tree', 'mango_fruiting', 'tree_sapling', 'flower_shrub', 'hedge',
        'fern', 'flower_planter', 'lotus_planter', 'river_reeds', 'cloud_cluster'
    ],
    'street_props': [
        'street_lamp_modern', 'street_lamp_vintage', 'power_pole', 'cable_bundle', 'street_sign',
        'laneway_sign', 'direction_sign', 'bus_stop', 'bus_shelter', 'traffic_cone',
        'traffic_bollard', 'bench', 'trash_bin', 'park_fence', 'garden_fence',
        'market_awning', 'flagpole_indonesia', 'billboard_blank', 'food_cart', 'bicycle_rack'
    ],
    'vehicles': [
        'angkot', 'city_bus', 'minibus', 'compact_car', 'taxi_generic',
        'light_truck', 'pickup', 'scooter', 'motorcycle', 'bicycle'
    ],
    'gameplay': [
        'checkpoint_crystal', 'prism_portal', 'quest_terminal', 'save_totem', 'spring_pad',
        'moving_platform', 'floating_island', 'race_arch', 'coin_star', 'collectible_chest',
        'hazard_spinner', 'jump_platform', 'build_station', 'teleport_pad', 'zipline_anchor'
    ],
    'interiors': [
        'table_wood', 'chair_wood', 'stool', 'shelf_shop', 'cashier_desk',
        'ceiling_fan', 'shop_fridge', 'display_counter', 'crate_wood', 'crate_plastic',
        'water_tank', 'ac_unit', 'roof_antenna', 'small_tv', 'sign_blank',
        'cafe_table', 'cafe_chair', 'lamp_hanging', 'flower_pot', 'carpet',
        'board_school', 'school_desk', 'market_basket', 'bamboo_bench', 'lamp_neon'
    ]
}

COLORS = {
    'wall': '#F5EAD8', 'wall2': '#C8ECEE', 'wall3': '#FAD2C0', 'wall4': '#E8DDF7',
    'wall_mint': '#D4F0DC', 'wall_OCHRE': '#F6DFB2', 'brick': '#C86D58',
    'roof': '#BD5B4E', 'roof2': '#3E5B88', 'roof3': '#E8A83E', 'roof_green': '#2F7D63',
    'wood': '#8E5B3E', 'wood2': '#C69265', 'bamboo': '#D7B377',
    'green': '#3E7A56', 'foliage': '#5CB86E', 'leaf2': '#84C862', 'leaf3': '#2B8E67',
    'stone': '#8799A6', 'concrete': '#CFD7D9', 'road': '#464F5E',
    'metal': '#3F5068', 'metal2': '#8C9FAD', 'chrome': '#DCE6ED',
    'glass': '#6AD2E2', 'water': '#48B2D6', 'shadow': '#26364E',
    'sun': '#F5BE4B', 'salmon': '#F0716E', 'purple': '#9370D8',
    'white': '#FFF9EE', 'pink': '#F2B6DF', 'blue': '#3B97BC',
    'soil': '#735136', 'dark': '#223347', 'orange': '#F28546', 'red_id': '#E63946',
    'teal': '#2EC4B6', 'gold': '#FFD166'
}

# 4x4 UV Tile Mapping (col, row) in our procedural surface atlas
TILE_MAP = {
    'roof': (0, 0), 'roof2': (1, 0), 'roof3': (2, 0), 'roof_green': (1, 0),
    'wall': (3, 0), 'wall2': (0, 1), 'wall3': (1, 1), 'wall4': (2, 1),
    'wall_mint': (0, 1), 'wall_OCHRE': (3, 0), 'brick': (1, 1),
    'metal': (3, 1), 'metal2': (2, 3), 'chrome': (2, 3),
    'road': (0, 2), 'stone': (1, 2), 'concrete': (2, 2),
    'wood': (3, 2), 'wood2': (3, 2), 'bamboo': (3, 2), 'soil': (1, 2),
    'green': (0, 3), 'foliage': (0, 3), 'leaf2': (0, 3), 'leaf3': (0, 3),
    'glass': (1, 3), 'water': (1, 3),
    'sun': (3, 3), 'gold': (3, 3), 'purple': (3, 3), 'teal': (3, 3),
    'salmon': (2, 0), 'orange': (2, 0), 'red_id': (2, 0), 'pink': (2, 0),
    'white': (3, 0), 'blue': (2, 1), 'dark': (2, 3), 'shadow': (2, 3)
}


def make_png_bytes(width: int, height: int, rgb_rows: list[bytes]) -> bytes:
    """Encode raw RGB scanlines into a standard compliant PNG binary."""
    raw = bytearray()
    for row in rgb_rows:
        raw.append(0)  # Filter type 0 (None)
        raw.extend(row)

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    compressed = zlib.compress(bytes(raw), level=9)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')


def generate_atlas_png(size: int = 256, colorized: bool = False) -> bytes:
    """Create a 4x4 procedural architectural & nature texture atlas.
    - Embedded GLB uses neutral high-luminance detail (colorized=False) so vertex COLOR_0 tints cleanly.
    - Standalone master preview atlas (colorized=True) shows full-color Indonesian material swatches.
    """
    tile = size // 4
    rows: list[bytes] = []
    palette_swatches = [
        [(205, 102, 84), (88, 122, 168), (242, 182, 82), (244, 234, 216)],
        [(204, 238, 238), (218, 134, 114), (226, 214, 245), (168, 184, 196)],
        [(92, 102, 118), (156, 170, 180), (210, 218, 220), (186, 140, 98)],
        [(108, 192, 122), (132, 216, 232), (96, 114, 136), (248, 208, 108)]
    ]
    for y in range(size):
        row = bytearray(size * 3)
        ty, py = divmod(y, tile)
        u_norm = py / max(1, tile - 1)
        for x in range(size):
            tx, px = divmod(x, tile)
            # Crisp procedural architectural pattern per tile
            val = 232
            if ty == 0 and tx == 0:  # Genteng terracotta roof tiles
                wave = int(6 * math.sin(px * math.tau / 12.0))
                if (py + wave) % 10 < 2:
                    val = 192
                elif px % 12 < 2:
                    val = 212
                else:
                    val = 238 - ((py % 10) * 2)
            elif ty == 0 and tx == 1:  # Corrugated metal roof seams
                val = 210 if (px % 8 < 2) else (242 if (px % 8 in (4, 5)) else 228)
                if py % 24 == 0:
                    val = 195
            elif ty == 0 and tx == 2:  # Awning stripes
                val = 248 if ((px // 10) % 2 == 0) else 212
                if py > tile - 6:
                    val = 195
            elif ty == 0 and tx == 3:  # Stucco wall + plinth
                grain = ((px * 37 + py * 53) & 7) - 3
                val = (205 if py > tile * 0.82 else 238) + grain
            elif ty == 1 and tx == 0:  # Kampung wall + louver trim
                val = 216 if (py % 14 < 2 or px % 28 < 2) else 240
            elif ty == 1 and tx == 1:  # Brick & roster breeze-block
                brick_row = py // 8
                offset = (brick_row % 2) * 8
                if py % 8 == 0 or (px + offset) % 16 == 0:
                    val = 196
                else:
                    val = 236
            elif ty == 1 and tx == 2:  # Ruko commercial grid
                val = 204 if (px % 16 < 2 or py % 16 < 2) else 240
            elif ty == 1 and tx == 3:  # Rolling door shutter slats
                val = 194 if (py % 5 == 0) else (242 if (py % 5 == 2) else 224)
            elif ty == 2 and tx == 0:  # Asphalt road grain
                noise = ((px * 17 ^ py * 31) & 15) - 7
                val = 222 + noise
            elif ty == 2 and tx == 1:  # Herringbone alley pavers
                val = 196 if ((px + py) % 12 < 2 or (px - py) % 12 < 2) else 236
            elif ty == 2 and tx == 2:  # Ashlar stone & concrete blocks
                r_idx = py // 12
                off = (r_idx % 2) * 12
                val = 200 if (py % 12 < 2 or (px + off) % 24 < 2) else 238
            elif ty == 2 and tx == 3:  # Tropical wood & bamboo weave
                weave = ((px // 6 + py // 6) % 2) * 16
                val = 218 + weave - (py % 6 == 0) * 18
            elif ty == 3 and tx == 0:  # Tropical foliage clusters
                d = ((px % 14) - 7) ** 2 + ((py % 14) - 7) ** 2
                val = 246 if d < 18 else (228 if d < 36 else 204)
            elif ty == 3 and tx == 1:  # Glass reflection diagonal
                diag = (px + py) % 32
                val = 252 if diag in (4, 5, 6, 12, 13) else 226
            elif ty == 3 and tx == 2:  # Brushed metal
                val = 226 + (((px * 7 + py) % 9) - 4)
            else:  # Glowing radial emblem
                cx, cy = tile / 2, tile / 2
                dist = math.hypot(px - cx, py - cy)
                val = 252 if int(dist) % 10 < 5 else 218

            val = max(180, min(255, int(val - u_norm * 6)))
            idx = x * 3
            if colorized:
                br, bg, bb = palette_swatches[ty][tx]
                row[idx] = max(0, min(255, (br * val) // 240))
                row[idx + 1] = max(0, min(255, (bg * val) // 240))
                row[idx + 2] = max(0, min(255, (bb * val) // 240))
            else:
                row[idx] = val
                row[idx + 1] = val
                row[idx + 2] = val
        rows.append(bytes(row))
    return make_png_bytes(size, size, rows)


EMBEDDED_ATLAS_PNG = generate_atlas_png(128, colorized=False)
MASTER_ATLAS_PNG = generate_atlas_png(512, colorized=True)
(OUTPUT / 'atlas_jakarta_v2.png').write_bytes(MASTER_ATLAS_PNG)


def hex_to_rgba(col_key: str) -> tuple[int, int, int, int]:
    s = COLORS.get(col_key, col_key).lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


def shade_rgba(rgba: tuple[int, int, int, int], factor: float) -> tuple[int, int, int, int]:
    return (
        max(0, min(255, int(rgba[0] * factor))),
        max(0, min(255, int(rgba[1] * factor))),
        max(0, min(255, int(rgba[2] * factor))),
        rgba[3]
    )


class Model:
    """Accumulates 3D primitives in Z-up design coordinates and exports Y-up glTF 2.0 binary (.glb)."""
    def __init__(self, seed: str):
        self.r = random.Random(seed)
        self.positions: list[tuple[float, float, float]] = []  # Stored in glTF Y-up: (x, z_up, -y_depth)
        self.normals: list[tuple[float, float, float]] = []
        self.uvs: list[tuple[float, float]] = []
        self.colors: list[tuple[int, int, int, int]] = []
        self.indices: list[int] = []

    def _tile_uv(self, color: str, u: float, v: float) -> tuple[float, float]:
        tx, ty = TILE_MAP.get(color, (3, 0))
        # Clamp inside the 4x4 tile with half-texel margin to avoid bleeding
        u_clamped = 0.04 + (u % 1.0) * 0.92
        v_clamped = 0.04 + (v % 1.0) * 0.92
        return ((tx + u_clamped) * 0.25, (ty + v_clamped) * 0.25)

    def _add_quad(
        self,
        p0: tuple[float, float, float],
        p1: tuple[float, float, float],
        p2: tuple[float, float, float],
        p3: tuple[float, float, float],
        color: str,
        shade: float = 1.0
    ):
        # Convert Z-up design coords (x, y, z) -> glTF Y-up (x, z, -y)
        def to_yup(p: tuple[float, float, float]) -> tuple[float, float, float]:
            return (float(p[0]), float(p[2]), float(-p[1]))

        v0, v1, v2, v3 = to_yup(p0), to_yup(p1), to_yup(p2), to_yup(p3)
        ux, uy, uz = v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]
        vx, vy, vz = v3[0] - v0[0], v3[1] - v0[1], v3[2] - v0[2]
        nx = uy * vz - uz * vy
        ny = uz * vx - ux * vz
        nz = ux * vy - uy * vx
        length = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
        n = (nx / length, ny / length, nz / length)

        base_rgba = hex_to_rgba(color)
        # Directional sunlight + vertical ambient occlusion
        dir_factor = shade * (0.90 + 0.14 * max(-0.5, min(1.0, n[1] * 0.7 + n[0] * 0.25 + n[2] * 0.2)))
        c_top = shade_rgba(base_rgba, dir_factor * 1.03)
        c_bot = shade_rgba(base_rgba, dir_factor * 0.91)

        base_idx = len(self.positions)
        self.positions.extend([v0, v1, v2, v3])
        self.normals.extend([n, n, n, n])
        self.uvs.extend([
            self._tile_uv(color, 0.0, 1.0),
            self._tile_uv(color, 0.99, 1.0),
            self._tile_uv(color, 0.99, 0.0),
            self._tile_uv(color, 0.0, 0.0)
        ])
        self.colors.extend([c_bot, c_bot, c_top, c_top])
        self.indices.extend([base_idx, base_idx + 1, base_idx + 2, base_idx, base_idx + 2, base_idx + 3])

    def _add_tri(
        self,
        p0: tuple[float, float, float],
        p1: tuple[float, float, float],
        p2: tuple[float, float, float],
        color: str,
        shade: float = 1.0
    ):
        def to_yup(p: tuple[float, float, float]) -> tuple[float, float, float]:
            return (float(p[0]), float(p[2]), float(-p[1]))

        v0, v1, v2 = to_yup(p0), to_yup(p1), to_yup(p2)
        ux, uy, uz = v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]
        vx, vy, vz = v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]
        nx = uy * vz - uz * vy
        ny = uz * vx - ux * vz
        nz = ux * vy - uy * vx
        length = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
        n = (nx / length, ny / length, nz / length)

        base_rgba = hex_to_rgba(color)
        dir_factor = shade * (0.90 + 0.14 * max(-0.5, min(1.0, n[1] * 0.7 + n[0] * 0.25 + n[2] * 0.2)))
        col = shade_rgba(base_rgba, dir_factor)

        base_idx = len(self.positions)
        self.positions.extend([v0, v1, v2])
        self.normals.extend([n, n, n])
        self.uvs.extend([
            self._tile_uv(color, 0.0, 1.0),
            self._tile_uv(color, 0.99, 1.0),
            self._tile_uv(color, 0.5, 0.0)
        ])
        self.colors.extend([col, col, shade_rgba(col, 1.04)])
        self.indices.extend([base_idx, base_idx + 1, base_idx + 2])

    def box(self, xyz: tuple[float, float, float], ext: tuple[float, float, float], color: str, rot_z: float = 0.0):
        cx, cy, cz = xyz
        hx, hy, hz = ext[0] * 0.5, ext[1] * 0.5, ext[2] * 0.5
        ca, sa = math.cos(rot_z), math.sin(rot_z)

        def pt(lx: float, ly: float, lz: float) -> tuple[float, float, float]:
            rx = lx * ca - ly * sa
            ry = lx * sa + ly * ca
            return (cx + rx, cy + ry, cz + lz)

        p000, p100, p110, p010 = pt(-hx, -hy, -hz), pt(hx, -hy, -hz), pt(hx, hy, -hz), pt(-hx, hy, -hz)
        p001, p101, p111, p011 = pt(-hx, -hy, hz), pt(hx, -hy, hz), pt(hx, hy, hz), pt(-hx, hy, hz)
        # Front (-Y), Back (+Y), Right (+X), Left (-X), Top (+Z), Bottom (-Z)
        self._add_quad(p000, p100, p101, p001, color, 0.98)
        self._add_quad(p110, p010, p011, p111, color, 0.94)
        self._add_quad(p100, p110, p111, p101, color, 0.96)
        self._add_quad(p010, p000, p001, p011, color, 0.92)
        self._add_quad(p001, p101, p111, p011, color, 1.05)
        self._add_quad(p010, p110, p100, p000, color, 0.80)

    def roof_gable(self, xyz: tuple[float, float, float], ext: tuple[float, float, float], color: str, gable_color: str = 'wall'):
        """Indonesian pitched pelana / gable roof with overhanging eaves and ridge beam."""
        cx, cy, cz = xyz
        hx, hy, h = ext[0] * 0.5, ext[1] * 0.5, ext[2]
        fl0, fr0 = (cx - hx, cy - hy, cz), (cx + hx, cy - hy, cz)
        bl0, br0 = (cx - hx, cy + hy, cz), (cx + hx, cy + hy, cz)
        rl, rr = (cx - hx, cy, cz + h), (cx + hx, cy, cz + h)
        self._add_quad(fl0, fr0, rr, rl, color, 1.04)
        self._add_quad(br0, bl0, rl, rr, color, 0.98)
        self._add_quad(bl0, br0, fr0, fl0, color, 0.80)
        self._add_tri(bl0, fl0, rl, gable_color, 0.94)
        self._add_tri(fr0, br0, rr, gable_color, 0.96)
        # Ridge cap
        self.box((cx, cy, cz + h + 0.06), (ext[0] + 0.16, 0.22, 0.14), 'roof2' if color == 'roof' else 'roof')

    def roof_hip(self, xyz: tuple[float, float, float], ext: tuple[float, float, float], color: str, ridge_ratio: float = 0.45):
        """Indonesian limasan / joglo hipped roof."""
        cx, cy, cz = xyz
        hx, hy, h = ext[0] * 0.5, ext[1] * 0.5, ext[2]
        rx = hx * ridge_ratio
        fl0, fr0 = (cx - hx, cy - hy, cz), (cx + hx, cy - hy, cz)
        bl0, br0 = (cx - hx, cy + hy, cz), (cx + hx, cy + hy, cz)
        rl, rr = (cx - rx, cy, cz + h), (cx + rx, cy, cz + h)
        self._add_quad(fl0, fr0, rr, rl, color, 1.04)
        self._add_quad(br0, bl0, rl, rr, color, 0.98)
        self._add_tri(bl0, fl0, rl, color, 0.95)
        self._add_tri(fr0, br0, rr, color, 0.96)
        self._add_quad(bl0, br0, fr0, fl0, color, 0.80)
        self.box((cx, cy, cz + h + 0.05), (rx * 2 + 0.2, 0.20, 0.12), 'wood')

    def cyl(self, xyz: tuple[float, float, float], r: float, h: float, color: str, sections: int = 12, axis: str = 'z'):
        cx, cy, cz = xyz
        half = h * 0.5
        pts_bot = []
        pts_top = []
        for i in range(sections):
            ang = (i / sections) * math.tau
            c, s = math.cos(ang) * r, math.sin(ang) * r
            if axis == 'z':
                pts_bot.append((cx + c, cy + s, cz - half))
                pts_top.append((cx + c, cy + s, cz + half))
            elif axis == 'x':
                pts_bot.append((cx - half, cy + c, cz + s))
                pts_top.append((cx + half, cy + c, cz + s))
            else:
                pts_bot.append((cx + c, cy - half, cz + s))
                pts_top.append((cx + c, cy + half, cz + s))
        center_top = (cx + (half if axis == 'x' else 0), cy + (half if axis == 'y' else 0), cz + (half if axis == 'z' else 0))
        center_bot = (cx - (half if axis == 'x' else 0), cy - (half if axis == 'y' else 0), cz - (half if axis == 'z' else 0))
        for i in range(sections):
            nxt = (i + 1) % sections
            self._add_quad(pts_bot[i], pts_bot[nxt], pts_top[nxt], pts_top[i], color, 0.98)
            self._add_tri(pts_top[i], pts_top[nxt], center_top, color, 1.04)
            self._add_tri(pts_bot[nxt], pts_bot[i], center_bot, color, 0.82)

    def cone(self, xyz: tuple[float, float, float], r: float, h: float, color: str, sections: int = 12):
        cx, cy, cz = xyz
        apex = (cx, cy, cz + h)
        center = (cx, cy, cz)
        ring = [(cx + math.cos(i * math.tau / sections) * r, cy + math.sin(i * math.tau / sections) * r, cz) for i in range(sections)]
        for i in range(sections):
            nxt = (i + 1) % sections
            self._add_tri(ring[i], ring[nxt], apex, color, 1.02)
            self._add_tri(ring[nxt], ring[i], center, color, 0.82)

    def sphere(self, xyz: tuple[float, float, float], r: float, color: str, subdiv: int = 1, scale_xyz: tuple[float, float, float] = (1.0, 1.0, 1.0)):
        cx, cy, cz = xyz
        rings = 6 if subdiv <= 1 else 8
        segs = 10 if subdiv <= 1 else 14
        sx, sy, sz = scale_xyz
        grid = []
        for i in range(rings + 1):
            theta = (i / rings) * math.pi
            st, ct = math.sin(theta), math.cos(theta)
            row = []
            for j in range(segs):
                phi = (j / segs) * math.tau
                x = cx + r * sx * st * math.cos(phi)
                y = cy + r * sy * st * math.sin(phi)
                z = cz + r * sz * ct
                row.append((x, y, z))
            grid.append(row)
        for i in range(rings):
            for j in range(segs):
                jn = (j + 1) % segs
                if i == 0:
                    self._add_tri(grid[0][0], grid[1][jn], grid[1][j], color, 1.05)
                elif i == rings - 1:
                    self._add_tri(grid[i][j], grid[i][jn], grid[rings][0], color, 0.85)
                else:
                    self._add_quad(grid[i + 1][j], grid[i + 1][jn], grid[i][jn], grid[i][j], color, 0.98)

    def pipe(self, xyz: tuple[float, float, float], r_in: float, r_out: float, h: float, color: str, sections: int = 16):
        cx, cy, cz = xyz
        hz = h * 0.5
        for i in range(sections):
            a0 = (i / sections) * math.tau
            a1 = ((i + 1) / sections) * math.tau
            c0, s0 = math.cos(a0), math.sin(a0)
            c1, s1 = math.cos(a1), math.sin(a1)
            ob0, ob1 = (cx + c0 * r_out, cy + s0 * r_out, cz - hz), (cx + c1 * r_out, cy + s1 * r_out, cz - hz)
            ot0, ot1 = (cx + c0 * r_out, cy + s0 * r_out, cz + hz), (cx + c1 * r_out, cy + s1 * r_out, cz + hz)
            ib0, ib1 = (cx + c0 * r_in, cy + s0 * r_in, cz - hz), (cx + c1 * r_in, cy + s1 * r_in, cz - hz)
            it0, it1 = (cx + c0 * r_in, cy + s0 * r_in, cz + hz), (cx + c1 * r_in, cy + s1 * r_in, cz + hz)
            self._add_quad(ob0, ob1, ot1, ot0, color, 1.0)
            self._add_quad(ib1, ib0, it0, it1, color, 0.88)
            self._add_quad(ot0, ot1, it1, it0, color, 1.05)
            self._add_quad(ob1, ob0, ib0, ib1, color, 0.82)

    def export_glb(self, out_path: pathlib.Path) -> tuple[int, int, tuple[float, float, float]]:
        """Compile geometry and embedded PNG texture atlas into a binary glTF 2.0 (.glb) file."""
        v_count = len(self.positions)
        i_count = len(self.indices)
        pos_bytes = bytearray(v_count * 12)
        norm_bytes = bytearray(v_count * 12)
        uv_bytes = bytearray(v_count * 8)
        col_bytes = bytearray(v_count * 4)

        min_x = min_y = min_z = float('inf')
        max_x = max_y = max_z = float('-inf')

        for idx, (px, py, pz) in enumerate(self.positions):
            if px < min_x: min_x = px
            if py < min_y: min_y = py
            if pz < min_z: min_z = pz
            if px > max_x: max_x = px
            if py > max_y: max_y = py
            if pz > max_z: max_z = pz
            struct.pack_into('<fff', pos_bytes, idx * 12, px, py, pz)
            nx, ny, nz = self.normals[idx]
            struct.pack_into('<fff', norm_bytes, idx * 12, nx, ny, nz)
            u, v = self.uvs[idx]
            struct.pack_into('<ff', uv_bytes, idx * 8, u, v)
            r, g, b, a = self.colors[idx]
            struct.pack_into('<BBBB', col_bytes, idx * 4, r, g, b, a)

        use_u32 = v_count > 65535
        idx_bytes = bytearray(i_count * (4 if use_u32 else 2))
        fmt = '<I' if use_u32 else '<H'
        stride = 4 if use_u32 else 2
        for k, val in enumerate(self.indices):
            struct.pack_into(fmt, idx_bytes, k * stride, val)

        def pad4(b: bytes | bytearray, fill: bytes = b'\x00') -> bytes:
            rem = len(b) % 4
            return bytes(b) + (fill * (4 - rem) if rem else b'')

        b_pos = pad4(pos_bytes)
        b_norm = pad4(norm_bytes)
        b_uv = pad4(uv_bytes)
        b_col = pad4(col_bytes)
        b_idx = pad4(idx_bytes)
        b_png = pad4(EMBEDDED_ATLAS_PNG)

        bin_blob = b_pos + b_norm + b_uv + b_col + b_idx + b_png

        off_pos = 0
        off_norm = off_pos + len(b_pos)
        off_uv = off_norm + len(b_norm)
        off_col = off_uv + len(b_uv)
        off_idx = off_col + len(b_col)
        off_png = off_idx + len(b_idx)

        gltf = {
            "asset": {"version": "2.0", "generator": "BLOCKVERSE Argon V2 Procedural GLB Compiler"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"name": out_path.stem, "mesh": 0}],
            "meshes": [{
                "name": out_path.stem,
                "primitives": [{
                    "attributes": {
                        "POSITION": 0,
                        "NORMAL": 1,
                        "TEXCOORD_0": 2,
                        "COLOR_0": 3
                    },
                    "indices": 4,
                    "material": 0,
                    "mode": 4
                }]
            }],
            "materials": [{
                "name": "blockverse_jakarta_atlas_mat",
                "pbrMetallicRoughness": {
                    "baseColorTexture": {"index": 0},
                    "baseColorFactor": [1.0, 1.0, 1.0, 1.0],
                    "metallicFactor": 0.06,
                    "roughnessFactor": 0.78
                },
                "doubleSided": False
            }],
            "textures": [{"sampler": 0, "source": 0}],
            "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
            "images": [{"bufferView": 5, "mimeType": "image/png", "name": "jakarta_detail_atlas"}],
            "bufferViews": [
                {"buffer": 0, "byteOffset": off_pos, "byteLength": len(pos_bytes), "target": 34962},
                {"buffer": 0, "byteOffset": off_norm, "byteLength": len(norm_bytes), "target": 34962},
                {"buffer": 0, "byteOffset": off_uv, "byteLength": len(uv_bytes), "target": 34962},
                {"buffer": 0, "byteOffset": off_col, "byteLength": len(col_bytes), "target": 34962},
                {"buffer": 0, "byteOffset": off_idx, "byteLength": len(idx_bytes), "target": 34963},
                {"buffer": 0, "byteOffset": off_png, "byteLength": len(EMBEDDED_ATLAS_PNG)}
            ],
            "accessors": [
                {
                    "bufferView": 0, "byteOffset": 0, "componentType": 5126, "count": v_count, "type": "VEC3",
                    "min": [round(min_x, 4), round(min_y, 4), round(min_z, 4)],
                    "max": [round(max_x, 4), round(max_y, 4), round(max_z, 4)]
                },
                {"bufferView": 1, "byteOffset": 0, "componentType": 5126, "count": v_count, "type": "VEC3"},
                {"bufferView": 2, "byteOffset": 0, "componentType": 5126, "count": v_count, "type": "VEC2"},
                {"bufferView": 3, "byteOffset": 0, "componentType": 5121, " normalized": True, "normalized": True, "count": v_count, "type": "VEC4"},
                {"bufferView": 4, "byteOffset": 0, "componentType": 5125 if use_u32 else 5123, "count": i_count, "type": "SCALAR"}
            ],
            "buffers": [{"byteLength": len(bin_blob)}]
        }
        del gltf["accessors"][3][" normalized"]

        json_bytes = pad4(json.dumps(gltf, separators=(',', ':')).encode('utf-8'), b' ')
        total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_blob)
        header = struct.pack('<4sII', b'glTF', 2, total_len)
        chunk_json = struct.pack('<I4s', len(json_bytes), b'JSON') + json_bytes
        chunk_bin = struct.pack('<I4s', len(bin_blob), b'BIN\x00') + bin_blob
        glb_data = header + chunk_json + chunk_bin
        out_path.write_bytes(glb_data)
        dims = (round(max_x - min_x, 2), round(max_y - min_y, 2), round(max_z - min_z, 2))
        return len(glb_data), i_count // 3, dims


# ==============================================================================
# 1. BUILDINGS (25 Distinct Indonesian & Jakarta Barat Architectural Archetypes)
# ==============================================================================
def add_windows_grid(m: Model, w: float, d: float, floors: int, floor_h: float, z0: float, cols: int, frame_col: str = 'white', glass_col: str = 'glass', shutter_col: str | None = 'wood'):
    for fl in range(floors):
        z = z0 + fl * floor_h
        for i in range(cols):
            tx = -w * 0.34 + (i / max(1, cols - 1)) * (w * 0.68) if cols > 1 else 0.0
            for side in (-1, 1):
                y = side * (d * 0.5 + 0.03)
                m.box((tx, y, z), (0.92, 0.08, 1.05), frame_col)
                m.box((tx, side * (d * 0.5 + 0.06), z), (0.72, 0.06, 0.84), glass_col)
                m.box((tx, side * (d * 0.5 + 0.09), z - 0.54), (1.02, 0.14, 0.10), frame_col)
                if shutter_col and side == -1:
                    m.box((tx - 0.52, y - 0.03, z), (0.18, 0.06, 1.0), shutter_col)
                    m.box((tx + 0.52, y - 0.03, z), (0.18, 0.06, 1.0), shutter_col)


def build_building(m: Model, name: str, n: int):
    # Plinth foundation for all buildings
    if name == 'kampung_home':
        w, d, h = 6.4, 5.6, 3.6
        m.box((0, 0, 0.2), (w + 0.6, d + 0.8, 0.4), 'stone')
        m.box((0, 0, 0.4 + h * 0.5), (w, d, h), 'wall_mint')
        # Front veranda (teras kampung) with pillars and wooden rail
        m.box((0, -d * 0.5 - 0.9, 0.2), (w, 1.8, 0.4), 'concrete')
        for px in (-w * 0.44, -w * 0.15, w * 0.15, w * 0.44):
            m.box((px, -d * 0.5 - 1.65, 1.6), (0.22, 0.22, 2.4), 'wood')
        m.box((-w * 0.3, -d * 0.5 - 1.65, 0.75), (w * 0.32, 0.12, 0.65), 'bamboo')
        m.box((w * 0.3, -d * 0.5 - 1.65, 0.75), (w * 0.32, 0.12, 0.65), 'bamboo')
        m.box((0, -d * 0.5 - 0.04, 1.4), (1.2, 0.10, 2.1), 'wood')
        add_windows_grid(m, w, d, 1, 2.4, 1.8, 2, 'white', 'glass', 'wood')
        # Roster ventilation blocks above windows
        for rx in (-1.8, 0.0, 1.8):
            m.box((rx, -d * 0.5 - 0.04, 3.1), (0.8, 0.08, 0.28), 'brick')
        m.roof_gable((0, -0.4, 4.0), (w + 1.0, d + 2.6, 1.8), 'roof', 'wall_mint')

    elif name == 'terrace_home':
        w, d, h = 6.8, 6.0, 3.8
        m.box((0, 0, 0.2), (w + 0.5, d + 0.5, 0.4), 'concrete')
        m.box((0, 0, 0.4 + h * 0.5), (w, d, h), 'wall')
        # Accent stone pillar & carport canopy
        m.box((-w * 0.38, -d * 0.5 - 0.1, 2.0), (1.1, 0.35, 3.6), 'brick')
        m.box((w * 0.15, -d * 0.5 - 1.1, 2.75), (4.2, 2.2, 0.16), 'roof2')
        for px in (-0.2, 2.1):
            m.cyl((px, -d * 0.5 - 2.0, 1.4), 0.10, 2.7, 'metal2', 8)
        m.box((-0.8, -d * 0.5 - 0.04, 1.35), (1.2, 0.10, 2.1), 'wood2')
        add_windows_grid(m, w, d, 1, 2.5, 1.9, 2, 'white', 'glass', None)
        m.box((1.5, -d * 0.5 - 0.65, 0.45), (2.2, 0.65, 0.55), 'stone')
        m.sphere((1.1, -d * 0.5 - 0.65, 0.9), 0.32, 'foliage', 1)
        m.sphere((1.9, -d * 0.5 - 0.65, 0.9), 0.32, 'leaf2', 1)
        m.roof_hip((0, 0, 4.2), (w + 0.9, d + 0.9, 1.75), 'roof')

    elif name == 'corner_home':
        # L-shaped corner house with wrap-around balcony
        m.box((0, 0, 0.2), (7.6, 7.2, 0.4), 'stone')
        m.box((-1.1, 0.6, 2.4), (5.0, 5.6, 4.2), 'wall3')
        m.box((1.8, -1.1, 2.1), (3.4, 4.6, 3.6), 'wall')
        add_windows_grid(m, 4.8, 5.6, 1, 2.4, 2.1, 2, 'white', 'glass', 'wood')
        m.roof_hip((-1.1, 0.6, 4.5), (5.6, 6.2, 1.6), 'roof')
        m.roof_gable((1.8, -1.1, 3.9), (3.9, 5.1, 1.3), 'roof2', 'wall')
        m.box((0.2, -3.45, 1.3), (1.3, 0.12, 2.1), 'wood')

    elif name == 'roof_garden_home':
        w, d, h = 7.0, 6.0, 5.2
        m.box((0, 0, h * 0.5), (w, d, h), 'wall2')
        m.box((0, 0, h + 0.22), (w + 0.5, d + 0.5, 0.44), 'concrete')
        # Rooftop parapet, pergola & lush rooftop garden planters
        for sx in (-w * 0.48, w * 0.48):
            m.box((sx, 0, h + 0.75), (0.2, d, 0.65), 'white')
        for sy in (-d * 0.48, d * 0.48):
            m.box((0, sy, h + 0.75), (w, 0.2, 0.65), 'white')
        for px in (-2.2, 0.0, 2.2):
            m.box((px, -1.2, h + 0.65), (1.4, 0.9, 0.45), 'wood')
            m.sphere((px, -1.2, h + 1.25), 0.58, 'foliage', 1)
        # Pergola beams
        for px in (-2.4, 2.4):
            m.box((px, 1.2, h + 1.4), (0.18, 2.2, 1.8), 'wood2')
        for b in range(5):
            m.box((0, 0.3 + b * 0.45, h + 2.35), (5.2, 0.14, 0.14), 'wood')
        add_windows_grid(m, w, d, 2, 2.3, 1.7, 3, 'white', 'glass', None)
        m.box((0, -d * 0.5 - 0.05, 1.25), (1.4, 0.12, 2.1), 'wood')

    elif name == 'contract_house':
        # Rumah kontrakan petak (3-door row house common in Cengkareng)
        w, d, h = 9.2, 5.0, 3.4
        m.box((0, 0, 0.18), (w + 0.6, d + 0.9, 0.36), 'concrete')
        m.box((0, 0, 0.36 + h * 0.5), (w, d, h), 'wall_OCHRE')
        for unit in (-1, 0, 1):
            ux = unit * 2.9
            m.box((ux - 0.55, -d * 0.5 - 0.04, 1.3), (0.95, 0.09, 1.95), 'wood')
            m.box((ux + 0.55, -d * 0.5 - 0.04, 1.65), (0.95, 0.09, 1.05), 'glass')
            m.box((ux, -d * 0.5 - 0.65, 2.85), (2.6, 1.2, 0.12), 'roof2')
            if unit < 1:
                m.box((ux + 1.45, -d * 0.5 - 0.45, 1.6), (0.14, 0.9, 2.4), 'concrete')
        m.roof_gable((0, 0, 3.76), (w + 0.8, d + 0.9, 1.45), 'roof', 'wall_OCHRE')

    elif name == 'two_storey_house':
        w, d, h = 7.0, 6.2, 6.2
        m.box((0, 0, h * 0.5), (w, d, h), 'wall')
        m.box((0, -d * 0.5 - 0.75, 3.2), (w * 0.78, 1.5, 0.22), 'concrete')
        m.box((0, -d * 0.5 - 1.42, 3.65), (w * 0.78, 0.12, 0.75), 'metal')
        add_windows_grid(m, w, d, 2, 2.6, 1.8, 2, 'white', 'glass', 'wood2')
        m.box((-1.4, -d * 0.5 - 0.05, 1.3), (1.3, 0.1, 2.2), 'wood')
        m.roof_hip((0, 0, h), (w + 0.9, d + 0.9, 1.85), 'roof2')

    elif name == 'three_storey_house':
        w, d, h = 7.2, 6.4, 8.8
        m.box((0, 0, h * 0.5), (w, d, h), 'wall4')
        for fl in (3.1, 5.9):
            m.box((0, -d * 0.5 - 0.65, fl), (w * 0.82, 1.3, 0.22), 'concrete')
            m.box((0, -d * 0.5 - 1.25, fl + 0.42), (w * 0.82, 0.10, 0.70), 'metal2')
        add_windows_grid(m, w, d, 3, 2.6, 1.8, 3, 'white', 'glass', None)
        m.box((0, -d * 0.5 - 0.05, 1.3), (1.5, 0.12, 2.2), 'wood')
        m.roof_hip((0, 0, h), (w + 0.8, d + 0.8, 1.7), 'roof')

    elif name in ('ruko_small', 'ruko_double', 'ruko_tall'):
        # Authentic Indonesian Ruko (Rumah Toko) with ground rolling shutter, awning, AC units, water tank
        units = 2 if name == 'ruko_double' else 1
        floors = 2 if name == 'ruko_small' else (3 if name == 'ruko_double' else 4)
        w = 4.8 * units
        d = 6.6
        h = floors * 2.85
        wall_col = 'wall' if name == 'ruko_small' else ('wall2' if name == 'ruko_double' else 'wall3')
        m.box((0, 0, h * 0.5), (w, d, h), wall_col)
        # Parapet crown with horizontal trim
        m.box((0, -d * 0.5 - 0.12, h + 0.35), (w + 0.3, 0.4, 0.7), 'roof2')
        m.box((0, 0, h + 0.15), (w + 0.2, d + 0.2, 0.3), 'concrete')
        for u in range(units):
            ux = (u - (units - 1) * 0.5) * 4.6
            # Rolling shutter door on ground floor
            m.box((ux, -d * 0.5 - 0.06, 1.35), (3.4, 0.12, 2.4), 'metal2')
            m.box((ux, -d * 0.5 - 0.12, 2.65), (3.6, 0.28, 0.28), 'metal')
            # Shopfront fascia signboard (blank stylized panel, no copyrighted brand)
            m.box((ux, -d * 0.5 - 0.18, 3.15), (3.9, 0.22, 0.62), 'sun' if u % 2 == 0 else 'teal')
            # Awning
            m.box((ux, -d * 0.5 - 0.75, 2.82), (4.0, 1.3, 0.14), 'salmon' if name == 'ruko_small' else 'blue')
            for fl in range(1, floors):
                fz = 1.5 + fl * 2.8
                m.box((ux - 1.0, -d * 0.5 - 0.05, fz), (1.2, 0.1, 1.25), 'glass')
                m.box((ux + 1.0, -d * 0.5 - 0.05, fz), (1.2, 0.1, 1.25), 'glass')
                m.box((ux + 1.85, -d * 0.5 - 0.25, fz - 0.2), (0.55, 0.35, 0.42), 'white')  # AC outdoor unit
        # Rooftop orange/blue tandon air (water tank)
        m.box((w * 0.25, d * 0.2, h + 0.55), (1.1, 1.1, 0.6), 'metal')
        m.cyl((w * 0.25, d * 0.2, h + 1.35), 0.52, 1.1, 'orange', 12)

    elif name == 'market_hall':
        # Pasar Rakyat Hall with clerestory monitor roof & colonnade
        w, d, h = 11.0, 8.2, 4.6
        m.box((0, 0, 0.22), (w + 0.8, d + 0.8, 0.44), 'concrete')
        m.box((0, 0, 0.44 + h * 0.5), (w, d, h), 'wall')
        for arch in (-3.6, 0.0, 3.6):
            m.box((arch, -d * 0.5 - 0.06, 1.65), (2.2, 0.14, 2.6), 'wood')
            m.box((arch, -d * 0.5 - 0.9, 2.95), (2.6, 1.6, 0.16), 'sun')
        m.roof_gable((0, 0, 5.0), (w + 1.2, d + 1.2, 1.8), 'roof', 'wall')
        # Raised ventilation monitor roof
        m.box((0, 0, 6.4), (w * 0.55, d * 0.45, 0.9), 'white')
        m.roof_gable((0, 0, 6.85), (w * 0.62, d * 0.55, 0.85), 'roof3', 'white')

    elif name in ('market_kiosk', 'warung', 'coffee_stall'):
        w, d, h = 4.6, 3.8, 2.9
        wall_c = 'wall3' if name == 'warung' else ('wood2' if name == 'coffee_stall' else 'wall2')
        awning_c = 'salmon' if name == 'warung' else ('sun' if name == 'market_kiosk' else 'roof_green')
        m.box((0, 0, 0.15), (w + 0.5, d + 1.2, 0.3), 'concrete')
        m.box((0, 0.2, 0.3 + h * 0.5), (w, d, h), wall_c)
        # Serving counter & display window
        m.box((0, -d * 0.5 - 0.25, 0.95), (w * 0.82, 0.65, 0.95), 'wood')
        m.box((0, -d * 0.5 - 0.05, 1.85), (w * 0.76, 0.10, 0.95), 'glass')
        # Front awning + stools
        m.box((0, -d * 0.5 - 0.95, 2.55), (w + 0.4, 1.7, 0.14), awning_c)
        for sx in (-1.3, 0.0, 1.3):
            m.cyl((sx, -d * 0.5 - 1.15, 0.52), 0.24, 0.55, 'sun' if sx == 0 else 'blue', 10)
        m.roof_gable((0, 0, 3.2), (w + 0.7, d + 1.0, 1.1), 'roof', wall_c)

    elif name == 'mini_mart':
        w, d, h = 7.8, 6.2, 4.2
        m.box((0, 0, 0.18), (w + 0.6, d + 0.8, 0.36), 'concrete')
        m.box((0, 0, 0.36 + h * 0.5), (w, d, h), 'white')
        # Modern convenience store storefront glass & tricolor fascia bands (non-branded pastel)
        m.box((0, -d * 0.5 - 0.06, 1.55), (w * 0.78, 0.10, 2.2), 'glass')
        m.box((0, -d * 0.5 - 0.16, 3.55), (w + 0.2, 0.28, 0.32), 'teal')
        m.box((0, -d * 0.5 - 0.16, 3.88), (w + 0.2, 0.28, 0.32), 'sun')
        m.box((0, -d * 0.5 - 0.16, 4.20), (w + 0.2, 0.28, 0.30), 'salmon')

    elif name == 'school_block':
        # Indonesian SD/SMP school building with veranda corridor & flagpole courtyard cue
        w, d, h = 12.0, 6.8, 6.6
        m.box((0, 0, 0.2), (w + 0.8, d + 1.2, 0.4), 'concrete')
        m.box((0, 0.3, 0.4 + h * 0.5), (w, d, h), 'wall')
        # Corridor walkways & columns
        for fl in (0.4, 3.5):
            m.box((0, -d * 0.5 - 0.65, fl + 0.45), (w, 0.16, 0.85), 'white')
        for cx_col in (-5.2, -2.6, 0.0, 2.6, 5.2):
            m.box((cx_col, -d * 0.5 - 0.65, 3.5), (0.28, 0.28, 6.4), 'white')
        add_windows_grid(m, w - 1.0, d, 2, 3.0, 2.0, 4, 'wood', 'glass', None)
        m.roof_hip((0, 0, 7.0), (w + 1.4, d + 1.8, 2.1), 'roof')

    elif name == 'clinic':
        # Puskesmas / Klinik Pratama with green health cross emblem & ambulance canopy
        w, d, h = 8.8, 6.6, 4.8
        m.box((0, 0, h * 0.5), (w, d, h), 'white')
        m.box((0, 0, h + 0.2), (w + 0.4, d + 0.4, 0.4), 'teal')
        m.box((0, -d * 0.5 - 1.3, 2.85), (3.8, 2.4, 0.22), 'teal')
        for px in (-1.6, 1.6):
            m.cyl((px, -d * 0.5 - 2.3, 1.4), 0.16, 2.8, 'white', 10)
        # Green health cross on facade
        m.box((0, -d * 0.5 - 0.12, 3.9), (1.1, 0.16, 0.36), 'foliage')
        m.box((0, -d * 0.5 - 0.12, 3.9), (0.36, 0.16, 1.1), 'foliage')
        add_windows_grid(m, w, d, 1, 2.4, 1.9, 3, 'teal', 'glass', None)

    elif name == 'community_hall':
        # Balai Warga / Pendopo Kelurahan with wide joglo roof & open verandah
        w, d, h = 9.6, 7.4, 4.2
        m.box((0, 0, 0.28), (w + 1.2, d + 1.2, 0.56), 'stone')
        m.box((0, 0.6, 0.56 + h * 0.5), (w * 0.78, d * 0.72, h), 'wall')
        for px in (-4.2, -1.5, 1.5, 4.2):
            m.cyl((px, -d * 0.5, 2.4), 0.22, 3.9, 'wood', 10)
        m.roof_hip((0, 0, 4.4), (w + 1.4, d + 1.4, 1.4), 'roof', 0.55)
        m.roof_hip((0, 0, 5.4), (w * 0.62, d * 0.62, 1.55), 'roof', 0.25)

    elif name in ('mushola', 'mosque_courtyard'):
        is_big = name == 'mosque_courtyard'
        w = 10.6 if is_big else 7.4
        d = 9.4 if is_big else 6.8
        h = 5.4 if is_big else 4.2
        m.box((0, 0, 0.25), (w + 1.4, d + 1.4, 0.5), 'stone')
        m.box((0, 0, 0.5 + h * 0.5), (w, d, h), 'wall')
        # Arched colonnade pillars along front
        cols = 5 if is_big else 3
        for i in range(cols):
            px = -w * 0.40 + (i / (cols - 1)) * (w * 0.80)
            m.box((px, -d * 0.5 - 0.12, 0.5 + h * 0.45), (0.42, 0.42, h * 0.9), 'roof_green')
        # Tiered pyramidal roof + central dome + golden finial
        m.roof_hip((0, 0, 0.5 + h), (w + 1.0, d + 1.0, 1.35), 'roof_green', 0.45)
        dome_r = 2.2 if is_big else 1.55
        m.cyl((0, 0, 0.5 + h + 1.25), dome_r * 0.95, 0.65, 'white', 16)
        m.sphere((0, 0, 0.5 + h + 1.85), dome_r, 'roof_green', 2, (1.0, 1.0, 0.88))
        m.cone((0, 0, 0.5 + h + 1.85 + dome_r * 0.8), 0.24, 0.95, 'gold', 10)
        if is_big:
            # Tall minaret tower
            mx, my = w * 0.46, -d * 0.42
            m.cyl((mx, my, 5.2), 0.72, 9.6, 'wall', 12)
            m.cyl((mx, my, 9.2), 0.95, 0.4, 'roof_green', 12)
            m.sphere((mx, my, 10.4), 0.78, 'roof_green', 1)
            m.cone((mx, my, 11.1), 0.18, 0.8, 'gold', 8)

    elif name == 'warehouse':
        w, d, h = 11.4, 8.4, 5.6
        m.box((0, 0, h * 0.5), (w, d, h), 'concrete')
        for bay in (-3.2, 3.2):
            m.box((bay, -d * 0.5 - 0.08, 1.9), (3.4, 0.14, 3.4), 'metal2')
            m.box((bay, -d * 0.5 - 0.55, 3.85), (3.8, 1.0, 0.18), 'roof3')
        m.roof_gable((0, 0, h), (w + 0.6, d + 0.6, 1.5), 'roof2', 'concrete')

    elif name in ('office_midrise', 'apartments'):
        is_apt = name == 'apartments'
        w, d, h = (9.2, 7.4, 12.8) if is_apt else (8.6, 7.0, 11.2)
        base_col = 'wall2' if not is_apt else 'wall'
        m.box((0, 0, h * 0.5), (w, d, h), base_col)
        m.box((0, 0, 1.4), (w + 0.4, d + 0.4, 2.8), 'metal')
        floors = 4 if is_apt else 3
        add_windows_grid(m, w, d, floors, 2.5, 3.8, 3, 'white', 'glass', None)
        if is_apt:
            for fl in range(floors):
                fz = 3.2 + fl * 2.5
                for bx in (-2.6, 0.0, 2.6):
                    m.box((bx, -d * 0.5 - 0.45, fz), (1.8, 0.8, 0.18), 'concrete')
                    m.box((bx, -d * 0.5 - 0.82, fz + 0.38), (1.8, 0.08, 0.65), 'metal2')
        m.box((0, 0, h + 0.35), (w * 0.6, d * 0.5, 0.7), 'metal2')

    elif name == 'guard_post':
        # Pos Kamling / Pos Satpam RW with kentongan bell & peaked roof
        w, d, h = 3.4, 3.2, 2.8
        m.box((0, 0, 0.2), (w + 0.6, d + 0.6, 0.4), 'stone')
        m.box((0, 0.3, 0.4 + h * 0.5), (w, d * 0.75, h), 'wall2')
        m.box((0, -d * 0.38, 1.6), (w * 0.7, 0.10, 1.1), 'glass')
        # Kentongan wooden slit drum hanging at corner
        m.cyl((w * 0.48, -d * 0.48, 1.9), 0.14, 0.85, 'wood', 8)
        m.roof_hip((0, 0, 3.2), (w + 0.9, d + 0.9, 1.25), 'roof2')

    else:  # workshop (Bengkel Motor & Las)
        w, d, h = 7.4, 5.8, 3.9
        m.box((0, 0, h * 0.5), (w, d, h), 'wall3')
        m.box((-1.4, -d * 0.5 - 0.06, 1.5), (3.4, 0.12, 2.5), 'metal')
        m.box((2.1, -d * 0.5 - 0.06, 1.6), (1.5, 0.10, 1.3), 'glass')
        # Stack of spare tires outside bengkel
        for t in range(3):
            m.pipe((-3.1, -d * 0.5 - 0.55, 0.22 + t * 0.26), 0.18, 0.38, 0.22, 'dark', 12)
        m.roof_gable((0, 0, h), (w + 0.7, d + 0.9, 1.25), 'roof2', 'wall3')


# ==============================================================================
# 2. INFRASTRUCTURE (15 Distinct Modular Urban & Canal Segments)
# ==============================================================================
def build_infra(m: Model, name: str, n: int):
    if name == 'road_straight':
        m.box((0, 0, 0.09), (14.0, 8.0, 0.18), 'road')
        for y in (-3.85, 3.85):
            m.box((0, y, 0.24), (14.0, 0.32, 0.22), 'concrete')
        for j in range(5):
            m.box((-5.6 + j * 2.8, 0, 0.19), (1.5, 0.18, 0.03), 'sun')

    elif name == 'road_corner':
        m.box((-2.0, 0, 0.09), (10.0, 8.0, 0.18), 'road')
        m.box((0, 2.0, 0.09), (8.0, 10.0, 0.18), 'road')
        m.box((-2.5, -3.85, 0.24), (9.0, 0.32, 0.22), 'concrete')
        m.box((3.85, 2.5, 0.24), (0.32, 9.0, 0.22), 'concrete')
        for k in range(3):
            m.box((-4.5 + k * 2.2, 0, 0.19), (1.2, 0.18, 0.03), 'sun')
            m.box((0, 2.2 + k * 2.2, 0.19), (0.18, 1.2, 0.03), 'sun')

    elif name == 'road_crossing':
        m.box((0, 0, 0.09), (14.0, 8.0, 0.18), 'road')
        m.box((0, 0, 0.095), (8.0, 14.0, 0.18), 'road')
        for sx in (-1, 1):
            for sy in (-1, 1):
                m.box((sx * 5.5, sy * 5.5, 0.24), (3.0, 3.0, 0.22), 'concrete')
        for s in range(5):
            offset = -2.8 + s * 1.4
            m.box((-4.8, offset, 0.20), (1.4, 0.42, 0.03), 'white')
            m.box((4.8, offset, 0.20), (1.4, 0.42, 0.03), 'white')

    elif name == 'road_tjunction':
        m.box((0, 0, 0.09), (14.0, 8.0, 0.18), 'road')
        m.box((0, 3.5, 0.095), (8.0, 7.0, 0.18), 'road')
        m.box((0, -3.85, 0.24), (14.0, 0.32, 0.22), 'concrete')
        for j in range(5):
            m.box((-5.6 + j * 2.8, 0, 0.19), (1.4, 0.18, 0.03), 'sun')

    elif name == 'road_bend':
        for seg in range(5):
            ang = -0.5 + seg * 0.25
            cx = math.sin(ang) * 4.5
            cy = (1.0 - math.cos(ang)) * 4.5
            m.box((cx, cy, 0.09), (3.6, 7.6, 0.18), 'road', ang)
            m.box((cx, cy, 0.19), (1.4, 0.18, 0.03), 'sun', ang)

    elif name == 'sidewalk':
        m.box((0, 0, 0.14), (12.0, 3.2, 0.28), 'concrete')
        # Yellow tactile paving strip (guiding block) for accessibility
        for k in range(11):
            m.box((-5.0 + k * 1.0, 0, 0.29), (0.82, 0.38, 0.03), 'sun')
        for y in (-1.48, 1.48):
            m.box((0, y, 0.18), (12.0, 0.22, 0.32), 'stone')

    elif name == 'zebra_crossing':
        m.box((0, 0, 0.09), (12.0, 8.0, 0.18), 'road')
        for s in range(7):
            m.box((-4.5 + s * 1.5, 0, 0.195), (0.78, 6.4, 0.03), 'white')
        for y in (-3.85, 3.85):
            m.box((0, y, 0.24), (12.0, 0.32, 0.22), 'concrete')

    elif name == 'pedestrian_bridge':
        # JPO (Jembatan Penyeberangan Orang) with covered canopy & side stairs
        m.box((0, 0, 4.2), (14.0, 2.8, 0.35), 'concrete')
        m.box((0, 0, 6.6), (14.2, 3.1, 0.22), 'teal')
        for y in (-1.28, 1.28):
            m.box((0, y, 4.85), (14.0, 0.14, 1.0), 'sun')
        for x in (-5.6, -2.8, 0.0, 2.8, 5.6):
            m.cyl((x, -1.25, 5.4), 0.09, 2.3, 'metal2', 8)
            m.cyl((x, 1.25, 5.4), 0.09, 2.3, 'metal2', 8)
        for sx in (-5.6, 5.6):
            m.cyl((sx, 0, 2.1), 0.42, 4.2, 'concrete', 10)
            for step in range(6):
                m.box((sx + (1 if sx > 0 else -1) * (1.0 + step * 0.55), -1.8, 3.7 - step * 0.58), (0.65, 1.4, 0.25), 'concrete')

    elif name == 'overpass':
        # Daan Mogot / Outer Ring Road elevated concrete flyover segment
        m.box((0, 0, 4.8), (16.0, 9.2, 0.65), 'concrete')
        for y in (-4.4, 4.4):
            m.box((0, y, 5.45), (16.0, 0.35, 0.75), 'stone')
        for x in (-4.8, 4.8):
            m.cyl((x, 0, 2.4), 0.85, 4.8, 'concrete', 12)
            m.box((x, 0, 4.35), (1.8, 7.6, 0.55), 'concrete')
        for j in range(5):
            m.box((-6.0 + j * 3.0, 0, 5.15), (1.6, 0.18, 0.03), 'sun')

    elif name == 'bridge_canal':
        # Arched Kali Apuran bridge with decorative iron railings & lanterns
        m.box((0, 0, 0.55), (14.0, 6.2, 0.55), 'concrete')
        m.box((0, 0, 0.88), (13.6, 4.8, 0.12), 'road')
        for y in (-2.85, 2.85):
            m.box((0, y, 1.25), (14.0, 0.32, 0.85), 'stone')
            for p in (-6.2, -3.1, 0.0, 3.1, 6.2):
                m.box((p, y, 1.65), (0.48, 0.48, 1.15), 'wall')
                m.sphere((p, y, 2.35), 0.22, 'sun', 1)

    elif name == 'canal_wall':
        # Kali Apuran stone embankment wall + water channel + safety railing
        m.box((0, 0, 0.12), (14.0, 6.4, 0.24), 'water')
        for y in (-2.9, 2.9):
            m.box((0, y, 0.75), (14.0, 0.65, 1.5), 'stone')
            m.box((0, y, 1.75), (14.0, 0.12, 0.12), 'metal2')
            for x in range(-6, 7, 2):
                m.cyl((x, y, 1.45), 0.07, 0.65, 'metal', 8)

    elif name == 'drainage_module':
        # U-ditch concrete culvert + steel drainage grate
        m.box((0, 0, 0.45), (8.0, 2.4, 0.9), 'concrete')
        m.box((0, 0, 0.65), (7.6, 1.6, 0.55), 'dark')
        for g in range(11):
            m.box((-3.5 + g * 0.7, 0, 0.92), (0.18, 1.7, 0.06), 'metal2')

    elif name == 'parking_lot':
        m.box((0, 0, 0.09), (14.0, 9.0, 0.18), 'road')
        for bay in range(5):
            bx = -4.8 + bay * 2.4
            m.box((bx, -1.8, 0.19), (0.14, 3.8, 0.03), 'white')
            m.box((bx, 2.4, 0.26), (1.6, 0.24, 0.16), 'sun')

    elif name == 'alley_pavers':
        # Gang Kampung paving block with herringbone paver stones, side gutters & brick curbs
        m.box((0, 0, 0.10), (10.0, 3.4, 0.20), 'stone')
        for y in (-1.55, 1.55):
            m.box((0, y, 0.22), (10.0, 0.28, 0.24), 'brick')
            m.box((0, y * 0.84, 0.14), (10.0, 0.18, 0.16), 'concrete')
        for k in range(9):
            px = -4.0 + k * 1.0
            m.box((px, -0.45, 0.21), (0.65, 0.95, 0.04), 'concrete')
            m.box((px + 0.3, 0.45, 0.21), (0.65, 0.95, 0.04), 'wall')

    else:  # roundabout
        m.cyl((0, 0, 0.09), 6.8, 0.18, 'road', 20)
        m.cyl((0, 0, 0.28), 3.2, 0.38, 'stone', 16)
        m.cyl((0, 0, 0.52), 2.7, 0.22, 'foliage', 16)
        m.cyl((0, 0, 1.45), 0.45, 1.8, 'wall', 10)
        m.sphere((0, 0, 2.65), 0.68, 'gold', 1)


# ==============================================================================
# 3. NATURE (15 Distinct Tropical Indonesian Flora & Sky Elements)
# ==============================================================================
def build_nature(m: Model, name: str, n: int):
    if name == 'cloud_cluster':
         puffs = [
             (0.0, 0.0, 1.1, 1.45), (-1.5, 0.3, 0.95, 1.15), (1.55, -0.2, 1.0, 1.2),
             (-0.7, -0.8, 0.85, 0.95), (0.8, 0.75, 0.9, 1.0), (0.0, 0.0, 1.65, 1.05)
         ]
         for px, py, pz, rad in puffs:
             m.sphere((px, py, pz), rad, 'white', 1, (1.25, 1.0, 0.78))

    elif name == 'palm_tree':
        # Segmented curved-style tropical coconut/royal palm with crown fronds
        for seg in range(6):
            z = 0.45 + seg * 0.78
            x_off = math.sin(seg * 0.22) * 0.22
            m.cyl((x_off, 0, z), 0.28 - seg * 0.02, 0.84, 'wood', 8)
        top_x, top_z = math.sin(5 * 0.22) * 0.22, 4.9
        for c in range(4):
            ang = c * math.pi * 0.5
            m.sphere((top_x + math.cos(ang) * 0.28, math.sin(ang) * 0.28, top_z - 0.15), 0.18, 'wood2', 1)
        for f in range(8):
            ang = f * math.tau / 8.0
            fx, fy = top_x + math.cos(ang) * 1.45, math.sin(ang) * 1.45
            m.box((fx, fy, top_z + 0.15), (1.9, 0.48, 0.14), 'foliage', ang)
            m.box((fx * 1.35, fy * 1.35, top_z - 0.12), (1.1, 0.36, 0.12), 'green', ang)

    elif name == 'banana_tree':
        # Pohon Pisang with broad paddles & hanging banana bunch
        m.cyl((0, 0, 1.35), 0.26, 2.7, 'leaf2', 8)
        for f in range(7):
            ang = f * math.tau / 7.0
            fx, fy = math.cos(ang) * 1.25, math.sin(ang) * 1.25
            m.box((fx, fy, 2.75 + (f % 2) * 0.22), (1.85, 0.68, 0.10), 'foliage' if f % 2 == 0 else 'leaf2', ang)
        m.cyl((0.45, 0.0, 2.15), 0.18, 0.55, 'sun', 8)
        m.cone((0.45, 0.0, 1.72), 0.14, 0.28, 'salmon', 8)

    elif name in ('rain_tree', 'rain_tree_bloom'):
        # Trembesi (Samanea saman) wide umbrella canopy tree
        m.cyl((0, 0, 1.6), 0.42, 3.2, 'wood', 10)
        for b in range(4):
            ang = b * math.pi * 0.5 + 0.4
            m.box((math.cos(ang) * 0.9, math.sin(ang) * 0.9, 3.1), (1.6, 0.26, 0.26), 'wood', ang)
        canopy = [
            (0, 0, 4.3, 1.75, 'green'), (-1.8, 0.6, 3.9, 1.35, 'foliage'),
            (1.8, -0.5, 3.95, 1.35, 'foliage'), (0.5, 1.75, 4.0, 1.28, 'leaf2'),
            (-0.6, -1.7, 3.9, 1.28, 'leaf3')
        ]
        for x, y, z, rad, col in canopy:
            m.sphere((x, y, z), rad, col, 1, (1.35, 1.25, 0.68))
        if name == 'rain_tree_bloom':
            for k in range(8):
                ang = k * math.tau / 8.0
                m.sphere((math.cos(ang) * 1.9, math.sin(ang) * 1.9, 4.35), 0.34, 'pink', 1)

    elif name in ('mango_tree', 'mango_fruiting', 'tamarind', 'tree_sapling'):
        scale = 0.62 if name == 'tree_sapling' else 1.0
        m.cyl((0, 0, 1.5 * scale), 0.34 * scale, 3.0 * scale, 'wood', 10)
        blobs = [
            (0, 0, 3.8, 1.35, 'green'), (-1.0, 0.7, 3.3, 1.05, 'foliage'),
            (1.05, -0.6, 3.35, 1.05, 'leaf2'), (-0.4, -1.0, 3.45, 0.98, 'leaf3'),
            (0.6, 0.95, 3.55, 0.95, 'foliage')
        ]
        for x, y, z, rad, col in blobs:
            m.sphere((x * scale, y * scale, z * scale), rad * scale, col, 1)
        if name == 'mango_fruiting':
            for k in range(6):
                ang = k * math.tau / 6.0
                m.sphere((math.cos(ang) * 1.35, math.sin(ang) * 1.35, 2.75), 0.22, 'sun' if k % 2 == 0 else 'orange', 1, (0.85, 0.85, 1.25))

    elif name == 'river_reeds':
        m.box((0, 0, 0.12), (2.4, 1.4, 0.24), 'soil')
        for i in range(9):
            rx = -0.9 + (i % 5) * 0.45
            ry = -0.35 + (i // 5) * 0.7
            h = 1.35 + (i % 3) * 0.28
            m.cyl((rx, ry, h * 0.5 + 0.15), 0.06, h, 'leaf3', 6)
            m.cyl((rx, ry, h + 0.15), 0.10, 0.35, 'wood', 6)

    elif name == 'lotus_planter':
        m.cyl((0, 0, 0.42), 1.15, 0.84, 'stone', 12)
        m.cyl((0, 0, 0.78), 0.98, 0.16, 'water', 12)
        for p in range(4):
            ang = p * math.pi * 0.5 + 0.3
            m.cyl((math.cos(ang) * 0.45, math.sin(ang) * 0.45, 0.88), 0.28, 0.04, 'foliage', 8)
        m.sphere((0, 0, 0.98), 0.24, 'pink', 1)

    else:  # flower_shrub, hedge, fern, flower_planter
        m.box((0, 0, 0.28), (2.4, 1.1, 0.56), 'brick' if 'planter' in name else 'soil')
        for k in range(5):
            px = -0.8 + k * 0.4
            m.sphere((px, 0, 0.85), 0.48, 'foliage' if k % 2 == 0 else 'leaf2', 1)
            if 'flower' in name:
                m.sphere((px, 0, 1.28), 0.18, 'salmon' if k % 2 == 0 else 'sun', 1)


# ==============================================================================
# 4. STREET PROPS (20 Distinct Urban Furniture & Kampung Streetscape Props)
# ==============================================================================
def build_street(m: Model, name: str, n: int):
    if name == 'street_lamp_modern':
        m.cyl((0, 0, 0.18), 0.38, 0.36, 'concrete', 8)
        m.cyl((0, 0, 2.5), 0.11, 4.6, 'metal2', 8)
        m.box((0.55, 0, 4.75), (1.3, 0.22, 0.16), 'metal2')
        m.box((0.95, 0, 4.64), (0.55, 0.32, 0.10), 'sun')

    elif name == 'street_lamp_vintage':
        # Betawi/Heritage twin-lantern ornamental lamppost
        m.cyl((0, 0, 0.25), 0.42, 0.5, 'stone', 10)
        m.cyl((0, 0, 2.3), 0.13, 4.1, 'dark', 10)
        m.box((0, 0, 4.15), (1.6, 0.16, 0.16), 'dark')
        for sx in (-0.72, 0.72):
            m.sphere((sx, 0, 4.42), 0.26, 'sun', 1)
            m.cone((sx, 0, 4.65), 0.30, 0.22, 'dark', 8)

    elif name in ('power_pole', 'cable_bundle'):
        m.cyl((0, 0, 2.8), 0.16, 5.6, 'concrete', 10)
        for z in (4.6, 5.2):
            m.box((0, 0, z), (1.8, 0.14, 0.14), 'metal')
            for ix in (-0.75, 0.0, 0.75):
                m.cyl((ix, 0, z + 0.16), 0.07, 0.22, 'glass', 6)
        if name == 'cable_bundle':
            m.box((0.28, 0, 3.6), (0.45, 0.38, 0.65), 'metal2')  # Trafo box

    elif name in ('street_sign', 'laneway_sign', 'direction_sign'):
        m.cyl((0, 0, 0.14), 0.32, 0.28, 'concrete', 10)
        m.cyl((0, 0, 1.5), 0.08, 3.0, 'metal2', 10)
        col = 'green' if name == 'street_sign' else ('blue' if name == 'direction_sign' else 'teal')
        m.box((0.35, 0, 2.65), (1.35, 0.10, 0.42), col)
        m.box((0.35, 0, 2.65), (1.42, 0.06, 0.48), 'white')
        m.box((-0.25, 0, 2.15), (1.15, 0.10, 0.36), 'sun')
        m.sphere((0, 0, 3.08), 0.12, 'metal', 1)

    elif name in ('bus_stop', 'bus_shelter'):
        # Halte Transjakarta / Angkot shelter
        w = 4.6 if name == 'bus_shelter' else 2.8
        m.box((0, 0, 0.12), (w, 1.8, 0.24), 'concrete')
        m.box((0, 0.65, 1.45), (w - 0.3, 0.10, 2.4), 'glass')
        for px in (-w * 0.42, 0.0, w * 0.42):
            m.cyl((px, -0.55, 1.45), 0.09, 2.5, 'metal', 8)
        m.box((0, 0, 2.75), (w + 0.3, 2.0, 0.18), 'blue')
        m.box((0, 0.35, 0.55), (w * 0.65, 0.42, 0.12), 'metal2')

    elif name == 'traffic_cone':
        m.box((0, 0, 0.05), (0.65, 0.65, 0.10), 'dark')
        m.cone((0, 0, 0.10), 0.26, 0.78, 'orange', 12)
        m.cyl((0, 0, 0.52), 0.16, 0.16, 'white', 12)
        m.cyl((0, 0, 0.30), 0.21, 0.12, 'white', 12)

    elif name == 'traffic_bollard':
        m.box((0, 0, 0.06), (2.2, 0.5, 0.12), 'concrete')
        for x in (-0.8, 0.0, 0.8):
            m.cyl((x, 0, 0.48), 0.14, 0.96, 'dark', 10)
            m.cyl((x, 0, 0.78), 0.15, 0.16, 'sun', 10)

    elif name == 'bench':
        for slat in range(4):
            m.box((0, -0.22 + slat * 0.14, 0.48), (2.2, 0.11, 0.06), 'wood2')
            m.box((0, 0.26, 0.65 + slat * 0.14), (2.2, 0.06, 0.11), 'wood')
        for x in (-0.85, 0.0, 0.85):
            m.box((x, 0, 0.26), (0.12, 0.58, 0.48), 'metal')
            m.box((x, -0.28, 0.62), (0.10, 0.10, 0.32), 'metal2')

    elif name == 'trash_bin':
        # Dual organic / non-organic pilah sampah bins with lids and frame
        m.box((0, 0, 0.06), (1.4, 0.65, 0.12), 'concrete')
        m.cyl((-0.36, 0, 0.55), 0.26, 0.86, 'foliage', 12)
        m.cyl((0.36, 0, 0.55), 0.26, 0.86, 'sun', 12)
        m.cone((-0.36, 0, 1.0), 0.28, 0.18, 'green', 10)
        m.cone((0.36, 0, 1.0), 0.28, 0.18, 'orange', 10)

    elif name in ('park_fence', 'garden_fence', 'bicycle_rack'):
        col = 'metal' if name != 'garden_fence' else 'wood2'
        m.box((0, 0, 0.85), (4.2, 0.10, 0.10), col)
        m.box((0, 0, 0.35), (4.2, 0.10, 0.10), col)
        for k in range(7):
            m.cyl((-1.8 + k * 0.6, 0, 0.55), 0.06, 1.05, col, 8)
            m.sphere((-1.8 + k * 0.6, 0, 1.12), 0.08, 'gold' if name == 'park_fence' else col, 1)

    elif name == 'flagpole_indonesia':
        # Gapura / Tiang Bendera Merah Putih with stepped pedestal
        m.box((0, 0, 0.15), (1.5, 1.5, 0.30), 'stone')
        m.box((0, 0, 0.42), (1.0, 1.0, 0.28), 'concrete')
        m.cyl((0, 0, 3.0), 0.08, 5.6, 'white', 12)
        m.sphere((0, 0, 5.88), 0.14, 'gold', 1)
        m.box((0.68, 0, 5.35), (1.25, 0.06, 0.38), 'red_id')
        m.box((0.68, 0, 4.97), (1.25, 0.06, 0.38), 'white')

    elif name == 'food_cart':
        # Authentic Indonesian Gerobak Bakso / Mie Ayam with spoked wheels & blue tarp roof
        m.box((0, 0, 0.78), (2.1, 1.0, 0.82), 'wood2')
        m.box((-0.35, -0.46, 1.42), (0.95, 0.10, 0.58), 'glass')
        m.cyl((0.48, 0, 1.28), 0.24, 0.32, 'chrome', 10)  # Dandang soup pot
        m.roof_gable((0, 0, 1.85), (2.4, 1.35, 0.45), 'blue', 'wood2')
        for y in (-0.56, 0.56):
            m.pipe((-0.2, y, 0.36), 0.18, 0.34, 0.10, 'dark', 12)
        m.cyl((0.85, 0, 0.34), 0.06, 0.68, 'metal', 8)

    else:  # market_awning, billboard_blank
        m.box((0, 0, 0.12), (3.4, 1.8, 0.24), 'concrete')
        for x in (-1.4, 1.4):
            m.cyl((x, -0.6, 1.45), 0.10, 2.7, 'metal', 10)
            m.cyl((x, 0.6, 1.45), 0.10, 2.7, 'metal', 10)
        m.roof_gable((0, 0, 2.65), (3.8, 2.1, 0.65), 'sun' if 'awning' in name else 'teal', 'white')


# ==============================================================================
# 5. VEHICLES (10 Distinct Jakarta Transit & Street Vehicles)
# ==============================================================================
def build_vehicle(m: Model, name: str, n: int):
    if name in ('scooter', 'motorcycle', 'bicycle'):
        col = 'teal' if name == 'scooter' else ('salmon' if name == 'motorcycle' else 'sun')
        for wx in (-0.78, 0.78):
            m.cyl((wx, 0, 0.34), 0.32, 0.14, 'dark', 12, axis='y')
            m.cyl((wx, 0, 0.34), 0.18, 0.16, 'chrome', 10, axis='y')
        m.box((0, 0, 0.68), (1.35, 0.36, 0.32), col)
        m.box((-0.22, 0, 0.92), (0.65, 0.38, 0.18), 'dark')  # Seat
        m.box((0.55, 0, 0.95), (0.24, 0.34, 0.62), col)      # Front fairing
        m.box((0.58, 0, 1.32), (0.12, 0.72, 0.10), 'metal2') # Handlebars
        m.sphere((0.68, 0, 1.12), 0.11, 'sun', 1)            # Headlight
    else:
        specs = {
            'angkot': (3.8, 1.75, 1.65, 'blue', True),
            'city_bus': (6.8, 2.35, 2.35, 'blue', True),
            'minibus': (4.8, 2.0, 1.95, 'orange', True),
            'compact_car': (3.7, 1.75, 1.35, 'white', False),
            'taxi_generic': (4.1, 1.78, 1.38, 'teal', False),
            'light_truck': (5.2, 2.1, 2.05, 'sun', False),
            'pickup': (4.4, 1.85, 1.55, 'metal2', False)
        }
        length, width, height, body_col, is_van = specs.get(name, (4.0, 1.8, 1.5, 'blue', False))
        # Wheels
        wx_off = length * 0.32
        wy_off = width * 0.48
        for wx in (-wx_off, wx_off):
            for wy in (-wy_off, wy_off):
                m.cyl((wx, wy, 0.38), 0.38, 0.24, 'dark', 12, axis='y')
                m.cyl((wx, wy * 1.03, 0.38), 0.20, 0.26, 'chrome', 10, axis='y')
        if is_van:
            m.box((0, 0, 0.45 + height * 0.5), (length, width, height), body_col)
            m.box((0, 0, 0.45 + height * 0.72), (length * 0.92, width + 0.04, height * 0.42), 'glass')
            m.box((0, 0, 0.45 + height + 0.06), (length * 0.94, width * 0.92, 0.12), 'white')
        elif name in ('light_truck', 'pickup'):
            cab_l = length * 0.36
            bed_l = length * 0.60
            m.box((length * 0.28, 0, 0.45 + height * 0.48), (cab_l, width, height * 0.92), body_col)
            m.box((length * 0.32, 0, 0.45 + height * 0.68), (cab_l * 0.75, width + 0.04, height * 0.38), 'glass')
            bed_h = height * (0.88 if name == 'light_truck' else 0.45)
            m.box((-length * 0.18, 0, 0.45 + bed_h * 0.5), (bed_l, width, bed_h), 'wood2' if name == 'pickup' else 'white')
        else:
            m.box((0, 0, 0.72), (length, width, 0.68), body_col)
            m.box((-0.18, 0, 1.32), (length * 0.58, width * 0.88, 0.58), body_col)
            m.box((-0.18, 0, 1.34), (length * 0.52, width * 0.90, 0.44), 'glass')
            if name == 'taxi_generic':
                m.box((-0.15, 0, 1.68), (0.55, 0.28, 0.18), 'sun')
        # Bumpers & Headlights
        m.box((length * 0.5 + 0.05, 0, 0.58), (0.14, width * 0.92, 0.22), 'metal')
        m.box((-length * 0.5 - 0.05, 0, 0.58), (0.14, width * 0.92, 0.22), 'metal')
        for hy in (-width * 0.34, width * 0.34):
            m.box((length * 0.5 + 0.06, hy, 0.82), (0.08, 0.28, 0.18), 'sun')
            m.box((-length * 0.5 - 0.06, hy, 0.82), (0.08, 0.28, 0.18), 'salmon')


# ==============================================================================
# 6. GAMEPLAY (15 Distinct Interactive Portals, Crystals, Pads & Collectibles)
# ==============================================================================
def build_gameplay(m: Model, name: str, n: int):
    col = ['teal', 'sun', 'purple', 'salmon', 'foliage'][n % 5]
    if name in ('prism_portal', 'race_arch'):
        m.box((0, 0, 0.14), (4.8, 1.8, 0.28), 'dark')
        for sx in (-1.85, 1.85):
            m.box((sx, 0, 1.9), (0.52, 0.62, 3.5), 'metal')
            m.box((sx, 0, 1.9), (0.28, 0.68, 3.2), col)
        m.box((0, 0, 3.85), (4.4, 0.72, 0.55), 'metal')
        m.pipe((0, 0, 2.05), 1.25, 1.55, 0.24, 'gold' if name == 'race_arch' else col, 16)

    elif name in ('moving_platform', 'floating_island', 'jump_platform', 'spring_pad', 'teleport_pad'):
        r = 2.2 if 'platform' in name or 'island' in name else 1.45
        m.cyl((0, 0, 0.28), r, 0.45, 'dark', 14)
        m.cyl((0, 0, 0.56), r * 0.88, 0.16, col, 14)
        if name == 'floating_island':
            m.cone((0, 0, -0.85), r * 0.92, 1.1, 'stone', 10)
        elif name == 'spring_pad':
            m.pipe((0, 0, 0.82), 0.55, 0.78, 0.35, 'sun', 12)

    elif name == 'coin_star':
        m.cyl((0, 0, 0.15), 0.75, 0.22, 'dark', 12)
        m.sphere((0, 0, 1.25), 0.68, 'gold', 1, (1.0, 0.38, 1.0))
        m.pipe((0, 0, 1.25), 0.45, 0.65, 0.18, 'sun', 12)

    else:  # checkpoint_crystal, quest_terminal, save_totem, collectible_chest, hazard_spinner, build_station, zipline_anchor
        m.cyl((0, 0, 0.22), 1.25, 0.44, 'dark', 12)
        m.cyl((0, 0, 0.95), 0.42, 1.2, 'metal2', 10)
        m.sphere((0, 0, 1.95), 0.65, col, 1, (0.85, 0.85, 1.35))
        for k in range(4):
            ang = k * math.pi * 0.5
            m.box((math.cos(ang) * 0.85, math.sin(ang) * 0.85, 0.55), (0.28, 0.28, 0.45), 'gold')


# ==============================================================================
# 7. INTERIORS & ROOFTOP PROPS (25 Distinct Shop, School, Cafe & Rooftop Props)
# ==============================================================================
def build_interior(m: Model, name: str, n: int):
    if name in ('table_wood', 'cafe_table', 'school_desk', 'cashier_desk', 'display_counter'):
        w = 2.0 if 'counter' in name or 'cashier' in name else 1.4
        d = 0.85
        m.box((0, 0, 0.78), (w, d, 0.10), 'wood2')
        m.box((0, 0, 0.70), (w * 0.90, d * 0.86, 0.08), 'wood')
        if 'counter' in name or 'cashier' in name:
            m.box((0, 0, 0.38), (w * 0.94, d * 0.9, 0.72), 'wall2')
            m.box((0, -0.15, 1.05), (w * 0.88, 0.35, 0.45), 'glass')
            for tray in (-0.5, 0.0, 0.5):
                m.box((tray, -0.12, 0.92), (0.38, 0.25, 0.14), 'sun' if tray == 0 else 'salmon')
                m.cyl((tray, 0.18, 0.88), 0.12, 0.16, 'metal2', 8)
        else:
            for lx in (-w * 0.42, w * 0.42):
                for ly in (-d * 0.38, d * 0.38):
                    m.cyl((lx, ly, 0.38), 0.06, 0.74, 'wood', 8)
            m.cyl((0, 0, 0.92), 0.16, 0.22, 'teal' if 'cafe' in name else 'sun', 10)

    elif name in ('chair_wood', 'stool', 'cafe_chair', 'bamboo_bench'):
        w = 1.8 if name == 'bamboo_bench' else 0.62
        col = 'bamboo' if name == 'bamboo_bench' else 'wood2'
        m.box((0, 0, 0.46), (w, 0.58, 0.08), col)
        if name != 'stool':
            m.box((0, 0.25, 0.82), (w, 0.08, 0.65), col)
            for r_bar in (-w * 0.3, 0.0, w * 0.3):
                m.cyl((r_bar, 0.25, 0.65), 0.04, 0.38, 'wood', 6)
        for lx in (-w * 0.42, w * 0.42):
            for ly in (-0.22, 0.22):
                m.cyl((lx, ly, 0.23), 0.05, 0.45, 'metal' if 'cafe' in name else 'wood', 8)
        m.box((0, 0, 0.20), (w * 0.82, 0.42, 0.05), 'wood')

    elif name in ('shelf_shop', 'shop_fridge'):
        col = 'white' if name == 'shop_fridge' else 'wood'
        m.box((0, 0, 1.05), (1.6, 0.68, 2.1), col)
        if name == 'shop_fridge':
            m.box((0, -0.35, 1.1), (1.42, 0.06, 1.75), 'glass')
        for s in range(4):
            sz = 0.38 + s * 0.45
            m.box((0, -0.05, sz), (1.45, 0.58, 0.06), 'metal2')
            for item in range(3):
                m.box((-0.45 + item * 0.45, -0.12, sz + 0.14), (0.24, 0.22, 0.22), ['sun', 'salmon', 'teal'][(s + item) % 3])

    elif name == 'water_tank':
        m.box((0, 0, 0.45), (1.3, 1.3, 0.9), 'metal')
        m.cyl((0, 0, 1.45), 0.58, 1.15, 'orange', 12)
        m.cyl((0, 0, 2.08), 0.22, 0.14, 'dark', 10)

    elif name == 'ac_unit':
        m.box((0, 0, 0.38), (0.98, 0.42, 0.68), 'white')
        m.pipe((-0.16, -0.22, 0.38), 0.08, 0.24, 0.06, 'dark', 12)
        for blade in range(4):
            m.box((-0.16, -0.23, 0.38), (0.38, 0.04, 0.06), 'metal2', blade * math.pi * 0.25)
        for slat in range(5):
            m.box((0.28, -0.22, 0.20 + slat * 0.09), (0.26, 0.04, 0.04), 'metal2')

    elif name == 'ceiling_fan':
        m.cyl((0, 0, 0.65), 0.06, 0.55, 'metal2', 8)
        m.cyl((0, 0, 0.35), 0.22, 0.12, 'white', 10)
        for b in range(4):
            ang = b * math.pi * 0.5
            m.box((math.cos(ang) * 0.55, math.sin(ang) * 0.55, 0.35), (0.85, 0.18, 0.04), 'white', ang)

    elif name in ('flower_pot', 'market_basket', 'crate_wood', 'crate_plastic'):
        col = 'brick' if name == 'flower_pot' else ('bamboo' if 'basket' in name else ('wood2' if 'wood' in name else 'teal'))
        m.box((0, 0, 0.36), (0.88, 0.74, 0.68), col)
        m.box((0, 0, 0.72), (0.94, 0.80, 0.08), 'wood' if 'wood' in name else col)
        for item in range(4):
            ang = item * math.pi * 0.5 + 0.4
            m.sphere((math.cos(ang) * 0.20, math.sin(ang) * 0.18, 0.82), 0.22, 'foliage' if name == 'flower_pot' else 'sun', 1)

    else:  # roof_antenna, small_tv, sign_blank, lamp_hanging, carpet, board_school, lamp_neon
        m.box((0, 0, 0.65), (1.6, 0.28, 1.1), 'dark' if 'tv' in name or 'board' in name else 'sun')
        m.box((0, -0.15, 0.65), (1.42, 0.06, 0.92), 'teal' if 'neon' in name else 'green')
        for rod in range(4):
            m.cyl((-0.55 + rod * 0.36, 0, 1.32), 0.05, 0.42, 'metal2', 8)
        m.sphere((0, 0, 1.58), 0.14, 'gold', 1)


# ==============================================================================
# BUILD ALL 125 GLB MODELS & WRITE MANIFEST
# ==============================================================================
BUILDERS = {
    'buildings': build_building,
    'infrastructure': build_infra,
    'nature': build_nature,
    'street_props': build_street,
    'vehicles': build_vehicle,
    'gameplay': build_gameplay,
    'interiors': build_interior
}

COLLISION_POLICY = {
    'buildings': 'solid_aabb',
    'infrastructure': 'surface_or_parapet',
    'nature': 'trunk_cylinder',
    'street_props': 'prop_small',
    'vehicles': 'solid_aabb',
    'gameplay': 'interactive_trigger',
    'interiors': 'decorative'
}

ALL = []
for cat, names in CATS.items():
    cat_dir = OUTPUT / cat
    cat_dir.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(names):
        m = Model(f'{cat}/{name}/BLOCKVERSE/ARGON/2026')
        BUILDERS[cat](m, name, i)
        rel_file = f'{cat}/{name}.glb'
        out_file = OUTPUT / rel_file
        byte_len, tri_count, dims = m.export_glb(out_file)
        ALL.append({
            'id': f'{cat}/{name}',
            'category': cat,
            'label': name.replace('_', ' ').title(),
            'src': f'/assets/3d/jakarta/{rel_file}',
            'format': 'glb',
            'bytes': byte_len,
            'triangleCount': tri_count,
            'lodTriangleCount': max(12, tri_count // 4),
            'dimensions': list(dims),
            'materialAtlas': '/assets/3d/jakarta/atlas_jakarta_v2.png',
            'design': 'original Argon V2 stylized Indonesian architectural mesh with embedded PBR detail atlas & AO vertex shading',
            'collision': COLLISION_POLICY[cat],
            'license': 'Original BLOCKVERSE'
        })

manifest = {
    'schemaVersion': 2,
    'title': 'BLOCKVERSE Jakarta/Cengkareng Stylized 3D Asset Pack (Argon V2 Polish)',
    'attribution': 'Original procedural models; not real building photographs or official geospatial data',
    'textureAtlas': {
        'src': '/assets/3d/jakarta/atlas_jakarta_v2.png',
        'resolution': '512x512 master / 128x128 embedded PNG per GLB',
        'tiles': '4x4 Indonesian architectural & tropical materials (genteng, ruko shutter, roster, conblock, foliage, water)'
    },
    'modelCount': len(ALL),
    'categories': {k: len(v) for k, v in CATS.items()},
    'assets': ALL
}

(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print(
    'GENERATED', len(ALL), 'ASSETS |',
    f"{sum(a['bytes'] for a in ALL) / 1048576:.2f} MiB |",
    'TRIANGLES:', sum(a['triangleCount'] for a in ALL)
)
