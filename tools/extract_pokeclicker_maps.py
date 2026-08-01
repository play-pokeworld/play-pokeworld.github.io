#!/usr/bin/env python3
"""Extract region map coordinates from Pokeclicker GitHub repository.

Fetches SVG files for Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar
and converts Pokeclicker's 100x60 grid coordinates (16px per unit) into our
1600x960 regional map canvas coordinates.

Updates src/data/locations-hoenn.js with exact authentic Pokeclicker coordinates.
Usage: python3 tools/extract_pokeclicker_maps.py
"""
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/components/regionMaps/"

REGIONS = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar"]

# Mapping from Pokeclicker Hoenn English names to our LOCS_HOENN keys
HOENN_NAME_MAP = {
    "Littleroot Town": "littleroot",
    "Oldale Town": "oldale",
    "Petalburg City": "petalburg",
    "Rustboro City": "rustboro",
    "Dewford Town": "dewford",
    "Slateport City": "slateport",
    "Mauville City": "mauville",
    "Verdanturf Town": "verdanturf",
    "Fallarbor Town": "fallarbor",
    "Lavaridge Town": "lavaridge",
    "Fortree City": "fortree",
    "Lilycove City": "lilycove",
    "Mossdeep City": "mossdeep",
    "Sootopolis City": "sootopolis",
    "Pacifidlog Town": "pacifidlog",
    "Ever Grande City": "evergrande",
    "Route 101": "route101",
    "Route 102": "route102",
    "Route 103": "route103",
    "Route 104": "route104",
    "Route 105": "route105",
    "Route 106": "route106",
    "Route 107": "route107",
    "Route 108": "route108",
    "Route 109": "route109",
    "Route 110": "route110",
    "Route 111": "route111",
    "Route 112": "route112",
    "Route 113": "route113",
    "Route 114": "route114",
    "Route 115": "route115",
    "Route 116": "route116",
    "Route 117": "route117",
    "Route 118": "route118",
    "Route 119": "route119",
    "Route 120": "route120",
    "Route 121": "route121",
    "Route 122": "route122",
    "Route 123": "route123",
    "Route 124": "route124",
    "Route 125": "route125",
    "Route 126": "route126",
    "Route 127": "route127",
    "Route 128": "route128",
    "Route 129": "route129",
    "Route 130": "route130",
    "Route 131": "route131",
    "Route 132": "route132",
    "Route 133": "route133",
    "Route 134": "route134",
    "Petalburg Woods": "petalburg_woods",
    "Rusturf Tunnel": "rusturf_tunnel",
    "Granite Cave": "granite_cave",
    "Fiery Path": "fiery_path",
    "Meteor Falls": "meteor_falls",
    "Mt. Chimney": "mt_chimney",
    "Mt. Pyre": "mt_pyre",
    "Safari Zone Hoenn": "safari_zone_ho",
    "Shoal Cave": "shoal_cave",
    "Seafloor Cavern": "seafloor_cavern",
    "Cave of Origin": "cave_of_origin",
    "Sky Pillar": "sky_pillar",
    "Victory Road Hoenn": "victoryroad_ho",
    "Mirage Island": "mirage_island",
    "Abandoned Ship": "abandoned_ship",
    "Sealed Chamber": "sealed_chamber",
    "Sea Mauville": "abandoned_ship"
}

def fetch_svg(region: str) -> str:
    url = f"{BASE_URL}{region}SVG.html"
    req = urllib.request.Request(url, headers={"User-Agent": "PokeWorldAssetDownloader/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")

def parse_coords(html: str) -> dict[str, tuple[int, int, int, int]]:
    """Return map {name: (x, y, w, h)} in 1600x960 canvas coordinates."""
    coords = {}
    # Matches templates like <%- include('templates/mapTown', { name: "...", x: ..., y: ..., width: ..., height: ... }) %>
    # or mapRoute, mapDungeon
    pattern = re.compile(
        r'<%- include\(\s*\'templates/map(?:Town|Route|Dungeon)\',\s*\{([^\}]+)\}\s*\)\s*%>',
        re.S
    )
    for m in pattern.finditer(html):
        block = m.group(1)
        name_m = re.search(r'(?:name|route):\s*(?:GameConstants\.RegionRoute\[[\w.]+\]\.(\d+)|\"([^\"]+)\"|\'([^\']+)\'|(\d+))', block)
        if not name_m:
            continue
        # get string name
        name = name_m.group(1) or name_m.group(2) or name_m.group(3) or name_m.group(4)
        if name.isdigit():
            name = f"Route {name}"
        x_m = re.search(r'[\s,]x:\s*([\d.]+)', block)
        y_m = re.search(r'[\s,]y:\s*([\d.]+)', block)
        w_m = re.search(r'[\s,](?:width|w):\s*([\d.]+)', block)
        h_m = re.search(r'[\s,](?:height|h):\s*([\d.]+)', block)
        if not x_m or not y_m:
            continue
        x_tl = int(float(x_m.group(1)) * 16)
        y_tl = int(float(y_m.group(1)) * 16)
        w = max(48, int(float(w_m.group(1)) * 16)) if w_m else 72
        h = max(48, int(float(h_m.group(1)) * 16)) if h_m else 72
        if re.search(r'[\s,]rotate:\s*true', block):
            w, h = h, w
        x = x_tl + w // 2
        y = y_tl + h // 2
        if name in coords:
            old_x, old_y, old_w, old_h = coords[name]
            if old_w * old_h >= w * h:
                continue
        coords[name] = (x, y, w, h)
    return coords

def update_hoenn_locations(coords: dict[str, tuple[int, int, int, int]]) -> None:
    path = ROOT / "src/data/locations-hoenn.js"
    if not path.exists():
        print("locations-hoenn.js not found!")
        return
    txt = path.read_text(encoding="utf-8")
    updated = 0
    for en_name, key in HOENN_NAME_MAP.items():
        if en_name not in coords:
            continue
        x, y, w, h = coords[en_name]
        # Replace x: ..., y: ..., w: ..., h: ... for this key in txt
        patt = re.compile(rf'({key}:\s*\{{[^}}]*?x:\s*)\d+(,\s*y:\s*)\d+(,\s*w:\s*)\d+(,\s*h:\s*)\d+')
        new_txt, n = patt.subn(r'\g<1>' + str(x) + r'\g<2>' + str(y) + r'\g<3>' + str(w) + r'\g<4>' + str(h), txt, count=1)
        if n > 0:
            txt = new_txt
            updated += 1
    path.write_text(txt, encoding="utf-8")
    print(f"Updated {updated} Hoenn locations with authentic Pokeclicker coordinates!")

def main() -> None:
    for reg in REGIONS:
        try:
            html = fetch_svg(reg)
            coords = parse_coords(html)
            print(f"{reg}: parsed {len(coords)} map elements")
            if reg == "Hoenn":
                update_hoenn_locations(coords)
        except Exception as e:
            print(f"{reg}: error {e}")

if __name__ == "__main__":
    main()
