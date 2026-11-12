# Phase 1.16.60 — les écrans du catalogue passent dans le jeu

> Neuf chantiers codés dans le jeu, tous relevant du même retour : « tu peux coder ». Le catalogue
> reste la référence ; cette fois c'est le **code du jeu** qui a changé. Une seule règle a été
> tranchée par moi, la largeur des fenêtres PC (voir §3).
> Version **1.16.60**. `npm test` : **906 / 0**. Contrastes AA **147 / 147**. i18n **0 clé manquante**.

---

## 1. Ce qui a été codé

### 1.1 Header — plus aucun nombre à droite (global)

- `src/panels/HeaderPanel.js` : le bloc « Badges : n/total » n'est plus affiché. Les nœuds
  `#h-badges` / `#h-badges-total` restent dans le DOM, `hidden` + `aria-hidden`, parce que
  `tests/Dashboard.test.js` et le diagnostic les lisent encore.
- `assets/css/layout/header-bar.css` : `.pw-header-badges.is-header-hidden { display: none }`
  (l'attribut `hidden` seul ne suffit pas : `.hinfo` est un `display: flex` qui l'écrase) et
  `#settings-btn { margin-left: auto }`, la roue reprenant la poussée à droite que le bloc badges
  assurait par `.pw-static-002`.
- Le catalogue suit : `TopBar()` ne rend plus le `<div class="meta">`, donc plus de
  « Badges : 0 / 8 » sur **aucun** des soixante cadres, ni dans la barre de l'application.
- Conséquence : Sac, Boîte PC, Pokédex, Marché, Boutique, Dictionnaire, Badges, Lieu, Atoll et les
  fenêtres du tableau de bord n'ont plus rien à droite de leur en-tête — c'était global.

### 1.2 Boutique, Marché, Atoll — la quantité est une case carrée

- `assets/css/panels/shop.css` : `.pw-shop-footer .pw-shop-qty` passe de `6px` à
  `var(--pw-radius-sm)` (7 px), comme la pastille carrée du catalogue. Le champ est mesuré
  **72 × 29 px, rayon 7 px** en Boutique **et** en Atoll.
- `src/panels/fullscreen/AtollFullscreenPanel.js` : la boutique de l'Atoll n'avait **aucune** barre de
  quantité (un seul objet par clic). Elle a maintenant la barre de la Boutique — Reset, champ,
  +10, +100, Max, total en jetons, Acheter — avec le même champ carré. Carte sélectionnée cerclée,
  mention « Choisir » / « Sélectionné ».
- `src/systems/AtollSystem.js` : `buyItem(itemKey, save, quantity)` accepte une quantité
  (signature rétro-compatible, `tests/Atoll.test.js` passe toujours `save` en 2ᵉ argument).

### 1.3 Atoll — l'accueil en liste de tickets, et les quatre centres

- `_renderHomeTab()` ne construit plus quatre tuiles mais **une liste de tickets**, une rangée par
  centre de combat (icône, nom, record en sous-ligne, chevron), via le composant partagé `SheetRow`.
  C'est le cadre « Accueil » du catalogue. Les fragments de Légende restent dessous.
- Nouvelle clé `atoll_ticket_record` / `atoll_ticket_never` (fr + en).
- Les quatre pages de centre (Tour, Usine, Arène, Dôme) existaient déjà et restent inchangées :
  ce sont elles que le catalogue relevait.
- `tests/Atoll.test.js` : l'assertion « 4 tuiles » devient « 4 tickets, et un ticket est un bouton ».

### 1.4 Starter régional — le composant du starter de Kanto

- `assets/css/panels/starter.css` : tout le bloc `1.16.34` (cartes sable, bord pointillé, sprite en
  haut, bandeau de titre, pastille « Choisir ») qui visait `#starter-modal` vise désormais
  `:is(#starter-modal, #regional-starter-modal)`. Le starter régional n'a donc plus ses rangées
  horizontales : il prend les **cartes verticales validées**, « seules les données changent ».
- En 390, les trois cartes restent **sur une ligne**, plus petites (sprite 44 px, textes de
  l'échelle, minimum 10.5 px conservé) : c'est la grille du catalogue sur mobile.
- La bande de titre perd son `id` dupliqué au profit de la classe `.starter-title-band`, et le pied
  « Choisissez votre starter… » est centré.
- Mesure : stack de **3 colonnes**, cartes de 272 px en PC, 3 colonnes aussi en 390.

### 1.5 Menu de navigation — angles droits en haut, arrondis en bas

Rien à coder : `assets/css/components/nav-menu.css` portait déjà
`border-radius: 0 0 var(--pw-window-radius) var(--pw-window-radius)`. Vérifié en navigateur :
`0px 0px 10px 10px`. C'était un point de contrôle, pas un correctif.

### 1.6 Badges

Rien à coder non plus côté dessin : `BadgesPanel` + `UIBadgeCard` étaient la source du catalogue.
Seul effet de la largeur PC (§3) : la grille passe de 7 à **10 colonnes** (24 badges = 10 + 10 + 4),
et le plafond interne de 1000 px de `.pw-badges-panel-container` tombe, sinon la grille gardait une
marge morte à droite.

### 1.7 SaveMenu — fond du Pokémon et zones de texte en semi-transparent

`assets/css/panels/save-menu.css` :

- la case du Pokémon (`.save-slot-icon`) : `rgba(255,255,255,.14)` + filet `rgba(255,255,255,.22)` ;
- les zones de texte « badges / pokédex / temps » (`.save-slot-stats span`) :
  `rgba(255,255,255,.12)` + filet `rgba(255,255,255,.2)` ;
- un léger `backdrop-filter: blur(2px)` sur les deux, pour que le fond du dessin reste lisible ;
- plus de couleur pleine qui déteint : les deux surfaces laissent passer l'illustration de la carte ;
- les textes passent en encre sombre (`--dark1`), parce qu'une tuile claire ne porte plus du crème.
  Le thème noir et blanc garde ses alphas un peu plus blancs.
- Mesuré : tuile `rgba(255, 255, 255, 0.12)`, case du Pokémon `rgba(255, 255, 255, 0.14)`.

### 1.8 Lieu, Sac, Boîte PC, Pokédex, Dictionnaire
Rien d'autre que le header (§1.1) : ces écrans n'avaient ni compteur à droite ni composant à changer.

---

## 2. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/panels/HeaderPanel.js` | compteur badges masqué |
| `src/panels/fullscreen/AtollFullscreenPanel.js` | accueil en tickets, boutique avec quantité, imports |
| `src/panels/RegionalStarterModal.js`, `src/panels/StarterModal.js` | classe `.starter-title-band` |
| `src/systems/AtollSystem.js` | `buyItem(…, quantity)` |
| `src/localization/fr/ui.js`, `src/localization/en/ui.js` | 4 clés (`choose_btn`, `selected_lbl`, `atoll_ticket_record`, `atoll_ticket_never`) |
| `assets/css/layout/header-bar.css` | header sans compteur |
| `assets/css/core/tokens.css` | largeur de référence 1280 en PC |
| `assets/css/components/ui-modal.css` | fenêtres plein écran à 1280 en PC |
| `assets/css/components/badges.css` | plafond interne retiré |
| `assets/css/panels/atoll.css` | tickets + barre de la boutique Atoll |
| `assets/css/panels/starter.css` | starter régional = composant du starter Kanto |
| `assets/css/panels/save-menu.css` | surfaces translucides |
| `assets/css/panels/shop.css` | champ de quantité carré |
| `catalogue/CATALOGUE_AFFICHAGES.html` | `TopBar` sans compteur |
| `tests/Atoll.test.js` | tuiles → tickets |

---

## 3. La largeur des écrans PC — la décision que tu m'as laissée

**Une seule largeur de référence pour tous les écrans plein écran en PC : 1280 px**, la largeur que
le catalogue dessine, au lieu du plafond historique de 960 px. Au-delà de 1600 px la fenêtre suit
déjà l'échelle du jeu (1380), puis 1820 sur très grand écran.

Pourquoi celle-là :

1. c'est la largeur du catalogue, donc une seule référence entre le document et le jeu ;
2. elle ne touche **que** le pointeur fin et les fenêtres de bureau : en dessous de 1025 px et sur
   tout pointeur tactile, la règle existante (`95vw`, moins les encoches) reste seule ;
3. elle fait gagner des colonnes là où le catalogue en dessinait plus (badges 7 → 10, Boutique 5 → 7)
   sans changer une seule taille de texte ni de tuile.

Mesure : à 1440 px de fenêtre, le conteneur passe de **960 à 1280 px**, la grille des badges de
**7 à 10 colonnes**.

---

## 4. Vérifications

| Contrôle | Résultat |
|---|---|
| `npm test` | **906 passés, 0 échec** |
| `node tools/contrast-audit.mjs --check` | **147 paires, 147 ≥ AA** |
| `node tools/i18n/audit-keys.mjs` | **0 clé manquante** |
| `node tests/browser/PanelFit.mjs` | 7 contrôles passés (9 largeurs, 12 lieux, EN compris) |
| Catalogue en ligne | 60 entrées de navigation, 0 cadre vide, 0 erreur JS |
| Copies autonomes hors ligne | 60 cadres, 0 image cassée, 0 requête externe |
| Parcours navigateur (1440) | header sans compteur, 4 tickets Atoll, boutique Atoll avec quantité, starter régional 3 colonnes, nav arrondi en bas seulement, aucune erreur console, aucune requête refusée |

Captures : `PASSATION/shots/2026-11-09/portage11660/` (12 fichiers).

> Deux suites navigateur du dépôt (`DictionaryParity`, `MarketAndResponsiveTraining`,
> `SaveCardPortrait`) échouent **avant** mes changements dans cet environnement : la fenêtre
> « Télécharger PokéWorld » ouverte au démarrage intercepte les clics et ces suites ne la ferment pas
> (`MapTravel.mjs` la ferme, lui). Ce n'est pas une régression de cette passe.

---

## 5. Écarts connus, assumés

- **Atoll — Accueil** : le jeu affiche désormais la liste de tickets du catalogue, mais sans la
  première rangée « Ligue Master » (le jeu n'a pas de division de Ligue Atoll à afficher).
- **Badges** : 10 colonnes en PC grâce à la largeur, 7 sur un écran plus étroit — même dessin.
- **Atoll — Boutique** : la barre de quantité ajoutée n'existe pas dans le catalogue du jeu
  d'origine ; elle reprend mot pour mot celle de la Boutique.
