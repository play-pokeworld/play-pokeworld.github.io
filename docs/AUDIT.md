# Audit du rework PokéWorld — v1.0 (mis à jour en v1.1)

> **État courant : v1.14.12 / schéma 15.** Cette reprise améliore le choix d'objet tenu dans le Sac et ajoute un footer fixe d'annulation/retrait pendant le remplacement d'un Pokémon de l'équipe depuis la Boîte PC; `BoxPanel` reste générique et `TeamBoxTransferSystem` conserve les mutations d'équipe/PC. Les versions et statuts historiques des audits de sections ci-dessous restent ceux des phases où ils ont été rédigés; le suivi courant est dans [`SUIVI_CORRECTIFS.md`](SUIVI_CORRECTIFS.md).

Date de l'audit initial : 19/10/2026 · Base analysée : dump « Rework 2 » (133 fichiers) · Référence : dépôt original `play-pokeworld.github.io`.

Légende : ✅ corrigé · ⚠️ reste à faire (priorité **P1** haute → **P3** basse)

---

## 1. Lanceur Windows (`start.bat`) — ✅

**Pourquoi il ne marchait pas :**

1. **Fins de ligne LF (Unix).** `cmd.exe` lit les `.bat` par blocs de 512 octets et attend du CRLF. En LF, les sauts vers une étiquette (`goto`) et les blocs `( … )` sont mal lus. On obtient alors des commandes coupées ou des « n'est pas reconnu en tant que commande interne ».
2. **Texte UTF-8 accentué + `chcp 65001`.** Changer de page de code pendant l'exécution du script décale l'analyse des lignes suivantes (bug connu de cmd).
3. **`%errorlevel%` lu dans un bloc `if ( … )`.** La variable est remplacée au moment de la lecture du bloc, pas après `node server.js`. Le test d'erreur ne voyait donc jamais le vrai code de retour.
4. **Un `echo` contenant `)` dans un bloc** (`Python (py) détecté`) fermait le bloc trop tôt.
5. Le test de `test_suite.js` vérifiait seulement la présence de quelques chaînes. Le `.bat` cassé passait donc les tests.

**Correction :**

- **`start.bat` réécrit :**
  - ASCII pur, CRLF ;
  - aucun bloc `( )` : uniquement `if errorlevel 1 goto …` ;
  - aucun texte affiché par le script lui-même.
- **`.gitattributes`** impose `*.bat eol=crlf`, pour que Git ne remette pas des fins de ligne LF.
- **Si Node.js est absent**, le message bilingue vient de `tools/launcher/node-missing.txt`.
- **Serveur découpé :**
  - `server.js` sert de point d'entrée ;
  - le code est dans `tools/server/` : `StaticFileServer`, `MimeTypes`, `BrowserLauncher`, `ServerMessages` ;
  - les messages sont localisés dans `src/localization/{fr,en}/server.js`.
- **Sécurité :** le chemin des fichiers demandés est vérifié. Aucune requête ne peut sortir du dossier du jeu.
- **`package.json`** avec `"type": "module"` : le projet entier est en modules ES. Avant, le fonctionnement dépendait de la détection automatique de Node, qui varie selon la version.
- **Nouveaux tests de non-régression :** CRLF, ASCII, pas de `%errorlevel%` dans un bloc, `.gitattributes` présent. Ces tests échouent bien sur l'ancien fichier (vérifié).

---

## 2. Menu des sauvegardes — ✅

| Symptôme | Cause racine | Correction |
|---|---|---|
| Fond décalé d'une demi-hauteur d'écran | `.pw-element { position: relative }` (classe ajoutée sur **tous** les widgets) écrasait le `position: absolute` du calque de fond. En plus, `save-menu.css` redéfinissait le calque avec `height: 42%`. | Styles de base des widgets enveloppés dans `:where()` (spécificité 0). `save-menu.css` est vidé des règles qui doublonnaient `design-system.css`. |
| Mauvaises polices | `--pw-font-main: "WinkySans"` ne correspond à aucune police déclarée (le nom déclaré est `"Winky Sans"`). Le titre était forcé en Megrim 38px par `save-menu.css`. Les `.ttf` du dump étaient **corrompus**. | Nom de famille corrigé, règles parasites supprimées, polices d'origine restaurées. |
| Bouton Discord mauvaise couleur | Bouton créé avec la classe `hbtn` (beige) au lieu de `pw-discord-btn`, et `className` écrasé. Le lien `discord.gg/pokeworld` était faux. | Nouveau widget `UILink` + `IconRegistry`, classe `pw-discord-btn`. URL officielle dans `GameConfig.DISCORD_URL`. Même correction dans les Réglages. |
| Boutons trop petits ou mal stylés | **Collision de noms** : `UIButton` ajoutait la classe `pw-btn`, qui est aussi le bouton « maison » du jeu original dans `design-system.css` (min-height 34px, police 11px…). | Les classes du widget sont renommées `pw-button*`. `pw-btn` reste réservé au skin d'origine. |
| Carte de sauvegarde : « 0 badge » invisible | `UIText` faisait `options.text || ''`, donc le nombre `0` devenait une chaîne vide. | `??` à la place de `||` (UIText, UIButton, UILink, UIFileButton). |
| Carte : le nom affiché était `default_trainer_name` | `SaveCard` recevait l'enveloppe renvoyée par `listExistingSaves()` au lieu des données de la sauvegarde. Il lisait aussi `save.playTime` au lieu de `player.playTimeSeconds`. | `SaveCard` réécrit. L'avatar est le Pokémon de tête sur le disque canonique, comme dans l'original. |
| Menu contextuel « Supprimer » rouge vif illisible | Conflit **déjà présent dans l'original** : la règle globale `button.danger` peint un fond rouge sous un texte rose. | Item à plat, teinte rouge seulement au survol. |

**Ajouts :**

- **Menu contextuel :** Renommer / Dupliquer / Exporter (JSON) / Supprimer.
- **Boîtes de dialogue** au lieu de `prompt()`/`confirm()`.
- **Carrousel :**
  - flèches SVG ;
  - fondu sur les bords, appliqué seulement quand il y a des cartes ;
  - thème de carte aléatoire, conservé du rework.

*Choix assumé :* les boutons FR/EN sont **centrés**. Dans l'original ils sont collés à gauche uniquement parce que son `style` en ligne n'est jamais appliqué (bug du moteur `h()`). L'intention du code d'origine est `justifyContent: 'center'`.

---

## 3. Fenêtre de choix du starter — ✅

- **Bug de rendu en haut :** `UIModal` créait toujours une barre de titre `.pw-win-hdr`. Ici elle était vide et s'affichait comme une bande parasite au-dessus du contenu. `UIModal` accepte maintenant `hasHeader: false`.
- **Pseudo du Dresseur :** le champ (`UITextInput`) est **en haut, sous les textes Bienvenue / Choisissez votre Starter**.
  - Il est obligatoire, avec un message d'erreur sous le champ.
  - Sa longueur maximale vient de `GameConfig.TRAINER_NAME_MAX_LENGTH`.
  - `Entrée` envoie le focus sur la première carte.
- **Rendu identique à l'original :**
  - sprite 72px sur disque sombre (nouveau widget `UIPokemonSprite`, portage de `buildSpriteCircle()`) ;
  - libellé « Choisir » simple, sans pastille colorée ;
  - fond noir à 92 %.
- **Supprimé :** HTML en dur (`setHTML`), chemin de sprite en dur, `'Red'` en dur. `NewGameModal.js` (doublon mort) aussi.
- **Données :** `src/data/StarterData.js`. Les cartes sont accessibles au clavier (Tab, Entrée, Espace).

---

## 4. Règles d'architecture — écarts relevés

### 4.1 Corrigé en v1.0 ✅

- **Nouveaux widgets de base**, tous pilotés par classes CSS, sans style en ligne :
  - `UIIcon` (+ `IconRegistry`), `UIImage`, `UIPokemonSprite` ;
  - `UILink`, `UITextInput`, `UIFileButton`, `UIContextMenu`.
- **`UIElement` :**
  - `setVisible` passe par une classe ;
  - `setStyle` est supprimé ;
  - ajout de `setAttribute` / `setData` / `setAriaLabel` / `focus` / `toggleClass` ;
  - `UIPanel.clearChildren()` vide le corps du panneau sans détruire sa barre de titre.
- **`UIText` :** couleurs via `TEXT_COLORS` → classes CSS, plus de `innerHTML` (risque XSS sur les noms de dresseur).
- **Un fichier = un rôle :**
  - `PageManager` est sorti d'`Engine.js` ;
  - le serveur est découpé en 4 modules ;
  - `GameConfig`, `AssetPaths`, `SaveThemes` et `StarterData` sont séparés.
- **Chemins d'images :** tous passent par `src/config/AssetPaths.js`. 12 fichiers étaient concernés. Un test interdit désormais tout chemin `assets/images/` en dur.
- **i18n :**
  - **43 clés** étaient utilisées sans exister. Le jeu affichait `map_title`, `btn_explore`, `ach_dex_kanto`… Elles sont ajoutées dans le nouveau domaine `panels.js` (FR/EN).
  - Les **quêtes** affichaient `quests.main.1.title` : le domaine était fusionné sans le préfixe `quests`.
  - Les **thèmes de carte** utilisent maintenant les clés d'origine `save_bg_<id>`.
  - Les logs de debug d'EventBus, PageManager, main et SaveSystem passent tous par `t()`.
  - **Test ajouté :** chaque `t('clé')` statique doit exister en FR **et** en EN.
- **NotificationSystem :** tons nommés (`NotificationTones`) → classes CSS. Les couleurs CSS brutes restent acceptées, en mode déprécié.

### 4.2 Écarts restants de la v1.0 — statut en v1.1

| Prio | Écart | Statut v1.1 |
|---|---|---|
| **P1** | **DOM créé à la main** (`createElement`, `innerHTML`, `setHTML`) dans ~19 panneaux et systèmes | ✅ Corrigé. Tous les panneaux sont réécrits avec les widgets. `TrainerPanel`, `SettingsModal` (monolithe) et `WindowDragSystem` sont supprimés et remplacés par `panels/settings/*`, `ui/dashboard/DashboardView` et `WindowDragController`. Un test interdit `document`/`window` hors de `src/ui`. |
| **P1** | **Injection HTML** possible dans `NotificationSystem` (`innerHTML`) | ✅ Corrigé. `UIToast` utilise `UIText.setRichText` (liste blanche b/strong/i/em/br). Un test interdit `innerHTML`. |
| **P1** | **Styles en ligne** (`.style.xxx`) | ✅ Corrigé. Il ne reste que des variables CSS (`--pw-drag-*`, `--pw-progress`…). Un test interdit `.style.xxx =`. |
| **P2** | **157 replis** `t('clé') \|\| 'texte FR'` | ✅ Supprimés (0 restant). |
| **P2** | **Données en dur en français** (`'Dresseur'`, `'Bourg Palette'`, `Œuf Mystère`…) ; nom du Pokémon enregistré traduit | ✅ Corrigé. Tout passe par des clés (`location.<id>`, `pokemon.<dexId>`…). La sauvegarde stocke le *slug* (`charmander`). |
| **P2** | **Fichiers multi-classes** `core/Events.js` (14 classes), `data/QuestBase.js` (6) | ✅ Découpés : `core/events/` (19 fichiers) et `data/quests/` (QuestBase, QuestEventTypes + 5 sous-classes). Un test vérifie « une classe par fichier ». |
| **P2** | Conflit `BaseObject.getId()` / `UIElement.getId()` | ✅ Renommé `getObjectId()`. |
| **P2** | Noms d'attaque en dur dans `BattleSystem` | ✅ Corrigé. `BattleConfig.DEFAULT_MOVE_ID` est affiché via `t('move.<id>')`. |
| **P3** | Commentaires en français | ✅ Traduits, y compris dans `data/raw`. Un test détecte les commentaires français. |
| **P3** | `ui-modal.css` code des couleurs en dur ; `variables.css` duplique les jetons | ✅ Corrigé. `ui-modal.css` utilise les jetons. `variables.css` ne déclare plus que les jetons absents de `design-system.css` (20 doublons retirés). |
| **P3** | Icônes SVG copiées-collées | ✅ Tout passe par `IconRegistry`. Un test interdit les emoji dans le code. |
| **P3** | Langue enregistrée deux fois ; `index.html` figé en `lang="fr"` | ✅ Corrigé. Seule la clé `pw_lang` est utilisée ; l'ancienne clé est migrée par `LocalStore.migrateLegacyKeys`. `AppShell` met à jour `<html lang>` à chaque changement de langue. |
| **P3** | `en/move-names` contenait des descriptions inventées ; domaines non importés | ✅ Partiellement corrigé. Les descriptions sont déplacées dans `move-descs.js` ; tous les domaines sont importés ; la parité FR/EN est complète (111 descriptions EN et 5 objets FR ajoutés). ⚠️ **363 descriptions d'attaque EN** valent toujours « A legitimate strategic combat move. ». Ce texte factice vient du dépôt d'origine. → ✅ **v1.2 : les 363 descriptions sont traduites depuis le FR.** |
| **P3** | `items-data.js` référence `src/assets/images/...` | ✅ Corrigé. Un test interdit `src/assets/`. |
| **P3** | `_mergeDomain` recopiait chaque feuille sans préfixe | ✅ Corrigé. Les collisions sont détectées, et un test vérifie qu'il n'y en a aucune. |

#### Nouveaux points relevés pendant la v1.1 (non bloquants)

- Le toast de notification recouvre le logo de l'en-tête.
- Dans le panneau Lieu, les boutons du bas sont coupés quand la fenêtre est petite.
- Dans l'équipe, le « + » de l'objet tenu chevauche le sprite.
- Le combat est très rapide et la fenêtre Combat est courte : la ligne de butin chevauche les cartes.

**Statut v1.2 : les quatre points sont corrigés.** Le toast est placé sous la barre de titre (`--pw-game-header-h`). Les fenêtres n'ont plus de hauteur fixe, donc les boutons du panneau Lieu ne sont plus coupés. Le badge d'objet est réduit et placé dans le coin. Le combat utilise un temps de recharge par camp, calculé selon la Vitesse avec la formule d'origine, et les cartes reprennent les classes de l'original.

### 4.3 Revue v1.2

| Sujet | Statut |
|---|---|
| Défilement interne des fenêtres | ✅ Supprimé. Seul `#main-dashboard` défile (`dashboard-layout.css`, le dernier fichier importé). Un test statique vérifie la règle. |
| Latence du glisser-déposer | ✅ `WindowDragController` réécrit : transform via `--pw-drag-x/y` une fois par frame, l'emplacement ne bouge que si la cible change, défilement auto près des bords, Échap pour annuler. |
| Colonne d'origine des panneaux | ✅ `constructor(column)` dans les 13 panneaux ; l'ordre de création donne l'ordre vertical ; les dispositions de la v1.1 (colonnes numérotées) sont migrées. |
| `GamePage` gardait des références (`this._teamPanel`…) | ✅ Composition pure. Les modals s'ouvrent via `ModalOpenRequestedEvent` + `ModalIds`. La navigation mobile est extraite dans `MobileDashboardNav`. Le leader est changé par `TeamSystem`. Un test interdit `this._x = new XPanel/XModal(` dans les pages. |
| Assets absents du dépôt | ✅ `assets/images/` est livré : sprites normaux et chromatiques (`pokemon/shiny/`), dresseurs, objets, décors. Des tests vérifient la présence des sprites de chaque espèce. |
| Annulation de la création de sauvegarde | ✅ Bouton Retour et touche Échap dans `StarterModal`. |
| Décor de combat | ✅ `AppShell.setSceneBackground()` + `config/LocationBackgrounds.js` (aucun style en ligne). |

---|---|---|
| **P1** | **DOM créé à la main** (`createElement`, `innerHTML`, `setHTML`) au lieu des widgets | SettingsModal, HeaderPanel, TrainerPanel, MapPanel, AchievementsPanel, LocationPanel, BattlePanel, TeamModal, ActiveTeamPanel, CurrenciesPanel, PokeballsPanel, SecretBasePanel, TrainingCenterPanel, HatcheryPanel, MinePanel, StoryPanel, ShortcutsPanel, NotificationSystem, WindowDragSystem |
| **P1** | `NotificationSystem` affiche le message via `innerHTML`, ce qui permet une **injection HTML** avec un pseudo du type `<img onerror=…>`. Certains messages contiennent volontairement `<b>`. | → passer à `UIText.setRichText` avec des balises autorisées |
| **P1** | **Styles en ligne** (`.style.xxx`) | BattlePanel, SettingsModal, NotificationSystem, WindowDragSystem (pour le glisser-déposer, des variables CSS seraient acceptables) |
| **P2** | **157 replis `t('clé') \|\| 'texte FR'`** dans 25 fichiers. Ils sont inutiles (`t()` renvoie la clé, jamais une valeur vide) et constituent du texte en dur déguisé. | panels/*, StoryPanel… |
| **P2** | **Données en dur en français**, non traduites | TrainerPanel (`'Dresseur'`, `'Bourg Palette'`, `'Temps'`), LocationPanel (descriptions de zones), HatcheryPanel (`Œuf Mystère`) ; le nom du Pokémon est enregistré traduit dans la sauvegarde (il devrait être une clé) |
| **P2** | **Fichiers multi-classes** | `core/Events.js` (14 classes), `data/QuestBase.js` (6) |
| **P2** | `BaseObject.getId()` (identifiant numérique) entre en **conflit** avec `UIElement.getId()` (id DOM) | core/BaseObject.js, ui/UIElement.js |
| **P2** | `BattleSystem` utilise des noms d'attaque en dur (`'Charge'`, `'Tackle'`), dans deux langues différentes | systems/BattleSystem.js |
| **P3** | **Commentaires en français** (~40 fichiers) | src/** |
| **P3** | `ui-modal.css` code des couleurs en dur ; `variables.css` duplique les jetons de `design-system.css` | assets/css |
| **P3** | Icônes SVG copiées-collées dans plusieurs panneaux, à migrer vers `IconRegistry` | panels/* |
| **P3** | Langue enregistrée deux fois (`pw_lang` + `pokeworld_lang`) ; `index.html` figé en `lang="fr"` | LocalizationManager, index.html |
| **P3** | `en/move-names` contient des descriptions inventées ; plusieurs domaines de traduction ne sont jamais importés (champions, lore, npc, pokedex…) | src/localization |
| **P3** | `items-data.js` référence `src/assets/images/...` (chemins de l'original) | src/data/raw |
| **P3** | Fusion i18n : `_mergeDomain` recopie aussi chaque feuille sans préfixe (`title`, `desc`…), ce qui pollue la table | LocalizationManager |

---

## 5. Points à valider avec toi

1. **Dossier des images.** Le dump ne contenait aucune image. `AssetPaths` suit la disposition « à plat » du rework :
   - `assets/images/pokemon/<espèce>.png` ;
   - `assets/images/trainers/trainer-N.png`.

   L'original utilise `pokemon/front/` et `trainers/profil/`. Si ton dossier suit l'original, il suffit de changer **deux constantes** dans `src/config/AssetPaths.js`.
2. **Thème de carte aléatoire** à la création (choix du rework) ou `classic` comme l'original ?

### 4.4 Revue v1.3

| Sujet | Statut |
|---|---|
| Écran des sauvegardes toujours sombre | ✅ Suit le thème du jeu ; les cartes gardent leur thème aléatoire. |
| Défilement par « gros crans » | ✅ Trois causes : fond animé en `background-position` (repeint de toute la fenêtre), défilement sur le fil principal (DPR < 1,5) et cartes reconstruites à chaque tick de combat. Corrigé par `transform`, `will-change: scroll-position` et des vues mises à jour sur place. |
| Frise de combat, statut de capture, badges d'efficacité | ✅ `BattleTimeline`, `CaughtStatusBall`, `PokemonMoveList` + `TypeChart`, `MoveDB`, `MoveLearnset`, `PokedexData`. |
| `BattleActionCompletedEvent` jamais émis | ✅ Supprimé. |
| Gestion des données | 📄 Analyse et plan dans `docs/DATA_REVIEW.md`. |

## 6. Complément de suivi — v1.7 (19/10/2026)

- Les corrections v1.7 sont détaillées dans `docs/PHASE_v1.7.md` : header (badges / réglages), monnaies
  sans cadres, récompenses de quête liées aux données, Lieu centré sans tags, équipe et scène de combat.
- Les 20 presets sont documentés dans `docs/DATA_MODEL.md` : schéma 5, migration des références
  originales et composition depuis l’équipe ou la boîte ; l’accès direct est depuis la fenêtre Équipe.
- Le bouton Résumé ouvre désormais le journal, les gains du dernier combat et des totaux de session.
  Le résumé ne reprend pas encore les captures / objets / dégâts / durée / butin de donjon de `main`.
- `npm test` : **176 réussis, 0 échec** ; `node --check` et `git diff --check` passent. Le rendu visuel
  responsive reste à faire valider manuellement, faute de navigateur automatisé dans le dépôt.

## 7. Complément de suivi — v1.9 (20/10/2026)

- Livraison source Rework **1.9.0**, schéma de sauvegarde **9**. Le schéma 6 est une étape de
  développement intermédiaire, pas une version 1.8 publiée.
- Les notes françaises de cette livraison sont dans `docs/PHASE_v1.9.md`; le modèle de sauvegarde
  actuel est décrit dans `docs/DATA_MODEL.md`.
- Le contenu comprend 64 quêtes principales Kanto (194 sur les trois régions), le tutoriel de dix
  étapes, les expéditions de donjon en grille, et les systèmes Kanto d'entraînement, pension/fossiles,
  mine et vente. Les détails et limites de parité sont documentés dans la note de phase.
- Vérifications réussies : `npm test` (**190/190**), `node --check` sur tous les fichiers JS/MJS de
  `src`, `tests` et `tools`, `git diff --check`, validation de données et contrôle des versions.
- Smoke test serveur : HTTP 200 sur `/`, `/src/main.js`, la feuille de style principale et un sprite.
  Playwright à 390 px crée une sauvegarde, recharge la page, rouvre la sauvegarde et n'observe aucune erreur JavaScript.
- Archive : intégrité `unzip -t` validée; **2 449 entrées**, sans `.git`, `node_modules` ni caches.
  Après extraction, `npm test` repasse à **190 réussis, 0 échec** et les ressources essentielles répondent
  toutes en HTTP 200.
- Correctif de démarrage après retour utilisateur : ajout de l'import explicite de
  `DashboardWindowFocusRequestedEvent` dans `MobileDashboardNav`; un test de régression instancie la
  navigation mobile et vérifie le routage de la demande de focus.

## 8. Complément de suivi — v1.11 (20/10/2026)

- Livraison source Rework **1.11.0**, schéma **13**. Le paquet et le lockfile annoncent la même
  version. La migration `12 → 13` déplace `trainingUnlockedMoves` vers `unlockedMoves`, préserve les
  identifiants de capacité non reconnus et ne modifie pas les attaques actives.
- Flux livrés dans le périmètre confirmé : offres/avancement PNJ liés à des IDs stables; six puzzles
  Kanto localisés; dépôt/retrait/échange PC via les systèmes; CT/CS débloquant les capacités avant
  l'équipement choisi depuis la fiche; Rare Candy, six vitamines et Pierre Liaison sur le Pokémon
  ciblé; bilan terminal du donjon corrélé au combat exact. Le menu Base secrète réutilise le jalon
  historique, mais le gameplay Hoenn correspondant reste hors de ce ZIP.
- `npm test` : **236 réussis, 0 échec**. `git diff --check` et les vérifications syntaxiques ciblées
  passent. La validation couvre les systèmes et la migration, mais ne remplace pas une partie complète.
- Smoke Playwright ciblé à 390 × 844 et sur bureau : flux CT → cible → apprentissage différé, objet
  sur Pokémon d'équipe et de PC, sélection d'évolution, bonbon/vitamine, et déploiement des filtres
  mobiles du Sac. La suite automatise le règlement des chemins boss/wipe; aucun parcours réel complet
  jusqu'au boss final n'est revendiqué.
- **Limites explicites :** pas de certification de complétion end-to-end de chaque quête Kanto, pas
  de validation pixel par pixel de toutes les pages et de tous les thèmes, pas de gameplay Base secrète
  Hoenn. Le rapport `docs/PHASE_v1.11.md` sépare les éléments terminés, partiels, non vérifiés et
  différés.
- Archive `pokeworld-rework-1.11.0.zip` : 2 436 fichiers; intégrité `unzip -t` validée et suite testée
  après extraction (**236 réussis, 0 échec**). Le paquet exclut `.git/`, `.playwright-cli/`, dépendances
  et caches.

## 9. Complément de suivi — v1.12.0 (21/10/2026)

- Version de paquet **1.12.0**, schéma **14**; versions synchronisées entre `GameConfig`,
  `package.json` et le lockfile. La migration `13 → 14` conserve les filtres PC et les flags Favori/
  Verrouillé dans les données Pokémon. La refonte du Pokédex est en lecture seule et n'ajoute aucun
  champ de sauvegarde.
- Le rapport détaillé et les limites sont dans `docs/PHASE_v1.12.md`. Les critères reçus couvrent
  header, tutoriel/quêtes, Lieu/carte, résumé et animation de capture, raccourcis, objets tenus,
  sélecteur, PC (Favoris, Verrouillés, Rang et autres filtres), masquage des installations avant
  prérequis, errants à rotation de 12 h, Pokédex et Guide.
- L'errance suit les règles explicitement autorisées : rotation UTC de 12 h, taux strict de 1 %,
  niveau 75, villes et donjons exclus, combat/capture ordinaires. Les poids/tirages ordinaires Rework
  restent inchangés.
- `npm test` : **252 réussis, 0 échec** après l'ajout des tests UI Pokédex et de rang SS PC, ainsi que la correction des libellés du tiroir mobile. Les vues Guide et Pokédex ont été inspectées sur bureau et à 390 × 844;
  les filtres mobiles du Pokédex se déploient, restent dans la largeur et portent le bon libellé.
- Le bilan n'est pas une certification d'un parcours Kanto complet ou d'une parité pixel par pixel
  de tous les écrans. Le gameplay complet de la Base secrète Hoenn reste hors du périmètre; ses
  panneaux demeurent masqués avant le jalon historique.
- Archive `pokeworld-rework-1.12.0.zip` : **2 448 fichiers**, intégrité `unzip -t` validée; `.git/`,
  `.playwright-cli/`, dépendances et caches absents. L'extraction passe `npm test` (**252/252**) et
  ses ressources principales répondent HTTP 200.

## 10. Reprise corrective après contestation de 1.12.0 — 21/10/2026

- L'utilisateur a refusé le constat de conformité de 1.12.0; les contrôles unitaires et observations
  navigateur historiques ne sont pas considérés comme preuve de la demande initiale.
- Contenu puzzle hors Kanto repris : 25 définitions ajoutées manuellement et localisées; le catalogue
  totalise 31 puzzles. Résolution système et modal couvrent code, braille, équipe et attente en plus des
  séquences; progression vers une quête puzzle et actions de lieu hors Kanto sont testées.
- Un parcours de région manquant a été identifié puis corrigé dans l'architecture Rework : après les
  exigences Ligue/Pokédex de `main`, changer de région transporte au départ; le premier accès à Johto/
  Hoenn demande le starter régional, ajouté à l'équipe ou à la Boîte PC via les systèmes. Route 29/101
  est conditionnée à ce choix. Voyage, synchronisation de quête et choix de starter passent chacun par
  une seule écriture de sauvegarde dans les tests.
- L'audit comparatif `main` ↔ Rework donne **0 différence de déblocage sur 1 602 états de nœuds**
  (3 régions × 9 paliers de badges), avec victoires locales, starters, gates de quête/objets et accès
  Ligue représentés. Pour le Parc Naturel, l'utilisateur a choisi d'aligner l'accès sur la carte active
  de `main` tout en gardant le donjon et ses rencontres de la table Johto dédiée.
- Dernière suite complète : **280 réussis, 0 échec**. Vérification `node --check` de tous les JS/MJS de
  `src`, `tests`, `tools` et `git diff --check` réussies.
- **À la date de ce rapport intermédiaire**, aucune validation navigateur des nouveaux correctifs et
  aucune comparaison visuelle complète n'avaient encore été effectuées. La suite 1.13.0 ci-dessous
  consigne les vérifications ciblées réalisées ensuite; les parcours multi-régions complets restent
  hors certification.

## 11. Clôture de suivi — v1.13.0 (21/10/2026)

- Version **1.13.0**, schéma **14**, alignée dans `package.json`, `package-lock.json` et `GameConfig.VERSION`.
  Aucun nouveau champ de sauvegarde et aucune migration.
- `npm test` passe **286/286** lors de trois exécutions consécutives. Le fixture du test d'immunité
  contre les types a été rendu déterministe afin que le talent aléatoire Scrappy ne désactive pas
  l'immunité Ghost/Normal testée; aucune règle de combat n'a changé. Tous les JS/MJS de `src`, `tests`
  et `tools` passent `node --check`; `git diff --check` passe.
- Contrôle navigateur Story à 1280 × 720 : chaîne Kanto **1/64 → 2/64** après dialogue avec le Prof.
  Chen; « En cours… » et objectifs/titres visibles; actions Tutoriel alignées au retour près avec
  `main` (écart résiduel des cartes d'environ 1–2 px, sans prétention pixel-perfect). Les mêmes
  étapes de dialogue et de titre ont été vérifiées en anglais.
- Parcours navigateur Route 1 : après dix victoires, le nœud Jadielle/Viridian est passé de verrouillé
  à adjacent et le clic a déplacé le joueur dans la ville. Le combat reste aléatoire; aucune balance
  ni rencontre ordinaire n'a été modifiée.
- Parcours navigateur Équipe/PC : capture d'un Rattata, équipe 2/6, preset enregistré 2/6, PC 1 / équipe
  1, puis retrait PC 0 / équipe 2; les deux Pokémon ont des IDs uniques et distincts. Aucune erreur
  JS/console pendant le parcours.
- Mobile réel simulé (`hasTouch: true`, 390 × 844) : aide tactile correcte, navigation Équipe et
  Raccourcis, ouverture Boîte PC et largeur de document sans débordement horizontal.
- Le starter initial reste capturé dans le Pokédex et le tracker Kanto affiche 1/25 (4%), comme demandé.
  Les parcours complets Johto/Hoenn et une partie régionale entière ne sont pas certifiés.

## 12. Port Base secrète — v1.14.0 (21/10/2026)

- Version **1.14.0**, schéma de sauvegarde **15**; `package.json`, `package-lock.json` et `GameConfig.VERSION` sont synchronisés. La migration conserve les bases legacy, décorations/placements, stock, PNJ/équipes/messages, emplacement, records, message PC et drapeaux; les rotations historiques restent normalisées à 0.
- Comparaison automatique à `main` : **122/122 décorations** et **36/36 layouts**; les propriétés manuelles de chaque décoration et les 36 grilles ASCII correspondent exactement. Les 17 routes et leurs alcôves restent celles de la référence.
- Contrôle navigateur à 1440 × 1000 sur fixture : aperçu d'alcôve, établissement d'une nouvelle base, entrée depuis Lieu, édition d'une décoration provenant du stock, enregistrement du message PC et modification d'un PNJ. L'éditeur se ferme à l'entrée en visite; l'établissement n'incrémente pas artificiellement le record de visites.
- Déplacement de `tree_1` à `bush_1` confirmé depuis Lieu : le modal se ferme, les décorations détenues retournent au stock, le PC reste automatique, les PNJ sont retirés, aucun nouveau meuble n'est accordé et le déplacement n'est pas compté comme une visite.
- Échange JSON visite-seule : import d'une base distante, interaction avec son PC, prise d'un drapeau et respect du délai de 24 h. L'ID d'export stable Rework n'a pas été modifié; l'export n'ajoute pas le champ `pcMessage` absent de la référence.
- Combat d'un PNJ visité : démarrage du moteur standard, fin de duel puis reprise de la visite. Les tests confirment l'événement de résolution Base dédié, sans règlement de dresseur ordinaire, capture, récompense sauvage ni événement ordinaire de KO.
- Acquisition : aucun magasin Base, meuble initial ou grant gameplay; le PC automatique est le seul objet créé. Les drapeaux alimentent le fournisseur de bonus commun (argent, EXP, énergie Mine et butin route aux seuils prévus); le catalogue de succès n'est pas activé.
- `npm test` : **301 réussis, 0 échec**, sur la source et après extraction du ZIP. Playwright à 1440 × 1000 et audit tactile mobile 390 × 844 (onglet Base, éditeur, modal de visite; largeur documentaire constante à 390 px) : aucune erreur JavaScript/console, aucune réponse HTTP en échec et aucun débordement horizontal.
- Archive finale `pokeworld-rework-1.14.0.zip` : **2 487 fichiers**, `unzip -t` sans erreur; pas de `.git`, dépendances, caches, scripts/fixtures temporaires ou captures. Après extraction, `node --check` sur tous les JS/MJS et la cohérence version **1.14.0** / schéma **15** sont confirmés. `git diff --check` passe sur la source.
- Limite de preuve : les chemins de progression Base cités sont observés dans le navigateur; cela ne certifie pas une partie Hoenn complète ni chacune des 122 décorations individuellement.

## 13. Équipe — sélection d’objet tenu par le Sac — v1.14.1 (21/10/2026)

- **Point 1 uniquement** de la liste de correctifs. Version paquet/config **1.14.1**, lockfile aligné; schéma sauvegarde inchangé (**15**).
- Les deux actions (badge d’objet tenu de la carte Équipe et bouton de la fiche Pokémon) ouvrent `ModalIds.BAG` en mode `held-item`. Le panneau séparé `HeldItemPickerModal`, son identifiant et son composant de ligne parallèle ont été retirés; le rendu emploie `BagItemRow` du Sac avec les descriptions, quantités, indisponibilités et interactions clavier nécessaires.
- La fiche Pokémon restait au-dessus du Sac et interceptait les clics. Le mode tenu ajoute désormais sa classe de superposition et passe à z-index **32 000**, contre **31 000** pour la fiche; celle-ci reste ouverte et le Sac redevient le plan interactif supérieur.
- `BagPanel` rafraîchit le mode de sélection à la modification de l’inventaire/de l’équipe et aux événements de début/fin de combat; l’état verrouillé ne peut donc pas rester périmé. Équipement et retrait continuent de passer par `HeldItemSystem`/`TeamSystem`, avec une seule écriture de sauvegarde.
- `npm test` : **303 réussis, 0 échec**; trois tests ciblés vérifient les deux points d’entrée, l’utilisation du Sac, le verrouillage d’un objet tenu par un autre Pokémon, une seule sauvegarde à l’équipement et le rafraîchissement du verrou de combat.
- Playwright bureau **1280 × 900** : l’objet de la carte Équipe ouvre le Sac, où l’objet déjà tenu par un coéquipier est indisponible; l’équipement d’un objet possédé ferme le Sac et met à jour la carte. Sur mobile tactile **390 × 844**, « Changer » depuis la fiche ouvre le Sac au-dessus (z-index 32 000 contre 31 000), permet l’équipement et laisse la fiche ouverte; largeur du document toujours 390 px. Aucune erreur JavaScript ni réponse HTTP échouée.
- Archive `pokeworld-rework-1.14.1.zip` : **2 488 fichiers**, intégrité `unzip -t` validée; sans `.git`, dépendances, caches ni artefacts temporaires. Après extraction, `npm test` **303/303**, `node --check` sur tous les JS/MJS et versions package/lock/config **1.14.1**, schéma **15**.
- Les points **2 à 16** et la porte globale « Kanto entièrement jouable, sans perte de focus ni changement non demandé » restent **ouverts**; voir `SUIVI_CORRECTIFS.md`. Cette livraison ne prétend pas les avoir corrigés.

