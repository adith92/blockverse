#!/usr/bin/env python3
"""Authoritative OpenStreetMap (OSM) public corridor & waterway pipeline for Cengkareng Timur.
- Optional & strictly separate from BLOCKVERSE's fictionalized gameplay map.
- Collects ONLY permitted non-sensitive public features: major roads (trunk/primary/secondary/tertiary),
  waterways (canal/river/drain including Kali Apuran / Cengkareng Drain), and public parks.
- Strips all residential house numbers, private building footprints, and personal tags.
- License & Attribution: Open Data Commons Open Database License (ODbL 1.0) — © OpenStreetMap contributors.
"""
from __future__ import annotations
import datetime, json, math, pathlib, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / 'public/assets/geo'
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / 'cengkareng_osm_overlay.json'

# Cengkareng Timur bounding box (South, West, North, East)
BBOX = (-6.1580, 106.7200, -6.1350, 106.7460)
CENTER_LAT = -6.1465
CENTER_LON = 106.7330

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_QUERY = f"""
[out:json][timeout:25];
(
  way["highway"~"^(trunk|primary|secondary|tertiary)$"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["waterway"~"^(canal|river|drain)$"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["leisure"="park"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
);
out body geom;
"""


def project_to_game_xy(lat: float, lon: float) -> list[float]:
    """Convert WGS84 (lat, lon) into local game-scale meters (x east, z south) clamped to [-680, 680]."""
    m_per_deg_lat = 110574.0
    m_per_deg_lon = 111320.0 * math.cos(math.radians(CENTER_LAT))
    dx_m = (lon - CENTER_LON) * m_per_deg_lon
    dz_m = -(lat - CENTER_LAT) * m_per_deg_lat
    # Scale 0.45x to fit comfortably inside the 1440x1110 Cengkareng Explorer minimap & ground reference
    gx = max(-680.0, min(680.0, round(dx_m * 0.45, 1)))
    gz = max(-510.0, min(510.0, round(dz_m * 0.45, 1)))
    return [gx, gz]


def simplify_line(pts: list[list[float]], min_dist: float = 14.0) -> list[list[float]]:
    if len(pts) <= 2:
        return pts
    out = [pts[0]]
    for pt in pts[1:-1]:
        if math.hypot(pt[0] - out[-1][0], pt[1] - out[-1][1]) >= min_dist:
            out.append(pt)
    out.append(pts[-1])
    return out


def fetch_osm_data() -> dict:
    req_data = urllib.parse.urlencode({'data': OVERPASS_QUERY}).encode('utf-8')
    req = urllib.request.Request(
        OVERPASS_URL,
        data=req_data,
        headers={'User-Agent': 'BLOCKVERSE-V2-Argon-Pipeline/1.0 (https://github.com/adith92/blockverse)'}
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode('utf-8'))


def main():
    extracted_at = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    roads = []
    waterways = []
    parks = []
    source_status = "live_overpass_api"

    try:
        raw = fetch_osm_data()
        elements = raw.get('elements', [])
        for el in elements:
            if el.get('type') != 'way' or 'geometry' not in el:
                continue
            tags = el.get('tags', {})
            pts = simplify_line([project_to_game_xy(pt['lat'], pt['lon']) for pt in el['geometry']])
            if len(pts) < 2:
                continue
            # Keep only public corridor names (never residential addresses or personal tags)
            public_name = tags.get('name', '')
            if any(k in public_name.lower() for k in ('gang ', 'gg.', 'rt ', 'rw ', 'blok ', 'no.')):
                public_name = ''
            if 'highway' in tags:
                roads.append({
                    'osmId': el['id'],
                    'kind': tags['highway'],
                    'name': public_name or f"Koridor {tags['highway'].title()}",
                    'points': pts
                })
            elif 'waterway' in tags:
                waterways.append({
                    'osmId': el['id'],
                    'kind': tags['waterway'],
                    'name': public_name or 'Aliran Kali / Drainase',
                    'points': pts
                })
            elif tags.get('leisure') == 'park':
                parks.append({
                    'osmId': el['id'],
                    'kind': 'park',
                    'name': public_name or 'Ruang Terbuka Hijau',
                    'points': pts
                })
    except Exception as exc:
        print(f"WARN: Overpass live query failed ({exc}); writing clearly marked offline fallback schema.")
        source_status = "offline_fallback_schema_only"

    payload = {
        "schemaVersion": 1,
        "title": "Cengkareng Timur Optional OpenStreetMap Public Corridor Reference",
        "disclaimer": (
            "Data referensi koridor publik OpenStreetMap (opsional & terpisah dari tata letak distrik fiksi BLOCKVERSE). "
            "BUKAN untuk navigasi dunia nyata. Seluruh detail residensial telah dihapus."
        ),
        "license": {
            "name": "Open Data Commons Open Database License (ODbL) v1.0",
            "attribution": "© OpenStreetMap contributors",
            "url": "https://www.openstreetmap.org/copyright/en",
            "shareAlikeObligation": (
                "Any derivative database of this OSM extract must remain licensed under ODbL 1.0 "
                "and attribute '© OpenStreetMap contributors'."
            )
        },
        "extraction": {
            "sourceUrl": OVERPASS_URL,
            "extractedAtUtc": extracted_at,
            "status": source_status,
            "bboxSouthWestNorthEast": list(BBOX),
            "centerLatLon": [CENTER_LAT, CENTER_LON],
            "scaleFactorMetersToGame": 0.45,
            "privacyFilter": "Permitted public highway/waterway/park centerlines only; zero residential building/address tags."
        },
        "counts": {
            "roads": len(roads),
            "waterways": len(waterways),
            "parks": len(parks)
        },
        "features": {
            "roads": roads[:120],
            "waterways": waterways[:60],
            "parks": parks[:40]
        }
    }
    OUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n')
    print(
        f"OSM OVERLAY WRITTEN ({source_status}): "
        f"roads={len(payload['features']['roads'])}, "
        f"waterways={len(payload['features']['waterways'])}, "
        f"parks={len(payload['features']['parks'])}"
    )


if __name__ == '__main__':
    main()
