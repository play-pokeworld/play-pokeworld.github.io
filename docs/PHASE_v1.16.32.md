# Phase v1.16.32 — socle mobile : décision de présentation, coquille, barres d'outils

Release corrective (patch) de `1.16.31`. Cette phase ne livre pas la refonte de toutes les interfaces :
elle corrige le **socle commun** dont dépendent toutes les interfaces mobiles, et refait deux écrans
qui ne pouvaient pas être réparés au niveau du socle (choix du Starter, bande de filtres).

Documents liés : `docs/ETUDE_POKECHILL_v1.16.32.md`, `docs/STRATEGIE_FUSION_MOBILE_v1.16.32.md`.

## 1. Décision de présentation — une seule, pour le CSS et pour le script

**Problème.** Les feuilles de style décidaient du mode tactile avec
`@media (max-width: 850px), (pointer: coarse)` (57 occurrences) alors que `MobileDashboardNav`
comparait `window.innerWidth <= MOBILE_BREAKPOINT_PX`. Sur un écran tactile large (tablette en
paysage, portable à écran tactile) le CSS affichait la présentation mobile et le script gardait la
présentation bureau : les fenêtres filtrées par onglet ne l'étaient pas, la barre restait masquée.
`ScrollLock` portait en plus **sa propre copie** de la chaîne de requête.

**Correction.**
- `config/DashboardLayout.js` : `MOBILE_MEDIA_QUERY` (la chaîne unique) et `MOBILE_NAV_HEIGHT_PX`.
- `ui/AppShell.js` : `isMobileLayout()`, `onMobileLayoutChange(cb)`, `syncMobileLayout()`. `AppShell`
  est déjà le seul module autorisé à toucher `<html>`/`<body>` et il portait déjà le drapeau
  `mobile-mode` : la décision lui revient.
- `ui/ScrollLock.js` : supprime sa copie de la requête et interroge `AppShell.isMobileLayout()`.
- `ui/dashboard/MobileDashboardNav.js` : s'abonne à `onMobileLayoutChange` au lieu d'écouter `resize`.

**Conséquence assumée, à valider par le propriétaire :** un écran tactile de plus de 850 px reçoit
désormais la présentation tactile (une colonne + onglets), comme le CSS le faisait déjà. Si l'on
préfère que la largeur seule décide, il suffit de changer `MOBILE_MEDIA_QUERY` — un seul endroit.

## 2. Coquille mobile — navigation dans la zone du pouce

**Problème.** La barre d'onglets était collante **en haut**, ses libellés à 11 px et ses sous-boutons à
38 px ; le chrome empilait trois bandeaux (entête, onglets, titre de fenêtre) avant le contenu. Le
`scroll-margin-top: 74px` était écrit en dur.

**Correction** (`layout/mobile.css`, `core/base.css`) :
- barre **fixée en bas**, `bottom: 0`, `env(safe-area-inset-bottom)` respecté, onglets `min-height: 44px`,
  libellés 12 px ;
- sous-barre « Gestion » empilée au-dessus de la barre ;
- la page réserve la hauteur de la barre (`--pw-mobile-nav-h: 56px`) : le dernier élément d'une fenêtre
  n'est plus sous les onglets ;
- `scroll-margin-top/bottom` calculés sur les jetons, plus de 74 px en dur ;
- taille minimale 44 px pour tous les contrôles du chrome (`pw-win-tool-btn`, fermeture de modale,
  dépliant de filtres, réglages de l'entête, zoom de carte).

Les 13 règles qui décrivaient cette barre dans `core/base.css` (avec `!important`, et deux positions
contradictoires `top: 52px` / `top: 92px`) ont été **supprimées** : `layout/mobile.css` est le seul
propriétaire du layout mobile. `core/base.css` garde les remises à zéro d'éléments.

**Mesure.** Cibles trop petites sur le tableau de bord mobile : **9 / 19 → 0 / 19** (390×844),
0 / 19 à 320×568, 768×1024 et 844×390.

## 3. Code mort de la couche fenêtres

Constaté en lisant les feuilles, pas en devinant :

| Id / classe visé | Où | Pourquoi il ne s'appliquait pas |
|---|---|---|
| `#fullscreen-panel-modal` | 9 règles (`ui-modal.css`, `fullscreen-panel.css`) | l'overlay porte son id de modale (`#fs-box`, `#fs-inventory`…) depuis le Rework |
| `.pw-modal-inner` | 2 règles + `transform: scale(0.92)` sous 480 px | aucun élément ne porte cette classe |
| `#starter-modal-inner` | bloc mobile + `scale(0.92)` | la fenêtre est `.starter-modal-window` |
| `#settings-inner`, `.modal-inner` | bloc mobile + `scale(0.92)` | classes mortes |

Le contrat de hauteur vivant (`.pw-fullscreen-overlay > .pw-modal-container`, `100dvh`, insets) est
conservé ; les écrasements par `transform` ont été supprimés partout (garde statique ajoutée).
`#poke-modal-inner` était **vivant** : la fiche Pokémon était réellement réduite de 8 % sous 480 px,
ce qui rapetissait son texte et ses cibles et faisait d'elle le bloc conteneur de ses enfants fixes.

## 4. Barre de filtres — une bande au lieu de quatre lignes

**Problème mesuré** (PC, 360×640) : la barre de filtres occupait **206 px** des **330 px** de contenu
disponibles ; le dépliant mobile existait mais ne replie que les champs et la recherche, et le
bouton-dépliant était en `position: absolute`, posé **sur la dernière puce** (donc intouchable).

**Correction** : puces sur **une ligne qui défile** (`chips.css`, avec un `!important` assumé car
`.inv-tabs` en porte un), bouton-dépliant remis dans le flux de la barre (44 px, au bout de la bande),
bande sur une seule ligne quand le dépliant est fermé (`ui-input.css`).
Pour que ces règles puissent gagner, `flex-wrap: wrap !important` a été retiré de trois feuilles
(`cards.css` `.ui-control-toolbar`, `box.css` `.box-filter-panel`, plus les doublons de `bag.css` /
`dictionary.css`) : la règle de bureau reste, elle n'est simplement plus prioritaire sur le tactile.

**Résultat** : barre 206 → 54 px, contenu 330 → **474 px** (+44 %) sur le PC ; un seul propriétaire par
propriété.

## 5. Notifications : un bandeau qui ne rend plus un bouton intouchable

**Bug reproductible** : à l'ouverture d'une partie, le toast « Nouvelle partie créée » se posait en
haut à gauche, `z-index: 99999`, **par-dessus les deux premières actions de la fenêtre Raccourcis**
(« Boîte PC », « Sac »). Un appui sur ces boutons touchait le toast : `fs-box` ne s'ouvrait jamais.
Mesuré en pilotage réel : `fs-box: none` avant, `fs-box: flex` après.

**Correction** : sur tactile, la pile de notifications est ancrée **au-dessus de la barre de
navigation**, largeur utile, fermeture à 44 px. Sur bureau, rien ne change.

## 6. Choix du Starter

- pied de fenêtre : le texte d'aide réservait 96 px pour un bouton en position absolue et se cassait en
  quatre lignes dans une colonne de 120 px → les deux blocs s'empilent sur tactile ;
- carte de starter : la rangée bureau (sprite | texte | « Choisir ») devient un bloc sur tactile
  (identité, description pleine largeur, action de 44 px en bas). Vérifié à 320×568, où la description
  passait auparavant sous le bouton.

## 7. Ce qui n'a pas été fait (assumé)

- Team, Combat, Quêtes, Pension, Mine, Entraînement, Base secrète, Atoll : audités au niveau du socle
  (ils héritent tous des correctifs ci-dessus) mais **pas réorganisés**. Constat écrit dans
  `STRATEGIE_FUSION_MOBILE_v1.16.32.md` §5, colonne « C ».
- En **paysage tactile** (844×390), la carte de la colonne « Aventure » reste petite : la carte conserve
  son ratio et se centre, laissant deux bandes vides sur les côtés. Rien n'est cassé ni inaccessible,
  mais le potentiel de l'écran est perdu ; c'est un travail de la phase « Carte / lieux », pas du socle.
- Aucun test sur appareil physique : tout a été mesuré dans Chromium piloté, avec `hasTouch` et des
  viewports de téléphone. Le comportement de la barre d'URL mobile est couvert par `dvh` (socle
  existant) mais n'a pas été observé sur un vrai téléphone.
- La dette `!important` de `ui-dropdown.css`, `chips.css` et `window-chrome.css` reste en place : elle
  a été contournée localement là où elle bloquait, pas supprimée.

## 8. Vérifications

- `npm test` : **894 tests passent**. Seul échec : `start.bat is pure ASCII with CRLF`, présent **avant**
  cette phase dans ce checkout Linux (fins de ligne converties par git) — sans rapport avec la livraison.
- Nouveaux gardes statiques (`tests/MobileTouchCss.test.js`, bloc « Mobile shell (1.16.32) ») :
  décision de présentation unique, barre ancrée en bas et hauteur réservée, aucun panneau réduit par un
  `transform`, bande de filtres unique et dépliant dans le flux.
- Le garde « fingers get finger-sized controls » attend désormais 44 px pour les boutons d'outil
  (il attendait 34 px, valeur qui restait trop petite sous un pouce).
