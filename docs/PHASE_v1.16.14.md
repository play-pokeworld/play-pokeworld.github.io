# Phase 1.16.14 — Réorganisation CSS : un fichier, un objet

## 1. Le problème

`Rules.md` §7 promettait « un fichier, une responsabilité », mais la feuille réelle faisait le
contraire : 23 fichiers `design-system/pass-*.css` (~700 lignes chacun) empilés par date, mélangeant
des déclarations de composants, de panneaux et de thèmes. Ajouter une règle revenait à choisir une
« passe » au hasard, et retrouver qui peignait un élément demandait de lire 25 780 lignes.
1 106 commentaires, dont 420 en français, racontaient l'historique des corrections au lieu
d'expliquer les contraintes.

## 2. Ce qui a été fait

Réécriture complète de `assets/css` par un générateur (`tools/css-reorg/`, conservé pour la
traçabilité de cette phase) :

| | avant (1.16.13) | après (1.16.14) |
|---|---|---|
| feuilles | 73 | **82** |
| lignes | 25 780 | 38 153 |
| règles | 5 667 | 5 844 |
| commentaires | 1 106 | **248** |
| commentaires français | 420 | **0** |
| `!important` | 2 694 | 3 806 |
| feuilles « catch-all » | 23 passes + 4 blocs `panels-0x` | **0** |

- **Quatre dossiers, un objet par fichier** : `core/` (8), `layout/` (5), `components/` (30),
  `panels/` (39). Les feuilles devenues vides après le reclassement ont été supprimées, manifeste à
  l'appui. `design-system/` n'existe plus ; les règles des passes ont été redistribuées dans
  la feuille de l'objet qu'elles habillent (`ui-button.css`, `badges.css`, `settings.css`…).
- **Propriété par propriété** : chaque règle a été classée par le module qui écrit la classe dans
  `src/**/*.js` (3 069 jetons de classes relevés), puis par une table d'objets explicite, puis par
  motif. Aucune règle n'a été perdue : 455 règles mortes (classes absentes du code, de `index.html`
  et des tests) ont été supprimées, 0 règle orpheline.
- **Cascade préservée** : une règle qui liste des sélecteurs appartenant à plusieurs objets est
  copiée dans chaque feuille propriétaire, à la position qu'elle occupait dans la cascade de
  référence. C'est l'origine de l'augmentation du nombre de `!important` (+41 %) : rien n'a été
  ajouté, des déclarations partagées sont simplement dupliquées dans chaque feuille concernée.
- **Commentaires** : seuls les commentaires qui expliquent une contrainte (« pourquoi ») sont
  conservés, en anglais. Les journaux de corrections (« wave 33 », « passe 14 ») sont supprimés —
  ces documents les remplacent.
- **Ordre du manifeste** : c'est la cascade. Deux règles de même spécificité qui se disputent une
  propriété sont tranchées par l'ordre des feuilles, jamais par la spécificité. L'ordre des feuilles
  a donc été corrigé là où la mesure le réclamait, jamais « au feeling ».

## 3. Vérifications

- `npm test` : **852 tests, 0 échec** (suite complète, y compris les contrôles de structure CSS
  réécrits pour le nouveau contrat : import manquant, feuille orpheline, en-tête absent, feuille
  > 1 700 lignes, nom de feuille de type `pass-*`/`misc`/`shared`, commentaire français, `url()`
  relative cassée).
- **Empreinte de rendu** (`tests/browser/CssFingerprint.mjs`, 43 écrans, 187 559 éléments, 100+
  propriétés calculées + géométrie) : comparaison 3 références → après, avec neutralisation des
  valeurs instables d'une exécution à l'autre :

  ```
  compared: 189613 stable values, 3243 ignored (unstable run-to-run)
  changed: 43 element(s), 0 selector(s)
  ```

  Ces 43 éléments sont **ceux déjà instables avant la réorganisation** (éléments des fenêtres
  fossiles et du résumé AFK, qui dépendent d'un tirage aléatoire du contenu) : le profil est
  identique à la mesure de référence de la version 1.16.13. Aucun sélecteur ne diffère.
- Suites navigateur relancées : `Release11613.mjs` 7/7, `BagAndPokemonInfoParity.mjs` (toutes
  vertes), `PanelFit.mjs` 7/7. `FacilityParity.mjs` échoue sur
  `#fs-pokedex .pw-pokedex-detail-title` — **vérifié identique sur l'arbre 1.16.13** (échec
  antérieur, sans rapport avec cette phase).
- Outils ajoutés pour cette vérification : `tests/browser/CssTies.mjs` (détecte les égalités de
  cascade, c'est-à-dire les éléments dont le gagnant dépend de l'ordre des feuilles) et
  `tests/browser/CssWinner.mjs` (demande à Chrome *quelle* règle peint réellement une propriété, et
  où elle se trouve). Ce sont eux qui ont mis au jour les trois vraies causes des écarts
  intermédiaires : l'ordre des fichiers n'était pas l'ordre du manifeste (`components/` est importé
  après `design-system/`, pas avant), les listes de sélecteurs `:is(.a, .b)` étaient coupées sur
  leurs virgules internes, et `.is-hidden` perdait contre un `display: flex !important` plus
  spécifique uniquement à cause de sa position.

## 4. Ce qui n'a pas été vérifié, et ce qui reste

- **Pas de capture d'écran pixel par pixel** : la parité est mesurée sur les propriétés calculées et
  la géométrie (largeur/hauteur arrondies), pas sur une image. Un décalage de rendu typographique
  inférieur au pixel ne serait pas détecté.
- Les 43 éléments « fossiles/AFK » restent instables d'une exécution à l'autre, avant comme après.
  Ce n'est pas une régression, mais ce n'est pas une preuve de stabilité non plus : le tirage
  aléatoire du contenu n'a pas été neutralisé.
- Le générateur `tools/css-reorg/` reste dans le dépôt comme trace de la transformation. **Il ne doit
  plus être relancé** : `assets/css` est désormais la source de vérité, et une nouvelle exécution
  écraserait les corrections manuelles (dont `:not(.is-hidden)` sur `.poke-card .poke-status`).
- La duplication de règles partagées entre plusieurs feuilles (≈ +1 100 déclarations) est assumée :
  c'est le prix de « une feuille = un objet » sans casser la cascade. Une passe ultérieure pourra
  factoriser les règles réellement communes en objets dédiés (par exemple `components/badges.css`
  porte déjà toute la palette des types).

## 5. Reste ouvert (hors périmètre de cette phase)

- `docs/POLISH_v1.16.11.md` P1 3.1 (boutons) et P1 3.5 (recherche texte) : toujours ouverts.
- Les propositions d'équilibrage attendent toujours une validation.
- Les clés `tutorial_hint_*` ne sont toujours pas vérifiées en jeu.
