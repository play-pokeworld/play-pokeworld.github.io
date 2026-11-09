# PASSATION — PokéWorld Rework, portage du catalogue vers le jeu

Document destiné à la personne ou à l'IA qui reprend le travail.
État au 7 novembre 2026 — jeu **1.16.47**, catalogue **56 écrans**.

---

## 1. La consigne maîtresse

> **Tout ce qui est validé dans le catalogue doit avoir exactement le même rendu dans le jeu.**
> Le catalogue est le nouveau rendu. Le jeu doit prendre ce rendu. Sans exception.

Les anciennes validations du jeu s'effacent devant le catalogue. Si un écran du jeu et sa
version catalogue diffèrent, **c'est le jeu qui doit changer**.

Le catalogue est fourni dans ce zip : `catalogue/CATALOGUE_AFFICHAGES.html`.
Il s'ouvre par double-clic ; il lit ses sprites dans `../assets/images/` du jeu, donc il doit
rester dans le dossier `POKEWORLD_REWORK_v1.16.47/`.

---

## 2. Le dépôt

- Dépôt : `play-pokeworld/play-pokeworld.github.io`, branche **`Rework`**.
- Version courante : **1.16.47**.
- Lancement : `node server.js` → `http://localhost:3000`.
- Tests : `npm test` → attendu **895 passed, 0 failed** avant toute livraison.

### Synchronisation obligatoire de la version (3 fichiers)
`package.json`, `package-lock.json`, `src/config/GameConfig.js`.

---

## 3. Les règles CSS — à respecter absolument

Elles sont dans `Rules.md` à la racine du dépôt. **Lire `Rules.md` en entier avant de toucher
quoi que ce soit.** Les points qui ont fait échouer les passes précédentes :

1. **Ne jamais ajouter de bloc de surcharge en fin de feuille.** Chaque valeur se modifie **dans
   la règle existante**. Un CSS n'a pas le droit d'écraser une valeur écrite plus haut.
2. **Le nombre de `!important` ne doit jamais augmenter** (test dédié).
3. **`team.css` est plafonné à 1700 lignes** — il en fait 1693. Ajouter 7 lignes le fait échouer.
4. **Pas de sélecteur attrape-tout** du genre `[class*="location"]` (test « no sheet becomes a new
   catch-all »).
5. **Aucun texte sous 11 px** hors badge (`StyleVocabulary.test.js`).
6. **Commentaires en anglais uniquement** dans les CSS et les JS.
7. Une feuille = un objet ; un widget = une feuille dans `components/`, un panneau = une feuille
   dans `panels/`.
8. Pas de second système de fenêtres / responsive / interactions. Pas de logique métier dans l'UI.
9. Pas de copie directe de code, composants ou assets PokéChill : seule la **grammaire d'affichage**
   s'emprunte.

Si un test encode l'ancienne référence visuelle (ex. hauteur de header 65 px), il faut le
**mettre à jour en le commentant** — c'est ce qui a été fait pour `tests/StaticRules.test.js`
(65 px → 56 px), parce que la cible a changé.

---

## 4. Méthode de travail, fenêtre par fenêtre

1. Ouvrir le catalogue sur l'écran visé, faire une capture **du cadre du jeu** (attention : la page
   catalogue a son propre bandeau d'outil en haut, ne pas le confondre avec l'en-tête simulé).
2. Dans le jeu, atteindre le même écran et relever les **styles calculés** des éléments clés
   (hauteur, `font-size`, `font-weight`, couleurs, `border-radius`, `padding`, `gap`).
3. Modifier les **règles existantes** de la feuille du panneau pour atteindre ces valeurs.
4. `npm test` → 895 / 0.
5. Capture de contrôle, comparaison visuelle avec le catalogue.
6. Seulement là, construire le zip.

### Ritual pour atteindre le tableau de bord du jeu en automatisation
```js
await page.goto('http://127.0.0.1:3000/');
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => { const i=document.getElementById('starter-name-input');
  if (i) { i.value='Ash'; i.dispatchEvent(new Event('input',{bubbles:true})); } });
await page.evaluate(() => document.querySelector('.starter-card')?.click());
await page.waitForTimeout(1800);
await page.evaluate(() => document.querySelectorAll('.pw-modal-backdrop,.pw-modal').forEach(e=>e.remove()));
```
Les toasts de notification doivent être retirés avant une capture.

### Environnement (éphémère !)
```bash
cd study/tools && npm i playwright@1.49.1 && npx playwright install chromium
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
  libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2
node server.js          # terminal 1, dans le dépôt
python3 -m http.server 8080 --directory <racine>   # terminal 2, pour le catalogue
```

---

## 5. CE QUI EST FAIT

### 5.1 Header du jeu — **validé en jeu**
Valeurs écrites **en place** (pas en surcharge) :

| fichier | règle | avant | après |
|---|---|---|---|
| `assets/css/layout/header-bar.css` | `#header` | `min-height:65px` | **56 px**, fond `--pw-bg-header`, filet bas `--pw-border-color` |
| idem | `.pw-header-brand` | 20 px, letter-spacing 2 | **15 px / 800 / couleur accent / spacing 0** |
| idem | `.pw-header-brand-mark` | 28 px, rayon 10 | **36 px, rayon 50 %, fond accent, padding 5** |
| idem | `.pw-header-brand-mark img` | 18 px | **26 px, rayon 50 %, anneau `0 0 0 2px rgba(28,26,23,.22)`** |
| `assets/css/panels/settings.css` | `#settings-btn` | 44 px, rayon 10 | **36 px, rayon 50 %, fond transparent, filet** |
| `tests/StaticRules.test.js` | référence | 65 px | **56 px** (commenté) |

### 5.2 Menu de navigation — **validé en jeu**
- `src/ui/NavMenu.js` + `assets/css/components/nav-menu.css` (nouveaux fichiers).
- La **Poké Ball du header est le bouton** (`#nav-menu-btn`, posé dans `HeaderPanel.js`).
- Le panneau démarre **juste sous la Poké Ball** (`left:10px; top:56px`), coins du haut **non
  arrondis** (`border-radius:0 0 10px 10px`) pour se coller au header, cœur crème `--light2`.
- Tuiles **86 × 86** : icône au-dessus, **barre de libellé `--dark2` de 22 px collée en bas**.
  6 par ligne sur PC, 4 sur mobile. Pas de bouton de fermeture : on referme par la Poké Ball,
  le voile ou Échap.
- Entrées lues dans `config/Shortcuts.js` (9 tuiles réelles) + Équipe et Réglages.
  `nav_menu_title` ajouté en FR et EN.
- La **barre de navigation mobile du bas est conservée** (décision utilisateur).

### 5.3 Fenêtre générique du tableau de bord
Fond, filet, rayon 10, en-tête 42 px, titre à gauche : conforme au catalogue.

### 5.4 Raccourcis
`assets/css/panels/shortcuts.css`, en place : rayon 12 → **8**, `padding:10px 12px` → **`0 9px`**,
`min-height:32px` ajouté à la règle existante.

### 5.5 Catalogue
`study/gallery/CATALOGUE_AFFICHAGES.html` — **56 écrans**, `checkall` à 0 erreur.
Corrections récentes : croix à droite à la place de la flèche retour dans tous les panneaux,
Boutique de l'Atoll alignée sur la cellule Boutique, Sac en rangées façon Dictionnaire,
Boîte PC avec le niveau au-dessus du cercle, Pokédex **sans** niveau, Marché avec sprites 72 px
et possédé/non possédé en vert/rouge, Boutique/Marché en cellule `.pw-shop-item`, menu de navigation.

---

## 6. CE QUI RESTE À FAIRE

### 6.1 Fenêtres du tableau de bord (à porter)
| fenêtre | écart connu |
|---|---|
| Poké Balls | lignes à ~46 px, cible ~36 px ; en-têtes 9,5 px majuscules |
| Monnaies | une seule cellule pleine largeur ; la cible en aligne **trois** côte à côte |
| Succès | carte tutorielle trop haute, titre 12/800, description 10,5, barre 7 px |
| Quêtes | carte tutorielle (`.pw-tutorial-card`) écrase la colonne, contenu à densifier |
| Combat | visuel du jeu remplacé par un texte d'attente |
| Carte | à vérifier (zoom, légende en haut) |
| Lieu | densité du panneau |
| Équipe | `.poke-card` : densité et hauteur |

### 6.2 Panneaux plein écran (à porter)
Sac · Boîte PC · Pokédex · Marché noir · Boutique · Dictionnaire · Atoll · Énigmes ·
Presets · Badges · Réglages.

### 6.3 Écrans du catalogue encore **non validés** (ne pas les considérer comme cibles)
Tableau de bord PC (composition des colonnes), En-tête (mesures), fiches Pokémon / objet /
dictionnaire, Pension, Mine, Entraînement, Base secrète, Badges, Réglages, Carte (hors légende),
Bilan de combat + AFK, Visite / PC de base secrète, Atoll (validé **temporairement**, une page),
Énigmes (à reconfirmer).

### 6.4 Validés au catalogue, donc à porter tel quel
Sac · Boîte PC · Pokédex · Marché noir · Boutique · Dictionnaire · Succès (fenêtre + plein écran) ·
Équipe · Combat · Raccourcis · Monnaies · Poké Balls · Lieu · Starter (3 écrans) · Presets ·
Badges · Dialogue PNJ · Quête répétable · Énigme · Légende · Quitter/Relancer le combat ·
Sauvegardes · scrollbars · menu de navigation.

---

## 7. Pièges déjà rencontrés — ne pas les retenter

- Empiler des surcharges en fin de `base.css` : **a fait échouer 4 tests** et a dû être annulé.
- Comparer une capture du **bandeau de l'outil catalogue** avec le header du jeu : comparaison
  invalide. Recadrer sur le cadre du jeu.
- `team.css` : 1700 lignes maximum, déjà à 1693.
- Les mobiles : `body.mobile-mode` a ses propres règles ; ne pas casser la barre du bas (56 px)
  ni la hauteur de header mobile (52 px).
- Les collisions de classes globales sont fréquentes (`.card`, `.sel`) : préfixer.
- Ne pas toucher : `team.css` au-delà de ses limites, `TeamMemberCard`, `PokemonCardView`, la carte
  centrée du SaveMenu, l'Atoll du catalogue (validé temporairement), le Sac / Boîte PC / Pokédex /
  Marché / Boutique / Dictionnaire du catalogue (validés).
- Les serveurs et dépendances ne survivent pas d'un message à l'autre : réinstaller avant de mesurer.
- `new Function(...)` ne valide que la syntaxe : une capture sans erreur JS n'est pas une preuve de
  rendu correct.
- Ne pas conclure « c'est fait » sans avoir **regardé la capture**.

---

## 8. Definition of done

Un écran est terminé quand :
1. ses valeurs sont écrites **dans les règles existantes** (aucune surcharge ajoutée) ;
2. `npm test` est à 895 / 0 ;
3. une capture du jeu et une capture du catalogue montrent le même rendu ;
4. le zip est reconstruit, `unzip -t` passe, et la version est synchronisée dans les 3 fichiers.
