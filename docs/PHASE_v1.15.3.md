# Phase v1.15.3 — Boss de Raid Légendaires, Hard Enrage 90s, Transit Régional & Paliers de Pension

## Résumé de la version 1.15.3

Cette itération 1.15.3 concrétise les piliers de difficulté endgame, de transition régionale fluide et d'économie de pension :

1. **Boss de Raid Légendaires Épiques (`DungeonBattleRules.js`)** :
   - Mise à l'échelle massive des boss de donjon légendaires (`HatcheryRules.LEGENDARY_DEX`) :
     - Multiplicateur de points de vie porté à **$\times 35$** (ex. Artikodin, Électhor, Sulfura, Mewtwo).
     - Multiplicateurs de statistiques ajustés (`atk: 1.6`, `spa: 1.6`, `def: 1.4`, `spd: 1.4`, `spe: 1.3`).
     - Niveau de base minimum garanti à 70.
     - Tag canonique `legendaryBoss: true` assigné au combatant.

2. **Hard Enrage Timer de 90 Secondes (`BattleSession.js`)** :
   - Conformément aux spécifications de difficulté maximale de référence (Section II.2 de `PLAN_EQUILIBRAGE_GLOBAL.md`) :
   - Suivi du temps de combat contre un boss légendaire (`legendaryElapsedMs`).
   - Si le joueur ne parvient pas à terrasser le boss en moins de 90 secondes (90 000 ms), le boss déclenche sa frappe d'annihilation globale (`dungeon_boss_enrage_wipe`) infligeant des dégâts mortels au Pokémon actif du joueur ($10\times$ ses PV max).
   - Impose l'alignement d'une équipe optimisée (6 IV, 6 EV, objets de haut niveau et synergies élémentaires Cross-STAB) pour réussir le DPS check.

3. **Condition de Transit Régional Pokédex Hors Légendaires (`FeatureAccessSystem.js`)** :
   - Pour traverser vers la région suivante (ex. Kanto $\to$ Johto), le joueur doit posséder le titre de Maître de la Ligue régionale et avoir complété le Pokédex régional **hors légendaires et fabuleux** (soit les 146 espèces régionales standard de Kanto).
   - Empêche le blocage de l'histoire par les boss de raid endgame de niveau 70-100 tout en préservant l'exigence d'exploration complète.

4. **Paliers de Tarification Progressive de la Pension (`HatcherySystem.js` & `HatcheryData.js`)** :
   - Enregistrement du niveau initial du Pokémon lors du dépôt (`initialLevel`).
   - Calcul des frais de retrait progressifs : **$100$ ₽ de base $+ 100$ ₽ par niveau gagné** pendant le séjour à la pension.
   - Intégration de la méthode d'inspection `getDaycareWithdrawFee(slotIndex)` pour l'affichage UI et le prélèvement automatique à la récupération.

5. **Validation & Conformité** :
   - Suite de tests portée à **652 tests passants sur 652 (100 % de succès)** avec `tests/Release1153.test.js`.
   - Zéro violation des 27 règles statiques de code.
   - Version estampillée `1.15.3`.
