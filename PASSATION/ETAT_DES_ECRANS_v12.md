# Liste des écrans — état exact au 2026-11-07 (v12)

> **54 écrans.** **Rien n’est coché sans que tu l’aies validé toi-même.**

> VALIDÉ **13** · À VALIDER **10** · PARTIEL **10** · À REFAIRE **24**

> — **VALIDÉ** : tu l’as dit, ça ne bouge plus.
> — **À VALIDER** : je l’ai refait, c’est prêt pour ton œil.
> — **PARTIEL** : une partie est faite, il reste du travail dessus.
> — **À REFAIRE** : pas encore touché ou jugé insuffisant.


## Pages

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Tableau de bord PC | **VALIDÉ** | Validé par toi. Ne bouge plus. |

## Fenêtres PC / onglets mobile

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Lieu | **À VALIDER** | Plaque centrée H et V sur le décor, fond translucide. Le cadre défile : le fond descend jusqu'en bas. |
| Carte | **PARTIEL** | Le « ? » mène à la légende. Reste : options de zoom et légende posée en haut. |
| Équipe | **VALIDÉ** | Validé par toi. Ne bouge plus. |
| Combat en direct | **VALIDÉ** | Validé après retrait de l'icône devant « Résumé ». Ne bouge plus. |
| Quêtes | **PARTIEL** | Titre « Quêtes », « Comment faire » sur sa ligne. Reste : DA complète de l’écran. |
| Succès (fenêtre) | **VALIDÉ** | Validé par toi. |
| Poké Balls | **VALIDÉ** | Validé par toi. |
| Raccourcis | **VALIDÉ** | Validé par toi. |
| Monnaies | **VALIDÉ** | Validé (sprites réelles des monnaies encore manquantes). |
| Pension | **À REFAIRE** | Ne reflète pas le gameplay. Source réelle à lire : src/panels/HatcheryPanel.js. |
| Mine | **À REFAIRE** | Idem. Source réelle : src/panels/MinePanel.js. |
| Base secrète | **À REFAIRE** | Infos inutiles (modèle, drapeau, objets, visiteurs) + gameplay absent. Source : SecretBasePanel.js. |
| Entraînement | **À REFAIRE** | Idem. Source réelle : src/panels/TrainingCenterPanel.js. |

## Plein écran

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Sac | **À REFAIRE** | Ni PokéChill ni la DA. Réf. : onglets .bag-sort + grille de cases. |
| Boîte PC | **PARTIEL** | Grille et cases bons. Reste : panneau de filtres exactement PokéChill. |
| Pokédex | **À REFAIRE** | Filtres PokéChill + tri manquant/trouvé, sprites non trouvés grisés, toutes les méthodes d’obtention. |
| Marché | **À REFAIRE** | Ne ressemble à rien de connu. Réf. réelle : MarketCategoryView.js / MarketPokemonCard.js. |
| Boutique | **À REFAIRE** | Idem. Réf. réelle : #shop-menu + ShopItemCard.js / ShopFooter.js. |
| Badges | **À REFAIRE** | Ne ressemble pas au jeu actuel. |
| Dictionnaire | **À REFAIRE** | 4 onglets + barre de recherche + liste (grammaire PokéChill relevée). |
| Guide | **PARTIEL** | Un seul en-tête, le « ? » y mène. Reste : la liste dépliable façon PokéChill. |
| Atoll | **À REFAIRE** | Mix Battle Frontier PokéChill × Atoll actuel non fait. |
| Énigmes | **PARTIEL** | DA à faire. |
| Presets d’équipe | **VALIDÉ** | Validé (icônes unifiées) + en-tête dédoublonné. |
| Succès (plein écran) | **À REFAIRE** | Grille de tous les succès + filtres au format PokéChill. |

## Modales — fiches

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Fiche Pokémon | **À REFAIRE** | Doit suivre la nouvelle fiche : EV / IV / stats, grammaire PokéChill. |
| Fiche Pokémon — Bulbizarre | **À REFAIRE** | Même composant, autre Pokémon. |
| Fiche objet | **À REFAIRE** | Fiche objet PokéChill. |
| Utilisation d’un objet | **À REFAIRE** | Doit ouvrir la Boîte/Pokédex pour choisir la cible (principe PokéChill). |
| Fiche Pokédex | **À REFAIRE** | Fusion fiche Pokédex du jeu × nouvelle fiche Pokémon. |
| Fiche dictionnaire | **À REFAIRE** | Fiche dictionnaire PokéChill. |

## Modales — parcours

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Choix du starter | **VALIDÉ (PC)** | Validé sur PC. Mobile refait : cartes compactes qui s'enroulent, sprite 60 px. |
| Starter régional | **À VALIDER** | Même composant, autres données. |
| Confirmation du starter | **VALIDÉ** | Validé par toi. |

## Modales — confirmations

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Relancer la partie | **VALIDÉ** | Validé par toi. |
| Quitter le combat | **VALIDÉ** | Validé par toi. |

## Modales — sélections

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Choix de la ball | **VALIDÉ** | Validé par toi. |
| Filtres de capture | **À REFAIRE** | Manque le gameplay réel (capture réelle à lire : BallFilterEditorModal.js). |

## Modales — gestion

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Gestion de la pension | **PARTIEL** | Modale = actions seules (proposition à valider), mais dépend du #pension. |
| Gestion de la mine | **PARTIEL** | Idem. |
| Gestion de l’entraînement | **PARTIEL** | Idem. |

## Modales — bilans

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Bilan de combat | **À REFAIRE** | Doit reprendre l’affichage actuel du jeu (BattleSummaryModal.js). |
| Résumé d’absence | **À REFAIRE** | Idem (AfkSummaryModal.js). |

## Modales — monde

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Dialogue PNJ | **VALIDÉ** | Validé. Centré sur mobile. Sprites par PNJ à venir. |
| Visite de base | **À REFAIRE** | Gameplay réel absent (SecretBaseVisitModal.js). |
| PC de base | **À REFAIRE** | Gameplay réel absent (SecretBasePcModal.js). |
| Quêtes répétables | **VALIDÉ** | Validé. Centré sur mobile. |
| Résolution d’énigme | **VALIDÉ** | Validé. |
| Légende de la carte | **VALIDÉ** | Validé, à recontrôler en jeu. |

## Modales — système

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Réglages | **PARTIEL** | Onglets en haut faits. Reste : fidélité à l’ancien affichage + DA. |
| Export de sauvegarde | **PARTIEL** | DA à aligner. |
| Éditeur de preset | **À REFAIRE** | Doit réutiliser le bandeau d’Équipe + gameplay (renommer, objets…). |

## Documentation

| Écran | État | À regarder / ce qui reste |
|---|---|---|
| Architecture & anti-duplication | **VALIDÉ** | Page de documentation de la maquette. |

---

## Ce que je te demande de valider maintenant

Quatre écrans seulement, ceux qui ont bougé depuis ton dernier retour :

- **Combat en direct** — Poké Ball grisée en fond, item dans l’angle, pas de rond, sprites agrandis, butin + Résumé + Quitter.
- **Lieu** — Scroll mobile réparé (le cadre défile vraiment). Vérifie le bas de la fenêtre.
- **Choix du starter** — Texte d’accueil, sous-titre, pseudo du Dresseur, 3 cartes avec description, mention + Retour.
- **Starter régional** — Même composant, autres données.

Tout le reste de la liste est soit déjà validé, soit encore à refaire : inutile de le regarder pour l’instant.


## Règle d’en-tête appliquée partout (ton point du jour)

Un en-tête ne contient plus que **le titre et le « ? »**. Tout ce qui change (lieu, tour, nombre de balles, nombre de badges…) est descendu dans le corps. Seule exception : la Carte, qui garde le changement de région.

---

## 6. Version testable du jeu — `POKEWORLD_REWORK_v1.16.33.zip`

Le zip contient **le jeu réel** (branche `Rework`), versionnée **1.16.33** comme l'exigent les `Rules.md`,
avec la note `docs/PHASE_v1.16.33.md`.

Ce qui y est déjà porté :

| Élément validé | État du portage |
|---|---|
| Équipe (bandeau sable + boîte d'info sombre) | **Première passe CSS** posée sur `assets/css/panels/team.css`. Pas encore identique au mockup : la carte réelle contient des éléments que la maquette n'a pas (pastille d'objet en bas à gauche, emplacements de capacités vides, « 1 / 6 dans l'équipe »), et d'autres feuilles importées après `team.css` reprennent la main sur certaines règles. Il faut une passe **structurelle** (JS + CSS), pas seulement des couleurs |
| Raccourcis (couleur sur l'icône et le bord) | **Rien à porter** : le jeu réel applique déjà exactement cette règle (`--shortcut-color` sur le bord + l'icône) |
| Monnaies (horizontale) | **Rien à porter** : le jeu réel a déjà `MoneyRow` en ligne |
| Poké Balls (hauteur de ligne fixe) | À vérifier dans le jeu, la maquette suit déjà le jeu |

Aucun JavaScript, aucune donnée, aucun test n'a été touché : le patch est du CSS seul,
il ne peut pas casser une mécanique.

---

## 7. Version testable — `POKEWORLD_REWORK_v1.16.34.zip`

**C'est le zip qui contient réellement les corrections.** Le précédent (1.16.33) n'avait que la première
passe CSS de l'équipe : ni le Combat, ni le Lieu, ni le Starter n'y étaient portés. C'est corrigé ici.

| Correction demandée | Où c'est fait | Vérifié |
|---|---|---|
| Combat — un emplacement vide fait la même taille qu'un plein | `team-moves.css` : les 4 emplacements partagent une hauteur de ligne (`grid-auto-rows: 1fr`) | Mesuré en jeu : 4 × **35 px**, des deux côtés |
| Combat — sprite et cadre du sauvage alignés sur les nôtres | `battle-team-row.css` : même cadre, même remplissage, même alignement vertical pour la carte du sauvage | Mesuré en jeu : sprite `x = 411` (=), boîte d'info `x = 589` / largeur `442` (=) |
| Lieu — nom centré sur le décor, fond opaque | `location.css` : décor de la zone en fond (`--pc-scene-url`), plaque centrée opaque | Capture `game-lieu-pc-v16134.png` |
| Starter — DA des textes, lisibilité, fond non uni | `starter.css` : sable `--light1`, encre tiède, voile + trame + halo | Captures `game-starter-pc-v16134.png`, `game-starter-mobile-v16134.png` |
| Équipe | **non touchée** (aucune règle, aucun fichier) | — |

État : `npm test` → **894 passés**, 1 échec antérieur hors périmètre (`.hp-text` à 10 px sur la carte
d'équipe validée, volontairement non modifiée). Parcours réel : accueil → starter → partie → Route 1 →
combat, **0 erreur JS**.

---

## 8. Retours du 2026-11-08 et lots de validation groupés

### Corrigé tout de suite (catalogue `CATALOGUE_AFFICHAGES.html`, v17)

- **Combat** — le butin reprend **sa propre ligne pleine largeur**, et `Résumé` + `Quitter le combat`
  passent **en dessous**, côte à côte. Les trois ne partagent plus une ligne. La fenêtre continue de
  tenir sans scroll interne (mesuré : 661 px pour 681 px disponibles).
- **Lieu** — la plaque du nom est **centrée sur le décor avec un fond translucide à 72 %** : on voit
  le paysage au travers.
- **Choix du starter** — validé, ne bouge plus.

### Corrigé dans le jeu (zip `POKEWORLD_REWORK_v1.16.35.zip`)

- La plaque du lieu passe aussi en translucide dans le jeu réel (`location.css`).
- Combat : rien à porter, le jeu a déjà butin / `Résumé` / `Quitter le combat` sur deux lignes.

### Lots à vérifier — réponds en une fois, pas écran par écran

**Lot A — 10 écrans, prêts, rien à coder derrière (le plus rapide)**
1. Tableau de bord mobile · 2. Menu de sauvegardes · 3. **Lieu** · 4. **Combat en direct** ·
5. **Starter régional** · 6. Confirmation du starter · 7. Relancer la partie · 8. Quitter le combat ·
9. Modèle de la base secrète · 10. Succès (fenêtre, si tu veux le recontrôler)

**Lot B — 10 écrans à finir, une moitié est faite**
Carte · Quêtes · Boîte PC · Guide · Énigmes · Gestion pension · Gestion mine · Gestion entraînement ·
Réglages · Export de sauvegarde

**Lot C — 24 écrans à refaire, aucun n'est prêt**
Sac · Pokédex · Marché · Boutique · Badges · Dictionnaire · Atoll · Succès plein écran ·
Fiche Pokémon (×2) · Fiche objet · Utilisation d'un objet · Fiche Pokédex · Fiche dictionnaire ·
Filtres de capture · Bilan de combat · Résumé d'absence · Visite de base · PC de base ·
Éditeur de preset · Pension · Mine · Base secrète · Entraînement

**Ordre conseillé** : Lot A en une passe, puis Lot C par sous-groupes (Sac/Pokédex/Boutique-Marché,
puis fiches, puis base secrète & pension/mine/entraînement), et Lot B en dernier parce qu'il dépend du Lot C.


---

## 9. Portage du 2026-11-08 (zip `POKEWORLD_REWORK_v1.16.36.zip`)

Pendant que tu vérifies le Lot A, j'ai porté dans le jeu le dernier écran validé qui n'y était pas :
**Équipe**. Carte sable, boîte d'information sombre, objet tenu sans pastille, sprite 112 px sans
disque, quatre emplacements de capacités de même hauteur (33 px, vides compris).
Tout est cadré sur `#team-window-body` : la carte du combat ne bouge pas.

`npm test` : **895 tests, 0 échec**. Captures : `game-team-v16136.png`, `game-lieu-pc-v16135.png`,
`game-starter-pc-v16134.png`, `game-battle-v16134.png`.

### Lot A à vérifier maintenant (une seule réponse pour les dix)

| # | Écran | Ce que je regarde |
|---|---|---|
| 1 | Tableau de bord mobile | Une colonne, même contenu, cadre qui défile |
| 2 | Menu de sauvegardes | Organisation inchangée, carte centrée intacte |
| 3 | Lieu | Plaque translucide centrée sur le décor + scroll mobile |
| 4 | Combat en direct | Butin sur sa ligne, Résumé + Quitter en dessous |
| 5 | Starter régional | Même composant que le starter validé |
| 6 | Confirmation du starter | Même composant Confirmer |
| 7 | Relancer la partie | Même composant |
| 8 | Quitter le combat | Symbole retiré |
| 9 | Modèle de la base secrète | Une pièce + modèles |
| 10 | Succès (fenêtre) | Reconduite telle quelle |


---

## 10. Retours du 2026-11-08 (2e passe) — catalogue v18 + zip 1.16.37

### Corrigé

- **Lieu** — plaque centrée **horizontalement ET verticalement** sur le décor, fond translucide.
  Et la cause du fond qui s'arrêtait : la fenêtre (864 px) dépassait l'écran de l'appareil (800 px) et
  était **tranchée net**. C'est désormais **le cadre qui défile**, comme la page du jeu, plus le
  panneau : le fond descend jusqu'en bas et le bas de la fenêtre est atteignable.
- **Combat** — icône retirée devant « Résumé ».
- **Starter mobile** — cartes compactes de la largeur de leur contenu qui **s'enroulent** (2 sur la
  première ligne d'un 390 px, la 3e centrée en dessous), sprite **60 px**, aucun scroll nécessaire.
  Identique dans le catalogue et dans le jeu.

### Écrans supprimés du catalogue (ils n'existent pas dans le jeu)

- **Tableau de bord mobile** — sur mobile la fenêtre de base est **Lieu**, le reste passe par le menu
  de navigation. Rien à maquetter. (Lu comme validé.)
- **Menu de sauvegardes** — on garde le SaveMenu actuel de PokéWorld, hors périmètre de la refonte.
- **Modèle de la base secrète** — les bases se trouvent dans les lieux, il n'y a pas de fenêtre de modèle.

Le catalogue passe de 57 à **54 écrans**, `checkall` : 0 problème, 0 pageerror.

### À vérifier en une seule fois

1. **Lieu** — plaque centrée dans l'image + le fond qui descend jusqu'en bas (fais défiler le cadre).
2. **Starter mobile** — bascule le catalogue sur « Mobile 390 ».
3. **Combat** — plus d'icône devant « Résumé » (et le zip, si tu veux le voir en jeu).

### Prochaine étape

**Lot C-cœur** : Sac, Pokédex, Boutique, Marché, Badges, Dictionnaire, Atoll, Succès plein écran —
maquettés d'un bloc, puis validés d'un coup.

---

## 11. Lieu mobile — la cause exacte du fond qui s'arrêtait (2026-11-08)

### Ce qui n'allait pas

La fenêtre mobile du catalogue était rendue avec un **`height:100%` en style en ligne** :

```html
<div class="win" style="border:0;border-radius:0;height:100%">
```

Sur un écran de 390 × 844 le cadre laisse 724 px à la fenêtre. Le panneau était donc **haut de
724 px** alors que son contenu (Lieu) en faisait **837** : tout le bas du contenu — sections, cartes,
bouton « Explorer » — reposait sur le fond nu du cadre. Le correctif précédent (« c'est le cadre qui
défile ») avait bien rendu le bas atteignable, mais il ne pouvait pas faire grandir un élément dont
la hauteur était écrite en dur.

### La correction (une ligne, au bon niveau)

```html
<div class="win" style="border:0;border-radius:0;min-height:100%">
```

`min-height` au lieu de `height` : la fenêtre **remplit au minimum** le cadre et **grandit** avec son
contenu ; c'est le cadre qui défile. C'est la règle du jeu réel, où la page défile et où les fenêtres
sont en hauteur automatique.

Mesures après correction (cadre mobile 390 px) :

| Écran | Fenêtre | Défilement du cadre |
|---|---|---|
| Lieu | 879 px (avant : 724) | 879 / 724 |
| Équipe | 1 173 px | 1 173 / 724 |
| Carte, Combat | 724 px | rien à défiler |

### Vérification

- Les **54 écrans** ont été rendus en mobile **et** en tablette, descendus jusqu'en bas, et la bande
  juste au-dessus de la barre d'onglets a été contrôlée au pixel : **aucun fond nu** sous un panneau.
- `checkall` : **54 écrans, 0 problème, 0 pageerror**.
- Captures : `cat-lieu-mobile.png` (haut) et `cat-lieu-mobile-bas.png` (descendu jusqu'en bas — le
  fond descend jusqu'à la barre d'onglets, « Explorer les herbes hautes » est atteignable).
- Jeu réel (1.16.37) : contrôlé aussi, aucune fenêtre ne déborde de son propre fond. **Aucun
  changement de code du jeu n'était nécessaire**, donc pas de nouvelle version ni de nouveau zip.

### Il ne reste que ça à valider

**Lieu mobile** — fais défiler le cadre du catalogue (bascule « Mobile 390 ») jusqu'en bas : le fond
du panneau doit aller jusqu'à la barre d'onglets, sans bande noire. Si c'est bon, **Lieu est validé**
et le Lot C-cœur démarre (Sac, Pokédex, Boutique, Marché, Badges, Dictionnaire, Atoll, Succès plein
écran).

---

## 12. Lieu validé + barres de défilement supprimées + Lot C-cœur (2026-11-08)

### Validé

- **Lieu** — validé par toi : la plaque est centrée sur le décor et le fond descend jusqu'en bas sur
  mobile. Plus aucune retouche dessus.

### Barres de défilement

Ta consigne : **aucune barre de défilement visible, nulle part**.

- **Jeu (1.16.37)** : la règle universelle existait déjà (`assets/css/core/base.css`, bloc
  « Universal Scrollbar Elimination ») : `scrollbar-width:none` + `::-webkit-scrollbar
  {display:none}` sur `*`. Contrôle refait à 1280×800, 1600×900 et 390×844 :
  **0 px de rail, sur le document comme sur tous les conteneurs défilants**. Rien à changer.
- **Catalogue** : c'était **lui** qui montrait des barres (le cadre et le tableau de bord avaient
  encore `::-webkit-scrollbar{width:8px}`). La **même règle que le jeu** est maintenant posée dans le
  style du catalogue. Le défilement reste possible (molette, doigt, clavier) : seul le rail disparaît.
  Vérifié : `document : 0 px de rail`, et les 54 écrans × 3 formats ne montrent plus aucune barre.

### Lot C-cœur — les huit écrans refaits

Chacun reprend **le comportement réel du jeu** (lu dans `src/panels/fullscreen/`) et **la grammaire
PokéChill** (listes, pastilles, sections), avec notre DA. C'est du **données → composants** : aucune
brique n'est propre à un seul écran.

| Écran | Ce qu'il montre maintenant | Source réelle |
|---|---|---|
| **Sac** | 7 onglets **réels** avec leur quantité, tri, quantité, recherche, réinitialiser, lignes icône + nom + description + ×n | `BagPanel`, `BagCategories`, `BagItemRow` |
| **Pokédex** | Vus / Capturés / Chromatiques, progression par région + objectif Charme Chroma, filtres au format Boîte PC, **zone de disponibilité de chaque espèce**, manquants en « ? » | `PokedexPanel` |
| **Boutique** | Portefeuille (Pokédollars + points de quête), offres icône / nom / prix / « Sac : n », offre à **achat unique**, boutique **verrouillée**, barre Reset / qté / +10 / +100 / Max / total / **Acheter** | `ShopPanel`, `ShopItemCard`, `ShopFooter` |
| **Marché** | Points de quête, 4 sections (Starters, Fossiles, Rares, Autres), espèce non vue = **???**, Poké Ball réellement possédée, prix, barre d'achat | `MarketPanel`, `MarketRules`, `MarketPokemonCard` |
| **Badges** | Onglets Tous + régions, compteurs badges / ligues, cartes d'arène (badge, dresseur, ville, obtenu ou non), cartes de Ligue | `BadgesPanel` |
| **Dictionnaire** | 3 onglets (Objets, Attaques, Talents), recherche, possédé / non possédé, « n Pokémon connaissent cette attaque », talent débloqué + rareté | `DictionaryPanel`, `DictionaryCatalog` |
| **Atoll** | 6 onglets, en-tête jetons + série / record, 4 installations, Fragments de Légende, formats avec rang / bannis, boutique en jetons | `AtollFullscreenPanel` |
| **Succès plein écran** | Filtres Tous / En cours / Terminé / **Épinglés** + famille + recherche, **bonus permanents actifs**, cartes à **paliers** (x / y, %, rang, pastilles, épinglé, bonus) | `AchievementsFullscreenPanel` |

Briques nouvelles, toutes paramétrées (`lc-` = « lot C ») : `lc-av`, `lc-wal`, `lc-foot`, `lc-offers`,
`lc-rp`, `lc-badges` / `lc-badge`, `lc-hero`, `lc-hub`, `lc-mode`, `lc-rank`, `lc-bonus`, `lc-tiers`.
Elles n'existent qu'une fois et servent les huit écrans.

### Vérifications

- `checkall` : **54 écrans, 0 problème, 0 pageerror**.
- Captures PC **et** mobile pour les huit écrans ; thèmes **Sombre** et **Clair** contrôlés (aucune
  couleur en dur : tout passe par les variables de thème).
- Rien de validé n'a été touché : Tableau de bord PC, Équipe, Combat, Starter, Raccourcis, Monnaies,
  Poké Balls, Succès (fenêtre), Presets, Lieu.

### À vérifier en une fois

1. **Sac** — les 7 onglets ont leur quantité, la ligne montre description et quantité.
2. **Pokédex** — compteurs, progression de région, et surtout la **zone** affichée sous chaque espèce
   (y compris pour les manquants, en « ? »).
3. **Boutique** — sélection d'une offre (bordure), barre d'achat, offre à achat unique, boutique
   verrouillée.
4. **Marché** — prix en points de quête, « Possédé », espèce non vue en « ??? ».
5. **Badges** — compteurs 2 / 8 et 0 / 3, badges obtenus en couleur, les autres éteints.
6. **Dictionnaire** — les trois onglets, « Possédé ×42 », « Non possédé » avec cadenas.
7. **Atoll** — jetons + série / record, quatre installations, Fragments, formats.
8. **Succès plein écran** — pastilles de paliers, rang, « Épinglé », x / y et %.
9. **Barres de défilement** — plus aucune, ni dans le catalogue ni dans le jeu.

### Prochaine étape (après validation)

Deuxième moitié du lot C : **fiches** (Pokémon, objet, dictionnaire, Pokédex), **filtres de capture**,
**bilans** (combat + AFK), **visite / PC de base secrète**, **Pension / Mine / Base / Entraînement**
(lisibles, avec bouton Gestion, outils et slots).

## §13 — Passe « v21 » (2026-11-08) : les 9 retours traités dans le catalogue

Passage du catalogue à **55 écrans** (ajout de *Atoll — Boutique*, la page boutique du Battle
Frontier). `checkall` : 55 écrans, 0 problème, 0 erreur de page. Thèmes clair et contrasté :
les 10 écrans du Lot C ont un fond et aucune erreur. Aucun débordement horizontal réel sur
les 55 écrans × PC/mobile.

| Retour v21 | Traitement | Écran(s) |
|---|---|---|
| 1. Pas de `?` dans l'en-tête | `TopBar` et en-tête plein écran sans `HelpBtn` : marque + « Badges : x / y » + roue crantée | tous |
| 2. Pas de flèche retour mobile | `.frame.mobile .fs .back{display:none}` — une seule règle, valable pour toutes les pleines pages | toutes les pleines pages |
| 2 bis. Sac, catégories | grille de catégories à libellés courts et compteurs (4 par ligne, 3 sur mobile), état actif = accent ; recherche + compteur sur une ligne | Sac |
| 3. Filtres façon PokéChill | composant unique `CollFilters` : boîte « Filtres », listes déroulantes (statut / région / type / rang / tri), « Réinitialiser », recherche + compteur | Boîte PC, Pokédex, Succès plein écran |
| 3 bis. Sans Lieu / espèce / cadre | les sélections Pokémon n'affichent plus que numéro, sprite, nom ; `MissCell` = numéro + pastille « ? » + nom | Boîte PC, Pokédex |
| 4. Boutique = modèle | le Marché reprend la carte de la Boutique (icône + Ball, nom, prix, ligne d'état), 4 offres par rayon, barre d'achat, bloc verrouillé | Marché, Boutique |
| 5. Un fond partout | la pleine page peint le décor de la zone (`--zone-art`, opacité 0,3) sous une surface translucide | toutes les pleines pages |
| 6. Dictionnaire | onglets en liste, recherche, deux colonnes de lignes icône / nom / état, coche ou cadenas ; plus aucun texte d'aide | Dictionnaire |
| 7. Atoll | accueil = jetons + bannière de ligue + 4 tickets (icône, record, description, vignette de zone avec sprite) + Fragments de Légende ; la boutique devient une page (6 onglets) | Atoll, Atoll — Boutique |
| 8. Succès | mêmes filtres que la Boîte PC, 4 bonus permanents, 14 succès, tags de rang aux couleurs du jeu (bronze / argent / or), paliers, barre + x / x + % | Succès plein écran |
| 9. Barres de défilement | inchangées (validées) | — |

Données ajoutées pour que les pages ne paraissent pas vides : 77 espèces manquantes de Kanto
(numéro + nom), 18 objets / 12 attaques / 6 talents au dictionnaire, 14 succès, 16 offres au
Marché, 30 emplacements de carton en Boîte PC.

## §14 — Passe « DA unique » (2026-11-08) : le Lot C reconstruit sur la fenêtre Lieu

Tout le Lot C a été **réécrit avec les primitives existantes** ; ses anciennes classes
(`bagcats`, `fbox`, `fsel`, `lc-offer`, `lc-ticket`, `lc-badge`, `servrow`, `dicrow`,
`succgrid`, `achrow`…) ne sont plus utilisées.

| Retour | Traitement |
|---|---|
| Sac : mauvais fond | la pleine page **est** une fenêtre : `.win` (surface, bord, rayon, en-tête 42 px) — même fond que Lieu, Combat, Quêtes. Le décor de zone est supprimé |
| Sac : bouton jaune | sélecteur unique `Seg` aux couleurs PokéChill : `--dark2` au repos, `--light1` actif avec texte sombre |
| Sac : « n dans catégorie · n au total » | supprimé ; le total vit dans l'en-tête (`.win-h .r`), comme les autres fenêtres |
| Sac : grille | grille de **cellules PokéChill** : pastille ronde `--dark2` + sprite + nom + quantité |
| Filtres | un composant `Filters` = de **vrais `<select>`** étiquetés, en grille adaptative (comme le Pokédex PokéChill). Boîte PC 12 filtres, Pokédex 8, Succès 6 |
| Boîte PC : cadre + carton | emplacements pointillés et texte « Carton n sur n » supprimés |
| Boutique / Marché | plus aucune catégorie, plus d'encart d'argent interne : le **panneau Monnaies** est posé au-dessus du contenu, mobile et PC |
| Dictionnaire | fond de fenêtre + lignes `.row` en 2 colonnes (PokéChill 48 %) |
| Atoll | boutons de page = `Seg` (32 px, pleine largeur, 6 pages) ; disposition en lignes `.row` comme Lieu |
| Uniformisation | un seul sélecteur (`Seg`, qui remplace aussi les onglets `.tab` de tous les écrans), un seul bouton (`Btn`, taille `sm` quand la ligne l'exige), une seule cellule (`.card`), une seule ligne (`.row`), une seule grille (`.cards` / `.colgrid`) |
| Textes | notes « Rotation toutes les 12 h », descriptifs d'installation, aide du dictionnaire : supprimés. Ne restent que les données (nom, état, prix, progression) |

Contrôles : `checkall` 55 écrans / 0 problème / 0 erreur ; thèmes sombre, clair et contrasté
sur les 10 écrans, PC et mobile : fond présent, aucun débordement horizontal.

## §15 — Passe « fond du jeu » (2026-11-08) : page = fenêtre posée sur le décor du jeu

- **Fond** : le banc du catalogue reproduit maintenant le fond de page réel du jeu
  (`--dark1` + `bg/main-bg.png` en tuile à 8 % + les deux dégradés radiaux de `core/base.css`).
  Une pleine page est une **fenêtre `.win`** de 10 px de marge posée sur ce décor — exactement
  comme Lieu, Combat, Quêtes. Sur mobile la fenêtre est bord à bord (`margin:0`, sans bords
  latéraux), comme `body.mobile-mode .dash-win` dans le jeu.
- **Filtres** : refaits sur la grammaire du Pokédex PokéChill — une **boîte sombre translucide**
  avec le titre « Filtres », un filet, puis des `<select>` **sans étiquette externe** : c'est la
  première option qui nomme le filtre (`statut`, `type`, `région`…). Recherche en boîte pleine
  largeur en dessous. Boîte PC 12 filtres, Pokédex 8, Succès 8 (statut, famille, rang, palier,
  bonus, récompense, épinglé, tri).
- **Cellule** : pastille ronde `--dark2` **sans cadre** (cellule PokéChill), nom 12 px,
  valeur 11 px — plus aucune case encadrée dans une grille.
- **Sélecteur** : 36 px de haut, texte `--light2` au repos (plus lisible), `--light1` + texte
  sombre à l'actif. Il sert au Sac, au Dictionnaire, aux Badges et aux six pages de l'Atoll.
- **Succès** : bonus permanents en cellules avec icône, succès en lignes `.row` sur 2 colonnes ;
  fond et filtres identiques au reste.
- Class renommée `.card` → `.gcell` pour ne pas hériter de la `.card` bordée du reste du catalogue.

`checkall` 55 écrans / 0 problème / 0 erreur ; thèmes sombre, clair, contrasté + PC/mobile :
fond présent partout, aucun débordement.

## §16 — Passe « v23 » (2026-11-07) : cellules PokéChill, pastilles, une seule sélection

- **Cellule `.gcell` = la tuile du menu Objets de PokéChill** : tuile `--dark2` rayon 10,
  icône sur 58 px, puis **barre de libellé pleine largeur `--light1` avec texte
  `--pw-bg-header` 11,5 px / 700** (nowrap + ellipse), puis prix `--light2`. Le nom ne peut plus
  se tronquer par accident (`display:block;width:100%;min-width:0`). C'est la forme des tuiles
  d'objet du jeu, pas une case encadrée.
- **Collision `.sel` corrigée** : le catalogue avait une règle globale `.sel` (ligne de réglage
  `label + valeur + chevron`) qui s'appliquait aussi aux cellules sélectionnées et **déformait la
  tuile** (padding 6/9, `justify-content:space-between`, hauteur supérieure aux voisines).
  Renommée `.selbox` ; `Sel()` et les deux usages suivis. Même famille de bug que `.card` en §15.
- **Sélection unifiée — plus aucun jaune** : `.gcell.sel` = tuile `--dark3` + **bord `--light1`**
  (1 px + halo 1 px). Le bouton primaire (`Acheter`) passe de `--pw-accent` à **`--light1` +
  texte `--pw-bg-header`**, comme la pastille active. Le champ de quantité perd son bord jaune.
  Règle retenue : **`--dark2` au repos / `--light1` à l'actif**, jamais `--pw-accent` en aplat.
- **Filtres = `#pokedex-filters` de PokéChill, à la lettre** : `border:0`, rayon 999, fond
  `--dark2`, texte `--light2`, 28 px, 12 px de texte ; **plus de boîte, plus de titre « Filtres »,
  plus de filet** — les pastilles sont posées directement sur le panneau, plus une pastille de
  réinitialisation. La première option nomme toujours le filtre.
- **Dictionnaire / tablette** : `.colgrid` de `minmax(500px,1fr)` à **`minmax(320px,1fr)`**.
  Vérifié en 768 px : **2 colonnes** de fiches (contre 1 avant), sans resserrement — la fiche a
  besoin de ~320 px. En 390 px on reste à 1 colonne, en 1280 px à 3.
- **Sac mobile** : pastilles de catégorie (actif = `--light1`), recherche pleine largeur,
  tuiles sur 4 colonnes, `--light1`/`--pw-bg-header` à l'actif.
- **Atoll** : non retouché (validé sous réserve).

`checkall` : **55 écrans / 0 problème / 0 erreur de page** après chaque étape de cette passe.
Captures relues : `cat-sac-mobile.png`, `cat-sac-pc.png`, `cat-boutique-pc.png`,
`cat-boite-pc.png`, `cat-dictionnaire-tablet.png`, `cat-pokedex-mobile.png`.

## §17 — Portage dans le VRAI jeu : la fenêtre du tableau de bord (2026-11-07)

Décision : « la fenêtre d'abord, partout » + « le jaune nulle part en aplat ».
Premier lot exécuté dans `pokeworld-rework/` (pas dans le banc), validé par mesure + capture.

**Ce qui n'allait pas.** Le tableau de bord était à trois générations de `--dark2` empilées :
`--dark2`/`--dark3`, rayon 10 puis 12, en-tête 50 px, et une dernière règle
`background: var(--dark2) !important` qui écrasait tout ce qui était écrit avant.
Aucune ne portait la grammaire validée (référence Lieu) : `--pw-bg-surface`, `--pw-border-color`,
en-tête 42 px / 13-700, filet d'un pixel.

**Fichiers touchés (2).**
- `assets/css/layout/dashboard-grid.css` : `.dash-win` devient **l'unique définition** de la
  fenêtre (fond surface, bord `--pw-border-color`, rayon 10, `color: --light2`) et **surcharge
  trois tokens** au lieu de restyler l'en-tête :
  `--pw-header-h: 42px`, `--pw-bg-panel-header: color-mix(--pw-bg-header 70%, --pw-bg-surface)`,
  `--pw-border-panel-header: --pw-border-color`. Les **quatre générations mortes** (blocs
  `--pw-border/--pw-surface`, le bloc `!important` et le doublon final) sont supprimées : le
  composant d'en-tête étant partagé, aucune règle de fenêtre n'a plus à être réécrite.
- `assets/css/layout/window-chrome.css` : `.dash-win > .pw-win-hdr` ne code plus `--dark3` en
  dur pour son filet, il lit `--pw-border-panel-header` (repli `--dark3`).

**Portée volontairement limitée** : les modales, fiches et feuilles gardent l'en-tête 50 px —
elles ont été validées en l'état. Le jeton est surchargé sur `.dash-win`, donc les 13 fenêtres du
tableau de bord changent **ensemble**, d'un seul coup, sans duplication PC/mobile.

**Mesures après coup (Chromium, 1400 px)** : `#win-achievements` → fond `rgb(36,34,30)` ✔,
bord `rgb(74,62,49)` ✔, en-tête **42 px** ✔, fond d'en-tête `#1E1C19` ✔, filet `1px` ✔,
titre `700` ✔. Mobile 390 px : fond `rgb(36,34,30)`, en-tête 44 px (surcharge mobile existante).

**Tests** : `npm test` → **895 passed, 0 failed**. `dashboard-grid.css` : 360 → 331 lignes.

Captures : `game-dashboard-now.png` (avant), `game-dashboard-v24.png` (après),
`game-mobile-v24.png` (mobile).

**Prochain lot — « plus un seul aplat jaune »** : 25 déclarations `background: var(--accent|--pw-accent-color)`
réparties dans 14 feuilles (`ui-button`, `chips`, `ui-dropdown`, `ui-input`, `ui-dialog`,
`ui-panel`, `form-controls`, `window-chrome`, `pokemon-sheet`, `facilities`, `achievements`,
`quests`, `guide`, `settings`). Toutes passent en `--light1` + texte `--pw-bg-header` **au niveau
du composant partagé**, jamais panneau par panneau. Les icônes, les jauges et l'anneau de capture
gardent l'accent (usage de signal, pas d'aplat).

## §18 — Correction du portage : ce n'était pas la fenêtre, c'était le contenu (2026-11-07)

Retour : « ça ressemble exactement à l'ancien rendu ». Vérifié au pixel : 79 % des pixels
avaient changé, mais **le cadre d'une fenêtre ne pèse presque rien** — chaque panneau repeignait
par-dessus sa propre dalle `--dark2`, ses propres tailles de texte et son titre centré. La
fenêtre était donc un détail invisible. Le vrai écart était **dans les panneaux**.

Corrigé dans ce lot (mesuré après coup, `npm test` **895/0**) :

| écart | avant | après |
|---|---|---|
| titre de fenêtre | centré (`position:absolute; left:50%`) | **à gauche, à 8 px de l'icône** — les 13 fenêtres d'un coup |
| taille du titre | 12 px | **13 px** (échelle de la banque) |
| rayon de fenêtre | 8 px (`--pw-radius-md` posé par `base.css`) | **10 px**, via un jeton unique `--pw-window-radius` |
| carte de quête | `--pw-bg-surface`, 13/900, sans apparence de carte | **`--pw-bg-header`**, filet `--pw-border-color`, rayon 10, 9 px, titre 12/800, texte 10,5 secondaire |
| libellés de section | 13/900 avec filet et couleurs bleu/accent | **11/800 capitales `--pw-text-secondary`**, sans filet |
| lignes du tableau Poké Balls | 38 px, filets `--dark3`, nom 13 px | **30 px, filets `--pw-border-color`, nom 11,5, en-têtes 10,5/800**, ballon 16 px |
| ligne de succès du tableau de bord | 97 px, badge sur 2 lignes, compteurs sur une 2ᵉ ligne, titre 14/900 | **titre 11,5/700, badge sur une ligne, barre + compteurs sur la même ligne**, carte `--pw-bg-header` + filet |
| titre de la fenêtre Quêtes | « Histoire & Quêtes » | **« Quêtes »** (demande v8) |

`cmp-dashboard-gauche.png` = colonne de gauche, catalogue à gauche / jeu à droite, **à la même
échelle** (1:1 puis ×1,35) — la seule comparaison honnête. `cmp-quetes.png` = la fenêtre Quêtes.

**Ce qui reste, fenêtre par fenêtre** (aucun de ces points n'est cosmétique de cadre) :
Monnaies (3 colonnes au lieu d'une), Raccourcis (rangées alignées icône + libellé), Équipe
(bandeau), Combat en direct, Carte, Lieu, Pension, Mine, Entraînement, Base secrète.
Les écrans validés gardent leur contenu : je ne touche qu'à la **grammaire** (fond, filet,
échelle typographique, densité), jamais aux informations affichées.

Fichiers de ce lot : `layout/dashboard-grid.css`, `layout/window-chrome.css`, `core/tokens.css`,
`core/base.css`, `panels/quests.css`, `panels/achievements.css`,
`components/pokeball-filters.css`, `localization/fr/ui.js`.
