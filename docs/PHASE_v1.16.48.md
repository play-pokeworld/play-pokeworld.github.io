# Phase 1.16.48 — échelle typographique unique + reprise propre des écrans

Version corrective (patch de la 1.16.x), pas une livraison de contenu.
Cette note dit ce qui a changé, pourquoi, ce que ça coûte, et ce qui reste.

---

## 1. Ce qui a motivé la passe

Deux constats de la reprise du 9 novembre :

1. **Les tailles de texte étaient éparpillées** : 954 déclarations `font-size`, 21 valeurs
   différentes (10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28,
   30, 32, 34, 38, 40 px) réparties dans 64 feuilles. Changer une taille = chasser 900 lignes.
   Aggravant : **huit déclarations appelaient `var(--pw-font-size-xs|sm|md|lg|xl)` pour des jetons
   qui n'étaient définis nulle part** — elles ne faisaient donc rien du tout.
2. **Un bloc de surcharge `!important` forçait la surface de tous les panneaux**
   (`assets/css/components/ui-panel.css`) : `background`, `border`, `border-radius`,
   `box-shadow`, `color` en `!important` sur `.pw-ui-panel, .pw-panel`. Aucune carte ne pouvait
   plus se dessiner (carte de quête, carte de succès, carte d'installation). C'est la cause
   mécanique du « ça ressemble à l'ancien rendu » des passes précédentes : les surcharges se
   battaient entre elles au lieu d'être supprimées.

## 2. L'échelle typographique — un seul endroit

`assets/css/core/tokens.css` déclare dix pas, et plus aucune feuille n'écrit une taille en px :

| jeton | px | usage |
|---|---|---|
| `--pw-font-size-xs` | 10,5 | légendes, pastilles, texte secondaire dense |
| `--pw-font-size-sm` | 11 | texte courant compact, libellés de tableau |
| `--pw-font-size-md` | 12 | corps par défaut, titres de carte |
| `--pw-font-size-lg` | 13 | titres de fenêtre, emphase |
| `--pw-font-size-xl` | 15 | en-têtes de section |
| `--pw-font-size-2xl` | 16 | **champs de formulaire** (en dessous de 16 px, iOS zoome la page au focus) |
| `--pw-font-size-3xl` | 18 | gros titres |
| `--pw-font-size-4xl` | 22 | nombres affichés |
| `--pw-font-size-5xl` | 28 | titres d'accueil |
| `--pw-font-size-display` | 32 | plus gros glyphes |

**891 déclarations** ont été réécrites pour nommer un pas. Deux feuilles restent hors échelle,
volontairement :

- `components/ui-icon.css` : `font-size` y règle la taille d'un **glyphe**, pas d'un texte ;
- `panels/save-menu.css` : le menu de sauvegardes est hors périmètre de la refonte (décision
  inchangée).

Ré-échelonner toute l'interface = éditer ce bloc. Rien d'autre.

**Garde-fou** : `tests/StyleVocabulary.test.js` ne compte plus les px feuille par feuille, il
vérifie que (a) aucun pas ne descend sous 10,5 px et (b) aucune feuille hors des deux exceptions
n'écrit un `font-size` en px. `tests/MobileTouchCss.test.js` vérifie toujours que le sélecteur des
formulaires vaut 16 px — par le jeton, plus par la valeur.

## 3. Reprise propre des écrans validés au catalogue

Règle appliquée à la lettre : **on modifie la règle existante, on n'ajoute pas de surcharge.**

### 3.1 Ce qui a été retiré (les surcouches)

| fichier | ce qui part | pourquoi |
|---|---|---|
| `components/ui-panel.css` | bloc `!important` à 5 déclarations sur `.pw-panel` | dupliquait la règle de base avec les mêmes valeurs et bloquait toute carte |
| `panels/bag.css` | deux blocs `.inv-toolbar` (fond, filet, rayon, padding) | la bande de filtres n'est pas un panneau : le catalogue la pose sur la surface |
| `components/chips.css` | bloc `.inv-tabs` (fond, filet, rayon, padding) | idem pour les onglets |

Le compte de `!important` **baisse** ; il ne peut pas monter (test dédié).

### 3.2 Ce qui a été modifié

| écran | feuille | avant → après |
|---|---|---|
| **Quêtes** | `panels/quests.css`, `panels/tutorial.css` | carte de quête = surface `--pw-bg-header`, filet `--pw-border-color`, rayon **12**, padding **10** ; titre **12/800** ; description **10,5** secondaire ; carte tutorielle ramenée à la même grammaire (filet accent **1 px** au lieu de 2 px jaunes en dur), bande « Comment faire » recalée sur le padding, `min-height: 96px` de la rangée de boutons supprimé |
| **Libellés de section** | `components/ui-section-title.css` | 13/900 avec filet et couleur par famille → **11/800 capitales `--pw-text-secondary`**, sans filet ; les trois variantes de couleur des quêtes partagent un seul style |
| **Filtres (toutes les pleines pages)** | `components/ui-dropdown.css` | `select` : fond `--dark3`, filet, rayon 8, poids 700, largeur mini 120 → **pastille** fond `--dark2`, **filet 0**, **rayon 999**, poids 400, 28 px |
| **Bande de filtres (toutes les pleines pages)** | `components/ui-toolbar.css` | fond `--dark1` + filet bas 2 px → **transparent, sans filet** |
| **Poké Balls** | `components/pokeball-filters.css` | 38 → **34 px** de ligne, en-têtes 11/800 capitales secondaires, nom 11, qté 11/700, ballon 16 px (le tableau de bord seulement : l'éditeur de filtres garde 22 px), colonnes `1fr 34 42` |
| **Monnaies** | `layout/header-bar.css` | colonnes nues → **grille de 3 cellules** (`--pw-bg-header`, filet, rayon 10), valeur 15/800, libellé secondaire |
| **Succès (fenêtre)** | `panels/achievements.css`, `components/badges.css` | carte 101 → **84 px**, `--pw-bg-header`/filet/rayon 10, titre 11/700, description 10,5, barre **7 px** sur la ligne des compteurs, pastille de rang sur **une ligne** |
| **Écarts de couleur en dur** | `panels/tutorial.css` | `#f5c242` → `var(--pw-accent)` |

### 3.3 Un jeton fantôme corrigé

Cinq déclarations appelaient `var(--pw-accent)` — **jeton qui n'existe pas** (l'accent s'appelle
`--accent`). Une déclaration dont la valeur est un jeton inconnu est simplement ignorée : le filet
de la carte tutorielle, la barre de progression des succès, la couleur d'un libellé de PNJ et deux
couleurs de la carte tutorielle ne s'appliquaient donc pas. Corrigé en `var(--accent)`.
Même famille de défaut que les `--pw-font-size-*` jamais définis (§1) : un jeton se vérifie.

## 4. Vérifications

- `npm test` : **895 réussis, 0 échec** (après chaque écran, et après la normalisation).
- Aucune erreur JS sur le parcours accueil → starter → tableau de bord → Sac → Pokédex →
  Boîte PC → Succès plein écran.
- Captures avant/après et captures du catalogue dans `PASSATION/shots/2026-11-09/`.
- `PanelFit.mjs` : échec **antérieur** conservé, `.move-type.type-electric` déborde de 2 px dans
  la carte d'Équipe à 900 px — défaut de l'écran Équipe, non touché ici.

## 5. Ce qui reste (et n'est pas dans ce zip comme « terminé »)

Les onze **pleines pages** ne sont pas encore repassées au catalogue : Sac, Boîte PC, Pokédex,
Marché, Boutique, Dictionnaire, Atoll, Énigmes, Presets, Badges, Réglages. Leur bande de filtres
et leurs contrôles sont désormais au bon vocabulaire (§3.2), mais leurs **cellules, lignes et
entêtes** gardent l'ancienne grammaire : c'est le prochain lot, écran par écran, avec la même
méthode (mesure du catalogue, modification en place, capture de contrôle).

Fenêtres du tableau de bord encore à densifier : Combat, Carte, Lieu, Équipe (§6.1 de la
passation, écarts mesurés).

## 6. Décisions à valider

1. **Plancher 10,5 px** : le catalogue écrit 9,5 px pour deux légendes et 10 px pour la
   description de succès. L'échelle s'arrête à 10,5 px (lisibilité) — dis-moi si tu veux
   descendre d'un cran, c'est **une ligne** dans `tokens.css`.
2. **Monnaies à trois colonnes** : avec une seule monnaie découverte, la cellule occupe un tiers
   de la fenêtre. Fidèle au catalogue, réversible en une ligne.
3. **Menu de sauvegardes** hors échelle typographique : il reste hors périmètre de la refonte.
