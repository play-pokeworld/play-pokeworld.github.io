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
- **Téléchargements :** après ouverture de la page initiale, le popup est ouvert directement via son instance (pas seulement via un événement qui peut être émis avant que le modal soit prêt). Les paramètres et le popup ne présentent qu’un seul bouton **Télécharger**, sans texte descriptif ni choix de plateforme. Windows/Android ciblent chacun un asset précis par lien GitHub Releases direct. iOS garde le bouton désactivé en l’absence d’URL App Store/TestFlight publiée.
- **Enveloppes validées en architecture :** dossiers Expo WebView mobile et Tauri Windows recréés. Ils ouvrent le site hébergé, ne réécrivent pas le moteur et n'embarquent pas les ressources pour le mode hors ligne. Le Tauri NSIS est configuré comme installateur Windows `.exe`.
- Version synchronisée `GameConfig.VERSION`, `package.json`, `package-lock.json` : **1.16.24**.

## 3. Vérifications et résultat

- `npm test` : **889 réussis, 0 échec** (inclut tests d'événements de mise à jour, détection de plateforme, URLs directes, bouton unique, désactivation iOS et popup).
- `npm run audit:i18n` : **0 clé manquante**.
- `npm run audit:contrast` : **147/147 paires AA**.
- JSON de l'Expo et de Tauri : parsing vérifié ; version du dépôt synchronisée.
- ZIP créé et vérifié avec `unzip -t`.
- **Pas de validation visuelle mobile** : le navigateur Playwright ne peut pas se lancer, ses dépendances Linux sont manquantes et l'installation système n'est pas permise. Pas de test sur appareil réel.
- Builds Expo/EAS ou Tauri Windows : non exécutés ; Node 22.13+, Rust/Cargo et Windows/MSVC ne sont pas disponibles ici.

## 4. Limites et publication

- Aucun binaire n’est publié à la vérification : les URLs directes peuvent donc répondre 404. Pour les activer : (1) construire l’installateur Windows NSIS sur Windows avec Rust/MSVC et vérifier le nom exact `Pokeworld-Windows-Setup.exe`; (2) configurer EAS et les identifiants de signature Android, construire un APK installable et le nommer `Pokeworld-Android.apk`; (3) créer une release GitHub puis joindre ces deux fichiers sans modifier leurs noms. Vérifier ensuite chaque URL `.../releases/latest/download/<nom>` dans un navigateur. Pour iOS, publier sur App Store ou TestFlight puis configurer l’URL publique correspondante dans `DownloadRules.js`; aucun téléchargement/install direct IPA depuis le web n’est pris en charge.
- Les enveloppes nécessitent un accès réseau ; la sauvegarde WebView doit être validée sur appareil avant distribution.
- Le nouveau layout de combat et les gestes de carte ont passé les contrôles automatisés de code/DOM disponibles, mais leur rendu et leur comportement sur navigateur mobile restent à confirmer visuellement.
