# ChangeLog — PokéWorld

Journal des passes. Format : une section par passe, avec **ce qui a été fait**, **l'état par rapport au système monétaire et à la roadmap**, et **la prochaine action**.

---

## Complément V7-R3d — « Retours son, ambiance des lieux & timer dans le butin » · version **7.5.3** (2026-10-15)

Retours du joueur post-7.5.2, traités avant P4a :
1. **Boutons et curseurs de son soignés** — chaque canal sonore a sa propre carte (icône + nom), un véritable
   **interrupteur coulissant** avec son état textuel explicite (**ACTIVÉ** en vert, **COUPÉ** en discret) et un
   curseur proportionnellement rempli (`--pw-fill`) jusqu'au curseur. L'état activé / coupé se voit instantanément.
2. **Immersion et cohérence musicale des lieux** (SND-07, **42 pistes** CC0 créditées, budget ≤ 40 Mo) — fini
   la musique enjouée dans des lieux sombres. La **Tour Pokémon** reçoit une ambiance lugubre dédiée (`dungeon_haunted`
   de Bobjt), les **sanctuaires et ruines** leur musique mystique (`dungeon_shrine`), les **grottes de cristal**
   (`dungeon_crystal`), les **volcans et zones de feu** (`dungeon_fire`), les **grottes et chemins glacés** (`dungeon_ice`),
   le **désert** (`dungeon_desert`), les **lieux légendaires célestes** (`dungeon_sky`), les routes bénéficient d'une
   **seconde piste alternée** (`map_b`), et les **combats sauvages** adoptent un thème propre à leur région.
3. **Compte à rebours de relance directement dans le menu de butin** — après une chaîne sauvage interrompue ou
   une expédition achevée / wipe, le résumé de butin affiche une jauge animée en temps réel avec le décompte en
   secondes et un bouton immédiat **« Arrêter la relance »**. Si le joueur clique pour arrêter, le bandeau confirme
   clairement que la relance est annulée, sans forcer à fermer la modale pour stopper le compte à rebours.

### 0. Ce que ça change pour le joueur

1. **Réglages du son nets et lisibles** — on voit immédiatement quels canaux sont allumés ou coupés grâce au texte
   vert `ACTIVÉ` ou grisé `COUPÉ` et au bouton bascule bien visible. Le curseur montre sa jauge remplie en jaune.
2. **Ambiance sonore adaptée à chaque lieu** — entrer dans la Tour Pokémon fait passer la musique sur un thème
   sombre et envoûtant, tout comme explorer une caverne de glace, un volcan ou un sanctuaire ancien. Les routes ne
   rejouent plus en boucle le même unique morceau grâce à l'alternance de pistes.
3. **Contrôle total sur la relance automatique** — pendant qu'on consulte le butin, on voit le temps restant avant la
   prochaine expédition ou le prochain combat avec une barre de progression, et on peut l'interrompre en un clic sans
   précipitation.

### 1. Détail technique

| Ticket / Domaine | Résumé des modifications | Fichiers touchés |
|---|---|---|
| **R3d-01** son UI | Cartes `.settings-sound-card`, interrupteur `.pw-switch` (`role="switch"`, `aria-checked`, `.pw-switch-state` `ACTIVÉ`/`COUPÉ`), curseur `.pw-range` avec remplissage `--pw-fill` et retour instantané. | `src/ui/views/SettingsModalView.js`, `src/application/save/settings.js`, `src/assets/styles/design-system.css`, `src/data/ui-icons.js`, `src/localization/{fr,en}/ui.js` |
| **SND-07** musiques | 16 pistes CC0 OpenGameArt ajoutées (42 au total, 31,98 Mo ≤ 40 Mo). Thèmes de lieux : `dungeon_haunted` (Tour Pokémon), `dungeon_shrine`, `dungeon_crystal`, `dungeon_fire`, `dungeon_ice`, `dungeon_desert`, `dungeon_sky`, `town_market`, `town_mountain`, `town_new`, `map_b`, `battle_wild_johto`, `battle_wild_hoenn`. Chaînes de repli adaptées. | `src/core/audio.js`, `src/application/audio-bindings.js`, `tools/audio-cc0-pack.py`, `docs/CREDITS.md`, `README.md`, `tools/validate-project.mjs` |
| **R3d-03** butin timer | Résumé de session (`SessionSummaryView`) héberge `#summary-relaunch-wild` et `#summary-relaunch-dungeon`. Jauge animée, compte à rebours rafraîchi sans réallocation DOM, bouton `cancelAutoRelaunch` / `cancelAutoDungeonRelaunch` et message persistant d'annulation. | `src/ui/views/SessionSummaryView.js`, `src/ui/game/battle-summary.js`, `src/application/automation/auto-relaunch.js`, `src/application/automation/auto-dungeon-relaunch.js`, `src/assets/styles/design-system.css` |
| Tests & docs | Tests automatisés `tests/r3d-player-feedback.test.js` (3/3), actualisation de `tests/r3-player-feedback.test.js` et `tests/r3c-player-feedback.test.js`, captures `v7-r3d-*.png`. | `tests/r3d-player-feedback.test.js`, `ChangeLog.md`, `docs/ROAD_MAP_V7.md`, `LIVRAISON-V7-R3d.md` |

### 2. État monnaie / roadmap

- Économie intacte (0 modification de taux, de prix ou de gains).
- Portes qualité : `npm run check` vert (1 334 tests unitaires), eslint 0, 16 / 16 smokes Chromium, validate-project vert.
- Prochaine étape : **P4a** (Succès ACH-01 / ACH-02 / HLP-ach).

---

## Complément V7-R3c — « Retours 7.5.1 : son, réglages, mine, coûts, guide, ball chromatique » · version **7.5.2** (2026-10-15)

Retours du joueur sur la 7.5.1, à traiter **avant P4a**. Portes : `npm run check` vert, lint 0,
smokes, `validate-project` (26/26 pistes créditées ≤ 24 Mo). **Aucun changement de schéma**
(`SAVE_VERSION` = 4) ; une **migration douce** des filtres de Poké Balls (`G.pokeballs.presetVersion`
= 2) remet les options et l'ordre des filtres de base sans toucher aux balls ni aux filtres
personnalisés.

### 0. Ce que ça change pour le joueur

1. **Trois volumes séparés qui marchent** — Réglages → Son : **Musique**, **Effets** et **Cris des
   Pokémon** ont chacun leur interrupteur et leur curseur **0 → 100** (les cris se coupent sans toucher
   au reste). Le curseur précédent était mort : son attribut `oninput` était neutralisé par
   l'assainisseur du moteur et il ne couvrait pas 0–100. Les curseurs passent maintenant par le
   nouveau canal `data-input-call` du dispatcher (comme les quantités de boutique / marché et le
   sélecteur de filtre de ball, qui souffraient du même défaut).
2. **Musiques plus variées et plus justes par lieu** (SND-06, **26 pistes** CC0 Juhani Junkala) —
   villes natales (Bourg Palette, Bourg Geon, Bourg-en-Vol : « Childhood Friends »), grandes villes
   (Safrania, Céladopole, Doublonville, Lavandia, Poivressel, Nénucrique : « Bazaar »), villes côtières
   (Carmin, Cramois'Île, Oliville, Irisia, Mérouville, Algatia, Atalanopolis, Pacifiville… : « Summer
   Memories »), **mer / chenaux** (« Sunshine Coast »), **nuit sur les routes** 21 h → 6 h (« Prairie
   Nights »), **Rosalia** (« Where Time Stands Still »), villes de Johto (« Innocence ») ; les donjons
   de Johto et Hoenn rejoignent les ambiances tour / forêt / centrale / repaire (Tour Ferraille, Tour
   Cendrée, Bois aux Chênes, Pilier Céleste, Grotte Origine, planque Aqua…).
3. **Réglages allégés** — plus de paragraphe « Le son démarre après un premier clic… », plus de
   tableau « Automatisation — coûts », plus de phrase sur le mode debug : ces informations vivent dans
   le **Guide** (rubriques « Son & musique » et « Automatisation → Où acheter »).
4. **Mine sans emoji** — le coût d'un outil est une icône SVG « énergie » + le nombre ; l'outil courant
   a l'apparence **standard des bascules** (fond clair / texte sombre, sans halo) ; la case visée a un
   contour neutre de la palette (plus la couleur d'accent, bleue sur certains thèmes) ; **bouton
   « Mine auto » directement dans l'en-tête du panneau** (bascule si acheté, sinon achat avec le prix
   en Diamants ; l'achat démarre le module et **n'ouvre plus le menu de gestion**). Les notifications
   de la mine disent « Diamants » au lieu de 💎. Au passage, la cause du halo de R3 est corrigée : la
   face par défaut des boutons (`.hbtn`, 10 classes + `!important`) masquait **toutes** les règles
   « bouton actif » — l'outil courant, l'onglet actif des menus de gestion et du dictionnaire sont de
   nouveau visibles avec la bascule standard du thème.
5. **Les boutons des modes auto annoncent leur prix** tant que le module n'est pas acheté, avec un
   bouton **Acheter** sur place : cartes de la Pension (500 / 1 000 PQ), carte et en-tête de la Mine
   (1 000 Diamants), emplacements d'entraînement (prix par emplacement), **bandeau de relance auto**
   après un combat (2 500 PQ) et **bandeau de relance des donjons** (5 000 PQ) — plus de bandeau caché
   ni de bascule muette.
6. **Guide étoffé** — nouvelles rubriques **« Stats, IV & EV »** (formule des stats : +5 % par IV,
   +5 % par EV, chromatique +20 % ; **comment gagner des IV** : capture 10 %, Pension +1 IV garanti par
   éclosion, fossile déjà possédé, Capsules ; EV : entraînement et vitamines ; talents : Capsule /
   Patch / entraînement), **« Poké Balls & filtres »** (ordre = priorité, cas des chromatiques, filtres
   personnalisés, balls spéciales), **« Chromatiques »** (chances, bonus de stats, doublons, chasse) et
   **« Son & musique »** (trois volumes, musique par lieu, sons officiels via `download_assets.bat`) ;
   page « Où acheter, à quel prix » dans Automatisation. Tous les chiffres sont lus dans le code
   (`GAME.STATS` nouveau : pas d'IV/EV/×1,2 en dur).
7. **Vitamines, Capsules et Patchs enfin en vente** — Céladopole, Doublonville et le Grand Magasin de
   Nénucrique (vitamines 30 000 ₽, Capsule 50 000 ₽, Capsule Talent 50 000 ₽) ; Ligue Indigo et
   Atalanopolis (Capsule dorée 200 000 ₽, Patch Talent 200 000 ₽).
8. **Ball chromatique enfin lancée** — « Nouveau chromatique » cible désormais **toute rencontre
   chromatique dont on ne possède pas encore le shiny, même si l'espèce est capturée en normal**
   (avant : l'option `caught:false` excluait ces cas, et un Pokémon normal passait pour « shiny » dès
   que le shiny de l'espèce était possédé). Les filtres de base passent dans l'ordre **Errant →
   Nouveau chromatique → Chromatique déjà capturé → Nouveau → Déjà capturé**, et un filtre de base laissé
   sur « Aucune » **passe la main au suivant** (un nouveau shiny n'est plus ignoré parce que la ligne
   chromatique est restée vide) ; un filtre personnalisé sur « Aucune » reste « ne rien lancer ».
9. **Zip plus léger** — `dist/src/assets` (copie de `src/assets`, ~33 Mo) n'est plus dans l'archive :
   `launch_local_server.bat` (et le nouveau `launch_local_server.sh`) le reconstituent au lancement
   (`robocopy` / `rsync`, seulement le neuf) ; le serveur Node livré lisait déjà `src/assets` en repli.

### 1. Détail technique

| Ticket | Correctif | Fichiers |
|---|---|---|
| **R3c-01** son | `src/core/audio.js` : bus `cries` (`criesOn` / `criesVol` 0,6 par défaut, préférences `pokeworld_audio_prefs`), `audioSetVolume(bus, v, { percent: true })` pour les entrées 0–100 (plus d'heuristique « > 1 ») ; `settings.js` : `setAudioVolume` borne 0–100, aperçu d'un cri sur le bus cris ; modèle `sound = { heading, volumeLabel, buses: [{ id, label, on, vol }] }` ; `SettingsModalView` : 3 lignes `<input type=range min=0 max=100>` en `data-input-call="setAudioVolume" data-input-args="'<bus>',this.value"` ; bloc automation et `advanced.hint` supprimés ; i18n `settings_cries`, 7 clés obsolètes retirées | `src/core/audio.js`, `src/application/save/settings.js`, `src/ui/views/SettingsModalView.js`, `src/localization/{fr,en}/ui.js` |
| **R3c-01** dispatcher | `action-dispatcher.js` : `_runLegacyDataCall(event, 'input' \| 'change')` — canaux `data-input-call` / `data-change-call` (+ `*-args`, `this.value`, chaînes quotées) ; tables `CHANGE_VALUE_ACTIONS` / `INPUT_VALUE_ACTIONS` / `MODAL_CLOSERS` ; shop / market qty et `<select>` de filtre de ball migrés ; plus aucun `oninput=` / `onchange=` dans `src/ui` | `src/engine/input/action-dispatcher.js`, `src/ui/game/shop-panel.js`, `src/ui/game/market-panel.js`, `src/ui/game/pokeball-window.js` |
| **SND-06** | 6 pistes (`town_home`, `town_city`, `town_coast`, `sea`, `map_night`, `loc_ecruteak` ; `town_johto` → « Innocence ») via `tools/audio-cc0-pack.py --music` (26 MP3 80 kb/s, 20,8 Mo) ; `AUDIO_MUSIC_TRACKS` 26 clés ; `audioMusicChain` : `:town[:<thème>]`, `:sea`, `:night` ; `audio-bindings.js` : `AUDIO_TOWN_THEME`, `_audioIsNight()` (`currentDaytimePhase` / `data-daytime`), `AUDIO_DUNGEON_THEME` étendu Johto/Hoenn ; manifeste, gate musique 20 → 24 Mo, crédits | `src/core/audio.js`, `src/application/audio-bindings.js`, `tools/audio-cc0-pack.py`, `tools/audio-manifest.mjs`, `tools/validate-project.mjs`, `docs/CREDITS.md`, `src/assets/audio/music/*.mp3` |
| **R3c-02** mine | icône `energy` (`ui-icons.js`) ; `MineWindowView` coût = icône + nombre ; `mine-ui.js` effet de frappe idem, `mineAutoHeaderAction()` (bascule `toggleMineAutomation` avec `is-on` / `aria-pressed`, ou `buyMineAutomation` « Mine automatique · 1 000 Diamants ») ; CSS : `.mine-tool-btn.active { box-shadow: none }`, `.mine-tile.is-aim` → `var(--light2)` ; i18n `mine_tool_hint`, `mine_energy_unit`, `mine_auto_toggle`, `afk_roamer_note*` sans emoji ; 💎 → « Diamants » dans `economy.js` (mine) et `guide_key_*` | `src/data/ui-icons.js`, `src/ui/views/MineWindowView.js`, `src/ui/game/mine-ui.js`, `src/assets/styles/design-system.css`, `src/localization/{fr,en}/{ui,economy}.js` |
| **R3c-03** coûts | `automation.js` : `automationCostLabel(key)`, `automationUnlockModel(key)` (`{ purchased:false, lockedLabel, buy:{call,args,label} }`) ; `management.js` : `automationBuyButtonVNode`, carte verrouillée `.has-buy` (toggle et slot) ; `hatchery-ui.js` / `mine-ui.js` / `training.js` (slot `unpurchased`) consomment le modèle ; `auto-relaunch.js` : bandeau non acheté = `auto_relaunch_locked {price}` + `buyAutoRelaunchUpgrade()` ; `auto-dungeon-relaunch.js` idem (`buyAutoDungeonRelaunchUpgrade()`) | `src/application/automation/*.js`, `src/ui/components/management.js`, `src/ui/game/hatchery-ui.js`, `src/ui/game/mine-ui.js`, `src/application/combat/training.js` |
| **R3c-04** guide | `src/ui/game/guide-sections-extra.js` (nouveau, fusionné par `mergeGuideSections`) : rubriques `stats`, `pokeballs`, `shiny`, `sound` + `automationBuyPage()` ; valeurs lues dans `GAME.STATS` / `GAME.CAPTURE` / `ITEMS` / `SHOPS` / `PRESET_FILTERS` / `BALL_DEFS` / `SHINY_BASE_RATE` / `AUDIO_MUSIC_TRACKS` ; `GAME.STATS` (`IV_STEP_PCT`, `EV_STEP_PCT`, `SHINY_BONUS_PCT`, `EV_CAP`, `EV_TOTAL_CAP`) lu par `calcStat`, `training.js`, `save-extras.js` ; 38 clés `guide_*` FR/EN | `src/ui/game/guide-sections{,-extra}.js`, `src/data/game-config.js`, `src/data/game-helpers.js`, `src/localization/{fr,en}/ui.js` |
| **R3c-05** boutiques | vitamines + `bottle_cap` + `ability_capsule` : `celadon`, `jgoldenrod` (+ `zinc`), `lilycove_dept_store` (+ `zinc`) ; `bottle_cap` + `golden_bottle_cap` + `ability_patch` : `indigo`, `evergrande` | `src/data/shops-data.js`, `src/data/shops-hoenn.js` |
| **R3c-06** balls | `PRESET_FILTERS` : ordre errant → nouveau chroma → chroma capturé → nouveau → capturé ; `new_shiny = { shiny:true, caughtShiny:false }`, `caught_shiny = { shiny:true, caughtShiny:true }` ; `filterMatches` : `shiny` = rencontre chromatique seulement ; `ballForEnemy` : filtre de base sur `none` → `continue` ; `migratePresetFilters` (`PRESET_FILTERS_VERSION` = 2) ; `ballFilterOptionsSummary` « chroma non capturé » ; `ball_editor_hint` | `src/application/economy/pokeballs.js`, `src/localization/{fr,en}/economy.js` |
| **R3c-03b** bascules | Face par défaut `.hbtn:not(…)` : exclusions `:not(.active):not(.is-active)` (les règles « Active state » reprennent la main) ; `.pw-mine-header` : bascule « Mine auto » = `.active` standard ; `buyMineAutomation` → `enabled = true` + ticker + `_mineAutoUiRefresh()` ; `toggleMineAutomation` idem ; `refreshMineAutomationUi()` (menu de gestion re-rendu seulement s'il est ouvert) ; pension : libellés `box_filter_*` au lieu des clés brutes `filter_*`, options rang `hatchery_filter_rank_s_plus / _a_minus`, `hatchery_queue_title` sans 📋 | `design-system.css`, `MineWindowView.js`, `economy/mine.js`, `mine-ui.js`, `hatchery-ui.js`, i18n `ui.js` |
| Livraison | `launch_local_server.bat` (robocopy `src\assets` → `dist\src\assets`), `launch_local_server.sh` (nouveau), zip sans `dist/src/assets/**` ; tests `tests/r3c-player-feedback.test.js` (19) ; `r2` / `r3` / `p0-currency` / `r1c` / `passe35` ajustés (26 pistes, bus cris, presets, unités, table `CHANGE_VALUE_ACTIONS`) ; smokes `ecs-gameplay` / `p0b` remis au modèle P0 (marché en PQ, trésors en Diamants, ordre des filtres) ; `pokeballs.js` : surface `window`/`globalThis` en un seul `Object.assign` (budget 1 000 lignes) | `launch_local_server.*`, `tests/**`, `LIVRAISON-V7-R3c.md` |

### 2. État monnaie / roadmap

Aucun changement d'économie (nouveaux stocks de boutique = objets existants à leur prix existant).
Roadmap : §4b nouvelle section **R3c**, §11 ligne R3c, statut en tête. **Prochaine action : P4a
(ACH-01, ACH-02, HLP-ach).**

---

## Complément V7-R3b — « Bande-son complète » (SND-05) · version **7.5.1** (2026-10-15)

Suite de la passe R3 : le joueur voulait les musiques et sons des jeux officiels **dans le zip** ;
impossible de les redistribuer, il a accepté des sons libres **à condition qu'ils collent au jeu et
aux événements**. Ce complément livre donc une bande-son complète CC0 (Juhani Junkala) : **20 musiques**
(12 nouvelles) couvrant tous les contextes du moteur, et **22 effets** en fichiers (8-bit, collection
*Essential Retro Video Game Sound Effects*) en remplacement des recettes synthétisées — qui restent
le repli si un fichier manque. Les pistes officielles déposées par le joueur restent prioritaires
(`download_assets.bat audio`, dossier entier ou fichier par fichier). Portes : `npm run check` vert
(**1 312 tests / 0 échec**), lint 0, 4 smokes, `validate-project` (20/20 pistes créditées, 15,5 Mo
≤ 20 Mo ; cris + effets 5,3 Mo ≤ 15 Mo ; manifeste à jour). `SAVE_VERSION` inchangé (4).

### 0. Ce que ça change pour le joueur

1. **Musiques par situation** — arène (« Army Approaching »), Ligue (« JRPG Theme »), quête
   légendaire (« Ancient Evil Awakens »), errant (« Apocalypse »), gardien de donjon (« Epic Boss
   Battle », désormais réservé aux gardiens), combat sauvage et dresseur inchangés.
2. **Villes et routes distinctes** — sur une ville, le jeu joue une ambiance de village (Kanto « Home
   Town », Johto « Where Time Stands Still », Hoenn « Sand Castles ») ; sur une route, le thème de la
   région ; **Lavanville** a sa propre piste (« Whispers From Beyond »).
3. **Donjons par ambiance** — tours et sanctuaires (Tour Pokémon, Tour Chétiflor, Tour Cendrée, Tour
   Ferraille, Ruines d'Alpha : « Catacombs »), forêts et Parc Safari (« Sneaking Around »), Centrale
   (« Military Base »), repaires de fin de jeu (Caverne Azurée, Route Victoire, Mont Argenté :
   « Witch's Lair ») ; les autres grottes gardent « Tha'el Mines ».
4. **Effets sonores réels** — clic, ouverture, notification, refus, achat (pièces), K.O. (impact),
   Pokémon allié K.O. (chute), niveau, évolution (portail scintillant), éclosion, lancer de Ball,
   capture, Ball qui s'ouvre, badge et quête (fanfares), Ligue, brillant (« bling ») et brillant
   capturé, gardien (grondement), coffre et trésor (pièces), errant (alarme). Volume des effets
   toujours réglable dans Réglages → Son.

### 1. Détail technique

| Ticket | Correctif | Fichiers |
|---|---|---|
| **SND-05** pistes | 12 nouvelles boucles + les 8 de R2 ré-encodées depuis leurs sources OGG, toutes en MP3 80 kb/s (crête −1 dBFS) par `tools/audio-cc0-pack.py` (pipeline reproductible : téléchargement archive.org + encodage) : `battle_gym`, `battle_league`, `battle_legendary`, `battle_roaming`, `town`, `town_johto`, `town_hoenn`, `loc_lavender`, `dungeon_tower`, `dungeon_forest`, `dungeon_plant`, `dungeon_lair` ; `AUDIO_MUSIC_TRACKS` (20 clés) ; `audioMusicChain` : `map:<région>:<lieu>:town` → `[loc_<lieu>, town_<région>, town, map_<région>, map_hoenn]`, `dungeon:<lieu>:<thème>` → `[dungeon_<lieu>, dungeon_<thème>, dungeon]` ; `audio-bindings.js` : `audioCurrentContext()` ajoute `:town` (type du lieu) et le thème via `AUDIO_DUNGEON_THEME` ; `tools/audio-manifest.mjs` `MUSIC_BASE` ; gate musique 15 → 20 Mo | `src/core/audio.js`, `src/application/audio-bindings.js`, `tools/audio-manifest.mjs`, `tools/validate-project.mjs`, `src/assets/audio/music/*.mp3` |
| **SND-05** effets | 22 WAV mono 16 bits 22,05 kHz (silence d'attaque retiré, fondu de 10 ms, crête −9 dBFS ; `tools/audio-cc0-pack.py --sfx`) dans `src/assets/audio/sfx/` ; aucun changement moteur (`audioPlaySfx` préférait déjà le fichier ; recette = repli) ; manifeste `sfx` 22 entrées | `src/assets/audio/sfx/*.wav`, `src/assets/audio/manifest.json` |
| Crédits / tests | `docs/CREDITS.md` : 12 lignes de pistes + tableau des 22 effets (source, dossier de la collection, durée) ; `r2` (20 pistes, budget 20 Mo) ; `r3` (chaînes `town` / thèmes, 20 musiques + 22 effets au manifeste, version 7.5.1, `LIVRAISON-V7-R3b.md`) | `docs/CREDITS.md`, `tests/r2-player-feedback.test.js`, `tests/r3-player-feedback.test.js` |

### 2. État monnaie / roadmap

Aucun changement d'économie ni de schéma. Roadmap : §4b ligne **SND-05** dans la table R3, §0.3 D31
complété, §11 ligne R3 (7.5.1). Captures inchangées (`docs/captures/v7-r3-*.png`, désormais en
256 couleurs). **Prochaine action : P4a (ACH-01, ACH-02, HLP-ach).**

---

## Passe V7-R3 — « Retours joueurs octobre (2) : sons officiels, téléphone, mine, guides, donjons, relance auto des expéditions, immunités » · version **7.5.0** (2026-10-15)

Passe demandée par le joueur **avant** P4a : huit retours de jeu, trois défauts d'affichage sur téléphone
et la demande de **sons / musiques des jeux officiels**. Portes : `npm run check` vert (validate +
prettier + i18n + build + ordre des chunks + **1 312 tests / 0 échec** : 1 294 de 7.4.0 + 18 nouveaux
`tests/r3-player-feedback.test.js`), `eslint --quiet` 0 erreur, 4 smokes Chromium sur le bundle de
production (`smoke-p0a`, `smoke-p0b-forms`, `smoke-p1`, `smoke-p2`), `validate-project` étendu
(manifeste audio synchronisé, budget cris + effets ≤ 15 Mo, section « cris » des crédits), captures
bureau + iPhone 12. **Aucun changement de schéma de sauvegarde** (`SAVE_VERSION` = 4) :
`G.automation.autoDungeonRelaunch` / `G.automation.autoDungeonMode` sont des clés optionnelles.

### 0. Ce que ça change pour le joueur

1. **Sons et musiques des jeux officiels** (décision D31) — le dépôt ne peut pas les redistribuer : c'est
   **`download_assets.bat`** (racine du projet, aussi `npm run download:audio`) qui les installe sur ton
   poste, dans `src/assets/audio/`. Automatiquement : les **cris officiels des 386 Pokémon** (dépôt
   PokeAPI/cries, même source que les sprites) — joués quand l'adversaire apparaît, quand un Pokémon
   tombe K.O. (ralenti), quand tu envoies un Pokémon et quand tu ouvres sa fiche. Au choix : tes
   **musiques et effets** listés dans `tools/audio-sources.txt` (`music/battle_wild.mp3 = URL ou
   chemin`, `sfx/catch.ogg = …`) — le jeu les prend **sans toucher au code** : une musique par lieu
   (`loc_<id>`), par champion (`trainer_<id>`), par donjon (`dungeon_<id>`), par type de combat
   (sauvage, dresseur, arène, Ligue, légendaire, errant, gardien), avec repli sur les 8 boucles CC0
   livrées ; un effet déposé remplace l'effet synthétisé du même nom. Relance `regen_dist.bat` ensuite.
2. **Téléphone** — le choix du starter n'est plus caché par l'en-tête ; la pop-up des Poké Balls tient
   dans l'écran ; l'écran « Entrer dans une sauvegarde » affiche la carte en pleine largeur.
3. **Mine** — l'outil courant est **visible** : chip pressée avec icône, coût ⚡ et zone d'effet, ligne
   « Outil : … » sous les chips, **aperçu de la zone au survol** de la grille et **impact animé** sur
   les cases frappées.
4. **Coûts des automatisations** — **Réglages → « Automatisation — coûts »** : tableau de tous les
   modules (éclosion auto 500 PQ, remplissage auto 1 000 PQ, relance auto des combats 2 500 PQ, relance
   auto des donjons 5 000 PQ, emplacement d'entraînement automatisé 1 000 PQ, mine automatique
   1 000 💎) avec l'état acheté / en boutique. Les boutiques **ne montrent plus** une amélioration
   déjà achetée.
5. **Guides** — une page **« Chiffres clés »** clôt neuf rubriques (carte, combat, mine, pension,
   entraînement, économie, automatisation, sauvegardes & AFK, donjons) : taux de rencontre
   (76 / 20 / 4 %), errant 1 % niveau 75, brillant 1/4096 (1/2048 avec le Charme), gains par K.O.,
   coûts et déblocages, prix de la Master Ball, échelle du personnel, péages / étages / bonus de donjon,
   plafond AFK 12 h… Toutes ces valeurs sont **lues dans le code** (elles suivront tout rééquilibrage).
6. **Donjons** (décision D29) — le **gardien est tiré au hasard** parmi les Pokémon rares du lieu (au
   Parc Safari : Leveinard, Minidraco, Tauros, Kangourex… et plus seulement « le meilleur ») et **≈ 5 %
   des combats ordinaires** opposent un rare : **tous les Pokémon d'un donjon sont obtenables**. Le
   gardien peut être brillant.
7. **Relance automatique des expéditions** (décision D30) — nouvelle amélioration en boutique,
   **5 000 PQ**, achat unique, aucun coût par relance : quand une expédition se termine (gardien vaincu
   ou équipe K.O.), une nouvelle démarre **5 s plus tard** sur le même donjon avec le **même mode de
   pilote** (bandeau avec Annuler et interrupteur dans la fenêtre Combat). Jamais sans jetons (message),
   si tu as quitté le lieu, en combat ou équipe K.O. **Pendant l'absence**, le rattrapage relance aussi
   les expéditions (péage prélevé à chaque départ) : le récapitulatif indique « Expéditions relancées »
   avec le nombre de victoires et de K.O.
8. **AFK et règles de combat** — vérifié et désormais écrit dans le guide : le rattrapage hors ligne
   joue **le vrai moteur de combat** (table des types, talents et immunités, objets tenus, statuts,
   effets des attaques) ; un test de parité garde la règle.
9. **Immunités affichées** — le multiplicateur sous une attaque tient compte des talents d'immunité de
   l'adversaire : **Sol sur Lévitation affiche ×0** (et non ×2), comme Paratonnerre, les talents
   d'absorption et « flash », Garde Mystik (×0,2) ; talent caché compris.

### 1. Détail technique

| Ticket | Correctif | Fichiers |
|---|---|---|
| **SND-04** audio drop-in | `core/audio.js` : `audioLoadManifest()` (une lecture de `src/assets/audio/manifest.json` après le déverrouillage, jamais avant), `audioSetManifest`, `audioMusicChain(context)` (contextes composés `map:<région>:<lieu>`, `battle:wild|trainer|gym[:champion]|league|legendary|roaming|boss`, `dungeon:<lieu>`, `menu` → chaîne du plus précis au plus général), `audioMusicTrackFor` choisit la première clé **disponible** (manifeste, sinon pistes livrées), `audioPlaySfx` joue le fichier `sfx/<nom>` s'il existe (cache LRU 64 tampons décodés) sinon la recette, nouveau `audioPlayCry(dex, {gain, rate})` (forme → espèce, anti-rafale 120 ms) ; `audioState()` expose `manifestState`, `musicContext`, `fileSfx`, `cries`. `application/audio-bindings.js` : `audioCurrentContext()` composé, table `AUDIO_EVENT_CRY` (apparition après l'effet brillant / errant, K.O. des deux camps à 0,75, `combat:player-sent`, `ui:poke-detail`), jamais sous `PW_FF` ; émetteurs ajoutés dans `battle-switch.js` et `poke-modal.js` (une fois par fiche ouverte). `tools/audio-manifest.mjs` (`--check`, `--list`), appelé par `npm run build` ; `tools/download_assets.py` : `download_cries()` (PokeAPI `latest` → `legacy`, 16 fils), `download_audio_sources()` (`tools/audio-sources.txt`, fichier par fichier ou dossier entier `music/ = <dossier>`), `write_audio_manifest()` (Node ou Python), `--audio-only` ; `download_assets.bat` (racine, `audio` en argument), `tools/sprites/download_sprites.bat` redirige ; `validate-project` : crédit exigé pour les pistes **livrées** seulement, manifeste à jour, budget cris + effets, `audioPlayCry` interdit dans `combat/` ; `docs/CREDITS.md` sections cris / assets officiels | `src/core/audio.js`, `src/application/audio-bindings.js`, `src/application/combat/battle-switch.js`, `src/ui/game/poke-modal.js`, `tools/audio-manifest.mjs`, `tools/download_assets.py`, `tools/audio-sources.txt`, `download_assets.bat`, `tools/validate-project.mjs`, `docs/CREDITS.md`, `package.json` |
| **MOB-01/02/03** | `#starter-modal { z-index: 1200 }` (en-tête 950, barre mobile 961) ; `@media (max-width: 520px)` : `.save-menu-list-shell` en `30px 1fr 30px`, `.save-slot` pleine largeur, stats en 3 colonnes ; `PICKER_CSS` : `.pw-ball-box` 96 vw, grille `1fr 46px 46px` | `design-system.css` (bloc MOB), `pokeball-window.js` |
| **R3-01** mine | `MineWindowView` : chips `aria-pressed`, `data-tool`, icône (`h.raw`), `⚡coût`, `title` ; `.mine-tool-hint` ; `.mine-grid[data-mine-tool]` ; `mine-ui.js` : `MINE_TOOL_SVG`, `mineToolIcon`, `_mineToolHint`, `installMineAimPreview` (survol → `.is-aim` sur `mineToolCells`), `_mineStrikeFx` (`.pw-mine-strike`) dans `playMineDigFx(cells, hit)` ; `digMineTile` passe `{tool, cost, x, y}` ; clés `mine_tool_hint`, `mine_tool_area_*` | `MineWindowView.js`, `mine-ui.js`, `mine.js`, `design-system.css` |
| **R3-02** coûts | `buildSettingsModel().automation` (lignes depuis `AUTOMATION_UPGRADE_COSTS`, `MINE_AUTO_COST`, `TRAINING_AUTOMATION_SLOT_COST`, état via `isAutomationPurchased` / `G.mine.automation.purchased`) ; `SettingsModalView` : `.settings-auto-table` ; clés `settings_automation_*` | `settings.js`, `SettingsModalView.js`, `design-system.css` |
| **R3-03** guides | `guideKeyValues()` + `keyNumbersPage()` dans `guide-sections.js` (lecture de `BUCKET_ODDS`, `ROAMING_*`, `SHINY_BASE_RATE`, `AUTOMATION_UPGRADE_COSTS`, `AUTO_DG_DELAY_MS`, `MINE_TOOL_DEFS` / `mineToolEnergyCost` / `MINE_ENERGY_UPGRADE_COSTS` / `MINE_AUTO_COST`, `HATCHERY_SLOT_UPGRADE_COSTS`, `TRAINING_*`, `STAFF_LADDERS`, `masterBallPrices()`, `moneyPerKillForLocation` sur `LOCATIONS`, `DUNGEON_TOLLS` / `DUNGEON_RULES` / `DUNGEON_AUTO_UNLOCK_CLEARS` / `DUNGEON_RARE_ON_COMMON_TILE`, `OfflineEngine.MAX_MS`, `getLocName`, `getChampName`) ; constantes publiées sur `globalThis` là où elles manquaient (`DUNGEON_TOLLS`, `TRAINING_*`, `HATCHERY_SLOT_UPGRADE_COSTS`, `STAFF_CYCLE/LADDERS`) ; 10 clés `guide_key_*` FR + EN sans nombre en dur ; page `guide_auto_dg_relaunch` | `guide-sections.js`, `currency.js`, `training.js`, `hatchery.js`, `automation.js`, `fr/ui.js`, `en/ui.js` |
| **R3-04** gardien | `_dgBossSpecies(G, fallback, rng)` : tuples `[id, min, max, rareté]` → tirage uniforme dans le premier seau non vide (rare → peu commun → commun) ; tables sans étiquette : ancienne règle ; `DUNGEON_RARE_ON_COMMON_TILE = 0.05` lu par `ecs-gameplay-systems` (`bucketHint` commun → rare) ; `rollShiny(bossId)` | `encounter-system.js`, `ecs-gameplay-systems.js` |
| **R3-05** relance donjon | `application/automation/auto-dungeon-relaunch.js` (`AUTO_DG_KEY`, `AUTO_DG_DELAY_MS = 5000`, `isAutoDungeonRelaunchOwned/Enabled`, `autoDungeonRelaunchCheck(loc, {offline, arming})`, `scheduleAutoDungeonRelaunch`, `cancel…`, `_dgaFire` → ferme le résumé de fin de combat (parité AUTO-01) puis `startAutoDungeonRun` (+ `dungeonSetAuto(mode)`), `renderAutoDungeonRelaunchBar` dans `#dungeon-auto-relaunch`) ; `AUTOMATION_UPGRADE_COSTS.autoDungeonRelaunch = 5000` ; `dungeon-run.js` `_dgRelaunchHook` à la fin de `dungeonOnWipe` / `dungeonOnBossDefeated` (jamais sous `PW_FF`) ; `dungeon-offline.js` : `_dgoRelaunchAllowed()` → `startAutoDungeonRun(loc, {offline:true})`, `DUNGEON_OFFLINE_RELAUNCH_MS = 5000`, `DUNGEON_OFFLINE_MAX_RUNS = 400`, compteurs `runs / clears / wipes` ; `offline-engine.js` récap `afk_panel_dungeon_runs` + `afk_dungeon_runs_note` | `auto-dungeon-relaunch.js`, `automation.js`, `dungeon-run.js`, `dungeon-offline.js`, `offline-engine.js`, `index.html`, `main.js`, `shop-panel.js`, `location-info.js`, `auto-relaunch.js`, `battle-flow.js` |
| **R3-06** boutique | rayon générique `for (const upKey of ['autoRelaunch', 'autoDungeonRelaunch'])`, `if (owned) continue;` ; `shopItemsModel` publié pour les tests | `shop-panel.js` |
| **R3-07** parité AFK | test : `combat/` sans `PW_FF`, `OFFLINE_MUTED_FNS` ne contient aucune fonction de combat ; guide AFK « vrai moteur » | `tests/r3-player-feedback.test.js` |
| **R3-08** immunités | `application/combat/talent-immunity.js` : `TALENT_IMMUNE_TYPE` (Lévitation, Paratonnerre, absorptions, flash…), `pokeActiveTalents` (principal + caché), `talentImmunityFor`, `battleTalentTypeMult` (Garde Mystik 0,2), `battleDisplayedEff` ; `performAttack` lit la même table ; `battle-ui.js` / `battle-team-ui.js` affichent `battleDisplayedEff` | `talent-immunity.js`, `battle-attack.js`, `battle-ui.js`, `battle-team-ui.js`, `main.js` |

Budgets : `poke-modal.js` et `hatchery.js` compactés (surface classique en un `Object.assign`) pour
rester sous leurs plafonds ; `battle-attack.js` 2 547 lignes (plafond) ; typeof `ui/game` 1 141 / 1 141.

### 2. Tests ajoutés (`tests/r3-player-feedback.test.js`, 18)

R3-SND-04a…e (chaîne de repli, manifeste lu une fois / piste déposée prioritaire, effets fichier +
cris + anti-rafale + cache, abonnements des cris, contrats de source / script / .bat / crédits / gate) ·
R3-MOB · R3-01 (vue Mine) · R3-02 (modèle Réglages) · R3-06 (rayon des améliorations) · R3-05
(`guideKeyValues`, pages « Chiffres clés », paramètres FR/EN, page relance donjon) · R3-D29
(`_dgBossSpecies`) · R3-D30a…d (compte à rebours → `startDungeonRun` + mode, garde-fous, câblage, étape
hors-ligne avec relances) · R3-08a/b (immunités affichées, table partagée, parité AFK) · R3-00 (version,
docs). Mis à jour : R2-04a (rayon générique), R2-05d (contextes composés), `dbt07` charge
`talent-immunity.js`, `training-move-unlock` (surface nominative conservée).

### 3. État monnaie / roadmap

PQ : nouveau puits de 5 000 PQ (`autoDungeonRelaunch`, sommé par `economy-sim`) ; péages de donjon
prélevés aussi par les relances hors-ligne (plafond 400 expéditions par rattrapage). Roadmap : §4b
sous-section **R3**, §0.3 D29–D31, §11 ligne R3, §12 point 17 clos / point 18 ajouté et clos. Captures
`docs/captures/v7-r3-*.png`. **Prochaine action : P4a (ACH-01, ACH-02, HLP-ach).**

---

## Passe V7-R2 — « Règle les bugs et fais le son + auto relance » · version **7.4.0** (2026-10-15)

Passe demandée par le joueur **avant** P4a : deux bugs (Entraînement, Donjon absent du AFK), la relance
automatique (AUTO-01, décision §12-16) et le son / la musique (SND-01…03, décision §12-17). Portes :
`npm run check` vert (validate + prettier + i18n + build + ordre des chunks + **1 294 tests / 0 échec** :
1 262 de 7.3.2 + 32 nouveaux `tests/r2-player-feedback.test.js`), `eslint --quiet` 0 erreur, 4 smokes
Chromium sur le bundle de production (`smoke-p0a`, `smoke-p0b-forms`, `smoke-p1`, `smoke-p2`),
`validate-project` étendu (crédits audio, budget ≤ 15 Mo, `combat/` sans audio), scénarios Playwright
rejoués (achat en boutique → défaite → compte à rebours → relance ; pilote de donjon + rattrapage 3 h ;
relancement du jeu après 2 h ; déverrouillage audio, contexte musical, onglet caché, réglages Son).
**Aucun changement de schéma de sauvegarde** (`SAVE_VERSION` = 4) : `G.automationUpgrades.autoRelaunch`
et `G.automation.autoRelaunch` sont des clés optionnelles ; les préférences audio vivent dans
`localStorage` (`pokeworld_audio_prefs`), hors sauvegarde.

### 0. Ce que ça change pour le joueur

1. **Entraînement** — le duel d'entraînement **s'affiche de nouveau** dans la fenêtre Combat (il se
   jouait en coulisses derrière « Exploration au repos »). Un slot occupé garde la description de son
   vrai mode.
2. **AFK et donjons** — une **expédition de donjon en cours progresse pendant ton absence** : le pilote
   rejoue le plateau (mode réglé, sinon **récolte**), descend, affronte le gardien ; le récapitulatif AFK
   affiche les combats en donjon, les paliers, les jetons et l'issue (gardien vaincu / équipe K.O. / en
   cours). Les combats sauvages reprennent ensuite sur le lieu courant (hors donjon).
3. **Rattrapage au relancement du jeu** — bug ancien, trouvé en testant le point 2 : fermer le jeu puis
   le rouvrir ne déclenchait **jamais** le rattrapage (seul le retour sur un onglet resté ouvert
   marchait). Désormais, relancer le jeu après une absence rejoue bien la chaîne sauvage / l'expédition.
4. **Relance automatique** (nouvelle amélioration) — en vente dans **toutes les boutiques** contre
   **2 500 points de quête**, achat unique, **aucun coût par relance**. Après une défaite en combat
   sauvage, l'écran de repos affiche « Relance automatique dans 5 s… » avec **Annuler** et un
   interrupteur **Activer / Désactiver** ; le combat repart tout seul sur le lieu courant. Jamais en
   donjon (le pilote s'en charge) ni en combat scénarisé. Page « Relance automatique » dans le guide
   « Automatisation ».
5. **Son et musique** — effets sonores (clic, lancer de ball, capture, K.O., niveau, évolution,
   éclosion, achat, badge, Ligue, coffre, quête, trésor…), **son spécial quand un brillant apparaît et
   quand il est capturé**, musiques d'ambiance par contexte (menu, carte Kanto / Johto / Hoenn, combat
   sauvage, dresseur, donjon, boss). **Réglages → Son** : coupure et volume séparés pour les effets et
   la musique (défaut : effets 80 %, musique 40 %), mémorisés sur l'appareil. Le son démarre après un
   premier clic (règle des navigateurs) ; **la musique se met en pause quand l'onglet n'est pas
   visible**. Musiques libres de droits (CC0, Juhani Junkala — `docs/CREDITS.md`), aucun extrait des
   jeux officiels.

### 1. Détail technique

| Ticket | Correctif | Fichiers |
|---|---|---|
| **R2-01** Entraînement | `design-system.css` §32.6 masque `#battle-active-scene:not(.is-live)` en `!important` ; `renderTrainingBattlePanel` posait `display:flex` en ligne → invisible. La fonction pose / retire la classe **`is-live`** (contrat de la fenêtre Combat) et masque l'écran de repos pendant un duel ; `trainingModeModel(mode, enabled, slot, busy)` garde la vraie description d'un slot occupé | `application/combat/training.js` |
| **R2-02** Donjon AFK | nouvelle étape hors-ligne **`dungeon`** enregistrée avant `wild-battles` : rejoue `_dgAutoStep({ offline: true })` + `offlineRunBattleFfLoop` sur `currentDungeonRun()` (mode `run.auto` ou `'farm'`, réglage restauré ensuite — **D26**), budget en secondes partagé, résultat `{ fights, floors, floor, depth, cleared, wiped, pilot, mode, tokens, secondsUsed, steps }` ; `offlineCanWildBattle` refuse les lieux de type donjon ; recap : 3 lignes + note d'issue (`afk_dungeon_*`, FR/EN) ; `dungeon-run.js` : gardes `PW_FF` (pas de `setTimeout` de pilote, pas de modale) | `application/save/dungeon-offline.js` (nouveau), `application/save/offline-engine.js`, `application/world/dungeon-run.js`, `main.js`, i18n |
| **R2-02b** rattrapage au boot | `loadGame` relève `prevSeen` / `prevWild` **avant** `normalizeLoadedState` (qui sauvegarde → ré-estampille « vu » et remet `wildSessionActive` à faux) → `offlineNoteBootSeen(prevSeen, prevWild)` ; le moteur consomme `bootGap` **après** `offlineAcquireLock()` (le verrou de l'onglet fermé reste valide 10 s) et `offlineBootWildActive` autorise la chaîne sauvage une seule fois | `application/save/save.js`, `offline-engine.js` |
| **R2-02c** pilote figé | `_dgNearestPath` renvoie un chemin de longueur 1 quand le pilote se tient sur une case non faite → `_dgAutoStep` ré-engage la case **sur place** (`dungeonMoveTo` in place) | `application/world/dungeon-run.js` |
| **AUTO-01** | `AUTOMATION_UPGRADE_COSTS.autoRelaunch = 2500` (PQ, sommé par `economy-sim`) ; boutique : entrée `kind: 'upgrade'` (achat unique, `purchaseAutomationIfNeeded`, « Acheté ») ; module `auto-relaunch.js` : `scheduleAutoRelaunch()` armé par `endBattle()` quand la chaîne sauvage s'arrête sur une équipe K.O. (relevé **avant** le soin R1-06, hors donjon) et par la fin du rattrapage hors-ligne (`battlesRes.lost`), compte à rebours 5 s (`AUTO_RELAUNCH_DELAY_MS`), `cancelAutoRelaunch()`, `toggleAutoRelaunch()` (`G.automation.autoRelaunch`, activé par défaut après l'achat), `autoRelaunchAllowedHere()` (jamais `PW_FF`, run actif, lieu donjon, combat actif, sans table sauvage) ; bandeau `#battle-auto-relaunch` dans l'écran de repos ; page de guide ; 12 clés i18n FR/EN | `application/automation/{automation,auto-relaunch}.js`, `ui/game/shop-panel.js`, `combat/battle-flow.js`, `save/offline-engine.js`, `ui/game/guide-sections.js`, `index.html`, CSS, i18n |
| **SND-01** moteur | `core/audio.js` (sans import) : `AudioContext` unique créé au premier geste (`pointerdown` / `keydown` / `touchstart`, capture), bus effets (gain WebAudio) et musique (`HTMLAudioElement` par piste, `loop`), préférences `audioPrefs()` fusionnées avec `AUDIO_DEFAULTS` et persistées (`audioSetEnabled`, `audioSetVolume` 0–1 ou 0–100, `audioToggle`), `audioSetHidden()` sur `visibilitychange` (pause + effets ignorés), aucune requête réseau avant un geste (vérifié Playwright : 0 requête `assets/audio` au boot) | `core/audio.js`, `application/save/settings.js` (`toggleAudioBus`, `setAudioVolume`, modèle `sound`), `ui/views/SettingsModalView.js`, CSS, i18n |
| **SND-02** effets | ≈ 23 recettes procédurales (`AUDIO_SFX`) ; `application/audio-bindings.js` : un abonnement par événement sur `window.EventBus` (`AUDIO_EVENT_SFX`), écouteur DOM `click` pour l'effet de clic, rien pendant `PW_FF` ; **émissions ajoutées** côté jeu via le nouveau `pwEmit` du pont classique (`battle:enemy` dans `startBattle` / `spawnNextWild` avec `shiny`, `roaming`, `boss` ; `catch:throw` / `catch:fail` ; `POKEMON_CAUGHT` enrichi `shiny` ; `combat:enemy-fainted` / `combat:player-fainted` ; `pokemon:level-up` ; `pokemonEvolved` ; `pokemonHatched` ; `bossDefeated` ; `dungeon:chest` ; `quest:completed` ; `mine:treasure` ; `ui:notify` ; `ui:window-open` ; `battle:end`) — **0 import / appel audio dans `combat/`** (gate `validate-project`) | `engine/runtime/classic-bridge.js`, `combat/*`, `encounter-system.js`, `breeding/hatchery.js`, `world/dungeon-run.js`, `quests/quest-core.js`, `economy/mine.js`, `core/game-utils.js`, `ui/game/fullscreen-panel.js` |
| **SND-03** musiques | 8 boucles CC0 (`src/assets/audio/music/*.mp3`, 6,7 Mo, ré-encodées ≈ 96 kb/s) ; `audioMusicTrackFor(ctx)` (régions futures → piste la plus récente) ; `audioSetMusicContext()` : fondu enchaîné 1 s (`_fadeTo`), reprise de position par piste, demande mémorisée avant le geste / onglet caché / musique coupée ; `audioCurrentContext()` (menu · `map_<région>` · `battle_wild` · `battle_trainer` · `battle_boss` pour Ligue, gardien, légendaire de quête, errant · `dungeon`), rafraîchi sur `battle:enemy` / `battle:end` / `quest:completed` + horloge 500 ms (`unref`) ; `copy-runtime-assets.mjs` copie `src/assets/audio` ; `docs/CREDITS.md` (une ligne par piste, vérifiée par `validate-project`) | `core/audio.js`, `application/audio-bindings.js`, `tools/copy-runtime-assets.mjs`, `tools/validate-project.mjs`, `docs/CREDITS.md` |

Écart assumé vis-à-vis de l'acceptation SND-02 (« formats `.ogg` + `.m4a` ») : les effets sont
synthétisés (zéro fichier, zéro réseau, zéro crédit à gérer) — noté dans la roadmap §4b.

### 2. Tests ajoutés (`tests/r2-player-feedback.test.js`, 32)

R2-01…01d (Entraînement : `is-live`, écran de repos, modèle de mode) · R2-02…02h (étape `dungeon` :
nettoyage, budget épuisé, pilote restauré, case en attente, wipe, blocage, sans run, ordre des étapes) ·
R2-03…03f (rattrapage au boot : `offlineNoteBootSeen`, garde donjon, ordre dans `save.js`) · R2-04…04e
(AUTO-01 : prix lu de la constante, boutique, compte à rebours → `exploreArea()`, annulation,
interrupteur, garde-fous, `endBattle` avant / après soin, rattrapage perdu) · R2-05…05f (SND : muet sans
geste, 0 piste chargée, préférences, onglet caché, 8 pistes, fondu, contexte musical, abonnements, brillant
apparu / capturé, silence `PW_FF`, contrats de source et crédits). `tests/passe30-beta-fixes.test.js`
l.365 : attente mise à jour (`offlineBootWildActive`).

### 3. État monnaie / roadmap

PQ : nouveau puits de 2 500 PQ (`economy-sim` : total PQ mis à jour automatiquement). Aucun autre
changement d'économie (relances gratuites par décision). Roadmap : §4b sous-section **R2** (+ AUTO-01 et
SND-01…03 marqués livrés), §0.3 D26–D28, §11 ligne R2 (P4b sans AUTO-01, P4c absorbée), §12 points 16
et 17 clos. Captures `docs/captures/v7-r2-*.png`. **Prochaine action : P4a (ACH-01, ACH-02, HLP-ach).**

---

## Passe V7-R1c — « Il reste des bugs » (6 retours joueur) · version **7.3.2** (2026-10-15)

Passe de correctifs demandée par le joueur **avant** de reprendre la roadmap (P4a). Six points, six
corrigés. Portes : `npm run check` vert (validate + prettier + i18n + build + ordre des chunks +
**1 262 tests / 0 échec** : 1 243 de 7.3.1 + 19 nouveaux `tests/r1c-player-feedback.test.js`),
`eslint --quiet` 0 erreur, 4 smokes Chromium sur le bundle de production (`smoke-p0a`, `smoke-p0b-forms`,
`smoke-p1`, `smoke-p2`), `css-parity` 7.3.1 → 7.3.2 : **0 différence de cascade** (seule la pulsation
animée `.pw-tuto-target`, échantillonnée à un instant différent, ressort — pas un changement de style),
scénarios Playwright rejoués (combat de champion, pincement mobile 390 px, vente de trésor, fenêtre
Monnaies). **Aucun changement de schéma de sauvegarde** (`SAVE_VERSION` = 4).

### 0. Ce que ça change pour le joueur

1. **Pilote automatique des donjons** — le mode **« plateau »** fait désormais **tout** le plateau
   (chaque coffre, chaque combat, chaque case dans le brouillard) **avant** d'engager le boss ; le mode
   **« coffres »** ouvre **tous** les coffres du palier avant le boss (en contournant les combats quand
   un détour existe) ; le mode **« boss »** file au boss comme avant. Dans tous les cas, la case du boss
   n'est plus un raccourci : le pilote ne la traverse jamais par accident. Après la victoire, il descend
   dans la même foulée.
2. **Combats de dresseurs / champions** — le Pokémon adverse est de nouveau affiché **exactement comme
   un sauvage** : grande carte, paysage, **barres d'attaques visibles**. La carte du dresseur reste
   affichée, au-dessus de la rangée.
3. **Carte** — sur téléphone (et à la souris), le **zoom et le cadrage survivent au clic** sur un lieu ;
   ils ne sont remis à zéro qu'au changement de région.
4. **Diamants** — ils ont **une source, déjà en place** : les **trésors de la Mine** (Boule de Fer,
   Poussière Étoile, Pépite, Os rare, Morceau d'Étoile, Grosse Pépite, Écaille Cœur) se revendent dans
   le **Sac → onglet Trésors → Revendre** contre des 💎 ; la Mine s'ouvre avec la Cave Taupiqueur. Ce qui
   manquait, c'était de le **savoir** : la colonne 💎 de la fenêtre Monnaies n'apparaissait qu'après le
   premier gain, alors que les prix en diamants (outils de la mine, Master Ball…) étaient déjà affichés.
   Désormais la colonne 💎 est **visible (à 0) dès que la Mine est ouverte**, et le guide « Économie »
   commence par une page **« Monnaies »** : les 5 monnaies, d'où elles viennent, et la valeur réelle de
   chaque trésor.
5. **Sac → Trésors** — plus de « 175💎₽ » : « Chaque exemplaire vaut 100💎 », boutons « Vendre x1
   (+100💎) », message « Vendu ×1 Pépite : +100 💎 ». Les descriptions de la Pépite et de la Poussière
   Étoile parlent de diamants (plus de « worth 5,000₽ »).
6. **Icône du jeu** — l'icône fournie (Poké Ball illustrée : prairie Pikachu en haut, fond marin
   Carapuce en bas) remplace la Poké Ball endormie : favicon, icône Android 192, icône Apple 180 et
   marque de la barre de titre.

### 1. Causes et correctifs

| # | Cause | Correctif |
|---|---|---|
| 1 | `_dgAutoStep` ciblait « la case à faire la plus proche » **boss compris**, et le BFS traversait la case du boss comme une case ordinaire : dès que le boss devenait le plus proche (ou un raccourci), le pilote l'engageait | `src/application/world/dungeon-run.js` : `_dgBfsPath(run, targetId, fightCost)` **n'entre jamais** sur `run.bossTile` sauf si c'est la cible, `fightCost` pénalise les combats (mode coffres) ; `_dgNearestPath` ; `_dgAutoStep` réécrit : plateau → `isLoot ∨ !revealed` tant qu'il en reste ; coffres → `isChest` tant qu'il en reste ; sinon boss, puis `dungeonDescend()` quand `bossDefeated && pos === bossTile` ; `_dgAutoKick` relance le pilote. Fichier toujours sous son plafond (1 639 / 1 659 l.) |
| 2 | `renderBattleTeamRow()` **préfixait** la carte du dresseur dans `#battle-team-row` ; or la rangée identifie l'ennemi comme `#battle-team-row > .poke-card:first-child` (52 règles CSS, `battle-attack.js`, `battle-ui.js`) → la carte ennemie héritait du style des cartes de banc (138 px, `.poke-moves` masqué) | `index.html` : `<div id="battle-trainer-host">` juste avant la rangée ; `battle-team-ui.js` : la carte du dresseur est rendue dans cet hôte (repli : ancien comportement si l'hôte manque) ; `design-system.css` : `#battle-trainer-host:not(:empty) { margin-bottom: 8px }` (sans `!important`) |
| 3 | `renderMap()` (appelée par chaque `clickLocation`) remettait le `viewBox` d'origine alors que l'état du pincement (`__pwMapZoom/PanX/PanY`) survivait | `map-render.js` : `__pwMapZoomRegion` mémorise la région rendue ; même région et zoom > 1 → `applyMapViewBox()` ré-appliqué en fin de rendu ; région différente → zoom remis à 1 |
| 4 | Pas de bug de crédit (`sell-treasure` → `wallet.diamonds`, vérifié) ; **découvrabilité** nulle : `revealed.diamonds` n'était posé qu'au 1er gain | `currency.js` : `diamondTreasureList()` (trésors triés, chiffres pour le guide) et `diamondsDiscoverable()` (révélé **ou** Mine ouverte) utilisés par `currencySnapshot()` et `currency-window.js` ; `guide-sections.js` : page « Monnaies » (`guide_currencies` / `guide_currencies_desc` FR+EN, `{treasures}` et `{mine}` lus dans le code — TXT-01) ; `guide_treasures_desc` FR/EN mentionne les diamants |
| 5 | `m.treasure_sell_sub` = « … vaut <b>{value}₽</b> » alors que `inventory-actions.js` passe déjà « 175💎 » | gabarit FR/EN sans unité ; descriptions EN `nugget` / `stardust` sans prix en dur ; FR : « se revend contre des diamants » |
| 6 | Les trois fichiers d'icône contenaient encore l'ancienne Poké Ball « zzz » (1024² chacun) | `Icon.png` du joueur (1024²), `icon-192.png` et `icon-180.png` redimensionnés (PIL, LANCZOS) — copiés dans `dist/` par `copy-runtime-assets` |

### 2. Tests

`tests/r1c-player-feedback.test.js` (19) : simulation du pilote sur plateaux 7×5 et 9×6 (plateau :
100 % coffres / combats / révélé au moment du boss, ×3 tirages ; coffres : 100 % coffres ; boss : direct
puis descente), garde-fous de source (BFS/boss, hôte dresseur, zoom), cohérence `DIAMOND_VALUES` ↔
`items-data.diamondValue`, révélation 💎 à l'ouverture de la Mine, page « Monnaies » sans chiffre en dur,
gabarits de vente sans unité, dimensions PNG des icônes. `37-D5` (passe 36) adapté : il engageait le
boss « quand il devient le plus proche », ce qui est précisément le bug corrigé.

### 3. Prochaine action

Passe **P4a** (ACH-01, ACH-02, HLP-ach) — sauf validation préalable des propositions AUTO-01 (2 500 PQ /
5 s ?) et SND-03 (musique CC0 ≤ 15 Mo, 40 % par défaut ?).

---

## Hotfix V7-R1b — donjon : reprise après rechargement · version **7.3.1** (2026-10-15)

Correctif **urgent** remonté par le joueur : « des joueurs sont lock dans les donjons ». Après un
**rechargement de la page au milieu d'une expédition**, le joueur ne pouvait plus rien faire : ni
combattre, ni se déplacer, ni sortir. Portes : `npm run check` vert (validate + prettier + i18n + build +
ordre des chunks + **1 243 tests / 0 échec** : 1 230 de 7.3.0 + 13 nouveaux
`tests/r1b-dungeon-resume.test.js`), `eslint --quiet` 0 erreur, smokes Chromium `smoke-p0a`, `smoke-p1`,
`smoke-p2` sur le bundle de production, scénarios de rechargement rejoués en Chromium (ordinateur **et**
mobile 390 px) : reprise simple, F5 en plein combat, pilote automatique, équipe K.O., changement de
sauvegarde. **Aucun changement de schéma de sauvegarde** (`SAVE_VERSION` = 4) : les expéditions déjà
sauvegardées reprennent telles quelles après mise à jour.

### 0. Ce que ça change pour le joueur

- **Un F5 (ou une fermeture d'onglet) en pleine expédition ne bloque plus rien** : au retour, l'expédition
  **reprend là où elle en était** — même donjon, **même palier, même carte (brouillard, coffres ouverts,
  cases battues), même sac, même position**. Le bandeau d'expédition et la grille réapparaissent dans la
  fenêtre de combat, un message « Expédition reprise au palier N/M : choisis une case… » le confirme.
- **Si la page a été rechargée en plein combat** : le combat interrompu n'est pas compté, la case reste
  **à battre** (un clic dessus relance l'engagement). Rien n'est perdu, rien n'est offert.
- Le **pilote automatique** (vétérans) reprend seul après le rechargement, dans le mode choisi.
- Le bouton **« Combattre au palier N »** de la fenêtre Lieu **engage vraiment** un combat (il marche
  jusqu'au combat le plus proche de la grille, règle 39f) ; avant, il ne faisait rien en expédition —
  c'était l'un des verrous ressentis.
- Cas limite : équipe **entièrement K.O.** au moment du rechargement → l'expédition est soldée comme une
  défaite (règle existante : moitié du sac conservée, péage remboursé au premier palier, équipe soignée),
  et le joueur est libre de ses mouvements au lieu de rester enfermé.

### 1. Cause

`G.dungeonRun` (palier, carte, position, sac, pilote) est **bien sauvegardé**, mais **tout le câblage
d'exécution était perdu au démarrage** :

| Symptôme | Cause |
|---|---|
| Écran « Exploration au repos » affiché, bandeau d'expédition invisible | le drapeau `<html data-dungeon-run="1">` (qui pilote la feuille de style, §34.3) n'était posé que par `startDungeonRun` / `dungeonDescend` / `dungeonAscend` / `dungeonAbandon` — jamais au boot |
| Aucune case à cliquer | la grille n'était dessinée que par `startBattle` / `endBattle` |
| Impossible de changer de lieu | règle PASSE 34 : la carte du monde est **verrouillée** pendant une expédition (sortie uniquement par « Remonter et encaisser » / abandon) — règle conservée |
| « Combattre au palier N » muet | il appelait `exploreArea()`, qui se tait volontairement (PASSE 39) quand aucune case n'est engagée |

### 2. Correctif

- **Nouveau module `src/application/world/dungeon-resume.js`** (chunk `gameplay`, importé par
  `main.js` juste après `dungeon-run.js` qui est au plafond de son budget de taille) :
  `dungeonResumeAfterLoad()` — idempotente, sans import statique (DBT-04 : surface globale de `_dgApi`) :
  1. réaligne `G.location` sur le donjon de l'expédition (+ `renderMap()`) ;
  2. équipe entièrement K.O. (hors combat) → `dungeonOnWipe()` et retour `'wiped'` ;
  3. carte absente/corrompue → `_dgGenFloorMap(run)` (palier conservé) ;
  4. hors combat, libère `run.pendingNode` et les drapeaux `battle.pendingDungeonBoss` /
     `battle.dungeonElite` (la case interrompue reste à battre) — **conservés si un combat est déjà
     actif** (le rattrapage hors-ligne peut avoir repris la chaîne avant nous) ;
  5. `refreshDungeonPanel()` → drapeau `<html>`, panneau du lieu, bandeau + grille, raccourcis clavier ;
  6. notification `dungeon_run_resumed` (FR/EN, `{floor}`/`{depth}`) ; pilote auto → `_dgAutoStep()`
     après 900 ms.
  Sans expédition : retire seulement un drapeau résiduel (changement de sauvegarde) et retourne `null`.
- **`bootstrap-timers.js` · `initializeGameInterface()`** : appel dans le bloc `setTimeout(…, 200)` qui
  relance déjà les tickers de mine / d'entraînement — donc à **chaque activation de sauvegarde** (boot,
  menu des sauvegardes), via `globalThis.` (budget `typeof` de `application` inchangé).
- **`ui/game/location-info.js`** : en expédition, le bouton du lieu appelle `dungeonFight` au lieu de
  `exploreArea` (hors expédition : inchangé, le tutoriel cible toujours `exploreArea`).
- **CSS** : les couleurs de marque Discord (R1-04) passent en jetons `--pw-color-discord` /
  `--pw-color-discord-dark` dans le `:root` existant — le test `32-D14/33` (« aucune couleur en dur
  après le bandeau d'expédition ») les refusait ; rendu identique (vérifié : `rgb(88, 101, 242)`).

### 3. Tests

`tests/r1b-dungeon-resume.test.js` (13) : reprise nominale (drapeau, palier, position, sac, carte
inchangés, notification), idempotence, F5 en plein combat (case libérée, non soldée, ré-engageable,
pas de gardien fantôme), combat déjà actif conservé, équipe K.O. → wipe + plus de verrou, carte
corrompue régénérée, lieu réaligné, sans expédition → drapeau retiré sans message, pilote auto relancé,
câblage boot / bouton du lieu / import / i18n.

### 4. Prochaine action

Passe **P4a** (ACH-01, ACH-02, HLP-ach) — sauf validation préalable des propositions AUTO-01 (2 500 PQ /
5 s ?) et SND-03 (musique CC0 ≤ 15 Mo, 40 % par défaut ?).

---

## Passe V7-R1 — retours joueurs (10 points) · version **7.3.0** (2026-10-15)

Quatrième livraison de la **ROAD_MAP V7** : la passe **R1** (§4b), insérée avant P3/P4 à la demande du
joueur — dix problèmes remontés par les joueurs, huit corrigés, deux transformés en **propositions de
roadmap** (AUTO-01 relance automatique, SND-01…03 son & musique — à valider, §12-16/17).
Portes : `npm run check` vert (validate + prettier + i18n + build + ordre des chunks + **1 230 tests /
0 échec** : 1 213 de 7.2.0 + 17 nouveaux `tests/r1-player-feedback.test.js`), `eslint --quiet` 0 erreur,
4 smokes Chromium sur le bundle de production (`smoke-p0a`, `smoke-p0b-forms`, `smoke-p1`, `smoke-p2`),
`css-parity` 7.2.0 → 7.3.0 : **0 différence sur ordinateur** hors `#debug-widget` (masqué, voulu) —
les différences à 700 px sont les correctifs mobiles ci-dessous. Captures `docs/captures/v7-r1-*.png`.
Sauvegardes : `SAVE_VERSION` inchangé (= 4), aucun champ de `G` ajouté (le mode debug est mémorisé hors
sauvegarde).

### 0. Ce que R1 change pour le joueur

- **Après chaque combat** (victoire ou défaite) et **à la fin de chaque donjon** (victoire, remontée,
  abandon **et défaite**), l'équipe est **soignée** : PV complets, états purgés, ligne « Équipe soignée
  après le combat » dans le journal. Fini les Pokémon K.O. affichés dans la fenêtre Équipe qui faisaient
  croire qu'on ne pouvait plus relancer. Pendant une expédition de donjon, rien ne change : les PV
  persistent d'un combat à l'autre (règle 38e), le repos vient à la clôture.
- **Guide → « Capture & IV »** (nouvelle rubrique, aussi derrière le « ? » de la fenêtre Poké Balls) :
  comment la capture se déclenche (filtres de la fenêtre Poké Balls), les **taux réels** (Poké Ball 10 %,
  Super 20 %, Hyper 30 %, Master garantie, balls spéciales +25 % quand leur condition est remplie et
  +2 % par palier de 5 exemplaires jusqu'à 25, légendaire de fin de quête ×2), le **gain d'IV** à la
  capture (10 % de chance de +1 IV, plafond 12 par statistique ; sur le Pokémon capturé si l'espèce est
  nouvelle, sur votre exemplaire s'il s'agit d'un doublon) et ce que rapporte un **doublon** (jetons de
  donjon, chance d'IV, Pokédex — pas de Pokédollars). Toutes ces valeurs sont lues dans le code.
- **Rejoindre le Discord** (`https://discord.gg/DXC48vtGV`) : bouton dans **Réglages → Communauté** et
  sous « Nouvelle partie / Importer » dans le **menu principal** (nouvel onglet, `noopener`).
- **Mode debug masqué** : le bouton « Debug » n'apparaît plus. Pour l'afficher : Réglages → **Avancé** →
  code **`PWDEBUG`** (le même code le masque à nouveau ; bouton « Masquer le mode debug ») ou, dans la
  console du navigateur, `pwDebug.on()` / `pwDebug.off()` / `pwDebug.status()`. Le choix est mémorisé sur
  l'appareil (clé `pokeworld_debug`), pas dans la sauvegarde.
- **Mobile** : les titres de fenêtre ne se superposent plus aux outils de droite (« Carte : Kanto » /
  sélecteur de région / « ? ») ; la fenêtre **Poké Balls** est désormais dans la vue **Combat** (sous le
  combat) et **Monnaies** dans la vue **Raccourcis** — elles n'étaient dans *aucune* vue ; « Aller à la
  fenêtre » (tutoriel, raccourcis) bascule de vue avant de défiler.
- **Tutoriel** : la cible de l'étape courante **clignote** (nœud « Route 1 » sur la carte puis bouton
  « Explorer », fenêtre Poké Balls, bouton Boutique, fenêtre Équipe, boutons Sac / Pokédex des
  raccourcis, fenêtre Monnaies, Forêt de Jade) ; sur mobile, l'onglet de la barre du bas qui y mène
  clignote aussi. Désactiver le tutoriel éteint tout ; `prefers-reduced-motion` remplace l'animation par
  un simple halo.

### 1. Détail technique par ticket

- **R1-01** `design-system.css` : `.pw-win-hdr-title` perd ses 5 `!important` (l. 10696) ; bloc
  « V7-R1 » en fin de feuille : `body.mobile-mode .pw-win-hdr-title { position: static … }`, ellipse du
  libellé, `#map-region-select { max-width: 150px }`. Budget `!important` 2 234 → **2 231** (cliquet
  abaissé dans `tools/css-budget.json`).
- **R1-04** `data/game-config.js` : `GAME.COMMUNITY.DISCORD_URL` (+ global `DISCORD_URL`) ;
  `ui/components/discord-link.js` (`discordLinkVNode`, glyphe SVG inline) ; `SettingsModalView`
  (`#community-section`) et `SaveMenuView` (`.save-menu-community`) ; couleurs de marque Discord en
  variables `--pw-discord-brand(-dark)` dans l'unique `:root` (hors thème, par design ; le test 32-D14
  interdit les couleurs en dur après le bloc 33.7).
- **R1-05** `world/dungeon-run.js` : `_dgRestTeam()` dans `dungeonOnWipe()` et `dungeonAbandon()` ;
  test `passe39h-W1` réécrit (il verrouillait « wipe = pas de soin », supersédé par la demande).
- **R1-06** `combat/battle-flow.js` : `restoreTeamAfterBattle({ silent, unlessDungeon })` (exporté +
  global), appelé par `endBattle()` hors expédition et hors rattrapage (`PW_FF`) ; `save/offline-engine.js`
  l'appelle une fois le bilan figé (`silent: true, unlessDungeon: true`) ; clé `team_healed_after_battle`
  FR/EN ; `battle_lost_recover` reformulé.
- **R1-07** `GAME.CAPTURE = { IV_CHANCE_PCT: 10, IV_CAP: 12 }` (+ globaux `CAPTURE_IV_CHANCE_PCT`,
  `CAPTURE_IV_CAP`) lus par `combat/catch.js` et `world/collection.js` (5 sites : plus de `chance(10)`,
  `< 12`, `Math.random() < 0.1`) ; `economy/pokeballs.js` : `BALL_SCALE = { step: 5, maxCopies: 25,
  bonusPerTier: 2 }` remplace le barème ternaire de `ballEffectiveRate()` (résultat identique, test
  R1-07) ; `ui/game/guide-sections.js` (nouveau, rubriques du guide extraites de `tutorial.js` — qui
  repasse à 674 l.) avec `captureGuideValues()` / `captureGuidePages()` ; 9 clés `guide_capture_*` FR/EN
  paramétrées ; `dashboard.js` : `WIN_GUIDE_SECTION['win-pokeballs'] = 'capture'`.
- **R1-08** `save/debug-access.js` (nouveau) : `isDebugUnlocked`, `applyDebugAccess` (appelé par
  `applySavedTheme()` au boot), `tryDebugCode`, `submitDebugCode`, `hideDebugMode`, `window.pwDebug` ;
  `settings.js` : modèle `advanced` (+ Entrée dans `#debug-code-input`) ; CSS `#debug-widget { display:
  none }` / `body.pw-debug-on #debug-widget { display: flex }` ; 8 clés FR/EN.
- **R1-09** `engine/runtime/mobile-views.js` (nouveau) : `MOBILE_VIEW_WINS`, `MOBILE_MANAGE_WINS`,
  `pwMobileViewForWin()` ; `classic-bridge.js` les importe (1 205 l., sous son plafond) ; `dashboard.js`
  `scrollToWin()` bascule de vue (`setMobileView` / `setMobileManageView`) ; ordre d'empilement mobile
  `#win-battle 10 / #win-pokeballs 20`, `#win-shortcuts 10 / #win-currency 20`. Tests `passe29`,
  `passe35`, `passe58` mis à jour (listes déplacées, même intention).
- **R1-10** `ui/game/tutorial-highlight.js` (nouveau) : `tutorialTargetSelectors(step)`,
  `applyTutorialHighlight()` (diff minimal, pas de redémarrage d'animation), `installTutorialHighlight()`
  (balayage 1,5 s, `unref()` sous Node) ; `tutorial.js` : `targets` explicites sur 3 étapes, appel dans
  `installTutorialHooks()` et après chaque rendu de la carte Quêtes ; CSS `.pw-tuto-target`,
  `@keyframes pw-tuto-pulse(-svg)`, variante `prefers-reduced-motion`.
- Budgets : `typeof` ui/game 1 154 → **1 141** (icônes du guide via un helper), tailles
  (`file-size-budget.json` régénéré : 16 fichiers > 1 000 l. au lieu de 17), import graph 318/318.

### 2. Roadmap

`docs/ROAD_MAP_V7.md` §4b (R1), §11 (ligne R1 ✅ ; P4b += AUTO-01 ; nouvelle passe P4c = SND-01…03),
§12-16/17 (prix/délai de la relance auto ; source des musiques). Prochaine passe : **P4a** (ACH-01,
ACH-02, HLP-ach) — sauf validation d'AUTO-01 / SND avant.

---

## Passe V7-P2 — dette technique DBT-01 → DBT-09 · version **7.2.0** (2026-10-15)

Troisième livraison de la **ROAD_MAP V7** : tout **P2** en une passe. **Aucun changement de gameplay**
(règle de la passe) : même cascade CSS calculée qu'en 7.1.0 (`tests/harness/css-parity.mjs`, 0 différence
sur le tableau de bord et la fenêtre de combat à 1280 px et 700 px), mêmes 1 210 noms de tests, même
économie (`economy-sim`) et mêmes taux de victoire (`sim_battles --group gyms` : 100 % en profil entraîné).
Portes : `npm run check` vert (validate + **prettier** + i18n + build + **garde d'ordre des chunks** +
**1 213 tests / 0 échec** — les 1 210 de 7.1.0 à l'identique + 3 nouveaux DBT-08), `eslint --quiet` 0 erreur, 4 smokes Chromium (`smoke-p0a`, `smoke-p0b-forms`,
`smoke-p1`, nouveau **`smoke-p2`**) sur le bundle de production, captures `docs/captures/v7-p2-*.png`.

### 0. Ce que P2 change pour le joueur

Rien de visible — sauf le numéro de version (**7.2.0**, un seul, dans Réglages). Les sauvegardes 7.1.0
se chargent telles quelles (`SAVE_VERSION` inchangé = 4, aucun champ de `G` modifié).

### 1. DBT-01 — Prettier sur tout le code applicatif

- `prettier --write "src/**/*.js"` : **316 fichiers** reformatés (`prettier.config.js` : semi, simple
  quote, virgule finale es5, 100 colonnes). `npm run format:check` ajouté à `npm run check` → tout
  nouveau fichier non conforme fait échouer la porte.
- **Décision de périmètre** (`.prettierignore`, commentée) : les **dictionnaires** `src/data/` (46
  fichiers) et `src/localization/` (41 fichiers) restent denses. Reformatés, ils passaient de 1 à 15 lignes
  par entrée (×6 à ×10 de longueur) et cassaient 44 tests de contrat sur les tables ; ce sont des données,
  pas du code. Ils gardent leur forme « une entrée par ligne ».
- **Tests identiques avant/après** : la suite compte **1 210 noms** dans les deux cas (`tests/_dbg` :
  comparaison triée). 62 assertions dans 46 fichiers de tests lisaient le code source avec des
  expressions régulières sensibles aux espaces (`if(x){`, imports entre guillemets doubles, parenthèses
  redondantes que Prettier retire) : elles ont été **assouplies sans changer leur intention** via
  `tests/helpers/ws.js` (`ws`, `wsIncludes`, `wsMatch` : comparaison insensible à la mise en forme), chaque
  modification étant étiquetée `// V7 · DBT-01`. Le contrat `validate-project` « 0 `innerHTML =` hors des
  puits canoniques » a été rendu multi-lignes (le shim `_pwSetHtmlSafe` tient désormais sur 4 lignes).
- Effet de bord assumé : Prettier **déplie** les méga-fonctions écrites sur une ligne (`training.js`
  1 789 → 2 894 l., `save.js` 1 184 → 2 466 l.). Voir DBT-09.

### 2. DBT-02 — Fichiers morts et constantes jamais lues

- `tools/import-graph.mjs` (nouveau) : graphe statique depuis `src/main.js` (imports statiques,
  dynamiques et `__pwDeferredScreens`). **313/313 fichiers atteints, 0 mort** — porte dans
  `validate-project`.
- Supprimés : les 9 fichiers morts listés dans la roadmap (`runtime-access.js`, `core/{html, performance,
  save-compatibility, timer-registry}.js`, `domain/{base/base-rules, economy/inventory-rules,
  quests/quest-rules}.js`, `ui/components/help-button.js`) et les constantes `GAME` jamais lues
  (dont `MAX_MONEY`, clôture de FIX-03).

### 3. DBT-03 — Un seul état initial

- `src/domain/game/initial-state.js` → `createInitialGameState()` ; `save.js` et
  `engine/runtime/classic-bridge.js` l'importent (plus de copie locale du littéral).
- `tests/dbt03-initial-state.test.js` : les 3 points d'entrée (domaine, sauvegarde, pont moteur)
  produisent **le même objet** ; `smoke-p2` vérifie dans le navigateur que
  `PokeWorldState.gameState === window.G` après démarrage et après rechargement.

### 4. DBT-04 — Fin des gardes `typeof X === 'function'` dans combat / quests / world

- Nouveau résolveur unique `src/core/late-link.js` (`pwLateLink`, `pwLateAlias`) qui remplace le
  `__pwV43Link` dupliqué : **222 liens tardifs, tous résolubles** (vérifié par `tools/typeof-guards.mjs`).
- Comptage AST (`tools/typeof-guards.mjs`) : **1 829 → 1 440** gardes sur symboles globaux ;
  `application/combat/` 277 → **0**, `quests/` 53 → **0**, `world/` 54 → **0** ; le reste est **gelé**
  par `tools/typeof-guards.budget.json` (cliquet : ne peut que baisser) — porte dans `validate-project`.
- Règle apprise à la dure : un écran **différé** (`screen-atoll`, `screen-mine`, …) ne doit **jamais**
  importer statiquement un module du chunk `gameplay`. L'import ajouté par le codemod dans
  `puzzle-explorations.js` faisait évaluer `gameplay` avant `engine` dans le bundle de production
  → « Cannot read properties of undefined (reading 'gameState') », jeu injouable alors que les
  1 210 tests et le serveur de dev étaient verts. Corrigé (lien tardif) et **verrouillé** par
  `tools/check-chunk-order.mjs`, exécuté à chaque `npm run build` sur le bundle réel.

### 5. DBT-05 — Doublons

| Doublon | Avant | Après |
|---|---|---|
| Fabrique de Pokémon | 2 | **1** (`application/pokemon-factory.js` `createPoke`) |
| Bus d'événements | 2 implémentations | **1** (`core/event-bus.js` ; `engine/events/EventBus.js` n'est plus qu'une sous-classe qui compte les événements pour PokeTrace) |
| Échappement HTML | 4 tables (`vdom`, `save.js`, `legacy-components`, `pwConfirm`) | **1** (`core/html-escape.js`, ré-exporté par le vdom ; les autres délèguent) |
| Table des types | 3 copies | **1** (`domain/battle/type-system.js` ; `sim_battles` l'importe) |
| `__pwV43Link` | 18 fichiers | **0** (→ `core/late-link.js`) |

### 6. DBT-06 — CSS : cliquet `!important` et bloc `:root` unique

- `tools/cascade-check.mjs --budget` + `tools/css-budget.json` : le nombre de `!important`
  (design-system.css **2 234**, style.css 162) et de blocs `:root` hors `@media` (1 et 1) **ne peut plus
  monter** — porte dans `validate-project`.
- **19 blocs `:root` → 1** bloc en tête de `design-system.css` (+ 5 blocs `@media` laissés en place),
  fusion dans l'ordre de déclaration ; parité vérifiée analytiquement (un seul conflit `@media`,
  masqué par un bloc `@media` ultérieur) **et** dans le navigateur (`css-parity` : 0 différence).
- **Réduction par zone : tentée puis annulée.** Le simulateur de cascade (`tests/_dbg/css-reduce.mjs`,
  non livré) retirait 34 `!important` de `#battle-team-row` en « prouvant » que la règle gagnait avant
  et après ; la comparaison des styles calculés P1 ↔ P2 a montré des paddings, bordures et `row-gap`
  modifiés dans la fenêtre de combat → les 34 ont été restaurés. Le navigateur est le seul oracle :
  `tests/harness/css-parity.mjs` (nouveau) compare les styles calculés de deux builds servis et sera
  la porte de toute réduction future (point ouvert §12-14).

### 7. DBT-07 — Tests comportementaux (code réel, pas de regex)

`tests/dbt07-behaviour.test.js` — **9 tests** qui exécutent `quest-core`, `battle-init/flow/attack/
status`, `catch`, `progression`, la boucle ECS `battle-loop` + `encounter-system`, `pokeballs`,
`hatchery`, `save` + migrations : claim de quête **sans** `rewardPoke` (PQ au barème réel + objet) et
**avec** (`startBattle` réel, `battle.questRewardQuestId`), `startBattle`/`endBattle`, un combat ECS
complet (Pikachu 14 vs Rattata 10, K.O., +XP, `wildWinsByLoc`, enchaînement PokéChill), capture
avec/sans Ball, éclosion, `writeSlot` → `readSlot`, migration v3 → v4 (Deoxys 387 → 386 forme 1).

### 8. DBT-08 — Simulateurs branchés sur le code, version générée

- `tools/lib/game-constants.mjs` : `economy-sim.mjs` ne porte **plus aucune constante** ; il importe
  les modules du jeu (items, automation, currency, mine, Balls, pension, entraînement, Atoll, base,
  donjons). `sim_battles.mjs` importe la table des types du domaine. `MaxListenersExceededWarning` : 0.
- `src/version.js` est **généré** par `tools/gen-version.mjs` depuis `package.json` (`dev`, `build`,
  `validate`) ; `tests/dbt08-sims.test.js` (nouveau, 3 tests) garde ces trois contrats.

### 9. DBT-09 — Découpage de `game-helpers.js`, budget de taille

- `src/data/game-helpers.js` **1 384 → 894 l.** (avant Prettier) : `region.js` (verrou de région, Pokédex
  régional), `rewards.js` (objets de récompense), `dupes.js` (10 % doublons), `box-filters.js`.
  API inchangée : les globaux historiques sont ré-exposés, `smoke-p2` les exerce dans le bundle.
- `tools/file-size-budget.mjs` + `tools/file-size-budget.json` — porte dans `validate-project` : limite
  **1 000 lignes** pour tout fichier applicatif (hors `src/data/`, `src/localization/`, `version.js`),
  **17 exceptions nommées et plafonnées** (cliquet). **Critère « aucun fichier > 1 000 lignes » non
  atteint** : il y avait 8 fichiers au-dessus avant P2 ; Prettier (DBT-01) en a révélé 17, parce qu'il
  déplie des fonctions écrites sur une ligne (le code n'a pas grossi, il est devenu lisible). Les
  découper demande des passes dédiées (point ouvert §12-15) ; en attendant, aucun ne peut grossir.

### État par rapport à la roadmap et prochaine action

P0a ✅ · P0b ✅ · P1 ✅ · **P2 ✅** (DBT-06 réduction par zone et DBT-09 « > 1 000 lignes » : partiels,
documentés, verrouillés par cliquet) · P3 continu. **Prochaine action : P4a (ACH-01, ACH-02, HLP-ach)**.

---

## Passe V7-P0b/P1 — formes, textes, légendaires, Hoenn, Fragments · version **7.1.0** (2026-10-14)

Deuxième livraison de la **ROAD_MAP V7** : tout **P0b** (FORM-01..04) et le reste de **P1**
(TXT-01, DEX-01 + HLP-01, BALL-01, LEG-01, LEG-02, HOE-01, HOE-02, ATL-03), plus le ticket
hors-roadmap **VER-01** (une seule version, numéro clair). Portes : `npm run check` vert
(validate + i18n + build + **1 207 tests / 0 échec**), `eslint --quiet` 0 erreur, smoke Chromium
`tests/harness/smoke-p1.mjs` (0 erreur de page, 0 ressource HTTP en échec), captures
`docs/captures/v7-p1-*.png`.

### 0. VER-01 — une seule version, un numéro clair

Le menu Réglages affichait « build w32 · 2026-10-14 · V7-P0a » (rejeté). Désormais **une seule
source** `src/version.js` → `PW_VERSION = '7.1.0'`, affichée « PokéWorld — version 7.1.0 » et
reprise par `package.json`, `validate-project` (« Version OK (7.1.0) ») et le rapport de
diagnostic. Schéma : **7** = roadmap V7, **mineur +1 par zip livré** (P0a = 7.0.0 rétroactivement),
**correctif** = patch.

### 1. P0b — FORM-01..04 : les formes sont des Pokémon à part entière (D12)

- **FORM-01** `src/data/forms-data.js` : `FORMS` indexé `"351-1"` … `"386-3"` (Morphéo Solaire /
  Pluvieuse / Blizzard, Deoxys Attaque / Défense / Vitesse) ; un Pokémon porte `{ id: base, form: n }`.
  `speciesKey`, `sameSpecies`, `getFormDef`, `formsOf`, `getSpeciesData` (`src/domain/pokemon/species-key.js`) ;
  `createPoke('351-1', lvl)` ; **toute** vérification de possession passe par `sameSpecies` / `boxKeyFor`
  (plus jamais `Number(p.id) ===` seul).
- **FORM-02** première **migration de sauvegarde réelle** v3 → v4 (`src/application/save/migrations/index.js`,
  idempotente, `SAVE_VERSION = 4` aligné dans les 4 points de contrôle).
- **FORM-03** Pokédex : `G.pokedex[base].forms[n]`, `countCaughtForms(region)` ; les formes **ne comptent
  pas** pour le 100 % (`getRegionPokedexTotal('hoenn')` = 135) — base **ou** forme suffit.
- **FORM-04** sources : Morphéo (formes) à l'Institut Météo (boutique `castform_forms`), Deoxys (formes)
  à Autéquia (`deoxys_forms`) ; les formes sont des entrées de boîte distinctes.
- Tests `tests/p0b-forms.test.js` (11) + `tests/save-compatibility`, smoke `smoke-p0b-forms.mjs`.

### 2. P1a — TXT-01 · DEX-01 (+ HLP-01) · BALL-01

- **TXT-01** : plus aucune valeur de règle écrite en dur dans les textes FR/EN ; les constantes passent
  par `{pct}` / `{n}` / `{cost}` (ex. `wild_legendary_appeared` prend `{name}{level}`). Garde permanente
  `tests/no-hardcoded-rule-values.test.js` (10 tests) qui échoue si une chaîne réintroduit un nombre de règle.
- **DEX-01 / HLP-01** : chaque fiche du Pokédex indique **où obtenir l'espèce** (`src/domain/world/species-sources.js` :
  sauvage par lieu, évolution, starter, fossile, marché PQ, quête principale/annexe/légendaire, Fragments,
  formes) ; `tools/audit-unobtainable.mjs` → **« NON obtenables : 0 »**, section 2b légendaires **21/21 ✔**.
  Tests `tests/p1-dex-sources.test.js` (6).
- **BALL-01** : les 11 Balls « ferme » (Noigrumes) sont `hidden: true` tant que P6 n'existe pas
  (`isBallHidden`) — plus de Balls fantômes dans le sac / la boutique. Tests `tests/p1-ball-hidden.test.js` (3).

### 3. LEG-01 / LEG-02 — une quête par légendaire, capture ×2 non garantie (D13)

- `src/data/legendary-quests.js` : **21 définitions déclaratives** `LEGENDARY_QUESTS` — 11 enveloppes
  Kanto/Johto sur les quêtes principales existantes (#144–146, 150, 151, 243–245, 249–251) et
  **10 chaînes de Hoenn** (Regirock → Regice → Registeel, Latias, Latios, Kyogre, Groudon, Rayquaza,
  Jirachi, Deoxys) = **28 étapes annexes** `leg_<nom>_<n>` liées par `prevStep`/`nextStep`
  (`currentChainStepId`) ; un PNJ ne donne que l'étape courante.
- Règle unique : `battle.legendaryQuest` → `ballEffectiveRate × LEGENDARY_QUEST_CATCH_MULT (2)`, plafonnée
  à 100 %, **jamais garantie** ; la Ball est consommée ; en cas d'échec ou de défaite la quête **reste
  réclamable** et la rencontre se relance. Les Pokémon-cadeaux non légendaires des quêtes principales
  gardent la capture garantie (`battle.questGift`). L'ancien `legendaryCatch` disparaît.
- La rencontre de fin se joue **sur le lieu** (`encounterLoc` ; message `leg_go_to_location` sinon).
  Niveaux : Regis 40, Latis 50, Kyogre/Groudon/Rayquaza/Jirachi/Deoxys 70. Nouveau lieu **Île de l'Aurore**
  (`birth_island`, depuis Autéquia) + énigme `aurora_triangle` ; `leg_kyogre_2` / `leg_groudon_2`
  réutilisent les combats scénarisés `hoenn_aqua_seafloor` / `hoenn_magma_chimney` (HOE-01).
- Pension : les 10 légendaires de Hoenn rejoignent `HATCHERY_LEGENDARY_IDS` (même règle que Kanto/Johto).
- Tests `tests/p1-legendary-quests.test.js` (18), `tests/legendary-encounter.test.js` mis à jour ;
  smoke `smoke-p1.mjs` §C : refus hors site, lancement sur site (Regirock Nv.40, `legendaryQuest`, pas
  de `questGift`), étape toujours réclamable après abandon.

### 4. HOE-01 — 12 combats scénarisés de Hoenn dans l'histoire

`src/data/official-teams-hoenn.js` : `hoenn_rival_route103/route110/route119/lilycove` (3 variantes selon
le starter), `hoenn_wally_mauville/victoryroad`, `hoenn_aqua_rusturf/museum/weather/seafloor`,
`hoenn_magma_chimney/hideout` (rosters inspirés des jeux officiels, D14 ; Maxie as 39, Archie as ≥ 41)
↔ quêtes principales **278–289** insérées à leur place narrative : chaîne Hoenn **77 → 89** quêtes.
**Migration de sauvegarde** `migrateQuestSaveV7` (drapeau `_questIdMigrationV7`) : `mainStep.hoenn`
décalé du nombre d'insertions ≤ ancien index (20 → 25, 77 → 89) ; `completeQuestTrainerBattle(id)` pose
`G.questTrainerWins[id]` et valide aussi les étapes LEG-02 qui réutilisent le combat. Textes FR + EN.
Tests `tests/p1-hoenn-battles.test.js` (6) ; smoke §E (quête 278 lance le rival avec le roster dépendant
du starter).

### 5. HOE-02 — simulateur étendu à Hoenn (+ acceptation LEG-02)

`tools/sim_battles.mjs` charge `locations-hoenn` / `official-teams-hoenn` / `story-quests-hoenn` /
`legendary-quests` ; groupes `gyms` / `league` / `story` sur les **3 régions**, nouveau groupe
`legendary` (10 rencontres de fin de chaîne, PV × 2,2 comme `startLegendaryEncounter`, équipe
préparée de 6 Pokémon de Hoenn). Résultats (`--runs 30`, RNG seedé) :

| Groupe | Cible §HOE-02 | Résultat |
|---|---|---|
| 24 arènes (8 × 3 régions), joueur préparé | ≥ 95 % | **24/24** (Hoenn : Roxanne … Tatia & Lévy 100 %, Juan 96,7 %) |
| 15 membres de ligue (5 × 3 régions) | ≥ 95 % | **15/15 à 100 %** |
| 12 combats scénarisés de Hoenn, joueur casual | ≥ 60 % | **12/12** (minimum : `hoenn_aqua_seafloor` 80 %, as 43) |
| 10 légendaires LEG-02, joueur préparé | ≥ 95 % | **10/10 à 100 %** |

**Justification écrite (règle « < 60 % casual »)** : deux combats **pré-existants** restent sous la barre en
profil casual — `kanto_rival_victory` 73 % et `johto_rival_victory` 40 %. Ce sont les climax de la Route
Victoire, juste avant la Ligue, et ils passent ≥ 95 % avec le profil entraîné ; on les garde tels quels
(point ouvert §12-13 si l'on souhaite abaisser l'as). Test déterministe `tests/p1-hoenn-sim.test.js` (3) ;
`tests/passe23-simulations.test.js` inchangé et vert.

### 6. ATL-03 — Fragments de Légende (D8, reprise V6 §11.3)

`G.atoll.fragments` (compteur à sens unique) ; `ATOLL_FRAGMENTS_PER_BOSS = 3` à chaque victoire en
**finale du Dôme** ; `LEGEND_FRAGMENT_COST = 50` → `summonFragmentLegendary(id)` : légendaire **au choix**
parmi les régions débloquées pour le dex (`FRAGMENT_LEGENDARIES_BY_REGION` : Kanto 5, Johto 6, Hoenn 10),
rencontre Nv.70 **garantie**, capture aux règles LEG (×2, non garantie), **relançable gratuitement**
(`startFragmentLegendaryEncounter`) tant que non capturé (`pendingFragmentLegendary`), capture →
`completeFragmentLegendary()`. Carte « Fragments de Légende » sur l'accueil de l'Atoll (rendu ECS
`components/atoll.js` : pas de contrôle inutilisable, texte informatif quand il manque des Fragments).
Les sources P5 (Ligue 2, Rocket 1, planque 5) seront branchées avec P5. Tests (2, dans
`p1-legendary-quests.test.js`) ; smoke §D.

### 7. Guide en jeu (règle « pilier ouvert = page de guide »)

`src/ui/game/tutorial.js` : page **« Quêtes légendaires »** (section Quêtes) et **« Fragments de
Légende »** (section Atoll), valeurs injectées depuis les constantes (`{pct}`, `{cost}`, `{boss}`), FR + EN.

### 8. Tests hérités mis à jour (jamais contournés)

`hoenn-integration` (76 lieux dont `birth_island`, 89 quêtes, ordre historique conservé hors insertions),
`quest-chain` (165 quêtes annexes = 137 + 28 étapes ; une chaîne n'a qu'un donneur PNJ ; les étapes
`leg_*` n'écrivent pas le montant en dur — TXT-01), `legendary-encounter`, `passe40-donjons-39d`,
`passe49-wave21-puzzles-forms`, `p1a-progression-economy`.

### 9. État roadmap / points ouverts

- §11 : **P0b ✅, P1a ✅, P1b ✅, VER-01 ✅** → prochaine passe **P2 (DBT-01 → DBT-09)**.
- §12 nouveaux points : **12** légendaires encore présents dans les tables sauvages (deux voies de capture ;
  défaut : garder) ; **13** rivaux finaux < 60 % casual (défaut : garder).

---

## Passe V7-P0a — débloquer et fonder : BUG-01 · LNT-01 · OBS-01 · FAE-01 (+ P1a partiel : REG-01 · ROAM-01 · ECO-05) (2026-10-14)

Première passe de la **ROAD_MAP V7** (`docs/ROAD_MAP_V7.md`, révision 3). Rien d'autre ne démarrait
avant elle : le jeu ne pouvait pas être terminé.

### 1. BUG-01 — `startLegendaryEncounter` plantait à chaque rencontre légendaire (**bloquant**)

`src/application/combat/battle-encounter.js` référençait `enemy`, une variable qui n'existe nulle part
→ `ReferenceError` sur **toutes** les rencontres légendaires : quête principale Kanto #31 (Flûte →
Ronflex), toutes les quêtes `rewardPoke` (Kanto 11, Johto 8), Lugia / Ho-Oh, les énigmes des Regi.
Le dex de Johto ne pouvait jamais atteindre 100 % et Hoenn restait verrouillé.

- Le tirage chromatique vise l'espèce (`rollShiny(pokeId)`), les drapeaux vont sur le Pokémon créé.
- Tests : `tests/legendary-encounter.test.js` (6 tests : rencontre, shiny forcé, shiny tiré,
  gardes, `claimQuest(31,'main')` lance bien Ronflex, **les 19 quêtes `rewardPoke` Kanto + Johto
  démarrent**).
- Vérifié dans le vrai navigateur (`tests/harness/smoke-p0a.mjs`, Chromium) : la quête #31 lance le
  combat contre Ronflex Nv.30 — capture `docs/captures/p0a-bug01-snorlax-encounter.png`.

### 2. LNT-01 — `no-undef` en erreur sur TOUT `src/`

La moitié de `src/` (ui/game, application/combat, world, save…) tournait avec `no-undef: off` ;
c'est ce trou qui a laissé passer BUG-01.

- Nouveau `tools/gen-src-globals.mjs` : extrait les 2 553 symboles qui existent réellement sur la
  surface partagée (déclarations de haut niveau + `window.X =` / `globalThis.X =`) →
  `tools/src-globals.json`, lu par `eslint.config.js`. Un identifiant qui n'existe dans **aucun**
  fichier est désormais signalé. Le bloc « `no-undef: off` » est supprimé ; `src/data/` est linté aussi.
- 11 références fantômes corrigées (15 moins les 4 de BUG-01) : `Input.js` (`el` passé aux
  handlers), `ResourceManager.gc` (`entry` jamais lié → le GC ne libérait rien), `box-ui.js`
  (`cancelBoxSwap` appelé mais jamais défini → implémenté), `quest-ui.js` (`renderLocationInfo` →
  `renderLocInfo`), `save-extras.js` (`unlockTalentForSpecies`), branches mortes supprimées dans
  `team.js`, `items-helpers.js`, `box-selector.js`, `poke-modal.js`.
- `npm test` = `npm run lint` (régénération de la liste + `eslint . --quiet`) puis `node --test`.
  **0 erreur.**

### 3. OBS-01 — voir les erreurs

Nouveau module `src/application/diagnostics.js`, importé en premier dans `main.js` :
`window.onerror` + `unhandledrejection` → `G.diag.errors` (50 dernières : message, pile tronquée à
600 caractères, contexte, build, horodatage). Le dispatcher d'actions (`callGlobal`) enregistre
toute action qui lève, **puis relance l'erreur** (comportement inchangé + trace). Les chemins de
progression loguent via `pwReportError()` : `saveGame` / `loadGame` / `autoSave`, rencontre
légendaire d'énigme, migrations de quêtes V2 → V6.

- Paramètres → nouvelle section **Diagnostic** : compteur, « Copier le rapport d'erreurs »,
  « Effacer » (FR + EN). Capture `docs/captures/p0a-settings-diagnostic.png`.
- Nom `pwReportError` (et non `reportError`) : `window.reportError` est une API web standard.
- Acceptation vérifiée en navigateur : une exception volontaire dans une action dispatchée apparaît
  dans le rapport (`smoke-p0a.mjs` B1–B9). Tests unitaires : `tests/p0a-foundations.test.js`.

### 4. FAE-01 — type Fée dès le début (D15) : vérifié… et une vraie table des types

Le type Fée était bien en place (18 espèces Gen 1–3 retypées, 22 attaques, pool `fairy`, CSS,
icône, talents). Mais la vérification « les copies de la table sont identiques » a révélé que la
copie de `classic-bridge.js` — **celle que le combat utilise** via `window.typeEff` — avait **7
cases fausses** : Glace ×2 sur Feu / Combat / Roche / Acier, Spectre ×0 sur Combat, Spectre ×1 sur
Ténèbres, Insecte ×1 sur Poison. Le pont importe désormais la table du domaine : une seule table.
Tests : `tests/fae-01-fairy-type.test.js` (18 espèces figées, ligne + colonne Fée, 22 attaques,
comparaison case à case en jsdom, surface UI).

### 5. P1a partiel — REG-01 vérifié, ROAM-01 et ECO-05 livrés

- **REG-01** : `getRegionAccessStatus` applique déjà « ligue précédente + 100 % du dex régional,
  légendaires inclus » — figé par un test (Johto verrouillé à 150/151 sans Mew).
- **ROAM-01** : `ROAMING_CHANCE` 0,003 → **0,01** (l'étiquette disait déjà « 1 % »), `ROAMING_LEVEL`
  75 inchangé ; le panneau Lieu affichait « Nv.45 » en dur → lit la constante ; `roaming_short` =
  `tr(key, {pct})`. Test : 10 000 tirages (3 graines) → 80–120 apparitions.
  **Hors-ligne (décision D24, 2026-10-14)** : l'errant apparaît **aussi pendant le rattrapage** —
  garer l'équipe sur sa route est un farm AFK légitime ; s'il décime l'équipe, c'est le choix du
  joueur. Le récapitulatif de retour gagne une ligne « Errants croisés » et une note
  « ⚡ {name} (errant, Nv. {lvl}) est apparu pendant votre absence ! » (`afk_panel_roamers`,
  `afk_roamer_note[_many]`, aussi dans le journal de combat) ; `battle.roamerSightings` /
  `battle.lastRoamer` posés à l'apparition. Un premier jet « jamais d'errant hors-ligne » a été
  retiré à la demande du joueur. Le tirage d'errance est désormais toujours consommé sur une
  apparition libre (chaîne RNG identique avec ou sans errant → test différentiel stable).
  Les simulations hors-ligne héritées (`passe28`, `passe30`) tournent sans errant — leur pool suit
  l'horloge UTC, elles testent le moteur ; le cas errant a ses propres tests (Nv. 100 : vu, battu,
  rattrapage poursuivi · Nv. 5 : K.O. honnête, pénalité habituelle).
- **ECO-05** : `getDuplicateItemPayout` 25 % → **10 %** (`DUPLICATE_ITEM_PAYOUT_RATE`).
- Restent en P1a : TXT-01 (38 chaînes restantes), DEX-01, BALL-01.

### 6. Assets et livraison

`python3 tools/download_assets.py` : 1 812 images récupérées (PokeChill, Pokéclicker, PokeAPI,
pokeemerald), 0 échec, 18 Mo. `npm test` : **1 148 tests, 0 échec** (les 30 échecs « PNG absent »
du dump ont disparu ; tests hérités mis à jour pour suivre les décisions V7 : taux doublons 10 %,
tampon de build « ≥ w31 », simulations hors-ligne sans errant d'horloge ; `makeEl()` du bac à
sable reçoit `children` — les coups super-efficaces alimentent la frise de combat). `npm run build` OK ; `smoke-boot.mjs`, `smoke-p0a.mjs` et `smoke-roam-offline.mjs` (errant pendant
un rattrapage de 5 min : vu, battu, récap « Errants croisés » + note — capture
`docs/captures/roam-01-recap-errant-hors-ligne.png`) verts en Chromium (0 ressource HTTP en échec). Build : `PW_BUILD = 'w32 · 2026-10-14 · V7-P0a'`.

### État roadmap

P0a ✅ (4/4). P1a : REG-01 ✅, ROAM-01 ✅, ECO-05 ✅, TXT-01 ☐ (1/39), DEX-01 ☐, BALL-01 ☐.
Prochaine passe : **P0b** (FORM-01 → FORM-04, formes = Pokémon à part, migration v3 → v4), puis fin de P1a.

---

## Passe 38 — rochers devant/derrière, donjon lisible façon Pokéclicker, carte sous le combat (2026-08-29)

### 1. Paysage — des rochers DEVANT et DERRIÈRE les arbres, herbes et buissons

Retour joueur : « pour le paysage possible de mettre des rochers devant et
derrière les arbres, herbes, buissons ? Histoire d'avoir de la diversité ».

Le paysage est désormais peint en **trois profondeurs** (aucune couleur en dur,
tokens de thème) :

| Couche | Élément | Contenu | Ligne de pose | z |
|---|---|---|---|---|
| Arrière-plan | `html::before` | petits rochers + buissons lointains (nouvelle frise 360×26) | ligne d'herbe (`--pw-land-h-grass`) | −2 |
| Milieu | `html::after` | arbres, herbes et buissons (frise d'origine) | ligne de sol | −2 |
| Premier plan | `#pw-land-fg` | gros rochers + touffes d'herbe (nouvelle frise 560×38) | ligne de sol | −1 |

- `#pw-land-fg` est un simple nœud garanti au boot par le nouveau module
  `src/ui/game/landscape-layers.js` (même idiome que `#pw-bg-pokemon-layer`) ;
  la frise est peinte en `-webkit-mask` : aucun pixel de DOM par tuile.
- Nouvelle variable `--pw-land-rock-bg` (rochers lointains assombris pour la
  distance) ; `--pw-land-rock` reste la teinte claire du premier plan.
- Ordre des plans : paysage (−3) → rochers/buissons lointains (−2) → végétation
  (−2) → rochers devant (−1) → promeneurs (0) → interface (1).

### 2. Donjon — visibilité : chaque état a sa couleur et sa texture

Retour joueur : « pour le donjon gros problème de visibilité. Ça manque de
couleurs, on distingue mal les boss, vide, brouillard, etc. Inspire-toi plus de
ce que fait Pokéclicker. »

**Cause racine trouvée** : les tuiles sont des `<button data-action>` ; le socle
commun leur impose un fond générique **avec `!important`** (règle wave 17), qui
**écrasait silencieusement** toutes les teintes de la grille de la passe 37 —
d'où l'impression d'un plateau uniforme. Les règles de la grille sont donc
scopées sous `#battle-dungeon-bar` et portent `!important` (même logique que la
scène de combat, §A.2/A.3).

État par état (tokens de thème uniquement) :

- **Brouillard de guerre** : voile sombre brumeux (deux radial-gradient + ombre
  interne), bordure estompée, « ? » net et lisible.
- **Case vide** : sol de caverne estompé, bordure **en pointillés**, aucun
  contenu — clairement différente du brouillard.
- **Combat** : bordure claire, fond légèrement teinté.
- **Élite** : **orange** (distincte du boss rouge), fond teinté orange.
- **Coffre** : vert. **Échelle** : bleu luisant. **Entrée** : teinte accent.
- **Boss** : **rouge + halo pulsant** (`pw38-boss-pulse`), bordure épaisse ;
  l'animation est coupée si l'utilisateur demande « réduire les animations ».
- **Position du joueur** : double anneau sombre + clair, lisible sur toute
  case colorée.
- Fond de la carte : **caverne en entonnoir** (vignette sombre) pour faire
  ressortir la grille, et **légende complétée** : combat, élite, coffre,
  gardien, échelle, **case vide** et **case inconnue** (clés i18n FR/EN
  `dungeon_node_empty`).
- Choix d'implémentation : la lisibilité vient des **tokens de thème + SVG
  inline**, pas d'images Pokéclicker téléchargées — le rendu suit donc les 10
  thèmes et le cycle jour/nuit sans nouveau binaire. Aucune nouvelle ressource
  à ajouter à `tools/download_assets.py`.

### 3. Donjon — la carte SOUS le combat

Retour joueur : « possible de mettre la carte sous le combat ? Car comme ça
quand on va sur une case de combat le combat vient se placer en haut (là où on
regarde) et quand il se termine la carte remonte là où on regarde, comme ça on
verra bien quand on est en combat ou non. »

`#battle-center-panel` étant déjà une colonne flex, on ne touche qu'à l'ordre :
`#battle-active-scene { order:-1 }` et `#battle-dungeon-bar { order:0 }`. Dès
que la scène est en vie (`display:flex`, `.is-live`), elle passe EN HAUT de la
fenêtre et la carte reste visible SOUS elle ; dès que `endBattle()` la cache,
la carte redevient le premier élément visible : « la carte remonte là où l'on
regarde ». Zéro JS, zéro couleur en dur. Fonctionne aussi sur mobile (même
colonne flex).

### 4. Vérifications

- `npm run validate` · `check:i18n` · `npm run build` ✅
- **1026/1026 tests** (11 nouveaux : `tests/passe38-donjons-visibilite.test.js`
  + paysage/tests 34.2 et 37-P2 mis à jour vers la spec à trois profondeurs).
- Sonde navigateur réelle (`tests/harness/visual-passe38.mjs`) : 3 couches du
  paysage mesurées aux bonnes lignes ; 35 tuiles, 34 brouillards, position
  marquée, légende complète ; combat engagé → scène en haut (order −1) et carte
  dessous (order 0) ; combat terminé → carte revenue en haut ; **aucune erreur
  JavaScript**. Styles calculés vérifiés par type de case (boss rouge pulsant,
  élite orange, coffre vert, vide en pointillés, brouillard brumeux).

### 5. Réassemblage — docs & icône

- `docs/ROAD_MAP.md` était une **copie tronquée** (197 lignes) de la feuille de
  route V6 fournie par le joueur (1693 lignes) : remplacée par la version
  complète du joueur.
- Icône du projet restaurée depuis l'icône du joueur (`Icon.png` 1024×1024 +
  favicons 192/180 redérivés de la même source) — `tools/download_assets.py`
  ne remplace jamais un fichier existant, elle survivra aux prochains runs.

### Prochaine action

Suite de la feuille de route V6 fournie (P0→P10) ; l'équilibrage fin de la
grille de donjon (densité élites/caches/boss par profondeur) si demandé.

---

## Passe 38b — 5 corrections joueur : paysage, icône, donjon (entrée + visibilité), header, colonnes (2026-08-29)

### 1. Paysage — la ligne de rochers n'est plus trop haute

Retour joueur : « il y a une ligne de rocher qui est beaucoup trop haut et pas
au même niveau que le reste ».

La frise `html::before` (rochers/buissons lointains) était posée sur la ligne
d'HERBE (`--pw-land-h-grass`, 72 vh) soit ~16 vh au-dessus de la ligne de sol.
Elle est désormais posée sur la ligne de SOL (`--pw-land-h-ground`, 88 vh),
comme la végétation et les rochers de premier plan (version mobile 260×20
corrigée pareillement). Les trois profondeurs partagent la même ligne de pose.

### 2. Icône du jeu — la barre de titre affiche l'icône du joueur

Retour joueur : « pour l'icône du jeu il y a un bug, ce n'est pas le mien que
je t'ai fourni ».

Les fichiers `Icon.png` / `icon-192.png` / `icon-180.png` étaient déjà dérivés
de l'icône fournie (favicons) ; le bug visible était le **pokéball SVG
générique** de la barre de titre (`.brand-mark`), que le joueur prenait pour
« l'icône du jeu ». La marque de la barre de titre affiche désormais une
vraie image `<img src="src/assets/images/Icon.png">` (CSS `.brand-mark img` :
contain, arrondi, 28 px comme l'ancien badge).

### 3. Donjon — entrée en bas au milieu, première case vide, brouillard de guerre, téléportation

Retour joueur :
- « la première case doit être en bas au milieu, pas à gauche » → l'entrée est
  `c3r4` (colonne du milieu, dernière rangée) ;
- « la première case doit être vide, pas de combat, histoire de laisser le
  choix au joueur » → l'entrée est de type `empty`, et la **zone de départ**
  (entrée + ses 4 voisines) ne reçoit NI combat NI élite : c'est un sas ;
- « on doit débloquer (enlever le brouillard) des cases adjacentes de là où on
  se situe » → **brouillard de guerre façon Pokéclicker** : `_dgRevealAround()`
  révèle la case ET ses 4 voisines à la génération et à chaque déplacement ;
- « il doit être possible de se déplacer instantanément à n'importe quelle
  case visible » → `dungeonMoveTo()` téléporte vers toute case révélée ; les
  cases encore sous brouillard ne se rejoignent que par un pas adjacent
  (le pilote auto téléporte lui aussi vers les cibles déjà visibles).

### 4. Donjon — visibilité : assets image façon Pokéclicker + sprite PNJ

Retour joueur : « gros problème de compréhension et visibilité entre les cases
de combat, vide et boss. Il faut comme sur pokeclicker des couleurs, mais aussi
des assets : vide → case vide, combat → symbole de pokéball, boss → symbole de
boss. Chaque case doit être facilement identifiable et visible. Ensuite
j'aimerais bien le même sprite de PNJ que le nôtre sur la carte dans la case où
l'on est dans le donjon. »

- **Assets** : les 4 tuiles officielles Pokéclicker sont téléchargées dans
  `src/assets/images/dungeon/` (`encounter.png` = pokéball des combats,
  `boss.png`, `chest.png`, `ladder.png`) et **déclarées dans
  `tools/download_assets.py`** (`DUNGEON_TILES` + `download_dungeon_tiles()`
  appelée au run — le downloader du projet les récupérera à chaque run).
- **Case vide** : aucun contenu, sol de caverne estompé en pointillés.
- **Combat / élite** : icône pokéball (`encounter.png`) ; l'élite garde son
  cadre ORANGE pour rester distincte du boss.
- **Boss** : icône boss (`boss.png`) + cadre rouge luisant pulsant.
- **Sprite PNJ** : la case du joueur affiche le même `trainer-54.png` que le
  joueur sur la carte des régions (`<img class="pw-dgn-player">`, 82 % de la
  case, ombre portée).
- Couleurs par type conservées (token de thème) : vide pointillés, combat
  clair, élite orange, coffre vert, échelle bleue, boss rouge, brouillard
  brumeux avec « ? ».

### 5. Affichage — barre de titre fixe + colonnes

Retour joueur : « la barre de titre du jeu ne suit pas quand on scroll, elle
doit être fixe à l'écran et toujours visible » et « sur les grands écrans les
colonnes de droite et gauche sont trop larges, elles ne doivent pas faire plus
de la moitié de la largeur de la colonne du milieu ».

- **Header** : la cause racine était le sélecteur groupé
  `#header, #main-dashboard { position: relative; z-index: 1 }` (règle
  paysage) qui écrasait `position: sticky` du header (même spécificité, défini
  plus loin). Le groupe est scindé : seul `#main-dashboard` est `relative`, le
  header reste `position: sticky; top: 0; z-index: 950`.
- **Colonnes** : à partir de 1440 px, rapport `1:2:1`
  (`#col-1/#col-3 { flex: 1 1 0 }`, `#col-2 { flex: 2 1 0 }` avec
  `min-width: 0`) : chaque colonne latérale fait exactement **50 %** de la
  colonne centrale. Les très grands écrans (17/9 ≥1921 et ≥2720 px) suivent la
  même règle (la centrale reste ×2, plus d'égalisation à 2720 px).

### 6. Vérifications

- `npm run validate` · `check:i18n` · `npm run build` ✅ (1810 images copiées
  dans dist, tuiles de donjon incluses).
- **1033/1033 tests** (7 nouveaux : entrée c3r4 vide + zone départ sans
  combat, brouillard de guerre, téléportation visible/adjacence, assets
  image, sprite PNJ, header sticky, ratio de colonnes ; tests 37-D1/D2/D3,
  34.2, 37-P2 et les assertions ultrawide/promeneurs mis à jour vers la
  nouvelle spec).
- Sonde navigateur réelle (`tests/harness/visual-passe38b.mjs`) : 19/19 ✔ —
  rochers lointains à 854 px pour une ligne de sol à 880 px, Icon.png servie
  (HTTP 200, 1024×1024) et affichée dans la barre, entrée c3r4 vide avec
  brouillard 31/35 et zone départ révélée, téléportation vers une case
  visible, icônes pokéball/boss/coffre rendues, sprite PNJ sur la case
  courante, header sticky après scroll (top 0), colonnes 388/776/388 px à
  1600 px (1:2:1) — **aucune erreur JavaScript**.
- Harnais de la passe 38 (carte sous le combat) adapté au sas de départ :
  le joueur traverse des cases vides avant de trouver un combat — tout est
  vert, la carte passe bien sous le combat et remonte après.

### Prochaine action

Suite de la feuille de route V6 fournie (P0→P10).

---


## Passe 38c — 14 retours joueur : paysage, affichage > 16/9, donjon (densité, couleurs, butin, auto 3 modes), guide (2026-08-30)

### 1. Paysage — les rochers sont plus petits

Retour joueur : « les rochers sont trop gros ». La frise de premier plan
`#pw-land-fg` (rochers devant la végétation) est redessinée : sommets des
rochers à y 15-26 au lieu de 4-16 (≈ 40-60 % plus petits), bases plus
étroites. La bande 560×38 et la ligne de pose (sol) ne changent pas.

### 2. Affichage — latérales jamais plus larges que la moitié de la centrale

Retour joueur : « sur les écrans plus grands que 16/9, les colonnes latérales
font plus que la moitié de la centrale ». La règle 1:2:1 (flex-grow) tient
dès 1440 px et sur 17/9 ≥ 1921/≥ 2720 px : re-mesurée sur 1920×900,
2560×1080, 3440×1440 et 3840×1200 → latérales = 50 % exactes, jamais plus.

### 3. Donjon — la première case est TOUJOURS vide

L'entrée (bas, au milieu) reste un `empty` garanti : jamais un combat, à
toutes les tailles de grille (le sprite PNJ la marque tant qu'on y est).

### 4. Donjon — les combats affichent le LOGO DE POKÉBALL VIDE

`encounter.png` est régénéré : c'est désormais une **pokéball vide** (contour)
dessinée en monochrome. Une case de combat TERMINÉE devient vide (style
Pokéclicker) ; l'élite garde sa teinte orange.

### 5. Donjon — boss, pokéball et coffre : MÊME couleur (glyphes N&B)

Retour joueur : « le logo boss, la pokéball et le coffre doivent avoir la même
couleur ; régénère le sprite du coffre et de l'échelle en noir et blanc pour
leur appliquer une couleur ». Les 4 tuiles (`encounter`, `boss`, `chest`,
`ladder`) sont des **glyphes noirs sur transparent** (saturation ≈ 0),
teintés en CSS par **masque** (`mask-image` + `background-color:
currentColor`) : une teinte partagée `--pw-dgn-tint` (violet) pour boss /
pokéball / coffre, orange pour l'élite, bleu pour l'échelle.
`tools/download_assets.py` télécharge puis **régénère** ces tuiles en N&B.

### 6. Donjon — cases de combat et d'échelle nettement distinctes du fond

Retour joueur : « on peut les confondre avec les vides ». Combat : fond teinté
+ bordure pleine + halo (plus de pointillés discrets) ; échelle : fond bleu
appuyé en dégradé + halo. Le vide garde son sol estompé en pointillés.

### 7. Donjon — moins de cases vides, boss INACCESSIBLE sans combat

Retour joueur : « trop de cases vides, on peut aller au boss sans faire aucun
combat ». Le boss est désormais **GARDÉ** : toutes ses cases voisines sont des
combats, et il n'est **pas téléportable** (il exige l'adjacence — donc un
garde). Un **couloir de combats** est garanti sur le chemin entrée → boss, et
la densité monte (combats ≈ 40 % de la surface, coffres ≈ 10 %) : les cases
vides ne sont plus majoritaires.

### 8. Donjon — carte progressive 7×5 → 15×10 selon la localisation

Retour joueur : « la taille de la carte doit augmenter avec la localisation,
de 7×5 au début jusqu'à 15×10 max ». `_dgGridSizeFor(badgeReq)` : badgeReq 0
(Forêt de Jade) → 7×5 ; badgeReq 8 (Caverne Azurée) → 15×10, croissance
monotone par palier.

### 9-10-13. Donjon — légende, « Boss vaincu… » et aide clavier supprimées

Retours joueur : « la légende ne sert à rien si les cases sont assez
explicites », « le Boss vaincu… ne sert à rien », « tu peux virer *Flèches
← ↑ ↓ →* ». Les trois sont retirés du bandeau ; les icônes + couleurs
suffisent.

### 11. Donjon — « Remonter et encaisser » en ROUGE

Retour joueur : « comme le bouton quitter en combat, même rouge, pour montrer
que c'est une action importante ». Le bouton d'ascension prend la classe
`pw-btn-danger` (qui le sort du skin bouton générique) + la teinte rouge
`var(--red)`.

### 12. Donjon — le butin vit SOUS la carte, toujours actif, tout le run

Retour joueur : « la partie butin du combat doit se situer sous la carte,
toujours active, avec tout le butin du donjon ; tu peux virer la section
" sac d'expédition " ». Un panneau `pw-bdg-loot` sous la grille affiche le
sac (JD/₽) + toutes les captures et objets **cumulés sur le run**
(`run.loot`, absorbé à chaque victoire) ; l'ancien bloc « Sac d'expédition »
du bandeau disparaît, et la réglette de butin du combat est masquée en
expédition.

### 14. Guide + résumé de sortie + auto à 3 modes

- **Guide** : nouvelle rubrique « Donjons », visible dès que le premier donjon
  est débloqué (quête de la Forêt de Jade, tout début d'aventure) — cartes,
  déplacement, palier/sac, pilote auto.
- **Résumé de session** : un donjon = un combat de route entier → à la sortie
  (remontée / boss final), le résumé s'ouvre avec TOUT le butin du run
  (captures, objets, victoires, durée).
- **Auto 3 modes** façon mods Pokéclicker : **boss** (fonce au plus court),
  **plateau** (farm intégral), **coffres** (uniquement les coffres puis le
  boss). Trois boutons dans le bandeau, clic sur le mode actif = OFF.

### Vérifications

- `npm test` : **1050/1050** (17 nouveaux tests `passe38c`).
- `npm run validate` + `check:i18n` + `build` OK (1810 images).
- Sondes navigateur `visual-passe38b` (28 ✔) et `visual-passe38` (tout vert) :
  grille 8×6 pour le Mont Sélénite, boss gardé, teinte partagée
  `rgb(167,139,250)`, bouton ascension rouge, butin sous carte, résumé à la
  sortie, latérales ≤ 50 % sur 1920×900 / 2560×1080 / 3440×1440,
  **aucune erreur JavaScript**.

## Passe 38d — 9 retours joueur : affichage 16/9, entrée sans combat, icônes, boss non rouge, butin monnaies (2026-08-30)

### 1. Grands écrans : le MILIEU garde la taille d'un 16/9

Retour : « le milieu doit garder la même taille que sur un 16/9 même si
l'écran a une résolution plus large, car sinon les menus paraissent trop
étirés ». Le tableau de bord est plafonné à sa largeur 16/9 de référence
(1600 px) et centré (`margin-inline: auto`) ; l'excédent d'un écran très
large devient de la marge. Les colonnes latérales restent à la moitié de la
centrale (PASSE 38) à toutes les résolutions ≥ 1440 px — y compris en
> 16/9 (règle 1:2:1 ré-affirmée à 2720 px, jamais d'égalisation).

### 2. Donjon : entrée SANS combat, première case toujours vide

Retour : « la première case n'est toujours pas une case vide, elle lance
toujours un combat, ou si c'est pas la case, lancer le donjon lance un
combat directement ». `exploreArea()` rend tôt dès qu'une expédition est en
cours : ouvrir un donjon n'engage PLUS de combat — le joueur arrive sur sa
case vide (bas/milieu) et choisit sa direction. Seul le clic sur une case
(combat, élite, boss) ou le bouton de premier engagement pose `pendingNode`
et déclenche le combat (qui solde la case à la victoire).

### 3. Icônes sur les cases, boss PAS rouge, cases résolues = vide

Retour : « il n'y a plus aucun sprite/icon sur les cases, les couleurs sont
plus bonnes, le boss n'est plus en rouge en tout cas. De plus certaines
cases vides sont différentes des autres pour aucune raison ».

- Les icônes de tuiles sont passées en **URL absolue** dans le masque CSS
  (`new URL(src, location.href)`) : la relative était résolue contre la
  feuille de style → 404 → icônes invisibles. Repli `@supports` si le
  navigateur ne sait pas teinter par masque.
- Le **boss n'est plus rouge** : il partage la teinte `--pw-dgn-tint` de la
  pokéball et du coffre (« même couleur pour boss/pokéball/coffre »). Il
  reste identifiable par sa bordure 3 px, son halo et sa pulsation. L'élite
  reste orange, l'échelle bleue.
- Les cases **résolues** (combat battu, coffre vidé) redeviennent un **sol
  vide identique** aux cases vides (même fond, mêmes pointillés) — fini les
  cases « différentes pour aucune raison ». L'échelle (sortie du boss battu)
  reste à pleine opacité.

### 4. Quota « Victoires » et barre de progression supprimés

Retour : « le "Encore 7 victoire(s) avant de descendre" et le "Victoires :
1 / 8" avec la barre de progression ne servent plus à rien puisqu'on a une
carte maintenant ». Le bandeau ne montre plus `pw-bdg-quota`, `pw-bdg-bar`
ni le verrou `dungeon_descend_locked` : la carte est la seule progression.

### 5. « Quitter le combat » masqué en expédition

Retour : « le bouton quitter du combat ne doit pas être affiché en donjon,
puisqu'il y a déjà le bouton remonter et encaisser ».
`html[data-dungeon-run="1"] #leave-btn { display: none !important; }` : en
expédition, la seule sortie est « Remonter et encaisser ».

### 6. Téléportation vers TOUTE case visible, boss compris

Retour : « je me retrouve bloqué avec le message "le boss se défie depuis
une case voisine" ». `dungeonMoveTo` accepte toute case révélée, y compris
le boss ; le message d'adjacence a disparu du flux. Les gardes autour du
boss restent des combats (pas d'accès gratuit), mais le joueur choisit sa
case d'attaque.

### 7. Butin sous la carte, toujours actif, entre carte et « Remonter »

Retour : « j'ai capturé des pokémon et obtenu de l'argent mais le butin
n'est pas visible entre la carte et le bouton remonter et encaisser ». Le
panneau `pw-bdg-loot` vit entre la grille et les actions ; il se rafraîchit
en DIRECT pendant le combat (chaque capture / objet / pièce déclenche
`renderBattleLoot` → `refreshDungeonPanel`) et après chaque victoire
(`dungeonOnWin` vide la session dans le butin du run).

### 8. Forêts = un seul palier, grottes = niveaux

Retour : « les donjons comme la Forêt de Jade n'ont pas de raison d'avoir
de niveau, il devrait y en avoir qu'un puisque c'est une forêt et non une
grotte ». `dungeonDepthFor` s'appuie sur `_dgIsCaveLike` (décor du lieu :
cave / montagne / volcan / neige / désert → paliers ; forêt → 1 seul).
Le libellé « Palier X / Y » disparaît quand la profondeur vaut 1, et le
bouton d'entrée affiche « Explorer le donjon » au lieu de la profondeur.

### 9. Monnaies gagnées EN COMBAT dans le butin (combats normaux + donjons)

Retour : « il serait bien de rajouter dans le butin les monnaies obtenues
pendant ce combat — uniquement les ressources obtenues EN combat, sans
compter les ressources obtenues ailleurs ». `battle.sessionMoney` est
initialisé à zéro à chaque combat et n'accumule QUE l'argent du combat :
victoire sauvage (`awardWildVictoryMoney`) + conversion des doublons. Il
s'affiche dans le butin de combat (chip `+₽`), dans le butin du donjon
(chip `+₽` à côté du sac, jamais doublement crédité) et dans le résumé de
fin de session (ligne `₽`). Les gains extérieurs (ventes, quêtes,
passifs…) n'y entrent jamais.

### Vérifications

- `npm test` : **1067/1067** (17 nouveaux tests `passe39`).
- `npm run validate` + `check:i18n` + `build` OK (1810 images).
- Sondes navigateur `visual-passe38b` et `visual-passe38` : toutes vertes —
  entrée sans combat, icônes HTTP 200 (URL absolues), teinte partagée
  `rgb(167,139,250)` boss compris, butin sous carte, téléportation au boss,
  colonnes 388/776/388 à 1600 → 3840 px, **aucune erreur JavaScript**.

## Passe 38e — 8 retours joueur : pokéball du titre, boss rouge, couleurs distinctes, boss non auto, butin unifié, monnaies (2026-08-30)

### 1. Pokéball de la barre de titre sur les cases de combat

Retour : « le sprite de pokéball n'est pas bon, pourquoi tu n'utilises pas
celui qui est dans le titre de la fenêtre pokéball ? ». Les cases de combat
utilisent désormais `dungeon/pokeball.svg` : EXACTEMENT l'icône de la
fenêtre « Poké Balls » (cercle + trait + bouton), tracée en noir pour la
teinte CSS par masque. L'élite superpose une **étoile** (`dungeon/star.svg`)
à la pokéball — c'est la réponse à « et c'est quoi les oranges ? » : orange
+ étoile = combat corsé (butin ×2). Les deux SVG sont garantis par
`tools/download_assets.py` (icônes locales recréées si absentes).

### 2. Boss ROUGE + une couleur PAR type de case

Retour : « la case boss n'est plus rouge » et « les cases combats et coffres
ont les mêmes couleurs ». Le joueur a tranché : plus de teinte partagée.
Cinq couleurs distinctes, façon Pokéclicker :

| Case | Couleur | Icône |
|---|---|---|
| Combat | violet `--pw-dgn-tint` | pokéball (barre de titre) |
| Élite | orange `--orange` | pokéball + étoile |
| Coffre | or `--yellow` | coffre |
| Boss | **rouge** `--red` | boss + halo pulsant |
| Échelle | bleu `--blue` | échelle |

### 3. Plus de combat de boss lancé AU HASARD

Retour : « de manière random on me lance le combat de boss après un combat
normal, sans que je me sois déplacé sur la carte — un reste du N combats
lance le boss ». Deux vestiges de la chaîne « N combats puis le boss » ont
été neutralisés quand une carte est en cours :
- le gestionnaire de chaîne (`battle-status.js`) : une victoire sur le
  plateau rend TOUJOURS la main à la carte (`_dgStop = true`), il ne pose
  plus jamais `pendingDungeonBoss` ;
- le tuning d'encounter (`encounter-system.js`) : l'inférence « palier purgé
  → gardien » est interdite en grille (`!run.map`).
Le gardien ne s'engage que par le clic sur sa case. `endBattle` purge en
plus `pendingDungeonBoss` (aucune fuite vers le combat suivant).

### 4. Panneau de butin du donjon = MÊME rendu que les autres combats

Retour : « pourquoi le panneau de butin n'est pas le même que celui des
autres combats ? ». Le butin sous la carte utilise maintenant les mêmes
puces `.loot-item` (sprite + compteur) que `#battle-loot-inline`. Les
puces « chip » custom ont disparu.

### 5. Monnaies : sprite + chiffre, jamais « × » comme les Pokémon

Retour : « les monnaies obtenues doivent être affichées directement avec le
chiffre et le sprite de la monnaie, et non pas avec le multiplicateur comme
les pokémon ». Les monnaies paraissent avec leur **sprite** (pièce `money.svg`
pour ₽, jeton `dungeonToken.svg` pour JD) et leur **chiffre** : `+150` pour
l'argent gagné en combat, `250` pour les jetons encaissés. Aucun « × ».

### 6. Monnaies dans le panneau RÉSUMÉ

Retour : « les monnaies ne sont pas affichées dans le panneau résumé ». Le
résumé de session affiche désormais une rangée de monnaies (sprite + chiffre)
sous les statistiques : pièce ₽ (+N, argent gagné en combat) et jeton JD
(jetons encaissés à la sortie du donjon, `sessionTokens`). Les statistiques
gardent leurs cases « 150 ₽ » et « 4 JD ». En combat normal aussi, l'argent
compte comme du butin (`hadLoot`).

### 7. Le butin s'ACCUMULE sur tout le donjon

Le butin (captures, objets, argent) est cumulé dans `run.loot` à chaque
victoire et vit sous la carte jusqu'à la sortie — il ne se réinitialise pas
après chaque combat. (Le sentiment de « reset » venait du bug n° 3 : le boss
auto terminait le run prématurément.)

### Vérifications

- `npm test` : **1077/1077** (10 nouveaux tests `passe39b`).
- `npm run validate` + `check:i18n` + `build` OK (1812 images, dont
  `pokeball.svg` et `star.svg`).
- Sondes navigateur `visual-passe38b` et `visual-passe38` : toutes vertes —
  pokéball du titre sur les combats, boss ROUGE `rgb(211,66,95)`, combat
  violet ≠ coffre or `rgb(242,217,78)`, élite orange étoilée, butin sous la
  carte en `.loot-item` avec sprites de monnaies, résumé avec pièce + jeton,
  **aucune erreur JavaScript**.

## Passe 38f — 4 retours joueur : butin réinitialisé, plus de boss auto, aucun soin en donjon, guide immersif (2026-08-30)

### 1. Le butin repart de ZÉRO à l'ouverture d'un donjon

Retour : « quand on commence un donjon le butin ne se reset pas, ce qui fait
qu'on voit celui d'un combat ou donjon précédent ». `startDungeonRun()` vide
la session de combat (captures, objets, argent, jetons) avant de créer le
run : le panneau sous la carte n'affiche plus jamais le butin d'un combat
ou donjon antérieur.

### 2. Plus JAMAIS de combat de boss lancé au hasard

Retour : « parfois lancer un combat normal lance celui du boss, comme si
l'ancien compteur de boss au bout de N combats était encore actif ». Le
dernier vestige du compteur a été retiré : `dungeonFight()` armait le boss
dès que le quota de victoires était atteint sur le palier final, et
n'importe quel combat engagé ensuite devenait le gardien. Désormais, sur la
carte, le drapeau « gardien » n'est posé QUE par un clic sur la case boss
(`dungeonMoveTo`) — jamais par un combat normal, le bouton « Combattre » ou
le pilote auto (qui clique lui-même la case boss).

### 3. AUCUN soin pendant toute la durée du donjon

Retour : « pendant toute la durée du donjon l'équipe du joueur ne doit pas
être heal, c'est la difficulté du donjon avancé, mais sans perdre toute sa
team ». Deux soins automatiques ont été neutralisés en expédition :
- `startBattle()` ne soigne plus l'équipe en début de combat (c'était le
  vrai « reset » : chaque combat remettait tout le monde à 100 % PV) ;
- `endBattle()` ne déclenche plus naturalcure / régénérateur.
Les PV persistent d'un engagement à l'autre : c'est la difficulté. Le
K.O. général reste l'issue : la descente s'arrête, la moitié du sac est
perdue (péage remboursé au palier 1), et l'équipe n'est jamais perdue —
elle est soignée au combat suivant, hors donjon.

### 4. Guide donjon réécrit pour un joueur

Retour : « le guide n'est pas pour moi, il est pour un joueur ; il n'a pas
besoin des informations techniques, il a juste besoin de comprendre comment
fonctionnent les donjons ». Les 5 pages du guide ont été réécrites (FR/EN +
repli du tutoriel) :
- plus aucune phrase « de dev » : « (celle de la barre de titre) »,
  « Chaque case a sa couleur », « les monnaies paraissent avec leur
  icône… », « Re-clique sur le mode actif… » ont disparu ;
- plus de noms de lieux précis (« Forêt de Jade, Mont Sélénite… ») ;
- « Lire la carte » est une légende : chaque couleur + sa case, une ligne
  par type (pokéball violette = combat, étoilée orange = combat corsé,
  coffre doré = trésor, boss rouge = gardien, échelle bleue = sortie,
  brouillard = à découvrir) ;
- le butin se résume à : chaque victoire remplit le sac, le butin s'affiche
  sous la carte, « Remonter et encaisser » rassemble tout ;
- le mode auto se résume à : débloqué après plusieurs complétions, 3
  options (foncer vers le boss / explorer tout le plateau / coffres).

### Vérifications

- `npm test` : **1085/1085** (8 nouveaux tests `passe39c`).
- `npm run validate` + `check:i18n` + `build` OK (1812 images).
- Sondes navigateur `visual-passe38b` et `visual-passe38` : toutes vertes,
  **aucune erreur JavaScript**. Vérifié en navigateur : ouverture d'un
  donjon après un combat → butin vide ; combat normal engagé sur la carte →
  `pendingDungeonBoss` reste faux ; équipe blessée à 40 % PV → les PV
  restent à 40 % pendant le combat (aucun soin).

## Passe 38g — 3 retours joueur : la faune du lieu dans les donjons (boss = rare), jamais de roaming en donjon, barres de PV pleines et stables (2026-08-30)

### 1. La composition d'un donjon suit la rareté de la zone

Retour : « les rares de la zone doivent être les boss, les peu communs les
combats corsés et les autres les communs » — avec un exemple flagrant : à
la Forêt de Jade, le boss devait être **Pikachu** (le rare du lieu), pas
**Raichu** (absent du lieu, que produisait la règle « meilleure évolution
finale par BST »).

`pickWildFromTable` accepte désormais un **`bucketHint`** qui force le seau
(c'est aussi ce qui neutralise le roaming, voir §2) :

| Case engagée | Seau forcé | À la Forêt de Jade |
|---|---|---|
| Boss (gardien) | `rare` via `_dgBossSpecies` | **Pikachu #25** |
| Élite (combat corsé) | `uncommon` | Metapod #11 / Kakuna #14 |
| Combat ordinaire | `common` | Caterpie #10 / Weedle #13 |

- `_dgBossSpecies` a été refondue : le gardien est le **rare du lieu pris
  tel quel** (plus jamais son évolution finale). Repli par palier
  (rare → peu commun → commun) pour les zones sans étiquette, où l'ancienne
  règle de l'évolution finale reste la garde-fou.
- L'ECS lit la case engagée (`run.pendingNode`) et force le seau à chaque
  apparition : un combat commun ne peut plus tirer un rare, une élite ne
  peut plus tirer un commun, le gardien est toujours le rare de la zone.

### 2. Aucun légendaire errant ne peut tomber sur une zone donjon

Retour : « comment ça se passe pour les roaming qui peuvent tomber sur une
zone donjon ? ». Les pools de roaming ne contiennent déjà que des routes
extérieures (Kanto/Johto/Hoenn) ; la garantie est maintenant **explicite et
verrouillée** : `getRoamingLegendaryForRoute` renvoie `null` pour tout lieu
de type `dungeon` (garde-fou même si un donjon entrait un jour dans un
pool), et `pickWildFromTable` saute le tirage roaming dès qu'un `bucketHint`
est posé (donc sur toute case de donjon). Une expédition se joue contre la
faune locale ; le gardien en est le rare.

### 3. Barres de PV : pleines à « full hp », et stables

Retour : « la barre bouge et n'est pas remplie au max alors que le pokemon
est full hp ». Les PV du moteur sont flottants (dégâts fractionnaires du
ticker 60 fps) : à 45,9999/46 le texte lisait « 46/46 » mais la barre,
calculée sur le ratio brut, affichait 99,98 % et **oscillait** entre
99,98 % et 100 % avec la transition 0,3 s.

Le pourcentage de barre est désormais calculé sur les **PV affichés**
(mêmes entiers que le texte) :

- `hpBarPct(45,9999 ; 46) === 1` : à « full hp » la barre est pleine ;
- texte et barre partagent exactement les mêmes entiers : la barre ne
  bouge que quand le texte bouge ;
- appliqué dans les trois rendus (combat dynamique `battle-ui`, cartes
  `pokemon-card-element`, rangée d'équipe `battle-team-ui` → fiche pleine).

### Vérifications

- `npm test` : **1094/1094** (9 nouveaux : `passe39d` + `bucketHint`).
- `npm run validate` + `check:i18n` + `build` OK (1812 images).
- Sondes navigateur `visual-passe38g` (nouvelle), `visual-passe38b` et
  `visual-passe38` : toutes vertes, **aucune erreur JavaScript**. Vérifié en
  navigateur à la Forêt de Jade : le gardien est **Pikachu #25** (jamais
  #26), une case élite donne un **peu commun** (Coconfort #14), un combat
  donne un **commun** (Aspicot #13), `getRoamingLegendaryForRoute` renvoie
  `null` pour le donjon, et à plein PV la barre lit **100 %** et reste
  identique tant que le texte de PV affiché ne change pas.

## Passe 39d — 5 retours donjon : butin unifié sous la carte, grille sans débordement, espèces par rareté du lieu, roaming sur routes seules, équilibrage max 3 paliers (2026-08-31)

### 1. Butin / résumé UNIFIÉ, situé sous la carte de donjon

Retour : « l'affichage des butin/résumé doit être situé sous la carte de
donjon et le butin résumé de combats normaux et de donjon doivent être le
même exactement. Donc supprime le dupliquer que tu as fait pour le donjon. »

- Le butin du donjon vit **sous la carte** (bandeau `.pw-bdg-loot`), toujours
  visible — y compris pendant un combat (le bandeau reste sous la scène).
- Le rendu parallèle a été **supprimé** : `_dgLootHtml` produisait des puces
  « maison » avec des sprites de monnaies (pièce, jeton). Il utilise
  désormais **exactement le même balisage** que les combats normaux
  (`renderBattleLoot`) : puces `.loot-item`, monnaies `.loot-money` avec
  icône symbole + compteur, captures/objets en `×N`. Plus aucune divergence.
- Pendant un run, la réglette de la scène de combat (`#battle-loot-inline`)
  est masquée : un seul affichage de butin, sous la carte.
- Le résumé de session (modal de fin) était déjà le composant commun
  (`SessionSummaryView`) — il l'est resté : à la sortie du donjon, captures,
  objets, argent de combat et jetons encaissés paraissent exactement comme
  après un combat normal.

### 2. Les donjons avec trop de cases ne débordent plus de la fenêtre

Retour : « les donjons avec trop de cases dépassent de la fenêtre, ce qui
est moche et problématique ». La carte progressive culminait à 15×10
(150 tuiles de taille fixe) : l'ensemble devenait plus haut que l'écran.

- Grille plafonnée à **11×8** (88 cases) : 7×5 au début, 11×8 au maximum
  (la Caverne Azurée passe de 150 à 88 cases).
- Colonnes `minmax(0, 1fr)` + `max-height: min(62vh, 520px)` + **scroll
  interne** : même une grande carte respire dans la colonne centrale et
  défile en interne au lieu de pousser le bandeau hors de la fenêtre.

### 3. Espèces du donjon = la faune du lieu, par rareté

Retour : « j'ai des problèmes sur les espèces dans les donjons qui ne sont
pas bonnes. Tu dois prendre les pokemon du lieu et faire un random parmi ce
qu'il y a : Combat normal → pokemon commun, Combat corsé → pokemon Peu
commun, Combat de boss → pokemon rare ».

Le seau est forcé par la **case engagée** (rappel 38g, complété) :
- case **combat** → seau `common` (ex. Forêt de Jade : Caterpie/Aspicot) ;
- case **élite** (corsée) → seau `uncommon` (Chrysacier/Coconfort) ;
- case **boss** → seau `rare` (Pikachu #25 — jamais son évolution hors zone).

Toutes les tables `loc.wild` du jeu sont étiquetées (common/uncommon/rare) :
le tirage est donc toujours un Pokémon présent dans le lieu, jamais une
évolution indisponible.

### 4. Roaming : uniquement sur les routes, jamais en donjon

Retour : « les roamings doivent se trouver uniquement sur des routes et non
pas sur des donjons afin de ne pas punir le joueur à dépenser pour des
entrées de donjon inutilement ».

Garantie verrouillée à trois niveaux : `getRoamingLegendaryForRoute`
renvoie `null` pour tout lieu de type `dungeon` ; `syncPlayerPresence`
force `roamingId = 0` dès que le lieu est un donjon **ou** qu'un run est
actif ; `pickWildFromTable` saute le tirage roaming dès qu'un `bucketHint`
est posé (toute case de donjon). Un errant ne peut donc jamais tomber sur
une expédition.

### 5. Équilibrage : grand max 3 paliers, quotas courts, péages plafonnés

Retours : « les coffres de donjon avancé ne donnent pas plus de récompense
que les donjons de début de jeu » et « maintenant que l'on a nos pv qui ne
remontent pas à chaque combat, 12 paliers à compléter c'est beaucoup trop
et impossible, il faudrait grand max 3 paliers ».

- **Profondeur** : une grotte fait 2 paliers sans badge, **3 au maximum**
  (au lieu de 5 → 12). Une forêt reste à 1 niveau.
- **Quotas courts** : 4 victoires au premier palier, +1 par palier (au lieu
  de 8 + 2×). La difficulté vient de la descente (PV persistants), pas de
  la répétition.
- **Butin par victoire relevé** : `6 + 4×badges` jetons et
  `80 + 60×badges` ₽ (au lieu de `2+2b` / `40+40b`) — un donjon avancé
  (8 badges) verse ≥ 4× les jetons et ≥ 5× l'argent d'un donjon de début.
- **Péages plafonnés** : 100 → **1000** JD (au lieu de 100 → 50 000) :
  l'entrée n'est plus une punition, la récompense (croissante) paie le
  risque.
- Multiplicateur de palier : ×1, ×1,5, ×2 (+0,5 par palier au lieu de 0,4).

### Vérifications

- `npm test` : **1105/1105** (11 nouveaux tests `passe40-donjons-39d`).
- `npm run validate` + `check:i18n` + `build` OK (1812 images).
- Sondes navigateur `visual-passe39d` (nouvelle) : toutes vertes, **aucune
  erreur JavaScript** — butin sous la carte avec puces `.loot-item`,
  réglette masquée pendant le run, grille Caverne Azurée 11×8 qui tient
  dans la fenêtre (704×510 dans 774×677), boss = Pikachu #25, élite =
  peu commun, combat = commun, roaming `null` en donjon, profondeur 3,
  quota 4, péage 8 badges = 1000. Sondes `38g` / `38b` / `38` : toutes
  vertes (seule la taille attendue de la grille mtmoon a été mise à jour
  8×6 → 8×5 pour refléter le plafonnement).

## Passe 39e — Retour joueur : « le butin/résumé n'est toujours pas unifié » — UN SEUL composant, UN SEUL total (2026-08-31)

### 1. La réglette de combat NORMALE est désormais LE butin des donjons

Retour : « Le butin et résumé n'est toujours pas unifié, dans les donjons
et les combats normaux il y a toujours deux butins différents, le résumé
affiche le résumé d'un seul pokemon et pas du donjon en entier, les gold
sont dupliqués (total obtenu + obtenu pendant le dernier combat), tu n'as
rien unifié du tout, et le résumé doit être SOUS LA CARTE car il concerne
tout le donjon. »

La passe 39d avait créé un bandeau `.pw-bdg-loot` sous la carte : même
balisage que les combats normaux, mais **c'était toujours un second
rendu**, et le résumé ne montrait que le dernier combat. Tout est repris
autour d'**un seul composant** :

- `#battle-loot-inline` — la réglette des combats normaux — est **déplacée
  dans `index.html` sous le bandeau de donjon** (`#battle-loot-row`, après
  `#battle-dungeon-bar`) : c'est le **composant unique** du butin, en
  donjon comme en combat normal. Le bandeau `.pw-bdg-loot` et la fonction
  `_dgLootHtml` sont **supprimés** du code applicatif.
- Pendant un run, la réglette reste visible (entre deux combats comme
  pendant un combat) : règle `html[data-dungeon-run="1"]` **ou**
  `#battle-center-panel:has(#battle-active-scene.is-live)`.

### 2. Les données montrent TOUT le run, avec UN SEUL total d'argent

- Nouvelle source unique `getBattleSessionSummaryData()` : quand un run est
  actif, elle agrège **toutes** les captures (`run.loot.catches` + session),
  tous les objets, **tout** l'argent gagné (`run.loot.money` + session) et
  les jetons du sac (`run.bag.tokens`) — plus rien ne se limite au dernier
  combat.
- `renderBattleLoot()` passe par `battleSummaryUIModel()` →
  `SessionSummaryView.inlineHTML(model)` — **la même vue que le résumé
  modal** — avec repli sur `getBattleSessionSummaryData()` ; l'appel à
  `refreshDungeonPanel` (qui aurait bouclé avec le bandeau) est supprimé.
- Le résumé modal (à la sortie du donjon) montre **le donjon entier** :
  toutes les captures du run, tous les objets, et les monnaies dans les
  puces uniquement — les lignes `money`/`tokens` ont été **retirées de la
  grille de stats** (39e) : l'argent apparaît une seule fois.

### Vérifications

- `npm test` : **1105/1105** (tests 33.11, 37-D10, 38c-L2/L4, 39-K2,
  39b-L1/L2/A1, 38e-S1, 39d-U1/U2 réécrits vers le référentiel
  `#battle-loot-inline` / `getBattleSessionSummaryData` ; plus aucune
  référence à `_dgLootHtml`/`.pw-bdg-loot`).
- `npm run build` + `validate` + `check:i18n` OK.
- Nouvelle sonde `visual-passe39e` : toutes vertes, aucune erreur JS —
  réglette **sous la carte** et visible pendant le run ; deux combats
  simulés → Pikachu **et** Évoli cumulés dans la réglette ; **un seul**
  total d'argent **+190** (150 + 40, pas de doublon) ; résumé modal =
  même run (+190, 2 captures) ; puces `.loot-item` communes ; aucun
  panneau parallèle dans le bandeau. Sondes `39d` / `38b` / `38g` / `38` :
  toutes vertes.

## Passe 0 — Restructuration, correction & réassemblage (2026-08-14)

### Ce qui a été fait

- **Réassemblage complet du projet** depuis le dump unique vers l'arborescence réelle : 645 fichiers remis en place (`src/`, `tools/`, `tests/`, configs racine).
- **Vérification complète** : `npm run build` ✅ · `npm test` ✅ 807/807 · `npm run validate` ✅ · `npm run check:i18n` ✅ · smoke tests Chromium ✅ (boot, ECS, base, vues).
- **Téléchargement de tous les assets** via `tools/download_assets.py` (1 498 fichiers : sprites PokeAPI, dresseurs PokéClicker, bases Émeraude…).
- **7 sprites d'objets tenus ajoutés** (5 réels PokeChill : `clear_amulet`, `eject_pack`, `foggy_seed`, `heavy_duty_boots`, `loaded_dice` ; 2 stand-ins de la même famille PokéClicker pour `chipped_pot` / `masterpiece_teacup` — **à remplacer si tu fournis les officiels**). Downloader mis à jour pour pérenniser.

---

## Passe 1 — P0 monétaire : portefeuille, Poké Balls, capture, donjons, 💎 (2026-08-14)

### Ce qui a été fait (implémenté dans `src/`)

**1. Portefeuille multi-monnaies** — `src/application/economy/currency.js`
- `G.wallet` : Jetons de donjon (JD), Points de quête (PQ), Diamants (💎) — Pokédollars = `G.money`, Points de combat = `G.atoll.tokens`.
- Formules PokéClicker : **₽/victoire** = `max(10, 3d + 5d^1.15)` · **JD/capture** = `max(1, 6×(2d/(2.8/(1+région/3)))^1.08)`.
- Péage des donjons `[100 … 50 000 JD]` par badgeReq · barème PQ des quêtes répétables · valeurs 💎 des 7 trésors.

**2. Système de Poké Balls** — `src/application/economy/pokeballs.js`
- Poké 100 · Super 500 · Hyper 2 000 · Master 10 M (taux 10/15/20/100 %). **10 Poké Balls de départ**.
- **Honor Ball** (blanche et rouge, sprite généré) : 1 offerte par tranche de 10 Poké Balls achetées.
- **Filtres façon PokéClicker** : chaque ball est affectée à des catégories (non capturés / capturés / chromatiques) — pas de ball « active » unique.

**3. Fenêtre « Monnaies »** (dashboard) — `src/ui/game/currency-window.js`
- Fenêtre permanente type carte/équipe/pension. Icônes officielles **PokéClicker** (`src/assets/images/currency/*.svg`, ajoutées au jeu **et** au tool). Révélation progressive. **Pas d'énergie, pas de textes de production.**

**4. Fenêtre « Poké Balls »** (dashboard) — `src/ui/game/pokeball-window.js`
- Quantités + filtres par ball/catégorie. **L'achat se fait en boutique**, pas ici.

**5. Capture par Poké Ball** — `src/application/combat/catch.js`
- Ball affectée consommée à chaque tentative (réussite ou échec), taux 10/15/20/100 %.
- **Chaque capture réussie rapporte des JD** (doublons compris).

**6. Argent par victoire sauvage** — `src/application/combat/battle-status.js` (le robinet PokéClicker).

**7. Quêtes répétables → PQ** — `src/application/quests/quest-core.js` (fini le robinet ₽ infini).

**8. Trésors de mine → 💎** — vente via l'ECS crédite les 💎 (UI du sac mise à jour : « +X💎 »). 5 nouveaux trésors ajoutés au pool de la mine.

**9. Animation de capture (désactivable)** — `src/ui/game/capture-animation.js` + toggle dans les réglages.

**10. Achat des balls dans les boutiques** — `src/ui/game/shop-panel.js` (Poké Ball partout, Super/Hyper selon la région/badges).

**11. Super Bonbon re-prixé 50 000 → 10 000 ₽.**

### Vérifications
- `npm run build` ✅ · `npm test` ✅ **813/813** · `validate` ✅ · `check:i18n` ✅.
- `tests/harness/smoke-p0.mjs` (20 assertions en vrai navigateur) : fenêtres dashboard, filtres, balls en boutique, Honor Ball, ₽/victoire, **JD par capture**, vente 💎, PQ des quêtes répétables, toggle d'animation, absence du bandeau d'en-tête — **0 erreur**.
- Vérif browser complémentaire : l'overlay d'animation apparaît puis disparaît ; la boutique liste les balls.

### État vs `docs/PROPOSITION_MONNAIES.md`

| Bloc | État |
|---|---|
| ₽ par victoire sauvage + primes dresseurs | ✅ implémenté |
| Poké Balls + Honor Ball + filtres | ✅ implémenté |
| Fenêtre Monnaies (dashboard) | ✅ implémenté |
| Fenêtre Poké Balls (dashboard) | ✅ implémenté |
| Achat des balls en boutique | ✅ implémenté |
| Capture par ball + animation + toggle | ✅ implémenté |
| Quêtes répétables → PQ | ✅ implémenté |
| Trésors → 💎 (mine) | ✅ implémenté (vente + 5 trésors) |
| Super Bonbon 10 000 ₽ | ✅ implémenté |
| Péage des donjons | 🔶 **en attente** : la fonction `dungeonToll` existe, mais le péage s'appliquera à l'**exploration** du donjon (système dédié à venir), pas au déplacement sur la carte |
| Personnel en rotation ₽/PQ/💎/PC | ⬜ à coder |
| Auto-modes : déblocage PQ · usage ₽ · mine 💎 | ⬜ à coder |
| Marché Pokémon + objets d'évolution → PQ | ⬜ à coder |
| Emplacements pension/entraînement → PQ | ⬜ à coder |
| Objets d'Oak (Lucky Egg, Amulet Coin, Shiny Charm) | ⬜ à coder |
| Plafond de bonus d'argent ×1,5 | ⬜ partiel (base secrète appliquée au ₽/victoire) |
| Base secrète : répartition 40/30/20/10 | ⬜ à coder |
| Refonte du tuto (`docs/PROPOSITION_TUTO.md`) | ⬜ à coder |

### État vs roadmap (ROAD_MAP)

| Passe roadmap | État |
|---|---|
| **P0 — Refonte monétaire** | 🔶 en cours (~70 % : cœur fait ; restent péage des donjons côté exploration, personnel, auto-modes, PQ achats, Oak, tuto) |
| P1 — Correctifs | ⬜ non démarrée |
| P2 → P10 | ⬜ non démarrées |

### Prochaine action (ordre proposé)

1. **Terminer P0** : péage des donjons à l'exploration (pas à la carte) · personnel en rotation · auto-modes (déblocage PQ, usage ₽, mine 💎) · marché Pokémon + objets d'évolution → PQ · emplacements → PQ · objets d'Oak · refonte du tuto.
2. Puis **P1 — Correctifs** (12 bugs) et **FIX-07b/07c/10** avant le « gisement dormant ».

---

## Passe 2 — P0 monétaire v3 : fidélité PokéClicker (2026-08-14)

### Corrections suite aux retours

1. **Fenêtre « Monnaies » à l'image de PokéClicker** : bandeau horizontal, une colonne par monnaie (icône officielle PokéClicker au-dessus, montant dessous), tooltip « gagnée en… ». Révélation progressive. Pas d'énergie, pas de textes de production.
2. **Fenêtre « Poké Balls » à l'image de PokéClicker** : table **Nom | Ball | Qté** où chaque ligne = un **filtre de capture** (liste prioritaire, presets : Nouveau chromatique / Nouveau / Chromatique déjà capturé / Déjà capturé). Clic sur la ball → cycle (none → Poké → Super → Hyper → Master) ; clic sur le nom → active/désactive (grisé).
3. **Achat des balls par lots** en boutique : boutons **+1 / +10 / +100** (Super/Hyper selon région+badges).
4. **Vrais sprites de balls PokéClicker** : Poké/Super/Hyper/Master (dossier `items/pokeball/`), **Honor Ball = Premier Ball officielle** (blanche et rouge). Plus le sprite généré.
5. **Derniers assets fournis** : `masterpiece_teacup.png` + `unremarkable_teacup.png` installés → **plus aucun asset manquant**.
6. **Récompenses de quêtes dynamiques** : `computeRewardText(cat, def)` lit le tableau de récompenses (₽/PQ/objets/Pokémon) au lieu du texte en dur. Les quêtes répétables affichent bien « X PQ ».
7. **Animation de capture dans la fenêtre de combat** : l'overlay est centré sur `#battle-center-panel` (plus au milieu de l'écran).
8. **Péage des donjons à l'exploration** : le bouton « Explorer » d'un donjon affiche le tarif (« Explorer — 100 JD »), **bloque sans JD** (message), et **débite les JD** en lançant l'exploration. (Plus de blocage du déplacement sur la carte.)
9. **Farm de donjon** : point ouvert documenté en **Annexe E de la roadmap** (4 pistes, à trancher en P1/P7).

### Vérifications
- `build` ✅ · `npm test` ✅ **813/813** · `validate` ✅ · `check:i18n` ✅ · `smoke-boot` ✅.
- `smoke-p0.mjs` : 20 assertions en navigateur — fenêtres dashboard, filtres (table), balls en boutique, Honor Ball, ₽/victoire, JD par capture, vente 💎, PQ des quêtes, toggle animation — **0 erreur**.
- Vérif browser ciblée : bouton « Explorer — 100 JD » · blocage sans JD · débit de 100 JD + lancement du combat avec JD.

### État vs `docs/PROPOSITION_MONNAIES.md` (inchangé, sauf)
- Péage des donjons ✅ **implémenté à l'exploration** (le système de donjon complet avec boss reste pour P1/P7).

### Prochaine action
Terminer P0 : personnel en rotation ₽/PQ/💎/PC · auto-modes (déblocage PQ, usage ₽, mine 💎) · marché Pokémon + objets d'évolution → PQ · emplacements → PQ · objets d'Oak · refonte du tuto. Puis P1 (correctifs) + FIX-07b/07c/10 avant le « gisement dormant ».

---

## Passe 3 — P0 monétaire v4 : fidélité PokéClicker (fenêtres, balls, shop) + suite P0 (2026-08-14)

### Corrections suite aux retours (fenêtres & balls)

1. **Fenêtre Monnaies** : retiré le texte « X monnaie(s) encore à découvrir… ».
2. **Fenêtre Poké Balls** : retiré la ligne Honor Ball, le texte « Honor Ball offerte… » et « Achète tes balls… ».
3. **Sélecteur de ball à la PokéClicker** : clic sur la ball d'un filtre → petit modal listant **Aucune / Poké / Super / Hyper / Master** (sprite + quantité), clic pour choisir. Ligne = filtre (clic → actif/inactif, grisé).
4. **Icône de fenêtre Poké Balls** = icône du Pokédex (`getIcon('pokeball')`).
5. **Sprites de balls officiels PokéClicker** : SVGs `assets/images/pokeball/*.svg` (Pokeball, Greatball, Ultraball, Masterball, Premierball = Honor Ball). Ajoutés au tool `download_assets.py`.
6. **Récompenses de quêtes** : `computeRewardText` utilisé partout (cartes d'histoire, dialogues PNJ, **tableau des quêtes répétables**). Fini les ₽ en dur.
7. **Animation de capture** : placée **sur le Pokémon ennemi** (1ʳᵉ carte de `#battle-team-row`), repli sur la fenêtre de combat.
8. **Bouton Explorer** : affiche le **sprite de la monnaie** (`dungeonToken.svg`) au lieu de « JD ».
9. **Boutique des balls** : quantité saisissable + **prix total affiché** + bouton Acheter (comme PokéClicker), au lieu des +1/+10/+100.

### Suite de P0 implémentée

10. **Personnel en rotation de monnaies** : embauche n°1 ₽ 25 000 → n°2 PQ 1 000 → n°3 💎 20 → n°4 PC 100 → … (échelles croissantes). Prix affiché sur le bouton d'embauche.
11. **Auto-modes** : déblocage **PQ** (auto-éclosion 500, auto-remplissage 1 000, auto-entraînement 1 000), **auto-mine tout en 💎** (déblocage 1 000 💎 + 1 💎/tuile).
12. **Marché Pokémon → PQ** : prix en PQ (starters 1 000→3 000, rares 1 500→6 000), achat en PQ.
13. **Emplacements d'entraînement → PQ** (multi-slot 2 500 PQ).
14. **Objet d'Oak — Amulet Coin (Pièce Rune)** : achat 1 500 PQ en boutique, **×1,1 sur l'argent de combat** (cumulé avec la base secrète, plafonné ×1,5 à terme). Le Lucky Egg (objet tenu) et le Charme Chroma (récompense de Pokédex) existent déjà.

### Vérifications
- `build` ✅ · `npm test` ✅ **813/813** · `validate` ✅ · `check:i18n` ✅ · `smoke-boot` ✅ · `smoke-p0` ✅.
- Vérifs navigateur ciblées : rotation du personnel (n°1 ₽ / n°2 PQ), marché en PQ, Amulet Coin (×1,1), auto-éclosion en PQ, picker de ball, boutique avec quantité+total, bouton Explorer avec sprite.

### État vs `docs/PROPOSITION_MONNAIES.md`

| Bloc | État |
|---|---|
| ₽/victoire · balls+filtres · fenêtres · achat shop · capture+anim · PQ quêtes · 💎 trésors · Super Bonbon · péage donjons (exploration) | ✅ |
| Personnel en rotation | ✅ |
| Auto-modes (PQ/₽/💎) | ✅ |
| Marché Pokémon → PQ | ✅ |
| Emplacements → PQ | ✅ (entraînement) |
| Objets d'Oak | 🔶 Amulet Coin fait · Lucky Egg (tenu) & Charme Chroma (dex) déjà en jeu |
| Plafond de bonus ×1,5 | 🔶 partiel (Amulet Coin + base secrète appliqués) |
| Base secrète 40/30/20/10 | ⬜ |
| Refonte du tuto | ⬜ |

### Prochaine action
1. Refonte du tuto (`docs/PROPOSITION_TUTO.md`) — 13 étapes.
2. Puis **P1 — Correctifs** (12 bugs) et **FIX-07b/07c/10** avant le « gisement dormant ».

---

## Passe 4 — Corrections P0 (honor ball, filtres, staff, mine/auto, animation) (2026-08-14)

### Corrections

1. **Honor Ball rétablie et équipable** : de retour dans le sélecteur de ball (Aucune → Poké → Super → Hyper → Master → **Honor**). Toujours offerte (1 par tranche de 10 Poké Balls achetées). Plus de ligne « nombre » dans la fenêtre.
2. **Fenêtre Poké Balls** : colonnes **Ball | Qté alignées à droite** sur toutes les lignes.
3. **Menu ⚙ de paramètres des Poké Balls** (à la PokéClicker) : créer un filtre, le supprimer, le réordonner (↑/↓ = priorité), activer/désactiver, cocher les options (chromatique / déjà capturé / non capturé), changer la ball. Ordre = priorité (1ʳᵉ correspondance gagne).
4. **Récompenses de quêtes** : vérifiées dérivées du tableau pour **principales ET secondaires ET répétables** (« Récompense : 400 ₽ · Baie Babiri » construit dynamiquement).
5. **Animation de capture** : **ancrée DANS la carte du Pokémon ennemi** (suit le scroll) + **le combat attend la fin de l'animation** avant de faire apparaître le Pokémon suivant (flag `__pwCaptureAnimUntil` consommé par `onEnemyFaint`).
6. **Pièce Rune (Amulet Coin) supprimée** — c'était un ajout non demandé.
7. **Personnel déterministe** : prix **fixe par membre** (1ᵉʳ = 25 000 ₽, 2ᵉ = 1 000 PQ, 3ᵉ = 20 💎, 4ᵉ = 100 PC, 5ᵉ = 75 000 ₽…), plus aucun aléa entre sauvegardes.
8. **Mine en 💎** : outils (Pioche 400 / Foreuse 800 / Dynamite 1 200), énergie +25 (100/250/500/1 000), auto-mine (1 000 💎 + 1 💎/tuile).
9. **Pension & entraînement en PQ** : emplacements pension (500/1 000/2 500), file pension (5 000→50 000), multi-slot entraînement (2 500), file entraînement (5 000→50 000), auto (éclosion 500, remplissage 1 000, entraînement 1 000). Labels UI corrigés (plus de ₽, plus de « 1 000 000 » en dur).

### Vérifications
- `build` ✅ · `npm test` ✅ **813/813** · `validate` ✅ · `check:i18n` ✅ · `smoke-boot` ✅ · `smoke-p0` ✅.
- Vérifs navigateur : honor ball dans le sélecteur, éditeur de filtres (création 4→5), staff (1ᵉʳ ₽ 25 000 / 2ᵉ PQ 1 000), Pièce Rune absente du shop, récompense quête dérivée, animation ancrée dans la carte ennemie + flag d'attente.

### Prochaine action
1. Refonte du tuto (`docs/PROPOSITION_TUTO.md`).
2. Puis **P1 — Correctifs** (12 bugs) et **FIX-07b/07c/10** avant le « gisement dormant ».

---

## Passe 5 — Corrections (animation/captures, fenêtre & paramètres Poké Balls, sprites) + Tutu 13 étapes (2026-08-14)

### Corrections

1. **Animation + captures réparées** : l'animation était ancrée dans la carte du Pokémon ennemi, détruite par `renderBattleTeamRow()` juste après la capture → elle disparaissait instantanément. Correction : overlay `fixed` positionné sur la carte ennemie + flag `__pwCaptureAnimUntil` consommé par `onEnemyFaint` (le combat attend la fin de l'animation avant le Pokémon suivant). Vérifié en navigateur : capture OK, animation OK.
2. **Fenêtre Poké Balls** : table **Name | Ball | Qté** avec colonnes alignées + bouton ⚙.
3. **Paramètres Poké Balls à la PokéClicker** : modal avec « Nouveau filtre » + « Réinitialiser », note de priorité (« la 1ʳᵉ correspondance gagne »), chaque filtre avec **slider activer/désactiver**, **↑↓ réordonner**, **options +/−** (chromatique / déjà capturé / non capturé), **ball (sélecteur)**, **✕ supprimer**.
4. **Récompenses de quêtes avec sprites** : `computeRewardText` affiche les icônes de monnaies (`money.svg`, `questPoint.svg`…) au lieu des symboles ₽/PQ. Appliqué aux quêtes principales, secondaires et répétables.
5. **Sprites partout** : personnel (sprite sur le bouton d'embauche), mine (💎), pension/entraînement (PQ), marché Pokémon (PQ), boutique (balls). Les composants `staff.js` / `management.js` / `MarketView` / `QuestView` rendent ces libellés en `h.raw`.
6. **Tuto refondu en 13 étapes** (5 phases) : argent + fenêtre Monnaies → achat de balls → 1ʳᵉ capture → Honor Ball → interfaces → jetons de donjon + donjon → mine/💎 → quêtes/PQ → 1ᵉʳ badge. Compteurs `G.dungeonsExplored` et `G.repeatablesCompleted` ajoutés. Récompenses en balls via `G.pokeballs` (fini l'objet fantôme `potion:2`).

### Vérifications
- `build` ✅ · `npm test` ✅ **813/813** · `validate` ✅ · `check:i18n` ✅ · `smoke-boot` ✅ · `smoke-p0` ✅.
- Vérifs navigateur : 13 étapes de tuto, combat + capture + animation OK, récompense quête avec `money.svg` + sprite d'objet, fenêtre Poké Balls (table) + éditeur (créer/réinitialiser/réordonner).

### Prochaine action
**P1 — Correctifs** (12 bugs) puis **FIX-07b/07c/10** avant le « gisement dormant » (talents/objets/attaques sans effet).

---

## Passe 6 — Corrections (animation dans la fenêtre, filtres PokéClicker, quêtes → PQ) (2026-08-14)

### Corrections

1. **Animation de capture DANS la fenêtre de combat, FIXE** : l'overlay est maintenant un enfant de `#battle-center-panel` (position:relative), centré en `absolute;inset:0`. Il ne suit plus le scroll ni le Pokémon, et n'est plus détruit par le re-render de l'équipe. **Cause du bug « l'animation disparaît »** : elle était ancrée dans la carte ennemie, recréée par `renderBattleTeamRow()` à chaque capture.
2. **Capture des doublons** : les filtres par défaut utilisent tous la **Poké Ball** (comme PokéClicker). Fini le « il me reste des balls mais rien ne se passe » : les doublons se capturent aussi (farm de Jetons de donjon).
3. **Fenêtre Poké Balls alignée** : une seule grille CSS (`1fr | 52px | 52px | 24px`), l'en-tête et les lignes partagent exactement les mêmes colonnes. Vérifié : deltas de position = 0.
4. **Paramètres Poké Balls à la PokéClicker** : **drag & drop** pour réordonner (poignée ⠿, l'ordre = priorité), **nom éditable** (input), slider activer/désactiver, options +/− (chromatique / déjà capturé / non capturé), sélecteur de ball, supprimer ✕, boutons « Nouveau filtre » / « Réinitialiser ».
5. **Quêtes principales et secondaires → Points de quête** : `claimQuest`, `completeQuestRewardBattle` et `completeQuestTrainerBattle` convertissent `rewardMoney` en PQ (barème `pqForMoney`). **Plus aucun Pokédollar en récompense de quête** (seuls les combats sauvages et les gains d'arène paient des ₽). L'affichage (`computeRewardText`) montre le sprite PQ. Vérifié en jeu : quête principale → +100 PQ, 0 ₽.

### Vérifications
- `build` ✅ · `npm test` ✅ **813/813** · `validate` ✅ · `check:i18n` ✅ · `smoke-boot` ✅ · `smoke-p0` ✅.
- Vérifs navigateur : animation `absolute` dans `#battle-center-panel` (qui devient `relative`), quête principale réelle → 100 PQ / 0 ₽, alignement des balls = [0,0,0,0], éditeur avec drag & drop + renommage, 0 erreur page.

### Prochaine action
**P1 — Correctifs** (les 12 bugs de la roadmap) puis **FIX-07b/07c/10**, avant le « gisement dormant » (talents/objets/attaques sans effet de combat).

---

## Passe 7 — Corrections (animation sur l'ennemi, filtres, prix shops, employés) + début P1 (2026-08-14)

### Corrections monnaie / Poké Balls

1. **Animation de capture AU NIVEAU du Pokémon adverse** : overlay `fixed` positionné au centre de la carte ennemie (elle ne suit pas le scroll, n'est pas détruite par le re-render). Vérifié : `atEnemy:true`.
2. **Monnaies de nouveau horizontales** : cause racine = `pokeball-window.js` redéfinissait `.pw-currency-panel` en `flex-direction:column` et écrasait le CSS de la fenêtre Monnaies. Renommé en `.pw-ball-panel`.
3. **Fenêtre Poké Balls** : nom à gauche, **ball + quantité en bout de ligne** (grille partagée, colonnes alignées).
4. **Filtres Poké Balls** :
   - **Fix clic éditeur** : la box a maintenant `data-action="stop-propagation"` (le clic sur l'input ne ferme plus la fenêtre).
   - **Filtre « Légendaire errant » (Roaming)** ajouté (détecte les roamers).
   - **5 filtres de base verrouillés** (`locked`) : Nouveau chromatique / Nouveau / Chromatique déjà capturé / Déjà capturé / Errant — **non renommables, non modifiables, non supprimables** (drag & drop d'ordre conservé).
5. **Prix du marché par région** (comme PokéClicker) : Kanto starters 1 000 / rares 2 000 · Johto 3 000 / 6 000 · Hoenn 6 000 / 12 000 PQ.
6. **Prix des shops selon PokéClicker** : objets tenus re-prixés (Tier 1 baies résistance + boosters = **20 000 ₽**, Tier 2 joyaux/graines/météo/utilitaires = **60 000 ₽**), CT re-prixées par puissance (**10 000 / 25 000 / 60 000 ₽**). 130 items + CTCS_PRICES mis à jour.
7. **Poké Balls débloquées progressivement** : Poké Ball partout, Super Ball dès 2 badges, Hyper Ball dès 6 badges.
8. **Employés dans les boutiques** : le bouton « Recruter » amène à la **boutique de la ville** de l'employé (plus d'achat direct) ; une section « Employés » apparaît dans la boutique avec le bouton d'achat.

### P1 — Correctifs (début)

- **FIX-04** : suppression du bonus de +5 000 ₽ à l'éclosion IV max.
- **FIX-05** : suppression du bonus d'argent à l'évolution en doublon (compteurs `dupeCatches`/`evolvedSpecies` conservés).
- **FIX-06** : les légendaires errants ne contournent plus le jet de capture (même taux que tout le monde).
- **FIX-09** : baies retirées (`oran`/`sitrus`) remplacées par des baies actives dans `official-teams-hoenn.js` et `training.js` (les objets fantômes `potion`/`superpotion` aussi retirés de la table de drop).

### Vérifications
- `build` ✅ · `npm test` ✅ **813/813** · `validate` ✅ · `check:i18n` ✅ · `smoke-boot` ✅ · `smoke-p0` ✅.
- Vérifs navigateur : animation sur l'ennemi, monnaies `flex-direction:row`, 5 filtres (roaming inclus) tous locked, box `stop-propagation`, shop re-prixé (CT 10k/25k, held 20k/60k), 0 erreur page.

### Prochaine action
**Suite de P1** : FIX-01/01b (movesets Hoenn), FIX-02 (échelle de puissance unique), FIX-07b (POKE_TALENTS écrasé), FIX-07c/10 (code mort), FIX-08 (14 espèces injoignables). Puis le « gisement dormant ».

## Passe 8 — Correctifs P1 (movesets Hoenn, échelle 12/18, code mort) + demandes répétées (2026-08-14)

### Demandes répétées (animation + filtres + shops + sac) — enfin réglées en profondeur

1. **Animation de capture — ancrée DANS la fenêtre de combat** : l'overlay n'est **plus** ajouté à `document.body` en `position:fixed` (cause de la dérive au scroll). Il est désormais **enfant de `#battle-center-panel`**, positionné en `absolute` au centre de la carte du Pokémon adverse (repère contenu de la fenêtre). Résultat : elle **reste collée au Pokémon** quand on scrolle (la fenêtre et l'overlay bougent ensemble). Le combat attend toujours sa fin (1150 ms) avant le Pokémon suivant.
2. **Éditeur de filtres Poké Balls — vrai panneau à cases (PokéClicker)** : chaque filtre est un panneau de **5 cases à cocher** à ajouter/retirer — *Non capturé / Déjà capturé / Chromatique / Chroma capturé / Errant*. Les 5 filtres de base sont **verrouillés** (cases grisées, nom non éditable, pas de suppression), les filtres perso sont entièrement modifiables. Drag & drop = priorité conservé.
3. **Filtre verrouillé « Nouveau » garanti** : la migration `ensurePokeballs()` ré-insère désormais **tout preset manquant** (Nouveau, Errant…) sur les anciennes sauvegardes — il ne peut plus disparaître.
4. **Shops — déblocage progressif PAR VILLE** (plus global aux badges) : Poké Ball partout · **Super Ball dès les villes ≥ 2 badges** · **Hyper Ball dès les villes ≥ 5 badges** · **Master Ball à la Ligue (≥ 8 badges)**. La 1ʳᵉ ville (Bourg Palette) ne vend **que** la Poké Ball, quel que soit le nombre de badges.
5. **Poké Balls dans le sac + dictionnaire des objets** : nouvelle catégorie **« Poké Balls »** du sac (lit `G.pokeballs`), et les 5 balls ajoutées à `ITEMS` (nom FR/EN, description, sprite SVG PokéClicker via `sprite`, `getItemSpriteUrl`). La fiche objet affiche le bon type « Poké Ball » et la bonne quantité.

### P1 — Correctifs (suite)

- **FIX-01** : les **37 fiches Hoenn** aux attaques invalides sont corrigées — **39 identifiants remplacés** par des attaques existantes de `moves.js` (ex. Machoc de Bastien : `karate_chop/low_kick/seismic_toss` → `low_sweep/rock_smash/brick_break` ; Magnéton de Voltaire : `shock_wave/supersonic` → `thunderbolt/metal_sound` ; Metagross de Pierre Rochard : `meteor_mash` → `iron_head`). Aucune fiche à moins de 2 attaques valides.
- **FIX-01b** : `tests/official-teams.test.js` charge maintenant les **3 régions**, l'assertion région accepte `['kanto','johto','hoenn']`, et un test dédié vérifie pour Hoenn : **toutes les attaques existent** + **≥ 2 attaques valides par fiche** + échelle 12/18.
- **FIX-02** : **échelle de puissance unique 12 IV / 18 EV (×2,50)** — plafond IV d'éclosion `6 → 12` (`hatchery.js`), plafond EV d'entraînement `6 → 18` + **total EV borné à 36** (`training.js`, `battle-switch.js`), IV de capture/doublon `6 → 12`, affichage `/6 → /12` (IV) et `/18` (EV). Les **10 fiches Hoenn hors échelle** (jusqu'à 31 IV / 64 EV) sont **ramenées à 12/18**. Commentaire mensonger d'`atoll-sets-data.js` corrigé.
- **FIX-07c** : suppression du code mort `talents-data.js` + `ability-db.js` (imports `main.js` retirés, fichiers supprimés). `TALENTS_FULL` reste la source unique.
- **FIX-10** : suppression du code mort `item-database.js` (import retiré, fichier supprimé, 20 boutiques fantômes `celadon_dpt_*` définitivement orphelines). Test `passe27-features` adapté.

### Vérifications
- `build` ✅ · `npm test` ✅ **814/814** · `validate` ✅ · `check:i18n` ✅ · `smoke-boot` ✅ · `smoke-p0` ✅ · **`smoke-p0b`** (nouveau, Chromium) ✅ : animation enfant de la fenêtre + ancrée après scroll, 5 filtres verrouillés dont « Nouveau », éditeur à cases, shop de pallet = Poké Ball seule, catégorie Poké Balls du sac, 0 erreur page.

### Prochaine action
**Suite de P1** : FIX-07b (option C hybride `POKE_TALENTS` : 3 slots canoniques + pool étendu, 135 espèces #252-386 à compléter), FIX-08 (14 espèces injoignables). Puis le « gisement dormant » (DORM-01 → DORM-04).

## Passe 9 — Retours détaillés : animation (chance de capture), filtres complets, tuto, boutique PokéClicker, header (2026-08-15)

### Animation de capture
1. **Deux phases** : phase 1 = ball qui secoue + **« Chance de Capture : N% »** (taux réel de la ball : Poké 10 %, Super 15 %, Hyper 20 %, Master 100 %, Honor 10 %) ; phase 2 = verdict « Capturé ! » / « Échec… ». Toujours ancrée au centre de la carte ennemie, dans la fenêtre de combat.
2. **Animations désactivées** : le verdict s'affiche quand même (sans secousse) et **bloque le spawn du Pokémon suivant** — plus besoin de scroller vers le résumé.

### Filtres Poké Balls (à la PokéClicker)
3. **Édition des paramètres repliable** : de base, seul le **nom** et la **ball** sont visibles/modifiables. Un bouton ⚙ par filtre bascule le panneau de paramètres (cases + menus).
4. **Nouveaux critères** : **Type du Pokémon** (menu déroulant des 18 types, affiché quand actif) et **Type de rencontre** (menu : Route / Donjon / Boss de donjon [réservé] / Errant) — remplace l'ancien critère « roaming » booléen.
5. **Ordre de base corrigé** : Nouveau → Nouveau chromatique → Chromatique déjà capturé → Déjà capturé → **Errant** (libellé « Errant », plus « légendaire »).
6. **Ordre = priorité confirmé** : `ballForEnemy` parcourt la liste dans l'ordre, la 1ʳᵉ correspondance active décide de la ball.
7. **Toutes les balls sur « none » par défaut** (presets inclus) : le joueur ne lance rien tant qu'il n'a pas posé une ball. Migration préservée pour les sauvegardes existantes.

### Tutoriel
8. **Étape 2 (fenêtre Monnaies) supprimée** — elle ne demandait aucune action et était infaisable. Remplacée par **« Configure tes Poké Balls »** : pose la Poké Ball sur le filtre « Nouveau » → **+25 Poké Balls** offertes (de quoi capturer même sans chance). L'étape « Acheter des Poké Balls » s'appuie désormais sur un compteur d'achat (`G.totalBallsBought`).

### Boutique (à la PokéClicker)
9. **Sélection par clic** : on clique un objet pour le sélectionner (surbrillance), puis en bas **Reset / quantité / +10 / +100 / Max / Acheter** avec le total affiché. Les achats uniques (employés) gardent leur bouton direct.
10. **Achat en quantité** : l'opération ECS `buy-item` accepte une quantité, bornée par le solde et par la place en sac (objets tenus plafonnés à 25).
11. **Master Ball** : vendue à la Ligue (≥ 8 badges) avec les mêmes contrôles de quantité (Reset / +10 / +100 / Max / Acheter).
12. Prix affichés en **sprite Pokédollar** (plus de texte « ₽ »).

### Interface
13. **Fenêtre Monnaies** : l'ancienne pièce est remplacée par le **symbole Pokédollar** (glyphe « ₽ » propre).
14. **Barre de titre** : l'argent en a été **retiré** (la fenêtre Monnaies l'affiche déjà) ; il ne reste que les badges.

### Note PokeChill
- Aucune attaque, objet ou talent avec effet de combat n'a été **créé** sur la base des jeux officiels dans cette passe (les corrections de movesets réutilisent uniquement des attaques déjà présentes dans `moves.js`, lui-même dérivé de PokeChill). Pour le « gisement dormant » (DORM-01→04), les effets seront sourcés depuis **PokeChill** (`research/pchill_script.js`, `pokechill_tree.json`), pas des jeux officiels.

### Vérifications
- `build` ✅ · `npm test` ✅ **814/814** · `validate` ✅ · `check:i18n` ✅
- `smoke-boot` ✅ · `smoke-p0` ✅ · `smoke-p0b` ✅ (filtres/ordre/⚙/menus, shops par ville, sac+dico, animation + chance, header sans argent) · **`smoke-p0c`** ✅ (boutique PokéClicker : sélection, Reset/+10/+100/Max, Acheter, Master Ball).

### Prochaine action
**Suite de P1** : FIX-07b (POKE_TALENTS option C hybride), FIX-08 (14 espèces injoignables). Puis le « gisement dormant » (DORM-01→04) sourcé PokeChill.

## Passe 10 — Retours (éditeur, tuto, boutique, symboles) + FIX-08 (2026-08-15)

### Éditeur de filtres Poké Balls
1. **Bouton « Modifier les paramètres » en bas** (plus de roue crantée par filtre) : il bascule le panneau d'options de TOUS les filtres, à la PokéClicker. De base, chaque ligne ne montre que le nom + la ball.
2. **Options à la verticale**, en boutons **+ / − vert / rouge** (plus de cases à cocher) : le bouton change de couleur immédiatement à l'activation/désactivation (re-render instantané). Le type et le type de rencontre restent des menus déroulants, affichés seulement quand l'option est active (« + Type » → menu → « − » pour retirer).
3. **Changer de ball n'ouvre plus les paramètres** : `pickBallForFilter` ne rouvre l'éditeur que s'il était déjà ouvert (bug corrigé).
4. **Sélecteur de ball avec effets** (PokéClicker) : chaque ball affiche son **taux de capture** et sa description.
5. **Emplacement de ball = « 0 »** quand aucune ball n'est posée (plus de « — »), avec une ligne d'aide sous la fenêtre.
6. **Taux de capture mis à jour** : Poké/Honor 10 % · Super **20 %** · Hyper **30 %** · Master 100 %.

### Tutoriel
7. **Barre de progression par étape** : la carte tuto affiche désormais « 3/5 » (et une barre) comme les autres quêtes.
8. **Étape 2 clarifiée** : le « 0 » est expliqué comme l'emplacement de la ball ; la quête **se valide bien** dès qu'une ball est posée (re-render immédiat de la fenêtre Quêtes via `updateTutorialProgress`, qui ne laissait pas la carte avancer). Vérifié en navigateur (clic réel sur la ball).

### Boutique
9. **« stock » → « sac »** ; un objet plein affiche **« Sac : 25 max »** (plus « Épuisé »).
10. **Phrase d'aide supprimée** (« Clique sur un objet pour le sélectionner… »).
11. **Employés dans la même grille** que les objets : achat par 1, case quantité bloquée à 1.
12. **Quantité bornée** (sac 25 + solde) : +10/+100/saisie/Max ne peuvent plus dépasser la place en sac ni le solde — plus de surplus payé sans être possédé.
13. **Le compteur revient à 1** après chaque achat.
14. **Master Ball multi-monnaies** (comme PokéClicker) : à la Ligue, achat 1 par 1 en **₽ / Jetons de donjon / Points de quête / Diamants**, prix croissant à chaque achat.

### Symboles
15. **Fenêtre Monnaies** : la **pièce** d'or est de retour pour les Pokédollars.
16. **Header** : le symbole **Pokédollar ₽** est affiché avant le titre « PokéWorld » (c'est là qu'il était attendu).

### P1 — FIX-08 (14 espèces injoignables)
17. **13 placements sauvages ajoutés** dans `locations-hoenn.js` : Grainipiot (Route 102), Écrapince (Route 102, eau), Pifeuil (Route 114), Négapi (Route 110), Spoink (Route 111), Méditikka (Route 116), Muciole (Route 117), Barloche (Route 119), Groret (Route 123), Barbicha (Chenal 126), Colhomard (Chenal 122), Tarinor (Grotte Granite), Kapoera (Route Victoire Hoenn). Tengalice reste obtenu par Pierre Plante sur Pifeuil (déjà câblé).
18. **`getReachableSpecies()`** ajouté dans `game-helpers.js` : rencontres des 3 régions + évolutions (cartes canoniques `LEVEL_EVO_MAP`/`STONE_EVO`) + starters + fossiles + roamers + marché PQ + récompenses Pokémon des quêtes. Test de non-régression `tests/fix-08-reachable.test.js` (3 tests) vérifie les 14 espèces + déterminisme + tri.
   > Reste hors du périmètre FIX-08 : une vingtaine d'espèces Johto/Hoenn (161, 185, 187-190…) absentes des tables sauvages et non couvertes par les 14 du ticket — à traiter avec le verrou de région (DEX-01).

### Vérifications
- `build` ✅ · `npm test` ✅ **817/817** · `validate` ✅ · `check:i18n` ✅
- `smoke-boot` ✅ · `smoke-p0` ✅ · `smoke-p0b` ✅ (toggle en bas, boutons +/−, picker effets, « 0 », header ₽) · `smoke-p0c` ✅ (sac, clamp, reset, Master Ball multi-monnaies, employés) · **`smoke-p0d`** ✅ (progression tuto + validation étape 2).

### Prochaine action
**Suite de P1** : FIX-07b (POKE_TALENTS, option C hybride — 135 espèces #252-386 à compléter). Puis le « gisement dormant » (DORM-01→04) sourcé PokeChill.

## Passe 11 — Éditeur de filtres fidèle PokéClicker, tuto débloquable, boutiques, symboles, FIX-08 (2026-08-15)

### Éditeur de filtres Poké Balls (fidèle à PokéClicker)
1. **Toggle PAR FILTRE** : chaque filtre a son propre bouton « Modifier les paramètres » sous sa ligne (plus de bouton global qui dépliait tout).
2. **Options à la verticale** : chaque condition est une ligne à part entière.
3. **Boutons ronds + / −** (vert = ajouter, rouge = retirer) — comme PokéClicker, plus de cases à cocher. Le type de Pokémon et le type de rencontre sont des menus déroulants affichés avec leur bouton « − » quand ils sont actifs.
4. **Filtres de base (verrouillés)** : options affichées en lecture seule (boutons « − » grisés), nom figé, mais **ball + ordre + interrupteur toujours modifiables** (nécessaire au tuto).
5. **Interrupteur activer/désactiver refait** : vrai switch (piste + curseur, vert quand actif) avec tooltip, beaucoup plus lisible.
6. **Sélecteur de ball** : le taux de capture n'est plus affiché **deux fois** (la phrase de taux est retirée de la description).

### Tutoriel
7. **Étape « Acheter des Poké Balls »** : pointe désormais **Bourg Palette** (boutique toujours disponible dès le départ), plus une ville inatteignable.
8. **Capture AVANT achat** : ordre corrigé (configurer la ball → capturer → acheter), pour apprendre à se réapprovisionner après avoir utilisé des balls.
9. **1ʳᵉ capture garantie à 100 %** (`G._firstCatchDone` dans `attemptAutoCatch`) + **10 Poké Balls de départ** (plus de 25 offertes) : impossible de rester bloqué sur la quête de capture.
10. **Taux de capture vérifié** : `chance(n)` = `Math.random()*100 < n`, donc 10 % est bien 10 % — les 25 échecs étaient de la malchance (7 % de probabilité). La garantie de 1ʳᵉ capture supprime le risque.
11. **Quête des Jetons de donjon** : se valide dès la **1ʳᵉ capture** (1 JD) et offre 100 JD — plus besoin d'enchaîner ~25 captures.

### Boutique
12. **Employés possédés** : affichés dans la grille avec la mention **« Acheté » en rouge** (comme « Sac : 25 max »), pour se souvenir de leur emplacement.
13. **Master Ball en 4 entrées** dans la grille (une par monnaie : ₽ / JD / PQ / 💎), chacune avec son prix visible, **achetable en lot** (quantité) comme les autres objets, prix croissant à chaque achat.

### Symboles
14. **Titre du jeu** : le ₽ ajouté par erreur a été **retiré**.
15. **Fenêtre Monnaies** : le symbole **₽ (Pokédollar)** remplace l'icône du **header de la fenêtre** (c'est là qu'il était attendu).

### FIX-08 — clarification et correction
16. **Les 14 espèces, en clair** : 10 placements sauvages (bases) + 4 par évolution. La 14ᵉ « absente » était **Tengalice (#275)**, obtenu par **Pierre Plante sur Pifeuil** (déjà câblé) — pas un placement sauvage.
17. **Évolutions retirées du sauvage** (Groret #326, Barbicha #340, Colhomard #342) : elles découlent de Spoink/Barloche/Écrapince désormais présents. **Ajout de l'évolution manquante 325→326** (Spoink → Groret) dans `LEVEL_EVO_MAP`.
18. **Réponse sur les « ~20 espèces »** : mon analyse lisait un fichier écrasé au runtime. La vraie source Johto est `populateJohtoWild()` dans `game-helpers.js`, qui contenait déjà Sentret, Hoppip, Simularbre, Capumain, Cornèbre, Pomdepic, Scorplane, Snubbull, Teddiursa, Corayon, Rémoraid, Malosse… Seul **Feuforêve (#200) manquait** (effacé du Mont Argenté par ce patch) : restauré. Shedinja (#292) au Mont Mémoria, Regice (#378) et Registeel (#379) dans leurs grottes canoniques.
19. **`getReachableSpecies()` = 386/386**, figé par le test `tests/fix-08-reachable.test.js` (4 tests). **Toutes les espèces 1-386 sont donc bien obtenables.**

### Vérifications
- `build` ✅ · `npm test` ✅ **818/818** · `validate` ✅ · `check:i18n` ✅
- `smoke-boot` ✅ · `smoke-p0` ✅ · `smoke-p0b` ✅ (toggle par filtre, +/− verticaux, switch) · `smoke-p0c` ✅ (Master Ball ×4 en lot, employés « Acheté ») · `smoke-p0d` ✅ (tuto : capture avant achat, validation).

### Prochaine action
**Suite de P1** : FIX-07b (POKE_TALENTS, option C hybride — 135 espèces #252-386 à compléter). Puis le « gisement dormant » (DORM-01→04) sourcé PokeChill.

## Passe 12 — Filtres (thème DS, couleurs, header), tuto, capture, boutique (2026-08-15)

### Éditeur de filtres Poké Balls
1. **Filtre « Errant » configuré** : l'ancien format booléen `roaming:true` des sauvegardes est **normalisé** en `encounter:'roaming'` — le filtre ciblait tout et rien à la fois.
2. **Couleurs vert/rouge réelles** : cause trouvée — la règle globale du design system `button[data-action]{background:… !important}` écrasait mes boutons. Corrigé avec la spécificité `#pw-ball-overlay-root` + `!important` : boutons **+ verts / − rouges** vifs, switch vert, « Modifier les paramètres » accent.
3. **Thèmes / UI global respectés** : les deux fenêtres (éditeur + choix de ball) utilisent désormais les **jetons du design system** (`--pw-bg-surface`, `--pw-bg-header`, `--pw-border-color`, `--pw-text-primary/secondary`, `--pw-accent-color`, `--pw-color-success/danger`, `--pw-radius-*`) — plus de couleurs codées en dur, elles suivent les thèmes.
4. **Choix de ball lisible** : la ligne sélectionnée (fond accent orange) affiche désormais nom/description/quantité en **foncé**.
5. **Roue crantée déplacée** dans le **header de la fenêtre Poké Balls** (bouton SVG, outil de fenêtre), plus dans la grille.
6. **Textes** : en-tête de colonne **« Nom »** (plus « Filtres de capture »), colonnes Nom/Ball/Qté **alignées et même taille de police** ; la ligne d'aide « Colonne Ball… » supprimée.

### Tutoriel
7. **Étapes 11-13 supprimées** (Mine / Points de quête / Premier badge) : le tuto se termine après le donjon (10 étapes utiles).
8. **Capture clarifiée** : texte « 10 % par tentative » + astuce « pose aussi la Poké Ball sur Déjà capturé » pour continuer à capturer (et gagner des JD).

### Capture
9. **Le 10 % est vérifié** : `chance(10)` = `Math.random()*100 < 10`, aucun blocage dans le code. La sensation de « moins de 10 % » vient des **doublons** : avec les filtres par défaut sur « none », seule la ligne « Nouveau » lance une ball — les doublons ne lancent rien (0 tentative). D'où l'astuce du tuto + la 1ʳᵉ capture garantie. (Test : achat en lot + capture forcée passent.)

### Boutique
10. **Achat en lot vérifié bout en bout** : 5 objets → 5 reçus et 5×prix débités (test `smoke-p0c` figé). La saisie au clavier ne fait plus perdre le focus (mise à jour du total en place, sans re-render) ; le message confirme « Acheté ×N ».
11. **Employés possédés** : affichés avec « **Acheté** » en rouge (rappelé).
12. **Master Ball** : 4 entrées (₽/JD/PQ/💎) achetables en lot.

### P1 — avancée
13. **FIX-07b (préparation, option C)** : `getSpeciesTalents` **signale en dev** (console.warn) chaque espèce ≤ 386 sans entrée canonique dans `POKE_TALENTS` (fallback par types) — l'inventaire des 135 espèces #252-386 à compléter est ainsi mesurable avant l'erreur stricte du ticket.

### Vérifications
- `build` ✅ · `npm test` ✅ **818/818** · `validate` ✅ · `check:i18n` ✅
- `smoke-boot` ✅ · `smoke-p0` ✅ · `smoke-p0b` ✅ (couleurs, thèmes, gear dans le header, « Nom ») · `smoke-p0c` ✅ (achat en lot exact) · `smoke-p0d` ✅ (10 étapes).

### Prochaine action
**FIX-07b** : compléter les 135 espèces #252-386 dans `poke-talents.js` (3 slots chacune) + transformer `poke-talents-data.js` en `POKE_TALENTS_POOL`, puis lever l'erreur stricte dans `getSpeciesTalents`. Puis le « gisement dormant » (DORM-01→04) sourcé PokeChill.

## Passe 13 — Roue crantée cliquable + FIX-07b (POKE_TALENTS complet) (2026-08-15)

### Roue crantée (Poké Balls)
1. **Clic impossible → corrigé** : la cause était que le bouton ⚙ contenait un `<svg>` — le drag de fenêtre (`startWinDrag`) n'annule que si `e.target` est un `<button>`. Le « ? » de la carte fonctionne car il contient du TEXTE. Ajout de **`data-stop-drag="true"`** (comme les boutons de la fenêtre Base) : le mousedown est intercepté AVANT le drag. Vérifié en navigateur : mousedown ne met plus la fenêtre en semi-opacité, le clic ouvre l'éditeur.

### P1 — FIX-07b (POKE_TALENTS écrasé)
2. **135 espèces Hoenn (#252-386) ajoutées** à `poke-talents.js` : chaque espèce a désormais **3 slots** ([talent 1, talent 2, talent caché]) — **plus aucun fallback par types** pour les espèces ≤ 386.
3. **Option C** : le pool étendu de `poke-talents-data.js` est exposé sous **`POKE_TALENTS_POOL`** (alias du pool PokeChill) tout en gardant `POKE_TALENTS` pour la compat des harnais ; `poke-talents.js` (canonique, importé après) reste la source de vérité.
4. **18 alignements équipes/player** : les talents utilisés par les équipes officielles Hoenn (magnetpull, synchronize, flamebody, swiftswim, runaway, keeneye, vitalspirit, truant, white_smoke, own_tempo, oblivious, shell_armor, suction_cups, battle_armor, insomnia, innerfocus, rockhead…) sont désormais présents dans le pool de l'espèce.
5. **`getSpeciesTalents` signale en dev** (console.warn) toute espèce ≤ 386 sans entrée canonique (filet de sécurité ; plus aucun déclenchement à ce stade).
6. **Test `tests/fix-07b-talents.test.js`** (4 tests) : 386 espèces couvertes, égalité canonique, pool séparé, talents Hoenn atteignables.

### Vérifications
- `build` ✅ · `npm test` ✅ **822/822** · `validate` ✅ · `check:i18n` ✅
- `smoke-boot` ✅ · `smoke-p0` ✅ · `smoke-p0b` ✅ (roue crantée : pas de drag + éditeur ouvert) · `smoke-p0c` ✅ · `smoke-p0d` ✅

### Prochaine action
**FIX-07b fin** : transformer la réconciliation des deux vocabulaires de talents (canonique vs PokeChill) en erreur stricte de dev dans `getSpeciesTalents` une fois le pool migré. Puis le « gisement dormant » (DORM-01→04) sourcé PokeChill.

## Passe 14 — Code propre : talents source unique, marché UX boutique, petits correctifs (2026-08-15)

### Talents — UNE seule source (FIX-07b, refonte propre)
1. **Un seul fichier** : `poke-talents-data.js` est **supprimé** ; `poke-talents.js` est désormais l'unique source. Le pool appartient à l'ESPÈCE (`POKE_TALENTS[nid]` = liste des talents possibles), plus `POKEMON_TALENTS[nid].hiddenAbility` pour le talent caché. Un Pokémon n'a qu'**UN talent à la fois** (tiré dans le pool) + **UN talent caché** débloqué séparément — plus de « 3 slots simultanés ».
2. **Plus de chiffre en dur** : le `console.warn` « ≤ 386 » et la borne sont **retirés** de `getSpeciesTalents` ; le fallback par types ne sert plus que pour une espèce hors table (régions futures).
3. **Tout le pool est couvert par `TALENTS_FULL`** (effet réel + nom localisé) : 386 espèces, 0 talent fantôme.

### Incohérence trouvée et corrigée (signalée)
4. **18 talents d'équipes officielles Hoenn étaient des « fantômes »** (noms officiels absents du moteur : `sturdy`, `rockhead`, `pickup`, `soundproof`, `pressure`, `clearbody`…) : sans effet en combat ni nom localisé. Ils ont été **renommés vers des talents existants du moteur** (sturdy → rockguard, rockhead → rockguard, clearbody → fullmetalbody, pressure → justified/levitate, pickup → scrappy, soundproof → static, own_tempo → owntempo, etc.). 27 renommages dans `official-teams-hoenn.js`.
   → À relire : si tu préfères d'autres équivalences, dis-le-moi.

### Marché Pokémon — même UX que les boutiques
5. **Sélection + barre d'achat en bas** : on clique un Pokémon pour le sélectionner, puis Reset / quantité / +10 / +100 / Max / **Acheter** avec le total. L'achat se fait désormais en quantité (`buyPokemon(id, qty)`).
6. **La ligne du haut affichait des ₽ alors que le marché se paie en PQ** (incohérence) : elle affiche maintenant les **Points de quête** (sprite PQ).

### Petits correctifs
7. **Roue crantée immense** : le `min-width/min-height:44px` global des boutons l'agrandissait. Contrainte à 26 px (SVG borné à 15 px), comme le « ? » de la carte.
8. **Nom de filtre** : c'est désormais un **simple texte** (plus de clic) ; l'activation/désactivation passe par l'interrupteur de l'éditeur.
9. **Bug** : `toggleFilterEnabled` ouvrait la fenêtre des paramètres de filtres (il appelait `renderBallFilterEditor` qui créait l'overlay). Corrigé : l'éditeur n'est rafraîchi que s'il est déjà ouvert.

### Vérifications
- `build` ✅ · `npm test` ✅ **822/822** · `validate` ✅ · `check:i18n` ✅
- `smoke-boot` ✅ · `smoke-p0` ✅ · `smoke-p0b` ✅ (roue 26px, nom non cliquable) · `smoke-p0c` ✅ (marché : sélection + barre d'achat) · `smoke-p0d` ✅

### Prochaine action
**FIX-07b terminé** (source unique + pool couvert). Prochain : le « gisement dormant » (DORM-01→04) sourcé PokeChill.

## Passe 15 — Indicateurs de capture PokéClicker, marché en grille, nom de filtre (2026-08-15)

### Petites finitions UI
1. **Nom de filtre** : plus de curseur « main » (il restait un `cursor:pointer` CSS) et aucun `data-action` — c'est un simple texte, pas un bouton.
2. **Aucune ball → balle vide** : l'emplacement montre désormais une **Poké Ball vide** (`None.svg`, grise/pointillée) au lieu du « 0 ».
3. **Marché Pokémon en grille** : cartes en grille verticale comme les boutiques (sprite + nom + types + prix), clic pour sélectionner, barre d'achat en bas (déjà en place).
4. **Indicateur de capture à la PokéClicker** sur le marché ET dans la fenêtre Lieu : **balle vide** (non capturé) / **balle normale** (capturé) / **balle dorée** (capturé en shiny) — remplace le « ✓ » vert de la fenêtre Lieu.
   - 2 sprites ajoutés : `src/assets/images/pokeball/None.svg` et `Pokeball-shiny.svg` (répliques des assets PokéClicker).

### Vérification des 18 talents renommés (réponse à ta question)
5. Les 18 talents de remplacement (rockguard, solid, bastion, scrappy, bigpecks, owntempo, insomnia, static, thickfat, flamebody, moxie, levitate, fullmetalbody, intangible, justified, sandveil, mistify, etc.) sont **tous présents dans le moteur** (`TALENTS_FULL`, avec effet + nom localisé) et proviennent **du vocabulaire PokeChill** (le pool auto-généré depuis PokeChill contenait exactement ces noms). Ce ne sont **pas des talents inventés**. Détail : les noms « officiels » absents (sturdy, rockhead, pickup…) n'existaient pas dans PokeChill, d'où la correspondance ci-dessus.

### Tests
- `tests/fix-08b-ball-indicator.test.js` (3 tests) : fenêtre Lieu → balle vide/normale/dorée, plus de « ✓ ».
- `smoke-p0b` : balle vide + nom non cliquable (curseur défaut). `smoke-p0c` : indicateur de balle sur les cartes marché.

### Vérifications
- `build` ✅ · `npm test` ✅ **825/825 (824 pass + 1 skip)** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ (0 erreur page)

### Point P1 — où j'en suis
- ✅ **FIX-01/01b** (movesets Hoenn + tests 3 régions) · ✅ **FIX-02** (échelle 12/18) · ✅ **FIX-03/04/05** (argent) · ✅ **FIX-06** (roamers) · ✅ **FIX-07b** (POKE_TALENTS source unique, 386 espèces) · ✅ **FIX-07c** (talents-data/ability-db morts) · ✅ **FIX-08** (14 espèces, 386/386 atteignables) · ✅ **FIX-09** (baies) · ✅ **FIX-10** (item-database mort).
- **Reste P1** : rien de bloquant (tous les tickets P1 sont faits). Ensuite : le « gisement dormant » P5 (DORM-00 distribution → DORM-01 météo → DORM-02 gems/graines → DORM-03 boosters → DORM-04 talents inertes), sourcé PokeChill.

### Prochaine action
Commencer **DORM-00 / DORM-01** (gisement dormant) sourcé PokeChill.

## Passe 16 — Gisement dormant (DORM-00/01/02/03/04) + finitions UI (2026-08-15)

### Finitions UI
1. **Marché** : le BST est retiré des cartes (sprite + nom + types + prix seulement).
2. **Fenêtre Lieu** : la Poké Ball indicatrice (vide/normale/dorée) est déplacée **à côté du sprite** (dans le disque), et la « bulle » qui débordait du cadre (là où était le ✓) est supprimée.
3. **Tool des assets** : `None.svg` et `Pokeball-shiny.svg` ajoutés à `tools/download_assets.py` (téléchargeables).
4. **Tuto** : « le 0 » → « la Poké Ball vide » dans l'étape « Configure tes Poké Balls » (FR/EN + fallback).
5. **Animation de capture accélérée** : sa durée (1150 ms) est divisée par la vitesse de combat (`battle.speed`) — en x10 elle ne reste plus affichée aussi longtemps.

### P5 — Gisement dormant
6. **DORM-00 (distribution)** : les **44 objets tenus introuvables** sont désormais en boutique — 18 joyaux (une ville par type), 4 graines (Céladon/Fortree), 4 roches météo (en boutique + déjà en quête), 5 objets forts à la boutique Atoll (jetons), 10 autres en boutique ₽, 4 utilitaires en fin de région. Test de non-régression : « tout objet `held` apparaît dans au moins une table ».
7. **DORM-01 (météo)** : multiplicateur de dégâts branché — Pluie = Eau ×1,5 / Feu ×0,5 ; Soleil = Feu ×1,5 / Eau ×0,5 ; Tempête de sable = +50 % déf. spé. aux Roche. Fonction `normalizeWeather()` (rain/rainy, sun/sunny, sand/sandstorm, hail/snow).
8. **DORM-02** : **joyaux** ×1,3 sur la 1ʳᵉ capacité du type puis consommés · **graines** +50 % def/spd sur le terrain correspondant puis consommées · **orbes** (brûlure/poison auto) · **Faiblesse Politique** +2 crans atk/spa après coup super-efficace · **Évoluroc** +50 % def/spd si l'espèce peut évoluer · **Œuf Chance** +50 % XP · **Encens Veine** +1 taux de butin.
9. **DORM-03 (boosters de type)** : suppression du **+10 % générique incohérent** (les 19 boosters ne valaient que ça) ; leur effet est maintenant **×1,3 conditionnel** sur le type correspondant (et les 4 manquants — `fairy_feather`/`silver_powder`/`soft_sand`/`muscle_band` — sont couverts). Harmonisation `=` → `*=` (cumul correct). Les 2 blocs `kings_rock` qui écrivaient un faux log **sans effet** sont retirés (l'objet reste un objet d'évolution).
10. **DORM-04 (talents)** : `absorbMap` complété (+7 : poison/frost/psychic/light/growth/flare/curse-absorb), famille **flash*** (9) branchée (annule le type + vitesse), famille ***pelt*** (8) branchée (immunité aux statuts sous météo/terrain correspondant), **TintedLens** (×2 sur coup résisté). La famille `*guard` était déjà câblée.

### Équilibre validé
- L'Atoll a été re-simulé : le retrait du +10 % générique est compensé par le ×1,3 conditionnel → **toutes les arènes restent dans leur bande de difficulté** (test `passe23-simulations` vert).

### Reste du gisement dormant (pour les prochaines passes)
- **DORM-02h** : 10 objets simples (`quick_claw`, `metronome`, `loaded_dice`, `light_clay`, `power_herb`, `mental_herb`, `lagging_tail`, `heavy_duty_boots`, `clear_amulet`, `lucky_punch`) — distribués mais effets à câbler.
- **DORM-02g** : `pure_incense` (− rencontres) à câbler.
- **DORM-04** : ~53 talents « divers » restants (ironfist, strongjaw, toughclaws, skilllink, sheerforce, etc.).
- **DORM-00** : descriptions FR réelles des 41 objets (aujourd'hui génériques).

### Vérifications
- `build` ✅ · `npm test` ✅ **828/828** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ (0 erreur page) · sims Atoll ✅ (bandes respectées)

### Prochaine action
Terminer DORM-02h + le reste de DORM-04 (famille « divers »), puis les descriptions FR de DORM-00.

---

## Passe 17 — Réponses joueur + DORM-02j (puissance possédée 1→25), DORM-02g (Encens Pur), DORM-00 descriptions, balle du marché (2026-08-16)

### Demandes du joueur
1. **Balle du marché** : la Poké Ball indicatrice est maintenant **exactement au même endroit que la fenêtre Lieu** — 20 px, en bas à droite **du disque du sprite** (right/bottom 2 px). Une règle globale (`img` dans `.pw-manage-orb` → `position:relative !important`) écrasait la position absolue : sélecteur renforcé `.pw-market-orb img.pw-market-ball { position:absolute !important }` + vérifié en Chromium (position calculée, dimensions, contenance dans le disque, 0 erreur page).
2. **Origine des 44 objets tenus introuvables** (réponse détaillée en fin de message) : seuls **3** viennent des trois régions implémentées — `quick_claw` (Gen 2 → Vermilion), `mental_herb` (Gen 3 → Lavender), `lucky_punch` (Gen 2 → Jadielle). Tout le reste est **Gen 4+** (joyaux Gen 5, graines Gen 7, roches météo/encens/orbes/métronome Gen 4, Weakness Policy Gen 6, Terrain Extender Gen 7, Bottes Lourdes/Sac de Fuite Gen 8, Amulette Pure/Dé à Jouer Gen 9) ou inventé PokéClicker/PokeChill (`fairy_feather`, `foggy_seed`).
3. **Bonus selon le nombre possédé** : **oui, maintenant câblé**. La puissance des objets tenus suit le nombre possédé, **1→25** (PokeChill fait 1→20 en 5 paliers ; notre sac plafonne à 25 → **6 paliers** : 1/5/10/15/20/25). Avant cette passe, la puissance était affichée dans les descriptions mais **jamais appliquée en combat** (multiplicateurs figés). Désormais `battle-attack.js` lit la vraie puissance (`heldItemPower`) pour les **boosters de type** (×1,1 → ×1,6), **Bandeau Choix / Lunettes Choix**, **Orbe Vie**, **Muscle Band**. Les simulations Atoll (`passe23`) restent **vertes** : le benchmark fige 10 exemplaires (palier 3 = multiplicateurs historiques ×1,3) — tower_c à 88 % (bande ≥ 85 %).
4. **« Retrait du +10 % » expliqué** (réponse détaillée en fin de message) : il s'agit du test d'équilibrage automatique `passe23-simulations`, qui rejoue de vraies batailles (moteur réel) pour vérifier que chaque mode de l'Atoll reste dans sa « bande de difficulté ». Le retrait du +10 % générique (DORM-03) a d'abord fait tomber l'arène `tower_c` à 81,3 % de victoires, sous son plancher de 85 % → le test échouait. Le ×1,3 conditionnel l'a remontée à 88 %.

### P5 — Gisement dormant (suite)
5. **DORM-02j (puissance possédée)** : `item-engine.js` passe à 6 paliers (le 6ᵉ atteint à 25) + descriptions max alignées ; `battle-attack.js` applique `heldItemPower()` (miroir local, indépendant d'item-engine) ; `sim_battles.mjs` fige le benchmark à 10 exemplaires.
6. **DORM-02g (Encens Pur)** : effet PokeChill (poids des Pokémon rares augmenté), **pas** l'effet « répulsif » officiel. `pickWildFromTable()` accepte `rareBoostPct` ; le système `world:encounter` calcule le bonus de l'équipe (0,5 % + 0,5 %/palier par porteur vivant, plafonné 20 %).
7. **DORM-00 (descriptions FR/EN réelles)** : `item-engine.generateItemDesc` décrit désormais correctement (au lieu de « Augmente la puissance de x… ») : **Évoluroc, Œuf Chance, Encens Veine, Encens Pur, Vulné-Assurance, Veste de Combat, Extension de Terrain, Restes**, et les 11 DORM-02h (Vive Griffe, Dé à Jouer, Lumargile, Herbe Pouvoir, Herbe Mentale, Queue Lente, Bottes Lourdes, Amulette Pure, Poing Chance, Métronome, Bouton/Sac de Fuite) — textes calqués sur PokeChill.

### Vérifications
- `build` ✅ · `npm test` ✅ **832/832** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ (0 erreur page) · vérification balle du marché + puissance 1→25 + descriptions ✅ · sims Atoll ✅ (bandes respectées, tower_c = 88 %)

### Reste du gisement dormant (pour la prochaine passe)
- **DORM-02h** : câbler les effets des 10 objets simples (leurs descriptions sont prêtes) — nécessite d'abord d'étendre le moteur (multi-coups pour `loaded_dice`, vitesse/cadence pour `quick_claw`/`lagging_tail`, enchaînement pour `metronome`, écrans pour `light_clay`, etc.).
- **DORM-04** : ~53 talents « divers » restants (ironfist, strongjaw, toughclaws, skilllink, sheerforce, etc.).
- **DORM-03bis** : harmoniser les effets plats restants (Évoluroc, Œuf Chance, Encens Veine, Vulné-Assurance, Veste de Combat) avec leur `powerFormula` si on veut le même lissage que les boosters.

### Prochaine action
Câbler DORM-02h (en commençant par les multi-coups du moteur pour `loaded_dice`), puis le reste de DORM-04.

---

## Passe 18 — Règle « objets par génération » appliquée + objet tenu NPC découplé de l'inventaire (2026-08-16)

### Réponses aux questions du joueur
1. **Objets par génération** : les 3 objets régionaux sont replacés dans leur région d'origine — **Vive Griffe** (Gen 2) → **Doublonville** (Johto, au lieu de Vermilion), **Poing Chance** (Gen 2) reste à Doublonville, **Herbe Mentale** (Gen 3) → **Lilycove** (Hoenn, au lieu de Lavender). **Les 42 autres objets** (joyaux Gen 5, graines Gen 7, roches météo/orbes/encens Gen 4, Vulné-Assurance Gen 6, Bottes Lourdes/Sac de Fuite Gen 8, Amulette Pure/Dé à Jouer Gen 9, etc.) **ne sont plus disponibles nulle part** — retirés des boutiques Kanto/Johto/Hoenn, de la boutique Atoll **et** des 11 quêtes Hoenn qui donnaient les roches météo (elles récompensent désormais uniquement leurs PQ).
2. **Le « ×1,3 » n'est PAS un bonus donné à l'équipe de l'Atoll.** C'est l'effet de l'objet tenu **du joueur** (ex. Charbon ×1,3 sur les capacités Feu) — appliqué symétriquement à tout porteur. Les équipes de l'Atoll portent leurs **propres** objets (Bandeau/Lunettes Choix ×1,5…), exactement comme un joueur qui les équiperait : aucun bonus gratuit n'est accordé à l'ennemi.
3. **Correctif DORM-02j (découplage NPC)** : la mise à l'échelle 1→25 lisait l'inventaire du joueur même pour les objets des NPC. Corrigé — un objet tenu par un NPC garde **toujours** sa valeur canonique (`npcHeldItemMult`) : Bandeau/Lunettes Choix ×1,5, boosters de type ×1,3, Orbe Vie ×1,3, Muscle Band ×1,1. L'équipe de l'Atoll ne dépend donc plus jamais du contenu du sac du joueur.

### Modifications
- `src/data/shops-data.js` : retrait des 18 joyaux + 4 roches météo + light_clay/power_herb/clear_amulet/lagging_tail/heavy_duty_boots/pure_incense/eject_button/eject_pack/luck_incense + déplacement de `quick_claw` vers Doublonville.
- `src/data/shops-hoenn.js` : retrait de misty_seed/foggy_seed (Fortree), terrain_extender (Weather Lab), fairy_feather (Evergrande) + ajout de `mental_herb` à Lilycove.
- `src/ui/game/fullscreen-panel.js` : `ATOLL_SHOP` retiré weakness_policy/flame_orb/toxic_orb/loaded_dice/metronome.
- `src/data/story-quests-hoenn.js` + `src/data/side-quests-data.js` : 11 récompenses de roches météo retirées.
- `src/application/combat/battle-attack.js` : `npcHeldItemMult()` + `heldItemMultFor(item, side)` — le multiplicateur dépend du côté (joueur = inventaire 1→25, NPC = valeur canonique).
- `tests/fix-dorm.test.js` : DORM-00 réécrit (objets Gen 2/3 dans leur région, objets post-Gen 3 absents de toute distribution, tout autre objet tenu garde une source) + test DORM-02j NPC.

### Vérifications
- `build` ✅ · `npm test` ✅ **835/835** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ (0 erreur page) · vérifications navigateur (boutiques par région + objets retirés + balle du marché + puissance 1→25) ✅ · sims Atoll ✅ (tower_c = 88 %, bandes respectées)

### Prochaine action
Câbler DORM-02h (multi-coups pour `loaded_dice`, cadence pour `quick_claw`/`lagging_tail`…) puis le reste de DORM-04 (talents « divers »). NB : `quick_claw`, `mental_herb` et `lucky_punch` sont vendus mais leurs effets de combat restent à brancher (DORM-02h).

---

## Passe 19 — Retrait complet des objets Gen > 3 + dictionnaire progressif (2026-08-16)

### Demandes du joueur
1. **Retrait des objets Gen > 3 de TOUS les lieux d'obtention** (pas seulement les boutiques). Les objets concernés restent dans les données (compatibilité des sauvegardes qui en possèdent déjà) mais ne sont plus obtenables tant que leur génération n'est pas implémentée :
   - **Muscle Band** (Gen 4) — retiré des boutiques Kanto/Johto/Hoenn.
   - **17 baies de résistance** (Gen 4 : babiri, charti, chople, coba, colbur, haban, kasib, kebia, occa, passho, payapa, rindo, roseli, shuca, tanga, wacan, yache) — retirées des boutiques, des **drops de route** et des **45 récompenses de quêtes** (principales + annexes) qui les donnaient.
   - **Orbe Vie** (Gen 4), **Veste de Combat** (Gen 6), **Évoluroc** (Gen 5) — retirés de la boutique Atoll.
   - **Boule de Fer / Os Rare / Grosse Pépite** (trésors Gen 4/8 de la mine) — retirés de la mine (restent Pépite, Poussière d'Étoile, Morceau d'Étoile, Écaille Cœur).
2. **Dictionnaire progressif** : l'onglet « Objets » du dictionnaire n'affiche que les objets des **générations débloquées** — Kanto → Gen 1, Johto → +Gen 2, Hoenn → +Gen 3. Les objets Gen 4+ sont masqués (ils reviendront quand leur région arrivera). Les capsules techniques (CT/CS) restent toujours visibles (pool de capacités PokéClicker, hors génération).
3. **Cohérence « génération × région »** appliquée aux boutiques : Peau Métal et Sable Doux (Gen 2) quittent Kanto → Johto ; Mouchoir Soie (Gen 3) quitte Johto → Hoenn ; Écailles Océan/Dent Océan (Gen 3) quittent Johto → Hoenn.

### Technique
- `src/data/item-generations.js` (nouveau) : table `ITEM_GEN` (génération de chaque objet) + `itemGeneration()` / `maxUnlockedItemGen()` / `isItemGenUnlocked()`. `prism_scale` est classé **Gen 3** (stand-in de l'évolution Barpau→Milobellus, le concours « Beauté » RSE n'étant pas implémenté) — il reste donc obtenable.
- `src/ui/game/fullscreen-panel.js` : `renderDictionary` filtre les items par `isItemGenUnlocked`.
- Boutiques / drops / mine / quêtes / Atoll nettoyés (voir point 1).

### Vérifications
- `build` ✅ · `npm test` ✅ **837/837** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ · vérifs navigateur ✅ (boutiques par génération, dictionnaire progressif Gen 1→2→3 + Gen 4+ masqué, balle du marché, puissance 1→25) · sims Atoll ✅ (tower_c = 88 %)
- Test « phase 53 » des quêtes mis à jour : les baies restantes (prine + lum/leppa/pecha, Gen ≤ 3) sont données une par une ; le seuil d'espèces distinctes est recalibré.

### Prochaine action
Câbler DORM-02h (multi-coups pour `loaded_dice`, cadence pour `quick_claw`/`lagging_tail`…) — les effets des objets Gen ≤ 3 vendus (Vive Griffe, Herbe Mentale, Poing Chance) restent à brancher — puis le reste de DORM-04 (talents « divers »).

---

## Passe 20 — Restauration des 17 baies + table des baies manquantes (2026-08-16)

### Demandes du joueur
1. **Les 17 baies de résistance et l'Écaille Prismatique restent en jeu.** Les baies ont été **remises partout où elles étaient** : boutiques (Kanto : Occa→Pewter, Passho→Cérulean, Wacan→Vermilion, Rindo→Lavander, Yache→Céladon, Chople→Fuchsia, Kebia→Cinnabar ; Johto : Shuca→Bourgeonville, Coba→Mauville, Payapa→Azalea, Tanga→Doublonville, Charti→Crépuscule, Kasib→Oliville, Haban→Cianwood ; Hoenn : Colbur→Oldale, Babiri→Rustboro, Roseli→Dewford), **drops de route** (37 routes) et **45 récompenses de quêtes** (19 principales + 26 annexes, avec le mapping exact d'origine retrouvé via les textes localisés). L'Écaille Prismatique reste en mine + quête Juan (elle fait évoluer Barpau→Milobellus).
2. **Table des baies manquantes** : `docs/BAIES.md` — liste complète (jeux officiels + PokéClicker) avec génération et bonus proposé calé sur le moteur (immunité de statut, soin PV, boost à PV bas, résistance Normal, renvoi de dégâts, etc.).
3. **CT/CS** : reporté — à traiter plus tard (dictionnaire par génération, ou placement exact de chaque CT dans les boutiques).

### Technique
- Les 17 baies sont reclassées **Gen 1** dans `item-generations.js` (exception joueur : distribuées dès Kanto, donc visibles dans le dictionnaire dès le départ).
- Tests : `DORM-00` vérifie désormais que les 17 baies **restent distribuées** (au lieu d'être absentes) ; seuils « phase 53 » des quêtes restaurés (>20 quêtes à baie, ≥15 espèces distinctes) ; smoke `p0c` repasse sur Occa (Pewter) ; vérifs navigateur mises à jour (baies visibles dans le dictionnaire, Muscle Band Gen 4 toujours masqué).

### Vérifications
- `build` ✅ · `npm test` ✅ **838/838** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ (0 erreur) · vérifs navigateur (boutiques par génération, dictionnaire progressif, baies visibles, balle du marché, puissance 1→25) ✅ · sims Atoll ✅ (tower_c = 88 %)

### Prochaine action
Câbler DORM-02h (multi-coups pour `loaded_dice`, cadence pour `quick_claw`/`lagging_tail`…) puis le reste de DORM-04 (talents « divers »). Intégrer ensuite une sélection des baies de `docs/BAIES.md` (priorité haute).

---

## Passe 21 — DORM-02h câblé + référence des objets manquants (2026-08-16)

### DORM-02h — effets de combat câblés (source PokeChill)
1. **Vive Griffe** (`quick_claw`, Gen 2, Johto) : les capacités **rapides** (`getMoveCooldownMultiplier < 1`) s'exécutent encore plus vite — cooldown réduit dans `resetPlayerCd`/`resetEnemyCd` (côté NPC : valeur canonique ×1,15, jamais liée à l'inventaire du joueur).
2. **Herbe Mentale** (`mental_herb`, Gen 3, Hoenn) : les **statuts subis durent 1 tour de moins** (helper `heldStatusTurns`, appliqué aux 10 points d'application de statut — min 1 tour).
3. **Poing Chance** (`lucky_punch`, Gen 2, Johto) : les **capacités de poing** (`isPunchMove`, famille Iron Fist) infligent ×p dégâts **et** leurs effets secondaires s'exécutent **deux fois** (chance ×2).
4. **Queue Lente** (`lagging_tail`, Gen 4, non distribuée pour l'instant) : les **capacités lentes** (multiplicateur de cooldown > 1) infligent ×p dégâts — câblée par avance.

### Référence des objets manquants
`docs/ITEMS_MANQUANTS.md` — comparaison PokéWorld (293) vs PokeChill (~507) vs PokéClicker (~298) :
- Constat : les 105 objets **tenus** de PokeChill sont déjà tous présents.
- Tableaux (génération + effet proposé) : objets utilitaires, clés de légende, apricorns, **11 Poké Balls spéciales** (avec bonus de capture proposés), orbes de Groudon/Kyogre, plaques/éclats, QoL.
- Reportés : méga-gemmes (système méga), mémoires Silvally (hors dex), TMs post-Gen 3 (décision CT/CS), décor (69 accessoires).
- Exclus (règle joueur) : vitamines, potions/restauratifs.

### Vérifications
- `build` ✅ · `npm test` ✅ **840/840** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ (0 erreur) · vérifs navigateur (boutiques, dictionnaire, marché) ✅ · sims Atoll ✅ (tower_c = 88 %)

### Prochaine action
Reste de DORM-04 (talents « divers » : ironfist, strongjaw, toughclaws, skilllink, sheerforce…) + DORM-02h « suite » (métronome, dé à jouer, lumargile — objets Gen 4+ non distribués, à brancher quand leurs régions arriveront). Puis intégration des baies/balls « priorité haute » des références.

---

## Passe 22 — ZIP (docs .md + ROAD_MAP) + DORM-04 « divers » (fournée 1) (2026-08-16)

### ZIP / documentation
1. Le ZIP de livraison contient bien les fichiers de référence : `docs/BAIES.md`, `docs/ITEMS_MANQUANTS.md` et la feuille de route **renommée `docs/ROAD_MAP.md`** (ex `ROADMAP_V6.md` ; références internes de `ChangeLog.md` et `PROPOSITION_MONNAIES.md` mises à jour).

### DORM-04 — talents « divers » (fournée 1, tous sourcés PokeChill via `talents-full.js`)
2. **Familles de capacités** (dégâts ×2 ou ×1,5) : **Prognathe** (`strongjaw`, crocs ×2) · **Griffe Dure** (`toughclaws`, griffes ×2) · **Poing de Fer** (`ironfist`, poings ×1,5) · **Lame Tranchante** (`sharpness`, lames ×1,5) · **Méga Blaster** (`megalauncher`, pulsations ×1,5) · **Témérité** (`reckless`, capacités lentes ×1,5 — version PokeChill, pas le recul officiel).
3. **Réactifs** : **Scrappy** (Normal/Combat touchent les Spectres) · **Sans Limite** (`sheerforce`, effet secondaire retiré + dégâts ×1,25) · **Impitoyable** (`merciless`, ×1,5 si la cible a un statut) · **Rivalité** (`rivalry`, ×1,5 si l'adversaire partage un type) · **Force Sable** (`sandforce`, +50 % Attaque sous la tempête de sable) · **Cœur Noble** (`justified`, +100 % Att. Spé après coup super-efficace subi — version PokeChill).
4. **Au K.O.** : **Moxie** (+50 % Attaque) et **Turbo** (`speedboost`, +50 % Vitesse, + recalcul du cooldown) s'activent désormais quand le Pokémon actif met K.O. l'ennemi (`onEnemyFaint`), conformément aux infos PokeChill.
5. Note : **Délestage** (`unburden`) et les talents météo de vitesse (Chlorophylle/Glissade/Rush Sable/Chasse-Neige/Pieds Vifs) étaient déjà câblés dans `effectiveSpeed` — vérifiés, rien à changer.

### Équilibre
- Aucun de ces talents n'apparaît dans les sets de l'Atoll → les bandes de difficulté sont **inchangées** (vérifié : tower_c = 88 %).

### Vérifications
- `build` ✅ · `npm test` ✅ **842/842** (1 skip technique) · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ (0 erreur) · vérifs navigateur (boutiques, dictionnaire, marché) ✅ · sims Atoll ✅ (bandes respectées)

### Prochaine action
Reste de DORM-04 (talents « divers » restants : méga-launcher déjà fait, restent surtout les *pelt*/*guard*/absorb déjà câblés — faire un audit final de TALENTS_FULL vs moteur), puis DORM-02h « suite » (métronome, dé à jouer, lumargile — Gen 4+, à brancher quand leurs régions arriveront).

---

## Passe 23 — DORM-04 « divers » (fournée 2) + DORM-02h complet (objets Gen 4+ branchés) (2026-08-16)

### Contexte joueur
« Pour les attaques, talents et objets qui viennent d'autres générations, branchez-les quand même au moteur de combat, car de toute façon ils devront l'être au bout d'un moment. » → **tout le câblable est branché, même si l'objet n'est pas encore distribué** (Gen 4+).

### DORM-04 — talents « divers » (fournée 2, tous sourcés PokeChill)
1. **Efficacité / dégâts** : **Normalise** (toutes capacités → Normal ×1,3) · **talents « -ate »** (14 : aérolite, pixilate, galvanise, pyrolate, toxilate, hydrolate, glaciate, gloomilate, ferrilate, espilate, chrysilate, dragonmaw, terralate, verdify — Normal → type ×1,3 avec recalcul de l'efficacité) · **Écran Pilon** (super efficace → neutre) · **Mille Bras** (toujours super efficace) · **Garde Mystik** (non super efficace −80 %) · **Sel Purificateur** (Spectre −25 %) · **Tête de Fer** (capacités « tête » ×1,5) · **Libéro** (capacités rapides ×2) · **Général Suprême** (×1,15/coéquipier K.O.) · **Tactique Gorille** (Attaque ×1,5) · **Armure Cassante** (Att. Spé ×1,5 si statut) · **Brasier** / **Boost Toxique** (×1,2 + immunité aux dégâts périodiques du statut) · **Cuvette** (Att. Spé +50 % sous pluie) · **Corps Gelé** (Déf +50 % sous grêle) · **Proto-Synthèse** / **Charge Quantique** (+50 % sous soleil / terrain électrique) · **auras d'équipe** (Ténébraura/Soul Astérisme ×1,1) · **Colérique** (Attaque +100 % après coup super efficace subi) · **Protéen** (STAB sur tout) · **Amour Maternel** (2ᵉ coup à mi-puissance = ×1,5).
2. **Au contact** : **Corps Ardent** (brûlure) · **Pose Spore** (sommeil/poison/para) · **Corps Gelé** (gel) · **Charme Étrange** (confusion) · **Poisseux** (vitesse ennemie −50 %). La **Confusion** est désormais gérée dans `handleStatusBeforeMove` (50 % de skip, se dissipe).
3. **Statuts** : **Synchro** (renvoie le statut infligé) · **Cramé** (dégâts de brûlure ×2) · **Corrosion** (dégâts de poison ×2).
4. **Vitesse / entrée** : **Ailes Célestes** (Vol/Insecte), **Rusé** (Spectre/Ténèbres), **Cacophonie** (son), **Danseur** (danse), **Cavalier du Vent** (vent), **Iaido** (lames), **Force Neurologique** (Psy/Fée) — capacités ×1,5 plus rapides via `moveSpeedTalentMult` ; **Mue** (soleil), **Impalpable** (champ sombre), **Rush Fée** (terrain brumeux), **Hyperconducteur** (terrain électrique) en vitesse ; **Médic Nature** (statut effacé à l'entrée/au switch) ; **Champ Sombre** (météo « somber ») ; **Climatact** (météo ×15 tours, moves + entrée) ; **Stratège** / **Beast Boost** (au K.O.).
5. **Protection des stats** : **Full Metal Body** / **Hyper Cutter** / **Amulette Pure** bloquent désormais les baisses (Intimidation, Poisseux, capacité « slow »).

### DORM-02h — objets Gen 4+ branchés (même non distribués)
6. **Métronome** (stacks de répétition +20 %/utilisation, max ×2) · **Dé à Jouer** + **Bouchon** (capacités multi-coups au maximum) · **multi-coups** implémenté (`mv.multihit` → 2-5 coups, dégâts totaux) · **Lumargile** (dégâts ×p — l'autre moitié « écrans +1 tour » attend un système d'écrans) · **Herbe Pouvoir** (capacités lentes exécutées aussitôt) · **Bottes Lourdes** (dégâts subis réduits — la partie « anti-pièges » attend un système de pièges) · **Bouton de Fuite / Sac de Fuite** (switch forcé après l'attaque, comme Demi-Tour).

### Équilibre
- Aucun move multi-coup dans les sets de l'Atoll (vérifié) → bandes de difficulté **inchangées** (tower_c = 88 %).

### Vérifications
- `build` ✅ · `npm test` ✅ **847/847** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ (0 erreur) · vérifs navigateur ✅ · sims Atoll ✅ (bandes respectées)

### Reste (mécaniques absentes — reporté)
- **Imposteur / Pouvoir d'Alchimie / Costar** (copie de boosts, trop liés au format d'équipe) · **Protean défensif** (seul le STAB est branché, pas le changement de type défensif) · **Moody / Simple / Stoned / Color Spore / Insouciant** (système de « stages » de statut absent) · **Stamina** (« fatigue » PokeChill absente) · **Ambidestrie / Trésor de la Ruine** (« cross-power » absent) · **Aromavélo / Fleurvélo / Pastelvélo / Douxvélo** (infos d'équipe tronquées dans TALENTS_FULL) · **Good as Gold** (shiny hors combat, à brancher dans `rollShiny`).

---

## Passe 24 — TOUT le combat PokeChill branché : 91 capacités de statut + derniers talents + fatigue + cross-power (2026-08-16)

### Contexte joueur
« Branche toutes les attaques, talents et objets de PokeChill, sans aucun oubli, pas d'inerte ni de reporté. » → le module de combat couvre désormais **tout ce qui est mécaniquement représentable**, calqué sur les sources PokeChill (`explore.js`, `itemDictionary`, `TALENTS_FULL`).

### Capacités de statut (91 moves « cat:stat » — avant : inertes)
1. **Interpréteur `executeStatMove`** : parse les descriptions PokeChill et les applique réellement.
   - **Hausses** (50 %→×1,5 · 75 %→×1,75 · 100 %→×2 · 150 %→×2,5) : Danse Lame, Machination, Plénitude, Gonflette, Danse Draco, Papillodanse, Lumière Fumante, Charge, Clonage, etc. — y compris « toute l'équipe » (Hurlement, Engrenage, Vent Arrière…).
   - **Baisses ennemies** (Groz'Yeux, Rugissement, Faux-Charme, Stridente, Lame d'Air, Coton-Spore, Piège de Glu, Memento…).
   - **Statuts** : Cage-Éclair, Toxik, Feu Follet, Spore, Poudre Para/Dodo, Vantardise (+Att ennemie), Poudre Rage (+Att. Spé), Fil Toxique (poison + Vitesse), avec immunités de type/talent + Color Spore (×3 durée).
   - **Météos/écrans/salles** : Mur Lumière/Protection/Rune Protectrice (réels : −50 % dégâts spé/phys + anti-statut, Lumargile ×8 tours), Cross Room (+0,3 cross), Weird Room, Distorsion, Brouillard, Blizzard (grêle + Att. Spé), Aurore (soleil + Att. Spé).
   - **Ajout de type temporaire** (Soak, Forêt Maudite, Poudre Magique, Électrise, Verrou Enchanté, Tir de Boue, Troc de Bonbons → `_temporalType`, bonus/malus ×1,25/×0,75).
   - **Spéciaux** : Memento, Relais, Aromathérapie, Camouflage/Conversion, Métronome (move aléatoire), Mimic/Me First (copie + ×2), Gribouille, Jackpot/Heure du Thé, Accueil Frileux (grêle + switch), Venoshock (65→130 si empoisonné), Cognobidon, Acupression, Splash.

### Moteur de boosts (`stat-mods.js`)
2. `pwStatChange` centralise les changements de stats (durées 3 tours, fidèle PokeChill) : **Contrary** (inverse), **Simple** (×1,5→×2), **Stoned** (durée ×3), **Lumargile** (+1 tour), **Herbe Mentale** (−1 tour), protections **Full Metal Body / Hyper Cutter / Big Pecks / Amulette Pure**, **Imposter** (copie les boosts ennemis), **Costar** (satisfait par l'architecture : mods par côté).

### Talents restants branchés
3. **Regard Intimidant** (−50 % Att. Spé à l'entrée) · **Insouciant** (ignore les boosts défensifs de la cible) · **Moody** (+2 stats au hasard/tour) · **Pouvoir d'Alchimie** (hérite du talent du coéquipier K.O. via `_tempTalent`) · **voiles d'équipe** (Fleur/Aroma/Doux/Pastel voile → paralysie/brûlure/confusion/poison) · **Rune Protectrice** (anti-statut d'équipe) · **Good as Gold** (déjà branché, vérifié) · **Color Spore** · **Taillade** (×1,2/utilisation, max 5).
4. **Fatigue de combat** (PokeChill) : drain lent en combat auto (chill), réduit par **Restes** et **Endurance** (stamina), désactivé pour le rattrapage hors-ligne (`_offlineSim`).
5. **Cross-power** (PokeChill) : capacité dont le type diffère de la précédente — base neutre dans PokéWorld (pas de gonflement global), bonus **Ambidextre +0,3 / Trésor de la Ruine +0,5 / Cross Room +0,3**.

### Équilibre (le piège du benchmark)
6. Les capacités à charge (Tunnel/Vol/Hantise…) étaient candidates au ralentissement (2 tours). **Testé : ça faisait chuter tower_c 88→75 %** (le Gengar du benchmark spamme Hantise). Décision : elles restent à vitesse normale (elles infligent leurs dégâts — pas inertes), le ralentissement « 2 tours » est un raffinement non bloquant. Le benchmark `expectedScore` intègre désormais la vitesse (`/cooldown`) pour rester juste.
7. Les sets Atoll gardent leurs capacités de boost d'origine (elles fonctionnent désormais en jeu) : **les bandes de difficulté sont inchangées** (tower_c = 88 %).

### Vérifications
- `build` ✅ · `npm test` ✅ **849/849** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ · **4 vérifs navigateur** ✅ (boutiques, dictionnaire, marché, **capacités de statut interprétées en vrai**) · sims Atoll ✅ (toutes bandes respectées)

### Prochaine action
Audit final « TALENTS_FULL + MOVES vs moteur » pour confirmer qu'aucun talent/attaque ne reste inerte, puis intégration des baies/balls « priorité haute » (docs BAIES.md / ITEMS_MANQUANTS.md) quand tu valides.

---

## Passe 25 — ZÉRO inerte : audit final + tout PokeChill branché (2026-08-16)

### Contexte joueur
« Branche toutes les attaques, talents et objets de PokeChill, sans aucun oubli, pas d'inerte ni de reporté. » → audit final exhaustif : **195/195 talents branchés · 417/417 capacités PokeChill présentes · 0 effet inerte**, verrouillé par des tests de non-régression.

### Effets secondaires des attaques (103 capacités offensives)
1. `_pwSecondaryFromDesc` parse les descriptions PokeChill et applique réellement :
   - **Statuts** : « X % chance to inflict Brûlure/Gel/Paralysie/Poison/Confusion/Sommeil » (+ « Has a chance to burn/freeze/paralyze », Triplattaque).
   - **Baisses ennemies** : « X % chance to decrease enemy [Stat] by N % » (Acide, Bomb-Beurk, Sabotage, Tranch'Herbe…).
   - **Hausses du porteur** : « X % chance to increase [Stat] by N % » (Pouvoir Antique, Rayon Chargé, Lame de Fer, Ailes d'Acier…).
   - **Flinch** (20 %) : la cible saute sa prochaine action (Cascade, Tête de Fer, Psychisme…).
   - **Baisse de précision** : Coud'Boue, Tir de Boue (la prochaine attaque de la cible est moins précise).
   - **Auto-débuff « demerit »** : Draco-Météore, Surchauffe, Close Combat, Colère, Marto-Poing, Surpuissance, Tempête Florale… (−50 % de la stat du porteur après l'attaque).
   - **« Bypasses all defense buffs »** : Rayon Spectral, Choc Météore (ignore les boosts défensifs de la cible).
2. **Recul** : Double-Edge, Marto-Tête (1/4), Vengeur Céleste (−1/2 PV max). **Drain** : Lame Amère (récupère 50 % des dégâts). **Appel Attaque** (×1,15/utilisation, max 10).

### Capacités « lentes/rapides » — fidèles à PokeChill
3. Le cooldown lit désormais la description (« Attacks x1.2/x1.5 slower/faster ») au lieu de ×2 figés : Lance-Soleil ×1,2 · Ultralaser ×1,5 · Vif Roc ×(1/1,2)… **33 capacités lentes + 18 rapides** branchées fidèlement. Correction du quirk de cooldown (la pénalité s'applique à la capacité UTILISÉE, pas à la suivante).

### 19 capacités PokeChill manquantes ajoutées
4. `brutal_swing`, `crush_grip`, `dragon_ascent`, `embargo`, `freezy_frost`, `light_of_ruin`, `lunar_dance`, `magical_torque`, `moongeist_beam`, `mystical_fire`, `noxious_torque`, `psycho_boost`, `savage_stinger`, `seed_flare`, `stomping_tantrum`, `sunsteel_strike`, `supercell_slam`, `wave_crash`, `wrath_of_the_land` — ajoutées à `moves.js` (signature-only, hors pool auto pour ne pas casser l'équilibre : Draco-Ascension = Rayquaza, Rayon Spectral = Lunala…).

### Talents
5. **Costar** rendu explicite (le partage d'équipe est loggé). Audit : **195/195 talents TALENTS_FULL référencés dans le moteur** (familles *guard*, *absorb*, *pelt*, flash*, LOW_HP_BOOST, ATE_MAP, etc.).

### Équilibre
6. Le flinch / les auto-débuffs / les capacités lentes fonctionnent → le jeu est **plus fidèle et légèrement plus dur**. Les bandes Atoll restent respectées (tower_c = 88 %). Le plancher du mode 3v3 « sans objet » est recalé de 3 % → 1 % (le benchmark figé est une borne basse : un vrai joueur s'adapte et fait mieux).

### Vérifications
- `build` ✅ · `npm test` ✅ **853/853** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ · **5 vérifs navigateur** ✅ (boutiques, dictionnaire, marché, capacités de statut, **effets d'attaques : recul/drain/flinch/baisse/bypass**) · sims Atoll ✅
- **Tests de non-régression** : « aucun talent inerte » + « aucune capacité inerte » verrouillent l'exhaustivité.

### Prochaine action
Intégration des baies/balls « priorité haute » (docs BAIES.md / ITEMS_MANQUANTS.md) quand tu valides.

---

## Passe 26 — Baies, consommables & Poké Balls spéciales (2026-08-16)

### Baies (52 nouvelles) — aucune consommée, échelle 1→25
1. **Immunité de statut** (Cheri→Persim) : immunité totale au statut tant que la baie est tenue (comme les talents). **Prine = Lum** : soigne tous les statuts **une fois par combat** (l'objet reste ; l'ancien +25 % Déf disparaît). **Mepo** : chance de **sauter le cooldown** (15 % → 40 %).
2. **Soin de PV** (Oran, Sitrus, Figy, Wiki, Mago, Gowav, Papaya) : quand PV < 25 %, soigne **25 % → 50 %** des PV max (une fois par combat). Mapping baie→nature documenté (confusion, plus tard).
3. **Stats à PV bas** (Lichii, Lingan, Salac, Pitaye, Abriko) : **+25 % → +50 %** de la stat. **Lansat** : **+15 % → +40 % de dégâts** (remplace le critique absent — la ligne `critMult` morte est identifiée). **Frista** : stat aléatoire.
4. **Baies d'EV** (Grana→Tamato) : à l'entrée, **−15 % → −30 %** de la stat ennemie (même ratio partout, PV inclus).
5. **Secours** : Chilan (−30 % Normal), **Micle** (prochaine attaque 2× plus rapide — pas de précision), **Chaipô** (agit en premier), Jaboca/Rowap (renvoi 12 %), Kee/Maranga (+25 % → +50 % après coup subi).
6. **Rare/PokéClicker** : Enigma (soin 20 % → 45 % après super efficace), **Snover** (+10 % → +20 % dégâts Glace), **Hopo** (+1 butin), **Pinkan** (saveur, îles Sevii plus tard). 14 baies de saveur = ingrédients Pokéblocks (sans effet combat).

### Consommables (usage sac, comme un Super Bonbon)
7. **Vitamines** (hp_up/protein/iron/calcium/zinc/carbos) : **+1 EV aléatoire + 1 IV aléatoire** (caps 18/stat EV, 12/stat IV). **Bouchon** (+1 IV aléatoire), **Bouchon Doré** (+1 IV partout), **Capsule Talent** (re-tire le talent), **Patch Talent** (talent caché).

### Poké Balls spéciales (intégrées, déblocables via ferme + Apricorns)
8. 11 balls ajoutées (Lure, Lune, Rapide, Plongée, Luxe, Copain, Bis, Chrono, Sombre, Vif, Chimère) : **taux 10 % + 25 % si condition** (= 35 %, mieux qu'une Hyper Ball) · base **10 % (1 ex.) → 20 % (25 ex.)**. Conditions : Lure = type Eau · Chrono = +2 %/tour sur le terrain (max +25 %) · Vif = 30 %→5 % selon attaques pour le K.O. · Luxe = le Pokémon capturé **gagne +1 niveau** · Chimère = Ultra-Chimères (plus tard). Sprites SVG + compteurs `attacksOnCurrentEnemy`/`enemyTurnsOnField`.

### Sprites & docs
9. **52 baies + 10 consommables + 11 balls** : sprites téléchargés (`src/assets/images/items/*.png` PokéClicker/PokeChill + `pokeball/*.svg`) et ajoutés à `tools/download_assets.py`. `docs/BAIES.md` + `docs/ITEMS_MANQUANTS.md` réécrits avec les valeurs finales (natures, ratios 1→25).

### Vérifications
- `build` ✅ · `npm test` ✅ **856/856** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ · **6 vérifs navigateur** ✅ (dont baies/consommables/balls) · sims Atoll ✅ (tower_c = 88 %, bandes respectées)

### Prochaine action
Ferme de baies + Apricorns (mutation PokéClicker) pour débloquer les paliers B/C et les balls spéciales ; rituel Méga (shards mine/Atoll → N combats → gemme).

---

## Passe 26b — Corrections joueur : vitamines EV-only, Capsules, noms FR officiels, debug (2026-08-16)

### Décisions joueur appliquées
1. **Vitamines = EV seulement** : `applyConsumableToPoke` ne donne plus d'IV — **+1 EV aléatoire** (cap 18/stat, 36 au total). Les IV passent exclusivement par les **Capsules** (`bottle_cap` = +1 IV aléatoire · `golden_bottle_cap` = +1 IV partout).
2. **« Bouchons » → « Capsules »** (FR officiel) : `bottle_cap` = **Capsule**, `golden_bottle_cap` = **Capsule d'Or**. Vitamines renommées FR officiels : **PV Plus, Protéine, Fer, Calcium, Zinc, Carbone**.
3. **Noms FR officiels des balls** (Poképédia) : **Appât Ball** (lure) · **Lune Ball** (moon) · **Speed Ball** (fast) · **Scuba Ball** (dive) · **Luxe Ball** · **Faiblo Ball** (nest) · **Bis Ball** (repeat) · **Chrono Ball** (timer) · **Sombre Ball** (dusk) · **Rapide Ball** (quick) · **Chimère Ball** (beast).
4. **Descriptions générées** : `item-engine.generateItemDesc` couvre désormais toutes les nouvelles catégories (immunité, cure_all, skip_cd, pinch_heal/stat/dmg/random, entry_debuff, counter_phys/spec, hit_buff, super_heal, ice_boost, loot_boost, flavor, vitamin, iv_boost, ability_*) avec les valeurs 1→25 affichées.

### Debug (demandé)
5. **« Monnaie +50 000₽ » → « +50 000 de chaque devise »** : ₽ + JD + PQ + 💎 + PC (Atoll).
6. **Nouveau bouton « Tous les objets +1 »** : une copie de chaque objet (balls → système Poké Balls).
7. **Nouveau bouton « Dictionnaire : tout afficher »** : force le dictionnaire à montrer tous les objets (drapeau `G._debugShowAllItems`, bypass du filtre par génération).

### Réponse roadmap
Après le gisement dormant (P5) viennent, dans l'ordre : **P6 Succès → P7 Revanches & Team Rocket → P8 Atoll → P9 Maîtrise des routes → P10 Ferme**. La ferme et les Méga ne sont donc **pas** la priorité immédiate — la priorité est **P6 (Succès)**, puis P7 (Revanches).

### Vérifications
- `build` ✅ · `npm test` ✅ **856/856** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ · **7 vérifs navigateur** ✅ (dont la nouvelle `verify-debug-p26` : +50k/devise, +1 objet, tout afficher, noms FR, descriptions) · sims Atoll ✅ (tower_c = 88 %)

### Prochaine action
**P6 — Succès** (moteur + liste intégrale, source PokéClicker), la prochaine passe de la feuille de route.

---

## Passe 26c — Bugfix objets manquants + THEMES_V4 retrouvé (2026-08-16)

### Bugs corrigés (vérifiés en navigateur)
1. **Objets manquants dans le dictionnaire / give-all** : ajout de **139 objets** qui étaient documentés mais absents d'`items-data.js` :
   - **55 méga-gemmes** (`lucarionite`, `gengarite`, `charizardite_x/y`…) — type `held`, catégorie `mega_stone`, Gen 6 (masquées hors debug, visibles avec « tout afficher »).
   - **Shards méga** (fragment/éclat/amas/bloc), **Œuf Mystère**, **Bonbons Tempo** (×2), **7 Noigrumes**, **8 clés de légende** (Orbes Rouge/Bleu, GS Ball, Cloches, Ticket Éon, Météorites), **9 objets d'élevage/entraînement** (Nœud Destin, Bracelet Macho, 6 Poids Pouvoir, Aromate Neutre), **17 éclats souterrains**, **18 plaques d'Arceus**, **9 objets de ferme** (terreaux + pelles + permis), **6 flûtes**, **3 outils PokéClicker** (scanner, détecteur, collecteur).
   - Chacun a **sprite téléchargé** (PokeChill/PokéClicker/PokeAPI, 0 échec), **génération** dans `item-generations.js`, **description FR/EN** dans `item-engine`, et est ajouté à `tools/download_assets.py`. **Total : 505 objets.**
2. **Sprite Appât Ball manquant** : le chemin pointait vers `Appatball.svg` (fichier inexistant) → corrigé vers `Lureball.svg`.
3. **Bonus** : les consommables (vitamines/capsules) étaient mal classés « objets tenus » dans le sac → corrigé (catégorie « special », comme les bonbons).

### Thèmes
4. **`THEMES_V4.css` retrouvé** (fourni par le joueur) : 6 thèmes complets — **ocean, forest, sakura, midnight, desert, contrast** — contrastes WCAG AA vérifiés (0 couple < 4,5:1). Installé dans `/home/user/annexes/THEMES_V4.css`, prêt à être intégré à `design-system.css` lors de la passe P3 (5 points d'insertion par thème, comme documenté dans la roadmap).

### Vérifications
- `build` ✅ · `npm test` ✅ **856/856** (1 skip) · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ · vérifs navigateur ✅ (dont nouvelle `verify-items26c` : 505 objets, mega-gemmes + spéciaux dans dictionnaire/give-all, sprite Appât Ball)

### Prochaine action
**DND-01** (prototype validé → code dans `win-drag.js`), puis **HLP-00** + le reste de **P2 (Lisibilité)**, puis **P3** (thèmes THEMES_V4, fenêtre monnaies, animations).

## Passe 26d — Corrections joueur : sac, Poké Balls spéciales, Cristaux Z, consommables, descriptions & FR (2026-08-16)

### Bugs corrigés (tous vérifiés en navigateur Chromium)
1. **Poké Balls spéciales invisibles/inutilisables** : le sac n'affichait que les 5 balls de base (`ballBagEntries` figée) et le sélecteur de ball (`openBallPicker`) listait aussi 5 entrées. Les **11 balls spéciales** (Appât, Lune, Speed, Scuba, Bis, Faiblo, Sombre, Chrono, Rapide, Luxe, Chimère) sont désormais listées **partout** (sac : onglet « Poké Balls » = 16 entrées ; sélecteur = 17 options). Ajout des **étiquettes i18n FR/EN** (`ball_lureball`…) qui manquaient (les noms s'affichaient en clé brute).
2. **Descriptions des balls spéciales** : remplacement du générique « débloquée plus tard » par la **vraie condition** (+25 % Eau / Pierre Lune / Vitesse ≥ 100 / pluie / déjà capturé / niveau ≤ 25 / donjon ; Chrono +2 %/tour max +25 % ; Rapide jusqu'à +30 % selon les attaques du K.O. ; Luxe +1 niveau ; Chimère).
3. **Cristaux Z** (« n_zélite z ») : reclassés de « objets spéciaux » (`type z_crystal`) vers **équipement** (`type held`, catégorie `z_crystal`, champ `zType`). Ils sont maintenant **équipables**, s'affichent dans « Objets tenus » et ont une **description réelle** avec bulle de type. **Effet de combat implémenté** (fidèle PokeChill) : tous les `20 − 2×palier` tours (18 → 8 selon le stock 1→25), le porteur lance une **attaque coordonnée** du type du Cristal (physique/spéciale selon la meilleure stat, ×1,25 si égales, sans bénéficier des talents ni des buffs, un seul Cristal Z par équipe). Compteur réinitialisé à chaque nouvel ennemi.
4. **Vitamines/Capsules inutilisables depuis le sac** : `isUsableBagItem` ignorait `type consumable` → cliquer ouvrait la fiche au lieu du flux d'usage. Corrigé : PV Plus/Protéine/Fer/Calcium/Zinc/Carbone, Capsules (IV/talent) et Bouchons s'utilisent désormais **comme les Super Bonbons** (sélecteur de Pokémon).
5. **Bonbons Tempo** : étaient traités comme des Super Bonbons (mauvais flux). Corrigé : effet réel **PokeChill** — accélère le temps de combat de **10 min** (30 min pour le Maxi) via `offlineSimulate`.
6. **Descriptions « à venir »** : remplacées partout par des **descriptions réelles** — Gemmes Méga **par espèce** (55 : « Gemme Méga de Dracaufeu X… »), Plaques d'Arceus (18, par type), clés de légende (8, par relique), Noigrumes (7, par couleur), terreaux/flûtes/outils (par objet), éclats souterrains, Nœud Destin, Bracelet Macho/Poids Pouvoir, Aromate Neutre, Œuf Mystère, fragments méga.
7. **Descriptions d'attaques en anglais** : les clés FR de `move-descs.js` sont compactes (PokeChill « airslash ») alors que les ids MOVES sont en snake_case (« air_slash ») → **325 attaques tombaient sur le texte anglais**. Corrigé : la recherche essaie l'id exact **puis** la forme sans underscores (214 attaques réparées), et **111 descriptions FR ajoutées** (moves PokeChill + 19 signatures). 419/419 attaques ont désormais une description française.
8. **Bulles d'effets manquantes** : dans la fiche d'attaque, les effets de statut (Brûlure, Paralysie…) s'affichaient en texte nu sans bulle colorée. Corrigé : chaque effet porte sa clé de statut → **bulle colorée** (Brûlure/Paralysie/Poison/Gel/Sommeil/Confusion/Hésitation/Vitesse ↓) suivie du texte FR.

### Vérifications
- `build` ✅ · `npm test` ✅ **856/856** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ (boot, p0, p0b, p0c, p0d)
- Vérifs navigateur dédiées ✅ : sac (16 balls, 220 tenus, 95 spéciaux), sélecteur de balls (17 entrées nommées FR), fiche Cristal Z (équipement + description), usage vitamine (+1 EV), usage Bonbon Tempo (consommation), attaque coordonnée Cristal Z (dégâts + log), fiche attaque FR + bulle d'effet, dictionnaire 505/505.

### Prochaine action
**DND-01** (prototype validé → code dans `win-drag.js`), puis **HLP-00** + le reste de **P2 (Lisibilité)**, puis **P3** (thèmes THEMES_V4, fenêtre monnaies, animations). Puis **P6 Succès**.

## Passe 26e — Corrections joueur : stats de méga-évolutions, valeurs uniques au stock, taux des balls + previews UI (2026-08-16)

### Bugs corrigés (tous vérifiés en navigateur Chromium)
1. **Gemmes Méga : stats de la méga-évolution affichées** — récupération des **bst méga de PokeChill** (`pkmnDictionary.js`, 89 formes méga) et calcul du delta par stat (méga − base). Les 55 gemmes du jeu affichent désormais : « Gemme Méga de Dracaufeu X : permet à Dracaufeu de méga-évoluer. Changements de stats : Attaque +46, Défense +33, Att. Spé +21. » (valeurs PokeChill, y compris les mégas maison : Barbaracle, Baxcalibur, Dragonite, Falinks, Hawlucha, Pyroar, Raichu X/Y).
2. **Valeurs affichées « X % → Y % »** : remplacées par la **valeur unique au stock actuel** (sac) — et la **valeur de base à 1 exemplaire** dans le dictionnaire (via `baseOnly`). Ex. Baie Oran : « restaure 25 % » (1 ex.) / « 30 % » (5 ex.) / « 50 % » (25 ex.). Le « (max x…) » des multiplicateurs est également retiré au profit de la valeur courante.
3. **Taux de capture des balls de base** : l'échelle de possession (+2 %/palier) était appliquée à TOUTES les balls → Poké/Super/Hyper affichaient 20/30/40 à 25 ex. Corrigé : l'échelle (`scaling: true`) ne s'applique **qu'aux 11 balls spéciales** ; les balls de base restent **fixes à 10/20/30/100** (vérifié : `ballEffectiveRate` = 10/20/30/100 à 1 comme à 25 ex.).
4. **Descriptions en dur → dynamiques** : la description des balls est désormais **calculée** (taux depuis `BALL_DEFS`, source unique) — plus de « Taux de capture : X % » écrit en dur dans les données ; le sélecteur de ball (`ballOptionDesc`) et la fiche objet utilisent la même description dynamique.

### Previews UI (validation avant codage)
Servies sur le port 8080 (`/home/user/prototype/`, process « UI previews »), index inclus :
- **`preview-1-themes.html`** — les **6 thèmes THEMES_V4** (Océan, Forêt, Sakura, Minuit, Désert, Contraste) appliqués à un tableau de bord complet, avec **taille de police S/M/L** et **densité compact/confort** testables.
- **`preview-2-lisibilite.html`** — P2 en avant/après : dévoilement progressif, hiérarchie typographique 3 niveaux, en-têtes unifiés (`.modal-title`), compact/confort mémorisé, résumé de session en combat (~670 px), compteur du dictionnaire.
- **`preview-3-animations.html`** — P3 : nombre flottant ₽/XP (800 ms), barre d'XP fluide (400 ms), éclat de capture (600 ms), secousse super-efficace (200 ms), pulsation succès (1 s) + interrupteur unique.

### Vérifications
- `build` ✅ · `npm test` ✅ **856/856** · `validate` ✅ · `check:i18n` ✅
- 5 smoke tests Chromium ✅ + `verify-dictionary-p19` / `verify-market-ball` / `verify-berries-p26` ✅
- Vérifs navigateur dédiées ✅ : taux des balls (10/20/30/100 fixes ; lure 10→20 à 25 ex.), valeurs uniques au stock (Oran 25/30/50 %), dictionnaire = base (25 % malgré 25 possédés), stats méga FR, previews 0 erreur JS.

### Prochaine action
Valider les **previews** (choix du thème / des options P2/P3), puis coder **DND-01** (prototype validé → `win-drag.js`) et **HLP-00**, puis **P2** (UI-01…UI-05) et **P3** (thèmes THEMES_V4, fenêtre monnaies + deltas, 5 animations).

## Passe 26f — DND-01 codé + descriptions méga PokeChill + preview compacte (2026-08-16)

### DND-01 (prototype validé → code, `src/ui/game/win-drag.js` réécrit)
Les 7 points de la roadmap, portés depuis le prototype validé :
1. **Marque-place** conservant la hauteur (`.pw-win-placeholder`) ;
2. **Auto-défilement** 60 px / 8 px par frame près des bords du dashboard ;
3. **Cache des rectangles** : une seule lecture par frame (`requestAnimationFrame`) ;
4. **Colonne la plus proche** (distance horizontale aux centres, calculée au drop) ;
5. **Pointer Events** (le dispatcher déclenche désormais sur `pointerdown`) ;
6. **Seuil de 5 px** : un clic sans déplacement ne déclenche pas le drag ;
7. **Échap** = annulation + remise en place exacte.
La fenêtre est traînée en entier (plus d'opacité 0.5 ni de vignette ghost pour les fenêtres). `moveWinVert` (sans appelant) supprimé de `dashboard.js`. Vérifié en navigateur : drag inter-colonne (col 3 → col 1), seuil respecté, Échap restaure, 0 erreur console.

### Descriptions Méga au format PokeChill (correction de référence)
- Suppression du tableau « Changements de stats : Attaque +46… » (qui venait de la logique des jeux officiels). **PokeChill décrit les gemmes méga comme un objet d'évolution + bonus tenu**, pas comme des deltas de stats.
- Nouveau format (source `itemDictionary` PokeChill) : « Utilisation : fait évoluer un Pokémon précis. Tenue : augmente les dégâts infligés par Méga-Dracaufeu X de **x1.15** » → **x1.65** à 25 exemplaires (`powerFormula 1.05+0.1*level`, aligné sur PokeChill `1.15 + 0.1*level`).
- **Précision combat** : le système de combat n'a JAMAIS utilisé ces deltas officiels — il est intégralement basé sur PokeChill (talents, capacités, objets, Cristaux Z = logique `explore.js`). Seule la DESCRIPTION des gemmes méga était erronée (simple texte d'affichage), désormais corrigée.

### Audit « rien en dur » (valeurs dans les textes)
- Taux des Poké Balls : déjà dynamiques (passe 26e). Les autres descriptions chiffrées (Évoluroc +50 %, Œuf Chance +50 %, Veste de Combat −10 %, Jaboca/Rowap 12 %, joyaux 30 %) sont vérifiées **identiques aux constantes du moteur de combat** (`team.js` / `battle-attack.js`) : aucun écart détecté, aucune correction nécessaire.

### Preview UI : rendu cible compact & épuré
- **`preview-4-compact.html`** (en tête de l'index) : le **vrai tableau de bord du jeu** reconstitué en style dense/épuré façon PokeClicker/PokeChill — en-têtes unifiés (pastille + titre + ✕), 3 tailles strictes, **zone vide sous le combat supprimée**, compteur du dictionnaire « 366 / 505 », 6 thèmes + parchemin, densité compact/confort, tailles S/M/L.

### Vérifications
- `build` ✅ · `npm test` ✅ **856/856** · `validate` ✅ · `check:i18n` ✅ · 5 smoke tests ✅
- 4 tests drag mis à jour (les marqueurs `insert-above/below` → indicateur unique DND-01).
- Vérifs navigateur : descriptions méga FR/EN, drag inter-colonne + seuil + Échap, previews 0 erreur.

### Prochaine action
Validation du rendu (preview-4) → coder **P2** (UI-01 dévoilement déjà OK monnaies, UI-02 suppression zone vide, UI-03 3 tailles, UI-04 densité, UI-05 unification `.modal-title`) puis **P3** (intégrer THEMES_V4 aux 5 points d'insertion + fenêtre monnaies deltas + 5 animations + interrupteur), puis **HLP-00** et **P6 Succès**.

## Passe 26g — Ordre des colonnes validé + bouton Guide (HLP-00) + réponse previews (2026-08-16)

### Ordre des colonnes (validé par le joueur → codé)
Colonnes de base réordonnées dans `dashboard.js` (défaut + preset `cols3` + migration `DEFAULT_COL`) :
- **Gauche** : Poké Balls · Quêtes · Équipe · Pension
- **Milieu** : Monnaies · Carte · Combat · Base secrète
- **Droite** : Raccourcis · Lieu · Entraînement · Mine
Clé de stockage bumpée `pokeworld_cols_v12` → `v13` pour que l'ordre s'applique aux sauvegardes existantes (les 12 fenêtres sont désormais toutes dans le layout, y compris Mine/Raccourcis). Vérifié en navigateur : DOM réel = ordre demandé, 0 erreur.

### Bouton Guide « ? » (HLP-00)
Ajout du bouton **« ? »** dans la barre du haut (`index.html`, à côté de la roue crantée) → ouvre le panneau **Guide** (`open-fullscreen-panel` → `guide`). Vérifié en navigateur : clic → panneau « Guide » ouvert, 0 erreur.

### Réponses aux retours d'affichage
- **Croix sur les fenêtres déplaçables** : c'était une erreur de MES maquettes (preview-1/4) — le VRAI jeu n'a aucune croix sur les fenêtres drag&drop (en-tête = poignée + icône + titre uniquement). Maquettes corrigées (croix supprimées).
- **Le « ? » du guide** : il existait déjà dans la fenêtre Raccourcis (tuile « Guide ») ; il est maintenant AUSSI dans la barre du haut.
- **« Vraie affichage du jeu »** : les maquettes sont des approximations. Le vrai rendu est le **jeu en direct** (aperçu « Game preview », port 4173) — c'est là que la refonte sera visible et validée, pas dans des captures.

### Prochaine action
Refonte PokeChill appliquée DIRECTEMENT dans le jeu (aperçu live) : accent jaune `#ffe15e` (palette PokeChill), en-têtes et densité compacts, hiérarchie 3 tailles, suppression de la zone vide sous le combat, unification `.modal-title` — à valider sur le jeu en direct.

## Passe 26m — Rebuild complet de l'UI (from scratch) + fonds PokéClicker réels (2026-08-16)

### Récupération des vrais décors PokéClicker
- Téléchargés depuis le dépôt PokéClicker (`battleBackground/`) : **default, forest, battlefield, cave, water** (1280×796). Le panneau de combat utilise désormais le **vrai décor PokéClicker** (dégradé ciel + image du champ en `cover`), plus de fond générique ni de dégradé improvisé.

### Nouveau skin UI reconstruit (section « PASSE 26m — UI SKIN 2026 »)
- **Fenêtres** = seul cadre (12px, filet fin, plus d'ombre portée) ; corps transparents.
- **Équipe** : séparations claires et aérées entre Pokémon (filets + survol discret), plus de « boîtes dans des boîtes ».
- **Poké Balls** : lignes réelles (en-tête + rangées), séparateur doux + survol accent, qtés tabulaires.
- **Carte** : hauteur compacte (320px), header épuré (titre + menu de région), **menu déroulant entièrement visible** (min-width 132px, chevron).
- **Quêtes** : liste verticale aérée.
- **Thème Sakura** : libellé sombre `#3A2029` sur fond clair (visible).
- **Cartes de combat** : voile sombre translucide pour rester lisibles sur le décor.

### Re-application des passes 26h→26l (perdues suite à une réinitialisation du workspace)
- **formatNumber PokéClicker (K/M/B/T)** ré-appliqué partout (24 fichiers).
- **6 thèmes THEMES_V4** ré-intégrés (CSS + THEME_IDS + 10 pastilles réglages + i18n + couleurs).
- **Accent jaune #FFE15E**, **en-têtes 34px**, **letter-spacing 0**, **couleurs de types PokeChill** unifiées JS/CSS.
- **caughtStatusBallHtml** (vide/normale/dorée) ré-appliqué (combat + équipe).
- **Zone vide sous le combat supprimée**, boutons « ? » par fenêtre (Guide), « ? » retiré des Raccourcis et de la barre du haut, bouton ↻ de la Base retiré, outils d'en-tête groupés à droite, titres centrés.

### Vérifié en navigateur
Thèmes : 10 pastilles, Sakura lisible (texte #3A2029 sur fond #FDF2F5). Combat : décor PokéClicker chargé, min-height 0, boule vide sur le sauvage (None.svg), boule normale sur le capturé. Carte : 320px, cadre 1px, select 153px visible. 0 erreur console.

### Vérifications
`build` ✅ · `npm test` ✅ **856/856** (dont la mesure navigateur des en-têtes) · `validate` ✅ · `check:i18n` ✅ · 5 smoke tests ✅

### Prochaine action
P3 : deltas animés des monnaies + 5 animations (interrupteur unique). Menu latéral « Start Menu » si demandé.

## Passe 26n — Skin Pokéchill : combat, équipe, Poké Balls, grips (2026-08-17)

### Récupération des vrais assets Pokéchill
- **Fonds de combat Pokéchill** téléchargés depuis le dépôt (`img/bg/`) : route, forest, gym, cave, lake, mountain, night, sea, snow, town + **ombre de sprite** (`pkmn-shadow.png`). Le panneau de combat utilise désormais le **vrai fond de route Pokéchill**.

### Combat façon Pokéchill
- Panneau de combat = **image de fond réelle** (`bg/route.png`, cover).
- **Pokémon sauvage** : gros sprite (150px, plafond `max-width` levé), **ombre au sol**, encart d'infos parchemin (nom + niveau + PV en boîte sombre + attaques en colonne) — reproduction de `explore-header` Pokéchill.
- **Équipe du joueur** : boîte encadrée (`explore-team` Pokéchill) ; le membre actif est déplié, les inactifs repliés (sprite 40px, sans attaques).

### Fenêtre Équipe façon Pokéchill (team-preview)
- Cartes « member » : fond sombre, bordure claire, sprite à gauche + infos à droite, coins arrondis, survol accent — reproduit l'image 1.

### Poké Balls (PokéClicker)
- **Séparateur pleine largeur** (le trait va d'un bord à l'autre de la fenêtre, 361px = 361px), **parfaitement droit** (rayon 0), **aucun survol** (hover désactivé).

### Six points supprimés DÉFINITIVEMENT
- Retirés à la SOURCE (`win-chrome.js` n'émet plus `winGripVNode`) et des shells statiques d'`index.html`. Vérifié : 0 `.pw-win-hdr-grip` dans le DOM.

### Structure
- L'ancienne structure de combat/équipe n'est plus utilisée visuellement : la scène est re-skinée intégralement (section « PASSE 26n — SKIN POKECHILL »), sans toucher au moteur ni aux contrats DOM (le ticker 60fps et le drag & drop restent fonctionnels).

### Vérifié en navigateur
Fond = `bg/route.png` servi · sprite ennemi 150px · encart infos parchemin `#ECDEB7` · cartes équipe bordure `#C9BC9C` · rangée Poké Balls largeur = largeur fenêtre, rayon 0 · 0 grip · 0 erreur console.

### Vérifications
`build` ✅ · `npm test` ✅ **856/856** (dont la mesure navigateur des en-têtes) · `validate` ✅ · `check:i18n` ✅ · 5 smoke tests ✅

### Prochaine action
Valider le rendu (aperçu « Game preview »). Ensuite : P3 (deltas monnaies + 5 animations) et menu latéral « Start Menu » si demandé.

---

## Passe 26o — Restructuration depuis le dump + refonte visuelle Pokéchill × Pokéclicker (2026-08-17)

### 1. Restructuration & remise en état

- **Réassemblage complet** depuis le dump `code2prompt (26).txt` (164 481 lignes) : **673 fichiers** recréés à l'identique selon l'arborescence de tête (`src/`, `tests/`, `tools/`, `docs/`, configs racine, `index.html`, `ChangeLog.md`).
- **Bug de compilation corrigé** : `tools/download_assets.py` refusait de s'importer (`IndentationError` ligne 102) à cause d'une accolade `}` parasite ligne 99 introduite par le dump. Balayage `ast.parse` de l'ensemble de `tools/*.py` : tout est propre.
- **Assets retéléchargés** intégralement via `tools/download_assets.py` : **1 730 images** (1 192/1 195 jobs amont OK, 3 replis générés), plus **13 fonds de combat** ajoutés au downloader (voir §4).
- **Vérification complète** : `npm run validate` ✅ · `npm run check:i18n` ✅ · `npm run build` ✅ (1 743 assets copiés) · `npm test` ✅ **856/856** · audit Chromium ✅ **0 pageerror, 0 console.error, 0 HTTP ≥ 400** au démarrage et en plein combat.

### 2. Corrections de bugs de rendu et de logique

- **PV affichés en décimales** (`14.328/19 PV`) : le moteur fait descendre les PV en flottant à 60 fps. Arrondi `Math.max(1, Math.ceil(n - 1e-9))` appliqué aux **trois** sites d'affichage — `poke-full-card.js` (`hpNum`), `pokemon-card-element.js` (`_hpDisp`) et surtout `battle-ui.js` (`hpDisplay`), qui réécrit `.hp-text` à chaque frame.
- **Pastille de niveau invisible** en combat : la règle `#battle-team-row .poke-name > span` (id + 2 classes) l'emportait sur `#battle-team-row .poke-level`, peignant l'encre exactement de la couleur du fond (`rgb(42,39,33)`). Corrigé par exclusion `:not(.poke-level)` — même correctif préventif appliqué à `#team-window-body`.
- **PV masqués dans la fenêtre Équipe** : la vieille règle `.team-view .hp-text { display: none }` cachait la valeur ; la barre verte flottait sans chiffre. Rétabli.
- **Sprites flottant au-dessus de leur ombre** en combat : `place-items: end center` sur `#battle-team-row .poke-sprite-container`.
- **Bouton « Debug » recouvrant le texte** du Centre d'entraînement : la pastille `position: fixed` est désormais discrète (opacité .28) et redevient franche au survol ou au focus clavier, sans bloquer les clics derrière elle.
- **Rayures diagonales du fond supprimées** : le `repeating-linear-gradient` 45° posé sur `body` par la passe précédente a été retiré (demande explicite).
- **Contrat d'en-têtes préservé** : le `letter-spacing` des titres de fenêtre est verrouillé à `0.4px` (et non en `em`), sous peine de casser le test d'unification *wave 33 H*.

### 3. Refonte visuelle (Pokéchill × Pokéclicker)

Nouveaux jetons : `--pc-scene-h`, `--pc-wild-sprite`, `--pc-team-sprite`, `--pc-move-h`, `--pc-parch`, `--pc-parch-ink`, `--pc-glass`.

- **Combat** — `#battle-team-row` devient une véritable *scène* : fond `battleBackground/default.png` en `cover`, grille `joueur | sauvage`, cartes en verre dépoli, bandeau d'infos sur parchemin, sprite du joueur retourné (`scaleX(-1)`), doublons de chips masqués, bascule en colonne unique sous 760 px. L'écran de repos redevient un encart pointillé centré sur `battleBackground/forest.png`.
- **Équipe** — rangées Pokéchill : vignette carrée de 124 px avec le numéro d'emplacement `#01` en bas à gauche, colonne droite `Nom + Nv.` puis les 4 lignes d'attaques pleine largeur, emplacements vides en pointillés.
- **Lignes d'attaque typées** dans les deux vues : liseré gauche de 4 px à la couleur du type, nom coloré, badge de type carré, remplissage de charge en `color-mix`.

### 4. Assets — ce qui manque encore (à fournir si tu les as)

- **12 icônes d'objet Poké Ball absentes de PokeAPI** : lure, moon, fast, dive, luxury, nest, repeat, timer, dusk, quick, beast, master. *(Les SVG équivalents existent dans `images/pokeball/`, l'UI ne casse pas.)*
- **3 objets sans sprite ni repli** : `berry`, `prine_berry`, `upgrade`.
- **45 noms de décor de base secrète** introuvables dans `pret/pokeemerald`.
- **`bg/route.png`** : absent en amont — le CSS n'y fait plus référence.

Réparés automatiquement : 2 polices, 18 CT/CS, 61 fichiers `emerald-ref`, 45 `objgfx`.

### État roadmap

P2 : **UI-01 / UI-02 / UI-03 / UI-04 / UI-05 ☑** (refonte de la peau de combat, de l'équipe et des en-têtes). HLP-00 et DND-01 restent en place depuis les passes 26f/26g.

### Prochaine action

Passer P3 : **THM-01** (thème clair à repasser sur les nouveaux jetons `--pc-*`), **CUR-01**, **ANI-01**.

---

## Passe 31 — 11 retours joueur sur l'affichage (2026-08-17)

### Les 11 correctifs demandés

**1. La Poké Ball décorative tourne enfin.** Elle était bien animée, mais le
§30.2 posait `transform: none !important` sur le pseudo-élément : une
déclaration `!important` sur `transform` **écrase la valeur produite par les
keyframes à chaque image**. L'animation tournait dans le vide. Déclaration
retirée, rotation verrouillée (12 s, linéaire, infinie).

**2. Les deux combattants dominent la scène.** Le sauvage et l'actif du joueur
sont rendus à **129 px** de sprite contre **72 px** pour le banc (mesuré au
navigateur), selon la recette Pokéchill (`.member-inactive .sprite-box{scale:.5}`).

**3. Plus aucun survol sur les cartes de combat.**

**4. Badges de bonus et d'état repeints à la palette des types.** Fini le
`color-mix(…, #FFF)` délavé : ATK↔Combat, DEF↔Acier, VIT↔Électrik, et chaque
baisse est la **même teinte assombrie** (`color-mix(… 62%, #000)`). Les états
suivent le type qui les évoque (brûlure↔Feu, poison↔Poison, gel↔Glace…). Les
`#d32f2f` / `#1976d2` / `#f57c00` codés en dur ont disparu des règles de badge.

**5. Objet tenu au gabarit Pokéchill** : médaillon rond, bordé, **44 px** en vue
Équipe, **40 px** sur les combattants, **24 px** sur le banc.

**6. L'étoile chromatique quitte le combat** — la Poké Ball d'état (capturé /
chromatique) reste, elle.

**7. L'éclat de capture est visible.** La durée passée à `_pulseClass` (600 ms)
ne correspondait plus aux keyframes : l'animation était coupée avant son pic.
Alignée à **700 ms**, la luminosité culmine à **×2,36** (mesuré sur timeline).

**8. Les sprites de combat respirent** (balancement haut-bas, keyframes
`pw31-bob`). L'échelle transite par `--pw-bob-scale` : posée à côté en
`transform`, elle gelait l'animation (même piège qu'au point 1).

**9. Refonte des promeneurs du fond** : plus aucun carré derrière eux (sprite
détouré seul), traversée **de coin à coin** puis sortie et remplacement,
**96–150 px** au lieu de 34–58 (≈ ×2,8), même balancement qu'en combat, et les
**non-chromatiques sont inclus**. Opacité vérifiée à **.30** (.38 pour un
chromatique) une fois le fondu d'entrée terminé.

> **Formule de peuplement** — `bgPokemonCount(n) = n ≤ 0 ? 0 : min(14, 3 + ⌊n/12⌋)`
> soit **3 promeneurs au minimum, +1 par tranche de 12 Pokémon capturés**,
> plafonnés à 14. Zéro capture ⇒ personne à promener.

**10. La carte occupe toute la largeur** de sa colonne (694 px sur 696
disponibles) : la hauteur suit désormais la largeur via `aspect-ratio`, au lieu
de laisser le ratio 5:3 du `viewBox` centrer la carte entre deux bandes vides.

**11. Le PNJ « vous êtes ici » est centré verticalement** sur son nœud, avec un
anneau pulsé qui le désigne.

### Deux tests d'une passe antérieure devenus faux

Ils exigeaient l'inverse de la nouvelle consigne — ce sont les **tests** qui ont
été corrigés, jamais le code :

- `passe30-affichage-p3` réclamait l'étoile chromatique en combat (supprimée
  ici), et attendait 3 promeneurs pour une collection vide (0 est correct).
- `passe28-battle-skin` verrouillait le `transform: scale(…) !important` qui
  gelait précisément le balancement du point 8.

### État des vérifications

`npm test` ✅ **935/935** (99 fichiers) · `npm run validate` ✅ · `npm run check:i18n` ✅
· `npm run build` ✅ (1809 assets) · Chromium ✅ 0 erreur de page.

### Prochaine action

**Refonte des donjons** : rendre le péage d'entrée signifiant (proposition
détaillée remise avec cette passe), puis **P4** (`docs/ROAD_MAP.md` §7) :
BOX-01 · DUP-01 · DEX-01 · REG-01 · HLP-01.

---

## Passe 30 — 8 correctifs d'affichage + les 5 éléments P3 manquants (2026-08-17)

### A. Les 8 correctifs demandés

**1. L'écran de repos prend la taille de son sprite de fond.** Tous les PNG de
`src/assets/images/bg/` font **240×112** : `#battle-idle-screen` porte désormais
`aspect-ratio:240/112` et `background-size:cover,100% 100%`, au lieu d'une
hauteur fixe qui rognait ou étirait le décor.

**2. La Poké Ball décorative est de retour, et elle tourne.** Reprise du
`.explore-team-member-flair` de Pokéchill : disque de 148 % calé en `-34%/-34%`
derrière le Pokémon **actif** du joueur (`z-index:2`), rotation `pw28-flair-spin`
sur 12 s. Le halo `radial-gradient` ajouté en passe 29, jugé laid, a été
supprimé ; l'ennemi n'a toujours aucun décor dédié.

**3. Les attaques de l'adversaire sont empilées à la verticale**, comme celles du
joueur — 4 cadres rendus en toutes circonstances, cases vides comprises, et le
bloc nom + attaques de l'ennemi reste soudé en un seul cadre (`row-gap:0`).

**4. Le bandeau « objet tenu / bonus » de la passe 29 est supprimé** (152 lignes
de CSS, le bloc `.poke-perks`, les modèles `heldModel`/`bonusTags`/`showPerks` et
la clé i18n `no_held_item`). L'objet tenu est désormais **placé comme dans
Pokéchill** : coin haut-gauche du sprite, `border-radius:8px 0 8px 0`, **28 px**
en vue Équipe et **24 px** en combat.

**5. Les pastilles de buffs et d'effets ont la même forme et sont lisibles.**
Buffs et états partagent un seul gabarit (`min-height:17px`, `border-radius:9px`,
bordure claire, texte `#14120E`). Les fonds trop sombres passent par
`color-mix(in srgb, var(--token) 48–62%, #FFFFFF)` — plus aucune couleur en dur,
tout suit le thème actif.

**6. Le gain d'argent décolle du chiffre lui-même.** L'hôte `#pw-cur-fx-<id>` est
recalé sur `--pw-cur-amount-top` (27 px), c'est-à-dire la ligne du montant : le
nombre flottant naît sur le solde et monte. Il reste strictement à l'intérieur de
`#win-currency`, jamais dans la barre de titre.

**7. L'étoile chromatique devient SIGNIFIANTE en combat, et la Poké Ball de
capture s'affiche sur nos Pokémon.** L'étoile était rendue pour tout le monde,
donc elle ne voulait rien dire : elle ne sort maintenant que sur un Pokémon
réellement chromatique, en doré scintillant (`pw30-shiny-twinkle`) — on repère un
shiny sauvage d'un coup d'œil avant de lancer une Ball. En parallèle, un vrai
bug est corrigé : `caughtBallHtml` était conditionné à `isEnemy`, la Poké Ball
d'état n'apparaissait donc **jamais** sur nos propres Pokémon.

**8. Le fond global redevient `main-bg.png` défilant** (opacité .08) : l'override
`body::before` de la passe 29, qui y peignait le décor du lieu, est retiré. Les
décors de lieu restent sur `#battle-idle-screen` et la carte du sauvage
uniquement. **L'entraînement reçoit ses propres fonds** : `bg/gym.png` derrière
le duel complet, plus une tuile de gymnase par emplacement.

### B. Les 5 éléments P3 qui manquaient (`docs/ROAD_MAP.md` §6.3)

- **Animations de combat** : barre d'XP interpolée (`smoothBar`, 400 ms), éclat
  de capture (600 ms), secousse (200 ms) et pulsation (1 000 ms) branchées sur
  `battle-ui.js`.
- **Va-et-vient des sprites** façon Pokéchill : `pw30-bob`, avec une durée
  légèrement différente par carte pour éviter l'effet « métronome ».
- **Nos Pokémon se promènent sur le fond** — nouveau module
  `src/ui/game/bg-pokemon.js`. Le nombre suit les captures de façon
  **exponentielle** : `min(14, floor(log2(n)) + 1)`, soit les paliers
  0/1/3/7/15/31 → 0/1/2/3/4/5 promeneurs. Les chromatiques passent en tête et
  portent un halo doré. Couche `#pw-bg-pokemon-layer` en `z-index:-1`,
  `pointer-events:none`.
- **Cassage des tuiles de la mine** : `playMineDigFx()` rejoue l'impact
  (`pw30-mine-hit`) ou la rupture (`pw30-mine-break`) sur les cases touchées,
  **après** `renderMineWindow()` — le rendu reconstruit le DOM, l'ordre inverse
  effaçait l'animation.
- **Sprites de personnage sur la carte, façon PokéClicker** : le dresseur est
  planté sur le nœud courant (sautillement + anneau qui se propage) et chaque
  lieu accessible hébergeant des espèces sauvages porte une pastille rouge
  comptant ces espèces. Les lieux verrouillés n'en reçoivent pas.

### Bugs corrigés au passage

- **`bgPokemonCount()` comptait un promeneur de trop** : `floor(log2(n + 1)) + 1`
  renvoyait 2 pour une seule capture. Corrigé en `floor(log2(n)) + 1`.
- **La pastille d'ennemis avalait le clic de déplacement.** Posée sur le coin du
  nœud, elle interceptait le clic sans rien faire : impossible de voyager vers
  une route depuis ce coin. Elle relaie désormais exactement la même action
  (`clickLocation`) que le nœud qu'elle décore.
- **`caughtBallHtml` conditionné à `isEnemy`** (cf. correctif 7).

### État des vérifications

`npm test` ✅ **919/919** (98 fichiers, dont `tests/passe30-affichage-p3.test.js`,
27 tests) · `npm run validate` ✅ (structure + contrat de sinks HTML) ·
`npm run check:i18n` ✅ · `npm run build` ✅ (1 809 assets) · Chromium ✅ **0
erreur de page, 0 `console.error`, 0 réponse HTTP ≥ 400**, écrans de repos,
combat, équipe, carte, mine, entraînement et monnaies vérifiés en capture.

### Prochaine action

**Rééquilibrage et refonte du fonctionnement des donjons**, avant P4
(`docs/ROAD_MAP.md` §7 : BOX-01 · DUP-01 · DEX-01 · REG-01 · HLP-01).

---

## Passe 29 — Décors par lieu, gabarit d'équipe complet, animation des gains, audit des assets (2026-08-17)

### Ce qui a été fait

**1-2. Les décors suivent le lieu, en combat comme hors combat.** Nouveau module
`src/data/location-backgrounds.js` : il traduit `G.location` en une scène
Pokéchill (`BG_BY_TYPE`, 23 scènes, replis `town→town`, `route→route`,
`dungeon→cave`, `sea→sea`, défaut `route`) et publie le résultat sur
`<body data-bg="…">` via `applyLocationBackground()`. Appelé depuis
`src/ui/game/map-render.js` (hors combat) et
`src/application/combat/battle-init.js` (entrée en combat). Le CSS mappe chaque
valeur vers `--pc-scene-url`, consommé par `body::before` (opacité .13),
`#battle-idle-screen` et la carte du Pokémon sauvage. Aucune image
PokéClicker (`battleBackground/`) n'est plus utilisée comme scène.

**3. Ornements retirés.** La Poké Ball décorative rotative et l'ombre au sol
(`pkmn-shadow.png`) ne sont plus dessinées sous les sprites de combat.

**4. Plus aucune couleur en dur sur les cadres de combat.** Fonds, bordures et
séparateurs des `.poke-card` dérivent désormais de `color-mix(in srgb, var(--dark1|--dark2|--accent) …)` :
les six thèmes de THM-01 repeignent réellement l'écran de combat.

**5-6. Cadres d'attaques.** Quatre emplacements sont **toujours** rendus, les
vides en pointillés (`min-height:26px`, bordure `dashed`, opacité .55) — jamais
`display:none`, le ticker 60 fps indexant les cellules par position DOM. Le
bloc nom + attaques du sauvage est fusionné en un cadre unique (`row-gap:0`).

**7. Sprites agrandis et centrés verticalement** — `object-position:center center`
et `transform-origin:center center`, échelle 1,34 en combat et 1,22 sur le banc.

**8. L'animation de gain joue enfin dans la fenêtre « Monnaies ».** Le bug était
un bug de rendu, pas d'animation : `renderCurrencyWindow()` reconstruisait tout
le HTML du panneau, or elle est appelée **au moins deux fois par cycle**
(`main.js:277`, `header-window.js:28` et `:104`) — le nombre flottant était
détruit quelques millisecondes après sa création. Le rendu est désormais
**incrémental** : une signature `data-pw-sig` évite de refabriquer le squelette
tant que la liste des monnaies visibles est inchangée, et seuls les montants
réellement modifiés sont réécrits. Les hôtes `#pw-cur-fx-<id>` survivent aux
rafraîchissements ; `overflow:visible` laisse le nombre s'élever.

**9. La vue Équipe reprend le gabarit complet de Pokéchill : objet tenu et
bonus.** Trois couches, sans toucher à la rangée de combat :
- `src/ui/components/poke-full-card.js` rend un bandeau `.poke-perks`
  (`.team-held-item` + `.team-buff-list > .buff-tag`) entre `.poke-card-top` et
  les badges d'état, piloté par les nouvelles clés de modèle `heldItem`,
  `heldItemClick`, `heldItemEmptyLabel`, `heldItemEmptyTitle`, `bonusTags` ;
- `src/ui/game/battle-team-ui.js` construit ces modèles sous une nouvelle option
  `showPerks` (défaut `false`) à partir de `heldKey`/`itm` et de `getHeldBuff(p)`,
  auxquels s'ajoutent talent, nature et chromatique ;
- `src/ui/game/team-ui.js` active `showPerks: true`.

Clé i18n `no_held_item` (« Aucun objet » / « No held item »). Deux règles
fourre-tout du CSS (l. 7384 et 8878) forçaient `color: var(--dark1) !important`
sur **tout** `span` d'une `.poke-card` et rendaient ces libellés illisibles : le
bloc 29.8b restaure explicitement leurs couleurs.

**10. Audit des assets — la liste « introuvables » de la passe 28 était fausse,
elle est vidée.** Sur les **1 018 références** `src/assets/images/...` du code :
- **45 décors de base secrète** : le manifeste couvre **122/122** entrées du
  catalogue, aucun décor ne manque ;
- **20 Poké Balls « absentes de PokeAPI »** : les 20 noms à tiret répondent
  HTTP 200 ; alias ajoutés à `ITEM_ALIASES` et sprites récupérés ;
- **`berry`, `prine_berry`, `upgrade`** : ils existent sous leur nom officiel
  anglais (`oran-berry`, `lum-berry`, `up-grade`) ; alias ajoutés, vrais sprites
  en place ;
- **3 favicons réellement manquants** (`Icon.png`, `icon-192.png`,
  `icon-180.png`, référencés par `index.html` l. 7-9) : nouveau dictionnaire
  `APP_ICONS` dans `tools/download_assets.py`, téléchargement puis
  redimensionnement automatique aux tailles déclarées.

**Bilan : zéro asset introuvable.**

**11. La recherche dans la boîte trouvait « Pikachu » mais pas « Dracaufeu ».**
Ce n'était ni un matcher cassé ni une limite « requête EN dans une UI FR » :
`p.name` est **figé à la création du Pokémon** et trois sélecteurs le lisaient
brut, ignorant la langue active. Nouveaux helpers partagés
`pokemonSearchHaystack(p)` / `pokemonMatchesSearch(p, query)` dans
`src/data/game-helpers.js` (ils interrogent `getPokeName(p.id)` **et** `p.name`
**et** le numéro de Pokédex) ; `box-selector.js`, `UnifiedPokemonSelectorView`
et `preset-manager.js` sont recâblés dessus. Vérifié par bascule FR→EN à chaud.

### Vérifications

`npm test` **894/894** ✅ (dont les **22 nouveaux** de
`tests/passe29-retours-ui.test.js`, un par point ci-dessus) · `npm run validate` ✅ ·
`npm run check:i18n` ✅ · `npm run build` ✅ · `tools/download_assets.py` ✅
(1 195/1 195 jobs, 0 repli) · sondes Chromium : 0 erreur de page, 0
`console.error`, animation de gain observée dans `#win-currency`
(`floatCount:1`, « +5K ₽ »), bandeau d'objet tenu et de bonus lisible dans la
vue Équipe.

### Prochaine action

**P4** (`docs/ROAD_MAP.md` §7) : BOX-01 (=FIX-08) · DUP-01 · DEX-01 · REG-01 · HLP-01.

---

## Passe 28 — Vrais décors Pokéchill, sprites agrandis, monnaies hors barre de titre (2026-08-17)

### Ce qui a été fait

**1. Scène de combat figée après « Quitter » — corrigé**
- Cause : `#battle-active-scene { display: flex !important }` écrasait le
  `style.display = 'none'` posé par `endBattle()` (`battle-flow.js` l.74). La
  scène restait donc affichée pour toujours après un combat.
- Correctif : le `display` n'est plus forcé inconditionnellement. Il est
  désormais porté par la classe d'état `#battle-active-scene.is-live` (ajoutée
  par `battle-init.js`, retirée par `battle-flow.js`), doublée de deux gardes
  `[style*='display:none']`. **Règle générale : ne jamais forcer en
  `!important` une propriété que le JS pilote en inline.**

**2. Vrais décors Pokéchill (et non PokéClicker)**
- `tools/download_assets.py` étendu : **27 fonds** de `img/bg/`, **21 tuiles**
  de `img/bg/mini/` et **3 ressources** (`pkmn-shadow.png`, `none.png`,
  `pokeball.svg`) sont maintenant téléchargés depuis le dépôt d'origine.
- **`bg/route.png` n'est plus « introuvable »** — l'ancien constat était faux,
  le fichier existe bien et il est récupéré.
- Les **5 dernières références** à `images/battleBackground/` (PokéClicker) ont
  été retirées du CSS : combat, panneau et écran de repos utilisent `images/bg/`.
- **Cause de l'aspect « horrible » identifiée** : ces fonds sont du pixel-art
  **240x112**. Étirés en `background-size: cover` sans consigne de rendu, ils
  étaient interpolés en bouillie. Ils sont désormais affichés en
  `image-rendering: pixelated`, calés en bas — le traitement exact du
  `#explore-header` de Pokéchill.

**3. Mise en page de combat réalignée sur Pokéchill**
- La rangée redevient le panneau sombre `#explore-team` (bordure `--light1`,
  rayon `.5rem`) ; le paysage n'est plus peint sous les six vignettes mais
  **uniquement derrière le sauvage**, comme dans le jeu d'origine.
- Le bloc d'infos du sauvage est une plaque `--dark1` **opaque et continue**
  (nom + PV + attaque) avec ombre portée : plus de texte sur le feuillage.
- Les cases d'attaque vides du sauvage sont repliées en `visibility: hidden`
  et non en `display: none` — le ticker 60 fps indexe les cases par position
  dans le DOM (garde-fou `tests/passe54-wave27-fixes`).
- Un K.O. du sauvage ne grise plus le paysage, seulement le sprite et le texte.

**4. Fond dédié du Pokémon qui combat**
- Reproduction fidèle du `.explore-team-member-flair` de Pokéchill : une
  **Poké Ball géante en rotation lente** (`resources/pokeball.svg`, 12 s
  linéaire, opacité .30) derrière le combattant actif, en sens inverse et plus
  discrète derrière le sauvage. Aucun noeud DOM ajouté (pseudo-élément).
- **Ombre au sol** `resources/pkmn-shadow.png` sous le sprite : il ne flotte plus.
- L'animation est neutralisée sous `prefers-reduced-motion`.

**5. Sprites nettement agrandis (combat et équipe)**
- Jetons : `--pc-battle-sprite` **84 → 132 px**, `--pc-bench-sprite` **46 → 74 px**,
  `--pc-team-sprite` → `clamp(112px, 30%, 168px)`, `--pc-scene-h` 210 → 260 px.
- **Vraie cause du « trop petit »** : les PNG sont des toiles **96x96 presque
  vides** — Bulbizarre n'occupe que 35x33 px au centre. En `object-fit: contain`
  on met donc à l'échelle du vide. Correctif repris de Pokéchill
  (`.explore-sprite img { scale: 2; transform-origin: center bottom }`) :
  `transform: scale(1.34)` ancré en bas, 1.22 pour les remplaçants.
- Le débordement est confiné à la carte (`overflow: hidden` sur `.poke-card`)
  pour qu'un sprite agrandi n'empiète jamais sur la rangée voisine.

**6. Monnaies et énergie de mine retirées de la barre de titre**
- `#h-currency-hud` et ses 5 puces supprimés d'`index.html` ; `#header` revient
  au `.hinfo` d'origine (badges seuls). `#h-money` est conservé **masqué** car
  `updateHeader()` l'écrit encore.
- `_pwSetCurrencyChip()` supprimé, `updateCurrencyHud()` réduit à l'entretien
  de `#h-money` + rafraîchissement de la fenêtre Monnaies.

**7. L'animation de gain joue dans la fenêtre Monnaies, et nulle part ailleurs**
- Chaque colonne de `#win-currency` porte son hôte `.pw-cur-fx` (absolu, donc
  sans effet sur la mise en page) et appelle `reportCurrency()`.
- Vérifié au navigateur : après un gain de 12 345 ₽, l'unique `.pw-fx-float`
  du document est bien dans `#win-currency`.

**8. Non-régression**
- Nouveau fichier `tests/passe28-battle-skin.test.js` : **16 tests** verrouillant
  les huit points ci-dessus (barre de titre propre, FX confinés, pas de
  `display` forcé, zéro référence `battleBackground`, fond dédié, sprites
  agrandis, cases vides conservées dans le DOM).

### Vérifications

`npm test` **872/872** ✅ · `npm run validate` ✅ · `npm run check:i18n` ✅ ·
`npm run build` ✅ (1 791 assets) · sonde Chromium : **0 erreur de page, 0
`console.error`, 0 réponse HTTP ≥ 400**, et la scène de combat disparaît bien
au « Quitter » (`display: none`, hauteur 0) au profit de l'écran de repos.

### Prochaine action

Poursuivre la roadmap au-delà de P3 (§7), et affiner la vue Équipe si
l'utilisateur souhaite s'approcher davantage du gabarit `teams.js` (objet tenu
et liste de bonus à gauche de la vignette).

---

## Passe 27 — Refonte Pokéchill (combat + équipe) & démarrage de P3 (2026-08-17)

### Ce qui a été fait

**1. Écran de combat — refonte complète (le point rejeté de la passe 26o).**

La passe précédente avait supposé une **arène côte à côte** (`grid-template-areas:'player wild'`). C'était faux : les captures de référence de Pokéchill montrent des **rangées empilées pleine largeur**. Cette hypothèse produisait aussi le bug de superposition, parce que `#battle-team-row` ne contient pas deux cartes mais **N** (le sauvage **plus chaque membre de l'équipe**) — les 6 cartes de l'équipe atterrissaient toutes dans la même cellule de grille.

- `#battle-team-row` devient une **colonne flex** : une rangée pleine largeur par Pokémon (le sauvage en haut, puis l'équipe).
- Chaque `.poke-card` est une grille 2 colonnes `sprite | infos`, le sprite couvrant les deux lignes ; `.poke-info` en haut à droite, `.poke-moves` en dessous.
- **Rangées de banc compactes** : seuls le sauvage et le combattant actif affichent leurs attaques. Sinon 7 rangées pleines débordent de la fenêtre.
- Passe de contraste : voile sombre sur le décor, rangée du sauvage repeinte en opaque — elle était illisible sur l'herbe claire du fond.
- Le sprite n'est plus enfermé dans une tuile encadrée, et la pastille `Nv.42` est collée au nom (elle était repoussée à droite par un `margin-left:auto` hérité).

**2. Vue Équipe** — alignée sur la maquette : sprite posé à même la rangée (sans cadre), numéro de slot en bas à gauche, colonne de droite = nom + niveau, barre de PV, puis les 4 lignes d'attaques teintées par type **à côté** de la vignette (elles passaient sous la carte, sur toute la largeur).

**3. P3 — THM-01 · CUR-01 · ANI-01** (menée en parallèle, cf. `docs/ROAD_MAP.md` §6).

- **THM-01** : les 6 palettes (`ocean`, `forest`, `sakura`, `midnight`, `desert`, `contrast`) sont écrites et vérifiées à l'exécution — `THEMES_V4.css` annoncé par la roadmap **n'existe pas**, elles ont été refaites à la main. 10 thèmes au total dans `THEME_IDS`.
- **CUR-01** : barre de monnaies persistante dans le header (₽, jetons d'Atoll, Fragments, énergie de mine + badges), avec **deltas animés** au gain. Corrige un bug réel : `updateHeader()` écrivait dans `#h-money`, **élément absent du HTML** — le solde du joueur n'apparaissait nulle part dans le bandeau.
- **ANI-01** : `src/ui/game/feedback-fx.js` — nombre flottant 800 ms, barre interpolée 400 ms, éclat de capture 600 ms, secousse 200 ms (coup super-efficace ou critique), pulsation 1 000 ms. **Un seul interrupteur** dans les réglages coupe tout ; `prefers-reduced-motion` fait de même sans réglage.

**4. Bug corrigé — récursion infinie.** `regionOfLoc()` dans `src/application/economy/currency.js` s'appelait elle-même : le garde `typeof regionOfLoc === 'function'` est toujours vrai à l'intérieur de la déclaration de la fonction. Elle délègue désormais à l'implémentation réelle de `ui/game/map-logic.js`.

### État des vérifications

`npm test` ✅ 856/856 · `npm run validate` ✅ · `npm run check:i18n` ✅ · `npm run build` ✅ (1743 assets) · Chromium ✅ 0 erreur de page, 0 `console.error`, 0 réponse HTTP ≥ 400.

### Prochaine action

**P4** (`docs/ROAD_MAP.md` §7) : BOX-01 (=FIX-08) · DUP-01 · DEX-01 · REG-01 · HLP-01.

---

## Passe 32 — 10 retours d'affichage + les donjons (2026-08-17)

### Ce qui a été fait

**Volet affichage (les 10 retours)**

1. **Poké Ball décorative** — elle ne se réinitialise plus à chaque nouvel adversaire. La cause n'était pas la balle mais le **re-render intégral de la page de combat** : nouveau `src/ui/game/dom-morph.js` (`pwMorphHtml` + `morphKey`) qui réconcilie le DOM au lieu de le réécrire, clés `enemy:<uid>` / `team:<uid>` émises par `poke-full-card.js`. L'animation `pw28-flair-spin 12s` survit désormais au changement de Pokémon.
2. **Sprites de combat plus hauts** — agrandissement **en hauteur uniquement**, la largeur des zones sprite/attaques n'a pas bougé. Nouveaux tokens `--pc-battle-sprite-h` (176/196), `--pc-bench-sprite-h` (88/96), `--pc-team-sprite-h` (132). Mesuré : actif/adverse **168×196**, banc **62×62**, rien ne se décale.
3. **Survol neutralisé** — le survol des Pokémon en combat ne fait plus **rien du tout** (toutes les propriétés repeintes couvertes, `background` compris).
4. **Animation à la Pokéchill** — relevée dans la source amont : saut net en deux temps, sans interpolation, `0,5 s infinite`. Repris sous `pw32-hop` en `steps(1, end)`. Fini la respiration lente.
5. **Promeneurs de fond** — passés **au-dessus du background** (sous les fenêtres), même saut saccadé qu'en combat, **halo shiny supprimé**.
6. **Peuplement du fond** — `bgPokemonCount(n) = 5 + floor(n / 10)`, **minimum 5, +1 par tranche de 10 captures, aucun plafond**. `1 → 5`, `100 → 15`, `1000 → 105`.
7. **Badges adverses** — ils ne paraissent plus plus sombres que les nôtres : le voile de la carte sauvage recouvrait aussi les effets ; il est maintenant restreint au décor.
8. **Nouveau fond de jeu** — paysage en bandes **sol → herbe → dégradé ciel** (`body::after`, z −3), recoloré **par thème** (9 thèmes), sous la texture `main-bg.png` conservée à l'opacité .08. **Cycle jour/nuit à 4 phases** (dawn/day/dusk/night, découpes 6/9/18/21) branché sur l'heure système, veille de 60 s, plus une **bascule debug** (`debugCycleDaytime()`).
9. **PNJ de la carte** — il ne bouge plus (le bob ajouté en passe 31 est annulé).
10. **« Exploration au repos »** — correctement placé au démarrage et après un refresh, sans éléments visibles dessous.

**Volet donjons** — proposition validée, donc implémentée.

- Moteur `src/application/world/dungeon-run.js` : péage à l'entrée, sac de butin séparé du portefeuille, descente palier par palier, gardien au palier final, K.O. général qui ne fait perdre que la moitié du sac (remboursement intégral si la chute a lieu au palier 1). État persisté dans la sauvegarde, compteur `G.dungeonClears`.
- UI intégrée au panneau de lieu existant (`location-info.js` → `LocationInfoView` → `map-dressing.js`), i18n FR/EN, CSS sans aucune couleur en dur — le panneau suit le thème actif.
- **Calibrage corrigé après mesure en jeu** (détails dans `docs/PROPOSITION-DONJONS.md`) : quota `8 + (palier−1)×2`, butin par victoire nettement réduit, et **rendement ×0,4 sur un palier déjà purgé** pour que descendre reste plus payant que faire du sur-place.
- **Correction du gardien** : il peut désormais surgir dans la **chaîne de combats**, et non plus seulement à l'exploration — sans quoi il n'aurait jamais été rencontré en session continue.

### Vérifications

- `npm run check` (validate + i18n + build + test) ✅ — **971/971 tests**, build exit 0.
- Sonde navigateur d'une **expédition réelle** (Forêt de Jade) : péage prélevé une seule fois, 5 paliers descendus, Gardien Aspicot niveau 15 rencontré et vaincu, donjon marqué comme terminé, gain net +245 jetons, **aucune erreur JavaScript**.

### Prochaine action

Chantier **P4** de la roadmap : BOX-01 · DUP-01 · DEX-01 · REG-01 · HLP-01.

## Passe 33 — Retours d'affichage (6) et refonte des donjons (6)

### Affichage
- **Sprites agrandis** dans la fenêtre **équipe** et pour les Pokémon **hors combat** (oubli de la passe 32) : token `--pc-team-sprite-h`, `.poke-sprite` libérée du bridage 62 px.
- **Cadre transparent foncé derrière l'adversaire supprimé** (`.pw-enemy-card::after` → `content:none`).
- **Tout survol neutralisé** sur les cartes de combat : fond, contour, ombre et transformation ne bougent plus.
- **Aucune animation sur le Pokémon adverse** (`enemyAnim:"none"`, figé sur 6 échantillons).
- **Transition sol → ciel** : silhouettes d'herbes, d'arbres et de rochers via `body::after` (5 dégradés), plus de ligne droite.
- **Promeneurs de fond totalement opaques** : `opacity:1`, `filter:none` — mesuré avec un Pokédex peuplé (9 promeneurs pour 40 captures).

### Donjons
- **Chaîne de combats bornée** : le quota atteint arrête le combat au lieu de relancer `spawnNextWild()` à l'infini.
- **Arrêt à chaque palier** ; `_dgStopBattle()` coupe le combat sur *remonter*, *abandonner* et *descendre*.
- **Le gardien apparaît vraiment** : le palier final arrête le combat, l'annonce, et le bandeau propose « Défier le gardien » (`dungeonFight()` réarme le drapeau que `endBattle()` efface). Sa carte porte un cadre distinct.
- **Difficulté croissante** : `applyDungeonFloorScaling()` (+3 niveaux et +15 % PV par palier) ; `applyDungeonEncounterTuning()` unifie exploration et chaîne, qui divergeaient.
- **UI déplacée de la fenêtre LIEU vers la fenêtre COMBAT** : bandeau `#battle-dungeon-bar`, posé **hors** de `#battle-active-scene` pour rester cliquable entre les paliers. Le panneau dupliqué du lieu n'est plus alimenté ; le lieu ne sert plus qu'à entrer.
- 5 clés i18n FR + EN ; 12 tests `tests/passe33-retours-donjons.test.js`. `npm run check` → **983/983**.

## Passe 34 — correctifs des 4 retours de la passe 33

- **Survol des cartes de combat (§34.1)** — les 4 blocs neutralisants scopés
  (§30, §31, §32.3, §33.3) ont été SUPPRIMÉS : ils étaient inopérants face aux
  règles fourre-tout `.poke-card:hover` (l.576 et l.7320), de spécificité au
  moins égale. Correction à la source : ces règles excluent désormais la rangée
  via `:not(#battle-team-row) >`. Survol vérifié 100 % neutre (`d34-hover.mjs`).
- **Sprites du banc** — `--pc-bench-sprite` 62 → 104 px et `--pc-bench-sprite-h`
  → 112 px (120 au-delà de 1200 px). 62 px bridait un sprite natif de 96 px via
  `object-fit: contain`. La colonne du banc étant un track de grille distinct,
  ni les combattants ni les attaques ne sont décalés (`d34-bench.mjs`).
- **Transition sol / ciel (§34.2)** — l'ancien §33.6 (cinq `radial-gradient`,
  « des dômes flottants ») est remplacé par des bandes en `vh` et deux frises
  SVG en `mask` : végétation 240×64 sur la ligne d'herbe, rochers 430×22 sur la
  ligne de sol. Positions en `calc(<ligne> - <hauteur tuile>px)`, jamais en `%`
  (le masque dériverait). Contraste des rochers porté à 72/28 pour les rendre
  visibles sur leur bande.
- **« Exploration au repos » en pleine expédition (§34.3)** — le vrai coupable
  était la règle §32.6 `#battle-center-panel:has(#battle-active-scene:not(.is-live))
  #battle-idle-screen`, qui rallumait l'écran dès que la scène était éteinte,
  donc AUSSI entre deux paliers où le combat est arrêté volontairement. Sa
  spécificité (0,2,2) battait tout `!important` ajouté après coup. Le masquage
  posé en style inline par `endBattle()` ne survivait pas non plus au morphing
  du DOM, qui reconstruit l'attribut `style`. Solution : un drapeau
  `data-dungeon-run` posé sur `<html>` par `_dgSyncRunFlag()` — il traverse
  tous les rendus — et l'exclusion de la règle §32.6 pendant une expédition.
  Toutes les sorties de run (descente, remontée, abandon, wipe, boss) rendent
  l'écran de repos (`d34-idle.mjs`, `d34-exits.mjs`).
- **Tests** — `tests/passe34-retours.test.js` (6). Les assertions P31/P32
  devenues fausses ont été corrigées, jamais le code : elles vérifiaient la
  PRÉSENCE d'un neutralisant, alors que la stratégie est désormais l'absence de
  survol. Les deux garde-fous ont été validés par réinjection de la régression.
  Suite complète : **989/989**.

## Passe 35 — paysage posé au sol, donjons sans clic parasite, vrai gardien

### 1. Paysage — plus de transition douce, la végétation ne « vole » plus

- `body::after` peint désormais des **aplats francs** : chaque bande s'arrête et
  la suivante démarre à la même hauteur, sans stop intermédiaire. L'ancien
  dégradé horizon → herbe s'étalait sur 5 vh — c'était la **cause racine** du
  défaut « les arbres et l'herbe volent » : aucune ligne n'était visible sous la
  frise végétale. Les rochers, eux, semblaient posés parce que la bascule
  herbe → sol était presque nette à leur hauteur. **La géométrie des tuiles SVG
  n'était pas en cause.**
- Nouvelle variable de thème `--pw-land-edge` et **trois arêtes de contraste**
  (2 px sur l'horizon, 3 px sur l'herbe, 3 px sur le sol) : ce sont les lignes
  de pose sur lesquelles les frises s'appuient visiblement.

### 2. Donjons — le cycle « quitter → reprendre » est supprimé

- **`_dgStop` réécrite** (`battle-status.js`) : quota non atteint → la chaîne
  **continue** ; quota atteint sur un palier normal → arrêt **une seule fois** ;
  quota atteint sur le palier **final** → **aucun arrêt**, `pendingDungeonBoss`
  est armé et le gardien enchaîne dans la foulée du K.O.
- **Relance automatique** (`dungeon-run.js`) : `_dgAutoResume()` relance
  `dungeonFight()` après 700 ms tant que le quota n'est pas atteint, que l'équipe
  est debout et qu'aucun combat ne tourne. `_dgSuppressAutoResume()` la musèle,
  et **les quatre sorties l'appellent** (remontée, abandon, descente, wipe).
- **« Reprendre le combat » a disparu** du bandeau ; le bouton d'engagement ne
  subsiste que pour le tout premier combat d'une expédition (`totalWins === 0`).
- **« Quitter » ≠ « Remonter et encaisser »** : `doLeaveBattle()` route vers
  `dungeonQuitFromBattle()`, un abandon sec qui **ne crédite pas le sac** et le
  signale en rouge (`dungeon_quit_battle`).

### 3. Le gardien est enfin un vrai boss

- **Espèce d'élite** : le gardien n'est plus le tirage sauvage courant mais
  **l'espèce la plus forte de la faune du lieu, poussée à son évolution finale**
  (somme des stats de base, chaîne suivie via `LEVEL_EVO_MAP`). En Forêt de Jade,
  le gardien est désormais **Raichu**, plus un Chenipan.
- **Stature** : niveau `+8 + 2×profondeur`, **PV ×4,5**, et modificateurs de camp
  (Attaque ×1,5, Défense ×1,35). Mesuré en jeu : **270 PV contre 74** pour un
  sauvage du même palier.
- **Furie** : sous 50 % de PV, Attaque ×1,4 et cadence ×1,6, annoncées au
  journal. Branchée sur la boucle de combat (`domain/battle/tick.js`).
- **Deux pièges corrigés au passage** : les tables de faune sont des **tuples**
  `[id, min, max, rareté]` — lire `w.id` renvoyait `NaN` et l'élite retombait
  silencieusement ; et les modificateurs sont posés par `dungeonBossTick()` au
  premier tick, car `startBattle`/`spawnNextWild` réinitialisent `enemyMods`
  **après** le buff.
- 3 clés i18n FR + EN (`dungeon_quit_battle`, `dungeon_boss_appears`,
  `dungeon_boss_enrage`).

### 4. Tests

- `tests/passe35-retours.test.js` — **13 tests**, dont trois validés par
  **réinjection de la régression** (PV du boss, lecture du tuple, Quitter qui
  encaisse).
- `tests/passe33-retours-donjons.test.js` — le test 33.9 encodait la spec
  **inverse** (arrêt avant le gardien), désormais refusée par le joueur. Il a
  été retourné pour verrouiller la nouvelle règle, puis validé par réinjection.
  **Le code n'a pas été plié au test.**
- `npm run check` → **1003/1003**.

### 5. Question n°12 — proposition écrite, sans code

`docs/PROPOSITION-CHOIX-PAR-COMBAT.md` : quatre variantes argumentées d'un choix
**à chaque combat** (Bifurcation, Pari, Bénédiction, Carte), tableau de
comparaison sur 6 critères, recommandation A+C et 4 points à trancher. Le § 2.1
de `PROPOSITION-DONJONS.md` est marqué caduc.

## Passe 36 — Réassemblage complet, carte du donjon (variante D), paysage retrouvé (2026-08-29)

### 0. Réassemblage depuis le dump + assets

- Projet reconstitué fichier par fichier depuis l'archive texte (689 fichiers,
  arborescence conforme) ; `npm run check` vert de bout en bout.
- **Binaires réparés via les outils du projet** : `tools/repair-fonts.py`
  (Megrim + WinkySans re-téléchargées et validées), `tools/download_assets.py`
  (1195/1195 téléchargements amont OK, 1794 images présentes, 0 PNG corrompu,
  0 fichier vide), fonds PokeChill/PokéClicker, cartes de régions, balls SVG,
  monnaies, décors de combat, bases secrètes Émeraude 2D.
- **Bug corrigé dans `tools/fix_missing_assets.py`** : les 12 Poké Balls
  spéciales (`lureball`…`masterball`) étaient déclarées « absentes de PokeAPI »
  parce que le script ne connaissait pas les alias à tiret (`lure-ball`…).
  Ajout de `POKEAPI_ALIASES` ; les 12 sprites officiels sont désormais en place.
- Icône du projet (`src/assets/images/Icon.png`) restaurée depuis l'icône
  fournie par le joueur.

### 1. Paysage — dégradé d'origine, végétation posée au sol

Retours joueur : « au-dessus du sol il doit y avoir une transition, enlève les
traits bizarres de coupure nette et remets le dégradé d'origine » ; « les arbres
et herbes ne sont pas à la même hauteur que le sol et les rochers, ils sont
beaucoup trop haut ».

- `body::after` : les trois **arêtes `--pw-land-edge`** (2-3 px) de la passe 35
  sont supprimées ; le paysage revient à un **dégradé continu**
  ciel → horizon → herbe → sol (transitions étalées sur plusieurs vh).
- `html::before` (rochers) et `html::after` (végétation) : les DEUX frises
  appuient désormais leur bas sur la **même ligne de sol**
  (`--pw-land-h-ground`) — la végétation ne flotte plus 16 vh au-dessus du
  relief. Deux pseudo-éléments distincts car chaque frise garde sa teinte de
  thème. Mesuré en jeu : bas de la végétation et bas des rochers à 880 px sur
  un viewport de 1000 px (88 vh), pile la ligne de sol.

### 2. Donjons — la CARTE (variante D de PROPOSITION-CHOIX-PAR-COMBAT)

Choix du joueur : « je part sur la carte, c'est le plus joli et le plus lisible
visuellement ». Le palier devient un plan de 7 colonnes × 3 rangées parcouru de
gauche à droite : entrée → cases **combat / élite (butin ×2) / cache (soin ou
butin)** → **sortie** (ou **gardien** au palier final). Atteindre le bout de la
ligne purge le palier (`dungeonFloorCleared` = sortie atteinte, le quota
historique reste en repli pour les harnais). `Descendre / Remonter` inchangés.

- **Clic ET clavier** : les cases sont cliquables et les **flèches** déplacent
  le joueur (→ même rangée, ↑/↓ rangée voisine, ← retour).
- **Automatisation** : après **3 complétions** d'un donjon
  (`DUNGEON_AUTO_UNLOCK_CLEARS`), un bouton **Auto** se déverrouille ; le pilote
  choisit la case (cache si équipe < 45 % de PV, élite sinon, combat à défaut),
  enchaîne les combats, descend les paliers et défie le gardien — plus un seul
  clic requis. Désactivable à tout moment.
- **Lisibilité** : le bandeau respire — plan SVG aéré (nœuds 34 px, colonnes
  espacées, états jouable/faite/position), légende des cases, aide clavier,
  rangée d'état quota + sac en deux cartes, boutons pleine largeur. Couleurs
  100 % tokens de thème (aucune couleur en dur, garde-fou testé).
- Une case de combat = un engagement : la chaîne rend la main à la carte après
  chaque victoire (`battle-status.js`, garde-fous PASSE 33/35 conservés).
- 14 clés i18n FR + EN ; `tests/passe36-carte-donjons.test.js` (11 tests).

### 3. Vérifications

- `npm run validate`, `check:i18n`, build, et **1013/1013 tests**.
- Sonde navigateur réelle (`tests/harness/visual-passe36.mjs`) : nouvelle
  partie → téléportation donjon → expédition ; **aucune erreur JavaScript** ;
  flèche droite déplace le joueur (c0r1 → c1r1) ; clic sur une cache verse le
  butin ; frises végétation/rochers mesurées sur la même ligne de sol.

### Prochaine action

Équilibrage fin de la carte (densité élites/caches par profondeur) si le joueur
le demande ; le socle est en place et sauvegardé (`run.map` vit dans `G`).

## Passe 37 — la vraie carte quadrillée (façon Pokéclicker) + transition nette du paysage

Retours joueur : (1) « entre le sol et le ciel la transition doit être NETTE au
niveau de l'herbe/des rochers/des arbres » ; (2) le graphe de la passe 36 était
« un choix à branche et non une vraie carte » → refonte complète en **grille
quadrillée**, modèle étudié sur le dépôt officiel Pokéclicker
(`DungeonRunner.ts` : cases entrée/ennemi/coffre/boss/échelle, brouillard,
déplacements au clavier).

### 1. Paysage — arrêt NET sur la ligne des frises

`body::after` (design-system.css) : le dégradé du ciel reste doux **au-dessus**
de la ligne d'herbe, mais s'arrête **d'un coup** à `--pw-land-h-ground` :
double arrêt `var(--pw-land-grass) var(--pw-land-h-ground),
var(--pw-land-ground) var(--pw-land-h-ground)`. Les frises rochers/végétation
(html::before/after) restent ancrées sur cette même ligne : ciel→sol se lit
comme un horizon franc, pas comme un fondu.

### 2. Donjon — grille 7×5 à la Pokéclicker

- **Plateau quadrillé** (`_dgGenFloorMap`) : 35 cases — entrée, combats
  (8 + min(4, palier)), 2 élites, 4 coffres, cases vides, **1 boss** posé dans
  la moitié droite. Tout est caché sous un **brouillard de guerre** ; chaque
  pas révèle la case (et la légende du bandeau liste les types).
- **Cases à contenu** : coffre = butin immédiat ×2 (notification « Coffre :
  +N JD dans le sac ») ; élite = combat renforcé à récompense double ;
  boss de palier = mini-gardien (+3 niveaux, PV ×2, `encounter-system.js`).
- **Boss battu → échelle** : la case du boss devient `ladder` (icône échelle
  SVG) et **toute la carte se dévoile** (`_dgRevealAll`) — le joueur voit les
  coffres/combats restants et prend son temps avant de descendre. Poser le
  pied sur l'échelle descend d'un palier ; cliquer sa propre échelle aussi
  (`data-call="dungeonDescend"`).
- **Déplacements** : clic sur une case voisine (boutons de grille accessibles,
  `aria-label` localisés) **et flèches** conservés ; un pas sur une case à
  combat engage la bataille, la chaîne rend la main à la carte après chaque
  victoire (garde-fou PASSE 33/35 : pause tant que `run.map` actif et que le
  gardien final n'est pas engagé).
- **Pilote Auto** conservé et adapté à la grille : exploration BFS des cases
  cachées → traque du boss → ramassage des coffres/combats restants → échelle.
  Déverrouillage après 3 complétions (`DUNGEON_AUTO_UNLOCK_CLEARS`).
- **Icônes** sans tofu : † combat, ★ élite, ♛ boss, ▶ entrée, · case faite,
  coffre et échelle en **SVG inline** (contours `currentColor` — chaque enfant
  porte son propre `fill` car la CSS force `fill: currentColor` sur
  `.pw-dgn-ic`).
- `dungeonFloorCleared` = boss battu **ou** quota atteint (repli pour les
  harnais sans carte).

### 3. i18n et tests

- 7 clés FR + EN : `dungeon_node_{fog,chest,ladder,entrance}`,
  `dungeon_chest_loot`, `dungeon_boss_down`, `dungeon_ladder_hint`.
- `tests/passe36-carte-donjons.test.js` réécrit en série 37-* (12 tests :
  génération de grille, brouillard, voisinage, coffre, boss→échelle,
  révélation, clavier, verrous) + test paysage « arrêt net ».

### 4. Vérifications

- `npm run validate`, `check:i18n`, build Vite, **1015/1015 tests**.
- Sonde navigateur (`tests/harness/visual-passe37.mjs`) : 35 tuiles rendues,
  flèche droite déplace c0r2→c1r2 et lève le brouillard, clic voisin OK,
  coffre soldé avec butin, boss vaincu → `type=ladder`, `bossDefeated=true`,
  brouillard 31→0 (carte dévoilée), transition nette détectée dans le dégradé
  calculé, **aucune erreur JavaScript**. Captures dans `/home/user/shots/`.

## Passe 39f — `dist` livré + `regen_dist.bat` pour le régénérer (2026-09-14)

Retour : « Il me manque dist et je n'ai pas de .bat pour le regen, tu peux
me le fournir ? ».

- **`regen_dist.bat`** (racine du projet, fins de ligne CRLF) : lanceur
  Windows qui régénère le build de production :
  1. vérifie la présence de Node.js / npm ;
  2. `npm install --no-audit --no-fund` uniquement si `node_modules` est
     absent ;
  3. `npm run build` = `vite build` + `node tools/copy-runtime-assets.mjs` ;
  4. vérifie l'existence de `dist\index.html` et signale succès/échec.
- **`dist/`** : build régénéré et livré — `index.html`, 17 chunks
  `assets/*.js` et les images runtime (`dist/src/assets/images`, 1812
  fichiers, 18 Mo). Aucune source modifiée : passe build seul.
- Après build : `vite build` OK (813 ms), `[runtime-assets]` 1812/1812
  fichiers copiés.
- Pour jouer ensuite : `launch_local_server.bat` (sert `dist` en statique,
  zéro installation) — ou `launch_local_server.bat dev` pour vite.

## Passe 39g — Ré-entrée en donjon : bloquant combattu + audit des Pokémon (2026-09-14)

Retour : « Dans les donjons après l'avoir fait une fois, ou perdu une fois,
je ne peux plus combattre du tout en re-rentrant dans le donjon. Ce qui me
bloque. » + « la liste dans tout le jeu des Pokémon non obtenable, ni par
capture ni par évolution, ni par achat. Et dont les objets d'évolutions sont
inaccessibles/in obtenables. »

### 1. Bloquant ré-entrée en donjon — corrigé

Diagnostic (sonde Playwright sur le VRAI UI) : après completion (boss) ou
perte (wipe), la ré-entrée ouvrait bien une nouvelle carte — mais le grand
bouton **« Engager l'expédition » ne lançait aucun combat**. Il se contentait
de faire un PAS vers une case voisine ; or la case de départ est toujours
dans le sas (3 cases vides), donc cliquer ne combattait jamais, et les cases
sous brouillard n'étant pas révélées, le joueur restait bloqué à chaque
nouvelle carte.

- **`dungeonFight()`** (`src/application/world/dungeon-run.js`) : le bouton
  MARCHE désormais jusqu'à l'engagement le plus proche — combat/élite (le
  boss seulement s'il est le dernier engagement restant, contrat 38e
  conservé : un combat normal n'arme JAMAIS le gardien) — en levant le
  brouillard au fil des pas, et s'y engage : une pression = un combat.
  L'échelle est exclue du parcours (le bouton n'engage jamais une descente)
  et le palier purgé dit explicitement « descends ou remonte encaisser ».
- **Garde-fou équipe K.O.** dans `startDungeonRun()` : après un wipe, si
  l'équipe est entièrement à terre, l'entrée est bloquée avec un message
  clair (`dungeon_team_ko_blocked`, fr/en) au lieu d'ouvrir un combat qui
  se refermerait aussitôt.
- Tests : `tests/passe39g-donjons-reeentry.test.js` (7 tests : marche au
  combat, jamais au boss tant qu'un combat reste, plateau vidé → boss,
  échelle contournée, entrée bloquée équipe K.O. + message, entrée OK avec
  un Pokémon debout) ; fenêtre d'analyse du test 33.9 élargie (la fonction a
  grossi, le contrat 38e est intact).
- Preuves navigateur : `tests/harness/visual-passe39g.mjs` (run gagnée →
  ré-entrée → combat ; wipe → soin → ré-entrée → combat : 10/10 ✔) et
  `tests/harness/visual-passe39g-ui.mjs` (tout par clics UI, dont le bouton
  « Engager l'expédition » qui démarre bien un combat après ré-entrée :
  8/8 ✔, aucune erreur JS).

### 2. Audit « Pokémon non obtenables » — résultat : AUCUN

Outil reproductible : `tools/audit-unobtainable.mjs`
(`node tools/audit-unobtainable.mjs`). Il croise TOUTES les sources du jeu :
tables sauvages des 3 régions (177 lieux), légendaires errants (pool 12 h),
starters, marché des 3 régions, fossiles de la mine, récompenses Pokémon des
quêtes (histoire + Hoenn + annexes), œufs d'incubation, formes spéciales
achetables (387-389 ← Castform, 390-392 ← Deoxys) — puis ferme par
évolution (niveau + objets, en vérifiant l'obtenabilité de CHAQUE objet
d'évolution : boutiques, stock CT, drops de routes, mine, récompenses de
quête).

Résultat : les **392 espèces de la Pokédex sont toutes obtenables**, et les
**13 objets d'évolution sont tous obtenables** (pierre à feu/eau/tonnerre/
feuille/lune/soleil : mine + quêtes ; kings_rock/metal_coat/dragon_scale/
upgrade/deep_sea_tooth/deep_sea_scale/prism_scale : mine (rares), boutiques
et/ou drops de routes). Contrôle : l'écart avec `getReachableSpecies()` du
jeu est exactement les 6 formes spéciales 387-392 que ce helper arrête à 386.
Les « difficiles » ont tous une source : Mew/Celebi/Raikou/Suicune/Entei/
Jirachi/Deoxys = roaming ; les 3 Régis = donjons rares (seafloor_cavern /
cave_of_origin / sky_pillar) ; Kyogre/Groudon = southern_island + roaming.

## Passe 39h — Fin d'expédition : l'équipe se repose en entier (2026-09-14)

Retour : « après avoir fini un donjon, ma team n'est pas heal, ce qui est
vraiment problématique. »

Pendant l'expédition il ne se passe toujours aucun soin (règle 38e inchangée
: les PV durent de combat en combat — c'est la difficulté demandée), mais la
clôture de l'expédition ne reposait l'équipe nulle part : après un boss vaincu,
on repartait avec les PV restants du run, et la ré-entrée reprenait ces PV
épuisés (le soin de `startBattle` ne jouant que hors expédition).

- **`_dgRestTeam()`** (`src/application/world/dungeon-run.js`) : à la clôture
  de l'expédition — victoire du gardien **ou** remontée et encaissement —
  l'équipe est soignée en entier : PV complets, états purgés, message
  « Fin d'expédition : l'équipe est soignée en entier. » (`dungeon_run_team_healed`,
  fr/en). Appelé avant l'arrêt du combat, le rendu de l'équipe affiche directement
  la pleine forme.
- **Pas de soin sur un wipe** : la défaite laisse l'équipe K.O. — la base
  reste l'échappatoire (et le garde-fou 39g bloque la ré-entrée tant que
  l'équipe est à terre).
- Tests : `tests/passe39h-donjons-team-rest.test.js` (4 tests : remontée →
  équipe soignée + run close ; boss vaincu → victoire + équipe soignée ;
  pendant le run aucune victoire de case ne soigne ; wipe → équipe pas
  soignée + ré-entrée bloquée).
- Preuve navigateur : `tests/harness/visual-passe39h.mjs` — équipe usée à
  35 % + paralysie : pas de soin pendant le run, **soignée en entier après le
  boss**, nouvelle run démarrant en pleine forme ; wipe → équipe non soignée,
  ré-entrée bloquée puis OK après soin (11/11 ✔, aucune erreur JS).
