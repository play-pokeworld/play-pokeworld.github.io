# Phase v1.15.0 — Refonte du Plafond de Pension Régional, Embuscades de Carte & Combats d'Histoire

## Résumé de la version 1.15.0

Cette version majeure 1.15.0 apporte un équilibrage approfondi de la progression, un nouveau système d'embuscades de carte pour les teams ennemies, et le ciblage des combats de scénario dans l'interface de quêtes :

1. **Plafond Régional de la Pension (Daycare Regional Level Cap)** :
   - **Règle absolue** : Un Pokémon déposé en pension ne peut jamais dépasser le niveau du meilleur Pokémon possédé par le joueur originaire de la même région native (`species.region`).
   - **Exemple de référence validé** : Un joueur possédant un Rattatac Nv 100 (Kanto) et un meilleur Pokémon de Johto Kaiminus Nv 30 ne verra jamais son Hoothoot (Johto) dépasser le niveau 30 à la pension.
   - **Dynamisme de progression** : Dès que le joueur entraîne manuellement son Kaiminus au niveau 35 lors de combats actifs, le plafond de la pension pour les espèces de Johto s'élève automatiquement à 35, permettant à Hoothoot de reprendre sa montée en niveau.
   - **Filtrage des candidats** : `HatcherySystem.getCandidates` exclut automatiquement les Pokémon ayant déjà atteint leur plafond régional (sauf en mode incubation pour les Pokémon Nv 100).
   - **Automatisation protégée** : L'autoremplissage et le retrait automatique respectent le plafond régional au lieu de cibler aveuglément le niveau 100.

2. **Système d'Embuscades des Teams sur la Carte (`TeamAmbushSystem`)** :
   - Détection et affichage d'embuscades sur les nœuds de carte selon l'avancement en badges (`minBadges`) et les victoires enregistrées.
   - **Rendu visuel SVG dédié** (`UIMapView.js`) :
     - Calque dédié `.pw-map-ambush-layer`.
     - Marqueur de sbire `.pw-map-team-ambush` avec anneau rouge pulsé `.pw-map-ambush-ring` et sprite officiel du dresseur (sbire ou administrateur de la Team ennemie).
     - Infobulle descriptive localisée (`team_ambush_tooltip`).
   - **Interception et combat** :
     - Tout déplacement vers un lieu embusqué déclenche instantanément le combat contre le sbire ou le boss de la Team.
     - **En cas de défaite / repli** : Le joueur reste à son emplacement précédent (repli tactique), et l'embuscade demeure active.
     - **En cas de victoire** : L'embuscade est vaincue, le marqueur disparaît de la carte, et le joueur entre dans le lieu cible.

3. **Bouton « Combattre » Ciblé dans les Quêtes (`StoryPanel` / `QuestCard`)** :
   - Le bouton d'action directe « Combattre » est désormais strictement réservé aux **combats d'histoire contre les rivaux et les organisations ennemies** (ex. Team Rocket, Team Aqua, Team Magma).
   - Les champions d'arène (objectifs de badge) ne disposent plus du bouton instantané : le joueur doit se rendre à l'arène en ville pour défier le champion dans les règles.
   - Méthode dédiée `TrainerSystem.isStoryRivalOrTeamOpponent(questKey)` filtrant les types `RIVAL`, `TEAM_ENEMY` et `BOSS` de l'histoire.

4. **Normalisation Terminologique (Objets & Marché Noir)** :
   - **Câble Link** : Remplacement officiel de « Pierre Liaison » / « Link Stone » par « Câble Link » (FR) et « Link Cable » (EN) pour les évolutions d'échange (Kadabra $\to$ Alakazam, Machopeur $\to$ Mackogneur, Gravalanch $\to$ Grolem, Spectrum $\to$ Ectoplasma).
   - **Marché Noir** : Renommage complet de « PokéMarket » / « Marché » en « Marché Noir » / « Black Market » à travers toutes les tables de localisation (interface, onglets, raccourcis, descriptions, Pokédex).

5. **Qualité & Conformité Stricte** :
   - Zéro violation des règles statiques (pas d'HTML injecté, commentaires et code 100 % en anglais, pas d'emojis bruts, une seule classe par fichier).
   - Suite de tests portée à 640 tests unitaires et d'intégration validés sans échec (`npm test`).
   - Version estampillée `1.15.0`.
