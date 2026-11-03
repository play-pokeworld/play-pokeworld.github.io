# Phase 1.16.13 — Évolutions : le Pokémon est conservé, l'espèce évoluée arrive au niveau 1

> Bug critique signalé : « l'évolution est incorrecte comparé au `main` » et « certains Pokémon ont
> les mauvais niveaux d'évolution ». Les deux moitiés ont été traitées à la racine.
> Aucune sauvegarde cassée : le modèle existant gagne un champ, il n'en perd aucun.

## 1. Ce qui n'allait pas (constat, pas symptôme)

### 1.1 La mécanique transformait le Pokémon

`PokemonData.evolveTo()` **remplaçait l'espèce du Pokémon d'origine** : même individu, même niveau,
talents et PV recalculés, capacités apprises par niveau remappées. `checkLevelEvolution()` bouclait
même en cascade (un Pokémon surexploité traversait plusieurs évolutions d'un coup).

Référence (`main:src/application/combat/progression.js`, `evolve()` / `tryStoneEvo()`) : le Pokémon
d'origine **n'est jamais modifié**. L'espèce évoluée est un **nouveau Pokémon au niveau 1**
(`createPoke(evo, 1, shinyUnlock)`), ajouté à la collection avec son propre identifiant, marqué
« capturé » au Pokédex, avec le statut chromatique propagé.

### 1.2 Les quatre évolutions d'échange n'avaient pas les bons niveaux

Comparaison exhaustive des tables (`EVO_LEVELS` / `LEVEL_EVO_MAP` / `STONE_EVO` de `main` contre les
données du Rework) : **148 évolutions par niveau et 25 évolutions par objet, toutes identiques**, à
une seule exception — les quatre évolutions d'échange de Kanto :

| Pokémon | `main` | Rework avant cette phase |
| --- | --- | --- |
| Kadabra → Alakazam | niveau 40 | Pierre Lien, niveau 40 minimum *(donc jamais, sans l'objet)* |
| Machopeur → Mackogneur | niveau 40 | Pierre Lien, niveau 40 minimum |
| Gravalanch → Grolem | niveau 40 | Pierre Lien, niveau 40 minimum |
| Fantominus… Spectrum → Ectoplasma | niveau 40 | Pierre Lien, niveau 40 minimum |

C'est exactement « certains Pokémon ont les mauvais niveaux d'évolution » : ces quatre-là
n'évoluaient plus au niveau 40. La Pierre Lien existe aussi dans `main`, mais n'y évolue rien du
tout (`item-generations.js` la marque « custom » sans entrée `STONE_EVO`) : elle n'était donc qu'un
objet orphelin du Rework.

## 2. Correctif

### 2.1 Un seul propriétaire : `EvolutionSystem`

Nouveau `src/systems/EvolutionSystem.js` (BaseSystem, sans DOM), seul endroit qui applique une
évolution :

- `getLevelTargets(pokemon)` / `applyLevelEvolutions(pokemon, options)` — évolutions par niveau ;
- `findItemEvolution(pokemon, itemId)` / `applyItemEvolution(...)` — évolutions par objet ;
- `_produce()` : crée l'espèce cible **au niveau 1** via `PokemonFactory.create(target, 1, { shiny })`,
  l'enregistre par `BoxSystem.addPokemon` (Pokédex « capturé » + talent débloqué + événement de PC),
  puis marque l'origine. Le Pokémon d'origine conserve espèce, niveau, talent, capacités et PV.
- Événement `PokemonEvolvedEvent` (origine, espèce produite, uid du nouveau Pokémon).

### 2.2 Une évolution par Pokémon et par cible

Nouveau champ persisté `PokemonData.evolvedTargets` (tableau d'ids d'espèces). Sans lui, un Pokémon
qui continue de monter en niveau remplirait le PC à chaque palier. Il est enregistré **après** la
création réussie : un échec d'enregistrement laisse l'évolution en attente, elle sera rejouée.

Conséquences voulues : une chaîne (Chenipan → Chrysacoupe → Papilusion) demande désormais de faire
monter **le Chrysacoupi nouvellement créé**, comme dans la référence — le niveau 1 est une vraie
naissance, pas un raccourci.

### 2.3 Branches multiples et conditions (données déjà présentes, jamais consommées)

`PokemonData.getPendingLevelEvolutions()` lit `species.evolutions[]` :

- `split: true` → **toutes** les branches sont produites : Wurmple 7 → Armulys **et** Blindalys,
  Nincada 20 → Ninjask **et** Munja ;
- `condition` → comparaison d'IV, une seule cible : Tyrogue 20 → Kicklee (Attaque > Défense),
  Tygnon (Défense > Attaque), Kapoera (égalité) ;
- `item` + `minLevel` → évolutions par pierre (25 ou 50 selon les données, 5 pierres pour Évoli,
  2 objets pour Coquiperl, etc. — inchangés).

### 2.4 Tous les chemins de montée de niveau couverts

| Chemin | Avant | Après |
| --- | --- | --- |
| Combat (`BattleSystem._giveExp`) | transformation en place + Pokédex | `EvolutionSystem`, ligne de journal `battle_log.evolved` + rafraîchissement du PC |
| Pension (`HatcherySystem`) | transformation en place | `EvolutionSystem` (silencieux, l'icône du PC change) |
| Bonbon Rare (`ItemUseSystem`) | transformation en place | `EvolutionSystem` + message dédié |
| Entraînement (`TrainingProgression`) | **aucune évolution** | `EvolutionSystem` + libellé de récompense enrichi |
| Chargement de sauvegarde (`SaveData.verifyLevelEvolutions`) | **réécrivait la collection en place** | **supprimé** : plus aucune transformation silencieuse à l'ouverture |

### 2.5 Affichage

- Fiche Pokémon : les lignes d'évolution restent exactement celles de la référence (méthode, niveau,
  objet) et portent en plus une mention discrète **« (déjà obtenue) »** quand l'individu a déjà
  produit cette espèce — l'information affichée devient vraie.
- Le sac (vue « pierre ») ne propose plus une cible déjà produite ni une espèce d'une région
  verrouillée (elle serait refusée silencieusement).
- Textes FR/EN : `evolution_level_success`, `evolution_item_success`, `item_use_evolved`,
  `item_use_rare_candy_evolved`, `evolution_already_obtained`, `battle_log.evolved`,
  `facility_reward_evolution`. Tous annoncent le **niveau 1** et l'arrivée au PC.

### 2.6 Niveaux corrigés

`src/data/content/species-content.js` : Kadabra / Machopeur / Gravalanch / Spectrum passent à
`{ to: <cible>, level: 40 }`, comme la référence. Vérifié sur les 148 + 25 entrées : plus aucun écart.

## 3. Effets de bord assumés

1. **La Pierre Lien n'évolue plus rien.** Elle n'est vendue dans aucune boutique et n'existait que
   pour ces quatre espèces. Les sauvegardes qui en contiennent la gardent dans le sac (objet inerte).
   *Si tu préfères qu'elle redevienne un raccourci payant, c'est une ligne de données à ajouter — dis-le.*
2. **Un Pokémon déjà au-delà de son niveau d'évolution ne produit rien à l'ouverture d'une
   sauvegarde** : il le fera à sa prochaine montée de niveau (combat, pension, bonbon, entraînement).
   C'est le comportement de la référence ; plus aucune réécriture surprise au chargement.
3. **Le PC peut grandir plus vite** : chaque évolution ajoute un Pokémon niveau 1. C'est le modèle
   demandé ; le filtre « évolution manquante » du PC continue de fonctionner sur le Pokédex.

## 4. Vérifications

### Suite Node — **850 / 0** (839 avant, +11)

`tests/Release11613.test.js` (10 tests) :
conserve l'origine et crée le niveau 1 ; une seule production par cible ; chromatique hérité ;
branches Wurmple et Nincada ; conditions Tyrogue (3 cas) ; les quatre évolutions d'échange au
niveau 40 ; `minLevel` des pierres (Évoli 49 refusé / 50 accepté) ; les 5 pierres d'Évoli ; région
verrouillée ; persistance de `evolvedTargets` après rechargement ; mention « déjà obtenue ».

Tests existants réécrits car ils validaient l'ancien comportement : `Release1156` (2 tests),
`Release1159` (`_giveExp`), `ItemUse` (Pierre Lien → Pierre Feu).

### Navigateur réel (Chromium) — **7 / 7**

`tests/browser/Release11613.mjs` :
sauvegarde FR, starter Salamèche niveau 15 → bonbon rare → niveau 16 : le starter **reste Salamèche
niveau 16**, Reptincel niveau 1 arrive dans le PC et le Pokédex, le toast dit « Reptincel (Niv. 1)
rejoint ton PC ! » ; la fiche garde Salamèche et affiche « (déjà obtenue) » ; Goupix niveau 25 +
Pierre Feu → Feunard niveau 1, Goupix intact ; sac et PC réactifs ; zéro erreur console/réseau.

Non-régression navigateur relancée : `BagAndPokemonInfoParity` (18/18), `DebugAndBoxItemUse` (6/6),
`TrainingWaves` (6/6).

### Ce qui n'a **pas** été vérifié

- Aucune vérification manuelle en partie longue (300+ Pokémon au PC) : la garde
  `evolvedTargets` est testée unitairement, pas éprouvée sur une sauvegarde réelle volumineuse.
- L'équilibrage n'a pas été retouché : les évolutions ajoutent des Pokémon niveau 1, ce qui peut
  modifier le rythme de collection. À revoir dans la passe d'équilibrage.
- Pas de nouveau test navigateur pour la pension et l'entraînement (couverts unitairement).

## 5. Fichiers touchés

- `src/systems/EvolutionSystem.js` *(nouveau)*, `src/core/events/PokemonEvolvedEvent.js` *(nouveau)*
- `src/data/pokemon/PokemonData.js` (`evolvedTargets`, `getPendingLevelEvolutions`,
  `hasEvolvedInto`, `markEvolvedInto` ; `evolveTo` et `checkLevelEvolution` supprimés)
- `src/systems/ItemUseSystem.js`, `BattleSystem.js`, `HatcherySystem.js`,
  `facilities/TrainingProgression.js`, `src/data/save/SaveData.js`, `src/systems/SaveSystem.js`
- `src/data/content/species-content.js`, `src/panels/PokemonInfoModal.js`,
  `src/panels/fullscreen/BagPanel.js`, `src/panels/facilities/TrainingSlotCard.js`,
  `assets/css/design-system/pass-06.css`
- Localisation FR/EN (`panels.js`, `battle-log.js`, `facilities.js`)
- `src/main.js` (enregistrement du système), `docs/DATA_MODEL.md`
- Tests : `tests/Release11613.test.js` *(nouveau)*, `tests/Release1156`, `Release1159`, `ItemUse`,
  `tests/browser/Release11613.mjs` *(nouveau)*

## 6. Reste ouvert (rappel, hors périmètre)

- P1 3.1 (boutons) et P1 3.5 (recherche texte) de `docs/POLISH_v1.16.11.md`.
- Propositions d'équilibrage en attente de validation.
- Clés `tutorial_hint_*` toujours non vérifiées.
