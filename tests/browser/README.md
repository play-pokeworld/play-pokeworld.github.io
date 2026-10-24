# Optional Chromium acceptance suite

This is developer tooling, not a runtime dependency. The game and `npm test` require no npm packages.
The release was checked with Node.js **20.20.2** and Playwright **1.64.1**; use Node.js 20+ for this suite.

## Reproduce

From the project root, install the browser test tooling without changing the manifests:

```sh
npm install --no-save --package-lock=false playwright@1.64.1
npx playwright install chromium
```

On Linux, missing system libraries may additionally require `npx playwright install-deps chromium`.
This may need administrator privileges; the regular game does not.

In one terminal:

```sh
npm start
```

In a second terminal:

```sh
npm run test:browser
npm run test:browser:visual
```

Optional environment variables:

- `PW_URL`: game origin, default `http://127.0.0.1:3000/`.
- `PW_BROWSER_OUTPUT`: artifact directory, default `artifacts/browser-facilities` under the current
  working directory. Do not point this at a source directory: named test artifacts are overwritten.
- `PLAYWRIGHT_MODULE`: ESM module specifier, default `playwright`. An external installation can be
  supplied as an absolute **file URL**, e.g. `file:///path/to/node_modules/playwright/index.mjs`.

Example POSIX invocation with separately installed Playwright:

```sh
PW_URL=http://127.0.0.1:3000/ PLAYWRIGHT_MODULE=file:///path/to/node_modules/playwright/index.mjs npm run test:browser
```

In PowerShell, set environment variables with `$env:PW_URL='http://127.0.0.1:3000/'` before running
`npm run test:browser`.

## What it proves — and does not

The **17 scenarios** use real Chromium DOM, normal clicks, real widgets/events and public domain
commands. No forced click is used. They check remote facility visibility, Location → Pokédex,
PC selections/cancellation, upgrades/staff quest-point fees, FIFO/subwindow stacking, live training,
exact reload/save-switch/reservation, genuine Johto 111 hatching/claim, fossil queue/manual-start,
all 9 management tabs at 1024/768/375 px, and English page reconstruction.

Progression, balances, owned Pokémon and a level-100 wild-battle leader are **explicit fixtures**.
Training engine ticks are paused to compare the exact same battle DTO across reloads; its session,
widgets, commands and DOM are real, and deterministic advancing/resume is tested by `npm test`.
Johto incubation uses a real seeded `BattleSystem` wild chain with capture filters disabled. The
BATTLE notification channel is temporarily muted during that accelerated chain and restored in
`finally`; its summary is closed through the normal close button. No deposit/readiness event is
substituted for hatching. Quest claiming calls the real `QuestSystem.claim` command.

`results.json` records assertions, responsive geometry and collected unexpected browser diagnostics.
Failure artifacts are removed before a new run. Screenshots are evidence, **not** pixel-difference
comparisons with `main`. All tabs are measured for bounds, horizontal overflow and vertical scrolling;
this is not every mobile action, a touchscreen-device run, a complete Kanto playthrough, an all-theme
review, or a Firefox/WebKit/Windows validation. Switching language is checked after rebuilding the game
page, not as a guarantee that every pre-existing widget hot-translates without reconstruction.


## Visual and per-slot filter suite (1.14.19)

`npm run test:browser:visual` adds **9 real Chromium scenarios**. It checks three body management
rows and five training modes; all 9 management tabs at the reference 980×760 desktop size; all 15
48×48 staff portraits, genuine currencies/Pokémon/loot sprites; native filter focus and option-node
identity during KO events; slot filter persistence and all-mode priority after reload; cancellation
and atomic assignment replacement; five distinct purchased tools, exact energy costs and actual
loot uncovering; lossless survey cancellation and explicit board replacement; 768/375 px layouts.

Default artifacts: `artifacts/facility-visual`; `PW_BROWSER_OUTPUT` overrides this. Old failure
artifacts are removed before each run. Its fixtures explicitly grant progression/currencies and
pause autonomous training/hatchery ticks; tested commands, widgets and mining are real. This is
not a natural campaign or an automatic pixel-difference comparison. Rendered original references
and a self-contained comparison viewer ship in `docs/validation/v1.14.19/`.

Only small critical facility media opt into eager loading; shared images remain lazy by default.
Slot selects opt into a native skin so the common dropdown's branded CSS cannot flatten their
reference appearance. Neither option changes the default widgets used by the accepted Pokédex.


## Feedback corrections suite (1.14.20)

Run `npm run test:browser:feedback` for **17 additional scenarios**. Artifacts default to
`artifacts/feedback-corrections` and can use the same `PW_URL`, `PLAYWRIGHT_MODULE` and
`PW_BROWSER_OUTPUT` variables. The final release runs all three suites: **17 + 9 + 17 = 43**.
Run them **sequentially** in memory-constrained environments; concurrent Chromium runs can crash
one renderer before it produces an artifact. The retained release runs completed successfully.

The suite performs real 400 ms whole-card mouse holds and drops, two-axis preset reordering,
native name typing during roster refresh, all 20 manager cards, six normal PC picks, cancellation,
replacement, information/item subwindows, explicit composition saving/applying and reusable slot six.
It checks all 15 poor-wallet helper prices, the actual Mine composition, survey cancellation,
a visible disabled countdown, direct system refusal, persisted reload/save-switch and expiry/restart.
Base alcove visits, first installation, own-base entry and confirmed relocation use real commands.
A typed defeated-foe event probes control retention; it is not presented as a naturally won battle.
The manual clock is advanced using Playwright's wall-clock control, not a ten-minute human wait.
Widths 768/375 px check the manager, editor, Mine clock and alcoves. Explicit progression, wallet,
team and PC fixtures are not a campaign playthrough, physical-touch or all-theme certification.

## Live relaunch suite (1.14.21)

```sh
npm run test:browser:automation
```

Uses the same separate Playwright installation and `PLAYWRIGHT_MODULE` / `PW_URL` /
`PW_BROWSER_OUTPUT` settings. Run suites sequentially. The production release is checked with
**17 + 9 + 17 + 13 = 56** scenarios. The new 13 cover all visible facility upgrade costs, tallest-card
rows (also mixed ownership/mobile), genuine shop upgrades without quantity/inventory pollution,
confirmation cancellation, natural wild defeat, stable countdown focus/summary closure, save isolation,
third genuine local dungeon clear, pilot modes, real automatic completion and a second paid run,
exhausted entrance tokens and English/mobile controls. These are live seeded fixtures, not an offline
catch-up or natural full-campaign test.

The optional [Auroria kit](../../docs/examples/auroria/README.md) has its own four browser checks
in an installed **schema-21 demo copy**, separate from the shipped schema-20 game. Serve that copy
and set `PW_AURORIA_URL` to its actual address before running its `browser-smoke.mjs`.


## Marché et Entraînement adaptatif — 1.14.22

```sh
PLAYWRIGHT_MODULE=playwright npm run test:browser:market
```

`PW_URL` et `PW_BROWSER_OUTPUT` permettent de changer le serveur et le dossier de résultats. Le
runner `MarketAndResponsiveTraining.mjs` exécute **21 scénarios** : accès réel, sélection/quantité,
focus et absence de mutation DOM inutile, achats canoniques, PC, zéro portefeuille, choix de stock
Johto, Morphéo, shiny contrôlé, FR/EN, reload, changement de partie, slots vides/occupés/actifs et
terminés, colonne étroite et conteneur de 210 px. Un achat normal de boutique vérifie le composant
partagé. La progression est explicitement préparée ; les ticks entraînement/checkpoint sont arrêtés
pour les comparaisons, pas les commandes, les écritures explicites ou le moteur de combat.

Les cinq suites de production sont à exécuter **séquentiellement** : 17 + 9 + 17 + 13 + 21 = **77**.
Le kit Auroria est une autre copie et une autre suite (quatre scénarios), jamais une région activée
dans la production. Les images des panneaux très hauts allongent la hauteur de capture pour ne pas
photographier l’en-tête sticky par-dessus ; les contrôles géométriques utilisent leur hauteur normale.


## Interactions équipe / import main / Combat — 1.14.23

```sh
PLAYWRIGHT_MODULE=playwright npm run test:browser:interaction
```

Le runner `InteractionCorrections.mjs` ajoute **18 scénarios** : import JSON par le vrai champ de
fichier, achats main conservés sans débit, geste souris immédiat depuis la carte, suivi visuel,
Échap sans PC parasite, clic simple/droit, scroll de bord, refresh pendant le geste, switch pendant
combat et donjon, réordonnancement sans reset du combat, choix du remplaçant par UID, préférences,
contenu borné à 210 px et mobile 390/320, carte pannable bornée, stockage puis reload réels.
Le JSON est une fixture du format du main, pas une sauvegarde personnelle fournie par l’utilisateur.
Les ticks programmés sont désactivés pour les comparaisons, pas les commandes explicites ni le moteur.

Les six suites de production sont à exécuter séquentiellement : **17 + 9 + 17 + 13 + 21 + 18 = 95**.
Les recettes historiques de hold obligatoire et d’achat dans la barre de relance ont été adaptées
au nouveau contrat (souris immédiate, switch seul). Les assertions de sauvegarde, propriété,
relance naturelle et péage de deuxième run sont conservées. L’image d’un panneau haut peut utiliser
une hauteur de capture allongée ; les contrôles géométriques utilisent les hauteurs annoncées.


## Auto contextuel et fond — 1.14.24

```sh
PLAYWRIGHT_MODULE=playwright npm run test:browser:backdrop
```

`BackdropAndAutoContext.mjs` ajoute **14 scénarios** : noms FR/EN, contexte exclusif route/donjon/
ville, états séparés, contrôle à 210 px, pool d’un grand Dex plafonné, vrais rectangles de départ
hors écran, bords/angles variés, positions CSS et espacement, scroll indépendant, réutilisation des
nœuds, mobile, mouvement réduit et absence de mutation/écriture ou d’avancement d’un combat préparé.
L’horloge cosmétique et les animations CSS sont synchronisées pour des échantillons reproductibles.
Le premier plan est masqué uniquement pour les captures isolées du fond ; aucune règle de production
ne masque le dashboard. Le jeu reste réellement composé des mêmes panneaux.

Les sept suites de production sont à exécuter séquentiellement : **17 + 9 + 17 + 13 + 21 + 18 + 14 = 109**.
Le kit pédagogique est un autre ensemble de quatre scénarios sur sa copie séparée.


## Dictionnaire complet — 1.14.25

```sh
PLAYWRIGHT_MODULE=playwright npm run test:browser:dictionary
```

Le runner `DictionaryParity.mjs` valide **12 scénarios** : ouverture depuis les raccourcis, onglets Objets/Attaques/Talents, découverte progressive Kanto (214 objets), recherche en temps réel, ouverture/fermeture des modales de détail pour chaque catégorie, sources d'objets, apprenants d'attaques, porteurs de talents, mise à jour dynamique en anglais, affichage mobile 390px sans débordement, fermeture propre et chargement sans erreur de toutes les ressources.

Les huit suites de production s'exécutent séquentiellement : **17 + 9 + 17 + 13 + 21 + 18 + 14 + 12 = 121**.


## Sac et fiche d'information Pokémon — 1.14.26

```sh
PLAYWRIGHT_MODULE=playwright npm run test:browser:baginfo
```

Le runner `BagAndPokemonInfoParity.mjs` valide **17 scénarios** complets :
- **Sac (Inventaire)** : ouverture plein écran depuis le raccourci, barre d'onglets de catégories avec compteurs précis, recherche instantanée par nom d'objet et réinitialisation, clic gauche sur objet d'évolution (pierres évolutives) ouvrant la vue d'évolution inline avec cartes de candidats éligibles (prévisualisation de l'évolution, niveau, badge possédé), bouton "Retour au sac" restaurant la vue principale, clic gauche sur trésor ouvrant la vue de vente inline (titre, sous-titre quantité, actions de vente unitaire / totale avec cours en Pokédollars), clic gauche sur objet non utilisable ouvrant la modale de détail Dictionnaire avec bouton "Retour au sac", clic droit contextuel sur tout objet ouvrant la modale de détail Dictionnaire, fermeture propre du Sac.
- **Fiche d'information Pokémon (`PokemonInfoModal`)** : ouverture par clic droit sur carte d'équipe / Pokémon de boîte, bandeau de titre avec nom, ID national, étoile shiny, hero card avec sprite, badges de types, badge de localisation, boutons de protection favori et verrouillage avec mise à jour réactive, panneau latéral d'onglets (Statistiques, IV avec barres colorées et total sur 6, EV avec barres colorées et totaux sur 18/36), grille de sections avec sélecteur de talent et badge de talent caché, panneau de rang avec BST, panneau d'objet tenu avec déclencheur de sélection, panneau des évolutions et méthodes, bloc de capacités avec attaques actuelles (cliquables vers détail Dictionnaire) et attaques apprenables, adaptabilité responsive mobile 390px sans aucun débordement horizontal, et zéro erreur console / réseau.

Les neuf suites de production s'exécutent séquentiellement : **17 + 9 + 17 + 13 + 21 + 18 + 14 + 12 + 17 = 138**.

