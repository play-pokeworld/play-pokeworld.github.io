# Maquette mobile — direction proposée, à valider avant code

**Statut : rien n'est intégré au jeu.** Ce document accompagne `study/gallery/MAQUETTE_MOBILE_v1.16.33.pdf`
(4 planches de comparaison) et la maquette `study/gallery/mockups/mockup.html`.

Le constat qui déclenche ce document : la livraison 1.16.32 a corrigé le **socle** (cibles tactiles,
navigation basse, barre de filtres) mais **n'a pas changé la grammaire visuelle** — l'accueil mobile de
PokéWorld reste une pile de fenêtres de bureau. Ce n'est pas « inspiré de PokéChill ». Je ne code pas la
suite avant ton accord sur les planches ci-dessous.

## 1. Analyse de PokéChill — ce qui est réellement mesuré

Faits lus dans `play-pokechill.github.io` (dépôt public) et vérifiés sur captures à 390×844 :

| Point | Mesure réelle | Conséquence pour PokéWorld |
|---|---|---|
| Palette | `--dark1:#36342F`, `--dark2:#444138`, `--light1:#94886B`, `--light2:#ECDEB7`, `--accent:#ffe15e` | **Identique aux jetons du thème sombre de PokéWorld**, police identique (Winky Sans). La DA n'est pas ce qui manque : c'est l'**organisation**. |
| Navigation | un écran = un calque plein écran (`position: fixed`), commuté par `z-index` | PokéWorld a déjà des panneaux plein cadre : la brique existe |
| Accueil | grille `flex-wrap`, tuiles **96×96 px** (`6rem`), `gap` 8 px, `padding` 16 px, 3 par ligne à 390 px, libellé dans une plaque de 32 px sous l'icône | remplace la pile de fenêtres et la barre d'onglets |
| Icônes | 64×64 px dans la tuile, `image-rendering: pixelated` | PokéWorld a déjà les sprites et les assets |
| Retour | toujours en haut à gauche, une seule fois par écran | pas de doublon retour en bas |
| Filtres | gros boutons de 48 px de haut, 4 par ligne, libellés en clair | remplace les puces de 30 px |
| Listes | une ligne = un objet, hauteur libre généreuse | remplace les tableaux à 5 colonnes |
| Dialogue | bande de texte persistante en bas (PNG du guide) | PokéWorld a les quêtes : même place, autre contenu |
| Modales | fond flouté (`backdrop-filter`), bouton de fermeture circulaire d'environ 64 px | PokéWorld ferme à 44 px, sans flou |
| Starter | 3 cartes côte à côte (2 + 1), bordure pointillée, sprite + nom + type, **tout visible sans défiler** | l'écran le plus parlant : PokéWorld affiche un texte d'accueil, un champ de pseudo et des cartes à faire défiler |
| Total des requêtes média | **une seule** sur 32 : `@media (max-width:1000px)` | PokéWorld en a 57 : la fusion doit rester centralisée, pas copiée |

Ce que je **n'ai pas pu voir** (et que je ne prétendrai jamais avoir vu) : les écrans Items, Pokédex,
Équipe, Génétique et Combat — le tutoriel les verrouille (« Complete the tutorial first ») et le combat
n'a jamais été observé. L'analyse porte sur : accueil, starter, modale de verrouillage, structure CSS.

## 2. Ce que la maquette propose (les trois écrans des planches)

### Accueil (planche 07)
Grille de tuiles 96 px, 3 colonnes, libellé sous l'icône ; 15 accès directs (Aventure, Équipe, Combat,
Boîte PC, Sac, Pokédex, Succès, Quêtes, Dictionnaire, Guide, Badges, Base, Entraînement, Pension, Mine)
+ une bande « Prochaine étape » au-dessus de la navigation. **Plus aucune fenêtre empilée sur l'accueil.**
La barre du bas ne garde que quatre destinations : Accueil, Carte, Équipe, Réglages.

### Écran dense (planche 08 — Boîte PC)
En-tête de page (retour + titre + compteur), catégories en pastilles de 44 px, grille de trois Pokémon
par ligne avec sprite, nom, niveau et pastille de type. La barre du bas ne contient **que des actions**
(Trier, Filtrer, Relâcher) — la navigation reste dans l'en-tête, une seule fois.

### Liste (planche 09 — Sac)
Une ligne de 64 px par objet : icône 40 px, nom, description courte, quantité en pastille à droite.
Sections par catégorie. Fini le tableau nom / icône / quantité sur une largeur de 390 px.

## 3. Le système de navigation, en une phrase

> Un écran d'accueil qui donne accès à tout d'une tuile, et **un écran par tâche** ensuite, avec un seul
> retour en haut à gauche ; la barre du bas ne fait que ramener à l'accueil ou changer de destination
> majeure, jamais deux fois la même action.

Côté architecture, cela **ne crée pas un second système** : les tuiles ouvrent les widgets qui existent
déjà (`UIFullscreenPanel`, fenêtres du tableau de bord, `UIModal`), et la présentation reste décidée par
`MOBILE_MEDIA_QUERY` / `AppShell.isMobileLayout()`. Aucune donnée, aucune règle métier, aucun événement
nouveau. Les colonnes PC ne bougent pas.

## 4. Ce que je te demande de valider avant d'écrire une ligne

1. **La planche 07** : accueil en grille de tuiles — on part là-dessus ?
2. **La planche 08** : écran dense avec en-tête + pastilles de catégories + grille de 3 — on part là-dessus ?
3. **La planche 10** : le Starter — doit-il passer au format « trois cartes visibles d'un coup, on tape
   la carte » (PokéChill) ou garder le texte d'accueil et le champ de pseudo de PokéWorld ?
4. **Le ton** : PokéChill est très silencieux (peu de texte, gros boutons). PokéWorld explique beaucoup.
   Doit-on **réduire les textes d'aide** sur mobile (les déplacer derrière l'icône « ? » qui existe déjà) ?

## 5. Limites, dites franchement

- Les maquettes sont du **HTML statique dans `study/`**, pas le jeu. Elles montrent une direction, pas un
  résultat cliquable. Les icônes des tuiles sont provisoires (dessinées pour la maquette) ; les
  définitives viendront d'`IconRegistry` et des assets existants.
- Les captures PokéChill sont faites avec le tutoriel actif : plusieurs écrans restent inaccessibles.
- Toujours **aucun appareil physique** : viewports Chromium 390×844 et 1280×800, `hasTouch`.
