# Bilan de phase — Rework 1.14.17

- **Date :** 22/10/2026
- **Version applicative :** 1.14.17
- **Schéma de sauvegarde :** **16** (migration `MigrationV15ToV16`)
- **Portée :** retour de validation no 5 — Boîte PC indépendante de l'équipe, sprites de la grille de donjon, aide unique de la fenêtre Carte

## 1. Boîte PC : une collection unique de Pokémon

Décisions validées par l'utilisateur le 22/10/2026 : **option B** (collection unique, schéma 16), sélection depuis l'Équipe filtrée par un système dédié et réutilisable, aucun badge d'emplacement sur les tuiles du PC (emplacement affiché uniquement dans la fiche).

- **Modèle :** `save.collection` (`PokemonCollectionData`) possède chaque Pokémon une seule fois. L'équipe (`TeamMembersData`), les places de la pension (`{ kind: 'daycare', pokemonUid, knockouts }`) et les préréglages référencent les Pokémon par uid. Un Pokémon reste donc le même objet dans tous les systèmes ; `save.box` disparaît.
- **Migration v15 → v16 :** l'équipe, la boîte et les Pokémon de la pension (`slot.pokemon` ou ancien `slot.poke`) sont fusionnés dans la collection ; un uid manquant ou déjà pris reçoit un uid déterministe `p_v16_<n>`. Aucun Pokémon perdu ni dupliqué. Au chargement, les références orphelines sont réparées (uid d'équipe inconnu retiré, Pokémon de pension retiré de l'équipe, place de pension vide si le Pokémon n'existe pas).
- **Boîte PC :** `BoxSystem` devient le propriétaire de la collection (`getAll`, `addPokemon`, `updatePokemon`). Le PC affiche **tous** les Pokémon du joueur (équipe, pension, entraînement…), sans doublon ; un Pokémon ne disparaît jamais du PC. Retirer un Pokémon de l'équipe le laisse simplement dans la collection.
- **Utilisations :** nouveau `PokemonUsageSystem` (usages `team` et `daycare` dérivés de la sauvegarde, `training` réservé pendant la séance par `TrainingSystem`). Les futurs modes de jeu réservent/libèrent leurs Pokémon avec `claim()` / `release()` ; les réservations de séance sont effacées à chaque création/chargement de sauvegarde.
- **Verrous d'action :** `config/PokemonUsageRules.js` + `PokemonActionRules` décrivent, par action, les usages qui la verrouillent ou qu'elle exige :

  | Action | Règle |
  |---|---|
  | Apprendre une attaque | verrouillée en pension, en entraînement (et pendant un combat, comme avant) |
  | Changer l'objet tenu | exige l'équipe |
  | Utiliser un objet | verrouillée en pension |
  | Rejoindre l'équipe | verrouillée si déjà dans l'équipe, en pension ou en entraînement |
  | Déposer en pension / entraîner | verrouillées en pension ou en entraînement |
  | Favori / verrouillage | toujours autorisés |

  Les systèmes appliquent ces règles eux-mêmes (`TeamSystem`, `HatcherySystem`, `TrainingSystem`, `MoveLearningSystem` → `POKEMON_IN_USE`, `TeamPresetSystem`), l'interface ne fait que les refléter.
- **Fiche Pokémon :** affiche « Emplacement : Équipe / Pension / Entraînement / Boîte PC » et désactive les boutons verrouillés (objet tenu, apprentissage) avec leur raison localisée. Elle se met à jour sur `PokemonUsageChangedEvent`.
- **Sélection depuis l'Équipe :** la demande de sélection transporte l'action voulue (`selectionAction: joinTeam`) ; le PC n'y propose que les Pokémon autorisés — ni ceux de l'équipe, ni ceux de la pension, de l'entraînement ou d'un autre mode. Message dédié si aucun Pokémon n'est disponible.
- `SpeciesOwnership` lit toute la collection : un Pokémon en pension compte désormais comme possédé. Un nouveau Pokémon dont l'uid généré entre en collision reçoit un nouvel uid.

## 2. Donjons : sprites de la grille de `main`

- Les glyphes génériques (épées, éclair, boîte, trophée, punaise) sont remplacés par les sprites de `main` (`assets/images/dungeon/`, fichiers identiques) : Poké Ball pour le combat, Poké Ball + étoile pour l'élite, coffre, boss, échelle ; sprite dresseur `trainer-54` sur la case du joueur. Les glyphes monochromes sont teintés par la couleur de la case (masque CSS + `currentColor`), comme dans `main`.
- Taille et alignement de `main` : cases fixes de 44 px, glyphes à 74 %, joueur à 82 %, étoile à 36 % en haut à droite, une colonne par colonne de la carte sauvegardée, grille centrée dans un plateau encadré ; double anneau de position. Les petits écrans font défiler le plateau au lieu de le rogner.
- Combat/élite/coffre résolus redeviennent du sol vide ; boss et échelle gardent leur sprite ; le brouillard garde son « ? ».
- Nouveau widget générique `UIMaskIcon` (URL absolue pour la propriété CSS `--pw-mask-icon`), chemins via `AssetPaths.dungeonTile()`, sprites déclarés dans `config/DungeonTileVisuals.js`. **Aucun changement de gameplay** (déplacements, clavier, combats et blocage pendant un combat inchangés).

## 3. Carte : une seule aide

- Le bouton Guide « ? » de la fenêtre Carte est supprimé. La légende prend sa place (premier bouton de l'en-tête) et son sprite (icône `help`, classe `pw-win-help-btn`). C'est désormais le seul accès d'aide de la fenêtre Carte.
- `DraggablePanel` accepte une option `help: { modalId, labelKey }` qui redirige le bouton d'aide unique vers une fenêtre d'aide propre ; libellé resynchronisé au changement de langue.
- La section « Carte » du Guide reste accessible depuis le Guide et depuis la fenêtre Lieu.

## Vérifications

- `npm test` : **338 réussis, 0 échec** (projet et archive extraite, `start.bat` en CRLF).
- Nouveau `tests/PokemonUsage.test.js` : migration v15→v16 sans perte ni doublon, réparation des références, PC complet et sélection filtrée, réservations de séance, verrous pension (objet, attaque), fiche (emplacement, boutons désactivés et raisons), collision d'uid.
- Tests complétés : pension et entraînement (Pokémon toujours au PC, usages, verrous, libération), PC (Pokémon d'équipe visible, aucun badge d'emplacement), sprites de donjon (dresseur, Poké Ball, sol vide, case gagnée), légende de carte (bouton unique, première position, icône, n'ouvre plus le Guide).
- `node --check` sur tous les JS/MJS ; `git diff --check` propre ; métadonnées **1.14.17** synchronisées ; schéma **16**.
- Contrôle navigateur (Chromium headless) : grille de donjon 11 colonnes rendue avec tous les sprites ; en-tête Carte avec la seule aide « ? » ouvrant la légende ; PC affichant équipe + pension + entraînement ; fiche « Emplacement : Pension » avec objet tenu désactivé. Le parcours de jeu manuel reste à faire.

## Livraison

- Archive : `pokeworld-rework-1.14.17.zip` — **2 598 entrées**, environ 14 Mo, `unzip -t` sans erreur; dossier racine `pokeworld-rework-1.14.17/`.
