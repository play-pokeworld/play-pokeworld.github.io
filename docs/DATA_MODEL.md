# Data model (v1.14)

How the Rework stores, loads, validates and saves its data. The current package release is **1.14.17** and
`SaveSchema.VERSION` is **16**; those are separate version numbers. League titles are stored as
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

## 3. Save format (schema 16, package v1.14.17)

```js
{
  version: 16, id: 'PW-…', background, createdAt, updatedAt,
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
  hatchery:     { maxSlots, slots: [null | DaycareSlot | FossilSlot] },
  mine:         { energy, maxEnergy, tool, grid, items, completedCount, lastEnergyAt },
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
(`{ kind: 'daycare', pokemonUid, knockouts }`) and team presets. A Pokémon therefore stays the same
object wherever it is used, and the **PC box shows the whole collection** (party, daycare, training
included) without duplicates. Loading repairs dangling references: an unknown party uid is dropped, a
daycare Pokémon cannot also be in the party, and a daycare slot pointing to no owned Pokémon is
emptied. A newly obtained Pokémon whose generated uid collides with an owned one receives a fresh uid.

Where a Pokémon is used is answered by `PokemonUsageSystem`:

| Usage (`PokemonUsageIds`) | Source |
|---|---|
| `team` | persisted: `save.team` uids |
| `daycare` | persisted: hatchery daycare slots |
| `training` | session claim by `TrainingSystem` for the trainee (cleared on save change) |

Future modes claim/release their own session usage the same way. `config/PokemonUsageRules.js` maps
each action (`PokemonActionIds`) to the usages that lock it (`lockedBy`) or that it requires
(`requires`); `PokemonActionRules.lockFor()` evaluates them:

| Action | Rule |
|---|---|
| `learnMove` | locked by daycare, training (and globally during a battle) |
| `changeHeldItem` | requires team |
| `useItem` | locked by daycare |
| `joinTeam` | locked by team, daycare, training |
| `depositDaycare` / `train` | locked by daycare, training |

Favorite / lock flags are always editable. Generic PC selections carry the requested action
(`selectionAction`), so the team selector only offers Pokémon allowed to join the team; the
Pokémon sheet shows the current location and disables locked actions with their reason.
`SpeciesOwnership` reads the whole collection, so daycare Pokémon now count as owned.

The `hatchery` model persists daycare Pokémon and fossil incubation progress. The `mine` model stores
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
- `SaveSystem` is the only writer: **one write per operation** (`saveCurrent()` after a battle,
  a quest claim, a travel…), through `SaveStorage` → `LocalStore`.

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
