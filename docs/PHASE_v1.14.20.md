# Rework 1.14.20 — Équipe, presets, Mine et alcôves

Livraison locale du **23 octobre 2026**, schéma de sauvegarde **19**.

## 1. Périmètre retenu

Les **huit autres retours** sont traités. Le point concernant les ligues des anciennes sauvegardes
est **exclu à votre demande** (« oublie ce point ») : aucun correctif de ligue ni aucune reconstitution
de victoire n’est revendiqué.

Référence `main` exécutée : `64d8f7942ae5b92168b8990813dd16d60a60e7e2`, également vérifiée comme tête
distante lors de cette itération. Le Rework conserve sa branche locale
`fix/facilities-and-location-parity`, base `07292aea3ced286d99d266e485adbe7fe3526e9c`.
Aucun commit, push ou déploiement distant effectué.

Comparatif autonome : [`validation/v1.14.20/comparatif.html`](validation/v1.14.20/comparatif.html).
Ce sont de vraies captures des interfaces, pas des maquettes ou des images générées.

## 2. Corrections effectuées

| Retour | Réalisation et validation |
|---|---|
| **Équipe : drag-and-drop des cases** | La carte entière utilise le moteur de pointeur après maintien de **400 ms**. Un vrai geste souris échange les UID via `TeamSystem`, avec un seul enregistrement, sans ouvrir accidentellement le PC. Poignée et clavier conservés ; nœuds des cartes conservés. |
| **Équipe : bouton Gérer les équipes** | Bouton sorti du cadre de la barre d’outils, directement dans le corps du panneau et **centré**. Ce changement volontaire suit votre demande, même si `main` affiche encore une barre encadrée. |
| **Mine : panneau non ressemblant** | Composition d’origine rétablie : en-tête, titre/sous-titre rapprochés, énergie, outils encadrés, indication d’outil, grille et profondeurs, trésors et sondage. Suppression des anciennes règles Rework de grille six colonnes, fond/bordure et tailles qui écrasaient le skin d’origine. Les cellules gardent leur accessibilité et leurs vrais sprites. |
| **Mine : délai manuel de dix minutes** | Échéance persistée et contrôle côté système, bouton affichant le décompte même désactivé, annulation sans changement, rechargement/changement de sauvegarde sans remise à zéro. Renouvellement automatique après récolte complète non bloqué par ce délai et ne le réinitialisant pas. |
| **Prix des helpers des trois installations** | Les **15 prix** et leurs monnaies restent visibles sans fonds, y compris pour les recrues encore verrouillées. Un devis informatif remplace l’action indisponible : le prix n’est plus caché avec le bouton désactivé par le stylesheet d’origine. Achats/recrutements restent contrôlés par le système. |
| **Phrase Entraînement** | « Chaque slot lance son propre… » retiré du panneau. Les modes et le fonctionnement parallèle ne changent pas. |
| **Création/modification des presets** | Gestionnaire plein écran avec **20 cartes distinctes**, noms modifiables et aperçus ; éditeur séparé sur les **cartes Pokémon complètes** partagées, capacités/objets/fiche, glisser-déposer bidimensionnel, choix PC, ajout/retrait jusqu’à six, actions de composition en pied fixe. |
| **Bases secrètes dans Lieu** | Section dédiée **après rencontres et butins**, titres/situation de la base, nom de chaque alcôve et boutons Visiter / S’installer ici ; statut et entrée directe pour la base actuelle. Première installation réelle et déménagement avec confirmation existante. Plus de simples tuiles génériques mêlées aux actions PNJ. |

### Détails qui empêchaient les comportements demandés

- L’ancien drag de carte armait tardivement le drag HTML, mais n’était pas une preuve qu’un vrai
  geste navigateur fonctionnerait. La voie principale utilise maintenant les événements de pointeur
  et leur capture ; le drag natif de secours reste disponible. Le clic synthétique de fin de drag
  ne déclenche plus une sélection PC. Dans l’éditeur en colonnes, **X et Y** déterminent la cible.
- Le stylesheet original masque les `.hbtn[disabled]`. Cela expliquait notamment les prix disparus.
  Le compteur Mine conserve **le même vrai bouton désactivé**, avec un skin d’horloge distinct pour
  qu’il reste affiché ; les autres boutons gardent leur comportement standard.
- Les rafraîchissements de l’équipe ne remplacent pas les champs de nom. La section des alcôves reste
  indépendante des reconstructions des informations Lieu : une confirmation ouverte survit au
  rafraîchissement d’affichage, mais est invalidée lors d’un changement de contexte.

## 3. Données, architecture et décisions conservées

### Migration 18 → 19

Un seul fait persistant est ajouté : `mine.manualSurveyReadyAt`, échéance absolue en millisecondes.
Une sauvegarde antérieure reçoit **0** : son premier sondage est disponible, aucune attente passée
n’est inventée. Une valeur existante valide est conservée ; valeurs négatives/non numériques/infinies
normalisées.

La migration est pure : elle conserve plateau, trésors, énergie, collection, UID d’équipe, presets,
affectations, files, filtres et DTO de combat. Sauvegarder une copie de son export avant mise à jour
reste conseillé. La reprise exacte des entraînements Rework et leur réservation persistante restent
validées. Il ne s’agit toujours pas d’un import intégral des états du runtime original.

### Compteur Mine

Les **600 000 ms** sont définies dans `MineRules`, vérifiées par `MineSystem`, et enregistrées seulement
après un changement manuel réussi. Ouvrir le panneau, lire le compteur ou annuler la confirmation
n’écrit rien et ne régénère rien. Le système refuse aussi un appel direct pendant le délai.
L’horloge suit le temps absolu, y compris hors ligne ; elle ne dépend pas d’un `setInterval` de vue.

**Précision de référence :** dans le commit `main` contrôlé, les deux handlers de sondage renouvellent
directement la couche sans appliquer ce délai. Le délai de dix minutes est rétabli **conformément à
votre demande**, pas présenté comme un comportement déjà observé dans ce commit.

### Presets et collection unique

- `TeamPresetsPanel` réutilise `UIFullscreenPanel` ; `TeamPresetEditorModal` est une fenêtre séparée.
  Cartes, sprites, liste triable, sélecteurs PC/objet/fiche et événements restent ceux du Rework.
- `TeamPresetEditSystem` ne détient qu’un **brouillon d’UID** et un choix PC lié à la sauvegarde courante.
  Ni seconde collection, ni copies de Pokémon, ni nouveaux droits contournant les verrous centraux.
- Le **brouillon et l’enregistrement explicite du Rework sont conservés** : fermer sans enregistrer
  ne modifie pas le preset. C’est une différence volontaire avec les modifications immédiatement
  persistées du runtime original. Le choix Pokémon emploie la Boîte PC commune déjà acceptée.
- Appliquer la composition est une transaction validée puis **un seul enregistrement**. Un refus
  pendant un combat ne sauvegarde pas une moitié de l’opération.
- Un Pokémon au repos dans le PC n’est plus grisé comme K.O. dans l’aperçu du preset. Cet affichage
  ne change **jamais** ses PV possédés ; sa fiche continue de lire les vraies données.
- Les sprites/prix communs, le Pokédex accepté, la tuile complète PC/Lieu, l’absence de badges de rang
  sur ces tuiles, les frais et formules de personnel précédemment décidés sont conservés.

Les alcôves utilisent les faits et commandes de `SecretBaseSystem` et son accès existant. Pas de règle
de progression indépendante dans la vue. Le déménagement restitue les meubles au stock et retire les
PNJ selon la commande déjà établie ; son annulation conserve les données.

## 4. Vérification exécutée

### Source et archive

- **419 tests réussis, 0 échec**. Le groupe dédié ajoute **24 contrats** ciblés. L’ancien test de
  construction de `TeamPresetsModal` disparaît avec cette classe remplacée ; les deux nouveaux écrans
  sont couverts explicitement, ainsi que leurs interactions et données.
- **676 fichiers JS/MJS** vérifiés par `node --check`, aucune erreur ; `git diff --check` sans erreur.
- Parité FR/EN et règles d’architecture incluses dans la suite. `start.bat` reste ASCII/CRLF ; cela
  n’est pas une exécution Windows native.
- Archive locale vérifiée par CRC, comparaison des octets, manifeste SHA-256, versions et tests après
  extraction. Résultat de livraison conservé avec les preuves locales.

### Chromium réel : **43 scénarios réussis**

- Les **17 scénarios fonctionnels précédents** et **9 scénarios visuels/interactions** ont été
  réexécutés sur cette version : accès, PC/Pokédex, files, personnel, minage, entraînement réel, reprise
  exacte, éclosion/réclamation Johto et responsive restent validés.
- **17 nouveaux scénarios** : bouton centré ; vrais gestes souris de maintien/drag des cartes équipe
  et preset en deux colonnes ; 20 cartes ; saisie de nom conservée ; choix PC/annulation/remplacement ;
  fiche et Sac au-dessus de l’éditeur ; sauvegarde/application ; six choix PC et retour de la case
  d’ajout après retrait ; 15 prix sans fonds ; composition Mine ; compteur, refus, rechargement,
  changement de sauvegarde, expiration et nouveau délai ; visites/installations/déménagements ;
  vues à **768 et 375 px**.
- Aucun diagnostic navigateur inattendu dans les **exécutions finales retenues**. Un lancement trop
  parallèle a interrompu un renderer avec `Target crashed` ; la suite concernée a ensuite été
  rejouée seule et ses 17 scénarios ont réussi. Il ne s’agit pas d’une validation de cet essai avorté.

**Conditions :** progression, soldes, équipe/PC et objets préparés explicitement. Les tests de compteur
avancent l’horloge Playwright, sans attendre dix minutes humainement. Un événement typé de Pokémon
vaincu sert uniquement à éprouver la stabilité des contrôles Lieu ; ce n’est pas revendiqué comme une
victoire naturelle. Les gestes de drag et les clics passent par Chromium, sans clic forcé. Le parcours
Johto conservé utilise la vraie chaîne sauvage accélérée et une véritable éclosion, comme précédemment.

Reproduction : [`../tests/browser/README.md`](../tests/browser/README.md).
Journaux, mesures et comparatif : [`validation/v1.14.20/README.md`](validation/v1.14.20/README.md).

## 5. Statut et limites

| Statut | Périmètre |
|---|---|
| **Terminé et fonctionnel sur les retours retenus** | Les huit points de la section 2, avec code, migration et parcours réels listés |
| **Exclu volontairement** | Ligues des anciennes sauvegardes : abandonné à votre demande, aucune réparation revendiquée |
| **Différences conservées** | Brouillon/enregistrement explicite des presets, PC commun, cadres et formats de prix partagés ; bouton équipe modifié selon votre demande |
| **Partiel hérité** | Import complet des anciennes incubations Pokémon, affectations/files/automatisations et combats du runtime original |
| **Non vérifié** | Identité pixel à pixel de tous les états/thèmes, parcours naturel complet Kanto/Johto, appareils tactiles physiques, tous les gestes tactiles, Firefox/WebKit et Windows natif |
| **Bloqué** | Aucun blocage pour cette livraison locale ; pas de publication distante |

Le comparatif expose des captures réellement rendues. Noms, ordre des Pokémon, progression ou butins
peuvent différer entre fixtures ; certains ordres changent précisément parce que le test a effectué
un drag. Les captures ne sont pas une certification visuelle absolue de l’ensemble du jeu.
