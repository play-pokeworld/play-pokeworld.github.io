# Analyse — que contient `assets/css/design-system.css`, et pourquoi 15 700 lignes ?

> Question posée en 1.16.10 : « quel est le vrai problème avec `design-system.css` et qu'est-ce qu'il
> contient ? », alors que l'architecture annonce « une feuille de style par panneau ».
>
> Tout ce qui suit est **mesuré** sur l'état livré en 1.16.10, pas estimé.

## 1. Les chiffres

| Mesure | Valeur |
|---|---|
| Fichiers CSS | **43** |
| Lignes CSS au total | **25 194** |
| `design-system.css` | **15 687 lignes** = **62 %** du CSS du jeu |
| 2ᵉ fichier | `panels.css` — 2 649 lignes |
| 3ᵉ fichier | `facilities.css` — 944 lignes |
| Règles dans `design-system.css` | **3 881** |
| `!important` | **2 409** (0,62 par règle) |
| Sélecteurs définis plus d'une fois | **413** (soit **617** redéfinitions) |
| Redéfinitions qui réécrivent une propriété déjà posée | **476 / 617 (77 %)** |
| Marqueurs de correctif (« Wave 34 », « DS2819 », « PASSE 38c »…) | **127** (55 libellés distincts) |
| Jetons `--variables` distincts | **151** |
| Blocs `@media` / `@keyframes` | **60** / **37** |
| Blocs de commentaires | **823** |

Autrement dit : **un fichier sur un seul fait deux tiers du CSS**, et **plus des trois quarts de ses
redéfinitions existent pour annuler une règle écrite plus haut dans le même fichier**.

## 2. Ce qu'il contient réellement

1. **Les jetons** (~150 variables) : palettes des 9 thèmes (`:root` + `[data-theme=…]`), couleurs de
   types (18), rayons, espacements, ombres, surfaces, couleurs de texte. C'est la partie légitime et
   irremplaçable : tout le jeu en dépend.
2. **Les primitives partagées** : `.pw-*` (boutons, chips, lignes, grilles, barres de progression,
   disque canonique des sprites `.pw-poke-circle-wrap/bg/img`, fenêtres, onglets, états vides…).
3. **Les thèmes** : 9 blocs de palette + les corrections de lisibilité par thème (contraste, encres).
4. **Les blocs de panneaux déguisés en design system** : `#battle-team-row` (**172 règles**),
   `#team-window-body` (58), `#poke-modal-inner` (52), `#settings-inner` (31), `.dict-entry` (25),
   `.training-*` (≈60), `.save-slot` (17), `#map-svg` (16)… Ces règles devraient vivre dans le CSS de
   leur panneau ; elles sont ici parce qu'elles devaient gagner une guerre de spécificité.
5. **Les « passes » correctives** : 127 blocs datés en fin de fichier (`DS2807`, `Wave 33`, `PASSE 39`…)
   qui, chacun, neutralise une règle posée plus haut (souvent en ajoutant `!important`).

## 3. Le vrai problème, en une phrase

Ce n'est pas « trop de CSS » : c'est que **le fichier sert à la fois de source de vérité et de couche de
correction**, et que la deuxième partie ne cesse de grossir parce qu'elle doit battre la première.

Trois symptômes mesurables, tous dus à la même cause :

1. **`!important` en escalade** — 2 409 occurrences. Une règle de panneau doit passer au-dessus des
   règles génériques (`#poke-modal-inner * { color: … }` a une spécificité de 1,0,0), donc on ajoute
   `!important`, donc la correction suivante doit ajouter `!important` **et** arriver plus bas.
2. **Doublons de sélecteurs** — 413 sélecteurs écrits plusieurs fois, `.save-menu-screen` **9 fois**,
   `#battle-team-row` **8 fois**. Personne ne peut dire, à la lecture, quelle règle gagne : il faut
   simuler la cascade à la main.
3. **Contradiction avec l'architecture annoncée** — `panels.css`, `pokedex.css`, `facilities.css`,
   `ui-modal.css`… existent bien, mais les overrides qui les contredisent sont dans
   `design-system.css`. Deux fichiers décrivent donc la même fenêtre, et le plus bas dans la cascade
   gagne.

C'est exactement ce qui a coûté du temps en 1.16.8 (image d'objet écrasée par un `width:100%
!important`) et en 1.16.9/1.16.10 (le disque du sprite qu'il fallait neutraliser localement).

## 4. Ce qui a été fait, et ce qui ne l'a pas été

**Fait en 1.16.10** : le nouveau bloc de la carte de sauvegarde est isolé et nommé (`DS-v1.16.10`), il
ne touche qu'un sélecteur (`save-card-avatar`), et il a fallu **quatre** déclarations pour neutraliser
le disque et l'image — c'est un exemple concret du problème, pas sa solution.

**Fait en 1.16.10 (bonus)** : 5 règles s'appuyaient sur des jetons inexistants (`--pw-shadow-lg`,
`--bg-card`, `--border`) ; leurs déclarations étaient silencieusement ignorées par le navigateur (les
fenêtres modales n'avaient aucune ombre). `--pw-shadow-lg` est maintenant déclaré, les autres
remplacés par les jetons canoniques.

**Pas fait, volontairement** : une réécriture complète. Le risque est trop grand pour un gain
invisible. La voie proposée (déjà dans `AUDIT_v1.16.9.md` §3.2) reste la bonne :

1. **Interdiction d'augmenter** : un test qui compte les `!important` et les redéfinitions de sélecteur
   et échoue si le total monte. Le stock baisse alors mécaniquement, version après version.
2. **Rapatriement à l'occasion** : chaque fois qu'une fenêtre est retouchée, ses règles remontent dans
   son fichier et l'override correspondant disparaît de `design-system.css`.
3. **Ordre de priorité par volume** : `#battle-team-row` (172 règles), `.training-*` (~60),
   `#team-window-body` (58), `#poke-modal-inner` (52) — soit ~340 règles, un quart du fichier, pour
   quatre fenêtres.
4. **Un seul vocabulaire visuel** avant de déplacer quoi que ce soit : 9 classes de titres de section,
   16 classes d'état vide, 22 boutons différents (audit §3.1). Déplacer 172 règles qui expriment trois
   vocabulaires ne fait que déplacer le problème.

## 5. Comment reproduire ces mesures

```bash
# volume par fichier
wc -l assets/css/*.css | sort -n | tail -12
# règles, !important, doublons de sélecteurs
node -e "const s=require('fs').readFileSync('assets/css/design-system.css','utf8');
const r=[...s.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const m=new Map();for(const [,sel] of r){const k=sel.trim();m.set(k,(m.get(k)||0)+1);}
console.log({rules:r.length,important:(s.match(/!important/g)||[]).length,
 duplicates:[...m.values()].filter(v=>v>1).length});"
# contraste (rejouable)
node tools/contrast-audit.mjs --check
```
