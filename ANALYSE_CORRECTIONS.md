# PokéWorld — analyse et corrections

## État initial constaté

Le fichier `code2prompt (12).txt` a été réassemblé en projet `pokeworld_refactor/` selon la structure annoncée.

Problèmes majeurs trouvés :

1. **Projet incomplet côté architecture moderne**  
   Les tests référencent `src/core`, `src/domain` et `src/application`, mais ces dossiers/modules n'étaient pas présents dans l'archive texte.

2. **Scripts npm cassés**  
   `package.json` appelait plusieurs outils inexistants : `tools/ensure-modern-boundaries.mjs`, `generate-vite-index.mjs`, `copy-static-assets.mjs`, etc. Le build échouait immédiatement.

3. **Configuration Vite invalide**  
   `vite.config.js` pointait vers `index.vite.html`, absent du projet.

4. **Affichage non unifié**  
   - `pw-unified.css` existait mais n'était pas chargé dans `index.html`.
   - Les composants `Components.js`, `PokeCore`, `Panel`, `Button`, `Sprite` mélangeaient classes globales, styles inline et classes legacy.
   - Plusieurs widgets contournaient les primitives UI (`hbtn`, panels, badges, sprites).

5. **Données / textes encore écrits en dur**  
   Audit après correction :
   - 251 chaînes statiques candidates restantes dans le DOM / JS legacy.
   - Les principaux écrans statiques ont maintenant des bindings i18n ajoutés au runtime : réglages, sauvegarde, debug, victoire, résumé, recherche.
   - Une migration exhaustive de toutes les chaînes legacy reste possible, mais elle nécessiterait une passe fonctionnelle par écran.

6. **Assets manquants**  
   Les sprites Pokémon, objets, dresseurs, profils, cartes et fonds n'étaient pas présents après réassemblage.

## Corrections réalisées

### Reconstruction et assets

- Réassemblage des 195 fichiers depuis le `.txt`.
- Téléchargement/recréation des assets :
  - Pokémon générations 1–2 : `front`, `back`, `frontShiny`, `backShiny`.
  - Items référencés par `ITEM_SPRITE_DATA`.
  - Sprites de dresseurs/NPC depuis Pokéclicker.
  - Profils de dresseurs `trainer-0.png` à `trainer-100.png`.
  - Cartes `kanto.png`, `johto.png` et fonds `main-bg.png`, `empty.jpg`, `forest.png`.
- Vérification : **1075 références d'images détectées, 0 manquante**.

### Architecture / moteur

Ajout des modules modernes nécessaires :

- `src/core/event-bus.js`
- `src/core/html.js`
- `src/core/random.js`
- `src/core/performance.js`
- `src/core/save-compatibility.js`
- `src/core/timer-registry.js`
- `src/domain/battle/type-system.js`
- `src/domain/battle/damage.js`
- `src/domain/battle/tick.js`
- `src/domain/economy/market.js`
- `src/domain/world/route-events.js`
- `src/domain/game/initial-state.js`
- `src/application/game-session.js`
- `src/application/runtime.js`
- `src/application/runtime-access.js`

Ces modules restaurent une séparation minimale : core / domain / application.

### UI / rendu unifié

- Ajout du chargement de `src/assets/styles/pw-unified.css` dans `index.html`.
- Ajout d'une couche CSS finale d'unification :
  - panels,
  - fenêtres,
  - modales,
  - boutons,
  - badges,
  - sprites,
  - lignes d'information.
- Correction de `PokeCore.spriteUrl.pokemon()` pour utiliser `SPRITE_DATA` et les buckets corrects `front`, `back`, `frontShiny`, `backShiny`.
- Correction du chemin shiny incorrect (`pokemon/shiny/` -> `pokemon/frontShiny/`).
- Correction des badges `PokeCore.badge` pour utiliser classes + `data-type-color` au lieu de styles inline.
- Correction de bugs dans `sprite-helpers.js` : variables non définies dans les warnings (`bucket`, `id`, `num`) et résolution DEX plus sûre.
- Amélioration de `Components.js` :
  - boutons générés avec `poke-btn`,
  - panels/sections/info rows via classes unifiées,
  - progress bars via `data-pct`,
  - badges types via classes et `data-type-color`,
  - échappement HTML de base.

### Localisation

- Extension de `updateI18nLabels()` pour gérer :
  - `data-i18n`,
  - `data-i18n-placeholder`,
  - `data-i18n-aria-label`,
  - `data-i18n-title`.
- Ajout de clés FR/EN pour les zones statiques restantes principales.
- Ajout de bindings i18n runtime dans `file-postboot.js` pour éviter de modifier lourdement le HTML legacy.

### Outils

Ajout de :

- `tools/download_assets.py` : télécharge/recrée les assets du jeu.
- `tools/audit_project.py` : audit des assets, styles inline et textes candidats.
- `tools/validate-project.mjs` : validation minimale de structure.

### Scripts npm corrigés

`package.json` a été simplifié :

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm test`
- `npm run validate`
- `npm run check`
- `npm run download:assets`
- `npm run audit`

## Validation

Commandes exécutées :

```bash
npm run check
```

Résultat :

- Validation structure : OK
- Build Vite : OK
- Tests Node : **30/30 OK**
- Audit assets : **0 image manquante**

Note : Vite signale que les scripts classiques `src/file-preflight.js`, `src/loader.js`, `src/file-postboot.js` ne sont pas bundlés car ils ne sont pas en `type="module"`. Ce n'est pas bloquant pour le mode actuel du projet : le jeu fonctionne comme application legacy servie par Vite/local server.

## Passe 2 (retours console + unification visuelle)

### Corrections console

1. **Police WinkySans corrompue** (`Failed to decode downloaded font`, `OTS parsing error: GSUB`)  \n   Le fichier réassemblé était invalide (offset de table tronqué). Remplacé par la vraie police `WinkySans-Regular.ttf` (dépôt typofactur/winkysans), validée par PIL (`('Winky Sans', 'Regular')`).

2. **`Unsafe attempt to load URL … file: URLs are treated as unique security origins`**  \n   Cause racine : `style.css` utilisait `filter: url(#silhouette-filter)` et `filter: url(#silhouette-filter-light)` pour les silhouettes du Pokédex. Une URL de fragment seule se résout contre `index.html`, que Chrome bloque en `file://`.  \n   Remplacé par des filtres CSS purs : `brightness(0) saturate(0.25)` (inconnu) / `brightness(0.42) saturate(0)` (vu). Les classes `.silhouette-filtered` / `.silhouette-img` (émises par `sprite-helpers.js` mais sans règle CSS) ont reçu le même traitement dans `pw-unified.css`.

3. **~400 × `ERR_FILE_NOT_FOUND` sur `src/assets/images/items/*.png`**  \n   `getItemSpriteUrl()` génère dynamiquement le chemin de 290 objets mais seulement 85 fichiers existaient. L'outil `tools/fix_missing_assets.py` récupère les sprites depuis plusieurs sources (PokeAPI, sprites `--bag` pour les Z-cristaux, pokeclicker pour les objets récents, Bulbagarden pour 6 objets Sw/Sh, recolorations PIL pour 6 objets custom).  \n   Résultat : **290/290 objets couverts, 216 PNG valides** (vérifiés par PIL).

### Migration i18n (reprise des chaînes en dur)

- `index.html` : **73 attributs `data-i18n` / `data-i18n-placeholder` / `data-i18n-aria-label`** posés (réglages, thème, sauvegarde, onglets mobile, tri USM, carte, debug, victoire, message de bienvenue, bouton Quitter le combat…).  \n  Corrigé au passage : le binding runtime `#win-mine .win-header-title` écrasait tout le header de la fenêtre Mine (drag-handles + icône supprimés à chaque `updateI18nLabels()`), il cible désormais `#mine-win-title`.
- **+63 clés** dans `fr/ui.js` et `en/ui.js` (2 doublons préexistants dédupliqués) : navigation mobile, tri, régions Hoenn/Sinnoh, libellés d'objets, tutoriel complet (5 étapes : `how`, `actionLabel`, `rewardText`) et **guide complet** (10 sections, ~55 pages : descriptions migrées vers `guide_*_desc`, réutilisant les clés existantes quand elles existaient déjà).
- JS migré : `tutorial.js`, `map-logic.js`, `battle-switch.js`, `training.js`, `hatchery.js`, `hatchery-ui.js`, `shop.js`, `mine.js`, `location-info.js`, `inventory.js`, `poke-modal.js` ("Base Stats"), `InfoPanel.js` (les deux copies alignées sur les mêmes clés `cat_*`), `items-helpers.js` ("Où trouver", "Puissance").
- Outil réutilisable : `tools/migrate_tutorial_i18n.py` (idempotent, vérifie chaque remplacement).
- Les descriptions d'objets/talents/Pokédex (`items-data.js`, `talents-data.js`, `pokedex-flavor.js`) restent du **contenu** FR : elles sont hors périmètre des libellés UI (équivalent à des données par langue).

### Suppression des styles inline

- 56 sites `style="` réels réduits à **0 style statique** : les valeurs statiques partent en `data-style` (extraites en classes `pw-runtime-*` par `file-postboot.js`), les valeurs dynamiques deviennent des **variables CSS** (`style="--pb-w:…;--pb-h:…"` + `data-style="…var(--pb-w)…"`).
- Nouvelles variables : `--ip-*` (InfoPanel), `--pb-*` (ProgressBar), `--badge-*`, `--sp-*`, `--ii-*`, `--pw-t-*` (Text), `--pm-note-*`, `--pw-modal-w`. Seuls ces `style="--var:…"` subsistent — la forme cible demandée.
- Bug HTML corrigé dans `talents-full.js` : 6 balises `()</span>` écrites `()<span>`.
- Helpers CSS ajoutés : `.pw-img-pixelated`, `.pw-text-shadow`, `.poke-progressbar(-fill/-text)`.
- Outil réutilisable : `tools/migrate_inline_styles.py`.

### Unification visuelle stricte

- **En-tête canonique identique** (48 px, gradient, bordure, typo) sur tous les panneaux non déplaçables : `.modal-title`, `.pw-modal-header`, `#fs-panel-header`, `.management-title`, `.poke-detail-title`. Les fenêtres déplaçables (`.win-header`, 44 px + grip ⠿) restent volontairement distinctes.
- **Largeurs canoniques** : `--pw-panel-w-info: 360px` (panneaux d'info attaque/objet/talent — désormais tous identiques via `pwModalInfo()`), `--pw-panel-w-md: 560px` (réglages…), `--pw-panel-w-lg: 860px` (détail Pokémon). `window.pwModalInfo(on)` centralise le basculement du `#poke-modal` partagé.
- `.modal-close` uniforme (34×34, hover rouge, fallback `✕`).

### Vérifications finale passe 2

```bash
npm run check   # validate: OK — build: OK — tests: 30/30 OK
python3 tools/audit_project.py   # 0 image manquante
node --check    # tous les fichiers JS modifiés : OK
```

## Passe 3 (intégrité des attaques au chargement + panneaux d'info unifiés)

### 1. Normalisation des attaques au chargement d'une sauvegarde

Problème : sur une sauvegarde ancienne, un Pokémon pouvait ne pas avoir toutes les attaques de son niveau, ou en posséder en trop.

`migrateSinglePokemon()` (`src/game/save/save.js`) réécrit, appliqué à tous les emplacements déjà itérés par `migratePokemonData()` (équipe, collection/boîtes, couveuse, slots d'entraînement) :

- **1/1b** : attaques vides → remplies via `getMovesForLevel()` ; format string legacy converti en `{id}` (marque désormais `changed` pour que la correction soit persistée).
- **2** : ids camelCase → snake_case.
- **3a** : retrait des attaques corrompues (absentes de `MOVES`).
- **3b** : ensemble `ctMoveSet` construit depuis `window.ITEMS` (disques CT/CS) — une attaque associée à un disque est considérée légitime, car les CT consommées à l'apprentissage ne sont pas traçables.
- **3c** : retrait des attaques « en trop » (hors pool légal de l'espèce `getSpeciesFullLearnablePool()` = niveau + entraînement, ET hors CT/CS). Critère volontairement conservateur : aucun choix légitime (CT, entraînement, apprentissage manuel via `learnMove`) n'est détruit.
- **3d** : dédoublonnage (première occurrence conservée).
- **3e** : complétion des attaques « manquantes » depuis `getMovesForLevel(id, level)` dans la limite des 4 slots.
- **3f** : garde-fou — toujours au moins une attaque.
- Suppression de l'ancienne étape de tri par puissance + troncature à 4 aux niveaux 10/20/30/50/100, qui écrasait les choix du joueur.

### 2. Navigation contextuelle des panneaux d'info

Problème : la croix ✕ et le bouton retour des panneaux d'info (attaque/objet/talent) fermaient tout au lieu de ramener au menu d'origine, et le libellé du bouton ne s'adaptait pas.

Nouveau suivi de provenance (`src/file-preflight.js`) :

- `window._pwInfoSource` capturé à l'ouverture (`pwInfoCaptureSource`) : panneau plein écran courant (`window._fsCurrentPanel`, posé par `openFullscreenPanel`) ou fiche Pokémon (`window._pwPokeSheet`, posée par `renderPokemonDetailModal` : équipe ou boîte).
- `pwInfoBack()` : croix et bouton rouvrent le menu d'origine (panneau plein écran ou fiche Pokémon), sinon ferment le modal.
- `pwInfoBackLabel()` : libellé adapté via les clés `back_to_inventory` / `back_to_shop` / `back_to_market` / `back_to_pokedex` / `back_to_dictionary` / `back_to_guide` / `back_to_atoll` / `back_to_team` / `back_to_box` (ajoutées FR + EN, avec `affected_pokemon_lbl`).
- Action `data-action="pw-info-back"` câblée dans `file-preflight.js` et `file-postboot.js`.

### 3. Uniformisation des panneaux d'info

Problème : deux systèmes parallèles — les objets passaient par `ItemInfoPanel`/`PokePanel` (overlay propre, styles inline), attaques et talents par `#poke-modal` — d'où des dispositions incohérentes (certaines infos encadrées, d'autres non).

- `window.pwBuildInfoPanel(opts)` (`file-preflight.js`) = structure unique pour tous les panneaux d'info : en-tête icône + titre + sous-titre, **cartes de stats** (`.pw-info-stat-cards`), **sections encadrées** (`.pw-info-section`), **lignes clé/valeur** (`.pw-info-row-between`), bouton retour en bas.
- `openMoveInfo`, `openAbilityInfo` et `openItemInfo` réécrits sur ce builder ; la délégation `ItemInfoPanel`/`PokePanel` est supprimée — tous les panneaux d'info passent par le même `#poke-modal` unifié.
- **Ponts legacy neutralisés** : `_bridgeLegacy()` dans `src/engine/Game.js`, `src/engine/init.js` (chargé par `loader.js`) et leurs copies `src/game/Game.js` / `src/game/init.js` ré-encapsulaient `window.openItemInfo` pour rouvrir l'ancien `ItemInfoPanel`, ce qui aurait contourné l'unification — supprimé (avec le pont `showMoveInfo` → `MoveInfoPanel`, jamais appelé).
- CSS « passe 3 » ajouté à `pw-unified.css` (classes `.pw-info-*`).

### Vérifications passe 3

```bash
npm run check   # validate: OK — build: OK — tests: 42/42 OK
node --check    # tous les fichiers JS modifiés : OK
```

Nouveau fichier `tests/save-move-normalization.test.js` : extraction isolée de `migrateSinglePokemon` (contexte `vm` + mocks) — attaques manquantes complétées, attaques impossibles retirées, CT/CS et coups d'entraînement conservés, dédoublonnage, strings legacy et camelCase convertis, pokémon sain inchangé (ni tri ni troncature), garde-fou final.

## Passe 4 (movepool des anciennes saves + retour contextuel fiche + assets réels)

### 1. Normalisation du *movepool* (attaques apprises) au chargement

Constate : les anciennes saves PokeChill portent, par Pokémon, `moves` (équipées) **et `movepool`** (attaques apprises). La passe 3 ne normalisait que `moves`.

`migrateSinglePokemon()` complétée (étape **3g**) :

- Le champ `p.movepool` **ou** `p.learnableMoves` (si présent sous forme de liste) est normalisé avec les mêmes règles que les attaques courantes : conversion camelCase → snake_case, retrait des attaques absentes de `MOVES`, retrait des attaques « en trop » (hors pool légal de l'espèce ET hors CT/CS), dédoublonnage.
- **Attaques de niveau manquantes** : placées dans les attaques courantes **uniquement s'il y a moins de 4** ; le reste va dans le `movepool` (créé seulement si nécessaire). La liste apprise stocke les ids sous forme de chaînes (convention PokeChill).

### 2. Retour contextuel depuis une fiche Pokémon

Cause racine trouvée : dans `installRobustClickFallback()` (`file-preflight.js`), tout clic sur `.modal-close` était intercepté **avant** le système d'actions par `closeNearestModal()` — la croix ✕ fermait donc aveuglément le modal (d'où le « retour à l'équipe/la boîte » visible derrière) et `pw-info-back` ne s'exécutait jamais. Le bouton du bas, lui, passait bien (c'est pourquoi le symptôme semblait aléatoire).

- `.modal-close` **avec** `data-action` passe désormais par `runAction` (retour contextuel) ; fermeture générique inchangée sans `data-action`.
- Les lignes d'attaques de la fiche (`pokemonDetailMoveRows`, panneau « Learnable Moves ») transmettent désormais leur **contexte explicite** via `data-context-args` (`openMoveInfo(moveId, idx, boxId)`) et `openMoveInfo` l'honore en priorité sur la déduction ambiante — le retour rouvre toujours **la fiche Pokémon d'origine** (équipe ou boîte), quel que soit l'état des traces implicites.

### 3. Panneau d'info d'attaque : mise en page

- **Puissance et Catégorie sur la même ligne** (2 cartes, grille `auto-fit`).
- **Précision retirée** : `mv.acc` est absent de toutes les données d'attaques (`MOVES`), donc toujours replacé par 100 dans le moteur — l'info n'avait aucune valeur.

### 4. Assets réels (avec ordre de priorité des sources)

Constate : cartes `kanto`/`johto` et 3 backgrounds étaient des placeholders PIL abstraits ; 7 cartes de régions (`spriteUrl.map(region)`) et `items/unknown.png` étaient absents — l'audit statique ne voyait pas ces chemins dynamiques.

- **Cartes des 9 régions** : vraies cartes téléchargées depuis le **GitHub Pokéclicker** (`kanto-kanto`, `johto`, `hoenn`, `sinnoh`, `unova`, `kalos`, `galar-south`) ; **Paldea** depuis **Poképédia** (officielle ÉV — Pokéclicker n'a que « NO MAP YET ») ; **Alola** = collage 2×2 des 4 îles Pokéclicker (fond océan commun). (PokeChill, priorité 1, n'a des cartes que pour des événements internes, pas pour les régions.)
- **Backgrounds** : vrais `main-bg.png`, `empty.jpg`, `forest.png` du **GitHub PokeChill** (le jeu d'origine), remplaçant les placeholders.
- **Objets** : `items/unknown.png` (sprite générique pour clé d'objet inconnue) généré dans la convention de l'outil ; vérification exhaustive faite — aucun autre objet ne manque (290/290 + TM/CS).
- **Pérennité** : `tools/download_assets.py` contient désormais **tous les liens** (`REGION_MAPS`, `ALOLA_TILES`, `BACKGROUNDS`, ordre de priorité documenté) et régénère tout (replis PIL conservés) ; `tools/audit_project.py` compte aussi les références dynamiques (régions + `unknown.png`). Aucune image prise au hasard du web (images non officielles/modifiées exclues, comme demandé).

### Vérifications passe 4

```bash
npm run check              # validate: OK — build: OK — tests: 60/60 OK
python3 tools/audit_project.py   # 1083 références (incl. cartes dynamiques) — 0 manquante
```

Nouveau test `tests/info-panel-navigation.test.js` (10 tests) : extraction vm de `pwInfoBack`/`pwBuildInfoPanel` (retour fs/équipe/boîte, fermeture, libellés) + contrats de régression (croix routée par `runAction`, contexte explicite des fiches, Précision retirée, movepool pris en charge).

## Passe 5 — retours utilisateur (24/07/2026, soir)

### 1. Movepool : Pokémon niveau 100 sans attaques apprenables

Cause racine : en passe 4, les attaques de niveau manquantes étaient calculées via `getMovesForLevel(nid, level)`, dont le top-4 (≤ niveau) coïncide exactement avec les 4 attaques courantes d'un Pokémon sain — il ne restait donc **jamais rien** à placer dans le `movepool`, qui n'existait par ailleurs dans aucun code du fork (champ hérité des anciennes saves PokeChill, non stocké au-delà du top-4).

- L'étape 3g de `migrateSinglePokemon` (`src/game/save/save.js`) part désormais du **pool de niveau complet** de l'espèce (`getSpeciesMovePool`, ~15 attaques), filtré par validité `MOVES`, hors attaques déjà courantes.
- **Gating par niveau** : une attaque du pool n'est débloquée que si `getMoveLearnLevel(nid, id) ≤ niveau` du Pokémon (quand l'info existe) — les attaques apprises plus tard restent à débloquer en jeu.
- Un `movepool`/`learnableMoves` existant est **complété** (nettoyage + ajouts dédupliqués) ; `p.movepool` n'est créé que s'il reste des attaques. Résultat : un Pokémon niveau 100 d'ancienne save retrouve toutes ses attaques de niveau dans les attaques apprenables.

### 2. Navigation : retour depuis un panneau d'info d'attaque renvoyait à l'équipe/la boîte

Cause racine (plus profonde que la passe 4) : `callGlobal` est défini **dans l'IIFE** de `src/file-preflight.js` et n'était **jamais exposé sur `window`** ; `pwInfoBack` (défini après l'IIFE) jetait donc un `ReferenceError`, silencieusement absorbé par son propre `try/catch`, et retombait sur une fermeture aveugle du modal — l'équipe/la boîte visible « derrière ». Les tests vm de passe 4 passaient car leur stub fournissait `callGlobal`, ce qui masquait le bug.

- Correctif : `window.callGlobal = callGlobal;` exposé dans l'IIFE (avec commentaire) ; test de non-régression ajouté vérifiant que le source contient bien l'exposition (`tests/info-panel-navigation.test.js`, 11 tests).

### 3. Cartes : Alola non fusionnée, Galar en deux parties

- **Alola** : le collage 2×2 des 4 îles est abandonné — `maps/alola.png` = île **Mele-Mele seule** (Pokéclicker), non fusionnée.
- **Galar** : la carte est désormais en **deux parties** : `galar-north.png` (Toundra enneigée) empilée au-dessus de `galar-south.png` (continent) → `maps/galar.png` 1600×1920.
- `tools/download_assets.py` : `REGION_MAPS` accepte plusieurs URLs par région, **empilées verticalement** ; le cas particulier `ALOLA_TILES`/collage est supprimé.

### 4. Sprites d'objets corrigés (sources imposées)

| Fichier | Source | Remarque |
|---|---|---|
| `kings_rock.png` | **Pokéclicker** `items/evolution/Kings_rock.png` | |
| `upgrade.png` | **Pokéclicker** `items/evolution/Upgrade.png` | |
| `tm_<type>.png` (18) | **PokeChill** `img/items/tm<Type>.png` | disquettes officielles par type (camelCase côté PokeChill) |
| `berry.png` | **PokeChill** `img/items/berryOran.png` | PokeChill n'a **aucun** `berry.png` générique (vérifié : arbre complet du dépôt + historique Git) ; `berryOran.png` est sa baie « générique ». Fichier utilisé comme sprite de repli pour toute clé contenant `berry` (`itemIcon`). |
| `prine_berry.png` | **Pokéclicker** `items/berry/Lum.png` | La « Baie Prine » est le nom français **officiel** de la Lum Berry ; absente de PokeChill → source suivante de la liste (sprite officiel). |

Tous les liens sont centralisés dans `ITEM_OVERRIDES` de `tools/download_assets.py` (téléchargement idempotent, n'écrase jamais l'existant) — le problème ne peut plus se reproduire silencieusement.

### Vérifications passe 5

```bash
npm run check                  # validate: OK — build: OK — tests: 64/64 OK
python3 tools/audit_project.py # 1083 références — 0 manquante
# download_assets.py : idempotent (hashes inchangés au re-run)
```

---

## Passe 6 — retours utilisateur (24/07/2026, nuit)

### 1. Movepool : les attaques de niveau n'apparaissaient toujours pas — vraie cause racine

Le correctif de passe 5 agissait sur la **donnée** (`p.movepool` en migration), or **l'UI ne lit jamais `p.movepool`** : le panneau « attaques apprenables » est **calculé** par `learnableMoves(p)` = pool apprenable complet − attaques connues − **attaques verrouillées par le dressage** (`isMoveTrainingLocked`). Et `isMoveTrainingLocked` verrouillait **toutes** les attaques non connues sauf celles de `p.trainingUnlockedMoves` (dressage/CT) — le **niveau** n'entrait jamais en compte → un Pokémon niveau 100 d'ancienne save affichait une liste vide.

- **`isMoveTrainingLocked` honore désormais le niveau** (`training.js`) : une attaque du pool de niveau dont le niveau d'apprentissage (`getMoveLearnLevel`) est ≤ niveau du Pokémon compte comme *apprise par level-up* → non verrouillée → visible et apprenable depuis la fiche. Restent verrouillées : pool de niveau au-delà du niveau courant (level-up futur) et attaques hors pool (dressage/CT).
- **`getTrainableLockedMoves`** réutilise `isMoveTrainingLocked` : le dressage ne gaspille plus de déblocages sur des attaques déjà apprenables par niveau.
- Comportement résultant (cohérent pour toutes les saves, anciennes ou non) : niveau 100 → toutes les attaques de niveau apprenables ; niveau 20 → celles apprises ≤ niv 20 uniquement ; dressage/CT inchangés pour le reste.
- **Bonus découvert** : la fiche d'un Pokémon **en boîte PC** appelle `toggleBoxMoveSelect` / `learnBoxMove` via `data-call`, mais ces fonctions **n'ont jamais existé** → `callGlobal` no-op silencieux, l'apprentissage en boîte ne faisait strictement rien. Les deux sont implémentées dans `move-learning.js` (miroir de `toggleMoveSelect`/`learnMove`, avec `window.boxMoveReplaceSlot`) et exposées sur `window`.

### 2. Navigation : source « fantôme » + libellé du bouton retour

- **Bug** : après avoir vu puis fermé une fiche box, `window._pwPokeSheet` n'était jamais purgé → un panneau d'info d'attaque ouvert ensuite depuis la **fenêtre d'équipe** capturait cette fiche box fantôme, et le bouton retour rouvrait « l'info du dernier Pokémon vu dans la boîte » au lieu de revenir à l'écran de jeu. Correctifs :
  - `pwInfoCaptureSource` n'honore la fiche mémorisée que si `#poke-modal` est **réellement ouvert** (`classList.open`) ;
  - purge de `_pwPokeSheet` + `_pwInfoSource` sur les **trois** chemins de fermeture du modal (`closeNearestModal`, `close-poke-modal` preflight, `close-poke-modal` postboot).
- **Libellé** : le retour depuis une info ouverte sur une fiche Pokémon rouvre **la fiche** (pas la fenêtre équipe/box) — le bouton affiche donc désormais `back_to_pokemon` (« ← Retour au Pokémon », clé i18n déjà présente fr/en) au lieu de `back_to_team`/`back_to_box`. Les panneaux plein écran gardent leurs libellés (`back_to_inventory`, …).

### 3. Cartes : parties séparées, jamais fusionnées

- **Alola** = **4 fichiers séparés** (`alola-melemele.png`, `alola-akala.png`, `alola-ulaula.png`, `alola-poni.png`) et **Galar** = **2 fichiers séparés** (`galar-north.png`, `galar-south.png`), avec les noms exacts du dépôt Pokéclicker. Les versions fusionnées (`alola.png`, `galar.png`) sont supprimées.
- **Outil** : `REGION_MAPS` (listes empilables) remplacé par **`REGION_MAP_FILES`** — une entrée = un fichier enregistré tel quel, aucun code d'assemblage ne subsiste. `audit_project.py` vérifie chaque partie séparément.

### Vérifications passe 6

```bash
npm run check                  # validate: OK — build: OK — tests: 78/78 OK
python3 tools/audit_project.py # 1087 références — 0 manquante
# download_assets.py : idempotent (13 cartes, hashes inchangés au re-run)
```

Nouveau fichier de tests `tests/training-move-unlock.test.js` (9 tests : règle de niveau niveau 100/20, dressage au-delà du niveau, learnBoxMove ajout/remplacement, toggleBoxMoveSelect, contrats d'existence) ; `tests/info-panel-navigation.test.js` étendu (capture fantôme modal fermé, libellé back_to_pokemon, purge à la fermeture, clé i18n dans les deux locales).

---

## Passe 7 — retours utilisateur (25/07/2026)

### 1. Panneau « toutes les attaques apprenables » : indicateurs pas à jour

- **Résolution du Pokémon** : le panneau lisait la source ambiante `_POKEMODAL_SOURCE` (potentiellement obsolète) ; il utilise désormais en priorité `window._pwPokeSheet` — l'état de la fiche **réellement rendue**, fixé par `renderPokemonDetailModal` à chaque affichage (repli sur l'ancienne heuristique sinon).
- **Rafraîchissement en place** : le panneau porte un marqueur `data-learnable-panel` et mémorise son contexte (`window._pwLearnableCtx`) ; `refreshLearnableMovesPanelIfOpen()` le re-rend si et seulement s'il est ouvert. Appelé par : `learnMove` (ajout + remplacement), `forgetMove`, `learnBoxMove`, `unlockTrainingMove`, l'usage d'une CT/CS (`box-selector`) et `migratePokemonData` (ajouts du système de sauvegarde). Les ✓ « attaque apprise » et le compteur `n/total` se mettent donc à jour immédiatement après tout apprentissage ou ajout.

### 2. Navigation : pilules d'attaque des cartes équipe/combat

Bug : depuis la fenêtre d'équipe, un clic droit (contextmenu) sur la pilule d'une attaque ouvre l'info **pendant qu'une fiche Pokémon est encore ouverte derrière** — la déduction ambiante capturait cette fiche, et « retour »/croix rouvrait la fiche au lieu de simplement fermer le panneau.

- Les pilules d'attaque générées pour les **cartes** (`generatePokeCardHTML` dans `battle-team-ui.js`, moves auto `battle-ui.js`) passent désormais le **contexte explicite `-1`** (`data-context-args="'id',-1"`).
- `openMoveInfo` : `contextIdx < 0` = « pas de fiche » → `_pwInfoSource = null` → le bouton retour et la croix **ferment** simplement le panneau. `contextIdx >= 0` (lignes de la fiche équipe/box) : comportement inchangé, retour vers la fiche — validé par l'utilisateur.

### Vérifications passe 7

```bash
npm run check                  # validate: OK — build: OK — tests: 85/85 OK
python3 tools/audit_project.py # 1087 références — 0 manquante
```

Tests ajoutés : `openMoveInfo` extrait dans un vm avec stubs (idx=-1 → aucune source ; idx≥0 → fiche ; sans contexte → déduction ambiante) ; contrats de rafraîchissement du panneau (marqueur, priorité `_pwPokeSheet`, appels depuis learnMove/forgetMove/learnBoxMove/unlockTrainingMove/CT/migration, no-op si panneau fermé).

---

## Passe 8 — retours utilisateur (25/07/2026, matin)

### 1. Le panneau « attaques apprenables » s'ouvrait tout seul après un entraînement

Cause racine (introduit en passe 7) : le marqueur `data-learnable-panel` vit dans `#poke-modal-inner`, dont le contenu **survit à la fermeture** du modal (`classList.remove('open')` ne vide pas le HTML). Quand un entraînement d'attaque se terminait, `unlockTrainingMove` → `refreshLearnableMovesPanelIfOpen()` trouvait le marqueur résiduel et appelait `openLearnableMovesPanel()` — qui **ré-ajoute `open`** au modal : le panneau s'ouvrait spontanément.

- Correctif : le helper vérifie désormais d'abord que `#poke-modal` a **réellement la classe `open`** avant tout re-rendu (le marqueur seul ne suffit plus).

### 2. Indicateurs « attaque apprise » erronés / mauvais Pokémon dans le panneau

La résolution du Pokémon affiché reposait sur de l'ambiant (`_POKEMODAL_SOURCE`, passe 6-7) qui peut être périmé ou égaré quand `_pwPokeSheet` a été purgé (fermeture) — le panneau pouvait alors afficher un autre Pokémon (✓ qui ne bougent jamais, liste ne correspondant pas).

- Le bouton 📋 de la fiche passe désormais la **source explicite** (`'team',idx` / `'box','boxId'`) ; `openLearnableMovesPanel(idxOrBoxId, opts)` accepte aussi `opts.source` en premier ou en second argument ; le rafraîchissement rappelle avec `(ctx.id, {source: ctx.source})` — plus aucune déduction ambiante sur ce chemin.
- Le bouton 📋 est **masqué sur les fiches en lecture seule** (sinon il aurait ouvert `team[0]`, hors sujet).
- Ordre de résolution final : source explicite → fiche réellement rendue (`_pwPokeSheet`) → heuristique historique.

### Vérifications passe 8

```bash
npm run check                  # validate: OK — build: OK — tests: 89/89 OK
```

Tests ajoutés/maj : helper refresh (garde `contains('open')`, no-op modal fermé + marqueur résiduel, re-rendu `(id, {source})` quand ouvert) ; panneau (contrats bouton explicite + masquage readonly ; comportement vm : source `'box'` prime sur fiche équipe affichée, `opts.source:'team'` prime sur fiche box, repli fiche rendue conservé).

---

## Passe 9 — retours utilisateur (25/07/2026, matin)

### 1. Indicateur « attaque possédée » : les apprenables sont désormais prises en compte

Le panneau ne validait que les 4 attaques **équipées**. Or « possédée » au sens du joueur = équipée **ou apprenable maintenant** (débloquée par le niveau atteint, le dressage ou une CT). Le panneau calcule désormais `availSet = learnableMoves(p)` — **la même fonction que la fiche** — et affiche trois états :

- **Équipée** : pilule verte pleine « ✓ Équipée » (`is-known`) ;
- **Disponible** : pilule verte contour « ✓ Disponible » (`is-learnable`, nouveau style CSS) — toute attaque présente dans la liste « learnable moves » de la fiche ;
- **Verrouillée** : ligne estompée (`opacity .55`), sans pilule.

Le compteur d'en-tête devient « n/total **possédées** » (équipées + disponibles) au lieu de « connues » (équipées seules). Nouvelles clés i18n fr/en : `possessed_short`, `move_pill_equipped`, `move_pill_available`.

### 2. Emoji 📋 retiré des boutons de menu

Le bouton « Voir toutes les capacités » (fiche Pokémon) et la clé `view_all_learnable_moves` (fr + en) n'affichent plus l'emoji 📋 — texte seul.

### Vérifications passe 9

```bash
npm run check                  # validate: OK — build: OK — tests: 92/92 OK
```

Tests ajoutés : pilules Équipée/Disponible + verrouillées estompées + nouveau compteur (exécution vm réelle du panneau) ; contrats emoji 📋 retiré (bouton + deux locales) ; présence des nouvelles clés i18n.

---

## Passe 10 — retours utilisateur (25/07/2026)

### 1. Bouton reroll des quêtes répétables : texte brut « span class="ui-icon…" » pendant le timer

L'intervalle du compte à rebours affectait le label du bouton via `textContent` avec `getIcon()` — qui renvoie du **HTML** (`<span class="ui-icon…">`) : le markup s'affichait tel quel. Le timer met désormais à jour le bouton en `innerHTML` (icône + temps / icône + « Reroll » à expiration, bouton réactivé et action restaurée) ; le span du compte à rebours (texte pur) reste en `textContent`.

### 2. Entraînement : seules les attaques de la catégorie « dressage » sont proposables

Le dressage piochait dans le pool global de tous les moves apprenables (niveau + CT + dressage), donc le **nombre de moves** affiché et les moves proposables incluaient n'importe quoi. Nouvelle source unique dans `game-helpers.js` :

- `getCtCsMoveIds()` — moveIds portés par les objets CT/CS ;
- `getSpeciesTrainingOnlyPool(speciesId)` = pool apprenable complet **−** pool de niveau (`getMoveLearnLevel` ≠ 999) **−** attaques CT/CS.

Consommateurs alignés :
- `getTrainableLockedMoves` (`training.js`) ne propose que ce pool → `unlockTrainingMove`, jauges « Moves n » du panneau d'entraînement, dispo du mode dressage et liste de gestion n'offrent/comptent plus que la catégorie dressage ;
- la catégorie « Dressage » du panneau « attaques apprenables » (`poke-modal.js`) partage le même helper (la séparation niveau / CT / dressage y était déjà visuelle — désormais identique au moteur).
- Rappel design : pool de niveau → déblocage par level-up (passe 6) ; CT/CS → par usage de l'objet ; dressage → par l'entraînement. Chaque catégorie a son canal d'obtention.

### Vérifications passe 10

```bash
npm run check                  # validate: OK — build: OK — tests: 97/97 OK
```

Nouveau `tests/repeatable-quest-reroll.test.js` (contrat textContent→innerHTML + exécution vm du bloc de mise à jour : icône en HTML, temps affiché, réactivation à expiration) ; tests pool dressage (split niveau/CT/dressage en vm, `getTrainableLockedMoves` restreint, exports window).

---

## Passe 11 — retours utilisateur (25/07/2026)

### 1. Sac : le clic gauche sur un objet utilisable ouvrait la fiche d'info au lieu de la liste des Pokémon

`handleInventoryClick` (clic gauche d'un objet du sac) appelait `openItemInfo` pour **tous** les objets : impossible d'utiliser une CT, un objet d'évolution ou un Super Bonbon — on ne voyait que leur fiche. Introduit `isUsableBagItem(key)` dans `inventory.js` et routage :

- **utilisable** (CT/CS, pierre/objet d'évolution, bonbon, trésor) → `onInventoryClick(key)`, le flux d'usage existant (sélecteur de Pokémon pour enseigner une attaque / faire évoluer / Super Bonbon, écran de vente pour les trésors) ;
- **autres** (objets tenus, fossiles, objets clés…) → `openItemInfo(key)` inchangé ;
- la fiche d'info des objets utilisables reste accessible au **clic droit / appui long** (`data-context-call="openItemInfo"`), comme avant ;
- le mode équipement depuis l'équipe (`window._equipCallback`) garde la priorité absolue sur les deux branches.

### 2. Correctif collatéral : 28 CT déclarées sans `type` (ex. `ct_airshlash`)

Ces CT portent un `moveId` et une clé `ct_*` mais pas de `type:'ct'` : elles n'étaient reconnues nulle part comme CT (clic sans aucun effet, filtre du sac « Divers » au lieu de « CT / CS », et leurs attaques absentes de `getCtCsMoveIds` — donc proposables au **dressage** au lieu du canal CT/CS, contrairement au design de la passe 10). Nouveau prédicat partagé `isCtCsItem(key)` (`items-helpers.js`, exporté sur `window`) : `type ct/cs` **ou** `moveId` + clé préfixée `ct_`/`cs_` (vérifié sur les données réelles : aucun objet non-CT ne porte de `moveId`). Consommateurs alignés : `itemCat` (catégorie du sac), `isUsableBagItem` (routage du clic), `onInventoryClick` (branche CT/CS) et `getCtCsMoveIds` (canal CT/CS vs dressage). Bonus : `startLearnMoveCtCs` plantait sur ces CT (`itm.type.toUpperCase()` → `undefined.toUpperCase()`) — le suffixe du titre est désormais déduit de la clé (`CS` si `cs*`, sinon `CT`).

### Vérifications passe 11

```bash
npm run check                  # validate: OK — build: OK — tests: 112/112 OK
python3 tools/audit_project.py # 1087 références d'images, 0 manquante
```

Nouveau `tests/bag-item-usage.test.js` (15 tests, données d'objets réelles en vm) : routage du clic gauche par famille d'objet (CT/CS, évolution, bonbon, trésor → usage ; tenu/fossile/clé → info), priorité du mode équipement, objet inconnu sans effet, prédicat `isCtCsItem` sur les 3 formes, CT sans type routée + catégorisée + incluse dans `getCtCsMoveIds`, usage réel sans crash et titres `(CT)`/`(CS)` corrects.

---

## Passe 12 — retours utilisateur (25/07/2026)

### Pension

1. **Fossiles proposés pour les slots d'incubation** : la boîte PC ouverte depuis un slot en mode incubation (`hatchery_queue_N`) n'affichait pas l'onglet fossiles. Désormais `showFossilTab` inclut ce contexte (via le nouveau `hatcherySlotIsIncubation`), `renderFossilTabContent` transmet le slot cible au bouton « Incuber », et `sendFossilToHatchery(fossilKey, slotIdx)` vise ce slot (à défaut : premier slot vide en incubation, puis premier vide). Le coût d'incubation affiché utilise `hatcheryStepsForPokemon` au lieu du 15 en dur.

2. **Toggle de priorité Pokémon ↔ Fossile** (menu Gestion pension, slots en incubation) : nouveau champ `priority` ('pokemon' par défaut) dans la config d'automation du slot + bouton `toggleHatcherySlotPriority`. Le remplissage automatique (`fillHatcherySlotWithPriority`) tente le type priorisé puis **bascule automatiquement sur l'autre type** si épuisé — le toggle reflète alors le type réellement utilisé. L'ouverture du sélecteur d'un slot incubation avec priorité Fossile affiche directement l'onglet fossiles.

3. **Changement de mode différé** : passer un slot d'incubation en garderie alors qu'une incubation est en cours ne l'annule plus — la demande est mise en attente (`G.hatcheryPendingModes`) et appliquée une fois le slot vidé (éclosion), avec badge « → Garderie (fin incubation) » dans la carte de gestion ; re-cliquer annule l'attente. Slot vide → changement immédiat, comme avant.

4. **Auto-remplissage conditionnel** : `renderHatcheryWindow` et `addPokemonToHatcheryQueue` appelaient `processHatcheryQueue(true)` (forcé) — les slots **et** les files se remplissaient même avec le remplissage automatique désactivé (y compris après un changement de mode). Appels désormais non forcés : plus rien ne se remplit sans l'amélioration activée ; les placements manuels explicites restent immédiats.

### Sac

5. **Sélecteur CT/CS filtré** : n'apparaissent que les Pokémon éligibles qui n'ont **pas** la capacité dans leurs attaques courantes, ne l'ont **pas** déjà débloquée (`trainingUnlockedMoves`) et ne peuvent **pas** déjà l'apprendre à leur niveau (`getMoveLearnLevel`). Retour au sac quand la CT n'est plus en stock (guard dans `startLearnMoveCtCs`, au lieu de rouvrir le sélecteur sur un objet épuisé).

6. **« La plupart des CT ne peuvent pas être apprises »** — deux causes combinées :
   - **casse** : les movesets de MOVES sont en minuscules (`"grass"`) et les types des Pokémon capitalisés (`"Grass"`) → la comparaison ne matchait jamais hors movesets `all`. Comparaison désormais insensible à la casse (sélecteur + fallbacks `move-learning.js`/`training.js`), avec complément depuis `PD[id]` ;
   - **moveIds inexistants** : 6 CT pointaient vers des ids absents de MOVES. Alias ajoutés (`icebeam→ice_beam`, `hyperbeam→hyper_beam`, `solarbeam→solar_beam`, `shadowball→shadow_ball`) via `resolveCtCsMoveId` (partagé : sélecteur, enseignement, titre, sprite de TM, `getCtCsMoveIds`), et **`bodyslam` (Plaquage) / `doubleedge` (Damoclès) ajoutés à MOVES** — ils étaient aussi référencés par des équipes de champions/quêtes. Contrat de test : toutes les CT/CS résolvent vers un move existant.

7. **Bouton « Retour au sac »** dans les listes de Pokémon ouvertes depuis le sac (CT/CS, Super Bonbon) : footer du sélecteur avec action `close-selector-show-tab` → `inventory`, qui rouvre le panneau sac plein écran.

### Debug

8. **« Obtenir toutes les CS »** : la liste en dur contenait des clés périmées (`ct_toxic` → `ct06_toxic`…) et oubliait `cs01_cut`/`cs02_fly`. `debugGiveCtCs` construit désormais la liste dynamiquement depuis `ITEMS` + `isCtCsItem` : toujours à jour, robuste aux futurs renommages.

### Vérifications passe 12

```bash
npm run check                  # validate: OK — build: OK — tests: 146/146 OK
python3 tools/audit_project.py # 1087 références d'images, 0 manquante
```

Nouveaux `tests/hatchery-fossil-priority.test.js` (19 tests : mode différé + application à l'éclosion, annulation, refus <100, ciblage/préférence fossile, seed/consommation, priorité + bascules auto, auto-fill conditionnel, contrats sources, onglet fossile par défaut) et `tests/bag-ct-selector.test.js` (15 tests : compat casse/type2, alias, bodyslam/doubleedge, 3 exclusions, guard stock, bouton retour, debug dynamique sans clé morte, contrat « toute CT résout un move »).

---

## Passe 13 — retours utilisateur (25/07/2026)

### Pension (file mixte FIFO, priorité, couleurs)

1. **File d'attente mixte + FIFO strict** (reprend les points « liste de fossiles » et « le premier de la liste passe ») : une entrée de file est désormais un uid de Pokémon **ou** un fossile (`fossil:<clé>`). Le fossile n'est consommé du sac qu'au passage dans un slot (réservations comptées via `fossilQueueCandidates`, zéro double). Le réassort (`refillHatcheryQueueFromRules`) complète **chaque slot** jusqu'à sa capacité avec son type priorisé d'abord puis l'autre en repli — les nouvelles entrées vont TOUJOURS à la fin (un fossile fraîchement obtenu prend la suite, jamais la tête). La bascule du toggle (passe 12) est conservée : type priorisé épuisé + repli servi ⇒ le toggle suit. La consommation quand un slot se libère (`fillHatcherySlotFromQueue`) est strictement FIFO — un Pokémon en tête passe avant les fossiles même en priorité Fossile, et inversement. `cleanHatcheryQueue` purge les fossiles épuisés du sac. Remplace `fillHatcherySlotWithPriority`/`seedFossilIntoHatcherySlot` (passe 12, contournements supprimés).

2. **Changement de mode, règles affinées** :
   - incubation **terminée** : bascule immédiate + collecte de l'incubation (éclosion) — le Pokémon du slot est « retiré » en rejoignant la boîte comme résultat, jamais annulé ;
   - incubation **en cours** : différé jusqu'à l'éclosion (passe 12) **et la liste est vidée immédiatement** ; un slot en attente n'est plus réassorti par l'auto ;
   - tout changement de mode vide la liste (confirmé pour tous les chemins).
   Message de différé enrichi (« La liste d'attente a été vidée. » fr/en).

3. **Couleurs des toggles** : mode = vert garderie / violet incubation (existant, contrat ajouté) ; priorité = bleu Pokémon / **bronze** Fossile (au lieu du violet confondu avec le mode incubation).

### Noms Johto + fossiles (bug de données critique)

4. **Décalage des noms** : l'entrée **Piloswine (#221)** manquait dans la table EN (251 entrées au lieu de 252) → tout était décalé de +1 jusqu'à Celebi ; en FR, les indices 220-222 étaient décalés (**Marcacrin** perdu). Les deux tables sont restaurées et **PD ↔ noms EN concordent sur les 251 espèces** (test d'alignement global). Conséquence visible : les fossiles affichaient un mauvais nom pour le bon sprite (les sprites sont basés sur l'id) — corrigé par le réalignement ; cibles vérifiées (root→220 Marcacrin/Swinub, claw→246 Embrylex/Larvitar).

5. **Fossile générique de la mine réparé** : la mine peut rapporter l'objet `fossil` qui n'existait pas dans ITEMS (entrée de sac invisible et inutilisable). Ajout : entrée ITEMS (type fossil, revive 138 comme l'original), `fossil:138` dans `FOSSIL_REVIVE_MAP` (comme le projet d'origine), nom FR « Vieux Fossile », et sprite `fossil.png` téléchargé depuis le repo PokeChill **via `tools/download_assets.py`** (ITEM_OVERRIDES, idempotent).

### Entraînement

6. **Toggle auto des slots** : état actif désormais **clairement vert** (gradient `var(--green)` + halo + texte foncé ; la règle partagée le rendait discret) ; libellé explicite **« Auto : activé » / « Auto : désactivé »** (clés `training_auto_on/off`, fr/en — au lieu du seul « Activé/Désactivé »).

### Vérifications passe 13

```bash
npm run check                  # validate: OK — build: OK — tests: 163/163 OK
python3 tools/audit_project.py # 1088 références d'images, 0 manquante
```

`tests/hatchery-fossil-priority.test.js` porté à **26 tests** (FIFO mixte, fossile sauté si épuisé, clean fossiles, réassort prioritaire + repli + bascule, suite-sans-doubler, blocage pendant attente, collecte-conservation à la bascule). Nouveau `tests/johto-names-fossils.test.js` (**10 tests** : longueurs 252, spot-checks canoniques EN/FR, alignement PD↔EN 1-251, cibles fossiles + fossile générique, contrats couleurs/labels auto). Bug interne capté par les tests : itération+mutation simultanée d'un pool de réassort (`splice` pendant `for...of`) — corrigée (itération sur copie).

---

## Passe 14 — fossiles canoniques Gen 3, anti-doublon pension, éjection changement de mode, boutons colorés enfin visibles, anti-tremblement entraînement

### Fossiles de Johto → les BONS Pokémon (feature : 2 nouvelles espèces jouables)

1. **Cause réelle trouvée** : la description des objets promettait depuis toujours « réanimé en **Lilia** » (Fossile Racine) et « **Anorith** » (Fossile Griffe), mais la carte de réanimation visait des placeholders (Marcacrin #220 / Embrylex #246) faute d'avoir les vraies espèces dans le dex. La correction des noms Johto (passe 13) ne suffisait donc pas.
2. **Lilia (#345) et Anorith (#347) rejoignent le jeu** : entrées `PD[345]` / `PD[347]` (types canoniques Roche/Plante et Roche/Insecte, stats officielles, convention fossile capture 45 / XP 60 comme #138-142). Entrées éparses volontaires — le dex reste 1-251 ; elles ne sont obtenables **que** par réanimation de fossile.
3. **Carte de réanimation** : `FOSSIL_REVIVE_MAP` et `ITEMS.*.revive` → `root_fossil: 345`, `claw_fossil: 347` (fossiles Kanto et générique inchangés : #138/#140/#142).
4. **Noms** : override épars dans `i18n.js` (FR **Lilia/Anorith**, EN Lileep/Anorith) — les tables de noms restent à 252 entrées pour ne pas perturber les boucles du dex.
5. **Sprites** : 8 fichiers (front/back/frontShiny/backShiny × lileep/anorith) — entrées ajoutées dans `sprites.js` + `DEX_MAP`, téléchargés **via `tools/download_assets.py`** (mécanisme PokeAPI existant, idempotent).
6. **Descriptions EN** alignées (« can be revived into Lileep/Anorith ») ; les FR étaient déjà correctes.
7. **Migration des saves** (`save.js`) : un fossile Johto **déjà en incubation** migre vers sa cible canonique. **Bug adjacent corrigé** : la migration au chargement supprimait le fossile générique `fossil` du sac (objet devenu jouable passe 13) — retiré de la liste de purge.

### Anti-duplication des fossiles (bug « même fossile dans 2 listes »)

8. **Invariant garanti** : un fossile possédé en N exemplaires ne peut jamais être réservé plus de N fois au total. Nouveaux helpers `getHatcheryFossilReservations()`, `getFossilAvailableCount(key)` et `sanitizeHatcheryFossilQueues()` (parcours ordonné des files, purge des réservations excédentaires — répare aussi les vieilles saves), appelés dans `processHatcheryQueue` et `fossilQueueCandidates`.
9. **Quantités affichées nettes de réservations** (stock − réservés) dans le labo fossile et l'onglet fossile du sélecteur (« {count} en file d'attente »), boutons Incuber/Réanimer **désactivés** quand tout est réservé (`fossil_all_queued`).
10. **Gardes** : `sendFossilToHatchery` et `reviveFossil` refusent de prendre un exemplaire entièrement réservé.

### Pension — changement de mode sans blocage

11. **Garderie → Incubation avec un Pokémon < Niv. 100** : plus de refus — le Pokémon est **renvoyé au PC**, la liste est **vidée** et le mode bascule (`hatchery_mode_ejected`). La conversion d'un Niv. 100 reste conservée ; les cas incubation (terminée → collecte+bascule / en cours → différé+liste vidée) sont inchangés.

### Couleurs des boutons — pourquoi la passe 13 n'avait rien changé visuellement

12. **Cause racine CSS** : la règle générique `.hbtn:not(.quest-claim-btn):not(.automation-toggle-btn):not(.automation-buy-btn):not(.purchase-btn)` (pw-unified.css) a une spécificité de **5 classes** — elle écrasait TOUT fond porté par les classes runtime extraites de `data-style` (1 classe). Les couleurs injectées en data-style (passes 12-13) étaient donc invisibles.
13. **Correction** : exclusion de `.hatchery-mode-toggle`, `.hatchery-priority-toggle` et `.training-slot-auto-btn` de cette règle + classes CSS dédiées — **mode** garderie vert / incubation violet, **priorité** Pokémon bleu / Fossile bronze, **auto entraînement** vert franc quand activé (avec libellés « Auto : activé/désactivé » désormais aussi sur le bouton de la fenêtre principale, pas seulement dans le menu de gestion).

### Entraînement — boutons qui « tremblaient » à ×3/×10

14. **Cause** : chaque attaque déclenchait `renderTrainingBattlePanel()` **+** `renderTrainingWindow()` **+** `renderTeamWindow()` ; à ×10 (jusqu'à ~10 reconstructions/seconde), les boutons (Abandonner, Annuler…) étaient recréés en plein clic — clics avalés, impression de tremblement.
15. **Correction (rebuild structurel uniquement)** :
    - `renderTrainingBattlePanel` calculé via une **signature** (`trainingBattlePanelSignature` : slots actifs, round, ennemi, mode, langue) — identique ⇒ on ne reconstruit pas le DOM ; PV, barres de cooldown **et noms d'attaques** sont patchés **en place** par `updateTrainingLiveProgress` (hooks `data-training-text`).
    - `renderTrainingWindow`/`renderTeamWindow` ne sont plus appelées à chaque tick : seulement quand `trainingWindowSignature()` change (`maybeRenderTrainingWindowTick` ; la baseline est synchronisée par `renderTrainingWindow` lui-même). Les transitions (début/fin/annulation) rendent toujours immédiatement via leurs appels directs.

### Vérifications passe 14

```bash
npm run check                  # validate: OK — build: OK — tests: 185/185 OK
python3 tools/audit_project.py # 1096 références d'images, 0 manquante (+8 sprites Gen 3)
```

Nouveau `tests/passe14-gen3-fossils.test.js` (**20 tests** : données PD, noms FR/EN, carte+objets revive, sprites fichiers+DEX_MAP, sanitize doublons, disponibilité nette, gardes envoi/réanimation, conservation du stock en traitement, purge save, migration revive, contrats anti-tremblement + signature, bouton auto, clés i18n). `tests/hatchery-fossil-priority.test.js` : le test « <100 refusé » devient **2 tests** (éjection+vidage / conversion Niv. 100 conservée). `tests/johto-names-fossils.test.js` : cibles fossiles mises à jour (#345/#347) et contrats de couleurs réécrits sur les classes CSS dédiées (+ exclusion de la règle générique).

---

## Passe 15 — anti « retour en haut » : conservation du scroll lors des re-rendus

Retour utilisateur : dans les panneaux comme la pension ou l'entraînement, chaque action qui régénère l'interface ramène l'affichage tout en haut — pénible pour enchaîner plusieurs actions.

1. **Helpers génériques** (`src/game/core/util.js`, chargé tôt) : `pwSaveScroll(el)` / `pwRestoreScroll(el, pos)` pour les conteneurs qui persistent, et `pwSaveScrollOf(root, sel)` / `pwRestoreScrollOf(root, sel, pos)` pour ceux **recréés** par le re-render (`.management-content` est régénéré à chaque ouverture de menu).
2. **Menus de gestion** (pension `openHatcheryManagementMenu`, entraînement `openTrainingManagementMenu`, mine `openMineManagementMenu`) : suivi de page (`_*MgmtLastPage`) — **même onglet ⇒ scroll conservé** (contenu + conteneur externe), **changement d'onglet ⇒ retour en haut voulu**.
3. **Sélecteur unifié** (`renderUnifiedGrid`) : les 3 écritures `grid.innerHTML` passent par `_usmSetGridHtml(grid, html, prevScroll)` ; la restauration n'a lieu que si le contexte `action|sous-onglet` est inchangé (`_usmLastScrollKey`) — changer de contexte repart en haut.
4. **Fenêtres** `renderHatcheryWindow` / `renderTrainingWindow`, **sac** `renderInventory`, **labo fossile** `renderFossilLab` : scroll de l'élément sauvegardé avant réécriture puis restauré (y compris branches « vide/verrouillé »).

### Vérifications passe 15

```bash
npm run check                  # validate: OK — build: OK — tests: 191/191 OK
python3 tools/audit_project.py # 1096 références d'images, 0 manquante
```

Nouveau `tests/scroll-preserve.test.js` (**6 tests**) : présence/export des helpers, round-trip fonctionnel (élément simple + conteneur recréé via sélecteur), contrats des 3 menus, test DOM fidèle du menu pension (un conteneur réellement « recréé » à chaque innerHTML : scroll conservé sur même page, reset sur changement d'onglet), contrats sélecteur + fenêtres/sac/labo.

---

## Passe 16 — scroll (correctif réel) + objets tenus qui suivent leur Pokémon

### A) Bug scroll toujours présent après la passe 15 — causes racines traitées

La passe 15 restaurait le scroll **synchrone** juste après `innerHTML`. Insuffisant en pratique :

1. **Le conteneur scrollable des menus de gestion était RECRÉÉ à chaque rendu** (`.management-content` régénéré dans le grand `inner.innerHTML = …`). **Correctif structurel** : les 3 menus (pension `openHatcheryManagementMenu`, entraînement `openTrainingManagementMenu`, mine `openMineManagementMenu`) utilisent désormais un **squelette persistant** (titre + onglets + conteneur) — seul le *contenu* de `.management-content` et l'onglet actif sont réécrits. Le navigateur conserve alors le scroll **nativement**, sans course contre les micro-tâches/observateurs. Changement d'onglet = retour en haut **volontaire** via le nouveau `pwResetScrollNow(el)` (bumpe un « epoch » qui invalide toute restauration différée).
2. **Le scroll qui saute est parfois celui de la PAGE** (fenêtres du tableau de bord en `overflow:visible`), et l'ancrage de scroll du navigateur s'applique **pendant la mise en page, après** notre restauration synchrone. Nouveau `pwSetHtml(el, html)` (`src/game/core/util.js`) : conserve le scroll de la **page** (`document.scrollingElement`) **et** de l'élément, synchrone **+ re-vérifié sur deux `requestAnimationFrame`**, avec garde d'epoch. Appliqué (via le repli local `_pwSetHtmlSafe`, sûr pour les tests unitaires sans `util.js`) à : fenêtres pension/entraînement/mine/équipe (vue fenêtre **et** onglet Équipe), sac, labo fossile, panneau quêtes, menu répétables, dictionnaire + atoll (panneau plein écran), fiches & panneaux d'info du modal Pokémon.
3. **Filet de sécurité global** : `pwSnapshotScrollAround(target)` / `pwRestoreScrollAround(snapshot)` capturent les ancêtres scrollés d'un clic + la page, puis restaurent (synchrone + 2 frames, epochs respectés). Câblé dans les **deux** répartiteurs d'événements (`file-preflight.js` click/contextmenu capture — handler renommé `preflightClickHandler` — et `file-postboot.js` click/contextmenu) : tout panneau non couvert par `pwSetHtml` reste protégé.
4. `input.focus()` du dictionnaire vole le scroll → `focus({preventScroll:true})` (avec repli). Sélecteur unifié : reset au changement de contexte désormais **déterministe** (`pwResetScrollNow(grid)` — `innerHTML` seul conserve `scrollTop`, l'ancien code ne remontait pas réellement).

### B) Objets tenus : ils suivent le POKÉMON, plus le n° de slot

Bug remonté : échanger deux Pokémon (fenêtre Party) laissait l'objet sur le slot (les Pokémon « échangeaient » leurs objets) ; supprimer un Pokémon laissait son objet au slot, hérité par le suivant. Cause : `G.teamSlotItems[i]` est indexé par **position**, mais les opérations structurelles sur `G.team` ne rejouaient pas la même opération sur ce tableau.

- Nouveaux helpers (`src/game/world/team.js`, exportés window) :
  - `swapTeamSlotItems(a, b)` — échange les objets en même temps que les Pokémon (glisser-déposer) ;
  - `removeTeamSlotItemAt(idx)` — l'objet du Pokémon retiré **part avec lui** (slot libéré) ; les suivants glissent d'un cran **avec** leurs objets ;
  - `_teamSlotItemsPadded()` interne : contrairement à `ensureTeamSlotItems`, **pas** de remplissage legacy ni de purge avant l'opération (sinon les objets encore indexés sur les anciennes positions étaient effacés/dupliqués — piège trouvé par les tests).
  - `syncTeamSlotHeldItems()` purge désormais les slots **orphelins** au-delà de la taille de l'équipe (les fantômes d'anciennes opérations désynchronisées ne pouvaient plus hériter d'un Pokémon ajouté plus tard).
- Call-sites alignés : drag & drop Party, `removeFromTeam`, `swapBoxWithTeam` (team-manage **et** box-ui : le sortant emporte son objet — slot libéré pour l'arrivant du PC), remplacement via le sélecteur unifié, dépôt à la pension, **`loadTeamFromPreset`** (map « Pokémon → son objet » reconstruite avant réagencement : chacun retrouve SON objet à sa nouvelle place ; un Pokémon rappelé du PC arrive sans objet).

### Vérifications passe 16

```bash
npm run check                  # validate: OK — build: OK — tests: 201/201 OK
python3 tools/audit_project.py # 1096 références d'images, 0 manquante
```

`tests/scroll-preserve.test.js` réécrit (**9 tests**) : pwSetHtml + epochs, snapshot/restore ancêtres, contrats squelette persistant des 3 menus, DOM fidèle (même page = **même nœud** conservé, changement d'onglet = reset), sélecteur, `_pwSetHtmlSafe`, filet des répartiteurs. Nouveau `tests/team-slot-items.test.js` (**7 tests**) : swap, suppression, remplacement, preset, purge orphelins, intégration `getHeldBuff`. Les deux harnais d'extraction de fonctions (`info-panel-navigation`, `training-move-unlock`) injectent désormais le repli `_pwSetHtmlSafe` avant d'exécuter leurs slices.

---

## Passe 17 — verrous Team en combat, drag & drop des attaques + grand projet Étape 1 (socle équipes officielles)

### A) Team : verrous + réorganisation des attaques

1. **Verrou global « combat en cours »** (`isTeamStructureLocked()` / `notifyTeamStructureLocked()` dans `src/game/world/team.js`, exportés window) : pendant `battle.active`, il est désormais impossible de changer **l'ordre des Pokémon** (glisser-déposer `teamDrop` + armement du drag carte), **l'ordre/les attaques** (`swapTeamMoves`, `toggleMoveSelect`, `learnMove`, `forgetMove` — le verrou existant ne ciblait que le Pokémon actif) et **les objets tenus** (`openItemSelector`, `equipItemDirect`, `removeItemFromPokemon`, `unequipItemFromPokemon`, `equipItemOn`, `unequipItem`). Notification `action_blocked_in_battle` partout.
2. **Drag & drop des attaques équipées** (fenêtre Party + onglet Équipe) : les lignes d'attaques des cartes sont `draggable` hors combat (`movesDraggable` dans `generatePokeCardHTML`, attribut `data-move-drag="equipe|attaque"`) ; délégation globale idempotente `installMoveDragDrop()` (team-ui.js) → échange de positions via le nouveau `swapTeamMoves(teamIdx, a, b)` (move-learning.js, exporté), styles `pw-move-drag-src` / `pw-move-drop-hover`. Le drag carte cède la priorité (`.poke-move` filtré dans `teamMouseDown`).
3. **Clic-swap en mode remplacement** : cliquer une **2e attaque déjà équipée** échange les positions au lieu de… rien (équipe via `toggleMoveSelect`, PC via `toggleBoxMoveSelect` — la box n'est pas soumise au verrou combat). Nouvelle clé i18n `moves_swapped` (fr+en).

### B) Grand projet « Histoire & Dresseurs canoniques » — Étape 1 : socle + validateur

1. **`src/data/official-teams-data.js`** (chargé après `champions-data.js`) : format v1 documenté (`kind`, `region`, `source` canonique, Pokémon `{id, level, moves≤4, talent, item, ivs, evs}`), `buildOfficialTeamPoke(spec)` (miroir safe de `trainerPoke`), `getOfficialTeam(key)`. **Pilotes** Pierre (Racaillou N.12 / Onix N.14, Pierre Dure) et Ondine (Staross N.18 / Starmie N.21, Eau Mystique) — niveaux **RFVF**, attaques en ids valides snake_case, talents du **pool joueur réel**, budgets **IV ≤ 18 et EV ≤ 18 au total** (règle « moitié de 36 » validée).
2. **Validateur automatique `tests/official-teams.test.js`** : structure, espèce/niveau, attaques ∈ (apprentissage naturel ∪ CT/CS) avec ≤ 4 et ids existants, talent ∈ `getSpeciesTalents(id)`, objet existant/équipable, budgets IV/EV, instanciation conforme, non-régression anti-ids-legacy (`rockthrow`…).
3. **Audit moteur ennemi (demande utilisateur Partie 2)** :
   - Objets tenus : `getHeldBuff(attaque/défense)` est **neutre de côté** → un ennemi avec `heldItem` a déjà ses buffs stats ✓.
   - Talents à effet : appliqués via hooks **neutres de côté** (entrée : Intimidation/météo/Régé-Force ; attaque : Levitation, Paratonnerre, absorptions, Sans Regart…) ✓ — mais seule une liste hardcodée anglaise a un effet ; la plupart des talents du pool joueur (format maison) sont cosmétiques → à brancher lors des étapes arènes/atoll.
   - **Correction liée** : les objets *type_boost* (Eau Mystique, Pierre Dure…) étaient **inertes en combat** (effet uniquement dans la description) → `getHeldBuff` applique désormais **+10% atk/spa** (×1.10 affiché), pour le joueur comme pour l'ennemi.
   - Constat pour l'étape 2 : les équipes legacy utilisent des **ids d'attaques compacts invalides** (filtrés silencieusement → movesets vides/aléatoires) et des talents hors pool joueur ; elles seront remplacées par ce socle validé.

### Vérifications passe 17

```bash
npm run check                  # validate: OK — build: OK — tests: 214/214 OK
python3 tools/audit_project.py # 1096 références d'images, 0 manquante
```

Nouveaux tests : `tests/passe17-team-locks.test.js` (**7**) — verrous combat, swap équipe/box, drag & drop, i18n — et `tests/official-teams.test.js` (**6**) — validateur de légitimité complet + instanciation + audit moteur.

---

## Passe 18 — équipement d'objets depuis la Team corrigé + grand projet Étape 2 (arc rival & Team Rocket)

### A) Bug : impossible d'équiper un objet depuis la Team

**Symptôme signalé** : clic gauche sur un objet du sac (depuis la fenêtre Team) → un panneau d'information s'ouvrait, l'objet n'était jamais équipé et le sac restait affiché.

**Cause racine** (3 verrous cumulés, mis en lumière par les tests) :

1. Plus **aucun** objet du jeu ne porte de champ `buff` (format historique) : `showItemSelectorForPokemon` plantait sur `Object.entries(itm.buff)` (TypeError) → le sélecteur n'était jamais rendu et le sac brut restait affiché.
2. `equipItemDirect` exigeait `ITEMS[key].buff` → échec silencieux même quand l'appel aboutissait.
3. Le callback `_equipCallback` était consommé au **premier** clic ; le clic suivant retombait sur `openItemInfo` — la même modale (`#poke-modal`) que les fiches Pokémon, d'où l'impression que « le panneau du Pokémon » s'ouvrait. Une fenêtre `setTimeout` de 200 ms aggravait encore la course.

**Corrections** :

- Nouveau helper `isHeldEquippableItem(key)` (`src/game/world/team.js`, exporté) : objet tenable = `type === 'held'` **ou** buff legacy ; pierres d'évolution et CT/CS exclues. Utilisé par `equipItemOn`, `showItemSelectorForPokemon`, `equipItemDirect` et `handleInventoryClick`.
- `openItemSelector` : rendu du sélecteur **synchrone** (suppression du `setTimeout` de 200 ms).
- `showItemSelectorForPokemon` : filtrage via le helper, branche buff legacy conservée, passe par `_pwSetHtmlSafe` + `pwResetScrollNow(fsContent)` (passe 16).
- `handleInventoryClick` : le callback d'équipement est **conservé** quand l'objet cliqué n'est pas tenable (+ notification `item_not_holdable`) au lieu d'être perdu.
- Bonus données : `choice_band` / `choice_specs` reçoivent `"mult": 1.5` (leur branche `getHeldBuff` était morte) ; **`prine_berry` ajouté à ITEMS** (baie 45 000₽ — présente en localisation/boutiques/récompenses mais absente du registre, donc inachetable et inutilisable).

### B) Grand projet « Histoire & Dresseurs canoniques » — Étape 2 : arc rival + Team Rocket

1. **19 équipes de quêtes canoniques** dans `official-teams-data.js` (format v2 commenté : `role/style/rewardMoney/source` + `variantsByStarter` + `getOfficialTeam(key, starterId)`) :
   - **Rival Blue** — 5 combats dont l'équipe **s'adapte au starter du joueur** (Bulbizarre/Salamèche/Carapuce, ids 1/4/7) : Route 22 (Roucool N.9 + starter N.9), Pont Pépite (N.15-18), S.S. Anne (N.19-20), Sylphe (N.37-40, archétypes selon starter), Route 22 pré-ligue (6 Pokémon, starter N.53 avec objet type_boost). Compositions calquées **RFVF**.
   - **Team Rocket Kanto** : Mont Sélénite, **nouvelle quête Tour Pokémon** (`kanto_rocket_tower`), repaire Céladon (admin), Giovanni ×2 (repaire puis Sylphe — Rhydon N.42 car Rhinocorne évolue à 42 dans ce jeu).
   - **Johto** : rival Silver (variants selon starter 152/155/158) et Team Rocket (Puits Ramoloss, repaire Acajou, Tour Radio…).
   - Toutes les attaques ∈ (pool naturel ∪ CT/CS) — le validateur a d'ailleurs imposé deux corrections de légitimité (`intimidate` hors pool Léviator → `swiftSwim` ×3, `ice_fang` → `mud_slap` sur Crocrodil).
2. **Dialogues scénarisés** : `getTrainerBattleDialog(id, 'intro'|'win')` ; réplique d'intro affichée au log de combat (« … » — nom du dresseur), réplique de défaite de l'ennemi à la victoire ; **43 nouvelles clés i18n fr + en** (noms de combats, intros, victoires, `item_not_holdable`, `already_equipped_by_name`, `quest_item_obtained`…).
3. **Starter mémorisé** : `pickStarter` enregistre désormais `G.starterSpecies[region]` (indispensable aux variantes du rival).
4. **Renumérotation des quêtes + migration de sauvegarde automatique** :
   - Kanto : 43 → **44** quêtes principales (insertion de `kanto_rocket_tower` à l'index 21, loc `pokemontower`) ; Johto : **101-126** ; secondaires Kanto s1-s13 / Johto s14-s26 (nouveau PNJ donneur à Oliville pour s22, qui n'en avait pas).
   - `migrateQuestSaveV2()` (appelée par `ensureQuestState`, idempotente via `G._questIdMigrationV2 = 2`) : `mainStep` +1 si ≥ 21 (fin 43→44), `completedQuests` / `questBaselines` / `activeQuests` remappés, `storyIdx` legacy ajusté. **Les sauvegardes existantes continuent sans perte.**
   - Ancien pipeline `TRAINER_BATTLES` / `questTrainerMoves` supprimé (ids d'attaques compacts legacy → movesets vides) : `getTrainerBattleDef` délègue désormais aux équipes officielles validées.
5. **Rééquilibrage des récompenses** (demande utilisateur : « ne pas devenir trop riche, ni gagner trop d'objets ») : Kanto ≈ **241 300₽ (-33 %)** + 57 000₽ de primes de dresseurs ; Johto ≈ **226 100₽ (-25 %)** + 42 300₽ de primes. Doublons d'objets supprimés (Pierre Lune du Mont Sélénite → Poussière Étoile, Sable Doux de Blanche → Mouchoir Soie, Bandeau Muscle d'Antoine → Poudre Argentée, etc.), Safari 50k→25k, Ligue 40k→28k ; `rewardMoney` calibrés par combat (rival 1 000→15 000₽ progressifs, Giovanni 6 000/10 000₽…).
6. Divers : corps générique des quêtes « item » (quest-ui — fin du cas hardcodé Pokéflûte pour Lugia/Ho-Oh), sprite `rocket` pour `kanto_rocket_tower`, fragments de localisation `fr/en quests` **régénérés** (70 main + 26 side, repeatable préservés, `rewardDesc` synchronisés).

### Vérifications passe 18

```bash
npm run check                  # validate: OK — build: OK — tests: 229/229 OK
python3 tools/audit_project.py # 1096 références d'images, 0 manquante
```

Nouveaux tests : `tests/quest-chain.test.js` (**9** — unicité/ordre des ids, badges canon, plafonds de récompenses, PNJ/sprites/dialogues i18n présents, textes synchronisés, variantes rival « starter fort », migration V2 ×2) et `tests/equip-held-items.test.js` (**5** — helper tenable, sélecteur synchrone, callback conservé sur objet non tenable, choice ×1.5, prine_berry enregistrée). Contrat `bag-item-usage` mis à jour ; le validateur `official-teams` tolère désormais `variantsByStarter` et garde la non-régression anti-ids-legacy.

---

## Passe 19 — grand projet Étape 3 : arènes & ligues des deux régions sur le socle officiel

### 1. Le vrai problème (pire que prévu)

Le legacy `CHAMPIONS` (`champions-data.js`) avait non seulement des **ids d'attaques compacts invalides** (filtrés silencieusement), mais `getChampTeam()` **reconstruisait chaque Pokémon via `createPoke(id, niveau)`** : movesets, talents, objets et IV/EV configurés étaient **intégralement ignorés** — champions d'arène et Conseil 4 se battaient avec des Pokémon **aléatoires sans moveset défini**. Les ligues avaient en outre des **équipes non canoniques** (Gaillard du Ciel 65 fixe sans variante, niveaux gonflés +2, Golem chez Aldo, Mélo 20 chez Blanche…).

### 2. Équipes canoniques (26 nouvelles entrées OFFICIAL_TEAMS)

- **8 arènes Kanto** — espèces et niveaux **RFVF** exacts : Major Bob 21/18/24, Erika 29/24/29, Koga 37/39/37/43, Morgane 38/37/38/43, Auguste 42/40/42/47, Giovanni 45/42/44/45/**50** (Pierre et Ondine existaient déjà, pilotes étape 1).
- **Ligue Kanto (RFVF 1er passage)** : Olga (52/51/52/54/54), Aldo (51/53/53/54/56), Agatha (54/54/53/56/58), Peter (56/54/54/58/**Dracolosse 60**) et **Maître Blue à équipe variable selon le starter du joueur** (`variantsByStarter` déjà éprouvé à l'étape 2 — vérifié contre Bulbapedia : Roucarnage 59 / Alakazam 57 / Rhinoféros 59 / duo 59+61 / starter adverse **63** ; règle du duo : type redondant avec le starter de Blue omis).
- **8 arènes Johto** — espèces et niveaux **OAC** : Albert 9/13, Hector 14/14/**Insécateur 16**, Blanche Mélofée 18/**Écrémeuh 20** (correction canon majeure !), Mortimer 21/21/23/25, Chuck 27/30, Jasmine 30/30/**Steelix 35**, Frédo 27/29/31, Sandra 37/37/37/**Hyporoi 40**.
- **Ligue Johto (OAC)** : Clément, Koga, Aldo, Marion (40→47) puis **Maître Peter** (44/47/47/46/46/**Dracolosse 50**, 6 Pokémon).
- Toutes les attaques ∈ (pool naturel ∪ CT/CS) — le rapport exhaustif a imposé **57 ajustements** (le pool CT/CS du jeu est restrictif par espèce : pas de `iron_tail` sur Onix, pas de `dragon_breath` sur Léviator, `mach_punk` est l'id réel de Mach Punch, etc.). Talents du pool joueur avec actifs privilégiés (`filter` ×arènes sol/psy, `levitate` sur les Magnéti de Jasmine ✓ canon, `intimidate` sur Ectoplasma/Dracolosse/Hyporoi), l'as porte un **type_boost** (actif moteur depuis la passe 17) à partir du 2e badge. IV/EV ≤ 18 partout (validateur).

### 3. `champions-data.js` : de fichier de données à couche de compatibilité

- **Plus aucun Pokémon en dur** : seuls subsistent `LEAGUE_META` (récompense 1re victoire + prérequis) et les helpers paresseux `getChampDef(champId)` / `getLeagueTrainersForRegion(region)` reconstruits depuis OFFICIAL_TEAMS + i18n.
- `getChampTeam` instancie désormais les **vraies équipes officielles** ; le gauntlet matérialise chaque étape via `getOfficialLeagueTeam(region, stage, starterId)` (résolution de la variante Blue via `getPlayerStarterSpecies`).
- **Récompenses revues** : ligues 15000₽→**12000₽** (Kanto) et 18000₽→**14000₽** (Johto) ; arènes Johto ~-10 % lissées (1600→5000₽) ; Kanto déjà calibré (1500→5000₽).
- **Compatibilité sauvegarde totale** : aucune clé ne change (`G.badges` garde 'brock'…'clair', `G.defeatedChamps` les champIds, ligues 'elite4'/'johto_elite4') — pas de migration nécessaire.
- Noms/titres des **10 étapes de ligue localisés FR + EN** (`champions.js` — Olga/Lorelei, Aldo/Bruno, Agatha, Peter/Lance, Bleu/Blue, Clément/Will, Koga, Marion/Karen).

### Vérifications passe 19

```bash
npm run check                  # validate: OK — build: OK — tests: 236/236 OK
python3 tools/audit_project.py # 1096 références d'images, 0 manquante
```

Nouveau `tests/passe19-gyms-league.test.js` (**7 tests**) : compat sauvegarde (18 ids), métadonnées progressives badgeReq 0→7 + plafonds de récompenses, instanciation réelle (movesets/talents/objets — la non-régression du bug), espèces/niveaux canoniques (RFVF/OAC, régressions legacy), gauntlets 5 étapes + aplatie instanciée, **variante du Maître Blue ×3 starters**, i18n FR/EN des étapes. Le validateur `official-teams` couvre automatiquement les 26 nouvelles entrées (légitimité complète, budgets IV/EV).

### Prochaines étapes (validées avec l'utilisateur)

1. ~~Socle format équipe + validateur + pilote Pierre/Ondine~~ **Fait (passe 17)**.
2. ~~Arc rival + Team Rocket (Kanto+Johto), dialogues, renumérotation + migration~~ **Fait (passe 18)** ; cible finale Kanto ~60 principales / ~30 secondaires ; répétables diversifiées ; **concours de capture retiré** à la demande de l'utilisateur.
3. ~~Arènes + ligues des deux régions sur le socle officiel (RFVF/OAC)~~ **Fait (passe 19)**.
4. ~~Johto étendu (~40 principales / ~25 secondaires, arcs films 3-5 — **film 3 (Entei/Zarbi → Ruines Alpha) validé** par l'utilisateur, plus GS Ball/Celebi, Suicune, Léviator rouge, Tour Radio, Puits Ramoloss, repaire Acajou)~~ **Fait (passe 20)** : 40 principales / 38 secondaires, arcs film 3 + GS Ball + Suicune/Eusine + Léviator rouge + épreuve dragon, migration V3.
5. Atoll refondu : rotation 12 h (timer affiché atoll + roamers routes), 6 équipes/mode/rang (cycle 3 jours), graine déterministe datée, descriptions de modes en haut de page, mode team prêtée (6 équipes en rotation, victoire imposant de réorganiser ordre Pokémon **et** attaques), légendaires jamais bannis de tous les modes.
6. Équilibrage par simulations (« battable au niveau attendu »).

---

## Passe 20 — grand projet Étape 4 : Johto étendu (40 principales / 38 secondaires), arcs film 3 & GS Ball

### 1. 14 nouvelles quêtes principales Johto (101-126 → 101-140)

La chaîne Johto passe de 26 à **40 quêtes** (ids 101-140 consécutifs ; la migration V3 re-range les sauvegardes existantes, cf. §4) :

- **Arc GS Ball / Fargot** (108-109, le fil rouge de la saison animée orange/Johto) : Kurt (Fargot) reçoit la GS Ball à Écorcia, puis nettoyage du Bois aux Chênes (quête 140 offrant **Celebi** existait déjà et clôt l'arc).
- **Arc FILM 3 — Le Sort des Zarbi** (112-115, validé par l'utilisateur) : communiqué des Ruines d'Alpha, invasion de Zarbi, puis **boss scénarisé `johto_film3_entei`** — « Professeur Hale (possédé) », 2× Zarbi 24 + **Entei 30 @ Charbon**, prime 6 000₽ portée par l'équipe (jamais de double prime de quête), sprite dresseur dédié et dialogues FR/EN (intro + réplique de défaite).
- **Eusine & Suicune** (117 à la Tour Cendrée + 134, poursuite de Suicune une fois l'Aile Argent en main).
- **Remède d'Amphy canon OAC** (120-121) : la pharmacie d'Irisia fournit le remède, Jasmine le reçoit au Phare — avant le badge Acier, comme dans OAC.
- **Peter au Lac Colère** (123) puis **le Léviator rouge** (124) : première récompense **chromatique forcée** du jeu (`rewardShiny:true`, Nv.30 canon Lac Colère).
- **Épreuve dragon** (129-130, Doyen de l'Antre) récompensée par **Minidraco Nv.15** (canon OAC).
- Arcs existants décalés sans changement de contenu (Tour Radio, repaire d'Acajou, Puits Ramoloss, ligues).
- Économie : +35 000₽ nets sur les 14 quêtes (borne documentée Johto 256 100₽ ∈ [230k, 275k]), toujours « pas trop riche ».

### 2. 12 nouvelles quêtes secondaires (s27-s38, chacune avec donneur PNJ)

newbark s27, violet s28, **ilexforest s29** (Ranger Sylvain — il n'y avait aucun PNJ dans ce lieu), goldenrod s30, olivine s31 (Ferme Meumeu, rendue possible par les nouveaux sauvages de la Route 39), cianwood s32/s33 (dont Whirl Islands), mahogany s34, **mtmortar s35** (Karateka Tadashi — nouvel accueil PNJ), ecruteak s36, lakerage s37, blackthorn s38 (Chemin Glacé). Récompenses 1 500 → 4 800₽ progressives + baies/objets existants (`hard_stone` s34).

### 3. Régressions et bug latent PNJ traités (doublons de clés + parallélisme)

- Le script d'ajout de PNJ avait créé des **clés dupliquées** `ilexforest` / `mtmortar` dans `npc-data.js` **et** dans `fr/npc.js` / `en/npc.js` — en JS, la dernière occurrence écrase silencieusement la première : côté données seuls les panneaux survivraient (s29/s35 sans donneur), côté localisation une **virgule manquante** rendait même le fichier non analysable (invisible des tests, qui ne chargeaient pas npc.js).
- **Bug latent hérité de la passe 19** : Oliville avait 3 entrées de données pour 2 entrées localisées → le panneau du port s'affichait « NPC 3 » sans dialogue (`getNpc` retourne `{name:'', lines:[]}`, et `location-info.js`/la carte instancient chaque entrée par indice).
- Fusion propre sur le modèle canonique (Céruléan : panneau d'abord, donneur ensuite), entrée « Panneau du Port / Harbor Board » ajoutée FR+EN, parallélisme strict vérifié sur **tous les lieux** puis **verrouillé par un nouveau test de régression** (§5).

### 4. Migration de sauvegarde V3 (automatique, idempotente)

`migrateQuestSaveV3()` — chaînée après V2 dans `ensureQuestState`, marqueur `G._questIdMigrationV3` : `mainStep.johto` re-pointé sur la **même quête** (index → ancien id → nouvel id via `QUEST_V3_JOHTO_REMAP` → nouvel index), `completedQuests` (clés 101-126), `questBaselines.johto` et éventuelle **instance principale active** remappés ; fin de jeu (26/26) → `mainStep` recalé sur la chaîne complète (40) sans perdre aucune complétion. Kanto et secondaires strictement inchangés.

### 5. Rencontres légendaires shiny + 4 lieux repeuplés (canon OAC)

- `startLegendaryEncounter(pokeId, niveau, opts)` accepte `opts.shiny` ; `giveQuestReward` relaye `rewardShiny` des définitions de quêtes (Léviator rouge — HP ×2,2 et capture autorisée comme toute rencontre « quête légendaire »).
- Nouveaux sauvages (pools OAC) : **Ruines d'Alpha** (Zarbi 10-16, Natu), **Route 39** (Tauros et Écrémeuh — la ferme Meumeu !), **Mt. Mortar** (Machoc, Racaillou), **Chemin Glacé** (Marcacrin, Nosferapti/Nosferalto, Lippoutou rare).
- Aucun nouvel asset téléchargé (sprites déjà présents : `scientist` pour le boss du film 3).

### Vérifications passe 20

```bash
npm run check                  # validate: OK — build: OK — tests: 240/240 OK
python3 tools/audit_project.py # 1096 références d'images, 0 manquante
```

`tests/quest-chain.test.js` passe de 9 à **13 tests** : attendus réécrits (84 quêtes 101-140, 38 secondaires, arc film 3 dans l'ordre canonique des combats, économie Johto 256 100₽ ∈ [230k, 275k]), **récompenses spéciales** (Léviator rouge 124, Minidraco 130, boss `johto_film3_entei` 114), **migration V3** (remap complet + idempotence + fin de jeu préservée) et **parallélisme PNJ données ↔ FR/EN** sur tous les lieux (régression Oliville verrouillée). Le validateur `official-teams` couvre automatiquement `johto_film3_entei` (légitimité movesets/talents/objet, budgets IV/EV).

### Prochaines étapes (rappel)

1. ~~Kanto étendu : ~60 principales / ~30 secondaires (répétables à diversifier)~~ **Fait (passe 21)** : 60 principales / 30 secondaires / 23 répétables dont 8 Kanto localisées, migration V4.
2. Atoll refondu : rotation 12 h (timer affiché atoll + roamers routes), 6 équipes/mode/rang (cycle 3 jours, graine déterministe datée), descriptions de modes, mode team prêtée (réorganisation Pokémon **et** attaques à la victoire), légendaires jamais bannis de tous les modes.
3. Équilibrage par simulations (« battable au niveau attendu »).

---

## Passe 21 — grand projet Étape 5 : Kanto étendu (60 principales / 30 secondaires / répétables diversifiées)

### 1. 16 nouvelles quêtes principales Kanto (1-44 → 1-60)

Renumérotation 1-60 (migration V4 côté sauvegardes, cf. §3), insertions **canon RFVF** en ordre d'aventure :

- **L'Inventeur du Cap** (13, talk Route 25) : **Léo (Bill)** et son téléporteur capricieux, chalet au bout du Pont Pépite — premier PNJ implanté sur une route de Kanto.
- **Le Président du Fan Club** (14, talk Azuria) — les radotages canoniques récompensés.
- **Le Capitaine du Sainte-Anne** (19, talk Carmin) — le massage de dos du capitaine mal de mer (canon : CS Coupe, ici en argent).
- **La Bande de la Route 8** (24, combat 15×) — le chenal Lavanville ↔ Safrania.
- **L'Évoli du Manoir Céladon** (31) & **le Porygon du Game Corner** (32) : les deux Pokémon « donnés » emblématiques de Céladopole (Nv.25 / Nv.20, canons RG).
- **Motards de la Piste Cyclable** (35) & **les Dentiers d'Or du Directeur** (36, Parc Safari) — deux grands classiques RGB.
- **Le Lokhlass de la Sylphe** (39, Nv.25) — l'employé reconnaissant après la libération du siège.
- **Le Dojo de Safrania → Tyrogue** (40, combat scénarisé) : **Karatéka Karuo** (= Koichi) avec **Kicklee 37 + Tygnon 37 @ Ceinture Noire** (canon FRLG vérifié Bulbapedia ; `ironFist` sur Tygnon dans l'esprit, `limber` canon sur Kicklee ; movesets 100 % légaux — Tygnon : Uppercut/3 poings élémentaires exactement canons). Récompense : **Tyrogue Nv.25**, qui évolue vers Kicklee **ou** Tygnon selon ses stats — la transposition élégante du choix canon « pied ou poing ».
- **La Devinette de M. Psyché** (42, Safrania), **le Collectionneur** (44, type capture — 15 captures sauvages), **Renaissance au Laboratoire** (47, Ptéra Nv.30 — le fossile du Mont Sélénite revit), **Le Grand Plongeon** (50, Chenal 21), **Ultime Entraînement** (52, Route Victoire 25×) et **les Mémoires du Manoir** (58, lore Dr. Fuji/Mewtwo, juste avant Mewtwo 59 — les oiseaux 54-56, Mewtwo 59 et Mew 60 clôturent toujours la région).
- Économie : +33 800₽ nets (borne documentée 275 100₽ ∈ [255k, 290k]) + 4 000₽ de prime Dojo ; toujours « pas trop riche ». La chaîne **flûte avant Ronflex** survit au décalage (donneuse en 25, quête objet en 27) — verrouillée par test.

### 2. 17 nouvelles quêtes secondaires Kanto (s14-s30) + 8 répétables localisées

- **s14-s30**, toutes avec donneur PNJ : Pont Pépite ×2, Route 5/6/7/8/13/14/15/16/17/20/21, Cave Taupiqueur, Grotte Rocheuse, capture (Mécène de Safrania), vente de trésors (Concession d'Argenta) et Route Victoire (Messager du Plateau Indigo — nouvelle clé PNJ `indigo`). Récompenses 1 000 → 3 500₽ progressives + objets existants (`soft_sand`, `black_belt`, `silk_scarf`, `mystic_water`…), aucune pierre en doublon.
- **Répétables r7-r14** : ciblées Kanto (Forêt de Jade, Mont Sélénite, Grotte Rocheuse, Piste Cyclable, Îles Écume, Route Victoire) + capture + mine — elles n'apparaissent que dans leur région (`isRepeatableAvailable` filtre déjà par `regionOfLoc`).
- **Les secondaires Johto passent de s14-s38 à s31-s55** (Kanto s1-s30, Johto s31-s55, numérotation continue).

### 3. Migration de sauvegarde V4 (automatique, idempotente)

`migrateQuestSaveV4()` — chaînée après V3 dans `ensureQuestState`, marqueur `G._questIdMigrationV4` : `mainStep.kanto` re-pointé sur la même quête (index → ancien id → nouvel id → nouvel index ; fin de jeu 44/44 → chaîne complète 60), `completedQuests` (clés 1-44) et `questBaselines.kanto` remappés, instances actives (principale Kanto + **secondaire Johto s14-s38 → s31-s55**). Johto principal (101-140) et sides Kanto (s1-s13) strictement inchangés.

### 4. Incident de parcours documenté (à retenir)

`fr/quests.js` contient **deux dictionnaires** (`L_fr_quests` **puis** `L_fr_move_descs` — particularité legacy FR uniquement) : un premier script d'insertion des répétables a tronqué le second. Restauré immédiatement depuis la sauvegarde, insertion refaite en ciblant la fermeture du **premier** dict, `move_descs` vérifié intact — et la méthode d'édition des localisations corrigée pour l'avenir (backups systématiques + tests vm de chargement après chaque réécriture).

### Vérifications passe 21

```bash
npm run check                  # validate: OK — build: OK — tests: 244/244 OK
python3 tools/audit_project.py # 1096 références d'images, 0 manquante (aucun nouvel asset)
```

`tests/quest-chain.test.js` passe de 13 à **17 tests** : attendus 100 quêtes (60 Kanto avec Tour Rocket en 26, flûte avant Ronflex), 55 secondaires (Kanto s1-s30 / Johto s31-s55), arc Dojo dans l'ordre des combats, économie Kanto 275 100₽ ∈ [255k, 290k], **récompenses canon** (Évoli/Porygon/Lokhlass Nv.25, Tyrogue Dojo, Ptéra Nv.30 — espèces/niveaux/objets FRLG vérifiés), **migration V4** (remap complet + idempotence + fin de jeu) et **répétables** (existence, filtre régional, sync FR/EN). Le validateur `official-teams` couvre automatiquement `kanto_dojo_master`.

### Prochaines étapes (grand projet « Histoire & Dresseurs canoniques »)

1. ~~Socle équipes officielles + validateur~~ **Fait (passe 17)**.
2. ~~Arc rival + Team Rocket~~ **Fait (passe 18)**.
3. ~~Arènes + ligues RFVF/OAC~~ **Fait (passe 19)**.
4. ~~Johto étendu (40/38 + film 3)~~ **Fait (passe 20)**.
5. ~~Kanto étendu (60/30/23)~~ **Fait (passe 21)**.
6. ~~**Atoll refondu** (rotation 12 h, timer atoll + roamers routes, 6 équipes/mode/rang en cycle 3 jours à graine datée, descriptions de modes, **mode team prêtée** — victoire imposant de réorganiser Pokémon **et** attaques —, légendaires jamais tous bannis)~~ **Fait (passe 22)**.
7. Équilibrage par simulations (« battable au niveau attendu ») — **dernière étape du grand projet**.

---

## Passe 22 — grand projet Étape 6 : Atoll refondu (rotation 12 h, Usine prêtée, bans de légendaires)

### Objectif et spec validée

L'Atoll (fin de jeu, débloqué après la Ligue Kanto) devient **LE vrai défi** avec la mécanique exacte demandée :

1. **Rotation toutes les 12 h** avec minuteur visible **dans le menu Atoll ET sur les routes des roamers** (même fenêtre UTC partagée) ;
2. **6 équipes par mode et par rang**, en **cycle de 3 jours** (6 × 12 h), tirées d'une **graine déterministe datée** (même date → même équipe pour tous les joueurs ; fenêtre `w` → équipe n°`w % 6`, graine réamorcée à chaque début de cycle) ;
3. **Descriptions de modes en haut de page** de chaque onglet (Tour / Usine / Arène / Dôme) ;
4. **Mode « équipe prêtée »** (Usine) : 6 équipes prêtées en rotation ; chaque **victoire impose de réorganiser l'ordre des Pokémon ET de leurs attaques** (soin complet inclus, mélange déterministe garanti non trivial) ; l'adversaire grimpe la table de rotation et la prime monte de **+25 % de jetons par palier** ;
5. **Légendaires JAMAIS bannis de tous les modes à la fois** : Tour S bannit 4 légendaires/rotation, Finale Dôme 3, Tour Libre **aucun** (refuge garanti) — bans valables pour le joueur ET l'adversaire.

### Changements

- **`src/data/atoll-sets-data.js` (nouveau)** : `ATOLL_SETS` = **64 sets curated** (une entrée fixe par espèce de rang C+ : talent du pool réel en privilégiant les talents actifs du moteur — levitate/intimidate/multiscale/filter/ironFist/static/scrappy…, objet tenu `type_boost`/`choice` uniquement, 4 attaques du pool légal naturel ∪ CT/CS, profil stats). `ATOLL_STAT_PROFILES` = 6 profils IV/EV **total ≤ 18 chacun** (même règle que les dresseurs officiels). `ATOLL_LEGENDARIES` (11 espèces). Les 43 espèces « fun » des rangs E/D passent par un généré fall-back légal **déterministe** (même graines → mêmes sets, sans objet). Couverture vérifiée 1:1 pool↔set par les tests.
- **`src/game/world/atoll-core.js` (nouveau)** : moteur de rotation — `getRotationWindow/TimeLeftMs`, `formatRotationCountdown` (`HH:MM:SS`), cycle info (équipe n/6, jour n/3), PRNG FNV-1a→mulberry32, `ATOLL_MODES` (déplacé du panneau, récompenses/pools inchangées), `getAtollBannedLegendaries`, `getAtollSpeciesList` / `getAtollRotationTeams` (6 équipes/cycle), `buildAtollPoke/Team` (instanciation sets), **série Usine** : `create/get/abandonAtollFactoryRun`, `getAtollFactoryOpponentWindow` (palier n → équipe de rotation `w+n`), `reorganizeAtollFactoryTeam` (soin + double mélange anti-identité), `computeAtollFactoryReward` (+25 %/palier), `ensureAtollState` (centralisé), `startRotationTicker` (registre `appTimer` nommé, met à jour tous les `[data-rotation-timer]` chaque seconde).
- **`src/game/display/fullscreen-panel.js`** : section Atoll réécrite — hero + onglets affichent le **minuteur 12 h** et l'étiquette de cycle, **description de mode en tête d'onglet**, cartes avec **aperçu sprites de l'équipe de rotation** (adverse ou prêtée), **rangée des légendaires bannis** (Tour S / Finale), note « refuge » sur Tour Libre, **carte Série Usine** (palier, composition et ordre courants, attaques, bouton abandon). Démarrage des combats : récupération/création de la série prêtée, blocage si série active dans l'autre mode Usine, fenêtre adverse = palier. Bug historique corrigé au passage : l'ancienne table `preferred` utilisait des ids d'attaques inexistants (`shadowball`, `icebeam`…) silencieusement filtrés → les équipes Atoll tombaient sur des attaques par défaut faibles ; les sets curated corrigent cela.
- **`src/game/world/world.js`** : roamers branchés sur `getRotationWindow()` (fenêtre 12 h partagée avec l'Atoll, comportement inchangé sinon).
- **`src/game/display/location-info.js`** : bandeau roamer enrichi du **minuteur de rotation** (`data-rotation-timer="roam"` + démarrage du ticker).
- **`src/game/combat/battle-flow.js`** : défaite en mode prêté → abandon de la Série Usine (+ notification).
- **`src/loader.js`** : `atoll-sets-data.js` après `official-teams-data.js`, `atoll-core.js` avant `world/world.js`.
- **`src/localization/fr/ui.js` + `en/ui.js`** : descriptions des 4 modes réécrites (règles exactes), `battle_atoll_desc` actualisée, **18 nouvelles clés** (minuteur, cycle, bans, aperçus, série Usine, abandon…), FR/EN synchronisés avec placeholders.
- **`src/assets/styles/cleaned-components.css`** : styles des nouveaux blocs (chips minuteur/cycle, descriptions, aperçus, rangée de bans, carte série).
- **`tests/passe22-atoll.test.js`** (nouveau, **15 tests**) : câblage loader, fenêtres/compte à rebours, déterminisme + cycle 6 équipes × 3 jours, tailles/pools/doublons, **bans** (jamais partout, refuge Tour Libre, variété sur 24 jours, adversaire sans banni), **légitimité des 64 sets** (validateur identique aux dresseurs officiels + objets type_boost/choice + budgets ≤ 18), instanciation conforme, repli E/D, cycle de vie Usine (création/palier/abandon), victoire → soin + réorg garantie + multisets préservés + reproductibilité, prime par palier, anti-identité 40 graines, `ensureAtollState`, parité i18n FR/EN, câblage UI (minuteurs, descriptions).

### Validation

```bash
npm run check                  # validate: OK — build: OK — tests: 259/259 OK (244 + 15)
python3 tools/audit_project.py # 1096 références d'images, 0 manquante (aucun nouvel asset)
```

### Notes

- **Économie** : aucun ₽ ajouté ; seules les jetons Atoll de l'Usine montent avec le palier (×1,25 par victoire de série, arrondi) — boutique inchangée.
- **Sauvegardes** : `G.atoll.factoryRun` se sérialise naturellement (Pokémon = objets simples) ; les parties sans série ne changent pas ; pas de migration nécessaire.
- La rotation des roamers (12 h) et les taux d'apparition sauvages sont inchangés : seul le **minuteur** est nouveau.
- Le concours de capture reste retiré (décision actée lors de la spec).

---

## Passe 23 — grand projet Étape 7 (DERNIÈRE) : équilibrage par simulations — l'Atoll devient mesurablement le vrai défi ✅ GRAND PROJET TERMINÉ

### Objectif

Rendre chaque format de l'Atoll « battable au niveau attendu » — mesuré par le **vrai moteur de combat** (simulateur headless `tools/sim_battles.mjs`, sandbox vm, RNG seedé déterministe) — avec la difficulté cible : quêtes faciles, arènes franchissables, ligue corsée, **Atoll = LE vrai défi**.

### Mesure et cible

Benchmark joueur : 6 Pokémon lv 100 entraînés (EV 18/18 max légal, objets type_boost, meilleurs coups du pool légal), **jamais d'adaptation d'équipe d'une fenêtre à l'autre** = borne basse. Borne haute mesurée avec une équipe **adaptée via l'aperçu de rotation** (mécanique en jeu). 8 fenêtres de rotation (40–47) × 12-24 runs, taux déterministes.

| Mode Atoll | Benchmark figé | Équipe adaptée | Verdict |
|---|---|---|---|
| Tour E / D | 100 % | 100 % | entrée fun ✓ |
| Tour C | 98-99 % | — | ✓ |
| Tour B | 92,7 % | — | ✓ |
| Tour A | 73,4 % | — | ✓ |
| Tour S | 61,5-66 % | 77,1 % | vrai défi ✓ |
| Tour Libre | 16,7-18 % | 57,3 % | **défi ultime** ✓ |
| Usine C / A | 87,5 / 93,8 % | miroir | fun série ✓ |
| Arène 3 Pokémon | 25,0 % | 85,9 % | contrainte ✓ |
| Arène sans objets | 10-18,2 % | 96,4 % | contrainte dure ✓ |
| Arène pression types | 38,0 % | 95,8 % | contrainte ✓ |
| Dôme quarts | 69-71,4 % | — | ✓ |
| Dôme finale | 34-36,5 % | 86,5 % | vrai défi ✓ |

### Changements d'équilibrage (après mesure)

1. **`src/data/atoll-sets-data.js` — 37 sets durcis** : remplacement des coups de setup/statut (sabordés par l'IA round-robin = tours perdus) par les meilleures attaques du pool légal (règle « 4 attaques » sur la Tour/Dôme, « ≥3 » Arène, « ≥2 » rang C) ; nukes sans contrepartie exploitées (`overheat`, `draco_meteor`, `leaf_storm` — le moteur ignore les self-drops, audit moteur documenté) ; talents basculés vers les talents **réellement implémentés** du moteur (∈ pool joueur : `multiscale`, `filter`, `thickFat`, `solarPower`, `noGuard`, `voltAbsorb`, `sandVeil`, `levitate`, `static`…, jamais de régression vers un talent inerte) ; objets fixés `choice_band`/`choice_specs` (règle économique). Profils budgets **36/36** (exception endgame déjà actée) confirmés par simulations.
2. **`src/game/world/atoll-core.js` — `statScale` par mode** : l'Arène 3v3 (3 modes) applique des budgets ×0,5 (→ 18/18, niveau campagne) — imposé par les simulations : à budgets 36/36 l'Arène devenait imbattable (2,6 %), la restriction de format doit être le défi, pas les stats.
3. **`src/data/official-teams-data.js` — 62 talents hors pool corrigés** (détectés par le validateur) : les nerfs cross-classe `noguard`/`solarpower`/`thickfat` (casse) de la passe 23 ont été remplacés par des talents **obtenables** de flavor proche (`bigPecks`, `insomnia`, `chlorophyll`, `blaze`…) — légitimité restaurée sans changer l'équilibrage mesuré (rivaux tardifs : victory 96 %, johto_victory 76 %, silph 100 % — gates gagnables).
4. **`tests/passe22-atoll.test.js`** : assertions budgets ≤18 → **≤36** (exception endgame documentée).
5. **`tests/passe23-simulations.test.js`** (nouveau, 2 tests) : le vrai moteur rejoue chaque mode sur 8 fenêtres et exige les **bandes cibles** ci-dessus + l'échelle de difficulté (C ≥ A, S ≤ C, Libre/Dôme finale durs) + `statScale` 0,5 effectif et budgets Tour intacts.
6. **`tools/sim_battles.mjs`** : section atoll alignée sur la mesure 8 fenêtres + plafonds joueur (`playerCap`, `noItems`) ; exportable pour le test (garde `import.meta`).

### Validation

```bash
npm run check                  # validate: OK — build: OK — tests: 261/261 OK (259 + 2)
python3 tools/audit_project.py # 1096 références d'images, 0 manquante
```

### Notes de fin de projet

- **Économie** : inchangée (aucune injection ₽/jetons, captures légendaires toujours 0 côté dresseurs).
- **Canon** : espèces/niveaux RFVF (Kanto) et OAC (Johto) figés ; movesets/talents légitimes vérifiés par le validateur (261 tests).
- **Binaire des fenêtres** : les taux par fenêtre restent binaires (0/100 %) car les combats sont quasi-déterministes (pas de critiques dans le moteur, seul bruit = rand 85-100 %) — c'est voulu : la **préparation** (aperçu de rotation, adaptation) fait la différence, comme mesuré (Tour Libre 18 % figé → 57 % adapté).
- Le grand projet « Histoire & Dresseurs canoniques » (passes 17→23) est **terminé** : canon Kanto/Johto, quêtes 1-60 + secondaires + répétables, Atoll refondu et équilibré par simulations.

---

## Passe 24 — correctifs des 8 bugs remontés après tests en jeu

### #1 Talents absents de certaines fiches (dresseurs, arènes, Ligue, Atoll) ✅

- **Cause racine** : incohérence de casse systémique. Les pools par espèce (`POKE_TALENTS`), les talents cachés (`POKEMON_TALENTS.hiddenAbility`, en double dans `pokemon-talents.js`) et plusieurs talents épinglés des sets curés étaient en **camelCase** (`waterAbsorb`, `noGuard`, `thickFat`…), alors que le moteur de combat (comparaisons `talent === '…'`), `TALENTS_FULL`, les locales et les sets curés normalisés en passes 22-23 sont en **minuscules**. Conséquences : filtre `TALENTS_FULL[tal]` vide (raretés « Inconnu », fiches affichant « Aucun talent ») **et talents inertes en combat** pour tout id camelCase.
- **Correctif** : normalisation des ids à la source via `tools/normalize_talent_ids.mjs` (idempotent) — 3 140 ids de pools + 90 talents `official-teams` + 32 talents positionnels des sets atoll + 132 `hiddenAbility` de `pokemon-talents.js`. Nouveau helper canonique `getTalentRecord(key)` (exact → minuscules) dans `game-helpers.js`, adopté par `createPoke`, les jets de capture (`catch.js`), les pools d'atelier (`training.js`), les fiches (`poke-modal.js`), le dictionnaire (`fullscreen-panel.js`, `pokedex.js`) et la validation à la sauvegarde (`save.js`). `getTalentName`/`getTalentDesc` essaient l'id exact puis sa forme minuscule (vieilles sauvegardes). La fiche readonly n'affiche **plus jamais** « Aucun talent » quand un talent existe : elle affiche au minimum le nom, la sauvegarde étant auto-réparée au chargement (casse canonique du talent conservé).
- **Couverture vérifiée** : les 158 ids distincts des pools (251 espèces) et les 234 talents cachés sont tous résolubles dans `TALENTS_FULL`.

### #2 Jamais de talent caché en face — comportement voulu (documenté)

C'est **par design** : le talent caché est la récompense de progression du joueur via l'atelier (sessions « talent caché » débloquées après la Ligue). Les sets adverses n'en épinglent pas. `POKEMON_TALENTS[id].hiddenAbility` sert de *référence* et la fiche d'espèce affiche désormais correctement la section « Talent Caché » (normalisation #1). Aucun changement de mécanique : l'équilibrage mesuré en passe 23 reste valable.

### #3 Atelier talent / talent caché jamais débloqué ✅

- **Cause** : `isTrainingModeUnlocked('talent'|'hidden')` exigeait le badge `'elite4'` dans `G.badges`… or une victoire de Ligue **ne l'y inscrit jamais** (`battle-switch.js` appelle `markRegionLeagueWon` à la place) — l'atelier restait verrouillé à vie.
- **Correctif** : nouveau prédicat `isLeagueBeaten()` (victoire Kanto *ou* Johto via `isRegionLeagueWon` / `championTitle`, avec rétro-compat badges). Aucune migration requise : les sauvegardes déjà champions sont reconnues immédiatement.

### #4 Slots d'entraînement asymétriques + auto « tout faire » sur sessions verrouillées ✅

- **Causes** : `resolveTrainingAutoMode` chaînait talent → caché → attaque → EV → niveau **sans vérifier les déblocages** (l'auto lançait l'atelier verrouillé au lieu de passer à la session suivante) ; `startTrainingBattle` n'avait aucun garde-fou ; et la libération de slot en fin d'entraînement écrivait directement dans le tableau **sans purger `selectedTraineeUid`**, donc `ensureTrainingSlots()` réinstallait aussitôt le même Pokémon — le slot 1 « ne passait jamais au suivant », pendant que des parcours annexes vidaient le slot 2 prématurément.
- **Correctif** : `resolveTrainingAutoMode` n'enchaîne que les sessions **débloquées et utiles** (renvoie `null` = « terminé ») ; `trainingAutomationEligible` ignore les modes verrouillés ; `startTrainingBattle` refuse proprement une session verrouillée (notification « Débloqué après … ») ; nouvelle règle **unique pour les deux slots** : on reste sur le Pokémon tant qu'un entraînement débloqué de sa chaîne reste utile, puis `clearTrainingSlot` (purge complète) et le prochain Pokémon de la file prend le slot (`pullNextQueuedTraining`) — avec automatisation, le combat suivant repart seul ; sans automatisation, le joueur choisit la session. Nouvel indicateur `hasAnyUnlockedTrainingAvailable`.

### #5 Clic droit muet dans le sac en mode « changer d'objet » ✅

- **Cause** : le sélecteur d'équipement (`team-ui.js`) ne portait que le handler clic gauche `equipItemDirect` — pas le `data-context-call="openItemInfo"` présent sur le sac normal.
- **Correctif** : attributs `data-context-call`/`data-context-args` ajoutés sur chaque ligne (système contextmenu existant, non modifié).

### #6 Usine (équipe prêtée) : pas d'écran pré-combat ✅

- **Avant** : cliquer le mode lançait le combat immédiatement, sans voir ni pouvoir réordonner l'équipe prêtée (ordre des Pokémon = premier envoyé, ordre des attaques = ordre des boutons).
- **Correctif** : `prepareAtollFactoryBattle(mode)` crée la série et affiche désormais un **éditeur pré-combat** dans l'onglet Usine : chaque Pokémon (sprite, nom, niveau) avec flèches ▲▼ d'ordre et chaque attaque déplaçable individuellement (`atollFactoryMovePoke` / `atollFactoryMoveMove`, sauvegarde + re-rendu), bouton **« Combattre »** qui lance ensuite le combat, bouton abandon conservé. La réorganisation forcée post-victoire (signature du mode) reste inchangée — le joueur ré-ajuste avant chaque palier. Styles dédiés ajoutés (`cleaned-components.css`).

### #7 Ajout d'équipe pas toujours en fin ✅

- **Cause** : un clic sur une carte Pokémon de l'équipe mémorise `_swapFromTeamIdx` (mode échange) ; fermée autrement que par « Annuler », la modale laissait l'index en place — le prochain Pokémon choisi faisait un **swap à l'ancienne position** au lieu de s'ajouter en fin.
- **Correctif** : point d'entrée dédié `openAddToTeamSelector()` qui purge explicitement l'index résiduel ; les deux cartes « + » (fenêtre équipe `team-ui.js` et `team-manage.js`) y passent. Le flux d'échange volontaire (clic carte → sélecteur) est inchangé.

### #8 Internationalisation ✅

- **Talents** : 41+ descriptions tronquées (« Grants immunity to », « on  weather »…) réparées **à la source** (`talents-full.js`) et dans les deux locales ; `fr/talents.js` régénéré **100 % français** (202 entrées : noms canoniques FR — Intimidation, Lévitation, Absorb Eau, Voile Sable, Vaccin, Tempo Perso… — et descriptions cohérentes avec les mécaniques du moteur) par `tools/gen_talent_locales.mjs`. Les immunités indiquent leur statut : sommeil (Insomnia), poison (Vaccin), paralysie (Échauffement), confusion (Tempo Perso), gel (Armumagma), brûlure (Ignifu-Voile).
- **Attaques** : le panneau lisait `mv.desc` (anglais) avant la locale ; nouvelle priorité locale → données. `fr/move-descs.js` créé par `tools/gen_move_descs_fr.mjs` : **400 descriptions françaises** (les 196 gabarits distincts traduits, couverture vérifiée — le générateur échoue si une description n'a pas de traduction).
- **Types** : `fr/types.js` / `en/types.js` ajoutés (domaine nested prévu mais jamais rempli), helper `getTypeName()` (`'Fire' → 'Feu'`) câblé sur les fiches Pokémon, le Pokédex, le dictionnaire des attaques, le panneau d'info d'attaque et les badges d'objets (`PokeCore.badge.type`, `item-engine`).
- **Couleurs de statuts** : nouveau `replaceStatusTerms` (badge-helper) colorant brûlure, poison, empoisonnement grave, paralysie, gel, sommeil, confusion — formes conjuguées incluses (« brûler », « paralyser », « endormir »…) — appliqué aux descriptions d'attaques (`openMoveInfo`), de talents (`openAbilityInfo`) et d'objets (`openItemInfo`), comme l'étaient déjà météo et champs.

### Validation passe 24

```bash
node tools/normalize_talent_ids.mjs  # 3 140 + 90 + 32 + 132 ids de talents normalisés
node tools/gen_talent_locales.mjs    # 202 talents FR + 47+47 descriptions réparées
node tools/gen_move_descs_fr.mjs     # 400 descriptions d'attaques FR
npm run check                        # validate: OK — build: OK — tests: 274/274 OK (261 + 13)
python3 tools/audit_project.py       # 1096 références d'images, 0 manquante
```

- Nouvelle suite `tests/passe24-bugfix.test.js` (13 tests) : normalisation des pools/cachés/sets, résolution tolérante à la casse, talent toujours attribué à la création, déblocage atelier via la Ligue (Kanto & Johto), chaîne auto « tout faire » filtrée + lancement verrouillé refusé, avancée de la file manuelle en fin d'entraînement, handler clic droit du sac, éditeur Usine (création de série sans combat, déplacements Pokémon/attaques, bornes), purge de l'index de swap, types localisés, 400 descriptions d'attaques FR lues en priorité, statuts colorés, talents 100 % FR sans texte tronqué.
- Effets de bord recherchés : aucune modification d'économie, d'espèces, de niveaux ou de movesets ; la normalisation des talents rend *actifs* en combat des talents épinglés auparavant inertes (comportement attendu et validé — les 274 tests, dont la légitimité des sets et les bandes de difficulté de l'Atoll, restent verts).

---

## Passe 25 — correctifs des 3 retours après la passe 24

1. **Description du bouton d'entraînement « talent caché » cassée** (`training_mode_hidden_…` brut affiché) : le mode interne s'appelle `hidden` (`getTrainingModeDescription` construit `training_mode_hidden_desc` / `_done`) alors que seules les clés `training_mode_hidden_talent_*` et `training_mode_hidden_title` existaient. Ajout des clés `training_mode_hidden_desc` / `training_mode_hidden_done` en FR et EN (`src/localization/fr/ui.js`, `en/ui.js`).
2. **Fiche objet ouverte depuis le sélecteur d'équipement : le bouton retour ramenait au sac global** : le sélecteur « équiper » est rendu DANS le panneau plein écran inventaire, donc `pwInfoCaptureSource` capturait `{kind:'fs', panel:'inventory'}`. Nouveau wrapper `openItemInfoFromEquip(key, teamIdx)` (team-ui) qui pose l'indication `window._pwEquipInfoFrom` AVANT l'ouverture — `pwInfoCaptureSource` la lit en priorité (libellé ET comportement exacts) — avec filet de sécurité post-ouverture. `pwInfoBack`/`pwInfoBackLabel` gèrent `kind:'equip-select'` → réouverture du sélecteur via `openItemSelector(teamIdx)` + clé i18n `back_to_equip_selector`.
3. **Usine (atoll) : le panneau de réorganisation pré-combat devient un clone de la fenêtre « Équipe Active »** :
   - Nouveau panneau dédié (`openAtollFactoryPrep`, `#poke-modal` + classe `.atoll-prep-modal`) rendu par `renderAtollFactoryPrep` avec les MÊMES cartes `generatePokeCardHTML` que l'Équipe Active, empilées dans un conteneur `.team-view` : réorganisation par **glisser-déposer** des cartes (ordre des Pokémon) et des attaques (attribut dédié `data-atoll-move-drag`, même Pokémon uniquement) via `installAtollPrepDragDrop` → `atollFactorySwapPoke` / `atollFactorySwapMoves` (persistés, panneau re-rendu).
   - Lecture seule conformément à la demande : **pas de changement d'objet** (badge en info-seule via `itemReadonly`, masqué si aucun objet), **pas de changement d'attaques** (ordre seul), **pas de changement de talent** (`noSpriteHandlers` : aucune fiche éditable). Nouvelles options de `generatePokeCardHTML` : `noSpriteHandlers`, `itemReadonly`, `moveDragAttr`, `moveInfoContextless`, `spriteTitle`.
   - La fiche attaque (clic droit) revient à la préparation : option `moveInfoContextless` (pilule sans contexte `-1`) + `pwInfoCaptureSource` qui détecte `window._atollPrepOpen` → source `kind:'atoll-prep'` → `pwInfoBack` rouvre `openAtollFactoryPrep` (clé i18n `back_to_atoll_prep`).
   - L'onglet Usine ne montre plus qu'une **carte de statut** de la série (sprites + bouton « ⚙ Organiser l'équipe prêtée » `atoll_factory_prep_open`) ; `prepareAtollFactoryBattle` crée la série puis ouvre le panneau ; boutons **Combattre** (`atollFactoryPrepFight`) et **Abandonner** (`atollFactoryPrepAbandon`) ; toutes les fermetures génériques (croix, `close-poke-modal`, `openFullscreenPanel`) purgent `_atollPrepOpen` et la classe `.atoll-prep-modal` (file-preflight + file-postboot).
   - L'ancien éditeur à flèches (`atollFactoryMovePoke`/`MoveMove`, CSS `.atoll-edit-*`/`.atoll-mini-*`) est supprimé ; hint i18n réécrit (glisser-déposer) en FR/EN.

### Validation passe 25

```bash
npm run check                  # validate: OK — build: OK — tests: 278/278 OK (274 + 4)
python3 tools/audit_project.py # 1096 références d'images, 0 manquante
```

- Nouvelle suite `tests/passe25-bugfix.test.js` (4 tests) : clés i18n `hidden` résolues via `getTrainingModeLabel`/`getTrainingModeDescription` (FR+EN), wrapper `openItemInfoFromEquip` (source `equip-select` posée, indication lue par la capture, retour `openItemSelector`, libellé FR), rendu vm du panneau de préparation (cartes `.poke-card` + `.team-view`, drags dédiés, aucune édition objet/talent, ouverture/fermeture + drapeau), swaps Pokémon/attaques (inversion, bornes, identité), absence de l'ancien éditeur à flèches, navigation `atoll-prep`, i18n.
- Tests historiques ajustés sans changement de comportement : `tests/passe24-bugfix.test.js` (#5 → clic droit via le wrapper ; #6 → swaps du glisser-déposer), `tests/info-panel-navigation.test.js` (pilules d'attaques : assertion d'exécution — contexte `-1` par défaut, contexte nu avec `moveInfoContextless`), `tests/passe17-team-locks.test.js` intact (le littéral `data-move-drag` est conservé dans la branche par défaut).

---

## Passe 26 — QoL bêta : CT/CS éparpillées, infos « où trouver / qui peut l'avoir », sac unifié boîte PC, drag & drop unifié, presets prévisualisés, suppression de sauvegarde rouge

Grosse passe de confort pré-bêta demandée après validation de la passe 25 : unifier le glisser-déposer, vendre les CT/CS en les éparpillant, améliorer les presets d'équipe + 5 ajouts (panneaux d'info, dictionnaire, sac, paramètres).

1. **A. Toutes les CT canoniques sont achetables, éparpillées dans les 20 boutiques des deux régions** (règle « bon jeu » : Kanto = attaques gen 1 uniquement, Johto = gen 2 + restes gen 1, jamais de CT gen 3+ vendue) :
   - Nouvel outil `tools/gen_ctcs_shops.mjs` (listes GEN1 = 165 attaques RFVF / GEN2 = 86 attaques OAC hardcodées) qui génère `src/data/ctcs-shop-data.js` : `CTCS_SHOP_STOCK` (43 CT vendables réparties dans les 20 boutiques `pallet…indigo` + `jnewbark…jblackthorn`, **une seule boutique par CT**, triées par prix, préférence thématique ville-arène puis équilibrage, puissance ≥ 110 → `indigo`/`jblackthorn`), `CTCS_PRICES` (paliers 25 000 statut / 30 000 ≤ 60 / 45 000 ≤ 90 / 60 000 ≤ 110 / 80 000 > 110 — patch appliqué au chargement si prix absent, 28 CT reçoivent un prix), `CTCS_META` (move + génération par CT vendue), `CTCS_UNSOLD` (64 CT gen 3+ volontairement jamais vendues : `electricterrain`, `dracometeor`, `voltswitch`…).
   - `src/loader.js` charge `ctcs-shop-data.js` après `items-helpers` ; `renderShop` (shop.js) fusionne le stock CT/CS au stock de base (dédoublonné). Résultat : le joueur doit **visiter les deux régions entières** pour compléter sa collection de CT, et la Ligue (`indigo`, verrouillée par `G.championTitle`) garde les plus grosses attaques.
2. **B. Panneaux d'information : « où trouver » et « qui peut l'avoir » partout** :
   - Nouvelles fonctions dans `src/data/game-helpers.js` (+ exports window) : `getItemSourceList(key)` (routes, herbes/boutiques/mine/quêtes/labo **et atoll + CT** — couvre ce que `findItemSources` manquait) et `getMoveLearners(moveId)` (cache ; 3 catégories : montée en niveau via `getSpeciesMovePool`, CT/CS via `getCtCsMoveIds`, dressage = reste du pool complet).
   - Fiche objet (`openItemInfo`, items-helpers) : la section « 📍 Où trouver » (auparavant alimentée par le stub `window.ItemDB` quasi vide → toujours vide) liste maintenant toutes les sources (`pw-src-list`/`pw-src-line`, fallback sur l'ancien `getItemSource`). `findItemSources` devient un wrapper de `getItemSourceList`.
   - Fiche attaque (`openMoveInfo`, poke-modal) : nouvelle section `learners_title` avec 3 lignes — `learners_level` / `learners_ctcs` / `learners_training` — en chips « #id nom » (cap 24 + `dict_and_n_more`).
   - Fiche talent (`openAbilityInfo`, fullscreen-panel) : nouvelle section `hidden_carriers` (chips `dict-chip-hidden`) listant les porteurs du talent **caché** (scan `POKEMON_TALENTS.hiddenAbility` insensible à la casse) — la liste des talents normaux existait déjà.
3. **C. Dictionnaire épuré** (`renderDictionary`) : les listes en `<small>` (sources des objets, élèves des attaques, porteurs des talents + mention `dict_ability_carriers`) sont retirées des cases — l'info vit désormais uniquement dans les panneaux d'info du point 2. Les spans d'état (possédé / connue par N / débloqué·rareté) sont conservés.
4. **D. Sac réaménagé, unifié avec la boîte PC** (`inventory.js`) :
   - Catégories cohérentes : les baies passent de `berry` à **`held`** (objet tenu — elles portent déjà `type:"held"` dans les données), le fourre-tout `misc` devient `special` (plus de filtres « Baies » / « Divers » orphelins).
   - `renderInventory` réécrit : barre d'outils `box-filter-panel ui-control-toolbar--box` **intégrée au contenu** (même interface que la boîte PC : select Catégorie `setInvCat`, select Tri `setInvSort` en `data-change-args="this.value"`, champ recherche `data-action="filter-bag"` (`_invSearch`/`setInvSearch`), bouton `resetInvFilters`) ; l'ancienne barre externe `#fs-panel-filters` est désactivée ; focus recherche si une recherche est active ; tri « catégorie » départagé par le nom ; handler `input` `filter-bag` ajouté dans `file-postboot.js`.
5. **E. Paramètres : suppression de sauvegarde clairement dangereuse** (index.html) : classe `pw-btn-danger` (rouge) sur les boutons « Supprimer la sauvegarde » et « Confirmer », span `data-i18n="delete_save_warning"` (⚠) dans la rangée de confirmation (`.delete-danger-zone`). La confirmation existait déjà mais sans AUCUN signal visuel.
6. **F. Drag & drop unifié** : nouvelles fonctions `pwDragGhostHtml` / `pwApplyDragGhost` (+ exports) dans `sprite-helpers.js` → preview identique (`pw-drag-ghost`) quelle que soit la chose déplacée, appliquée aux 5 sites : carte d'équipe (sprite + nom + `Nv`), pilule d'attaque d'équipe (badge de type + nom), carte Usine + attaque Usine (panneau de préparation lancé passe 25), et fenêtres (`win-drag` — ghost `pw-drag-ghost-win` + hint `drag_win_hint`). Avant : seul `teamDragStart` avait `setDragImage`, tout le reste affichait le rendu navigateur par défaut.
7. **G. Presets d'équipe prévisualisés** (`team-ui.js`) : `resolvePresetPoke(uid)` (résout dans l'équipe puis la collection, `{p, here}`) + `renderTeamPresetsToolbar` réécrit : jusqu'à **6 chips** par preset (sprite 20 px, `in-box` grisée + pointillés si le Pokémon est dans la boîte, `missing` « ? » + `preset_missing_hint` s'il a disparu, `preset-chip-empty` sinon) avec tooltips nom/Nv/localisation.

### Validation passe 26

```bash
node tools/gen_ctcs_shops.mjs   # 43 CT vendables gen≤2 / 20 boutiques / 64 CT gen3+ exclues — invariant vendues∪non-vendues = toutes les CT, sans doublon
npm run check                   # validate: OK — build: OK — tests: 285/285 OK (278 + 7)
python3 tools/audit_project.py  # 1096 références d'images, 0 manquante
```

- Nouvelle suite `tests/passe26-features.test.js` (7 tests) : A — invariant vendues ∪ non-vendues = toutes les CT + unicité de la boutique par CT + Kanto = gen 1 uniquement + prix présents + chacune des 20 boutiques a ≥ 1 CT + câblage loader/shop ; B — sources (route/boutique/Atoll/CT) + élèves (3 catégories) + câblage des 3 panneaux ; C — absence des `<small>` listes dans les 3 branches du dictionnaire ; D — `itemCat` baies→held/misc→special + rendu de la barre boîte-PC + recherche/reset ; E — danger rouge + warning ; F — helper ghost + présence aux 5 sites + capture fonctionnelle (vm) ; G — chips/in-box/missing/empty.
- i18n (FR + EN, `[fr|en]/ui.js`) : `learners_title`, `learners_level`, `learners_ctcs`, `learners_training`, `hidden_carriers`, `dict_and_n_more`, `bag_search_placeholder`, `delete_save_warning`, `preset_missing_hint`, `drag_win_hint`.
- CSS (`cleaned-components.css`) : `.pw-drag-ghost(-ico/-txt/-win)`, `.pw-src-list/-line`, `.dict-chip-line/.dict-chip-list/.dict-chip-hidden`, `.box-filter-search`, `.team-preset-group/-btns/-chips`, `.preset-chip(.in-box/.missing/-empty)`, `.delete-danger-zone`, `.delete-warn`.
- Effets de bord recherchés : aucune modification d'espèces, de niveaux, de movesets, de talents ou d'économie existante (prix des CT = ajout purement additif ; `./tools/sim_battles.mjs` = comportement inchangé). Les 64 CT gen 3+ restent obtenables en debug uniquement — décision canonique assumée.

---

## Passe 27 — retours bêta : descriptions d'objets corrigées, baies sans effet retirées du jeu, sac en onglets, réglages réparés, preview de drop, vraie gestion des équipes (20 presets + éditeur)

1. **A. Descriptions d'objets (Orbe Toxique & co) réparées** :
   - *Statut manglé (« …inflige **poison**">Empoisonné »)* : `replaceStatusTerms`/`replaceWeatherTerms` (badge-helper) remplaçaient les mots-clés **à l'intérieur des balises HTML** déjà injectées (`data-buff="poison"` des badges de statut construits par ItemEngine). Nouveau helper `_replaceOutsideTags` (découpe sur les balises, ne traite que les nœuds texte) appliqué aux **15 remplacements** des deux fonctions — tous les objets/attaques à badges co-injectés sont couverts (orbes, roches météo, descriptions d'attaques).
   - *« xx1.15 »* : la clé FR `held_damage_boost` finissait déjà par « x » et le code ajoutait `x` + valeur. Clé corrigée (`…du porteur de `).
   - *Cadre puissance moche (Orbe Vie, Amulette Claire, Restes…)* : la section encadrée `⚡ x1.20 (max x2.00)` est **supprimée** du panneau ; la description porte désormais la puissance **en ligne** — « Augmente la puissance de x1.20 (max x2.00). » (clé i18n `held_power_sentence`, `powStr` mutualisé dans `generateItemDesc` : branches type_boost / choix / orbes / roches + append aux `desc_*` & `effect` à formule + phrase complète si aucune description). Les orbes/roches passent un **libellé texte** du statut (`_statusLabel`) que le badgeur tag-safe colore ensuite — fini les badges imbriqués.
2. **B. Baies Oran / Sitrus / Ceriz SUPPRIMÉES du jeu** (sans effet réel) : retirées de `ITEMS`, des 15 boutiques, des drops de routes, de l'ItemDB legacy, des sprites (`ITEM_SPRITE_DATA` + 3 PNG effacés) et des localisations FR/EN. **Récompenses de quêtes compensées** : les 58 récompenses en baies (30 secondaires + 28 principales, uniquement des *rewardItems*, jamais des objectifs) deviennent de la **Poussière Étoile** (même quantité, vendable) ; le tutoriel donne 2 stardust au lieu de 3 Oran. **Sauvegardes purgées** au chargement (`normalizeLoadedState` : liste unique `RETIRED_ITEMS`, sac + `teamSlotItems` + **objets tenus** en équipe **et** en boîte).
3. **C. Sac réorganisé en ONGLETS** (comme les pages « boîte/fossiles » du PC) : le select de catégorie et l'onglet « Tous » disparaissent ; 6 onglets (Objets tenus / CT-CS / Évolution / Fossiles / Trésors / Spécial) avec **compteurs**, tri + recherche conservés (recherche **globale** pendant la saisie), atterrissage sur le 1er onglet non vide tant que le joueur n'a pas cliqué, et **onglet « Objets tenus » forcé pendant un équipement** (`_equipCallback` actif) → équiper est direct.
4. **D. Réglages réparés** : les boutons « Supprimer / Confirmer » n'étaient **pas rouges** — la règle générique `.hbtn:not(…` (spécificité 8 classes, chargée après) écrasait `.pw-btn-danger` : `:not(.pw-btn-danger):not(.pw-btn-cancel)` ajouté + `.pw-btn-danger` renforcé (`!important`, texte blanc). **En-tête des réglages vraiment fixe** : le `sticky` était cassé par l'en-tête canonique (marges/padding/fond quasi transparent chargés après) → bloc dédié fin de cascade (`position: sticky; top: 0`, fond opaque, `padding-top: 0` sur `#settings-inner`).
5. **E. Drag & drop : preview du RÉSULTAT** — bulle flottante `pw-drop-preview` qui suit le curseur et montre **l'échange à venir** (source ⇄ cible, sprites/badges + noms) via `pwDropPreviewShow`/`pwSwapPreviewHtml`/`pwDropPreviewHide` (sprite-helpers). Câblée sur les **5 sites** : cartes d'équipe, attaques d'équipe, cartes Usine, attaques Usine **et** cartes de l'éditeur de preset (point 6) ; masquée proprement au drop/dragend/dragleave (garde `relatedTarget` anti-scintillement).
6. **F. Vraie gestion des équipes (20 presets)** : `ensureTeamPresets()` (team-manage, `PRESET_MAX = 20`) garantit `preset1…preset20` (noms hérités 1-3, autres `preset_default_name` localisé) + migration des vieilles sauvegardes (`normalizeLoadedState`). La barre de presets devient **un bouton « 🗂 Gérer mes équipes »** (nom + taille du preset actif affichés). Panneau plein écran `renderPresetManager` (route `presets`) : 20 lignes (n°, **renommage en ligne**, chips sprites des 6 membres (grisées boîte / « ? » disparu), compteur, Charger / Sauver ici / **Modifier**, ligne active). **Éditeur d'équipe** `openPresetEditor` (modale clone de la préparation Usine : MÊMES cartes `generatePokeCardHTML`) — clic sprite = **changer de Pokémon** (sélecteur intégré avec recherche, équipe + boîte, dédoublonné, cap 6, retrait), badge objet = **gérer l'objet tenu** (sélecteur intégré — membres de l'équipe active uniquement, cohérent avec `syncTeamSlotHeldItems` qui purge les tenus en boîte ; double équipement refusé), clic droit = **fiche du Pokémon pour le modifier** (retour automatique à l'éditeur via `_presetEditorReturn` + `pwInfoBack` `kind:'preset-editor'`), **glisser-déposer = réordonner** (swap persisté). Boutons « Appliquer à l'équipe » / « 💾 Sauver l'équipe actuelle ici ».

### Validation passe 27

```bash
npm run check                   # validate: OK — build: OK — tests: 292/292 OK (285 + 7)
python3 tools/audit_project.py  # 1093 références d'images, 0 manquante (1096 - 3 PNG de baies)
node tools/sim_battles.mjs      # difficulté atoll/arènes inchangée (aucune modif d'économie active)
```

- Nouvelle suite `tests/passe27-features.test.js` (7 tests) : descriptions propres (pas de `**`, pas de `xx`, badges intacts, cadre ⚡ retiré, EN cohérent) ; retrait intégral des 3 baies (données, quêtes, tutoriel, purge de sauvegarde par littéraux) ; sac à onglets (atterrissage, clic, recherche globale, forçage équipement, reset) ; réglages (exclusions CSS `:not`, rouge `!important`, sticky opaque) ; preview de drop (helpers exportés, câblage 2+2+1 sites, bulle fonctionnelle contenant les deux Pokémon, masquage) ; gestionnaire (20 presets garantis + migration, rendu 20 lignes, renommage avec repli, éditeur ouvert, swap/pick persistés, navigation des fiches, i18n FR) ; objets de l'éditeur (sélecteur tenables, équipement via slot réel, refus double, retrait, refus boîte explicite).
- Suites existantes mises à jour (comportement voulu) : `tests/passe26-features.test.js` (témoin de sources Oran→Prine, sac à onglets, reset → onglet tenus, toolbar presets = bouton du gestionnaire), `tests/equip-held-items.test.js` (baie Oran→Babiri), `tests/passe14-gen3-fossils.test.js` (regex de la liste de retrait mutualisée `RETIRED_ITEMS`).
- i18n (FR+EN) : `held_power_sentence`, `preset_default_name`, `panel_presets_title`, `teams_manager_open`, `presets_hint`, `preset_active_tag`, `preset_load_btn/save_btn/edit_btn`, `back_to_presets`, `back_to_preset_editor`, `preset_editor_sub/hint/sprite_hint`, `preset_add_lbl/apply_btn/save_current_btn/remove_member`, `preset_pick_poke_title/pick_search_ph/in_team_tag/pick_item_title/items_team_only/remove_item/no_item`.
- CSS : `.pw-drop-preview(+side/txt/arrow)`, `.inv-tabs/.inv-tab(.active)/.inv-tab-count/.inv-controls`, `.preset-list/.preset-row(.active)/.preset-row-idx/.preset-name-input/.preset-row-chips/.preset-chip-more/.preset-row-count/.preset-row-actions/.preset-active-tag`, `.team-presets-open-btn`, `.preset-slot-empty/.preset-slot-missing/.preset-pick-search/.preset-pick-list/.preset-pick-row/.preset-pick-tag(.in-box)`, bloc réglages passe 27 dans `pw-unified.css`.
- Effets de bord recherchés : économie atoll/jetons inchangée ; movesets/talents/espèces intacts ; les objets des presets ne changent que par les flux existants ; suppression des baies = retrait pur sans remplacement d'effet (elles n'en avaient pas).

---

## Passe 27b — correctif : statut « Poison » non badgé dans la description de l'Orbe Toxique (retour bêta jour 0)

1. **Le mot de statut n'avait pas sa couleur** dans la description de l'Orbe Toxique : la passe 27 injectait le libellé FR `status_poisoned` = « Empoisonné », or le badgeur (`replaceStatusTerms`) s'appuie sur des bornes de mot `\b` ASCII qui **ne matchent jamais après une lettre accentuée** (`é` final). Deux corrections :
   - Libellé FR = le substantif **`status_poison` « Poison »** (comme les jeux officiels), utilisé par `_statusLabel` — la description affiche « …mais inflige **Poison** » avec le badge violet, conforme à l'attente.
   - Robustesse générale : la borne finale de la regex poison devient `(?![\p{L}])` (flag `u`) — tout mot accentué terminal redevient badgable où qu'il apparaisse (descriptions d'attaques, futurs objets).
2. **Vérification croisée FR/EN de tous les objets concernés** : seuls 2 objets ont un `statusEffect` (Orbe Toxique = poison, Orbe Flamme = brûlure) et 4 roches météo (Soleil/Pluie/Grêle/Tempête de Sable). Les 6 sont désormais **badgés en FR comme en EN** (« Poison »/« Poisoned », « Brûlure »/« Burn », météos) — test dédié ajouté (boucle statutItems × langues).

### Validation passe 27b

```bash
npm run check                   # 292/292 OK (suite passe27 A enrichie : badge « Poison » + boucle 6 objets × 2 langues)
python3 tools/audit_project.py  # 1093 références d'images, 0 manquante
```

- Effets de bord : aucun (libellé affiché uniquement ; l'EN garde « Poisoned » qui était déjà badgé correctement).

---

## Passe 28 — refonte AFK / hors-ligne par fast-forward du vrai moteur (voie « Melvor »)

Contexte : l'AFK et le timeskip avaient « de gros problèmes » (ne fonctionnaient pas
partout, double moteur divergent). Après débat d'architecture, décisions
utilisateur : **fast-forward du vrai moteur** (option B), **efficacité 100 %**,
**plafond 12 h**, timeskip **debug** (API prête pour de futurs objets de saut de
temps).

### Faiblesses corrigées
1. **Détection trouée** — l'AFK ne se déclenchait que sur `visibilitychange`
   (veille OS, kill mobile, crash, onglet freezé = zéro rattrapage). → Détection
   par **trou de heartbeat** (`offline-engine.js`) : toute absence > 15 s entre
   deux battements est rattrapée, quelle que soit la visibilité.
2. **Plafonds cachés par système** — sur 8 (désormais 12) h annoncées, le joueur
   recevait en réalité : combats 84-216 min (plafond 720 victoires), entraînement
   50 min (120 ticks), mine auto **10 min** (500 pas), écloserie indirectement
   plafonnée. → **Budget en secondes** par système enregistré ; régénération de
   la mine **intercalée** (+2/s pendant que la pelle consomme, fidélité live).
3. **Moteur de dégâts parallèle** (`estimateAfkMoveDamage`, ignoraient statuts,
   météo, 95 % des talents…) → **supprimé** : le rattrapage rejoue la vraie boucle
   `battleTick()/onEnemyFaint()/spawnNextWild()` en accéléré, UI gelée (muting
   window), `wait()` instantané. Une seule source de vérité.
4. **Orchestration dispersée** → **OfflineEngine** central
   (`OfflineEngine.register(nom, handler)`) : combats, entraînement, mine ;
   tout futur système (pension Hoenn, bases secrètes, objets de saut de temps)
   hérite du rattrapage en s'enregistrant.
5. **Timeskip bancal** (debug-only, `forceBattle` ignoré) → recâblé sur
   `OfflineEngine.simulate(30 min, 'debug')` + bouton debug passé de 10 à 30 min.
6. **Pas de verrou de session** → verrou d'onglet par localStorage (10 s)
   anti double-rattrapage.

### Détails techniques notables
- **Saut analytique borné** : entre deux actions, un tick n'est qu'une
  décrémentation de cooldowns → avance directe au prochain tick utile, bornée au
  budget restant (état à la coupure strictement identique au tick-par-tick).
  Perf pire cas mesurée : 12 h avec équipe one-shot (45 050 victoires) = **5,6 s**
  (barre de progression + yields). Cas réalistes : < 1-2 s.
- **K.O. d'équipe** : fidélité live totale — pénalité 10 % d'argent, fin propre
  (`endBattle`), mention dans le récap.
- **saveGame protégé** pendant le fast-forward (`afkApplying`) : sinon chaque
  capture hors-ligne réécrivait 5 Mo de sauvegarde.
- **Modale récap** enrichie à 8 mesures (+ Entraînement, + Minages auto),
  silencieuse sous 60 s (notification simple), barre de progression pendant le
  calcul.
- Compat sauvegardes : l'ancien marqueur `pokeworld_afk_last_<id>` est relu tel
  quel ; les anciennes structures `G.afk` restent acceptées.

### Tests (304/304)
- **Différentiel live vs FF sur RNG semée** : 60 s de fast-forward ≡ 600 ticks
  live — équipe, XP, PV, captures, pokedex, argent, inventaire **strictement
  identiques** (victoires : 26 = 26, chronologie identique à la ms près).
- Trou heartbeat / masquage 2 h / idempotence ; verrou onglet ; K.O. d'équipe ;
  mine (digs > 500 en 1 h, régénération intercalée) ; entraînement (144 rounds
  en 1 h, ancien plafond 120) ; timeskip 30 min ; purge de l'ancien estimateur.
- Audit assets : 1093 références / 0 manquante. Sim arènes/atoll inchangée.

## Passe 29 — fast-forward de l'entraînement + barre de progression vivante

Suite et fin du chantier AFK/timeskip.

### Entraînement : fini l'approximation
L'ancien `simulateAfkTrainingProgress` (instant-kill d'un ennemi par tick de
25 s, sans dégâts réels ni échecs possibles) est **supprimé**. Le rattrapage
rejoue la vraie boucle `updateTrainingSlots()` (dt = 100 ms × vitesse, pipeline
de dégâts réel `trainingMoveDamage`, chaîne `completeTrainingSlot` → récompenses
EV/niveaux/talents → file d'automatisation), avec le même **saut analytique
borné** exact que pour les combats sauvages. Comptage des sessions/échecs par
rebind temporaire pendant la simulation. **Conséquence honnête : un pensionnaire
trop faible échoue désormais hors-ligne comme en live** (avant, il gagnait
systématiquement). La mine auto était déjà fidèle depuis la passe 28 (vrais
coups de pelle `mineAutoStep` + régénération intercalée).

### Barre de progression vivante (le « jeu planté » ressenti)
Le calcul peut durer plusieurs secondes dans le pire cas ; avant, la barre ne
se peignait que tous les 40 000 ticks (jamais pour un saut de 30 min) et le
navigateur n'avait aucune respiration pour afficher quoi que ce soit. →
Rafraîchissement piloté par l'**horloge réelle** (peinture + `setTimeout(0)`
toutes les ~120 ms, micro-yields intermédiaires), peinture 0 % **avant** le
premier calcul, segments par système (combats 72 % / entraînement 23 % / mine
5 %) et **ligne d'étape animée** : « Combats sauvages… · 1 240 victoires »,
« Entraînement… · 12 sessions », « Mine… ». Le récapitulatif remplace la barre.

### Tests (307/307)
- **2ᵉ différentiel** : 60 s de FF entraînement ≡ 600 ticks live (rounds, PV,
  EV, cooldowns, résultats identiques sur RNG semée).
- Entraînement FF > 120 rounds en 1 h (ancien plafond pulvérisé) ; capture des
  peintures innerHTML : barre croissante ≥ 2 rendus, étape « Combats sauvages »
  visible, dernier rendu = récapitulatif complet ; clés i18n FR/EN des étapes.
- Perf pire cas mesurée : 12 h avec équipe one-shot (45 049 victoires) =
  **5,4 s avec barre vivante**. Audit assets : 1093 références / 0 manquante.

---

## Passe 30 — correctifs du premier retour bêta (AFK contextuel, argent des routes, pension au compteur de K.O.)

Premier lot de bugs remonté par la bêta fermée. 4 chantiers, tests : 315/315.

### 30.1 — AFK/timeskip : le rattrapage rejouait des combats sauvages même quand le joueur n'était PAS en combat

- **Cause :** `offlineFastForwardWildBattles` démarrait une session d'exploration ex nihilo dès que la *zone courante* avait des Pokémon sauvages (`!hadActiveChain → offlineStartWildSession(loc)`), que le joueur soit inactif sur la route ou en entraînement. Bonus : la chaîne reconstruite était relancée à l'écran au retour → « le jeu me lance un combat ». Le combat fantôme endommageait aussi l'équipe (pensionnaire d'entraînement KO possible) et distribuait captures/XP.
- **Correctif :** le fast-forward sauvage ne s'exécute QUE si une chaîne d'exploration était réellement active au départ :
  - onglet resté ouvert : la chaîne est encore active (`battle.active && chill`), on la poursuit ;
  - jeu relancé (état combat réinitialisé au boot) : nouveau drapeau persisté `G.wildSessionActive`, mis à jour à chaque `saveGame` (snapshot de `isWildChillChainActive()` — chill actif, hors champion/ligue/atoll/quête/légendaire) et effacé dès `endBattle`.
  - inactif ou en entraînement : 0 combat simulé, aucun combat lancé au retour ; l'entraînement FF (passe 29) progresse normalement seul.
- **Preuves :** tests passe 30 A — idle sur route1 : `wins=0`, `captures=0`, `battle.active` faux, `enemyPoke` nul après simulation ; entraînement AFK : rounds rejoués (`enemyIndex>3`) avec `wins=0` ; chaîne active mise en pause (onglet masqué) : victoires rattrapées + chaîne reprise + ticker relancé ; jeu relancé avec drapeau : chaîne reconstruite, drapeau vrai en mémoire **et sur disque** après `saveGame` en pleine chaîne, effacé par `endBattle`. Les tests passe 28/29 ont été mis à jour pour énoncer explicitement le contexte « chaîne active » (drapeau) au lieu de compter sur le démarrage implicite.

### 30.2 — Argent des routes : converti dès la 2ᵉ copie au lieu de la pile pleine

- **Cause :** `grantRewardItem` payait le duplicata en ₽ dès que `G.inventory[key] > 0` — posséder UNE baie de la zone suffisait à convertir tous les butins suivants en argent. La règle voulue (confirmée bêta) : argent uniquement quand la pile est pleine (25 pour objets de combat/baies).
- **Correctif :** nouvelle limite factorisée `getItemStackLimit(key)` (prédicat identique à `addToInventory` : held/catégorie/buff → 25, sinon illimité). `grantRewardItem` remplit la place restante, puis ne convertit QUE l'excédent au-delà de 25 ; trésors et fossiles toujours stockés, jamais convertis. Les routes ne rapportent donc de l'argent qu'une fois l'objet à 25 exemplaires.
- **Preuves :** test passe 30 B — 1ʳᵉ copie en sac (0₽) ; pile 24 + 5 → 1 ajouté + 4 convertis (11 250₽/u pour la baie à 45 000₽) ; pile pleine → conversion intégrale ; pépite toujours stockée ; total d'argent cumulé exact.

### 30.3 — Pension : la Garderie passe au compteur de K.O. (décision : 10 K.O. = 1 niveau), alimentée aussi par l'entraînement

- **Cause :** la Garderie montait au goutte-à-goutte d'XP (10 % de la part active par victoire sauvage, 5 % du total sur champion) — très lent avec des slots limités ; et les K.O. d'entraînement ne nourrissaient RIEN dans la pension. Bug latent trouvé au passage : le compteur `steps` montait AUSSI sur les slots Garderie, et avec l'éclosion auto activée le pensionnaire était **remis au niveau 1** (« éclosion ») au bout de 25–100 K.O.
- **Correctif :** point d'entrée unique `hatcheryRegisterBattleKills(count)` (hatchery.js) appelé à chaque K.O. — routes et dresseurs (`onEnemyFaint`), y compris champions et fast-forward, ET adversaires d'entraînement (`updateTrainingSlots`, live et FF). Le mode du slot décide : `breed`/fossile → incubation inchangée (éclosion à `stepsReq`) ; `exp` (Garderie) → +1 niveau tous les `DAYCARE_KOS_PER_LEVEL` (10) K.O., reste conservé au compteur. Frais par niveau inchangés (100₽ si automation pension activée ; impayé → le Pokémon garde ses niveaux mais sort au PC ; niv. 100 → sortie). Blocs XP de Garderie supprimés de `gainXP` et de la victoire de champion (les K.O. du champion alimentent déjà le compteur via `onEnemyFaint`). UI : la carte Garderie affiche `Niv. X · n/10 K.O.` au lieu de la barre d'XP ; description du mode mise à jour FR/EN. Le récap AFK gagne une ligne « Niv. garderie » (mesurée par somme des niveaux avant/après — la pension progresse hors-ligne via le moteur rejoué honnêtement).
- **Preuves :** tests passe 30 C — 10 K.O. → niv. 20→21, compteur consommé, PAS de remise à 1 malgré `autoHatch` (bug latent éliminé) ; slot incubation 24+10 K.O. → éclosion auto (niv. 1 en collection) ; 25 K.O. → +2 niveaux, reste 5 ; `gainXP` ne touche plus la Garderie ; frais : impayé → sortie au PC avec niveaux conservés, 0 débit partiel ; entraînement live ET `offlineFastForwardTraining` nourrissent le compteur.

## Passe 31 — bêta : auto-remplissage de la pension équitable (slots vides d'abord, files en round-robin)

Retour bêta latéral : l'auto-fill de la pension laissait « un slot et sa liste pleins alors qu'un autre slot dans le même mode était vide ».

- **Cause :** `refillHatcheryQueueFromRules` complétait la file du slot 0 jusqu'à sa capacité (3 à 12) avant de passer au slot suivant, et `processHatcheryQueue` ne vidait les files vers les slots qu'APRÈS ce réassort. Avec peu de candidats, tout partait dans la file 0 ; les slots suivants (files vides) ne pouvaient jamais être servis — d'autant que la consommation ne pioche que dans la file de SON slot.
- **Correctif (demande utilisateur, appliquée à la lettre) :** nouvel ordre dans `processHatcheryQueue` — sanitize fossiles (inchangé) → **vidange FIFO des files existantes vers les slots vides** (`drainHatcheryQueuesIntoSlots`, extraite) → **réassort ROUND-ROBIN** (`refillHatcheryQueueFromRules` réécrite : rang par rang — 1ᵉʳ élément de chaque file, puis 2ᵉ, etc., ajouts toujours en fin, jamais en milieu) → **seconde vidange** pour servir immédiatement les slots encore libres. Un slot libre reçoit donc le PREMIER nouveau candidat au lieu d'attendre derrière la file d'un autre. Règles préservées : filtrage par mode (Garderie < 100 / Incubation niv. 100 + fossiles), priorité fossile/pokémon par slot avec bascule automatique à l'épuisement (passe 12), anti-doublon fossile (1 exemplaire = 1 seule place), slots en changement de mode différé ignorés, FIFO stricte à la consommation.
- **Preuves :** 6 nouveaux tests passe 31 — 4 slots vides + 12 candidats : tous les slots remplis en ordre puis files parfaitement équilibrées et interleavées (`[u14,u18]/[u15,u19]/[u16,u20]/[u17,u21]`) ; slot libre servi par le premier candidat frais (la file du slot occupé ne reçoit que le rang suivant) ; files existantes jamais réordonnées ; équilibre exact avec file agrandie (cap 6 : `12/14/16/18` ‖ `13/15/17/19`) ; fossile unique = une seule place, priorité Incubation conservée. Les 47 tests passes 12/14 (fossiles, priorités, files) restent verts à l'identique.

## Passe 32 — bêta : « aucune zone sauvage active à simuler » (K.O. figé par le gel de l'onglet + combats bornés exclus du rattrapage)

Retour bêta : le message « Aucune zone sauvage active à simuler » apparaît souvent — (1) pile quand le Pokémon adverse vient d'être mis K.O. en combat sauvage, ce qui bloque l'AFK et le time skip, et (2) systématiquement en combat contre un dresseur de quête, une arène, la ligue ou l'atoll. Le jeu ne comprenait pas qu'un combat était en cours.

**Cause n°1 — résolution de K.O. figée par la suspension de l'onglet.** Une mise K.O. commencée EN LIVE (`onEnemyFaint` : `battle.paused = true` → `wait(500)` → XP/loot → `wait(700)` → `spawnNextWild`) se fige si l'onglet est suspendu pile pendant un `wait` (mobile : timers gelés). `battle.resolvingKO` reste à `true`. L'ancien drain du fast-forward ne cédait que des MICROtâches (`await Promise.resolve()`) : le timer réel gelé ne tirait jamais, la boucle tournait à vide (~600 000 itérations), 0 victoire, puis le récap concluait à tort « aucune zone sauvage active ». Correctif (`src/game/save/offline-engine.js`) : `offlineDrainStuckLiveKOs` + drain avec vraie macrotâche périodique (`setTimeout(0)` tous les 64 drains, drapeau de suspension d'onglet levé pendant le FF), abandon franc si le même K.O. attend > 5 s ; le FF sauvage draine les résolutions figées à chaque itération (`offlineRunBattleFfLoop`).

**Cause n°2 — combats bornés exclus du rattrapage.** `offlineCanWildBattle` rejetait arène (`isChamp`), ligue, dresseur de quête, atoll, légendaire et `chill=false` → aucun rattrapage possible. Correctif : détecteur `offlineIsBoundedBattle` + exécuteur `offlineRunBoundedBattle` qui TERMINE honnêtement le combat borné en cours pendant l'absence — un seul combat, arrêt au premier `endBattle` (rebind temporaire de `window.endBattle` pendant le FF, issue = `aliveCount()>0 ? 'won' : 'lost'`). Les suites normales s'appliquent : badge + récompense d'arène (`champVictory`), séries de ligue NON enchaînées (arrêt au combat en cours), atoll = un seul combat (économie figée respectée), défaite = pénalité honnête des 10 %. La suspension/reprise de combat à la fermeture couvre désormais aussi les combats bornés. Le récap AFK affiche une cellule dédiée « Combat clé » (✔/✖, clé `afk_panel_boss_battle`) et une notification `afk_boss_won` / `afk_boss_lost` en tête ; le message trompeur `afk_no_progress_summary` devient « AFK {time} : rien en cours à simuler. » (FR) / « AFK {time}: nothing in progress to simulate. » (EN).

**Recouvrement des annonces précédentes** : « le fast-forward ne simule que les chaînes sauvages chill » (passe 28) et « seules les chaînes sauvages chill sont éligibles » (passe 30) sont recouvertes pour les combats bornés EN COURS au départ de l'absence (arène, ligue, dresseur de quête, atoll, légendaire, combat unique `chill=false`) : ils sont terminés, pas farmés.

Tests : `tests/passe32-bounded-battles.test.js` (6 tests — chaîne figée en live avec `wait` réellement gelé ; arène gagnée → badge + récompense ; arène perdue → pénalité 10 % ; légendaire `chill=false` résolu ; double garde chaîne sauvage ; recâblages + clés i18n). 327/327.

## Limites restantes recommandées pour une phase suivante

- ~~Terminer la migration complète des 251 chaînes candidates encore en dur.~~ **Fait en passe 2** (UI ; le compteur de l'audit inclut des faux positifs : comparaisons `>= … && … <=`, markup structurel, données de contenu).
- Migrer progressivement le legacy HTML généré vers des composants DOM réels plutôt que chaînes HTML.
- ~~Supprimer les derniers styles inline~~ **Fait en passe 2** (ne restent que les `style="--var:…"` dynamiques voulus).
- Fusionner à terme les dossiers legacy `src/game/*` avec les modules modernes `src/domain` / `src/application` (inventorié, non démarré : la surface de couplage est grande, à faire écran par écran).
- Retirer les classes legacy `InfoPanel` / `ItemInfoPanel` / `MoveInfoPanel` / `TalentInfoPanel` / `PokePanel` : depuis la passe 3 plus aucun code du jeu ne les instancie encore (elles ne subsistent que comme définitions dans `src/engine/renderer/InfoPanel.js`, `src/game/ui/windows/InfoPanel.js` et `src/engine/renderer/Panel.js`) — suppression pure et simple possible après un dernier test manuel.
