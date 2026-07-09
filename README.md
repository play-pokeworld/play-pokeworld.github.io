# PokéWorld

Jeu Pokémon idle/exploration (Kanto + Johto) — combat temps réel style PokéChill,
quêtes, élevage, mine, économie, 251 Pokémon.

## Structure du projet

```
pokeworld/
├── index.html              → HTML léger (378 lignes), charge tout via src/loader.js
├── src/
│   ├── loader.js           → charge les 106 modules dans l'ordre de dépendance
│   ├── assets/
│   │   ├── css/style.css   → tous les styles
│   │   ├── images/         → sprites Pokémon + objets (1074 PNG téléchargés)
│   │   └── sounds/
│   ├── localization/       → TOUS les textes du jeu (zéro texte en dur dans le code)
│   │   ├── i18n.js         → moteur (t(), tr(), getPokeName, getLocName...)
│   │   ├── data.js         → fusionne les modules fr/ et en/ en globals
│   │   ├── fr/             → 15 fichiers (ui, economy, combat, stats, pokedex,
│   │   │                      items, talents, shops, champions, lore, quests,
│   │   │                      npc, messages, pokemon-names, locations)
│   │   └── en/             → 15 fichiers (même structure)
│   └── scripts/
│       ├── core/           → state, event-bus, util, pokemon-factory
│       ├── data/           → 22 fichiers (items, talents, locations, shops,
│       │                      champions, quests, moves, sprites, helpers...)
│       ├── display/        → 17 fichiers (map, dashboard, team-ui, poke-modal,
│       │                      starter, exploration, box-ui, tabs, region...)
│       └── gameplay/
│           ├── world/      → world, collection, team
│           ├── quests/     → quest-core, quest-ui
│           ├── economy/    → mine, mine-ui, inventory, inventory-actions,
│           │               shop, market, pokedex
│           ├── combat/     → battle-init, battle-tick, battle-attack,
│           │               battle-status, battle-ui, battle-team-ui,
│           │               battle-flow, battle-switch, battle-summary,
│           │               progression, catch, training, move-learning
│           ├── breeding/   → hatchery, hatchery-ui
│           ├── automation/ → automation
│           ├── boxes/      → box-selector
│           └── save/       → save, save-extras, settings
└── tool/
    └── download_sprites.bat → re-télécharger les sprites (PokeAPI)
```

## Lancement

```bash
# Nécessite un serveur local (les modules JS sont chargés en externe)
python3 -m http.server 8000
# Ouvrir http://localhost:8000/
```

## Localisation

Tous les textes passent par le système `localization/`. Aucun texte n'est codé en dur.
- `t("clé")` → texte simple
- `tr("clé", {param: valeur})` → texte avec interpolation `{param}`
- `getPokeName(id)`, `getMoveName(id)`, `getLocName(id)`, `getItemName(key)`,
  `getTalentName(tal)`, `getLore(loc)`, `getNpc(loc, idx)`, `getQuestText(cat, id)`

Pour ajouter une langue : créer un dossier `localization/<lang>/` avec les mêmes fichiers.
