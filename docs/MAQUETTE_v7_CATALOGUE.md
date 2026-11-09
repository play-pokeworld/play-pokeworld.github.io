# Maquette v7 — catalogue des affichages

> Livrable : `study/gallery/CATALOGUE_AFFICHAGES.html` (61 écrans, PC / tablette / mobile, 10 thèmes, mode « Tout voir »).
> Recherche amont : `study/pokechill/real/` (captures **réelles** de PokéChill) + `docs/ETUDE_POKECHILL_v1.16.32.md`.
> Toujours **aucun code** dans `pokeworld-rework`.

## 1. Ce qui a changé dans la méthode

Les versions précédentes décrivaient le combat et la fiche Pokémon **d'après le code source** de PokéChill, faute d'avoir pu les voir. Cette fois le jeu a été lancé hors tutoriel (save injectée dans la console, `saved.currentArea` + `initialiseArea()`), donc les deux écrans ont été **observés à l'écran** et mesurés.

| Capture | Contenu |
| --- | --- |
| `study/pokechill/real/chill-real-combat.png` | Combat réel, 1 Pokémon dans l'équipe |
| `study/pokechill/real/chill-real-combat-team.png` | Combat réel, 3 Pokémon (membre actif + inactifs) |
| `study/pokechill/real/chill-real-pkmn-info.png` | Panneau d'information Pokémon réel |

## 2. Combat : ce que PokéChill fait vraiment

Structure réelle (mesures relevées dans `pokechill-ref/styles.css` + captures) :

1. **Une seule colonne**, pas un bandeau pleine largeur. Largeur utile ≈ 645 px sur un écran de 1280.
2. **Carte du sauvage** en haut, `position:sticky; top:0; z-index:20`, `border-radius:.5rem`, `padding:.5rem`, **image de zone en fond** (`background-size:cover`), ombre portée basse.
   - à gauche : le sprite (`.explore-sprite` 10rem × 11rem, sprite à `scale:2`, ombre `pkmn-shadow.png` à 40 %) ;
   - à droite : une **info-bulle claire** (`--light2`, rayon .5rem, padding .3rem) qui contient une **boîte sombre** (`--dark1`, padding .5rem, ombre) avec le nom, le niveau et la **pile de barres de PV** : 3 couches superposées (`height:.5rem`, `transition:.5s`) — vert `rgb(130,211,130)`, bouclier violet `rgb(134,141,238)`, renforcé rose `rgb(221,134,238)` ;
   - sous l'info-bulle : **4 lignes de capacités, même vides**. Chaque ligne : hauteur 2rem, bordure 2 px de la couleur du type, fond `--dark1`, nom à gauche, icône de type 2rem carrée à droite, et une barre de progression de la couleur du type à 50 % d'opacité.
   - les altérations/statuts sont des **badges collés au sprite** (en bas à gauche), pas dans la fiche.
3. **Carte d'équipe** en dessous : `--dark2`, bordure 2 px `--light1`, rayon .5rem.
   - membre **actif** : fond `--light1` clair, halo tournant en fond (18rem, opacité .3), sprite 78 px, puis nom + niveau + PV et **ses 4 capacités** ;
   - membres **inactifs** : fond sombre, sprite à 50 %, **nom + niveau + PV seulement** (pas de capacités).
4. **Butin** : bande d'icônes avec la quantité en pastille, sans fond.
5. **Bouton quitter** : 2,5rem de haut, rouge `rgb(219,91,74)`, contour `rgb(255,146,146)`, texte 1,5rem, largeur 95 %.
6. **Aucun bouton d'action dans le combat** : les attaques partent toutes seules. Rien qui ressemble à un journal de combat.

## 3. Fiche Pokémon : ce que PokéChill fait vraiment

Le panneau observé (éditeur de Pokémon, ouvert depuis l'équipe) :

- bandeau rouge « Save and exit » ;
- **carte de gauche** : nom, niveau, sprite sur un **fond de la couleur du type**, barre de type pleine largeur, bouton « tags », bouton crayon ;
- **deux onglets** : `Base Stats` / `IV's Stats` — l'onglet change la valeur affichée, pas la mise en page ;
- **6 lignes de statistiques** : icône, valeur, **étoiles d'IV** (bleues) puis **pastilles de base** (jaunes) ;
- **lettre de rang** dans une case dédiée (C dans la capture) ;
- **talents** : le talent actif est en surbrillance, le talent caché est grisé avec un cadenas ;
- **capacité signature** + ligne « Unlocks {évolution} at level {n} » ;
- **liste des capacités** avec l'icône de type, puis la liste des capacités apprenables.

Comparaison avec ce que fait notre jeu (`src/panels/PokemonInfoModal.js`) : nous avons déjà les onglets Stats/IV, les talents + talent caché, le rang, les évolutions, les capacités et les capacités apprenables. La v7 reprend donc **nos données**, mais dans la grammaire visuelle ci-dessus.

## 4. Le catalogue d'écrans

`CATALOGUE_AFFICHAGES.html` regroupe **61 affichages** :

| Groupe | Contenu |
| --- | --- |
| Pages | tableau de bord PC, tableau de bord mobile, menu de sauvegardes |
| Fenêtres (13) | Lieu, Carte, Équipe, Combat, Historique & Quêtes, Succès, Poké Balls, Raccourcis, Monnaies, Pension, Mine, Base secrète, Entraînement |
| Plein écran (12) | Sac, Boîte PC, Pokédex, Marché, Boutique, Badges, Dictionnaire, Guide, Atoll, Énigmes, Presets d'équipe, Succès |
| Modales — fiches (4) | Pokémon (×2), objet, Pokédex, dictionnaire |
| Modales — parcours (3) | Starter, starter régional, confirmation du starter |
| Modales — confirmations (4) | Relâcher, relancer, quitter le combat, achat |
| Modales — sélections (6) | Cible d'objet, apprentissage, choix de la ball, filtres de capture, icône de sauvegarde, fossile |
| Modales — gestion (3) | Pension, mine, entraînement |
| Modales — bilans (2) | Bilan de combat, résumé d'absence |
| Modales — monde (6) | PNJ, visite de base, PC de base, quêtes répétables, énigme, légende de carte |
| Modales — système (3) | Réglages, export de sauvegarde, éditeur de preset |
| Documentation | Architecture & anti-duplication (compteurs de réutilisation calculés) |

Commandes du banc : sélecteur de périphérique, 10 thèmes, mode **Écran** / **Tout voir** (mur de vignettes), flèches ← → pour passer d'un écran à l'autre. Sous chaque écran, la ligne « réutilise : … » liste les composants employés.

## 5. Architecture proposée (et vérifiable dans l'écran « Documentation »)

1. **Un composant = un rendu.** `TopBar`, `NavBar`, `Win`, `Fullscreen`, `Sheet`, `Row`, `MonCell`, `ItemCell`, `HpStack`, `MoveRow`, `StatRow`, `Chip`, `Btn`, `Tabs`.
2. **Une seule confirmation** : starter, relâchement, relance, achat, abandon de combat = 1 composant, 5 jeux de textes. Aucune duplication.
3. **Une seule feuille modale** pour les 28 modales : titre + contenu + actions. Le contenu est la seule chose qui varie.
4. **Zéro couleur en dur** : tout passe par les variables de thème → les 10 thèmes se dérivent sans toucher un composant.
5. **Zéro duplication PC / mobile** : le même contenu est rendu dans une fenêtre (PC) ou en plein écran (mobile, avec la barre d'onglets). Les écrans sont des données (`titre`, `contenu`, `composants utilisés`).
6. **Correspondance avec le dépôt** : chaque composant correspond à un widget existant (`UIContainer`, `UIText`, `UIButton`, `UIIcon`, `UIProgressBar`, `UITabBar`, `UIChip`, `UIFullscreenPanel`, `DraggablePanel`, `ConfirmDialog`, `PokemonInfoModal`, `BattleCombatantCard`) — donc rien à inventer pour coder, et les règles de `Rules.md` §5 (aucun HTML brut, aucun CSS en code, aucune chaîne en dur → `t('clé')`) restent applicables.

## 6. Ce qui reste à trancher avant de coder

- **Combat** : PokéChill n'a aucune action manuelle. Nous en avons (Sac, Changer, Quitter). Faut-il garder la rangée d'actions sous la carte d'équipe, ou la déplacer dans une barre fixe en bas ?
- **Combat** : afficher les 4 capacités des **membres inactifs** (comme le sauvage) ou seulement celles du membre actif (comme PokéChill) ?
- **Fiche Pokémon** : garder la lettre de rang (nous l'avons) et les étoiles d'IV (nous avons les IV) — les deux ensemble, comme PokéChill, ou l'un des deux ?
- **Thèmes** : validé pour Sombre / Clair / Sakura / Game Boy ; les 6 autres restent dérivés des mêmes jetons.
