# Refonte Pokémon — phase 1 livrée

## Inclus dans ce build

### Fiches Pokémon

- Nouvelle fiche Pokémon plus lisible et plus proche de l'inspiration Pokéchill.
- Vue équipe, boîte PC et Pokémon adverse harmonisées via un rendu commun.
- Colonne de droite avec onglets :
  - Base Stats ;
  - IV ;
  - EV.
- Les boutons permettent de basculer entre les trois vues sans surcharger l'affichage.
- Attaques connues et apprenables affichées en lignes colorées par type.
- Les blocages en combat restent actifs pour les changements de talents/attaques.

### Dictionnaire

- Ajout d'un raccourci **Dictionnaire**.
- Pages incluses :
  - Objets ;
  - Attaques ;
  - Talents.
- Indicateurs :
  - possession d'objet ;
  - Pokémon connaissant une attaque ;
  - talent débloqué / porté.
- Clic sur une entrée : ouverture d'une fiche détaillée existante ou nouvelle.

### Pokédex enrichi

- Clic sur un Pokémon vu/capturé : fiche enrichie.
- Ajout des descriptions Pokédex issues de PokéAPI, en français et anglais.
- Affichage des sources d'obtention détectées :
  - zones sauvages ;
  - évolutions ;
  - fossiles ;
  - quêtes.
- Affichage des talents et attaques disponibles dans les données actuelles.

### Inventaire

- Les fossiles sont classés comme trésors.
- La Poké Flûte reste classée comme objet spécial.

## Non inclus dans cette phase

La refonte complète des learnsets officiels et des talents officiels/custom n'est pas encore appliquée. Elle doit être faite en phase 2, car elle nécessite une modification large des données de combat et des effets.

## Prochaine phase recommandée

1. Étendre la base `MOVES` avec les attaques nécessaires Kanto/Johto.
2. Régénérer les learnsets officiels par niveau, avec héritage des sous-évolutions.
3. Nettoyer les attaques impossibles actuellement présentes.
4. Refaire les talents par Pokémon avec vrais talents officiels + talents custom cohérents.
5. Préparer les tables CT/CS.
