# PokéWorld Rework — état au 7 novembre 2026 (v27, jeu 1.16.39)

Règle en vigueur : **le catalogue est la cible**. Tout ce qui y est validé doit avoir exactement
le même rendu dans le jeu. Les anciennes validations du jeu s'effacent devant le catalogue.

---

## 1. Ce que contient le zip 1.16.39

Un seul ajout, entièrement neuf : **le menu de navigation**.

- La **Poké Ball du header est un bouton** (`#nav-menu-btn`), elle ouvre et referme le panneau.
- Le panneau **démarre sous le bouton**, au coin haut-gauche du header, jamais au centre.
- Tuiles carrées : icône en haut, **barre de libellé sombre collée en bas**, grille repliée et
  centrée — 6 par ligne sur PC, 4 sur mobile.
- **9 tuiles** : Boîte PC, Sac, Pokédex, Succès, Dictionnaire, Guide, Badges, Équipe, Réglages.
  Marché noir et Atoll n'apparaissent que lorsque le jeu les débloque (même règle que les Raccourcis).
- Aucun bouton de fermeture dans le panneau : on referme par la Poké Ball, par le voile, ou par Échap.
- Les entrées sont lues dans `config/Shortcuts.js` — aucune liste recopiée.
- `npm test` : **895 / 0**. Build vérifié depuis le zip extrait (le serveur y répond en 200).

Ce que le zip **ne contient pas encore** : les rendus du catalogue pour les fenêtres du jeu.
C'est le chantier suivant, écran par écran.

---

## 2. Fait et validé au catalogue

| Écran | État |
|---|---|
| Équipe | validé |
| Combat en direct | validé |
| Raccourcis | validé |
| Monnaies | validé |
| Poké Balls | validé |
| Sac | validé (v26 : rangées façon Dictionnaire) |
| Boîte PC | validé (v26 : niveau au-dessus du cercle) |
| Pokédex | validé (v28 : sans le niveau, il situe une collection) |
| Marché noir | validé (v28 : sprites 72 px, possédé vert / non possédé rouge) |
| Boutique | validé (cellule `.pw-shop-item`, objets 40 px) |
| Dictionnaire | validé |
| Succès (fenêtre) | validé |
| Succès plein écran | validé |
| Lieu | validé |
| Starter (3 écrans) | validé |
| Quitter le combat / Relancer | validé |
| Dialogue PNJ | validé |
| Quête répétable | validé |
| Énigme | validé |
| Légende de la carte | validé |
| Presets | validé |
| Choix de Poké Ball | validé |
| Scrollbars | validé |
| Atoll | validé **temporairement** |
| Menu de navigation | validé (v29) |

---

## 3. À valider au catalogue (je ne les touche pas sans votre retour)

| Écran | Le point ouvert |
|---|---|
| Tableau de bord PC | la composition des 3 colonnes diverge du jeu ; à figer |
| En-tête (header) | le catalogue et le jeu ne mesurent pas pareil |
| Fiches Pokémon / objet / dictionnaire | jamais validées depuis la refonte |
| Pension · Mine · Entraînement | lisibles, mais jamais validées |
| Base secrète (une pièce) | jamais validée |
| Badges | jamais validée |
| Réglages (onglets) | jamais validée |
| Carte (zoom, légende en haut) | légende validée, le reste non |
| Énigmes (nouvelle DA) | validée une fois, à reconfirmer |
| Atoll : pages + boutique | seule la première page est validée, et temporairement |
| Bilan de combat + AFK | jamais validé |
| Visite de base secrète / PC de base | jamais validés |

---

## 4. Reste à faire

**A. Portage catalogue → jeu** (le gros morceau), dans cet ordre :
Monnaies → Carte → Succès → Quêtes → Poké Balls → Équipe → Combat → Lieu → Raccourcis → Sac →
Boîte PC → Pokédex → Marché / Boutique → Dictionnaire.

**B. Coque** : aligner le header du jeu sur celui du catalogue (mesure, pas réinvention).

**C. Les fenêtres non validées** : les trancher une par une (section 3).

**D. Les 8 phases de la refonte** :
1. étude PokéChill — fait
2. comparatif — fait
3. fusion mobile / colonnes PC — fait (colonnes conservées, onglets mobile)
4. refonte progressive par écran — en cours
5. scroll à la cause racine — fait
6. dropdowns via composant commun — fait
7. audit Event Bus / interactions — fait
8. accessibilité mobile du gameplay — fait

**E. Livraison** : un zip par étape de portage, avec la liste exacte de ce qu'il contient.

---

## 5. Contraintes qui tiennent toujours

- Aucun code avant validation d'un visuel.
- Ne corriger que ce qui est critiqué ; le reste est réputé validé.
- Pas de second système de fenêtres / responsive / interactions.
- Pas de copie directe de code, composants ou assets PokéChill.
- `team.css` : 1700 lignes maximum. Pas de texte sous 11 px hors badge.
- Version synchronisée dans `package.json`, `package-lock.json` et `GameConfig.js`.
