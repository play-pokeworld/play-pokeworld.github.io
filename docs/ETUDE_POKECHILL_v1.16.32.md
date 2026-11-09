# Étude de PokéChill — phase 1 (v1.16.32)

Ce document rend compte de l'étude **réelle** du jeu de référence. Il ne décrit pas PokéChill « de
mémoire » : il s'appuie sur son code source et sur des captures prises en exécutant le jeu dans un
navigateur piloté, à plusieurs tailles de viewport.

## 1. Corpus étudié

| Élément | Source |
|---|---|
| Dépôt de référence | `github.com/play-pokechill/play-pokechill.github.io` (cloné, branche par défaut) |
| Feuille de style complète | `styles.css`, 6 866 lignes, 32 requêtes `@media` |
| Structure de l'écran | `index.html`, 1 738 lignes, ~330 éléments identifiés |
| Exécution réelle | Chromium headless (Playwright), jeu servi en local |
| Viewports utilisés | 390×844, 1280×800 (rendus conservés dans `study/pokechill/`) |

Les captures produites pendant l'étude sont conservées dans le dépôt de travail : `study/pokechill/`
(`main-390.png`, `m-01-hud.png`, `m-02-menu.png`, `m-menu-dex.png`, `m-menu-items.png`,
`m-menu-settings.png`, `m-menu-team.png`, `m-menu-guide.png`, `m-menu-travel.png`, `main-1280.png`).

### Interfaces réellement examinées

1. **Écran d'accueil / HUD** (scène plein cadre + bandeau de dialogue en bas + bouton Poké Ball en
   haut à gauche).
2. **Menu principal** (grille de 3 × 5 tuiles d'icônes).
3. **Choix du Starter** (cartes à bord pointillé, 2 colonnes puis 1).
4. **Pokédex** (panneau de filtres + compteur + grille d'espèces).
5. **Sac / Objets** (rangée d'équipe + barre de catégories sur 2 lignes + liste).
6. **Réglages** (liste de lignes pleine largeur, contrôles natifs).
7. **Équipe** (bandeau de titre + actions, corps sombre).
8. **Guide** (liste d'accordéons).
9. **Déplacement / zones** (panneau qui glisse par-dessus le menu, entrées verrouillées).
10. **Infobulle contextuelle** (déclenchée par appui long / clic droit) — présente dans le DOM et
    décrite par la feuille de style (`#tooltipBox`, `max-height: 75%`, `overflow-y: scroll`).

Interfaces **non** examinées en exécution, faute d'état de sauvegarde suffisant : combat complet,
Génétique, Atoll/Frontière, Curation (curry), Échanges miracles. Leur mise en page est décrite par la
feuille de style (`#content-explore`, `#genetics-menu`, `#frontier-listing`, `#curry-pot`) mais **elles
n'ont pas été vues en mouvement** : elles ne servent pas de référence directe dans la fusion.

## 2. Ce que fait PokéChill, mesuré

### 2.1 Un cadre unique, colonne centrée

```css
body        { position: fixed; display: flex; justify-content: center; }
#main-content { width: 50%; height: 100%; position: fixed; overflow: scroll; }
@media (max-width: 1000px) { #main-content { width: 100%; } }
```

Toutes les fenêtres du jeu (`#team-menu`, `#pokedex-menu`, `#item-menu`, `#settings-menu`,
`#explore-menu`…) partagent exactement le même gabarit :

```css
#pokedex-menu { position: fixed; height: 100%; width: 50%; overflow-y: scroll; display: flex; flex-direction: column; }
@media (max-width: 1000px) { #pokedex-menu { width: 100%; } }
```

**Conséquence** : le mobile n'est pas un « mode » du PC. C'est la même colonne, qui prend toute la
largeur. Il n'y a jamais deux fenêtres à l'écran en même temps, jamais de fenêtre flottante, jamais de
fenêtre qui dépasse : une fenêtre = un écran = une zone qui défile.

### 2.2 Une seule requête média

Les 32 requêtes `@media` de `styles.css` utilisent **toutes** le même point de rupture :
`@media (max-width: 1000px)`. Aucune ne teste le tactile, aucune ne cascade sur plusieurs paliers.
Un seul seuil, un seul comportement : l'interface est soit « colonne large », soit « colonne pleine ».

### 2.3 Hiérarchie d'un écran : bandeau, contenu, bandeau

Chaque fenêtre suit le même rythme :

- un **bandeau de titre** collant en haut (`*-header`), titre centré, grandes icônes d'action à droite
  (crayon, copie) — mesuré ~64 px de haut, coins arrondis, fond distinct du corps ;
- une **zone de contenu** qui défile, seul élément scrollable de l'écran ;
- parfois un **pied** d'actions fixes.

### 2.4 Le menu est un lanceur, pas une liste

```css
.menu-item { height: 6rem; width: 6rem; }      /* 96 × 96 px */
.menu-item img { height: 4rem; width: 4rem; }
.menu-item span { height: 2rem; }              /* étiquette sous l'icône */
.menu-item:active { scale: 0.9; }              /* retour tactile immédiat */
```

À 390 px de large, la grille donne **3 tuiles par ligne**, chaque cible faisant ~78 × 96 px. Les
destinations sont atteignables au pouce, avec le libellé sous l'icône (et non à côté) : la largeur
disponible est entièrement consacrée à la cible.

### 2.5 Les contrôles sont natifs ou très grands

- Filtres du Pokédex : `<select>` **natifs** présentés en pastilles arrondies de ~150 × 48 px qui
  s'enroulent sur plusieurs lignes. Sur mobile, c'est le sélecteur du système qui s'ouvre : pas de
  menu maison à positionner, rien à faire déborder.
- Catégories du sac : deux rangées de 4 pastilles de ~48 px de haut, jamais une barre qui défile à
  l'horizontale sans indice.
- Entrées de liste : ~72 px de haut, libellé + valeur + chevron sur une ligne.

### 2.6 Densité et regroupement

- Pokédex au repos : en-tête, puis **un bloc de filtres**, puis une ligne d'état
  (« Right Click to see keywords » + « Caught: 6/1135 »), puis la grille. Trois niveaux, pas plus.
- Grille d'espèces : **4 par ligne** à 390 px, chacune = pastille ronde + étiquette « lvl 15 »
  au-dessus. L'identité est portée par le sprite ; le texte est réduit au strict nécessaire.
- Guide : liste d'accordéons d'une ligne ; le détail n'est chargé qu'à l'ouverture.
- Le dictionnaire (23 420 px de contenu) est une liste continue : un seul défilement, pas de scroll
  imbriqué.

### 2.7 Zone du pouce

- Les actions de jeu (choisir un starter, valider) sont dans la moitié basse de l'écran.
- Le bandeau de dialogue du tutoriel est **ancré en bas**, texte à 18–20 px, sur toute la largeur.
- La navigation principale est un bouton rond de 4 rem en haut à gauche, et le menu qu'il ouvre
  s'étend vers le bas depuis ce coin (jamais une feuille qui recouvre tout l'écran d'un coup).

### 2.8 Fenêtres longues

Une fenêtre n'a jamais de hauteur fixe : `height: 100%` de la colonne, et c'est **son propre corps**
qui défile (`overflow-y: scroll`). Le pied d'action, quand il existe, reste hors du défilement.
Résultat : le dernier élément est toujours atteignable, la fenêtre ne dépasse jamais l'écran.

## 3. Principes retenus pour PokéWorld

1. **Un écran = une tâche.** Sur mobile, une destination occupe la colonne entière ; on n'empile pas
   des fenêtres de bureau.
2. **Un seul seuil de rupture**, décidé à un seul endroit, et le même pour le CSS et pour le script.
3. **Bandeau / contenu / pied** : une bande de titre compacte, une seule zone qui défile, un pied fixe
   s'il y a des actions.
4. **Zone du pouce** : ce qui se touche souvent va en bas, ce qui informe reste en haut.
5. **Cibles généreuses** : 44 px minimum, libellé sous ou dans la cible, retour visuel à l'appui.
6. **Listes compactes** : grille d'icônes plutôt que lignes hautes ; une ligne = une information.
7. **Contrôles natifs pour la sélection** : un `<select>` du système est toujours mieux placé qu'un
   menu maison sur un écran de 360 px.
8. **Le budget vertical est la ressource rare** : tout ce qui consomme de la hauteur sans servir la
   tâche (filtres étalés, bandeaux empilés) se replie ou se met sur une ligne.

## 4. Éléments volontairement non repris

| Élément | Pourquoi |
|---|---|
| Colonne de 50 % sur grand écran | PokéWorld garde ses **trois colonnes** sur PC : c'est sa valeur propre (consulter plusieurs informations à la fois). |
| Rupture unique à 1000 px | PokéWorld a un seuil documenté (850 px) et une navigation à onglets ; on unifie sans changer de modèle. |
| Navigation par bouton rond + menu déroulant | PokéWorld a des destinations de premier niveau persistantes ; les cacher derrière un menu coûterait plus de gestes qu'elle n'en économise. |
| `<select>` pour tout | PokéWorld a des menus contextuels qui portent des données riches (icônes, descriptions, états). Seuls les **filtres simples** passent en natif. |
| Écrans vides en attente de contenu | PokéWorld a des panneaux à contenu réel (carte, combat, équipe) : ils restent des panneaux, pas des écrans. |
| Thèmes, palette, polices | PokéWorld a son identité visuelle et ses thèmes ; on emprunte la **structure**, pas l'habillage. |
| Le code, les composants, les assets | Aucune ligne, aucun fichier, aucune structure de PokéChill n'est copiée. L'étude porte sur des principes décrits ici en clair. |
