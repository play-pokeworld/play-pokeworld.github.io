# Phase 1.16.11 — Réorganisation CSS et fin des P1 d'ergonomie

> Branche `Rework`. Suite de la 1.16.10 (`a8042ac`). État final : **`assets/css/` = 92 feuilles,
> 5 dossiers, 1 manifeste**, suite de tests **830/0**, navigateur **9/9**.

---

## 1. Ce que la demande visait

> « Je te laisse modifier tous les P1 et séparer correctement tous les fichiers CSS en sous-fichiers
> et sous-dossiers proprement afin de faciliter la navigation et ne plus avoir de fichier fourre-tout. »

Deux chantiers, menés dans cet ordre (le CSS d'abord : les P1 touchent des règles CSS, il fallait
savoir où les écrire).

---

## 2. État mesuré avant la phase

| Fichier | Lignes | Règles | `!important` | Constat |
| --- | ---: | ---: | ---: | --- |
| `assets/css/design-system.css` | 15 690 | 3 980 | 2 409 | 105 bandeaux de passes datées, 413 sélecteurs redéfinis |
| `assets/css/panels.css` | 2 649 | 494 | — | 13 blocs sans bandeau, aucun thème directeur |
| 41 autres feuilles | 6 855 | — | — | dont `style.css`, 43 `@import` + 4 blocs de règles en propre |

`docs/ANALYSE_design-system.md` contient l'analyse détaillée de cette sédimentation.

---

## 3. Arborescence livrée

`index.html` ne charge plus qu'**un** point d'entrée : `assets/css/style.css`. Ce fichier n'est plus
qu'un **manifeste** : un bandeau qui explique la règle de cascade, puis **114 lignes** (92 imports commentés)
`@import url("./<dossier>/<fiche>.css");`, chacune commentée (`/* 47 · Équipe */`). Aucune règle, aucun
`@import` imbriqué ailleurs : l'ordre de la cascade est déclaré à un seul endroit.

| Dossier | Feuilles | Lignes | Responsabilité |
| --- | ---: | ---: | --- |
| `core/` | 8 | 2 116 | jetons, thèmes, alias, barres de défilement — aucune décoration de widget |
| `layout/` | 8 | 1 934 | squelette de page, colonnes du tableau de bord, grilles responsive, chrome des fenêtres, nav mobile |
| `components/` | 30 | 5 911 | widgets réutilisables, une fiche par famille (`ui-*.css`, `modal-sizes.css`, `ui-section-title.css`, `ui-empty-state.css`…) |
| `panels/` | 31 | 7 915 | une fiche par fenêtre ou panneau de jeu (`bag.css`, `team-window.css`, `facilities.css`…) |
| `design-system/` | 15 | 7 835 | passes datées héritées de l'ancien `design-system.css`, **gelées**, dans leur ordre historique |

Répartition exacte :

- **`core/`** — `variables.css`, `tokens.css`, `theme-enforcement.css`, `extracted-statics.css`,
  `pw-aliases-utilities.css`, `contrast-visibility.css`, `themes-v4.css`, `scrollbars.css`.
- **`layout/`** — `app-shell.css`, `panels-canonical.css`, `responsive-mobile.css`,
  `game-dashboard.css`, `dashboard-layout.css`, `responsive-battle.css`, `drag-chrome.css`,
  `mobile-nav.css`.
- **`components/`** — `ui-element|button|text|progressbar|panel|modal|dropdown|input|icon|image|link|`
  `file-button|context-menu|dialog|pokemon-sprite|map-view.css`,
  `poke-cards-moves.css`, `poke-detail-panel.css`, `poke-modal-rank-presets.css`,
  `legacy-modals-starter.css`, `dictionary-legacy.css`, `save-menu-selector.css`,
  `utility-classes.css`, `modal-sizes.css`, `sortable.css`, `notifications.css`,
  `pokeball-filters.css`, `fullscreen-panel.css`.
- **`panels/`** — `achievements-quests.css`, `quests-repeatable-npc.css`, `training-battle-loot.css`,
  `training-center.css`, `battle-float-timeline.css`, `battle-timeline-tutorial.css`,
  `battle-summary-team.css`, `location-actions.css`, `location-overview.css`, `team-window.css`,
  `team-presets.css`, `team-preset-editor-atoll.css`, `capture-held-item.css`, `puzzles.css`,
  `tutorial-box.css`, `save-menu.css`, `starter-modal.css`, `shop.css`, `market.css`,
  `automation.css`, `badges.css`, `bag.css`, `item-use.css`, `pokemon-grid.css`, `pokedex.css`,
  `dungeons.css`, `guide.css`, `dictionary.css`, `secret-base.css`, `pokemon-background.css`,
  `facilities.css`.
- **`design-system/`** — `passe-26-27-drag-pal.css`, `ds2600-components.css`,
  `ds2800-filters-chips.css`, `ds2807-sprite-disc.css`, `ds2812-ds2815-feedback.css`,
  `ds2816-ds2822-shop-base.css`, `ds2826-ds2830-correctives.css`, `ui-skin-2026.css`,
  `skin-combat-team.css`, `passes-p3-and-28-29.css`, `passes-30-31.css`, `passes-32-33.css`,
  `passe-36-dungeon-map.css`, `v7r1-feedback.css`, `releases-1-16.css`.

Les deux fichiers fourre-tout (`design-system.css`, `panels.css`) **n'existent plus** : rien n'a été
dupliqué à la racine pour faire plaisir aux anciens chemins, les tests et les outils ont été migrés.

---

## 4. Preuve que la réorganisation ne change rien au rendu

La cascade aplatie a été comparée avant/après, feuille par feuille, dans l'ordre exact où le
navigateur les applique (les blocs en propre de l'ancien `style.css` inclus) :

| Mesure | Avant (`git show a8042ac`) | Après |
| --- | ---: | ---: |
| Règles aplaties | 5 535 | 5 535 |
| Ordre et contenu | identiques | identiques |
| Empreinte SHA-1 de la cascade | — | `aa5c0bcffa49df642ca7552396099a742d212e41` |

Deux corrections ont été trouvées **par** cette passe et par le test de structure, pas par hasard :

- `panels/save-menu.css` avait conservé `url('../images/bg/empty.jpg')` : depuis son nouveau dossier
  la police de fond du menu de sauvegarde pointait dans le vide. Corrigé en `../../images/bg/…`
  (`core/`, `layout/`, `components/` et `design-system/` avaient déjà été réécrits lors du déplacement).
- `style.css` contenait encore 4 blocs de règles ; ils ont été déplacés dans
  `core/scrollbars.css`, `layout/drag-chrome.css`, `components/modal-sizes.css` et
  `layout/mobile-nav.css`, importés en fin de manifeste pour conserver l'ordre.

---

## 5. Garde-fous ajoutés (`tests/CssStructure.test.js`, 11 tests)

1. `style.css` est un manifeste pur : 90 `@import` et **zéro** `{`.
2. Chaque feuille est importée **une seule fois**, dans l'ordre du manifeste.
3. Aucune feuille orpheline (sur disque mais non chargée), aucune feuille fantôme.
4. Exactement cinq dossiers, et `style.css` seul à la racine.
5. **Aucune feuille ne dépasse 1 000 lignes** : un nouveau fourre-tout échoue.
6. Chaque feuille commence par un bandeau qui dit son rôle.
7. Aucun `@import` dans une feuille (la cascade reste déclarée en un point).
8. Chaque `url('…')` relative résout depuis son nouveau dossier (c'est ce test qui a attrapé
   `save-menu.css`).
9. Les passes de `design-system/` restent dans l'ordre et disent leur place dans la cascade.
10. `index.html` ne charge que `assets/css/style.css`.
11. `sheetPath('design-system.css')` lève : le fourre-tout supprimé ne peut pas revenir.

`tests/CssBundle.js` fournit `readBundle()` (cascade complète, résolue récursivement, qui **jette**
sur un import dupliqué), `readSheet('bag.css')`, `sheetPath('bag.css')` (résolution par suffixe,
quel que soit le dossier) et `readManifest()`. Les tests existants ont été migrés vers ces
accesseurs : aucun chemin plat n'est codé en dur, un fichier peut donc être reclassé sans casser la
suite.

`tools/contrast-audit.mjs` lit désormais le bundle et non l'ancienne feuille : 147 paires auditées,
**0 sous AA**.

---

## 6. Doctrine CSS opposable (reportée dans `Rules.md`, section 7)

- Un seul point d'entrée, un seul endroit qui déclare la cascade.
- Un fichier = une responsabilité ; le dossier dit la responsabilité.
- Les passes de `design-system/` sont **gelées** : tout nouveau style va dans `core/`, `layout/`,
  `components/` ou `panels/` selon sa nature.
- Ajouter une feuille = écrire la règle au bon endroit **et** ajouter sa ligne au manifeste ; le test
  de structure échoue sinon.

---

## 7. P1 d'ergonomie (audit `docs/AUDIT_v1.16.9.md`)

### 7.1 Titres de section — ✅

Neuf classes remplacées par **une** : `pw-section-title`, avec deux tailles (`is-lg`, `is-sm`).
La feuille canonique est `components/ui-section-title.css` (38 lignes) ; les règles locales ont été
supprimées (y compris les variantes de couleur des quêtes, désormais portées par
`.pw-story-quest-section--* .pw-section-title`).

| Ancienne classe | Taille réelle | Nouvelle écriture |
|---|---|---|
| `pw-section-title` (dictionnaire, fiche) | 13 px | `pw-section-title` |
| `battle-summary-section-title` | 13 px | `pw-section-title` |
| `pw-loc-section-title` | 13 px | `pw-section-title` |
| `pw-progress-section-title` | héritée | `pw-section-title` |
| `pw-story-quest-section-title` | 13 px | `pw-section-title` |
| `pw-repeatable-board-section-title` | 13 px | `pw-section-title` |
| `pw-cur-sector-title` (boutique) | 11 px, capitales | `pw-section-title is-sm` |
| `pw-box-section-title` | 14 px | `pw-section-title is-lg` |
| `pw-atoll-section-title` | 14 px | `pw-section-title is-lg` |

Deux classes mortes (`pw-preset-section-title`, `pw-hatchery-section-title`) ont été supprimées
plutôt que migrées : aucun code ne les construisait.

### 7.2 États vides — ✅

Seize vocabulaires remplacés par `pw-empty-state` + `is-lg` / `is-sm`, dans
`components/ui-empty-state.css`. La règle de base porte `grid-column: 1 / -1`, ce qui supprime le
`grid-column` que trois fenêtres répétaient. `.pw-ach-empty-tracker` survit comme **crochet** (elle ne
porte plus que `cursor: pointer`, l'apparence vient du canonique). Cas volontairement non migrés :
`.save-menu-empty` (zone de dépôt avec icône, ce n'est pas un état vide textuel) et
`.pw-secret-base-empty-card` (une carte, pas un message).

### 7.3 Icônes d'objets — ✅

Trois jetons dans `core/tokens.css` : `--pw-item-icon-sm: 40px`, `--pw-item-icon-md: 52px`,
`--pw-item-icon-lg: 72px`. Huit valeurs arbitraires (42, 46, 48, 56, 64…) ont été ramenées à
l'échelle : sac/boutique/dictionnaire/marché → 40 ou 72, fiche d'objet/ciblage/butin → 52,
fenêtre Lieu et résumés → 72 (inchangés, c'était la référence de la 1.16.8). Les pastilles posées
sur une carte Pokémon (22–44 px) gardent leur échelle propre, documentée dans le test.

### 7.4 Plancher typographique — ✅

53 déclarations sous 11 px remontées à **11 px** (dont les 8 à 9 px et les 2 à 9,5 px). Il reste
36 déclarations à 10 px, toutes sur des pastilles (type, niveau, compteur, slot) — c'est la règle
écrite dans le test. Une déclaration héritait du `font-size: smaller` du navigateur
(`.poke-detail-stat-value small`) et descendait à ~9 px sans qu'aucune règle ne le dise : fixée à 11 px.

### 7.5 Reste ouvert (assumé)

- **Boutons** : `UIButton` fournit déjà `pw-button` + variantes (`primary`, `secondary`, `danger`,
  `success`, `ghost`, `tab`), mais 22 combinaisons locales coexistent encore dans les panneaux
  (`queue-action-btn`, `pw-facility-manage`, `poke-detail-mini-btn`…). Ramener ces 22 classes à 5
  variantes touche une vingtaine de fenêtres et change leur rendu : c'est une passe à faire avec
  captures avant/après, pas à moitié.
- **Recherche texte** : 5 fenêtres sur 12. Le composant existe (`box-filter-search`), il reste à
  l'instancier là où les listes dépassent ~30 entrées (marché en premier) — c'est une fonctionnalité,
  pas un nettoyage ; elle demande des clés de traduction et des tests dédiés.

## 8. Vérifications honnêtes

| Vérification | État |
| --- | --- |
| Équivalence de cascade avant/après | ✅ SHA-1 `aa5c0bc…` identique sur 5 535 règles |
| Suite de tests | ✅ **830 / 0** (810 avant la phase + 20 garde-fous) |
| Navigateur, 1.16.11 | ✅ `test:browser:release11611` **9/9** (93 feuilles chargées, aucune 404, titre 13/15 px, état vide pleine largeur, icônes 40/52/72, plancher 11 px, 10 thèmes, 390 px sans débordement, console propre) |
| Navigateur, suites existantes | ✅ `ItemSpriteSize` 8/8, `PanelFit` 7/7, `DictionaryParity`, `BagAndPokemonInfoParity`, `Release11610` 7/7 |
| `MarketAndResponsiveTraining` | ❌ **échec antérieur** : vérifié sur un export propre de `a8042ac` dans `/tmp` — même assertion rouge (achat de 2 Poké Balls), donc étranger à cette phase |
| Audit de contraste sur le nouveau bundle | ✅ 147 paires, 0 sous AA |
| Audit i18n | ✅ 0 clé manquante |
| Chemins relatifs (`url()`) | ✅ tous résolus (1 bug réel corrigé sur `save-menu.css`) |
| Relecture des 92 bandeaux | ✅ générés avec rôle + place dans la cascade |
| Rendu des 10 thèmes | ✅ vérifié par test navigateur (10 couleurs de titre distinctes) |
| Captures avant/après des fenêtres retouchées par les P1 | ⚠️ captures **après** seulement (`artifacts/browser-11611/`) ; l'avant est la 1.16.10, encore disponible dans le ZIP précédent |
