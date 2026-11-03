# Phase 1.16.15 — Le tutoriel dit exactement quoi faire

**Date :** 3 novembre 2026
**Branche :** `Rework`
**Origine :** retour de jeu sur la 1.16.14 — « dans ce qui a été changé, des bonnes choses ont été
supprimées : on ne sait plus quelle Poké Ball activer, plus besoin d'ouvrir les réglages de filtres,
et le halo pointe au mauvais endroit. Il faut refaire les formulations, et mieux indiquer sans en
faire trop. »

---

## 1. Ce qui était cassé (constat, pas symptôme)

| # | Symptôme visible | Cause réelle |
|---|---|---|
| 1 | Le halo de l'étape « Poké Ball » entoure l'**engrenage** des réglages | `TUTORIAL_TARGETS.set_pokeball_filter` visait `[data-tutorial="ball-filters"]`, c'est-à-dire le bouton qui ouvre l'éditeur de règles. Ce bouton n'a jamais été le geste demandé. |
| 2 | Le texte envoie « Fenêtre Poké Balls → engrenage, ou la ball grise » | Formulation issue de la précédente version ; la version 1.16.12 disait encore *quelle* ligne et *quelle* ball, la réécriture a coupé cette précision. |
| 3 | Le bouton d'action de l'étape ouvre la fenêtre des **réglages de filtres** | L'action déclarée dans `TutorialRules` valait `ball_filters`, donc `StoryPanel` ouvrait `ModalIds.BALL_FILTERS` — encore un chemin vers l'éditeur, pas vers la Poké Ball. |
| 4 | L'étape « fiche Pokémon » halo sur un bouton invisible sur ordinateur | `.poke-card-info-btn` est masqué par `@media (hover: hover)` ; sur desktop le halo retombait silencieusement sur la carte entière. |
| 5 | La carte du tutoriel répétait la consigne sur ordinateur | `tutorial_hint_sheet_pc` valait « PC : icône ⓘ de la carte » (icône masquée sur PC) et `tutorial_hint_map_pc` répétait « Fenêtre Lieu » déjà écrit dans la consigne. |
| 6 | Récompenses annoncées fausses (texte jamais affiché, mais faux) | `tutorial_step_bag_reward` annonçait « +2 Potions » alors que l'étape donne **5 Poké Balls** ; le vocabulaire monétaire mélangeait « ₽ » et « Pokédollars ». |

Aucune de ces causes n'était dans le CSS : tout est dans les données du tutoriel, ses ancres DOM et
son texte. Le CSS de la 1.16.14 n'a pas été touché.

---

## 2. Décisions

1. **Le halo pointe le geste, pas le réglage.** Il n'existe qu'un seul endroit où l'on affecte une
   ball : la cellule « Ball » d'une ligne. La ligne visée est **« Nouveau »**, seule ligne qui compte
   pour un début de partie et celle que la sauvegarde neuve affiche avec une ball vide (grise).
2. **Les réglages de filtres ne sont plus jamais proposés** par le tutoriel : ni le halo, ni le texte,
   ni le bouton d'action. Ils restent accessibles à la main, comme avant.
3. **Un seul identifiant pour la ligne visée.** `TUTORIAL_BALL_ROW = 'new'` (`TutorialRules.js`) sert
   au texte (`{case}`), au bouton d'action (`BALL_PICKER` sur cette ligne) et au commentaire de la
   carte de halos. Le libellé affiché vient de `BallFilterPresets.labelKey()` via la localisation :
   si la ligne change de nom, le texte suit sans retouche.
4. **Les ancres sont des attributs, pas des classes.** `data-filter` sur la ligne, `data-tutorial`
   sur la cellule : un restyle ne peut pas casser le tutoriel (règle déjà en place depuis 1.16.12).
5. **Indication « sans en faire trop ».** Chaque étape garde quatre lignes : un titre (2–4 mots), une
   règle (une phrase), un chemin (une phrase avec le geste exact), une action (verbe + objet). Le
   rappel « mobile / PC » n'est conservé que là où il apporte une information : la barre du bas qui
   cache la fenêtre Lieu sur téléphone. Sur ordinateur, il ne s'affiche plus.
6. **La fiche Pokémon se clique sur la carte**, sur tous les supports : le bouton ⓘ n'existe que sur
   tactile, la carte ouvre la fiche partout. Le halo suit la carte.
7. **Les récompenses annoncées sont recalculées depuis `TutorialRules`**, pas recopiées à la main :
   elles sont désormais exactes, même si la carte ne les affiche pas encore (voir §5).

---

## 3. Modifications

### Données et systèmes

| Fichier | Modification |
|---|---|
| `src/config/TutorialRules.js` | `TUTORIAL_BALL_ROW = 'new'` exporté ; actions `set_pokeball_filter` et `honor_ball_intro` : `ball_filters` → `ball_picker`. |
| `src/systems/TutorialSystem.js` | Paramètre `{case}` injecté dans `how` pour les étapes « Poké Ball » et « première capture », depuis le libellé du preset. `pct` (taux réel de la Poké Ball) reste calculé depuis `ItemDB`. |
| `src/panels/StoryPanel.js` | Nouveau cas d'action `ball_picker` → `ModalOpenRequestedEvent(ModalIds.BALL_PICKER, { filterId: TUTORIAL_BALL_ROW })`. Le cas `ball_filters` n'était utilisé par aucune étape et disparaît. |
| `src/panels/PokeballsPanel.js` | `row.setData('filter', filter.id)` et `ballCell.setData('tutorial', 'ball-slot')`. |
| `src/ui/TutorialHighlight.js` | Étape « Poké Ball » : `#win-pokeballs [data-filter="new"] [data-tutorial="ball-slot"]` puis repli cellule, puis fenêtre. Étape « Honor Ball » : la fenêtre Poké Balls. Étape « fiche » : la carte, plus le bouton ⓘ. |
| `src/ui/TutorialDeviceHint.js` | Ne renvoie plus que l'indication mobile utile (fenêtre Lieu dans la barre du bas), vide sur ordinateur. |
| `src/panels/components/TutorialCard.js` | Une seule source d'indication (`route1`), plus de branche « sheet ». |

### Textes (FR + EN, 55 clés chacun)

Les dix étapes ont été réécrites dans le même registre, sans explication superflue :

| Étape | Ce qui change |
|---|---|
| Poké Ball | Nomme la ligne (« Nouveau ») et la ball vide grise ; le mot « engrenage » disparaît ; action « Choisir la Poké Ball ». |
| Première capture | Dit **quelle ball part** (« la ball posée sur « Nouveau » ») au lieu d'un renvoi générique à la Route 1. |
| Fiche Pokémon | « clique la carte du Pokémon » (geste réel sur les deux supports). |
| Sac / Pokédex | Chemin court : fenêtre Raccourcis → Sac / Pokédex. |
| Jetons de donjon | Dit d'où ils viennent (une capture) au lieu de répéter leur nom. |
| Donjon | Nomme le lieu (Forêt de Jade), le bouton (Explorer) et les touches (flèches). |
| Récompenses | `+5 Poké Balls` (au lieu de « +2 Potions »), `₽` partout (plus de « Pokédollars »), libellés des 10 étapes alignés sur `TutorialRules`. |

`guide_capture_current_desc` (FR/EN) précise en plus **comment** changer la ball : « clique la ball
d'une ligne pour la changer ; le sélecteur décrit chaque ball et affiche ton stock ». C'était la
précision perdue, et elle manquait aussi dans le guide.

---

## 4. Vérifications

| Contrôle | Résultat |
|---|---|
| `npm test` | **857 réussis, 0 échec** (852 en 1.16.14 ; +6 tests, −1 remplacé) |
| `tests/TutorialHighlight.test.js` | 3 nouveaux cas : le halo vise la cellule de la ligne « Nouveau » et **jamais** l'engrenage ; repli sur la fenêtre quand la ligne n'est pas encore montée ; la carte d'équipe pour l'étape fiche ; **la vraie fenêtre Poké Balls** porte les ancres attendues. |
| `tests/Tutorial.test.js` | 2 nouveaux cas : l'étape nomme la ligne à remplir et ne cite plus les réglages ; le bouton d'action ouvre `BALL_PICKER` sur la ligne « Nouveau » (et pas `BALL_FILTERS`). |
| `tests/UiWidgets.test.js` | L'indication de support n'apparaît plus deux fois ; le test de l'ancienne clé `tutorial_hint_map_pc` est remplacé. |
| `tests/FakeDom.js` | Le harnais comprend désormais les sélecteurs composés (`#id .classe[data-x="v"]`) ; auparavant un tel sélecteur ne matchait jamais, ce qui laissait passer ce type de régression. |
| Chromium réel (`tests/browser/Release11612.mjs`, script mis à jour) | **9/9** ; l'étape Poké Ball rend `ball-slot @ new`, halo sur la cellule 44 × 22 px, cases à cocher « engrenage jamais allumé » et « la cellule dessine bien une ball » ; console propre. |
| Captures | `artifacts/tuto-copy/card-setball.png` (carte de l'étape 2) et `window-pokeballs.png` (halo sur la ball grise de la ligne « Nouveau »). |
| Texte rendu des 10 étapes (FR, navigateur) | Relu intégralement : plus de `{case}`/`{pct}` résiduel, plus de doublon mobile/PC sur ordinateur. |

---

## 5. Ce qui n'est pas fait (et pourquoi)

- **Les récompenses restent invisibles dans la carte.** Les clés `tutorial_step_*_reward` sont
  désormais exactes et localisées, mais `TutorialCard` n'affiche pas de ligne « récompense » (choix
  de la 1.16.12 : carte courte). Les afficher est une décision d'interface, pas un correctif — je ne
  la prends pas seul. En attendant, `rewardData` reste calculé par `TutorialSystem`.
- **La ligne « Errant »** s'affiche encore dans la fenêtre Poké Balls alors que les Rôdeurs sont
  désactivés (`ROAMING_ENABLED = false`). Ce n'est pas un bug de tutoriel : c'est la liste des
  filtres qui montre un cas impossible. À traiter avec la reprise de l'équilibrage.
- **Rien n'a été vérifié en tactile réel** : la branche mobile (barre du bas, indication « Mobile »)
  est couverte par les tests de widgets et le CSS, pas par un appareil.
- Le reste des points ouverts (P1 3.1 boutons, P1 3.5 recherche texte, luttes d'`!important`,
  `FacilityParity` rouge antérieur) est inchangé : voir `LIVRAISON.md`.
