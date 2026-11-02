# Phase 1.16.5 — Entraînement : le prérequis Ligue et le vrai système de vagues

> Deux signalements du joueur, sur la même fonctionnalité :
> « Le jeu considère que je n'ai pas les prérequis pour faire tous les entraînements sur les
> anciennes saves alors que j'ai bien battu la ligue » et « L'entraînement n'utilise pas le nouveau
> système d'entraînement, il ne fait toujours que 6 Pokémon au lieu des plus de 20 Pokémon, qui sont
> choisis en fonction du rank du Pokémon entraîné : les modifications apportées ont été inutiles
> puisque l'entraînement utilise toujours le système du `main` qui devait être supprimé. »
>
> Les deux causes sont indépendantes et ont été corrigées à la racine, pas au symptôme.

---

## 1. Correctif 1 — le prérequis Ligue ne pouvait jamais être satisfait

### Constat

Les modes **Talents** et **Talent caché** du centre d'entraînement sont verrouillés jusqu'à ce que le
joueur ait remporté une Ligue. Le test était :

```js
// src/systems/facilities/TrainingProgression.js avant 1.16.5
if (TrainingRules.LEAGUE_GATED_MODES.includes(mode)) {
  const league = LeagueDB.getInstance().getAll().find((entry) => entry.region === 'kanto');
  return save.player.hasBadge(league.badge);   // ← 'champion'
}
```

### Cause exacte

`LeagueDB` déclare bien un identifiant de badge pour son champion (`champion` pour Kanto,
`johto_champion` pour Johto), mais **le jeu n'écrit jamais cet identifiant dans `player.badges`** :

| Étape | Ce qui se passe réellement |
|---|---|
| Victoire contre le Maître | `TrainerBattleContext.onVictory` appelle `save.statistics.recordLeague('kanto')` |
| Badges d'Arène | seuls les huit badges de chefs d'Arène entrent dans `player.badges` |
| Sauvegardes converties | `MigrationV11ToV12` **retire** les identifiants de Ligue de `player.badges` |

Autrement dit `save.player.hasBadge('champion')` vaut `false` sur **toutes** les sauvegardes, anciennes
comme neuves, y compris celles qui ont battu la Ligue. Le mode restait donc verrouillé pour tout le
monde, et l'automatisation « tout » sautait silencieusement ces deux modes.

Le défaut était invisible en test : la fixture de `FacilityParity` posait le badge `champion` à la
main, ce que le jeu ne fait jamais.

### Correction

`TrainingProgression.hasLeagueTitle(save)` remplace le test de badge. Il accepte, dans l'ordre :

1. `save.statistics.hasWonLeague('kanto' | 'johto')` — la preuve réelle, écrite par le combat de Ligue ;
2. `save.statistics.leaguesWon.length > 0` — toute autre région déjà enregistrée ;
3. `save.access.championTitle === true` — titre débloqué par le système d'accès ;
4. le badge de champion, **pour compatibilité** avec les sauvegardes qui le portent encore.

Le mode est donc ouvert dès qu'une Ligue a été gagnée, sur les anciennes comme sur les nouvelles
sauvegardes, sans réécrire l'historique du joueur.

### Vérifié

| Cas | Résultat |
|---|---|
| 8 badges de Kanto + `recordLeague('kanto')` | `move`, `talent`, `level`, `ev`, `hidden` : tous `unlocked = true` |
| 8 badges de Kanto, **sans** Ligue | `talent` et `hidden` restent verrouillés (comportement voulu) |
| Sauvegarde migrée où seule `statistics.leaguesWon` porte la victoire | modes ouverts |
| Sauvegarde ancienne portant encore le badge `champion` | modes ouverts |

---

## 2. Correctif 2 — l'entraînement utilisait encore le système du `main`

### Constat

Le Rework avait réécrit tout le centre d'entraînement (créneaux, automatisation, AFK, récompenses)
mais la **liste des adversaires** était encore celle du `main`, copiée telle quelle :

```js
// src/systems/TrainingSystem.js avant 1.16.5
_createOpponents(trainee, random, mode) {
  const pool = TrainingOpponentDB.getInstance().getSpeciesForType(trainee.getTypes()[0]);
  return pool.slice(0, TrainingRules.OPPONENT_COUNT)   // OPPONENT_COUNT = 6
    .map((id, i) => PokemonFactory.create(id, trainee.level + (i % 3) - 1));
}
```

Et la source de ce pool (2 790 lignes du `main`, `pickTrainingBots()`) retourne **exactement six
identifiants par type**, tous au niveau du stagiaire ±1. Six combats, six espèces d'un seul type,
aucun rapport avec la classe du Pokémon entraîné : le « nouveau système » n'existait que sur le
papier.

### Correction — le système de vagues

Nouveau module `src/systems/facilities/TrainingOpponents.js`, seule autorité sur les adversaires :

| Élément | Règle |
|---|---|
| Taille de session | **30 vagues** (`TrainingRules.OPPONENT_COUNT`), minimum 6 |
| Origine des espèces | le **rank** du Pokémon entraîné (`PokemonRankRules.getRank`) : E → D → C → B → A → S |
| Ordre de remplissage | le rank du stagiaire d'abord, **en entier**, puis le rank voisin si la tranche est plus courte que 30 |
| Exclusions | aucune espèce légendaire (`PokemonRules.LEGENDARY_DEX`), jamais l'espèce du stagiaire, une espèce au plus une fois par session |
| Niveaux | échelle linéaire de **60 % à 120 %** du niveau de référence (niveau du stagiaire + décalage du mode), minimum niveau 3 |
| Personnel | un employé d'entraînement de niveau 100 retire 6 vagues au plus : 30 → 24, plancher 6 |
| Durée | `MAX_SIMULATION_TICKS` porté à 18 000 ticks, soit **1 800 s** (30 min) par session |
| Défaite | la session **s'arrête** ; le stagiaire conserve les récompenses des vagues déjà gagnées |
| Récompenses | **une par 6 vagues gagnées** (`REWARD_INTERVAL_WAVES`), donc 5 au maximum par session |

Le mode donne la couleur du tirage (attaque, talent, niveau, EV, talent caché) ; le rank donne les
espèces ; le niveau donne l'échelle. Le pool du `main` est **supprimé** :
`src/data/raw/training-opponents-data.js` et `src/data/training/TrainingOpponentDB.js` ont été retirés
du dépôt, avec leurs entrées dans `DataValidator` et leurs assertions dans les tests concernés.

### Effet mesuré (graines fixes)

| Stagiaire | Vagues | Espèces rencontrées | Niveaux |
|---|---|---|---|
| Caterpie niv. 12 | 30, toutes distinctes | `zigzagoon`, `kakuna`, `cascoon`, `zubat` (rank E) | 5 → 13 |
| Arcko niv. 25 | 30 | `magnemite`, `bagon`… (rank D) | 13 → 29 |
| Magicarpe niv. 30 | 30 | `sunkern`, `silcoon`, `seedot` (rank D) | 16 → 35 |
| Dracaufeu niv. 60 | 30 | `pinsir`, `alakazam`, `rapidash`… (rank B) | 34 → 71 |
| Mewtwo niv. 80 | 30 | 4 espèces de rank S puis 26 de rank A | 46 → 95 |

Session réelle simulée : Dracaufeu niv. 60 en mode attaque → 30/30 vagues, 117 s, 5 récompenses
(5 capacités) ; Pikachu niv. 50 en mode niveau → 20 vagues puis défaite, 83 s, 3 récompenses
(+13 niveaux) ; Caterpie niv. 20 en mode EV → 12 vagues puis défaite, 2 récompenses (+2 EV).

### Interface

Le panneau n'a pas changé de structure : la carte de combat en direct affiche `Round n/30` (au lieu de
`n/6`) et le résultat liste jusqu'à trois récompenses puis « (+n autres) ». Trois clés de
localisation ont été ajoutées (FR + EN) : `training_reward_list`, `training_result_failed_partial`,
et le compteur de round utilise les clés existantes.

---

## 3. Équilibrage — ce que la mesure dit vraiment

La simulation de survie a été relancée après la correction (4 graines, 30 vagues, échelle 60-120 %) :

| Stagiaire | Vagues moyennes gagnées | Sessions complètes |
|---|---|---|
| Caterpie niv. 20 | 12,8 | 0 / 4 |
| Magicarpe niv. 20 | 11,5 | 0 / 4 |
| Pikachu niv. 50 | 16,0 | 0 / 4 |
| Dracaufeu niv. 60 | 27,8 | 1 / 4 |
| Mewtwo niv. 80 | 1,0 | 0 / 4 |

Deux constats honnêtes :

- **La montée en niveau n'a pas lieu en dessous du rank B** : avec « une récompense par 6 vagues »,
  un stagiaire qui tombe à la vague 12 touche 2 récompenses. C'est le prix assumé de la décision
  « la défaite arrête la session » ; le système reste jouable parce que les récompenses sont
  conservées, mais il est plus dur que le `main`.
- **Mewtwo est battu à la première vague** : Tyranocif est immunisé à toutes ses attaques spéciales et
  Mewtwo n'a aucune attaque physique dans son set d'entraînement. Ce n'est pas un défaut du système de
  vagues, c'est un défaut de set d'attaques : à traiter dans la phase d'équilibrage, pas ici.

Ces chiffres sont donnés tels quels : la correction demandée est faite, l'équilibrage du centre
d'entraînement reste un sujet ouvert.

---

## 4. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/systems/facilities/TrainingProgression.js` | `hasLeagueTitle(save)` ; plus de test de badge seul |
| `src/systems/facilities/TrainingOpponents.js` | **nouveau** : ranks, vagues, échelle de niveaux, personnel |
| `src/systems/TrainingSystem.js` | `_finishSession` (récompenses par intervalle), `_createOpponents` branché sur les vagues |
| `src/config/TrainingRules.js` | 30 vagues, intervalle de récompense, facteurs de niveau, 18 000 ticks |
| `src/data/raw/training-opponents-data.js` | **supprimé** (système du `main`) |
| `src/data/training/TrainingOpponentDB.js` | **supprimé** |
| `src/data/core/DataValidator.js` | entrées du pool retirées |
| `src/panels/facilities/TrainingSlotCard.js` | liste de récompenses |
| `src/localization/{fr,en}/panels.js` | 2 clés ajoutées (liste de récompenses, résultat partiel) |
| `src/config/PokemonRules.js`, `src/config/HatcheryRules.js` | `LEGENDARY_DEX` : une seule source |
| `tests/Release1165.test.js` | **nouveau** : 10 tests (Ligue, vagues, cadence) |
| `tests/browser/TrainingWaves.mjs` | **nouveau** : 5 vérifications Chromium |
| `tests/AfkCatchUp.test.js`, `tests/FacilityParity.test.js`, `tests/Release1151.test.js` | mises à jour (30 vagues, récompenses multiples, rang au lieu du BST) |

## 5. Vérifications

| Suite | Résultat |
|---|---|
| `node test_suite.js` | **755 réussis, 0 échec** (745 + 10 nouveaux) |
| `tests/browser/TrainingWaves.mjs` | **5/5** — modes ouverts après la Ligue, 30 vagues du rank, compteur `Round n/30` en FR et EN, carte de combat, abandon |
| `tests/browser/AfkCatchUp.mjs` | 4/4 |
| `tests/browser/TalentPools.mjs` | 5/5 |
| `tests/browser/LanguageSwitch.mjs` | 8/8 |
| `tests/browser/PanelFit.mjs` | 7/7 |
| `tests/browser/MarketAndResponsiveTraining.mjs` | toutes les vérifications passent |
| `tests/browser/DebugAndBoxItemUse.mjs` | toutes les vérifications passent |
| `tests/browser/FacilityParity.mjs` | échoue sur la tuile « Location » → fiche Pokédex ; **échec reproduit à l'identique sur le commit 1.16.4 non modifié** (pré-existant, hors périmètre) |
