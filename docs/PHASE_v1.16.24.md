# Phase 1.16.24 — Réconciliation, téléchargements et démarrage multiplateforme

**Date :** 5 novembre 2026  
**Branche :** `Rework`  
**Type :** correctif de livraison, UI mobile, téléchargements et scaffolds multiplateformes ; schéma de sauvegarde inchangé.

## 1. Vérification/reprise de la livraison

À la reprise, l'archive 1.16.23 annoncée n'était pas dans l'espace utilisateur. Le dépôt affichait des versions désynchronisées et une virgule manquante dans les deux tables de localisation qui faisait échouer le chargement du test suite. L'archive précédente n'était donc pas considérée comme vérifiée. Ces incohérences ont été corrigées avant de construire l'archive 1.16.24.

## 2. Changements

- **Combat mobile :** dans les cartes étroites, les sprites, informations/états et capacités ont désormais une composition en deux pistes réductibles. Le conteneur interne auparavant responsable de regrouper les éléments en une zone unique est déplié au breakpoint mobile ; les cartes ne sont pas supprimées et restent dans le flux de page.
- **Carte :** la caméra SVG retrouve zoom par commandes, molette et pincement ; le déplacement fonctionne quand le zoom dépasse le minimum. Les clics sur un lieu ne sont pas consommés par un geste de déplacement, le cadrage persiste au rafraîchissement de la région et se réinitialise en changeant de carte.
- **Mise à jour :** système de contrôle same-origin et bannière globalisée FR/EN avec rechargement et fermeture de session conservés.
- **Téléchargements :** une section Téléchargements est ajoutée aux paramètres et une fenêtre d'information s'ouvre à chaque chargement de l'application. Le texte/choix affiché varie selon Windows, Android ou iOS ; la détection s'effectue dans la couche UI.
- **État des fichiers installables :** la page GitHub Releases du dépôt ne publie actuellement aucune release. Les boutons conduisent donc à la page des versions et l'interface indique clairement que les installateurs ne sont pas encore disponibles ; aucun faux lien direct `.exe`/APK/App Store n'est présenté.
- **Enveloppes validées en architecture :** dossiers Expo WebView mobile et Tauri Windows recréés. Ils ouvrent le site hébergé, ne réécrivent pas le moteur et n'embarquent pas les ressources pour le mode hors ligne. Le Tauri NSIS est configuré comme installateur Windows `.exe`.
- Version synchronisée `GameConfig.VERSION`, `package.json`, `package-lock.json` : **1.16.24**.

## 3. Vérifications et résultat

- `npm test` : **888 réussis, 0 échec** (inclut tests d'événements de mise à jour, détection du type d'appareil, contenu des liens, ouverture du popup et contrôles de caméra DOM).
- `npm run audit:i18n` : **0 clé manquante**.
- JSON de l'Expo et de Tauri : parsing vérifié ; version du dépôt synchronisée.
- ZIP créé et vérifié avec `unzip -t`.
- **Pas de validation visuelle mobile** : le navigateur Playwright ne peut pas se lancer, ses dépendances Linux sont manquantes et l'installation système n'est pas permise. Pas de test sur appareil réel.
- Builds Expo/EAS ou Tauri Windows : non exécutés ; Node 22.13+, Rust/Cargo et Windows/MSVC ne sont pas disponibles ici.

## 4. Limites et publication

- Le lien GitHub Releases est un portail, pas un fichier binaire. Pour que Windows/Android puisse réellement télécharger un `.exe`/APK, les builds doivent être produits, signés et publiés comme assets d'une release. Pour iOS, une version distribuable passe par TestFlight/App Store et nécessite les certificats/comptes Apple.
- Les enveloppes nécessitent un accès réseau ; la sauvegarde WebView doit être validée sur appareil avant distribution.
- Le nouveau layout de combat et les gestes de carte ont passé les contrôles automatisés de code/DOM disponibles, mais leur rendu et leur comportement sur navigateur mobile restent à confirmer visuellement.
