# Créer une région et un gameplay de A à Z

**Tutoriel français — PokéWorld Rework 1.14.25 · sauvegarde de production : schéma 20**

Ce document est un parcours de réalisation, pas seulement une liste de fichiers. Il explique les
choix, les formats, les branchements et les vérifications. L’exemple suivi est **Auroria**, une petite
région inventée : cinq lieux, un Pokémon, une capacité, une boutique, une arène, un rival, une ligue,
une histoire de quatre étapes et un nouveau **Carnet de terrain** avec récompense persistante.

> **Deux choses différentes :** les données d’Auroria sont un exemple pédagogique **non activé dans
> le jeu livré**. L’installateur crée une copie neuve, nommée `1.14.26-demo`, utilisant le **schéma 21**
> uniquement pour illustrer l’ajout d’un état de gameplay. Le projet de production reste en 1.14.25 /
> schéma 20. N’importez pas une sauvegarde de démonstration dans le jeu de production plus ancien.

Le kit complet se trouve dans `docs/examples/auroria/`. Les classes reproduites ci-dessous sont les
vrais fichiers de ce kit. Une carte schématique est fournie ; le sprite du nouveau Pokémon est une
**copie provisoire de Bulbizarre**, le portrait de champion et le badge réutilisent des ressources
existantes. Ce ne sont pas des illustrations originales d’Auroria. Remplacez-les pour votre région.

## Sommaire

- [A — Préparer](#a) · [B — Architecture et données](#b) · [C — Enregistrer la région](#c)
- [D — Lieux et graphe](#d) · [E — Carte et décors](#e) · [F — Rencontres](#f)
- [G — Pokémon et formes](#g) · [H — Capacités et apprentissage](#h) · [I — Objets et talents](#i)
- [J — Arènes, dresseurs, ligue](#j) · [K — Boutiques](#k) · [L — Quêtes](#l)
- [M — PNJ](#m) · [N — Verrous de progression](#n) · [O — Pokédex et starters](#o)
- [P — Donjons et automatisation](#p) · [Q — Pokémon partagés et installations](#q)
- [R — Nouveau modèle](#r) · [S — Nouveau système](#s) · [T — Nouveau panneau](#t)
- [U — Migration](#u) · [V — Traductions et présentation](#v) · [W — Tests](#w)
- [X — Dépannage](#x) · [Y — Livraison](#y) · [Z — Checklist et lexique](#z)

<a id="a"></a>
## A — Préparer un terrain de travail sûr

1. Décompressez le ZIP dans un dossier de travail ; sauvegardez vos exports de parties.
2. Installez Node.js 18 ou plus. Le jeu n’a pas de dépendance npm d’exécution.
3. Ouvrez un terminal **à la racine**, là où se trouve `package.json`.
4. Lancez le serveur puis ouvrez son adresse. Évitez `file://` : les modules ES sont souvent bloqués.
5. Lisez `Rules.md` avant de créer une classe. Les identifiants et commentaires du code sont en
   anglais ; les textes joueurs sont localisés en français **et** en anglais.

```sh
node --version
npm test
npm start
```

Pour essayer directement le kit, utilisez un **nouveau** dossier de destination. La commande refuse
un dossier existant et n’écrit pas dans le projet d’origine :

```sh
node docs/examples/auroria/install-example.mjs
node .arena/auroria-demo/docs/examples/auroria/verify.mjs
npm --prefix .arena/auroria-demo test
```

Puis, dans un autre terminal :

```sh
cd .arena/auroria-demo
npm start
```

Arrêtez le premier serveur pour réutiliser son port, ou suivez le port libre annoncé par le second
(le serveur essaie 3000 puis les ports suivants).
Pour recommencer l’installation, choisissez un autre dossier vide plutôt que de réappliquer les
patches dans une copie déjà modifiée. Le kit est fixé à la version 1.14.25 ; son installateur s’arrête
si un point de branchement attendu a changé.

**Ce que le kit ne fait pas :** ajouter 150 espèces dessinées, équilibrer une campagne entière,
remplacer le tutoriel initial de Kanto ou simuler une progression naturelle jusqu’à Hoenn. Son test
prépare explicitement les faits de la région précédente avant de vérifier l’entrée dans Auroria.

<a id="b"></a>
## B — Comprendre qui possède quoi

Le trajet normal d’une action est :

`Panneau → commande d’un System → modèles de SaveData → SaveSystem → événement → setters UI`

- `src/data/raw/` contient les transcriptions générées de l’original. **Ne les modifiez pas à la main.**
- `src/data/content/` contient les ajouts et remplacements écrits à la main.
- Les dépôts `PokemonDB`, `MoveDB`, `LocationDB`, `QuestDB`, `TrainerDB`… joignent les tables et
  exposent des définitions en lecture seule. Le dépôt des espèces s’appelle **PokemonDB**, pas SpeciesDB.
- `src/data/save/` contient les faits propres à chaque partie : progression, objets, UID, horloges.
- `src/systems/` applique les règles, sans `document`, `window`, boutons ou chaînes HTML.
- `src/panels/` compose les widgets de `src/ui/`. Les panneaux ne paient pas et ne changent pas
  directement la collection, les statistiques ou les quêtes.
- `src/config/` déclare les règles, identifiants et limites partagés.

### Ajouter n’est pas fusionner profondément

`withContent(generated, content)` fait l’équivalent de `{...generated, ...content}`. Si vous redéfinissez
`pikachu`, **toute son entrée** remplace l’ancienne. Écrire uniquement `{stats: [...]}` supprime ses
champs requis. Copiez l’entrée complète et ne changez que les champs souhaités.

Pour les listes, `withContentList` remplace une entrée de même clé à sa place et ajoute les nouvelles
à la fin. Les quêtes sont identifiées par `catégorie + id`. L’ordre des quêtes principales est
**l’ordre de la table**, pas le tri numérique de leur id.

N’écrivez jamais dans `_entries` d’un dépôt pour ajouter du contenu : modifiez les tables puis
rechargez complètement la page. Les dépôts et les pools de capacités sont construits et mis en cache.

| Ajout | Fichier manuel | Dépôt |
|---|---|---|
| Espèce / forme | `species-content.js`, `forms-content.js` | `PokemonDB` |
| Capacité / talent | `moves-content.js`, `talents-content.js` | `MoveDB`, `TalentDB` |
| Objet | `items-content.js` | `ItemDB` |
| Lieu / carte / rencontres | `locations-content.js`, `map-layout-content.js`, `encounters-content.js` | `LocationDB` |
| Dresseur / ligue | `trainers-content.js`, `leagues-content.js` | `TrainerDB`, `LeagueDB` |
| Boutique | `shops-content.js` | `ShopDB` |
| Quête | `quests-content.js` | `QuestDB` |

**Nuance essentielle :** ajouter une espèce qui utilise des mécanismes existants est surtout du
contenu. Ajouter une **région**, un type d’effet inconnu, un objectif inédit ou un nouveau gameplay
nécessite aussi des branchements de code. Les chapitres suivants indiquent lesquels.

<a id="c"></a>
## C — Enregistrer une région réellement utilisable

### C.1 Déclaration et ordre de progression

Dans le tableau `REGIONS` de `src/config/Regions.js`, insérez ce fragment après Hoenn, avant l’entrée
Sinnoh encore indisponible. **Ne créez pas un second tableau REGIONS et ne dupliquez pas Sinnoh.**

```js
Object.freeze({id:'auroria',labelKey:'map_region_auroria',available:true}),
```

`available: true` signifie « jouable », pas « déverrouillée pour toutes les parties ».
`FeatureAccessSystem.getRegionAccessStatus()` considère les régions disponibles **dans cet ordre** :
la région précédente doit avoir sa ligue gagnée **et toutes ses espèces régionales capturées**.
Un Pokédex régional vide ne compte pas comme complet. Ici, Auroria suit donc Hoenn.

Changer l’ordre des régions change les prérequis d’entrée. Si vous voulez une région de départ,
un embranchement ou une entrée par quête plutôt que par ligue + Pokédex, concevez une autre règle
dans le résolveur central et testez-la. Ne contournez pas la règle en cachant un bouton.

### C.2 Point d’arrivée

Ajoutez dans `REGION_START_LOCATIONS` de `src/config/ContentAccessRules.js` :

```js
auroria: 'auroria_start',
```

Ce lieu doit exister, porter `region: 'auroria'` et avoir sa géométrie de carte.
Le voyage doit passer par `LocationSystem.travelToRegion('auroria')`, pas par une affectation depuis
l’interface à `save.player.region`. Cette commande vérifie la politique d’entrée et l’expédition active.

### C.3 Audit de branchement — pas seulement une ligne

| Point | Obligatoire / objectif |
|---|---|
| `Regions.js` et ordre des régions | déclaration, disponibilité, règle précédente |
| `REGION_START_LOCATIONS` | destination de voyage |
| carte dans `assets/images/maps/` | image résolue par `AssetPaths` |
| lieux, rectangles, rencontres | contenu jouable |
| traductions `map_region_auroria` et `region_auroria` | carte et filtres des installations |
| `StarterData.js` et garde de première route | choix de partenaire, si cette mécanique est utilisée |
| espèces avec `region: 'auroria'` | Pokédex et future condition de région complète |
| quêtes, PNJ, dresseurs, ligue | progression effective et récompenses |
| `FacilityFilterRules.COMMON.filterRegion` | nouvelle région reconnue dans les filtres de Pension/Entraînement |
| `AchievementsPanel.js` | succès régionaux et derniers paliers nationaux, si vous en voulez |
| tutoriel initial / règles de nouvelle partie | à adapter si vous autorisez de commencer directement ici |
| migration | uniquement si vous ajoutez ou changez un état sauvegardé |

Les anciennes migrations contiennent parfois les trois régions historiques. Ne réécrivez pas
aveuglément une migration ancienne : elle traduit un ancien format. Ajoutez une migration nouvelle
si le **format ou la sémantique de faits sauvegardés** change.

<a id="d"></a>
## D — Construire les lieux et leur graphe

Le parcours pédagogique est :

`Aubeval ↔ Sentier (3 victoires) ↔ Florécité (arène + rival) ↔ Bois (donjon) ↔ Sommet (ligue)`

Voici l’objet à **fusionner avec** `LOCATIONS_CONTENT` dans `locations-content.js`.
Les exports complets montrés sont des modèles : dans un projet existant, conservez les autres entrées.

```js
export const LOCATIONS_CONTENT = {
  "auroria_start": {
    "region": "auroria",
    "kind": "town",
    "connections": [
      "auroria_path"
    ],
    "winsToClear": 0,
    "badgesRequired": 0,
    "shop": "auroria_store"
  },
  "auroria_path": {
    "region": "auroria",
    "kind": "route",
    "connections": [
      "auroria_start",
      "auroria_city"
    ],
    "winsToClear": 3,
    "badgesRequired": 0
  },
  "auroria_city": {
    "region": "auroria",
    "kind": "town",
    "connections": [
      "auroria_path",
      "auroria_forest"
    ],
    "winsToClear": 0,
    "badgesRequired": 0,
    "champion": "auroria_ivy",
    "shop": "auroria_store"
  },
  "auroria_forest": {
    "region": "auroria",
    "kind": "dungeon",
    "connections": [
      "auroria_city",
      "auroria_summit"
    ],
    "winsToClear": 0,
    "badgesRequired": 1
  },
  "auroria_summit": {
    "region": "auroria",
    "kind": "town",
    "connections": [
      "auroria_forest"
    ],
    "winsToClear": 0,
    "badgesRequired": 1,
    "champion": "auroria_league"
  }
};
```

- `connections` définit les voisins. Ajoutez le **lien retour** ; une relation à sens unique n’est
  pas inventée automatiquement.
- `kind` accepte `town`, `route`, `sea`, `dungeon`. Un lieu nommé « forêt » n’est pas automatiquement
  un donjon : c’est le champ qui le décide.
- `badgesRequired` est un **nombre de badges d’arène de la région**, pas une liste de badges précis.
- `winsToClear` est un seuil de victoires sauvages qui permet la propagation de l’accès depuis ce
  lieu. `0` signifie aucun seuil. Cela n’impose pas de finir le gardien d’un donjon.
- `shop` est un id de `ShopDB` ; `champion` est un id de `TrainerDB` ou `LeagueDB`.
- `group`, facultatif, fait partager des objectifs/statistiques à plusieurs sous-zones. Ne donnez
  pas le même groupe à toute la région : les combats d’une route valideraient alors les autres.
- `weather`, facultatif, fixe une météo reconnue dans `src/data/battle/BattleFields.js`.

Un lieu relié n’est pas nécessairement déverrouillé : badges, portes exceptionnelles et nettoyage
des voisins restent évalués par `FeatureAccessSystem`.

<a id="e"></a>
## E — Carte, rectangles et décors de combat

La carte attend un canevas de **1600 × 960** (`MAP_CANVAS`). Placez votre image dans
`assets/images/maps/auroria.png`. Les rectangles se trouvent dans `map-layout-content.js` :

```js
export const MAP_LAYOUT_CONTENT = {
  "auroria_start": {
    "x": 140,
    "y": 700,
    "w": 160,
    "h": 120
  },
  "auroria_path": {
    "x": 350,
    "y": 610,
    "w": 260,
    "h": 90
  },
  "auroria_city": {
    "x": 690,
    "y": 480,
    "w": 160,
    "h": 120
  },
  "auroria_forest": {
    "x": 940,
    "y": 360,
    "w": 220,
    "h": 140
  },
  "auroria_summit": {
    "x": 1240,
    "y": 170,
    "w": 170,
    "h": 150
  }
};
```

`x`, `y` désignent le coin supérieur gauche ; `w`, `h` sont la largeur et la hauteur. Vérifiez
les recouvrements, le contraste des noms, les zones cliquables et le déplacement de la carte sur mobile.
Ces coordonnées ne sont pas une grille de combats : elles positionnent les lieux sur la carte régionale.

Le kit fournit une carte schématique sans noms incrustés : les noms sont des libellés localisés
posés par le jeu. Une nouvelle carte de production doit être votre propre ressource.

### Le décor de combat est un autre réglage

Dans `src/config/LocationBackgrounds.js`, `SCENE_BY_LOCATION` peut préciser le décor :

```js
auroria_forest: 'forest',
auroria_summit: 'mountain',
```

Le nom doit être dans `BACKGROUND_SCENES`, avec sa ressource dans `assets/images/bg/`.
Sans exception, le décor est déduit du type : un donjon prend le décor de grotte par défaut.
Ce choix a aussi un effet sur `DungeonRules.depthFor()` : les scènes de type grotte/montagne ont
plusieurs étages, une forêt suit la règle non-grotte. Ne promettez pas un nombre d’étages en vous
fondant seulement sur le nom du lieu.

Si vous ajoutez une scène totalement nouvelle, il faut également sa déclaration, sa ressource et
le raccordement CSS existant. Déposer un PNG sans l’enregistrer ne crée pas un décor utilisable.

<a id="f"></a>
## F — Peupler les rencontres sauvages

Dans `encounters-content.js` :

```js
export const ENCOUNTERS_CONTENT = {
  "auroria_path": [
    {
      "species": "mossling",
      "minLevel": 3,
      "maxLevel": 6,
      "rarity": "common"
    },
    {
      "species": "pidgey",
      "minLevel": 3,
      "maxLevel": 6,
      "rarity": "uncommon"
    }
  ],
  "auroria_forest": [
    {
      "species": "mossling",
      "minLevel": 8,
      "maxLevel": 12,
      "rarity": "common"
    },
    {
      "species": "pikachu",
      "minLevel": 8,
      "maxLevel": 12,
      "rarity": "rare"
    }
  ]
};
```

Les trois raretés sont `common`, `uncommon`, `rare`. Utilisez des espèces existant dans `PokemonDB`,
avec `minLevel ≤ maxLevel`. Les poids effectifs sont ceux des règles de rencontres, pas des
pourcentages déduits des noms.

Une table portant l’id d’un lieu existant remplace **toute sa liste**. Copiez les anciennes rencontres
à conserver. Le bouton d’exploration exige des rencontres ; un donjon sans rencontres ne peut pas
être lancé même si son rectangle et son type existent.

Les rencontres ordinaires, rencontres de quête, Pokémon errants et équipes de dresseur sont des
contextes différents. Ne mettez pas un boss de scénario dans les rencontres communes si sa capture
ou sa récompense doit être unique. Utilisez les quêtes/rencontres dédiées et les systèmes existants.

<a id="g"></a>
## G — Ajouter un Pokémon, une forme ou une évolution

### G.1 Espèce — `species-content.js`

```js
export const SPECIES_CONTENT = {
  "mossling": {
    "dex": 1001,
    "region": "auroria",
    "types": [
      "grass"
    ],
    "stats": [
      50,
      45,
      55,
      65,
      60,
      45
    ],
    "catchRate": 120,
    "xpYield": 65,
    "talents": [
      "overgrow"
    ],
    "hiddenTalent": null,
    "evolutions": []
  }
};
```

- `dex` est un numéro de tri/Pokédex, **pas l’id de l’espèce**. Choisissez un numéro non utilisé.
- `stats` suit : PV, Attaque, Défense, Attaque spéciale, Défense spéciale, Vitesse.
- `region` détermine notamment son appartenance au Pokédex régional.
- `talents` doit contenir des ids connus. Le talent caché est séparé du tirage normal.
- `catchRate` est conservé comme donnée ; la capture actuelle dépend des règles de ball, pas de
  ce taux d’espèce. Ne promettez pas un nouveau comportement en changeant seulement ce champ.
- Les quatre attaques actives ne sont pas définies ici : voir le chapitre H.

Textes : `pokemon.mossling` en FR et EN. Images :

```text
assets/images/pokemon/mossling.png
assets/images/pokemon/shiny/mossling.png
```

Le kit utilise Bulbizarre comme **placeholder**, y compris son shiny. Pour votre création, remplacez
les images sans changer l’id stable. Le résolveur des chemins reste `AssetPaths.pokemonSprite()`.

### G.2 Évolution

Exemples de valeurs du champ `evolutions` ; la cible et l’objet doivent déjà exister :

```js
evolutions: [{to:'ivysaur',level:16}]
// Or an item evolution, not both examples at once:
evolutions: [{to:'raichu',item:'thunderstone',minLevel:1}]
```

Pour une nouvelle cible, créez sa définition complète et ses ressources avant de la référencer.
Une évolution ne doit pas cloner un Pokémon déjà possédé dans un autre modèle : utilisez le
système d’évolution et sa gestion canonique des UID.

### G.3 Forme alternative

Fragment à insérer dans `FORMS_CONTENT` ; fournissez aussi le sprite suffixé :

```js
mossling_winter: {
  species:'mossling',form:'winter',types:['ice'],
  stats:[50,45,60,65,65,35],kind:'alt'
}
```

Chemin : `assets/images/pokemon/mossling_winter.png` et, si fourni, son équivalent shiny.
Une forme reste la forme de l’espèce `mossling`; elle n’ajoute pas automatiquement une seconde
espèce au total régional. Les conditions d’acquisition d’une forme doivent correspondre à un
mécanisme réellement pris en charge ; un champ inventé n’est pas exécuté.

<a id="h"></a>
## H — Ajouter une capacité réellement utilisable

### H.1 Définition complète — `moves-content.js`

```js
export const MOVES_CONTENT = {
  "chloroshot": {
    "type": "grass",
    "category": "special",
    "power": 55,
    "accuracy": 100,
    "priority": 0,
    "rarity": 2,
    "cooldown": 1,
    "tags": [],
    "effects": [],
    "learnTypes": [
      "grass"
    ]
  }
};
```

- `category` : `physical`, `special`, `status`.
- `power` : puissance ; une capacité de statut a une puissance nulle.
- `accuracy` : pourcentage ; `neverMiss: true` est un comportement distinct, si nécessaire.
- `cooldown` : multiplicateur du délai d’attaque, **pas un nombre de secondes**.
- `rarity` participe au classement du pool d’apprentissage.
- `priority`, `hits`, `tags`, `bypassDefenseBoosts` et `effects` sont des options connues du moteur.
- `learnTypes` : tableau de types compatibles ; `learnTypes: ['all']` signifie tous les types.
  Une liste vide exclut la capacité du tirage naturel, utile pour des signatures.

Textes requis : `move.chloroshot` et `move_desc.chloroshot`, dans les deux langues.

### H.2 Le piège du learnset

Le Rework actuel **ne lit pas un tableau par espèce du type `movesAtLevel`**. `MoveLearnset` dérive
le pool des types et des `learnTypes`, trie selon ses règles, puis garde `MoveConfig.POOL_SIZE` entrées.
Le niveau ouvre progressivement ce pool ; les attaques stockées valides du Pokémon passent avant
le fallback naturel. Une nouvelle capacité compatible ne devient donc pas forcément sa première attaque.

Pour vérifier ce que votre Pokémon obtient vraiment :

```js
import {MoveLearnset} from './src/data/pokemon/MoveLearnset.js';
console.log(MoveLearnset.poolFor(['grass']));
console.log(MoveLearnset.movesForLevel(['grass'],20));
```

Le kit propose aussi une CT vendue en boutique. Elle déverrouille la capacité chez une cible
compatible via `ItemUseSystem` ; le joueur choisit ensuite son emplacement actif via
`MoveLearningSystem` et l’interface existante. Ne changez pas directement `pokemon.moves` depuis
un nouveau panneau.

Pour un **nouveau système de learnsets par espèce**, il faut explicitement faire évoluer le modèle
statique, son dépôt/validation, `MoveLearnset`, l’apprentissage, l’entraînement et les tests. Ajouter
un champ inconnu dans la définition d’une espèce ne suffit pas.

### H.3 Effets existants et effet inédit

Exemple d’effet reconnu à ajouter dans `effects`, si vous voulez un risque d’empoisonnement :

```js
{kind:'status',status:'poison',chance:20,secondary:true}
```

`chance: 20` signifie 20 %, pas `0.20`. Le vocabulaire est dans `MoveEffectKinds.js` et les
paramètres dans `docs/BATTLE_EFFECTS.md`. Les effets sont exécutés par les handlers du moteur de
combat ; `MoveDB.validate()` refuse un kind inconnu.

Un effet vraiment inédit nécessite : une constante, un handler dans le pipeline d’effets approprié,
son enregistrement, les conditions/paramètres validés, les textes de journal FR/EN et des tests
(résistance/immunité, KO, multi-coups et sauvegarde si un état persiste). Ne stockez pas une fonction
dans la table et ne rajoutez pas un second moteur de dégâts dans l’UI.

<a id="i"></a>
## I — Objets, CT, talents et ressources

### I.1 Les deux objets du kit — `items-content.js`

```js
export const ITEMS_CONTENT = {
  "auroria_pass": {
    "kind": "key",
    "price": 0,
    "image": "pokeflute.png"
  },
  "auroria_tm_chloroshot": {
    "kind": "tm",
    "price": 1200,
    "image": null,
    "move": "chloroshot"
  }
};
```

Le laissez-passer est un `key` gratuit accordé par quête, **pas un objet à vendre**.
La CT a un prix et référence une vraie capacité. `image: null` utilise le visuel générique prévu ;
l’image de flûte du laissez-passer est un placeholder existant à remplacer.

Familles connues : `held`, `tm`, `hm`, `ball`, `stone`, `evolution`, `fossil`, `key`, `consumable`,
`candy`, `treasure`, `keystone`, `memory` (`ItemKinds.js`). Les champs ne créent pas automatiquement
un usage. `ItemUseSystem` décide quels objets sont effectivement utilisables et sur quelles cibles.

Exemples de mécanismes déjà branchés : CT/CS (`move`), évolution déclarée, bonbon niveau, vitamines,
fossiles par le laboratoire. Pour un nouvel objet actif, auditez `ItemUseRules`, `ItemUseSystem`,
la sélection de cible, la consommation, les événements et la sauvegarde unique.

### I.2 Poké Balls

Une nouvelle ball nécessite une définition `kind: 'ball'`, son bloc `ball` et sa ressource SVG.
`rate` est le taux de base ; les conditions reconnues viennent de `BallConditions.js` et sont
évaluées par `BallRateRules`. Les filtres choisissent la ball lancée. Ne dupliquez pas ce calcul
pour une rencontre régionale. Le stock automatique des boutiques reste piloté par `ShopRules`.

### I.3 Talent

Pour réutiliser un effet existant, ajoutez une entrée complète dans `TALENTS_CONTENT`, puis sa
traduction `talent.<id>.name` / `.desc`. Exemple de forme reconnue, inspirée d’Engrais :

```js
export const TALENTS_CONTENT = {
  plateau_growth:{
    rarity:1,affinity:['grass'],
    effects:[{kind:'power',mult:1.35,when:{moveTypes:['grass'],selfHpBelow:0.35}}]
  }
};
```

Les paramètres de condition sont ceux réellement lus par les règles d’effets. Un talent inédit
suit le même principe qu’une capacité inédite : vocabulaire, handler, conditions validées, textes,
tests. Un texte vantant un bonus ne l’implémente pas.

<a id="j"></a>
## J — Arène, rival, équipes et ligue

### J.1 Une arène complète et sa revanche — `trainers-content.js`

```js
export const TRAINERS_CONTENT = {
  "auroria_ivy": {
    "kind": "gym",
    "region": "auroria",
    "badge": "auroria_leaf",
    "badgesRequired": 0,
    "reward": 1000,
    "sprite": "Brock",
    "teams": {
      "default": [
        {
          "species": "mossling",
          "level": 10,
          "moves": [
            "chloroshot"
          ]
        }
      ],
      "rematch": [
        {
          "species": "mossling",
          "level": 50,
          "moves": [
            "chloroshot",
            "growl"
          ]
        }
      ]
    },
    "badgeImage": "Rainbow"
  }
};
```

`badgeImage` est nécessaire pour un champion d’arène ; il désigne le nom sans `.svg` dans
`assets/images/badges/`. `sprite` est le nom sans `.png` dans `assets/images/trainers/`.
Le kit réutilise `Rainbow` et `Brock` comme visuels de travail.

**Différence capitale :** la victoire d’arène stocke **l’id du dresseur** (`auroria_ivy`) dans les
badges du joueur. `badge: 'auroria_leaf'` est une donnée d’affichage, pas l’id à utiliser dans un
objectif `badge` ou `hasBadge()`.

Chaque membre peut préciser `moves`, `talent`, `item`, `ivs`, `evs` ; les spreads respectent les
plafonds du Rework, pas des plafonds supposés d’un autre jeu. `teams.byStarter` permet des variantes,
`teams.rematch` une revanche. Sans revanche définie, les règles reprennent l’équipe normale.

### J.2 Rival

Même format, mais `kind: 'rival'` et pas de badge d’arène :

```js
export const TRAINERS_CONTENT = {
  "auroria_rival": {
    "kind": "rival",
    "region": "auroria",
    "badge": null,
    "badgesRequired": 0,
    "reward": 1000,
    "sprite": "Brock",
    "teams": {
      "default": [
        {
          "species": "pidgey",
          "level": 12,
          "moves": [
            "tackle"
          ]
        }
      ]
    }
  }
};
```

Les autres kinds connus sont déclarés dans `TrainerKinds.js`. Le système de dresseurs verse les
récompenses selon le contexte : première arène/ligue, revanche, adversaire de quête. Ne versez pas
une seconde récompense depuis le bouton « Défier ».

### J.3 Ligue

Déclarez d’abord ses membres `auroria_elite_one` et `auroria_elite_two` dans `TRAINERS_CONTENT`
(`kind: 'league'`, une équipe chacun), puis dans `leagues-content.js` :

```js
export const LEAGUES_CONTENT = {
  "auroria_league": {
    "region": "auroria",
    "badge": "auroria_title",
    "badgesRequired": 1,
    "reward": 5000,
    "sprite": "Brock",
    "trainers": [
      "auroria_elite_one",
      "auroria_elite_two"
    ],
    "badgeImage": "Champion_Stamp"
  }
};
```

Le kit fournit les deux définitions d’élite complètes dans `content.json`. Reliez la ligue au lieu
avec `champion: 'auroria_league'`. `TrainerSystem.challenge()` construit une série d’adversaires
avec le moteur normal ; `TrainerBattleContext` fait le règlement.

Le titre de ligue se lit par `save.statistics.hasWonLeague('auroria')`, **pas**
`save.player.hasBadge('auroria_league')`. Les titres ne sont pas des badges d’arène. Pour une nouvelle
quête « gagner cette ligue », ne supposez pas que l’objectif `badge` des arènes lit les titres :
ajoutez un objectif d’état qui interroge `QuestContext.hasWonLeague(region)`, enregistrez-le dans
`ObjectiveTypes` / `ObjectiveRegistry`, ajoutez sa description FR/EN et ses tests. L’exemple n’ajoute
pas cette extension ; sa chaîne de quatre quêtes se termine au rival. La ligue reste jouable et
son vrai titre régional est testé. Aucun mécanisme de réparation d’anciennes ligues n’est ajouté ici.

<a id="k"></a>
## K — Boutique, tarifs et achats uniques

Dans `shops-content.js` :

```js
export const SHOPS_CONTENT = {
  "auroria_store": {
    "items": [
      "rarecandy",
      "auroria_tm_chloroshot"
    ]
  }
};
```

Reliez ce commerce à un lieu avec `shop: 'auroria_store'`. Son nom vient de
`shop.auroria_store.name`. Tout objet de la liste doit avoir un prix positif reconnu par `ItemDB`.
Les objets-clés gratuits de scénario ne doivent pas figurer dans cette liste.

Pour un commerce réservé à une ligue déjà gagnée, le champ **existant** `requiresLeague` est un
**id de ligue** de `LeagueDB`, par exemple `auroria_league`. Le système vérifie le titre régional.
Ce verrou de boutique ne bloque pas, à lui seul, l’entrée dans le lieu.

### Stock automatique

Le catalogue ajoute les balls selon `badgesRequired` du lieu : Poké Ball, Super Ball à partir du
palier 2, Hyper Ball au palier 5, offres de Master Ball au palier 8. Le prix de Master Ball croît
avec le nombre déjà acheté ; l’achat de Poké Balls peut accorder des Honor Balls. Gardez ces règles
centrales plutôt que de recréer des offres parallèles.

Depuis 1.14.21, **toutes les boutiques utilisables** proposent aussi :

| Module | Achat unique | Type d’offre |
|---|---:|---|
| Relance des combats sauvages | 2 500 points de quête | `upgrade` |
| Relance des donjons | 5 000 points de quête | `upgrade` |

Ces modules **ne sont pas des objets d’inventaire**. Le catalogue les retire dès qu’ils sont possédés,
la quantité est toujours un, et `ShopSystem` possède leur transaction unique. Depuis 1.14.23,
le panneau Combat n’affiche que le switch possédé correspondant au lieu, nommé Auto combat ou
Auto donjon depuis 1.14.24, y compris pendant un combat ou un donjon ;
les achats restent dans la boutique. Pour un nouveau module permanent, suivez ce type d’offre ; n’ajoutez
pas un faux objet ou un faux Pokémon pour représenter l’amélioration.

### Marché aux Pokémon (à partir de 1.14.22)

Ne confondez pas la **boutique d’objets du lieu** et le **Marché régional** des raccourcis. Le Marché
se débloque après un badge, ou à Johto, et se paie uniquement en points de quête. `ShopSystem.buyMarket`
possède sa transaction ; les achats ne produisent ni captures sauvages ni crédits d’éclosion.
Le premier exemplaire d’une espèce non possédée rejoint l’équipe si une place est libre ; les autres
restent dans la collection du PC. Chaque exemplaire garde son propre UID.

Pour modifier le catalogue, éditez `src/config/MarketRules.js` :

- `STOCK` donne les candidats par région. Le stock réellement affiché retire les espèces déjà
  sauvages dans cette région et les cibles d’évolution, avec les exceptions explicites du main.
- `CATEGORIES` détermine les groupes et identifie aussi les starters pour leur prix.
- `REGION_PRICE_BANDS` fixe les prix selon le numéro national. Les montants sauvegardés ne sont
  jamais arrondis : le `1k` visuel est une présentation et son infobulle conserve `1 000`.
- Pour une région nouvelle, ajoutez une entrée `STOCK` même si sa liste est vide : sinon le
  comportement de repli hérité du main utilise Kanto. `BANNED` peut compléter les exclusions.
- Le choix validé en 1.14.22 **conserve les rencontres du Rework**. Johto a donc six offres, et non
  les quinze du main exécuté : neuf de ses candidats sont déjà sauvages dans ces données.

Exemple de ligne à ajouter **dans l’objet `STOCK`**, et non dans les tables générées :

```js
auroria: Object.freeze(['bulbasaur']),
```

Cet exemple ne force pas l’achat si Bulbizarre devient sauvage à Auroria : le filtre central continue
à s’appliquer. Pour un nouveau starter de numéro 1001, ajoutez-le aussi dans `CATEGORIES.starter`,
puis insérez avant les autres bandes, dans `REGION_PRICE_BANDS`, par exemple :

```js
Object.freeze({ minDex: 1001, starterPrice: 10000, otherPrice: 20000 }),
```

Le kit Auroria ne modifie pas ce catalogue : ces lignes sont une extension facultative à réaliser
vous-même. `MarketCatalog` reste sans DOM et sans écriture ; `MarketPanel` réutilise `MoneyRow`,
`PriceTag` et la barre `ShopFooter` au lieu de réimplémenter les achats dans le panneau.

<a id="l"></a>
## L — Écrire une histoire et des quêtes

### L.1 La liste complète du kit — `quests-content.js`

```js
export const QUESTS_CONTENT = [
  {
    "category": "main",
    "id": "auroria_welcome",
    "region": "auroria",
    "location": "auroria_start",
    "objective": {
      "type": "talk"
    },
    "rewards": {
      "questPoints": 50
    }
  },
  {
    "category": "main",
    "id": "auroria_road",
    "region": "auroria",
    "location": "auroria_path",
    "objective": {
      "type": "kill",
      "location": "auroria_path",
      "count": 3
    },
    "rewards": {
      "questPoints": 100,
      "items": {
        "auroria_pass": 1
      }
    }
  },
  {
    "category": "main",
    "id": "auroria_gym",
    "region": "auroria",
    "location": "auroria_city",
    "objective": {
      "type": "badge",
      "badge": "auroria_ivy"
    },
    "rewards": {
      "questPoints": 100
    }
  },
  {
    "category": "main",
    "id": "auroria_rival",
    "region": "auroria",
    "location": "auroria_city",
    "objective": {
      "type": "boss",
      "trainer": "auroria_rival"
    },
    "rewards": {
      "questPoints": 100
    }
  },
  {
    "category": "side",
    "id": "auroria_catches",
    "region": "auroria",
    "location": "auroria_city",
    "objective": {
      "type": "catch",
      "location": "auroria_path",
      "count": 2
    },
    "rewards": {
      "questPoints": 80
    }
  }
];
```

Les quatre quêtes `main` sont ajoutées dans cet ordre. L’id peut être alphanumérique ; la clé de
la deuxième est `main.auroria_road`. **Le numéro de quête n’est jamais son index de progression.**
`getMainChain('auroria')` donne l’ordre réel et `getMainStep('auroria')` la position sauvegardée.

- `location` est le contexte de la quête ; l’objectif peut aussi porter sa propre `location`.
- `objective.count` est le seuil d’un compteur ; les objectifs d’état ont leurs règles propres.
- Les victoires de dresseur ne sont pas des `kill` sauvages. Utilisez `boss` pour un dresseur.
- Une quête `talk` principale est auto-réclamée une fois son objectif accompli. Les autres doivent
  normalement être **réclamées** par le flux de quête : « objectif terminé » et « récompense récupérée »
  ne sont pas interchangeables pour une porte `questKey`.
- Une quête secondaire doit être acceptée avant que ses compteurs réagissent aux événements.
- Les compteurs sont sauvegardés par `QuestSystem`, pas dans la définition de quête.

### L.2 Objectifs disponibles et sources de progression

| Type | Champs utiles / sens |
|---|---|
| `talk` | conversation dans le groupe du `location` de la quête |
| `kill` | `count`, `location?`, victoires sauvages pendant l’activation |
| `catch` | `count`, `location?`, captures |
| `boss` | `trainer`, victoire sur le dresseur |
| `badge` | `badge`, id du champion d’arène possédé |
| `item` | `item`, `count`, état de l’inventaire |
| `own_species` | `species`, présence dans **l’équipe active**, pas toute la collection PC |
| `region_wins` | `region`, `count`, victoires sauvages de la région |
| `dex_region` | `region`, `count`, espèces marquées capturées |
| `mine_dig`, `mine_sell` | événements de mine |
| `hatch`, `hatchery_level`, `fossil`, `training` | événements réels des installations |
| `puzzle`, `base_visit`, `base_establish` | modules associés ; paramètres de leur classe d’objectif |

La liste autoritaire est `ObjectiveTypes.js` et chaque classe est dans
`src/data/quests/objectives/`. Pour connaître le comportement exact, lisez sa méthode `progressFor`
ou `stateProgress`, ses `EVENTS` et `describe`. Un champ arbitraire `npc`, `enemy`, `completedDungeon`
n’a aucun effet si ces méthodes ne le lisent pas.

### L.3 Récompenses et prérequis

Les récompenses peuvent contenir `questPoints`, des `items`, un Pokémon et les monnaies normalisées
prises en charge par `QuestDB`/`QuestSystem`. Les dons de Pokémon ont des règles de place ; les
récompenses de rencontre ne sont pas de simples dons. Les quêtes légendaires utilisent `chain`,
`requires` et parfois `encounter`. Copiez une définition existante du **même mécanisme** puis
vérifiez le modèle normalisé retourné par `QuestDB`.

Ne confondez pas `requires` d’une quête, les conditions d’offre d’un PNJ et les portes d’un lieu.
Une condition sur une quête ne verrouille pas automatiquement un rectangle de carte.

### L.4 Nouvel objectif

Pour « étudier trois sites » ou un autre objectif inédit :

1. définissez un événement métier réel (par exemple `FieldJournalChangedEvent`) ;
2. ajoutez la valeur dans `ObjectiveTypes` ;
3. créez une classe `QuestObjective` de compteur, ou `StateObjective` si le fait existe déjà ;
4. ajoutez les lectures nécessaires à `QuestContext` plutôt que de laisser l’objectif muter SaveData ;
5. enregistrez la classe dans `ObjectiveRegistry` ;
6. ajoutez `quest_objective_<type>` en FR/EN et vérifiez le rendu de `describe()` ;
7. validez les nouvelles références dans `QuestDB.validate()` ;
8. testez activation, mauvais événement, bon événement, réclamation unique et rechargement.

<a id="m"></a>
## M — Ajouter les PNJ et leurs dialogues

Les PNJ sont des enregistrements localisés sous `npc.<lieu>.<index>`. Pour un lieu neuf, ajoutez
la même structure sous la propriété `npc` de votre domaine manuel français et anglais :

```js
auroria_start: [{
  id:'auroria_guide',
  name:'Professeur Saule',
  lines:['Bienvenue à Auroria. Votre partenaire vous attend.']
}]
```

Le nom et les phrases changent en anglais ; **l’id `auroria_guide` reste identique**. Ne déduisez
pas l’identité d’un nom traduit ou de la position dans le tableau.

Dans `src/data/content/NpcQuestLinks.js`, à l’intérieur de `NPC_QUEST_LINKS` :

```js
auroria_guide:Object.freeze({mainQuestKey:'main.auroria_welcome'}),
auroria_researcher:Object.freeze({sideQuestKey:'side.auroria_catches'}),
```

Créez aussi le dialogue `auroria_researcher` à Florécité. Le kit le fournit. Un lien pointe vers une
quête qui existe et doit correspondre à une identité présente dans les deux langues.
`NpcDirectory` lit le dialogue ; `NpcQuestDirectory` lit l’offre ; `QuestSystem` décide de son état.

### Ne pas inventer une contrainte d’identité pour TALK

Dans cette version, l’identité du PNJ détermine **qui propose l’offre**. Une fois une quête `talk`
active, `TalkObjective` accepte une conversation du même groupe de lieu, même avec un autre PNJ.
L’ancien raccourci « le PNJ doit toujours être celui du lien pour valider » serait inexact.
Si votre histoire exige une identité stricte, ajoutez explicitement ce paramètre à l’objectif,
vérifiez `event.npcId`, adaptez la validation et testez qu’un voisin ne valide pas. Ne promettez pas
ce comportement en ajoutant seulement un champ ignoré.

<a id="n"></a>
## N — Bloquer une zone derrière quête, combat, arène ou objet

Toutes les portes doivent être évaluées dans **FeatureAccessSystem**, pas seulement dans le clic UI.
Le système applique d’abord la règle de lieu, puis la propagation depuis les connexions nettoyées.

### N.1 Quête réclamée + objet de scénario

Dans `LOCATION_ACCESS_GATES` de `ContentAccessRules.js` :

```js
auroria_city:Object.freeze({
  questKey:'main.auroria_road',
  itemId:'auroria_pass'
}),
```

Les deux conditions sont en **ET**. Trois victoires ne suffisent pas si la récompense de la quête
n’a pas encore été réclamée. Ne consommez pas un laissez-passer permanent sans concevoir la suite :
la condition de possession peut redevenir fausse.

### N.2 Un combat précis

Le kit place avant l’entrée du Bois une quête `boss` contre `auroria_rival`, puis cette porte :

```js
auroria_forest:Object.freeze({questKey:'main.auroria_rival'}),
```

Le donjon requiert déjà `badgesRequired: 1`. Il faut donc le badge régional **et** la quête du rival
réclamée. Le combat utilise `TrainerSystem`, ses vrais adversaires et ses statistiques ; aucun
événement de victoire n’est fabriqué par le panneau.

### N.3 Une ou plusieurs arènes

- « N’importe quels trois badges de la région » : mettez `badgesRequired: 3` sur le lieu.
- « Cette arène précise » : utilisez une étape `badge` avec `badge: 'auroria_ivy'`, puis une porte
  `questKey` après sa réclamation.
- Si vous ne voulez **aucune quête intermédiaire**, ajoutez une condition dédiée au résolveur,
  à son diagnostic (`getLocationAccessStatus`), à la validation et aux tests. Ne mettez pas
  `badgeId: 'auroria_ivy'` dans une table en supposant qu’il est déjà interprété.

### N.4 Starter, titre et rotation

Les portes exceptionnelles existantes comprennent `starterRegion`, `championTitle`, `rotationWindow`,
`questKey`, `itemId`. Le kit protège la première route avec :

```js
auroria_path:Object.freeze({starterRegion:'auroria'}),
```

`championTitle: true` signifie le titre permanent reconnu par le résolveur ou **au moins une ligue
gagnée**, pas nécessairement la ligue d’Auroria. Pour une ligue régionale précise, il faut une
extension explicitement testée lisant `statistics.hasWonLeague(region)`.

`rotationWindow` suit la fenêtre temporelle existante ; ne l’utilisez pas comme simple booléen.
Un système de portes « OU », de météo ou de gardien de donjon n’est pas implicite.

### N.5 Exemple d’extension, si vous en avez besoin

Ceci est une **modification supplémentaire du moteur**, non incluse dans le kit. Pour lire un
nouveau champ `leagueRegion`, ajoutez un contrôle dans `_locationGateSatisfied` :

```js
if(gate.leagueRegion && !save.statistics.hasWonLeague(gate.leagueRegion)) return false;
```

Il faut aussi le diagnostic correspondant, la validation de la région et du lieu, un rafraîchissement
sur la victoire de ligue et des tests avant/après/reload. Sans ces autres étapes, vous aurez une
porte opaque ou une UI qui n’affiche pas le bon état.

### N.6 Pièges de sauvegarde

`access.locations` contient des faits d’accès persistants, mais ces faits **ne court-circuitent pas**
les conditions vérifiées avant eux. Ne l’utilisez pas pour contourner une porte depuis l’UI.
N’insérez pas une nouvelle quête avant des étapes déjà parcourues dans une histoire existante sans
migration : son index principal sauvegardé changerait de sens. Pour une région totalement neuve,
les anciennes parties n’ont naturellement pas encore sa progression.

<a id="o"></a>
## O — Pokédex, choix de partenaire et filtres de région

### O.1 Origine des espèces et Pokédex

`PokemonDB.getByRegion('auroria')` utilise le champ `region` de chaque **espèce**. La liste des
rencontres n’est pas une définition de Pokédex régional. Croiser Roucool à Auroria ne le retire pas
du Pokédex de Kanto et ne le compte pas automatiquement dans celui d’Auroria.

Ne déplacez pas les espèces historiques dans une autre région pour remplir un nouveau Pokédex :
vous changeriez les prérequis des anciennes campagnes. Pour des Pokédex régionaux qui se recouvrent,
concevez une table de listes régionales et adaptez ensemble la visibilité du Pokédex, les compteurs,
les objectifs et les portes. Ce n’est pas le modèle actuel.

Les régions visibles du Pokédex suivent les régions disponibles **et accessibles** du résolveur.
`available: true` ne force donc pas leur affichage chez un joueur débutant. Le PC continue de montrer
toute la collection possédée. Ne refaites pas les cartes acceptées du Pokédex/PC pour ajouter votre région.

### O.2 Partenaire régional

Dans `STARTERS_BY_REGION` (`src/data/pokemon/StarterData.js`) :

```js
auroria:Object.freeze([
  Object.freeze({species:'mossling',nameKey:'pokemon.mossling',descKey:'starter_auroria_mossling_desc'})
]),
```

`RegionalStarterSystem` effectue le choix unique, ajoute le Pokémon via le propriétaire canonique,
met à jour les faits de collection/Pokédex et le range dans le PC si nécessaire. Utilisez
`chooseStarter('auroria','mossling')`; n’ajoutez pas une deuxième copie depuis le panneau.

Réutiliser un ancien starter a des effets : le résolveur peut reconnaître ce starter dans la
collection ou le Pokédex et considérer le choix déjà acquis. Pour un choix réellement neuf,
utilisez une espèce propre à la nouvelle région ou adaptez explicitement la politique.

Le jeu garde sa région initiale par défaut. Ajouter ce tableau ne suffit pas à rendre une nouvelle
campagne de départ cohérente avec le tutoriel initial et les portes de voyage.

### O.3 Audits faciles à oublier

- Ajoutez `auroria` à `FacilityFilterRules.COMMON.filterRegion`, sinon les filtres d’installation
  ne proposent pas cette valeur et leur normalisation peut l’effacer.
- Définissez **les deux clés** `map_region_auroria` et `region_auroria` en FR/EN.
- Les succès épinglés sont déclarés dans `AchievementsPanel.js`, avec des paliers numériques.
  Ils ne sont pas générés automatiquement à partir de `REGIONS`. Ajoutez un succès régional si
  souhaité et revoyez le dernier palier national lorsque le nombre d’espèces change.
- Auditez les assertions de couverture de données : un test exigeant exactement 419 capacités
  doit devenir 420 si vous en ajoutez une, sans retirer le test de validité ou de gel des définitions.

<a id="p"></a>
## P — Donjons et chaîne automatique

Un lieu `kind: 'dungeon'` avec des rencontres utilise `DungeonSystem`. Celui-ci possède la carte,
le péage, les combats, les coffres, la descente, les récompenses et le règlement d’échec.
Le nouveau pilote **n’est pas un second moteur** : il ne fait que sélectionner une destination
puis appeler `moveTo()` ou `resumePendingEncounter()`.

### Contrat en 1.14.25

| Fonction | Règle |
|---|---|
| Pilote d’un donjon | gratuit, après **3 expéditions terminées victorieusement dans ce donjon** |
| `farm` | explorer/régler les combats et coffres avant le gardien |
| `boss` | trajet direct vers le gardien puis descente |
| `chest` | coffres avant le gardien, pénalité de trajet pour éviter les combats inutiles |
| Rythme du pilote | départ 400 ms, pas 350 ms, coffre 450 ms ; les combats gardent leurs propres horloges |
| Relance de donjon achetée | 5 secondes après fin naturelle (gardien final ou équipe K.O.) |
| Péage | payé normalement à **chaque nouvelle expédition**, jamais pour une simple reprise |
| Choix mémorisé | dernier mode non manuel ; réappliqué si le pilote est déverrouillé |
| Jetons manquants | la tentative s’arrête, sans boucle de paiement ou relance tardive automatique |
| Annulation / abandon / remontée volontaire | ne fabrique pas une fin naturelle à relancer |

Le module acheté et le déverrouillage du pilote sont **indépendants**. Un joueur peut piloter un
donjon sans avoir acheté la relance ; acheter la relance ne donne pas les trois victoires.
Avant le seuil, une nouvelle expédition reste manuelle.

Les combats sauvages gagnés s’enchaînent déjà sans achat. Le module sauvage sert après une
**défaite naturelle de la chaîne**, pas après chaque Pokémon vaincu, ni après « Quitter », une arène
ou un combat spécial. Les délais sont transitoires et liés à la partie/au lieu ; ils ne sont pas
un historique d’actions à rejouer après import.

**Limite importante :** cette chaîne fonctionne dans le moteur vivant du Rework. Ce n’est pas une
simulation hors ligne de douze heures ni un rattrapage complet de l’AFK de l’original.

Pour un donjon régional à génération ou règles différentes, ajoutez des règles de données et une
stratégie au système existant. Ne versez jamais le contenu du coffre depuis son widget et ne
remplacez pas les combats par une multiplication de récompenses.

<a id="q"></a>
## Q — Réutiliser les installations et les Pokémon sans les dupliquer

Le Rework possède **une collection unique de Pokémon**, `save.collection`. L’équipe, la Pension,
les emplacements d’Entraînement et les presets gardent des **UID**, pas des copies de Pokémon.
Le PC est la vue de toute cette collection.

Si votre gameplay mobilise un Pokémon :

1. stockez son UID dans le nouveau modèle ;
2. demandez les autorisations à `PokemonUsageSystem` avec une action reconnue ;
3. utilisez les systèmes de sélection communs du PC / des installations ;
4. ne libérez pas une réservation parce que l’écran est fermé ou qu’un filtre a changé ;
5. migrez les affectations et les batailles en conservant leurs UID et leur DTO complet.

Les installations existantes sont accessibles à distance **après leur déverrouillage permanent**.
Une nouvelle fonctionnalité permanente doit déclarer son fait et sa règle dans le résolveur commun,
plutôt qu’une condition de route dans plusieurs panneaux.

Les filtres ne refiltrent pas rétroactivement les FIFO manuels. Une bataille d’Entraînement
reprend son adversaire, ses PV, son RNG, son terrain et ses délais : ne la reconstruisez pas à partir
du seul nom du Pokémon. Les bonus de personnel annoncés mais inactifs restent signalés comme tels.
« PC » pour un recrutement historique correspond aux **points de quête**, pas aux points de combat.

Pour les prix, réutilisez `PriceTag`. Un bouton `.hbtn[disabled]` est caché par le design system :
le montant d’une offre non achetable doit rester dans un conteneur informatif **hors de ce bouton**.
Le prix reste visible sans message de solde insuffisant. Pour une grille de cartes de hauteurs
variables, `grid-auto-rows: 1fr`, des cartes flex verticales et un pied `margin-top: auto` égalisent
**toutes les rangées**, pas seulement les cartes d’une seule rangée.

<a id="r"></a>
## R — Nouveau gameplay : le modèle du Carnet de terrain

### R.1 Définir le comportement avant le code

Le Carnet est proposé à Auroria. Après trois victoires sauvages sur une route, hors combat, on peut
étudier ce site **une seule fois** et recevoir 250 Pokédollars. Changer de partie ne doit pas transférer
les sites ou les récompenses. Le nombre de sites est dérivé de la liste des ids ; on ne sauvegarde
pas deux compteurs qui pourraient diverger.

Ce module est un **exemple de gameplay régional**, pas une nouvelle installation permanente. Le
panneau peut donc se masquer hors d’Auroria. Si vous souhaitez un déverrouillage permanent après
une quête, déclarez-le dans `FeatureAccessSystem` et utilisez ce statut dans le système.

### R.2 Modèle complet — `src/data/save/FieldJournalData.js`

```js
/** @file FieldJournalData.js @brief Stores only surveyed site IDs; counts are derived. */
import { BaseModel } from "../core/BaseModel.js";
export class FieldJournalData extends BaseModel {
  constructor(data = {}) {
    super("FieldJournalData", "Data");
    this.deserialize(data);
  }
  deserialize(data = {}) {
    this.sites = [
      ...new Set(
        (Array.isArray(data?.sites) ? data.sites : []).filter(
          (id) => typeof id === "string" && id.length > 0,
        ),
      ),
    ];
  }
  has(locationId) {
    return this.sites.includes(locationId);
  }
  add(locationId) {
    if (!locationId || this.has(locationId)) return false;
    this.sites.push(locationId);
    return true;
  }
  serialize() {
    return { sites: [...this.sites] };
  }
}
```

La désérialisation accepte un champ absent et retire les doublons/valeurs invalides. La sérialisation
renvoie une copie de la liste. Les méthodes ne connaissent ni un bouton, ni une traduction, ni le DOM.
Les ids inconnus mais textuels sont conservés comme faits, pour ne pas perdre un ancien site simplement
parce qu’un module de contenu est temporairement absent.

Le modèle seul n’est pas encore sauvegardé : les trois branchements dans SaveData et la migration
sont décrits au chapitre U. N’oubliez pas l’un de ces trois points.

<a id="s"></a>
## S — Nouveau gameplay : règles, événement et commande

### S.1 Règles partagées — `src/config/FieldJournalRules.js`

```js
/** @file FieldJournalRules.js @brief Sample-only field survey rules; data, never UI text. */
export const FieldJournalRules = Object.freeze({
  REGION: "auroria",
  MIN_WINS: 3,
  REWARD: 250,
  CURRENCY: "money",
});
```

Le seuil et la récompense n’existent qu’à un endroit ; l’UI les lit dans le snapshot. Aucun texte
traduit n’est stocké dans les règles.

### S.2 Événement — `src/core/events/FieldJournalChangedEvent.js`

```js
/** @file FieldJournalChangedEvent.js @brief A field site was surveyed through its canonical command. */
import { BaseEvent } from "../BaseEvent.js";
export class FieldJournalChangedEvent extends BaseEvent {
  static TYPE = "FieldJournalChangedEvent";
  constructor(locationId) {
    super(FieldJournalChangedEvent.TYPE);
    this.locationId = locationId;
  }
}
```

### S.3 Système complet — `src/systems/FieldJournalSystem.js`

```js
/** @file FieldJournalSystem.js @brief Sample-only gameplay: one paid survey per cleared route. */
import { BaseSystem } from "./BaseSystem.js";
import { SaveSystem } from "./SaveSystem.js";
import { BattleSystem } from "./BattleSystem.js";
import { FeatureAccessSystem } from "./FeatureAccessSystem.js";
import { LocationSystem } from "./LocationSystem.js";
import { LocationDB } from "../data/world/LocationDB.js";
import { FieldJournalRules as Rules } from "../config/FieldJournalRules.js";
import { EventBus } from "../core/EventBus.js";
import { FieldJournalChangedEvent } from "../core/events/FieldJournalChangedEvent.js";
export class FieldJournalSystem extends BaseSystem {
  static _instance = null;
  static getInstance() {
    return this._instance || (this._instance = new FieldJournalSystem());
  }
  constructor() {
    super("FieldJournalSystem", "System");
  }
  getSnapshot() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const location = LocationDB.getInstance().getById(
      LocationSystem.getInstance().getCurrentLocationId(),
    );
    const visible = !!save && save.player.region === Rules.REGION;
    const wins =
      save && location ? save.statistics.wildWinsInGroup(location.id) : 0;
    const already = !!location && !!save?.fieldJournal.has(location.id);
    const reason = already
      ? "already"
      : BattleSystem.getInstance().isActive()
        ? "battle"
        : location?.kind !== "route"
          ? "location"
          : wins < Rules.MIN_WINS
            ? "wins"
            : "ready";
    return {
      visible,
      locationId: location?.id || null,
      wins,
      required: Rules.MIN_WINS,
      total: save?.fieldJournal.sites.length || 0,
      reward: Rules.REWARD,
      reason,
      canSurvey:
        visible &&
        reason === "ready" &&
        FeatureAccessSystem.getInstance().isLocationUnlocked(location.id),
    };
  }
  survey() {
    const model = this.getSnapshot(),
      save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !model.canSurvey || !save.fieldJournal.add(model.locationId))
      return false;
    save.currencies.add(Rules.CURRENCY, Rules.REWARD);
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(
      new FieldJournalChangedEvent(model.locationId),
    );
    return true;
  }
}
```

Lisez les deux méthodes séparément :

- `getSnapshot()` est une requête pure pour l’UI. Elle dérive lieu, victoires, motif, montant et
  possibilité de commande. Rafraîchir la vue ne rapporte rien et ne sauvegarde rien.
- `survey()` relit la vraie possibilité, marque le site, verse la récompense, sauvegarde **une fois**
  puis signale le changement. Un second clic ne paie pas et n’écrit pas.

La règle interdit le versement pendant un combat. Les trois victoires d’une chaîne sauvage ne la
terminent pas automatiquement : le joueur peut quitter normalement, puis étudier le site. Le bouton
ne doit pas conclure le combat ou forger un `PokemonDefeatedEvent`.

Ce gameplay est une commande instantanée : il n’a pas besoin d’un `setInterval` ni d’un nouveau
moteur de boucle. Si vous ajoutez une production dans le temps, utilisez `BaseSystem.update(dt)`,
un état sauvegardé clair et une politique explicite de temps hors ligne ; n’inventez pas un rattrapage
qui dupliquerait les récompenses à chaque rechargement.

<a id="t"></a>
## T — Nouveau gameplay : le panneau, son montage et le mobile

### T.1 Panneau complet — `src/panels/FieldJournalPanel.js`

```js
/** @file FieldJournalPanel.js @brief Sample-only stable, localized dashboard view. */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { FieldJournalSystem } from '../systems/FieldJournalSystem.js';
import { FieldJournalChangedEvent } from '../core/events/FieldJournalChangedEvent.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';
export class FieldJournalPanel extends DraggablePanel {
  constructor(column) {
    super({
      id: WindowIds.FIELD_JOURNAL,
      column,
      title: t('fieldjournal_title'),
      icon: 'book',
      name: 'FieldJournalPanel',
    });
    this._summary = new UIText({ tagName: 'p' });
    this._state = new UIText({ tagName: 'p' });
    this._survey = new UIButton({
      className: 'hbtn',
      text: t('fieldjournal_survey'),
      onClick: () => FieldJournalSystem.getInstance().survey(),
    });
    this.addChild(
      new UIContainer({
        className: 'pw-field-journal',
        children: [this._summary, this._state, this._survey],
      }),
    );
    for (const type of [
      FieldJournalChangedEvent,
      PokemonDefeatedEvent,
      BattleStartedEvent,
      BattleEndedEvent,
      LocationChangedEvent,
      SaveCreatedEvent,
      SaveLoadedEvent,
      SaveDeletedEvent,
    ])
      this.listen(type, () => this._refresh());
    this.listen(LanguageChangedEvent, () => {
      this.setTitle(t('fieldjournal_title'));
      this._survey.setText(t('fieldjournal_survey'));
      this._refresh();
    });
    this._refresh();
  }
  _refresh() {
    const model = FieldJournalSystem.getInstance().getSnapshot();
    this.setVisible(model.visible);
    this._summary.setText(
      t('fieldjournal_summary', { total: model.total, reward: model.reward }),
    );
    this._state.setText(
      t(`fieldjournal_state_${model.reason}`, {
        wins: model.wins,
        required: model.required,
      }),
    );
    this._survey.setVisible(model.canSurvey);
  }
}
```

Les widgets sont créés **une fois**. Le panneau réagit aussi au changement de langue pour son titre
et son action. `_refresh()` appelle des setters qui évitent les mutations
inutiles ; il ne détruit pas le bouton après chaque événement. Le clic appelle la commande du
système. Les abonnements `this.listen()` sont libérés lors de la destruction du panneau.

N’utilisez pas `innerHTML`, `document.createElement`, `.style` ou une référence vers un autre panneau.
Les nouveaux widgets de base vont dans `src/ui/`. Les images passent par `AssetPaths` ; les glyphes
par `IconRegistry` et `UIIcon`.

### T.2 Identifiant et emplacement

Ajoutez à `WindowIds`, dans `src/config/DashboardLayout.js` :

```js
FIELD_JOURNAL:'win-field-journal',
```

Dans `src/pages/GamePage.js`, importez la classe et ajoutez-la au tableau transmis à
`dashboard.addWindows()`, sans garder une référence dans la page :

```js
import {FieldJournalPanel} from '../panels/FieldJournalPanel.js';
// Inside dashboard.addWindows([...]):
new FieldJournalPanel(DashboardColumns.RIGHT),
```

La colonne par défaut et l’ordre viennent de cette composition. Le système de layout restaure
ensuite les choix du joueur. Le nouvel id déclaré permet la normalisation et le déplacement de
la fenêtre ; ne remplacez pas la disposition personnelle par une nouvelle liste fixe.

### T.3 Enregistrer le système

Dans `src/main.js` :

```js
import {FieldJournalSystem} from './systems/FieldJournalSystem.js';
// Among the existing engine registrations:
engine.registerSystem('FieldJournalSystem',FieldJournalSystem.getInstance());
```

### T.4 Ne pas oublier le mobile

Dans l’exemple, on ajoute `WindowIds.FIELD_JOURNAL` à la liste `windows` de l’onglet mobile
`shortcuts` dans `MOBILE_VIEWS`. Le panneau apparaît ainsi sous **Raccourcis** à Auroria. Le bureau
seul ne suffit pas à rendre un nouveau panneau accessible sur téléphone.

Pour un onglet dédié, ajoutez une entrée de navigation, ses textes et sa règle de disponibilité.
L’UI doit demander ce statut au système/résolveur et non reproduire la règle métier. Si la fenêtre
a besoin d’une aide dédiée, ajoutez la correspondance dans `GuideSections.js` et le contenu d’aide.

### T.5 CSS — `assets/css/field-journal.css`

```css
.pw-field-journal {
  display: grid;
  gap: 10px;
  color: var(--pw-text-primary);
}
.pw-field-journal p {
  margin: 0;
  line-height: 1.5;
}
```

Importez cette feuille **dans le bloc initial des imports** de `assets/css/style.css`, avant toute règle
CSS : une directive `@import` placée en fin de fichier serait ignorée par le navigateur.
Gardez les couleurs sous forme de tokens pour
les thèmes. La fenêtre de dashboard grandit avec son contenu ; le document est le scroller principal.
Pour un véritable écran plein format, étendez `UIFullscreenPanel`, placez sa classe dans
`src/panels/fullscreen/`, montez-la dans `GamePage`, déclarez son `ModalIds` et ouvrez-la avec
`ModalOpenRequestedEvent`. Un système ne doit jamais chercher un élément dans le DOM pour l’ouvrir.

<a id="u"></a>
## U — Sauvegarder, migrer et changer de partie sans perte

### U.1 Trois branchements indispensables dans SaveData

Importez `FieldJournalData`, puis ajoutez les lignes aux endroits correspondants :

```js
import {FieldJournalData} from './FieldJournalData.js';

// In the constructor:
this.fieldJournal=new FieldJournalData();

// In the object returned by serialize():
fieldJournal:this.fieldJournal.serialize(),

// In deserialize(data):
this.fieldJournal=new FieldJournalData(data.fieldJournal);
```

Ce sont des **fragments à placer dans la classe**, pas un fichier exécutable isolé.
Le premier prépare une partie neuve, le deuxième écrit le fait, le troisième le relit. Une seule
ligne manquante donne un bug qui paraît aléatoire après rechargement.

### U.2 Migration pure 20 → 21 de l’exemple

Fichier `src/data/save/migrations/MigrationV20ToV21.js` :

```js
/** @file MigrationV20ToV21.js @brief Sample-only next schema; existing fields remain unchanged. */
import { FieldJournalData } from "../FieldJournalData.js";
export const MigrationV20ToV21 = Object.freeze({
  from: 20,
  to: 21,
  migrate(raw) {
    return {
      ...raw,
      version: 21,
      fieldJournal: new FieldJournalData(raw.fieldJournal).serialize(),
    };
  },
});
```

Puis :

1. importez cette migration dans `SaveMigrator.js` et ajoutez-la **à la fin** de la chaîne ;
2. passez `SaveSchema.VERSION` de 20 à 21 dans **la copie de démonstration** ;
3. synchronisez `GameConfig.VERSION`, `package.json`, les deux versions racine de `package-lock.json` ;
4. mettez à jour le contrat de schéma dans les tests et documentez la nouvelle donnée ;
5. testez l’absence du champ, son contenu valide/invalide, le JSON round-trip et l’absence de mutation
   des autres modèles.

L’exemple ne touche pas aux UID, à la Pension, aux FIFO, aux batailles d’Entraînement ou à l’horloge
de Mine. Une migration ne doit pas remettre ces états à zéro pour faciliter son nouvel ajout.
Le migrateur traite les anciens formats avant les modèles ; ne mettez pas de logique d’import
historique dans un panneau.

### U.3 Ce qu’on sauvegarde et ce qu’on ne sauvegarde pas

| À conserver | À dériver / laisser transitoire |
|---|---|
| ids de sites étudiés | nombre de sites |
| propriété et activation d’un module | DOM du switch |
| mode de pilote choisi | chemin calculé à chaque étape |
| DTO de combat qui doit reprendre exactement | faux adversaire recréé depuis son espèce |
| vraie échéance d’une action persistante | compteur UI recalculé |
| UID d’un Pokémon affecté | copie du Pokémon dans chaque activité |

Un délai de relance en cours est volontairement transitoire et annulé au changement de partie/lieu.
Ce n’est pas la même politique que le délai manuel persistant du sondage de Mine. Ne les généralisez
pas sans décider le comportement attendu.

<a id="v"></a>
## V — Traductions, ressources et style sans collisions

### V.1 Nouvelles clés

Le kit crée un domaine `auroria.js` par langue pour les nouvelles clés libres (`fieldjournal_*`,
`map_region_auroria`, `region_auroria`, etc.) et l’enregistre dans `LocaleCatalog.js` :

```js
import {auroria as fr_auroria} from './fr/auroria.js';
import {auroria as en_auroria} from './en/auroria.js';
// In each corresponding language list:
{source:fr_auroria},
{source:en_auroria},
```

N’ajoutez pas les deux sources à la même langue. Les nouvelles clés (y compris noms/descriptions de
capacités et PNJ) restent dans ce domaine manuel. L’installateur adapte les tests de couverture pour
recenser aussi ce contenu, sans toucher aux ressources de traduction générées de l’original.

Extrait de domaine français :

```js
export const auroria={
  map_region_auroria:'Auroria',
  region_auroria:'Auroria',
  pokemon:{mossling:'Moussin'},
  fieldjournal_title:'Carnet de terrain',
  fieldjournal_survey:'Étudier ce site',
  fieldjournal_summary:'{total} site(s) étudié(s) · {reward} Pokédollars par nouveau site.'
};
```

Le vrai fichier du kit contient aussi tous les états, lieux, objets, quêtes et textes anglais.
La table correspondante en anglais doit avoir les **mêmes clés**, les mêmes ids de PNJ et les mêmes
paramètres `{total}`, `{reward}`. Les noms traduits, eux, peuvent différer.

### V.2 Modifier une clé existante

Le catalogue ne sert pas de cascade d’override : la première valeur garde la clé et les collisions
sont signalées. Pour changer un texte existant, modifiez son domaine d’origine ou concevez un
mécanisme d’override explicite et testé. Ajouter un deuxième `pokemon.pikachu` dans un nouveau
fichier ne remplace pas proprement le premier.

### V.3 Ressources et accessibilité

- Tous les chemins de jeu sont résolus par `AssetPaths`, pas par une concaténation dans un panneau.
- Respectez la casse réelle des fichiers, y compris sur Linux (`Brock.png`, `Rainbow.svg`).
- Gardez les sprites nets et les proportions ; une classe `pixelated` ne remplace pas un fichier absent.
- Fournissez des libellés accessibles pour les boutons à icône et les switches.
- Vérifiez focus clavier, texte long FR/EN et petites largeurs.
- N’imprimez pas d’emoji à la place des glyphes du registre.
- Les tokens CSS maintiennent les thèmes ; pas de CSS injectée dans le code métier.

<a id="w"></a>
## W — Tester le contenu, le gameplay et la migration

### W.1 Validation des dépôts

À la racine de la copie modifiée :

```sh
node --input-type=module -e "import {DataValidator} from './src/data/core/DataValidator.js'; const p=DataValidator.validateAll(); console.log(p); if(p.length)process.exit(1)"
npm test
```

La validation doit renvoyer `[]`. Un dépôt valide ne prouve pas le comportement d’une quête, la
présence de toutes les images ou l’équilibre des combats. Il faut les trois niveaux : données,
commandes réelles, interface navigateur.

### W.2 Exemple de test de migration

Dans un test ayant déjà installé le faux DOM de la suite, adaptez ce modèle :

```js
const raw=save.serialize();
raw.version=20;
delete raw.fieldJournal;
const before=JSON.parse(JSON.stringify(raw));
const migrated=MigrationV20ToV21.migrate(raw);
assert.deepEqual(raw,before);
assert.equal(migrated.version,21);
assert.deepEqual(migrated.fieldJournal,{sites:[]});
assert.deepEqual(migrated.training,raw.training);
assert.deepEqual(migrated.collection,raw.collection);
assert.deepEqual(migrated.hatchery,raw.hatchery);
```

Testez aussi la commande deux fois : le premier appel doit récompenser et écrire une fois, le
second zéro fois. Après chargement d’une autre partie, aucun site, UID ou paiement ne doit être hérité.
Le fichier `verify.mjs` du kit contient ces assertions réellement exécutables.

### W.3 Tests du kit, et ce qu’ils prouvent

Les commandes du chapitre A ont été exécutées sur une copie séparée :

- **12 vérifications ciblées** : références/traductions, porte régionale, vrai voyage, choix unique
  de starter, conversation, trois victoires sauvages réelles et quête, récompense de site unique,
  stock de boutique, vraie arène, vrai rival, vraie ligue, migration/round-trip et changement de partie.
- **575 tests de la suite complète dans cette copie** après adaptation explicite des contrats de
  contenu et de schéma du kit.
- **4 scénarios Chromium de l’exemple** : démarrage/voyage, vraies victoires et étude par clic,
  reconstruction en anglais + navigation mobile, puis rechargement sans double paiement.

L’installateur adapte les nombres de couverture assumés et inclut le domaine manuel dans les tests
de noms/dialogues : une capacité et deux PNJ nouveaux, une offre principale et une secondaire
supplémentaires. Il ne supprime pas la vérification des ids,
des traductions, de l’architecture ou du gel des définitions.

Les faits de Hoenn sont préparés pour le test d’entrée et l’équipe de combat est sur-nivelée.
Ce n’est **pas** une campagne naturelle complète. Les 574 tests de production et les scénarios
Chromium du jeu livré sont un autre ensemble, documenté dans le rapport de phase.

### W.4 Recette navigateur recommandée

1. Utilisez une partie de test et les vraies commandes pour entrer dans la région.
2. Vérifiez carte, rectangles, noms, images et dialogues ; pas de 404/erreur console.
3. Essayez la porte avant le seuil, après le seuil, avant la réclamation puis après.
4. Finissez les combats avec le moteur : pas d’émission synthétique d’un événement « victoire ».
5. Vérifiez le Carnet avant trois victoires, pendant le combat, après l’étude et après reload.
6. Testez un deuxième achat/une deuxième réclamation ; aucun double paiement ou cadeau.
7. Changez de partie puis revenez ; comparez faits, UID et état de combat.
8. Essayez clavier, français, anglais et mobile ; le panneau doit être dans sa navigation mobile.

<a id="x"></a>
## X — Dépanner par symptôme

| Symptôme | À contrôler dans l’ordre |
|---|---|
| La région est absente | `REGIONS.available`, ordre, accès ligue + Pokédex, clés de texte |
| La région est visible mais voyage refusé | point de départ enregistré, prérequis, expédition active |
| Carte vide ou fond absent | nom/casse du PNG, `AssetPaths`, erreurs réseau, dimensions |
| Lieu sans interaction | définition, rectangle, accès central, rencontres/shop/champion connus |
| Route qui s’ouvre trop tôt | `winsToClear`, groupes partagés, autre voisin déjà accessible, porte de quête |
| Porte qui reste fermée | badge régional vs id précis, quête réclamée, objet encore possédé, diagnostic du résolveur |
| La capacité ne s’apprend pas | `learnTypes`, taille/tri du pool, niveau, attaques déjà stockées, voie CT |
| Le talent ne fait rien | kind/condition réellement implémentés, handler enregistré, état du combat |
| Quête non comptée | activation, région courante, type d’événement, groupe de lieu, objectif compteur/état |
| TALK valide avec un autre PNJ | comportement actuel volontaire de TalkObjective ; ajouter une règle stricte si voulue |
| Ligue gagnée sans badge | normal : titre dans `statistics.leaguesWon`, pas dans les badges d’arène |
| Filtre régional revient à « tous » | vocabulaire de `FacilityFilterRules` et traduction `region_auroria` |
| Nouveau panneau absent sur mobile | liste `windows` de la navigation, statut visible du système |
| Faits perdus après reload | constructeur + serialize + deserialize + migration + SaveSchema |
| Récompense dupliquée | fait d’unicité posé avant paiement, commande réévaluée, sauvegarde unique |
| Prix invisible sans argent | montant enfant d’un `.hbtn[disabled]` caché ; déplacer le devis hors de l’action |
| Toute la grille n’est pas égale | `grid-auto-rows: 1fr` sur la grille, stretch + flex sur la carte, pied automatique |

En console de développement, pour **diagnostiquer** le projet servi à sa racine :

```js
const {FeatureAccessSystem}=await import('./src/systems/FeatureAccessSystem.js');
console.log(FeatureAccessSystem.getInstance().getRegionAccessStatus('auroria'));
console.log(FeatureAccessSystem.getInstance().getLocationAccessStatus('auroria_forest'));
```

Les imports relatifs de la console se résolvent depuis l’URL courante ; adaptez le préfixe si vous
servez un sous-dossier. Ces requêtes sont en lecture seule. Pour une recette valide, n’écrivez pas
`unlocked = true` dans un dépôt ou une vue pour masquer une erreur du résolveur.

<a id="y"></a>
## Y — Finir proprement et livrer une modification

1. Relisez les diff : aucune table `raw` retouchée à la main, aucune ressource manquante.
2. Vérifiez les ids, les références, les traductions et le parcours complet de **votre** petite histoire.
3. Testez sauvegarde ancienne, sauvegarde neuve, reload, changement de partie et double action.
4. Vérifiez la syntaxe des nouveaux modules et la suite complète.
5. Mettez à jour les documents de données, limites et version de package ; le numéro de package
   et celui du schéma de sauvegarde sont distincts.
6. Créez une archive **sans** `.git`, `node_modules`, caches, sorties de test brutes ou copie `.arena`.
7. Décompressez cette archive ailleurs, vérifiez ses empreintes et relancez les tests depuis elle.
8. Rapportez exactement ce qui a tourné : un test semé n’est pas une campagne naturelle, Chromium
   n’est pas une certification Firefox/WebKit/Windows, et une capture n’est pas une parité pixel à pixel.

Pour vérifier vos changements sans effacer le travail existant :

```sh
git status --short
git diff --check
npm test
```

Ne corrigez pas un test en supprimant une assertion qui met en évidence un vrai bug. Une quantité
fixe de contenu peut devoir changer après un ajout assumé ; un contrat de paiement unique,
de conservation des UID ou de migration doit, lui, rester vérifié.

<a id="z"></a>
## Z — Checklist finale et lexique

### Checklist de région

- [ ] Un id stable, une déclaration disponible et un ordre de régions intentionnel.
- [ ] Un point d’arrivée valide, une carte et des rectangles bien placés.
- [ ] Un graphe sans lieu orphelin ni passage alternatif involontaire à une porte.
- [ ] Des rencontres valides et les ressources de toutes les espèces/formes.
- [ ] Un choix de partenaire cohérent, sans double don ni starter déjà implicitement acquis.
- [ ] Des espèces réellement rattachées au Pokédex attendu, sans déplacer l’historique.
- [ ] Les filtres de région et leurs deux familles de libellés FR/EN audités.
- [ ] Des capacités/talents dont chaque effet est interprété par le moteur.
- [ ] Des objets aux usages implémentés, des boutiques aux prix positifs.
- [ ] Arènes, rival et ligue avec vrais contextes, vrais adversaires et récompenses uniques.
- [ ] Une histoire ordonnée, des objectifs et des PNJ aux ids identiques dans les langues.
- [ ] Les portes testées avant/après combat, objectif et réclamation.
- [ ] Les titres de ligue interrogés dans les statistiques, pas comme des badges d’arène.
- [ ] Aucun nouveau gameplay stocké seulement dans un panneau ou dans un dépôt statique.
- [ ] Aucun Pokémon dupliqué entre collection, équipe et activité : références UID.
- [ ] Un panneau monté sur bureau **et** accessible dans la navigation mobile.
- [ ] Des widgets stables, pas de HTML injectée, focus/clavier et thèmes conservés.
- [ ] Les nouveaux faits présents dans les trois phases de SaveData et dans une migration pure.
- [ ] Deuxième action, reload et changement de partie sans double récompense.
- [ ] Validation des dépôts, traductions, syntaxe, tests et archive extraite vérifiés.

### Petit lexique

| Terme | Sens dans ce projet |
|---|---|
| Définition / dépôt (`DB`) | données communes, gelées, identifiées par id |
| Modèle de sauvegarde | état d’une partie, sérialisable et migrable |
| `System` | propriétaire des règles et commandes, indépendant du DOM |
| Snapshot | vue de lecture dérivée pour l’UI ; pas une seconde source de vérité |
| Événement typé | classe de `src/core/events`, contrat entre systèmes et vues |
| UID | identité d’un Pokémon possédé, distincte de son espèce |
| Groupe de lieu | regroupement explicite pour statistiques et objectifs |
| Objectif terminé | seuil atteint ; récompense pas forcément réclamée |
| Quête réclamée | progression/récompense validées par `QuestSystem.claim()` |
| Schéma | version du format de sauvegarde, pas version du ZIP |
| Pilotage | actions du moteur vivant ; pas calcul forfaitaire de récompenses hors ligne |

### Fichiers du kit à lire pour refaire l’exercice

- `content.json` : toutes les définitions de la mini-région, sans injection dans la production.
- `fr.json`, `en.json` : les deux ressources complètes et synchronisées.
- `files/src/` : modèle, règles, événement, système, panneau et migration montrés plus haut.
- `files/assets/css/field-journal.css` : style du panneau.
- `auroria.png` : carte schématique de travail.
- `install-example.mjs` : tous les branchements explicites, dans une copie neuve.
- `verify.mjs` : parcours de validation réel, avec les limites de fixture annoncées.
- `browser-smoke.mjs` : contrôle facultatif Playwright de la copie servie (voir le README du kit).

**Méthode à retenir :** commencez par un lieu et une quête, faites tourner leurs tests, puis ajoutez
une porte et un combat. Une fois la petite boucle jouable, étendez le contenu. Ajoutez un nouveau
mécanisme seulement lorsque les règles existantes ne peuvent pas exprimer votre intention ; dans
ce cas, faites évoluer ensemble données, système, UI, migration et tests.

