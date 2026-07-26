#!/usr/bin/env python3
"""
PokéWorld - Réparation des assets manquants.

1. Télécharge les sprites d'objets manquants depuis PokeAPI (sprites/items).
2. Gère les objets custom (keystones, foggy_seed, link_stone, stoned_memory)
   via un mapping explicite + recoloration PIL.
3. Retélécharge la police WinkySans.ttf (l'ancienne est corrompue).

Usage: python3 tools/fix_missing_assets.py
"""
import colorsys
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ITEMS_DIR = ROOT / "src" / "assets" / "images" / "items"
FONT_DIR = ROOT / "src" / "assets" / "font"
POKEAPI_LIST_URL = "https://pokeapi.co/api/v2/item?limit=2500&offset=0"
POKEAPI_SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{}.png"
POKECLICKER_BASE = "https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images"

UA = {"User-Agent": "Mozilla/5.0 (PokeWorld asset fixer)"}

# Objets custom du jeu qui n'existent pas (sous ce nom) dans PokeAPI.
# value: (source, teinte optionnelle)
#   source = ("pokeapi", <nom>) ou ("pokeclicker", <chemin>)
CUSTOM_MAP = {
    # "Clé de Voûte" = Odd Keystone en français
    "ancient_keystone": (("pokeapi", "odd-keystone"), None),
    "frozen_keystone": (("pokeapi", "odd-keystone"), 0.58),   # recolorée bleu glace
    "steel_keystone": (("pokeapi", "odd-keystone"), "gray"),  # recolorée acier
    "stoned_memory": (("pokeapi", "rock-memory"), None),
    "foggy_seed": (("pokeapi", "misty-seed"), "fog"),         # recolorée gris-bleu pâle
    "link_stone": (("pokeapi", "dawn-stone"), 0.85),          # pierre violet/lien
}


def fetch(url, binary=True, retries=3):
    last = None
    for _ in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            return data if binary else data.decode("utf-8")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(0.5)
    raise RuntimeError(f"fetch failed {url}: {last}")


def recolor(png_bytes, hue):
    """Recolore un PNG RGBA. hue: float 0..1 | 'gray' | 'fog'."""
    from PIL import Image

    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if hue == "gray":
                s, v = s * 0.22, min(1.0, v * 1.02)
            elif hue == "fog":
                h, s, v = 0.60, s * 0.35, min(1.0, v * 1.08)
            else:
                h = hue % 1.0
            r2, g2, b2 = colorsys.hsv_to_rgb(h, s, v)
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    out = io.BytesIO()
    im.save(out, "PNG")
    return out.getvalue()


# ─── Phase 2 : sprites non présents dans le dépôt PokeAPI ───
# kind: "pokeapi_bag" (<nom>.png --bag), "pokeclicker" (chemin exact), "bulba" (titre File:)
PHASE2_MAP = {
    # Z-cristaux : le dépôt PokeAPI les nomme "<nom>--bag.png"
    **{f"{t}ium_z": ("pokeapi_bag", f"{t}ium-z") for t in [
        "bugin", "darkin", "dragon", "electr", "fair", "fightin", "fir", "flyin",
        "ghost", "grass", "ground", "ic", "normal", "poison", "psych", "rock",
        "steel", "water"]},
    "auspicious_armor": ("pokeclicker", "items/evolution/Auspicious_armor.png"),
    "cracked_pot": ("pokeclicker", "items/evolution/Cracked_pot.png"),
    "fairy_feather": ("pokeclicker", "items/heldItems/Fairy_Feather.png"),
    "fossilized_bird": ("pokeclicker", "items/underground/Fossilized Bird.png"),
    "fossilized_dino": ("pokeclicker", "items/underground/Fossilized Dino.png"),
    "fossilized_drake": ("pokeclicker", "items/underground/Fossilized Drake.png"),
    "fossilized_fish": ("pokeclicker", "items/underground/Fossilized Fish.png"),
    "galarica_cuff": ("pokeclicker", "items/evolution/Galarica_cuff.png"),
    "galarica_wreath": ("pokeclicker", "items/evolution/Galarica_wreath.png"),
    "malicious_armor": ("pokeclicker", "items/evolution/Malicious_armor.png"),
    "peat_block": ("pokeclicker", "items/evolution/Peat_block.png"),
    "sweet_apple": ("pokeclicker", "items/evolution/Sweet_apple.png"),
    "syrupy_apple": ("pokeclicker", "items/evolution/Syrupy_apple.png"),
    "tart_apple": ("pokeclicker", "items/evolution/Tart_apple.png"),
    "unremarkable_teacup": ("pokeclicker", "items/evolution/Unremarkable_teacup.png"),
    "clear_amulet": ("bulba", "Bag Clear Amulet SV Sprite.png"),
    "eject_pack": ("bulba", "Bag Eject Pack SV Sprite.png"),
    "heavy_duty_boots": ("bulba", "Bag Heavy-Duty Boots SV Sprite.png"),
    "loaded_dice": ("bulba", "Bag Loaded Dice SV Sprite.png"),
    "chipped_pot": ("bulba", "Bag Chipped Pot SV Sprite.png"),
    "masterpiece_teacup": ("bulba", "Bag Masterpiece Teacup SV Sprite.png"),
}


def _fetch_phase2(kind, name):
    """Récupère un sprite selon la source de phase 2."""
    if kind == "pokeapi_bag":
        return fetch(POKEAPI_SPRITE.format(name + "--bag"))
    if kind == "pokeclicker":
        return fetch(f"{POKECLICKER_BASE}/{urllib.parse.quote(name)}")
    if kind == "bulba":
        title = urllib.parse.quote(f"File:{name}")
        api = (f"https://archives.bulbagarden.net/w/api.php?action=query&format=json"
               f"&prop=imageinfo&iiprop=url&titles={title}")
        data = json.loads(fetch(api, binary=False))
        for page in data["query"]["pages"].values():
            infos = page.get("imageinfo")
            if infos:
                return fetch(infos[0]["url"])
        raise RuntimeError(f"Bulbagarden: fichier introuvable {name}")
    raise RuntimeError(f"kind inconnu {kind}")



def main():
    from PIL import Image  # noqa: F401  (vérif présence PIL)

    txt = (ROOT / "src" / "data" / "items-data.js").read_text(encoding="utf-8")
    keys = re.findall(r'^\s*"([a-z0-9_]+)"\s*:\s*\{', txt, re.M)
    missing = [k for k in keys
               if not (ITEMS_DIR / f"{k}.png").exists()
               and not k.startswith(("ct", "cs"))]  # CT/CS -> tm_<type>.png déjà présents
    print(f"Objets manquants à traiter: {len(missing)}")

    names = {it["name"] for it in json.loads(fetch(POKEAPI_LIST_URL, binary=False))["results"]}
    print(f"PokeAPI: {len(names)} objets connus")

    ok, custom, failed = 0, 0, []
    for k in missing:
        try:
            if k in CUSTOM_MAP:
                (src_kind, src_name), hue = CUSTOM_MAP[k]
                if src_kind == "pokeapi":
                    data = fetch(POKEAPI_SPRITE.format(src_name))
                else:
                    data = fetch(f"{POKECLICKER_BASE}/{src_name}")
                if hue:
                    data = recolor(data, hue)
                custom += 1
                tag = f"custom:{src_name}"
            elif k in PHASE2_MAP:
                kind, name = PHASE2_MAP[k]
                data = _fetch_phase2(kind, name)
                custom += 1
                tag = f"{kind}:{name}"
            else:
                kebab = k.replace("_", "-")
                if kebab not in names:
                    failed.append((k, "absent de PokeAPI"))
                    continue
                data = fetch(POKEAPI_SPRITE.format(kebab))
                ok += 1
                tag = kebab
            if data[:8] != b"\x89PNG\r\n\x1a\n":
                failed.append((k, f"{tag}: pas un PNG"))
                continue
            (ITEMS_DIR / f"{k}.png").write_bytes(data)
        except Exception as e:  # noqa: BLE001
            failed.append((k, str(e)))

    print(f"  téléchargés PokeAPI: {ok}")
    print(f"  générés custom:      {custom}")
    if failed:
        print(f"  échecs ({len(failed)}):")
        for k, why in failed:
            print(f"    - {k}: {why}")

    # ─── Police WinkySans ───
    winky = FONT_DIR / "WinkySans.ttf"
    if not _font_valid(winky):
        print("WinkySans.ttf corrompue, retéléchargement…")
        _download_winky(winky)
    print("Terminé.")


def _font_valid(path):
    try:
        from PIL import ImageFont
        ImageFont.truetype(str(path), 12)
        return True
    except Exception:  # noqa: BLE001
        return False


def _download_winky(dest):
    candidates = [
        "https://github.com/typofactur/winkysans/raw/main/fonts/ttf/WinkySans-Regular.ttf",
        "https://raw.githubusercontent.com/typofactur/winkysans/main/fonts/ttf/WinkySans-Regular.ttf",
    ]

    try:
        css = fetch("https://fonts.googleapis.com/css?family=Winky+Sans", binary=False)
        m = re.search(r"url\((https://[^)]+\.ttf)\)", css)
        if m:
            candidates.append(m.group(1))
    except Exception:  # noqa: BLE001
        pass
    # Fallback 2 : css2 avec UA ancien
    try:
        css = fetch("https://fonts.googleapis.com/css2?family=Winky+Sans:wght@400&display=swap",
                    binary=False)
        m = re.search(r"src:\s*url\((https://[^)]+)\)\s*format\('(?:truetype|woff2)'\)", css)
        if m:
            candidates.append(m.group(1))
    except Exception:  # noqa: BLE001
        pass

    for url in candidates:
        try:
            data = fetch(url)
            if len(data) < 10000 or data[:4] not in (b"\x00\x01\x00\x00", b"true", b"typ1", b"wOFF", b"wOF2"):
                continue
            dest.write_bytes(data)
            if _font_valid(dest):
                print(f"  police OK depuis {url}")
                return True
        except Exception:  # noqa: BLE001
            continue
    print("  !! impossible de récupérer une police WinkySans valide")
    return False


if __name__ == "__main__":
    sys.exit(main())
