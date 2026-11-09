# Stratégie de fusion mobile / PC — phase 2 (v1.16.32)

Ce document fixe ce qui est **conservé de PokéWorld**, ce qui est **adapté depuis PokéChill**, et par
quels **composants communs** la fusion passe. Il a été écrit avant les modifications de code et sert de
référence aux phases suivantes.

## 1. Analyse comparative

| Élément | PokéWorld actuel (état 1.16.31) | Approche observée dans PokéChill | Adaptation retenue |
|---|---|---|---|
| Organisation mobile | Fenêtres de bureau empilées dans une colonne, barre d'onglets *en haut*, chrome à trois bandeaux (entête, onglets, titre de fenêtre) | Un écran par tâche, bandeau de titre compact, contenu, rien d'autre | Onglets déplacés dans la **zone du pouce** (bas), chrome réduit à deux bandeaux, espace réservé sous la barre |
| Hiérarchie visuelle | Titres de fenêtre, puis blocs denses de champs et de puces | Bandeau titre → contenu → pied ; 3 niveaux maximum | Bandeau de fenêtre conservé (identité PokéWorld), barre de filtres ramenée à **une** bande |
| Densité | Barre de filtres du PC : 206 px de puces sur 330 px de contenu disponibles (360×640) | Filtres derrière un dépliant, puces sur une ligne | Puces sur **une ligne qui défile** + champs derrière le dépliant existant → contenu passé de 330 à 474 px |
| Listes et contenus | Grilles de cartes correctes ; barres d'outils qui s'enroulent sur 4 lignes | Grilles d'icônes compactes, listes de lignes hautes | Grilles conservées ; barres d'outils compactées (aucune perte d'élément) |
| Actions | Boutons 26–38 px dans les entêtes, déconseillés au pouce | 48–96 px, libellé sous l'icône, retour `:active` | Minimum **44 px** dans tout le chrome mobile (mesuré : 9 cibles trop petites → 0) |
| Fenêtres | `dvh`, `min-height: 0`, corps défilant : le socle est bon. Mais 9 règles visaient un id mort (`#fullscreen-panel-modal`) et 4 feuilles écrasaient encore un panneau avec `transform: scale(0.92)` | Hauteur = colonne, corps défilant, aucun écrasement | Code mort retiré, écrasements supprimés, contrat unique de hauteur conservé |
| Navigation | Barre d'onglets `flex` collante en haut, sous-boutons 38 px, libellés 11 px | Bouton d'accès + menu, actions près du pouce | Barre du bas, 44 px, libellés 12 px, sous-barre « Gestion » empilée au-dessus |
| Menus déroulants | `<select>` natifs stylés (bon choix), mais hauteur 36 px sur tactile et largeur minimale 120 px | Pastilles `select` natives de 48 px qui s'enroulent | 44 px, `min-width: 0`, largeur plafonnée au conteneur |
| Notifications | Bandeau fixe en haut à gauche, `z-index: 99999`, par-dessus le premier bouton de l'écran (un bouton devenait **intouchable**) | Informations contextuelles dans le bandeau bas | Bande basse, au-dessus de la navigation, largeur utile, fermeture 44 px |

## 2. Le modèle cible

### 2.1 Sur PC — inchangé dans ses principes

- **Trois colonnes** (`310px | 1fr | 310px`) : la valeur propre de PokéWorld, on ne la touche pas.
- Fenêtres déplaçables, ordre sauvegardé, consultation simultanée : conservés.
- Cibles denses à la souris (26 px) : conservées, le seuil ne s'applique qu'au tactile.
- Aucun écran de bureau n'est transformé en écran vertical.

### 2.2 Sur mobile / tablette tactile — une présentation d'écran par tâche

```
┌───────────────────────────────┐
│ entête de jeu (marque, badges, réglages) │   compact, sticky
├───────────────────────────────┤
│ fenêtre de l'onglet actif     │   empilée dans le flux de la page
│  bandeau de titre + aide      │   (le document reste le défileur)
│  contenu                      │
│                               │
├───────────────────────────────┤
│ Aventure · Combat · Équipe · Raccourcis · Gestion │  barre du bas, 44 px
└───────────────────────────────┘
```

- Le **document** reste le défileur (règle existante du Rework) : la barre du bas est un calque, et
  la page réserve sa hauteur (`--pw-mobile-nav-h`) pour que le dernier élément reste visible.
- Les **écrans plein cadre** (PC, sac, Pokédex, succès, dictionnaire, guide, marché…) gardent le
  contrat `UIFullscreenPanel` : bandeau + barre de filtres + **un seul** corps défilant + pied optionnel.
- Les **fenêtres modales** suivent le contrat `dvh` existant, sans écrasement.
- Toute barre de filtres se replie en **une bande** : puces qui défilent, champs et recherche derrière
  le dépliant déjà prévu (`FilterBar.mobileDrawer`).

## 3. Ce qui doit rester identique entre les deux présentations

| Partagé | Comment |
|---|---|
| Données | mêmes modèles, mêmes sauvegardes, même `SaveSystem` |
| Règles métier | mêmes systèmes DOM-free (`TeamSystem`, `CatchSystem`, `ShopSystem`…) |
| Fonctionnalités | aucune action n'est supprimée ni déplacée vers l'UI |
| Composants métier | mêmes `PokemonGridEntry`, `FilterBar`, `UIActionTile`, `UIDropdown`… |
| Événements | mêmes `EventBus` + événements typés ; aucune détection de périphérique dans un panneau |
| Décision de présentation | **une seule** : `MOBILE_MEDIA_QUERY` (`config/DashboardLayout.js`), lue par `AppShell.isMobileLayout()` et par les feuilles de style |

## 4. Composants communs à corriger (avant toute refonte d'interface)

1. **Décision de présentation** — `config/DashboardLayout.js` + `AppShell` (source unique, JS et CSS).
2. **Coquille mobile** — `layout/mobile.css` (barre du bas, cibles, espace réservé, marges de
   défilement). Les règles de la barre qui vivaient dans `core/base.css` y ont été déplacées.
3. **Contrat de fenêtre** — `components/ui-modal.css`, `components/ui-panel.css`,
   `components/fullscreen-panel.css`, `components/modal-sizes.css`.
4. **Barre d'outils et puces** — `components/ui-toolbar.css`, `components/chips.css`,
   `components/ui-input.css` (dépliant mobile).
5. **Sélecteur** — `components/ui-dropdown.css` (taille tactile, largeur).
6. **Notifications** — `components/notifications.css` (position, cible de fermeture).
7. **Chrome de fenêtre** — `layout/window-chrome.css` (boutons d'outil 44 px, pied du choix du starter).

Aucun de ces correctifs n'est une exception posée dans un panneau : chacun est fait une fois, dans la
feuille qui possède l'objet.

## 5. Audit par interface — questions de la phase 3

Légende : **A** = audité et traité dans cette livraison ; **B** = audité, rien à changer ; **C** = à
traiter dans une phase ultérieure (constat déjà écrit).

| Interface | 1 Disposition mobile | 2 Hiérarchie | 3 Actions | 4 Encombrement | 5 Tactile | 6 Regroupement | 7 Apport PokéChill | 8 Colonnes PC | État |
|---|---|---|---|---|---|---|---|---|---|
| Entête / navigation | barre d'onglets en haut, 38 px | correcte | onglets hors zone du pouce | 2 bandeaux empilés | 38 px < 44 | — | navigation en bas | entête conservée | **A** |
| Réglages | fenêtre `dvh` correcte | bonne | fermeture 34 px | grille de thèmes 2 col. | 34 → 44 px | — | — | idem | **A** |
| Boîte PC | barre de filtres 206 px | noyée par les filtres | dépliant recouvrait une puce | **élevé** | puces 30 px | puces = navigation | puces sur une ligne | filtres sur plusieurs lignes | **A** |
| Sac / Inventaire | idem PC | idem | idem | élevé | idem | idem | idem | conservé | **A** |
| Pokédex | grille 3 col. correcte | bonne | dépliant recouvrait une puce | bloc d'état haut | puces 30 → 40 px | bon | — | conservé | **A** |
| Dictionnaire / Guide | listes longues, un seul défilement | bonne | — | — | — | bon | — | conservé | **B** |
| Choix du Starter | tient à 390×844 | bonne | pied écrasé en 120 px | — | bouton 44 px | pied empilé | — | idem | **A** |
| Fenêtres modales / plein écran | `dvh`, corps défilant | bonne | fermeture 44 px | — | — | — | — | idem | **A** |
| Notifications | par-dessus le contenu | — | fermeture 14 px | — | 44 px | — | bande basse | position PC inchangée | **A** |
| Team | fenêtre empilée, cartes correctes | bonne | — | — | à vérifier à 320 px | — | — | colonnes conservées | **C** |
| Informations Pokémon | feuille dense, `85dvh` | dense | — | élevé | écrasement supprimé | — | — | idem | **A** (écrasement) / **C** (réorganisation) |
| Combat / résumés | — | — | — | — | — | — | — | conservé | **C** |
| Quêtes / tutoriel | — | — | — | — | — | — | — | conservé | **C** |
| Carte / lieux | carte 320 px min | bonne | zoom 42 → 44 px | — | 44 px | — | — | conservé | **A** |
| Pension / Mine / Entraînement / Base | onglet « Gestion » | — | — | — | — | — | — | conservé | **C** |
| Succès / Atoll | barre de filtres dépliante | bonne | — | — | — | — | — | conservé | **B** |

Les interfaces **C** n'ont pas été modifiées : le constat est écrit ici pour la phase suivante, plutôt
que d'être corrigé à l'aveugle en même temps que le socle.
