# Phase 1.14.24 — Auto nommé par lieu et arrière-plan dispersé

**Production : 1.14.24 · schéma de sauvegarde 20, inchangé.**
Deux demandes traitées : distinguer explicitement les contrôles Auto combat/donjon et sortir le
fond animé de ses quatre diagonales de coin à coin. Le runtime du main n’est pas transplanté.

## 1. Deux préférences, deux noms, un seul contexte affiché

Les deux améliorations restent distinctes et conservent leur achat, état activé/désactivé et règles
de relance. Le switch est maintenant nommé **Auto combat** ou **Auto donjon** en français ; en
anglais, **Auto battle** / **Auto dungeon**. Le nom est visible sur le bouton dans les deux états,
pas seulement dans une infobulle. Il n’y a pas de nouvelle carte, paragraphe, prix ou titre dupliqué.

- Lieu exploratoire avec rencontres normales ou itinérantes : seul **Auto combat**.
- Lieu de type donjon : seul **Auto donjon**, même si la définition porte aussi une table sauvage.
- Ville ou lieu sans activité d’exploration : aucun de ces deux contrôles.
- La propriété du module reste exigée ; cette phase ne donne pas une amélioration non achetée.
- Le contrôle reste disponible pendant l’activité correspondante, conformément à 1.14.23.

La sélection d’activité est commune à `LocationActions` et `RelaunchSystem`, via la règle pure
`LocationActivityRules`. La branche donjon est prioritaire et ne peut pas devenir simultanément
une branche exploration. Un donjon sans table sauvage ordinaire reste un contexte donjon ; un
lieu extérieur seulement éligible à une rencontre itinérante reste explorable.

Changer de lieu ne fusionne pas les préférences : un Auto combat activé et un Auto donjon désactivé
restent ainsi. Les montants d’achat, les cinq secondes, les péages de donjon, les fins admissibles
et le pilote Farm/Gardien/Coffres ne sont pas rééquilibrés.

## 2. Fond précédent : quatre axes communs et densité non bornée

Le composant précédent choisissait l’une de quatre diagonales fixes entre les coins. Changer la
classe ne changeait pas le point de départ sur le bord. Avec `5 + floor(captures / 10)`, un Pokédex
complet pouvait créer **43 sprites** ; les phases initiales négatives en plaçaient directement au
milieu du trajet. Des passages différents empruntaient donc les mêmes couloirs et le même centre.

La nouvelle version remplace ces profils par des **trajets individuels** :

1. choix d’un bord de départ parmi les quatre, avec répartition des entrées déjà réservées ;
2. point aléatoire le long de ce bord, avec le **rectangle entier hors écran** et une marge ;
3. bord d’arrivée distinct, opposé ou adjacent, et autre point aléatoire entièrement hors écran ;
4. directions horizontales, verticales ou obliques, non limitées à quatre angles ;
5. vitesse et taille variables, entrées échelonnées et délais initiaux jamais négatifs ;
6. rejet des petits trajets qui rasent seulement un coin sans traverser réellement la vue.

Les vitesses nominales sont tirées entre 30 et 48 px/s, avec une durée bornée entre 14 et 70 secondes.
Les sprites restent droits, orientés horizontalement selon leur déplacement, avec leurs variantes
normales/shiny déjà capturées. Aucun Pokémon inconnu n’est ajouté au fond de la partie.

### Espacement et densité

`PokemonFlightRules` calcule la plus petite distance entre deux déplacements linéaires pendant
leur durée commune. Les nouveaux candidats trop proches d’un trajet déjà réservé sont rejetés.
La marge tient compte de la taille des deux sprites. Il ne s’agit pas de rebonds permanents ou
d’une force physique qui modifierait la direction au milieu du passage.

Le nombre de nœuds est maintenant borné par la surface et la collection : **au plus 12 sur grand
écran**, au plus quatre dans la branche mobile et, par exemple, **trois à 390 × 844**. Tous ne sont
pas simultanément visibles : certains attendent encore leur entrée hors écran. Un candidat qui
n’a pas de passage assez espacé attend un nouvel essai ; il n’est pas forcé au centre pour remplir
le quota. Le nombre d’essais est lui-même borné.

Les tests de la fixture grand écran ont échantillonné les positions CSS à 8, 18, 28 et 38 secondes.
Ils ont vérifié l’accord entre trajectoire et rendu, la diversité des bords/angles, et l’absence de
chevauchement des rectangles visibles à ces instants. La règle analytique est également testée
sur des séries de passages et des croisements contrôlés.

## 3. Rendu, cycle de vie et absence d’effet sur le jeu

La sélection utilise toujours les espèces capturées et le statut shiny du Pokédex actif.

- Un **générateur pseudo-aléatoire cosmétique séparé** ne consomme ni `Random.default` ni le flux
  du combat. Le décor ne crée pas un autre système de progression.
- Aucune écriture de sauvegarde, monnaie, récompense ou simulation hors ligne n’est liée au fond.
- CSS interpole seulement `transform` et `opacity` ; les paramètres numériques passent par les
  variables CSS des widgets, pas des règles CSS injectées dans les panneaux.
- Un contrôle léger et borné renouvelle les trajets terminés ; aucun timer propre à chaque sprite.
- Les mêmes nœuds sont réutilisés. Une capture ordinaire n’interrompt pas tous les autres passages.
- Redimensionnement, changement de sauvegarde, retour de page/onglet et préférence de mouvement
  réduit réinitialisent les trajets hors écran. La préférence réduite masque et arrête le décor.
- La couche reste derrière le contenu, ignorée par les lecteurs d’écran et transparente aux clics.

`PokemonBackgroundRules` porte les réglages, `PokemonFlightRules` reste sans DOM et
`PokemonBackgroundView` possède seulement le rendu/cycle de vie. Il n’y a aucun nouveau champ
sérialisé ni migration de schéma artificielle. Les seize tables générées sont identiques à 1.14.23.

## 4. Contrôles réellement exécutés

| Contrôle final | Résultat |
|---|---:|
| `npm test` | **551 réussites, 0 échec** |
| Nouveaux tests de la phase | **31**, en plus des 520 précédents |
| Chromium installations/parité | **17 / 17** |
| Chromium visuel/interactions | **9 / 9** |
| Chromium retours précédents | **17 / 17** |
| Chromium relances et pilote | **13 / 13** |
| Chromium Marché/Entraînement adaptatif | **21 / 21** |
| Chromium gestes/import/Combat | **18 / 18** |
| Chromium Auto nommé/fond | **14 / 14** |
| **Total du jeu livré** | **109 / 109**, tous les rapports `issues: []` |
| Syntaxe JS/MJS | **724 fichiers, 0 erreur** |
| Analyse CSS de premier niveau | **43 feuilles, 0 erreur** |
| `DataValidator.validateAll()` | `[]` |
| Comparaison des tables générées à 1.14.23 | **16 identiques octet pour octet** |
| `git diff --check` | réussi |
| Kit isolé actualisé | **12 vérifications ciblées + 552 tests + 4 scénarios Chromium** |

Les nouvelles recettes couvrent FR/EN, route/donjon/ville, états distincts, switch nommé dans un
panneau de 210 px, grand Pokédex plafonné, rectangles de départ réellement hors écran, nombreuses
directions, positions CSS synchronisées, scroll indépendant, recyclage des nœuds, redimensionnement
mobile, mouvement réduit et absence d’avancement du RNG/état d’un combat préparé.

Les sept suites de production sont exécutées séquentiellement. Les faits de collection et de
progression sont préparés. Pour mesurer précisément les trajectoires, l’horloge cosmétique et les
animations CSS sont synchronisées par le test ; cela n’est pas une vidéo en temps réel ni une
campagne naturelle. Les commandes de jeu et le moteur restent ceux du projet.

## 5. Guide, preuves et livraison

Le guide A–Z reste exécutable : **26 chapitres**, 1 796 lignes, édition HTML autonome. Le kit crée
une copie **1.14.25-demo / schéma 21**, séparée de la production ; ses placeholders restent déclarés.
La production reste au schéma 20 sans contenu Auroria injecté.

- [`validation/v1.14.24/preuves.html`](validation/v1.14.24/preuves.html) : contrôles nommés et
  échantillons réellement rendus du fond, intégrés sans requête réseau.
- `validation/v1.14.24/` : tous les journaux, JSON et provenance.
- `files.sha256` : manifeste des fichiers livrés, sauf lui-même.
- Le ZIP est contrôlé par CRC/SHA-256 et comparaison source/archive, puis extrait et retesté.

Les vues isolées du fond cachent temporairement le premier plan **dans la recette de test seulement**,
sans changer son agencement, pour rendre la dispersion lisible. Elles ne représentent pas une
suppression des panneaux dans le jeu. Les images fixes illustrent les instants indiqués ; les
journaux/mesures vérifient le déplacement.

Aucun appareil tactile physique, Firefox/WebKit ou Windows natif n’est certifié par cette phase.
Pas de garantie pixel à pixel de tous les états/thèmes, ni de campagne naturelle entière.
Les choix précédents (UID, drag équipe, réservations et reprise exacte, files/filtres, Mine,
prix/helpers, Marché Johto à six offres) restent protégés. Aucun correctif d’anciennes ligues,
commit, push ou déploiement n’a été réintroduit/effectué.
