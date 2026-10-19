# Data model (v1.5)

How the rework stores, loads, validates and saves its data. This document replaces the
recommendations of `docs/DATA_REVIEW.md` (v1.3), which are now implemented except where noted
in its status table.

---

## 1. Two kinds of data

| | Static definitions | Per-save state |
|---|---|---|
| What | Species, forms, talents, moves, items, locations, encounters, quests | Player, wallet, Pokédex, team, inventory, quest progress, statistics |
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

## 3. Save format (schema 4)

```js
{
  version: 4, id: 'PW-…', background, createdAt, updatedAt,
  player:     { trainerName, trainerSprite, region, location, playTimeSeconds, badges: [ids] },
  currencies: { money, dungeonToken, questPoint, diamond, battlePoint, farmPoint, contestToken },
  pokedex:    { <species>: { seen, caught, shiny } },
  team:       [ { uid, species, form, nickname, level, exp, hp, shiny, talent, heldItem,
                  moves: [ids], ivs: {…}, evs: {…} } ],
  box:        [ PokemonData… ]                       (PC box: catches made with a full team)
  inventory:  { <itemId>: quantity },                (Poké Balls included)
  ballFilters:[ { id, name, options { caught?, shiny?, caughtShiny?, type?, encounter? },
                  ball, enabled } ]                  (priority order)
  quests:     { mainStep: { <region>: n }, active: { <key>: { progress } }, completed: [keys],
                repeatablesCompleted },
  statistics: { wildWins: { <location>: n }, trainerWins: { <trainer>: n }, solvedPuzzles: [],
                leaguesWon: [regions], caughtTotal, duplicateCatches: { <species>: n },
                hatcheryLevel }
}
```

- `PokemonData`: stats and max HP come from `StatCalculator` (base stats, level, IVs / EVs, shiny
  ×1.2); the level is derived from the total experience (`ExperienceCurve`). New Pokémon are built
  by `PokemonFactory.create(species, level, options)` only.
- `InventoryData` ignores unknown item ids. Granted items go through `grantItem()`
  (`systems/inventory/ItemGrant.js`): `ItemStacking` caps held / categorized items at 25 copies and
  pays the overflow in money (10 % of the price), as the original `grantRewardItem`.
- `CurrenciesData` follows `CurrencyDefinitions` (start amounts, visibility). Quest rewards are
  paid in `questPoint` (the original `rewardMoney`).

### Loading and writing

- `SaveData.deserialize(json)` first runs `SaveMigrator.migrate(json)`, then each model reads the
  current shape only.
- Migrations are pure functions with a test fixture each:
  - `MigrationOriginalToV1`: export of the original game (`{ G: … }`): team, Pokédex, money,
    position, badges…;
  - `MigrationV1ToV2`: version field, Pokédex entries, derived caught count;
  - `MigrationV2ToV3`: PokemonData v2, badge ids, inventory, quests (`convertQuests`), statistics;
  - `MigrationV3ToV4`: original `pokeballs.counts` join the inventory, `pokeballs.filters` become
    `ballFilters` (`customName` → `name`), empty `box`; a save without any ball gets the starting
    balls (10 Poké Balls).
- `SaveSystem` is the only writer: **one write per operation** (`saveCurrent()` after a battle,
  a quest claim, a travel…), through `SaveStorage` → `LocalStore`.

---

## 4. Quests

- **Definition** (`QuestDB`, frozen): `{ key, category, id, region, location, objective { type, count,
  … }, rewards { questPoints, items, pokemon }, chain, requires, encounter, locked }`.
- **Progress** (`QuestProgressData`, per save): active quests with their progress, main step per
  region, completed side quests, repeatable counter.
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
| `SpeciesOwnership` | Owned / shiny-unlocked checks over team + box |
| `PokeballSystem` | The only writer of the filters: `setBall`, `toggleEnabled`, `reorder`, `create`, `reset`; custom filters only: `remove`, `rename`, `setToggle`, `setValue`, `addValue`. One save write + `BallFiltersChangedEvent` per command |
| `CatchSystem` | The whole catch: ball, roll, Pokédex, statistics, shiny unlock, new Pokémon (level `CaptureRules.CAUGHT_LEVEL`, Luxury Ball +`LUXURY_LEVEL_BONUS`) to the team or the box, duplicate (not kept, IV chance on the owned one), dungeon tokens, `PokemonCaughtEvent` |
| `BoxSystem` | PC box writer (`BoxChangedEvent`) |

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
| `SaveCreatedEvent`, `SaveLoadedEvent` | `SaveSystem` | QuestSystem, panels |
| `CurrencyChangedEvent`, `InventoryChangedEvent`, `TeamChangedEvent` | save models / TeamSystem | panels, objectives |
| `PokemonDefeatedEvent` | `BattleSystem` | quest objectives |
| `PokemonCaughtEvent` | `CatchSystem` | quest objectives |
| `BallFiltersChangedEvent` | `PokeballSystem` | Poké Ball panel and editor |
| `BoxChangedEvent` | `BoxSystem` | (future PC box window) |
| `BattleStartedEvent`, `BattleStateChangedEvent`, `BattleAttackEvent`, `BattleEndedEvent` | `BattleSystem` | battle and team panels |
| `QuestProgressedEvent`, `QuestCompletedEvent`, `QuestClaimedEvent`, `QuestEncounterRequestedEvent` | `QuestSystem` | StoryPanel, BattleSystem |
| `LocationChangedEvent` | `LocationSystem` | map, battle scene, QuestSystem |

Models mutate their state **before** dispatching, so a listener always reads the new state.
