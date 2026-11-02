# Release v1.15.8 — Plafond EV, Récupération AFK, Butins de Route et Fiche Espèce Pokédex

## Vue d'ensemble

La version **v1.15.8** corrige les quatre dysfonctionnements majeurs signalés lors des sessions de jeu :
1. **Correction de l'affichage et du plafond des EV (Effort Values)** : rétablissement du plafond de 6 EV par statistique (total 36 EV) sur la fiche Pokémon (`PokemonInfoModal`) et dans le moteur de règles (`PokemonRules.js`), en parfaite cohérence avec le système d'IV (6/6).
2. **Correction complète du mode AFK & Récupération de fatigue** :
   - Résolution de l'exception bloquante `TypeError: this.setFooter is not a function` en intégrant `setFooter()` dans `src/ui/UIPanel.js`.
   - Résolution du blocage des Pokémon à 1 PV sous fatigue : les dégâts d'usure peuvent désormais mettre K.O. une équipe épuisée (0 PV), mettant fin au combat sans boucle infinie.
   - Restauration automatique et complète des PV de l'équipe (`healFull()`) au retour de la simulation d'inactivité afin que le joueur reprenne sa partie immédiatement.
   - Déclenchement garanti de la modale de récapitulatif AFK (`AfkSummaryModal`) à la réactivation de l'onglet.
3. **Implémentation complète des butins de combat sauvage (Item Drops)** :
   - Tables de butin complétées pour l'ensemble des 59 routes et lieux de rencontre de Kanto, Johto et Hoenn dans `src/data/world/RouteDrops.js`.
   - Pool de secours sécurisé dans `src/systems/battle/RouteDropRules.js`.
   - Rehaussement du taux de drop de base à 15% (jusqu'à 35% avec objets tenus et talents comme Ramassage) dans `src/config/BattleRules.js`.
   - Tirage de butin activé sur toutes les victoires de route dans `BattleSystem.js` (rencontres uniques et chaînes) avec notification toast discrète lors de l'obtention.
4. **Refonte encyclopédique haute fidélité de la fiche Pokédex (`PokedexDetailModal`)** :
   - Harmonisation visuelle totale avec la référence et le gabarit `PokemonInfoModal` (`poke-detail-shell`, `poke-detail-hero`, `poke-detail-section-grid`).
   - Intégration du lecteur audio de cri, badge de statut de capture, badges élémentaires, pastilles Taux de capture et EXP de base.
   - Barres de statistiques de base avec Total BST canonique.
   - Carte de texte d'ambiance officielle du Pokédex (FR / EN).
   - Chaîne évolutive complète (pré-évolution, évolutions, niveaux requis, pierres d'évolution, Câble Link).
   - Lieux de rencontre avec pourcentages d'apparition exacts.
   - Liste des talents avec raretés et liens cliquables vers le Dictionnaire.
   - Onglets de capacités : Table de montée de niveau (avec niveau, puissance, précision), compatibilité CT/CS et entraînement au dojo.

---

## 1. Plafond et Affichage des EV (`PokemonRules.js`, `PokemonInfoModal.js`)

- **Règles canoniques alignées** :
  - `PokemonRules.EV_MAX` ramené à **6** (au lieu de 18).
  - `PokemonRules.EV_TOTAL_MAX` fixé à **36** (6 statistiques × 6 = 36 max, identique au système d'IV).
  - L'onglet EV de la fiche Pokémon (`PokemonInfoModal`) affiche désormais `${val} / 6` pour chaque statistique et `${total} / 36` pour le total général.
  - La consommation de vitamines (Protéine, Fer, Carbone, etc.) et l'entraînement au Centre d'Entraînement respectent strictement cette borne maximale de 6 points par statistique.

---

## 2. Déblocage du Mode AFK & Gestion de la Fatigue

- **Résolution de l'incident modale AFK** :
  - `AfkSummaryModal._render()` appelait `this.setFooter()`, méthode inexistante sur `UIPanel` et `UIModal`, ce qui provoquait une erreur silencieuse non interceptée et empêchait l'affichage du récapitulatif.
  - Implémentation de `setFooter(children)` dans `src/ui/UIPanel.js` avec création dynamique du conteneur de pied de page (`.pw-panel-footer`) et styles CSS associés dans `assets/css/ui-modal.css`.
- **Élimination du verrou 1 PV / combat infini** :
  - Dans `BattleSystem.js` et `FastForwardSystem.js`, l'application de l'usure de fatigue utilisait `Math.max(1, member.hp - wearDamage)`, bloquant artificiellement les Pokémon à 1 PV sans jamais permettre le K.O.
  - Corrigé avec `Math.max(0, member.hp - wearDamage)`. Dès que l'ensemble des 6 membres de l'équipe tombe à 0 PV, la chaîne de combat s'arrête immédiatement et proprement pour épuisement.
- **Soin au retour d'inactivité** :
  - Au retour du joueur sur le jeu, `FastForwardSystem.simulateOffline()` applique désormais `member.healFull()` sur tous les membres de l'équipe active, garantissant une équipe prête au combat.

---

## 3. Butins d'Objets sur les Routes Sauvages (`RouteDrops.js`, `RouteDropRules.js`)

- **Couverture exhaustive des routes régionales** :
  - Complétion de `src/data/world/RouteDrops.js` pour inclure l'ensemble des routes et zones d'affrontement sauvage de Kanto, Johto et Hoenn (59 zones auparavant absentes de la table).
  - Ajout d'une table de fallback automatique (`prine_berry`, `cheri_berry`, `oran_berry`, `pecha_berry`) dans `RouteDropRules.poolFor(locationId)`.
- **Calibrage des probabilités d'obtention** :
  - Taux de base rehaussé de 1% à **15%** (`WILD_DROP_BASE_CHANCE_PCT`).
  - Plafond maximal fixé à **35%** (`WILD_DROP_MAX_CHANCE_PCT`).
  - Bonus des objets tenus (ex. Pièce Rune, objets de chance) porté à **+5%** (`WILD_DROP_HELD_ITEM_BONUS_PCT`).
- **Notification en jeu** :
  - Lorsqu'un objet est abandonné par un Pokémon sauvage vaincu, une notification toast informative est émise pour signaler le butin obtenu.

---

## 4. Refonte Haute Fidélité de la Fiche Espèce Pokédex (`PokedexDetailModal.js`)

- **Structure visuelle et ergonomie** :
  - Agencement conforme à `poke-detail-shell` : à gauche la carte d'identité de l'espèce, à droite la fiche des statistiques de base.
  - Zone centrale en grille réactive à deux colonnes pour le texte descriptif officiel, les évolutions, les lieux de rencontre et les talents.
  - Sélecteur d'onglets pour le répertoire complet des capacités :
    - *Niveau* : tableau stylisé avec niveau d'apprentissage, nom de la capacité, badge de type, puissance et précision.
    - *CT / CS* : puces cliquables détaillant le numéro de la capsule, le nom de la capacité et le type.
    - *Dojo / Entraînement* : liste des capacités enseignables.
  - Boutons d'interaction reliés aux systèmes existants : lecteur du cri via `AudioSystem.playCry()`, ouverture de la modale de dictionnaire au clic sur une capacité ou un talent.

---

## 5. Tests et Validation

- **Nouvelle suite de tests v1.15.8 (`tests/Release1158.test.js`)** :
  1. Validation du plafond EV à 6 et affichage `/ 6` et `/ 36` dans `PokemonInfoModal`.
  2. Implémentation et rendu fonctionnel de `setFooter` et `AfkSummaryModal`.
  3. Soin complet de l'équipe au retour d'inactivité par `FastForwardSystem`.
  4. Mise K.O. par usure de fatigue et arrêt propre de combat sur épuisement.
  5. Couverture et tirage effectif des butins de routes avec taux à 15%.
  6. Rendu complet de la fiche Pokédex avec description, évolutions, sources, talents et capacités.
- **Résultat global** :
  - **683 tests validés avec succès (0 échec)**.
  - Validation intégrale des règles statiques de `Rules.md`.
