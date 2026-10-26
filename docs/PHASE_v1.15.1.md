# Phase v1.15.1 — Formes de Base sur les Routes, Étalonnage d'Entraînement BST, Combo Cross-STAB & Quêtes du Marché Noir

## Résumé de la version 1.15.1

Cette itération 1.15.1 poursuit l'exécution du plan d'équilibrage et de progression naturelle :

1. **Suppression des Évolutions Sauvages sur les Routes (`encounters-content.js`)** :
   - Conformément à la vision d'équilibrage (Section 8.A de `PLAN_EQUILIBRAGE_GLOBAL.md`), les formes évoluées sauvages (`raticate`, `gloom`, `weepinbell`, `fearow`, `arbok`, `tentacruel`) présentes sur les routes de Kanto (Routes 14, 17, 18, 19, 20, 21, 23) ont été remplacées par leurs formes de base (`rattata`, `oddish`, `bellsprout`, `spearow`, `ekans`, `tentacool`).
   - Le joueur est ainsi naturellement encouragé à capturer des formes de base et à les faire progresser en niveau (ou via la pension) pour déclencher leurs évolutions et compléter son Pokédex.

2. **Étalonnage Relatif de l'Entraînement des EVs (`TrainingSystem.js`)** :
   - Implémentation du système d'étalonnage dynamique basé sur le Total des Statistiques de Base (BST) du stagiaire (`traineeBst / oppBst`, borné entre $0.60\times$ et $1.15\times$).
   - Permet à **n'importe quel Pokémon, même de classe E ou D (Chenipan, Magicarpe, Aspicot, Rattata)**, d'affronter des opposants aux statistiques ajustées et de remporter ses 30 combats de sparring pour forger ses 6 étoiles d'EVs.
   - À l'inverse, les Pokémon à haut BST (Dracolosse, Tyranocif) continuent d'affronter des adversaires au niveau relevé garantissant un défi d'entraînement digne de leur rang.

3. **Bonus de Combo Offensif Cross-STAB (`BattleRules.js` & `DamageCalculator.js`)** :
   - Intégration de la constante `BattleRules.CROSS_STAB_BONUS = 0.35` (+35 % de dégâts).
   - Lorsqu'un Pokémon à double type (ou bénéficiant d'attaques de ses types natifs) alterne entre deux attaques STAB de types distincts (ex. Dracaufeu lançant une capacité Vol puis une capacité Feu), l'attaque gagne automatiquement le bonus de combo Cross-STAB.

4. **Déblocage Narratif du Marché Noir (`FeatureAccessSystem.js`)** :
   - Prise en compte de la complétion de la quête d'infiltration du Repaire Rocket de Céladopole (`main.33`) pour autoriser l'accès au Marché Noir, en complément des accès régionaux existants.

5. **Tests et Conformité** :
   - Suite de tests enrichie portée à **644 tests passants sur 644 (100 % de succès)** avec `tests/Release1151.test.js`.
   - Zéro violation des règles statiques.
   - Version estampillée `1.15.1`.
