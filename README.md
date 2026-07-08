# PokéWorld

Un jeu de collection et d'élevage de Pokémon, mêlant aventure de exploration,
farm infini et progression de ligue. Attrape les 151 espèces, constitue ton
équipe, équipe-la d'objets, fais-la évoluer, et deviens le Maître des régions
de Kanto puis de Johto.

## But du jeu

- **Explorer** la carte région par région (Kanto puis Johto), en débloquant les
  lieux au fil de ta progression (badges, histoire).
- **Combattre** les Pokémon sauvages pour les capturer, gagner de l'expérience et
  faire évoluer ton équipe.
- **Farm** : chaque rencontre rapporte des objets, des tonnes de ressources et des
  Pokémon Shiny à débloquer — le cœur du jeu est de revenir sans cesse sur tes
  meilleures zones pour progresser indéfiniment.
- **Battre les Champions d'Arène**, le Conseil 4 et le Maître, puis traquer les
  Pokémon légendaires et fabuleux cachés dans les zones avancées.
- **Optimiser** ton équipe : talents, objets tenus, pierres d'évolution, EV/IV.

## Lancer le jeu

- **Le plus simple** : ouvre `pokeworld.html` (tout est intégré — CSS, JS et
  sprites inline). Ça marche dans l'aperçu de la plateforme, en double-cliquant,
  ou via un serveur local.
- **Via un serveur local** (optionnel) : depuis ce dossier,
  ```bash
  python3 -m http.server 8000
  ```
  puis ouvre `http://localhost:8000/pokeworld.html`.

Le jeu se sauvegarde automatiquement (localStorage).

## Comment progresser (et où chercher l'info)

Le jeu couvre les 151 premiers Pokémon et suit la géographie classique de Kanto et
Johto. Pour savoir **où aller**, **quel Pokémon capturer**, **comment le faire
évoluer** et **contre quoi il est fort/faible**, reporte-toi aux deux encyclopédies
Pokémon de référence (mises à jour en continu par la communauté) :

- **Bulbapedia** — https://bulbapedia.bulbagarden.net
  Cartes des régions, emplacements exacts des Pokémon, tableaux des types,
  méthodes d'évolution, objets et arènes. Idéal pour planifier un itinéraire.
- **Pokémon Database** — https://pokemondb.net
  Pokédex complet, tables d'efficacité des types (type chart), lieux d'apparition
  et calculateurs. Idéal pour optimiser tes combats et tes captures.

Ces deux sites sont tes meilleurs alliés pour :
- connaître les **zones d'apparition** de chaque espèce (utile pour farm) ;
- vérifier les **correspondances de types** avant un combat d'arène ;
- trouver les **pierres d'évolution** et les conditions d'évolution ;
- suivre l'ordre des **badges et des arènes** pour débloquer la suite de la carte.

## Arborescence du projet

```text
pokeworld.html                     # version AUTONOME (CSS+JS+sprites inline) — à ouvrir pour jouer
src/
  assets/
    css/style.css                  # toutes les feuilles de style
    images/
      pokemon/                     # sprites Pokémon nommés d'après leur nom anglais
        front/      <pokemon>.png  # ex. pikachu.png, mr-mime.png, nidoran-f.png
        back/       <pokemon>.png
        frontShiny/ <pokemon>.png
        backShiny/  <pokemon>.png
      items/        <key>.png      # icônes d'objets (pokeball.png, potion.png, …)
    sounds/                        # (réservé aux SFX)
    fonts/                         # (polices système/emoji utilisées)
  languages/                       # SYSTÈME DE LANGUES (fr + en)
    translations.js                # données : I18N, POKE_NAMES_FR, MOVE_NAMES_EN, LOC_NAMES_FR/EN
    i18n.js                        # helpers : t(), getPokeName(), getMoveName(), setLanguage()
  scripts/
    core/      state.js            # état initial G + sauvegarde
    data/      moves.js            # MOVES, DEX_MAP
               sprites.js          # SPRITE_DATA, ITEM_SPRITE_DATA (→ src/assets/images/*.png)
               game-data.js        # ITEMS, LOCS (Kanto), LOCS_JOHTO, SHOPS, CHAMPIONS, quêtes
    gameplay/  world.js            # régions, rencontres, boutiques, progression, quêtes
               mine.js             # système de mine (ressources)
               battle.js           # combat (startBattle, tour par tour, boss)
               save.js             # sauvegarde / chargement
    display/  sprite-helpers.js    # spriteImg(), itemIcon()
               map.js              # rendu de la carte Kanto/Johto (nœuds, routes, badges)
               bootstrap.js        # init() — démarrage du jeu
```

## Sprites

604 sprites Pokémon (151 × 4 versions : face / dos / face shiny / dos shiny) + 47
objets, séparés par version et nommés d'après le **nom anglais** du Pokémon
(minuscules, normalisé : `♀`→`-f`, `♂`→`-m`). Aucune image n'est chargée depuis
le réseau : tout est présent en local (et inline dans `pokeworld.html`).

## Système de langues

Le jeu supporte le **français** (`fr`, par défaut) et l'**anglais** (`en`). Les
données de traduction sont dans `src/languages/translations.js` ; les helpers
(`t(key)`, `getPokeName(id)`, `getMoveName(id)`, `setLanguage(lang)`) sont dans
`src/languages/i18n.js`.
