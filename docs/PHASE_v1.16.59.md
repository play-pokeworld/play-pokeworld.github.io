# PHASE 1.16.59 — passe catalogue v31 (09/11)

> Réponse point par point au lot de retours du 09/11 après la livraison de la feuille de validation.
> **Le jeu n'est pas modifié** : chaque point est une correction du catalogue pour l'aligner sur ce
> que le jeu affiche déjà. Aucun fichier de `src/` ni de `assets/css/` n'est touché, d'où l'absence de
> portage et de nouvelle paire jeu ⇄ jeu.

## Les onze points

| # | Retour | Ce qui a été fait |
|---|---|---|
| 1 | « Global, enlève les nombres/textes écrits à droite du header » | Le paramètre `right` disparaît de `Win` et de `Fullscreen` : plus aucun écran ne peut en dessiner. Les libellés des 10 écrans concernés sont supprimés (Sac « 115 objets », Boîte PC, Pokédex, Marché, « Boutique de Jadielle », Badges, Dictionnaire, Atoll, Succès, fenêtre Carte « Région Kanto »). La croix prend le `margin-left:auto` que le texte portait. |
| 2 | « Boutique, marché, atoll boutique : la zone du compte d'objets en carré, pas en cercle » | Précision demandée : c'est la **quantité « 1 »** de la barre du bas. `<span class="chip qty">` + `.foot .chip.qty{border-radius:7px;min-width:44px}` — la forme carrée de `.pw-shop-qty` en jeu, dans les trois barres d'achat. |
| 3 | « Sac : enlève le nombre d'objets du header » | Fait par le point 1. |
| 4 | « Boîte PC : enlève le nombre de Pokémon du header » | Fait par le point 1. |
| 5 | « Pokédex : enlève le nombre de Pokémon du header » | Fait par le point 1. |
| 6 | « Marché : enlève le nombre d'offres du header » | Fait par le point 1. |
| 7 | « Boutique : enlève le nom de la boutique du header » | Fait par le point 1. |
| 8 | « Badges : la grille doit ressembler à celle de PokéWorld rework » | `badgesBody()` réécrit sur `UIBadgeCard` + `components/badges.css` : emblème réel (`assets/images/badges/*.svg`), nom sur bandeau clair pleine largeur, dresseur puis ville sur deux lignes, plus de mention « Obtenu / À obtenir », **24 badges puis 3 ligues** avec leurs compteurs de groupe, tuile `repeat(auto-fill,minmax(112px,1fr))` comme en jeu. |
| 9 | « Dictionnaire : enlève le nombre d'entrées du header » | Fait par le point 1. |
| 10 | « Atoll : j'aimerais voir les différents centres de combat » | Quatre cadres créés : `atoll-tour`, `atoll-usine`, `atoll-arene`, `atoll-dome` (56 → 60). Contenu **relevé sur le jeu** (`AtollFullscreenPanel`) : en-tête du jeu + carte Jetons Atoll, bloc de description du format, pastilles de rotation, cartes de format (rang, règle, équipe adverse ou prêtée, légendaires bannis pour la Finale du Dôme, bouton Combattre). |
| 11 | « Starter régional : pas de nom de dresseur, et le texte dépend de la région et du professeur » | `starterCards()` prend maintenant `title` et `withName`. Le cadre régional passe en **Johto** : « Bienvenue à Johto ! Le Prof. Orme vous attend à Bourg Geon. », « Choisissez votre Starter Johto ! », sans champ de nom, avec Germignon / Héricendre / Kaiminus. Le nom de dresseur ne reste que sur le premier choix (`starter`). |
| 12 | « Menu de navigation : arrondi en bas seulement » | `.navmenu` passe à `border-radius:0 0 var(--pw-window-radius) var(--pw-window-radius)` — exactement `.pw-nav-panel` en jeu. |

## Un correctif non demandé, mais visible

En 390, un sélecteur à six pages (Atoll et ses quatre centres) affichait ses libellés **coupés** :
`overflow:hidden` sur une pastille de 88 px. Le libellé passe désormais à la ligne
(`.segx .s{height:auto;min-height:32px;white-space:normal}`) dans la requête de conteneur 429 px.

## Feuille de validation

`catalogue/VALIDATION_A_VALIDER.html` est régénérée : **3 points globaux + 56 points sur 14 écrans**,
un verdict par écran, export texte. La copie autonome livrée avec le zip contient le catalogue dans le
même fichier (dessin latéral, bouton « Voir le cadre »), donc elle s'ouvre par double-clic, sans dépôt
ni serveur.

## Ce qui n'est pas fait, et pourquoi

- **Le jeu n'est pas retouché** : il portait déjà la bonne version de chacun de ces onze points
  (en-têtes sans texte à droite, `pw-shop-qty` carré, grille `UIBadgeCard`, panneau de navigation
  arrondi en bas, starter régional sans nom et textes par région déjà présents dans
  `localization/*/ui.js`). Les modifier aurait été un pas de plus que demandé.
- **Largeur des cadres** : le catalogue dessine en 1280 et le jeu en 960, donc les grilles fluides
  donnent plus de colonnes au catalogue (badges : 10 au lieu de 7). Les cartes, elles, sont identiques.
- **Starter régional** : en jeu les starters sont des **rangées** horizontales, au catalogue des
  **cartes verticales** (le composant du starter validé). Différence signalée, pas tranchée : elle
  demande ta décision.
- La différence « Accueil Atoll » (liste de tickets au catalogue, quatre grandes tuiles en jeu) n'est
  pas touchée : tu ne l'as pas demandée, et c'était peut-être le dessin cible.

## Vérifications

- `npm test` : **906 réussis / 0 échec** (aucun fichier de code touché).
- Catalogue parcouru en entier : **60 cadres × 3 périphériques**, 0 erreur JS, 0 cadre vide, 10 thèmes.
- Copies autonomes rouvertes **hors ligne** (`file://`, toute requête réseau refusée) : 60 cadres,
  **0 image cassée**, 0 requête sortante.
- Paires catalogue ⇄ jeu : `PASSATION/shots/2026-11-09/catalogue-v31/` (9 fichiers).
