# Plan de refonte Pokémon — affichage, moves, talents, dictionnaire, Pokédex

## Objectif général

Refondre progressivement tout ce qui touche aux Pokémon sans casser les systèmes déjà stabilisés : combat, sauvegarde, inventaire, pension, cartes, quêtes.

Le chantier est volontairement découpé en lots, car il touche :

- l'UI des fiches Pokémon ;
- les données d'attaques officielles ;
- les talents/abilities ;
- le Pokédex enrichi ;
- un nouveau menu Dictionnaire ;
- la future base CT/CS.

## Lot 1 — Affichage des fiches Pokémon

### But
Créer une fiche plus lisible, inspirée de l'exemple Pokéchill :

- colonne gauche : nom, niveau, sprite, types ;
- colonne droite : stats compactes avec étoiles IV/EV ;
- bloc talent(s) ;
- bloc objet tenu ;
- bloc évolutions ;
- liste claire des attaques connues ;
- liste claire des attaques apprenables.

### Points importants

- Ne pas modifier la logique de blocage en combat.
- Garder les actions existantes : changer talent, apprendre attaque, remplacer attaque, shiny toggle.
- Unifier l'affichage équipe / boîte / Pokémon adverse / Pokédex.
- Harmoniser les tailles de modales avec les autres fenêtres du jeu.

## Lot 2 — Attaques officielles et stratégie

### But
Remplacer les pools actuels par des données plus proches des jeux officiels.

### Données à prévoir

- Level-up moves par Pokémon.
- Héritage des sous-évolutions pour éviter de perdre des attaques en évoluant.
- Nettoyage des attaques actuellement attribuées à des Pokémon qui ne devraient pas les apprendre.
- Ajout des attaques manquantes nécessaires à Kanto/Johto.

### Adaptation au combat actuel
Chaque attaque doit être convertie vers le système du jeu :

- type ;
- puissance ;
- précision ;
- physique/spécial/statut ;
- effet secondaire simple ;
- priorité ;
- drain/recul/charge/recharge ;
- statut ;
- boosts/debuffs si possible.

## Lot 3 — Talents / abilities

### But
Attribuer à chaque Pokémon ses vrais talents officiels quand possible, puis ajouter quelques talents custom cohérents pour enrichir le gameplay.

### Règles

- Les talents ont un niveau de rareté.
- Les talents restent obtenables à la capture.
- Les talents restent obtenables à l'entraînement.
- Les talents doivent avoir des effets réellement utiles dans le combat automatique.
- Les effets doivent rester simples et stables.

## Lot 4 — Préparation CT/CS

### But
Préparer la structure de données pour les CT/CS sans encore forcément créer l'interface finale.

### Prévoir

- Compatibilité Pokémon → CT/CS.
- Type d'objet `tm` / `hm`.
- Apprentissage via inventaire dans un second temps.
- Affichage dans le Dictionnaire.

## Lot 5 — Nouveau menu Dictionnaire

### Entrée
Ajouter un bouton **Dictionnaire** dans les raccourcis.

### Pages

- Objets / Items
- Attaques / Moves
- Talents / Abilities

### Fonctionnalités

- Liste complète.
- Indicateur de possession pour les objets.
- Indicateur si un Pokémon possède/apprend une attaque.
- Indicateur si un talent est connu/débloqué.
- Clic sur une entrée → fiche détaillée :
  - description officielle ou inspirée officielle ;
  - effet gameplay exact ;
  - comment l'obtenir ;
  - Pokémon concernés.

## Lot 6 — Pokédex enrichi

### Clic sur un Pokémon
Afficher :

- sprite normal/shiny si débloqué ;
- types ;
- stats de base ;
- description Pokédex officielle du premier jeu d'apparition ;
- où le trouver :
  - zones sauvages ;
  - boutique / marché ;
  - fossile ;
  - évolution ;
  - quête / légendaire ;
  - starters ;
- évolutions possibles ;
- attaques notables ;
- talents possibles.

## Sources de données recommandées

- PokéAPI pour : moves, abilities, flavor text, learnsets.
- Données internes existantes pour : zones, shops, quêtes, évolution, inventaire.

## Ordre conseillé

1. Fiche Pokémon moderne.
2. Dictionnaire basique branché sur les données existantes.
3. Pokédex enrichi avec zones/évolutions/description.
4. Génération des learnsets officiels.
5. Refonte talents officiels + custom.
6. Préparation CT/CS.
