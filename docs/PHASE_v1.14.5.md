# Bilan de phase — Rework 1.14.5

- **Date :** 22 octobre 2026
- **Version applicative :** 1.14.5
- **Schéma de sauvegarde :** 15, inchangé
- **Point traité :** 14 — Donjons, déblocage après combat et reprise de progression
- **Livraison cumulative :** point 13 (visuel donjon) de v1.14.4 conservé; ce ZIP traite séparément le point 14
- **Architecture conservée :** Rework (`d60138b833f5b148ba5a1e10750ac7de3bed0995`)
- **Suivi complet :** [`SUIVI_CORRECTIFS.md`](SUIVI_CORRECTIFS.md)

## Cause et correctif

Le combat émet `DungeonBattleResolvedEvent` avant `BattleEndedEvent`. À la résolution, `DungeonSystem` marque la case et efface `pendingNode`, puis `DungeonRunChangedEvent` reconstruit la grille alors que `BattleSystem.isActive()` est encore vrai. Les cases restent donc désactivées. Comme `DungeonExpeditionPanel` n’écoutait pas la fin du combat, il ne recalculait jamais leur état une fois la session supprimée. La reprise d’un `pendingNode` sauvegardé ne produisait pas non plus toujours un changement d’expédition au moment où le combat démarrait.

Le panneau écoute maintenant `BattleStartedEvent` et `BattleEndedEvent`, en plus des événements d’expédition/sauvegarde déjà suivis. Il recalcule ainsi le verrouillage au véritable début et à la véritable fin de session; aucune transition de combat, règle de progression, sauvegarde ou récompense n’a été déplacée dans l’interface. Le nœud gagné reste terminé, `pendingNode` est vidé, puis la case suivante peut être jouée.

## Test de non-régression

Un test d’intégration construit une expédition sauvegardée avec une rencontre en attente, déclenche la reprise depuis le bouton du panneau, vérifie que la grille est bloquée pendant le combat, publie la résolution de victoire avant la fin de la session, puis confirme qu’elle se déverrouille à `BattleEndedEvent`. Il déplace ensuite le joueur sur la case suivante et constate le démarrage d’un second combat.

## Validation automatisée et archive

- `npm test` : **314 réussis, 0 échec**, sur le projet et après extraction de l’archive.
- `node --check` : **559 fichiers JavaScript/MJS**, sur la source et l’extraction.
- `git diff --check` : succès sur la source.
- Serveur HTTP : **200** pour la page et les modules/CSS concernés.
- Archive `pokeworld-rework-1.14.5.zip` : **2 565 entrées**, 14 Mo; `unzip -t` sans erreur. Package et lock sont en **1.14.5**; schéma **15**. Aucun `.git` dans l’archive.
- Contrôle navigateur / parcours de jeu manuel : **non effectué**, conformément à la validation globale prévue par l’utilisateur.

## Hors périmètre

Le point 15 (déblocages d’anciennes sauvegardes) et le point 16 (largeur Réglages) ne sont pas résolus par cette archive. La porte de validation manuelle globale reste ouverte.
