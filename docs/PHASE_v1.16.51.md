# Phase 1.16.51 — la grammaire commune, partout

Cette passe ne touche aucune règle de jeu : elle termine la reprise d'affichage commencée en
1.16.49. Chaque plein écran encore écrit dans l'ancien vocabulaire (carte encadrée, anneau de
deux pixels, bandeau coloré) rejoint la grammaire du catalogue : **une cellule, une ligne, une
pastille**.

## Ce qui a changé

| Écran | Avant | Après |
| --- | --- | --- |
| Badges / Ligues | `.pw-badge-card` 144×133 encadrée, ligue traitée à part (`.pw-league-card` dans `achievements.css`) | Une seule tuile `.gcell` : surface d'en-tête, filet, barre de nom pleine largeur, deux lignes secondaires. Grille `minmax(112px)` gap 6. Deux `seclbl` (`pw-section-title is-sm`) portent les compteurs ; l'en-tête dupliqué a disparu |
| Succès (plein écran) | 82 cartes 445×134 `r6` en deux colonnes, section bonus encadrée, `pw-rank-chip` en boîte `r4` | Une colonne de `.row` : disque famille 34, colonne de texte (titre, description, barre + compteur, ligne de gain), colonne de fin (rang, paliers, état). Bonus sur la surface, progression 7 px, rang en pastille `r999`. Clés brutes (`pc_boxes`, `stuffProd`) remplacées par 29 libellés `ach_bonus_*` (fr + en) |
| Dictionnaire | `.dict-entry` encadrée, bande de type 4 px | `.row` : tuile sprite 40, nom, ligne d'état, filet unique |
| Presets d'équipe | 20 lignes sur deux colonnes, phrase d'aide répétée 20 fois, halo sur l'actif | Une ligne par emplacement, une seule ligne de contenu, pastille `Vide` (bulle d'aide = phrase complète), filet accent pour l'actif, sans halo |
| Réglages | 10 thèmes en deux bandeaux 530×40 | Tuiles 120×34 en grille, sélection à l'accent ; libellés de section en petites capitales (`seclbl`) ; cartes son sur surface d'en-tête |
| Énigmes | `.pw-puzzle-card` `r12` | `.servrow` : `r8`, surface mixte, état en pastille teintée |
| Marché | sélection en `outline 2px` + anneau | filet accent 1 px en incrustation ; titres de catégorie en `seclbl` |
| Atoll | cartes `r12` 172 px, chips `font-weight 900` | cartes `r10` sur surface d'en-tête, chips de la grammaire commune |
| Équipe | `.poke-card` crème 316×262, lignes de capacités cerclées, pastille de niveau illisible | Cellule du tableau de bord : surface mixte + filet, capacités sur filet, emplacement vide en pointillés, niveau en pastille `--pw-bg-sprite` |
| Raccourcis | lignes à bordure colorée 2 px + ombre portée | filet unique, couleur de l'entrée sur l'icône seulement |
| Lieu | boutons de PNJ en bandeaux violets 2 px, nom sur plaque | lignes sur surface d'en-tête, nom en texte posé sur l'illustration |
| Carte | boutons de zoom sur bleu nuit opaque | tuiles d'en-tête 30 px au filet |

## Pokédex

La cellule du Pokédex portait encore l'ancien anneau : 72 px, `border-radius: 50%`,
`border: 2px` — c'est-à-dire le second cercle que la boîte PC avait déjà perdu. Elle reprend
exactement la cellule de la boîte : colonne sans cadre sur sa piste, numéro en ligne de texte,
disque unique de 58 px. La grille ne peint plus son fond (`--dark2` → `none`).

## Fichiers

- `assets/css/components/badges.css`, `panels/achievements.css`, `panels/badges` (aucun),
  `panels/dictionary.css`, `panels/presets.css`, `panels/settings.css`, `panels/guide.css`,
  `panels/market.css`, `panels/atoll.css`, `panels/pokedex.css`, `panels/shortcuts.css`,
  `panels/npc.css`, `panels/location.css`, `components/ui-map-view.css`.
- **Nouveau** `assets/css/panels/team-window.css` : `panels/team.css` atteignait la limite de
  1700 lignes que garde `CssStructure.test.js` ; le bloc de la fenêtre Équipe y est déplacé et
  importé juste après, la cascade lit toujours team puis fenêtre.
- `src/panels/fullscreen/BadgesPanel.js` (deux `seclbl`), `fullscreen/AchievementsFullscreenPanel.js`
  (ligne de succès), `team-presets/TeamPresetListCard.js` (pastille `Vide`), `localization/{fr,en}/panels.js`
  (29 libellés de bonus), `localization/{fr,en}/ui.js` (`preset_empty_short`).
- **Nouveau** `tests/InterfaceGrammar.test.js` (6 cas) enregistré dans `test_suite.js` : cellule de
  collection sans cadre, tuile de badge commune aux ligues, succès en colonne de lignes, ligne de
  liste au filet unique, fenêtres du tableau de bord, pastilles de filtre.
- `tests/MobileTouchCss.test.js` : le cas « pas de largeur minimale de bureau » est réécrit dans son
  intention (`minmax(0, 1fr)` **ou** `min(Npx, 100%)`), la grille des succès étant désormais une
  colonne.

## Vérification

- `npm test` : **901 / 0** (895 avant la passe, +4 cas de grammaire, 2 cas réécrits).
- `tests/browser/MapTravel.mjs` contre le serveur : 4/4, console propre.
- Captures 1400×900 de SHOP, MARKET, BAG, BOX, BADGES, POKEDEX, ACHIEVEMENTS, ATOLL, DICTIONARY,
  PUZZLES, TEAM_PRESETS, SETTINGS et du tableau de bord (1400×1800), plus l'audit
  `tools/measure/audit-pages.mjs` : plus aucun conteneur encadré hors de la grammaire.
- Ces captures sont livrées dans `PASSATION/shots/2026-11-09/grammaire11651/` (`fs-<PANEL>.png`,
  `presets.png`, `settings.png`, `dash-tall.png`) : ce sont les états *après*, à comparer avec les
  `before/` de la même journée.
