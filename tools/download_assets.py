#!/usr/bin/env python3
"""Download/rebuild all game image assets referenced by PokéWorld.

Sources used (requested priority order):
1. PokeChill GitHub     — the game's original backgrounds (img/bg/*).
2. Pokéclicker GitHub   — region maps, trainers, profiles.
3. Poképédia            — Paldea map (absent from Pokéclicker: "NO MAP YET").
4. PokeAPI sprites      — Pokémon et objets.
Generated fallback PNGs are created only when an upstream asset does not exist.

Secret bases (Emerald 2D only) — see download_base_assets():
5. pret/pokeemerald      — sprites 2D officiels GBA des décorations.
6. Serebii / objgfx      — icônes et objets 2D (repli).
La Base Secrète 3D a été retirée du projet.
"""
from __future__ import annotations

import concurrent.futures as futures
import http.client
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / 'src/data/sprites.js'
TRAINERS = ROOT / 'src/data/trainer-sprites-data.js'
UA = 'PokeWorldAssetDownloader/1.0'

POKEAPI_RAW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'
POKECLICKER_RAW = 'https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images'
POKECHILL_RAW = 'https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main'
POKEPEDIA_PALDEA = 'https://www.pokepedia.fr/images/thumb/8/88/Paldea_-_EV.png/1600px-Paldea_-_EV.png'

# Region maps: real official maps (Pokéclicker; Paldea via Poképédia).
# Each entry = ONE file saved as-is, NEVER merging/collage:
# Alola is kept as 4 separate islands and Galar as 2 parts (North/South),
# exactly as on the Pokéclicker repo (user feedback, phase 6).
REGION_MAP_FILES = {
    'kanto.png':          f'{POKECLICKER_RAW}/kanto-kanto.png',
    'johto.png':          f'{POKECLICKER_RAW}/johto.png',
    'hoenn.png':          f'{POKECLICKER_RAW}/hoenn.png',
    'sinnoh.png':         f'{POKECLICKER_RAW}/sinnoh.png',
    'unova.png':          f'{POKECLICKER_RAW}/unova.png',
    'kalos.png':          f'{POKECLICKER_RAW}/kalos.png',
    'galar-north.png':    f'{POKECLICKER_RAW}/galar-north.png',
    'galar-south.png':    f'{POKECLICKER_RAW}/galar-south.png',
    'alola-melemele.png': f'{POKECLICKER_RAW}/alola-melemele.png',
    'alola-akala.png':    f'{POKECLICKER_RAW}/alola-akala.png',
    'alola-ulaula.png':   f'{POKECLICKER_RAW}/alola-ulaula.png',
    'alola-poni.png':     f'{POKECLICKER_RAW}/alola-poni.png',
    'paldea.png':         POKEPEDIA_PALDEA,
}
REGION_ACCENTS = {
    'kanto': '#F2D94E', 'johto': '#B8C7D9', 'hoenn': '#D3425F', 'sinnoh': '#76D1C1',
    'unova': '#5795A3', 'kalos': '#EF90E6', 'alola': '#F2A541', 'galar': '#0C6AC8', 'paldea': '#DA7C4D',
}

# Original PokeChill backgrounds (the game this project derives from).
# PASSE 28 — on récupère TOUT le dossier img/bg de PokeChill : les décors de
# combat/exploration doivent venir du jeu d'origine, pas de PokéClicker.
_POKECHILL_BG_NAMES = [
    'main-bg.png', 'empty.jpg', 'forest.png', 'beach.png', 'cave.png',
    'desert.png', 'iceCave.png', 'lab.png', 'lake.png', 'mall.png',
    'missing.png', 'mountain.png', 'night.png', 'plant.png', 'route.png',
    'sea.png', 'snow.png', 'space.png', 'tower.png', 'town.png',
    'trench.png', 'volcano.png', 'gym.png', 'gymCard.png',
    'exploreHead1.png', 'exploreHead2.png', 'dimension1.png',
]
BACKGROUNDS = {
    name: f'{POKECHILL_RAW}/img/bg/{name}' for name in _POKECHILL_BG_NAMES
}

# Vignettes de zone PokeChill (img/bg/mini/*) : utilisées comme décor de la
# rangée du Pokémon actif en combat.
_POKECHILL_BG_MINI_NAMES = [
    'beach.png', 'cave.png', 'cavern.png', 'city.png', 'city2.png',
    'desert.png', 'forest.png', 'mountain.png', 'ocean.png', 'pink.png',
    'river.png', 'sky.png', 'space.png', 'volcano.png',
    'special1.png', 'special2.png', 'special3.png', 'special4.png',
    'special5.png', 'special6.png', 'special7.png',
]
BACKGROUNDS_MINI = {
    name: f'{POKECHILL_RAW}/img/bg/mini/{name}' for name in _POKECHILL_BG_MINI_NAMES
}

# Ressources PokeChill : l'ombre portée sous le sprite au combat, la Poké Ball
# décorative qui tourne derrière le Pokémon actif.
RESOURCES = {
    'pkmn-shadow.png': f'{POKECHILL_RAW}/img/resources/pkmn-shadow.png',
    'none.png':        f'{POKECHILL_RAW}/img/resources/none.png',
    'pokeball.svg':    f'{POKECHILL_RAW}/img/icons/pokeball.svg',
}

# PASSE 29 (item 10) — favicons référencés par index.html (lignes 7 à 9) et
# jamais téléchargés : ils apparaissaient donc comme « introuvables » alors
# que l'icône existe bel et bien en amont (img/icons/icon.png). Les trois
# tailles sont dérivées de cette source unique.
APP_ICONS = {
    'Icon.png': f'{POKECHILL_RAW}/img/icons/icon.png',
    'icon-192.png': f'{POKECHILL_RAW}/img/icons/icon.png',
    'icon-180.png': f'{POKECHILL_RAW}/img/icons/icon.png',
}

# PASSE 26o — décors de combat PokéClicker (src/assets/images/battleBackground).
# La feuille de style (design-system.css, skin combat) référence
# `../images/battleBackground/<name>.png` : sans ces fichiers la scène de
# combat tombait sur un aplat sombre (« affichage du combat cassé »).
BATTLE_BACKGROUNDS = [
    'default.png', 'battlefield.png', 'cave.png', 'cave-gem.png', 'desert.png',
    'fire.png', 'forest.png', 'graveyard.png', 'ice.png', 'mansion.png',
    'power-plant.png', 'space.png', 'water.png',
]

# PASSE 38 — tuiles de DONJON façon Pokéclicker (retour joueur : « il faut des
# assets : vide → case vide, combat → symbole de pokéball, boss → symbole de
# boss »). Ce sont les icônes officielles du dépôt Pokéclicker (dungeons/).
DUNGEON_TILES = ['encounter.png', 'boss.png', 'chest.png', 'ladder.png']

# Item sprites whose official source is mandated (user feedback):
#  - TMs (tm_<type>) come from PokeChill, official type disks;
#  - kings_rock / upgrade come from Pokéclicker (evolution items);
#  - berry.png: PokeChill has no generic "berry.png" (checked across the
#    whole repo tree + Git history); berryOran.png is its "generic" berry,
#    used as fallback sprite for all berries without a dedicated sprite;
#  - prine_berry.png: "Baie Prine" is the official FR name of the Lum Berry,
#    absent from PokeChill -> Pokéclicker fallback (next source in the list).
TM_TYPES = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting',
            'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost',
            'Dragon', 'Dark', 'Steel', 'Fairy']
ITEM_OVERRIDES = {
    'kings_rock.png':  f'{POKECLICKER_RAW}/items/evolution/Kings_rock.png',
    'upgrade.png':     f'{POKECLICKER_RAW}/items/evolution/Upgrade.png',
    'prine_berry.png': f'{POKECLICKER_RAW}/items/berry/Lum.png',
    'berry.png':       f'{POKECHILL_RAW}/img/items/berryOran.png',
    # Generic mine fossil: PokeChill fossilHelix sprite (same target #138)
    'fossil.png':      f'{POKECHILL_RAW}/img/items/fossilHelix.png',
    # Passe 0 (2026-08-14): 7 objets tenus sans sprite — 5 réels sur PokeChill,
    # 2 stand-ins de la même famille depuis PokéClicker (à remplacer si mieux).
    'clear_amulet.png':      f'{POKECHILL_RAW}/img/items/clearAmulet.png',
    'eject_pack.png':        f'{POKECHILL_RAW}/img/items/ejectPack.png',
    'foggy_seed.png':        f'{POKECHILL_RAW}/img/items/foggySeed.png',
    'heavy_duty_boots.png':  f'{POKECHILL_RAW}/img/items/heavyDutyBoots.png',
    'loaded_dice.png':       f'{POKECHILL_RAW}/img/items/loadedDice.png',
    'cracked_pot.png':       f'{POKECLICKER_RAW}/items/evolution/Cracked_pot.png',
    'chipped_pot.png':       f'{POKECLICKER_RAW}/items/evolution/Cracked_pot.png',   # stand-in
    'unremarkable_teacup.png': f'{POKECLICKER_RAW}/items/evolution/Unremarkable_teacup.png',
    'masterpiece_teacup.png':  f'{POKECLICKER_RAW}/items/evolution/Unremarkable_teacup.png',  # stand-in

    # DORM-06 — baies (PokéClicker) + consommables (PokeChill).
    'cheri_berry.png': f'{POKECLICKER_RAW}/items/berry/Cheri.png',
    'chesto_berry.png': f'{POKECLICKER_RAW}/items/berry/Chesto.png',
    'pecha_berry.png': f'{POKECLICKER_RAW}/items/berry/Pecha.png',
    'rawst_berry.png': f'{POKECLICKER_RAW}/items/berry/Rawst.png',
    'aspear_berry.png': f'{POKECLICKER_RAW}/items/berry/Aspear.png',
    'persim_berry.png': f'{POKECLICKER_RAW}/items/berry/Persim.png',
    'leppa_berry.png': f'{POKECLICKER_RAW}/items/berry/Leppa.png',
    'oran_berry.png': f'{POKECLICKER_RAW}/items/berry/Oran.png',
    'sitrus_berry.png': f'{POKECLICKER_RAW}/items/berry/Sitrus.png',
    'figy_berry.png': f'{POKECLICKER_RAW}/items/berry/Figy.png',
    'wiki_berry.png': f'{POKECLICKER_RAW}/items/berry/Wiki.png',
    'mago_berry.png': f'{POKECLICKER_RAW}/items/berry/Mago.png',
    'aguav_berry.png': f'{POKECLICKER_RAW}/items/berry/Aguav.png',
    'iapapa_berry.png': f'{POKECLICKER_RAW}/items/berry/Iapapa.png',
    'liechi_berry.png': f'{POKECLICKER_RAW}/items/berry/Liechi.png',
    'ganlon_berry.png': f'{POKECLICKER_RAW}/items/berry/Ganlon.png',
    'salac_berry.png': f'{POKECLICKER_RAW}/items/berry/Salac.png',
    'petaya_berry.png': f'{POKECLICKER_RAW}/items/berry/Petaya.png',
    'apicot_berry.png': f'{POKECLICKER_RAW}/items/berry/Apicot.png',
    'lansat_berry.png': f'{POKECLICKER_RAW}/items/berry/Lansat.png',
    'starf_berry.png': f'{POKECLICKER_RAW}/items/berry/Starf.png',
    'pomeg_berry.png': f'{POKECLICKER_RAW}/items/berry/Pomeg.png',
    'kelpsy_berry.png': f'{POKECLICKER_RAW}/items/berry/Kelpsy.png',
    'qualot_berry.png': f'{POKECLICKER_RAW}/items/berry/Qualot.png',
    'hondew_berry.png': f'{POKECLICKER_RAW}/items/berry/Hondew.png',
    'grepa_berry.png': f'{POKECLICKER_RAW}/items/berry/Grepa.png',
    'tamato_berry.png': f'{POKECLICKER_RAW}/items/berry/Tamato.png',
    'chilan_berry.png': f'{POKECLICKER_RAW}/items/berry/Chilan.png',
    'micle_berry.png': f'{POKECLICKER_RAW}/items/berry/Micle.png',
    'custap_berry.png': f'{POKECLICKER_RAW}/items/berry/Custap.png',
    'jaboca_berry.png': f'{POKECLICKER_RAW}/items/berry/Jaboca.png',
    'rowap_berry.png': f'{POKECLICKER_RAW}/items/berry/Rowap.png',
    'kee_berry.png': f'{POKECLICKER_RAW}/items/berry/Kee.png',
    'maranga_berry.png': f'{POKECLICKER_RAW}/items/berry/Maranga.png',
    'enigma_berry.png': f'{POKECLICKER_RAW}/items/berry/Enigma.png',
    'snover_berry.png': f'{POKECLICKER_RAW}/items/berry/Snover.png',
    'hopo_berry.png': f'{POKECLICKER_RAW}/items/berry/Hopo.png',
    'pinkan_berry.png': f'{POKECLICKER_RAW}/items/berry/Pinkan.png',
    'razz_berry.png': f'{POKECLICKER_RAW}/items/berry/Razz.png',
    'bluk_berry.png': f'{POKECLICKER_RAW}/items/berry/Bluk.png',
    'nanab_berry.png': f'{POKECLICKER_RAW}/items/berry/Nanab.png',
    'wepear_berry.png': f'{POKECLICKER_RAW}/items/berry/Wepear.png',
    'pinap_berry.png': f'{POKECLICKER_RAW}/items/berry/Pinap.png',
    'cornn_berry.png': f'{POKECLICKER_RAW}/items/berry/Cornn.png',
    'magost_berry.png': f'{POKECLICKER_RAW}/items/berry/Magost.png',
    'rabuta_berry.png': f'{POKECLICKER_RAW}/items/berry/Rabuta.png',
    'nomel_berry.png': f'{POKECLICKER_RAW}/items/berry/Nomel.png',
    'spelon_berry.png': f'{POKECLICKER_RAW}/items/berry/Spelon.png',
    'pamtre_berry.png': f'{POKECLICKER_RAW}/items/berry/Pamtre.png',
    'watmel_berry.png': f'{POKECLICKER_RAW}/items/berry/Watmel.png',
    'durin_berry.png': f'{POKECLICKER_RAW}/items/berry/Durin.png',
    'belue_berry.png': f'{POKECLICKER_RAW}/items/berry/Belue.png',
    'hp_up.png': f'{POKECHILL_RAW}/img/items/hpUp.png',
    'protein.png': f'{POKECHILL_RAW}/img/items/protein.png',
    'iron.png': f'{POKECHILL_RAW}/img/items/iron.png',
    'calcium.png': f'{POKECHILL_RAW}/img/items/calcium.png',
    'zinc.png': f'{POKECHILL_RAW}/img/items/zinc.png',
    'carbos.png': f'{POKECHILL_RAW}/img/items/carbos.png',
    'bottle_cap.png': f'{POKECHILL_RAW}/img/items/bottleCap.png',
    'golden_bottle_cap.png': f'{POKECHILL_RAW}/img/items/goldenBottleCap.png',
    'ability_capsule.png': f'{POKECHILL_RAW}/img/items/abilityCapsule.png',
    'ability_patch.png': f'{POKECHILL_RAW}/img/items/abilityPatch.png',

    # DORM-06b — objets futurs (mega-gemmes, apricorns, souterrains…).
    'abomasite.png': f'{POKECHILL_RAW}/img/items/abomasite.png',
    'absolite.png': f'{POKECHILL_RAW}/img/items/absolite.png',
    'aerodactylite.png': f'{POKECHILL_RAW}/img/items/aerodactylite.png',
    'aggronite.png': f'{POKECHILL_RAW}/img/items/aggronite.png',
    'alakazite.png': f'{POKECHILL_RAW}/img/items/alakazite.png',
    'altarianite.png': f'{POKECHILL_RAW}/img/items/altarianite.png',
    'ampharosite.png': f'{POKECHILL_RAW}/img/items/ampharosite.png',
    'audinite.png': f'{POKECHILL_RAW}/img/items/audinite.png',
    'banettite.png': f'{POKECHILL_RAW}/img/items/banettite.png',
    'barbaracite.png': f'{POKECHILL_RAW}/img/items/barbaracite.png',
    'baxcaliburite.png': f'{POKECHILL_RAW}/img/items/baxcaliburite.png',
    'beedrillite.png': f'{POKECHILL_RAW}/img/items/beedrillite.png',
    'blastoisinite.png': f'{POKECHILL_RAW}/img/items/blastoisinite.png',
    'blazikenite.png': f'{POKECHILL_RAW}/img/items/blazikenite.png',
    'cameruptite.png': f'{POKECHILL_RAW}/img/items/cameruptite.png',
    'diancite.png': f'{POKECHILL_RAW}/img/items/diancite.png',
    'dragonitite.png': f'{POKECHILL_RAW}/img/items/dragonitite.png',
    'falinksite.png': f'{POKECHILL_RAW}/img/items/falinksite.png',
    'galladite.png': f'{POKECHILL_RAW}/img/items/galladite.png',
    'garchompite.png': f'{POKECHILL_RAW}/img/items/garchompite.png',
    'gardevoirite.png': f'{POKECHILL_RAW}/img/items/gardevoirite.png',
    'gengarite.png': f'{POKECHILL_RAW}/img/items/gengarite.png',
    'glalitite.png': f'{POKECHILL_RAW}/img/items/glalitite.png',
    'gyaradosite.png': f'{POKECHILL_RAW}/img/items/gyaradosite.png',
    'hawluchanite.png': f'{POKECHILL_RAW}/img/items/hawluchanite.png',
    'heracronite.png': f'{POKECHILL_RAW}/img/items/heracronite.png',
    'houndoominite.png': f'{POKECHILL_RAW}/img/items/houndoominite.png',
    'kangaskhanite.png': f'{POKECHILL_RAW}/img/items/kangaskhanite.png',
    'latiasite.png': f'{POKECHILL_RAW}/img/items/latiasite.png',
    'latiosite.png': f'{POKECHILL_RAW}/img/items/latiosite.png',
    'lopunnite.png': f'{POKECHILL_RAW}/img/items/lopunnite.png',
    'lucarionite.png': f'{POKECHILL_RAW}/img/items/lucarionite.png',
    'manectite.png': f'{POKECHILL_RAW}/img/items/manectite.png',
    'mawilite.png': f'{POKECHILL_RAW}/img/items/mawilite.png',
    'medichamite.png': f'{POKECHILL_RAW}/img/items/medichamite.png',
    'metagrossite.png': f'{POKECHILL_RAW}/img/items/metagrossite.png',
    'pidgeotite.png': f'{POKECHILL_RAW}/img/items/pidgeotite.png',
    'pinsirite.png': f'{POKECHILL_RAW}/img/items/pinsirite.png',
    'pyroarite.png': f'{POKECHILL_RAW}/img/items/pyroarite.png',
    'sablenite.png': f'{POKECHILL_RAW}/img/items/sablenite.png',
    'salamencite.png': f'{POKECHILL_RAW}/img/items/salamencite.png',
    'sceptilite.png': f'{POKECHILL_RAW}/img/items/sceptilite.png',
    'scizorite.png': f'{POKECHILL_RAW}/img/items/scizorite.png',
    'sharpedonite.png': f'{POKECHILL_RAW}/img/items/sharpedonite.png',
    'slowbronite.png': f'{POKECHILL_RAW}/img/items/slowbronite.png',
    'steelixite.png': f'{POKECHILL_RAW}/img/items/steelixite.png',
    'swampertite.png': f'{POKECHILL_RAW}/img/items/swampertite.png',
    'tyranitarite.png': f'{POKECHILL_RAW}/img/items/tyranitarite.png',
    'venusaurite.png': f'{POKECHILL_RAW}/img/items/venusaurite.png',
    'charizardite_x.png': f'{POKECHILL_RAW}/img/items/charizarditeX.png',
    'charizardite_y.png': f'{POKECHILL_RAW}/img/items/charizarditeY.png',
    'mewtwonite_x.png': f'{POKECHILL_RAW}/img/items/mewtwoniteX.png',
    'mewtwonite_y.png': f'{POKECHILL_RAW}/img/items/mewtwoniteY.png',
    'raichutite_x.png': f'{POKECHILL_RAW}/img/items/raichutiteX.png',
    'raichutite_y.png': f'{POKECHILL_RAW}/img/items/raichutiteY.png',
    'mega_piece.png': f'{POKECHILL_RAW}/img/items/megaPiece.png',
    'mega_shard.png': f'{POKECHILL_RAW}/img/items/megaShard.png',
    'mega_cluster.png': f'{POKECHILL_RAW}/img/items/megaCluster.png',
    'mega_chunk.png': f'{POKECHILL_RAW}/img/items/megaChunk.png',
    'mystery_egg.png': f'{POKECHILL_RAW}/img/items/mysteryEgg.png',
    'time_candy.png': f'{POKECHILL_RAW}/img/items/timeCandy.png',
    'time_candy_xl.png': f'{POKECHILL_RAW}/img/items/timeCandyXL.png',
    'red_apricorn.png': f'{POKECHILL_RAW}/img/items/redApricorn.png',
    'blue_apricorn.png': f'{POKECHILL_RAW}/img/items/blueApricorn.png',
    'yellow_apricorn.png': f'{POKECHILL_RAW}/img/items/yellowApricorn.png',
    'green_apricorn.png': f'{POKECHILL_RAW}/img/items/greenApricorn.png',
    'pink_apricorn.png': f'{POKECHILL_RAW}/img/items/pinkApricorn.png',
    'white_apricorn.png': f'{POKECHILL_RAW}/img/items/whiteApricorn.png',
    'black_apricorn.png': f'{POKECHILL_RAW}/img/items/blackApricorn.png',
    'red_orb.png': f'{POKEAPI_RAW}/items/red-orb.png',
    'blue_orb.png': f'{POKEAPI_RAW}/items/blue-orb.png',
    'gs_ball_celebi.png': f'{POKECLICKER_RAW}/items/collectible/GS_Ball_Celebi.png',
    'clear_bell_hooh.png': f'{POKECLICKER_RAW}/items/collectible/Clear_Bell_Hooh.png',
    'tidal_bell_lugia.png': f'{POKECLICKER_RAW}/items/collectible/Tidal_Bell_Lugia.png',
    'eon_ticket_latis.png': f'{POKECLICKER_RAW}/keyitems/Eon_ticket.png',
    'meteorite_shard_delta.png': f'{POKECLICKER_RAW}/items/collectible/Meteorite_Shard_Delta.png',
    'meteorite_bills_errand.png': f'{POKECLICKER_RAW}/items/collectible/Meteorite_Bills_Errand.png',
    'destiny_knot.png': f'{POKECHILL_RAW}/img/items/destinyKnot.png',
    'macho_brace.png': f'{POKECHILL_RAW}/img/items/machoBrace.png',
    'power_bracer.png': f'{POKECHILL_RAW}/img/items/powerBracer.png',
    'power_belt.png': f'{POKECHILL_RAW}/img/items/powerBelt.png',
    'power_lens.png': f'{POKECHILL_RAW}/img/items/powerLens.png',
    'power_band.png': f'{POKECHILL_RAW}/img/items/powerBand.png',
    'power_anklet.png': f'{POKECHILL_RAW}/img/items/powerAnklet.png',
    'power_weight.png': f'{POKECHILL_RAW}/img/items/powerWeight.png',
    'neutral_mint.png': f'{POKECHILL_RAW}/img/items/neutralMint.png',
    'red_shard.png': f'{POKECLICKER_RAW}/items/underground/Red%20Shard.png',
    'blue_shard.png': f'{POKECLICKER_RAW}/items/underground/Blue%20Shard.png',
    'yellow_shard.png': f'{POKECLICKER_RAW}/items/underground/Yellow%20Shard.png',
    'green_shard.png': f'{POKECLICKER_RAW}/items/underground/Green%20Shard.png',
    'white_shard.png': f'{POKECLICKER_RAW}/items/underground/White%20Shard.png',
    'black_shard.png': f'{POKECLICKER_RAW}/items/underground/Black%20Shard.png',
    'purple_shard.png': f'{POKECLICKER_RAW}/items/underground/Purple%20Shard.png',
    'pink_shard.png': f'{POKECLICKER_RAW}/items/underground/Pink%20Shard.png',
    'cyan_shard.png': f'{POKECLICKER_RAW}/items/underground/Cyan%20Shard.png',
    'beige_shard.png': f'{POKECLICKER_RAW}/items/underground/Beige%20Shard.png',
    'brown_shard.png': f'{POKECLICKER_RAW}/items/underground/Brown%20Shard.png',
    'crimson_shard.png': f'{POKECLICKER_RAW}/items/underground/Crimson%20Shard.png',
    'grey_shard.png': f'{POKECLICKER_RAW}/items/underground/Grey%20Shard.png',
    'lime_shard.png': f'{POKECLICKER_RAW}/items/underground/Lime%20Shard.png',
    'ochre_shard.png': f'{POKECLICKER_RAW}/items/underground/Ochre%20Shard.png',
    'rose_shard.png': f'{POKECLICKER_RAW}/items/underground/Rose%20Shard.png',
    'slate_shard.png': f'{POKECLICKER_RAW}/items/underground/Slate%20Shard.png',
    'blank_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Blank%20Plate.png',
    'draco_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Draco%20Plate.png',
    'dread_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Dread%20Plate.png',
    'earth_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Earth%20Plate.png',
    'fist_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Fist%20Plate.png',
    'flame_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Flame%20Plate.png',
    'icicle_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Icicle%20Plate.png',
    'insect_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Insect%20Plate.png',
    'iron_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Iron%20Plate.png',
    'meadow_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Meadow%20Plate.png',
    'mind_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Mind%20Plate.png',
    'pixie_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Pixie%20Plate.png',
    'sky_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Sky%20Plate.png',
    'splash_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Splash%20Plate.png',
    'spooky_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Spooky%20Plate.png',
    'stone_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Stone%20Plate.png',
    'toxic_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Toxic%20Plate.png',
    'zap_plate.png': f'{POKECLICKER_RAW}/items/collectible/Sacred%20Zap%20Plate.png',
    'amaze_mulch.png': f'{POKECLICKER_RAW}/items/farm/Amaze_Mulch.png',
    'boost_mulch.png': f'{POKECLICKER_RAW}/items/farm/Boost_Mulch.png',
    'freeze_mulch.png': f'{POKECLICKER_RAW}/items/farm/Freeze_Mulch.png',
    'gooey_mulch.png': f'{POKECLICKER_RAW}/items/farm/Gooey_Mulch.png',
    'rich_mulch.png': f'{POKECLICKER_RAW}/items/farm/Rich_Mulch.png',
    'surprise_mulch.png': f'{POKECLICKER_RAW}/items/farm/Surprise_Mulch.png',
    'berry_shovel.png': f'{POKECLICKER_RAW}/items/farm/Berry_Shovel.png',
    'mulch_shovel.png': f'{POKECLICKER_RAW}/items/farm/Mulch_Shovel.png',
    'cerulean_berry_shop_permit.png': f'{POKECLICKER_RAW}/items/collectible/CeruleanBerryShopPermit.png',
    'red_flute.png': f'{POKECLICKER_RAW}/items/fluteItem/Red_Flute.png',
    'blue_flute.png': f'{POKECLICKER_RAW}/items/fluteItem/Blue_Flute.png',
    'yellow_flute.png': f'{POKECLICKER_RAW}/items/fluteItem/Yellow_Flute.png',
    'white_flute.png': f'{POKECLICKER_RAW}/items/fluteItem/White_Flute.png',
    'black_flute.png': f'{POKECLICKER_RAW}/items/fluteItem/Black_Flute.png',
    'time_flute.png': f'{POKECLICKER_RAW}/items/fluteItem/Time_Flute.png',
    'treasure_scanner.png': f'{POKECLICKER_RAW}/oakitems/Treasure_Scanner.png',
    'dowsing_machine.png': f'{POKECLICKER_RAW}/items/battleItem/Dowsing_machine.png',
    'token_collector.png': f'{POKECLICKER_RAW}/items/battleItem/Token_collector.png',
}

# Pokeclicker catalog (tools/pokeclicker-items.json) — larger official
# sprites for items PokeAPI only ships as 24×24 icons, or does not ship.
def _load_pokeclicker_item_overrides() -> None:
    cfg_path = ROOT / 'tools' / 'pokeclicker-items.json'
    try:
        import json as _json
        cfg = _json.loads(cfg_path.read_text(encoding='utf-8'))
    except Exception:
        return
    base = (cfg.get('base') or f'{POKECLICKER_RAW}/').rstrip('/') + '/'
    for key, rel in (cfg.get('items') or {}).items():
        ITEM_OVERRIDES.setdefault(f'{key}.png', base + urllib.parse.quote(rel))

_load_pokeclicker_item_overrides()
for _t in TM_TYPES:
    ITEM_OVERRIDES[f'tm_{_t.lower()}.png'] = f'{POKECHILL_RAW}/img/items/tm{_t}.png'

TYPE_COLORS = {
    'normal': '#A0A29F', 'fire': '#FBA64C', 'water': '#539DDF', 'grass': '#60BE58',
    'electric': '#F2D94E', 'ice': '#76D1C1', 'fighting': '#D3425F', 'poison': '#B763CF',
    'ground': '#DA7C4D', 'flying': '#A1BBEC', 'psychic': '#FA8582', 'bug': '#92BD2D',
    'rock': '#C9BC8A', 'ghost': '#5F6DBC', 'dragon': '#0C6AC8', 'dark': '#595761',
    'steel': '#5795A3', 'fairy': '#EF90E6'
}

ITEM_ALIASES = {
    'pokeball': 'poke-ball', 'greatball': 'great-ball', 'ultraball': 'ultra-ball',
    'superpotion': 'super-potion', 'fullrestore': 'full-restore', 'burnheal': 'burn-heal',
    'iceheal': 'ice-heal', 'paralyzeheal': 'paralyze-heal', 'superrepel': 'super-repel',
    'pokeflute': 'poke-flute', 'rarecandy': 'rare-candy', 'rarcandy': 'rare-candy',
    'firestone': 'fire-stone', 'waterstone': 'water-stone', 'thunderstone': 'thunder-stone',
    'leafstone': 'leaf-stone', 'moonstone': 'moon-stone', 'sunstone': 'sun-stone',
    # PASSE 29 (item 10) — les Poké Balls spéciales avaient été déclarées
    # « absentes de PokeAPI » : c'était faux, seul le nom de fichier diffère
    # (tiret entre les deux mots). Vérifié : les 12 renvoient HTTP 200.
    'lureball': 'lure-ball', 'moonball': 'moon-ball', 'fastball': 'fast-ball',
    'diveball': 'dive-ball', 'luxuryball': 'luxury-ball', 'nestball': 'nest-ball',
    'repeatball': 'repeat-ball', 'timerball': 'timer-ball', 'duskball': 'dusk-ball',
    'quickball': 'quick-ball', 'beastball': 'beast-ball', 'masterball': 'master-ball',
    'premierball': 'premier-ball', 'healball': 'heal-ball', 'netball': 'net-ball',
    'levelball': 'level-ball', 'loveball': 'love-ball', 'friendball': 'friend-ball',
    'safariball': 'safari-ball', 'sportball': 'sport-ball',
    # PASSE 29 (item 10) — également faussement déclarés introuvables : les
    # trois existent sur PokeAPI sous leur nom officiel anglais.
    'prine_berry': 'lum-berry',   # Baie Prine = Lum Berry
    'upgrade': 'up-grade',        # Améliorator = Up-Grade
    'berry': 'oran-berry',        # « baie » générique = Oran Berry
}


def request_bytes(url: str, timeout: int = 40, retries: int = 4) -> bytes | None:
    """Download `url` with retries (unstable network, truncated responses).

    Returns None after the attempts are exhausted. Notably handles
    IncompleteRead (connection cut mid-transfer) which was not
    intercepted and used to fail the whole pipeline (fix pass 2026-08).
    """
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                data = response.read()
                if response.status == 200 and data:
                    return data
        except http.client.IncompleteRead:
            # Truncated response: never write a partial file — retry.
            pass
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError,
                ConnectionError, OSError):
            pass
        time.sleep(0.5 * (attempt + 1))
    return None


def write_download(url: str, out: Path) -> bool:
    if out.exists() and out.stat().st_size > 0:
        return True
    data = request_bytes(url)
    if not data:
        return False
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    return True


def parse_sprite_entries() -> list[tuple[str, int, Path]]:
    text = SPRITES.read_text(encoding='utf-8')
    entries: list[tuple[str, int, Path]] = []
    for bucket in ['front', 'frontShiny']:
        m = re.search(rf'\s{bucket}: \{{([\s\S]*?)\n \}}', text)
        if not m:
            continue
        # V7 · FORM-01 — les formes ont des clés "351-1" (plus d'ids 387–392).
        for dex, rel in re.findall(r'"([\d-]+)":"([^"]+)"', m.group(1)):
            entries.append((bucket, dex if '-' in dex else int(dex), ROOT / rel))
    return entries


def pokemon_url(bucket: str, dex) -> str:
    # V7 · FORM-01 — form sprite keys "base-slot" map to PokeAPI form ids
    # (Castform 10013-10015, Deoxys 10001-10003). Legacy 387-392 kept for
    # older sprite tables.
    special_map = {
        '351-1': 10013, 387: 10013,  # castform-sunny
        '351-2': 10014, 388: 10014,  # castform-rainy
        '351-3': 10015, 389: 10015,  # castform-snowy
        '386-1': 10001, 390: 10001,  # deoxys-attack
        '386-2': 10002, 391: 10002,  # deoxys-defense
        '386-3': 10003, 392: 10003,  # deoxys-speed
    }
    real_dex = special_map.get(dex, dex)
    folder = {
        'front': 'pokemon',
        'back': 'pokemon/back',
        'frontShiny': 'pokemon/shiny',
        'backShiny': 'pokemon/back/shiny',
    }[bucket]
    return f'{POKEAPI_RAW}/{folder}/{real_dex}.png'


def parse_item_entries() -> list[tuple[str, Path]]:
    text = SPRITES.read_text(encoding='utf-8')
    m = re.search(r'const ITEM_SPRITE_DATA = \{([\s\S]*?)\};', text)
    if not m:
        return []
    return [(key, ROOT / rel) for key, rel in re.findall(r'"([^"]+)":"([^"]+)"', m.group(1))]


def item_urls(key: str) -> list[str]:
    if key.startswith('tm_'):
        return []
    api_key = ITEM_ALIASES.get(key, key.replace('_', '-'))
    return [f'{POKEAPI_RAW}/items/{urllib.parse.quote(api_key)}.png']


ADDITIONAL_NPC_TRAINERS = [
    "Ace Trainer (female).png", "Ace Trainer (male).png", "Aether Foundation Employee (female).png", "Aether Foundation Employee (male).png", "Aether Foundation Employees (male).png",
    "Agatha.png", "Aqua Admin (matt).png", "Aqua Admin (shelly).png", "Aqua Leader.png", "Aroma Lady.png", "Artist (Gen 8).png", "Artist (male).png", "Athlete (female).png",
    "Athlete (male).png", "Backpacker (female).png", "Backpacker (male).png", "Battle Girl.png", "BattleCafeMaster.png", "Beauty.png", "Beni (Ninja).png", "Biker Goon.png",
    "Bird Keeper.png", "Blaine.png", "Bodybuilder (female).png", "Bodybuilder (male).png", "Brawly.png", "Brock.png", "Bruno.png", "Bruno2.png", "Bug Catcher.png", "Bugsy.png",
    "Burglar.png", "Camper.png", "Channeler.png", "Chaser (female).png", "Chaser (male).png", "Chuck.png", "Cipher Admin (nascour).png", "Cipher Admin Ardos.png",
    "Cipher Admin Dakim.png", "Cipher Admin Ein.png", "Cipher Admin Eldes.png", "Cipher Admin Gorigan.png", "Cipher Admin Lovrina.png", "Cipher Admin Miror B.png",
    "Cipher Admin Snattle.png", "Cipher Admin Venus.png", "Cipher Peon (female).png", "Cipher Peon (male).png", "Cipher Peon XD (female).png", "Cipher Peon XD (male).png",
    "Clair.png", "Collector.png", "Cooltrainer (female).png", "Cooltrainer (male).png", "Crush Girl.png", "Cue Ball Paxton.png", "Cyclist (female).png", "Cyclist (male).png",
    "Dancer (female).png", "Double Team.png", "Draconid Elder.png", "Dragon Tamer.png", "Dragon Warriors.png", "Drake.png", "Elder Li.png", "Erika.png", "Fairy Tale Girl.png",
    "Falkner.png", "False Dragon Titan.png", "Fisherman.png", "Flannery.png", "Furisode Girl Katherine.png", "Galactic Boss (cyrus).png", "Galactic Grunt (female).png",
    "Galactic Grunt (male).png", "Galactic Grunts (male).png", "Gentleman (Gen 4).png", "Gentleman.png", "Glacia.png", "Go-Rock Squad Grunt (female).png",
    "Go-Rock Squad Grunt (male).png", "Golfer (male).png", "Guitarist (female).png", "Guitarist (male).png", "Gym Leader Bede.png", "Gym Leader Marnie.png", "Hex Maniac.png",
    "Hidden Dragons.png", "Hiker (Gen 8).png", "Hiker.png", "Hunter (female).png", "Hunter (male).png", "Janitor.png", "Jasmine.png", "Juan.png", "Juggler.png", "Karen.png",
    "Kimono Girl.png", "Koga.png", "Koga2.png", "Lady.png", "Lance.png", "Lance2.png", "Lass.png", "Lorelei.png", "Lt. Surge.png", "Lucy Stevens.png", "Macro Cosmos (female).png",
    "Macro Cosmos (male).png", "Magma Admin (courtney).png", "Magma Admin.png", "Magma Leader.png", "Misty.png", "Morty.png", "Norman.png", "Office Worker (female).png",
    "Office Worker (male).png", "Officer Jenny.png", "Old Lady.png", "Phoebe.png", "Picnicker.png", "Pinkan Officer Jenny.png", "Pokemon Ranger (female).png", "PokéManiac.png",
    "Pokéfan (female).png", "Pokéfan (male).png", "Pokémon Breeder (female).png", "Pokémon Breeder (male).png", "Pokémon Ranger (female).png", "Pokémon Ranger (male).png",
    "Pokémon Rangers.png", "Preschooler (female).png", "Preschooler (male).png", "Pryce.png", "Psychic (female).png", "Psychic (male).png", "Punk Girl.png", "Reporter.png",
    "Rich Boy.png", "Rider (female).png", "Rider (male).png", "Rising Star (male).png", "Rival Blue.png", "Rival Hau.png", "Rocket Boss Giovanni.png", "Roller Boy.png",
    "Roxanne.png", "Ruin Maniac gen3.png", "Ruin Maniac.png", "Sabrina.png", "Sage.png", "Sailor.png", "School Kid (female).png", "School Kid (male).png",
    "Scientist (female).png", "Scientist (male).png", "Scientist Gideon.png", "Scratch Cat Girl.png", "Sidney.png", "Sightseer (female).png", "Sightseer (male).png",
    "Sky Trainer (female).png", "Sky Trainer (male).png", "Steven.png", "Super Nerd.png", "Supreme Gym Leader Drake.png", "Tamer.png", "Tate & Liza.png",
    "Team Aqua Grunt (female).png", "Team Aqua Grunt (male).png", "Team Flare Admin (female).png", "Team Flare Admin (male).png", "Team Flare Aliana.png",
    "Team Flare Boss Lysandre.png", "Team Flare Bryony.png", "Team Flare Celosia.png", "Team Flare Grunt (female).png", "Team Flare Grunt (male).png",
    "Team Flare Grunt Duo.png", "Team Flare Lysandre.png", "Team Flare Mable.png", "Team Flare Xerosic.png", "Team Magma Grunt (female).png", "Team Magma Grunt (male).png",
    "Team Plasma (colress).png", "Team Plasma (zinzolin).png", "Team Plasma Grunt (female).png", "Team Plasma Grunt (male).png", "Team Plasma Grunts (male).png",
    "Team Rainbow Leader Giovanni.png", "Team Rainbow Rocket Grunt (female).png", "Team Rainbow Rocket Grunt (male).png", "Team Rocket Boss Giovanni.png",
    "Team Rocket Grunt (female).png", "Team Rocket Grunt (male).png", "Team Rocket Grunts.png", "Team Skull Boss (guzma).png", "Team Skull Grunt (female).png",
    "Team Skull Grunt (male).png", "Team Skull Grunts (both).png", "Team Skull Grunts (male).png", "Team Snagem.png", "Team Star Grunt (female).png",
    "Team Star Grunt (male).png", "Team Yell Grunts.png", "The Galaxy Team's Kamado.png", "Tourist (female).png", "Tourist (male).png", "Tourist Couple.png",
    "Triathlete (malecycling).png", "Twins.png", "Veteran (female).png", "Veteran (male).png", "Waitress.png", "Wallace.png", "Wattson.png", "Whitney.png", "Will.png",
    "Willie.png", "Winona.png", "Worker (female).png", "Worker (ice).png", "Worker (male).png", "Youngster.png", "Youth Athlete (female).png"
]


def parse_trainer_files() -> set[str]:
    text = TRAINERS.read_text(encoding="utf-8")
    files = set(re.findall(r"'([^']+\.png)'", text))
    files.update(re.findall(r'"([^"]+\.png)"', text))
    files.add("Ace Trainer (male).png")
    files.update(ADDITIONAL_NPC_TRAINERS)
    clean_files = {urllib.parse.unquote(f.split("/")[-1]) for f in files if not f.startswith("trainer-")}
    return clean_files


def make_placeholder(out: Path, label: str = '?', size: tuple[int, int] = (64, 64), bg: str = '#36342F', fg: str = '#ECDEB7') -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, size[0]-2, size[1]-2), radius=max(6, size[0]//8), fill=bg, outline=fg, width=2)
    try:
        font = ImageFont.truetype(str(ROOT / 'src/assets/font/WinkySans.ttf'), max(12, size[0] // 4))
    except Exception:
        font = ImageFont.load_default()
    label = str(label)[:8]
    bbox = d.textbbox((0, 0), label, font=font)
    d.text(((size[0] - (bbox[2]-bbox[0]))/2, (size[1] - (bbox[3]-bbox[1]))/2), label, fill=fg, font=font)
    im.save(out)


def make_map(out: Path, title: str, accent: str) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    w, h = 1600, 960
    im = Image.new('RGB', (w, h), '#2f4f3a')
    d = ImageDraw.Draw(im)
    # Stylized land/water map backdrop; gameplay nodes are SVG overlays.
    d.rectangle((0, 0, w, h), fill='#315f75')
    d.ellipse((120, 80, 1180, 820), fill='#4b7d42', outline='#9fcb7a', width=8)
    d.ellipse((550, 150, 1480, 900), fill='#426f3c', outline='#9fcb7a', width=8)
    d.polygon([(170, 720), (360, 600), (520, 735), (430, 890), (210, 860)], fill='#3e6938')
    for x in range(120, 1500, 160):
        d.line((x, 140, x + 100, 820), fill='#6b8f5d', width=3)
    try:
        font = ImageFont.truetype(str(ROOT / 'src/assets/font/Megrim-Regular.ttf'), 82)
    except Exception:
        font = ImageFont.load_default()
    d.rounded_rectangle((40, 40, 520, 150), radius=24, fill='#252522', outline=accent, width=4)
    d.text((70, 60), title, fill='#ECDEB7', font=font)
    im.save(out)


def make_backgrounds() -> None:
    bg_dir = ROOT / 'src/assets/images/bg'
    bg_dir.mkdir(parents=True, exist_ok=True)
    for name, colors in {
        'main-bg.png': ('#252522', '#53617A'),
        'forest.png': ('#18351f', '#60BE58'),
    }.items():
        out = bg_dir / name
        if out.exists():
            continue
        im = Image.new('RGB', (960, 540), colors[0])
        d = ImageDraw.Draw(im)
        for i in range(0, 960, 80):
            d.polygon([(i, 540), (i+40, 260), (i+80, 540)], fill=colors[1])
        im.save(out)
    empty = bg_dir / 'empty.jpg'
    if not empty.exists():
        im = Image.new('RGB', (960, 540), '#111827')
        d = ImageDraw.Draw(im)
        for r in range(20, 700, 60):
            d.ellipse((480-r, 270-r, 480+r, 270+r), outline='#53617A', width=3)
        im.save(empty, quality=90)


def download_region_maps() -> None:
    """Download the real region maps (Pokéclicker / Poképédia),
    falling back to make_map() only if the download fails.
    One file per REGION_MAP_FILES entry: no merging
    (Alola = 4 separate islands, Galar = North + South separate — passe 6)."""
    maps_dir = ROOT / 'src/assets/images/maps'
    maps_dir.mkdir(parents=True, exist_ok=True)

    for filename, url in REGION_MAP_FILES.items():
        out = maps_dir / filename
        if out.exists():
            continue
        ok = write_download(url, out)
        if not ok or not out.exists():
            print(f"[SANS PLACEHOLDER] missing map: {filename} (URL {url})")


def _looks_tiny_item(path: Path) -> bool:
    """True for 24–40 px PokeAPI icons / recolors we want to replace."""
    try:
        im = Image.open(path)
        return max(im.size) <= 40
    except Exception:
        return path.stat().st_size < 800 if path.exists() else True


def download_item_overrides(force: bool = False) -> None:
    """Download the item sprites whose official source is mandated
    (see ITEM_OVERRIDES). `force` replaces a file that looks like a
    tiny PokeAPI icon / recolor (≤ 40×40) so the larger Pokeclicker
    sprite can win."""
    items_dir = ROOT / 'src/assets/images/items'
    items_dir.mkdir(parents=True, exist_ok=True)
    for name, url in ITEM_OVERRIDES.items():
        dest = items_dir / name
        if force and dest.exists() and _looks_tiny_item(dest):
            dest.unlink()
        write_download(url, dest)


def download_backgrounds() -> None:
    """Original backgrounds from the PokeChill repo (never replaces existing files)."""
    bg_dir = ROOT / 'src/assets/images/bg'
    bg_dir.mkdir(parents=True, exist_ok=True)
    for name, url in BACKGROUNDS.items():
        write_download(url, bg_dir / name)

    mini_dir = bg_dir / 'mini'
    mini_dir.mkdir(parents=True, exist_ok=True)
    for name, url in BACKGROUNDS_MINI.items():
        write_download(url, mini_dir / name)

    res_dir = ROOT / 'src/assets/images/resources'
    res_dir.mkdir(parents=True, exist_ok=True)
    for name, url in RESOURCES.items():
        write_download(url, res_dir / name)

    # Favicons / icône d'application (index.html l.7-9).
    img_dir = ROOT / 'src/assets/images'
    for name, url in APP_ICONS.items():
        write_download(url, img_dir / name)


def download_battle_backgrounds() -> None:
    """PASSE 26o — décors de combat officiels PokéClicker.

    Un fichier par entrée de BATTLE_BACKGROUNDS, jamais de placeholder :
    un décor absent est signalé pour que l'utilisateur le fournisse.
    """
    bb_dir = ROOT / 'src/assets/images/battleBackground'
    bb_dir.mkdir(parents=True, exist_ok=True)
    missing = []
    for name in BATTLE_BACKGROUNDS:
        out = bb_dir / name
        if out.exists() and out.stat().st_size > 0:
            continue
        if not write_download(f'{POKECLICKER_RAW}/battleBackground/{name}', out):
            missing.append(name)
    if missing:
        print(f"[SANS PLACEHOLDER] {len(missing)} battle background(s) absent(s) : {', '.join(missing)}")
    else:
        print(f'battle backgrounds: {len(BATTLE_BACKGROUNDS)} décor(s) PokéClicker OK')


def download_dungeon_tiles() -> None:
    """PASSE 38/38c — icônes de tuiles de donjon.

    PASSE 38 : les silhouettes d'origine viennent du dépôt Pokéclicker
    (Combat = encounter.png, boss = boss.png, coffre = chest.png, échelle =
    ladder.png). Un fichier par entrée de DUNGEON_TILES, jamais de
    placeholder : une icône absente est signalée.

    PASSE 38c (retour joueur) : après téléchargement, les tuiles sont
    RÉGÉNÉRÉES en monochrome NOIR (glyphes) — encounter.png devient la
    « pokéball vide » (contour) dessinée, boss/chest/ladder conservent leur
    silhouette mais en noir pur. La couleur est appliquée en CSS (masque +
    teinte partagée boss/pokéball/coffre, teinte propre pour l'échelle).
    """
    dg_dir = ROOT / 'src/assets/images/dungeon'
    dg_dir.mkdir(parents=True, exist_ok=True)
    missing = []
    for name in DUNGEON_TILES:
        out = dg_dir / name
        if out.exists() and out.stat().st_size > 0:
            continue
        if not write_download(f'{POKECLICKER_RAW}/dungeons/{name}', out):
            missing.append(name)
    if missing:
        print(f"[SANS PLACEHOLDER] {len(missing)} tuile(s) de donjon absente(s) : {', '.join(missing)}")
    else:
        print(f'dungeon tiles: {len(DUNGEON_TILES)} icône(s) PokéClicker OK')
    # PASSE 38c — monochrome : identique à tools/regenerate_dungeon_tiles.py.
    try:
        from PIL import Image, ImageDraw
    except Exception:
        print('[ATTENTION] PIL indisponible — tuiles laissées en couleurs d\'origine')
        return
    # encounter.png → POKÉBALL VIDE (contour) : le logo des cases de combat.
    W, H, cx, cy, r, lw = 70, 71, 35, 35, 30, 5
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(0, 0, 0, 255), width=lw)
    d.line((cx - r, cy, cx + r, cy), fill=(0, 0, 0, 255), width=lw)
    d.ellipse((cx - 8, cy - r - 8, cx + 8, cy - r + 8), outline=(0, 0, 0, 255), width=4)
    im.save(dg_dir / 'encounter.png')
    # boss/chest/ladder → glyphes noirs (RGB → 0, alpha conservé).
    for name in ('boss.png', 'chest.png', 'ladder.png'):
        out = dg_dir / name
        if not (out.exists() and out.stat().st_size > 0):
            continue
        im2 = Image.open(out).convert('RGBA')
        px = im2.load()
        for y in range(im2.size[1]):
            for x in range(im2.size[0]):
                r_, g_, b_, a_ = px[x, y]
                px[x, y] = (0, 0, 0, a_)
        im2.save(out)
    print('dungeon tiles: régénérées en glyphes monochromes (PASSE 38c)')
    # PASSE 39/38e — les cases de COMBAT utilisent la pokéball de la barre de
    # titre (icône officielle, pas le contour dessiné) : asset SVG local, créé
    # ici s'il manque (même SVG que l'icône de la fenêtre « Poké Balls »).
    # L'élite ajoute une étoile (combat corsé) en surimpression.
    local_svgs = {
        'pokeball.svg': (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000000" '
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/>'
            '<line x1="2" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="3"/></svg>\n'
        ),
        'star.svg': (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000">'
            '<path d="M12 2l2.9 6.26 6.6.72-4.9 4.54 1.34 6.48L12 16.77 6.06 20l1.34-6.48L2.5 8.98l6.6-.72L12 2z"/></svg>\n'
        ),
    }
    for name, svg in local_svgs.items():
        out = dg_dir / name
        if not (out.exists() and out.stat().st_size > 0):
            out.write_text(svg, encoding='utf-8')
    print('dungeon tiles: pokeball.svg + star.svg (icônes locales) OK')



def make_unknown_item() -> None:
    """Generic sprite shown when an item key is unknown."""
    out = ROOT / 'src/assets/images/items/unknown.png'
    if not out.exists():
        make_placeholder(out, '?', (64, 64))



def download_base_assets() -> None:
    """Bases secrètes — assets 2D Émeraude (pret/pokeemerald)."""
    import shutil
    import subprocess
    import sys

    py = sys.executable or 'python3'
    node = shutil.which('node')
    steps = [
        ('RSE repair', [py, 'tools/repair-emerald-ref.py', '--force']),
        ('staging objgfx', [py, 'tools/fetch-objgfx.py']),
    ]
    if node:
        steps.append(('Emerald 2D fetch', [node, 'tools/fetch-base2d.mjs']))
    steps.extend([
        ('2D Émeraude décor fullsize', [py, 'tools/bake-emerald-bgs.py', '--bake-decor-all']),
        ('2D Émeraude canon', [py, 'tools/bake-emerald-bgs.py', '--bake-canon']),
        ('2D Émeraude layouts', [py, 'tools/bake-emerald-bgs.py', '--bake-layouts']),
        ('2D Émeraude custom', [py, 'tools/bake-emerald-bgs.py', '--bake-custom']),
        ('2D transparence', [py, 'tools/fix-emerald-alpha.py']),
    ])
    for label, cmd in steps:
        try:
            res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=120)
            tail = (res.stdout.strip().splitlines() or [''])[-3:]
            print(f'base assets [{label}]: ' + ' | '.join(tail[-2:]))
        except Exception as exc:
            print(f'base assets [{label}]: ignoré ({exc})')


def download_ball_sprites() -> None:
    """Official PokéClicker Poké Ball sprites (SVG)."""
    ball_dir = ROOT / 'src/assets/images/pokeball'
    ball_dir.mkdir(parents=True, exist_ok=True)
    # Balls « classiques » (officielles PokéClicker).
    for name in ['Pokeball', 'Greatball', 'Ultraball', 'Masterball', 'Premierball',
                 'None', 'Pokeball-shiny', 'Lureball', 'Moonball', 'Fastball',
                 'Diveball', 'Luxuryball', 'Nestball', 'Repeatball', 'Timerball',
                 'Duskball', 'Quickball', 'Beastball']:
        write_download(f'{POKECLICKER_RAW}/pokeball/{name}.svg', ball_dir / f'{name}.svg')


def download_currency_sprites() -> None:
    """PokeClicker currency icons (window « Monnaies »)."""
    cur_dir = ROOT / 'src/assets/images/currency'
    cur_dir.mkdir(parents=True, exist_ok=True)
    names = ['money', 'dungeonToken', 'questPoint', 'diamond',
             'battlePoint', 'farmPoint', 'contestToken']
    for name in names:
        write_download(f'{POKECLICKER_RAW}/currency/{name}.svg', cur_dir / f'{name}.svg')


def make_honorball() -> None:
    """Honor Ball (blanche et rouge) — générée, pas de source officielle fiable."""
    out = ROOT / 'src/assets/images/items/honorball.png'
    if out.exists():
        return
    size = 96
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size / 2
    d.ellipse([2, 2, size - 2, size - 2], fill=(30, 30, 34, 255))
    d.ellipse([6, 6, size - 6, size - 6], fill=(245, 245, 245, 255))
    d.rectangle([6, cy - 10, size - 6, cy + 10], fill=(216, 60, 60, 255))
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=(245, 245, 245, 255), outline=(60, 60, 66, 255), width=3)
    d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(216, 60, 60, 255))
    d.ellipse([cx - 20, cy - 26, cx - 2, cy - 16], fill=(255, 255, 255, 140))
    im.save(out)


def main() -> None:
    started = time.time()
    jobs: list[tuple[str, Path, str]] = []

    for bucket, dex, out in parse_sprite_entries():
        jobs.append((pokemon_url(bucket, dex), out, f'pokemon {bucket} #{dex}'))

    for key, out in parse_item_entries():
        urls = item_urls(key)
        if urls:
            jobs.append((urls[0], out, f'item {key}'))

    for file in parse_trainer_files():
        encoded = urllib.parse.quote(file)
        jobs.append((f'{POKECLICKER_RAW}/npcs/{encoded}', ROOT / 'src/assets/images/trainers/npcs' / file, f'trainer {file}'))

    # Trainer profile icons used by save/staff UI.
    for i in range(0, 101):
        jobs.append((f'{POKECLICKER_RAW}/profile/trainer-{i}.png', ROOT / f'src/assets/images/trainers/profil/trainer-{i}.png', f'profile {i}'))

    ok = 0
    failed: list[tuple[str, Path, str]] = []
    with futures.ThreadPoolExecutor(max_workers=32) as pool:
        future_map = {pool.submit(write_download, url, out): (url, out, label) for url, out, label in jobs}
        for fut in futures.as_completed(future_map):
            url, out, label = future_map[fut]
            if fut.result():
                ok += 1
            else:
                failed.append((url, out, label))

    # Placeholder safety REMOVED at user request (no more badges)
    # We no longer generate fallbacks for missing items — they will be listed as missing.
    missing_items = []
    for key, out in parse_item_entries():
        if not out.exists():
            missing_items.append(key)
    if missing_items:
        print(f"[SANS PLACEHOLDER] {len(missing_items)} items without a real sprite (listed below, not generated):")
        for k in missing_items[:100]:
            print(f"  - {k}")

    # Phase 50 (user feedback "all TM sprites are missing"):
    # the REAL PokeChill disks are downloaded by
    # download_item_overrides() below. So only bake a placeholder
    # when the download failed — otherwise the grey badge won the race
    # and write_download(), which never replaces an existing file,
    # would never fetch the real disk back.
    download_item_overrides(force=True)
    # No more placeholder for TM disks — the real PokeChill sprite is required
    missing_tms = []
    for typ in TYPE_COLORS.keys():
        out = ROOT / f'src/assets/images/items/tm_{typ}.png'
        if not out.exists():
            missing_tms.append(typ)
    if missing_tms:
        print(f"[SANS PLACEHOLDER] {len(missing_tms)} TM disks without a real PokeChill sprite: {', '.join(missing_tms)}")

    # No more placeholder for trainers — only list the failures
    for _url, out, label in failed:
        if ('trainers/npcs' in str(out) or 'trainers/profil' in str(out)) and not out.exists():
            print(f"[SANS PLACEHOLDER] missing trainer: {label} -> {out}")

    download_region_maps()
    download_backgrounds()
    download_battle_backgrounds()
    download_dungeon_tiles()
    download_ball_sprites()
    download_currency_sprites()
    make_honorball()
    # make_backgrounds() REMOVED — the real PokeChill backgrounds are required
    # make_backgrounds()  # disabled at user request
    download_item_overrides()  # (idempotent) mandated-source sprites
    # make_unknown_item() REMOVED — no more generic placeholder
    make_unknown_item()
    download_base_assets()  # secret bases: Emerald 2D (phase 33/34)
    for helper_script in ['tools/repair-fonts.py', 'tools/repair-tm-sprites.py', 'tools/fetch-item-sprites.py', 'tools/fix_missing_assets.py']:
        try:
            import subprocess, sys
            subprocess.run([sys.executable or 'python3', helper_script], cwd=ROOT, timeout=120)
        except Exception as e:
            print(f'{helper_script}: ignoré ({e})')

    existing = sum(1 for p in (ROOT / 'src/assets/images').rglob('*') if p.is_file())
    print(f'Downloaded/existing assets: {ok}/{len(jobs)} upstream jobs')
    print(f'Generated fallbacks/missing upstream: {len(failed)}')
    print(f'Total image assets present: {existing}')
    print(f'Done in {time.time() - started:.1f}s')


if __name__ == '__main__':
    main()




