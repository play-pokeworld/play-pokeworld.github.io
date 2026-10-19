# Guide de contenu — ajouter des Pokémon, objets, quêtes, régions, dresseurs…

Ce guide explique **où** et **comment** ajouter ou modifier du contenu de jeu sans toucher au code.
Tout le contenu est fait de **données** (tables JavaScript) et de **textes** (fichiers de localisation).
Aucune classe, aucun panneau ne doit être modifié pour ajouter une espèce, un objet ou un dresseur.

---

## 1. Principe : tables générées + fichiers de contenu

| Dossier | Rôle | Modifier à la main ? |
|---|---|---|
| `src/data/raw/*-data.js` | Tables **générées** depuis le jeu original par `tools/data/` | **Non** : elles sont réécrites à chaque génération |
| `src/data/content/*-content.js` | Votre contenu **fait main** | **Oui** : jamais touchés par les outils |
| `src/localization/fr/*.js` et `en/*.js` | Tous les textes affichés | **Oui** : les textes existants ne sont jamais écrasés |

Chaque base de données (`SpeciesDB`, `ItemDB`, `TrainerDB`…) lit la table générée **puis** le fichier de
contenu (`withContent`, `src/data/core/ContentTables.js`) :

- un **nouvel id** dans le fichier de contenu **ajoute** une entrée ;
- un **id déjà existant** **remplace entièrement** l'entrée générée : copiez l'entrée complète depuis
  `src/data/raw/…`, collez-la dans le fichier de contenu, puis modifiez-la.

Fichiers de contenu disponibles :

| Fichier | Contenu | Format de référence |
|---|---|---|
| `species-content.js` | Espèces | `raw/species-data.js` (`SPECIES_TABLE`) |
| `forms-content.js` | Formes alternatives | `raw/forms-data.js` (`FORMS_TABLE`) |
| `items-content.js` | Objets, Poké Balls comprises | `raw/items-data.js` (`ITEMS_TABLE`) |
| `moves-content.js` | Capacités | `raw/moves-data.js` (`MOVES_DATA`) |
| `talents-content.js` | Talents | `raw/talents-data.js` (`TALENTS_TABLE`) |
| `quests-content.js` | Quêtes (id = catégorie + id) | `raw/quests-data.js` (`QUESTS_TABLE`) |
| `locations-content.js` | Lieux | `raw/locations-data.js` (`LOCATIONS_TABLE`) |
| `map-layout-content.js` | Rectangles des lieux sur la carte | `raw/map-layout-data.js` |
| `encounters-content.js` | Pokémon sauvages d'un lieu | `raw/encounters-data.js` |
| `shops-content.js` | Boutiques | `raw/shops-data.js` (`SHOPS_TABLE`) |
| `trainers-content.js` | Dresseurs, champions, équipes de revanche | `raw/trainers-data.js` (`TRAINERS_TABLE`) |
| `leagues-content.js` | Ligues | `raw/leagues-data.js` (`LEAGUES_TABLE`) |

### Les ids

- En minuscules, sans espaces : `bulbasaur`, `route_42`, `hyper_potion`.
- **Les Poké Balls n'ont pas de tiret bas** : `greatball`, `luxuryball`.
- L'id sert aussi de **clé de texte** et souvent de **nom de fichier image**.

### Vérifier après chaque ajout

```bash
npm test                      # tous les tests, dont la validation des données et des textes
node --input-type=module -e "import {DataValidator} from './src/data/core/DataValidator.js'; console.log(DataValidator.validateAll())"
```

La validation doit afficher `[]`. Sinon, chaque problème indique la table, l'id et le champ fautif
(ex. espèce inconnue dans une équipe, objet sans prix dans une boutique, lieu sans champion connu…).
Le test « FR and EN define exactly the same keys » échoue si un texte manque dans une des deux langues.

---

## 2. Ajouter un Pokémon

### 2.1 Données — `src/data/content/species-content.js`

```js
export const SPECIES_CONTENT = {
  pikachu_surf: {
    dex: 2001,                       // numéro de Pokédex (unique)
    region: 'kanto',                 // région d'origine
    types: ['electric', 'water'],    // types en minuscules (1 ou 2)
    stats: [60, 55, 45, 70, 60, 95], // PV, Atq, Déf, Atq Spé, Déf Spé, Vit
    catchRate: 45,                   // conservé pour info : la capture ne dépend QUE de la ball
    xpYield: 60,                     // expérience donnée (base)
    talents: ['static', 'swiftswim'],// talents possibles (ids de talents existants)
    hiddenTalent: 'lightningrod',    // talent caché (ou null)
    evolutions: []                   // voir ci-dessous
  }
};
```

Évolutions possibles :

```js
evolutions: [{ to: 'raichu', item: 'thunderstone', minLevel: 1 }]  // par objet
evolutions: [{ to: 'ivysaur', level: 16 }]                         // par niveau
evolutions: [{ to: 'a', level: 20, split: true },                  // évolution « double » :
             { to: 'b', level: 20, split: true }]                  // les deux sont obtenues
```

### 2.2 Image

- `assets/images/pokemon/<id>.png` (ex. `assets/images/pokemon/pikachu_surf.png`) ;
- version chromatique : `assets/images/pokemon/shiny/<id>.png` (facultative ; un shiny sans sprite
  normal est refusé par les tests).

### 2.3 Textes

- Nom : `src/localization/fr/pokemon-names.js` et `en/pokemon-names.js` → `"pikachu_surf": "Pikachu Surfeur"`.
- Lu par le jeu sous la clé `pokemon.<id>`.

### 2.4 Le rendre disponible

- **Sauvage** : ajoutez-le aux rencontres d'un lieu (§ 5.3).
- **Récompense** : `rewards: { pokemon: { species: 'pikachu_surf', level: 5 } }` dans une quête (§ 4).
- **Starter** : `src/data/pokemon/StarterData.js` (`STARTERS_BY_REGION`) + texte `starter_<région>_<id>_desc`.

### 2.5 Forme alternative — `forms-content.js`

```js
castform_snowy: { species: 'castform', form: 'snowy', types: ['ice'], stats: [70, 70, 70, 70, 70, 70],
                  kind: 'alt', shop: 'castform_forms', price: 20000 }
```

Id = `<espèce>_<forme>` ; image `assets/images/pokemon/castform_snowy.png`.

---

## 3. Ajouter un objet

### 3.1 Données — `src/data/content/items-content.js`

```js
export const ITEMS_CONTENT = {
  super_potion_x: {
    kind: 'consumable',     // held | tm | hm | ball | stone | evolution | fossil | key |
                            // consumable | candy | treasure | keystone | memory
    price: 1500,            // prix en boutique (0 = invendable)
    image: 'super_potion_x.png' // fichier dans assets/images/items/ (null = icône générique)
  }
};
```

Champs selon le type :

| Type | Champs en plus | Exemple |
|---|---|---|
| Objet tenu (`held`) | `effect: { kind, type?, percent?, stat?, mult?, weather?, power? }` | `effect: { kind: 'type_boost', type: 'fire', percent: 20 }` |
| CT / CS (`tm` / `hm`) | `move: '<id de capacité>'` | `move: 'flamethrower'` |
| Poké Ball (`ball`) | `ball: { rate, sprite, bonus?, condition?, order? }` | voir § 3.3 |
| Fossile (`fossil`) | `revives: '<espèce>'` | `revives: 'omanyte'` |
| Trésor (`treasure`) | `value` (prix de revente), `diamondValue?` | `value: 5000` |

Le vocabulaire des effets tenus est décrit dans `docs/BATTLE_EFFECTS.md`.
L'onglet du **Sac** est déduit du type (`src/config/BagCategories.js`).

### 3.2 Textes — `src/localization/fr/items.js` et `en/items.js`

```js
"super_potion_x": { "name": "Super Potion X", "desc": "Soigne 120 PV." }
```

### 3.3 Poké Ball

```js
dreamball: { kind: 'ball', price: 3000, ball: { rate: 25, sprite: 'dream-ball', condition: null, order: 30 } }
```

- `rate` = taux de capture en % (**seule** la ball compte, jamais l'espèce) ;
- `sprite` = fichier `assets/images/pokeball/<sprite>.svg` ;
- `condition` = condition de bonus existante (voir `src/data/items/BallConditions.js`) ou `null` ;
- les filtres de Poké Ball (`ball-filter-presets-data.js`) décident quelle ball est lancée.

### 3.4 Le vendre

Ajoutez son id dans la liste `items` d'une boutique (§ 6). Un objet **sans prix** est refusé par la validation.

---

## 4. Ajouter une quête

### 4.1 Données — `src/data/content/quests-content.js`

Une quête est identifiée par **catégorie + id**. Le fichier contient une **liste** :

```js
export const QUESTS_CONTENT = [
  {
    category: 'side',               // main (histoire, dans l'ordre) | side | repeatable
    id: 'pecheur_route12',
    region: 'kanto',
    location: 'route12',            // lieu où la quête est proposée (facultatif)
    objective: { type: 'catch', count: 5, location: 'route12' },
    rewards: { questPoints: 200, items: { superrod: 1 } }
  }
];
```

Types d'objectifs (un fichier par type dans `src/data/quests/objectives/`) :

| `type` | Champs | Progression |
|---|---|---|
| `talk` | — | parler au PNJ du lieu |
| `kill` | `count`, `location?` | victoires sauvages |
| `catch` | `count`, `location?` | captures |
| `boss` | `trainer` | battre ce dresseur (bouton **Défier !** sur la carte de quête) |
| `badge` | `badge` (id du champion ou de la ligue) | obtenir ce badge (bouton **Défier !**) |
| `item` | `item`, `count` | posséder l'objet |
| `mine_dig` / `mine_sell` | `count` | mine |
| `hatch` / `hatchery_level` | `count` | pension |
| `training`, `fossil`, `puzzle`, `base_visit`, `base_establish` | `count` / `puzzle` | modules associés |
| `region_wins` / `dex_region` | `region`, `count` | victoires / Pokédex d'une région |
| `own_species` | `species` | posséder l'espèce |

Récompenses : `questPoints`, `items { id: quantité }`, `pokemon { species, level, shiny? }`.
Options : `requires: { caught: [...], league: 'elite4' }`, `chain: { id, step, steps }` (chaîne
légendaire), `encounter: { location, level }` (le Pokémon récompense se rencontre sur place).

### 4.2 Textes — `src/localization/fr/quests.js` et `en/quests.js`

```js
"side": {
  "pecheur_route12": { "title": "Le pêcheur de la Route 12", "desc": "Capturez 5 Pokémon sur la Route 12." }
}
```

---

## 5. Ajouter un lieu ou une région

### 5.1 Lieu — `locations-content.js`

```js
route_42: {
  region: 'johto',
  kind: 'route',                 // town | route | sea | dungeon
  connections: ['mahogany', 'ecruteak'], // lieux voisins (pensez à ajouter le lien retour)
  badgesRequired: 4,             // badges de la région pour y entrer (et stock de Poké Balls en boutique)
  winsToClear: 10,               // victoires sauvages pour « nettoyer » le lieu
  shop: 'route42_shop',          // facultatif : id de boutique (§ 6)
  champion: 'pryce',             // facultatif : champion d'arène ou id de ligue
  weather: 'rain'                // facultatif : météo des combats
}
```

Texte : `src/localization/fr/locations.js` → `"route_42": "Route 42"` (clé `location.<id>`).

### 5.2 Position sur la carte — `map-layout-content.js`

```js
route_42: { x: 640, y: 300, w: 120, h: 40 }   // pixels sur la carte de 1600 × 960
```

### 5.3 Pokémon sauvages — `encounters-content.js`

```js
route_42: [
  { species: 'mareep', minLevel: 18, maxLevel: 22, rarity: 'common' },
  { species: 'flaaffy', minLevel: 22, maxLevel: 24, rarity: 'rare' }
]
```

Le bouton **Explorer** n'apparaît que si le lieu a des rencontres.

### 5.4 Nouvelle région

1. `src/config/Regions.js` : ajoutez `{ id: 'sinnoh', labelKey: 'map_region_sinnoh', available: true }`.
2. Image de carte : `assets/images/maps/sinnoh.png` (1600 × 960).
3. Textes `map_region_sinnoh` (fr / en, `ui.js`).
4. Lieux, rectangles, rencontres (§ 5.1 à 5.3), avec `region: 'sinnoh'`.
5. Starters éventuels : `STARTERS_BY_REGION.sinnoh` dans `StarterData.js`.
6. Arènes et ligue : § 7 (le compteur de badges et le panneau Badges suivent automatiquement).

---

## 6. Ajouter une boutique — `shops-content.js`

```js
route42_shop: {
  items: ['hyper_potion', 'ct_icebeam'],  // objets vendus, dans l'ordre d'affichage (tous doivent avoir un prix)
  requiresLeague: 'johto_elite4'          // facultatif : boutique fermée tant que la ligue n'est pas gagnée
}
```

- Reliez-la à un lieu avec `shop: 'route42_shop'` (§ 5.1).
- Nom : `src/localization/fr/shops.js` → `"route42_shop": { "name": "Boutique Route 42" }`.
- **Poké Balls ajoutées automatiquement** selon `badgesRequired` du lieu (`src/config/ShopRules.js`) :
  Poké Ball toujours, Super Ball dès 2 badges, Hyper Ball dès 5, Master Ball dès 8 (prix croissant,
  payable en argent, jetons de donjon, points de quête ou diamants). Une Honor Ball est offerte
  toutes les 10 Poké Balls achetées.

---

## 7. Dresseurs, champions d'arène et équipes de revanche

### 7.1 Champion d'arène — `trainers-content.js`

```js
export const TRAINERS_CONTENT = {
  pryce: {
    kind: 'gym',                 // gym | league | rival | team_enemy | quest | boss
    region: 'johto',
    badge: 'glacier',            // id du badge
    badgeImage: 'Glacier',       // fichier assets/images/badges/Glacier.svg
    badgeColor: '#4fc3f7',       // couleur du halo dans le panneau Badges
    badgesRequired: 6,           // badges de la région pour pouvoir le défier
    reward: 4000,                // argent de la PREMIÈRE victoire
    sprite: 'Pryce',             // fichier assets/images/trainers/Pryce.png
    teams: {
      default: [
        { species: 'seel', level: 30, moves: ['aurora_beam', 'headbutt'] },
        { species: 'piloswine', level: 34, moves: ['blizzard', 'earthquake'], talent: 'thickfat',
          item: 'never_melt_ice', ivs: { hp: 6, atk: 6 }, evs: { atk: 18 } }
      ],
      rematch: [
        { species: 'lapras', level: 60, moves: ['ice_beam', 'surf'] },
        { species: 'mamoswine', level: 62, moves: ['ice_fang', 'earthquake'] }
      ]
    }
  }
};
```

Puis placez-le dans un lieu : `champion: 'pryce'` (§ 5.1).

Membre d'équipe : `species`, `level`, et facultativement `moves` (sinon tirées au hasard comme un sauvage),
`talent`, `item` (objet tenu existant), `ivs` (max **6** par stat), `evs` (max 18).

### 7.2 Règles appliquées automatiquement

| Situation | Comportement |
|---|---|
| Moins de `badgesRequired` badges dans la région | tuile « Arène — Pryce (6 badges requis) », non cliquable |
| Première victoire | badge gagné + `reward` en argent + texte `win` |
| Victoires suivantes (revanche) | équipe `teams.rematch` si elle existe, sinon `teams.default` ; **pas d'argent** |
| Équipe selon le starter du joueur (rivaux) | `teams.byStarter: { bulbasaur: [...], charmander: [...] }` |

### 7.3 Ligue — `leagues-content.js`

```js
johto_elite4: {
  region: 'johto', badge: 'johto_champion', badgeImage: 'Champion_Stamp', badgeColor: '#00897b',
  badgesRequired: 8, reward: 14000, sprite: 'Lance2',
  trainers: ['will', 'koga_e4', 'bruno_johto', 'karen', 'lance_johto']   // affrontés à la suite
}
```

Chaque membre est un dresseur `kind: 'league'` de `trainers-content.js` (avec son `rematch` éventuel).
Le lieu de la ligue porte `champion: 'johto_elite4'`.

### 7.4 Dresseur de quête

```js
kanto_rocket_cave: { kind: 'team_enemy', region: 'kanto', badgesRequired: 0, reward: 300, sprite: 'Team Rocket Grunt',
                     teams: { default: [{ species: 'zubat', level: 12 }] } }
```

Puis une quête `objective: { type: 'boss', count: 1, trainer: 'kanto_rocket_cave' }` (§ 4).
Les dresseurs de quête donnent `reward` en **points de quête** à chaque victoire (pas d'expérience).

### 7.5 Textes — `src/localization/fr/trainers.js` et `en/trainers.js`

```js
"pryce": {
  "name": "Frédo",
  "title": "Champion d'Acajou",
  "badge": "Badge Glacier",
  "intro": "Le froid forge le caractère !",
  "win": "Ta flamme a fait fondre ma glace."
}
```

---

## 8. Capacités et talents

- Capacité : `moves-content.js` — `{ type, category: 'physical'|'special'|'status', power, accuracy, priority, rarity, effects?, learnTypes? }` ;
  nom dans `move-names.js` (`move.<id>`), description dans `move-descs.js` (`move_desc.<id>`).
- Talent : `talents-content.js` — `{ rarity: 1|2|3, affinity: ['fire'], effects: [...] }` ; textes dans `talents.js` (`talent.<id>.name / desc`).
- Vocabulaire des effets : `docs/BATTLE_EFFECTS.md`. Le moteur de combat est celui de PokéChill :
  les différences avec les jeux officiels sont voulues.

---

## 9. Régénérer les tables depuis le jeu original

```bash
node tools/data/build-all.mjs ../orig
```

Réécrit `src/data/raw/*` et **ajoute** les textes manquants ; vos fichiers `content/` et vos textes
modifiés sont conservés. Relancez ensuite `npm test`.
