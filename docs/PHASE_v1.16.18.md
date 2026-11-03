# Phase 1.16.18 — Les colonnes de la fenêtre Poké Balls sont alignées

**Date :** 3 novembre 2026
**Branche :** `Rework`
**Origine :** retour de jeu sur la 1.16.17 — « centrer aussi le nombre de Poké Balls et les textes
« Ball » / « Qté » du haut, pour qu'ils soient bien au-dessus de leur colonne et non décalés ».

---

## 1. Constat mesuré (Chromium, 1440 px)

| Élément | Avant | Après |
|---|---|---|
| colonne sous le titre « Ball » | `[259 – 303]` | `[251 – 295]` |
| colonne des balls dans les lignes | `[251 – 295]` | `[251 – 295]` |
| colonne sous le titre « Qté » | `[303 – 347]` | `[303 – 347]` |
| nombre dans sa cellule (44 px) | **0 px à gauche**, 37 px à droite | **19 px / 18–19 px** |
| titre « Ball » dans sa cellule | 10 px / 10 px | 10 px / 10 px |
| titre « Qté » dans sa cellule | 13 px / 13 px | 13 px / 13 px |

Deux défauts distincts en plus du sprite corrigé en 1.16.17.

## 2. Causes réelles

1. **Les titres étaient décalés de 8 px** — `.pw-ball-row` déclarait `gap: 2px 8px` mais `.pw-ball-head`
   n'avait aucun `gap`. Les deux grilles avaient donc des colonnes différentes : la grille d'en-tête
   distribuait 16 px de plus dans sa colonne `1fr`, ce qui poussait `Ball` et `Qté` vers la droite.
2. **Le nombre n'était pas centré** — même erreur que le sprite la veille : la cellule demandait
   `justify-content: flex-end` tout en restant `display: block`, propriété sans effet. Le nombre
   restait collé au bord gauche de sa colonne, sous un titre centré.

## 3. Correctif

`assets/css/components/pokeball-filters.css` :

```css
.pw-ball-head {
  gap: 2px 8px;                 /* même gouttière que .pw-ball-row : les titres retombent sur leur colonne */
}

.pw-ball-row-qty {
  display: flex;                /* la cellule peut enfin centrer */
  align-items: center;
  justify-content: center;
}
```

Le `padding-right: 4px` de la cellule quantité disparaît (il ne servait qu'à rattraper un alignement
à droite devenu inutile). Aucune `!important` ajoutée, aucune autre règle touchée, aucun changement
de dimension : la grille reste `1fr 44px 44px`, l'en-tête et le corps partagent exactement les mêmes
colonnes.

## 4. Vérifications

| Contrôle | Résultat |
|---|---|
| Chromium — colonnes en-tête / corps | identiques au pixel : `[25–243] [251–295] [303–347]` |
| Chromium — 5 lignes | sprites 11 / 11 px, nombres 19 / 19 px (172 → 14 / 14 px, chiffres tabulaires) |
| Chromium — titres | « Ball » 10 / 10 px, « Qté » 13 / 13 px, chacun au-dessus de sa colonne |
| `npm test` | **860 réussis, 0 échec** |
| `tests/browser/Release11612.mjs` | **10/10**, contrôle renommé « les colonnes s'alignent » et étendu aux titres et aux nombres |
| Capture | `artifacts/tuto-copy/balls-columns.png` |

Tests mis à jour :
- **statique** (`tests/CssStructure.test.js`) — les deux cellules (ball, quantité) doivent poser un
  conteneur de centrage, et l'en-tête doit partager la gouttière des lignes (c'est ce qui produisait
  le décalage des titres). Le test lit la dernière déclaration de chaque règle, celle qui gagne.
- **navigateur** (`tests/browser/Release11612.mjs`) — compare la position des colonnes de l'en-tête à
  celle des lignes, puis les marges gauche/droite des titres, des sprites et des nombres.

## 5. Reste ouvert

Inchangé : récompenses du tutoriel non affichées (décision d'interface), ligne « Errant » visible
alors que les Rôdeurs sont désactivés, P1 3.1 (boutons), P1 3.5 (recherche texte), reprise de
l'équilibrage.
