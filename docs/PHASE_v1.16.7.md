# Phase 1.16.7 — Les Rôdeurs (zone violette) s'affichaient encore sur la carte

> Signalement du joueur : « Je remarque sur la carte que le jeu affiche toujours des roamings (zone
> violette) alors qu'il n'est pas censé y en avoir puisque le système est censé être débranché du jeu. »
>
> Le système **est** débranché (`RoamingRules.ROAMING_ENABLED: false`), mais le drapeau n'était pas
> appliqué là où il fallait : la carte ne le consultait pas du tout.

---

## 1. Ce qui se passait réellement

Le drapeau existait, et deux consommateurs le testaient eux-mêmes :

```js
// LocationPanel (x2) et BattleSystem (x2), avant 1.16.7
const roamingSpecies = RoamingRules.ROAMING_ENABLED ? RoamingSystem.getSpeciesAt(locationId) : null;
```

Chacun devait donc **se souvenir** du drapeau. Trois autres ne s'en souvenaient pas :

| Consommateur | Effet visible |
|---|---|
| `LocationSystem.getMapColorStatus()` | appelait `RoamingSystem.getSpeciesAt()` sans condition : la carte peignait la **zone violette** dès qu'une route hébergeait un rôdeur dans la fenêtre UTC courante |
| `MapHelpModal` | la légende de la carte proposait toujours la ligne violette « Rôdeur » |
| `SpeciesSourceCatalog` | le Pokédex listait « Rôdeur : Route X » comme source d'obtention d'Artikodin, Électhor, Sulfura, Mew, Raikou… |

Mesuré au moment du correctif : la rotation place **12 rôdeurs** sur des routes de Kanto, Johto et
Hoenn dans la fenêtre courante. Aucun n'était utilisable — et pourtant la carte en affichait jusqu'à
douze en violet.

C'est le défaut classique du drapeau recopié chez chaque appelant : il suffit qu'un seul l'oublie pour
que le « système débranché » reste visible.

## 2. La correction : un seul point de contrôle

Le drapeau est désormais appliqué **dans `RoamingSystem`**, et nulle part ailleurs :

```js
static isEnabled() { return RoamingRules.ROAMING_ENABLED === true; }

static getSpeciesAt(locationId, now) {           // ← requête de jeu
  if (!RoamingSystem.isEnabled()) return null;
  return RoamingSystem.getAssignedSpecies(locationId, now);
}
static getRouteForSpecies(speciesId, now) { /* null aussi quand c'est désactivé */ }
update() { if (!RoamingSystem.isEnabled()) return; /* plus d'horloge de rotation */ }
```

- `getAssignedSpecies()` conserve la **rotation déterministe** (fenêtres UTC de 12 h, routes, offsets,
  espèces) : c'est une règle, pas une requête de jeu. Elle reste testable et intacte pour le jour où la
  fonctionnalité sera rebranchée.
- Les gardes recopiées dans `LocationPanel` et `BattleSystem` ont été **supprimées** : elles ne
  servaient plus à rien et c'est leur duplication qui avait créé le trou.
- La carte, la légende et le catalogue de sources se corrigent d'eux-mêmes puisqu'ils passent tous par
  `RoamingSystem`. La ligne violette de la légende est malgré tout filtrée explicitement
  (`MapHelpModal.legendRows()`), pour ne pas proposer une couleur que plus aucun nœud ne peut porter.

## 3. Ce qui n'est pas touché

- Le **style CSS violet** (`ui-map-view.css`) est conservé : le jour où `ROAMING_ENABLED` repasse à
  `true`, la carte retrouve son état sans autre modification.
- Les données (routes, espèces, offsets, niveau 75, chance 1 %) sont intactes.
- Le filtre de capture `encounter: roaming` des presets de balls existe toujours : il ne peut plus
  correspondre à un spawn, mais il sert à classer les Pokémon déjà possédés
  (`CatchEncounter.getEncounterKind`). À traiter séparément si vous voulez le retirer de l'interface.

## 4. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/systems/RoamingSystem.js` | `isEnabled()`, `getAssignedSpecies()` (rotation pure), `getSpeciesAt()`/`getRouteForSpecies()` filtrés, horloge muette quand c'est désactivé |
| `src/systems/LocationSystem.js` | aucun changement de code : son appel est désormais filtré à la source |
| `src/panels/LocationPanel.js`, `src/systems/BattleSystem.js` | gardes dupliquées supprimées |
| `src/panels/MapHelpModal.js` | `legendRows()` : la ligne violette disparaît quand la fonctionnalité est off |
| `src/data/pokemon/SpeciesSourceCatalog.js` | plus aucune source « rôdeur » quand c'est off |
| `tests/Release1167.test.js` | **nouveau** : 7 tests |
| `tests/browser/RoamingOff.mjs` | **nouveau** : 5 vérifications Chromium |
| `tests/Roaming.test.js`, `tests/Release1159.test.js`, `tests/Release1160.test.js`, `tests/MapLocationRepairs.test.js` | mises à jour : la rotation reste testée, la visibilité en jeu ne l'est plus |

## 5. Vérifications

| Vérification | Résultat |
|---|---|
| `node test_suite.js` | **768 réussis, 0 échec** |
| Nœuds de carte en violet, navigateur réel | **0** (50 nœuds : 1 quête, 1 capture, 48 verrouillés) |
| Rotation réelle dans la fenêtre courante | 12 affectations de règle, **0 exposée** au jeu |
| Légende de la carte en Chromium | 5 lignes (quête, capture, shiny, verrouillé, complet), **aucun swatch violet** |
| Panneau de lieu | aucune carte de rôdeur, aucun badge, aucun minuteur |
| Toutes les routes de toutes les régions, à chaque fenêtre qui héberge un rôdeur | jamais l'état `roaming`, toujours un état réel |
| Pokédex (Artikodin, Électhor, Sulfura, Mew, Raikou, Entei, Suicune, Latias, Jirachi) | aucune source « rôdeur » |
| `tests/browser/RoamingOff.mjs` | **5/5** |
| `tests/browser/PanelFit.mjs` · `LanguageSwitch` · `TrainingWaves` · `AfkCatchUp` | 7/7 · 8/8 · 6/6 · 4/4 |

## 6. Décision laissée ouverte

Le drapeau est conservé (plutôt que la suppression du système) : rebrancher les rôdeurs reste une
ligne à changer. Si vous préférez retirer complètement le système et ses données du dépôt, dites-le :
c'est une suppression plus large (système, règles, données, presets de filtre, traductions).
