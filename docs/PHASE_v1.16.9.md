# Phase 1.16.9 — Un Pokémon sur les cartes de sauvegarde (choisi dans la boîte PC)

> Demande : « Dans les réglages et les cartes de save il faut que ce soit comme dans le `main` : un
> choix de Pokémon depuis la boîte PC, et non le choix de l'image d'un PNJ. Peux-tu remettre un Pokémon
> sur les cartes de save ? »
>
> C'était bien un écart avec le jeu d'origine : la carte affichait le premier Pokémon de l'équipe,
> **sauf** si le joueur avait choisi un portrait de dresseur dans les réglages — ce portrait PNJ
> l'emportait alors sur tout le reste.

---

## 1. Ce qui se passait

```js
// SaveCard._buildAvatar(), avant 1.16.9
const customPortrait = player.trainerSprite && player.trainerSprite !== PlayerDefaults.TRAINER_SPRITE;
if (customPortrait || !leadSpecies) {
  // image d'un PNJ (assets/images/trainers/...) dans le disque de la carte
}
return new UIPokemonSprite({ species: leadSpecies, ... });
```

Deux défauts en un :

1. un **portrait de PNJ** pouvait remplacer le Pokémon sur la carte, alors que le jeu d'origine y met
   toujours un Pokémon que le joueur possède ;
2. il n'y avait **aucun choix** : le Pokémon affiché était imposé (premier de l'équipe), et il
   disparaissait dès que l'équipe était vide au profit d'une image de dresseur.

Dans le `main`, la carte de sauvegarde affiche `saveMeta.iconPokeId` : un **Pokémon possédé**, choisi
parmi tous les Pokémon du joueur (équipe, boîte PC, pension, entraînement), et rien d'autre.

## 2. Ce qui est fait

### 2.1 La carte n'affiche plus qu'un Pokémon possédé

`SaveCard.resolveAvatarPokemon(save)` est la règle unique, pure et testable :

1. `player.avatarPokemonUid` **si ce Pokémon est toujours possédé** (le choix du joueur) ;
2. sinon le **premier Pokémon de l'équipe** (comportement historique, et ce qu'héritent les anciennes
   sauvegardes) ;
3. sinon le **premier Pokémon possédé** de la collection ;
4. sinon `null`, et la carte affiche le **« ? » explicite** du jeu d'origine — jamais une image de PNJ,
   jamais un disque vide.

Le sprite passe par `UIPokemonSprite` (le disque canonique du design system), donc il est identique
partout ailleurs dans le jeu.

### 2.2 Le choix se fait dans les réglages, depuis la boîte PC

- `Settings → Profil de la sauvegarde → Pokémon de la carte` : un sprite, son nom et un bouton
  **« Choisir dans la boîte PC »** remplacent l'ancien menu déroulant de portraits de PNJ.
- Le bouton ouvre la nouvelle fenêtre **`SaveIconPickerModal`** (id `pw-save-icon-picker`) :
  - elle liste **tous les Pokémon possédés** (l'équipe d'abord, dans l'ordre de l'équipe, puis la boîte
    PC par numéro de Pokédex), car équipe et boîte sont deux vues de la même collection ;
  - elle a un **champ de recherche** (le champ garde le focus pendant la frappe) et un compteur ;
  - le choix courant est marqué (`aria-pressed`), et le niveau s'affiche au-dessus du disque ;
  - la grille **défile** au-delà de la hauteur de l'écran, le champ de recherche reste visible.
- Le choix reste dans un **brouillon** : rien n'est écrit tant que **« Appliquer au menu des saves »**
  n'est pas cliqué, exactement comme le nom et le fond.

### 2.3 Le format de sauvegarde

- `player.avatarPokemonUid` (uid d'un Pokémon possédé) ajouté au modèle, au format sérialisé et à
  `SaveSchema` (version **20 → 21**).
- Nouvelle migration **`MigrationV20ToV21`** : une sauvegarde existante **conserve le Pokémon qu'elle
  affiche aujourd'hui** (elle reçoit l'uid du premier membre de l'équipe, sinon le premier Pokémon
  possédé, sinon une chaîne vide). Elle est pure (l'entrée n'est jamais modifiée) et tolère les
  sauvegardes abîmées.
- Une nouvelle partie stocke immédiatement l'uid de son starter.

### 2.4 Ce qui disparaît (nettoyage, pas de code mort laissé derrière)

- Le menu déroulant de portraits de PNJ et son libellé `save_profile_avatar`.
- La liste `src/data/save/TrainerAvatars.js` et ses 10 libellés `avatar_*` devenus inatteignables.
- La clé morte `save_icon_keep_current`.

**Attention, conséquence assumée** : `player.trainerSprite` **reste** dans la sauvegarde, car il pilote
l'apparence du joueur **sur la carte** et dans la base secrète. Il n'est simplement plus modifiable
depuis les réglages — exactement comme dans le `main`, où l'apparence du dresseur n'est pas un réglage.
Si tu veux un jour un sélecteur d'apparence sur la carte, c'est un autre champ et une autre fenêtre.

## 3. Corrigé au passage : les Pokémon capturés des deux résumés

Le résumé de combat et le rapport AFK contenaient **deux copies** de la liste des Pokémon capturés
(33 lignes identiques, seul le texte d'état vide changeait) — la même faute que les icônes d'objets
géantes corrigées en 1.16.8. Elles partagent désormais le composant **`CapturedPokemonList`**, et un
test vérifie que les deux fenêtres produisent un HTML **identique au caractère près**.

## 4. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/config/SaveSchema.js` | version 21 + historique |
| `src/data/save/PlayerData.js` | champ `avatarPokemonUid` (sérialisation + lecture défensive) |
| `src/data/save/SaveData.js` | une nouvelle partie enregistre son starter comme Pokémon de carte |
| `src/data/save/migrations/MigrationV20ToV21.js` | **nouveau** : reprise du Pokémon affiché, pure |
| `src/data/save/migrations/SaveMigrator.js` | migration ajoutée à la chaîne |
| `src/ui/SaveCard.js` | `resolveAvatarPokemon()` + `_buildAvatar()` (Pokémon ou « ? », plus de PNJ) |
| `src/panels/SaveIconPickerModal.js` | **nouveau** : sélection depuis la boîte PC (recherche, compteur, défilement) |
| `src/panels/settings/SaveProfileSection.js` | champ « Pokémon de la carte » + bouton, à la place du portrait PNJ |
| `src/pages/GamePage.js` | enregistrement de la nouvelle fenêtre |
| `src/config/ModalIds.js` | `SAVE_ICON_PICKER` |
| `src/localization/fr|en/ui.js`, `panels.js` | 4 clés ajoutées, 12 clés mortes supprimées |
| `assets/css/design-system.css` | bloc `DS-v1.16.9` (champ portrait, fenêtre de sélection, « ? ») |
| `src/panels/components/CapturedPokemonList.js` | **nouveau** : liste des capturés partagée |
| `src/panels/BattleSummaryModal.js`, `src/panels/AfkSummaryModal.js` | délèguent à `CapturedPokemonList` |
| `src/data/save/TrainerAvatars.js` | **supprimé** (liste de portraits PNJ inatteignable) |
| `tests/Release1169.test.js` | **nouveau** : 12 tests |
| `tests/browser/SaveCardPortrait.mjs` | **nouveau** : 9 vérifications Chromium |
| `tests/FeedbackCorrections.test.js`, `tests/StaticRules.test.js` | version de schéma mise à jour |
| `docs/AUDIT_v1.16.9.md` | **nouveau** : audit lisibilité / ergonomie / unification |

## 5. Vérifications

| Vérification | Résultat |
|---|---|
| `node test_suite.js` | **789 réussis, 0 échec** (777 + 12) |
| `tests/browser/SaveCardPortrait.mjs` (Chromium réel) | **9/9** |
| Carte de sauvegarde | Pokémon possédé sur le disque canonique, **aucune image de PNJ** |
| Réglages | champ « Pokémon de la carte » = sprite + nom + bouton, **aucune option PNJ** dans la section |
| Fenêtre de sélection | 3 Pokémon affichés (starter + 2 en boîte), choix courant marqué, recherche filtrable **sans perdre le focus** |
| Grande collection (123 Pokémon, fenêtre 1280 × 700) | la fenêtre reste dans l'écran, la grille défile, le champ de recherche reste atteignable |
| Application | uid enregistré sur la sauvegarde, **carte du menu** = le Pokémon choisi après rechargement de la page |
| Ordre de résolution | choix → premier de l'équipe → premier possédé → « ? » (testé) |
| Migration 20 → 21 | Pokémon affiché conservé, entrée non modifiée, cas dégradés couverts |
| Capturés des deux résumés | HTML identique (testé), `AfkCatchUp` 4/4, `ItemSpriteSize` 8/8 |
| Console navigateur | aucune erreur, aucune ressource manquante |

Non vérifié : le rendu de la carte sur les 20 fonds de thème (le disque et la mise en page sont
inchangés, seul le contenu du disque change) ; et la sélection sur une collection de plusieurs
milliers de Pokémon (testée à 123, la grille et le défilement ne dépendent pas du volume).

## 6. Décisions laissées ouvertes

1. **Apparence du dresseur sur la carte** : elle n'est plus réglable (comme dans le `main`). Veux-tu un
   réglage séparé « apparence sur la carte », distinct du Pokémon de la carte ?
2. **Choix du Pokémon depuis le menu des sauvegardes** (sans passer par les réglages) : le `main` le
   propose dans une fenêtre dédiée. Ici, c'est un bouton dans les réglages — je peux ajouter le même
   accès depuis le menu si tu préfères.
3. L'audit `docs/AUDIT_v1.16.9.md` propose cinq lots (A à E) : dis-moi lesquels tu valides.
