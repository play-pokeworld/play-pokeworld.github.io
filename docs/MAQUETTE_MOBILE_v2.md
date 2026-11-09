# Maquette mobile v2 — après tes corrections

Compagnon de `study/gallery/MAQUETTE_MOBILE_v2.pdf` (6 pages) et de la maquette
`study/gallery/mockups/mockup2.html`. **Rien n'est intégré au jeu** : ce sont des maquettes rendues en
HTML avec la palette, la police et les assets de PokéWorld, pour valider la direction avant d'écrire du
code.

## Ce que tes retours ont changé

| Ton retour | Correction apportée |
|---|---|
| « Ce que tu appelles accueil de PokéChill, c'est leur système de navigation par la Pokéball » | L'**accueil mobile devient la fenêtre « Lieu »** : bandeau de la zone en cours, catégories, liste des zones à combattre |
| « Je veux la Pokéball en haut à gauche » | Elle est la **première commande de la barre haute** et ouvre le menu (planche 2) |
| « La carte devra être à part sur mobile » | La carte n'est plus dans le flux de l'accueil : elle devient une **destination de la barre basse** |
| « Regarde la Boîte PC de PokéChill, leur disposition est plus adaptée » | Boîte PC en **pastilles rondes de 64 px, 4 par ligne**, numéro au-dessus, détail au tap (planche 3) |
| « Pour notre sac, inspire-toi du sac de PokéChill » | Sac en **pilules** : icône en capsule claire, nom, quantité (planche 4) |
| « Starter : 3 cartes, mais garder texte + pseudo au-dessus » | Fait : texte, champ de pseudo, puis **trois cartes visibles d'un coup** ; on tape la carte, plus de bouton « Choisir » séparé (planche 5) |
| « Plus de titres sur mobile : une page = une action » | Les écrans de la maquette n'ont **ni titre de fenêtre ni entête redondant** : un retour, un compteur, le contenu |

## Mesures qui fondent la maquette (lues dans le CSS de PokéChill, pas devinées)

| Élément | PokéChill | Décision PokéWorld |
|---|---|---|
| Tuile de menu | 96 × 96 px (`6rem`), `gap` 8 px, `padding` 16 px, libellé dans une plaque de 32 px | identique (96 px, grille 3 colonnes) |
| Bandeau d'accueil | `#explore-menu-header` : 8 rem de haut, image de fond, titre en pastille | bandeau de zone de 132 px |
| Catégories | `.explore-menu-selector > div`, gros boutons, 3 par ligne | pastilles de 44 px qui défilent sur une ligne |
| Liste de zones | `#explore-listing` : colonne, `gap` 4,8 px, `width` 95 % | lignes de 58 px minimum, `gap` 6 px |
| Pokémon (Pokédex/Boîte) | `#pokedex-list div` : **64 × 64 px, `border-radius: 100%`**, `gap` 24 px, libellé en onglet au-dessus | pastilles rondes de 64 px, `gap` 14 px, numéro au-dessus |
| Objet du sac | `#item-menu-list div` : **32 px de haut**, `border-radius: 16px`, icône en capsule claire, `:active { scale: .95 }` | pilule de **44 px** (32 px est trop petit pour un pouce), même forme |
| Fermeture de modale | bouton rond d'environ 64 px, fond flouté | 44 px conservé (minimum tactile), flou repris |
| Palette | `--dark1:#36342F --dark2:#444138 --light1:#94886B --light2:#ECDEB7 --accent:#ffe15e` | **identique** : la DA ne change pas, seule l'organisation change |
| Requêtes média | 1 seule sur 32 (`max-width: 1000px`) | 57 aujourd'hui : la fusion reste centralisée (`MOBILE_MEDIA_QUERY`) |

## Ce qui reste à trancher (questions courtes)

1. **Boîte PC** : la pastille ronde ne montre que le sprite et le numéro. Le niveau et le type
   n'apparaissent qu'au tap ? Ou on ajoute une bande de couleur de type sous la pastille ?
2. **Barre basse** : quatre destinations (Lieu, Carte, Équipe, Réglages) — ou trois (Lieu, Carte,
   Équipe) en renvoyant les réglages dans le menu Pokéball, qui les contient déjà ?
3. **Filtres** : PokéChill utilise des `<select>` natifs groupés dans un panneau. PokéWorld a déjà des
   `<select>` stylés : on garde les pastilles de tri de la maquette, ou on bascule sur un panneau de
   `<select>` comme eux ?

## Roadmap (à ne pas oublier, hors visuel)

- **Personnage guide façon PokéChill / PokéClicker** pour le tutoriel : un personnage qui accompagne le
  joueur, avec une bulle de dialogue en bas de l'écran et des étapes. C'est du **gameplay**, pas du
  visuel : noté ici pour la roadmap, pas traité dans cette phase.

## Limites

- Captures PokéChill : le tutoriel verrouille les écrans Items / Pokédex / Équipe. Ce qui est affirmé
  sur ces écrans vient de **leur CSS et de leur HTML**, pas d'une capture — c'est écrit ainsi.
- Toujours **aucun appareil physique** : Chromium piloté, 390 × 844, `hasTouch`.
- Les icônes des tuiles du menu sont provisoires (dessinées pour la maquette).
