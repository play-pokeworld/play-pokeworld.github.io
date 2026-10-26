# Phase v1.15.4 — Objets Tenus Palier 25, Cristaux Z & Méga-Gemmes, Talents Simple & Lunatique, Laboratoire de Cramois'Île

## Résumé de la version 1.15.4

Cette itération 1.15.4 concrétise plusieurs briques majeures d'optimisation de fin de jeu et de couverture de combat :

1. **Extension des Paliers d'Objets Tenus jusqu'au Palier 25 (`BattleRules.js` & `HeldItemPower.js`)** :
   - Échelonnement continu de la puissance des objets tenus jusqu'au **Palier 25** (pour 120 exemplaires possédés en inventaire).
   - Maintien d'une compatibilité ascendante stricte pour les paliers 1 à 6 (5, 10, 15, 20, 25 exemplaires) tout en permettant aux joueurs endgame d'optimiser leurs sets de raid contre les boss légendaires de niveau 100.

2. **Activation en Combat des Méga-Gemmes et Cristaux Z (`DamageCalculator.js` & `BattleEffectCoverage.js`)** :
   - **Méga-Gemmes (`mega_stone`)** : Prise en charge active du multiplicateur de puissance dans le calcul des dégâts (`DamageCalculator._itemAndTalentMult`) fondé sur le palier d'objet tenu.
   - **Cristaux Z (`z_crystal`)** : Déclenchement d'un multiplicateur de puissance de capacité Z ($\times 1.4$) lorsque le type de l'attaque correspond au cristal Z tenu.
   - Les deux effets passent du statut `DEFERRED` à **`PORTED`** dans `BattleEffectCoverage.js`.

3. **Prise en Charge des Talents Simple (`simple`) et Lunatique (`moody`)** :
   - **Simple (`simple`)** : Double l'ampleur de tous les changements de statistiques (`StatChangeRules.apply` et `StatChangeRules.applyRaw`), transformant les hausses en augmentations massives et doublant également les pénalités subies.
   - **Lunatique (`moody`)** : À la fin de chaque tour (`TurnEndRules.apply`), augmente fortement une statistique aléatoire (+2 crans, $\times 2.0$) et en diminue une autre (-1 cran, $\times 0.67$).
   - Ajout de la méthode d'inspection `combatant.hasTalent(id)` sur `BattleCombatant.js`.

4. **Laboratoire de Résurrection de Fossiles à Cramois'Île (`FossilRules.js` & `FossilSystem.js`)** :
   - Conformément au canon des jeux de référence, la résurrection des fossiles (Nautile, Dôme, Ambre) est désormais autorisée à **Cramois'Île (`cinnabar`)** en plus d'Argenta (`pewter`).

5. **Validation et Métriques** :
   - Suite de tests portée à **657 tests passants sur 657 (100 % de succès)** avec `tests/Release1154.test.js`.
   - Zéro violation des règles statiques d'architecture.
   - Version estampillée `1.15.4`.
