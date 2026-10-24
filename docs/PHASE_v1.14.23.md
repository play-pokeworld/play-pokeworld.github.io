# Phase 1.14.23 — Drag équipe, imports main et Combat adaptatif

**Production : 1.14.23 · sauvegardes : schéma 20, inchangé.**
Référence des formats d’automatisation : main `64d8f7942ae5b92168b8990813dd16d60a60e7e2`.
Le main reste une référence ; son runtime n’a pas été transplanté.

## 1. Équipe : corriger le geste réel, pas seulement l’état final

Deux obstacles ont été identifiés dans le précédent composant :

- un appui de **400 ms** était obligatoire et un déplacement de plus de **8 px avant ce délai**
  annulait la tentative : un glisser normal à la souris échouait ;
- les lignes d’attaque en lecture seule étaient classées comme des boutons, donc exclues de la
  surface de drag. Les anciens tests attendaient précisément l’appui long et ne couvraient pas ce geste.

La souris démarre maintenant le déplacement au seuil de **5 px**, comme pour les panneaux. La
carte suit le pointeur, conserve son habillage et son point de saisie, et laisse un emplacement
fantôme. Les mises à jour de PV n’arrachent plus le nœud à son déplacement. Le document défile
lorsque le pointeur approche d’un bord. Un override CSS ciblé neutralise aussi la translation de
survol du skin legacy qui, avec `!important`, empêchait la carte de suivre les coordonnées du drag.

La carte et le Pokémon ne sont ni clonés ni recréés. Au dépôt, `TeamSystem.swapMembers` conserve
le comportement validé d’**échange des deux positions par UID**, avec une seule sauvegarde.
Les vrais boutons, objets tenus, champs et actions d’information gardent leur interaction propre.
Un clic court ouvre toujours la sélection PC ; le clic droit ouvre les informations.

Échap, annulation, perte de capture ou changement de partie ne modifient pas l’équipe. Le clic de
relâchement d’un drag annulé est supprimé sans avaler le prochain clic volontaire. Ce point a été
reproduit au navigateur : sans cette protection, Échap pouvait ouvrir le PC au relâchement.

### Réordonnancement pendant un combat

Le combat conserve ses combattants en cours ; changer l’ordre affiché ne doit ni le recréer ni
réinitialiser PV, RNG, effets ou horloges. Le ciblage d’un remplaçant et des barres de charge suit
maintenant l’**UID**, pas l’ancien index de la session. Un test réel réordonne pendant un combat
figé pour comparaison, puis clique le remplaçant affiché et vérifie le Pokémon effectivement choisi.

La protection d’appui long est conservée pour le tactile afin de distinguer le scroll ; les nouveaux
contrôles de drag de cette phase sont exécutés à la **souris Chromium**, pas sur un appareil tactile physique.

## 2. Ancien main : achats conservés et contrôles qui ne disparaissent plus

L’utilisateur a précisé que les sauvegardes concernées viennent de **l’ancien main**. Aucun JSON
personnel n’a été joint ; le test utilise un export de cette forme, passé par le **vrai sélecteur de
fichier et FileReader** : `{ version: 4, G: { automationUpgrades, automation, … } }`.

Sur ce format canonique, les achats étaient déjà conservés dans le modèle. Un défaut d’affichage
expliquait leur disparition en jeu : `RelaunchSystem.getSnapshot()` cachait les contrôles pendant
tout combat et tout donjon, et ils se trouvaient dans l’écran de repos lui-même caché.

Ces deux conditions de masquage ont été corrigées. Les modules possédés restent accessibles dans
le contexte sauvage ou donjon correspondant, y compris **pendant** l’activité. L’entraînement garde
sa surface indépendante. Les achats sont exclus du stock de boutique dès que la propriété est
récupérée : **aucun nouveau paiement** n’est demandé.

La conversion pure des données legacy reconnaît aussi les preuves explicites suivantes :

- dictionnaires de propriété booléens, `1`, chaînes explicites `true` / `1` ;
- reçus numériques positifs dans le dictionnaire des achats ;
- listes d’identifiants possédés ;
- reçus structurés portant `purchased` ou `owned` ;
- ancien mode activé, qui impliquait déjà l’achat dans le main.

Les préférences explicitement désactivées restent désactivées, y compris `false` / `0` ou leurs
formes chaîne ; le dernier mode de donjon est conservé. Les données absentes, négatives, non finies,
malformées ou d’un autre module **n’offrent pas** les deux améliorations. Les entrées ne sont pas mutées.

**Limite importante :** une copie déjà réenregistrée qui ne contient plus aucune preuve d’achat ne
permet pas de deviner sa propriété. Il faut alors l’export main d’origine, pas un octroi global aux
anciennes parties. Sans le JSON personnel, la validation porte sur les formats et fixtures annoncés,
pas sur la certification d’un fichier utilisateur non fourni.

## 3. Combat : seulement le switch Auto et un contenu qui reste dans son cadre

Le composant `RelaunchControls` ne construit plus qu’un **switch Auto** pour un module possédé.
Titre, paragraphe explicatif, prix, achat, statut d’attente, barre de progression et bouton d’annulation
ont été retirés de cette surface. Le nom complet reste accessible par infobulle et `aria-label`.
Les achats se font en boutique. Désactiver le switch annule le compteur courant et mémorise la
préférence, sans retirer la propriété ni rembourser le module.

Le switch est un nœud stable, hors de l’écran de repos : il n’est plus englouti par son masquage
lorsqu’un combat démarre. Les recettes vérifient sa présence en sauvage et dans un vrai run de donjon.
Le compteur de cinq secondes et ses règles restent dans `RelaunchSystem`, pas dans un nouveau timer UI.

Le corps Combat grandit avec son contenu, sans hauteur maximale artificielle. Les cartes utilisent
la **largeur réelle du conteneur** : en colonne étroite, portrait, informations et attaques se
réorganisent ; noms et actions se répartissent sur plusieurs lignes au lieu d’être découpés.
Les boutons Quitter/Résumé restent dans le cadre. L’écran « Exploration au repos » est explicitement
caché pendant une expédition et les phrases de repos ne sont pas tronquées dans un panneau étroit.

La carte de donjon conserve le choix validé de cases fixes dans un **viewport borné et pannable**,
exception prévue par `Rules.md`. Les cellules hors de ce viewport sont accessibles par défilement,
mais ni son cadre, ni le pilote, ni les commandes de sortie ne sortent du panneau. Les modes du
pilote Farm / Gardien / Coffres ne sont pas supprimés par la simplification de la relance.

## 4. Architecture et sauvegardes

`SortableDragMotion` possède le déplacement visuel, le placeholder et le défilement de bord ;
`UISortableList` garde le protocole de geste et la synchronisation par clé. Les mutations d’équipe
restent dans `TeamSystem`. `BattleSystem.switchPlayerPokemonByUid` résout le combattant approprié.
Les manipulations DOM restent dans `src/ui/` et les positions passent par des variables CSS.

`LegacyAutomationRules` décrit les valeurs de compatibilité ; la conversion est exécutée avant
lecture des modèles. Il n’y a **aucun nouveau champ sérialisé**, donc pas de migration de schéma
artificielle. Le schéma reste 20. Propriété UID unique, entraînements repris exactement, réservations,
files et filtres, presets, Mine, prix/helpers et Marché de six offres à Johto restent protégés.
Les seize tables générées sont identiques octet pour octet à l’archive 1.14.22.

Le correctif d’anciennes ligues précédemment abandonné n’a pas été réintroduit.

## 5. Contrôles réellement exécutés

| Contrôle final | Résultat |
|---|---:|
| `npm test` | **520 réussites / 0 échec** |
| Tests supplémentaires de cette phase | **28**, en plus des 492 précédents |
| Chromium installations/parité | **17 / 17** |
| Chromium visuel/interactions | **9 / 9** |
| Chromium retours précédents | **17 / 17** |
| Chromium relances/pilote | **13 / 13** |
| Chromium Marché/Entraînement adaptatif | **21 / 21** |
| Chromium nouveaux gestes/import/Combat | **18 / 18** |
| **Total du jeu livré** | **95 / 95**, tous les rapports `issues: []` |
| Syntaxe JS/MJS | **718 fichiers / 0 erreur** |
| Analyse CSS de premier niveau | **43 feuilles / 0 erreur** |
| `DataValidator.validateAll()` | `[]` |
| Tables générées comparées à 1.14.22 | **16 identiques** |
| `git diff --check` | réussi |
| Kit isolé à jour | **12 vérifications + 521 tests + 4 scénarios Chromium** |

Les six suites de production sont exécutées séquentiellement. Les anciennes recettes d’appui long
et de barre d’achat ont été adaptées à la demande actuelle, en conservant les vérifications de
propriété, écritures, vraies défaites, relance et deuxième entrée payée en donjon.

Les dix-huit nouveaux scénarios utilisent le vrai import de fichier, les vrais mouvements de souris,
Échap, clic simple/droit, scroll de bord, conservation des nœuds, combat et run de donjon, sauvegarde
puis rechargement réels. Géométrie et textes sont contrôlés à 210 px de panneau, aux largeurs desktop
1 560/960/860 px et en mobile 390/320 px, avec une hauteur de fenêtre courte de 700 px notamment.
Le nombre de scénarios n’est pas le nombre de pixels ou d’assertions.

La progression et certains tirages sont préparés. Dans les comparaisons d’état, les ticks programmés
sont arrêtés ; les commandes explicites, événements, FileReader, stockage et moteur restent réels.
Les contrôles automatiques de relance sont également exécutés par les suites dédiées : il ne s’agit
pas d’une simple simulation d’événements de victoire.

## 6. Guide, preuves et livraison

Le guide A–Z reste compatible : **26 chapitres**, 1 795 lignes, HTML autonome. Le kit crée désormais
une copie **1.14.24-demo / schéma 21**, séparée de la production ; ses sprites pédagogiques restent
les placeholders déclarés. Aucun contenu Auroria n’est injecté dans la partie livrée.

- [`validation/v1.14.23/preuves.html`](validation/v1.14.23/preuves.html) : captures réelles intégrées.
- `validation/v1.14.23/` : journaux complets, résultats JSON, méthode et provenance.
- `files.sha256` : manifeste des fichiers de cette livraison, sauf lui-même.
- Le ZIP est contrôlé par CRC/SHA-256 et comparaison source/archive, puis extrait et retesté.
  Le lanceur est contrôlé ASCII / CRLF ; cela n’est pas un test d’exécution Windows natif.

Les images des panneaux hauts allongent parfois la hauteur de capture pour éviter le recouvrement
par l’en-tête sticky. Les mesures de contenu sont exécutées séparément aux hauteurs normales/courtes.
Aucune certification pixel à pixel de tous les états/thèmes, campagne naturelle complète,
validation Firefox/WebKit ou appareil tactile physique n’est revendiquée. Aucun nouveau simulateur
hors ligne n’est ajouté. Aucun commit, push ou déploiement n’a été effectué.
