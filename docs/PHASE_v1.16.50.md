# Passe 1.16.50 — la carte se déplace à nouveau, Monnaies sans cadre, Boîte PC et Pokédex au catalogue

Branche : `Interface-rework`. Base : 1.16.49 (Sac, barres de filtres, pastilles).
Cette passe a commencé par une **régression fonctionnelle** signalée, puis a repris le Lot C.

## 1. La carte ne se déplaçait plus (corrigé)

**Symptôme** : cliquer sur un lieu de la carte ne faisait plus voyager le joueur.

**Cause, mesurée** : `UIMapView._installCameraGestures` prenait le pointeur dès le `pointerdown`
(`setPointerCapture`). Or un pointeur capturé **retargette le `click` suivant sur la vue elle-même** :
le gestionnaire de clic cherchait un `[data-node-id]` dans `event.target` et ne le trouvait plus.
Reproduit en instrumentant les trois événements :

```
pointerdown → text.            (le nœud)
pointerup   → DIV.pw-map-view  (retargeté par la capture)
click       → DIV.pw-map-view  → aucun nœud → aucun voyage
```

**Correction** (`src/ui/UIMapView.js`) :

- la capture n'est prise qu'une fois le geste réellement commencé (déplacement au-delà du seuil de
  drag, ou second doigt) ; un simple clic ne capture donc plus rien ;
- le nœud pressé est mémorisé au `pointerdown` et utilisé par le clic si `event.target` est la vue
  elle-même (cas d'un drag qui se termine, ou d'un navigateur qui retargete) ;
- un clic après un drag est ignoré (`_dragDistance > DRAG_START_PX`), et un `pointercancel` oublie le
  nœud pressé.

**Test de non-régression** : `tests/browser/MapTravel.mjs` (`npm run test:browser:maptravel`) —
clic réel sur un lieu adjacent → voyage, puis drag → la caméra bouge et **le joueur ne voyage pas**.

```
PASS a plain click on an adjacent location travels there — pallet → route1
PASS a drag pans the camera and never travels
```

## 2. Monnaies : sans cadre, cinq par ligne

Demandé : le rendu du rework, sans cadre, avec plus de monnaies par ligne.

- `.pw-cur-col` : plus de bordure, plus de rayon, plus de fond, plus de padding — la colonne ne
  porte plus que son icône, son montant et son libellé.
- `.pw-currency-panel` : `repeat(auto-fit, minmax(84px, 1fr))` au lieu de trois colonnes fixes.
  Mesuré : **5 devises sur une seule ligne, 125 px chacune** dans une fenêtre de 676 px. Sur une
  colonne étroite (téléphone) la grille se replie d'elle-même sur 3 puis 2 colonnes, sans règle
  dédiée. Une seule devise découverte occupe la largeur disponible, centrée.

## 3. Boîte PC au catalogue

- **Le cadre de stockage a disparu** : `.pw-box-roster--storage` peignait `background: var(--dark2)`
  et un padding de 14 px autour de la grille — le catalogue pose ses cellules sur la surface.
- **Le niveau n'est plus une pastille** : `.pw-pokemon-grid-marker` avait fond, filet, rayon 999 et
  ombre. C'est maintenant une ligne de texte (`xs`, 700, `--pw-text-secondary`), sous le disque,
  et la tuile réserve cette ligne (`margin-bottom: 14px`) pour que le nom ne la chevauche jamais.
- La tuile de la Boîte **ne peint plus un second cercle** : elle réutilise la cellule du Pokédex.

## 4. Pokédex : la cellule du catalogue

La tuile était un cercle de 72 px contenant le sprite, avec le numéro en pastille au-dessus.
Elle est désormais la `.cell` du catalogue :

| Élément | Avant | Maintenant |
|---|---|---|
| `.dex-entry` | cercle 72 px, fond `--light1`, filet 2 px, scale au survol | colonne sans cadre, padding 3/2, aucun transform |
| `.dex-sprite` | sprite plein cadre, pas de disque | **le disque** : cercle 58 px max, `--pw-bg-sprite`, filet `--pw-border-color`, image à 64 % |
| `.dex-number` | pastille sombre au-dessus | ligne de texte `xs`/600 `--pw-text-secondary` |
| `.dex-grid` | `padding: 14px`, fond `--dark2` | sans padding ni fond, `minmax(72px)`, gap 6 → **9 cellules par ligne** |

Le test `StaticRules` qui figeait « 72 px circulaire » et « niveau en pastille » a été **réécrit
dans son intention** : il vérifie maintenant que les deux panneaux partagent une seule cellule, que
le seul cercle est le disque du sprite, et que les silhouettes « inconnu / vu » sont conservées.

## 5. Tests

`npm test` : **895 réussis / 0 échec**. `tests/browser/MapTravel.mjs` : 4/4.
Aucune taille de texte ajoutée : tout passe par l'échelle de `core/tokens.css`.

## 6. Ce qui reste

- **Marché, Boutique, Dictionnaire, Badges, Atoll, Succès plein écran, Énigmes, Presets, Réglages** :
  leurs cellules et en-têtes sont encore à l'ancienne grammaire (les barres de filtres et les
  pastilles, elles, sont déjà faites).
- **Fenêtres** : Combat (contenu final), Carte (mise en page interne), Lieu, Équipe.
- **Décisions en attente** (depuis la 1.16.48) : plancher typographique 10,5 px ; `save-menu.css`
  laissé hors refonte.
