# Release v1.15.6 — Documentation des Correctifs et Améliorations

## Vue d'ensemble

La version **v1.15.6** apporte la résolution complète des 12 dysfonctionnements signalés par la communauté, touchant l'ergonomie générale, le système d'évolution, le combat, les bases secrètes, la carte du monde, et la reprise après inactivité (AFK).

---

## 1. Base Secrète — Repositionnement & Placement des PNJ
- **Déplacement d'objets et PNJ existants** : Cliquer sur un meuble ou un PNJ déjà placé le sélectionne immédiatement en mode déplacement. Un fantôme de prévisualisation suit le curseur jusqu'à la nouvelle case choisie, validant le déplacement via `moveDecoration` ou `updateNpc`.
- **Correction du blocage de placement par les PNJ** : Suppression de la règle bloquante `err.blocks_npc` dans `SecretBasePlacementRules.canPlaceDecoration`. La présence de PNJ dans une pièce ne bloque plus la pose ou le réaménagement de meubles et décorations.

## 2. Pokédex & Fiche Complète en Combat
- **Ouverture depuis le Pokédex** : Cliquer sur une espèce vue ou capturée dans le Pokédex ouvre directement sa fiche détaillée `PokemonInfoModal` (statistiques, talents, capacités apprenables par niveau et par CT/CS).
- **Inspection en Combat (Clic droit / Pression longue)** : Clic droit ou appui long tactile sur une carte Pokémon alliée ou ennemie dans `BattleCombatantCard` ouvre sa fiche d'informations. Pour l'adversaire, la fiche s'ouvre en mode consultation lecture seule.

## 3. Quêtes — Nettoyage du Texte de Tutoriel
- **Suppression du symbole corrompu** : Dans `tutorial_step_dungeon2_desc`, la chaîne textuelle `(symbole sur la carte)` et le caractère corrompu associé ont été supprimés des tables de localisation française et anglaise au profit d'une consigne limpide et soignée.

## 4. Exploration & Déplacements en Plein Combat
- **Dialogue de confirmation de déplacement** : Cliquer sur un nœud de la carte pendant un combat actif déclenche une boîte de dialogue de confirmation (`ConfirmDialog`), avertissant le joueur qu'il s'apprête à quitter le combat.
- **Arrêt propre en changement de région** : L'exécution d'un changement de région arrête immédiatement tout combat ou chaîne AFK en cours avant de téléporter l'équipe.

## 5. Combat — Réactivité et Cooldown d'Attaque Ennemi
- **Synchronisation du délai initial** : Suppression des délais asymétriques injustifiés sur le Pokémon adverse au début du duel. Joueur et adversaire partagent désormais le même délai de départ (`START_DELAY_S * 1000`).
- **Correction de la jauge de charge figée** : Mise à jour immédiate de `foeCooldownTotalMs` lors de l'envoi d'un Pokémon de réserve, évitant que la barre de progression ne reste bloquée à 0% au début de l'action.

## 6. Combat — Usure de Fatigue Active (> 50 KOs)
- **Déclenchement et visibilité** : Dès 50 victoires consécutives en combat sauvage AFK, l'équipe subit une usure progressive de fatigue (1% des PV max par palier de 10 KOs supplémentaires).
- **Atténuation par talent** : Le talent *Stamina* (*Endurance*) divise par 2 les dégâts d'usure subis.
- **Retour visuel clair** : Émission de notifications dédiées ("Votre équipe commence à fatiguer après tant de combats !") et inscription d'entrées d'usure explicites dans le journal de combat (`battle_log.fatigue_warning`, `battle_log.fatigue_wear`).

## 7. Reprise AFK & Bilan Récapitulatif
- **Simulation déterministe hors-ligne** : Grâce à `FastForwardSystem`, le temps passé hors onglet ou en veille simule automatiquement les combats sauvages, gains d'argent, butins de route et progression d'EXP de la pension.
- **Modal Récapitulatif AFK (`AfkSummaryModal`)** : À la réactivation de l'onglet, un panneau récapitulatif élégant s'affiche automatiquement en présentant les victoires obtenues, l'argent accumulé, les objets trouvés et les niveaux franchis à la pension.

## 8. Sac & Équipe — Raccourcis Clic Droit & Pression Longue
- **Sac d'objets** : Prise en charge du clic droit et de la pression longue tactile sur les lignes d'objets (`BagItemRow`), y compris dans le mode de sélection d'objet tenu.
- **Gestion d'équipe et Boîte PC** : Raccourcis clic droit et appui long tactile opérationnels sur les cartes de l'équipe (`TeamMemberCard`) et les vignettes de la boîte PC (`BoxPanel`) pour inspecter la fiche d'un Pokémon.

## 9. Panneau de Zone — Taux d'Apparition Précis
- **Affichage des pourcentages réels** : Dans `LocationPanel`, chaque Pokémon sauvage affiche désormais son pourcentage exact d'apparition (calculé dynamiquement selon la somme des poids de rareté de la zone, par ex. 66.7% / 33.3%).

## 10. Carte du Monde — Icônes d'Embuscade Ennemies
- **Centrage sur les lignes de route** : Les marqueurs d'embuscade des équipes adverses sont désormais alignés au centre de la ligne de tracé de la route (`cy = ambush.y`).
- **Taille augmentée** : Dimension des marqueurs agrandie à 56px avec styles dédiés pour une lisibilité immédiate par rapport au marqueur du joueur.

## 11. Fiche Pokémon — Affichage Informatif du Niveau d'Évolution Requis
- **Condition de niveau affichée sans bouton manuel** : La ligne d'évolution dans `PokemonInfoModal` inspecte `evo.level` ou `evo.minLevel` et affiche clairement le niveau requis (ex. : *"Évolue au niveau 16 en Reptincel"*).
- **Aucun bouton d'évolution manuelle** : Les évolutions par niveau étant 100% automatiques dans le jeu, aucun bouton d'évolution manuelle n'existe sur la fiche. Les objets d'évolution (pierres, Câble Link) continuent d'être utilisés depuis le sac.

## 12. Évolutions Pokémon par Niveau & Système de Vérification au Chargement de Sauvegarde
- **Évolution automatique lors des gains de niveau** : Ajout des méthodes `getNextLevelEvolution()` et `checkLevelEvolution(onEvolve)` sur `PokemonData`. Les Pokémon évoluent automatiquement dès qu'ils atteignent le niveau requis via les gains d'EXP en combat (`BattleSystem`), à la pension (`HatcherySystem`), au dojo (`TrainingProgression`), ou lors de l'utilisation de Super Bonbons (`ItemUseSystem`).
- **Système de vérification au chargement d'une sauvegarde (`save.verifyLevelEvolutions()`)** : Au chargement d'une sauvegarde (`SaveSystem.loadSlot` et `SaveData.prototype.deserialize`), le moteur examine systématiquement l'ensemble de la collection du joueur (équipe, boîte PC, pension). Tout Pokémon dont le niveau est supérieur ou égal au seuil requis sans objet évolue immédiatement et automatiquement (y compris sur plusieurs stades d'évolution successifs, ex. Chenipan Lv 10 → Chrysacier → Papilusion), avec mise à jour du Pokédex et déblocage des talents.

---

## Validation des Tests

- **Suite de tests complète** : 671 tests passés avec succès (0 échec).
- **Règles statiques d'architecture** : 27/27 règles statiques validées (aucune injection HTML brute, respect strict de l'anglais dans le code, modularité à 1 classe par fichier, isolation des accès DOM).
- **Tests de non-régression** : `tests/Release1156.test.js` valide individuellement chacun des 12 points corrigés.
