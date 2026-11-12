# Phase 1.16.54 — les trois régressions signalées, le fond, la carte, la police

Cette passe ne cherche pas à avancer sur le catalogue : elle répare ce que la passe 1.16.53 a cassé,
et elle livre l'état des affichages demandé (`docs/STATUT_AFFICHAGES.md`).

## 1. Le fond de jeu peint ne s'affichait plus

Le paysage du jeu — ciel, horizon, herbe, sol, plus la ligne d'arbres, les bosquets et les rochers —
est peint par trois pseudo-éléments : `body::after` (le dégradé, teinté par l'heure du jour),
`html::before` / `html::after` (rochers et arbres) et `#pw-land-fg`. La passe 1.16.53 avait écrit
`content: none` sur `body::after` et `body::before` pour rendre la page plate comme le cadre du
catalogue : les deux couches les plus visibles avaient donc disparu, et le décor se réduisait à un
aplat `#101012`.

Les deux règles sont restaurées, ainsi que l'animation `bg-scroll` de la bande pixel.

Trois vérifications faites :

- les **4 moments de la journée** (aube, jour, crépuscule, nuit) sur le thème sombre et le thème
  clair : `grammaire11654/fond-4-heures-{dark,light}.png` ;
- les **10 thèmes** avec le décor seul : `grammaire11654/land-*.png` ;
- le thème `contrast`, dont les arbres et les rochers étaient dérivés de jetons proches du noir et
  donc invisibles : il reçoit un décor explicite (`--pw-land-tree: #2A2A2A`, `--pw-land-rock:
  #C9C9C9`, `--pw-land-rock-bg: #1C1C1C`) en accord avec le nom du thème.

## 2. Les cartes de sauvegarde avaient perdu leur beige

Deux choses avaient changé au fil des passes : la zone de sprite de la carte était peinte sur une
surface sombre, et les lignes secondaires de la carte étaient forcées sur un or terne (`#c9bc8a`)
qui ne ressemblait plus au titre.

- `.save-slot-icon` : fond `--light1` (beige) et filet beige translucide ; la marque « pas de
  sauvegarde » passe en sombre pour rester lisible sur le beige ;
- `.save-slot-id`, `.save-slot-bottom`, `.save-slot-stats small` : `--light2`, le beige du titre.

La carte garde sa palette propre (elle est la même sous les 10 thèmes), seul le beige revient.
Capture : `grammaire11654/save-menu.png`.

## 3. La police du jeu

`--pw-font-main` avait été pointé sur la pile du catalogue (`system-ui, -apple-system, "Segoe UI"`).
C'était une lecture fausse du principe : le catalogue est la référence pour **la grammaire d'un
composant** (surfaces, filets, rayons, échelle typographique, anatomie), pas pour **la police du
produit**. `Winky Sans` est restaurée, avec sa déclaration `@font-face` dans `core/fonts.css`.

Les bornes de graisse fixées en 1.16.53 restent (700 / 800, jamais 900) : si le résultat te paraît
trop fin, c'est un réglage d'une ligne par famille de titres, dis-le-moi.

## 4. État des affichages

`docs/STATUT_AFFICHAGES.md` remplace la liste « vérifié / non vérifié » de la passe précédente par
un tableau à quatre statuts, ligne par ligne, pour les 56 affichages du catalogue :

- ✅ **validé catalogue** — paire rendue côte à côte (2 affichages : le tableau de bord, et le
  couple Raccourcis / Monnaies qui s'y voit) ;
- 🔧 **fait, à valider** — retouché, pas encore comparé ;
- 🟡 **en jeu, hors catalogue** — aucune référence à valider ;
- ⛔ **écart identifié** — comparé, et non conforme (Sac, Boîte PC, Pokédex, Marché).

Le document liste aussi les 11 écrans du jeu que le catalogue ne montre pas, et l'ordre de travail
proposé pour la suite.

## Vérifications

- `npm test` — **906 réussis, 0 échec** (le test « Cross-STAB combo » est instable, relancé une fois).
- Aucune erreur de page dans les captures.
