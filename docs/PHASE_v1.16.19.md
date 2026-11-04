# Phase 1.16.19 — Le jeu au doigt

**Date :** 3 novembre 2026
**Branche :** `Rework`
**Origine :** retour de jeu — « beaucoup de problèmes de rendu sur mobile, les panneaux où il faut
scroller buggent, certains menus qui doivent s'ouvrir avec des appuis longs ne fonctionnent pas ».
Passe complète sur les affichages et les boutons à l'écran tactile.

Tout ce qui suit a été mesuré dans Chromium sur un **iPhone 13 émulé** (390 × 664, `pointer: coarse`,
ratio 3), avec de vrais envois tactiles (`touchStart` / `touchMove` / `touchEnd` CDP), jamais avec
`element.click()`.

---

## 1. Les menus d'appui long

### La carte de sauvegarde était le cas le plus visible

`SaveCard` n'écoutait que `contextmenu` — un événement qu'un navigateur mobile ne déclenche pas sur un
`div`. Le menu **Renommer / Dupliquer / Exporter / Supprimer** était donc inaccessible au doigt.

### Pourquoi les autres menus « ne marchaient pas » non plus

Chaque composant avait recopié le **même bloc de 25 lignes** (`touchstart` + minuterie 500 ms), avec
trois défauts répétés partout :

| Défaut | Conséquence à l'écran |
|---|---|
| tolérance de mouvement nulle | le moindre tremblement du doigt annulait l'appui : il fallait être parfaitement immobile |
| clic non neutralisé | après l'appui long, le navigateur émet un `clic` : la ligne du sac **ouvrait la fiche puis utilisait l'objet** |
| texte laissé sélectionnable | le navigateur ouvrait son menu natif / sa loupe au lieu de laisser le jeu réagir |

Et un quatrième, propre au menu : `UIContextMenu.open()` s'abonnait au `click` du document. Le
relâchement du doigt produit un `click` **hors du menu**, dans le même geste : le menu s'ouvrait et se
refermait aussitôt.

### Correctif

- **`src/ui/LongPress.js`** (nouveau) : un seul geste partagé, en *Pointer Events* (un seul chemin pour
  le doigt, le stylet et la souris). Tolérance de 12 px, `pointercancel` respecté (un balayage n'est
  jamais pris pour un appui), `clic` du relâchement neutralisé, `contextmenu` natif bloqué pendant le
  geste. `UIElement.addLongPress()` le branche sur n'importe quel widget et le libère à `destroy()`.
- **Six composants** ne réimplémentent plus leur minuterie : sac, équipe, carte de combat, boîte PC,
  PNJ, présets d'équipe — et la fiche Pokémon / l'apprentissage de capacités, qui n'avaient **que** le
  clic droit, gagnent l'appui long.
- **`SaveCard`** gagne l'appui long : le menu s'ouvre au centre de la carte, avec les coordonnées du
  doigt.
- **`UIContextMenu`** se referme désormais sur `pointerdown` (et plus sur `click`) : le geste qui ouvre
  le menu est terminé quand l'abonnement est posé, le relâchement ne peut plus le fermer.
- **`components/long-press.css`** (nouvelle feuille) : `-webkit-touch-callout: none` et
  `user-select: none` sur les surfaces concernées, uniquement pour les écrans tactiles.

Résultat mesuré : appui maintenu sur une carte de sauvegarde → menu ouvert **pendant** l'appui et
**toujours ouvert après le relâchement**, quatre entrées, et le relâchement ne lançe plus la partie.

## 2. Les panneaux qui « bugguent » au scroll

### Les onglets tranchés en deux

Les trois barres de filtres (sac, boîte PC, dictionnaire) se plafonnaient à `max-height: 52px;
overflow: hidden` sur mobile : la deuxième rangée d'onglets était **coupée en plein milieu**. Le
plafond est supprimé ; les onglets restent entiers, et seuls les champs de recherche/selects se
replient derrière le chevron de la barre (règle unique, dans `components/ui-input.css`).

### Le bas du panneau sous la barre d'URL

Les panneaux plein écran étaient dimensionnés en `100vh`, c'est-à-dire la hauteur **maximale** du
téléphone (barre d'URL masquée). Barre visible, la dernière ligne du panneau était inaccessible.
Ajout de `100dvh` (hauteur réellement visible) sur les quatre blocs concernés, et des marges
`env(safe-area-inset-*)` pour l'encoche et la barre d'accueil (`viewport-fit=cover` ajouté dans
`index.html`).

### La page qui bougeait derrière

Le panneau défile, mais arrivé en bas, le balayage se propageait à la page du jeu, qui défilait sous
l'overlay — on refermait le panneau sur un tableau de bord déplacé. Correctif : `overscroll-behavior:
contain` sur le corps de panneau, plus un **verrou de défilement** référencé (`src/ui/ScrollLock.js`)
posé tant qu'une couche est ouverte, relâché à sa fermeture. Le verrou ne s'applique **que** sur un
layout tactile : sur ordinateur, la page reste la surface de défilement des fenêtres denses.

### Mesures

| Contrôle (iPhone 13 émulé) | Avant | Après |
|---|---|---|
| onglets tranchés (sac, boîte, Pokédex) | oui, 2ᵉ rangée coupée | **0** |
| balayage dans un panneau | corps de panneau 0 → 298 px, page 0 → 0 | idem, page verrouillée |
| hauteur de panneau | 652 / 664 px | 652 / 664 px (`dvh` + marges d'encoche) |

## 3. Les contrôles trop petits

Mesuré au doigt sur le tableau de bord et dans les panneaux :

| Contrôle | Avant | Après |
|---|---|---|
| boutons d'en-tête de fenêtre (`?`, légende) | 26 × 26 px | **34 × 34 px** |
| selects (région, langue, tri) | 150 × 28 px, texte 11–12 px | **36 px de haut, texte 16 px** |
| curseurs (réglages) | 22 px, pouce 18 px | **34 px, pouce 22 px** |
| champs de texte | 35 px | **40 px, texte 16 px** |

Le passage à 16 px n'est pas cosmétique : en dessous, iOS **zoome toute la page** au moment où le
champ reçoit le focus, et le joueur doit dézoomer à la main.

## 4. Vérifications

| Contrôle | Résultat |
|---|---|
| `npm test` | **876 réussis, 0 échec** (860 avant la passe) |
| `tests/browser/MobileTouch.mjs` (nouveau) | **14/14** |
| `tests/browser/Release11612.mjs` | 10/10 |
| `tests/browser/PanelFit.mjs` | 7/7 |
| `tests/browser/BagAndPokemonInfoParity.mjs` | 18/18 |
| `tests/browser/DictionaryParity.mjs` | complet |
| `npm run audit:i18n` | 0 clé manquante |
| Rendu **ordinateur** | inchangé : toutes les règles ajoutées vivent dans `(max-width: 850px), (pointer: coarse)` |

Nouveaux tests statiques :
- `tests/LongPress.test.js` — 7 cas : appui qui se déclenche une fois, jitter toléré, balayage qui
  annule, `pointercancel`, souris ignorée, clic du relâchement neutralisé puis clic suivant rendu,
  détachement propre.
- `tests/MobileTouchCss.test.js` — 9 cas : feuilles équilibrées, aucune barre d'onglets plafonnée, le
  tiroir replie les filtres sans toucher aux onglets, `100vh` toujours doublé d'un `100dvh`,
  confinement du scroll, verrou de page, tailles tactiles, surface non sélectionnable, et **aucun
  composant ne réimplémente sa minuterie tactile**.

Nouveau test navigateur (`tests/browser/MobileTouch.mjs`, 14 scénarios) : chaque geste est un vrai
envoi tactile ; il vérifie notamment qu'un **appui court** sur une ligne du sac lance l'action de
l'objet alors qu'un **appui maintenu** ouvre sa fiche — et non les deux.

## 5. Ce que cette passe ne prétend pas

- **Pas de test sur appareil physique.** L'émulation Chromium ne reproduit ni le moteur de rendu de
  Safari iOS ni sa barre d'URL animée : les correctifs `dvh` / `env(safe-area-inset-*)` sont conformes
  aux spécifications et vérifiés comme tels, pas constatés sur un iPhone réel.
- **Pas de test multi-navigateurs** : Firefox et WebKit ne sont pas exécutés ici.
- `MarketAndResponsiveTraining.mjs` échoue à l'assertion de la ligne 819 **avant et après** cette
  passe (vérifié en rejouant la suite sur l'archive 1.16.18) : défaut antérieur, non traité ici.
- Restent ouverts, inchangés : récompenses du tutoriel non affichées (décision d'interface), ligne
  « Errant » alors que les Rôdeurs sont désactivés, P1 3.1 (boutons), P1 3.5 (recherche texte),
  reprise de l'équilibrage.
