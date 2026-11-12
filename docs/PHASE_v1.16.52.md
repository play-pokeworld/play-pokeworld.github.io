# Phase 1.16.52 — toutes les autres fenêtres

Cette passe termine la reprise d'affichage : après les pleines pages en 1.16.51, ce sont les
**fenêtres** (modales, dialogues, menus) qui rejoignent la grammaire du catalogue. Aucune règle de
jeu n'est touchée.

## La décision qui tient tout le reste

Une fenêtre était dessinée avec trois surfaces et deux filets différents : le panneau en
`--pw-surface` (gris moyen), un bord crème `color-mix(light2 22%)`, puis une bande de titre
elle-même cerclée de crème, et un `2px` crème sous cette bande. Le catalogue, lui, empile trois
marches et un seul filet :

| Rôle | Jeton | valeur |
| --- | --- | --- |
| page d'un plein écran | `--pw-bg-page` (nouveau) | `#14120F` |
| fenêtre flottante | `--pw-bg-surface` | `#24221E` |
| carte / ligne / cellule | `--pw-bg-header` | `#1C1A17` |
| creux (champ, puits de sprite) | `--pw-bg-sprite` | `#191714` |
| filet | `--pw-border-color` | `#4A3E31` |

`--pw-border` devient un **alias** de `--pw-border-color` (45 règles le lisent, aucune n'est
réécrite), `--pw-radius` un alias de `--pw-window-radius`, `--pw-bg-inset` de `--pw-bg-sprite` et
`--pw-border-soft` du filet. La bande de titre passe de `2px` crème à `1px` du filet
(`--pw-border-panel-header`). Un seul changement de jeton redessine donc les douze fenêtres à la
fois, ce que la passe précédente n'avait pas pu faire écran par écran.

## Le bouton, enfin décrit une fois

`.hbtn` était repaint successivement par : une base crème `--light1`, une règle de rayon 10 +
graisse 900, un survol `filter: brightness()`, une paire active en `!important`, puis un
**blanchiment universel** vivant dans `panels/automation.css` — une chaîne de onze `:not()` avec
`background: var(--pw-btn-bg) !important` qui repeignait tous les boutons du jeu depuis un écran
qui n'en avait pas la charge. Toutes ces couches sont supprimées ; une seule règle subsiste :

    .hbtn { background: var(--pw-bg-surface); border: 1px solid var(--pw-border-color);
            border-radius: var(--pw-radius-sm); font-weight: 600; }

Le survol répond sur le filet, l'état actif sur `--pw-btn-active-bg`. La variante danger prend le
rouge du catalogue (`#DB5B4A`, `--pw-accent-danger`) et perd ses `!important`.

## Les bandes de catégorie

`Tous / Shiny / Non shiny` du sac, de la boîte et des succès, et les onglets du dictionnaire,
suivaient deux familles (l'une à `--pw-btn-bg` avec filet, l'autre en pastille `--dark2`). Le
catalogue dessine son sélecteur `.segx` en pastilles `r18` sur la page, l'actif prenant
`--light1`. Les trois familles sont maintenant une seule règle, sans `!important`.

## Écran par écran

| Écran | Avant | Après |
| --- | --- | --- |
| Menu de sauvegarde | deuxième feuille hors échelle typographique (17 tailles en px, dérogation dans `StyleVocabulary.test.js`) ; carte 330×198 à hauteur fixe qui coupait « Cliquer pour continuer » ; balayage lumineux au survol | Logo sur un cran `--pw-font-size-hero` du barème, carte en `min-height` (elle grandit), `r10` + filet, tuiles internes `r8/r10` sur `--pw-bg-sprite`, identifiant en ligne (plus de pastille noire) |
| Fiche Pokémon | coquille `rgba(83,97,122,.28)` `r12` contenant cinq panneaux `rgba(0,0,0,.22)` cerclés `rgba(148,136,107,.35)` ; onglets en pastille accent pleine ; rang en cadre vert `2px` avec lettre 68 px et halo ; types en blocs pleine largeur ; boutons en pointillés | Coquille sans fond, cartes `--pw-bg-header` + filet `r10` ; onglets en pastilles de la famille (`r8`, actif = filet accent) ; rang en carte neutre, la couleur ne vivant que sur la lettre (40 px, `r8`) ; types en pastilles de la taille du mot ; boutons `r8` de 34 px ; rangée de capacité sur filet neutre, barre de type à gauche |
| Fiche objet / détail dictionnaire | `.pw-card-dark` lavé de noir, `.pw-info-section` `rgba(0,0,0,.22)`, `.pw-src-line` en `--dark3` | carte d'en-tête + filet, ligne de source en ligne du corpus |
| Équipe (fenêtre) | `.pw-team-modal-card` plaque noire + cadre crème | carte `--pw-bg-header` + filet |
| Réglages | fenêtre en `--pw-surface` ; aperçu de sauvegarde avec filets blancs `rgba(255,255,255,.24/.12)` et `r18/r12` ; portrait `rgba(0,0,0,.18)` | fenêtre `--pw-bg-surface` `r10` ; aperçu aligné sur la carte du menu ; portrait sur surface d'en-tête |
| Guide | cartes et boutons en lavis crème 12 % + filet crème 35 %, survol qui soulève | cartes `--pw-bg-header` + filet, actions 34 px `r8`, aucun déplacement |
| Boutique / Marché | tuiles en lavis blanc, sélection en `outline` | tuiles `--pw-bg-header` + filet, sélection sur le filet accent ; portefeuille en pastille `--pw-bg-surface-elevated` |
| Base secrète | salle sur `#171b1f` avec filet crème | puits `--pw-bg-surface` + filet |
| Combat / résumé | `#battle-summary-inner` en `--pw-surface` `r12`, butin en `--dark2` | fenêtre `--pw-bg-surface` `r10`, butin en carte + filet |
| Pokédex | carte de synthèse contenant une seconde carte encadrée | une seule carte ; la progression est une ligne de cette carte |

## Preuves

- `npm test` : **906 / 0** (901 + 5 gardes statiques ajoutés, voir plus bas).
- `tools/measure/audit-all-windows.mjs` : chaque fenêtre ouverte sur une sauvegarde neuve, seule la
  dernière couche visible mesurée, **aucune erreur de page**. Toutes les fenêtres atteignables ne
  peignent plus que : `bg=rgb(36,34,30)` (fenêtre), `rgb(28,26,23)` (carte), `rgb(25,23,20)`
  (creux), `rgb(54,52,47)` (surélévé) et `border=1px rgb(74,62,49)`.
- `tools/measure/audit-reachable-windows.mjs` (**nouveau**) : ouvre par l'interface les fenêtres que
  l'audit générique ne peut pas atteindre (détail dictionnaire, détail Pokédex, choix de Ball,
  éditeur de preset, sélecteur d'icône, cible d'objet, apprentissage de capacité, énigme).
- `tools/measure/audit-pages.mjs` : rien à signaler sur les pages.

## Ce qui n'a pas pu être vu

Comme en 1.16.51, trois écrans restent **portés sur source mais pas vus rendus** : Marché et Atoll
(contenu vide sur une sauvegarde neuve) et Atoll / Laboratoire de fossiles / FlorÈs (états de
progression inaccessibles). Le menu « gérer » des bâtiments n'affiche rien de peint au-delà de la
fenêtre, ce qui est le résultat attendu.

## Fichiers

`core/tokens.css`, `core/base.css`, `components/{ui-modal,ui-panel,ui-button,ui-input,ui-progressbar,cards,chips,modal-sizes}.css`,
`layout/{window-chrome,header-bar}.css`, `panels/{save-menu,pokemon-sheet,team,team-moves,secret-base,settings,guide,shop,battle-summary,automation,dictionary,pokedex}.css`,
`tests/{InterfaceGrammar,StyleVocabulary}.test.js`, `tools/measure/audit-reachable-windows.mjs`.

## Les cinq gardes ajoutés à `InterfaceGrammar.test.js`

1. la page, la fenêtre et le filet sont des jetons du corpus (et aucun `2px` de bande ne survit) ;
2. la famille de boutons est décrite **une** fois, sans `!important` de peinture, et
   `automation.css` ne repeint plus `.hbtn` ;
3. `.tab`, `.dict-tab` et `.inv-tab` sont une seule famille, actif en `--light1` ;
4. un champ est un creux de la page, cerclé du filet partagé ;
5. le menu de sauvegarde est sur le barème — et sa dérogation dans `StyleVocabulary.test.js` est
   supprimée, sinon le test passerait à tort.
