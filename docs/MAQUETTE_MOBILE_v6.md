# Maquette mobile / PC — v6

> État : **proposition visuelle**, toujours **aucun code** écrit dans le dépôt `pokeworld-rework`.
> Livrables : `study/gallery/MAQUETTE_MOBILE_v6.pdf` (10 pages) + banc interactif `study/gallery/mockups/script.html`.

## 1. Corrections demandées en v5 → état en v6

| Demande v5 | Traitement v6 |
| --- | --- |
| Supprimer les textes du starter (« choix obligatoire… », « aucune fermeture possible… ») | Supprimés du mobile **et** du PC. Le blocage se lit dans l'interface : barre du haut inerte (opacité réduite, pas de clic), colonnes PC floutées, aucune croix de fermeture. |
| Combat aligné sur l'affichage réel de PokéChill | Bandeau refait d'après leur code public : image de zone sur un bandeau collant, rangée de Poké Balls de l'équipe, sprite sauvage + ombre, info-bulle claire (nom, niveau, pile PV / bouclier, capacités), buffs et statuts en pastilles, effets de zone, cartes d'équipe (PV + pastilles de stats), bouton « Quitter le combat ». |
| PC : les panneaux ne doivent plus sortir de l'écran | Cause identifiée : les media queries réduisaient la hauteur du cadre alors que les panneaux gardaient une hauteur fixe. Correctif = zoom du banc (72 % / 55 %) + `max-height:calc(100% - 80px)` sur les panneaux. Vérifié de 1024×768 à 1600×1100. |
| PC : combat = fenêtre « Combat en direct » des colonnes | Conservé, avec la carte au-dessus. Fenêtre compactée pour que les 4 attaques et « Quitter le combat » soient visibles **sans scroll interne**. |
| Sac PC : barre « nombre d'objets » détachée du header et des côtés | Conservé et revérifié en v6. |
| Fiche ouverte visible en PC | Présente pour la Boîte PC **et** pour le Sac, et désormais aussi pour l'état de confirmation du Starter. |
| Nom de la zone sur le panneau PC | Le titre de fenêtre devient « Route 1 » (plus de préfixe « Lieu : ») ; le nom n'est plus dupliqué dans la bannière. |

## 2. Ce qui a changé dans le banc depuis la v5

- `combatBand()`, `combatTeam()`, `combatLog()`, `combatActions()` : contenu de combat mobile mutualisé, réutilisé tel quel dans la fenêtre PC (aucune duplication PC/mobile).
- Bloc CSS `.cb`, `.teambar`, `.main`, `.wildsprite`, `.infobox`, `.hpbox2`, `.hpstack`, `.moverow`, `.zonechips`, `.teamcards`, `.teammate`, `.leavebtn` (rouge `#DB5B4A`).
- Variantes compactes sous `.win` pour que la fenêtre PC tienne sans scroll.
- `.sheet-scrim` allégé (0,46 sans flou) : la grille derrière la fiche reste lisible, sinon la fiche « flottait dans le noir ».
- `.explorebar` reçoit un dégradé : le bouton « Explorer » reste épinglé en bas sans couper brutalement la liste des Pokémon rencontrés.
- Le harnais (barre de contrôle du banc) est masqué pendant les captures.

## 3. Preuves

Mesures Playwright (`/home/user/.tools/measure-mock.mjs`, captures via `shoot3.mjs`), frame de référence 1280 × 800 :

| Viewport | Zoom du banc | Cadre mesuré | Débordements |
| --- | --- | --- | --- |
| 1600 × 1100 | 100 % | 1280 × 800 | aucun |
| 1440 × 900 | 100 % | 1280 × 800 | aucun |
| 1280 × 800 | 72 % | 922 × 576 | aucun |
| 1024 × 768 | 72 % | 922 × 576 | aucun |

`shoot3.mjs` : 28 captures, « images manquantes : aucune / erreurs JS : aucune ».

## 4. Limites assumées

- Le combat PokéChill n'a **jamais** pu être vu en direct (le tutoriel bloque les écrans Combat / Items / Équipe). La structure reproduite vient de leur `index.html` + `styles.css` publics ; c'est une reconstitution, pas une copie d'écran.
- Les écrans Menu, Pokédex, Succès, Quêtes, Dictionnaire ne sont pas retravaillés dans cette itération.
- Les thèmes sont montrés en extraits (Clair, Game Boy, Sakura, Forêt, Contraste) ; les 10 thèmes existent dans le banc.

## 5. Points à trancher avant de coder

1. Ordre du bandeau de combat : sprite à gauche / info-bulle à droite (comme PokéChill) ou l'inverse ?
2. Combien de cartes d'équipe afficher dans la fenêtre PC (les 6, ou l'actif + un compteur) ?
3. Placement des effets de zone : en haut à droite du bandeau ou juste au-dessus des attaques ?

## 6. Fichiers

- `study/gallery/MAQUETTE_MOBILE_v6.pdf` — 10 pages, thèmes sombre / clair / game boy / sakura / forêt / contraste.
- `study/gallery/mockups/script.html` — banc interactif (PC / tablette / mobile / petit écran, 10 thèmes, 12 écrans).
- `study/gallery/mockups/s3-*.png` — captures haute résolution (deviceScaleFactor 2).
- `.tools/shoot3.mjs`, `.tools/measure-mock.mjs`, `.tools/pdf_v6.py` — capture, mesure, génération du PDF.
