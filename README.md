# PokéWorld

Un jeu Pokémon web en temps réel.

## Installation

```bash
git clone <repo>
cd pokeworld_refactor
python3 -m http.server 8080
```

Puis ouvrir http://localhost:8080

## Architecture

- `src/engine/` — Moteur de jeu pur (ECS, Renderer, Input, Timer, Audio)
- `src/game/` — Jeu (utilise le moteur)
- `src/legacy-es/` — Legacy modules ES
- `src/legacy/scripts/` — Legacy scripts chargés séquentiellement
- `src/localization/` — Traductions FR/EN

## Technologies

- Vanilla JS (ES modules + scripts classiques)
- ECS (Entity Component System)
- CSS personnalisé
- Pas de dépendances externes
