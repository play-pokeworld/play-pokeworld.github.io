# PASSATION — PokéWorld Rework, portage du catalogue vers le jeu

Document destiné à la personne ou à l'IA qui reprend le travail.
État au **9 novembre 2026 (6ᵉ passe)** — jeu **1.16.60**, zip livré : **`1.16.60.zip`**
(projet entier, `unzip -t` OK), catalogue **60 écrans**.
Branche de travail : **`Interface-rework`** (= `Rework` + le commit de passation, en avance
sur `Rework`). L'ancienne passation annonçait la branche `Rework` : c'est la seule divergence
de nom, `Interface-rework` est bien la base.

---

## 0. REPRISE DU 2026-11-09 — à lire en premier

### 0.0000b Passe 1.16.60 — les écrans validés passent dans le jeu

**Consigne recue** : « Tu peux coder : Lieu, Boutique/Marché/Atoll-Boutique, sac/boîte PC/Pokédex/
dictionnaire, badges, Atoll au complet, starter régional, menu de navigation », plus trois arbitrages
(largeur PC : mon choix ; starter régional : comme le catalogue en PC et en mobile ; accueil Atoll :
comme le catalogue) et une demande neuve sur le SaveMenu (fond du Pokémon et zones de texte en
semi-transparent blanc/gris).

Ce qui est entré dans le jeu :

1. **Header** — le bloc « Badges : n/total » n'est plus rendu (`HeaderPanel`), les nœuds restent en DOM
   `hidden` pour `#h-badges` / `#h-badges-total` ; `#settings-btn` reprend `margin-left: auto`.
   Le catalogue suit : `TopBar()` ne rend plus `.meta`.
2. **Quantité carrée** — `.pw-shop-qty` à `var(--pw-radius-sm)` (7 px) en Boutique et Marché ; la
   **boutique de l'Atoll gagne enfin sa barre** (Reset / champ / +10 / +100 / Max / total / Acheter),
   `AtollSystem.buyItem(itemKey, save, quantity)`.
3. **Atoll, accueil** — quatre tuiles remplacées par **quatre tickets** (`SheetRow` : icône, nom,
   record, chevron) ; les quatre pages de centre sont inchangées ; le test suit (tickets, pas tuiles).
4. **Starter régional** — le bloc CSS du starter de Kanto (`1.16.34`) vise `:is(#starter-modal,
   #regional-starter-modal)` : cartes sable, sprite en haut, pastille « Choisir », **trois cartes sur
   une ligne en 390** ; bande de titre en classe (`.starter-title-band`), pied centré.
5. **Largeur PC (mon arbitrage)** — `--pw-modal-container-max-width: 1280px` en pointeur fin
   ≥ 1025 px, et `.pw-fullscreen-overlay > .pw-modal-container` la suit : conteneur 960 → **1280**,
   badges 7 → **10 colonnes** ; le plafond interne de 1000 px de `.pw-badges-panel-container` tombe.
6. **SaveMenu** — `.save-slot-icon` et `.save-slot-stats span` passent en `rgba(255,255,255,.12–.14)`
   + filet blanc translucide (`backdrop-filter: blur(2px)`), textes en encre sombre ; le thème noir et
   blanc garde ses alphas. Plus de couleur pleine qui déteint sur l'illustration.

Vérifié : `npm test` **906 / 0** (trois passes), contrastes **147 / 147 AA**, i18n **0 clé manquante**,
`PanelFit` 7 contrôles passés, catalogue 60 cadres sans cadre vide ni erreur, copies autonomes hors
ligne sans image cassée. Captures : `PASSATION/shots/2026-11-09/portage11660/`.

### 0.0000 Passe 1.16.51 — le reste du Lot C et les quatre fenêtres, d'un seul tenant

**Consigne recue** : « Je te laisse faire la totalité de ce qu'il reste dans cette passe, pas de
rendu tant que tout ce qui a été validé n'est pas dans le jeu. » Aucune capture n'a donc été
montrée avant la fin : audit, retouche, `npm test`, écran suivant.

Ce qui est entré dans le jeu :

1. **Badges & Ligues** — une seule tuile pour les deux (surface d'en-tête, filet, barre de nom
   pleine largeur, deux lignes secondaires), grille `minmax(112px)` gap 6, l'en-tête dupliqué du
   panneau remplacé par deux `seclbl` (`pw-section-title is-sm`) qui portent les compteurs.
   Le bloc `.pw-league-card` vivait par erreur dans `achievements.css` : supprimé, la tuile est
   commune.
2. **Succès plein écran** — 82 cartes 445×134 en deux colonnes deviennent **une colonne de lignes** :
   disque famille 34, colonne de texte (titre, description, barre 7 px + compteur, ligne de gain),
   colonne de fin (rang, paliers, état). Section bonus désencadrée, progression 7 px, rang en
   pastille `r999`. Les clés brutes `pc_boxes` / `stuffProd` sont remplacées par **29 libellés
   `ach_bonus_*`** (fr + en).
3. **Dictionnaire** — `.row` : tuile sprite 40, nom, ligne d'état, filet unique ; la bande de type
   de 4 px disparaît (le type vit dans la fiche).
4. **Presets** — une ligne par emplacement, une seule ligne de contenu, pastille `Vide` (phrase
   complète en bulle d'aide), actif à l'accent sans halo.
5. **Réglages** — dix thèmes en tuiles 120×34, libellés de section en petites capitales, cartes son
   sur surface d'en-tête.
6. **Énigmes / Marché / Atoll** — `.servrow` (r8) pour les énigmes, sélection du marché au filet
   intérieur 1 px, titres de catégorie en `seclbl`, cartes d'Atoll r10 sur surface d'en-tête.
7. **Tableau de bord** — Équipe (cellule mixte + filet, capacités sur filet, emplacement vide en
   pointillés, niveau en pastille `--pw-bg-sprite`), Raccourcis (filet unique, couleur sur l'icône),
   Lieu (PNJ en lignes, nom posé sur l'illustration), Carte (zoom en tuiles 30 px).
8. **Pokédex** — la cellule portait encore l'ancien anneau 72 px `r50%` `border: 2px`, c'est-à-dire
   le second cercle que la boîte PC avait déjà perdu : elle reprend la cellule de la boîte
   (colonne sans cadre, numéro en ligne, disque 58) et la grille ne peint plus son fond.

Nouveaux fichiers : `assets/css/panels/team-window.css` (extrait de `team.css`, qui atteignait la
limite de 1700 lignes de `CssStructure.test.js`), `tests/InterfaceGrammar.test.js` (6 cas, enregistré
dans `test_suite.js`), `docs/PHASE_v1.16.51.md`.

`npm test` : **901 / 0** (895 avant ; +4 cas, 2 réécrits — dont « pas de largeur minimale de bureau »
réécrit dans son intention, la grille des succès étant devenue une colonne `minmax(0, 1fr)`).
`tests/browser/MapTravel.mjs` : 4/4, console propre.

**Zip** : `1.16.51.zip` à la racine de l'espace de travail ; projet retiré après vérification.

---

### 0.000 Passe 1.16.50 — la carte repart, Monnaies / Boîte PC / Pokédex au catalogue

**Signale par toi** : « je ne peux plus me déplacer sur la carte » + « les monnaies sans cadre, avec
plus de monnaies par ligne ».

1. **Régression carte, corrigée** (`src/ui/UIMapView.js`). `setPointerCapture` était appelé dès le
   `pointerdown` : un pointeur capturé **retargette le clic sur la vue**, donc `event.target` n'était
   plus un nœud de lieu et le clic ne faisait plus voyager. La capture n'est plus prise qu'au début
   d'un vrai geste (drag au-delà du seuil, ou second doigt) ; le nœud pressé est mémorisé au
   `pointerdown` et sert de repli au clic. Test de non-régression :
   `tests/browser/MapTravel.mjs` (`npm run test:browser:maptravel`), 4/4 — clic réel → voyage,
   drag → caméra seulement.
2. **Monnaies** : plus aucun cadre par devise (ni bordure, ni fond, ni padding) et la grille passe de
   trois colonnes fixes à `repeat(auto-fit, minmax(84px, 1fr))` → **5 devises sur une ligne**
   (125 px chacune dans une fenêtre de 676 px), repli automatique sur mobile.
3. **Boîte PC** : le cadre `--dark2` + padding 14 px autour de la grille est retiré, le niveau n'est
   plus une pastille mais une ligne de texte sous le disque, et la tuile ne peint plus un second
   cercle — elle réutilise la cellule du Pokédex.
4. **Pokédex** : la tuile de 72 px devient la `.cell` du catalogue (numéro en ligne de texte, disque
   de 58 px porté par le sprite, image à 64 %, grille sans fond) → **9 cellules par ligne**.
5. Version **1.16.50**, note `docs/PHASE_v1.16.50.md`, test `StaticRules` réécrit dans son intention
   (il figeait « 72 px circulaire » et « niveau en pastille »).

**Zip** : `1.16.50.zip` à la racine de l'espace de travail. Rappel de la livraison 1.16.48 : ne
jamais écrire le zip dans `dist/` (dossier exclu des sauvegardes) et ne pas garder projet + zip
ensemble (quota de 128 Mo) — le dossier de travail est retiré après vérification du zip.

---

### 0.00 Passe 1.16.49 — début du Lot C : le Sac, et les cadres de barre de filtres

**Consigne reçue** : continuer ce qui reste, et livrer le zip correctement (la livraison 1.16.48
avait échoué : le zip était écrit dans `dist/`, un dossier **exclu des sauvegardes**, et projet +
zip dépassaient le quota de l'espace de travail → 137 fichiers ont été jetés).

**Fait** (`npm test` 895 / 0, détail et tableaux dans `docs/PHASE_v1.16.49.md`) :

1. **Sac** : la ligne d'objet prend la matière du catalogue (`.row`) — fond
   `color-mix(surface 60 %, header)`, filet `--pw-border-color`, r8, padding 9/10, tuile sprite
   `--pw-item-icon-sm`, nom `md`/600, quantité `sm`/800 tabulaire à droite. Liste en deux colonnes
   `minmax(320px)` gap 6. **Le bloc `!important` de 5 règles qui repeignait les lignes a été
   supprimé**, ainsi que deux copies de `.inv-icon` et la classe morte `.inv-grid`.
2. **Les cadres ont disparu** : `.pw-modal-search-bar` (bande sombre + filet 2 px), `.pw-ui-toolbar`,
   `.ui-control-toolbar` (déclaré deux fois, la première en `!important`) et `.box-filter-panel`
   (deux blocs) sont désormais transparents et sans filet. Une seule barre de filtres, sur la
   surface, comme le catalogue.
3. **Une seule famille de pastilles** : onglets du Sac en grille `minmax(84px)` de pastilles
   36/r999 (`36` en desktop, `40` au toucher), puces de filtre et de tri en pastilles 28/r999 sans
   filet ; les **six blocs `!important` de `.usm-sort-btn`** (Boîte PC) ont été supprimés — c'étaient
   des copies de la même puce.
4. **Découplage** : `BagItemRow` ne porte plus les classes `pw-starter-chosen*` de l'assistant de
   départ (les trois blocs correspondants ont quitté `starter.css`). Une ligne de Sac n'est pas un
   choix de starter.
5. **Piège mesuré** : `button { min-height: 44px }` (`core/form-controls.css`) étirait chaque
   pastille à 44 px, ce qui transformait « Tous » en cercle. La règle de puce pose `min-height: 0`.
6. **Version 1.16.49** synchronisée (`package.json`, `package-lock.json`, `GameConfig.js`), note
   `docs/PHASE_v1.16.49.md`, zip `1.16.49.zip`.

**Trois tests réécrits dans leur intention** (jamais contournés) : la bande qui défile devient une
grille de pastilles, le test de grille du Sac ne fige plus `minmax(220px)`, et rien n'a touché
l'échelle typographique.

---

### 0.0 Passe 1.16.48 (2ᵉ partie de la session) — échelle typographique + surcouches retirées

**Consigne reçue** : « il ne doit rester que quelques tailles de texte, changeables à un seul
endroit » ; « refaire proprement les affichages validés du catalogue en **modifiant** et non en
rajoutant » ; puis livrer le projet entier en zip à la version du jeu.

**Fait, et vérifié** (`npm test` 895 / 0, détail complet dans `docs/PHASE_v1.16.48.md`) :

1. **Échelle typographique unique** dans `assets/css/core/tokens.css` (10 pas, 10,5 → 32 px) ;
   **891 déclarations** réécrites en `var(--pw-font-size-*)`. Deux feuilles exclues et
   documentées : `ui-icon.css` (taille de glyphe) et `save-menu.css` (hors refonte).
   Découverte au passage : **8 déclarations utilisaient `--pw-font-size-*` alors que ces jetons
   n'étaient définis nulle part** — elles ne faisaient rien.
2. **Trois blocs de surcharge supprimés** (pas ajoutés) : le bloc `!important` à 5 déclarations
   de `components/ui-panel.css` qui forçait la surface, le filet et le rayon de **tous** les
   `.pw-panel` (cause mécanique du « ça ressemble à l'ancien rendu » des passes précédentes),
   puis les deux boîtes `.inv-toolbar` / `.inv-tabs` (bande de filtres et onglets n'étaient pas
   des panneaux). Le compte de `!important` **baisse**.
3. **Écrans repris** : Quêtes (carte + carte tutorielle + libellés de section), filtres et bande
   de filtres de **toutes** les pleines pages (pastille 28 px rayon 999, sans filet), Poké Balls,
   Monnaies, Succès (fenêtre) — valeurs du catalogue, écrites dans les règles existantes.
4. **Tests adaptés** (et non contournés) : le plancher typographique garde désormais **l'échelle**
   (aucun pas sous 10,5 px + aucune taille en px hors des deux feuilles exclues) ; le test mobile
   vérifie les 16 px des champs **par le jeton**.
5. **Cinq `var(--pw-accent)` corrigés** en `var(--accent)` : ce jeton n'existe pas, donc le filet
   de la carte tutorielle, la barre de progression des succès et une couleur de libellé PNJ ne
   s'appliquaient pas. Un jeton se vérifie, comme les `--pw-font-size-*` (§0.0 point 1).
6. **Version 1.16.48** synchronisée dans `package.json`, `package-lock.json`,
   `src/config/GameConfig.js`, note `docs/PHASE_v1.16.48.md`, zip du projet entier.

**Ce que le zip ne contient pas comme terminé** : les **onze pleines pages** (Sac, Boîte PC,
Pokédex, Marché, Boutique, Dictionnaire, Atoll, Énigmes, Presets, Badges, Réglages) gardent leurs
cellules/lignes/en-têtes à l'ancienne grammaire — leur bande de filtres et leurs contrôles sont
au nouveau vocabulaire, le contenu est le prochain lot. Et les fenêtres Combat / Carte / Lieu /
Équipe restent à densifier (§6.1).

---

### 0.1 Ce que la session a réellement trouvé (vérifié, pas supposé)

| Point annoncé | État réel mesuré |
|---|---|
| « `npm test` : 895 / 0 » | **894 / 1 sur un clone neuf** : `start.bat` est livré en LF, pas en CRLF. Cause : dans `.gitattributes`, la règle attrape-tout `* text=auto eol=lf` était **écrite après** `*.bat text eol=crlf`, et c'est la dernière ligne qui gagne. Corrigé (§0.3). Sur un poste où `core.autocrlf=true` le test passait : l'échec était invisible. |
| Poké Balls « lignes à ~46 px » | Faux : les lignes mesuraient **38 px** (`min-height: 38px !important` du bloc de surcharge en fin de `pokeball-filters.css`). Porté à **34 px**, valeur du catalogue. |
| Monnaies « une seule cellule pleine largeur » | Faux aussi : au départ d'une partie, **une seule colonne de 56 px** est visible (les monnaies se découvrent progressivement), sans cellule, sans bord, sans fond. C'est la **grammaire** qui manquait, pas la largeur. |
| Succès « carte tutorielle trop haute » | Aucune carte tutorielle dans Succès (c'est Quêtes). La carte de suivi mesurait **101 px** parce que la pastille de rang « Non débloqué » passait sur **deux lignes**. Portée à **84 px**. |
| Raccourcis, Quêtes, Cartes, Équipe | Raccourcis est déjà conforme (§5.4). Quêtes, Carte, Lieu, Équipe restent **non portés** : voir §6.1, chiffres mesurés inclus. |
| `docs/PHASE_v1.16.38…47.md` | **Absents** : dix versions livrées sans note de phase alors que `Rules.md` §9 l'exige. À traiter lors de la prochaine livraison (non fait ici, hors périmètre visuel). |
| `study/tools`, `study/gallery` (§4, §5.5) | Chemins morts. Les outils sont dans `tools/`, le catalogue dans `catalogue/`. |
| `tests/browser/PanelFit.mjs` | **Échoue avant toute modification** : `win-team` → `.move-type.type-electric` dépasse de 2 px à 900 px de large. Défaut antérieur, dans l'écran Équipe (réputé validé), non touché ici. |

### 0.2 Écrans portés cette session (à valider visuellement)

Mesures faites avec `tools/measure/measure-dashboard.mjs`, captures avant/après dans
`PASSATION/shots/2026-11-09/`.

| Écran | Fichier | Avant | Après (= catalogue) |
|---|---|---|---|
| **Poké Balls** | `components/pokeball-filters.css` | lignes 38 px, en-têtes 11/400, nom 13 px, ballon 22 px, colonnes `1fr 44 44`, filet `--dark3`, padding `0 12px` | lignes **34 px**, en-têtes **11/800** capitales `--pw-text-secondary`, nom **11 px**, qté **11/700**, ballon **16 px**, colonnes `1fr 34 42`, filet `--pw-border-color`, padding `0 4px` |
| **Monnaies** | `layout/header-bar.css` | colonnes nues, fond transparent, valeur 12/700, libellé 11 px `--light3` | **grille de 3 cellules** `repeat(3, minmax(0,1fr))` gap 6, cellule `--pw-bg-header` + filet + rayon 10 + `9px 4px`, valeur **14/800**, libellé `--pw-text-secondary`, pastille à `--pw-cur-amount-top: 37px` |
| **Succès (fenêtre)** | `panels/achievements.css`, `components/badges.css` | carte 101 px, fond `rgba(255,255,255,.03)`, filet blanc 8 %, rayon 6, titre 12/700, desc 11 px, barre 6 px sous les compteurs, pastille sur 2 lignes | carte **84 px**, `--pw-bg-header` + `--pw-border-color`, rayon **10**, titre **11,5/700**, desc **10,5** `--pw-text-secondary`, barre **7 px** arrondie **sur la même ligne** que les compteurs, pastille de rang sur **une ligne** |

`npm test` : **895 / 0** après chacune des trois passes.

### 0.3 Décisions prises (et pourquoi)

1. **Plancher typographique du projet > valeurs du catalogue.** Le catalogue écrit 9,5 px pour
   les en-têtes de Poké Balls et le libellé de monnaie ; `tests/StyleVocabulary.test.js` interdit
   tout `< 10px` et réserve 10 px aux badges. Les deux règles sont inconciliables : c'est le
   **test du projet** qui gagne (règle opposable), et le texte reste à **11 px** en gardant le
   poids 800, les capitales et la couleur secondaire — un commentaire dans chaque feuille dit
   pourquoi. Idem pour la description de succès : catalogue 10 px → **10,5 px** (plancher réel).
   **À toi de trancher si tu préfères l'inverse.**
2. **Aucune surcharge ajoutée en fin de feuille.** Les valeurs ont été réécrites **dans** les
   règles existantes, y compris dans le bloc dupliqué de `pokeball-filters.css`, qui dit
   maintenant exactement la même chose que le premier (il reste un doublon à supprimer un jour :
   c'est de la dette, pas un choix).
3. **Une seule règle nouvelle**, `.pw-ball-row .pw-ball-icon` (16 px) : le ballon du tableau de
   bord et celui de l'éditeur de filtres partagent `BallSlotIcon` ; l'éditeur garde ses 22 px.
4. **Monnaies : trois colonnes, littéralement.** Avec une seule monnaie découverte, la cellule
   occupe donc **un tiers** de la fenêtre (voir `apres-monnaies.png`). C'est la cible du
   catalogue appliquée telle quelle. Si tu préfères que la cellule unique prenne toute la
   largeur, c'est une ligne à changer — dis-le.
5. **`.gitattributes` corrigé** (l'ordre des règles, pas leur contenu) : sans ça le « 895 / 0 »
   du `Rules.md` est impossible sur un clone Linux/macOS. Aucun fichier livré n'est modifié :
   `start.bat` est identique dans git, il est juste extrait avec ses CRLF.
6. **Pas de bump de version, pas de zip.** La séquence de la §4 place la capture de contrôle et
   la validation **avant** la construction du zip. Les trois écrans attendent ton œil.

### 0.4 Outils ajoutés (ils resservent à chaque écran)

- `tools/measure/measure-dashboard.mjs` — atteint le tableau de bord, relit les styles calculés
  des fenêtres visées, écrit les captures. `--shot <dir>`.
- `tools/measure/measure-catalogue.mjs <écran>` — mêmes mesures dans le catalogue + capture du
  cadre du jeu (pas du bandeau de l'outil : le piège de la §7).
- `tools/measure/audit-windows.mjs` — dump typo/boîte de toutes les fenêtres du tableau de bord.
- `tools/measure/check-achievements-fullscreen.mjs` — vérifie que la fenêtre Succès et le plein
  écran Succès (qui partagent trois règles) ne se cassent pas l'un l'autre.

### 0.5 Prochaine étape précise

Les dix pleines pages du Lot C et les quatre fenêtres du tableau de bord sont **portées**
(1.16.49 → 1.16.51) : Sac, Boîte PC, Pokédex, Badges/Ligues, Marché, Boutique, Dictionnaire,
Atoll, Succès plein écran, Énigmes, Presets, Réglages, puis Équipe / Raccourcis / Lieu / Carte /
Combat. Reste à **valider en jeu**, écran par écran, et à traiter les deux décisions ouvertes :
le plancher typographique de 10,5 px, et `panels/save-menu.css` (seule feuille encore en pixels
littéraux).

Méthode qui a fonctionné : `tools/measure/audit-windows.mjs` et
`tools/measure/shot-fullscreen.mjs <MODAL_ID>` pour mesurer, édition **dans la règle existante**,
`npm test` 895/0, capture de contrôle. Ne jamais réintroduire de bloc en fin de feuille.

---

## 1. La consigne maîtresse

> **Tout ce qui est validé dans le catalogue doit avoir exactement le même rendu dans le jeu.**
> Le catalogue est le nouveau rendu. Le jeu doit prendre ce rendu. Sans exception.

Les anciennes validations du jeu s'effacent devant le catalogue. Si un écran du jeu et sa
version catalogue diffèrent, **c'est le jeu qui doit changer**.

Le catalogue est fourni dans ce zip : `catalogue/CATALOGUE_AFFICHAGES.html`.
Il s'ouvre par double-clic ; il lit ses sprites dans `../assets/images/` du jeu, donc il doit
rester dans le dossier `POKEWORLD_REWORK_v1.16.47/`.

---

## 2. Le dépôt

- Dépôt : `play-pokeworld/play-pokeworld.github.io`, branche **`Rework`**.
- Version courante : **1.16.47**.
- Lancement : `node server.js` → `http://localhost:3000`.
- Tests : `npm test` → attendu **895 passed, 0 failed** avant toute livraison.

### Synchronisation obligatoire de la version (3 fichiers)
`package.json`, `package-lock.json`, `src/config/GameConfig.js`.

---

## 3. Les règles CSS — à respecter absolument

Elles sont dans `Rules.md` à la racine du dépôt. **Lire `Rules.md` en entier avant de toucher
quoi que ce soit.** Les points qui ont fait échouer les passes précédentes :

1. **Ne jamais ajouter de bloc de surcharge en fin de feuille.** Chaque valeur se modifie **dans
   la règle existante**. Un CSS n'a pas le droit d'écraser une valeur écrite plus haut.
2. **Le nombre de `!important` ne doit jamais augmenter** (test dédié).
3. **`team.css` est plafonné à 1700 lignes** — il en fait 1693. Ajouter 7 lignes le fait échouer.
4. **Pas de sélecteur attrape-tout** du genre `[class*="location"]` (test « no sheet becomes a new
   catch-all »).
5. **Aucun texte sous 11 px** hors badge (`StyleVocabulary.test.js`).
6. **Commentaires en anglais uniquement** dans les CSS et les JS.
7. Une feuille = un objet ; un widget = une feuille dans `components/`, un panneau = une feuille
   dans `panels/`.
8. Pas de second système de fenêtres / responsive / interactions. Pas de logique métier dans l'UI.
9. Pas de copie directe de code, composants ou assets PokéChill : seule la **grammaire d'affichage**
   s'emprunte.

Si un test encode l'ancienne référence visuelle (ex. hauteur de header 65 px), il faut le
**mettre à jour en le commentant** — c'est ce qui a été fait pour `tests/StaticRules.test.js`
(65 px → 56 px), parce que la cible a changé.

---

## 4. Méthode de travail, fenêtre par fenêtre

1. Ouvrir le catalogue sur l'écran visé, faire une capture **du cadre du jeu** (attention : la page
   catalogue a son propre bandeau d'outil en haut, ne pas le confondre avec l'en-tête simulé).
2. Dans le jeu, atteindre le même écran et relever les **styles calculés** des éléments clés
   (hauteur, `font-size`, `font-weight`, couleurs, `border-radius`, `padding`, `gap`).
3. Modifier les **règles existantes** de la feuille du panneau pour atteindre ces valeurs.
4. `npm test` → 895 / 0.
5. Capture de contrôle, comparaison visuelle avec le catalogue.
6. Seulement là, construire le zip.

### Ritual pour atteindre le tableau de bord du jeu en automatisation
```js
await page.goto('http://127.0.0.1:3000/');
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => { const i=document.getElementById('starter-name-input');
  if (i) { i.value='Ash'; i.dispatchEvent(new Event('input',{bubbles:true})); } });
await page.evaluate(() => document.querySelector('.starter-card')?.click());
await page.waitForTimeout(1800);
await page.evaluate(() => document.querySelectorAll('.pw-modal-backdrop,.pw-modal').forEach(e=>e.remove()));
```
Les toasts de notification doivent être retirés avant une capture.

### Environnement (éphémère !)
```bash
cd study/tools && npm i playwright@1.49.1 && npx playwright install chromium
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
  libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2
node server.js          # terminal 1, dans le dépôt
python3 -m http.server 8080 --directory <racine>   # terminal 2, pour le catalogue
```

---

## 5. CE QUI EST FAIT

### 5.1 Header du jeu — **validé en jeu**
Valeurs écrites **en place** (pas en surcharge) :

| fichier | règle | avant | après |
|---|---|---|---|
| `assets/css/layout/header-bar.css` | `#header` | `min-height:65px` | **56 px**, fond `--pw-bg-header`, filet bas `--pw-border-color` |
| idem | `.pw-header-brand` | 20 px, letter-spacing 2 | **15 px / 800 / couleur accent / spacing 0** |
| idem | `.pw-header-brand-mark` | 28 px, rayon 10 | **36 px, rayon 50 %, fond accent, padding 5** |
| idem | `.pw-header-brand-mark img` | 18 px | **26 px, rayon 50 %, anneau `0 0 0 2px rgba(28,26,23,.22)`** |
| `assets/css/panels/settings.css` | `#settings-btn` | 44 px, rayon 10 | **36 px, rayon 50 %, fond transparent, filet** |
| `tests/StaticRules.test.js` | référence | 65 px | **56 px** (commenté) |

### 5.2 Menu de navigation — **validé en jeu**
- `src/ui/NavMenu.js` + `assets/css/components/nav-menu.css` (nouveaux fichiers).
- La **Poké Ball du header est le bouton** (`#nav-menu-btn`, posé dans `HeaderPanel.js`).
- Le panneau démarre **juste sous la Poké Ball** (`left:10px; top:56px`), coins du haut **non
  arrondis** (`border-radius:0 0 10px 10px`) pour se coller au header, cœur crème `--light2`.
- Tuiles **86 × 86** : icône au-dessus, **barre de libellé `--dark2` de 22 px collée en bas**.
  6 par ligne sur PC, 4 sur mobile. Pas de bouton de fermeture : on referme par la Poké Ball,
  le voile ou Échap.
- Entrées lues dans `config/Shortcuts.js` (9 tuiles réelles) + Équipe et Réglages.
  `nav_menu_title` ajouté en FR et EN.
- La **barre de navigation mobile du bas est conservée** (décision utilisateur).

### 5.2 bis Fenêtres du tableau de bord — passe du **2026-11-09**, en attente de validation
Trois fenêtres portées d'après les valeurs **mesurées** du catalogue (détail et captures en §0.2) :

| fenêtre | feuille | valeurs écrites en place |
|---|---|---|
| **Poké Balls** | `components/pokeball-filters.css` | lignes **34 px**, colonnes `1fr 34 42`, en-têtes **11/800** capitales secondaires, nom **11 px**, qté **11/700**, ballon **16 px**, filet `--pw-border-color`, padding `0 4px` |
| **Monnaies** | `layout/header-bar.css` | grille **3 cellules** `repeat(3, minmax(0,1fr))` gap 6, cellule `--pw-bg-header` / filet / rayon 10 / `9px 4px`, valeur **14/800**, libellé secondaire 11 px |
| **Succès (fenêtre)** | `panels/achievements.css` + `components/badges.css` | carte **84 px**, `--pw-bg-header` / `--pw-border-color` / rayon 10, titre **11,5/700**, desc **10,5** secondaire, barre **7 px** alignée avec les compteurs, pastille de rang sur une ligne |

### 5.3 Fenêtre générique du tableau de bord
Fond, filet, rayon 10, en-tête 42 px, titre à gauche : conforme au catalogue.

### 5.4 Raccourcis
`assets/css/panels/shortcuts.css`, en place : rayon 12 → **8**, `padding:10px 12px` → **`0 9px`**,
`min-height:32px` ajouté à la règle existante.

### 5.5 Catalogue
`catalogue/CATALOGUE_AFFICHAGES.html` — **56 écrans**, `checkall` à 0 erreur.
*(La version précédente de cette ligne indiquait `study/gallery/…`, chemin qui n'existe plus.)*
Corrections récentes : croix à droite à la place de la flèche retour dans tous les panneaux,
Boutique de l'Atoll alignée sur la cellule Boutique, Sac en rangées façon Dictionnaire,
Boîte PC avec le niveau au-dessus du cercle, Pokédex **sans** niveau, Marché avec sprites 72 px
et possédé/non possédé en vert/rouge, Boutique/Marché en cellule `.pw-shop-item`, menu de navigation.

---

## 6. CE QUI RESTE À FAIRE

### 6.1 Fenêtres du tableau de bord (à porter)
Poké Balls · Monnaies · Succès (fenêtre) : **portés le 2026-11-09**, en attente de validation
visuelle (§5.2 bis). Restent, avec les écarts **mesurés** le 2026-11-09
(`tools/measure/audit-windows.mjs`) :

| fenêtre | écart mesuré | cible catalogue |
|---|---|---|
| **Quêtes** | carte tutorielle **329 px** (elle écrase la colonne) ; carte de quête **190 px**, rayon **8**, fond `--pw-bg-surface`, titre **13/900** | carte = `--pw-bg-header` + filet `--pw-border-color` + rayon 10 + padding 9 px, titre **12/800**, texte **10,5** secondaire (règle de la §18, jamais appliquée dans le code) ; carte tutorielle à ramener à cette grammaire |
| **Combat** | le corps affiche un texte d'attente, pas le visuel de combat | visuel du jeu réel (butin sur sa ligne, Résumé + Quitter dessous) |
| **Carte** | fenêtre 676 × 448, légende présente ; zoom à contrôler | zoom + légende en haut |
| **Lieu** | fenêtre 338 × 604 | densité du panneau |
| **Équipe** | `.poke-card` 262 px (sprite 132, `.poke-info` 91) ; le type `.move-type` **dépasse de 2 px** à 900 px (PanelFit) | densité ; le débordement est un défaut à corriger dans la carte validée |

### 6.2 Panneaux plein écran (à porter)
Sac · Boîte PC · Pokédex · Marché noir · Boutique · Dictionnaire · Atoll · Énigmes ·
Presets · Badges · Réglages.

### 6.3 Écrans du catalogue encore **non validés** (ne pas les considérer comme cibles)
Tableau de bord PC (composition des colonnes), En-tête (mesures), fiches Pokémon / objet /
dictionnaire, Pension, Mine, Entraînement, Base secrète, Badges, Réglages, Carte (hors légende),
Bilan de combat + AFK, Visite / PC de base secrète, Atoll (validé **temporairement**, une page),
Énigmes (à reconfirmer).

### 6.4 Validés au catalogue, donc à porter tel quel
Sac · Boîte PC · Pokédex · Marché noir · Boutique · Dictionnaire · Succès (fenêtre + plein écran) ·
Équipe · Combat · Raccourcis · Monnaies · Poké Balls · Lieu · Starter (3 écrans) · Presets ·
Badges · Dialogue PNJ · Quête répétable · Énigme · Légende · Quitter/Relancer le combat ·
Sauvegardes · scrollbars · menu de navigation.

---

## 7. Pièges déjà rencontrés — ne pas les retenter

- Empiler des surcharges en fin de `base.css` : **a fait échouer 4 tests** et a dû être annulé.
- Comparer une capture du **bandeau de l'outil catalogue** avec le header du jeu : comparaison
  invalide. Recadrer sur le cadre du jeu.
- `team.css` : 1700 lignes maximum, déjà à 1693.
- Les mobiles : `body.mobile-mode` a ses propres règles ; ne pas casser la barre du bas (56 px)
  ni la hauteur de header mobile (52 px).
- Les collisions de classes globales sont fréquentes (`.card`, `.sel`) : préfixer.
- Ne pas toucher : `team.css` au-delà de ses limites, `TeamMemberCard`, `PokemonCardView`, la carte
  centrée du SaveMenu, l'Atoll du catalogue (validé temporairement), le Sac / Boîte PC / Pokédex /
  Marché / Boutique / Dictionnaire du catalogue (validés).
- Les serveurs et dépendances ne survivent pas d'un message à l'autre : réinstaller avant de mesurer.
- `new Function(...)` ne valide que la syntaxe : une capture sans erreur JS n'est pas une preuve de
  rendu correct.
- Ne pas conclure « c'est fait » sans avoir **regardé la capture**.
- **Plancher typographique** : `tests/StyleVocabulary.test.js` refuse tout `font-size` `< 10px` et
  réserve `10px` aux badges (`badge|pill|chip|count|rank|tracker|…`). Or le catalogue écrit
  9,5 px (en-têtes Poké Balls, libellé des monnaies) et 10 px (description de succès) : le
  plancher réel du jeu est donc **10,5 px**. Toujours baisser au plancher, jamais en dessous.
- **`.gitattributes` : la dernière ligne qui matche gagne.** Un `* text=auto eol=lf` placé après
  `*.bat text eol=crlf` annule la règle CRLF (c'est ce qui faisait échouer le test du launcher
  sur un clone neuf). L'attrape-tout doit donc rester **au début** du fichier, les règles
  spécifiques à la fin.
- Un commentaire CSS contenant du **français** (même entre guillemets, même un libellé du jeu)
  fait échouer « every comment is written in English ».
- Le test navigateur `PanelFit` **échoue déjà** sur l'Équipe (`.move-type` +2 px à 900 px) avant
  toute modification : ne pas le prendre pour une régression de la passe en cours.
- Les captures de contrôle ne doivent pas contenir les **toasts** : les retirer avant la prise
  (`.pw-toast-card`), sinon la fenêtre Succès est masquée par « Nouvelle partie créée ».

---

## 8. Definition of done

Un écran est terminé quand :
1. ses valeurs sont écrites **dans les règles existantes** (aucune surcharge ajoutée) ;
2. `npm test` est à 895 / 0 ;
3. une capture du jeu et une capture du catalogue montrent le même rendu ;
4. le zip est reconstruit, `unzip -t` passe, et la version est synchronisée dans les 3 fichiers.

---

## 9. Tableau des tâches au 2026-11-09

### Terminé et vérifié
- Reprise du contexte, lecture de `Rules.md`, des `docs/`, de l'état réel du code.
- `npm test` **895 / 0** rendu reproductible sur un clone neuf (ordre de `.gitattributes`).
- Harnais de mesure du jeu et du catalogue (`tools/measure/`), captures avant/après.
- Portage **Poké Balls**, **Monnaies**, **Succès (fenêtre)** — valeurs en place, aucune surcharge
  ajoutée, `npm test` 895 / 0 après chaque écran.
- Non-régression vérifiée : Succès plein écran (partage trois règles avec la fenêtre) ouvert et
  mesuré, 0 débordement ; tableau de bord et mobile 390 capturés, 0 erreur JS.

### En attente de ta validation (rien ne bouge dessus d'ici là)
1. **Poké Balls** — en-têtes 11/800 capitales, lignes 34 px, ballon 16 px.
2. **Monnaies** — trois cellules ; avec une seule monnaie découverte la cellule occupe un tiers
   de la fenêtre (choix de fidélité au catalogue, réversible en une ligne).
3. **Succès (fenêtre)** — carte 84 px, pastille de rang sur une ligne, barre 7 px avec compteurs.

### Reste à faire
1. Les cinq fenêtres du tableau de bord listées en §6.1 (Quêtes en premier).
2. Les onze pleines pages de la §6.2.
3. Les écrans **non validés** de la §6.3 — ils ne sont pas des cibles.
4. Les dix notes de phase manquantes (`docs/PHASE_v1.16.38…47.md`) et la synchronisation de
   version, à faire **avec** le zip de la passe, une fois tes trois écrans validés.
5. `PanelFit` : corriger le débordement de 2 px du type dans la carte d'Équipe (défaut antérieur).

### État Git
Travail **non poussé** : trois fichiers de style, `.gitattributes`, `tools/measure/`,
`PASSATION/`. Aucun `reset`, aucun nettoyage destructif, `start.bat` inchangé dans git.
