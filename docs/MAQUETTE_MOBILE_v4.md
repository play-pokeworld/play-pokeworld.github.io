# Maquette mobile v4 — banc de validation interactif

Livrables :

- **`study/gallery/mockups/script.html`** — la maquette **interactive** : sélecteurs *Appareil*
  (390×844, 320×640, 768×1024, 1280×800), *Écran* (Lieu, Menu, Boîte PC, Boîte PC fiche ouverte, Sac,
  Sac fiche objet, Combat, Starter, Starter confirmation) et *Thème* (les 10 thèmes réels du jeu).
- **`study/gallery/MAQUETTE_MOBILE_v4.pdf`** — 8 pages : mobile, PC, thèmes, tailles d'écran.
- Captures pleine résolution : `study/gallery/mockups/s3-*.png` (780×1688 en mobile, 2560×1600 en PC).

Toujours **rien dans le jeu** : maquette HTML autonome, jetons de couleur extraits de
`assets/css/core/tokens.css` et `core/themes.css`, assets réels de PokéWorld.

## Ce que cette version corrige (tes retours, un par un)

| Ton retour | Application |
|---|---|
| Lieu : bandeau ok, mais afficher aussi le nom du lieu sur le panneau PC | Le panneau PC s'intitule « Lieu : Route 1 » et le bandeau ne contient que le nom |
| Pas de « zone actuelle… », seulement le nom | Bandeau réduit au nom de la zone, sur mobile et sur PC |
| Lieu = informations du lieu, PNJ, arènes, shop, Pokémon rencontrés, au-dessus du bouton Explorer, plus petit qu'avant | C'est exactement la structure : « Le lieu » → « Sur place » (PNJ, boutique, arène, donjon) → « Pokémon rencontrés ici » → bouton Explorer |
| Catégories Routes / Donjons / Événements / Villes inutiles | Supprimées |
| Boîte PC : appui simple **et** appui long ouvrent la fiche | La fiche s'ouvre des deux façons (écran « fiche ouverte » dans la maquette) |
| Pas de repère d'équipe | Retiré |
| Sac : catégories en onglets | Onglets en haut (Soins / Poké Balls / Combat / Objets tenus) |
| Sac : tap = information, bouton Utiliser dans l'information | Fiche objet avec « Utiliser » |
| Sac : grille selon la taille d'écran, 1 à 2 par ligne | 2 colonnes à 390 px, **1 colonne à 320 px** (voir page 7 du PDF) |
| Starter : pas de stats | Cartes sans statistiques |
| Starter : confirmation nom + Pokémon | « Tu t'appelles Ash et tu as choisi Bulbizarre, c'est bien cela ? » (écran dédié) |
| Pokéball : attirer l'œil comme PokéChill | Pokéball dessinée en clair (rouge/blanc), 38 px, halo doré, dans la barre haute |
| Filtres qui ne ressemblent pas à PokéChill | Carte translucide sombre, titre « Filtres », filet de séparation, **listes natives en pastilles sombres** — la forme exacte relevée dans leur CSS (`#pokedex-filters` + `.pokedex-filters-menu` + `select` en `border-radius:10rem`) |
| DA appliquée partout, PC et mobile | Chaque écran est rendu dans les deux présentations, avec les mêmes composants |
| Combat | Écran proposé : effets de zone, statuts (Para), buffs/débuffs (Atq +1, Déf +1), journal, bande d'équipe, actions |

## Le combat : ce que je peux affirmer et ce que je ne peux pas

Je n'ai **jamais pu observer un combat dans PokéChill** : leur tutoriel verrouille les écrans et le
combat n'a jamais été atteint, même en contournant les gardes (`saved.tutorialStep`). Donc :

- ce que je reprends de mesuré chez eux : la **grammaire** (gros blocs, texte court, informations
  posées sous les sprites, aucune info cachée derrière un survol) ;
- ce qui est **ma** proposition, à valider comme telle : la disposition des buffs/débuffs et des effets
  de zone sous les barres de PV, la bande d'équipe, le journal.

Je ne dirai jamais « c'est comme PokéChill » pour cet écran : je ne l'ai pas vu.

## Écarts encore assumés (à trancher avec toi)

1. **Sac** : PokéChill fait des pilules de 32 px ; je propose 44 px pour le pouce. Sur 320 px de large,
   une seule colonne d'objets est retenue.
2. **Boîte PC** : la pastille affiche numéro + sprite + nom + ★. Le niveau n'apparaît qu'à l'appui —
   c'est ce que tu as demandé, mais on ne peut pas trier « à l'œil » par niveau.
3. **Barre basse** : trois boutons (Lieu, Carte, Équipe) et un quatrième (Combat) qui n'apparaît que
   pendant un combat, en pleine largeur partagée.
4. **Menu Pokéball** : 14 tuiles aujourd'hui. Si tu veux moins de bruit, on peut passer à 9 + une tuile
   « Plus… ».

## Limites, dites franchement

- Aucun appareil physique : Chromium piloté, tailles simulées. Pas de vrai pouce, pas de vrai scroll.
- `script.html` charge les images depuis `pokeworld-rework/assets` par chemin relatif : ouvert depuis le
  workspace ou téléchargé avec le dossier, il fonctionne ; dans un aperçu isolé sans accès aux fichiers,
  les images peuvent ne pas s'afficher (la mise en page reste lisible).
- Un seul jeu de données de démonstration.
