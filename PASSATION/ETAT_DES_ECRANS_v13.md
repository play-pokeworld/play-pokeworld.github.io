# État des écrans — v13.4 (2026-11-09, après le portage jeu de la 1.16.60)

> **60 affichages du catalogue** (56 + les 4 centres de combat de l’Atoll) + **8 écrans du jeu
> à ajouter au catalogue**.
> Remplace `ETAT_DES_ECRANS_v12.md` (07/11, 54 écrans, écrit **avant** le Lot C-cœur).
> Aucun état n'est coché sans une trace : chaque ligne dit **où** l'état vient de là.

| Ton statut | Nombre |
|---|---|
| 1 · Validé dans le catalogue **et** mis en jeu | **20** |
| 2 · Validé dans le catalogue, **pas encore en jeu** | **0** — vidé par la 1.16.57 |
| 3 · Fait dans le catalogue, **à valider** — **et porté en jeu** depuis la 1.16.60 (voir §1.3) | **14** |
| 4 · Pas encore dans le catalogue alors qu'il est noté **à modifier** | **25** + **8** écrans de jeu à ajouter |
| 5 · Aucune modification à faire entre les deux reworks | **1** |

---

## Comment lire ce document

Trois faits par ligne, jamais un jugement global :

- **Catalogue** : la référence existe. L'identifiant entre parenthèses est celui du catalogue
  (`SCREENS[].id`), c'est par là que tu le retrouves dans la liste de gauche.
- **Ta validation** : `VALIDÉ` seulement si tu l'as dit. La source est citée (§ de la v12 ou
  section du fichier de passation). Sinon `non validé` — même si l'écran est beau.
- **Jeu** : `porté` seulement s'il existe une trace de portage (version + capture ou mesure).
  Un portage *annoncé* sans contrôle est écrit « annoncé, non contrôlé » et ne compte pas.

---

## 1. Ce que tu dois valider maintenant — statut 3 (14 écrans)

C'est la seule liste qui demande ton œil aujourd'hui. Tous les autres statuts sont soit fermés,
soit en attente de moi.

> **Ouvre `catalogue/VALIDATION_A_VALIDER.html`** (ou la copie autonome
> `VALIDATION_A_VALIDER.html` livrée avec le zip, qui contient le catalogue dans le même fichier) :
> **3 points globaux + 56 points de contrôle sur quatorze écrans**, à cocher, avec un champ de verdict
> par écran et un bouton « Exporter ma réponse ». Chaque carte a un bouton « Voir le cadre » qui
> affiche l'écran dans le catalogue.

### 1.1 Les trois points globaux (une fois pour toutes)

| # | Point | Où le voir |
|---|---|---|
| G1 | Aucun nombre ni texte à droite des en-têtes : le titre, la croix, rien d'autre | Sac, Boîte PC, Pokédex, Marché, Boutique, Badges, Dictionnaire, Atoll, Succès, fenêtres du tableau de bord |
| G2 | La quantité « 1 » des barres d'achat est une **case carrée**, plus une pastille ronde | Boutique, Marché, Atoll — Boutique |
| G3 | En 390, un sélecteur à six pages passe à la ligne : aucun libellé coupé | Atoll et ses quatre centres de combat |

### 1.3 Ce que la 1.16.60 met en jeu (09/11)

Le 09/11 tu as répondu « tu peux coder » sur neuf chantiers, et tranché les trois questions
ouvertes. Le **jeu** a donc bougé cette fois, pas le catalogue seul.

| Chantier | Ce que le jeu fait maintenant | Preuve |
|---|---|---|
| **Header global** | plus aucun nombre à droite : le bloc « Badges : n/total » n'est plus rendu (les nœuds restent en DOM, cachés, pour les tests) | `portage11660/header.png` |
| **Lieu, Sac, Boîte PC, Pokédex, Dictionnaire** | rien d'autre à changer : ces écrans n'avaient que le compteur du header | — |
| **Boutique / Marché / Atoll — Boutique** | quantité en case **carrée** (72 × 29, rayon 7 px) ; la boutique Atoll gagne la barre complète Reset / champ / +10 / +100 / Max / total / Acheter, avec achat par lot | `portage11660/shop.png`, `atoll-shop-selected.png` |
| **Badges** | même grille, mais **10 colonnes** désormais (24 badges = 10 + 10 + 4), plafond interne de 1000 px retiré | `portage11660/badges.png` |
| **Atoll au complet** | **accueil en liste de tickets** (icône, nom, record, chevron), une rangée par centre de combat ; les quatre pages Tour / Usine / Arène / Dôme sont inchangées | `atoll-home.png`, `atoll-home-mobile.png`, `atoll-tower.png` |
| **Starter régional** | le **composant du starter de Kanto** : cartes sable, sprite en haut, nom, description, pastille « Choisir » — PC et mobile, trois cartes sur une ligne en 390 | `regional-starter.png`, `regional-starter-mobile.png` |
| **Menu de navigation** | déjà conforme (`0 0 10px 10px`) : point de contrôle, pas de correctif | `nav-menu.png` |
| **Largeur PC** | décision prise : **1280 px** de référence pour toutes les fenêtres plein écran de bureau (960 → 1280) | mesuré : conteneur 1280, badges 7 → 10 colonnes |
| **SaveMenu** | case du Pokémon et zones « badges / pokédex / temps » en **semi-transparent blanc/gris**, textes en encre sombre | `save-card.png`, `save-menu-with-save.png` |

Les trois questions ouvertes sont fermées : largeur = 1280 en PC (mobile intact), starter régional =
cartes du catalogue pour PC **et** mobile, accueil de l'Atoll = liste du catalogue.

### 1.2 Les quatorze écrans

| # | Écran | Points | Ce qui a changé le 09/11 (passe v31) |
|---|---|---|---|
| 1 | **Sac** (`sac`) | 5 | Rien : le compteur du header disparaît (G1) |
| 2 | **Boîte PC** (`boite`) | 4 | Rien : le compteur du header disparaît (G1) |
| 3 | **Pokédex** (`pokedex`) | 4 | Rien : le compteur du header disparaît (G1) |
| 4 | **Marché** (`marche`) | 4 | Le nombre d'offres du header disparaît (G1), la quantité passe en case carrée (G2) |
| 5 | **Boutique** (`boutique`) | 4 | Le nom « Boutique de Jadielle » du header disparaît (G1), la quantité passe en case carrée (G2) |
| 6 | **Badges** (`badges`) | 5 | **Grille refaite sur celle du jeu** : emblème réel, nom sur bandeau clair, dresseur puis ville, compteurs de groupe |
| 7 | **Dictionnaire** (`dictionnaire`) | 4 | Le nombre d'entrées du header disparaît (G1) |
| 8 | **Atoll** (`atoll`) | 4 | Inchangé — à valider en même temps que les quatre centres de combat |
| 9 | **Starter régional** (`starter-regional`) | 3 | **Plus de nom de dresseur**, ligne d'accueil et titre selon la région et son professeur (Johto, Prof. Orme) |
| 10 | **Menu de navigation** (`nav-menu`) | 4 | **Angles droits en haut, arrondis en bas** |
| 11 | **Atoll — Tour Combat** (`atoll-tour`) | 4 | **Nouveau cadre** : relevé sur le jeu (7 rangs, rotation, équipes adverses) |
| 12 | **Atoll — Usine Combat** (`atoll-usine`) | 4 | **Nouveau cadre** : 2 formats, équipe prêtée |
| 13 | **Atoll — Arène Combat** (`atoll-arene`) | 3 | **Nouveau cadre** : 3 formats courts |
| 14 | **Atoll — Dôme Combat** (`atoll-dome`) | 4 | **Nouveau cadre** : demi-tournoi + Finale et ses bannis |

Les quatre centres de combat sont **relevés sur le jeu** (textes, rangs, règles et équipes de la
rotation) : les valider, c'est confirmer que le catalogue les représente fidèlement. Le seul écart
connu est la largeur du cadre : le catalogue dessine en 1280, le jeu en 960, donc il y a plus de
colonnes au catalogue (badges : 10 au lieu de 7 ; formats de l'Atoll : 3 dans les deux cas).

**Écarts fermés en 1.16.60** : la largeur (le jeu passe à la référence 1280 en PC, d'où 10 colonnes
de badges au lieu de 7) ; le starter régional (le jeu prend les cartes verticales du catalogue, en PC
comme en mobile) ; l'accueil de l'Atoll (le jeu prend la liste de tickets du catalogue).

---

## 2. Les cinq listes

### 2.1 Statut 1 — Validé dans le catalogue **et** mis en jeu (20)

Fermés. Les neuf premiers étaient déjà en jeu avant la 1.16.57 ; les neuf suivants y sont entrés avec
elle, chacun avec sa paire rendue dans `PASSATION/shots/2026-11-09/portage11657/`.

| Écran | Validation (source) | Jeu (trace de portage) |
|---|---|---|
| **Tableau de bord PC** (`dashboard`) | VALIDÉ (v12, Pages) | Fenêtre portée §17–§18 ; paire rendue le 09/11 : conforme |
| **Lieu** (`lieu`) | VALIDÉ (§12) | 1.16.35 (`location.css`, plaque translucide) + capture |
| **Équipe** (`equipe`) | VALIDÉ (v12) | 1.16.36 : carte sable, boîte sombre, 4 capacités à 33 px + capture |
| **Combat en direct** (`combat`) | VALIDÉ (v12) | 1.16.34 : 4 emplacements à 35 px, carte du sauvage alignée |
| **Poké Balls** (`pokeballs`) | VALIDÉ (v12) | 1.16.51 : lignes 34 px, en-têtes 11/800, ballon 16 px |
| **Raccourcis** (`raccourcis`) | VALIDÉ (v12) | Rien à porter : le jeu appliquait déjà la règle |
| **Monnaies** (`currencies`) | VALIDÉ (v12) | 1.16.51 : grille de 3 cellules, valeur 14/800 |
| **Succès (fenêtre)** (`succes-win`) | VALIDÉ (v12) | 1.16.51 : carte 84 px, pastille de rang sur une ligne |
| **Choix du starter** (`starter`) | VALIDÉ PC (v12) | 1.16.34 : DA, textes, fond non uni + captures PC et mobile |
| **Légende de la carte** (`map-help`) | VALIDÉ (v12) | **1.16.57** : feuille 680, une rangée par état réel, Fermer — `paire-map-help.png` |
| **Choix de la Poké Ball** (`ball-picker`) | VALIDÉ (v12) | **1.16.57** : feuille 680, rangées sprite + taux, quantité à droite — `paire-ball-picker.png` |
| **Dialogue PNJ** (`pnj`) | VALIDÉ (v12) | **1.16.57** : liste en rangées, conversation encadrée, pied Retour/Fermer — `paire-pnj.png` |
| **Quêtes répétables** (`quetes-repeat`) | VALIDÉ (v12) | **1.16.57** : feuille + offres en rangées, head et contrats actifs conservés — `paire-quetes-repeat.png` |
| **Résolution d'énigme** (`puzzle-solve`) | VALIDÉ (v12) | **1.16.57** : feuille, symboles en cases 44 px, pied Réinitialiser/Valider — `paire-puzzle-solve.png` |
| **Presets d'équipe** (`presets`) | VALIDÉ (v12) | **1.16.57** : colonne 680, nom + compteur, membres et actions — `paire-presets.png` |
| **Confirmation du starter** (`starter-confirm`) | VALIDÉ (v12) | **1.16.57 : créée.** Le clic sur une carte ouvre « Confirmer le choix » — `paire-starter-confirm.png` |
| **Quitter le combat** (`confirm-quitter`) | VALIDÉ (v12) | **1.16.57 : créée.** Le bouton demande avant de sortir — `paire-confirm-quitter.png` |
| **Relancer la partie** (`confirm-relance`) | VALIDÉ (v12) | **1.16.57** : le composant `ConfirmDialog` prend la grammaire du cadre (il sert toutes les confirmations du jeu) — `paire-confirm-relance.png` |
| **Atoll — Boutique** (`atoll-boutique`) | **VALIDÉ le 09/11** (« Atoll Boutique : Validé ») | Onglet Boutique de l'Atoll en jeu (offres en jetons, offre verrouillée) — `paire-atoll-boutique.png` |
| **Succès plein écran** (`succes-fs`) | **VALIDÉ le 09/11** (« Succès plein écran : validé ») | `AchievementsFullscreenPanel` : mêmes filtres que la Boîte PC, 4 bonus, cartes de succès |

**Écarts fermés en 1.16.59 (passe catalogue v31)** — onze points, tous côté catalogue, le jeu
étant la référence : texte à droite des en-têtes supprimé partout (Sac, Boîte PC, Pokédex, Marché,
« Boutique de Jadielle », Badges, Dictionnaire, Atoll, Succès, fenêtre Carte) ; quantité des barres
d'achat en case carrée ; grille des badges refaite sur `UIBadgeCard` (emblème réel, bandeau clair,
dresseur puis ville, compteurs de groupe, 24 badges + 3 ligues) ; quatre cadres de centres de combat
relevés sur `AtollFullscreenPanel` ; starter régional sans nom de dresseur, ligne d'accueil et titre
par région et par professeur ; panneau de navigation arrondi en bas seulement ; sélecteurs à six
pages qui passent à la ligne en 390. Les paires sont dans
`PASSATION/shots/2026-11-09/catalogue-v31/`.

**Écarts fermés en 1.16.58** : le cercle « + » des emplacements de preset vides, la pastille
« active » passée de l'accent au clair, le ✕ retiré des feuilles (le catalogue n'en dessine pas), la
ligne de filtre inutile dans le choix de la Poké Ball, et le bouton « Quitter » nommé comme le cadre.
La bande de sprites des presets existait déjà : elle ne s'affichait pas parce que la sauvegarde de test
était vide.

**Écarts assumés** (ils sont écrits dans `docs/PHASE_v1.16.57.md`, ils ne sont pas cachés) : les
cadres PNJ, quêtes répétables et énigme sont des maquettes simplifiées, la grammaire est portée et le
contenu réel conservé ; la légende du jeu a six états réels là où le cadre en dessinait quatre
inventés ; le choix de balle affiche le taux de capture réel au lieu de « ×1 · taux 1.0 » ; les
presets n'ont pas la bande de sprites ni le cercle « + » du cadre.

### 2.2 Statut 2 — Validé dans le catalogue, **pas encore en jeu** (0)

Vide : c'était la file d'attente du portage, la 1.16.57 l'a vidée en entier.

### 2.3 Statut 3 — Fait dans le catalogue, **à valider** (14)

Détaillé au §1. Rappel de l'origine de chaque cadre :

| Écran | Pourquoi il est prêt maintenant |
|---|---|
| Sac, Boîte PC, Pokédex, Marché, Boutique, Badges, Dictionnaire, Atoll | Lot C-cœur redessiné (§12), puis 9 retours traités (§13), puis « DA unique » (§14), « fond du jeu » (§15), « v23 » (§16), puis la passe v31 du 09/11 (en-têtes sans texte à droite, grille des badges du jeu) |
| Menu de navigation | Cadre le plus récent ; angles du bas arrondis en v31 |
| Starter régional | Passe v31 : plus de nom de dresseur, textes par région et par professeur |
| Atoll — Tour / Usine / Arène / Dôme Combat | **Nouveaux cadres du 09/11**, relevés sur `AtollFullscreenPanel` |

### 2.4 Statut 4 — Pas encore dans le catalogue alors qu'il est noté **à modifier** (25)

Le travail de maquette n'est pas fini : soit le cadre est encore celui d'avant, soit il est partiel.
Colonne de droite = ce qui reste à y faire.

| Écran | État v12 | Ce qui reste |
|---|---|---|
| Carte (`carte`) | PARTIEL | Options de zoom ; légende posée en haut |
| Quêtes (`story`) | PARTIEL | DA complète de l'écran |
| Guide (`guide`) | PARTIEL | Liste dépliable façon PokéChill ; un seul en-tête, le « ? » y mène |
| Énigmes (`puzzles`) | PARTIEL | DA à faire |
| Pension (`pension`) | À REFAIRE | Ne reflète pas le gameplay (`HatcheryPanel.js`) |
| Mine (`mine`) | À REFAIRE | Idem (`MinePanel.js`) |
| Base secrète (`base`) | À REFAIRE | Infos inutiles + gameplay absent (`SecretBasePanel.js`) |
| Entraînement (`entrainement`) | À REFAIRE | Idem (`TrainingCenterPanel.js`) |
| Fiche Pokémon (`fiche-pokemon`) | À REFAIRE | EV / IV / stats, grammaire de la fiche |
| Fiche Pokémon — Bulbizarre (`fiche-pokemon-2`) | À REFAIRE | Même composant, autre Pokémon |
| Fiche objet (`fiche-objet`) | À REFAIRE | Fiche objet ; **aucun écran dédié en jeu** (le Sac ouvre la fiche dictionnaire) |
| Utilisation d'un objet (`use-item`) | À REFAIRE | Doit ouvrir la Boîte / le Pokédex pour choisir la cible |
| Fiche Pokédex (`fiche-dex`) | À REFAIRE | Fusion fiche Pokédex × nouvelle fiche Pokémon |
| Fiche dictionnaire (`fiche-dico`) | À REFAIRE | Fiche dictionnaire |
| Filtres de capture (`ball-filters`) | À REFAIRE | Gameplay réel manquant (`BallFilterEditorModal.js`) |
| Bilan de combat (`resume-combat`) | À REFAIRE | Reprendre `BattleSummaryModal.js` |
| Résumé d'absence (`resume-afk`) | À REFAIRE | Reprendre `AfkSummaryModal.js` |
| Visite de base (`base-visit`) | À REFAIRE | Gameplay réel absent (`SecretBaseVisitModal.js`) |
| PC de base (`base-pc`) | À REFAIRE | Gameplay réel absent (`SecretBasePcModal.js`) |
| Réglages (`reglages`) | PARTIEL | Fidélité à l'ancien affichage + DA |
| Export de sauvegarde (`telechargement`) | PARTIEL | DA à aligner ; **aucun écran en jeu** (l'export est un bouton dans Réglages) |
| Éditeur de preset (`preset-editor`) | À REFAIRE | Bandeau d'Équipe + gameplay (renommer, objets) |
| Gestion de la pension (`facility-pension`) | PARTIEL | Dépend du plein écran Pension |
| Gestion de la mine (`facility-mine`) | PARTIEL | Dépend du plein écran Mine |
| Gestion de l'entraînement (`facility-training`) | PARTIEL | Dépend du plein écran Entraînement |

#### Plus les 8 écrans du jeu qui n'ont **aucun** cadre (à ajouter au catalogue)

C'est ta réponse du jour : « Équipe est dans le catalogue, les autres doivent être ajoutés ».
Chacun a été ouvert en jeu et son titre relevé (`tools/measure/presence.mjs`).

| Écran du jeu | Identifiant | Titre réel à l'écran |
|---|---|---|
| Apprentissage de capacité | `MOVE_LEARN` | « Capacités apprenables » |
| Coquille de fossiles | `HATCHERY_FOSSILS` | Pension — coquille |
| Laboratoire de fossiles | `FOSSIL_LAB` | Laboratoire de fossiles |
| Améliorations répétables | `REPEATABLE_UPGRADES` | Améliorations répétables |
| Préparation de l'Usine | `ATOLL_FACTORY_PREP` | « Série Usine en cours » |
| Icône de sauvegarde | `SAVE_ICON_PICKER` | « Pokémon de la carte de sauvegarde » |
| PNJ de base secrète | `SECRET_BASE_NPC` | « Enregistrer le PNJ » |
| Télécharger PokéWorld | `DOWNLOAD_PROMPT` | « Télécharger PokéWorld » |

### 2.5 Statut 5 — Aucune modification à faire entre les deux reworks

| Élément | Pourquoi il n'y a rien à faire |
|---|---|
| **Architecture & anti-duplication** (`architecture`) | Ce n'est pas un écran de jeu : c'est la page de documentation de la maquette (elle correspond à `docs/`). VALIDÉ en v12 |
| **Menu de sauvegarde** (SaveMenu) | « On garde le SaveMenu actuel de PokéWorld, hors périmètre de la refonte » (§10) |
| **Tableau de bord mobile** | Supprimé du catalogue : sur mobile la fenêtre de base est Lieu, le reste passe par le menu de navigation (§10) |
| **Modèle de la base secrète** | Supprimé du catalogue : les bases se trouvent dans les lieux, il n'y a pas de fenêtre de modèle (§10) |
| **Paysage peint (décor de zone) + bande pixel** | Décor du jeu, pas un affichage du catalogue : rendu conservé tel quel (exception assumée, voir la note de la v12) |

---

## 3. Ce que cette v13 corrige par rapport à la v12

0. **Mise à jour du 09/11 (1.16.57)** : les neuf écrans du statut 2 sont passés en statut 1. Le
   statut 2 est vide.
0 bis. **Mise à jour du 09/11 (1.16.59)** : Atoll — Boutique et Succès plein écran sont validés et
   passent en statut 1 ; le catalogue gagne les quatre centres de combat de l'Atoll (56 → 60 cadres) ;
   la liste à valider compte 14 écrans et 59 points, dont 3 globaux.

1. **La v12 est datée du 07/11** : elle ignore le Lot C-cœur (§12), les 9 retours v21 (§13), les
   passes « DA unique » (§14), « fond du jeu » (§15) et « v23 » (§16). Neuf écrans y sont encore
   « À REFAIRE » alors qu'ils sont redessinés depuis.
2. **Ses compteurs d'en-tête sont faux** : « VALIDÉ 13 · À VALIDER 10 · PARTIEL 10 · À REFAIRE 24 »
   ne correspond pas à son propre tableau (19 VALIDÉ, 2 À VALIDER, 10 PARTIEL, 25 À REFAIRE).
   Les compteurs de cette v13 sont recalculés ligne par ligne.
3. **Deux écrans du catalogue n'y figurent pas** : `atoll-boutique` (ajouté en v21) et `nav-menu`.
4. **Deux erreurs de correspondance** : `telechargement` (« Export de sauvegarde ») avait été
   rapproché de `DOWNLOAD_PROMPT` — ce sont deux choses différentes (« Télécharger PokéWorld » est
   l'invite de téléchargement du jeu). Et `fiche-objet` n'a **aucun** écran dédié en jeu : le Sac
   ouvre la fiche dictionnaire.
5. **Le portage n'est pas la conformité.** Passation §0.5 annonce douze pleines pages et quatre
   fenêtres « portées » en 1.16.49 → 1.16.51. Les paires rendues le 09/11 montrent des **écarts
   réels** sur Sac, Boîte PC, Pokédex et Marché. C'est pourquoi ces quatre-là sont en statut 3
   (« à valider ») et non en statut 1, et pourquoi l'écart est écrit dans leur ligne.

---

## 4. Méthode — comment un écran change de statut

- **3 → 1** : tu dis « validé », et je rends la **paire** catalogue / jeu à la même largeur
  (`tools/measure/catalogue-frames.mjs` + `tools/measure/audit-all-windows.mjs`), plus la paire
  jointe dans la ligne.
- **3 → 2** : tu dis « validé », mais le jeu n'a rien ou diverge encore.
- **2 → 1** : je porte (ou je corrige), je rends la paire, et je note la version.
- **4 → 3** : j'ajoute ou je refais le cadre dans le catalogue.
- Un écran ne passe **jamais** en 1 sur la seule foi d'une note de portage.

Outils : `tools/measure/presence.mjs` (ouvre les 43 modales et relève leur titre),
`catalogue-frames.mjs`, `audit-all-windows.mjs`, `inventory.mjs`, `measure-catalogue.mjs`.
