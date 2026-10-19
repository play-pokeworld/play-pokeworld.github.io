# Data management review (v1.3)

> **Status v1.4** — this review is implemented; the resulting model is described in
> [`DATA_MODEL.md`](DATA_MODEL.md) and the battle data in [`BATTLE_EFFECTS.md`](BATTLE_EFFECTS.md).
>
> | Plan step | v1.4 |
> |---|---|
> | 1 Canonical ids | Done (species slugs, `species` + `form`, quest keys `category.id`) |
> | 2 Migration chain + single write | Done (`SaveMigrator`, schema 3, original `G` import) |
> | 3 Quest progress per save | Done (`QuestProgressData`, `QuestSystem`, one class per objective type) |
> | 4 Species generator | Done (`tools/data/gen-species.mjs`), **correction**: the original catch formula ignores the species catch rate, so "real catch rates" are *not* used — the ball rate decides (see BATTLE_EFFECTS.md, Catch). Changing it is a game-design decision, not a data fix |
> | 5 PokemonData v2 | Done (uid, total exp, talent, held item, IVs / EVs, derived stats) |
> | 6 Items | Done (generator, `ItemKinds`, held effects, `InventoryData`, stacking) |
> | 7 Locations split | Done (locations / layout / encounters tables) |
> | 8 Declarative effects + damage formula | Done (battle engine `src/systems/battle/`) |
> | 9 StatisticsData | Done (wild / trainer wins, catches, puzzles, leagues) |
>
> The rest of this document is the original v1.3 analysis, kept for history.

Scope: how the rework stores and loads its game data — species and forms, moves, items, quests,
locations, currencies — and the player saves. Each section gives the current state, what works, the
problems, and the recommended target. A prioritized plan closes the document.

Status legend: ✅ good · ⚠️ needs work · ❌ blocking for the full game integration

---

## 1. Summary

| Area | Status | Main point |
|---|---|---|
| Layering (raw tables → repositories → systems) | ✅ | DOM-free, singletons with indexed maps, localization by id |
| Currencies | ✅ | Frozen definitions + wallet model with events: the pattern to generalize |
| Moves / types (v1.3) | ✅ | Generated table, typed frozen definitions, lowercase ids, tests |
| Species | ❌ | Positional arrays, placeholder values, no forms / evolutions / learnsets, two identity systems |
| Owned Pokémon | ⚠️ | Persists derived values, missing uid / IVs / nature / ability / item / ball |
| Saves | ⚠️ | Versioned since v1.3, but no migration chain, double write, missing domains |
| Items | ⚠️ | Localized text + emoji in raw data, formula strings, untyped records |
| Quests | ❌ | Definition and progress mixed in the same singleton objects; progress is never saved |
| Locations | ⚠️ | Map geometry, encounters and gameplay rules in one record; French names in raw data |

The architecture around the data is sound. The **content model** is not ready: it was inherited from
the original game (itself generated from PokeChill) and still carries its shortcuts. These must be
fixed **before** the pixel-perfect panels are wired to the real game, because every panel will read
them.

---

## 2. What already works (keep it)

- **Layers**: `data/raw/*` (plain tables) → repositories (`PokemonDB`, `MoveDB`, `ItemDB`,
  `LocationDB`, `QuestDB`) → systems → views through events. Nothing in `data/` touches the DOM.
- **Localization by id**: display names come from `pokemon.<id>`, `move.<id>`, `type.<id>`,
  `location.<id>`… The saves store identifiers only (`PokemonData` keeps the species slug, not the
  translated name).
- **Currencies**: `CurrencyDefinitions` (frozen, one entry per currency) + `CurrenciesData` (wallet
  per save, clamps at 0, emits `CurrencyChangedEvent`). Static definition and per-save state are
  separate — exactly the target pattern for everything else.
- **Storage split**: `SaveStorage` (layout, keys, index) is separate from `SaveSystem` (use cases).
- **Moves and types (new in v1.3)**: `tools/gen_moves_data.mjs` regenerates `raw/moves-data.js` from
  the original table, keeping gameplay values only; `MoveDB` exposes frozen definitions;
  `TypeChart` normalizes every type to a lowercase id; tests check that every move has a valid type
  and FR/EN texts. This is the pipeline to reuse for species, forms, items and abilities.
- **Pokédex (new in v1.3)**: `PokedexData` owned by `SaveData`, counts derived, migration from the
  original `G.pokedex`, `SaveSchema.VERSION = 2`.

---

## 3. Species and forms — ❌

**Current state** — `raw/pd-data.js`, 386 rows of positional arrays:
`[name, type1, type2, hp, atk, def, spa, spd, spe, moveset, catchRate, baseExp]`.

Problems:

1. **Placeholder values**: 381 / 386 rows have `catchRate 45` / `baseExp 60`, the generator default.
   Capture odds and experience would be wrong for almost every species.
2. **Empty movesets** everywhere (the move pools are rebuilt from types at runtime, see
   `MoveLearnset`; acceptable as a rule, but then the column should not exist).
3. **Positional arrays**: unreadable, no validation, a missing column silently shifts every value.
4. **Identity depends on display text**: the slug is built from the English name; renaming a
   species (or a translation fix) would break saves and sprite paths.
5. **Two identity systems**: the numeric Pokédex id (raw data, encounter tables, `StarterData.id`)
   and the slug (saves, sprites, `StarterData.species`). `StarterData` stores both, which can drift.
6. **Region from hardcoded id ranges** (≤151 Kanto, ≤251 Johto, else Hoenn) — breaks with forms and
   regional variants.
7. **Missing data**: forms (the original `forms-data.js` uses `${base}-${slot}` keys with kinds
   alt / mega / cosmetic / weather / season), evolutions, abilities, gender ratio, growth rate,
   EV yield, egg groups, hatch steps.
8. Fairy type present in Gen-3 data (a design choice to confirm, not a bug).

**Target**

```js
// raw/species-data.js (generated)
bulbasaur: { dex: 1, region: 'kanto', types: ['grass', 'poison'],
             stats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
             catchRate: 45, baseExp: 64, growth: 'medium_slow', genderRatio: 0.875,
             abilities: ['overgrow'], hiddenAbility: 'chlorophyll',
             evolutions: [{ to: 'ivysaur', level: 16 }] },
// raw/forms-data.js (generated)
'vulpix:alola': { base: 'vulpix', kind: 'regional', types: ['ice'], stats: { … } },
```

- **One canonical key**: the species slug is the id (`bulbasaur`); a form is `species:form`
  (`vulpix:alola`). The Pokédex number becomes a field (`dex`), used for sorting and display only.
  Sprites already follow `<species>_<form>.png`, so `AssetPaths` keeps working.
- `SpeciesDefinition` (frozen) built and **validated at load** (types known, stats are numbers,
  evolution targets exist); a test runs the validation over the whole table.
- Real catch rates / base experience imported by the generator (PokeAPI dump or a fixed source table).

---

## 4. Owned Pokémon (`PokemonData`) — ⚠️

**Current state**: `{ species, form, level, exp, maxExp, hp, maxHp, types, moves, shiny, nickname }`.

Problems:

1. **Derived values persisted**: `maxHp`, `maxExp` and `types` are stored. They can disagree with the
   species data after a balance change, and the level-up formula is arbitrary
   (`maxExp × 1.25`, `maxHp × 1.15 + 2`) instead of the original `calcStat` / `xpForLevel`.
2. **No unique id**: two identical Pokémon cannot be told apart (boxes, trades, held items, quests
   "catch this one" will need it).
3. **Missing individual data**: IVs, EVs, nature, ability, held item, original trainer, caught ball,
   caught location / date, friendship.
4. `moves` is an untyped array (strings or `{id}` objects are both accepted today).

**Target**

```js
{ uid: 'pk_8f3a…', species: 'bulbasaur', form: '', level: 12, exp: 1540,
  ivs: { hp: 21, … }, evs: { … }, nature: 'modest', ability: 'overgrow',
  heldItem: null, ball: 'pokeball', shiny: false, nickname: '',
  moves: ['vine_whip', 'tackle'], hpCurrent: 31,
  origin: { trainerId: 'PW-…', location: 'route1', caughtAt: 1739… } }
```

- Stats, max HP, types and EXP thresholds are **derived** by one `StatCalculator`
  (`statOf(pokemon, 'atk')`, `expForLevel(growth, level)`), ported from the original formulas.
- A `PokemonFactory` creates wild / starter / gift Pokémon (IV roll, nature, ability, moves from
  `MoveLearnset`) — today this logic is spread over `SaveData.createNew` and `BattleSystem`.

---

## 5. Saves — ⚠️

**Current state**: `SaveData { version, id, slotId, background, createdAt, updatedAt, player,
currencies, pokedex, team }`, written by `SaveStorage` under `pokeworld_save_slot_<id>`, plus a full
copy under `pokeworld_save` (active save) and a summary in `pokeworld_saves_v1`.

Problems:

1. **Migration logic is ad hoc**: `deserialize()` mixes reading the current format, the v1.x format
   and the original `G` object with `??` defaults. It works for three formats; it will not scale.
2. **The full save is written twice** (slot + active copy) on every save.
3. **Summary duplicated** in the index (name, badges, caught…) and can drift from the save.
4. `slotId` is stored but recomputed from the index order.
5. **Missing domains**: inventory, PC boxes, quest progress, story flags, statistics (battles won…),
   settings per save if any. `AchievementsPanel` already needs "total battles", which has no storage.
6. **No validation**: corrupted or hand-edited data is silently replaced by defaults;
   `deserialize()` mutates the instance in place.

**Target**

- `SaveMigrations`: an ordered list `[{ from: 0, to: 1, migrate(raw) }, { from: 1, to: 2, … }]`
  applied to the raw JSON **before** deserialization; version 0 = the original `G` object. Each
  migration is a pure function with its own test fixture.
- One write per save: the active save is just `pokeworld_active_save_id`; the summary is recomputed
  when listing (or cached with the save's `updatedAt`).
- `SaveData` composes one model per domain, each with `serialize()` / `static fromJson()`:
  `PlayerData`, `CurrenciesData`, `PokedexData`, `TeamData`, `BoxesData`, `InventoryData`,
  `QuestProgressData`, `StoryFlags`, `StatisticsData`.
- `fromJson()` validates and reports problems (debug log through localization) instead of
  silently defaulting.

---

## 6. Items — ⚠️

**Current state**: `raw/items-data.js`, ~477 items (held 221, TM 79, key 77, evolution 28,
fossil 16, ball 16, stone 12, consumable 11, treasure 7, keystone 3, HM 3, candy 3, memory 1).

Problems:

1. **Localized text in raw data**: `name_en`, `name_fr`, `desc_*` duplicate `localization/*/items.js`
   (~200 entries, many with the placeholder "Objet tenu avec un effet spécial.").
2. **Emoji icons** in the data instead of item sprites.
3. **123 `powerFormula` strings** (`"1+0.1*level"`) — they would need `eval`.
4. Free-string `category` / `type`, capitalized type names (`"Fighting"`) while types are lowercase
   everywhere else.
5. Untyped plain objects; no `ItemDefinition`.

**Target**

```js
charcoal: { kind: 'held', sprite: 'charcoal.png',
            effect: { kind: 'type_boost', type: 'fire', base: 1, perLevel: 0.1 } },
tm_flamethrower: { kind: 'tm', move: 'flamethrower' },
```

- Declarative effects (`type_boost`, `stat_boost`, `heal`, `catch_bonus`, `evolve`…) interpreted by
  one `ItemEffects` module — no strings to evaluate.
- Names / descriptions only in localization (`item.<id>`, `item_desc.<id>`), generated once from the
  original table; the generator strips text and emoji.

---

## 7. Quests — ❌

**Current state**: `QuestDB` builds one instance per quest from `story-quests.js`,
`side-quests-data.js` and `repeatable-quests-data.js`; `QuestBase` subclasses hold `progress` and
`isClaimed`.

Problems:

1. **Definition and runtime state are mixed**: progress lives on the shared singleton instances, so it
   is global (not per save) and **never persisted**. Switching saves keeps the previous progress;
   reloading the page loses it.
2. `StoryPanel` always shows `getActiveStoryQuest(region, 0)` with progress 0.
3. `CatchQuest` ignores the species; `checkEvent` ignores the event data.
4. Rewards are untyped objects; comments still reference the original `quest-core.js` /
   `migrateQuestSaveV2`.
5. Id schemes differ per family (`main_<n>`, `side_<id>`, `repeatable_<n>`, Johto 101–126).

**Target**

- `QuestDefinition` (frozen): `{ id, family, region, order, objective: { kind: 'catch', species,
  count }, rewards: [{ kind: 'currency', id: 'money', amount: 500 }, { kind: 'item', id, qty }] }`.
- `QuestProgressData` in the save: `{ [questId]: { progress, state: 'active' | 'done' | 'claimed' } }`.
- `QuestSystem` listens to game events (`PokemonCaughtEvent`, `BattleEndedEvent`,
  `LocationChangedEvent`…), updates the progress of the active save and emits
  `QuestProgressChangedEvent`; panels only read.

---

## 8. Locations — ⚠️

**Current state**: `raw/locations-data.js` (Kanto + Johto) and `locations-hoenn.js`:
`{ name, x, y, w, h, conn, wild: [[speciesId, min, max, rarity]], shopId, champ, badgeReq, group, type }`.

Problems:

1. French `name` in raw data (unused: the UI reads `location.<id>`).
2. Map geometry (x / y / w / h), graph (`conn`), encounters, shop and gym rules in one record.
3. Encounters reference species by **numeric id** (the second identity system).
4. Two regions in one file, the third in another.

**Target**

- `raw/maps/<region>-layout.js` (geometry only, consumed by `UIMapView`),
  `raw/locations/<region>.js` (graph, type, unlock rules, shop),
  `raw/encounters/<region>.js` (`route1: [{ species: 'pidgey', levels: [2, 5], rarity: 'common' }]`).
- Unlock rules as data (`unlock: { badges: 1 }` / `{ quest: 'main_4' }`) evaluated by `LocationSystem`.

---

## 9. Moves (done in v1.3, remaining work)

- ✅ Table generated, typed, tested; descriptions re-keyed (313 of them used a different key and
  were unreachable).
- ⚠️ 307 descriptions describe moves that are not in the table yet (future moves) — keep them, they
  will match once those moves are ported.
- ⚠️ Effect hooks (`eff` / `effC` of the original: burn chance, stat drops, multi-hit…) are not
  ported; they should become declarative data like the item effects.
- ⚠️ Original quirks kept for compatibility: a few ids without underscore (`bodyslam`);
  "status" moves were flagged `special` in one of the original's four category fields.

---

## 10. Prioritized plan

| # | Priority | Work | Why first |
|---|---|---|---|
| 1 | P1 | **Canonical ids**: slug for species, `species:form` for forms; encounters, starters and quests reference slugs; Pokédex number becomes a field | Everything else references species |
| 2 | P1 | **Save migration chain** (`SaveMigrations`, version 0 = original `G`) + single write | Every later step changes the save shape |
| 3 | P1 | **Quest progress per save** (`QuestProgressData` + `QuestSystem`) | Current behaviour is wrong (global, lost on reload) |
| 4 | P1 | **Species generator** (`tools/gen_species_data.mjs`) with real catch rates / exp, abilities, evolutions, growth; forms table; load-time validation + tests | Capture, experience and evolution depend on it |
| 5 | P2 | **PokemonData v2** (uid, IVs, nature, ability, ball, held item, origin) + `StatCalculator` + `PokemonFactory`; stop persisting derived values | Needed by boxes, items, the real damage formula |
| 6 | P2 | **Items**: generator stripping text / emoji, declarative effects, `InventoryData` in the save | Shop, Poké Balls panel, held items |
| 7 | P2 | **Locations** split (layout / rules / encounters) | Map panel pixel-perfect work |
| 8 | P3 | Move effects and abilities as declarative data; real damage formula in `BattleSystem` | Battle accuracy |
| 9 | P3 | `StatisticsData` (battles, captures, playtime) for achievements | Achievements panel |

Steps 1–4 can be done without touching the UI; once they are in, the pixel-perfect panel work can
start on stable data.
