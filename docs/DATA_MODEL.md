# Data model (v1.14)

How the Rework stores, loads, validates and saves its data. The current package release is **1.14.25** and
`SaveSchema.VERSION` is **20**; those are separate version numbers. League titles are stored as
regional entries in `statistics.leaguesWon`, never as Gym badge IDs. Each owned Pokémon also stores
`unlockedMoves`, `favorite` and `locked`; the latter two are PC collection metadata, not battle rules.
This document replaces the recommendations of `docs/DATA_REVIEW.md` (v1.3), which are now implemented
except where noted in its status table.

---

## 1. Two kinds of data

| | Static definitions | Per-save state |
|---|---|---|
| What | Species, forms, talents, moves, items, locations, encounters, quests | Player, wallet, Pokédex, team, PC box, team presets, inventory, quest/tutor progress, statistics, dungeons, hatchery, mine, secret base |
| Where | `src/data/raw/*-data.js` → repositories | `SaveData` and its models (`src/data/save/`) |
| Written by | Generators in `tools/data/` only | `SaveSystem` only |
| Mutable | Never (deep frozen) | Through model methods that dispatch change events |
| Text | None: names and descriptions are localization keys derived from the id | None either |

A per-save model only stores **ids and facts** (`species: 'pikachu'`, `exp: 1382`); every value
that can be derived (stats, max HP, level from experience, caught count…) is recomputed from the
definitions.

---

## 2. Static data pipeline

```
orig/src (original game)                      node tools/data/build-all.mjs ../orig
   ├─ gen-species.mjs   → species-data.js, forms-data.js
   ├─ gen-talents.mjs   → talents-data.js        (+ talent-effects.mjs transcription)
   ├─ gen-moves.mjs     → moves-data.js          (+ move-effects.mjs transcription)
   ├─ gen-items.mjs     → items-data.js          (balls: `ball { rate, sprite, condition, bonus, scaling, order }`)
   ├─ gen-balls.mjs     → ball-filter-presets-data.js (the 5 base Poké Ball filters)
   ├─ gen-world.mjs     → locations-data.js, map-layout-data.js, encounters-data.js
   ├─ gen-quests.mjs    → quests-data.js
   ├─ LocaleSync.mjs    → localization keys of names / descriptions (fr + en)
   └─ build-all.mjs     → docs/DATA_COVERAGE.md, docs/BATTLE_VOCABULARY.md
```

- Generated files say so in their header and are never edited by hand: fix the generator or its
  transcription file, then rebuild.
- Ids are lowercase, stable slugs: `charmander`, `vulpix` + form `alola`, `ember`, `pokeball`,
  `route1`, quests `main.12` / `side.leg_latias_2` / `repeatable.r3`.
- `docs/DATA_COVERAGE.md` lists what could not be transcribed (talents without effects, moves whose
  description has no implementation, quest reward items unknown to the original…).

### Repositories (read-only singletons)

| Repository | Source | Main API |
|---|---|---|
| `PokemonDB` | species + forms | `getById`, `has`, `getForm`, evolutions, learnsets (`MoveLearnset`) |
| `TalentDB` | talents | `getById`, `effectsOf(id, kind)` |
| `MoveDB` | moves | `getById`, `hasTag`; fields `type, category, power, accuracy, priority, hits, cooldown, tags, effects` |
| `ItemDB` | items | `getById`, `getAll`, `getBalls` (original order), `getBallRate`; `kind` (`ItemKinds`), held `effect { kind, power }`, ball `ball { … }` |
| `LocationDB` | locations, layout, encounters | `getById`, `getEncounters` |
| `QuestDB` | quests | `getById`, `getByCategory`, `getMainChain(region)`, `getMainQuest(region, step)` |
| `TypeChart` | constant table | `effectiveness(attackType, defenderTypes)`, `normalize` |

All of them extend `DataRepository` (indexed map, deep freeze, `validate()`).
`DataValidator.validateAll()` cross-checks every reference (types, talents, evolutions, encounter
species, quest items / species / locations, effect kinds, condition keys); the test suite requires
an empty problem list.

### Vocabularies

Frozen enums shared by the generators, the validator and the engine:
`ItemKinds`, `HeldEffectKinds`, `MoveEffectKinds`, `TalentEffectKinds`, `MoveTags`,
`StatusConditions`, `Weathers` / `Terrains` (`BattleFields`), `QuestCategories`, `ObjectiveTypes`,
`LocationKinds`, `BallConditions`, `EncounterKinds`, `BallFilterOptions`, `QuestCatchKinds`. See `docs/BATTLE_EFFECTS.md` for the battle effects.

---

## 3. Save format (schema 19, package v1.14.20)

```js
{
  version: 19, id: 'PW-…', background, createdAt, updatedAt,
  player:       { trainerName, trainerSprite, region, location, playTimeSeconds, badges: [ids] },
  currencies:   { money, dungeonToken, questPoint, diamond, battlePoint, farmPoint, contestToken,
                  revealed: { <currencyId>: boolean } },
  pokedex:      { <species>: { seen, caught, shiny } },
  collection:   [ PokemonData… ],                    (every owned Pokémon, once; shown by the PC box)
  team:         [ uid… ],                            (active party, ≤ 6 collection uids, lead first)
  inventory:    { <itemId>: quantity },              (Poké Balls included)
  ballFilters:  [ { id, name, options, ball, enabled } ],
  boxFilters:   { region, type, shiny, evo, favorite, locked, iv, ev, rank, forms, search },
  teamPresets:  { activeId, slots: [ { id, name, members: [uids] } ] },
  quests:       { mainStep: { <region>: n }, active: { <key>: { progress } }, completed: [keys],
                  repeatablesCompleted, repeatableUnlocked, repeatableChoices: [ids],
                  repeatableLastRollAt: epochMs, repeatableSlotUpgrades },
  statistics:   { wildWins, capturesByLocation, trainerWins, solvedPuzzles, leaguesWon,
                  caughtTotal, duplicateCatches, purchases, hatcheryLevel, trainingSessions },
  tutorial:     { enabled, completed: [stepIds], rewardsClaimed: [stepIds] },
  dungeons:     { exploredTotal, clears: { <locationId>: n }, run: DungeonRunData|null, lastRun },
  talents:      { <speciesId>: [unlockedTalentIds] },
  staff:        { owned: { <staffId>: { level, xp } }, active: { <sector>: staffId } },
  training:     { maxSlots, queueLevel, slots: [ { pokemonUid, mode, battle, elapsed,
                  autoPurchased, autoEnabled, autoOptions, filters, queue: [uids], result } ] },
  hatchery:     { maxSlots, modes, pendingModes, priorities, queues, queueLevel, filters, autoOptions,
                  autoHatchPurchased, autoHatchEnabled, autoFillPurchased, autoFillEnabled,
                  slots: [null | DaycareSlot | IncubationSlot | FossilSlot] },
  mine:         { energy, maxEnergy, energyLevel, tool, unlockedTools, autoPurchased, autoEnabled,
                  grid, items, completedCount, lastEnergyAt, manualSurveyReadyAt },
  secretBase:   { layoutId, locationId, decorations, stock, npcs, npcStock, spawn, nextUid,
                  record, pcMessage, flags: { count, collectedIds, lastRankNotified } },
  access:       { unlockedLocations: [ids], unlockedFeatures: { <featureId>: true },
                  regionStarters: [regionIds], championTitle }
}
```

`access.regionStarters` stores a sticky per-region choice flag; access refresh and save migrations can
backfill it from a starter species already owned/registered. Regional starter definitions remain static
content in `StarterData.js`. Puzzle definitions are manual, localized static content; only solved puzzle
IDs are stored in `statistics.solvedPuzzles`.

`teamPresets` always contains 20 ordered slots (`preset1`…`preset20`), with a stable `activeId`.
Each slot stores only Pokémon UIDs (maximum six) and an optional custom name; Pokémon remain owned by
the collection, so editing a preset never copies or deletes a Pokémon. `TeamPresetSystem.load()`
resolves those references, skips Pokémon another mode uses (daycare, training…), applies the party
through `TeamSystem.setMembers()` (unselected members simply leave the party and stay in the PC
box), and is disabled during battle.

### Owned Pokémon collection (schema 16)

`collection` is the single owner of per-save Pokémon data (`PokemonCollectionData`, keyed by uid).
Every other domain references it by uid: the party (`TeamMembersData`), daycare slots
(`{ kind: 'daycare', pokemonUid, knockouts }`), incubation, training assignments/queues and team presets. A Pokémon therefore stays the same
object wherever it is used, and the **PC box shows the whole collection** (party, daycare, training
included) without duplicates. Loading repairs dangling references: an unknown party uid is dropped, a
daycare Pokémon cannot also be in the party, and a daycare slot pointing to no owned Pokémon is
emptied. A newly obtained Pokémon whose generated uid collides with an owned one receives a fresh uid.

Where a Pokémon is used is answered by `PokemonUsageSystem`:

| Usage (`PokemonUsageIds`) | Source |
|---|---|
| `team` | persisted: `save.team` uids |
| `daycare` | persisted: hatchery daycare/incubation slots and Pokémon queues |
| `training` | persisted: training assignment and queue UIDs, even while idle |

Future modes claim/release their own session usage the same way. `config/PokemonUsageRules.js` maps
each action (`PokemonActionIds`) to the usages that lock it (`lockedBy`) or that it requires
(`requires`); `PokemonActionRules.lockFor()` evaluates them:

| Action | Rule |
|---|---|
| `learnMove` | locked by daycare, training (and globally during a battle) |
| `changeHeldItem` | requires team; locked for the active training combatant |
| `useItem` | locked by daycare; locked for the active training combatant |
| `joinTeam` | locked by team, daycare, training |
| `depositDaycare` / `train` | locked by daycare, training |

Favorite / lock flags are always editable. Generic PC selections carry the requested action
(`selectionAction`), so the team selector only offers Pokémon allowed to join the team; the
Pokémon sheet shows the current location and disables locked actions with their reason.
`SpeciesOwnership` reads the whole collection, so daycare Pokémon now count as owned.

The `hatchery` model persists UID-based daycare/Pokémon incubation, fossil progress, queue order and automation settings. The `mine` model stores
the current grid, tool, exposed-loot shapes and energy timestamp. The `secretBase` model stores the
player's Hoenn room, placed decorations, decoration stock, NPC battle snapshots, visit record, PC
message and flag-collection history; derived rank and distinct-base counts are not stored separately.
The `dungeons` model stores an active,
resumable floor map, carried loot and the last-run summary. At runtime, every battle summary has a
unique `runId`; a terminal dungeon settlement is attached only to the summary from the exact battle
that settled it, so later battles cannot inherit an older `lastRun`. The correlation is intentionally
session-local, not an additional persisted save field. Tutorial completion and reward-claim flags are
separate so one-time rewards cannot be duplicated.

- `PokemonData`: stats and max HP come from `StatCalculator` (base stats, level, IVs / EVs, shiny
  ×1.2); the level is derived from the total experience (`ExperienceCurve`). New Pokémon are built
  by `PokemonFactory.create(species, level, options)` only. `unlockedMoves` persists the CT/CS
  unlocks separately from the active `moves` slots; `favorite` and `locked` are collection flags.
  `MoveLearningSystem` equips a learnable move through `TeamSystem` or `BoxSystem`, after which
  battle uses the stored active slots.
- `ItemUseSystem` owns supported bag effects without DOM access: CT/CS unlocks, Rare Candy, the six
  Kanto vitamins (+1 random EV within the configured caps), and item-based evolutions. Each valid
  use and each move-slot change is one save operation; invalid uses consume nothing. `ItemTargetModal`
  and `PokemonMoveLearningModal` provide the localized UI.
- `InventoryData` ignores unknown item ids. Granted items go through `grantItem()`
  (`systems/inventory/ItemGrant.js`): `ItemStacking` caps held / categorized items at 25 copies and
  pays the overflow in money (10 % of the price), as the original `grantRewardItem`.
- `CurrenciesData` follows `CurrencyDefinitions` (start amounts, visibility). Quest rewards are
  paid in `questPoint` (the original `rewardMoney`).
- `access` stores sticky progression facts: locations, facilities already acquired, regional starters
  and a champion milestone. `regionStarters` is not the region-unlock rule; the accessible-region
  list is derived from the original league + full regional Pokédex conditions and published in the
  `FeatureAccessSystem` snapshot.
- `BoxFiltersData` persists the PC's region, type, shiny, missing-evolution, favorite, locked, IV, EV,
  rank (E–SS) and form filters plus search. `BoxFilterRules` applies these presentation filters to the PC;
  the UI sort order is not a gameplay or Pokémon-data field. Mutations use the save model and one
  save operation per change.
- `PokedexPanel` derives seen/caught/shiny totals and regional completion from the existing Pokédex
  and accessible-region facts. Its search and filters are view state only; opening or filtering it
  does not change or extend the save schema.

### Loading and writing

- `SaveData.deserialize(json)` first runs `SaveMigrator.migrate(json)`, then each model reads the
  current shape only.
- Migrations are pure functions with a test fixture each:
  - `MigrationOriginalToV1`: export of the original game (`{ G: … }`): team, Pokédex, money,
    position, badges, plus the established secret base (`G.base`) and ORAS flag progress
    (`G.secretBaseFlags`), with NPC roster species converted from dex numbers to stable slugs;
    also carries original species talent unlocks and recruited staff level/XP/activation;
  - `MigrationV1ToV2`: version field, Pokédex entries, derived caught count;
  - `MigrationV2ToV3`: PokemonData v2, badge ids, inventory, quests (`convertQuests`), statistics;
  - `MigrationV3ToV4`: original `pokeballs.counts` join the inventory, `pokeballs.filters` become
    `ballFilters` (`customName` → `name`), empty `box`; a save without any ball gets the starting
    balls (10 Poké Balls).
  - `MigrationV4ToV5`: adds 20 team preset slots and migrates both current-shaped data and original
    `G.teamPresets.presetN = { name, uids }` / `G.activePresetId` references.
  - `MigrationV5ToV6`: persists progressive currency visibility and captures by location.
  - `MigrationV6ToV7`: stores tutorial completion and one-time reward flags; legacy saves without
    tutorial state are not enrolled retroactively.
  - `MigrationV7ToV8`: adds dungeon expedition state, maps, loot and clear counters.
  - `MigrationV8ToV9`: adds hatchery slots, mine state and training-session statistics.
  - `MigrationV9ToV10`: preserves explicit access and previously reached content; infers sticky
    hatchery/mine/training access from durable save evidence, while never unlocking a never-used
    feature merely because the old UI showed its panel. Original export facts are forwarded by
    `MigrationOriginalToV1`.
  - `MigrationV10ToV11`: adds and backfills repeatable-board unlocks, persisted offers, cooldown and
    slot upgrades without reopening an unused board.
  - `MigrationV11ToV12`: removes known League IDs from `player.badges`, rebuilds regional League
    titles from statistics, legacy badges and trainer wins, and repairs facility unlocks when the
    save contains durable evidence (saved gate flags, reached locations, facility progress or
    required Gym badges). Unknown forward-compatible badge IDs remain untouched.
  - `MigrationV12ToV13`: moves legacy per-Pokémon `trainingUnlockedMoves` into `unlockedMoves`
    for the team and PC, removes the legacy field, deduplicates non-empty string ids, and keeps the
    active move slots unchanged. It preserves ids that are not recognized by the current move table
    rather than silently deleting forward-compatible data. `MigrationOriginalToV1` also carries this
    legacy list through the full migration chain.
  - `MigrationV13ToV14`: adds saved PC filter settings and normalizes `favorite` / `locked` flags for
    Pokémon in the party, box and hatchery. Legacy `fav` migrates to `favorite`; battle stats and
    active move slots are not changed.
  - `MigrationV14ToV15`: adds the secret-base save domain to existing Rework saves without unlocking
    it; original exports separately preserve their base and flag state through `MigrationOriginalToV1`.
  - `MigrationV15ToV16`: merges `team`, `box` and daycare `slot.pokemon` (or legacy `slot.poke`) into
    one `collection`; `team` becomes a uid list and daycare slots store `pokemonUid`; `box` is removed.
    A Pokémon without uid or with an already used uid receives a deterministic `p_v16_<n>` uid, so no
    Pokémon is lost or duplicated.
  - `MigrationV16ToV17`: adds empty training/staff models and facility automation fields, default
    mine tools and a validated species talent ledger backfilled from equipped talents. Collection UIDs,
    party references and existing facility progress remain canonical. No prior battle DTO is fabricated.
  - `MigrationV17ToV18`: adds normalized per-slot hatchery/training filters without touching collection
    UIDs, assignments, FIFO entries or existing battle DTOs. Old hatchery sorting uses explicit `legacy`;
    an old single training option becomes that mode, and multi-option order stays `configured`.
    Malformed empty slots and unbounded hatchery slot counts are normalized safely.
  - `MigrationV18ToV19`: adds `mine.manualSurveyReadyAt`, default zero (first manual survey ready).
    Existing boards, treasure collection, energy, all UID references, filters, FIFO and battle DTOs
    remain untouched. There is no league repair in this migration.
- `SaveSystem` is the only writer: **one write per operation** (`saveCurrent()` after a battle,
  a quest claim, a travel…), through `SaveStorage` → `LocalStore`.

### Facility state and exact training resume (schema 18)

`TrainingData` stores assignments and queue UIDs, not owned Pokémon copies. Cancel stops a battle;
only explicit slot/queue removal releases the reservation. `TrainingSystem` creates independent
`BattleSession` runtimes from these records and updates their JSON DTOs on ticks. `SaveSystem` writes
on a 5-second checkpoint, outgoing save switch and browser hide/unload requests (`SaveLifecycle`),
with duplicate lifecycle flushes suppressed. Unloaded battles do not progress offline.

`BattleSessionState` captures a versioned, bounded DTO: owned team UIDs, NPC Pokémon records,
active/reserve order, HP/status, stat modifiers and turns, entry-trigger markers, history,
weather/terrain (permanent weather encoded explicitly), cooldown clocks, elapsed time and seeded RNG
state. `BattleSnapshotValidator` checks version, scalar bounds, collections, known identifiers and
UID references **before** constructing any combatants or mutating owned HP. Restoration rebinds owned
combatants to the canonical collection, never reruns `start()`/entry effects, and restores callbacks.
An invalid/incompatible DTO is discarded, its automation paused and assignment retained. This is
Rework-to-Rework resume; original-runtime battle snapshots are not translated.

`TalentUnlockData` stores only species-appropriate normal/hidden talent IDs. Equipping is a separate
command checked by `PokemonTalentSystem` and central action locks; hidden talent remains passive.
Training rolls the full normal pool, including confirmations; a result records whether it was new.
Original imports preserve `G.unlockedTalents` (numeric species IDs translated to slugs) and `G.staff`
(owned/level/XP/active normalized to known staff, one active per sector). Original Pokémon incubation, training assignments,
automation/queues and combat DTOs still lack complete translation and must not be described as a
lossless legacy-facility import.

Staff effective formulas live in rules/systems, not views. Advertised legacy bonuses that the reference
never applies are disclosed without inventing effects. Legacy staff prices labelled PC use the existing
`questPoint` currency. Johto quest 111 unlocks Pokémon incubation **when reached**, and only genuine
collection dispatches its hatch objective. A deposit/readiness event never credits the hatch.

### Slot-local automation filters (schema 18)

`FacilityFilterData` holds only normalized selector facts. Hatchery fields are `filterShiny`,
`filterIv`, `filterFav`, `filterRegion`, `filterRank`, `filterType`, `sort`; training uses `mode`,
`filterShiny`, `filterEv`, `filterFav`, `filterRegion`, `filterRank`, `filterType`, `sort`.
IV/EV completeness means a total of 36; filter rank S+ means IV total >= 24, **not** species rank.
Regions follow the reference national dex ranges. Central usage/action locks still exclude unavailable
Pokémon, including locked ones; a filter never grants a bypass.

`FacilityCandidateRules` is shared by manual queue generation and empty-queue automatic selection.
Existing FIFO entries are never re-filtered. Hatchery generation can target one slot, without touching
another slot's queue. Training `all` mode resolves talent, hidden, move, EV, level in that order,
skipping locked or ineligible modes. Single/configured/all choices survive serialization. Migrated
hatchery `legacy` sorting and training `configured` priorities keep their old behavior and expose their
compatibility controls only when selected. The main admission fee remains conditional on auto-hatch;
auto-fill alone does not introduce a new fee.

Changing an idle training assignment is atomic through the shared PC chooser. Cancelling leaves the
old reservation intact; a running battle cannot be replaced. The Mine's explicit new-survey command
requires UI confirmation before discarding an unfinished board, grants no hidden loot, and does not
change energy; the default system command remains safe on an active layer.

### Central content access (schema 15)

`FeatureAccessSystem` is the single DOM-free resolver for world reachability and the Pension, Mine,
Training and Secret Base gates. `ContentAccessRules` declares exceptional map gates; generated location
connections, regional badge counts and win requirements remain in `LocationDB`. Gameplay commands
ask the resolver before changing state, so a panel cannot grant itself access or repeat its own
version of the rule.

The resolver persists newly earned facts in `ContentAccessData`, then publishes one immutable
`ContentAccessChangedEvent` snapshot (`features`, `locations`, `regions`, starter facts and champion
milestone). The Secret Base, Pension, Mine and Training panels (and their mobile tabs) are hidden
entirely until their confirmed prerequisite is reached; their actions remain system-gated as well.
Other gated panels may show a localized requirement. The dashboard does not duplicate domain rules.
The hatchery, mine and training systems query the resolver before every state-changing action.

For the header denominator, `regions` follows the original rule: Kanto is open by default; Johto
requires the Kanto League plus the complete Kanto Pokédex; Hoenn requires the Johto League plus the
complete Johto Pokédex. Thus the denominator is eight badges per accessible region, and updates on
Pokédex changes. This calculation is deliberately distinct from the `regionStarters` acquisition
facts.

`MigrationV9ToV10` keeps access that was already recorded and carries forward evidence of use from
older saves (unlocked locations/features, daycare/mine progress, training sessions and starters).
`MigrationV11ToV12` repairs the later schema from persisted unlock flags and durable location,
facility or badge evidence. A player whose save never reached a gated feature stays gated. System
and migration tests cover acquired and not-yet-acquired cases; dashboard tests verify that the
Secret Base, Pension, Mine and Training remain absent until unlocked.

---

## 4. Quests

- **Definition** (`QuestDB`, frozen): `{ key, category, id, region, location, objective { type, count,
  … }, rewards { questPoints, currencies, items, pokemon }, chain, requires, encounter, locked }`.
  Reward UI is generated from these reward fields rather than a parallel hard-coded reward sentence.
- **Progress** (`QuestProgressData`, per save): active quests with their progress, main step per
  region, completed side quests, repeatable counter, unlock flag, persisted offer ids, last-roll
  timestamp and purchased slot upgrades.
- **Objective classes**: one class per `ObjectiveTypes` value in `data/quests/objectives/`, each
  declaring the events it listens to (`static EVENTS`) and how an event advances the progress
  (`KillObjective` ← `PokemonDefeatedEvent`, `CatchObjective` ← `PokemonCaughtEvent`,
  `BossObjective` ← trainer victory, `MineDigObjective` ← mining event…). `ObjectiveRegistry` maps
  type → class.
- **QuestSystem** subscribes to every event of the registry, routes each event to the active
  quests whose objective accepts it, saves once per handled event, and dispatches
  `QuestProgressedEvent` / `QuestCompletedEvent`. `claim(key)` pays the rewards
  (quest points, items through `grantItem`, gift Pokémon) and advances the chain. A quest whose
  reward Pokémon must be met dispatches `QuestEncounterRequestedEvent`; `BattleSystem` runs the
  encounter and claims again with `{ encounterWon: true }` once the Pokémon is caught.
- **Repeatable board**: the system persists three offer ids, their last-roll timestamp, the unlock
  fact and zero to four purchased slot upgrades. Offers are filtered by the player's region; r30–r38
  are explicitly Johto-only, including the otherwise unlocated catch/mining contracts. The board
  rejects acceptance when locked or full, rerolls for free every ten minutes, and charges the
  configured Pokédollar cost in the system. Capacity grows from one to five active contracts.
- **NPC dialogue and unlock**: `LocaleCatalog` loads each location's localized NPC names and lines;
  `NpcDirectory` supplies stable identities and `NpcTalkModal` lets the player select an individual
  person. `NpcTalkedEvent` carries both `locationId` and an optional `npcId`; a new save unlocks the
  board only for `cerulean` + `swimmer-ondee` (Nageuse Ondée / Swimmer Ondée). Legacy migrations
  still preserve an existing unlock or recognized repeatable progress.
- **Migration from original saves** maps accepted `G.repeatables` instances to
  `repeatable.<templateId>` keys in `active`, preserving progress, completed state and location
  baselines against `wildWinsByLoc`. It also migrates `repeatableChoices`, `repeatableLastRollAt`,
  `repeatableSlotUpgrades` (or the legacy capacity), and the original unlock flag/backfills. The
  v10→v11 migration adds defaults to Rework saves and infers prior access from active/completed
  contracts, saved offers, purchased slots, badges or Johto progression; brand-new saves remain
  locked until the target NPC is selected.

Adding an objective type: add the value to `ObjectiveTypes`, write the class, register it, emit
the event from the system that owns the action. No other file changes.

---

## 5. Battle data

The engine (`src/systems/battle/`) reads moves, talents and held items only through their
declarative effects. Details, formulas and deviations: `docs/BATTLE_EFFECTS.md`; generated list of
the vocabulary with real examples: `docs/BATTLE_VOCABULARY.md`.

---

## 5bis. Catch and Poké Balls (v1.5)

Port of the original `economy/pokeballs.js` + `attemptAutoCatch()`.

| Piece | Role |
|---|---|
| `ItemDB` ball entries | Base rate, sprite, special condition + bonus, scaling flag, display order; hidden balls are listed once owned |
| `data/catch/BallFilterPresets` | The 5 locked base filters: roaming, new shiny, caught shiny, new, caught (ball "none" on a new save) |
| `data/save/BallFilterData` / `BallFiltersData` | Per-save filters; base filters keep their options from the presets (never saved), missing ones are re-added at their place |
| `systems/catch/CatchEncounter` | Frozen facts of the encounter: Pokémon, owned, shiny owned, location kind, weather, foe turns, player attacks; derived `encounterKind` (roaming / dungeon / route) |
| `BallFilterMatcher` | A filter matches when every option it declares matches the encounter |
| `BallSelector` | First enabled matching filter wins. Ball set but none owned → no throw. "None" on a base filter → next filter; "None" on a custom filter → no throw |
| `BallRateRules` | `rate + scaling + condition bonus`, Master Ball 100, cap 100 (`BallRules`) |
| `CatchRules` | Quest multiplier (legendary ×2, gift 100), roll (first catch guaranteed), weighted talent (60/30/12), +1 IV chance (10 %, cap 12) |
| `SpeciesOwnership` | Owned / shiny-unlocked checks over the whole collection (team first) |
| `PokeballSystem` | The only writer of the filters: `setBall`, `toggleEnabled`, `reorder`, `create`, `reset`; custom filters only: `remove`, `rename`, `setToggle`, `setValue`, `addValue`. One save write + `BallFiltersChangedEvent` per command |
| `CatchSystem` | The whole catch: ball, roll, Pokédex, statistics, shiny unlock, new Pokémon (level `CaptureRules.CAUGHT_LEVEL`, Luxury Ball +`LUXURY_LEVEL_BONUS`) to the team, or only to the PC collection when the team is full, duplicate (not kept, IV chance on the owned one), dungeon tokens, `PokemonCaughtEvent` |
| `BoxSystem` | Owner of the collection (`addPokemon`, `updatePokemon`, `BoxChangedEvent`) |

The species never changes the rate, and owning the species or being in a quest never changes the
ball: only the filters decide.

UI: `PokeballsPanel` (filters, ball, quantity of the chosen ball), `BallFilterEditorModal`
(rows `BallFilterEditorRow` + `BallFilterToggleRow` / `BallFilterValueRow`, drag & drop through
`UISortableList`) and `BallPickerModal` (ball list with `BallDescription`), styled by
`assets/css/pokeball-filters.css`.

---

## 6. Events produced by the data layer

| Event | Emitted by | Consumed by |
|---|---|---|
| `SaveCreatedEvent`, `SaveLoadedEvent` | `SaveSystem` | QuestSystem, panels, FeatureAccessSystem |
| `NpcTalkedEvent` | `LocationSystem` | QuestSystem; `npcId` distinguishes a selected NPC from generic talk |
| `ContentAccessChangedEvent` | `FeatureAccessSystem` | DashboardView, HeaderPanel, access-sensitive shortcuts |
| `CurrencyChangedEvent`, `InventoryChangedEvent`, `TeamChangedEvent` | save models / TeamSystem | panels, objectives |
| `PokemonDefeatedEvent` | `BattleSystem` | quest objectives |
| `PokemonCaughtEvent` | `CatchSystem` | quest objectives |
| `PokedexChangedEvent` | `PokedexData` | Pokédex panels, LocationPanel, FeatureAccessSystem |
| `BallFiltersChangedEvent` | `PokeballSystem` | Poké Ball panel and editor |
| `TeamPresetsChangedEvent` | `TeamPresetSystem` | preset manager |
| `BoxChangedEvent` | `BoxSystem` | PC box, Pokémon sheet, team preset manager |
| `PokemonUsageChangedEvent` | `PokemonUsageSystem` / `TeamSystem` / `HatcherySystem` | PC box, Pokémon sheet, move-learning modal |
| `BattleStartedEvent`, `BattleStateChangedEvent`, `BattleAttackEvent`, `BattleEndedEvent` | `BattleSystem` | battle and team panels |
| `QuestProgressedEvent`, `QuestCompletedEvent`, `QuestClaimedEvent`, `QuestEncounterRequestedEvent` | `QuestSystem` | StoryPanel, BattleSystem |
| `DungeonEnteredEvent`, `DungeonRunChangedEvent`, `DungeonBattleResolvedEvent` | `DungeonSystem` / `BattleSystem` | TutorialSystem, expedition panel |
| `HatcheryChangedEvent`, `HatcheryLevelUpEvent` | `HatcherySystem` | hatchery panel, quest objectives |
| `MineChangedEvent`, `MineDugEvent`, `MineItemSoldEvent` | `MineSystem` / `SaleSystem` | mine panel, quest objectives |
| `TrainingSessionCompletedEvent` | `TrainingSystem` | quest objectives |
| `TutorialProgressChangedEvent` | `TutorialSystem` | tutorial card |
| `LocationChangedEvent` | `LocationSystem` | map, battle scene, QuestSystem, facility panels |

Models mutate their state **before** dispatching, so a listener always reads the new state.


### Manual Mine survey clock and preset editing (schema 19)

`manualSurveyReadyAt` is an absolute millisecond deadline, written only after a successful manual
`startNextLayer`. The system enforces `MineRules.MANUAL_SURVEY_COOLDOWN_MS` (600,000 ms), including
confirmed discards, reloads and save switches. Lazy initialization and automatic renewal after genuine
loot completion neither set nor reset the deadline. View polling reads the wall clock and never writes
or regenerates a board. The disabled button keeps a dedicated clock skin because the original stylesheet
intentionally hides disabled `.hbtn` controls. Existing image/dropdown defaults remain unchanged.

`TeamPresetEditSystem` owns a transient UID-only draft and an opaque, save-bound PC selection request.
It stores no Pokémon copies and adds no persisted preset shape. Cancellation discards only that draft.
`TeamPresetSystem.applyMembers` validates before changing either the preset or the party, then performs
one canonical team transaction and one save. `TeamPresetsPanel` is a `UIFullscreenPanel`; the separate
`TeamPresetEditorModal` composes full `PokemonCardView`s, shared PC/item/info selectors and `UISortableList`.
Boxed resting HP is a presentation option, never an owned-HP mutation. Whole-card pointer holds and
handles share coordinate-based targeting; both axes are used for multi-column editors.

`SecretBaseSystem.getLocationAlcovesSnapshot` exposes existing access, route layouts and ownership
facts. `LocationAlcoves` renders its own stable bottom section and uses the existing visit, establish
and relocate commands. First settlement is direct; relocation requires confirmation. Unrelated KO
refreshes do not detach the section or its confirmation, and save/route changes invalidate stale UI.

## 1.14.21 addition — live relaunch and pilot preferences (schema 20)

`SaveData.relaunch` is a `RelaunchData` model. It stores `wild` / `dungeon` module ownership and
activation, plus the remembered dungeon mode (`farm`, `boss`, `chest`). A module is not an inventory
item. `DungeonRunData.auto` accepts a validated mode string or `false` (`true` from an older Rework
save becomes `farm`). Countdown deadlines, planned targets and UI state are transient.

`MigrationV19ToV20` adds normalized preferences without changing collections, reservations, queues,
training battle DTOs or Mine clocks. Original imports recover explicit legacy automation ownership
and preferences through `LegacyRelaunchMigration`; this does not import the original runtime's
battle snapshots or offline simulation engine.

Natural wild-chain defeat and natural dungeon finish have distinct typed events. Manual Quit,
abandonment and climbing out do not arm relaunch. Each new dungeon run pays the canonical toll.
A cancelled countdown does not revoke ownership or the saved activation preference.

The optional tutorial kit under `docs/examples/auroria/` demonstrates an additional `fieldJournal`
model in a separate **1.14.26-demo / schema 21 copy**. It is not part of production SaveData. See
[the French A–Z guide](GUIDE_CREATION_REGION_A_Z.md) for content, access, systems and migration.


## 1.14.22 addition — regional market, no save-shape change (schema 20)

Market offers derive from `MarketRules`, the region, actual encounter tables, evolutions and real
collection ownership. The access flag in `FeatureAccessSystem` snapshots is transient and derived;
no market flag, duplicate collection or redundant purchase count is stored in `SaveData`.

`ShopSystem.buyMarket` prepares the complete batch before payment, uses canonical `TeamSystem` /
`BoxSystem` acquisition, and saves once. Only the first newly owned species may auto-join a free
party slot; additional copies remain independent collection entries. All party entries remain UID
references. Purchases mark the Pokédex and unlock drawn talents/shininess but do not publish a wild
capture or hatch event. The typed completion event is `MarketPurchaseCompletedEvent`.

`TeamChangedEvent` and `BoxChangedEvent` accept `deferSave` metadata for a larger acquisition
transaction, so state-based objectives can update before its one final write. Default callers retain
the previous behavior. The market preserves valid training DTOs, queues, reservations and Mine clocks.
The explicitly approved Johto policy filters the unchanged Rework encounter tables (six offers),
rather than removing nine existing wild species to reproduce the main runtime's fifteen offers.


## 1.14.23 — interaction and legacy compatibility, schema 20 unchanged

Whole-card dragging is a transient pointer gesture. The original row and collection object remain
owned once; a CSS-variable-driven placeholder/motion never serializes or mutates the roster until
`TeamSystem.swapMembers` commits one UID exchange. Cancellation, save changes and clicks below the
movement threshold do not write. Combat UI switching resolves the visible party UID to the in-flight
combatant; reordering the party does not recreate the battle or reset its HP/RNG/clocks.

The original-main import recognizes explicit ownership maps, positive paid receipts, true/1 flags,
owned-id lists and structured purchased/owned receipts. Explicit disabled preferences stay disabled.
Missing or negative data never grants either module. All conversion remains before model reading;
no new persisted field or schema change is introduced. A source export without purchase evidence
cannot be repaired by inventing a purchase. The minimal Auto switch is a view of ownership, not its
source of truth, and remains available in the applicable live battle/dungeon context.


## 1.14.24 — named location context and cosmetic flights, schema 20 unchanged

`LocationActivityRules` selects one activity from the location kind and wild/roaming availability.
Dungeon wins over a wild pool; towns have no ordinary exploration; a roaming-only outdoor site is
explorable. Both Location actions and relaunch presentation read this resolver. Per-module ownership,
preferences and prices are unchanged. Toggle captions are localized names, not duplicated headings.

Background flights are transient UI-only reservations. Caught/shiny species still derive from the
active save's Pokedex; no decorative state is serialized. A separate `SeededRandom` instance seeded
from the cosmetic clock does not draw from `Random.default` or the battle RNG. Pure flight rules
choose fully offscreen edge endpoints, staggered start times, bounded speed/density and analytical
minimum peer distance over their shared lifetime. CSS owns transform/opacity interpolation. A quiet
poll recycles a bounded node pool; resize, save changes, reduced motion, visibility and page exit
reset outside the viewport, without an offline gameplay simulation or a save write.


## 1.14.25 — native Dictionary reimplementation, schema 20 unchanged

`DictionaryCatalog` provides pure, read-only queries for items, moves, talents and their detail modals.
Progressive item discovery is governed by `ItemGenerationRules`, filtering items by unlocked regional
generation (Kanto=1, Johto=2, Hoenn=3; Gen 4+ hidden). Hidden items require owned inventory. Move user
counts dynamically inspect `save.collection.getAll()`. Move learners are categorized by level pool,
TM/HM compatibility, and training pool. Ability carriers and hidden carriers are extracted from
species definitions.

The UI is pure composition: `DictionaryPanel` extends `UIFullscreenPanel` (`ModalIds.DICTIONARY`),
and `DictionaryDetailModal` extends `StaticModalPanel` (`ModalIds.DICTIONARY_DETAIL`). No game data or
save schemas are mutated.
