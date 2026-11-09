# Maquette v5 — corrections PC et cohérence colonnes / compact

Livrables :
`study/gallery/MAQUETTE_MOBILE_v5.pdf` (7 pages) · maquette interactive `study/gallery/mockups/script.html`
(mêmes sélecteurs Appareil / Écran / Thème) · captures `study/gallery/mockups/s3-*.png`.

Rien n'est codé dans le jeu : maquette autonome, jetons réels de `tokens.css` / `themes.css`, assets réels.

## Les quatre corrections demandées

### 1. Starter = panneau bloquant (PC et mobile)

- **Aucune croix de fermeture**, **aucune barre de navigation** en mobile, barre haute inactive (Pokéball et
  réglages grisés, `pointer-events: none`), colonnes du tableau de bord floutées et inactives en PC.
- Une note explicite sous les cartes : « Aucune fermeture possible tant que le Starter n'est pas choisi ».
- La confirmation reste l'étape suivante : « Tu t'appelles Ash et tu as choisi Bulbizarre, c'est bien cela ? ».

### 2 et 3. Combat : la fenêtre du tableau de bord, pas une modale

C'était l'erreur de la v4 : j'avais fait du combat un panneau plein écran. Dans le jeu actuel, le combat
est la fenêtre **« Combat en direct »** de la colonne centrale (mesurée : 616 × 349 px, en-tête + champ de
bataille + bouton d'aide). La v5 reproduit ce cadre :

- **PC** : colonne centrale = carte Kanto au-dessus + fenêtre « Combat en direct » en dessous, avec
  champ de bataille, barres de PV, statuts/buffs, journal et quatre actions compactes.
- **Mobile** : le même contenu dans un panneau plein cadre avec le même intitulé, plus la bande d'équipe
  et les cartes d'action larges.
- Ce qui est ajouté par rapport au jeu actuel : **effets de zone** en haut du terrain (« Soleil · 3 tours »,
  « Herbes hautes »), **statuts et buffs en pastilles** sous les barres de PV (`Para`, `Déf −1`, `Atq +1`,
  `Vit +2`), journal court, actions en grille.

**Ce que je ne prétends pas** : PokéChill n'a jamais pu être observé en combat (tutoriel bloquant). Ce
combat est une composition maison, alignée sur le cadre du jeu actuel. Si tu as une capture ou une
description de leur combat, je m'aligne dessus.

### 4. Sac en PC

- La barre « 12 objets » est maintenant une **carte encadrée à l'intérieur du panneau** : elle ne touche ni
  l'en-tête ni les côtés (12 px de marge intérieure, bordure et coins arrondis).
- Grille **3 colonnes** en largeur PC (2 sur mobile, 1 à 320 px).
- La **fiche objet est visible dans la démo PC** (écran « Sac — fiche ouverte »).

## Le principe retenu pour la version PC (ta conclusion)

> Les colonnes restent la structure ; c'est le **contenu** des fenêtres qui adopte la grammaire compacte.

Concrètement, sur PC :

| Élément | Avant | Maintenant |
|---|---|---|
| Lieu | carte au centre, texte dense | bandeau nom de zone + liste de ce qu'on peut faire, dans la fenêtre |
| Combat | fenêtre + illustration seule au repos | même fenêtre, avec zone, statuts, journal, actions compactes |
| Boîte PC / Sac | tableaux et cases | panneaux plein cadre à l'intérieur du dashboard, pastilles et cartes |
| Starter | fenêtre déplaçable fermable | panneau bloquant sans fermeture |
| Barre d'onglets | en haut, filtrante | supprimée en PC, remplacée par la barre basse en mobile |

Aucune donnée, aucune règle métier, aucun événement nouveau : c'est un travail de présentation, décidé par
la même requête média (`MOBILE_MEDIA_QUERY`).

## Limites

- Toujours aucun appareil physique : tailles simulées, Chromium piloté.
- Le combat n'a pas été observé en fonctionnement réel sur mobile (le jeu n'a pas été modifié) : la maquette
  montre un état figé, pas une animation.
- `script.html` charge les assets par chemin relatif : il fonctionne dans le workspace ; dans un aperçu
  isolé, les images peuvent manquer mais la structure reste lisible.
