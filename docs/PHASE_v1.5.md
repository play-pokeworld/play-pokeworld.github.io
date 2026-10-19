# Phase v1.5 — Poké Balls et capture

Ce document explique précisément ce qui a été fait pendant la phase v1.5, pourquoi, et ce qui
reste à faire. Il sert à juger le travail avant la suite (relecture du combat et des quêtes).

Référence : le jeu d'origine, `src/application/economy/pokeballs.js`,
`src/ui/game/pokeball-window.js` et `src/application/combat/catch.js`.

---

## 1. Les deux règles demandées

| Règle | Où elle est garantie |
|---|---|
| **Le choix de la Poké Ball dépend uniquement des filtres.** Posséder l'espèce ou être dans une quête ne choisit jamais la ball. | `systems/catch/BallSelector.js` ne reçoit que les filtres, la rencontre et le stock. L'ancien `systems/battle/CatchRules.js` (qui choisissait « la plus faible ball » et refusait les espèces déjà capturées) a été **supprimé**. |
| **Le taux de capture dépend uniquement de la ball.** L'espèce ne compte pas. | `systems/catch/BallRateRules.js` ne lit jamais `catchRate`. Seuls interviennent la ball, son bonus spécial et le nombre d'exemplaires possédés. |

Les deux règles sont aussi écrites dans `Rules.md` (§ 8) pour les prochaines IA.

---

## 2. Les données

### Poké Balls (`ItemDB`)

Le générateur `tools/data/gen-items.mjs` ajoute à chaque ball une fiche `ball` lue dans
l'original :

```js
nestball: { kind: "ball", hidden: true,
            ball: { rate: 10, sprite: "Nestball", condition: "lowlevel", bonus: 25, scaling: true, order: 10 } }
```

- 16 balls, dans l'ordre de l'original : Poké, Super, Hyper, Master, Honor, Appât, Lune, Speed,
  Scuba, Bis, Faiblo, Sombre, Chrono, Rapide, Luxe, Ultra.
- `hidden: true` : la ball n'apparaît dans le sélecteur qu'une fois possédée (comme l'original).
- `condition` est une valeur du vocabulaire figé `data/items/BallConditions.js`.

### Filtres de base (`ball-filter-presets-data.js`)

Nouveau générateur `tools/data/gen-balls.mjs` : les 5 filtres de base de l'original, dans leur
ordre de priorité — Errant, Nouveau chromatique, Chromatique déjà capturé, Nouveau, Déjà capturé.
Sur une nouvelle sauvegarde, ils sont tous sur « Aucune » (comme l'original).

### Règles chiffrées (`config/BallRules.js`, `config/CaptureRules.js`)

Toutes les constantes sont dans ces deux fichiers, aucune n'est écrite en dur ailleurs :

| Règle | Valeur (original) |
|---|---|
| Taux de base | Poké 10 %, Super 20 %, Hyper 30 %, Master 100 %, balls spéciales 10 % |
| Bonus de condition | +25 % (Appât : type Eau ; Lune : évolue par Pierre Lune ; Speed : Vitesse ≥ 100 ; Scuba : pluie ; Bis : espèce possédée ; Faiblo : niveau ≤ 25 ; Sombre : donjon ; Ultra : Ultra-Chimère) |
| Chrono Ball | +2 % par tour de l'adversaire, max +25 % |
| Rapide Ball | +30 / 25 / 20 / 15 / 10 % selon le nombre d'attaques du joueur (≤ 1, 2, 3, ≤ 5, ≤ 8), sinon +5 % |
| Paliers (balls spéciales) | +2 % par tranche de 5 exemplaires possédés, max +10 % à 25 exemplaires |
| Plafond | 100 % |
| Balls de départ | 10 Poké Balls (`ensurePokeballs` de l'original) |
| Niveau du Pokémon capturé | 1 ; Luxe Ball : +1 niveau (comme `catch.js` de l'original) |
| Talent tiré | pondéré par rareté 60 / 30 / 12 |
| Bonus d'IV | 10 % de chance de +1 IV sur une stat sous le plafond, **plafond 12** |
| Jetons de donjon | `max(1, round(6 × ((2d) / (2,8 / (1 + région/3)))^1,08))` |

> Correction au passage : `PokemonRules.IV_MAX` valait 6 (repris par erreur de l'affichage en
> étoiles). Le vrai plafond de l'original est **12** (`GAME.CAPTURE.IV_CAP`).

### Sauvegarde : schéma 4

| Ajout | Contenu |
|---|---|
| `box` | Boîte PC : les captures faites quand l'équipe est pleine (avant, la capture n'était pas tentée) |
| `ballFilters` | Les filtres du joueur dans l'ordre de priorité : `{ id, name, options, ball, enabled }` |
| `statistics.duplicateCatches` | Nombre de doublons capturés par espèce |
| `inventory` | Contient désormais les Poké Balls (un seul inventaire, plus de compteur séparé) |

Les options des filtres de base ne sont **jamais sauvegardées** : elles sont relues dans les
presets, donc une correction future des presets s'applique à toutes les sauvegardes. Un filtre de
base manquant est remis à sa place au chargement.

**Migration v3 → v4** (`MigrationV3ToV4.js`, testée) :
- les compteurs de balls de l'original (`pokeballs.counts`) rejoignent l'inventaire ;
- les filtres de l'original (`pokeballs.filters`, `customName`) deviennent `ballFilters` ;
- une sauvegarde sans aucune ball reçoit les 10 Poké Balls de départ ;
- `box` est créé vide.

L'import d'une sauvegarde du jeu d'origine (`MigrationOriginalToV1`) et `MigrationV2ToV3` ont
été complétés pour transporter balls et filtres jusqu'au schéma 4.

---

## 3. Les systèmes (sans DOM)

```
BattleSystem (victoire) ──► CatchSystem.attempt({ save, session, locationId, questKind })
                               │
                               ├─ CatchEncounter      faits figés de la rencontre
                               ├─ BallSelector        1er filtre actif qui correspond → ball
                               ├─ BallRateRules       taux de la ball
                               ├─ CatchRules          multiplicateur de quête, jet, talent, IV
                               ├─ TeamSystem / BoxSystem   rangement du Pokémon
                               └─ PokemonCaughtEvent  → objectifs de quête
```

| Fichier | Rôle |
|---|---|
| `systems/catch/CatchEncounter.js` | Pokémon, possédé, chromatique possédé, type de lieu, météo, tours adverses, attaques du joueur ; en déduit le type de rencontre (errant / donjon / route) |
| `systems/catch/BallFilterMatcher.js` | Un filtre correspond quand **toutes** ses options correspondent |
| `systems/catch/BallSelector.js` | Le premier filtre actif qui correspond décide. Ball choisie mais aucune en stock → pas de lancer. « Aucune » sur un filtre de base → on passe au suivant ; « Aucune » sur un filtre personnalisé → pas de lancer |
| `systems/catch/BallRateRules.js` | taux = base + paliers + bonus de condition ; Master Ball 100 ; plafond 100 |
| `systems/catch/CatchRules.js` | Quête légendaire ×2 (plafond 100), Pokémon offert 100 ; succès si taux ≥ 100, première capture, ou `chance(taux)` ; talent pondéré ; bonus d'IV |
| `systems/catch/SpeciesOwnership.js` | Espèce possédée / chromatique débloqué (équipe + boîte) |
| `systems/PokeballSystem.js` | **Seul** à modifier les filtres. Une écriture de sauvegarde + `BallFiltersChangedEvent` par commande |
| `systems/CatchSystem.js` | Toute la capture : ball, jet, Pokédex, statistiques, déblocage chromatique, nouveau Pokémon (équipe ou boîte), doublon, jetons, événement |
| `systems/BoxSystem.js` | Seul à écrire dans la boîte PC (`BoxChangedEvent`) |

Déroulé d'une capture, fidèle à l'original :
1. la ball est choisie par les filtres ; aucune → message « aucune ball » et rien n'est consommé ;
2. la ball est consommée, puis le jet est fait (première capture de la sauvegarde garantie) ;
3. en cas de succès : Pokédex, statistiques, jetons de donjon ;
   - rencontre chromatique → tous les exemplaires possédés de l'espèce deviennent chromatiques ;
   - **espèce déjà possédée** → le doublon n'est pas gardé, l'exemplaire possédé a 10 % de chance
     de gagner +1 IV ;
   - **nouvelle espèce** → Pokémon niveau 1 (+1 avec la Luxe Ball), talent tiré, bonus d'IV possible,
     dans l'équipe, ou dans la boîte si l'équipe est pleine.

`BattleSession` compte maintenant `foeTurns` et `playerAttacks` pour la Chrono Ball et la Rapide Ball.

---

## 4. L'interface

Toute l'interface est construite avec les widgets de base (`src/ui/`), sans HTML ni CSS dans le code.

| Élément | Description |
|---|---|
| `PokeballsPanel` (réécrit) | Tableau Nom / Ball / Qté comme l'original : un filtre par ligne, filtre désactivé grisé, quantité de la ball choisie ; bouton ⚙ dans l'en-tête → éditeur |
| `BallFilterEditorModal` | « Nouveau filtre », « Réinitialiser », texte d'aide sur la priorité, un bloc par filtre, « Fermer » |
| `BallFilterEditorRow` | poignée de glisser-déposer, interrupteur actif/inactif, nom (modifiable pour un filtre personnalisé), bouton ball → sélecteur, ✕ (filtres personnalisés seulement), « Modifier / Masquer les paramètres » |
| `BallFilterToggleRow` / `BallFilterValueRow` | options − / + (Non capturé, Déjà capturé, Chromatique, Chroma capturé) et options à valeur (Type, Rencontre) avec menu déroulant. Sur un filtre de base, seules les options actives sont affichées, en lecture seule |
| `BallPickerModal` | « Aucune » puis chaque ball : icône, nom, description (taux · paliers · effet), quantité ; ball actuelle surlignée |
| Nouveaux widgets | `UISortableList` (liste réordonnable par glisser-déposer), icônes `minus` et `grip`, option `onChange` de `UITextInput` |
| CSS | `assets/css/pokeball-filters.css`, port du bloc `PICKER_CSS` que l'original injectait en JavaScript |

**Amélioration assumée** : dans l'original, ouvrir le sélecteur de ball **fermait** l'éditeur de
filtres. Ici le sélecteur s'ouvre **par-dessus** l'éditeur, qui reste ouvert et se met à jour
après le choix. Si vous préférez le comportement d'origine, il suffit que `BallPickerModal`
ferme l'éditeur à l'ouverture.

---

## 5. Tests

142 tests (125 avant), tous verts. Nouveau fichier `tests/Catch.test.js` :
- ordre et état des 5 filtres de base ;
- correspondance des filtres (possédé, chromatique, type, errant, donjon) ;
- choix de la ball : priorité, filtre désactivé, ball non possédée, « Aucune » (base / personnalisé) ;
- taux : base, Master Ball, plafond, paliers, Faiblo, Bis, Appât, Scuba, Chrono, Rapide ;
- commandes de `PokeballSystem` (filtres de base verrouillés, création, renommage, options,
  suppression, réinitialisation, sauvegarde) ;
- migration v3 → v4 ;
- capture complète : aucune ball, première capture garantie, échec, doublon + IV, déblocage
  chromatique, équipe pleine → boîte, Luxe Ball.

Vérifié aussi dans le navigateur : panneau, éditeur, glisser-déposer, sélecteur empilé, renommage,
options à valeur.

---

## 6. Reporté (volontairement)

Ces effets de la capture de l'original dépendent de systèmes pas encore portés :

| Effet de l'original | Pourquoi reporté |
|---|---|
| Énergie de la mine gagnée à chaque capture (`G.mine.energy`) | Le système de mine n'est pas encore porté |
| Déblocage du talent capturé dans le « dex des talents » (`unlockCapturedTalent`) | Le système de talents débloqués n'existe pas encore |
| Bonus de succès appliqués à la capture | Le système de succès n'est pas porté |

Ils seront branchés sur `PokemonCaughtEvent`, sans toucher à `CatchSystem`.

## 7. Prochaine étape

Relecture du combat et des quêtes, comme convenu.
