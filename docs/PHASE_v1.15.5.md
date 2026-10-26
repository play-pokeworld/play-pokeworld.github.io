# Phase v1.15.5 — Talent Corps en Or, Moteur Fast-Forward Post-AFK & Validation Globale de Bout en Bout

## Résumé de la version 1.15.5

Cette itération 1.15.5 parachève les mécanismes de combat et d'AFK, et valide l'ensemble du cycle de vie du jeu sur une nouvelle sauvegarde :

1. **Talent Corps en Or (`goodasgold`) (`StatusRules.js` & `StatChangeRules.js`)** :
   - Immunité absolue aux altérations de statut (`poison`, `burn`, `para`, `sleep`, `freeze`) en combat.
   - Immunité absolue aux diminutions et malus de statistiques provoqués par l'adversaire (`StatChangeRules.isDropBlocked`).
   - Maintien du bonus passif de $+15\%$ de probabilité de rencontre de Pokémon chromatiques.

2. **Moteur Fast-Forward Déterministe Post-AFK (`FastForwardSystem.js` & `FastForwardCompletedEvent.js`)** :
   - Simulation accélérée déterministe lors d'une absence prolongée du joueur sur une route sauvage.
   - Calcul des combats consécutifs, des gains financiers (Pokédollars), des apparitions d'objets rares de route et des avancées en pension.
   - Prise en compte de la fatigue de combat au-delà de 50 KOs et atténuation par le talent `stamina`.
   - Émission de l'événement typé `FastForwardCompletedEvent` pour restitution du bilan.

3. **Validation Globale de Bout en Bout sur Nouvelle Sauvegarde (`tests/Release1155.test.js`)** :
   - Cycle complet : initialisation du dresseur, sélection du starter au niveau 5 avec 500 ₽, verrou de niveau de pension initial calqué sur le starter.
   - Montée en niveau dynamique et expansion en temps réel du plafond de pension régional.
   - Verrouillage strict de l'accès à Johto avant la victoire de Ligue et la complétion du Pokédex standard.
   - Tous les modules interconnectés (Atoll, Base Secrète, Quêtes, Embuscades, Pensions, Entraînement, Raids) testés et confirmés fonctionnels.

4. **Validation et Métriques** :
   - Suite de tests globale portée à **660 tests passants sur 660 (100 % de succès)**.
   - 27 règles statiques validées (0 violation).
   - Version estampillée `1.15.5`.
