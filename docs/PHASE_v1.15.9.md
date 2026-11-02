# Release v1.15.9 — Nettoyage Pokédex, Évolutions, Sources & Continuité d'Interface

## Vue d'ensemble

La version **v1.15.9** apporte des corrections ciblées et des améliorations ergonomiques majeures issues des retours d'expérience utilisateur :
1. **Suppression du bloc de détails en ligne obsolète (`pw-pokedex-detail`) dans `PokedexPanel.js`** :
   - Élimination de l'ancien mini-panneau de détails qui s'affichait au-dessus de la grille lors de la sélection d'un Pokémon.
   - Préservation exclusive de la modale encyclopédique haute fidélité (`PokedexDetailModal`) au clic sur une espèce du Pokédex.
2. **Correction du formatage des conditions d'évolution dans `PokedexDetailModal.js`** :
   - Élimination des balises HTML brutes (`<b>Niveau ...</b> en`) et des artefacts de syntaxe.
   - Formatage propre et élégant : `➔ [ Niveau 16 ] ➔` et `➔ [ Pierre Foudre (Niveau 1) ] ➔` avec sprites miniaturisés de la pré-évolution et de l'évolution cible.
3. **Enrichissement complet des sources d'obtention (`SpeciesSourceCatalog.js`) & centrage visuel des pastilles** :
   - Intégration du **Marché Noir** (`MarketRules.STOCK`) pour les espèces exclusives (ex. Évoli, Minidraco, Porygon, Abra).
   - Intégration dynamique du **lieu actuel des Pokémon errants** (`RoamingSystem.getRouteForSpecies(speciesId)`) calculé sur la fenêtre de rotation UTC de 12 heures.
   - Intégration des **invocations de fragments de légende** à l'Atoll de Combat (`FRAGMENT_LEGENDARIES_BY_REGION`).
   - Intégration des **titres de quêtes localisés** (principales et secondaires).
   - Centrage parfait du texte des pastilles de lieu (`.pw-pokedex-source-chip` : `justify-content: center; text-align: center;`).
4. **Maintien de la position de défilement lors du changement d'onglet de capacités** :
   - Refactorisation de `_renderMovesSection` dans `PokedexDetailModal.js` pour mettre à jour directement le conteneur `contentBox` (`_populateMoveTabContent`) au clic sur les onglets *Niveau*, *CT/CS* et *Entraînement*, sans re-rendre l'ensemble de la modale et sans faire remonter le défilement en haut.
5. **Correction des sprites d'objets et des pierres d'évolution dans `LocationPanel`** :
   - Remplacement des identifiants avec underscore (`fire_stone`, etc.) par les identifiants canoniques (`firestone`, `waterstone`, `thunderstone`, `leafstone`, `moonstone`, `sunstone`) dans `RouteDrops.js`.
   - Enregistrement transparent des alias de pierres dans `ItemDB.js` (`fire_stone` ➔ `firestone`), garantissant la résolution immédiate du sprite et du nom français sans dédoubler les entrées du Dictionnaire.
6. **Documentation claire des modes d'obtention des Pokémon Légendaires**.

---

## 1. Nettoyage du Pokédex (`PokedexPanel.js`)

- **Suppression du bloc inline obsolète** :
  - Dans les versions précédentes, la sélection d'une case dans la grille Pokédex provoquait l'affichage d'un conteneur `.pw-pokedex-detail` directement au sein de `PokedexPanel`, en plus d'ouvrir la fiche détaillée `PokedexDetailModal`.
  - Ce conteneur redondant a été entièrement supprimé.
  - La méthode `_renderContent(entries, dex, { preserveScroll = false })` ne restitue désormais que la grille de Pokémon (ou l'état vide si aucun résultat n'est trouvé).
  - L'import inutile de `LocationDB` dans `PokedexPanel.js` a été retiré.

---

## 2. Formatage des Évolutions (`PokedexDetailModal.js`)

- **Problème initial** :
  - La condition d'évolution utilisait des clés de progression de quête (`m.progression.7`, `m.progression.8`) qui contenaient du HTML brut (`<b>Niveau {lvl}</b> en`), provoquant des balises apparentes et des phrases tronquées dans les lignes de la chaîne évolutive.
- **Correction** :
  - Remplacement par des chaînes formattées propres utilisant `t('level_word')` :
    - Évolution par niveau : `➔ [ Niveau 16 ] ➔`
    - Évolution par objet : `➔ [ Pierre Eau ] ➔` ou `➔ [ Pierre Feu (Niveau 1) ] ➔`
  - Présentation symétrique avec sprite et libellé de l'espèce de départ et de l'espèce cible.

---

## 3. Sources d'Obtention & Pokémon Légendaires (`SpeciesSourceCatalog.js`)

Le catalogue `SpeciesSourceCatalog.getFormattedSources(speciesId)` intègre désormais 5 sources complémentaires :

1. **Rencontres sauvages classiques et donjons** :
   - Lecture de `LocationDB` avec calcul automatique du pourcentage de chance et de la plage de niveaux.
2. **Marché Noir (`MarketRules.STOCK`)** :
   - Référence les Pokémon achetables auprès du Marché Noir (ex. Évoli, Minidraco, Insécateur, Porygon) selon la région débloquée.
3. **Pokémon Errants avec route dynamique (`RoamingSystem.getRouteForSpecies`)** :
   - Les Pokémon errants (Artikodin, Électhor, Sulfura à Kanto ; Raikou, Entei, Suicune à Johto ; Latias, Latios à Hoenn) tournent toutes les 12 heures (UTC).
   - La pastille affiche désormais la position en direct :  
     *Exemple : "Légendaire errant (Kanto) : Actuellement sur Pont Pépite (24) (1 %, Nv. 75)"*.
4. **Quêtes d'histoire et secondaires** :
   - Résolution du nom exact de la quête (`quests.<category>.<id>.title`) récompensant ou opposant le joueur à l'espèce (ex. *"Quête : Le Clone Ultime de la Caverne Azurée"* pour Mewtwo).
5. **Fragments de Légende de l'Atoll de Combat (`FRAGMENT_LEGENDARIES_BY_REGION`)** :
   - Indication claire pour chaque légendaire invocable à l'Atoll de Combat :  
     *Exemple : "Atoll de Combat : Invocation (50 Fragments de Légende)"*.

---

## 4. Continuité du Défilement sur les Onglets de Capacités (`PokedexDetailModal.js`)

- **Problème initial** :
  - Cliquer sur un onglet de capacités (*Niveau*, *CT*, *Entraînement*) appelait `this._render()`, ce qui reconstruisait l'ensemble du DOM de la modale et réinitialisait la position de défilement vers le sommet de la fenêtre.
- **Correction** :
  - Découplage de la gestion des onglets de capacités :
    - `_renderMovesSection()` initialise le bandeau d'onglets et le conteneur `contentBox` (`pw-pokedex-moves-content`).
    - Le changement d'onglet appelle `switchTab(tabId)`, qui met à jour la variante active des boutons (`UIButton.setVariant`) et exécute `_populateMoveTabContent(species, tabId, contentBox)`.
    - Seul le contenu de `contentBox` est vidé et reconstruit via `clearChildren()`, sans aucun impact sur le défilement de la modale parent.

---

## 5. Sprites des Objets de Route & Alias de Pierres (`RouteDrops.js`, `ItemDB.js`, `LocationPanel.js`)

- **Alignement canonique des identifiants** :
  - Correction dans `RouteDrops.js` :
    - `moon_stone` ➔ `moonstone`
    - `fire_stone` ➔ `firestone`
    - `water_stone` ➔ `waterstone`
    - `thunder_stone` ➔ `thunderstone`
    - `leaf_stone` ➔ `leafstone`
    - `sun_stone` ➔ `sunstone`
    - Remplacement des identifiants orphelins (`carbos_plus`, `zinc_plus`, `berry_pouch`, `soothe_bell`) par des objets canoniques valides (`carbos`, `zinc`, `silk_scarf`, `focus_band`).
- **Résolution transparente par alias dans `ItemDB.js`** :
  - Ajout d'une table interne `this._aliases` dans `ItemDB.js` associant les identifiants avec tiret bas aux identifiants canoniques.
  - Surcharge de `getById(id)` et `has(id)` pour résoudre les alias sans altérer `getAll()`, préservant le compte exact d'objets du Dictionnaire (214 en Kanto).
- **Affichage sécurisé dans `LocationPanel.js`** :
  - `_dropsGrid` résout l'identifiant canonique via `itemDb.getById(rawId)?.id || rawId` pour garantir le chargement du sprite SVG/PNG et de la clé de localisation `item.<id>.name`.

---

## 6. Guide d'Obtention des Pokémon Légendaires

Pour clarifier l'expérience des joueurs, les Pokémon Légendaires sont accessibles selon 3 voies complémentaires :

| Type d'accès | Fonctionnement | Espèces concernées |
|---|---|---|
| **Pokémon Errants (Roaming)** | Apparaissent sur une route extérieure spécifique de leur région d'origine avec un taux d'apparition de 1 % (Nv. 75). Leur position change toutes les 12 heures UTC. | Artikodin, Électhor, Sulfura, Raikou, Entei, Suicune, Latias, Latios |
| **Donjons & Quêtes d'Histoire** | Boss ultimes de donjons de haut niveau (combat épique avec x35 PV et enrage de 90 secondes) ou récompenses de quêtes d'histoire. | Mewtwo (Caverne Azurée), Mew, Lugia (Tour Tourbillon), Ho-Oh (Tour Cendrée), Kyogre, Groudon, Rayquaza |
| **Atoll de Combat (Fragments)** | Obtention de Fragments de Légende lors des séries de victoires à l'Atoll de Combat (Tour de Combat, Usine de Combat). Invocation directe garantie à partir de 50 fragments. | Toutes les espèces légendaires régionales |

---

## Validation et Métriques

- **Total des tests unitaires et d'intégration** : **687 tests réussis, 0 échec**.
- **Règles statiques de qualité (Architecture & CSS)** : **27 vérifications passées avec succès**.
- **Archive livrable** : `pokeworld-rework-1.15.9.zip`.
