# Livraison — PokéWorld Rework v1.16.20

**Date :** 4 novembre 2026
**Branche :** `Rework`
**Contenu de cette livraison :** correctif des limites de hauteur des fenêtres modales tactiles : elles suivent désormais la zone visible du viewport (`dvh`) et leur corps peut rétrécir proprement pour garder le scroll accessible. La phase précédente conserve ses apports : panneaux qui défilent, menus d'appui long et contrôles à taille de doigt,
**les colonnes de la fenêtre Poké Balls alignées**
(sprites, nombres et titres « Ball » / « Qté » centrés au-dessus de leur colonne), **la fenêtre Lieu
remise d'aplomb** (titre fixe « Lieu », plus de bandeau redondant), **le tutoriel réaligné et réécrit**
(objectifs mesurables, chemin en deux lignes) et surtout **un tutoriel qui montre au lieu de jouer** : le bouton de l'étape
affiche la cible (lieu sur la carte, bouton, fenêtre, cellule de ball) sans téléporter ni ouvrir de
fenêtre à la place du joueur. Le CSS de la 1.16.14 reste inchangé comme organisation — 84 feuilles,
un fichier par objet — et son rendu identique à la 1.16.13 (43 écrans, 187 559 éléments). Les apports des versions
précédentes sont inchangés : évolutions sur le modèle de la référence (Pokémon conservé, espèce
évoluée au niveau 1, 148 évolutions par niveau et 25 par objet vérifiées une à une), P1 d'ergonomie
traités, paliers d'affichage et de qualité de code des 1.16.11 et 1.16.12.

Détail de cette phase : `docs/PHASE_v1.16.20.md` (limites des fenêtres modales au viewport visible), `docs/PHASE_v1.16.19.md` (mobile / tactile), `docs/PHASE_v1.16.18.md`
(colonnes Poké Balls), `docs/PHASE_v1.16.17.md`
(sprite de ball) et `docs/PHASE_v1.16.16.md` (fenêtre Lieu, alignement, tutoriel). Phases antérieures :
`docs/PHASE_v1.16.15.md` (tutoriel : bonne cible et bonnes formulations) et `docs/PHASE_v1.16.14.md`
(CSS).

---

## Correctif 1.16.20 — fenêtres modales alignées sur le viewport visible

- Les modales tactiles utilisent `100dvh` avec fallback `100vh` et safe areas ; le corps commun peut rétrécir et confine le scroll imbriqué. La fiche Pokémon sur petit écran suit également la hauteur dynamique.
- Aucun système parallèle, aucune modification des règles métier ni du schéma de sauvegarde.
- `npm test` : **877 réussis, 0 échec**. `MobileTouch.mjs` : **14/14** et `PanelFit.mjs` : **7/7** dans Chromium. Audits i18n (0 clé manquante) et contraste (147 paires AA) réussis.
- Limites : pas de test sur appareil réel, Safari/WebKit ou Firefox. Les scénarios `MarketAndResponsiveTraining` (timeout `networkidle`) et `InteractionCorrections` (attente de fermeture de fiche) n'ont pas abouti ; voir `docs/PHASE_v1.16.20.md`.

---

## Lancer le jeu

Trois possibilités, de la plus simple à la plus manuelle :

1. **Windows** — double-cliquez sur `start.bat` : le serveur local démarre et le navigateur s'ouvre.
2. **Tout système** — dans le dossier, lancez `node server.js` puis ouvrez <http://localhost:3000>.
   Aucune dépendance à installer : le serveur est en Node natif.
3. **Sans serveur** — ouvrez `index.html` directement. Cela fonctionne, mais certains navigateurs
   bloquent des scripts en `file://` ; les sauvegardes et le chargement des sprites peuvent être limités.

---

---

## Correctif 1.16.19 — le jeu au doigt

- **Menus d'appui long** : la carte de sauvegarde ne répondait qu'au clic droit, qu'aucun mobile
  n'envoie sur un élément — son menu (renommer / dupliquer / exporter / supprimer) était donc
  inaccessible ; il s'ouvre maintenant à l'appui maintenu. Et quand un menu s'ouvrait, le `clic` du
  relâchement le refermait dans le même geste : il survit désormais au relâchement.
- **Un seul geste pour tout le jeu** : six composants recopiaient la même minuterie tactile (tolérance
  nulle au tremblement, clic non neutralisé, texte sélectionnable). Ils partagent maintenant
  `src/ui/LongPress.js` : tolérance de 12 px, balayage jamais pris pour un appui, action secondaire
  sans déclencher l'action principale.
- **Panneaux** : les rangées d'onglets du sac, de la boîte PC et du dictionnaire n'étaient plus
  tranchées en deux ; les panneaux sont dimensionnés sur la hauteur réellement visible (`dvh`) et non
  sous la barre d'URL ; un balayage en fin de liste ne fait plus défiler la page derrière.
- **Contrôles** : boutons d'en-tête 26 → 34 px, sélecteurs 28 → 36 px (texte 16 px, ce qui empêche iOS
  de zoomer au focus), curseurs et champs à taille de doigt.
- Mesures, tests et limites : `docs/PHASE_v1.16.19.md`. `npm test` passe à **876 tests**.

---

## Correctif 1.16.18 — les colonnes de la fenêtre Poké Balls sont alignées

- **Titres décalés de 8 px** : la ligne des titres n'avait pas la gouttière des lignes de données, ses
  colonnes étaient donc plus larges et « Ball » / « Qté » tombaient à côté de ce qu'elles désignent.
  Les deux grilles partagent maintenant la même gouttière.
- **Nombre de Poké Balls non centré** : comme le sprite la veille, la cellule quantité demandait un
  alignement à droite tout en restant un bloc — propriété sans effet, le nombre restait collé à
  gauche. Elle centre maintenant son chiffre (19 px de chaque côté ; 172 donne 14 / 14, chiffres
  tabulaires).
- Aucune `!important` ajoutée, aucune dimension changée. Détail et mesures : `docs/PHASE_v1.16.18.md`.

---

## Correctif 1.16.17 — le sprite de Poké Ball est centré

- Dans la fenêtre Poké Balls, le sprite de 22 px était collé au bord gauche de sa colonne de 44 px
  (0 px à gauche, 22 px à droite). La cellule demandait `justify-content: center` tout en restant un
  `display: block`, où la propriété ne fait rien.
- La cellule devient un conteneur de centrage (`display: flex`, `align-items`/`justify-content:
  center`) : 11 px de chaque côté, mesuré dans Chromium sur les cinq lignes.
- Aucune autre règle, aucune `!important` ajoutée. Le bouton de l'éditeur de filtres, qui utilise le
  même sprite, était déjà correct.
- Deux garde-fous : un test statique (une cellule qui demande un centrage doit poser un conteneur
  capable de le faire) et une mesure réelle en navigateur. Détail : `docs/PHASE_v1.16.17.md`.

---

## Correctif 1.16.16 — fenêtre Lieu, alignement, et un tutoriel qui montre au lieu de jouer

- **Fenêtre Lieu** : le titre reste « Lieu » (il changeait à chaque déplacement en prenant le nom du
  lieu) et le bandeau d'onglet qui répétait « Lieu » au-dessus du nom du lieu est supprimé. Le lieu
  reste affiché une fois, dans son encadré. La règle CSS censée masquer ce bandeau ne gagnait pas la
  cascade : c'est l'élément lui-même qui disparaît.
- **Tutoriel réaligné** : le bloc « Comment faire » était en retrait de 10 px, d'où l'effet de
  tabulation. Il devient une bande pleine largeur : titre, objectif, consigne et progression partagent
  le même bord gauche.
- **Objectifs explicites** : chaque étape annonce ce qu'il faut faire, où, et avec quel bouton —
  « Vaincre 5 Pokémon sauvages sur la Route 1. » puis, sur deux lignes, « Fenêtre Carte → clique
  Route 1. » / « Fenêtre Lieu → clique Explorer. » Le nom du lieu, celui de la ligne de capture et le
  taux de capture viennent des données, jamais d'une copie.
- **Le tutoriel ne joue plus à la place du joueur** : plus de téléportation, plus d'ouverture de la
  boutique, du sac, du Pokédex, de la fiche ou du sélecteur de ball. Le bouton **montre** la cible —
  « Afficher Route 1 » quand il faut aller sur la carte, « Afficher Explorer » une fois sur place — la
  met au centre de l'écran et rappelle le halo. Sur mobile il bascule la barre du bas sur la vue qui
  la contient.
- Vérifié en Chromium : les dix étapes en français et en anglais, le basculement des libellés au
  changement de lieu, l'absence de téléportation au clic, la console propre. Détail :
  `docs/PHASE_v1.16.16.md`.

---

## Correctif 1.16.15 — le tutoriel dit exactement quoi faire

- **Le halo de l'étape Poké Ball entoure la ball de la ligne « Nouveau »**, la seule qu'on puisse
  remplir en début de partie. Il n'entoure plus l'engrenage : le tutoriel ne demande **pas** d'ouvrir
  les réglages de filtres, et ne le propose plus nulle part (texte, halo, bouton d'action).
- **Le texte dit quelle ball activer** : « Fenêtre Poké Balls → clique la ball grise de la ligne
  « Nouveau » et choisis-en une. » L'étape suivante précise que c'est **cette** ball qui partira au
  combat. Le nom de la ligne vient des données du filtre, il ne peut pas se désynchroniser.
- **Le bouton d'action ouvre le sélecteur de ball** (le même que la cellule), plus l'éditeur de
  réglages.
- **Les dix étapes sont réécrites**, même registre : un titre court, une règle, un chemin exact, une
  action. L'étape « fiche Pokémon » envoie sur la carte (le bouton ⓘ n'existe que sur tactile), les
  jetons de donjon disent d'où ils viennent, le donjon nomme le lieu, le bouton et les touches.
- **Plus de consigne répétée sur ordinateur** : l'indication « mobile / PC » ne s'affiche que là où
  elle apprend quelque chose (la fenêtre Lieu dans la barre du bas, sur téléphone).
- **Récompenses annoncées corrigées** : l'étape « sac » annonçait « +2 Potions » alors qu'elle donne
  5 Poké Balls ; le symbole monétaire est `₽` partout.
- Le guide précise en plus **comment** changer la ball d'une ligne (il décrivait la priorité des
  filtres sans jamais dire comment en affecter une).
- Détail, causes et vérifications : `docs/PHASE_v1.16.15.md`.

---

## Correctif 1.16.13 — les évolutions comme dans la référence

- Une évolution **ne transforme plus** le Pokémon : il garde son espèce, son niveau, son talent et
  ses capacités, et **l'espèce évoluée arrive dans le PC au niveau 1** (Pokédex « capturé », statut
  chromatique hérité, une seule production par Pokémon et par cible).
- **Niveaux corrigés** : Kadabra, Machopeur, Gravalanch et Spectrum évoluent **au niveau 40** comme
  dans le `main` (la Pierre Lien n'était pas le bon chemin).
- Branches multiples (Wurmple, Nincada) et évolution conditionnelle (Tyrogue, comparaison d'IV)
  fonctionnent enfin : les données existaient, rien ne les lisait.
- Tous les chemins sont couverts : combat, pension, Bonbon Rare, entraînement. Le chargement d'une
  sauvegarde ne réécrit plus silencieusement la collection.
- Fiche Pokémon : la ligne d'évolution affiche « (déjà obtenue) » quand l'individu a déjà produit
  cette espèce ; le sac ne propose plus une cible impossible.
- Détail complet, tests et limites : `docs/PHASE_v1.16.13.md`. Suite Node **850/0**, Chromium **7/7**.

---

## Refonte 1.16.11 — plus de fichier fourre-tout, et les P1 d'ergonomie

### L'arborescence CSS

| Dossier | Feuilles | Rôle |
|---|---:|---|
| `core/` | 8 | jetons, variables, thèmes, remises à zéro, contrôles de formulaire, animations |
| `layout/` | 5 | squelette de page, barre supérieure, colonnes, chrome des fenêtres, mobile |
| `components/` | 30 | un widget par feuille (`ui-button.css`, `ui-modal.css`, `badges.css`…) |
| `panels/` | 39 | une feuille par fenêtre de jeu |

**Depuis la 1.16.14, `design-system/` n'existe plus** : les 23 passes datées ont été redistribuées
dans la feuille de l'objet qu'elles habillaient. Une feuille = un objet, jamais une date.

`index.html` ne charge plus que `assets/css/style.css` : 82 `@import`, **aucune règle**. Aucun
`@import` imbriqué, aucun doublon, aucune feuille orpheline — un test le vérifie à chaque exécution.
Détail complet et preuves : `docs/PHASE_v1.16.11.md`.

### P1 d'ergonomie traités

| P1 | Avant | Après |
|---|---|---|
| Titres de section | 9 classes, 9 tailles, 3 couleurs, bordures différentes | `pw-section-title` + `is-lg` / `is-sm` — une seule définition |
| États vides | 16 classes (`pw-empty-state-md`, `battle-summary-empty`, `pw-empty-center`…) | `pw-empty-state` + `is-lg` / `is-sm` |
| Icônes d'objets | 5 tailles (40, 42, 46, 48, 52, 56, 64, 72 px) | 3 jetons : 40 / 52 / 72 px |
| Typographie | 89 déclarations ≤ 10 px, jusqu'à 9 px | plancher 11 px ; 10 px réservé aux pastilles |

Chaque point est verrouillé par un test (`tests/StyleVocabulary.test.js` + `tests/CssStructure.test.js`)
et vérifié dans Chromium (`npm run test:browser:release11611`).

### Ce qui n'est pas fait dans cette livraison

Les P1 3.1 « boutons » (22 variantes locales à ramener à 5) et 3.5 « recherche texte » (5 fenêtres
sur 12) restent ouverts : ils demandent une passe fenêtre par fenêtre avec captures, et je ne les ai
pas commencés plutôt que de laisser deux vocabulaires cohabiter à moitié.

---

## Correctif 1.16.10 — la fatigue fonctionne, les fenêtres répondent au clavier

### La fatigue de combat ne se déclenchait jamais

Signalement : « système de fatigue en combat qui ne fonctionne pas en combat ». C'était exact, et pour
deux raisons cumulées :

1. le bloc de fatigue comparait `session.playerKOs` au seuil de 50, alors que `playerKOs` compte les
   **KO du joueur** (ses propres Pokémon mis au tapis) et repart de zéro à chaque nouvelle session :
   dans une chaîne de combats sauvages, il ne pouvait jamais approcher 50 ;
2. la victime active était touchée **deux fois** (baisse directe puis `takeDamage`), l'usure de la ligne
   active était doublée.

La règle appliquée est celle que la documentation promettait (« 50 combats consécutifs sans repos ») :
le compteur est le nombre de **victoires de la chaîne en cours**, l'usure commence au 50ᵉ combat, monte
d'un pas de 1 % des PV max tous les 5 combats, plafonne à 10 %, touche toute l'équipe et est **divisée
par deux** par le talent `stamina`. Terminer la chaîne soigne l'équipe et remet le compteur à zéro :
aucun changement de sauvegarde, rien de nouveau à migrer. Les règles sont isolées dans
`src/config/FatigueRules.js` (pures, testées) et appliquées par `BattleSystem._applyFatigue()`.

### Le Pokémon de la carte : plus de rond noir, à la taille du cadre

Le disque sombre du design system est masqué sur la carte uniquement, et l'image occupe le cadre
(72 px dans un cadre de 74 px), comme dans le `main`. Mesuré dans Chromium sur l'aperçu des réglages
**et** sur le menu des sauvegardes. Aucune autre fenêtre ne change.

### Fenêtres modales : Échap, focus, fond inerte

Un seul module (`src/ui/ModalFocusScope.js`) porte le contrat pour les **deux** familles de fenêtres
(`UIModal` et `UIFullscreenPanel`) : Échap ferme la fenêtre du dessus et seulement elle, Tab boucle à
l'intérieur, le focus va au premier contrôle puis revient au déclencheur, et le fond passe en `inert`.
Les composants imbriqués qui utilisent Échap (menu contextuel, glisser-déposer, déplacement de fenêtre)
le consomment explicitement : un Échap ne ferme jamais deux couches.

### Audits rejouables

- `npm run audit:i18n` — l'outil exigeait une description rédigée pour les 518 objets (200 faux
  positifs) ; il applique la vraie règle et a révélé **36 objets réellement sans description**
  (plaques, engrais, pelles, flûtes, permis, outils), désormais décrits en FR et EN. Résultat : 0.
- `npm run audit:contrast` — le générateur cité par les commentaires CSS n'existait pas ; il est
  reconstruit, relit lui-même la feuille de style (7 palettes) et mesure **147 paires, 0 sous AA**.
- Trouvaille au passage : 5 règles utilisaient des jetons inexistants (`--pw-shadow-lg`, `--bg-card`,
  `--border`) — les fenêtres modales n'avaient donc aucune ombre. Corrigé.

## Correctif 1.16.4 — plus aucune espèce avec « un seul talent »

Signalement : certains Pokémon n'avaient qu'un seul talent. La cause n'était pas le moteur mais la
donnée d'origine : 135 espèces de Hoenn et de Sinnoh avaient un pool de 3 entrées, souvent le même
talent écrit deux fois, avec le talent caché en troisième (`treecko: [overgrow, overgrow, unburden]`).
Comme le talent caché est retiré du tirage, il ne restait qu'**un** candidat.

- **Le pool est une règle, pas une liste** : tous les talents dont l'affinité couvre les types de
  l'espèce, plus ses talents signature. La règle est dans `tools/data/talent-pools.mjs`, appliquée par
  le générateur (`gen-species.mjs`) et rejouable sur la table déjà générée
  (`apply-talent-pools.mjs --check`).
- **Résultat** : les 386 espèces ont désormais **15 à 34 talents** (minimum exigé : 10). Arcko passe de
  3 entrées à 24 talents distincts ; Kanto et Johto sont inchangés au caractère près.
- **Effets visibles** : le tirage 60 / 30 / 10 redevient réel, le sélecteur de talents d'un Pokémon
  possédé liste tout le pool (23 options pour un Arcko au lieu d'une), le Pokédex n'affiche plus deux
  fois le même talent et ne répète plus le talent caché, la collection de talents peut enfin progresser.
- **Garde-fous** : `PokemonRules.MIN_TALENT_POOL = 10`, refus par `PokemonDB.validate()`, pool
  dédoublonné à la construction, 16 tests dédiés + 5 vérifications Chromium.
- **Attaques auditées, rien à corriger** : pools de montée de niveau, valeurs des 419 capacités et types
  des 386 espèces sont identiques à la référence ; 0 capacité inconnue dans les équipes de dresseurs,
  0 espèce sans attaque de son type.
- Aucune sauvegarde invalidée (les talents sont enregistrés par identifiant).

Détail : `docs/PHASE_v1.16.4.md`.
---

## Correctif 1.16.5 — entraînement : prérequis Ligue et vrai système de vagues

Deux signalements, deux causes distinctes, corrigées à la racine.

**1. « Le jeu considère que je n'ai pas les prérequis alors que j'ai battu la Ligue. »**
Les modes Talents et Talent caché testaient `save.player.hasBadge('champion')`. Or le jeu n'écrit
**jamais** ce badge : la victoire de Ligue est enregistrée dans `statistics.leaguesWon` et la migration
`V11ToV12` retire les identifiants de Ligue de `player.badges`. Le prérequis était donc impossible à
satisfaire sur toutes les sauvegardes. Le test lit maintenant la victoire réelle
(`hasWonLeague('kanto'|'johto')`, puis `leaguesWon`, puis le titre de champion, et enfin le badge pour
les sauvegardes anciennes qui le portent encore).

**2. « L'entraînement ne fait toujours que 6 Pokémon. »**
C'était exact : le `main` avait été copié tel quel (six identifiants par type, niveau du stagiaire ±1)
et la Rework n'avait réécrit que l'emballage. Le pool du `main` est **supprimé** (deux fichiers retirés
du dépôt). Un nouveau module, `TrainingOpponents`, tire **30 vagues** dans le **rang** du Pokémon
entraîné (E → D → C → B → A → S), sans légendaire, sans doublon, jamais l'espèce du stagiaire, avec des
niveaux de 60 % à 120 % du sien. Le personnel d'entraînement retire jusqu'à 6 vagues (30 → 24, plancher
6) et une session dispose de 30 minutes de combat simulé.

**Récompenses et défaite (décisions validées)** : une récompense toutes les **6 vagues** gagnées (5 au
maximum), et une **défaite arrête la session** en conservant les récompenses déjà acquises.

**Interface** : la carte de combat en direct affiche `Round n/30`, le résultat liste jusqu'à trois
récompenses puis « (+n autres) », en FR comme en EN.

**Mesuré, sans enjolivement** : Caterpie, Magicarpe et Pikachu sont battus avant 20 vagues (2 à 3
récompenses par session), Dracaufeu termine 1 session sur 4, et Mewtwo tombe à la première vague parce
qu'aucune de ses attaques spéciales ne touche Tyranocif et qu'il n'a pas d'attaque physique dans son set
d'entraînement. Le système demandé est en place ; ces chiffres relèvent de la phase d'équilibrage, qui
reste ouverte.

Détail : `docs/PHASE_v1.16.5.md`.
---

## Correctif 1.16.6 — le debug « Vitesse x10 » pilote aussi l'entraînement

Le bouton ne changeait rien pour l'entraînement : mesuré, 2,00 s de combat simulé et 1 vague gagnée
à x1 comme à x10. La valeur vivait dans un champ privé de `BattleSystem` et n'était appliquée que dans
la boucle des combats, alors qu'une session d'entraînement a sa propre boucle. Le `main`, lui, faisait
`dt = 100 * battle.speed` dans `updateTrainingSlots()` : l'attente du joueur est bien le comportement
d'origine.

- **Un propriétaire neutre** : `src/core/DebugTimeScale.js` détient le multiplicateur (borné 1-10),
  lu par la boucle de combat, la boucle d'entraînement et le bouton de debug. Plus d'état dupliqué
  dans `BattleSystem`.
- **Effet mesuré** : 20 images de 0,1 s donnent 2,00 s et 1 vague à x1, contre **20,00 s et 7 vagues**
  à x10. Dans Chromium, 700 ms réelles donnent 0,70 s à 1x et **7,00 s à x10**.
- **Le plafond de session suit** : 30 minutes de combat simulé se consomment en 3 minutes réelles à x10.
- **Le rattrapage AFK ne suit pas** : une absence reste rejouée en secondes réelles, x10 allumé ou non,
  pour que le rapport hors-ligne ne mente jamais.
- **Volontairement non accélérés** : pension, énergie de la mine, rattrapage AFK (horloges réelles,
  comme dans le `main`).

Détail : `docs/PHASE_v1.16.6.md`.
---

## Correctif 1.16.9 — un Pokémon sur les cartes de sauvegarde, choisi dans la boîte PC

La carte affichait le premier Pokémon de l'équipe, **sauf** si le joueur avait choisi un portrait de
dresseur dans les réglages : ce portrait de PNJ l'emportait alors sur tout, alors que le jeu d'origine
met toujours un Pokémon **possédé** sur la carte.

- **La carte n'affiche plus qu'un Pokémon possédé** : `SaveCard.resolveAvatarPokemon()` suit une règle
  unique (le choix du joueur → le premier de l'équipe → le premier possédé → le « ? » explicite du jeu
  d'origine). Aucune image de PNJ ne peut plus apparaître, et il n'y a jamais de disque vide.
- **Le choix se fait dans les réglages**, champ « Pokémon de la carte » : un sprite, son nom, et un
  bouton qui ouvre la fenêtre de sélection. Celle-ci liste **tous les Pokémon possédés** (équipe
  d'abord, puis boîte PC par numéro de Pokédex), avec **recherche**, compteur, niveau et choix courant
  marqué. La grille défile, le champ de recherche reste visible.
- **Rien n'est écrit avant « Appliquer »** : le choix vit dans un brouillon, comme le nom et le fond.
- **Format de sauvegarde** : `player.avatarPokemonUid` (schéma **21**). La migration 20 → 21 fait
  conserver à chaque sauvegarde **le Pokémon qu'elle affiche déjà** — aucune carte ne change d'apparence
  au chargement.
- **Nettoyage** : le sélecteur de portraits de PNJ, sa liste de sprites (`TrainerAvatars.js`) et ses
  11 libellés sont supprimés. L'apparence du dresseur **sur la carte** (`trainerSprite`) reste dans la
  sauvegarde : elle pilote toujours l'avatar sur la carte et dans la base secrète, elle n'est simplement
  plus un réglage — comme dans le `main`.
- **Corrigé au passage** : la liste des Pokémon capturés était recopiée dans le résumé de combat et
  dans l'AFK ; elle est désormais produite par un composant unique, avec un test qui exige un HTML
  identique dans les deux fenêtres.

Vérifié : 789 tests unitaires, 0 échec ; nouvelle suite navigateur `test:browser:portrait` **9/9** en
Chromium réel (choix depuis la boîte PC, recherche sans perte de focus, grande collection qui défile,
application persistée, carte du menu correcte après rechargement, aucune image de PNJ).

Détail : `docs/PHASE_v1.16.9.md`. Audit des pistes suivantes : `docs/AUDIT_v1.16.9.md`.

---

## Correctif 1.16.8 — les objets du résumé de combat et de l'AFK à la bonne taille

Les deux fenêtres affichaient les objets à **la taille native du fichier image** : 30 px pour un Bonbon
Rare, **371 px pour une Master Ball**. La cause n'était pas une taille dans une feuille de style mais
**deux implémentations parallèles** de la même liste, qui construisaient leur `<img>` à la main avec une
classe (`battle-summary-item-icon`) qu'aucun CSS ne style — et qui ne passaient donc pas par le
composant d'item du jeu.

- **Un seul composant partagé** (`LootItemList`) sert désormais les deux fenêtres : sprite d'item
  canonique (`UIItemSprite`) dans le cadre rond 72 px de la fenêtre lieu (`.pw-grid-media`). Un test
  vérifie que les deux fenêtres produisent un HTML identique : elles ne peuvent plus diverger.
- **Nom et quantité empilés** à côté du disque (nouvelle carte `.loot-item-entry`), le cadre ne peut
  plus être comprimé.
- **Aucune autre fenêtre touchée** : sac (40 px), marché (42), dictionnaire (42/48), utilisation d'objet
  (52), bandeau de butin (≈42) gardent leur taille compacte, comme convenu.

Vérifié en navigateur réel : la fenêtre lieu (72 × 72) est la référence, le résumé du combat et le
rapport AFK rendent **exactement** les mêmes 72 × 72 avec les mêmes objets, y compris ceux dont l'image
fait 371 px ; en anglais (noms plus longs) les cadres restent à 72 px et rien ne sort de la fenêtre.
776 tests unitaires, 0 échec ; nouvelle suite navigateur `test:browser:items` 8/8 ; `PanelFit` 7/7,
`LanguageSwitch` 8/8, `AfkCatchUp` 4/4.

Détail : `docs/PHASE_v1.16.8.md`.

---

## Correctif 1.16.7 — les Rôdeurs ne s'affichent plus nulle part

Le système est bien débranché (`RoamingRules.ROAMING_ENABLED: false`), mais le drapeau était recopié
chez les appelants : deux s'en souvenaient, trois l'oubliaient. Résultat, la carte peignait encore la
**zone violette** sur les routes qui hébergent un rôdeur dans la fenêtre UTC courante (12 rôdeurs
placés au moment du correctif), la légende de la carte proposait toujours la ligne violette et le
Pokédex listait « Rôdeur : Route X » comme source d'obtention d'Artikodin, Électhor, Sulfura…

- **Un seul point de contrôle** : `RoamingSystem.isEnabled()` applique le drapeau à l'intérieur du
  système. `getSpeciesAt()`, `getRouteForSpecies()` et l'horloge de rotation ne renvoient plus rien
  quand c'est désactivé ; la rotation déterministe reste disponible pour les règles et les tests
  (`getAssignedSpecies()`).
- **Gardes dupliquées supprimées** dans le panneau de lieu et dans le combat : c'est leur duplication
  qui avait laissé le trou.
- **Légende et Pokédex** : plus de ligne violette, plus aucune source « rôdeur ».
- **Styles et données conservés** : rebrancher la fonctionnalité reste une ligne à changer.

Vérifié : 768 tests unitaires, 0 échec ; en navigateur réel, **0 nœud violet** sur 50, 5 lignes de
légende sans violet, aucune carte de rôdeur dans le panneau de lieu, et 12 affectations de règle dans
la fenêtre courante dont **0 exposée** au jeu.

Détail : `docs/PHASE_v1.16.7.md`.




---

## Refonte 1.16.3 — l'AFK ne simule plus que ce qui a été lancé

L'ancien rattrapage hors ligne inventait des combats sauvages même quand rien n'était en cours
(mesuré : 77 combats et +760 ₽ par heure d'onglet masqué, répétable à l'infini), payait argent, butin et
niveaux de pension hors du règlement réel, soignait gratuitement l'équipe au retour et appliquait une
usure de fatigue inventée. Il est réécrit :

- **Ne rejoue que ce que tu as lancé** : le combat en cours se termine (même combat, mêmes attaques
  automatiques, mêmes règles), la session d'entraînement avance jusqu'à sa vraie fin, une expédition de
  donjon en pilotage auto continue, une relance auto achetée s'enchaîne. Rien d'autre.
- **Aucun combat inventé, aucun gain offert** : tout passe par le règlement réel (expérience, argent,
  objets, captures, quêtes). Plus de soin gratuit, plus d'usure de fatigue inventée.
- **Rien du tout s'il n'y a rien en cours** : aucune simulation, aucune récompense, aucune fenêtre.
- **Plafond de 12 h** d'absence simulées ; le rapport l'indique quand il coupe.
- **Fonctionne aussi après un rechargement complet** du jeu : l'absence est mesurée depuis la dernière
  écriture de la sauvegarde (aucune migration de format nécessaire).
- Le **rapport d'activité hors-ligne** retrouve la présentation du jeu d'origine : phase de progression
  (barre + pourcentage), puis bilan avec pastille d'état, la **grille de statistiques partagée** du résumé
  de combat (Durée, Combats, Argent, Pokémon K.O., Captures, Énergie mine, Entraînement, Minages auto,
  puis garderie/donjon quand ils comptent), les sections **Pokémon capturés** (sprite, shiny, compteur) et
  **Objets trouvés**, et les notes de donjon.
- **Chiffres corrigés** : les combats comptaient les *séries* et non les Pokémon vaincus (d'où le 0 alors
  que des Pokémon tombaient) ; le K.O. de l'équipe, les minages automatiques et le donjon n'étaient pas
  comptés du tout. Tout vient maintenant d'un événement réel.
- **Mine** : l'automate d'excavation est rejoué comme les autres activités (énergie régénérée par sa
  propre règle).
- **Coût assumé** : un enchaînement de combat continu sur 12 h demande quelques minutes de calcul (le
  vrai moteur tourne), découpées pour que la fenêtre de progression reste fluide.
- **Bouton de debug « AFK +30 min » réparé** : il écrivait dans un champ inexistant, ajoutait +30
  d'énergie en dur, passait 30 minutes dans un seul tick d'entraînement et annonçait « +10 min ». Il passe
  désormais par le vrai rattrapage et affiche son rapport.

> **Numérotation** : les trois livraisons précédentes étaient des correctifs. Elles sont renommées
> **1.16.1**, **1.16.2** et **1.16.3** (documents `docs/PHASE_v1.16.1.md`, `…1.16.2.md`, `…1.16.3.md`).
> La livraison 1.16.4 est la correction des pools de talents (`docs/PHASE_v1.16.4.md`).

Détail : `docs/PHASE_v1.16.3.md`.

## Correctif 1.16.2 — mise en page du panneau Lieu

Les encadrés, textes et grilles du panneau **Lieu** débordaient du cadre sur les lieux à sanctuaire
(Ruines Désert, Pilier Céleste, Île Mirage…). Cause : une carte dont le contenu minimal (332 px) imposait
sa largeur à toute la colonne du panneau. Corrigé en CSS uniquement : la colonne ne peut plus dépasser le
panneau et la carte se replie (le bouton passe sous son texte quand la place manque). Même famille de
bug corrigée dans l'en-tête des cartes d'équipe. Nouveau garde-fou `npm run test:browser:fit`
(9 largeurs × 12 lieux × toutes les fenêtres) — il échoue sur l'ancienne version, passe sur celle-ci.
Détail : `docs/PHASE_v1.16.2.md`.

## Ce que contient cette version

### Localisation dynamique (phase 1.16.1)

- Un texte affiché n'est plus figé : il transporte sa **clé** jusqu'au composant, qui le re-résout
  quand la langue change. Une fenêtre ouverte se traduit **sur place**, sans fermeture ni perte d'état.
- API unique et centralisée : `t()` / `tOr()` / `has()` / `compose()` / `join()` / `` lt`…` ``.
- Les descriptions d'objets sont **dérivées des données** quand elles n'existent pas encore :
  plus de clé brute, plus de champ vide.
- Plus aucun texte traduit n'est écrit dans une sauvegarde (le libellé « Location » de l'Atoll était
  gravé dans la sauvegarde, c'est corrigé).
- Garde-fous automatiques : 9 règles statiques bloquantes + 10 scénarios de bascule + un test navigateur
  réel de 8 scénarios.

### Contenu

- **9 249 clés** en français et en anglais, parité stricte (mêmes clés, mêmes `{placeholders}`).
- 386 Pokémon, 518 objets, 726 descriptions de capacités, 764 clés de quêtes, 40 succès.
- Descriptions d'objets : 329 rédigées, 189 dérivées à l'affichage (jamais de clé brute).

### Corrections au passage

- `src/main.js` appelait une méthode inexistante (`BattleSystem.stopBattle`) : erreur console à chaque
  onglet masqué pendant un combat. Corrigé.
- Deux tests navigateur devenus faux après des changements d'équilibrage ont été corrigés (total d'objets
  du dictionnaire, plafond d'EV affiché).

---

## État des tests

| Suite | Résultat |
|---|---|
| `npm test` (876 tests unitaires/intégration) | ✅ 876 réussis, 0 échec |
| `test/browser/Release11612.mjs` (1.16.12, relu en 1.16.15 à 1.16.18) | ✅ 10/10 (colonnes Poké Balls alignées, halo sur la ball « Nouveau », carte d'équipe, donjon clavier) |
| `test/browser/MobileTouch.mjs` (nouveau, 1.16.19) | ✅ 14/14 (iPhone 13 émulé, gestes tactiles réels : appui long, balayage, panneaux, tailles) |
| `npm run test:browser:release11611` (1.16.11) | ✅ 9/9 (arborescence, vocabulaire, thèmes, mobile) |
| `npm run audit:contrast` (1.16.10, relu sur le nouveau bundle) | ✅ 147 paires, 0 sous AA |
| `npm run audit:i18n` | ✅ 0 clé manquante |
| `npm run test:browser:release11610` (1.16.10) | ✅ 7/7 (carte, clavier, fatigue réelle) |
| `npm run test:browser:portrait` (1.16.9) | ✅ 9/9 |
| `npm run test:browser:items` (1.16.8) | ✅ 8/8 |
| `npm run test:browser:fit`, `language`, `afk` | ✅ 7/7, 8/8, 4/4 |
| `npm run test:browser:roaming` (1.16.7) | ✅ 5/5 |
| `npm run test:browser:training` (1.16.5) | ✅ 6/6 |
| `npm run test:browser:talents` (1.16.4) | ✅ 5/5 |
| `test:browser:feedback`, `automation`, `interaction`, `visual`, `backdrop` | ❌ échecs **antérieurs** à cette version (`interaction` et `feedback` revérifiés par `git stash` en 1.16.10 : identiques avant/après) |
| `test:browser` (facilities) | ❌ échec **antérieur** : la tuile « Location » n'ouvre pas la fiche Pokédex attendue |

Les tests navigateur nécessitent Playwright (`npm i -D playwright` puis `npx playwright install chromium`).

---

## Ce qui reste ouvert

- **Un combat sauvage interrompu par une fermeture complète du navigateur n'est pas repris** : le
  snapshot de session de combat n'est pas persisté (l'entraînement et les donjons, eux, le sont déjà).
  Au rechargement il n'y a plus de combat en cours, donc rien n'est rejoué — rien n'est inventé non plus.
  Persister ce snapshot demande une migration de sauvegarde et un chemin de restauration : à décider.
- **200 descriptions d'objets** restent dérivées des données au lieu d'être rédigées (elles existent
  toutes et sont correctes, mais génériques) ; priorité aux 55 Méga-Gemmes.
- **Fatigue** : le modèle du `main` est différent (drain par tour). Celui appliqué ici est celui que la
  documentation promettait ; changer de modèle reste une décision ouverte.
- **P1 3.1 « boutons »** : 22 variantes locales à ramener à 5 (primaire / secondaire / danger /
  fantôme / icône). Non commencé, pour ne pas laisser deux vocabulaires cohabiter à moitié.
- **P1 3.5 « recherche texte »** : présente dans 5 fenêtres sur 12 ; à ajouter là où une liste dépasse
  ~30 entrées (marché en premier).
- **CSS** : la réorganisation est terminée (1.16.14) — 82 feuilles, un objet par fichier, plus aucune
  passe datée, aucun commentaire français, 455 règles mortes supprimées. Le rendu a été comparé à la
  1.16.13 sur 43 écrans (187 559 éléments) : 0 sélecteur modifié. Détail : `docs/PHASE_v1.16.14.md`.
- **`!important`** : 3 806 occurrences, plafonnées par un test. L'augmentation par rapport à 2 698 est
  mécanique : une règle partagée par plusieurs objets est désormais copiée dans chaque feuille
  propriétaire, aucune déclaration n'a été ajoutée. Le budget doit redescendre à chaque fenêtre
  retouchée.
- Une suite navigateur reste rouge et **l'échec est antérieur** : `MarketAndResponsiveTraining`
  échoue à l'assertion « 2 Poké Balls achetées » (vérifié sur un export propre de `a8042ac`, échec
  identique) — rien à voir avec cette livraison, mais il faut le corriger.
- Une relecture éditoriale anglaise reste souhaitable sur quelques tournures.
- Les 5 suites navigateur citées plus haut restent rouges (pré-existant, inchangé).

## Reprise de l'équilibrage (phase 1.16.1)

La localisation est **stable** : le travail d'équilibrage peut reprendre. Objectifs rappelés :
capturabilité de tous les Pokémon, pension/XP, progression jusqu'au niveau 100, IV, Arènes et Ligue,
changement de région, légendaires, fin de jeu, Atoll de Combat, bugs de combat et de capacités.

Détail complet de la phase : `docs/PHASE_v1.16.1.md`. Règles de code : `Rules.md`.
