# Phase 1.16.16 — La fenêtre Lieu, l'alignement du tuto, et un tutoriel qui montre au lieu de jouer

**Date :** 3 novembre 2026
**Branche :** `Rework`
**Origine :** retour de jeu sur la 1.16.15, quatre points :

1. fenêtre Lieu — le titre doit rester « Lieu », et l'encadré « Lieu » avant le nom du lieu doit disparaître ;
2. tutoriel — le texte n'est plus aligné à gauche (effet de « tabulation » avant le texte) ;
3. objectifs du tutoriel flous — ils doivent annoncer noir sur blanc *quoi faire, où, et par quel bouton* ;
4. pas de téléportation ni d'ouverture de fenêtre : le tutoriel doit **montrer** comment faire, jamais
   le faire à la place du joueur.

---

## 1. Fenêtre Lieu

| Constat | Cause réelle |
|---|---|
| Le titre de la fenêtre changeait à chaque déplacement (« Route 1 », « Forêt de Jade »…) | `LocationPanel._render()` écrasait le titre par le nom du lieu (`setTitle(locationTitle)`) |
| Un encadré « Lieu » s'affichait au-dessus de l'encadré du nom du lieu | bandeau d'onglet unique `#tabs` (`<button class="tab">Lieu</button>`) |

**Décisions**
- Le titre de la fenêtre nomme la **fenêtre** : `t('tab_info')`, soit « Lieu » / « Location », et il ne
  change plus (il est re-résolu à chaque rendu, donc il suit un changement de langue).
- Le nom du lieu reste affiché **une fois**, dans son encadré en haut du corps de la fenêtre.
- Le bandeau d'onglet est **supprimé du DOM** : il n'avait qu'un onglet. La règle CSS
  `.pw-win-tabs { display: none }` censée le masquer ne gagnait pas la cascade (la classe héritée
  `.pw-static-050` réglait `display: flex` après elle) — supprimer l'élément règle le problème à la
  racine. Les deux règles devenues mortes (`.pw-win-tabs`, `.pw-static-050`) sont retirées.

## 2. Alignement du tutoriel

Le bloc « Comment faire » était **en retrait de 10 px** par rapport au titre et à la description
(`padding: 8px 10px`) : c'est ce décalage qui se lit comme une tabulation.

- Le bloc devient une bande pleine largeur de la carte (`margin-inline: -16px; padding: 8px 16px`),
  donc **son texte partage le bord gauche** du titre, de la description et de la progression
  (vérifié : les quatre éléments sont à 18 px du bord de la carte, à 1440, 1100, 900 et 420 px).
- `white-space: pre-line` sur le texte du chemin : les réponses sont écrites sur deux lignes
  (« où aller » puis « quoi cliquer »), et les retours à la ligne sont conservés.

## 3. Objectifs explicites

Chaque étape adopte la même forme, demandée en clair :

```
Premiers combats                    ← titre court
Vaincre 5 Pokémon sauvages sur la Route 1.      ← objectif mesurable
Comment faire :
Fenêtre Carte → clique Route 1.     ← où aller
Fenêtre Lieu → clique Explorer.     ← quoi cliquer
0/5                                  ← progression
[Afficher Route 1] [Guide] [Désactiver]   ← le bouton nomme ce qu'il montre
```

- Le nom du lieu n'est pas recopié : il vient de la table `location.*` via un paramètre `{place}`.
- Le nom de la ligne de capture (« Nouveau ») vient du preset de filtre via `{case}`.
- Le taux de capture (`{pct}`) vient de `ItemDB`, comme avant.
- Les libellés d'action figés (`tutorial_step_*_action`, 10 clés × 2 langues) sont supprimés : le
  bouton est désormais construit à partir de ce qu'il pointe (§4).

## 4. Montrer, jamais jouer à la place du joueur

Ancien comportement du bouton de la carte : téléportation (`travelTo`), ouverture de la boutique, du
sac, du Pokédex, de la fiche Pokémon, du sélecteur de ball. Le joueur ne faisait rien et n'apprenait
rien.

**Nouveau modèle** — chaque étape déclare une **cible à montrer** (`TutorialReveals` dans
`TutorialRules.js`) :

| Étape | Cible | Bouton |
|---|---|---|
| Premiers combats / Première capture | le lieu sur la carte, puis la tuile Explorer une fois sur place | « Afficher Route 1 » → « Afficher Explorer » |
| Choisir ta Poké Ball | la cellule « Ball » de la ligne « Nouveau » | « Afficher Poké Balls » |
| Acheter des Poké Balls | Bourg Palette sur la carte, puis la tuile Boutique | « Afficher Bourg Palette » → « Afficher Boutique » |
| L'Honor Ball | la fenêtre Poké Balls | « Afficher Poké Balls » |
| La fiche Pokémon | la première carte d'équipe | « Afficher Équipe Active » |
| Le sac / Le Pokédex | le bouton Raccourci correspondant | « Afficher Sac » / « Afficher Pokédex » |
| Jetons de donjon | la fenêtre Monnaies | « Afficher Monnaies » |
| Explorer un donjon | la Forêt de Jade sur la carte, puis la tuile d'expédition | « Afficher Forêt de Jade » → « Afficher l'expédition » |

- Le bouton **fait défiler la cible au centre de l'écran** et rappelle le halo ; sur mobile il bascule
  la barre du bas sur la vue qui contient la cible (`DashboardWindowFocusRequestedEvent`).
- Il **ne voyage pas, n'ouvre aucun modal et ne choisit aucune ball** — c'est testé.
- Le libellé suit l'état : le joueur est ailleurs → le bouton nomme **le lieu** ; il est sur place →
  il nomme **le bouton de la fenêtre Lieu**. `StoryPanel` écoute déjà `LocationChangedEvent`, donc la
  carte se met à jour au déplacement.
- Les noms d'écran affichés (« Explorer », « Boutique », « Sac », « Pokédex », « Poké Balls ») sont
  lus dans les tables de données (`SHORTCUTS`, clés de localisation des fenêtres), jamais recopiés.

Fichiers touchés : `src/config/TutorialRules.js` (modèle `TutorialReveals`), `src/ui/TutorialHighlight.js`
(`tutorialReveal`, `revealTutorialStep`, cibles calculées à l'exécution à la place de l'ancienne table
statique `TUTORIAL_TARGETS`), `src/panels/StoryPanel.js` (l'action ne fait plus que révéler),
`src/panels/components/TutorialCard.js` (libellé + indication mobile sur sa propre ligne),
`src/systems/TutorialSystem.js` (paramètre `{place}`), `src/panels/LocationPanel.js` (titre et bandeau).

---

## 5. Vérifications

| Contrôle | Résultat |
|---|---|
| `npm test` | **859 réussis, 0 échec** (858 en 1.16.15) |
| `npm run audit:i18n` | 0 clé manquante |
| Chromium réel — `tests/browser/Release11612.mjs` | **9/9** (halo ball « Nouveau », carte d'équipe, donjon clavier, console propre) |
| Chromium réel — fenêtre Lieu | titre « Lieu », aucun `#tabs`, encadré du lieu unique ; capture : `artifacts/tuto-copy/window-location-fixed.png` (et `map-halo.png` pour le halo sur le nœud de la carte) |
| Chromium réel — 10 étapes, FR et EN | libellé, objectif, chemin et halo relevés un par un ; bascule « Afficher Route 1 » → « Afficher Explorer » constatée en changeant de lieu |
| Chromium réel — clic sur le bouton | le joueur **reste** à Bourg Palette, aucun modal ; le nœud visé passe à l'écran (274 px sur 860 de haut) |
| Alignement | titre / objectif / « Comment faire » / progression tous à 18 px du bord, à 1440, 1100, 900 et 420 px |
| Mobile (400 × 860, tactile) | carte lisible, indication « barre du bas » sur sa propre ligne, révélation sans téléportation |

Nouveaux tests unitaires : cible calculée par étape et par lieu, bascule carte → tuile, cellule de ball
(jamais l'engrenage), repli sur la fenêtre, halo unique, idempotence, action qui ne fait que révéler
(aucun modal demandé), vraie fenêtre Poké Balls, fenêtre Lieu (titre stable, pas de bandeau, lieu
affiché une fois).

## 6. Ce qui n'est pas fait

- **Le donjon** : la tuile de l'expédition s'appelle « Lancer l'expédition » ; le bouton dit donc
  « Afficher l'expédition » plutôt que de reprendre ce libellé trop long. Décision de libellé, pas de
  comportement.
- **Aucun test sur appareil tactile réel** : le mobile est vérifié dans Chromium en mode tactile simulé.
- **Les récompenses** restent invisibles dans la carte (clés exactes, affichage non décidé) — inchangé
  depuis 1.16.15.
- La ligne « Errant » de la fenêtre Poké Balls reste affichée alors que les Rôdeurs sont désactivés —
  inchangé, à traiter avec l'équilibrage.
