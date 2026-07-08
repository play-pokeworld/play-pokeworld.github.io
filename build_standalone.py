#!/usr/bin/env python3
"""Build a SELF-CONTAINED pokeworld.html (everything inline: CSS + all JS files
+ sprites re-encoded as base64) so it runs in the in-app preview, over file://,
and over http. The structured src/ project (named PNGs, split JS, languages/)
stays on disk / in the zip as the maintainable, feature-separated source.

Source of truth for style/body/title: uploads/pokeworld_v32.html.
JS files: loaded in a strict dependency ORDER (see ORDER below) into one <script>.
Split by concern: core / data / languages / gameplay (world, quests, combat,
economy, breeding, automation, boxes, save) / display.
"""
import re, os, base64

V32 = "uploads/pokeworld_v32.html"
raw = open(V32, encoding="utf-8").read().split("\n")
def fl(s, st=0):
    for i in range(st, len(raw)):
        if s in raw[i]:
            return i
    return -1
i_style = fl("<style>"); i_style_close = fl("</style>")
i_body = fl("<body>"); i_script = fl("<script>"); i_script_close = fl("</script>")
css_text  = "\n".join(raw[i_style + 1 : i_style_close])
body_text = "\n".join(raw[i_body + 1 : i_script])
title_line = ""
for ln in raw:
    if ln.strip().lower().startswith("<title"):
        title_line = ln.strip(); break
if not title_line:
    title_line = "<title>PokéWorld</title>"

# ---------------------------------------------------------------------------
# LOAD ORDER (strict dependency chain)
# ---------------------------------------------------------------------------
ORDER = [
    # --- core (state, event bus, shared utils, pokemon factory) ---
    "src/scripts/core/state.js",
    "src/scripts/core/event-bus.js",
    "src/scripts/core/util.js",
    "src/scripts/core/pokemon-factory.js",
    # --- languages (i18n data + helpers) ---
    "src/languages/translations.js",
    "src/languages/i18n.js",
    # --- data (moves, sprites, game data, quest data, map images) ---
    "src/scripts/data/moves.js",
    "src/scripts/data/sprites.js",
    "src/scripts/data/game-data.js",
    "src/scripts/data/quest-data.js",
    # --- display helpers (sprites, BAG_MAX) loaded before consumers ---
    "src/scripts/display/sprite-helpers.js",
    # --- gameplay: world (exploration, collection, team) ---
    "src/scripts/gameplay/world/world.js",
    "src/scripts/gameplay/world/collection.js",
    "src/scripts/gameplay/world/team.js",
    # --- gameplay: quests (core logic + ui) ---
    "src/scripts/gameplay/quests/quest-core.js",
    "src/scripts/gameplay/quests/quest-ui.js",
    # --- gameplay: economy (mine, inventory, shop, market, pokedex) ---
    "src/scripts/gameplay/economy/mine.js",
    "src/scripts/gameplay/economy/inventory.js",
    "src/scripts/gameplay/economy/shop.js",
    "src/scripts/gameplay/economy/market.js",
    "src/scripts/gameplay/economy/pokedex.js",
    # --- gameplay: combat (battle core, progression, catch, training, move-learning) ---
    "src/scripts/gameplay/combat/battle.js",
    "src/scripts/gameplay/combat/progression.js",
    "src/scripts/gameplay/combat/catch.js",
    "src/scripts/gameplay/combat/training.js",
    "src/scripts/gameplay/combat/move-learning.js",
    # --- gameplay: breeding (hatchery), automation, boxes ---
    "src/scripts/gameplay/breeding/hatchery.js",
    "src/scripts/gameplay/automation/automation.js",
    "src/scripts/gameplay/boxes/box-selector.js",
    # --- gameplay: save (save/load, settings) ---
    "src/scripts/gameplay/save/save.js",
    "src/scripts/gameplay/save/settings.js",
    # --- display (map rendering, bootstrap) ---
    "src/scripts/data/map-images.js",
    "src/scripts/display/map.js",
    "src/scripts/display/bootstrap.js",
]

def inline_sprites(text):
    def pkm(m):
        num, path = m.group(1), m.group(2)
        data = open(path, "rb").read()
        b64 = base64.b64encode(data).decode("ascii")
        return '"%s": "data:image/png;base64,%s"' % (num, b64)
    text = re.sub(r'"(\d+)":\s*"(src/assets/images/pokemon/(?:front|back|frontShiny|backShiny)/[^"]+\.png)"',
                  pkm, text)
    def itm(m):
        key, path = m.group(1), m.group(2)
        data = open(path, "rb").read()
        b64 = base64.b64encode(data).decode("ascii")
        return '"%s": "data:image/png;base64,%s"' % (key, b64)
    text = re.sub(r'"([\w]+)":\s*"(src/assets/images/items/[^"]+\.png)"',
                  itm, text)
    return text

parts = []
for f in ORDER:
    content = open(f, encoding="utf-8").read()
    if os.path.basename(f) == "sprites.js":
        content = inline_sprites(content)
    parts.append("/* ===== %s ===== */\n%s" % (f, content.rstrip("\n")))
script_text = "\n".join(parts)

html = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  %s
  <style>
%s
  </style>
</head>
<body>
%s
  <script>
%s
  </script>
</body>
</html>
""" % (title_line, css_text.rstrip("\n"), body_text.rstrip("\n"), script_text.rstrip("\n"))

with open("pokeworld.html", "w", encoding="utf-8") as fh:
    fh.write(html)
print("Wrote pokeworld.html (%d bytes)" % len(html))
