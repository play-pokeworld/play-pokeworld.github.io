# Auroria — kit exécutable du tutoriel A–Z

Ce kit accompagne [le guide complet](../../GUIDE_CREATION_REGION_A_Z.md).
**Il n’active pas Auroria dans la version livrée.**

## Installer sans modifier le jeu d’origine

Depuis la racine de PokéWorld Rework **1.14.28 / schéma 20** :

```sh
node docs/examples/auroria/install-example.mjs
node .arena/auroria-demo/docs/examples/auroria/verify.mjs
npm --prefix .arena/auroria-demo test
```

Le premier script crée un dossier neuf `.arena/auroria-demo`. Vous pouvez fournir un autre chemin
vide comme premier argument. Il refuse une destination existante et ne suit pas les liens
symboliques. Ni `.git`, ni `node_modules`, ni la copie `.arena`, ni les anciens artefacts de validation
ne sont copiés. Ne lancez pas l’installation depuis une copie déjà transformée.

Pour jouer à la copie : arrêtez un éventuel serveur sur le même port, puis :

```sh
cd .arena/auroria-demo
npm start
```

Cette copie s’identifie comme **1.14.29-demo / schéma 21** : le Carnet ajoute un modèle sauvegardé
pour montrer une migration. Ce numéro ne désigne pas une nouvelle livraison de production.
**Ne réimportez pas ses sauvegardes dans le jeu livré au schéma 20.**

## Contenu

- `content.json` : région de cinq lieux ; espèce `mossling`, capacité `chloroshot`, objet-clé et CT,
  boutique, arène, rival, deux membres de ligue et leurs équipes, quatre quêtes principales et une secondaire.
- `fr.json` / `en.json` : domaines manuels de traduction, dialogue et identité des PNJ inclus.
- `auroria.png` : carte schématique 1600 × 960, sans noms inscrits en dur.
- `files/` : code complet du Carnet, événement, configuration, modèle, migration, panneau et CSS.
- `install-example.mjs` : assemblage, registres de région, accès, starter, filtres, textes, sauvegarde,
  composition du moteur et du dashboard, navigation mobile et adaptation explicite des tests de couverture.
- `verify.mjs` : 12 assertions groupées utilisant les vraies commandes et le moteur de combat.

Les tables `src/data/raw/` et les traductions générées de l’original ne sont pas modifiées.
Les définitions manuelles sont ajoutées aux tables `*-content.js` de la copie.

## Résultats et limites annoncées

Sur la copie isolée : **12 vérifications ciblées et 575 tests de la suite complète réussis**.
Le test prépare explicitement le titre de Hoenn et les faits du Pokédex pour tester l’accès
régional, puis utilise une équipe sur-nivelée pour les combats réels. Ce n’est pas une campagne
naturelle complète ni une preuve d’équilibrage. Auroria n’est pas une région de départ prête
à remplacer le tutoriel de Kanto. Les succès régionaux supplémentaires ne sont pas déclarés.

Le sprite normal/shiny de Moussin réutilise **Bulbizarre** ; `Brock`, `Rainbow`,
`Champion_Stamp` et l’image de flûte sont des **ressources provisoires**. Remplacez-les par vos
propres images, sans modifier les ids sauvegardés. La carte n’est qu’un schéma de travail.

## Vérification navigateur facultative

Avec Playwright/Chromium installés séparément comme décrit dans `tests/browser/README.md`, et
**le serveur de la copie** démarré, lancez depuis cette copie :

```sh
node docs/examples/auroria/browser-smoke.mjs
```

Par défaut le test vise `http://127.0.0.1:3000/`. Si le serveur utilise un autre port, renseignez
`PW_AURORIA_URL` ; `PLAYWRIGHT_MODULE` peut désigner le module Playwright de votre installation.
`PW_BROWSER_OUTPUT` choisit le dossier des captures, sinon `artifacts/auroria-browser` est utilisé.
Quatre scénarios vérifient démarrage/voyage, vraie victoire et étude, anglais/mobile et reload.
Le changement de langue est vérifié après reconstruction de la page, comme les autres recettes
multilingues du projet ; cela ne prétend pas certifier tous les libellés globaux à chaud.

Le CSS du Carnet est inséré dans le bloc initial d’imports, avant toute règle CSS : un `@import` ajouté en fin de feuille serait ignoré par le navigateur.
