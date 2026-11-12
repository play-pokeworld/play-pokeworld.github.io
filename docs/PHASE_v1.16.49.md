# Passe 1.16.49 — le Sac, et les surcouches de barre de filtres

Branche : `Interface-rework`. Base : 1.16.48 (échelle typographique unique, surcouches des panneaux
retirées). Cette passe ouvre le **Lot C** de la §6.2 de la passation : les cellules, lignes et
en-têtes des onze pleines pages, en commençant par le **Sac**, première page de la liste.

## 1. Le but

La 1.16.48 avait ramené les contrôles partagés (pastilles de filtre, bande de filtres, onglets) au
vocabulaire du catalogue, mais le **contenu** des pages était resté à l'ancienne grammaire. Le Sac
était donc « à moitié » : bonnes pastilles, mauvaise ligne d'objet, et surtout **deux cadres**
(bande de filtres et barre de recherche) que le catalogue n'a nulle part.

## 2. Ce qui a été retiré (pas ajouté)

| Fichier | Ce qui est parti | Pourquoi |
|---|---|---|
| `panels/bag.css` | bloc `!important` de 5 règles (`.inv-item` + `:hover` + `.inv-name/-desc/-qty`) qui repeignait chaque ligne d'objet en cellule sombre | doublon d'une grammaire morte, il battait la règle de base |
| `panels/bag.css` | 2ᵉ et 3ᵉ copies de `.inv-icon` / `.inv-name`, règle `.inv-grid` (classe absente du code) | doublons et CSS mort |
| `panels/starter.css` | les trois blocs `.pw-starter-chosen*` (dont un `!important`) | le Sac empruntait les classes de l'assistant de départ : `BagItemRow` ne les porte plus |
| `components/chips.css` | 4 blocs `.inv-tab`/`.inv-tabs` successifs + `.inv-tab` retiré des piles `!important` de `.tab`/`.dict-tab` | un seul propriétaire pour l'onglet du Sac |
| `components/ui-toolbar.css` | 2ᵉ bloc `.pw-filterbar button.pw-chip` (40 px) ; 4 blocs `.pw-chip-count` réduits à un | doublons |
| `components/ui-dropdown.css` | **6 blocs** `.usm-sort-btn` (`!important` empilés) | les puces de tri sont des puces de filtre, rien à redéclarer |
| `components/cards.css` | 2 déclarations concurrentes de `.ui-control-toolbar`, la première en `!important` | une seule barre de filtres, sans cadre |
| `panels/box.css` | 2 blocs `.box-filter-panel`/`.box-filter-bar` dont un `!important` encadré | idem |
| `components/ui-modal.css` | 2 copies de `.pw-modal-search-bar` (fond sombre + filet 2 px) | l'emplacement des filtres est sur la surface |

## 3. Ce qui a été mis au vocabulaire du catalogue

| Objet | Catalogue | Jeu (1.16.49) |
|---|---|---|
| Ligne d'objet | `.row` : `color-mix(surface 60 %, header)`, filet `--pw-border-color`, r8, padding 9/10, 34 px d'avatar | `.inv-item` identique, jeton `--pw-item-icon-sm` (40 px) pour la tuile |
| Nom / quantité | `.row .a` 12,5/600 · `.qte` 11/800 tabulaire | `md` (12)/600 · `sm` (11)/800 tabulaire, `--pw-text-primary` |
| Liste | `.colgrid` 2 colonnes, `minmax(320px)`, gap 6 | `.inv-list-root` identique |
| Onglets | `.segx` grille `minmax(84px)` gap 5 | `.inv-tabs` grille, pastille 28/r999, actif `--light1` |
| Puces de filtre / tri | `.filters .clr` pastille 28 | `.pw-chip` 28/r999, sans filet, actif `--light1` |
| Bande de filtres | aucune : les filtres sont sur la surface | `.pw-ui-toolbar`, `.ui-control-toolbar`, `.box-filter-panel`, `.pw-modal-search-bar` transparents, sans cadre |

Deux bornes utiles, mesurées dans le navigateur : `button { min-height: 44px }`
(`core/form-controls.css`) étirait chaque pastille à 44 px — « Tous » devenait un cercle ; la règle
de puce pose maintenant `min-height: 0`. Et `align-items` de la bande laissait un trou : la barre
reste en `flex-wrap` sur la surface, sans bande.

## 4. Tests

`npm test` : **895 réussis / 0 échec**. Trois cas ont été **réécrits dans leur intention**, pas
contournés :

- `MobileTouchCss.test.js` « a filter toolbar folds into one scrolling band on touch » : la bande
  qui défile est remplacée par la grille de pastilles du catalogue. Le cas garde la garantie utile
  (la barre reste une rangée, les onglets sont des pastilles sans cadre) sans figer une taille.
- `BagPanel.test.js` « held-item selection inherits the standard Bag grid columns » figeait
  `minmax(220px)` ; il vérifie maintenant la forme (`repeat(auto-fill, minmax(Npx, 1fr))`), donc
  l'intention — la sélection d'objet tenu suit la grille du Sac — sans la valeur.
- Aucun test de taille de texte n'a été touché : l'échelle de la 1.16.48 tient.

## 5. Contrôle visuel

`node tools/measure/shot-fullscreen.mjs BAG` puis `BOX` : aucune erreur de page, cadres disparus,
une seule famille de pastilles, ligne d'objet conforme. Captures de contrôle dans `/tmp`
(`bag-after3`, `chk2`), non versionnées faute de place dans l'espace de travail.

## 6. Ce qui reste

1. **Boîte PC** (en cours de lecture) : la carte Pokémon (`.box-card`, cercle + niveau) et le cadre
   « STOCKAGE PC » qui entoure encore la grille — le catalogue pose un `.seclbl` nu.
2. **Pokédex** : pastilles d'entrée, ligne de stats.
3. **Marché / Boutique** : la cellule `.pw-shop-item` (déjà copiée au catalogue) et le portefeuille.
4. **Dictionnaire, Badges, Atoll, Succès plein écran, Énigmes, Presets, Réglages**.
5. **Fenêtres** : Combat, Carte, Lieu, Équipe (§6.1).
6. Reste ouvert depuis la 1.16.48 : plancher typographique 10,5 px, rangée Monnaies en 3 cellules,
   `save-menu.css` hors refonte — **à valider par toi**.
