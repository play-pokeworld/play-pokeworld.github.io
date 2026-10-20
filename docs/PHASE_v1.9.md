# Livraison Rework v1.9 — systèmes Kanto et archive

**Version du paquet : 1.9.0** · **Schéma de sauvegarde : 9** · Branche : `Rework` · Date : 20/10/2026

Cette note décrit l'état de la livraison historique 1.9.0. La version 1.8 n'est pas publiée : le schéma 6 est une étape de développement intermédiaire, tandis que le paquet et le lanceur annonçaient 1.9.0. Les corrections et contrôles du patch suivant sont consignés séparément dans [`PHASE_v1.9.1.md`](PHASE_v1.9.1.md) et ne sont pas attribués à la 1.9.0.

## Ce qui est inclus

- **Interface et combat** : les panneaux Rework utilisent les widgets, l'EventBus et les classes CSS. Le paquet inclut l'en-tête, les monnaies, le lieu, l'équipe, l'objet tenu, les informations Pokémon, la présentation des combattants, les cases libres, les enchaînements sauvages, le butin et le résumé de combat.
- **Quêtes Kanto** : les **64 étapes principales** sont présentes dans l'ordre `main.1` à `main.64`; les données et types d'objectifs sont validés. Après le badge Surge, `main.22` demande une session d'entraînement à Vermilion. Les autres régions contiennent 41 quêtes Johto et 89 Hoenn, soit 194 principales.
- **Tutoriel** : les dix étapes et leurs conditions d'origine sont conservées. Les récompenses sont données par les données de récompense et les indicateurs empêchent de les réclamer plusieurs fois. Les phrases de récompense statiques des catalogues n'ont pas été réécrites.
- **Capture et équipe** : captures, équipe/boîte, filtres de Poké Balls et vingt presets d'équipe restent intégrés aux modèles et systèmes Rework. Les changements d'équipe passent par `TeamSystem`.
- **Pension et fossiles** : Pokémon de l'équipe ou de la boîte déposables à la pension; toutes les dix éliminations adverses donnent un niveau au Pokémon déposé. Les fossiles progressent eux aussi avec les K.O. puis peuvent être récupérés. La résurrection est verrouillée jusqu'à Kanto 25. La pension monte à quatre emplacements (500, 1 000 puis 2 500 points de quête).
- **Entraînement** : session automatique de six combats à Vermilion, après le badge Surge; un Pokémon éligible de l'équipe ou de la boîte peut apprendre un mouvement après une victoire. La complétion alimente l'objectif de `main.22`.
- **Mine et ventes** : grille persistante à la Caverne Taupiqueur, outils ciseau/marteau, énergie régénérable, trésors et fossiles; les objets vendables peuvent être cotés puis vendus contre la devise configurée.
- **Donjons** : expédition fidèle en grille avec péage, salles et rencontres, coffres, étages, butin transporté, montée/abandon, perte partielle en cas de défaite et état de run sauvegardé/reprenable.
- **Sauvegardes** : schéma 9; migrations successives depuis les anciens exports et les schémas précédents pour les nouveaux champs du tutoriel, des donjons, de la pension, de la mine et des statistiques.

## Décisions conservées

- La publication est **1.9.0** — aucun paquet 1.8 n'est produit.
- Les donjons sont une expédition en grille, et non une chaîne de combats simplifiée.
- Les systèmes, données et règles métier ne manipulent pas le DOM; les interfaces restent dans les panneaux/widgets.
- Les textes de récompense de quête sont rendus depuis les données de récompense, pas depuis une phrase statique parallèle.
- Le ZIP contient les sources et les tests; aucun `node_modules`, dépôt `.git` ni cache n'est requis pour le démarrer.

## Vérifications de livraison

- `npm test` : **190 tests réussis, 0 échec**.
- Les contrôles syntaxiques des fichiers JavaScript, `git diff --check` et le validateur de données sont inclus dans la vérification de livraison.
- Le serveur statique local est testé sur l'index et des ressources du jeu. Un smoke test Playwright à 390 px crée une sauvegarde, recharge le navigateur, la rouvre et vérifie l'absence d'erreur JavaScript.
- Le ZIP est extrait dans un dossier temporaire, contrôlé avec `unzip -t`, puis sa suite de tests est relancée.
- Correctif de démarrage après retour utilisateur : import explicite de `DashboardWindowFocusRequestedEvent` dans `MobileDashboardNav`, avec test de régression sur l'événement de focus.

## Limites connues et éléments différés

- **Portage des installations non intégral** : la pension livrée fait pension/niveaux et incubation de fossiles; elle ne fait pas d'élevage d'œufs ni d'automatisation par employés. L'entraînement ne livre que le mode déplacement/mouvement à six adversaires — pas les modes niveau/EV/talent, files d'attente ou emplacements parallèles du jeu d'origine. La mine n'a pas encore l'automatisation, les employés ni l'arbre d'améliorations historique.
- **Validation des quêtes** : les 64 définitions Kanto, leur ordre, leurs références et leurs types d'objectifs sont contrôlés; des tests d'intégration couvrent les portes de progression et systèmes principaux. Il ne s'agit pas d'un parcours navigateur automatisé de chacune des 64 quêtes.
- **Contrôle visuel** : le démarrage HTTP et les tests automatisés sont vérifiés, mais la QA responsive complète dans plusieurs navigateurs reste à faire.
- La demande « en combat » n'a pas défini si elle désignait un panneau/indicateur supplémentaire. Le combat automatique, ses emplacements, son butin et son résumé sont présents; aucun écran additionnel n'est prétendu pour cette expression ambiguë.
- L'équilibrage et certaines traductions anglaises peuvent nécessiter une relecture. Exporter une sauvegarde avant d'essayer une nouvelle version.

## Lancement

Nécessite **Node.js 18+**. Extraire l'archive, se placer dans son dossier puis exécuter `npm start`; aucune installation de dépendances n'est nécessaire. Le serveur ouvre le navigateur et choisit un port libre à partir de 3000. Pour vérifier l'installation : `npm test`.
