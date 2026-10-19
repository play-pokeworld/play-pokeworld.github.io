# Battle engine and effect data

How the automatic battles work since v1.4, how the battle data (moves, talents, held items) is
read by the engine, and every place where the rework differs from the original game.

- Effect kinds, their users and a real example of each: `docs/BATTLE_VOCABULARY.md` (generated).
- What the generators could not transcribe: `docs/DATA_COVERAGE.md` (generated).
- Coverage of every kind by the engine: `src/systems/battle/BattleEffectCoverage.js`, checked by
  `tests/BattleEngine.test.js` (every `ported` kind must be read somewhere in `src/systems`).

---

## 1. Data → engine contract

```
original game code (orig/src)
   │  tools/data/gen-moves.mjs   + move-effects.mjs    (hand transcription of battle-attack.js)
   │  tools/data/gen-talents.mjs + talent-effects.mjs  (hand transcription of the talent checks)
   │  tools/data/gen-items.mjs                         (held item effect + power)
   ▼
src/data/raw/*-data.js        generated, never edited by hand
   ▼
MoveDB / TalentDB / ItemDB    frozen entries, validated at load (DataValidator)
   ▼
src/systems/battle/*          pure rule files, no DOM, no save, a Random passed in
   ▼
BattleSystem                  save, rewards, catch, events, localized log
```

An effect is a plain object `{ kind, ...parameters, when? }`:

- `kind` comes from a frozen vocabulary: `MoveEffectKinds` (28), `TalentEffectKinds` (40),
  `HeldEffectKinds` (48). A generator can only emit known kinds; `DataValidator` rejects the others.
- `when` is an optional condition evaluated by `EffectConditions` (`weather`, `terrain`,
  `moveTypes`, `category`, `fastMove`, `slowMove`, `targetStatus`, `selfStatus`, `pinch`,
  `notSuperEffective`, `hasSecondary`, `sharesType`, `moveTags`…). A test checks that every
  condition key used by the data is supported.
- Moves carry `tags` (`MoveTags`: claw, dance, fang, head, pulse, punch, sharp, sound, wind) read
  by the boost talents and items, plus `bypassDefenseBoosts`, `neverMiss`, `priority`, `hits`,
  `cooldown`.
- Held items carry `effect: { kind, power?: { base, perLevel } }`. The power level comes from the
  number of copies the player owns (25 → 6, 20 → 5, 15 → 4, 10 → 3, 5 → 2, else 1);
  wild / NPC Pokémon use `BattleRules.NPC_HELD_POWER` and berries level 3.

### Adding an effect

1. Add the kind to the vocabulary file (`data/battle/*Kinds.js` or `data/items/HeldEffectKinds.js`).
2. Transcribe the original rule in `move-effects.mjs` / `talent-effects.mjs` (or the item generator).
3. Implement it in the phase file that owns it (table below) and mark it `ported` in
   `BattleEffectCoverage.js`.
4. `node tools/data/build-all.mjs ../orig`, then `npm test`.

---

## 2. Engine files (`src/systems/battle/`)

| File | Role |
|---|---|
| `BattleSession.js` | One battle: team, foe, field, clock, turn loop, switches, outcome, hit reports |
| `BattleCombatant.js` | A Pokémon inside a battle: stat modifiers, volatile status, talents, held item, triggers |
| `BattleField.js` | Weather (default of the location + temporary), terrain, turn counters |
| `BattleLog.js` / `BattleLogFormatter.js` | Language-neutral entries `{key, params}` / localized lines |
| `CooldownRules.js` | Attack cooldown (speed formula, held items, talents, berries) |
| `BeforeMoveRules.js` | Sleep, freeze, paralysis, confusion, flinch before a move |
| `MoveExecutor.js` | One move: absorb talents, accuracy, pinch berries, damage, reactions, effects, eject |
| `MoveTyping.js` | Resolved move type (-ate talents, normalize, camouflage/conversion), effectiveness |
| `AccuracyRules.js` | Hit roll (accuracy modifiers, never-miss talents and moves) |
| `DamageCalculator.js` | Damage formula and every damage multiplier |
| `MoveEffectHandlers.js` | One handler per move effect kind |
| `HitReactionRules.js` | Defender reactions: contact status, counters, weakness policy, on-super-effective |
| `StatChangeRules.js` | Stat modifiers (×0.25 … ×3, 3 turns), drop blocking |
| `StatusRules.js` | Status immunity, duration, inflict (Synchronize), cure |
| `TurnEndRules.js` | Status damage, leftovers, turn stat talents, counters |
| `EntryRules.js` | Switch-in: intimidate-like talents, entry weather / terrain, entry berries |
| `RewardRules.js` | Experience shares and wild money |
| `EncounterRules.js` | Wild draw (rarity weights, level, shiny rate) |
| `EffectConditions.js` | `when` clauses |
| `BattleEffectCoverage.js` | Coverage state of every effect kind |

Constants: `config/BattleRules.js` (rules of the original) and `config/BattleConfig.js` (timing,
encounter weights, UI sizes).

---

## 3. Battle flow

1. **Start** (`BattleSystem.startBattle` or a `QuestEncounterRequestedEvent`): wild draw, Pokédex
   "seen", `BattleSession.start()` → entry effects of both leads, initial cooldowns (base formula
   only), start delay `BattleConfig.START_DELAY_S`.
2. **Clock**: `update(dt)` advances both cooldowns continuously. When a side is ready:
   turn-end effects of that side → (player turn: field tick) → `BeforeMoveRules.canAct` → move
   (round-robin over the moves) → `CooldownRules.next`. The player acts first on ties.
3. **Cooldown**: `round(clamp(1900 × 100 / (100 + min(speed, 180)), 500, 2600)) × move.cooldown`.
   Speed: paralysis ×0.5, first matching speed talent, minimum 5. Quick Claw, `move_speed`
   talents, Power Herb, `skip_cd` / pinch berries adjust it after the move.
4. **Damage**:
   `max(1, floor(((2L/5 + 2) × power × atk / def / 50 + 2) × STAB × eff × rand(85..100)% × item × weather × talent))`,
   then multi-hit × hits, screens ×0.5, next-damage multiplier, resistance berry, training ×0.25
   on the foe, Assault Vest ×0.9, burn ×0.5 on physical moves, `damage_taken` talents.
5. **Faint**: the next living member switches in (cure-on-switch talents, volatile reset on both
   sides, entry effects, new cooldown). No member left → defeat. Foe fainted → victory.
6. **End** (`BattleSystem`):
   - victory: `statistics.recordWildWin(location)` (wild only), `PokemonDefeatedEvent`,
     experience for every living member, wild money, automatic catch;
   - defeat: nothing is lost;
   - in both cases the whole team is fully healed and statuses disappear (original
     `restoreTeamAfterBattle`), one save write, `BattleEndedEvent`.

### Rewards

- Experience: `base = floor(xpYield × L / 7)`, share `max(1, floor(base × 0.7))` for each living
  member, scaled by the level gap (member − foe): ≥ 10 → 0; > 0 → ×(10 − gap)/10;
  < 0 → ×(1 + 0.15 × |gap|). Lucky Egg ×1.5.
- Money: `max(10, round(3d + 5d^1.15))` with `d = regionIndex × 9 + clamp(badgesRequired, 0, 8) + 1`
  (Kanto 0, Johto 1, Hoenn 2).

### Catch

Since v1.5 the catch lives outside the battle engine: `BattleSystem` calls
`CatchSystem.attempt({ save, session, locationId, questKind })` after a won wild battle
(`src/systems/catch/`, details in `docs/DATA_MODEL.md` §5).

- The ball comes **only** from the Poké Ball filters of the save (`BallSelector`); whether the
  species is owned or the encounter belongs to a quest never changes that choice. No matching
  ball → nothing is thrown (`battle_log.ball_no_target`).
- The catch rate depends **only** on the ball (`BallRateRules`): base rate, special-ball bonus
  (condition, Timer / Quick), +2 % per 5 copies owned for special balls (max +10 %), Master Ball
  100 %, cap 100. The species `catchRate` is not used, as in the original.
- The ball is always consumed. Success when the rate is ≥ 100, on the first catch of the save, or
  with `chance(rate)`.
- Final encounter of a legendary quest: rate ×2 (capped at 100); on success the quest is claimed
  with `{ encounterWon: true }`. Main-quest Pokémon are gifts (rate 100).
- A full team sends the new Pokémon to the PC box (`BoxSystem`).
- `session.foeTurns` / `session.playerAttacks` feed the Timer Ball and Quick Ball bonuses.

### Shiny

Wild shiny rate `1/4096`, ×1.15 with `goodasgold`, ×1.15 with `superluck`, ×1.1 with
`serenegrace` in the team (original `getTeamShinyRateMultiplier`). The regional Shiny Charm is not
ported yet.

---

## 4. Original bugs fixed by the generators

| Original behaviour | Rework |
|---|---|
| Self stat drops detected by a case-sensitive regex: "Lowers the user's…" missed when capitalized differently | Case-insensitive transcription, every self drop is applied |
| Guaranteed "Decreases / Inflicts…" (no percentage) ignored | Effect with `chance: 100` |
| `eff` without `effC` meant 0 % (never applied) | Chance taken from the description, 100 % when guaranteed |
| Confusion secondary effect never applied | Applied like the other statuses |
| Self-targeting status moves went through the type immunity check | No immunity check for self-targeting status moves |
| Old TMs `ct13`, `ct15`, `ct22`, `ct30` used move ids without underscores | Ids normalized |

## 5. Dead code of the original, not transcribed

- **Critical hits**: the original multiplies by 1.5 (2.25 with `sniper`) when `move.crit` is set,
  but no move of the original table has that flag: critical hits never happen.
- **`sturdy`, `shellarmor`, `battlearmor`, `sniper`**: checked by the combat code but absent from
  the original talent table, so no Pokémon can have them.
- **27 moves** listed in `docs/DATA_COVERAGE.md` (`weather_ball`, `stored_power`, `body_press`,
  `hi_jump_kick`…): their description announces an effect that the original combat code does not
  implement. They behave as plain damaging moves, as in the original.
- `trickroom` / `weirdroom` are set as field conditions but have no effect in the original.

## 6. Deviations from the original

| Topic | Original | Rework | Why |
|---|---|---|---|
| Clock | 100 ms ticks | Continuous `dt` | Same cooldowns, no tick drift |
| Move type | Several checks use the base type | The resolved type (after -ate / normalize) drives STAB, weather and absorb talents | Consistent typing |
| Gems, seeds | Item removed from the Pokémon | Consumed once per battle, item kept | No item loss in idle battles |
| `damage_taken` talents | Mixed inside the formula | Applied after the formula | One pipeline order |
| Status moves aimed at the foe | No accuracy roll | Roll accuracy | Consistent with damaging moves |
| Switch moves, eject items | Player side only | Same; the switch goes to the next living member (Eject Pack never goes backwards) | No manual choice in idle battles |
| `battle_bonus` (Pay Day…) | No reward effect | Log line only | Same result |
| Contact status (Static, Flame Body…) | Simplified immunity check | `StatusRules.isImmune` (types, talents, terrain, Safeguard) | Bug fix |
| Weakness Policy, on-super-effective talents | Applied inside the damage step | After the damage, only when the defender survives | No boost on a fainted Pokémon |
| `entry_debuff` HP | Ambiguous | The foe loses the HP above 85 % of its max | Readable rule |
| `moody` | Random stat changes | Not ported | Listed in DATA_COVERAGE |
| Hidden talent | Unlock system | Always active for wild Pokémon; player hook `hiddenTalentUnlocked` (false until the unlock system exists) | Not ported yet |
| Achievements / secret base bonuses | Multiply rewards | Not applied yet | Systems not ported |
| Stalemates | Endless (player leaves) | Same: the battle runs until the player leaves | Faithful |

`status_damage` talents multiply the status damage taken by **their holder**, exactly as the
original `battle-status.js` does: `flareboost` / `toxicboost` cancel it (`mult: 0`, the status
still ticks and the bad poison counter keeps growing), `scorch` / `corrosion` double it
(`mult: 2`: in PokéChill these talents are a drawback for their holder).

## 7. Deferred effects

| Effect | Where it will go |
|---|---|
| `transform` (move) | `MoveEffectHandlers` + `BattleCombatant` copy of stats / moves / types |
| `z_crystal` (held) | Periodic Z attack in `BattleSession` |
| `mega_stone` (held) | Mega form switch at battle start |
| `loot`, `loot_boost`, `encounter` (held), `loot_weight` (talent) | Loot / encounter systems |
| 18 talents without effects | `docs/DATA_COVERAGE.md` |
