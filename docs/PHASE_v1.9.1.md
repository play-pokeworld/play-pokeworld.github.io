# Correctif Rework v1.9.1 — fidélité visuelle et accès rétrocompatibles

**Version du paquet : 1.9.1** · **Schéma de sauvegarde : 11** · Branche : `Rework` · Date : 20/10/2026

> Ce document décrit le correctif 1.9.1. La note [`PHASE_v1.9.md`](PHASE_v1.9.md) reste l'historique de la livraison **1.9.0** : les corrections ci-dessous ne lui sont pas attribuées rétroactivement. Aucun paquet 1.8 n'est publié.
>
> « Fini » signifie ici que l'implémentation Rework et les contrôles automatisés correspondants sont terminés. Cela ne signifie pas que l'utilisateur a validé le rendu. La validation utilisateur reste à sa seule initiative.

## Résumé du correctif

- **Header / badges** : le total suit les conditions originales, et non le nombre de starters régionaux obtenus : Kanto est toujours accessible; Johto demande la Ligue de Kanto et le Pokédex de Kanto complet; Hoenn demande la Ligue de Johto et le Pokédex de Johto complet. Le total est de huit badges par région accessible et se rafraîchit après les changements du Pokédex.
- **Raccourcis** : glyphes et couleurs rapprochés de `main`; l'entrée Atoll rétablit le huitième bouton après l'accès à la Ligue, mais reste honnêtement « bientôt » car l'écran et le gameplay Atoll n'existent pas dans ce Rework. Boîte PC, Marché et Dictionnaire n'ouvrent pas d'écran fictif.
- **Équipe / objets tenus** : badge rond de **44×44 px**, ancré en haut à gauche comme dans le CSS effectif de `main`; la comparaison DOM confirme le même badge, la même image d'objet affichée (~39×39 px) et un sprite de **132×132 px**. L'icône Restes locale est maintenant visible. `UIImage` ne pose plus de `src` vide (qui demandait le document courant) et efface l'état `is-broken` lors du changement de source; sélection, équipement, retrait, rééquipement et persistance après rechargement ont été contrôlés. Le canevas sprite dépasse aussi la colonne de 112 px dans `main`; ne pas le réduire/cliper localement sans accepter une différence avec l'original.
- **Presets** : gestionnaire aligné sur le modèle original à 20 emplacements : nom modifiable, statut actif, compte `/6`, sprites, Pokémon manquants et choix parmi l'équipe/la boîte. Les mutations restent dans `TeamPresetSystem` et `TeamSystem`.
- **Combat** : suppression de la consigne demandant de cliquer sur un Pokémon; résumé compact en deux colonnes avec un défilement de secours uniquement si le contenu dépasse l'espace disponible.
- **Guide** : Guide restauré, ses dix étapes de tutoriel restent intactes, raccourci Guide et boutons d'aide `?` des fenêtres ouvrent le bon chapitre contextuel.
- **Quêtes** : tableau répétable complet restauré : trois offres filtrées par région et persistées, acceptation et progression, reroll gratuit toutes les 10 minutes, capacité de 1 à 5 contrats et quatre améliorations payées (75 000, 200 000, 500 000, 1 200 000 ₽). Pour une nouvelle partie, seul le choix de la Nageuse Ondée à Azuria (`npcId: swimmer-ondee`) déverrouille le tableau; les imports/migrations conservent l'accès déjà acquis. Les contrats r30–r38 sont explicitement limités à Johto. Migration 10→11 et import original préservent offres, horodatage, upgrades, unlock et répétables actifs avec progression/baseline.
- **Lieu / PNJ** : aperçu, région/type, compteurs locaux, état Pokédex, rareté des rencontres et objets trouvables affichés à partir des données; « Parler » ouvre désormais la liste localisée des habitants, et les événements portent l'identité choisie pour les conditions qui ciblent un PNJ précis.
- **Settings** : les textes et contrôles du panneau utilisent explicitement la police principale du jeu; préférences de combat/animation et diagnostics navigateur sont disponibles.
- **Animation de capture** : overlay de verdict rétabli au-dessus de la carte adverse, avec préférence et durées conformes à `main`; la vue réside dans `src/ui`.
- **Accès** : migration rétrocompatible v9→v10 et résolution centralisée des accès Pension, Mine et Entraînement; les panneaux restent masqués jusqu'à l'accès requis.

## Architecture du verrouillage de contenu

`FeatureAccessSystem` est l'unique résolveur, sans DOM. Il combine les règles de progression et les faits d'accès persistés. Les règles atypiques sont déclarées dans `ContentAccessRules`; les connexions, badges régionaux et victoires requis restent dans les données de lieux. Les systèmes de gameplay interrogent ce résolveur avant toute mutation. Les panneaux ne recodent pas les conditions.

Après une progression, `FeatureAccessSystem.refresh()` persiste les faits désormais acquis et publie un snapshot immuable via `ContentAccessChangedEvent`. `DashboardView` utilise le snapshot pour masquer ou révéler les fenêtres; les panneaux qui en dépendent se rafraîchissent sur le même événement. La même source est utilisée pour le dénominateur du header. Les événements Pokédex déclenchent aussi le recalcul régional.

La migration `MigrationV9ToV10` conserve les accès explicitement enregistrés et récupère les preuves durables d'accès déjà acquis (lieux, pension utilisée, progression de mine, sessions d'entraînement, starters et titres). Elle ne transforme pas l'ancien affichage toujours visible des panneaux en déverrouillage : une fonctionnalité jamais atteinte reste verrouillée par sa condition de progression. Les tests couvrent les deux cas.

## Tableau de couverture — gameplay et affichages

| Système / affichage | État | Couverture et limites |
|---|---|---|
| Verrouillage Pension / Mine / Entraînement | **Fini** | Accès central, événements d'UI et migration v9→v10; tests d'accès acquis et non acquis. |
| Régions / badges du header | **Gameplay/visuel en cours** | Règle originale du total implémentée et testée. Contrôle navigateur desktop effectué; revue responsive et validation utilisateur restantes. |
| Guide + icônes `?` | **Fini** | Guide restauré, dix étapes conservées, ouverture contextuelle par fenêtre; test UI du tableau de types. |
| Quêtes / tableau répétable | **Gameplay/visuel en cours** | Offres persistées et filtrées par région (r30–r38 Johto-only), reroll à 10 min, slots et achats payés, acceptation/claim, modales restaurées. Nouvelle partie : déverrouillage uniquement via la Nageuse Ondée identifiée; migrations préservent les accès/états historiques. Tests modèle/système/migration et smoke visuel desktop du dialogue/tableau faits. Parcours de progression réel, revue responsive complète et validation utilisateur restent à faire. |
| Combat et résumé | **Gameplay/visuel en cours** | Combat automatique fonctionnel; hint supprimé; résumé testé en deux colonnes sans défilement pour une session représentative sur desktop. Revue mobile et contenus exceptionnellement longs restantes. |
| Captures / Pokédex / filtres de Poké Balls | **Fini** | Moteur, modèles et interfaces présents; filtres et flux de capture couverts par la suite de tests. |
| Animation de capture | **Fini** | `CaptureAnimationView` dans `src/ui`; préférence, résultat, timers et destruction couverts. Smoke test navigateur : événement typé envoyé pendant un combat, capture de la Poké Ball 72×72 et du taux centrés sur la vraie carte adverse; flux de capture réel non rejoué dans ce smoke test. |
| Équipe / objets tenus | **Gameplay/visuel en cours** | Sélection, équipement, retrait et rééquipement contrôlés via l'UI; l'objet reste équipé après rechargement. Badge 44×44 px et Restes visibles, alignés sur `main`; régression `UIImage` (src vide → `is-broken` persistant) corrigée et testée. Le sprite 132×132 px dépasse la colonne 112 px aussi dans `main`; réduction/rognage écartés pour préserver la parité. Les autres objets et largeurs responsive restent à examiner. |
| Presets d'équipe | **Fini** | Vingt emplacements; édition, chargement et choix de membres depuis l'équipe/la boîte intégrés aux systèmes Rework. Tests modèle/système et inspection desktop du gestionnaire effectués. |
| Boîte PC | **Gameplay fini uniquement** | Stockage et mutations via `BoxSystem`, réutilisés par les presets; fenêtre PC dédiée, filtres et tri visuels ne sont pas portés dans cette version. |
| Pension et incubation de fossiles | **Fini dans le périmètre Rework** | Dépôt depuis équipe/boîte, progression par K.O. et accès fossile story-gaté; pas d'automatisation par employés ni d'élevage d'œufs. |
| Entraînement | **Fini dans le périmètre Rework** | Session de six combats à Vermilion et apprentissage de mouvement; autres modes historiques (niveau/EV/talent, files et emplacements parallèles) absents. |
| Mine et vente | **Fini dans le périmètre Rework** | Grille, énergie, outils, butin, objets vendables et ventes; automatisation/employés/arbre historique d'améliorations absents. |
| Donjons | **Fini dans le périmètre Rework** | Expédition en grille, progression, péage, butin transporté, fin de run et sauvegarde/reprise couverts par les tests existants. |
| Shops, monnaies, succès, bases secrètes | **Fini dans le périmètre Rework** | Systèmes et panneaux présents dans la version; pas de nouvelle parité détaillée revendiquée par ce correctif. |
| Marché Pokémon / Dictionnaire | **Pas commencé** | Les entrées de raccourci n'ouvrent pas un écran inexistant. |
| Atoll de Combat | **Pas commencé** | Le bouton est visible après le gate de Ligue et indique que la destination arrive; modes, équipes tournantes et boutique Atoll ne sont pas implémentés. |
| Revue visuelle responsive multi-navigateurs | **Gameplay/visuel en cours** | Des contrôles ciblés desktop ont été faits; inspection complète mobile/tablette et validation utilisateur restent à faire. |

## Vérifications effectuées

- `npm test` : **212 réussis, 0 échec** dans le worktree courant, dont l'identité du PNJ d'unlock, le filtre de région, l'import/migration du tableau répétable, le reroll, l'acceptation et l'achat de slots.
- `node --check` : exécuté sur les fichiers JavaScript touchés; `git diff --check` : exécuté sans erreur après les modifications du correctif.
- Smoke test Playwright desktop : navigation vers Route 1, affichage des métadonnées, statistiques, rareté et drop; Équipe contrôlée en comparaison live avec `main`. L'URL locale de Restes charge le PNG (30×30 natif); l'image est visible, sans `is-broken`, après équipement depuis la fenêtre, retrait, rééquipement et rechargement de la sauvegarde.
- Dialogue/quêtes répétables : smoke desktop de la liste NPC localisée. La sauvegarde QA a été placée artificiellement à Azuria; un dialogue avec la Chercheuse Lys a laissé le tableau verrouillé, celui avec la Nageuse Ondée l'a déverrouillé, puis les offres Kanto étaient r11/r1/r14. En mettant artificiellement le cooldown à zéro, le bouton « Renouveler les offres » est apparu; son clic a relancé le minuteur et produit r7/r6/r10, toujours sans offre Johto. Ce contrôle synthétique ne rejoue pas le trajet de jeu réel; sa sauvegarde QA et ses captures temporaires ont été supprimées.
- Smoke test de l'overlay : combat sauvage actif, dispatch du `CaptureAttemptResolvedEvent` par l'EventBus, affichage de la Poké Ball 72×72 et du taux au centre de la carte adverse. C'était un test de présentation piloté par événement, pas une capture réelle de bout en bout.
- Résumé de combat Playwright sur une session représentative : deux colonnes, `scrollHeight === clientHeight` (503 px dans ce rendu), donc aucun défilement dans ce cas.
- Le gestionnaire de presets affiche 20 lignes sur la fenêtre desktop; la police calculée des contrôles Settings/presets est la police principale Winky Sans.
- Ces contrôles ne remplacent pas la revue responsive complète ni la validation de l'utilisateur. L'archive 1.9.1 existante précède les changements en cours et doit être régénérée pour la livraison finale.

## Livraison

L'archive source existante `pokeworld-rework-1.9.1.zip` est antérieure aux changements en cours et **n'est pas la livraison courante**. La régénérer seulement après la fin des défauts ciblés, puis vérifier son intégrité et relancer les tests depuis l'extraction. La livraison doit rester en version 1.9.1 (aucune version 1.8 à publier), inclure sources, données, styles, documentation et tests, sans `.git`, dépendances téléchargées ni caches. Node.js 18+ suffit; lancer avec `npm start` et vérifier avec `npm test`.

Avant d'essayer le correctif, exporter une sauvegarde. La migration v9→v10 conserve les accès acquis; v10→v11 ajoute l'état du tableau répétable. Les imports originaux préservent aussi les répétables acceptées (progression et baseline), les choix, le cooldown, les améliorations et l'accès historique. À la première ouverture du tableau, les offres incompatibles avec la région sont remplacées; les nouvelles sauvegardes restent verrouillées jusqu'à la Nageuse Ondée.
