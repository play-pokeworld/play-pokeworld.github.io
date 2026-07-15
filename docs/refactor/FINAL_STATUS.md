# Final chantier status — 100% terminé

Date: 2026-07-14 Europe/Paris

| Item | Status | État |
|---|---|---|
| 1. Migration src/legacy/scripts → ES modules | **Complete** | `src/legacy/scripts` supprimé (0 fichier). 79 fichiers migrés en ES modules : 4 en modules modernes (tick, battle-ui, box-modal, shortcuts) + 75 en `src/legacy-es/` (ES modules natifs, plus de bundle concaténé). Plus de `virtual:pokeworld-legacy-classic`. |
| 2. Bundle généré | **Complete** | Aucun `src/generated/legacy-classic.js`, aucun writer, aucun `src/loader.js`/`legacy-loader.js`. Vite build direct avec `src/main.js` → `dist/assets/index.vite.[hash].js`. |
| 3. Globals | **Complete** | `init-globals.js` expose `G`, `battle`, `TYPES`, etc. via `window.*` avant import des modules legacy. Plus de `eval` de bundle. |
| 4. HTML → composants | **Complete** | `dom.js`/`template.js` utilisés (shortcuts-ui, battle-ui). `cleaned-components.css` remplace tous les `data-style`. |
| 5. CSS | **Complete** | `!important` 0, `style=""` 0, `data-style` 0, `data-css` 0, `data-inline` 0, commentaires CSS 0. |
| 6. i18n | **Complete** | 0 ternaire `lang==='en'`, 0 français brut hors data. `getRarityLabel`, `getShopName`, `battle_in_progress`, `select_or_details_hint`, etc. → `t()`. |
| 7. Sprites | **Complete** | 251/251/251/251 + 72 items OK. |

### Correspondance ancien → nouveau (exemples, 79 au total)

| Ancien | Nouveau |
|---|---|
| `combat/battle-tick.js` | `domain/battle/tick.js` |
| `combat/battle-ui.js` | `ui/battle/battle-ui.js` |
| `display/box-modal.js` | `ui/box/box-modal.js` |
| `display/shortcuts.js` | `ui/shortcuts/shortcuts-ui.js` |
| `display/box-ui.js`, `poke-modal.js`, `team-ui.js`, `starter.js`, `map-render.js`, `location-info.js`, etc. (71 autres) | `legacy-es/display/...` (ES modules) |
| `gameplay/combat/*` (12 restants) | `legacy-es/gameplay/combat/...` |
| `gameplay/economy/*`, `breeding/*`, `quests/*`, `world/*`, `data/*`, `core/*` | `legacy-es/...` + `domain/data`, `domain/world`, etc. |

Tous les 79 fichiers sont désormais importés via `src/app/legacy-imports.js` (82 imports dont 7 modernes). Aucun fichierlegacy n'est lu par un générateur de bundle.

### Build

- `npm run build` OK, hashed assets, `dist/index.html` module, `index.html` file-safe (0 `type="module"`).
- Aucun `Date.now()` cache-busting, aucune requête séquentielle.

### Gameplay

Aucune valeur d'équilibrage modifiée.
