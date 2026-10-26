# Phase 1.14.33 — Phase 1 : Uniformisation des affichages et gabarits de fenêtres

**Version de production : 1.14.33 · Schéma de sauvegarde : 20 (inchangé).**

---

## 1. Analyse préalable de l'état initial (Phase 1.1)

Une analyse comparative approfondie du dimensionnement des différentes interfaces a mis en évidence plusieurs disparités et tailles codées en dur :
1. **Panneau des Paramètres (`SettingsModal`)** :
   - Gabarit standard grand écran défini dans `assets/css/ui-modal.css` via `.pw-panel--modal-window.pw-settings-modal-window` :
     - Largeur : `min(1120px, calc(100vw - 40px))`
     - Hauteur : `85vh`
     - Mobile (≤ 600px) : `min(560px, calc(100vw - 24px))`
2. **Fiche d'information Pokémon (`PokemonInfoModal`)** :
   - Héritait de `UIModal` avec `size: 'md'`, mais une règle héritée avec `!important` dans `assets/css/design-system.css` écrasait arbitrairement sa largeur à `max-width: 620px !important`.
3. **Menus de gestion des installations (`FacilityManagementModal` pour la Mine, l'Entraînement et la Pension)** :
   - Héritaient de `StaticModalPanel` avec un paramètre d'échappement `size: 'custom'`.
   - Dimensions codées en dur localement dans `assets/css/facilities.css` (`width: min(96vw, 980px); height: min(84vh, 760px)`) et doublées dans `design-system.css` (`#poke-modal-inner.management-inner`).

Chaque panneau possédait ainsi ses propres dimensions arbitraires et dupliquées, sans exploiter le gabarit commun prévu par l'architecture du projet.

---

## 2. Implémentation et uniformisation (Phases 1.2 & 1.3)

Conformément aux directives de la Phase 1, un système de dimensionnement commun et réutilisable a été formalisé :

### 2.1 Gabarit partagé et homogène
- Définition des variables de gabarit standard dans `assets/css/ui-modal.css` :
  - **Desktop** :
    - `width: min(1120px, calc(100vw - 40px))`
    - `max-width: min(1120px, calc(100vw - 40px))`
    - `height: 85vh`
    - `max-height: 85vh`
  - **Mobile (≤ 600px)** :
    - `width: min(560px, calc(100vw - 24px))`
    - `max-width: calc(100vw - 24px)`
    - `height: min(85vh, 720px)`
    - `max-height: 85vh`
- Association directe des classes de fenêtres :
  - `.pw-panel--modal-window.pw-settings-modal-window` (Paramètres)
  - `.pw-panel--modal-window.pw-pokemon-info-window` et `#poke-modal-inner.pw-panel--modal-window` (Fiche Pokémon)
  - `.pw-facility-management.pw-static-modal` (Mine, Entraînement, Pension)

### 2.2 Harmonisation des composants JS
- **`PokemonInfoModal`** : application de la classe sémantique de fenêtre `pw-pokemon-info-window` en complément de son gabarit natif `size: 'md'`.
- **`FacilityManagementModal`** : passage de `size: 'custom'` au gabarit standard du projet `size: 'md'`.

### 2.3 Nettoyage des anciennes règles en dur
- **`design-system.css`** : remplacement du `max-width: 620px !important` par le gabarit unifié `min(1120px, calc(100vw - 40px))` et `85vh` ; mise à jour de la règle `#poke-modal-inner.management-inner`.
- **`facilities.css`** : suppression des dimensions isolées (980px × 760px) au profit du gabarit standard de référence partagé avec Settings.

---

## 3. Validation et tests

- **589 tests unitaires et statiques réussis sur 589 (100% de succès)** via `npm test`.
- Nouveau test de régression automatisé ajouté dans `tests/PokemonInfoAndTmParity.test.js` :
  - `Settings, PokemonInfoModal, and FacilityManagementModals share the same size template` : valide que les cinq instances (`settings`, `pokemonInfo`, `mine`, `training`, `hatchery`) adoptent rigoureusement le gabarit `'md'` et sont branchées sur la même règle CSS unifiée.
- Validation des contraintes statiques de `StaticRules.test.js` préservée sans rupture.

---

# Phase 2.1 : Système de Succès (Achievements) — 1.14.33

## 1. Vue d'ensemble architecturale

Le système de succès a été intégralement implémenté dans l'architecture Rework propre, sans recours au code legacy, en respectant la séparation stricte des données, modèles, événements, systèmes et interfaces graphiques.

### Composants créés et intégrés :
1. **`AchievementDB` (`src/data/achievements/AchievementDB.js`)** :
   - Dépôt de données en lecture seule étendant `DataRepository`.
   - Charge les 84 succès répartis sur 15 familles (Pokédex, Shinies, Combat, Capture, Défis de route, Revanches, Exploration, Pension, Entraînement, Souterrain, Économie, Atoll, Base secrète, Easter eggs, Formes) représentant 229 paliers au total.
   - Fournit l'accès typé et la localisation FR/EN pour les noms, descriptions, labels de bonus permanents et noms de familles.

2. **`AchievementsData` (`src/data/save/AchievementsData.js`)** :
   - Modèle de données persisté étendant `BaseModel`.
   - Gère les paliers débloqués (`_unlockedTiers`), les horodatages de déblocage (`_unlockedAt`), le succès épinglé (`_pinned`, défaut `'dex_kanto'`), et les compteurs statistiques spécifiques (`_stats`).
   - Intégré dans `SaveData.js` (propriété `this.achievements`), sérialisé/désérialisé avec validation et tolérance aux pannes, et pris en charge dans `MigrationOriginalToV1.js` (schéma 20 inchangé).

3. **Événements typés (`src/core/events/`)** :
   - `AchievementUnlockedEvent` : émis lors du franchissement d'un palier (`ach`, `tier`, `bonusLabel`).
   - `AchievementPinnedEvent` : émis lors du changement de succès épinglé (`achId`).

4. **`AchievementBonusProvider` (`src/systems/achievements/AchievementBonusProvider.js`)** :
   - Fournisseur de bonus permanent connecté au `BonusSystem` unifié (`BonusRules.SOURCE_IDS.ACHIEVEMENTS`).
   - Agrège les contributions typées (`money`, `xp`, `loot`, `capture`, `shiny`, etc.) avec leurs portées régionales ou globales.
   - Applique rigoureusement les garde-fous anti-inflation (V6 §9.3) :
     - Multiplicateur d'argent global : plafonné à +29% (régional Kanto/Johto/Hoenn plafonné à 15%).
     - Multiplicateur d'expérience global : plafonné à +25%.
     - Taux de capture global : plafonné à +4,5 pt.
     - Multiplicateur de shiny global : plafonné à ×1,15.

5. **`AchievementSystem` (`src/systems/AchievementSystem.js`)** :
   - Système moteur singleton étendant `BaseSystem`.
   - Écoute les événements du jeu (`PokemonCaughtEvent`, `PokemonDefeatedEvent`, `TrainerDefeatedEvent`, `EggHatchedEvent`, `LocationChangedEvent`, `CurrencyChangedEvent`, `TrainingSessionCompletedEvent`, `SaveLoadedEvent`, `SaveCreatedEvent`).
   - Évalue les métriques des 84 succès (Pokédex régional et national, shinies, victoires sauvages, dresseurs, ligues, badges, IV/EV, pension, mine, base, etc.).
   - Rétroactivité intégrale : calcul automatique des succès atteints au chargement de sauvegarde sans spam de notification.
   - Notifications dorées via `NotificationSystem.getInstance().notifyTemporary` sur le canal `ACHIEVEMENT`.

6. **Interfaces graphiques (UI Widgets conformes)** :
   - **`AchievementsFullscreenPanel` (`src/panels/fullscreen/AchievementsFullscreenPanel.js`)** :
     - Modale plein écran (`ModalIds.ACHIEVEMENTS`, id DOM `fs-achievements`).
     - Bannière récapitulative (`.pw-ach-summary-banner`) avec total de paliers débloqués, ratio, pourcentage et pilules de multiplicateurs actifs (`.pw-ach-tag`).
     - Barre de filtres (`.pw-ach-filter-bar`) avec boutons-puces pour chaque famille avec icônes vectorielles.
     - Grille de cartes (`.pw-ach-grid`) : chaque carte affiche l'icône de famille, nom, description, badge de rang métallique (Bronze, Argent, Or, Diamant ou Non débloqué), badge de statut (Terminé, P. X/Y, En cours), barre de progression animée, pastilles de paliers (`.pw-tier-dot`), pilule de bonus permanent et bouton d'épinglage interactif (`📌 Épinglé` / `📍 Épingler`).
   - **`AchievementsPanel` (`src/panels/AchievementsPanel.js`)** :
     - Widget tracker du tableau de bord branché sur `AchievementSystem`.
     - Menu déroulant avec options régionales par défaut et affichage dynamique du succès épinglé.
     - Carte interactive avec icône, rang métallique, barre de progression et métrique.
     - Clic sur la carte ouvrant immédiatement la modale plein écran via `ModalOpenRequestedEvent(ModalIds.ACHIEVEMENTS)`.
   - **Bouton de raccourci (`src/config/Shortcuts.js`)** :
     - Raccourci vers la modale des succès avec icône trophée.

7. **Icônes et Design System** :
   - Ajout des 9 glyphes vectoriels SVG manquants dans `IconRegistry.js` (`battle`, `trainer`, `compass`, `hatchery`, `training`, `mine`, `base`, `heart`, `dna`).
   - Styles CSS conformes dans `design-system.css` et `panels.css` sans aucune injection de chaîne HTML.

---

## 2. Validation et suite de tests

- **605 tests automatisés réussis sur 605 (100% de succès)**.
- **Nouvelle suite complète de tests unitaires créée dans `tests/Achievements.test.js`** couvrant :
  - `AchievementDB Repository` : chargement des 84 succès, 15 familles, 229 paliers, localisation FR/EN.
  - `AchievementsData Model & Save Persistence` : cycle de vie, persistance, sérialisation et aller-retour SaveData / SaveMigrator.
  - `AchievementBonusProvider & Anti-Inflation Caps` : contributions réelles aux types de bonus, respect strict des plafonds anti-inflation (+29% ₽, +25% XP, +4,5 pt capture, ×1,15 shiny, 15% ₽ régional).
  - `AchievementSystem Engine & Progression` : évaluation des métriques, calcul de progression, déblocage de paliers, rétroactivité au chargement, épinglage / désépinglage, résumé de progression.
  - `Achievements UI Components` : ouverture de la modale plein écran, rendu des filtres et cartes, interaction du widget de suivi du tableau de bord.
- Règles d'architecture `StaticRules.test.js` 100% validées (zéro injection HTML, classes uniques, commentaires en anglais, widgets stricts).

---

## 3. Phase 2.2 : Atoll de Combat (Battle Atoll)

**Version de production : 1.14.33 · Schéma de sauvegarde : 20 (inchangé).**

L'Atoll de Combat a été intégralement recréé sous l'architecture Rework, offrant un contenu d'endgame compétitif complet accessible après avoir vaincu la Ligue Pokémon.

### 3.1 Architecture et composants implémentés

1. **Modèle de données persistant (`AtollData` dans `src/data/save/AtollData.js`)** :
   - Étend `BaseModel` et persiste les données de l'Atoll dans la sauvegarde :
     - `tokens` : solde de jetons Atoll cumulés par le joueur.
     - `streak` : série de victoires consécutives en cours.
     - `bestStreak` : record personnel de victoires consécutives.
     - `winsByMode` : dictionnaire des victoires par mode de défi (`{ [modeKey]: count }`).
     - `factoryRun` : état de la session active de l'Usine de Combat (`{ modeKey, seedWindow, streak, team }`).
     - `fragments` : fragments de Légende accumulés (plafonnés à 50).
     - `pendingFragmentLegendary` : ID Pokédex du légendaire invoqué en attente de capture.
   - Intégré dans `SaveData.js` (`save.atoll`) et pris en charge dans `MigrationOriginalToV1.js` (schéma 20 inchangé).

2. **Dépôt de données et logique algorithmique (`AtollDB.js` dans `src/data/atoll/AtollDB.js`)** :
   - **14 modes de défi** répartis sur 4 disciplines :
     - *Tour de combat* : Tour Standard Rangs E, D, C, B, A, S et Tour Libre (aucun ban).
     - *Usine de combat* : Usine de Combat Rangs C et A (équipes d'emprunt).
     - *Arène de combat* : Arène 3 Pokémon, Arène Sans Objet, Arène Monotype.
     - *Dôme de combat* : Dôme des Quarts, Dôme Finale.
   - **Cycle de rotation de 12 heures** : basé sur le temps UTC universel (fenêtres de 12h, cycle complet de 6 fenêtres / 3 jours).
   - **Générateur pseudo-aléatoire déterministe** : graine régénérée à chaque cycle de 3 jours (`seedWindow + floor(seedWindow / 6) * 10007 + salt`), garantissant des équipes adverses identiques pour tous les joueurs sur la même fenêtre et un renouvellement périodique.
   - **Bannissements dynamiques de légendaires** : calculés par fenêtre de rotation pour les modes d'élite (4 bans sur la Tour S, 3 bans sur le Dôme Finale), tout en assurant que la Tour Libre demeure un refuge permanent sans restriction.
   - **Sets compétitifs optimisés (`ATOLL_SETS`)** : tous les Pokémon de rang C et supérieur disposent de sets stratégiques de niveau 100 avec talents, objets compétitifs (Bandeau Choix, Lunettes Choix, Mouchoir Choix, Restes, Orbe Vie, etc.), capacités équilibrées et répartitions IV/EV respectant le plafond strict de 36 points. Fallback déterministe pour les rangs inférieurs (E/D).
   - **Réorganisation forcée de l'Usine de Combat** : après chaque victoire dans l'Usine, l'équipe d'emprunt est entièrement soignée et fait l'objet d'un remaniement déterministe garanti de l'ordre des Pokémon et de leurs capacités (anti-identité mathématique).
   - **Barème de récompenses équilibré** : formule de gain de jetons selon le rang et la série, majoration de +25% par niveau pour les modes Usine d'emprunt, et gain de fragments de Légende à chaque jalon majeur de série.

3. **Événements typés (`src/core/events/`)** :
   - `AtollStateChangedEvent` : émis lors de la modification des jetons, séries, fragments ou de l'état de l'Usine.
   - `AtollBattleFinishedEvent` : émis lors de la résolution d'un duel de l'Atoll (`modeKey`, `victory`, `tokensEarned`, `streak`, `fragmentsEarned`).

4. **Contexte de duel (`AtollBattleContext.js` dans `src/systems/atoll/AtollBattleContext.js`)** :
   - Sauvegarde préalable de l'équipe du joueur pour isolation et restauration complète en fin de défi.
   - Prise en charge des équipes d'emprunt pour l'Usine de Combat.
   - Règlement de fin de match (actualisation des séries, octroi des jetons et fragments, enregistrement du record, réorganisation automatique de l'équipe de location).

5. **Moteur de jeu (`AtollSystem.js` dans `src/systems/AtollSystem.js`)** :
   - Singleton étendant `BaseSystem`.
   - Contrôle d'accès : déblocage conditionné à la victoire de la Ligue Pokémon.
   - Validation stricte des équipes selon les règles de chaque mode (taille d'équipe, doublons d'espèces et d'objets, légendaires interdits, contraintes de type).
   - Cycle de vie de l'Usine (démarrage, réorganisation manuelle, abandon de série).
   - Boutique d'échange de jetons intégrée aux réductions du `BonusSystem` (`BonusTypes.ATOLL_DISCOUNT`).
   - Invocation des Pokémon Légendaires via 50 fragments de Légende avec duel spécial de capture garantie à 100%.

6. **Intégration du système de combat (`BattleSystem.js`)** :
   - Ajout de la méthode `startAtollBattle()` avec prise en charge du contexte `_atollBattle`.
   - Substitution transparente de l'équipe du joueur par l'équipe de location pour les modes Usine.
   - Présentation enrichie des combats de l'Atoll.

7. **Interfaces graphiques (UI Widgets conformes)** :
   - **`AtollFullscreenPanel` (`src/panels/fullscreen/AtollFullscreenPanel.js`)** :
     - Vue plein écran (`ModalIds.ATOLL`) avec affichage d'un panneau verrouillé explicatif si la Ligue n'est pas encore remportée.
     - En-tête avec solde de jetons, série en cours et meilleur record personnel.
     - Barre d'onglets de navigation :
       - *Accueil* : cartes des 4 pôles de défi avec suivi des victoires.
       - *Tour de combat* : 7 modes avec compte à rebours en temps réel, descriptifs, bannissements actifs et boutons d'engagement.
       - *Usine de combat* : gestion de l'équipe d'emprunt avec ouverture de la modale de préparation (`ModalIds.ATOLL_FACTORY_PREP`), série en cours et abandon.
       - *Arène de combat* : modes spéciaux (3 Pokémon, sans objet, monotype).
       - *Dôme de combat* : défis en tournoi (Quarts et Finale).
       - *Boutique & Fragments* : achats d'objets rares en jetons et autel d'invocation des Pokémon Légendaires via fragments.
   - **`AtollFactoryPrepModal` (`src/panels/AtollFactoryPrepModal.js`)** :
     - Modale de préparation tactique de l'équipe d'emprunt.
     - Fiches des Pokémon loués (statistiques, talent, objet tenu).
     - Réorganisation de la formation d'équipe (boutons fléchés gauche/droite).
     - Réorganisation des capacités de chaque Pokémon (boutons fléchés haut/bas).
   - **Raccourci (`Shortcuts.js`)** :
     - Raccourci vers l'Atoll de combat activé et configuré avec `ModalIds.ATOLL`.

### 3.2 Validation et suite de tests

- **623 tests automatisés réussis sur 623 (100% de succès)**.
- **17 nouveaux tests unitaires dédiés créés dans `tests/Atoll.test.js`** :
  - *Rotations, Curated Sets & Determinism* : rotation de 12h, déterminisme des équipes par fenêtre, renouvellement de graine, conformité des pools, bannissements de légendaires, légitimité des sets de niveau 100 et respect des budgets IV/EV <= 36.
  - *Factory Rental Runs & Lifecycle* : création de session d'emprunt, progression de série, réorganisation forcée avec anti-identité, bonus de récompenses par niveau.
  - *Save Model, Shop & Fragments* : sérialisation `AtollData`, achats d'objets en jetons, collecte de fragments, choix et invocation de boss légendaire.
  - *UI Modals & Access Gates* : verrouillage pré-Ligue, navigation entre les 6 onglets, affichage du minuteur en direct, et préparation tactique de l'Usine.
- Respect rigoureux des règles `StaticRules.test.js` (aucun emoji brut, aucune injection HTML, classes uniques, commentaires en anglais, localisation bilingue intégrale).

---

## 4. Phase 2.3 : Base Secrète (Secret Base)

**Version de production : 1.14.33 · Schéma de sauvegarde : 20 (inchangé).**

La Base Secrète a été consolidée, vérifiée et intégrée sous l'architecture Rework, assurant une parfaite parité avec le jeu de référence tout en respectant l'isolation stricte des données et des composants UI.

### 4.1 Architecture et composants validés

1. **Modèle de données persistant (`SecretBaseData` dans `src/data/save/SecretBaseData.js`)** :
   - Étend `BaseModel` et persiste les données de la base :
     - `layoutId` : identifiant du plan de salle (36 layouts disponibles).
     - `locationId` : identifiant de la route d'établissement.
     - `decorations` : meubles placés avec identifiants, coordonnées `(x, y)` et rotation.
     - `stock` : meubles et décorations possédés en réserve dans l'inventaire de la base.
     - `npcs` : PNJ placés dans la base avec nom, sprite, équipe de Pokémon et messages personnalisés.
     - `npcStock` : PNJ en réserve.
     - `spawn` : coordonnées du point d'apparition (entrée).
     - `record` : victoires (`wins`), défaites (`losses`) et visites (`visits`).
     - `pcMessage` : message d'accueil pour les visiteurs.
     - `flags` : compteur de drapeaux capturés (`count`), historique des horodatages par base (`collectedIds`) et dernier rang notifié.
   - Intégré dans `SaveData.js` (`save.secretBase`) et pris en charge dans `MigrationOriginalToV1.js` (schéma 20 inchangé).

2. **Dépôts de données (`src/data/base/`)** :
   - `SecretBaseItemDB` : catalogue des 122 décorations réparties sur 8 catégories (bureaux, chaises, plantes, objets, tapis, murs, peluches, coussins), dimensions, calques (`floor`, `surface`, `wall`), surfaces d'accueil, encombrements et décalages d'affichage.
   - `SecretBaseLayoutDB` : 36 plans de base conformes à Pokémon Émeraude avec grilles ASCII, types de terrains (`tree`, `bush`, `cave`, etc.), points d'ancrage d'escaliers et coordonnées d'apparition.

3. **Règles métier (`src/systems/secret-base/`)** :
   - `SecretBasePlacementRules` : gestion des collisions au sol, superposition sur meubles de surface, encombrements multicases, ancrage mural, franchissement par les PNJ et accessibilité.
   - `SecretBaseFlagBonusProvider` : fournisseur de bonus passifs branché sur le `BonusSystem` commun :
     - Échelonnage des bonus de drapeaux aux paliers ORAS (Bronze 30+, Argent 100+, Or 500+, Platine 1000+) : gains en argent (+3% à +8%), expérience (+3% à +8%), énergie maximale de la Mine (+3 à +8) et butin de route (+1% à +2%).
   - `SecretBaseExchangeRules` : règles de partage JSON en lecture seule (visite seule sans altération de la base distante, sans transfert de stock ni fuite de données personnelles).

4. **Systèmes moteurs (`src/systems/`)** :
   - `SecretBaseAccessSystem` : contrôle d'accès conditionné à l'étape de quête de Hoenn (`main.216`).
   - `SecretBaseSystem` : moteur singleton coordonnant l'établissement d'une base sur une alcôve de route, le déménagement avec retour automatique des décorations au stock et retrait des PNJ, le placement/déplacement/retrait de meubles, l'édition des PNJ et de leur équipe, l'exécution des visites interactives avec déplacement BFS pas-à-pas, le déclenchement des duels de PNJ (dédiés et isolés des stats de dresseurs sauvages), la collecte de drapeaux toutes les 24h et la gestion du message du PC.
   - Intégration dans `AchievementSystem` : abonnement à `SecretBaseChangedEvent` et évaluation dynamique des métriques de succès `base_flags`, `base_decos`, `base_visitors`.

5. **Interfaces utilisateur (UI Widgets conformes)** :
   - `SecretBasePanel` (`src/panels/SecretBasePanel.js`) : widget du tableau de bord (`WindowIds.BASE`, colonne centrale) avec aperçu de la base, statistiques de visites/records/drapeaux, actions de visite, passage en mode édition (sélection de stock, placement, ramassage, édition de message PC, éditeur de PNJ) et outil d'import/export de bases distantes.
   - `SecretBaseVisitModal` (`src/panels/SecretBaseVisitModal.js`) : modale dédiée (`ModalIds.SECRET_BASE_VISIT`) pour l'exploration interactive, le dialogue avec le PC de la base, la capture du drapeau, le défi des PNJ de la base et la prise en charge de l'établissement direct depuis un aperçu d'alcôve.
   - `SecretBaseRoomView` (`src/panels/components/SecretBaseRoomView.js`) : composant Canvas de rendu Pixel Art 2D reproduisant fidèlement les décors, l'éclairage, les meubles, les PNJ, le sprite du joueur et le tracé du chemin de marche.

### 4.2 Validation et suite de tests

- **624 tests automatisés réussis sur 624 (100% de succès)**.
- **Suite de tests dédiée `tests/SecretBase.test.js` (10 tests unitaires complets)** :
  - Résolution bilingue de toutes les clés de localisation FR et EN.
  - Fermeture propre de la modale de visite lors des changements de sauvegarde.
  - Établissement initial avec PC automatique et sans meubles gratuits.
  - Déménagement vers une nouvelle alcôve avec retour des meubles au stock et retrait des PNJ.
  - Rafraîchissement dynamique du panneau de lieu (`LocationPanel`) en action d'entrée directe dans sa propre base une fois établie.
  - Fermeture automatique de l'éditeur lors du lancement d'une visite.
  - Réinitialisation propre de l'état transitoire de l'éditeur au changement de sauvegarde.
  - Collecte de drapeau avec délai de 24h et calcul cumulatif des bonus partagés.
  - Duel de PNJ via le moteur de combat avec résultat dédié Base (aucun gain d'argent de dresseur, aucune capture sauvage, aucun événement de KO ordinaire).
  - Évaluation et déblocage réactif des succès de la famille Base Secrète (`base_decos`, `base_flags`, `base_visitors`) via `AchievementSystem`.
- Règles d'architecture `StaticRules.test.js` 100% conformes.


