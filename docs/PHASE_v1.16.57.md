# Phase 1.16.57 — les neuf écrans validés qui n'étaient pas en jeu

Scope demandé : porter dans le jeu les **neuf écrans du statut 2** du document
`PASSATION/ETAT_DES_ECRANS_v13.md`, c'est-à-dire validés par toi dans le catalogue mais absents (ou
différents) dans le jeu. Rien d'autre n'a été touché : les douze écrans du statut 3 attendent ta
validation, et les vingt-cinq du statut 4 attendent leur cadre.

## Le composant qui porte les neuf : la feuille

Le catalogue distingue deux chromes, et le jeu n'en avait qu'un :

| Chrome catalogue | Ce qu'il est | État dans le jeu avant cette passe |
|---|---|---|
| `.win` (fenêtre) | bandeau d'en-tête de 42 px, titre à gauche | **existait** (les 13 fenêtres du tableau de bord) |
| `.sh.pcmodal` (feuille) | le titre est posé **sur la surface**, dans le rembourrage de 14 px, pas de bandeau | **n'existait pas** : toute modale portait le bandeau d'une fenêtre |

`assets/css/components/modal-sheet.css` crée ce second chrome, sans toucher au premier : 680 px de
large (la valeur mesurée du catalogue), rayon 12, filet `--pw-border-color`, titre 15/700, rangées de
54 px sur une surface d'un demi-ton plus sombre que la feuille, pied pleine largeur de 44 px. Aucune
couleur en dur : tout passe par les jetons, donc les dix thèmes et le mode clair suivent.

`src/panels/components/SheetRow.js` est la rangée de cette feuille : pastille de 34 px, titre, ligne
secondaire, emplacement à droite. Une seule brique sert la légende de la carte, le choix de la balle,
le dialogue PNJ, le tableau des quêtes et les presets.

## Les neuf écrans

| Écran | Ce qui a été fait | Fichiers |
|---|---|---|
| **Légende de la carte** | feuille 680 + une rangée par état de carte (pastille de couleur, libellé, sens) + bouton Fermer pleine largeur. Les six entrées réelles (dont « shiny manquant ») sont conservées : le cadre du catalogue en dessinait quatre, inventées | `MapHelpModal.js` |
| **Choix de la Poké Ball** | feuille 680, une rangée par balle (sprite, nom, taux de capture réel, quantité possédée à droite), ligne « Aucune », Fermer. Le titre devient « Quelle Poké Ball ? » comme le cadre | `BallPickerModal.js` |
| **Dialogue PNJ** | le sélecteur devient une liste de rangées ; la conversation prend le titre du PNJ, une rangée d'identité et un bloc de répliques encadré ; pied « Retour / Fermer » en deux moitiés | `NpcTalkModal.js` |
| **Quêtes répétables** | la feuille remplace la grande fenêtre ; l'en-tête (contrats, relance), les offres et les contrats actifs sont conservés ; les cartes d'offre prennent la forme rangée (titre + description à gauche, récompense et « Accepter » à droite) | `RepeatableQuestModal.js`, `quests.css` |
| **Résolution d'énigme** | feuille ; les symboles deviennent des cases de 44 px comme les emplacements du cadre, le pied garde « Réinitialiser / Valider » et « Fermer » | `PuzzleSolveModal.js`, `guide.css` |
| **Presets d'équipe** | une seule colonne centrée de 680 px ; chaque emplacement = nom et compteur sur la première ligne, membres et actions sur la seconde. **Les trois actions sont gardées** (Charger / Sauver ici / Modifier) : le cadre en dessine deux, le jeu en a trois vraies | `presets.css` |
| **Confirmation du starter** | **écran créé** : le clic sur une carte n'engage plus la partie. Une feuille « Confirmer le choix » rappelle le nom du dresseur et l'espèce, propose « Changer » et « Confirmer » | `StarterModal.js` |
| **Quitter le combat** | **écran créé** : le bouton demandait auparavant une confirmation qui n'existait pas. Une feuille « Quitter le combat ? » prévient de la perte du butin avant de sortir | `BattlePanel.js` |
| **Relancer la partie** | le composant de confirmation du jeu (`ConfirmDialog`) prend la grammaire du cadre : marque, phrase, seconde ligne, deux moitiés de pied (fantôme / clair, ou rouge danger). **Aucun flux destructif n'a été ajouté** : le jeu ne perd pas de progression ailleurs que dans ses confirmations existantes | `ConfirmDialog.js` |

## Ce que j'assume, écran par écran

- **Trois cadres du catalogue sont des maquettes simplifiées** (PNJ, quêtes répétables, énigme) : ils
  montrent une version réduite d'écrans qui portent, en jeu, des quêtes, des paliers et des contrats.
  J'ai porté **la grammaire** (feuille, rangées, pied) et gardé **le contenu réel**. Rien n'a été
  supprimé pour ressembler au dessin.
- **Deux cadres portent des chiffres que le jeu n'a pas** : le choix de balle affiche « ×1 · taux 1.0 »
  (une échelle inventée) et la légende quatre entrées. La rangée garde sa forme, la donnée est celle
  du jeu : taux de capture en pourcentage, six états réels.
- **Le ✕ des feuilles** : le catalogue n'en dessine pas (on ferme par le bouton du pied). Il est
  conservé dans le jeu parce que le pouce n'a pas toujours le pied à l'écran ; il est passé en glyphe
  simple, sans pastille d'accent.
- **Presets** : le cadre dessine en plus une bande de sprites et un cercle « + » pour un emplacement
  vide. Le jeu affiche « Vide » et la liste des membres. Écart assumé, à trancher par toi.

## Vérifications

- `npm test` : **906 passés, 0 échec**.
- Neuf paires rendues à la même largeur (`catalogue-frames.mjs` + `port-cibles.mjs`), dans
  `PASSATION/shots/2026-11-09/portage11657/` : `paire-<écran>.png` ×9.
- Thème **clair** et **mobile 390** : la feuille suit les jetons (`theme-light-1280.png`,
  `theme-dark-390.png`). Aucune couleur en dur, aucune erreur de page.
- Trois règles du projet ont fait barrage et ont été respectées, pas contournées : les tailles de
  texte passent par l'échelle (`--pw-font-size-*`), aucun panneau ne redéfinit la typographie d'un
  titre de section, et `document.body` reste réservé à `src/ui` (le dialogue du combat passe par
  `AppShell.mountOverlay`).

## Ce qui change pour toi

Le clic sur une carte de starter ouvre maintenant une confirmation, et « Quitter le combat » demande
avant de sortir. Ce sont les deux seuls changements de **comportement** de la passe ; tout le reste
est de la mise en forme.
