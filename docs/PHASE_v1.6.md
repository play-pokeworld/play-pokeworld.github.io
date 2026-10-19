# Phase v1.6 — Dresseurs, arènes, ligues, boutiques, écrans plein écran

Version : **1.6.0** · Tests : **160 / 160** · Validation des données : `[]` · Imports : 0 problème.

---

## 1. Vos décisions appliquées

| Demande | Ce qui a été fait | Où |
|---|---|---|
| Luxe Ball : le Pokémon capturé est **niveau 5** | `LUXURY_CAUGHT_LEVEL: 5` (les autres balls : niveau 1) | `src/config/CaptureRules.js` |
| **Aucun palier / bonus** selon le nombre de balls possédées | paliers supprimés du calcul et des descriptions | `BallRules`, `CatchRateRules`, textes des balls |
| **IV plafonnés à 6** par stat | `IV_MAX: 6` (capture, doublons, équipes de dresseurs) | `src/config/PokemonRules.js` |

---

## 2. Dresseurs, arènes et ligues

### Données
- **73 dresseurs** générés depuis l'original (`src/data/raw/trainers-data.js`) : 24 champions d'arène,
  15 membres de ligue, rivaux, Team Rocket / Magma / Aqua, dresseurs de quête.
- **3 ligues** (`leagues-data.js`) : Kanto (12 000 ₽), Johto (14 000 ₽), Hoenn (16 000 ₽), affrontées à la suite.
- Chaque champion porte maintenant son **image de badge** (`badgeImage`) et sa **couleur** (`badgeColor`),
  reprises du panneau des badges de l'original.
- **Équipes de revanche** : champ `teams.rematch` (facultatif). Sans lui, la revanche rejoue l'équipe de
  base, comme dans l'original. Équipes selon le starter du joueur : `teams.byStarter`.
- Textes : `src/localization/{fr,en}/trainers.js` (`name`, `title`, `badge`, `intro`, `win`).
  Les 102 anciennes clés `trainer_battle_*` dupliquées ont été supprimées.

### Combats
- `TrainerSystem` (sans DOM) prépare un `TrainerBattleContext` : équipe choisie, répliques, récompenses.
  `BattleSystem` reste générique (il ne lit jamais les données de dresseurs).
- Le dresseur envoie ses Pokémon **l'un après l'autre** (1,5 s entre deux) ; une ligue enchaîne ses
  5 membres ; le journal affiche « X envoie Y », la réplique d'entrée et celle de défaite.
- Règles de l'original :
  - arène : **1ʳᵉ victoire** = badge + argent ; revanches = **pas d'argent** (message dans le journal) ;
  - ligue : 1ʳᵉ victoire = titre + argent ;
  - dresseur de quête : points de quête à chaque victoire, sans expérience ;
  - verrou : il faut assez de badges **de la région** (`badgesRequired`).

---

## 3. Fenêtre « Lieu » : actions de l'original

Les 4 boutons qui n'affichaient qu'une notification ont été remplacés par les **tuiles d'action**
de l'original (`UIActionTile`, construites par `panels/components/LocationActions.js`) :

| Tuile | Condition | Effet |
|---|---|---|
| Parler | toujours | dialogue générique (PNJ propres à chaque lieu : non portés) |
| Explorer | le lieu a des Pokémon sauvages | lance un combat sauvage |
| Boutique | le lieu a une boutique | ouvre la boutique plein écran ; « Boutique (Verrouillé) » si une ligue est requise |
| Arène / Ligue — Défier X | champion présent et assez de badges | combat contre le champion / la ligue |
| Arène / Ligue — Revanche X | déjà battu (style violet `pw-loc-gym-btn`) | combat de revanche |
| Arène — X (N badges requis) | pas assez de badges | ligne d'information, non cliquable |

La fenêtre se met à jour après un badge ou une victoire.

---

## 4. Carte de quête : bouton « Défier ! »

Pour les quêtes dont l'objectif est un dresseur (`boss`) ou un badge (`badge`), le bouton de la carte
devient **« Défier ! »** tant que la quête n'est pas terminée, puis **« Réclamer »**.
Comme dans l'original (correctif 2026-08) : si un combat est en cours, le 1ᵉʳ clic **arrête** ce combat
avec un message, le 2ᵉ clic lance le combat de quête.

---

## 5. Boutiques

- **38 boutiques** générées (`src/data/raw/shops-data.js`), reliées aux lieux par leur champ `shop`.
- Poké Balls ajoutées selon les badges requis du lieu (`src/config/ShopRules.js`) :
  Poké Ball toujours, Super Ball ≥ 2, Hyper Ball ≥ 5, Master Ball ≥ 8.
- **Master Ball** : une offre par monnaie (argent 10 M, jetons de donjon 25 000, points de quête 5 000,
  diamants 500), prix **+50 % du prix de base à chaque Master Ball achetée**.
- **Honor Ball offerte** toutes les 10 Poké Balls achetées.
- Objets limités par la taille de pile du sac (affiché « Sac : N max » en rouge, carte grisée).
- Boutique du Plateau Indigo **fermée** tant que la Ligue Kanto n'est pas gagnée.
- `ShopSystem` (sans DOM) vérifie tout (boutique du lieu, verrou, prix, place), paie, ajoute au sac,
  compte l'achat (`StatisticsData.purchases`, sauvegardé ; les anciennes sauvegardes lisent `{}`).

---

## 6. Écrans plein écran (nouvelle base)

`UIFullscreenPanel` (`src/ui/`) reproduit le panneau plein écran de l'original : fond noir à 92 %,
titre fixe avec ✕, barre de filtres fixe, **seul le contenu défile**, fermeture par ✕ ou clic sur le fond.
Chaque écran est une sous-classe dans `src/panels/fullscreen/`, ouverte par
`ModalOpenRequestedEvent(ModalIds.XXX)`.

| Écran | Contenu |
|---|---|
| **Boutique** (`ShopPanel`) | solde, grille des offres (icône, nom, prix avec icône de monnaie, quantité au sac), barre d'achat : Reset, quantité, +10, +100, Max, total, Acheter |
| **Badges** (`BadgesPanel`) | compteurs badges / ligues, onglets Tous / Kanto / Johto / Hoenn, 24 badges (halo coloré si obtenu, grisé sinon, champion, ville), 3 ligues (trophée doré, « ✓ Vaincue ») |
| **Sac** (`BagPanel`) | onglets avec compteurs (Poké Balls, Objets tenus, CT/CS, Évolution, Fossiles, Trésors, Objets-clés), tri dans les deux sens (nom, quantité), recherche globale, Réinitialiser ; « ✓ Pokémon » si l'objet est tenu ; un clic affiche la description |

Nouveaux widgets : `UIActionTile`, `UIFullscreenPanel`, `UIBadgeCard` (couleur transmise par une
variable CSS uniquement), `UIChip` ; composants `FilterBar`, `MoneyRow`, `PriceTag`, `ShopItemCard`,
`ShopFooter`, `BagItemRow`, `LocationActions`. CSS : `fullscreen-panel.css`, `shop.css`, `badges.css`, `bag.css`.

---

## 7. Couche de contenu « fait main » et guide

- `src/data/content/*-content.js` (12 fichiers) : jamais réécrits par les générateurs ; un nouvel id
  ajoute une entrée, un id existant remplace l'entrée générée.
- **`docs/GUIDE_CONTENU.md`** explique, exemples à l'appui, comment ajouter : Pokémon (et formes),
  objets (et Poké Balls), quêtes (tous les types d'objectifs), lieux, régions, rencontres, boutiques,
  dresseurs, champions d'arène **avec équipes de revanche**, ligues, capacités et talents.

---

## 8. État des panneaux — à valider

Légende : ✅ visuel terminé et 100 % fonctionnel · 🟡 visuel terminé, fonctionnement partiel · ⬜ maquette (visuel seul)

| Panneau / interface | État | Remarque |
|---|---|---|
| Écran des sauvegardes (`SaveMenuPage`) | ✅ | thème sombre fixe |
| Choix du starter (`StarterModal`) | ✅ | bouton Retour |
| En-tête (`HeaderPanel`) | ✅ | |
| Carte (`MapPanel`) | ✅ | |
| Combat (`BattlePanel`) | ✅ | sauvage, dresseurs, ligues, capture |
| Équipe active (`ActiveTeamPanel`) + `TeamModal` | ✅ | |
| Monnaies (`CurrenciesPanel`) | ✅ | |
| Poké Balls (`PokeballsPanel`) + choix de ball + éditeur de filtres | ✅ | |
| Paramètres (`SettingsModal`) | ✅ | |
| Histoire & quêtes (`StoryPanel`) | ✅ | bouton « Défier ! » ajouté |
| **Lieu (`LocationPanel`)** | 🟡 | tout fonctionne sauf « Parler » (dialogue générique : PNJ par lieu non portés) ; énigmes et donjons non portés |
| **Boutique (plein écran)** | ✅ | nouveau |
| **Badges (plein écran)** | ✅ | nouveau ; raccourci « Badges » |
| **Sac (plein écran)** | 🟡 | nouveau ; affichage, onglets, tri, recherche OK ; **utilisation** des objets (CT, pierres, Super Bonbon, vitamines, vente de trésors) et équipement non branchés |
| Succès (`AchievementsPanel`) | 🟡 | affichage ; pas encore de système de déblocage |
| Pension (`HatcheryPanel`) | ⬜ | œufs d'exemple, pas de système |
| Mine (`MinePanel`) | ⬜ | grille d'exemple, pas de système |
| Base secrète (`SecretBasePanel`) | ⬜ | boutons « bientôt disponible » |
| Centre d'entraînement (`TrainingCenterPanel`) | ⬜ | bouton « bientôt disponible » |
| Raccourcis : Boîte PC, Marché, Pokédex, Dictionnaire, Guide | ⬜ | « bientôt disponible » (le système de boîte PC existe déjà côté données) |

---

## 9. Reporté (prochaines phases)

1. Écran **Boîte PC** plein écran (le `BoxSystem` existe), **Pokédex**, **Marché**, Dictionnaire, Guide.
2. Utilisation des objets depuis le sac, équipement d'objets tenus.
3. PNJ propres à chaque lieu (pastilles ❗/⏳/✓/💬 de l'original), énigmes, donjons à péage.
4. Systèmes Pension, Mine, Succès (effets de capture différés : énergie de mine, talents débloqués, bonus de succès).
5. Couche de localisation du contenu fait main (`src/localization/<langue>/content.js`).

---

## 10. Vérifications

```bash
npm test                         # 160 tests : 0 échec
node ../check_imports.mjs src    # 0 problème
DataValidator.validateAll()      # []
node tools/data/build-all.mjs ../orig   # régénère sans erreur
```

Nouveaux tests : `tests/Shop.test.js` (données, balls selon les badges, prix Master Ball, achat,
Honor Ball, verrou Indigo, sauvegarde des compteurs), bouton « Défier ! » de quête
(`tests/Trainers.test.js`), présence des images de badges et de dresseurs (`tests/Launcher.test.js`).
