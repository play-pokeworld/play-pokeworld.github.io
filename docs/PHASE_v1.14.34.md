# PokéWorld — Version 1.14.34 (Correctifs Succès & Base Secrète)

**Date :** 25 octobre 2026  
**Branche :** Rework  
**Statut :** Livré et validé (628/628 tests passants, 27/27 règles statiques)

---

## 1. Contexte & Objectifs

La version 1.14.34 apporte des ajustements fonctionnels et ergonomiques demandés avant d'entamer la Phase 3 :
1. **Succès (Achievements) :**
   - Suppression du bouton d'épinglage individuel : l'épinglage se fait désormais en cliquant directement sur la carte du succès.
   - Indication visuelle de l'épinglage par une bordure verte distinctive (`.is-pinned`).
   - Prise en charge de **plusieurs succès épinglés** simultanément dans les données de sauvegarde (`AchievementsData`) et dans le widget du tableau de bord (`AchievementsPanel`).
   - Remplacement de la barre de filtres basique par le composant unifié `FilterBar` (identique à la Boîte PC et au Sac), évitant tout débordement au défilement et offrant un drawer mobile accessible.
   - Réagencement complet de l'affichage des bonus permanents actifs : abandon de la ligne compactée au profit d'une section dédiée avec grille aérée de badges/cartes descriptives.

2. **Base Secrète :**
   - Alignement rigoureux sur le rendu et l'ergonomie visuelle de référence (`origin/main`) tout en respectant l'architecture modulaire du Rework et `Rules.md`.
   - Intégration directe du canvas 2D pixel-art interactif (`#base-canvas-2d`, échelle 32px GBA 2×) à l'intérieur de la fenêtre `#win-base`.
   - Barre d'outils fidèle (`#base-toolbar`) avec :
     - Bouton « Ramasser » (`#base-ed-pickup`, actif sur meuble ou PNJ sélectionné).
     - Bouton « Modifier le PNJ » (`#base-ed-npc-edit`, contextuel à la sélection d'un PNJ).
     - Bouton « Modifier le PC » (`#base-ed-pc-edit`, contextuel à la sélection du PC).
     - Texte d'aide contextuel dynamique (`#base-ed-hint`).
     - Boutons « Exporter », « Visiter un fichier… » et « Visiter » / « Arrêter la visite ».
   - Tiroir de réserve catégorisé (`#base-stock`) avec onglets par famille (`desks`, `chairs`, `plants`, `objects`, `mats`, `wall`, `dolls`, `cushions`, `__pals`), pastilles de quantité et cartes de meubles à vignettes circulaires.
   - Mode visite interactif directement dans le canvas de la fenêtre avec pathfinding BFS, ticker de marche pas-à-pas, pièges/tapis et déclenchement des dialogues PNJ/PC.
   - Modales dédiées `SecretBaseNpcModal` et `SecretBasePcModal` enregistrées dans `ModalIds`.

---

## 2. Détail des Modifications

### 2.1 Système de Succès
- **`src/data/save/AchievementsData.js` :**
  - Gestion d'un `Set<string>` pour `_pinned`, sérialisé sous forme de tableau JSON.
  - Nouvelles méthodes : `getPinnedList()`, `isPinned(achId)`, `pin(achId)`, `unpin(achId)`, `togglePin(achId)`.
  - Rétrocompatibilité préservée pour `getPinnedId()` et `setPinnedId()`.
- **`src/systems/AchievementSystem.js` :**
  - `isPinned(achId, save)`, `getPinnedList(save)`.
  - `togglePinned(achId, { notify = true })` émettant `AchievementPinnedEvent(achId, isPinned)` avec notification discrète.
- **`src/core/events/AchievementPinnedEvent.js` :**
  - Ajout du paramètre `isPinned` pour notifier l'état résultant.
- **`src/panels/fullscreen/AchievementsFullscreenPanel.js` :**
  - Utilisation de `FilterBar` avec drawer mobile (`mobileDrawer: true`), menu déroulant de famille, chips d'état (`Tous`, `En cours`, `Terminés`, `Épinglés`), champ de recherche et bouton de réinitialisation.
  - Section `.pw-ach-bonuses-section` avec barre de progression globale et grille `.pw-ach-bonuses-grid` de cartes `.pw-ach-bonus-card` (icône, valeur en surbrillance, libellé).
  - Clic sur la carte du succès pour basculer l'épinglage, avec contour vert `.is-pinned` (`border: 2px solid var(--green)`).
- **`src/panels/AchievementsPanel.js` :**
  - Affichage de la liste complète des succès épinglés dans `.pw-ach-tracker-list`.
  - Carte d'invitation `.pw-ach-empty-tracker` si aucun succès n'est épinglé.
- **`assets/css/design-system.css` :**
  - Styles pour `.pw-ach-card.is-pinned`, `.pw-ach-bonuses-section`, `.pw-ach-bonuses-grid`, `.pw-ach-bonus-card`, `.pw-ach-tracker-list`.

### 2.2 Système de Base Secrète
- **`src/panels/components/SecretBaseRoomView.js` :**
  - Grille native 32 px (`TILE = 32`), mise à l'échelle nette 2× pixel art sans flou.
  - Rendu des fonds Émeraude authentiques (`AssetPaths.secretBaseBackground`).
  - Ombres de contact elliptiques sous le mobilier (`desks`, `chairs`, `plants`, `objects`).
  - Tri en profondeur (depth-sorting) prenant en compte la face des murs (`z: -100`), le pied des meubles porteurs pour les objets de surface (poupées, coussins) et les personnages.
  - Overlays dynamiques : ghost de placement translucide vert/rouge avec aperçu du sprite, contour jaune `#ffd54f` de sélection, contour fin de survol, et pointillés jaunes du parcours de visite.
- **`src/panels/SecretBasePanel.js` :**
  - Reprise de la disposition exacte de `origin/main` : `#base-canvas-2d`, `#base-toolbar`, `#base-stock`.
  - Édition directe sur canvas (prise en main depuis le stock ou la pièce, déplacement, ramassage).
  - Visite interactive intégrée avec ticker de déplacement et arrêt par le bouton de la barre d'outils.
  - Affichage de l'état non établi `#base-win-empty` avec bouton d'importation.
- **Modales `SecretBaseNpcModal` & `SecretBasePcModal` :**
  - Édition complète du PNJ (nom, sprite, copie d'équipe, messages pré/win/lose).
  - Consultation et interaction PC (rang, drapeau, message, statistiques).

---

## 3. Validation & Résultats des Tests

La suite automatisée complète passe à 100 % :
- **628 tests exécutés, 628 passants, 0 échec.**
- **27 règles statiques d'architecture (StaticRules.test.js) validées à 100 % :**
  - Aucune injection HTML (`innerHTML` interdit hors `ui/`).
  - Pas d'affectation de style en ligne (`style.xxx = ...`).
  - Code et identifiants 100 % en anglais.
  - Zéro emoji littéral dans le code source.
  - Table de localisation bilingue (FR/EN) rigoureusement synchronisée.
  - Isolation stricte des fenêtres et des événements via `EventBus`.

---

## 4. Archive Livrable

L'archive complète du projet prêt à l'emploi est disponible :
- **Chemin :** `/home/user/pokeworld-rework-1.14.34.zip`
