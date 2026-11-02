# Phase 1.16.3 — Refonte de l'AFK : ne simuler que ce qui a été lancé, et le dire honnêtement

> Refonte du rattrapage hors ligne. L'ancien système inventait des combats sauvages quelle que soit
> l'activité du joueur, récompensait en argent, butin et niveaux de pension sans passer par le moteur
> réel, soignait gratuitement l'équipe au retour et cumulait ces gains à chaque changement d'onglet.
> La nouvelle version ne rejoue **que** les activités que le joueur a lui-même lancées, à travers les
> systèmes qui possèdent leurs règles.

---

## 1. Le problème constaté

Mesures faites sur une sauvegarde neuve (500 ₽, `route1`, **aucune activité en cours**) avec l'ancien
`FastForwardSystem.simulateOffline()` :

| Absence simulée | Résultat de l'ancien système |
|---|---|
| 4 s | 1 combat « simulé », +10 ₽ |
| 60 s | 24 combats, +240 ₽ |
| 1 h | 77 combats, +760 ₽ |
| 4 appels successifs (1 h chacun) | **+2 270 ₽, 5 objets, 0 combat réellement joué**, équipe soignée à 100 % |

Autrement dit : des combats qui n'auraient jamais dû avoir lieu, des récompenses calculées à la main
(`money`, objets de route, niveaux de pension) hors du règlement réel, un soin complet gratuit, une
usure de fatigue inventée après 50 combats, et un empilement sans limite à chaque retour d'onglet.

## 2. Décisions validées par le joueur

| Sujet | Décision |
|---|---|
| Modèle de simulation | **B — rattrapage par système** : chaque système rejoue sa propre activité avec ses propres règles |
| Soin au retour | **Supprimé** : aucun `healFull()` |
| Fenêtre maximale | **12 h** d'absence simulées, le reste est ignoré |
| Rechargement complet du jeu | **Simulé aussi** : l'activité survit dans la sauvegarde, l'absence est mesurée depuis la dernière écriture |

## 3. Ce que fait la nouvelle version

`FastForwardSystem` n'est plus un moteur de combat : c'est un **orchestrateur** qui partage un unique
budget de temps entre les activités réellement en cours, par ordre de priorité :

| Priorité | Activité | Ce qui est rejoué | Système responsable |
|---|---|---|---|
| 1 | Combat en cours | Le **même** combat se termine (attaques automatiques, dégâts, K.O., captures, butin, argent) | `BattleSystem.catchUp()` → `BattleSession` réel |
| 2 | Entraînement | La session lancée avance jusqu'à sa vraie durée (600 s), puis la file d'automatisation payée enchaîne | `TrainingSystem.catchUp()` |
| 3 | Donjon en pilotage auto | L'expédition continue au rythme réel du pilote | `DungeonAutoSystem.update()` |
| 4 | Relance auto achetée | Le compte à rebours de 5 s s'écoule puis le combat/la donjon repart | `RelaunchSystem` |

Rien d'autre n'est simulé :

- **aucun combat n'est créé** parce que le joueur était absent (`BattleStartedEvent` reste à 0 pendant
  tout le rattrapage, vérifié par test) ;
- **aucune récompense n'est calculée à la main** : argent, objets, expérience, captures et niveaux de
  pension proviennent uniquement du règlement réel d'une activité ;
- **aucun soin gratuit** au retour ;
- **aucune usure de fatigue** inventée ;
- si aucune activité n'était en cours, `simulateOffline()` renvoie `null` : pas de simulation, pas de
  récompense, **pas de fenêtre** non plus.

## 4. Mécanique interne

### 4.1 Une horloge décalable (`src/core/TimeSource.js`)

Un rattrapage doit se dérouler « comme si » le joueur avait été là. Les deux ordonnanceurs concernés
(`RelaunchSystem`, `DungeonAutoSystem`) lisent désormais `TimeSource.now()` au lieu de `Date.now()`.
Au début du rattrapage, l'horloge est placée au instant du départ (`offset = −min(absence, 12 h)`), puis
avancée au fil des étapes ; elle est toujours remise à zéro dans un `finally`. Les horodatages écrits
pendant la simulation sont donc de vrais instants du passé, jamais du futur. `MineSystem` n'a pas besoin
d'être simulée : son énergie est déjà calculée à partir de son propre horodatage.

### 4.2 Pas de temps et plafond

`FastForwardRules` (nouveau) : pas de 0,5 s (le même que la boucle vivante), seuil minimal de 4 s
(en dessous, regarder un autre onglet n'est pas une absence), plafond de 12 h, garde-fou de 120 000 pas.

### 4.3 Silences pendant la simulation

`BattleSystem` et `TrainingSystem` reçoivent une profondeur de rattrapage : pendant celle-ci, aucun
événement d'attaque/d'état n'est émis, aucune notification n'est poussée et aucune sauvegarde n'est
écrite par combat (une seule écriture à la fin). Le règlement (expérience, argent, objets, captures,
quêtes) continue, lui, de passer par les chemins normaux.

### 4.4 Rechargement complet

`FastForwardSystem.init()` s'abonne à `SaveLoadedEvent`. L'absence est mesurée **au moment du
chargement** depuis `save.updatedAt` (l'horodatage de la dernière écriture, déjà présent dans le format
de sauvegarde — aucune migration nécessaire), puis le rattrapage est planifié au tick suivant pour que
l'entraînement et les donjons aient restauré leur activité depuis la sauvegarde. Aucune modification de
schéma, donc aucune sauvegarde existante n'est invalidée.

## 5. Rapport d'activité (`AfkSummaryModal`)

Le rapport reprend la structure du jeu d'origine (`AfkRecapView`, `offline-engine.js` de `main`), qui
était perdue dans la refonte : **deux phases** et **les mêmes composants que le résumé de combat**.

1. **Phase de progression** — pendant que le rejeu tourne : titre, `afk_ff_progress {pct}`, barre qui se
   remplit et libellé de l'activité en cours. Le rejeu est découpé par tranches de 30 s simulées
   (`setTimeout`) pour que la fenêtre se peigne réellement.
2. **Phase de bilan** — pastille d'état (`afk_panel_status_ok/lost/empty`), **grille de statistiques
   partagée** (`.battle-session-summary-grid`, exactement celle du résumé de session de combat), puis les
   sections **Pokémon capturés** (avec sprite, shiny/normal, compteur) et **Objets trouvés**, une note
   (issue du donjon, plafond de 12 h), et le bouton de fermeture.

Lignes de la grille, dans l'ordre de `main` : Durée, Combats, Argent, Pokémon K.O., Captures, Énergie
mine, Entraînement, Minages auto, puis — seulement si non nuls — niveaux de garderie, combats de donjon,
paliers franchis, jetons, expéditions.

### 5.1 Les chiffres étaient faux : cause racine

| Ligne | Ancien calcul (Rework) | Cause | Nouveau calcul |
|---|---|---|---|
| Combats | `BattleEndedEvent.victory` | cet événement ne part **qu'à la fin d'une série**, pas à chaque Pokémon vaincu : une série gagnante puis perdue comptait 0 | nombre de `PokemonDefeatedEvent` sauvages |
| Pokémon K.O. | absent | aucun événement n'existait | nouvel événement `BattlePlayerFaintedEvent` émis par la session |
| Captures | un compteur | pas de détail | liste réelle (`PokemonCaughtEvent`) : espèce + shiny, groupée comme en combat |
| Énergie mine | inventée à 0 | la mine n'était pas simulée | `MineSystem.projectEnergyGain()` : sa propre règle, sur la même fenêtre |
| Minages auto | inventés | oubliée | `MineDugEvent` du vrai pilote automatique de la mine |
| Donjon | absent | oublié | combats, paliers, jetons, expéditions et issue, mesurés sur les événements réels |

L'automate de la mine est désormais une activité rejouée à part entière (`MineSystem.update` sur l'horloge
décalée, énergie régénérée par sa propre règle) : « les modes auto » de la demande initiale sont couverts.

## 5bis. Bouton de debug « AFK +30 min »

Il ne fonctionnait pas correctement :

- il créditait `save.mine.lastRegenTimestamp`, **un champ qui n'existe pas** (la mine utilise
  `lastEnergyAt`) : l'énergie ne se régénérait jamais par la vraie règle ;
- il ajoutait **+30 d'énergie en dur**, quelle que soit la règle de régénération ;
- il appelait `TrainingSystem.update(1800)` et `HatcherySystem.update(1800)` en un seul tick de 30 minutes ;
- il annonçait « Timeskip AFK **+10 min** » sur un bouton **+30 min**.

Il passe maintenant par le chemin réel : `FastForwardSystem.debugSkip(30 min)` décale l'horloge de la mine
de 30 minutes, demande à `MineSystem.settleEnergy()` de créditer la régénération **par sa propre règle**,
puis rejoue les activités en cours et affiche le rapport. S'il n'y avait rien en cours, une notification
le dit au lieu de prétendre avoir simulé.

## 5ter. Numérotation des versions

Les trois livraisons précédentes étaient des **correctifs**, pas des montées de version : elles sont
renommées dans cette phase.

| Ancien nom | Nom correct | Fichier |
|---|---|---|
| 1.17.0 | **1.16.1** | `docs/PHASE_v1.16.1.md` |
| 1.17.1 | **1.16.2** | `docs/PHASE_v1.16.2.md` |
| 1.18.0 | **1.16.3** | `docs/PHASE_v1.16.3.md` |

`Rules.md` §1 fixe désormais la règle : un correctif incrémente le chiffre du correctif du contenu en
cours, et la prochaine livraison sera donc la **1.16.4**.

## 5quater. Coût du rejeu

Le rejeu fait tourner le vrai moteur de combat : mesuré en Chromium, une heure d'enchaînement sauvage
avec une équipe de niveau 100 (3 599 Pokémon vaincus) demande ≈ 12 s de calcul. Une absence de 12 h sur
un enchaînement continu prend donc quelques minutes, découpées en tranches de 5 s simulées dans un budget
de 40 ms par image : la fenêtre de progression reste fluide et se repeint, le jeu n'est pas figé. Une
absence ordinaire (quelques minutes) se rejoue en une fraction de seconde.

## 6. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/systems/FastForwardSystem.js` | réécrit : orchestrateur + collecte du bilan réel |
| `src/systems/fastforward/CatchUpRecorder.js` | nouveau : agrège le résultat réel (événements + diff du sac) |
| `src/core/TimeSource.js` | nouveau : horloge décalable du rattrapage |
| `src/config/FastForwardRules.js` | nouveau : pas, seuil, plafond, garde-fou |
| `src/systems/BattleSystem.js` | `catchUp()`, silences pendant le rattrapage |
| `src/systems/TrainingSystem.js` | `catchUp()`, `isActive()` public, silences |
| `src/systems/DungeonAutoSystem.js` | `isRunning()` + horloge décalable |
| `src/systems/RelaunchSystem.js` | `hasPending()`, `pendingWaitSeconds()` + horloge décalable |
| `src/panels/AfkSummaryModal.js` | rapport honnête, aucune ligne inventée |
| `src/localization/{fr,en}/ui.js` | 4 clés ajoutées, 1 supprimée, textes de guide corrigés |
| `src/main.js` | seuil partagé via `FastForwardRules` |
| `src/core/events/BattlePlayerFaintedEvent.js` | nouveau : K.O. d'un Pokémon de l'équipe |
| `src/ui/…` / `src/panels/AfkSummaryModal.js` | reconstruit sur le modèle de `main` (2 phases, grille partagée) |
| `src/panels/components/DebugWidget.js` | bouton AFK +30 min routé vers le vrai rattrapage |
| `tests/AfkCatchUp.test.js` | nouveau : 7 tests du contrat AFK |
| `tests/Release115{5,6,8}.test.js` | tests de l'ancien comportement réécrits (le soin gratuit et les combats inventés sont désormais interdits) |

## 7. Vérifications

- `npm test` : **729 tests, 0 échec** (dont les 7 nouveaux tests AFK).
- Nouveau `tests/AfkCatchUp.test.js` : absence sans activité → rien du tout ; combat en cours → même
  combat terminé, `BattleStartedEvent` = 0 ; entraînement → durée réelle respectée et fin réelle ;
  entraînement seul → aucun combat sauvage lancé ; plafond de 12 h mesuré sur une absence de 48 h ;
  rechargement → l'activité survivante est rejouée ; absence sous le seuil → ignorée.
- Vérification navigateur (`tests/browser/AfkCatchUp.mjs`, Chromium réel, 4/4) : absence sans activité →
  aucune fenêtre, aucun gain ; combat en cours → une fenêtre, la même session continuée, et la grille
  affiche **exactement** le nombre de Pokémon sauvages vaincus mesuré en parallèle (plus jamais 0) ;
  sections captures/objets présentes, aucune clé brute, plus de ligne de fatigue ; bouton de debug →
  énergie de mine créditée par la règle réelle.

## 8. Ce qui reste volontairement hors périmètre

- **Un combat sauvage interrompu par une fermeture complète du navigateur n'est pas repris** : le
  snapshot de session de combat n'est pas persisté (seul l'entraînement et les donjons portent déjà le
  leur). Au rechargement, il n'y a donc plus de combat en cours, et le rattrapage ne rejoue rien — il
  n'invente jamais le combat manquant. Persister ce snapshot demanderait une migration de sauvegarde et
  un chemin de restauration dédié : à décider séparément.
- L'équilibrage (montants, durées, plafond) n'est pas retouché dans cette phase.
