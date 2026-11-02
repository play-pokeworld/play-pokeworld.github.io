# Phase 1.16.2 — Le panneau Lieu débordait de son cadre

> Correctif de mise en page signalé après la livraison 1.16.1 : dans le panneau **Lieu**, les encadrés,
> les textes et les grilles sortaient du panneau dès qu'il était réduit. `Rules.md` §5 est explicite :
> *« Every panel must fit its available width (…) Grid tracks may not impose a minimum wider than their
> container (…) never hide or clip overflowing content »*.

---

## 1. Le problème

Sur certaines destinations — celles qui affichent la carte **Sanctuaire** (Ruines Désert/Regirock,
Pilier Céleste, Île Mirage…), le contenu du panneau Lieu devenait plus large que le panneau : le titre,
le bilan du lieu, les boutons d'action, la grille des Pokémon sauvages et celle des objets sortaient
visiblement du cadre, avec un débordement de **+100 à +120 px** sur une colonne de bureau étroite
(panneau de 211 px).

## 2. Cause racine (une seule)

Le panneau Lieu est une grille à une colonne (`.pw-loc-info`). Une piste de grille se dimensionne par
défaut sur le **contenu minimal** de ses enfants (`minmax(auto, 1fr)`). La carte Sanctuaire avait un
contenu minimal de **332 px** :

- `.pw-loc-sanctuary-row-action .pw-btn { min-width: 130px; white-space: nowrap }` — largeur figée,
- une ligne `flex` sans retour à la ligne (`info` + bouton côte à côte, `gap: 12px`),
- soit 130 + 12 + 124 (texte le plus long) + 20 (padding de ligne) + 24 (padding de carte) ≈ 312-332 px.

Une fois la piste fixée à 332 px, **tous** les frères (titre, bilan, actions, grilles) étaient étirés à
cette largeur : le débordement venait d'un seul élément et contaminait tout le panneau.

Un second cas de la même famille existait dans le panneau **Équipe** : la ligne d'en-tête des cartes
(`.poke-name`) ne pouvait pas se replier, le bouton « Ranger » sortait de la fenêtre (+12 px à 1100 px,
+62 px à 900 px).

## 3. Correctif

Aucune structure changée, aucun composant modifié, aucun texte masqué ou tronqué : uniquement les
feuilles de style (`assets/css/panels.css`), dans la section Lieu/Équipe déjà présente.

| Règle | Effet |
|---|---|
| `.pw-loc-info { grid-template-columns: minmax(0, 1fr) }` | la piste ne peut plus dépasser la largeur du panneau, quel que soit l'enfant |
| `.pw-loc-sanctuary-row { flex-wrap: wrap }` | la ligne se replie : le bouton passe sous le texte quand la place manque |
| `.pw-loc-sanctuary-row-info { flex: 1 1 132px; min-width: 0 }` | le bloc texte cède la place au lieu de pousser |
| `.pw-loc-sanctuary-row-action { flex: 1 1 auto }` + `.pw-btn { min-width: min(130px, 100%) }` | le bouton reste atteignable, jamais plus large que sa carte |
| `@container (max-width: 250px)` sur la carte | sous 250 px, le bouton prend toute la largeur disponible |
| `.pw-loc-sanctuary-* { min-width: 0; overflow-wrap: anywhere }` | les libellés longs (noms de reliques, de zones) passent à la ligne |
| `.team-view .poke-name, #team-window-body .poke-name { flex-wrap: wrap; min-width: 0 }` | l'en-tête des cartes d'équipe se replie au lieu de sortir de la fenêtre |

Le rendu large est conservé : quand la place le permet, le bouton reste à droite de son texte.

## 4. Vérification

Nouveau test navigateur `tests/browser/PanelFit.mjs` (`npm run test:browser:fit`) — **7/7** :

- 9 largeurs (1440, 1280, 1100, 900, 768, 620, 480, 390, 360) × 12 lieux représentatifs (dont 3
  sanctuaires, donjon, safari, manoir) : **aucun** élément d'aucune fenêtre du tableau de bord ne
  franchit le bord de sa fenêtre ;
- la carte Sanctuaire reste dans le panneau, son bouton reste dans la carte, et le panneau n'a
  **aucun** débordement horizontal (`scrollWidth - clientWidth = 0`) ;
- le bouton reste visible et cliquable à 390 px ;
- la page ne défile jamais horizontalement, à aucune largeur ;
- en **anglais** (libellés plus longs), tout tient encore ;
- console et réseau propres.

Le test a été validé dans les deux sens : il **échoue** sur l'ancienne feuille de style (débordement
signalé à 1280, 1100, 900… sur `pw-loc-overview`, `pw-loc-play-stats`, `pw-loc-wild-grid`) et passe
après le correctif. Il devient donc un garde-fou : toute régression future de mise en page est bloquante.

Contrôles complémentaires relancés : `npm test` → **722/0** ; `test:browser:baginfo` (18), `debugbox` (6),
`market` (21), `language` (8) → tous verts.

## 5. Reste ouvert

- Le balayage de `PanelFit` couvre 12 lieux et toutes les fenêtres du tableau de bord ; un lieu non
  listé peut encore révéler un cas, mais la cause structurelle (piste de grille non bornée, ligne
  non repliable) est traitée et documentée dans `Rules.md` §5.
- Les fenêtres plein écran (Sac, Pokédex, Dictionnaire) ont leurs propres tests de non-débordement.
